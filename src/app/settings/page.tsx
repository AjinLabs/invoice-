'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Tag,
  Save,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Receipt,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Phone,
  Gift,
} from 'lucide-react';
import { RoundOffMode, BranchId } from '@/lib/types';

interface AuthUser {
  id: string;
  username: string;
  role: string;
  name: string;
  branch?: BranchId;
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeBranch, setActiveBranch] = useState<BranchId>('vnb');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store Contact
  const [shopName, setShopName] = useState('TERRY7 WOMEN - Vaniyambalam');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+91 8330889632');

  // Pricing & Loyalty
  const [ratePerKg, setRatePerKg] = useState('899');
  const [targetLoyaltyGrams, setTargetLoyaltyGrams] = useState('5000');
  const [loyaltyDiscount, setLoyaltyDiscount] = useState('449.50');
  const [minWeightGrams, setMinWeightGrams] = useState('1000');
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('FLOOR_10');

  // Password change for active branch
  const [newPassword, setNewPassword] = useState('');

  const fetchSettings = useCallback(async (branch: BranchId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/settings?branch=${branch}`);
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setShopName(
          s.shop_name ||
            (branch === 'pkdm'
              ? 'TERRY7 WOMEN - Pookkottumpadam'
              : 'TERRY7 WOMEN - Vaniyambalam')
        );
        setAddress(s.address || '');
        setPhone(s.whatsapp_number || s.phone || '+91 8330889632');

        setRatePerKg(s.rate_per_kg?.toString() || '899');
        setTargetLoyaltyGrams(s.target_loyalty_grams?.toString() || '5000');
        setLoyaltyDiscount(s.loyalty_discount?.toString() || '449.50');
        setMinWeightGrams(s.min_weight_grams?.toString() || '1000');
        if (s.round_off_mode) {
          setRoundOffMode(s.round_off_mode);
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
    const checkAuthAndInit = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const authData = await res.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }

        let branchToUse: BranchId = 'vnb';

        if (authData.user && isMounted) {
          setCurrentUser(authData.user);
          if (authData.user.branch) {
            branchToUse = authData.user.branch;
            setActiveBranch(branchToUse);
          }
        }
        if (isMounted) {
          fetchSettings(branchToUse);
        }
      } catch {
        if (isMounted) fetchSettings('vnb');
      }
    };

    checkAuthAndInit();
    return () => {
      isMounted = false;
    };
  }, [fetchSettings, router]);

  const handleBranchSwitch = (branch: BranchId) => {
    setActiveBranch(branch);
    fetchSettings(branch);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: activeBranch,
          shop_name: shopName,
          address,
          phone,
          whatsapp_number: phone,
          rate_per_kg: parseFloat(ratePerKg),
          target_loyalty_grams: parseInt(targetLoyaltyGrams, 10),
          loyalty_discount: parseFloat(loyaltyDiscount),
          min_weight_grams: parseInt(minWeightGrams, 10),
          round_off_mode: roundOffMode,
          new_password: newPassword.trim() || undefined,
          target_username: activeBranch === 'pkdm' ? 'adminpkdm' : 'adminvnb',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setNewPassword('');
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isMainAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin';

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
        Loading shop settings...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-neutral-900" />
            <span>Store &amp; Application Settings</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Configure clothing rates, 5 KG customer loyalty rules, store contact number, and branch passwords.
          </p>
        </div>

        {/* Branch Selector Tabs - Shown to Main Admin */}
        {isMainAdmin && (
          <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => handleBranchSwitch('vnb')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBranch === 'vnb'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Vaniyambalam (VNB)
            </button>
            <button
              type="button"
              onClick={() => handleBranchSwitch('pkdm')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBranch === 'pkdm'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Pookkottumpadam (PKDM)
            </button>
          </div>
        )}
      </div>

      {/* ==============================================================
          SETTINGS HUB: Secondary App Modules (3 Clean Cards Only)
         ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Invoices */}
        <Link
          href="/invoices"
          className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Invoices Register</h3>
            <p className="text-[11px] text-neutral-500">
              Search, view, and print past customer bills &amp; receipts
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-4">
            <span>View Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Customers */}
        <Link
          href="/customers"
          className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Customer Directory</h3>
            <p className="text-[11px] text-neutral-500">
              Track 5 KG loyalty weight progress and customer purchase history
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-4">
            <span>View Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Reports & CSV Export */}
        <Link
          href="/reports"
          className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Reports &amp; Downloads</h3>
            <p className="text-[11px] text-neutral-500">
              Download CSV spreadsheets of daily store sales, weights, and items
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-4">
            <span>Download CSV</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Branch Manager Login & Store Contact */}
        <div className="bg-neutral-900 text-white p-6 rounded-xl shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold">
                Branch Manager Login:{' '}
                {activeBranch === 'pkdm'
                  ? 'Pookkottumpadam Store'
                  : 'Vaniyambalam Store'}
              </h3>
            </div>
            <span className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg font-mono font-bold w-fit">
              Login ID: {activeBranch === 'pkdm' ? 'adminpkdm' : 'adminvnb'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-bold uppercase mb-1">
                Change Password:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:border-white outline-hidden"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Leave blank to keep existing password unchanged.
              </p>
            </div>

            <div>
              <label className="block text-neutral-300 font-bold uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Store Mobile / Contact Number:</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 8330889632"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:border-white outline-hidden"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Official store contact number printed on customer invoices and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Rate & Pricing Settings */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Tag className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">
              Kilo Clothing Pricing &amp; 5 KG Loyalty Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Rate Per Kilogram (₹ / KG)
              </label>
              <input
                type="number"
                step="1"
                min="100"
                required
                value={ratePerKg}
                onChange={(e) => {
                  const val = e.target.value;
                  setRatePerKg(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) {
                    setLoyaltyDiscount((num * 0.5).toFixed(2));
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Standard Selling Price: ₹899 / KG</p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-emerald-600" />
                <span>Loyalty Target (Cumulative Weight to Unlock):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="500"
                  min="1000"
                  required
                  value={targetLoyaltyGrams}
                  onChange={(e) => setTargetLoyaltyGrams(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
                />
                <span className="text-xs font-bold text-neutral-500 whitespace-nowrap">
                  Grams ({Number(targetLoyaltyGrams) / 1000} KG)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Customer unlocks reward once total cumulative purchases reach 5 KG (5000g).
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Loyalty Reward Value (500g FREE Discount in ₹):
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={loyaltyDiscount}
                onChange={(e) => setLoyaltyDiscount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                50% OFF on 1 KG dress material (500 grams FREE = ₹449.50)
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Minimum Purchase to Redeem Reward:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  min="500"
                  required
                  value={minWeightGrams}
                  onChange={(e) => setMinWeightGrams(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
                />
                <span className="text-xs font-bold text-neutral-500 whitespace-nowrap">
                  Grams ({Number(minWeightGrams) / 1000} KG)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Customer must purchase at least 1 KG on the redemption visit to receive 500g FREE.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#094327] hover:bg-[#06311d] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : `Save ${activeBranch.toUpperCase()} Settings`}</span>
          </button>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings updated &amp; saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
