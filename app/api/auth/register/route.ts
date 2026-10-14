export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, badRequest, serverError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'student',
      full_name,
      name,
      vt_number,
      email,
      phone,
      department_id,
      academic_year,
      skills,
      designation,
      expertise,
      password
    } = body;

    const actualName = (full_name || name || '').trim();
    if (!actualName) return badRequest('Name is required');
    if (!email?.trim()) return badRequest('Email is required');
    if (!password || password.length < 8) return badRequest('Password must be at least 8 characters');

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest('Invalid email format');
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? phone.trim() : null;

    if (type === 'faculty') {
      // Check duplicate faculty email
      const existingFaculty = await db.prepare('SELECT id FROM faculty WHERE email = ?').get(cleanEmail);
      if (existingFaculty) return badRequest('A faculty account with this email already exists');

      const password_hash = await bcrypt.hash(password, 12);

      const result = await db.prepare(`
        INSERT INTO faculty (name, email, phone, department_id, designation, expertise, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        actualName,
        cleanEmail,
        cleanPhone,
        department_id || null,
        designation || 'Assistant Professor',
        expertise || skills || null,
        password_hash
      );

      const facultyId = Number(result.lastInsertRowid);

      const token = await signToken({
        type: 'faculty',
        id: facultyId,
        email: cleanEmail,
        name: actualName,
        department_id: department_id || undefined,
        designation: designation || 'Assistant Professor',
      });

      return Response.json({
        token,
        user: {
          id: facultyId,
          name: actualName,
          email: cleanEmail,
          designation: designation || 'Assistant Professor',
          type: 'faculty',
        },
      }, {
        status: 201,
        headers: { 'Set-Cookie': `xhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` }
      });
    } else {
      // Student registration
      if (!vt_number?.trim()) return badRequest('VT Number is required');
      if (!department_id) return badRequest('Department is required');

      // Check duplicate student email
      const existingEmail = await db.prepare('SELECT id FROM students WHERE email = ?').get(cleanEmail);
      if (existingEmail) return badRequest('An account with this email already exists');

      // Check duplicate VT number
      const cleanVT = vt_number.trim().toUpperCase();
      const existingVT = await db.prepare('SELECT id FROM students WHERE vt_number = ?').get(cleanVT);
      if (existingVT) return badRequest('An account with this VT number already exists');

      const password_hash = await bcrypt.hash(password, 12);

      const result = await db.prepare(`
        INSERT INTO students (full_name, vt_number, email, department_id, academic_year, skills, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        actualName,
        cleanVT,
        cleanEmail,
        department_id,
        academic_year || null,
        skills || null,
        password_hash
      );

      const studentId = Number(result.lastInsertRowid);

      // Asynchronously send welcome email (non-blocking)
      (async () => {
        try {
          const dept = (await db.prepare('SELECT name FROM departments WHERE id = ?').get(department_id)) as { name: string } | null;
          const { sendWelcomeEmail } = await import('@/lib/mail');
          await sendWelcomeEmail({
            to: cleanEmail,
            name: actualName,
            vtNumber: cleanVT,
            department: dept?.name || 'Vel Tech Engineering',
          });
        } catch (mailErr) {
          console.error('[Mail Automation] Failed to dispatch welcome email:', mailErr);
        }
      })();

      const token = await signToken({
        type: 'student',
        id: studentId,
        email: cleanEmail,
        name: actualName,
        vt_number: cleanVT,
      });

      return Response.json({
        token,
        user: {
          id: studentId,
          name: actualName,
          email: cleanEmail,
          vt_number: cleanVT,
          type: 'student',
        },
      }, {
        status: 201,
        headers: { 'Set-Cookie': `xhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` }
      });
    }
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
