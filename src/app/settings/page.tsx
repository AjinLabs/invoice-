'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Store,
  Tag,
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

  // Shop Info
  const [shopName, setShopName] = useState('TERRY7 WOMEN - Vaniyambalam');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gstin, setGstin] = useState('');

  // WhatsApp Cloud API Configuration (Administrator Only)
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState('');
  const [whatsappApiVersion, setWhatsappApiVersion] = useState('v20.0');

  // Pricing & Loyalty
  const [ratePerKg, setRatePerKg] = useState('899');
  const [loyaltyDiscount, setLoyaltyDiscount] = useState('449.50');
  const [minWeightGrams, setMinWeightGrams] = useState('1000');
  const [requiredVisits, setRequiredVisits] = useState('5');
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
        setPhone(s.phone || '+91 8330889632');
        setWhatsappNumber(s.whatsapp_number || '+91 8330889632');
        setGstin(s.gstin || '32AAAAA0000A1Z5');

        setWhatsappAccessToken(s.whatsapp_access_token || '');
        setWhatsappPhoneNumberId(s.whatsapp_phone_number_id || '');
        setWhatsappBusinessAccountId(s.whatsapp_business_account_id || '');
        setWhatsappApiVersion(s.whatsapp_api_version || 'v20.0');

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
          whatsapp_number: whatsappNumber,
          gstin,
          rate_per_kg: parseFloat(ratePerKg),
          loyalty_discount: parseFloat(loyaltyDiscount),
          min_weight_grams: parseInt(minWeightGrams, 10),
          required_visits: parseInt(requiredVisits, 10),
          round_off_mode: roundOffMode,
          whatsapp_access_token: whatsappAccessToken.trim() || undefined,
          whatsapp_phone_number_id: whatsappPhoneNumberId.trim() || undefined,
          whatsapp_business_account_id: whatsappBusinessAccountId.trim() || undefined,
          whatsapp_api_version: whatsappApiVersion.trim() || undefined,
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
              <p className="text-neutral-400">Store Access Security:</p>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                All passwords are encrypted with bcrypt. Set a new password below anytime to ensure only you have access.
              </p>
            </div>
            <div>
              <label className="block text-neutral-300 font-bold uppercase mb-1">
                Change Password (New):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
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

        {/* 3. WhatsApp Business Cloud API Configuration (Administrator Only) */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-neutral-800" />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  3. WhatsApp Business Platform Cloud API (Official Image Delivery)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Sends the actual invoice image attachment from configured business sender +91 8330889632 to customers
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                whatsappAccessToken && whatsappPhoneNumberId
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {whatsappAccessToken && whatsappPhoneNumberId ? 'API Configured' : 'Credentials Missing'}
            </span>
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed space-y-2">
            <p className="font-semibold text-neutral-900">
              📌 Official WhatsApp Sender: <span className="font-mono text-emerald-800 font-bold">+91 8330889632</span>
            </p>
            <p className="text-[11px] text-neutral-600">
              To send generated invoice images directly to customer WhatsApp chats as image attachments, provide your Meta WhatsApp Business Cloud API credentials below. These credentials remain securely stored on the server.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                placeholder="e.g. 109283746501928"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Meta Phone Number ID for +91 8330889632
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                WhatsApp Business Account ID
              </label>
              <input
                type="text"
                placeholder="e.g. 192837465019283"
                value={whatsappBusinessAccountId}
                onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Found in Meta Business Manager WhatsApp Accounts
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase mb-1">
                WhatsApp Permanent System User Access Token
              </label>
              <input
                type="password"
                placeholder="EAAG... (Permanent Meta System User Token)"
                value={whatsappAccessToken}
                onChange={(e) => setWhatsappAccessToken(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Must have <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code> permissions.
              </p>
            </div>
          </div>
        </div>



        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#094327] hover:bg-[#06311d] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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
