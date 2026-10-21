'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  LayoutDashboard,
  Settings,
  LogIn,
  LogOut,
} from 'lucide-react';

interface AuthUser {
  id: string;
  username: string;
  role: string;
  name: string;
  branch?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (pathname !== '/login') {
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            if (data.authenticated && data.user) {
              setCurrentUser(data.user);
            } else {
              setCurrentUser(null);
            }
          }
        })
        .catch(() => {
          if (isMounted) setCurrentUser(null);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Completely hide all navigation and bottom dock on the login page and customer invoice page
  if (pathname === '/login' || pathname.startsWith('/invoice/')) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    document.cookie = 'terry_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'terry_branch=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setCurrentUser(null);
    router.replace('/login');
    router.refresh();
  };

  const isMainAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';

  // Bottom dock items: Main Admin gets Dashboard & Settings; Store Managers get Billing, Dashboard, Settings
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

  return (
    <>
      {/* ==============================================================
          1. TOP APP HEADER: Clean, minimal logo-focused navbar
         ============================================================== */}
      <header className="sticky top-0 z-40 no-print bg-neutral-950/85 backdrop-blur-2xl border-b border-white/10 saturate-180 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left: Brand Logo only as requested */}
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center gap-2 group apple-pressable bg-white hover:bg-neutral-50 p-1 sm:p-1.5 rounded-full shadow-xs border border-white/20 transition-all"
                title="TERRY7 WOMEN"
              >
                <Image
                  src="/logo.png"
                  alt="TERRY7 WOMEN"
                  width={34}
                  height={34}
                  priority
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain group-hover:scale-105 transition-transform"
                />
              </Link>
            </div>

            {/* Right: Clean Logout / Login Action */}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser?.role === 'DEMO_VIEWER' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Demo Mode</span>
                </div>
              )}
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  title={currentUser.role === 'DEMO_VIEWER' ? 'Exit Demo Mode' : 'Sign Out'}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full transition-all apple-pressable cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">
                    {currentUser.role === 'DEMO_VIEWER' ? 'Exit Demo' : 'Logout'}
                  </span>
                </button>
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
          2. BOTTOM APP NAVIGATION DOCK (Apple Floating Glass Dock)
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
