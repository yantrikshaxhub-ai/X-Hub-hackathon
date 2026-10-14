export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireStudent, serverError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const db = getDb();

    const notifications = await db.prepare(`
      SELECT * FROM notifications WHERE student_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(student.id);

    return Response.json({ notifications });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const student = await requireStudent(req);
    const db = getDb();

    await db.prepare('UPDATE notifications SET is_read = 1 WHERE student_id = ?').run(student.id);
    return Response.json({ message: 'Notifications marked as read' });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(err);
    return serverError();
  }
}

