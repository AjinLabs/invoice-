'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Calendar,
  CreditCard,
  ArrowUpRight,
  Download,
  Building2,
  Store,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { DashboardStats, BranchInfo } from '@/lib/types';

interface StoreBreakdownStats {
  todaySales: number;
  todayGross: number;
  todayDiscounts: number;
  todayOrders: number;
  totalNetSales: number;
  totalGrossSales: number;
  totalDiscounts: number;
  totalOrders: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id?: string; username?: string; role?: string; branch?: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storesBreakdown, setStoresBreakdown] = useState<{
    vnb: StoreBreakdownStats;
    pkdm: StoreBreakdownStats;
  } | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>('all');
  const [, setBranchInfo] = useState<BranchInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatsForBranch = useCallback(async (branch: string) => {
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initDashboard = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }

        if (isMounted) {
          setCurrentUser(authData.user);
        }

        let branchToUse = 'all';
        if (authData.user) {
          const userIsAdmin = authData.user.role === 'SUPER_ADMIN' || authData.user.username === 'admin';
          if (!userIsAdmin && authData.user.branch) {
            branchToUse = authData.user.branch;
          } else if (userIsAdmin) {
            branchToUse = 'all';
          }
        }
        if (isMounted) {
          setActiveBranch(branchToUse);
          fetchStatsForBranch(branchToUse);
        }
      } catch {
        if (isMounted) fetchStatsForBranch('all');
      }
    };

    initDashboard();
    return () => {
      isMounted = false;
    };
  }, [fetchStatsForBranch, router]);

  const isMainAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';

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
    isMainAdmin
      ? {
          title: 'Current Month Sales',
          value: `₹${(stats?.monthSales || 0).toFixed(2)}`,
          icon: Calendar,
          subtitle: 'Resets on the 1st of every month',
          color: 'bg-white text-neutral-900 border border-neutral-200/90 shadow-2xs',
        }
      : {
          title: "Today's Garments Weight",
          value: `${((stats?.todayWeightSoldGrams || 0) / 1000).toFixed(2)} KG`,
          icon: ShoppingBag,
          subtitle: 'Garments weight billed today',
          color: 'bg-white text-neutral-900 border border-neutral-200/90 shadow-2xs',
        },
  ];

  const getBranchTitle = () => {
    if (activeBranch === 'all') return 'TERRY7 WOMEN - All Stores Master';
    if (activeBranch === 'pkdm') return 'TERRY7 WOMEN - Pookkottumpadam';
    return 'TERRY7 WOMEN - Vaniyambalam';
  };

  const maskPhoneNumber = (phone?: string) => {
    if (!phone) return '••••';
    const clean = phone.trim();
    if (clean.includes('••')) return clean;
    return clean.length > 4 ? `••••••${clean.slice(-4)}` : clean;
  };

  if (isLoading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs font-semibold text-neutral-500">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading analytics dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 apple-display flex items-center gap-2 flex-wrap">
            <span className="flex items-center">
              <span className="text-[#094327]">TERRY</span>
              <span className="text-[#e11d48]">7</span>
            </span>
            <span className="text-xs font-bold bg-[#094327] text-white px-2.5 py-0.5 rounded-full tracking-widest uppercase">
              WOMEN
            </span>
            <span className="text-neutral-900 font-bold ml-1 text-xl sm:text-2xl">
              &bull; {
                !isMainAdmin
                  ? (activeBranch === 'pkdm' ? 'Pookkottumpadam Store (PKDM)' : 'Vaniyambalam Store (VNB)')
                  : (activeBranch === 'all' ? 'All Stores Master Overview' : activeBranch === 'pkdm' ? 'Pookkottumpadam Store (PKDM)' : 'Vaniyambalam Store (VNB)')
              }
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1 tracking-tight">
            {isMainAdmin
              ? 'Daily net sales, discount concessions, and monthly branch overview.'
              : 'Daily net sales, discount concessions, and payment collection breakdown.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly Audit PDF Download Button - Super Admin Only */}
          {isMainAdmin && (
            <a
              href="/api/reports/monthly-pdf"
              download
              className="apple-pressable inline-flex items-center gap-2 px-5 py-2.5 bg-[#094327] hover:bg-[#06311d] text-white rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Monthly Audit Report (PDF)</span>
            </a>
          )}

          <Link
            href={activeBranch && activeBranch !== 'all' ? `/?branch=${activeBranch}` : '/'}
            className="apple-pressable inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-950 text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open POS Billing</span>
          </Link>
        </div>
      </div>

      {/* Store Filter Tabs for Super Admin ONLY */}
      {isMainAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#094327]" />
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Select Store View:</span>
          </div>
          <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveBranch('all');
                fetchStatsForBranch('all');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBranch === 'all'
                  ? 'bg-[#094327] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-white/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Stores (Master)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveBranch('vnb');
                fetchStatsForBranch('vnb');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBranch === 'vnb'
                  ? 'bg-[#094327] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-white/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Vaniyambalam (VNB)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveBranch('pkdm');
                fetchStatsForBranch('pkdm');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBranch === 'pkdm'
                  ? 'bg-[#094327] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-white/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Pookkottumpadam (PKDM)</span>
            </button>
          </div>
        </div>
      )}

      {/* Core Metric Cards */}
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

      {/* Payment Collection Breakdown (Cash & UPI Only) */}
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
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-50/90 border border-neutral-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
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

              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-50/90 border border-neutral-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
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

      {/* Branch Stores Overview & Live Stats */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#094327]" />
            <h2 className="text-base font-bold text-neutral-900">
              {isMainAdmin
                ? 'Branch Stores Overview & Live Stats'
                : activeBranch === 'pkdm'
                ? 'Pookkottumpadam Outlet Overview'
                : 'Vaniyambalam Outlet Overview'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
            {isMainAdmin
              ? '2 Active Outlets (VNB & PKDM)'
              : activeBranch === 'pkdm'
              ? 'Pookkottumpadam Outlet (PKDM)'
              : 'Vaniyambalam Outlet (VNB)'}
          </span>
        </div>

        <div className={`grid grid-cols-1 ${isMainAdmin ? 'lg:grid-cols-2' : ''} gap-5`}>
          {/* VANIYAMBALAM STORE CARD - Shown to Main Admin or VNB Manager */}
          {(isMainAdmin || activeBranch === 'vnb') && (
            <div className={`p-6 rounded-3xl border transition-all ${
              activeBranch === 'vnb'
                ? 'ring-2 ring-[#094327] bg-emerald-50/40 border-emerald-300 shadow-md'
                : 'bg-white border-neutral-200/90 shadow-2xs hover:shadow-md'
            }`}>
              <div className="flex items-start justify-between border-b border-neutral-200/70 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#094327] text-white uppercase tracking-wider">
                      VNB STORE
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Active Store</span>
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 mt-1.5 tracking-tight">
                    TERRY7 WOMEN - Vaniyambalam
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Near Town Hall &amp; Railway Station, Vaniyambalam - 679339</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>+91 8330889632</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 text-xs">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Today&apos;s Sales</span>
                  <span className="text-xl font-black font-mono text-neutral-900 block mt-0.5">
                    ₹{(storesBreakdown?.vnb?.todaySales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {storesBreakdown?.vnb?.todayOrders || 0} orders realized today
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    {isMainAdmin ? 'Total Revenue' : "Today's Orders"}
                  </span>
                  <span className="text-xl font-black font-mono text-neutral-900 block mt-0.5">
                    {isMainAdmin
                      ? `₹${(storesBreakdown?.vnb?.totalNetSales || 0).toFixed(2)}`
                      : `${storesBreakdown?.vnb?.todayOrders || 0} Bills`}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {isMainAdmin
                      ? `${storesBreakdown?.vnb?.totalOrders || 0} total invoices generated`
                      : 'Completed customer transactions today'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                {isMainAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBranch('vnb');
                      fetchStatsForBranch('vnb');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeBranch === 'vnb'
                        ? 'bg-[#094327] text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    <span>{activeBranch === 'vnb' ? 'Viewing VNB Analytics' : 'Filter VNB Stats'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live POS Terminal Connected</span>
                  </div>
                )}

                <Link
                  href="/?branch=vnb"
                  className="apple-pressable inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Open VNB POS Billing</span>
                </Link>
              </div>
            </div>
          )}

          {/* POOKKOTTUMPADAM STORE CARD - Shown to Main Admin or PKDM Manager */}
          {(isMainAdmin || activeBranch === 'pkdm') && (
            <div className={`p-6 rounded-3xl border transition-all ${
              activeBranch === 'pkdm'
                ? 'ring-2 ring-[#094327] bg-emerald-50/40 border-emerald-300 shadow-md'
                : 'bg-white border-neutral-200/90 shadow-2xs hover:shadow-md'
            }`}>
              <div className="flex items-start justify-between border-b border-neutral-200/70 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#094327] text-white uppercase tracking-wider">
                      PKDM STORE
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Active Store</span>
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 mt-1.5 tracking-tight">
                    TERRY7 WOMEN - Pookkottumpadam
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Main Commercial Road, Pookkottumpadam - 679332</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>+91 8330889632</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 text-xs">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Today&apos;s Sales</span>
                  <span className="text-xl font-black font-mono text-neutral-900 block mt-0.5">
                    ₹{(storesBreakdown?.pkdm?.todaySales || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {storesBreakdown?.pkdm?.todayOrders || 0} orders realized today
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    {isMainAdmin ? 'Total Revenue' : "Today's Orders"}
                  </span>
                  <span className="text-xl font-black font-mono text-neutral-900 block mt-0.5">
                    {isMainAdmin
                      ? `₹${(storesBreakdown?.pkdm?.totalNetSales || 0).toFixed(2)}`
                      : `${storesBreakdown?.pkdm?.todayOrders || 0} Bills`}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {isMainAdmin
                      ? `${storesBreakdown?.pkdm?.totalOrders || 0} total invoices generated`
                      : 'Completed customer transactions today'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                {isMainAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBranch('pkdm');
                      fetchStatsForBranch('pkdm');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeBranch === 'pkdm'
                        ? 'bg-[#094327] text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    <span>{activeBranch === 'pkdm' ? 'Viewing PKDM Analytics' : 'Filter PKDM Stats'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live POS Terminal Connected</span>
                  </div>
                )}

                <Link
                  href="/?branch=pkdm"
                  className="apple-pressable inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Open PKDM POS Billing</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#094327] hover:bg-[#06311d] text-white rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer"
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
