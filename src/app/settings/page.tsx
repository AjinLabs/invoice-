'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Store,
  Tag,
  Gift,
  Save,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Receipt,
  Users,
  FileSpreadsheet,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { ShopSettings, RoundOffMode, BranchId } from '@/lib/types';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [activeBranch, setActiveBranch] = useState<BranchId>('vnb');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Shop Info
  const [shopName, setShopName] = useState('TERRY WOMEN - Vaniyambalam');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gstin, setGstin] = useState('');

  // Pricing & Loyalty
  const [ratePerKg, setRatePerKg] = useState('899');
  const [loyaltyDiscount, setLoyaltyDiscount] = useState('449.50');
  const [minWeightGrams, setMinWeightGrams] = useState('1000');
  const [requiredVisits, setRequiredVisits] = useState('5');
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('FLOOR_10');

  // Password change for active branch
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    checkAuthAndInit();
  }, []);

  const checkAuthAndInit = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const authData = await res.json();
      if (!authData.authenticated) {
        window.location.href = '/login';
        return;
      }

      let branchToUse: BranchId = 'vnb';

      if (authData.user) {
        setCurrentUser(authData.user);
        if (authData.user.branch) {
          branchToUse = authData.user.branch;
          setActiveBranch(branchToUse);
        }
      }
      fetchSettings(branchToUse);
    } catch {
      fetchSettings('vnb');
    }
  };

  const fetchSettings = async (branch: BranchId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/settings?branch=${branch}`);
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setShopName(
          s.shop_name ||
            (branch === 'pkdm'
              ? 'TERRY WOMEN - Pookkottumpadam'
              : 'TERRY WOMEN - Vaniyambalam')
        );
        setAddress(s.address || '');
        setPhone(s.phone || '+91 8330889632');
        setWhatsappNumber(s.whatsapp_number || '+91 8330889632');
        setGstin(s.gstin || '32AAAAA0000A1Z5');

        setRatePerKg(s.rate_per_kg?.toString() || '899');
        setLoyaltyDiscount(s.loyalty_discount?.toString() || '449.50');
        setMinWeightGrams(s.min_weight_grams?.toString() || '1000');
        setRequiredVisits(s.required_visits?.toString() || '5');
        if (s.round_off_mode) {
          setRoundOffMode(s.round_off_mode);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
          whatsapp_number: whatsappNumber,
          gstin,
          rate_per_kg: parseFloat(ratePerKg),
          loyalty_discount: parseFloat(loyaltyDiscount),
          min_weight_grams: parseInt(minWeightGrams, 10),
          required_visits: parseInt(requiredVisits, 10),
          round_off_mode: roundOffMode,
          new_password: newPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setNewPassword('');
        setTimeout(() => setSaveSuccess(false), 3000);
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
            <span>Store & Application Settings</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Access records, export reports, configure billing rates, addresses, and branch passwords.
          </p>
        </div>

        {/* Branch Selector Tabs - Shown to Main Admin only */}
        {isMainAdmin && (
          <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => handleBranchSwitch('vnb')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
          SETTINGS HUB: Secondary App Modules (Invoices, Customers, Reports, WhatsApp)
          User requested: "bottom bar has billing, dashboard, settings, and inside settings all other features"
         ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Invoices */}
        <Link
          href="/invoices"
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Invoices Register</h3>
            <p className="text-[11px] text-neutral-500">
              Search and view past printed invoices and WhatsApp receipts
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-3">
            <span>View Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Customers */}
        <Link
          href="/customers"
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Customer Directory</h3>
            <p className="text-[11px] text-neutral-500">
              Track customer visit counts, spending, and loyalty reward eligibility
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-3">
            <span>View Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Reports & CSV Export */}
        <Link
          href="/reports"
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">Reports &amp; Downloads</h3>
            <p className="text-[11px] text-neutral-500">
              Download CSV spreadsheets of daily sales, discounts, and items
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-3">
            <span>Download CSV</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. WhatsApp Logs */}
        <Link
          href="/whatsapp"
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs hover:border-black transition-all group flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">WhatsApp Logs</h3>
            <p className="text-[11px] text-neutral-500">
              Verify sent messages, toggle Demo mode, and configure templates
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 group-hover:text-black pt-3">
            <span>Manage WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branch Admin Login Credentials Info */}
        <div className="bg-neutral-900 text-white p-6 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold">
                Branch Manager Login:{' '}
                {activeBranch === 'pkdm'
                  ? 'Pookkottumpadam Store'
                  : 'Vaniyambalam Store'}
              </h3>
            </div>
            <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded font-mono font-bold">
              Username: {activeBranch === 'pkdm' ? 'adminpkdm' : 'adminvnb'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-neutral-400">Default Password:</p>
              <p className="text-sm font-mono font-bold text-white mt-0.5">
                {activeBranch === 'pkdm' ? 'pkdm123' : 'vnb123'}
              </p>
            </div>
            <div>
              <label className="block text-neutral-300 font-bold uppercase mb-1">
                Change Branch Password (Optional):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new branch password"
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:border-white outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 1. Branch Information */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Store className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">
              1. {activeBranch.toUpperCase()} Branch Location &amp; Contact Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Store Branch Name
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Store Physical Address (Printed on Invoices)
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Store Landline / Phone
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Store WhatsApp Number
              </label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Rate & Pricing Settings */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Tag className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">
              2. Kilo Clothing Pricing &amp; Loyalty Rules
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
                onChange={(e) => setRatePerKg(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Default: ₹899 / KG</p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Loyalty Reward Discount (₹)
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
                50% OFF on 1 KG discount value (₹449.50)
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Minimum Weight for Reward (Grams)
              </label>
              <input
                type="number"
                step="100"
                min="100"
                required
                value={minWeightGrams}
                onChange={(e) => setMinWeightGrams(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                1000g (1 KG) required to unlock 50% off
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                Required Purchases to Unlock
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="10"
                required
                value={requiredVisits}
                onChange={(e) => setRequiredVisits(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-bold font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                5 purchases (reward applied on 6th purchase)
              </p>
            </div>
          </div>
        </div>

        {/* 3. Round Off Setting */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Gift className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">
              3. Default Round Off Concession Mode
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'FLOOR_10',
                title: 'Round Down (Floor ₹10)',
                desc: 'Store discount (₹899 → ₹890, ₹815 → ₹810)',
              },
              {
                id: 'NONE',
                title: 'Exact Amount',
                desc: 'No round off (₹899.00 exact)',
              },
              {
                id: 'MANUAL',
                title: 'Manual Custom Price',
                desc: 'Cashier custom total override',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRoundOffMode(opt.id as RoundOffMode)}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  roundOffMode === opt.id
                    ? 'border-black bg-black text-white shadow-xs'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="font-black text-xs uppercase mb-1">{opt.title}</div>
                <div
                  className={`text-[11px] leading-snug ${
                    roundOffMode === opt.id ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : `Save ${activeBranch.toUpperCase()} Settings`}</span>
          </button>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Branch settings updated successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
