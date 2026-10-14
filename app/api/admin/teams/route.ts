export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError, badRequest } from '@/lib/auth';

// GET - List all formed teams with full member rosters and problem statement details
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let where = "WHERE t.status != 'dissolved'";
    const params: (string | number)[] = [];

    if (status) {
      where += ' AND t.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (t.name LIKE ? OR ps.ps_id LIKE ? OR ps.title LIKE ? OR s.full_name LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const teams = (await db.prepare(`
      SELECT t.id, t.name, t.status, t.created_at, t.updated_at,
             ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title, ps.max_team_members,
             c.name as company_name,
             s.id as lead_student_id, s.full_name as lead_name, s.vt_number as lead_vt, s.email as lead_email,
             d.name as lead_dept_name, d.code as lead_dept_code
      FROM teams t
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      LEFT JOIN students s ON t.created_by_student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      ${where}
      ORDER BY t.created_at DESC
    `).all(...params)) as any[];

    // Fetch team memberships
    const teamIds = teams.map(t => t.id);
    let members: any[] = [];
    if (teamIds.length > 0) {
      members = (await db.prepare(`
        SELECT tm.team_id, tm.role, tm.joined_at,
               s.id as student_id, s.full_name as student_name, s.vt_number, s.email, s.skills,
               d.name as department_name, d.code as department_code
        FROM team_memberships tm
        JOIN students s ON tm.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE tm.team_id IN (${teamIds.map(() => '?').join(',')})
        ORDER BY tm.joined_at ASC
      `).all(...teamIds)) as any[];
    }

    const memberMap = new Map<number, any[]>();
    for (const m of members) {
      if (!memberMap.has(m.team_id)) memberMap.set(m.team_id, []);
      memberMap.get(m.team_id)!.push(m);
    }

    const result = teams.map(t => ({
      ...t,
      members: memberMap.get(t.id) || [],
      member_count: (memberMap.get(t.id) || []).length,
    }));

    return Response.json({ teams: result, total: result.length });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// PATCH - Update team status (e.g. lock team, unlock, dissolve)
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { team_id, status } = body;

    if (!team_id || !status) return badRequest('team_id and status are required');

    const db = getDb();
    await db.prepare(`
      UPDATE teams SET status = ?, updated_at = NOW() WHERE id = ?
    `).run(status, team_id);

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES (?, ?, ?, 'UPDATE_TEAM_STATUS', 'team', ?, ?)
    `).run('admin', admin.id, admin.name, team_id, JSON.stringify({ status }));

    return Response.json({ success: true, message: `Team status updated to ${status}` });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
