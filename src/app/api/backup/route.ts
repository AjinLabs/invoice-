import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('terry_session');
    
    // Auth check
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.role === 'DEMO_VIEWER') {
        return NextResponse.json(
          { success: false, error: 'Demo account cannot download production backups' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    // Force refresh from PostgreSQL if available, otherwise get cached/disk DB
    const db = await getDb(true);

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `terry_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(db, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error generating backup';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
