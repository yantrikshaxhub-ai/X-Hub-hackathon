export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const db = getDb();

    const teams = (await db.prepare(`
      SELECT t.id, t.status, t.created_at,
             ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
             ps.max_team_members,
             c.name as company_name,
             (SELECT COUNT(*) FROM team_memberships tm2 WHERE tm2.team_id = t.id) as member_count
      FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE tm.student_id = ? AND t.status != 'dissolved'
      ORDER BY t.created_at DESC
    `).all(student.id)) as any[];

    const result = [];
    for (const team of teams as { id: number; ps_db_id: number; member_count: number; max_team_members: number; [key: string]: unknown }[]) {
      const [members, mentors] = await Promise.all([
        db.prepare(`
          SELECT tm.role, tm.joined_at,
                 s.id, s.full_name, s.vt_number, s.academic_year, s.skills,
                 d.name as department_name
          FROM team_memberships tm
          JOIN students s ON tm.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE tm.team_id = ?
          ORDER BY tm.joined_at ASC
        `).all(team.id),
        db.prepare(`
          SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
                 COALESCE(d.name, 'Academic Department') as department_name,
                 COALESCE(d.code, 'FAC') as department_code
          FROM mentor_assignments ma
          JOIN faculty f ON ma.faculty_id = f.id
          LEFT JOIN departments d ON f.department_id = d.id
          WHERE ma.problem_statement_id = ? AND f.is_active = 1
        `).all(team.ps_db_id),
      ]);

      result.push({
        ...team,
        members,
        mentors,
        slots_remaining: team.max_team_members > 0
          ? Math.max(0, team.max_team_members - Number(team.member_count))
          : null,
      });
    }

    return Response.json({ teams: result });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

