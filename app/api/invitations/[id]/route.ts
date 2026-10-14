export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError, badRequest, notFound } from '@/lib/auth';

// PATCH - accept or reject an invitation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await requireStudent(req);
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return badRequest('action must be "accept" or "reject"');
    }

    const db = getDb();

    const invitation = (await db.prepare(`
      SELECT i.*, ps.max_team_members
      FROM invitations i
      JOIN problem_statements ps ON i.problem_statement_id = ps.id
      WHERE i.id = ?
    `).get(id)) as {
      id: number; sender_id: number; recipient_id: number;
      problem_statement_id: number; status: string; team_id: number | null;
      max_team_members: number;
    } | null;

    if (!invitation) return notFound('Invitation not found');
    if (invitation.recipient_id !== student.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (invitation.status !== 'pending') {
      return badRequest(`Cannot ${action} an invitation that is already ${invitation.status}`);
    }

    if (action === 'reject') {
      await db.prepare(`UPDATE invitations SET status = 'rejected', updated_at = NOW() WHERE id = ?`).run(id);
      
      // Notify sender
      await db.prepare(`INSERT INTO notifications (student_id, type, title, message) VALUES (?, 'invitation_rejected', 'Invitation Rejected', ?)`)
        .run(invitation.sender_id, `${student.name} declined your team invitation`);

      return Response.json({ message: 'Invitation rejected' });
    }

    // Accept - check and add to team
    const inv = (await db.prepare('SELECT status FROM invitations WHERE id = ?').get(id)) as { status: string } | null;
    if (!inv || inv.status !== 'pending') return badRequest('This invitation has already been processed');

    // Check if recipient is already in a team for this PS
    const existingTeam = await db.prepare(`
      SELECT tm.id FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != 'dissolved'
    `).get(student.id, invitation.problem_statement_id);

    if (existingTeam) return badRequest('You are already in a team for this problem statement');

    let teamId = invitation.team_id;

    if (!teamId) {
      // Check if sender already has a team
      const senderTeam = (await db.prepare(`
        SELECT tm.team_id FROM team_memberships tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != 'dissolved'
      `).get(invitation.sender_id, invitation.problem_statement_id)) as { team_id: number } | null;

      if (senderTeam) {
        teamId = senderTeam.team_id;
      } else {
        // Create new team
        const teamResult = await db.prepare(`
          INSERT INTO teams (problem_statement_id, status, created_by_student_id)
          VALUES (?, 'forming', ?)
        `).run(invitation.problem_statement_id, invitation.sender_id);
        teamId = Number(teamResult.lastInsertRowid);

        // Add sender to team as leader
        await db.prepare(`
          INSERT IGNORE INTO team_memberships (team_id, student_id, role)
          VALUES (?, ?, 'leader')
        `).run(teamId, invitation.sender_id);
      }
    }

    // Check team size limit
    const teamInfo = (await db.prepare(`
      SELECT t.id,
        (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = ?) as member_count,
        ps.max_team_members
      FROM teams t
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      WHERE t.id = ?
    `).get(teamId, teamId)) as { member_count: number; max_team_members: number } | null;

    if (!teamInfo) return badRequest('Team not found');

    if (teamInfo.max_team_members > 0 && Number(teamInfo.member_count) >= teamInfo.max_team_members) {
      return badRequest('The team has reached its maximum member limit');
    }

    // Add recipient to team
    await db.prepare(`
      INSERT IGNORE INTO team_memberships (team_id, student_id, role)
      VALUES (?, ?, 'member')
    `).run(teamId, student.id);

    // Update team status to confirmed if we have members
    await db.prepare(`UPDATE teams SET status = 'confirmed', updated_at = NOW() WHERE id = ?`).run(teamId);

    // Update invitation
    await db.prepare(`UPDATE invitations SET status = 'accepted', team_id = ?, updated_at = NOW() WHERE id = ?`)
      .run(teamId, id);

    // Notify sender
    await db.prepare(`INSERT INTO notifications (student_id, type, title, message, data) VALUES (?, 'invitation_accepted', 'Invitation Accepted', ?, ?)`)
      .run(invitation.sender_id, `${student.name} accepted your team invitation!`, JSON.stringify({ team_id: teamId }));

    return Response.json({ message: 'Invitation accepted, you are now in the team', team_id: teamId });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// DELETE - cancel a sent invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await requireStudent(req);
    const { id } = await params;
    const db = getDb();

    const invitation = (await db.prepare('SELECT * FROM invitations WHERE id = ?').get(id)) as {
      id: number; sender_id: number; status: string;
    } | null;

    if (!invitation) return notFound('Invitation not found');
    if (invitation.sender_id !== student.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (invitation.status !== 'pending') {
      return badRequest(`Cannot cancel an invitation that is ${invitation.status}`);
    }

    await db.prepare(`UPDATE invitations SET status = 'cancelled', updated_at = NOW() WHERE id = ?`).run(id);

    return Response.json({ message: 'Invitation cancelled' });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}
