export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthFromRequest, serverError, unauthorized } from '@/lib/auth';

// GET - list students registered for a problem statement (for browsing / peer matching)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return unauthorized('Please log in to view candidate directory');
    }

    const { id } = await params;
    const numId = parseInt(id, 10) || id;
    const db = getDb();

    // Check problem statement exists
    const ps = (await db.prepare('SELECT id, ps_id, title, max_pings_per_student FROM problem_statements WHERE id = ? OR ps_id = ?').get(numId, id)) as { id: number; ps_id: string; title: string; max_pings_per_student: number } | null;
    if (!ps) {
      return Response.json({ error: 'Problem statement not found' }, { status: 404 });
    }

    const actualPsId = ps.id;
    const currentUserId = auth.id;
    const isStudent = auth.type === 'student';

    // Fetch registered students
    const students = (await db.prepare(`
      SELECT s.id, s.full_name, s.vt_number, s.academic_year, s.skills,
             COALESCE(d.name, 'School of Computing') as department_name, 
             COALESCE(d.code, 'SoC') as department_code,
             r.registered_at,
             CASE WHEN s.id = ? THEN 1 ELSE 0 END as is_me,
             (SELECT status FROM invitations i 
              WHERE i.sender_id = ? AND i.recipient_id = s.id 
              AND i.problem_statement_id = ? AND i.status = 'pending'
              LIMIT 1) as pending_invite_status,
             (SELECT tm.team_id FROM team_memberships tm 
              JOIN teams t ON tm.team_id = t.id 
              WHERE tm.student_id = s.id AND t.problem_statement_id = ?
              AND t.status != 'dissolved' LIMIT 1) as has_team
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE r.problem_statement_id = ? AND r.status = 'active'
      ORDER BY r.registered_at ASC
    `).all(currentUserId, currentUserId, actualPsId, actualPsId, actualPsId)) as any[];

    // Fetch ping quota for student
    let quota = null;
    if (isStudent) {
      const quotaRow = (await db.prepare(`
        SELECT pqu.pings_sent, ps.max_pings_per_student
        FROM problem_statements ps
        LEFT JOIN ping_quota_usage pqu ON pqu.student_id = ? AND pqu.problem_statement_id = ps.id
        WHERE ps.id = ?
      `).get(currentUserId, actualPsId)) as { pings_sent: number | null; max_pings_per_student: number } | null;

      const pingsSent = quotaRow?.pings_sent || 0;
      const maxPings = quotaRow?.max_pings_per_student || 5;

      quota = {
        pings_sent: pingsSent,
        max_pings_per_student: maxPings,
        remaining: maxPings > 0 ? Math.max(0, maxPings - pingsSent) : null,
      };
    }

    // Fetch assigned faculty mentors
    const mentors = (await db.prepare(`
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
             COALESCE(d.name, 'Academic Department') as department_name,
             COALESCE(d.code, 'FAC') as department_code
      FROM mentor_assignments ma
      JOIN faculty f ON ma.faculty_id = f.id
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE ma.problem_statement_id = ? AND f.is_active = 1
    `).all(actualPsId)) as any[];

    return Response.json({
      students,
      quota,
      mentors,
      problem: { ...ps, mentors },
    });
  } catch (err) {
    console.error('Candidate Directory Error:', err);
    return serverError();
  }
}
