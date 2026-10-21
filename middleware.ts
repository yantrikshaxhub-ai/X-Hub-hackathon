import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'xhub-hackathon-secret-key-change-in-production-2026'
);

async function getAuthFromRequest(req: NextRequest) {
  const token = req.cookies.get('xhub_token')?.value || 
    (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7) : null);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { type: string; id: number; email: string; name?: string; role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.type !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('role', 'admin');
      return NextResponse.redirect(url);
    }
  }

  // Student protected routes
  const studentProtected = ['/dashboard', '/registrations', '/invitations', '/teams', '/mentors', '/profile'];
  if (studentProtected.some(p => pathname.startsWith(p))) {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.type !== 'student') {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/registrations/:path*', '/invitations/:path*', '/teams/:path*', '/mentors/:path*', '/profile/:path*'],
};
