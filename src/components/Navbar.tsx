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
          1. TOP APP HEADER (Apple Dark Glass Chrome - design.md §12)
         ============================================================== */}
      <header className="sticky top-0 z-40 no-print bg-neutral-950/85 backdrop-blur-2xl border-b border-white/10 saturate-180 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 group apple-pressable bg-white hover:bg-neutral-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs border border-white/20 transition-all"
              >
                <img
                  src="/logo.png"
                  alt="TERRY7 WOMEN"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain group-hover:scale-105 transition-transform"
                />
                <span className="text-sm sm:text-base font-black tracking-wider uppercase flex items-center">
                  <span className="text-[#094327]">TERRY</span>
                  <span className="text-[#e11d48]">7</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold bg-[#094327] text-white px-2 py-0.5 rounded-full tracking-widest uppercase">
                  WOMEN
                </span>
              </Link>

              {/* Active Branch Badge */}
              <div className="flex items-center ml-1 sm:ml-3">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${branchBadge.bgColor} shadow-2xs`}
                >
                  <BranchIcon className="w-3.5 h-3.5" />
                  <span className="tracking-tight">{branchBadge.label}</span>
                </div>
              </div>
            </div>

            {/* Right: User Information & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                  <span className="text-xs text-neutral-200 font-medium hidden sm:inline tracking-tight">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-rose-400 transition-colors p-1 rounded-md"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-neutral-100 rounded-full text-xs font-semibold shadow-xs transition-all apple-pressable"
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
          2. BOTTOM APP NAVIGATION DOCK (Apple Floating Glass Dock - design.md §1, §12)
             Translucent floating pill dock with instant press feedback
         ============================================================== */}
      {currentUser && (
        <aside aria-label="Quick Navigation" className="fixed bottom-4 inset-x-0 z-40 pointer-events-none flex justify-center px-4 no-print">
          <nav
            aria-label="App Navigation"
            className="pointer-events-auto bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl saturate-180 border border-black/5 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.12)] rounded-full py-1.5 px-3 flex items-center gap-1 sm:gap-2"
          >
            {bottomTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.isActive;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center py-1 px-4 sm:px-5 rounded-full transition-all apple-pressable ${
                    isActive
                      ? 'text-[#094327] dark:text-emerald-400 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-full transition-all duration-150 ${
                      isActive
                        ? 'bg-[#094327] text-white shadow-xs scale-105'
                        : 'bg-transparent text-neutral-500'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-semibold">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
    </>
  );
}
