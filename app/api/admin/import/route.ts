export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError, badRequest } from '@/lib/auth';

interface RawRow {
  sno: number;
  ps_id: string;
  company: string | null;
  department: string | null;
  title: string | null;
  background: string | null;
  description: string | null;
  expected_outcome: string | null;
  remarks: string | null;
}

function parseExcelRows(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames.includes('RAW DATA') ? 'RAW DATA' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Sheet not found in workbook');

  const rows = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown) as unknown[][];

  const result: RawRow[] = [];
  let currentCompany: string | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (row[0] === null || row[0] === undefined || row[0] === '') continue;

    const sno = Number(row[0]);
    if (isNaN(sno)) continue;

    if (row[2] && String(row[2]).trim()) {
      currentCompany = String(row[2]).trim();
    }

    const dept = row[3] ? String(row[3]).replace(/\n/g, '/').trim() : null;
    const title = row[4] ? String(row[4]).replace(/\n/g, ' ').trim() : null;
    const background = row[5] ? String(row[5]).trim() : null;
    const description = row[6] ? String(row[6]).trim() : null;
    const expected_outcome = row[7] ? String(row[7]).trim() : null;
    const remarks = row[8] ? String(row[8]).trim() : null;
    const ps_id = row[1] ? String(row[1]).trim() : `PS - ${String(sno).padStart(2, '0')}`;

    result.push({
      sno,
      ps_id,
      company: currentCompany,
      department: dept,
      title,
      background,
      description,
      expected_outcome,
      remarks,
    });
  }

  return result;
}

const DEPT_NORMALIZATIONS: Record<string, string> = {
  'school of computing': 'School of Computing',
  'soc': 'School of Computing',
  'mech': 'Mechanical Engineering',
  'mechanical': 'Mechanical Engineering',
  'ece': 'Electronics and Communication Engineering',
  'mba': 'Master of Business Administration',
  'mechatronics': 'Mechatronics Engineering',
  'ai & ds': 'Artificial Intelligence and Data Science',
  'ai&ds': 'Artificial Intelligence and Data Science',
  'computer science, ai & ds, ece, mechanical, mechatronics': 'School of Computing',
  'mech & ece': 'Mechanical Engineering',
  'soc & mech': 'School of Computing',
};

function normalizeDeptName(raw: string): string[] {
  const parts = raw.split(/[/,]/).map(s => s.trim().toLowerCase());
  const result: string[] = [];
  for (const part of parts) {
    const normalized = DEPT_NORMALIZATIONS[part] || 
      Object.entries(DEPT_NORMALIZATIONS).find(([k]) => part.includes(k))?.[1];
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result.length > 0 ? result : [];
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return badRequest('No file provided');
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return badRequest('File must be an Excel workbook (.xlsx or .xls)');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: RawRow[];
    
    try {
      rows = parseExcelRows(buffer);
    } catch (parseErr) {
      return badRequest(`Failed to parse Excel file: ${(parseErr as Error).message}`);
    }

    if (rows.length === 0) return badRequest('No valid rows found in the workbook');

    const db = getDb();

    // Create import batch
    const batchResult = await db.prepare(`
      INSERT INTO import_batches (filename, total_rows, status, imported_by_admin_id)
      VALUES (?, ?, 'processing', ?)
    `).run(file.name, rows.length, admin.id);
    const batchId = Number(batchResult.lastInsertRowid);

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const importErrors: { row: number; ps_id: string; error_type: string; error_message: string }[] = [];

    // Get/create departments
    const deptCache: Record<string, number> = {};
    const allDepts = (await db.prepare('SELECT id, name FROM departments').all()) as { id: number; name: string }[];
    for (const d of allDepts) deptCache[d.name.toLowerCase()] = d.id;

    // Get/create companies
    const companyCache: Record<string, number> = {};
    const allCompanies = (await db.prepare('SELECT id, name FROM companies').all()) as { id: number; name: string }[];
    for (const c of allCompanies) companyCache[c.name.toLowerCase()] = c.id;

    for (const row of rows) {
      try {
        let companyId: number | null = null;
        if (row.company) {
          const compKey = row.company.toLowerCase();
          if (companyCache[compKey]) {
            companyId = companyCache[compKey];
          } else {
            await db.prepare('INSERT IGNORE INTO companies (name) VALUES (?)').run(row.company);
            const comp = (await db.prepare('SELECT id FROM companies WHERE name = ?').get(row.company)) as { id: number } | null;
            if (comp) {
              companyId = comp.id;
              companyCache[compKey] = companyId;
            }
          }
        }

        const existing = (await db.prepare('SELECT id FROM problem_statements WHERE ps_id = ?').get(row.ps_id)) as { id: number } | null;
        
        if (existing) {
          await db.prepare(`
            UPDATE problem_statements SET
              sno = ?, title = ?, background = ?, description = ?,
              expected_outcome = ?, remarks = ?, company_id = ?, department_raw = ?,
              import_batch_id = ?, updated_at = NOW()
            WHERE id = ?
          `).run(row.sno, row.title, row.background, row.description,
            row.expected_outcome, row.remarks, companyId, row.department, batchId, existing.id);

          await db.prepare('DELETE FROM problem_dept_eligibility WHERE problem_statement_id = ?').run(existing.id);
          if (row.department) {
            const deptNames = normalizeDeptName(row.department);
            for (const deptName of deptNames) {
              const deptKey = deptName.toLowerCase();
              let deptId = deptCache[deptKey];
              if (!deptId) {
                await db.prepare('INSERT IGNORE INTO departments (name) VALUES (?)').run(deptName);
                const dept = (await db.prepare('SELECT id FROM departments WHERE name = ?').get(deptName)) as { id: number } | null;
                if (dept) {
                  deptId = dept.id;
                  deptCache[deptKey] = deptId;
                }
              }
              if (deptId) {
                await db.prepare('INSERT IGNORE INTO problem_dept_eligibility (problem_statement_id, department_id) VALUES (?, ?)').run(existing.id, deptId);
              }
            }
          }
          skipped++;
        } else {
          const psResult = await db.prepare(`
            INSERT INTO problem_statements (
              ps_id, sno, title, background, description, expected_outcome, remarks,
              company_id, department_raw, import_batch_id, needs_config_review
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).run(row.ps_id, row.sno, row.title, row.background, row.description,
            row.expected_outcome, row.remarks, companyId, row.department, batchId);

          const psId = Number(psResult.lastInsertRowid);

          if (row.department) {
            const deptNames = normalizeDeptName(row.department);
            for (const deptName of deptNames) {
              const deptKey = deptName.toLowerCase();
              let deptId = deptCache[deptKey];
              if (!deptId) {
                await db.prepare('INSERT IGNORE INTO departments (name) VALUES (?)').run(deptName);
                const dept = (await db.prepare('SELECT id FROM departments WHERE name = ?').get(deptName)) as { id: number } | null;
                if (dept) {
                  deptId = dept.id;
                  deptCache[deptKey] = deptId;
                }
              }
              if (deptId) {
                await db.prepare('INSERT IGNORE INTO problem_dept_eligibility (problem_statement_id, department_id) VALUES (?, ?)').run(psId, deptId);
              }
            }
          }
          imported++;
        }
      } catch (rowErr) {
        errors++;
        importErrors.push({
          row: row.sno,
          ps_id: row.ps_id,
          error_type: 'IMPORT_ERROR',
          error_message: (rowErr as Error).message,
        });
      }
    }

    // Save import errors to DB
    for (const e of importErrors) {
      await db.prepare(`
        INSERT INTO import_errors (batch_id, \`row_number\`, ps_id, error_type, error_message)
        VALUES (?, ?, ?, ?, ?)
      `).run(batchId, e.row, e.ps_id, e.error_type, e.error_message);
    }

    // Update batch
    await db.prepare(`
      UPDATE import_batches SET
        imported_rows = ?, skipped_rows = ?, error_rows = ?,
        status = ?, completed_at = NOW()
      WHERE id = ?
    `).run(imported, skipped, errors, 'completed', batchId);

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id)
      VALUES (?, ?, ?, 'EXCEL_IMPORT', 'import_batch', ?)
    `).run('admin', admin.id, admin.name, batchId);

    return Response.json({
      batch_id: batchId,
      total_rows: rows.length,
      imported,
      updated: skipped,
      errors,
      error_details: importErrors,
      message: errors > 0
        ? `Import completed with ${errors} error(s). ${imported} new records created, ${skipped} records updated.`
        : `Import successful: ${imported} new records created, ${skipped} records updated.`,
      success: errors === 0 || imported > 0,
    });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// GET import history
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getDb();

    const batches = await db.prepare(`
      SELECT ib.*, a.name as imported_by
      FROM import_batches ib
      LEFT JOIN admins a ON ib.imported_by_admin_id = a.id
      ORDER BY ib.created_at DESC
      LIMIT 20
    `).all();

    return Response.json({ batches });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

