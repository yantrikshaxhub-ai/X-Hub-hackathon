import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

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
