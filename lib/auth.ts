import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'xhub-hackathon-secret-key-change-in-production-2026'
);

export interface StudentPayload {
  type: 'student';
  id: number;
  email: string;
  name: string;
  vt_number: string;
}

export interface AdminPayload {
  type: 'admin';
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface FacultyPayload {
  type: 'faculty';
  id: number;
  email: string;
  name: string;
  department_id?: number;
  designation?: string;
}

export type AuthPayload = StudentPayload | AdminPayload | FacultyPayload;

export async function signToken(payload: AuthPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return await verifyToken(token);
  }
  const cookieStore = await cookies();
  const token = cookieStore.get('xhub_token')?.value;
  if (token) {
    return await verifyToken(token);
  }
  return null;
}

export async function requireStudent(req: NextRequest): Promise<StudentPayload> {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.type !== 'student') {
    throw new Error('UNAUTHORIZED');
  }
  return auth as StudentPayload;
}

export async function requireAdmin(req: NextRequest): Promise<AdminPayload> {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.type !== 'admin') {
    throw new Error('UNAUTHORIZED');
  }
  return auth as AdminPayload;
}

export async function requireFaculty(req: NextRequest): Promise<FacultyPayload> {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.type !== 'faculty') {
    throw new Error('UNAUTHORIZED');
  }
  return auth as FacultyPayload;
}

export async function requireFacultyOrAdmin(req: NextRequest): Promise<FacultyPayload | AdminPayload> {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.type !== 'faculty' && auth.type !== 'admin')) {
    throw new Error('UNAUTHORIZED');
  }
  return auth as FacultyPayload | AdminPayload;
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return Response.json({ error: message, details }, { status: 400 });
}

export function notFound(message = 'Not found') {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(message = 'Internal server error') {
  return Response.json({ error: message }, { status: 500 });
}
