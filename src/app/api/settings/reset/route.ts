import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearDatabaseToZero } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('terry_session');
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.username !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Only Super Admin can reset the database.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'RESET') {
      return NextResponse.json(
        { success: false, error: 'Confirmation string "RESET" is required to proceed.' },
        { status: 400 }
      );
    }

    const result = await clearDatabaseToZero();
    return NextResponse.json({ success: true, message: result.message });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error resetting database';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
