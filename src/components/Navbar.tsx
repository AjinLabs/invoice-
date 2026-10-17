'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  LayoutDashboard,
  Settings,
  Store,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setCurrentUser(data.user);
        if (data.branchInfo) {
          setBranchInfo(data.branchInfo);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {}
  };

  useEffect(() => {
    if (pathname !== '/login') {
      checkAuth();
    }
  }, [pathname]);

  // Completely hide all navigation and bottom dock on the login page
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const isMainAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';

  // Bottom dock items: Main Admin only gets Dashboard & Settings; Store Managers get Billing, Dashboard, Settings
  const bottomTabs = isMainAdmin
    ? [
        {
          id: 'dashboard',
          label: 'Master Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          isActive: pathname === '/dashboard' || pathname === '/',
        },
        {
          id: 'settings',
          label: 'Settings & Reports',
          href: '/settings',
          icon: Settings,
          isActive:
            pathname === '/settings' ||
            pathname === '/invoices' ||
            pathname === '/customers' ||
            pathname === '/reports' ||
            pathname === '/whatsapp',
        },
      ]
    : [
        {
          id: 'billing',
          label: 'Billing',
          href: '/',
          icon: ShoppingBag,
          isActive: pathname === '/',
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          isActive: pathname === '/dashboard',
        },
        {
          id: 'settings',
          label: 'Settings',
          href: '/settings',
          icon: Settings,
          isActive:
            pathname === '/settings' ||
            pathname === '/invoices' ||
            pathname === '/customers' ||
            pathname === '/reports' ||
            pathname === '/whatsapp',
        },
      ];

  // Resolve Branch Label in clean English
  const getBranchBadge = () => {
    if (isMainAdmin) {
      return {
        label: 'Main Admin (All Stores)',
        bgColor: 'bg-neutral-800 text-neutral-200 border-neutral-700',
        icon: ShieldCheck,
      };
    }
    if (currentUser?.branch === 'pkdm') {
      return {
        label: 'Pookkottumpadam Store',
        bgColor: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
        icon: Store,
      };
    }
    if (currentUser?.branch === 'vnb') {
      return {
        label: 'Vaniyambalam Store',
        bgColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
        icon: Store,
      };
    }
    return {
      label: 'Store POS',
      bgColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      icon: Store,
    };
  };

  const branchBadge = getBranchBadge();
  const BranchIcon = branchBadge.icon;

  return (
    <>
      {/* ==============================================================
          1. TOP APP HEADER (Minimal, Clean, Professional - No Website Links)
         ============================================================== */}
      <header className="bg-black text-white border-b border-neutral-800 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <img
                  src="/logo.png"
                  alt="Terry Women"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain border border-emerald-900/60 shadow-xs group-hover:scale-105 transition-transform"
                />
                <span className="text-lg sm:text-xl font-black tracking-widest text-white group-hover:text-neutral-300 transition-colors uppercase">
                  TERRY
                </span>
                <span className="text-[10px] font-bold bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded border border-neutral-700 tracking-wider uppercase">
                  WOMEN
                </span>
              </Link>

              {/* Active Branch Badge */}
              <div className="flex items-center ml-1 sm:ml-3">
                <div
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${branchBadge.bgColor}`}
                >
                  <BranchIcon className="w-3.5 h-3.5" />
                  <span>{branchBadge.label}</span>
                </div>
              </div>
            </div>

            {/* Right: User Information & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-neutral-300 font-semibold hidden sm:inline">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-rose-400 transition-colors p-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==============================================================
          2. BOTTOM APP NAVIGATION DOCK (Billing, Dashboard, Settings)
             Replaces top website navbar as requested by user - Only visible when logged in
         ============================================================== */}
      {currentUser && (
        <nav
          aria-label="App Navigation"
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] no-print py-1.5 px-4"
        >
          <div className="max-w-md mx-auto flex items-center justify-around">
            {bottomTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.isActive;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center py-1 px-4 sm:px-6 rounded-xl transition-all ${
                    isActive
                      ? 'text-black font-extrabold'
                      : 'text-neutral-500 hover:text-black font-medium'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-transparent text-neutral-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[11px] sm:text-xs mt-0.5 tracking-tight">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
