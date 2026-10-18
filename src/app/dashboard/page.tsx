'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Scale,
  Gift,
  IndianRupee,
  Calendar,
  CreditCard,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Download,
  Store,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storesBreakdown, setStoresBreakdown] = useState<any>(null);
  const [activeBranch, setActiveBranch] = useState<string>('vnb');
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndInit();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [activeBranch]);

  const checkAuthAndInit = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authData.authenticated) {
        window.location.href = '/login';
        return;
      }

      let branchToUse = 'vnb';

      if (authData.user) {
        setCurrentUser(authData.user);
        if (authData.user.branch) {
          branchToUse = authData.user.branch;
        } else if (authData.user.role === 'SUPER_ADMIN' || authData.user.username === 'admin') {
          branchToUse = 'all'; // Default to all stores for Main Admin
        }
      }
      setActiveBranch(branchToUse);
      fetchStatsForBranch(branchToUse);
    } catch {
      fetchStatsForBranch('vnb');
    }
  };

  const fetchStatsForBranch = async (branch: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?branch=${branch}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        if (data.branchInfo) {
          setBranchInfo(data.branchInfo);
        }
        if (data.storesBreakdown) {
          setStoresBreakdown(data.storesBreakdown);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = () => {
    fetchStatsForBranch(activeBranch);
  };

  const isMainAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
        Loading analytics dashboard...
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Net Sales",
      value: `₹${(stats?.todaySales || 0).toFixed(2)}`,
      icon: IndianRupee,
      subtitle: `${stats?.todayOrders || 0} orders realized today`,
      color: 'bg-black text-white',
    },
    {
      title: "Today's Discounts Given",
      value: `₹${(stats?.todayDiscounts || 0).toFixed(2)}`,
      icon: TrendingUp,
      subtitle: 'Concessions & loyalty applied today',
      color: 'bg-rose-50 text-rose-950 border border-rose-200',
    },
    {
      title: "Today's Clothing Sold",
      value: `${((stats?.todayWeightSoldGrams || 0) / 1000).toFixed(2)} KG`,
      icon: Scale,
      subtitle: `${stats?.todayOrders || 0} bills (${stats?.todayWeightSoldGrams || 0}g)`,
      color: 'bg-white text-neutral-900 border border-neutral-200',
    },
    {
      title: 'Current Month Sales',
      value: `₹${(stats?.monthSales || 0).toFixed(2)}`,
      icon: Calendar,
      subtitle: 'Resets on the 1st of every month',
      color: 'bg-emerald-950 text-emerald-100 border border-emerald-800',
    },
  ];

  const getBranchTitle = () => {
    if (activeBranch === 'all') return 'Master Dashboard (All Stores Combined)';
    if (activeBranch === 'pkdm') return 'TERRY WOMEN - Pookkottumpadam Store';
    return 'TERRY WOMEN - Vaniyambalam Store';
  };

  const maskPhoneNumber = (phone?: string) => {
    if (!phone) return '••••';
    const clean = phone.trim();
    if (clean.includes('••')) return clean;
    return clean.length > 4 ? `••••••${clean.slice(-4)}` : clean;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Active Store View:
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-neutral-950 text-white shadow-2xs">
              {activeBranch === 'all'
                ? 'All Stores Combined'
                : activeBranch === 'pkdm'
                ? 'Pookkottumpadam (PKDM)'
                : 'Vaniyambalam (VNB)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 apple-display">
            {getBranchTitle()}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 tracking-tight">
            Daily net sales, discount concessions, clothing weight metrics, and store comparison.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly Audit PDF for Management */}
          <a
            href="/api/reports/monthly-pdf"
            download
            className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Monthly Audit Report (PDF)</span>
          </a>

          {/* Direct CSV Export */}
          <a
            href={`/api/reports/export?type=purchases&branch=${activeBranch}`}
            download
            className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-200/90 rounded-full text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {!isMainAdmin && (
            <Link
              href="/"
              className="apple-pressable inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-xs transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Open POS Billing</span>
            </Link>
          )}
        </div>
      </div>

      {/* ==============================================================
          MAIN ADMIN EXCLUSIVE: SIDE-BY-SIDE STORE COMPARISON BREAKDOWN
          User requested: "Main admin only needs to see dashboard sales details of VNB store and PKDM store"
         ============================================================== */}
      {isMainAdmin && storesBreakdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2 apple-headline tracking-tight">
              <Store className="w-5 h-5 text-neutral-800" />
              <span>Store Branch Sales &amp; Concessions Breakdown</span>
            </h2>
            <span className="text-xs text-neutral-500 font-semibold">
              Live Comparative Analytics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vaniyambalam Store Card */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 p-5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    VNB
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 tracking-tight">Vaniyambalam Store</h3>
                    <p className="text-[11px] text-neutral-400">Railway Station Road</p>
                  </div>
                </div>
                <a
                  href="/api/reports/export?type=purchases&branch=vnb"
                  download
                  className="apple-pressable inline-flex items-center gap-1 px-3 py-1 bg-neutral-100/90 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-bold transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download VNB CSV</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 text-[11px] block">Today&apos;s Net Sales</span>
                  <span className="text-lg font-black font-mono text-black">
                    ₹{(storesBreakdown.vnb?.todaySales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {storesBreakdown.vnb?.todayOrders || 0} orders today
                  </span>
                </div>
                <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-100">
                  <span className="text-rose-900 text-[11px] block">Today&apos;s Discount</span>
                  <span className="text-lg font-black font-mono text-rose-700">
                    -₹{(storesBreakdown.vnb?.todayDiscounts || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-rose-500 block mt-0.5">
                    Concessions given
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 text-[11px] block">Total Realized Revenue</span>
                  <span className="text-base font-bold font-mono text-neutral-900">
                    ₹{(storesBreakdown.vnb?.totalNetSales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {storesBreakdown.vnb?.totalOrders || 0} total invoices
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 text-[11px] block">Total Discounts</span>
                  <span className="text-base font-bold font-mono text-amber-700">
                    ₹{(storesBreakdown.vnb?.totalDiscounts || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Total customer savings
                  </span>
                </div>
              </div>
            </div>

            {/* Pookkottumpadam Store Card */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 p-5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    PKDM
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 tracking-tight">Pookkottumpadam Store</h3>
                    <p className="text-[11px] text-neutral-400">Main Commercial Road</p>
                  </div>
                </div>
                <a
                  href="/api/reports/export?type=purchases&branch=pkdm"
                  download
                  className="apple-pressable inline-flex items-center gap-1 px-3 py-1 bg-neutral-100/90 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-bold transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download PKDM CSV</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-neutral-50/80 rounded-2xl">
                  <span className="text-neutral-500 text-[11px] block">Today&apos;s Net Sales</span>
                  <span className="text-lg font-black font-mono text-black">
                    ₹{(storesBreakdown.pkdm?.todaySales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {storesBreakdown.pkdm?.todayOrders || 0} orders today
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100/80">
                  <span className="text-rose-900 text-[11px] block">Today&apos;s Discount</span>
                  <span className="text-lg font-black font-mono text-rose-700">
                    -₹{(storesBreakdown.pkdm?.todayDiscounts || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-rose-500 block mt-0.5">
                    Concessions given
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50/80 rounded-2xl">
                  <span className="text-neutral-500 text-[11px] block">Total Realized Revenue</span>
                  <span className="text-base font-bold font-mono text-neutral-900">
                    ₹{(storesBreakdown.pkdm?.totalNetSales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {storesBreakdown.pkdm?.totalOrders || 0} total invoices
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-50/80 rounded-2xl">
                  <span className="text-neutral-500 text-[11px] block">Total Discounts</span>
                  <span className="text-base font-bold font-mono text-amber-700">
                    ₹{(storesBreakdown.pkdm?.totalDiscounts || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Total customer savings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] border border-black/5 ${card.color} transition-all apple-pressable`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {card.title}
                </span>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight apple-display">
                  {card.value}
                </span>
                <p className="text-[11px] opacity-75 mt-1 font-medium tracking-tight">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Sales Chart (7 Days) - 8 cols */}
        <div className="lg:col-span-8 apple-surface bg-white p-6 rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">7-Day Sales &amp; Discount Breakdown</h3>
              <p className="text-[11px] text-neutral-500">
                Gross exact value vs Discount concessions vs Net realized revenue
              </p>
            </div>
            <a
              href={`/api/reports/export?type=purchases&branch=${activeBranch}`}
              className="text-xs text-neutral-700 hover:text-black font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>

          <div className="space-y-4 pt-2">
            {stats?.salesByDay && stats.salesByDay.length > 0 ? (
              stats.salesByDay.map((day) => {
                const maxAmount = Math.max(...(stats.salesByDay || []).map((d) => d.gross_amount || 1), 1);
                const grossPct = Math.min(100, Math.round(((day.gross_amount || 0) / maxAmount) * 100));
                const netPct = Math.min(100, Math.round(((day.amount || 0) / maxAmount) * 100));

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-700 font-mono">{day.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 text-[11px]">
                          {day.orders} orders &bull; {day.weight_kg} KG
                        </span>
                        {day.discount_loss > 0 && (
                          <span className="text-rose-600 font-mono text-[11px] font-semibold">
                            Discount: -₹{day.discount_loss.toFixed(0)}
                          </span>
                        )}
                        <span className="font-bold text-black font-mono">
                          ₹{day.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-black h-full rounded-full transition-all duration-300"
                        style={{ width: `${netPct}%` }}
                        title={`Net Realized: ₹${day.amount}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                No purchases recorded in the last 7 days.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown - 4 cols */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Payment Breakdown</h3>
              <p className="text-[11px] text-neutral-500">Revenue split by payment type</p>
            </div>
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3 pt-2">
            {stats?.salesByPayment && stats.salesByPayment.length > 0 ? (
              stats.salesByPayment.map((p) => {
                const total = stats.totalNetSales || 1;
                const pct = Math.round((p.amount / total) * 100) || 0;
                return (
                  <div key={p.method} className="space-y-1.5 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-900">{p.method}</span>
                      <span className="font-mono font-bold text-black">
                        ₹{p.amount.toFixed(2)} ({pct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-500">
                      <span>{p.count} bills</span>
                    </div>
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-neutral-900 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                No payment data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Recent Completed Invoices</h3>
            <p className="text-[11px] text-neutral-500">
              Latest transactions for {getBranchTitle()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/reports/export?type=purchases&branch=${activeBranch}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </a>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-black"
            >
              <span>View All</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 uppercase font-bold text-[10px] tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3">Branch</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Garment Weight</th>
                <th className="px-6 py-3">Discount Concession</th>
                <th className="px-6 py-3">Net Realized</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {stats?.recentPurchases && stats.recentPurchases.length > 0 ? (
                stats.recentPurchases.slice(0, 10).map((p) => {
                  const discount = Math.max(0, p.subtotal - p.final_amount);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                          {p.branch === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-neutral-900">{p.customer_name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono tracking-wider">
                          {maskPhoneNumber(p.customer_phone)}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono">
                        {p.weight_kg ? `${p.weight_kg.toFixed(2)} KG` : `${p.weight_grams}g`}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-rose-600 font-semibold">
                        {discount > 0 ? `-₹${discount.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-black text-black">
                        ₹{p.final_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-neutral-400 text-[11px] whitespace-nowrap">
                        {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-neutral-400">
                    No completed transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
