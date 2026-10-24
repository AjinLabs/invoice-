import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { generateMonthlyReportPdf } from '@/lib/pdf';

export async function GET(request: Request) {
  await cookies();
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;

    const db = await getDb();
    const doc = generateMonthlyReportPdf(db.purchases, db.shop_settings, month);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="terry7women_monthly_audit_${month || 'current'}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error('Error generating monthly PDF report:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
