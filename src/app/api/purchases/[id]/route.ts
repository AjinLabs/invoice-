import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing invoice id' }, { status: 400 });
    }

    const db = await getDb();
    const purchase = db.purchases.find(
      (p) => p.id === id || p.invoice_number.toLowerCase() === id.toLowerCase()
    );

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    const { getBranchInfo } = await import('@/lib/db');
    const branchInfo = getBranchInfo(db, purchase.branch);

    return NextResponse.json({
      success: true,
      purchase,
      settings: {
        ...db.shop_settings,
        shop_name: branchInfo.name,
        address: branchInfo.address,
        phone: branchInfo.phone,
      },
      branchInfo,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error fetching purchase';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
