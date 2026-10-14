export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError, badRequest } from '@/lib/auth';

// GET - List all faculty with assigned problem statements
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getDb();

    const faculty = (await db.prepare(`
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise, f.is_active, f.created_at,
             d.id as department_id, d.name as department_name, d.code as department_code,
             (SELECT COUNT(*) FROM mentor_assignments ma WHERE ma.faculty_id = f.id) as assigned_ps_count
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.is_active = 1
      ORDER BY f.name ASC
    `).all()) as any[];

    // Fetch problem assignments for each faculty
    const facultyIds = faculty.map(f => f.id);
    let assignments: any[] = [];
    if (facultyIds.length > 0) {
      assignments = (await db.prepare(`
        SELECT ma.faculty_id, ma.assigned_at, ps.id as problem_statement_id, ps.ps_id, ps.title, c.name as company_name
        FROM mentor_assignments ma
        JOIN problem_statements ps ON ma.problem_statement_id = ps.id
        LEFT JOIN companies c ON ps.company_id = c.id
        WHERE ma.faculty_id IN (${facultyIds.map(() => '?').join(',')})
      `).all(...facultyIds)) as any[];
    }

    const assignMap = new Map<number, any[]>();
    for (const a of assignments) {
      if (!assignMap.has(a.faculty_id)) assignMap.set(a.faculty_id, []);
      assignMap.get(a.faculty_id)!.push(a);
    }

    const result = faculty.map(f => ({
      ...f,
      assigned_problems: assignMap.get(f.id) || [],
    }));

    return Response.json({ faculty: result });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// POST - Add new faculty member
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { name, email, phone, department_id, designation, expertise, password } = body;

    if (!name?.trim()) return badRequest('Faculty name is required');
    if (!email?.trim()) return badRequest('Email is required');

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? phone.trim() : null;

    const existing = await db.prepare('SELECT id FROM faculty WHERE email = ?').get(cleanEmail);
    if (existing) return badRequest('A faculty member with this email already exists');

    const password_hash = await bcrypt.hash(password || 'Faculty@XHub2026', 12);

    const res = await db.prepare(`
      INSERT INTO faculty (name, email, phone, department_id, designation, expertise, password_hash, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      name.trim(),
      cleanEmail,
      cleanPhone,
      department_id || null,
      designation || 'Assistant Professor',
      expertise || null,
      password_hash
    );

    const facultyId = Number(res.lastInsertRowid);

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES (?, ?, ?, 'CREATE_FACULTY', 'faculty', ?, ?)
    `).run('admin', admin.id, admin.name, facultyId, JSON.stringify({ name, email, phone: cleanPhone, designation }));

    const created = await db.prepare(`
      SELECT f.*, d.name as department_name, d.code as department_code 
      FROM faculty f 
      LEFT JOIN departments d ON f.department_id = d.id 
      WHERE f.id = ?
    `).get(facultyId);

    return Response.json({ faculty: created, message: 'Faculty member created successfully' }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
