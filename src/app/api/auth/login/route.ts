import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Safe Public Demo Mode for visitors / reviewers
    if (body.isDemo) {
      const response = NextResponse.json({
        success: true,
        isDemo: true,
        user: {
          id: 'usr_demo',
          username: 'demo_guest',
          name: 'Demo Visitor',
          role: 'DEMO_VIEWER',
          branch: 'vnb',
        },
      });

      response.cookies.set(
        'terry_session',
        JSON.stringify({
          id: 'usr_demo',
          username: 'demo_guest',
          name: 'Demo Visitor',
          role: 'DEMO_VIEWER',
          branch: 'vnb',
          isDemo: true,
        }),
        {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 86400 * 3, // 3 days
        }
      );

      response.cookies.set('terry_branch', 'vnb', {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 3,
      });

      return response;
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Tester / Demo credentials for reviewers & HR (e.g. tester / 123)
    const normalizedUser = username.trim().toLowerCase();
    if ((normalizedUser === 'tester' || normalizedUser === 'test') && password === '123') {
      const response = NextResponse.json({
        success: true,
        isDemo: true,
        user: {
          id: 'usr_demo',
          username: 'tester',
          name: 'Demo Reviewer',
          role: 'DEMO_VIEWER',
          branch: 'vnb',
        },
      });

      response.cookies.set(
        'terry_session',
        JSON.stringify({
          id: 'usr_demo',
          username: 'tester',
          name: 'Demo Reviewer',
          role: 'DEMO_VIEWER',
          branch: 'vnb',
          isDemo: true,
        }),
        {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 86400 * 3,
        }
      );

      response.cookies.set('terry_branch', 'vnb', {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 3,
      });

      return response;
    }

    const db = await getDb();
    const user = db.users.find((u) => u.username.toLowerCase() === normalizedUser);

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
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
