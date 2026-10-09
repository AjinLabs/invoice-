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
    const user = db.users.find((u) => u.id === session.id);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
