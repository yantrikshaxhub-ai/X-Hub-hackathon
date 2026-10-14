export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { serverError } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    const departments = await db.prepare('SELECT * FROM departments WHERE is_active = 1 ORDER BY name').all();
    return Response.json({ departments });
  } catch (err) {
    console.error(err);
    return serverError();
  }
}

