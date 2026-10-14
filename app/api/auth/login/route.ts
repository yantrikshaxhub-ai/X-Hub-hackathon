export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, badRequest, serverError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role = 'student' } = body;

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    const db = getDb();

    if (role === 'admin') {
      const admin = await db.prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1').get(email) as {
        id: number; name: string; email: string; password_hash: string; role: string;
      } | null;

      if (!admin) {
        return badRequest('Invalid credentials');
      }

      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        return badRequest('Invalid credentials');
      }

      // Log audit
      await db.prepare(`INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('admin', admin.id, admin.name, 'LOGIN', 'admin', admin.id);

      const token = await signToken({
        type: 'admin',
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });

      return Response.json({
        token,
        user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, type: 'admin' },
      }, {
        headers: { 'Set-Cookie': `xhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` }
      });
    } else if (role === 'faculty') {
      const faculty = await db.prepare(`
        SELECT f.*, d.name as department_name, d.code as department_code 
        FROM faculty f 
        LEFT JOIN departments d ON f.department_id = d.id 
        WHERE f.email = ? AND f.is_active = 1
      `).get(email) as {
        id: number; name: string; email: string; password_hash: string; designation: string; department_id: number; department_name?: string; department_code?: string;
      } | null;

      if (!faculty) {
        return badRequest('Invalid faculty credentials');
      }

      const valid = await bcrypt.compare(password, faculty.password_hash);
      if (!valid) {
        return badRequest('Invalid faculty credentials');
      }

      // Log audit
      await db.prepare(`INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('faculty', faculty.id, faculty.name, 'LOGIN', 'faculty', faculty.id);

      const token = await signToken({
        type: 'faculty',
        id: faculty.id,
        email: faculty.email,
        name: faculty.name,
        department_id: faculty.department_id,
        designation: faculty.designation,
      });

      return Response.json({
        token,
        user: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          designation: faculty.designation,
          department_name: faculty.department_name,
          department_code: faculty.department_code,
          type: 'faculty',
        },
      }, {
        headers: { 'Set-Cookie': `xhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` }
      });
    } else {
      const student = await db.prepare('SELECT * FROM students WHERE email = ? AND is_active = 1').get(email) as {
        id: number; full_name: string; email: string; password_hash: string; vt_number: string; department_id: number;
      } | null;

      if (!student) {
        return badRequest('Invalid credentials');
      }

      const valid = await bcrypt.compare(password, student.password_hash);
      if (!valid) {
        return badRequest('Invalid credentials');
      }

      const token = await signToken({
        type: 'student',
        id: student.id,
        email: student.email,
        name: student.full_name,
        vt_number: student.vt_number,
      });

      return Response.json({
        token,
        user: { id: student.id, name: student.full_name, email: student.email, vt_number: student.vt_number, type: 'student' },
      }, {
        headers: { 'Set-Cookie': `xhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` }
      });
    }
  } catch (err) {
    console.error(err);
    return serverError();
  }
}

