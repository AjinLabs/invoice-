'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowRight, Eye } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <div className="bg-white p-7 sm:p-9 max-w-sm w-full space-y-6 border border-black/5 shadow-xl rounded-3xl">
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
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase apple-display flex items-center">
              <span className="text-[#094327]">TERRY</span>
              <span className="text-[#e11d48]">7</span>
            </span>
            <span className="text-[11px] font-bold bg-[#094327] text-white px-2.5 py-0.5 rounded-full tracking-widest uppercase">
              WOMEN
            </span>
          </div>
        </div>

        {/* Clean Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
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
                placeholder="Username"
              />
            </div>
          </div>

          <div>
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
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm apple-pressable"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Minimal Demo / Reviewer Preview */}
        <div className="pt-2 border-t border-neutral-100 text-center">
          <button
            type="button"
            onClick={handleLaunchDemo}
            disabled={isLoading || isDemoLoading}
            className="text-xs text-neutral-500 hover:text-black font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <Eye className="w-3.5 h-3.5 text-[#094327]" />
            <span>{isDemoLoading ? 'Opening...' : 'View Demo Preview'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
