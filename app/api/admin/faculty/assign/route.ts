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

    // Asynchronously dispatch mentor assignment emails (non-blocking)
    (async () => {
      try {
        const { sendMentorAssignedToFacultyEmail, sendMentorAssignedToStudentEmail } = await import('@/lib/mail');

        for (const fId of faculty_ids) {
          const faculty = (await db.prepare(`
            SELECT f.name, f.email, f.phone, COALESCE(d.name, 'Engineering') as dept_name
            FROM faculty f
            LEFT JOIN departments d ON f.department_id = d.id
            WHERE f.id = ?
          `).get(fId)) as { name: string; email: string; phone?: string; dept_name: string } | null;

          if (!faculty) continue;

          for (const psId of problem_statement_ids) {
            const ps = (await db.prepare(`
              SELECT ps.ps_id, ps.title, c.name as company_name
              FROM problem_statements ps
              LEFT JOIN companies c ON ps.company_id = c.id
              WHERE ps.id = ?
            `).get(psId)) as { ps_id: string; title: string; company_name: string } | null;

            if (!ps) continue;

            // 1. Email the faculty mentor
            await sendMentorAssignedToFacultyEmail({
              to: faculty.email,
              mentorName: faculty.name,
              psCode: ps.ps_id,
              psTitle: ps.title,
              companyName: ps.company_name || 'Industry Partner',
            });

            // 2. Email registered students for this problem statement
            const registeredStudents = (await db.prepare(`
              SELECT s.full_name, s.email
              FROM registrations r
              JOIN students s ON r.student_id = s.id
              WHERE r.problem_statement_id = ? AND r.status = 'active'
            `).all(psId)) as { full_name: string; email: string }[];

            for (const st of registeredStudents) {
              await sendMentorAssignedToStudentEmail({
                to: st.email,
                studentName: st.full_name,
                mentorName: faculty.name,
                mentorDept: faculty.dept_name,
                mentorEmail: faculty.email,
                mentorPhone: faculty.phone,
                psCode: ps.ps_id,
                psTitle: ps.title,
              });
            }
          }
        }
      } catch (mailErr) {
        console.error('[Mail Automation] Failed to dispatch mentor assignment emails:', mailErr);
      }
    })();

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
