export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError, notFound, badRequest } from '@/lib/auth';

// DELETE - withdraw registration
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await requireStudent(req);
    const { id } = await params;
    const db = getDb();

    const reg = (await db.prepare(`
      SELECT r.id, r.status, r.problem_statement_id
      FROM registrations r
      WHERE r.id = ? AND r.student_id = ?
    `).get(id, student.id)) as { id: number; status: string; problem_statement_id: number } | null;

    if (!reg) return notFound('Registration not found');
    if (reg.status !== 'active') return badRequest('Registration is not active');

    // Check if student is in a team for this PS
    const teamMembership = await db.prepare(`
      SELECT tm.id FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != 'dissolved'
    `).get(student.id, reg.problem_statement_id);

    if (teamMembership) {
      return badRequest('You must leave your team before withdrawing from this problem statement');
    }

    await db.prepare(`UPDATE registrations SET status = 'withdrawn', updated_at = NOW() WHERE id = ?`)
      .run(reg.id);

    return Response.json({ message: 'Registration withdrawn successfully' });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
