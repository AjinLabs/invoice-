import { NextResponse } from 'next/server';

function clearCookies(response: NextResponse) {
  response.cookies.set('terry_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });
  response.cookies.set('terry_branch', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
  });
  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  return clearCookies(response);
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  return clearCookies(response);
}
