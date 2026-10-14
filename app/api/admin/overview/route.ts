export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, serverError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getDb();

    const totalPSRow = (await db.prepare('SELECT COUNT(*) as c FROM problem_statements').get()) as { c: number } | null;
    const totalStudentsRow = (await db.prepare('SELECT COUNT(*) as c FROM students WHERE is_active = 1').get()) as { c: number } | null;
    const totalFacultyRow = (await db.prepare('SELECT COUNT(*) as c FROM faculty WHERE is_active = 1').get()) as { c: number } | null;
    const totalRegistrationsRow = (await db.prepare("SELECT COUNT(*) as c FROM registrations WHERE status = 'active'").get()) as { c: number } | null;
    const totalTeamsRow = (await db.prepare("SELECT COUNT(*) as c FROM teams WHERE status != 'dissolved'").get()) as { c: number } | null;
    const pendingInvitationsRow = (await db.prepare("SELECT COUNT(*) as c FROM invitations WHERE status = 'pending'").get()) as { c: number } | null;
    const needsReviewRow = (await db.prepare('SELECT COUNT(*) as c FROM problem_statements WHERE needs_config_review = 1').get()) as { c: number } | null;
    const openPSRow = (await db.prepare('SELECT COUNT(*) as c FROM problem_statements WHERE registration_open = 1').get()) as { c: number } | null;

    const totalPS = totalPSRow ? Number(totalPSRow.c) : 0;
    const totalStudents = totalStudentsRow ? Number(totalStudentsRow.c) : 0;
    const totalFaculty = totalFacultyRow ? Number(totalFacultyRow.c) : 0;
    const totalRegistrations = totalRegistrationsRow ? Number(totalRegistrationsRow.c) : 0;
    const totalTeams = totalTeamsRow ? Number(totalTeamsRow.c) : 0;
    const pendingInvitations = pendingInvitationsRow ? Number(pendingInvitationsRow.c) : 0;
    const needsReview = needsReviewRow ? Number(needsReviewRow.c) : 0;
    const openPS = openPSRow ? Number(openPSRow.c) : 0;

    // Full detailed student registrations (using r.registered_at)
    const detailedRegistrations = (await db.prepare(`
      SELECT 
        r.id as registration_id,
        r.status as registration_status,
        r.registered_at,
        s.id as student_id,
        s.full_name as student_name,
        s.vt_number,
        s.email as student_email,
        s.academic_year,
        s.skills,
        d.id as department_id,
        COALESCE(d.name, 'School of Computing') as department_name,
        COALESCE(d.code, 'SoC') as department_code,
        ps.id as problem_statement_id,
        ps.ps_id,
        ps.title as problem_title,
        c.id as company_id,
        COALESCE(c.name, 'Industry Partner') as company_name
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN problem_statements ps ON r.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE r.status = 'active'
      ORDER BY r.registered_at DESC
    `).all()) as any[];

    // Registrations by company with attached students
    const companyMap = new Map<string, { company: string; count: number; students: any[] }>();
    for (const reg of detailedRegistrations) {
      const compName = reg.company_name || 'Industry Partner';
      if (!companyMap.has(compName)) {
        companyMap.set(compName, { company: compName, count: 0, students: [] });
      }
      const entry = companyMap.get(compName)!;
      entry.count += 1;
      entry.students.push(reg);
    }
    const byCompany = Array.from(companyMap.values()).sort((a, b) => b.count - a.count);

    // Registrations by department with attached students
    const deptMap = new Map<string, { department: string; code: string; count: number; students: any[] }>();
    for (const reg of detailedRegistrations) {
      const deptName = reg.department_name || 'School of Computing';
      const deptCode = reg.department_code || 'SoC';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { department: deptName, code: deptCode, count: 0, students: [] });
      }
      const entry = deptMap.get(deptName)!;
      entry.count += 1;
      entry.students.push(reg);
    }
    const byDepartment = Array.from(deptMap.values()).sort((a, b) => b.count - a.count);

    // Full problem statements count
    const fullPSRow = (await db.prepare(`
      SELECT COUNT(*) as c FROM problem_statements ps
      WHERE ps.max_registrations > 0
      AND (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') >= ps.max_registrations
    `).get()) as { c: number } | null;

    return Response.json({
      metrics: {
        totalPS,
        totalStudents,
        totalFaculty,
        totalRegistrations,
        totalTeams,
        pendingInvitations,
        needsReview,
        openPS,
        fullPS: fullPSRow ? Number(fullPSRow.c) : 0,
      },
      byCompany,
      byDepartment,
      detailedRegistrations,
    });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('API Admin Overview Error:', err);
    return serverError();
  }
}
