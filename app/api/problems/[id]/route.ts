export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { serverError, notFound } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const problem = await db.prepare(`
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
      WHERE ps.id = ? OR ps.ps_id = ?
    `).get(id, id);

    if (!problem) return notFound('Problem statement not found');

    const p = problem as { id: number };

    // Get departments
    const departments = await db.prepare(`
      SELECT d.id, d.name, d.code
      FROM problem_dept_eligibility pde
      JOIN departments d ON pde.department_id = d.id
      WHERE pde.problem_statement_id = ?
    `).all(p.id);

    // Get faculty mentors
    const mentors = await db.prepare(`
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
             d.name as department_name, d.code as department_code
      FROM mentor_assignments ma
      JOIN faculty f ON ma.faculty_id = f.id
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE ma.problem_statement_id = ? AND f.is_active = 1
    `).all(p.id);

    return Response.json({ problem: { ...problem, departments, mentors } });
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
