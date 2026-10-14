export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError, badRequest, notFound } from '@/lib/auth';

// GET - list student's registrations
export async function GET(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const db = getDb();

    const registrations = (await db.prepare(`
      SELECT r.id, r.status, r.registered_at,
        ps.id as ps_db_id, ps.ps_id, ps.title, ps.sno,
        ps.max_registrations, ps.max_pings_per_student, ps.max_team_members,
        ps.registration_open,
        c.name as company_name,
        (SELECT COUNT(*) FROM registrations r2 WHERE r2.problem_statement_id = ps.id AND r2.status = 'active') as total_registered,
        (SELECT pqu.pings_sent FROM ping_quota_usage pqu WHERE pqu.student_id = ? AND pqu.problem_statement_id = ps.id) as pings_sent,
        (SELECT tm.team_id FROM team_memberships tm 
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.student_id = ? AND t.problem_statement_id = ps.id AND t.status != 'dissolved'
          LIMIT 1) as team_id
      FROM registrations r
      JOIN problem_statements ps ON r.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE r.student_id = ?
      ORDER BY r.registered_at DESC
    `).all(student.id, student.id, student.id)) as any[];

    const result = [];
    for (const reg of registrations) {
      const mentors = await db.prepare(`
        SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
               COALESCE(d.name, 'Academic Department') as department_name,
               COALESCE(d.code, 'FAC') as department_code
        FROM mentor_assignments ma
        JOIN faculty f ON ma.faculty_id = f.id
        LEFT JOIN departments d ON f.department_id = d.id
        WHERE ma.problem_statement_id = ? AND f.is_active = 1
      `).all(reg.ps_db_id);
      result.push({ ...reg, mentors });
    }

    return Response.json({ registrations: result });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// POST - register for a problem statement
export async function POST(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const body = await req.json();
    const { problem_statement_id } = body;

    if (!problem_statement_id) return badRequest('problem_statement_id is required');

    const db = getDb();

    // Check problem exists and registration is open
    const problem = (await db.prepare(`
      SELECT id, ps_id, title, max_registrations, registration_open,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = id AND r.status = 'active') as current_count
      FROM problem_statements WHERE id = ?
    `).get(problem_statement_id)) as {
      id: number; ps_id: string; title: string; max_registrations: number;
      registration_open: number; current_count: number;
    } | null;

    if (!problem) return notFound('Problem statement not found');
    if (!problem.registration_open) return badRequest('Registration is closed for this problem statement');

    // Check existing registration
    const existing = (await db.prepare(`
      SELECT id, status FROM registrations WHERE student_id = ? AND problem_statement_id = ?
    `).get(student.id, problem_statement_id)) as { id: number; status: string } | null;

    if (existing) {
      if (existing.status === 'active') return badRequest('You are already registered for this problem statement');
      // Re-activate withdrawn registration
      if (existing.status === 'withdrawn') {
        // Check capacity again
        if (problem.max_registrations > 0 && Number(problem.current_count) >= problem.max_registrations) {
          return badRequest('This problem statement has reached its maximum registrations');
        }
        await db.prepare(`UPDATE registrations SET status = 'active', updated_at = NOW() WHERE id = ?`)
          .run(existing.id);
        return Response.json({ message: 'Registration re-activated', id: existing.id });
      }
    }

    if (problem.max_registrations > 0 && Number(problem.current_count) >= problem.max_registrations) {
      return badRequest('This problem statement has reached its maximum registration limit');
    }

    const result = await db.prepare(`
      INSERT INTO registrations (student_id, problem_statement_id, status)
      VALUES (?, ?, 'active')
    `).run(student.id, problem_statement_id);

    // Initialize ping quota
    await db.prepare(`
      INSERT IGNORE INTO ping_quota_usage (student_id, problem_statement_id, pings_sent)
      VALUES (?, ?, 0)
    `).run(student.id, problem_statement_id);

    return Response.json({ message: 'Registered successfully', id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

