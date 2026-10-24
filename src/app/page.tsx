'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Phone,
  User,
  Scale,
  Sparkles,
  Send,
  RotateCcw,
  AlertCircle,
  Gift,
  Banknote,
  Smartphone,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import WhatsAppSuccessModal from '@/components/WhatsAppSuccessModal';
import { Customer, ShopSettings, PaymentMethod, Purchase, RoundOffMode, BranchId, BranchInfo } from '@/lib/types';
import { calculateBilling, CustomItemInput } from '@/lib/billing';
import { normalizeWhatsAppPhone } from '@/lib/phone';

interface AuthMeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    branch?: BranchId;
  };
  branchInfo?: BranchInfo;
}

export default function BillingPage() {
  const router = useRouter();

  // Input States
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  // Customer Autocomplete & Quick-Search States
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);

  // Input & Button Refs for instant Enter-key progression
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const sendBillBtnRef = useRef<HTMLButtonElement>(null);
  const customAmountInputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const phoneCacheRef = useRef<Map<string, Customer[]>>(new Map());

  // Dress weight selection - default is empty so user enters custom weight directly
  const [weight, setWeight] = useState<number | string>('');
  const [unit] = useState<'g' | 'kg'>('g');
  const itemDesc = 'Ladies Readymade Garment / Dress Material';

  // Custom items list
  const [customItems, setCustomItems] = useState<CustomItemInput[]>([]);

  // Payment and round off
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('NONE');
  const [defaultMode, setDefaultMode] = useState<RoundOffMode>('NONE');
  const [modeToast, setModeToast] = useState<{ message: string; visible: boolean } | null>(null);
  const clickTrackerRef = useRef<{ mode: RoundOffMode; count: number; lastTime: number }>({
    mode: 'NONE',
    count: 0,
    lastTime: 0,
  });
  const [manualAmount, setManualAmount] = useState<string>('');

  // Branch & System States
  const [activeBranch, setActiveBranch] = useState<BranchId>('vnb');
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);

  // Customer & System States
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Completed purchase state
  const [completedPurchase, setCompletedPurchase] = useState<Purchase | null>(null);

  // WhatsApp Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [billImageDataUrl, setBillImageDataUrl] = useState<string | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<{
    isDemo: boolean;
    status: string;
    formattedText: string;
    errorMessage?: string;
  } | null>(null);
  const [isResending, setIsResending] = useState(false);

  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('INV-VNB-2026-000101');

  // Fetch branch settings helper
  const fetchSettings = useCallback(async (branch?: BranchId) => {
    try {
      const branchQuery = branch || activeBranch;
      const res = await fetch(`/api/settings?branch=${branchQuery}`);
      const data = await res.json();
      if (data.success) {
        setShopSettings(data.settings);
        if (data.branchInfo) {
          setBranchInfo(data.branchInfo);
        }
        if (data.next_invoice_number) {
          setNextInvoiceNumber(data.next_invoice_number);
        }
        // Determine default mode: check localStorage first, then server settings, default to 'NONE'
        let initialMode: RoundOffMode = 'NONE';
        if (typeof window !== 'undefined') {
          const localDefault = localStorage.getItem('terry_default_amount_mode') as RoundOffMode | null;
          if (localDefault && ['NONE', 'FLOOR_10', 'MANUAL'].includes(localDefault)) {
            initialMode = localDefault;
          } else if (data.settings?.round_off_mode) {
            initialMode = data.settings.round_off_mode;
          }
        } else if (data.settings?.round_off_mode) {
          initialMode = data.settings.round_off_mode;
        }
        setDefaultMode(initialMode);
        setRoundOffMode(initialMode);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeBranch]);

  // Reset billing form cleanly for next customer (prevents data leaks)
  const handleReset = useCallback(() => {
    setName('');
    setPhone('');
    setAddress('');
    setWeight('');
    setCustomItems([]);
    setManualAmount('');
    let modeToRestore: RoundOffMode = 'NONE';
    if (typeof window !== 'undefined') {
      const localDefault = localStorage.getItem('terry_default_amount_mode') as RoundOffMode | null;
      if (localDefault) modeToRestore = localDefault;
      else if (defaultMode) modeToRestore = defaultMode;
    } else if (defaultMode) {
      modeToRestore = defaultMode;
    }
    setRoundOffMode(modeToRestore);
    setCustomer(null);
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setCompletedPurchase(null);
    setBillImageDataUrl(null);
    setWhatsappResult(null);
    setShowSuccessModal(false);
    setErrorMessage('');
    fetchSettings(activeBranch);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  }, [activeBranch, defaultMode, fetchSettings]);

  // Triple-click / triple-tap to set persistent default mode
  const handleAmountModeClick = (mode: RoundOffMode) => {
    const now = Date.now();
    const tracker = clickTrackerRef.current;

    // Switch mode immediately for the current bill
    setRoundOffMode(mode);
    if (mode !== 'MANUAL') {
      setManualAmount('');
    } else {
      setTimeout(() => {
        customAmountInputRef.current?.focus();
        customAmountInputRef.current?.select();
      }, 50);
    }

    // Check if clicked 3 times within 700ms between clicks
    if (tracker.mode === mode && now - tracker.lastTime < 700) {
      tracker.count += 1;
      tracker.lastTime = now;

      if (tracker.count >= 3) {
        // Set as persistent default!
        setDefaultMode(mode);
        try {
          localStorage.setItem('terry_default_amount_mode', mode);
        } catch {}

        // Also save to server settings in background
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round_off_mode: mode }),
        }).catch(() => {});

        const modeTitle =
          mode === 'NONE'
            ? '1. Exact Amount'
            : mode === 'FLOOR_10'
            ? '2. Round Down to ₹10'
            : '3. Custom Amount';

        setModeToast({
          message: `⭐ ${modeTitle} is now your DEFAULT billing mode!`,
          visible: true,
        });

        setTimeout(() => {
          setModeToast(null);
        }, 3200);

        tracker.count = 0;
      }
    } else {
      tracker.mode = mode;
      tracker.count = 1;
      tracker.lastTime = now;
    }
  };

  // Resend WhatsApp message
  const handleResendWhatsApp = async () => {
    if (!completedPurchase) return;
    setIsResending(true);
    try {
      const res = await fetch('/api/whatsapp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: completedPurchase.id }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setWhatsappResult(data.result);
      }
    } catch (err) {
      console.error('Error resending WhatsApp:', err);
    } finally {
      setIsResending(false);
    }
  };

  // Auth & Settings Check on Mount
  useEffect(() => {
    let isMounted = true;
    const checkAuthAndSettings = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData: AuthMeResponse = await authRes.json();
        let branchToUse: BranchId = 'vnb';

        if (!authData.authenticated) {
          router.push('/login');
          return;
        }

        if (authData.user) {
          if (authData.user.role === 'SUPER_ADMIN' || authData.user.username === 'admin') {
            router.push('/dashboard');
            return;
          }
          if (authData.user.branch) {
            branchToUse = authData.user.branch;
            if (isMounted) setActiveBranch(branchToUse);
          }
          if (authData.branchInfo && isMounted) {
            setBranchInfo(authData.branchInfo);
          }
        }

        if (isMounted) {
          fetchSettings(branchToUse);
        }
      } catch {
        if (isMounted) fetchSettings('vnb');
      }
    };

    checkAuthAndSettings();
    return () => {
      isMounted = false;
    };
  }, [fetchSettings, router]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Customer selection from autocomplete
  const selectCustomer = (cust: Customer) => {
    setPhone(cust.phone.replace(/\D/g, ''));
    setName(cust.name);
    setAddress(cust.address || '');
    setCustomer(cust);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
    // Jump straight to clothing weight input
    setTimeout(() => {
      weightInputRef.current?.focus();
      weightInputRef.current?.select();
    }, 50);
  };

  // Debounced ultra-fast customer lookup & autocomplete by phone number (starts from 3-4 digits)
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    setPhone(digitsOnly);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (digitsOnly.length < 3) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      if (customer) setCustomer(null);
      return;
    }

    // Check instant in-memory cache first (0ms latency)
    const cacheKey = `${activeBranch}_${digitsOnly}`;
    if (phoneCacheRef.current.has(cacheKey)) {
      const cached = phoneCacheRef.current.get(cacheKey) || [];
      setCustomerSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      setHighlightedSuggestion(0);
      const exact = cached.find((c: Customer) => {
        const cDigits = c.phone.replace(/\D/g, '');
        return cDigits === digitsOnly || (digitsOnly.length >= 10 && cDigits.endsWith(digitsOnly));
      });
      if (exact) {
        setName(exact.name);
        setAddress(exact.address || '');
        setCustomer(exact);
      }
      return;
    }

    setIsSearchingCustomer(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(digitsOnly)}&branch=${activeBranch}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          phoneCacheRef.current.set(cacheKey, data.customers);
          setCustomerSuggestions(data.customers);
          setShowSuggestions(data.customers.length > 0);
          setHighlightedSuggestion(0);

          // If exact match by full phone number or 10-digit suffix, auto-populate name!
          const exact = data.customers.find((c: Customer) => {
            const cDigits = c.phone.replace(/\D/g, '');
            return cDigits === digitsOnly || (digitsOnly.length >= 10 && cDigits.endsWith(digitsOnly));
          });
          if (exact) {
            setName(exact.name);
            setAddress(exact.address || '');
            setCustomer(exact);
          }
        }
      } catch (err) {
        console.error('Customer lookup error:', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 60);
  };

  // Keyboard navigation for phone input
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && customerSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedSuggestion((prev) => Math.min(prev + 1, customerSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedSuggestion((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (customerSuggestions[highlightedSuggestion]) {
          selectCustomer(customerSuggestions[highlightedSuggestion]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!name.trim()) {
        nameInputRef.current?.focus();
      } else {
        weightInputRef.current?.focus();
        weightInputRef.current?.select();
      }
    }
  };

  // Keyboard navigation for clothing weight input: Enter moves to Amount Section
  const handleWeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (roundOffMode === 'MANUAL') {
        customAmountInputRef.current?.focus();
        customAmountInputRef.current?.select();
      } else {
        sendBillBtnRef.current?.focus();
      }
    }
  };

  // Live autocomplete search effect: triggers suggestions as soon as 4 digits are typed
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 4) {
      return;
    }

    let isCancelled = false;
    const cacheKey = `${activeBranch}_${cleanPhone}`;

    if (phoneCacheRef.current.has(cacheKey)) {
      const cached = phoneCacheRef.current.get(cacheKey) || [];
      setCustomerSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      setHighlightedSuggestion(0);
      const exact = cached.find((c: Customer) => c.phone === cleanPhone);
      if (exact) {
        setCustomer(exact);
        setName((prev) => (!prev || prev === 'Walk-in Customer' ? exact.name : prev));
        if (exact.address) {
          setAddress((prev) => (!prev ? (exact.address || '') : prev));
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingCustomer(true);
      fetch(`/api/customers?q=${cleanPhone}&branch=${activeBranch}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isCancelled && data.success && Array.isArray(data.customers)) {
            phoneCacheRef.current.set(cacheKey, data.customers);
            const matches = data.customers.slice(0, 5);
            setCustomerSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setHighlightedSuggestion(0);

            // If exact match by full phone number, auto-fill customer
            const exact = data.customers.find((c: Customer) => c.phone === cleanPhone);
            if (exact) {
              setCustomer(exact);
              setName((prev) => (!prev || prev === 'Walk-in Customer' ? exact.name : prev));
              if (exact.address) {
                setAddress((prev) => (!prev ? (exact.address || '') : prev));
              }
            }
          }
        })
        .catch(() => {
          if (!isCancelled) setCustomerSuggestions([]);
        })
        .finally(() => {
          if (!isCancelled) setIsSearchingCustomer(false);
        });
    }, 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [phone, activeBranch]);

  // Perform Real-Time Billing Calculation
  const numericWeight = typeof weight === 'number'
    ? weight
    : parseFloat(weight) || 0;

  const billingCalc = useMemo(() => {
    return calculateBilling({
      weight: numericWeight,
      unit,
      ratePerKg: branchInfo?.rate_per_kg ?? shopSettings?.rate_per_kg ?? 899,
      customer,
      shopSettings: shopSettings ?? undefined,
      roundOffMode,
      manualAmount: roundOffMode === 'MANUAL' ? manualAmount : undefined,
      customItems,
    });
  }, [numericWeight, unit, customer, shopSettings, roundOffMode, manualAmount, customItems, branchInfo]);

  // Custom Item Handlers
  const handleAddCustomItem = (namePreset: string = '', pricePreset: number = 0) => {
    const newItem: CustomItemInput = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: namePreset || '',
      quantity: 1,
      unitPrice: pricePreset || 0,
      amount: pricePreset || 0,
    };
    setCustomItems([...customItems, newItem]);
  };

  const handleUpdateCustomItem = (
    id: string,
    field: 'name' | 'quantity' | 'unitPrice',
    val: string | number
  ) => {
    setCustomItems(
      customItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          const qty = field === 'quantity' ? Math.max(1, parseInt(String(val), 10) || 1) : item.quantity;
          const price = field === 'unitPrice' ? Math.max(0, parseFloat(String(val)) || 0) : item.unitPrice;
          updated.amount = Math.round(qty * price * 100) / 100;
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(customItems.filter((it) => it.id !== id));
  };

  // Form Submission (Complete Purchase & Open WhatsApp Modal)
  const handleCompletePurchase = async (shouldPrintDirectly: boolean = false) => {
    setErrorMessage('');
    const phoneValidation = normalizeWhatsAppPhone(phone);
    if (!phoneValidation.isValid) {
      setErrorMessage(phoneValidation.error || 'Please enter a valid 10-digit customer phone number.');
      phoneInputRef.current?.focus();
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter customer name.');
      nameInputRef.current?.focus();
      return;
    }

    if (numericWeight <= 0 && customItems.length === 0) {
      setErrorMessage('Please enter weight in grams or add a custom item.');
      weightInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      // Invoice image is not needed as customer receives clean text without image attachments
      const base64Image = '';

      const payload = {
        phone: phoneValidation.normalizedPhone,
        name: name.trim(),
        address: address.trim(),
        weight: numericWeight,
        unit,
        branch: activeBranch,
        payment_method: paymentMethod,
        description: itemDesc,
        round_off_mode: roundOffMode,
        manual_amount: roundOffMode === 'MANUAL' ? parseFloat(manualAmount) || undefined : undefined,
        custom_items: customItems,
        invoice_image: base64Image,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete purchase');
      }

      const createdPurchase = data.purchase;
      setCompletedPurchase(createdPurchase);
      setCustomer(data.customer);
      setBillImageDataUrl(base64Image);
      setWhatsappResult(data.whatsapp);
      phoneCacheRef.current.clear();

      // Open WhatsApp Confirmation Modal ("Bill Generated & Ready!")
      setShowSuccessModal(true);

      if (shouldPrintDirectly) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error completing purchase';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100 p-3 sm:p-5 lg:p-6 pb-28">
      <div className="max-w-7xl mx-auto no-print">
        {/* Tablet & Desktop 2-Column Responsive POS Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          
          {/* Left Column (Tablets & Desktop: 7 cols) - Data Entry & Items */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Customer Details Card */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-neutral-800" />
                  <h2 className="text-base font-bold text-neutral-900 tracking-tight">Customer Information</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full font-semibold border border-neutral-200">
                    {nextInvoiceNumber}
                  </span>
                  <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                    {activeBranch.toUpperCase()} STORE
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Phone Input with live search & autocomplete dropdown */}
                <div className="relative" ref={suggestionsContainerRef}>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    WhatsApp Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onKeyDown={handlePhoneKeyDown}
                      onFocus={() => {
                        if (customerSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Enter mobile number"
                      maxLength={15}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-base font-medium outline-hidden transition-all bg-neutral-50/50 focus:bg-white"
                    />
                    {isSearchingCustomer && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-neutral-400">
                        Searching...
                      </div>
                    )}
                  </div>

                  {/* Customer Autocomplete Suggestions Dropdown */}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="p-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                        <span>Matching Existing Customers ({customerSuggestions.length})</span>
                        <span className="text-[10px] text-neutral-400">Press [Enter] or click to select</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                        {customerSuggestions.map((cust, idx) => {
                          const isHighlighted = idx === highlightedSuggestion;
                          return (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => selectCustomer(cust)}
                              onMouseEnter={() => setHighlightedSuggestion(idx)}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                isHighlighted ? 'bg-[#094327]/10 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isHighlighted ? 'bg-[#094327] text-white' : 'bg-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  {cust.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold truncate flex items-center gap-1.5">
                                    <span>{cust.name}</span>
                                    {cust.loyalty_reward_unlocked && (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">
                                        50% OFF UNLOCKED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-neutral-500 font-mono">
                                    {cust.phone} {cust.address ? `• ${cust.address}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 text-xs">
                                <span className="font-semibold text-neutral-700">{cust.total_purchases} visits</span>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {(cust.total_weight_grams / 1000).toFixed(1)} KG
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Loyalty Banner if found */}
                {customer && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                      customer.loyalty_reward_unlocked
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-600" />
                        <span>
                          {customer.name} &bull; {customer.total_purchases} Purchases Recorded
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white border border-neutral-200 rounded-full font-mono text-[11px]">
                        Total Spent: ₹{customer.total_amount_spent.toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span>Cumulative Loyalty Weight:</span>
                        <span className="font-bold">
                          {customer.loyalty_reward_unlocked
                            ? '🔥 5 KG ACHIEVED - 50% OFF on 1 KG UNLOCKED'
                            : `${customer.loyalty_weight_grams ?? ((customer.total_weight_grams || 0) % 5000)}g / 5,000g`}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            customer.loyalty_reward_unlocked ? 'bg-amber-500' : 'bg-neutral-950'
                          }`}
                          style={{
                            width: `${Math.min(100, (((customer.loyalty_weight_grams ?? ((customer.total_weight_grams || 0) % 5000))) / 5000) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        weightInputRef.current?.focus();
                        weightInputRef.current?.select();
                      }
                    }}
                    placeholder="Enter customer name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-sm outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Enter Weight Section (Simplified as requested: no presets, custom weight input) */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-neutral-800" />
                  <h2 className="text-base font-bold text-neutral-900 tracking-tight">Enter Weight</h2>
                </div>
                <span className="text-xs bg-neutral-950 text-white font-bold px-3 py-1 rounded-full shadow-2xs font-mono">
                  ₹{branchInfo?.rate_per_kg || 899} / KG
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Weight in Grams
                    </label>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                      Grams (g)
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      ref={weightInputRef}
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      step="1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      onKeyDown={handleWeightKeyDown}
                      placeholder="Enter weight in grams (e.g. 850)"
                      className="w-full px-4 py-3.5 text-2xl font-black rounded-2xl border-2 border-neutral-950 focus:ring-2 focus:ring-neutral-950/20 outline-hidden bg-neutral-50/30 tracking-tight font-mono"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-neutral-400 uppercase tracking-wider">
                      {numericWeight >= 1000 ? `${(numericWeight / 1000).toFixed(2)} KG` : 'Grams'}
                    </div>
                  </div>

                  {/* Tablet Quick-Tap Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-0.5">
                      Quick Add:
                    </span>
                    {[
                      { label: '+100g', add: 100 },
                      { label: '+250g', add: 250 },
                      { label: '+500g', add: 500 },
                      { label: '+1 KG', add: 1000 },
                    ].map((btn) => (
                      <button
                        key={btn.add}
                        type="button"
                        onClick={() => {
                          const cur = typeof weight === 'number' ? weight : parseFloat(String(weight)) || 0;
                          setWeight(cur + btn.add);
                        }}
                        className="apple-pressable px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-800 border border-neutral-200 transition-all cursor-pointer shadow-2xs"
                      >
                        {btn.label}
                      </button>
                    ))}
                    {numericWeight > 0 && (
                      <button
                        type="button"
                        onClick={() => setWeight('')}
                        className="apple-pressable px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer ml-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Loyalty Reward Status Feedback */}
                {billingCalc.isRewardUnlocked && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                      billingCalc.canApplyReward
                        ? 'bg-emerald-50/80 border-emerald-300/80 text-emerald-950 font-medium'
                        : 'bg-amber-50/80 border-amber-300/80 text-amber-950'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      {billingCalc.canApplyReward ? (
                        <p>
                          🎉 <strong>50% OFF on 1 KG Loyalty Discount Applied!</strong> Customer is taking{' '}
                          {billingCalc.weightGrams}g (≥ 1 KG). 50% discount on 1000g (-₹{billingCalc.discountAmount.toFixed(2)}) is deducted.
                        </p>
                      ) : (
                        <p>
                          ⚠️ <strong>Reward Unlocked (50% OFF on 1 KG):</strong> {billingCalc.rewardReason}{' '}
                          (Customer is taking {billingCalc.weightGrams}g). Reward saved for next 1 KG+ purchase.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Custom Items Section */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-neutral-800" />
                  <div>
                    <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                      Custom Items
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      Add non-weight items (inners, leggings, etc.)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddCustomItem('', 0)}
                  className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Item</span>
                </button>
              </div>

              {customItems.length === 0 ? (
                <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-500 space-y-1">
                  <p className="font-semibold text-neutral-700">No custom items added.</p>
                  <p>Click &ldquo;+ Add Custom Item&rdquo; if customer is purchasing non-weight items.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-neutral-500 uppercase px-1">
                    <div className="col-span-5">Item Name</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Price (₹)</div>
                    <div className="col-span-2 text-right">Total (₹)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {customItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center bg-neutral-50 p-2.5 rounded-xl border border-neutral-200"
                    >
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateCustomItem(item.id!, 'name', e.target.value)}
                          placeholder="e.g. Inners / Leggings"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 focus:border-black outline-hidden bg-white font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateCustomItem(item.id!, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-neutral-300 focus:border-black outline-hidden bg-white font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateCustomItem(item.id!, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-right rounded-lg border border-neutral-300 focus:border-black outline-hidden bg-white font-mono font-semibold"
                        />
                      </div>

                      <div className="col-span-2 text-right pr-1 font-bold text-xs text-black font-mono">
                        ₹{(item.amount || item.quantity * item.unitPrice).toFixed(2)}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(item.id!)}
                          title="Remove item"
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center text-xs font-bold pt-2 px-1 text-neutral-700">
                    <span>Custom Items Total:</span>
                    <span className="font-mono text-sm text-black">
                      ₹{billingCalc.customItemsSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Tablets & Desktop: 5 cols) - Sticky Summary & Fast Checkout */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
            {/* 4. Amount Calculation & Payment Section */}
            <div className="apple-surface bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] p-5 sm:p-6 space-y-5">
              
              {/* Amount Mode Selector Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-neutral-800" />
                  <div>
                    <h2 className="text-base font-bold text-neutral-900 tracking-tight">Billing Amount</h2>
                    <p className="text-[11px] text-neutral-500">Select amount calculation mode</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Calculated Amount</span>
                  <span className="text-sm font-black text-neutral-900 font-mono">
                    ₹{billingCalc.baseAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Three Amount Modes: 1. Exact Amount, 2. Round Down to ₹10, 3. Custom Amount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Amount Mode{' '}
                    <span className="text-neutral-500 font-semibold normal-case">
                      (Default: {defaultMode === 'NONE' ? 'Exact Amount' : defaultMode === 'FLOOR_10' ? 'Round Down to ₹10' : 'Custom Amount'})
                    </span>
                  </label>
                  <span className="text-[10px] font-bold text-[#094327] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>💡</span> Triple-click to set default
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Mode 1: Exact Amount */}
                  <button
                    type="button"
                    onClick={() => handleAmountModeClick('NONE')}
                    className={`apple-pressable p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      roundOffMode === 'NONE'
                        ? 'bg-[#094327] text-white border-[#094327] shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">1. Exact Amount</span>
                      {defaultMode === 'NONE' && (
                        <span className="text-[9px] bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-2xs">
                          Default ★
                        </span>
                      )}
                    </div>
                    <span className={`text-base font-black font-mono block mt-1.5 ${roundOffMode === 'NONE' ? 'text-white' : 'text-neutral-950'}`}>
                      ₹{billingCalc.baseAmount.toFixed(2)}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${roundOffMode === 'NONE' ? 'text-emerald-100' : 'text-neutral-500'}`}>
                      Exact calculated sum
                    </span>
                  </button>

                  {/* Mode 2: Round Down to ₹10 */}
                  <button
                    type="button"
                    onClick={() => handleAmountModeClick('FLOOR_10')}
                    className={`apple-pressable p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      roundOffMode === 'FLOOR_10'
                        ? 'bg-[#094327] text-white border-[#094327] shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold block">2. Round Down to ₹10</span>
                      {defaultMode === 'FLOOR_10' && (
                        <span className="text-[9px] bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-2xs">
                          Default ★
                        </span>
                      )}
                    </div>
                    <span className={`text-base font-black font-mono block mt-1.5 ${roundOffMode === 'FLOOR_10' ? 'text-white' : 'text-neutral-950'}`}>
                      ₹{(Math.floor((Math.round(billingCalc.baseAmount * 100) / 100 + 0.00001) / 10) * 10).toFixed(2)}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${roundOffMode === 'FLOOR_10' ? 'text-emerald-100' : 'text-neutral-500'}`}>
                      Floor to 10s (₹899 → ₹890)
                    </span>
                  </button>

                  {/* Mode 3: Custom Amount */}
                  <button
                    type="button"
                    onClick={() => handleAmountModeClick('MANUAL')}
                    className={`apple-pressable p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      roundOffMode === 'MANUAL'
                        ? 'bg-[#094327] text-white border-[#094327] shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold block">3. Custom Amount</span>
                      {defaultMode === 'MANUAL' && (
                        <span className="text-[9px] bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-2xs">
                          Default ★
                        </span>
                      )}
                    </div>
                    <span className={`text-base font-black font-mono block mt-1.5 ${roundOffMode === 'MANUAL' ? 'text-white' : 'text-neutral-950'}`}>
                      {manualAmount ? `₹${parseFloat(manualAmount || '0').toFixed(2)}` : 'Enter amount'}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${roundOffMode === 'MANUAL' ? 'text-emerald-100' : 'text-neutral-500'}`}>
                      Manual cashier entry
                    </span>
                  </button>
                </div>

                {/* Custom Amount input field when Mode 3 is active */}
                {roundOffMode === 'MANUAL' && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                      Enter Custom Final Amount (₹)
                    </label>
                    <div className="relative">
                      <input
                        ref={customAmountInputRef}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={manualAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                            setManualAmount(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            sendBillBtnRef.current?.focus();
                          }
                        }}
                        placeholder={`Calculated amount: ₹${billingCalc.baseAmount.toFixed(2)}`}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-900 focus:ring-2 focus:ring-neutral-950/20 text-base font-black font-mono outline-hidden bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grand Total & Net Payable Display */}
              <div className="p-6 rounded-2xl bg-neutral-950 text-white shadow-xs space-y-3">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>
                    Items: {billingCalc.customItems?.length || 0} Custom {numericWeight > 0 ? `+ ${(numericWeight / 1000).toFixed(2)} KG` : ''}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">STORE: {activeBranch.toUpperCase()}</span>
                </div>

                <div className="flex justify-between text-sm text-neutral-300 border-b border-white/10 pb-2">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold font-mono">₹{billingCalc.subtotal.toFixed(2)}</span>
                </div>

                {billingCalc.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-amber-300 border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Gift className="w-4 h-4" /> Loyalty Reward (50% OFF 1 KG):
                    </span>
                    <span className="font-bold font-mono">-₹{billingCalc.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-neutral-300 border-b border-white/10 pb-2">
                  <span>Amount Calculation Mode:</span>
                  <span className="font-semibold text-emerald-300">
                    {roundOffMode === 'NONE'
                      ? 'Exact Amount (Default)'
                      : roundOffMode === 'FLOOR_10'
                      ? 'Round Down to ₹10'
                      : 'Custom Amount'}
                  </span>
                </div>

                {billingCalc.roundOffAmount !== 0 && (
                  <div className="flex justify-between text-sm text-neutral-300 border-b border-white/10 pb-2">
                    <span>
                      {roundOffMode === 'MANUAL' ? 'Manual Price Adjustment:' : 'Round Down Adjustment:'}
                    </span>
                    <span className={`font-mono font-bold ${billingCalc.roundOffAmount < 0 ? 'text-amber-300' : 'text-neutral-200'}`}>
                      {billingCalc.roundOffAmount > 0
                        ? `+₹${billingCalc.roundOffAmount.toFixed(2)}`
                        : `-₹${Math.abs(billingCalc.roundOffAmount).toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-300 block">
                      Final Payable Amount:
                    </span>
                    {billingCalc.subtotal - billingCalc.finalAmount > 0 && (
                      <span className="text-[11px] text-amber-300 font-semibold tracking-tight">
                        Total Savings: ₹{(billingCalc.subtotal - billingCalc.finalAmount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white apple-display">
                    ₹{billingCalc.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector (Cash & UPI/GPay only) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'UPI', label: 'UPI / GPay', icon: Smartphone },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = paymentMethod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                        className={`apple-pressable flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#094327] text-white border-[#094327] shadow-xs'
                            : 'bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded-2xl font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* PRIMARY ACTION: SEND WHATSAPP MESSAGE */}
              <div className="space-y-2.5 pt-1">
                <button
                  ref={sendBillBtnRef}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompletePurchase(false)}
                  className="apple-pressable w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-[#094327] hover:bg-[#06311d] text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md cursor-pointer focus:ring-4 focus:ring-emerald-500/30 outline-hidden"
                >
                  <Send className="w-5 h-5 text-emerald-300" />
                  <span>{isSubmitting ? 'Sending to WhatsApp...' : 'Send WhatsApp Message'}</span>
                </button>

                {/* Secondary Actions: Reset Form */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="apple-pressable inline-flex items-center gap-1.5 py-2 px-3 text-xs text-neutral-500 hover:text-rose-600 font-semibold rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Form</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Toast Notification for Default Mode Change */}
      {modeToast && modeToast.visible && (
        <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-neutral-950/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold pointer-events-auto backdrop-blur-md">
            <span className="text-amber-400 text-base">★</span>
            <span>{modeToast.message}</span>
          </div>
        </div>
      )}

      {/* Success Modal with WhatsApp Delivery, Bill Photo, and PDF Export */}
      <WhatsAppSuccessModal
        isOpen={showSuccessModal}
        onClose={handleReset}
        purchase={completedPurchase}
        settings={shopSettings || undefined}
        billImageDataUrl={billImageDataUrl}
        whatsappResult={whatsappResult}
        onResend={handleResendWhatsApp}
        isResending={isResending}
      />
    </div>
  );
}
