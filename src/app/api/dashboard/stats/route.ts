import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, getBranchInfo } from '@/lib/db';
import { DashboardStats, PaymentMethod } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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

    const db = readDb();
    let purchases = db.purchases.filter((p) => p.status === 'COMPLETED');

    // Strict branch isolation
    if (effectiveBranch && effectiveBranch !== 'all') {
      purchases = purchases.filter((p) => (p.branch || 'vnb') === effectiveBranch);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Today's stats
    const todayPurchases = purchases.filter((p) => p.created_at.startsWith(todayStr));
    const todaySales = Math.round(todayPurchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
    const todayGrossSales = Math.round(todayPurchases.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
    const todayDiscounts = Math.round(Math.max(0, todayGrossSales - todaySales) * 100) / 100;
    const todayWeightSoldGrams = todayPurchases.reduce((sum, p) => sum + (p.weight_grams || 0), 0);
    const todayOrders = todayPurchases.length;

    // Current Month stats
    const currentMonthStr = todayStr.substring(0, 7);
    const monthPurchases = purchases.filter((p) => p.created_at.startsWith(currentMonthStr));
    const monthSales = Math.round(monthPurchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;

    // Branch customers count
    const branchCustomerIds = new Set(purchases.map((p) => p.customer_id));
    const totalCustomers = effectiveBranch && effectiveBranch !== 'all'
      ? branchCustomerIds.size
      : db.customers.length;

    const totalWeightSoldGrams = purchases.reduce((sum, p) => sum + (p.weight_grams || 0), 0);
    const totalGrossSales = Math.round(purchases.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
    const totalNetSales = Math.round(purchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
    const totalDiscounts = Math.round(Math.max(0, totalGrossSales - totalNetSales) * 100) / 100;
    const rewardsRedeemedCount = purchases.filter((p) => p.loyalty_applied).length;

    // Last 7 days breakdown
    const last7DaysMap = new Map<string, { amount: number; gross_amount: number; discount_loss: number; orders: number; weight_kg: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      last7DaysMap.set(dStr, { amount: 0, gross_amount: 0, discount_loss: 0, orders: 0, weight_kg: 0 });
    }

    for (const p of purchases) {
      const dStr = p.created_at.split('T')[0];
      if (last7DaysMap.has(dStr)) {
        const item = last7DaysMap.get(dStr)!;
        item.amount = Math.round((item.amount + p.final_amount) * 100) / 100;
        item.gross_amount = Math.round((item.gross_amount + p.subtotal) * 100) / 100;
        item.discount_loss = Math.round((item.discount_loss + Math.max(0, p.subtotal - p.final_amount)) * 100) / 100;
        item.orders += 1;
        item.weight_kg = Math.round((item.weight_kg + (p.weight_kg || 0)) * 100) / 100;
      }
    }

    const salesByDay = Array.from(last7DaysMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Payment methods breakdown
    const paymentMap: Record<PaymentMethod, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      UPI: { amount: 0, count: 0 },
      CARD: { amount: 0, count: 0 },
      OTHER: { amount: 0, count: 0 },
    };

    for (const p of purchases) {
      const m = p.payment_method || 'CASH';
      if (paymentMap[m]) {
        paymentMap[m].amount = Math.round((paymentMap[m].amount + p.final_amount) * 100) / 100;
        paymentMap[m].count += 1;
      }
    }

    const salesByPayment = Object.entries(paymentMap).map(([method, data]) => ({
      method: method as PaymentMethod,
      ...data,
    }));

    // Mask customer phone numbers in recent purchases: show only last 4 digits
    const maskedRecentPurchases = purchases
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((p) => {
        const ph = p.customer_phone || '';
        const maskedPhone = ph.length > 4 ? `${'•'.repeat(Math.max(0, ph.length - 4))}${ph.slice(-4)}` : ph;
        return {
          ...p,
          customer_phone: maskedPhone,
        };
      });

    const stats: DashboardStats = {
      todaySales,
      todayGrossSales,
      todayDiscounts,
      todayOrders,
      todayWeightSoldGrams,
      monthSales,
      totalCustomers,
      totalWeightSoldGrams,
      totalGrossSales,
      totalDiscounts,
      totalNetSales,
      rewardsRedeemedCount,
      recentPurchases: maskedRecentPurchases,
      salesByDay,
      salesByPayment,
    };

    interface StoreStats {
      todaySales: number;
      todayGross: number;
      todayDiscounts: number;
      todayOrders: number;
      totalNetSales: number;
      totalGrossSales: number;
      totalDiscounts: number;
      totalOrders: number;
    }

    // If Main Admin (no sessionBranch lock), compute individual store stats for side-by-side comparison
    let storesBreakdown: { vnb: StoreStats; pkdm: StoreStats } | null = null;
    if (!sessionBranch) {
      const calcStoreStats = (bId: 'vnb' | 'pkdm'): StoreStats => {
        const storePurchases = db.purchases.filter((p) => p.status === 'COMPLETED' && (p.branch || 'vnb') === bId);
        const storeToday = storePurchases.filter((p) => p.created_at.startsWith(todayStr));
        const sTodaySales = Math.round(storeToday.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
        const sTodayGross = Math.round(storeToday.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
        const sTodayDiscounts = Math.round(Math.max(0, sTodayGross - sTodaySales) * 100) / 100;
        const sTotalGross = Math.round(storePurchases.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
        const sTotalNet = Math.round(storePurchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
        const sTotalDiscounts = Math.round(Math.max(0, sTotalGross - sTotalNet) * 100) / 100;
        return {
          todaySales: sTodaySales,
          todayGross: sTodayGross,
          todayDiscounts: sTodayDiscounts,
          todayOrders: storeToday.length,
          totalNetSales: sTotalNet,
          totalGrossSales: sTotalGross,
          totalDiscounts: sTotalDiscounts,
          totalOrders: storePurchases.length,
        };
      };

      storesBreakdown = {
        vnb: calcStoreStats('vnb'),
        pkdm: calcStoreStats('pkdm'),
      };
    }

    const branchInfo = getBranchInfo(db, effectiveBranch);

    return NextResponse.json({
      success: true,
      stats,
      branch: effectiveBranch || 'all',
      branchInfo,
      storesBreakdown,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error fetching dashboard stats';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
