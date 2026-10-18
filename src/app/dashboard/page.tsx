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
      color: 'bg-[#094327] text-white border border-[#06311d] shadow-sm',
    },
    {
      title: "Today's Discounts Given",
      value: `₹${(stats?.todayDiscounts || 0).toFixed(2)}`,
      icon: TrendingUp,
      subtitle: 'Concessions & loyalty applied today',
      color: 'bg-rose-50/80 text-rose-950 border border-rose-200/90 shadow-2xs',
    },
    {
      title: 'Current Month Sales',
      value: `₹${(stats?.monthSales || 0).toFixed(2)}`,
      icon: Calendar,
      subtitle: 'Resets on the 1st of every month',
      color: 'bg-white text-neutral-900 border border-neutral-200/90 shadow-2xs',
    },
  ];

  const getBranchTitle = () => {
    if (activeBranch === 'all') return 'Master Dashboard (TERRY7 WOMEN - All Stores)';
    if (activeBranch === 'pkdm') return 'TERRY7 WOMEN - Pookkottumpadam Store';
    return 'TERRY7 WOMEN - Vaniyambalam Store';
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
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#094327] text-white shadow-2xs">
              {activeBranch === 'all'
                ? 'All Stores Combined'
                : activeBranch === 'pkdm'
                ? 'Pookkottumpadam (PKDM)'
                : 'Vaniyambalam (VNB)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 apple-display flex items-center gap-2 flex-wrap">
            <span className="flex items-center">
              <span className="text-[#094327]">TERRY</span>
              <span className="text-[#e11d48]">7</span>
            </span>
            <span className="text-xs font-bold bg-[#094327] text-white px-2.5 py-0.5 rounded-full tracking-widest uppercase">
              WOMEN
            </span>
            <span className="text-neutral-900 font-bold ml-1 text-xl sm:text-2xl">
              &bull; {activeBranch === 'all' ? 'All Stores Master Analytics' : activeBranch === 'pkdm' ? 'Pookkottumpadam Store' : 'Vaniyambalam Store'}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1 tracking-tight">
            Daily net sales, discount concessions, and monthly branch overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly Audit PDF for Management */}
          <a
            href="/api/reports/monthly-pdf"
            download
            className="apple-pressable inline-flex items-center gap-1.5 px-4 py-2 bg-[#094327] hover:bg-[#06311d] text-white rounded-full text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Monthly Audit Report (PDF)</span>
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
                    <h3 className="font-bold text-sm text-neutral-900 tracking-tight flex items-center gap-1">
                      <span><span className="text-[#094327]">TERRY</span><span className="text-[#e11d48]">7</span></span>
                      <span>Vaniyambalam Store</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">Railway Station Road</p>
                  </div>
                </div>
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
                    <h3 className="font-bold text-sm text-neutral-900 tracking-tight flex items-center gap-1">
                      <span><span className="text-[#094327]">TERRY</span><span className="text-[#e11d48]">7</span></span>
                      <span>Pookkottumpadam Store</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">Main Commercial Road</p>
                  </div>
                </div>
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

      {/* Core Metric Cards: Exactly 3 essential cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-6 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] border ${card.color} transition-all apple-pressable`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-85">
                  {card.title}
                </span>
                <Icon className="w-5 h-5 opacity-85" />
              </div>
              <div className="mt-3.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight apple-display">
                  {card.value}
                </span>
                <p className="text-[11px] opacity-80 mt-1 font-medium tracking-tight">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Collection Breakdown (Cash & UPI Only - Card & Other Removed) */}
      <div className="apple-surface bg-white p-6 rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#094327]" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Payment Collection Breakdown</h3>
              <p className="text-[11px] text-neutral-500">Realized revenue split between Cash and UPI / GPay</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-neutral-100 rounded-full text-neutral-700">
            Cash &bull; UPI / GPay
          </span>
        </div>

        {(() => {
          const payments = stats?.salesByPayment || [];
          const cash = payments.find((p) => p.method.toUpperCase().includes('CASH')) || { method: 'CASH', amount: 0, count: 0 };
          const upi = payments.find((p) => p.method.toUpperCase().includes('UPI') || p.method.toUpperCase().includes('GPAY')) || { method: 'UPI / GPAY', amount: 0, count: 0 };

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Cash Collection Card */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-50/90 border border-neutral-200/90 hover:border-[#094327]/40 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    💵 Cash In Hand
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#094327]/10 text-[#094327] border border-[#094327]/25">
                    {cash.count} {cash.count === 1 ? 'Customer' : 'Customers'}
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-neutral-950 tracking-tight">
                    ₹{cash.amount.toFixed(2)}
                  </div>
                  <div className="text-xs font-medium text-neutral-500 mt-1">
                    Total cash customer collections
                  </div>
                </div>
              </div>

              {/* UPI / GPay Collection Card */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-50/90 border border-neutral-200/90 hover:border-neutral-400 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    📱 UPI / GPay Digital
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-200/80 text-neutral-800 border border-neutral-300">
                    {upi.count} {upi.count === 1 ? 'Customer' : 'Customers'}
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-neutral-950 tracking-tight">
                    ₹{upi.amount.toFixed(2)}
                  </div>
                  <div className="text-xs font-medium text-neutral-500 mt-1">
                    Total UPI &amp; online collections
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#094327] hover:bg-[#06311d] text-white rounded-full text-xs font-bold shadow-2xs transition-colors"
            >
              <span>View All Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
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
