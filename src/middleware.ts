import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static files, images, favicon, api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/logo.png') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('terry_session');
  let session: { id?: string; username?: string; role?: string; branch?: string } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {}
  }

  const isAuthenticated = Boolean(session && session.id && session.username);

  // If already logged in and visiting /login, send to appropriate screen
  if (pathname === '/login') {
    if (isAuthenticated) {
      if (session?.role === 'SUPER_ADMIN' || session?.username === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If NOT authenticated, strictly redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Main Admin is strictly for Master Dashboard, not cashier billing
  if (pathname === '/' && (session?.role === 'SUPER_ADMIN' || session?.username === 'admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
