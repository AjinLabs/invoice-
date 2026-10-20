import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/logo.png') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('terry_session');
  let session: { id?: string; username?: string; role?: string; branch?: string; isDemo?: boolean } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {}
  }

  const isAuthenticated = Boolean(session && session.id && session.username);

  // Allow public auth endpoints, webhook, and invoice image serving
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/whatsapp/webhook') ||
    pathname.startsWith('/api/invoices/')
  ) {
    return NextResponse.next();
  }

  // Block unauthorized API calls
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)'],
};
