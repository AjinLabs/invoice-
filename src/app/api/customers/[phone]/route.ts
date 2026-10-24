import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, normalizePhone } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone: rawPhone } = await params;
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get('branch');

    let sessionBranch: string | undefined;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
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
    const phone = normalizePhone(rawPhone);

    const db = await getDb();
    const customer = db.customers.find((c) => {
      if (c.phone !== phone) return false;
      if (effectiveBranch && effectiveBranch !== 'all') {
        return (c.branch || 'vnb') === effectiveBranch;
      }
      return true;
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const purchases = db.purchases
      .filter((p) => {
        if (p.customer_id !== customer.id) return false;
        if (effectiveBranch && effectiveBranch !== 'all') {
          return (p.branch || 'vnb') === effectiveBranch;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      customer,
      purchases,
      loyalty: {
        count: customer.loyalty_count,
        max: db.shop_settings.required_visits,
        unlocked: customer.loyalty_reward_unlocked,
        remaining: Math.max(0, db.shop_settings.required_visits - customer.loyalty_count),
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error fetching customer';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
