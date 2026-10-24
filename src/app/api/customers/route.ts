import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, readDb, withTransaction, generateId, normalizePhone } from '@/lib/db';
import { Customer } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    const branchParam = searchParams.get('branch');

    let sessionBranch: string | undefined;
    let isDemo = false;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        isDemo = session.role === 'DEMO_VIEWER' || Boolean(session.isDemo);
        if (session.branch) sessionBranch = session.branch;
      }
      if (!sessionBranch) {
        const branchCookie = cookieStore.get('terry_branch');
        if (branchCookie?.value === 'pkdm' || branchCookie?.value === 'vnb') {
          sessionBranch = branchCookie.value;
        }
      }
    } catch {}

    const effectiveBranch = branchParam || sessionBranch;

    const db = await getDb();
    let customers = db.customers;

    // Strict branch isolation: customers belong strictly to their store branch
    if (effectiveBranch && effectiveBranch !== 'all') {
      customers = customers.filter((c) => (c.branch || 'vnb') === effectiveBranch);
    }

    if (query) {
      customers = customers.filter(
        (c) =>
          c.phone.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      );
    }

    if (isDemo) {
      customers = customers.map((c) => ({
        ...c,
        phone: c.phone.length > 5 ? `${c.phone.slice(0, 5)}•••••` : '••••••••••',
        address: c.address ? 'Kerala, India' : '',
      }));
    }

    return NextResponse.json({ success: true, customers, isDemo });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error fetching customers';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPhone = body.phone?.trim();
    const name = body.name?.trim();
    const address = body.address?.trim() || '';

    let sessionBranch: string | undefined;
    let isDemo = false;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        isDemo = session.role === 'DEMO_VIEWER' || Boolean(session.isDemo);
        if (session.branch) sessionBranch = session.branch;
      }
      if (!sessionBranch) {
        const branchCookie = cookieStore.get('terry_branch');
        if (branchCookie?.value === 'pkdm' || branchCookie?.value === 'vnb') {
          sessionBranch = branchCookie.value;
        }
      }
    } catch {}

    const effectiveBranch = (body.branch || sessionBranch || 'vnb') as 'vnb' | 'pkdm';

    if (!rawPhone || !name) {
      return NextResponse.json(
        { success: false, error: 'Phone number and Name are required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    if (isDemo) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        customer: {
          id: 'cust_demo_' + Date.now(),
          phone: `${phone.slice(0, 5)}•••••`,
          name,
          address,
          branch: effectiveBranch,
          total_purchases: 0,
          total_weight_grams: 0,
          total_amount_spent: 0,
          loyalty_count: 0,
          loyalty_reward_unlocked: false,
          last_purchase_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    const customer = await withTransaction((db) => {
      const existing = db.customers.find((c) => c.phone === phone && (c.branch || 'vnb') === effectiveBranch);
      const now = new Date().toISOString();

      if (existing) {
        existing.name = name;
        if (address) existing.address = address;
        if (!existing.branch) existing.branch = effectiveBranch;
        existing.updated_at = now;
        return existing;
      }

      const newCustomer: Customer = {
        id: generateId('cust'),
        phone,
        name,
        address,
        branch: effectiveBranch,
        total_purchases: 0,
        total_weight_grams: 0,
        total_amount_spent: 0,
        loyalty_count: 0,
        loyalty_reward_unlocked: false,
        last_purchase_at: null,
        created_at: now,
        updated_at: now,
      };

      db.customers.push(newCustomer);
      return newCustomer;
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error creating customer';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
