export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError, badRequest } from '@/lib/auth';

// POST - Assign one or multiple faculty mentors to one or multiple problem statements
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { faculty_ids, problem_statement_ids } = body;

    if (!Array.isArray(faculty_ids) || faculty_ids.length === 0) {
      return badRequest('faculty_ids must be a non-empty array of IDs');
    }
    if (!Array.isArray(problem_statement_ids) || problem_statement_ids.length === 0) {
      return badRequest('problem_statement_ids must be a non-empty array of IDs');
    }

    const db = getDb();
    let assignedCount = 0;

    for (const fId of faculty_ids) {
      for (const psId of problem_statement_ids) {
        try {
          await db.prepare(`
            INSERT INTO mentor_assignments (faculty_id, problem_statement_id, assigned_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE assigned_at = NOW()
          `).run(fId, psId);
          assignedCount += 1;
        } catch (e) {
          console.error(`Error assigning faculty ${fId} to PS ${psId}:`, e);
        }
      }
    }

    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES (?, ?, ?, 'ASSIGN_FACULTY_MENTOR', 'mentor_assignment', ?, ?)
    `).run('admin', admin.id, admin.name, faculty_ids[0], JSON.stringify({ faculty_ids, problem_statement_ids }));

    return Response.json({
      success: true,
      assignedCount,
      message: `Successfully assigned ${faculty_ids.length} mentor(s) to ${problem_statement_ids.length} problem statement(s).`,
    });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// DELETE - Unassign faculty from a problem statement
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get('faculty_id');
    const psId = searchParams.get('problem_statement_id');

    if (!facultyId || !psId) {
      return badRequest('faculty_id and problem_statement_id are required');
    }

    const db = getDb();
    await db.prepare(`
      DELETE FROM mentor_assignments 
      WHERE faculty_id = ? AND problem_statement_id = ?
    `).run(facultyId, psId);

    return Response.json({ success: true, message: 'Mentor assignment removed.' });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
