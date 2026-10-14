export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { serverError } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const company = searchParams.get('company');
    const department = searchParams.get('department');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    const limit = limitParam === 'all' ? 200 : parseInt(limitParam || '150');
    const offset = (page - 1) * limit;

    const cacheKey = `problems:${company || ''}:${department || ''}:${search || ''}:${status || ''}:${page}:${limit}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return Response.json(cachedData, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
      });
    }

    const db = getDb();
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (company) {
      where += ' AND c.name = ?';
      params.push(company);
    }

    if (department) {
      where += ` AND (
        ps.department_raw LIKE ? OR ps.id IN (
          SELECT pde.problem_statement_id FROM problem_dept_eligibility pde
          JOIN departments d ON pde.department_id = d.id
          WHERE d.name LIKE ? OR d.code LIKE ?
        )
      )`;
      params.push(`%${department}%`, `%${department}%`, `%${department}%`);
    }

    if (search) {
      where += ' AND (ps.ps_id LIKE ? OR ps.title LIKE ? OR c.name LIKE ? OR ps.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status === 'open') {
      where += ' AND ps.registration_open = 1';
    } else if (status === 'closed') {
      where += ' AND ps.registration_open = 0';
    } else if (status === 'full') {
      where += ' AND ps.max_registrations > 0 AND (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = \'active\') >= ps.max_registrations';
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      ${where}
    `;
    const totalRow = (await db.prepare(countQuery).get(...params)) as { total: number } | null;
    const total = totalRow ? Number(totalRow.total) : 0;

    const query = `
      SELECT 
        ps.id, ps.ps_id, ps.sno, ps.title, ps.description, ps.background,
        ps.expected_outcome, ps.remarks, ps.department_raw,
        ps.max_registrations, ps.max_pings_per_student, ps.max_team_members,
        ps.registration_open, ps.needs_config_review,
        c.id as company_id, c.name as company_name,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') as registration_count,
        (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != 'dissolved') as team_count
      FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      ${where}
      ORDER BY ps.sno ASC
      LIMIT ? OFFSET ?
    `;

    const problems = (await db.prepare(query).all(...params, limit, offset)) as any[];

    // Get department eligibilities for each problem in batch
    const problemIds = problems.map(p => p.id);
    let eligibilities: { problem_statement_id: number; id: number; name: string; code: string }[] = [];
    if (problemIds.length > 0) {
      eligibilities = (await db.prepare(`
        SELECT pde.problem_statement_id, d.id, d.name, d.code
        FROM problem_dept_eligibility pde
        JOIN departments d ON pde.department_id = d.id
        WHERE pde.problem_statement_id IN (${problemIds.map(() => '?').join(',')})
      `).all(...problemIds)) as { problem_statement_id: number; id: number; name: string; code: string }[];
    }

    const eligMap: Record<number, { id: number; name: string; code: string }[]> = {};
    for (const e of eligibilities) {
      if (!eligMap[e.problem_statement_id]) eligMap[e.problem_statement_id] = [];
      eligMap[e.problem_statement_id].push({ id: e.id, name: e.name, code: e.code });
    }

    // Get assigned mentors for each problem in batch
    let mentorRows: any[] = [];
    if (problemIds.length > 0) {
      try {
        mentorRows = (await db.prepare(`
          SELECT ma.problem_statement_id, f.id, f.name, f.email, f.phone, f.designation, f.expertise, d.name as department_name, d.code as department_code
          FROM mentor_assignments ma
          JOIN faculty f ON ma.faculty_id = f.id
          LEFT JOIN departments d ON f.department_id = d.id
          WHERE ma.problem_statement_id IN (${problemIds.map(() => '?').join(',')})
        `).all(...problemIds)) as any[];
      } catch (mErr) {
        console.warn('Could not fetch problem mentors:', mErr);
      }
    }

    const mentorMap: Record<number, any[]> = {};
    for (const m of mentorRows) {
      if (!mentorMap[m.problem_statement_id]) mentorMap[m.problem_statement_id] = [];
      mentorMap[m.problem_statement_id].push({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone || null,
        designation: m.designation,
        expertise: m.expertise,
        department_name: m.department_name,
        department_code: m.department_code,
      });
    }

    const result = problems.map(p => ({
      ...p,
      departments: eligMap[p.id as number] || [],
      mentors: mentorMap[p.id as number] || [],
      registration_slots_remaining: (p.max_registrations as number) > 0
        ? Math.max(0, (p.max_registrations as number) - Number(p.registration_count as number || 0))
        : null,
    }));

    // Cached companies lookup
    let companies = getCached<string[]>('all:companies');
    if (!companies) {
      const compRows = (await db.prepare('SELECT DISTINCT name FROM companies WHERE is_active = 1 ORDER BY name').all()) as { name: string }[];
      companies = compRows.map(c => c.name);
      setCached('all:companies', companies, 300);
    }

    // Cached departments lookup
    let departments = getCached<any[]>('all:departments');
    if (!departments) {
      departments = (await db.prepare('SELECT id, name, code FROM departments WHERE is_active = 1 ORDER BY name').all()) as any[];
      setCached('all:departments', departments, 300);
    }

    const responsePayload = {
      problems: result,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      companies,
      departments,
    };

    setCached(cacheKey, responsePayload, 15);

    return Response.json(responsePayload, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
