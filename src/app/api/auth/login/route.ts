import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const db = readDb();
    const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branch: user.branch,
      },
    });

    // Set simple secure session cookie
    response.cookies.set(
      'terry_session',
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        branch: user.branch,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7, // 7 days
      }
    );

    if (user.branch) {
      response.cookies.set('terry_branch', user.branch, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7,
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
