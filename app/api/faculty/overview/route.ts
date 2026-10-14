export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireFaculty, serverError } from '@/lib/auth';

// GET - Faculty mentor overview: assigned problem statements, registered candidates, teams
export async function GET(req: NextRequest) {
  try {
    const faculty = await requireFaculty(req);
    const db = getDb();

    // 1. Get faculty profile
    const profile = await db.prepare(`
      SELECT f.id, f.name, f.email, f.designation, f.expertise,
             d.name as department_name, d.code as department_code
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.id = ?
    `).get(faculty.id);

    // 2. Get assigned problem statements
    const assignedProblems = (await db.prepare(`
      SELECT ps.id, ps.ps_id, ps.sno, ps.title, ps.description, ps.expected_outcome,
             ps.max_registrations, ps.max_team_members, ps.registration_open,
             c.name as company_name, ma.assigned_at,
             (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') as registration_count,
             (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != 'dissolved') as team_count
      FROM mentor_assignments ma
      JOIN problem_statements ps ON ma.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE ma.faculty_id = ?
      ORDER BY ps.sno ASC
    `).all(faculty.id)) as any[];

    const assignedPsIds = assignedProblems.map(p => p.id);

    // 3. Get all registered student candidates under these assigned problem statements
    let candidates: any[] = [];
    if (assignedPsIds.length > 0) {
      candidates = (await db.prepare(`
        SELECT r.id as registration_id, r.registered_at,
               s.id as student_id, s.full_name as student_name, s.vt_number, s.email as student_email,
               s.academic_year, s.skills,
               COALESCE(d.name, 'School of Computing') as department_name,
               COALESCE(d.code, 'SoC') as department_code,
               ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title,
               c.name as company_name,
               (SELECT tm.team_id FROM team_memberships tm 
                JOIN teams t ON tm.team_id = t.id 
                WHERE tm.student_id = s.id AND t.problem_statement_id = ps.id AND t.status != 'dissolved' 
                LIMIT 1) as team_id
        FROM registrations r
        JOIN students s ON r.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        JOIN problem_statements ps ON r.problem_statement_id = ps.id
        LEFT JOIN companies c ON ps.company_id = c.id
        WHERE r.problem_statement_id IN (${assignedPsIds.map(() => '?').join(',')}) AND r.status = 'active'
        ORDER BY r.registered_at DESC
      `).all(...assignedPsIds)) as any[];
    }

    // 4. Get all teams formed under these assigned problem statements
    let teams: any[] = [];
    if (assignedPsIds.length > 0) {
      teams = (await db.prepare(`
        SELECT t.id, t.name, t.status, t.created_at,
               ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title,
               c.name as company_name,
               s.full_name as lead_name, s.vt_number as lead_vt, s.email as lead_email
        FROM teams t
        JOIN problem_statements ps ON t.problem_statement_id = ps.id
        LEFT JOIN companies c ON ps.company_id = c.id
        LEFT JOIN students s ON t.created_by_student_id = s.id
        WHERE t.problem_statement_id IN (${assignedPsIds.map(() => '?').join(',')}) AND t.status != 'dissolved'
        ORDER BY t.created_at DESC
      `).all(...assignedPsIds)) as any[];

      // Team members
      const teamIds = teams.map(t => t.id);
      if (teamIds.length > 0) {
        const members = (await db.prepare(`
          SELECT tm.team_id, tm.role, s.full_name, s.vt_number, s.email, d.code as department_code
          FROM team_memberships tm
          JOIN students s ON tm.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE tm.team_id IN (${teamIds.map(() => '?').join(',')})
        `).all(...teamIds)) as any[];

        const memMap = new Map<number, any[]>();
        for (const m of members) {
          if (!memMap.has(m.team_id)) memMap.set(m.team_id, []);
          memMap.get(m.team_id)!.push(m);
        }
        teams = teams.map(t => ({ ...t, members: memMap.get(t.id) || [] }));
      }
    }

    return Response.json({
      profile,
      assignedProblems,
      candidates,
      teams,
      totalAssignedPS: assignedProblems.length,
      totalCandidates: candidates.length,
      totalTeams: teams.length,
    });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
