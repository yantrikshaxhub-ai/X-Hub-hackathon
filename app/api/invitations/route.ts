export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError, badRequest, notFound } from '@/lib/auth';

// GET - get invitations (sent and received)
export async function GET(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction') || 'all';

    let received: unknown[] = [];
    let sent: unknown[] = [];

    if (direction === 'all' || direction === 'received') {
      received = await db.prepare(`
        SELECT i.id, i.status, i.message, i.created_at, i.updated_at,
               s.id as sender_id, s.full_name as sender_name, s.vt_number as sender_vt,
               d.name as sender_dept,
               ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
               c.name as company_name
        FROM invitations i
        JOIN students s ON i.sender_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        JOIN problem_statements ps ON i.problem_statement_id = ps.id
        LEFT JOIN companies c ON ps.company_id = c.id
        WHERE i.recipient_id = ?
        ORDER BY i.created_at DESC
      `).all(student.id);
    }

    if (direction === 'all' || direction === 'sent') {
      sent = await db.prepare(`
        SELECT i.id, i.status, i.message, i.created_at, i.updated_at,
               r.id as recipient_id, r.full_name as recipient_name, r.vt_number as recipient_vt,
               d.name as recipient_dept,
               ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
               c.name as company_name
        FROM invitations i
        JOIN students r ON i.recipient_id = r.id
        LEFT JOIN departments d ON r.department_id = d.id
        JOIN problem_statements ps ON i.problem_statement_id = ps.id
        LEFT JOIN companies c ON ps.company_id = c.id
        WHERE i.sender_id = ?
        ORDER BY i.created_at DESC
      `).all(student.id);
    }

    return Response.json({ received, sent });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

// POST - send an invitation (ping)
export async function POST(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const body = await req.json();
    const { recipient_id, problem_statement_id, message } = body;

    if (!recipient_id || !problem_statement_id) {
      return badRequest('recipient_id and problem_statement_id are required');
    }

    if (recipient_id === student.id) {
      return badRequest('You cannot send an invitation to yourself');
    }

    const db = getDb();

    // Get problem statement config
    const problem = (await db.prepare(`
      SELECT id, ps_id, max_pings_per_student, registration_open
      FROM problem_statements WHERE id = ?
    `).get(problem_statement_id)) as {
      id: number; ps_id: string; max_pings_per_student: number; registration_open: number;
    } | null;

    if (!problem) return notFound('Problem statement not found');

    // Validate sender is registered for this PS
    const senderReg = await db.prepare(`
      SELECT id FROM registrations WHERE student_id = ? AND problem_statement_id = ? AND status = 'active'
    `).get(student.id, problem_statement_id);
    if (!senderReg) return badRequest('You must be registered for this problem statement to send invitations');

    // Validate recipient is registered for this PS
    const recipientReg = await db.prepare(`
      SELECT id FROM registrations WHERE student_id = ? AND problem_statement_id = ? AND status = 'active'
    `).get(recipient_id, problem_statement_id);
    if (!recipientReg) return badRequest('Recipient is not registered for this problem statement');

    // Check for duplicate pending invitation
    const existingInvite = await db.prepare(`
      SELECT id, status FROM invitations 
      WHERE sender_id = ? AND recipient_id = ? AND problem_statement_id = ? AND status = 'pending'
    `).get(student.id, recipient_id, problem_statement_id);
    if (existingInvite) return badRequest('A pending invitation already exists for this student');

    // Get current quota
    const quota = (await db.prepare(`
      SELECT pings_sent FROM ping_quota_usage WHERE student_id = ? AND problem_statement_id = ?
    `).get(student.id, problem_statement_id)) as { pings_sent: number } | null;

    const pingsSent = quota?.pings_sent || 0;

    if (problem.max_pings_per_student > 0 && pingsSent >= problem.max_pings_per_student) {
      return badRequest('You have reached the maximum number of team invitations for this problem statement');
    }

    // Insert invitation
    const result = await db.prepare(`
      INSERT INTO invitations (sender_id, recipient_id, problem_statement_id, status, message)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(student.id, recipient_id, problem_statement_id, message || null);

    // Increment quota
    await db.prepare(`
      INSERT INTO ping_quota_usage (student_id, problem_statement_id, pings_sent)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE pings_sent = pings_sent + 1, updated_at = NOW()
    `).run(student.id, problem_statement_id);

    // Create notification for recipient
    await db.prepare(`
      INSERT INTO notifications (student_id, type, title, message, data)
      VALUES (?, 'invitation', 'Team Invitation Received', ?, ?)
    `).run(
      recipient_id,
      `${student.name} has invited you to collaborate on ${problem.ps_id}`,
      JSON.stringify({ invitation_id: result.lastInsertRowid, problem_statement_id })
    );

    return Response.json({ message: 'Invitation sent successfully', id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

