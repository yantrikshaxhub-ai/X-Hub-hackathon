export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getAuthFromRequest, serverError } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return Response.json({ user: null }, { status: 200 });
    }

    const db = getDb();

    if (auth.type === 'student') {
      const student = await db.prepare(`
        SELECT s.id, s.full_name, s.vt_number, s.email, s.department_id, 
               s.academic_year, s.skills, s.created_at,
               d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = ? AND s.is_active = 1
      `).get(auth.id) as any;

      return Response.json({
        user: student
          ? {
              ...student,
              name: student.full_name,
              full_name: student.full_name,
              type: 'student',
            }
          : null,
      });
    } else if (auth.type === 'faculty') {
      const faculty = await db.prepare(`
        SELECT f.id, f.name, f.email, f.phone, f.department_id, f.designation, f.expertise, f.created_at,
               d.name as department_name, d.code as department_code
        FROM faculty f
        LEFT JOIN departments d ON f.department_id = d.id
        WHERE f.id = ? AND f.is_active = 1
      `).get(auth.id) as any;

      return Response.json({
        user: faculty
          ? {
              ...faculty,
              full_name: faculty.name,
              type: 'faculty',
            }
          : null,
      });
    } else {
      const admin = await db.prepare(`
        SELECT id, name, email, role, created_at FROM admins WHERE id = ? AND is_active = 1
      `).get(auth.id) as any;

      return Response.json({
        user: admin
          ? {
              ...admin,
              full_name: admin.name,
              type: 'admin',
            }
          : null,
      });
    }
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
