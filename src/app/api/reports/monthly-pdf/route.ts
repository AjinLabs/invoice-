import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { generateMonthlyReportPdf } from '@/lib/pdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;

    let sessionBranch: string | undefined;
    let isSuperAdmin = false;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        sessionBranch = session.branch;
        isSuperAdmin = session.role === 'SUPER_ADMIN' || session.username === 'admin';
      }
    } catch {}

    const db = await getDb();
    let purchases = db.purchases;
    if (!isSuperAdmin && sessionBranch) {
      purchases = purchases.filter((p) => (p.branch || 'vnb') === sessionBranch);
    }

    const doc = generateMonthlyReportPdf(purchases, db.shop_settings, month);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="terry7women_monthly_audit_${month || 'current'}.pdf"`,
      },
    });
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_')) {
      throw err;
    }
    console.error('Error generating monthly PDF report:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
