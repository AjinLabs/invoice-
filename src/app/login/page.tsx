'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowRight, Eye, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.user?.role === 'SUPER_ADMIN' || data.user?.username === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchDemo = async () => {
    setError('');
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error('Failed to launch demo mode');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start demo';
      setError(msg);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100/70">
      <div className="bg-white p-7 sm:p-9 max-w-md w-full space-y-6 border border-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-3xl">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-[#094327]">
            <Image
              src="/logo.png"
              alt="TERRY7 WOMEN"
              width={80}
              height={80}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase apple-display flex items-center">
              <span className="text-[#094327]">TERRY</span>
              <span className="text-[#e11d48]">7</span>
            </span>
            <span className="text-[11px] font-bold bg-[#094327] text-white px-2.5 py-0.5 rounded-full tracking-widest uppercase">
              WOMEN
            </span>
          </div>
          <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">
            Store &amp; POS Management
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Enter your credentials to access live billing &amp; store operations
          </p>
        </div>

        {/* Secure Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm font-mono bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50/80 border border-rose-200/80 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm apple-pressable"
          >
            <span>{isLoading ? 'Verifying...' : 'Sign In to Store'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Public Visitor / Demo Showcase Card */}
        <div className="pt-4 border-t border-neutral-200/80">
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-800">
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>Visiting or Reviewing this Project?</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Explore the POS billing calculator, analytics, and receipts in safe read-only demo mode. Real customer data and WhatsApp operations remain locked.
            </p>
            <button
              type="button"
              onClick={handleLaunchDemo}
              disabled={isLoading || isDemoLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-xs apple-pressable"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isDemoLoading ? 'Launching...' : 'Explore Public Demo (ഡെമോ കാണുക)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
