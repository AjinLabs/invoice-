import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('terry_session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const session = JSON.parse(sessionCookie.value);
    const db = readDb();
    const { getBranchInfo } = await import('@/lib/db');

    if (session.role === 'DEMO_VIEWER' || session.isDemo) {
      return NextResponse.json({
        authenticated: true,
        isDemo: true,
        user: {
          id: 'usr_demo',
          username: 'demo_guest',
          name: 'Demo Visitor',
          role: 'DEMO_VIEWER',
          branch: 'vnb',
        },
        branchInfo: getBranchInfo(db, 'vnb'),
      });
    }

    const user = db.users.find((u) => u.id === session.id);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const branchInfo = getBranchInfo(db, user.branch);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branch: user.branch,
      },
      branchInfo,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
