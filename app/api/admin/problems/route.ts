export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError, badRequest, notFound } from '@/lib/auth';
import { clearCache } from '@/lib/cache';

// GET - list all problem statements with admin data
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const company = searchParams.get('company');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      where += ' AND (ps.ps_id LIKE ? OR ps.title LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (company) {
      where += ' AND c.name = ?';
      params.push(company);
    }

    const totalRow = (await db.prepare(`
      SELECT COUNT(*) as c FROM problem_statements ps LEFT JOIN companies c ON ps.company_id = c.id ${where}
    `).get(...params)) as { c: number } | null;
    const total = totalRow ? Number(totalRow.c) : 0;

    const problems = await db.prepare(`
      SELECT ps.*, c.name as company_name,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') as registration_count,
        (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != 'dissolved') as team_count,
        (SELECT COUNT(*) FROM invitations i WHERE i.problem_statement_id = ps.id AND i.status = 'pending') as pending_pings
      FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      ${where}
      ORDER BY ps.sno ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return Response.json({ problems, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// PATCH - update problem statement settings
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { id, max_registrations, max_pings_per_student, max_team_members, registration_open } = body;

    if (!id) return badRequest('id is required');

    const db = getDb();
    const ps = (await db.prepare('SELECT * FROM problem_statements WHERE id = ?').get(id)) as { id: number } | null;
    if (!ps) return notFound('Problem statement not found');

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (max_registrations !== undefined) {
      if (!Number.isInteger(max_registrations) || max_registrations < 0) return badRequest('max_registrations must be a non-negative integer');
      updates.push('max_registrations = ?');
      params.push(max_registrations);
    }
    if (max_pings_per_student !== undefined) {
      if (!Number.isInteger(max_pings_per_student) || max_pings_per_student < 0) return badRequest('max_pings_per_student must be a non-negative integer');
      updates.push('max_pings_per_student = ?');
      params.push(max_pings_per_student);
    }
    if (max_team_members !== undefined) {
      if (!Number.isInteger(max_team_members) || max_team_members < 0) return badRequest('max_team_members must be a non-negative integer');
      updates.push('max_team_members = ?');
      params.push(max_team_members);
    }
    if (registration_open !== undefined) {
      updates.push('registration_open = ?');
      params.push(registration_open ? 1 : 0);
    }

    if (updates.length === 0) return badRequest('No valid fields to update');

    // Check if any change means we need to unflag review
    if (max_registrations !== undefined && max_pings_per_student !== undefined && max_team_members !== undefined) {
      updates.push('needs_config_review = 0');
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await db.prepare(`UPDATE problem_statements SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES (?, ?, ?, 'UPDATE_PS_SETTINGS', 'problem_statement', ?, ?)
    `).run('admin', admin.id, admin.name, id, JSON.stringify(body));

    const updated = await db.prepare('SELECT * FROM problem_statements WHERE id = ?').get(id);
    clearCache('problems');
    return Response.json({ problem: updated, message: 'Settings updated successfully' });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

