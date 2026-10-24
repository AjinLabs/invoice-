import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'purchases'; // purchases | customers | loyalty
    const branchParam = searchParams.get('branch');

    let sessionBranch: string | undefined;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        sessionBranch = session.branch;
      }
    } catch {}

    const effectiveBranch = sessionBranch || branchParam;

    const db = await getDb();
    let purchases = [...db.purchases];

    // Branch isolation for reports
    if (effectiveBranch && effectiveBranch !== 'all') {
      purchases = purchases.filter((p) => (p.branch || 'vnb') === effectiveBranch);
    }

    if (type === 'customers') {
      const branchCustomerIds = new Set(purchases.map((p) => p.customer_id));
      let customers = db.customers;

      if (effectiveBranch && effectiveBranch !== 'all') {
        customers = customers.filter(
          (c) => branchCustomerIds.has(c.id) || (c.branch || 'vnb') === effectiveBranch
        );
      }

      const headers = [
        'Customer ID',
        'Name',
        'Phone',
        'Address',
        'Branch',
        'Total Purchases',
        'Total Weight (g)',
        'Total Spent (INR)',
        'Loyalty Count',
        'Reward Unlocked',
        'Last Purchase Date',
      ];

      const rows = customers.map((c) => [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.branch === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam'}"`,
        c.total_purchases,
        c.total_weight_grams,
        c.total_amount_spent.toFixed(2),
        `${c.loyalty_count}/5`,
        c.loyalty_reward_unlocked ? 'YES' : 'NO',
        c.last_purchase_at ? `"${c.last_purchase_at}"` : '""',
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="terry_${effectiveBranch || 'all'}_customers_${Date.now()}.csv"`,
        },
      });
    }

    // Default: Purchases export
    const headers = [
      'Invoice Number',
      'Branch',
      'Date',
      'Customer Name',
      'Phone',
      'Items Count',
      'Weight (Grams)',
      'Weight (KG)',
      'Rate/KG (INR)',
      'Subtotal (INR)',
      'Loyalty Discount (INR)',
      'Final Amount (INR)',
      'Payment Method',
      'Status',
      'Loyalty Applied',
      'Loyalty Progress After',
    ];

    const rows = purchases.map((p) => [
      `"${p.invoice_number}"`,
      `"${p.branch === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam'}"`,
      `"${p.created_at}"`,
      `"${p.customer_name.replace(/"/g, '""')}"`,
      `"${p.customer_phone}"`,
      p.items ? p.items.length : 1,
      p.weight_grams,
      p.weight_kg.toFixed(3),
      p.rate_per_kg,
      p.subtotal.toFixed(2),
      p.discount_amount.toFixed(2),
      p.final_amount.toFixed(2),
      `"${p.payment_method}"`,
      `"${p.status}"`,
      p.loyalty_applied ? 'YES' : 'NO',
      `"${p.loyalty_progress_after}/5"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="terry_${effectiveBranch || 'all'}_sales_${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error exporting CSV';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
