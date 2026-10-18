'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowRight, Store, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('adminvnb');
  const [password, setPassword] = useState('vnb123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const quickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

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
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-neutral-100/70">
      <div className="apple-surface bg-white p-8 sm:p-9 max-w-md w-full space-y-6 border border-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-3xl">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-[#094327]">
            <img src="/logo.png" alt="TERRY7 WOMEN" className="w-full h-full object-contain" />
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
          <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">Branch & Store Manager Login</h2>
          <p className="text-xs text-neutral-500 mt-1">Select your shop location or enter credentials</p>
        </div>

        {/* Quick Branch Selectors */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Select Your Store Location:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => quickSelect('adminvnb', 'vnb123')}
              className={`p-3.5 rounded-2xl border text-left transition-all apple-pressable ${
                username === 'adminvnb'
                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                  : 'border-neutral-200/80 bg-neutral-50/80 text-neutral-800 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5 tracking-tight">
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span>Vaniyambalam</span>
              </div>
              <p className={`text-[10px] leading-tight ${username === 'adminvnb' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                Branch POS Login
              </p>
              <p className={`text-[9px] font-mono mt-1 ${username === 'adminvnb' ? 'text-neutral-400' : 'text-neutral-400'}`}>
                adminvnb
              </p>
            </button>

            <button
              type="button"
              onClick={() => quickSelect('adminpkdm', 'pkdm123')}
              className={`p-3.5 rounded-2xl border text-left transition-all apple-pressable ${
                username === 'adminpkdm'
                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                  : 'border-neutral-200/80 bg-neutral-50/80 text-neutral-800 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5 tracking-tight">
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span>Pookkottumpadam</span>
              </div>
              <p className={`text-[10px] leading-tight ${username === 'adminpkdm' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                Branch POS Login
              </p>
              <p className={`text-[9px] font-mono mt-1 ${username === 'adminpkdm' ? 'text-neutral-400' : 'text-neutral-400'}`}>
                adminpkdm
              </p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                placeholder="e.g. adminvnb or adminpkdm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
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
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm apple-pressable"
          >
            <span>{isLoading ? 'Verifying...' : 'Sign In to Store'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Super admin shortcut */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Super Admin access:</span>
          <button
            type="button"
            onClick={() => quickSelect('admin', 'admin123')}
            className="text-neutral-900 font-semibold hover:underline flex items-center gap-1 apple-pressable"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>admin / admin123</span>
          </button>
        </div>
      </div>
    </div>
  );
}
