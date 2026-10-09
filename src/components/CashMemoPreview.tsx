'use client';

import React from 'react';
import { Purchase, ShopSettings } from '@/lib/types';

interface CashMemoPreviewProps {
  purchase?: Partial<Purchase>;
  settings?: Partial<ShopSettings>;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  weightGrams?: number;
  ratePerKg?: number;
  subtotal?: number;
  discountAmount?: number;
  roundOff?: number;
  finalAmount?: number;
  paymentMethod?: string;
  invoiceNumber?: string;
  dateStr?: string;
  loyaltyMessage?: string;
}

export default function CashMemoPreview({
  customerName = 'Walk-in Customer',
  customerPhone = '-',
  customerAddress = '-',
  weightGrams = 1000,
  ratePerKg = 899,
  subtotal = 899,
  discountAmount = 0,
  roundOff = 0,
  finalAmount = 899,
  paymentMethod = 'CASH',
  invoiceNumber = 'INV-2026-000101',
  dateStr,
  settings,
}: CashMemoPreviewProps) {
  const shopName = settings?.shop_name || 'TERRY';
  const shopAddress = settings?.address || 'Near Town Center, Main Commercial Road, Calicut - 673001';
  const shopPhone = settings?.phone || '+91 7736723917';

  const [currentDate, setCurrentDate] = React.useState<string>('08/10/2026');

  React.useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  const todayDisplay = dateStr || currentDate;

  const totalDiscount = (discountAmount || 0) + (roundOff && roundOff < 0 ? Math.abs(roundOff) : 0);

  return (
    <div
      id="cash-memo-preview-node"
      className="cash-memo-sheet w-full max-w-[620px] mx-auto p-5 sm:p-6 rounded-3xl shadow-lg font-sans select-none overflow-hidden border-2 border-[#d6cfbe]"
      style={{ backgroundColor: '#f2eee5' }}
    >
      {/* ==============================================================
          1. TOP BOUTIQUE BLUE BANNER WITH INVOICE HEADLINE & CUTE ART
         ============================================================== */}
      <div className="bg-[#487ec3] text-white rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
        {/* Decorative Sunburst Star SVG */}
        <div className="absolute top-2 right-28 sm:right-36 pointer-events-none opacity-95">
          <svg viewBox="0 0 100 100" className="w-10 h-10 fill-[#ffe033]">
            <path d="M50 0 L58 35 L95 20 L70 50 L95 80 L58 65 L50 100 L42 65 L5 80 L30 50 L5 20 L42 35 Z" />
          </svg>
        </div>

        {/* Decorative Pink Flower SVG */}
        <div className="absolute top-3 right-6 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-10 h-10 fill-[#ff789e]">
            <circle cx="50" cy="22" r="18" />
            <circle cx="77" cy="42" r="18" />
            <circle cx="67" cy="74" r="18" />
            <circle cx="33" cy="74" r="18" />
            <circle cx="23" cy="42" r="18" />
            <circle cx="50" cy="50" r="12" fill="#ffffff" />
          </svg>
        </div>

        {/* White Sparkle Stars */}
        <div className="absolute bottom-2 left-32 pointer-events-none">
          <svg viewBox="0 0 50 50" className="w-4 h-4 fill-white/80">
            <path d="M25 0 Q25 25 50 25 Q25 25 25 50 Q25 25 0 25 Q25 25 25 0 Z" />
          </svg>
        </div>
        <div className="absolute top-3 left-48 pointer-events-none">
          <svg viewBox="0 0 50 50" className="w-3 h-3 fill-white/80">
            <path d="M25 0 Q25 25 50 25 Q25 25 25 50 Q25 25 0 25 Q25 25 25 0 Z" />
          </svg>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-3">
          {/* Big Bold White Playful "INVOICE" Title */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-white drop-shadow-sm font-sans">
              INVOICE
            </h1>
            <div className="inline-block bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-1">
              Boutique Clothing Memo
            </div>
          </div>

          {/* Shop Brand & Social */}
          <div className="text-right sm:pr-8">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase drop-shadow-sm">
                {shopName}
              </span>
              <span className="text-xs font-black bg-white text-[#487ec3] px-2 py-0.5 rounded-full tracking-wider uppercase">
                WOMEN
              </span>
            </div>
            <p className="text-[11px] font-semibold text-white/90 mt-0.5">
              Exclusive Women&apos;s Wear & Dress Materials
            </p>
            <div className="flex items-center justify-end gap-2 text-[10px] text-white/80 mt-1 font-mono">
              <span>📷 @terry_women</span>
              <span>&bull;</span>
              <span>📞 {shopPhone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================
          2. CLIENT INFO & INVOICE META BAR (Vibrant & Clean)
         ============================================================== */}
      <div className="flex justify-between items-start my-4 px-1 gap-4">
        {/* Left: INVOICE TO */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6b7b91] block">
            INVOICE TO:
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#2e5d9c] capitalize tracking-tight">
            {customerName}
          </h2>
          <p className="text-xs font-bold text-neutral-700 font-mono">
            Phone: {customerPhone}
          </p>
          <p className="text-xs text-neutral-600">
            {customerAddress && customerAddress !== '-' ? customerAddress : 'Calicut, Kerala'}
          </p>
        </div>

        {/* Right: TOTAL & INVOICE META */}
        <div className="text-right space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6b7b91] block">
            TOTAL
          </span>
          <p className="text-2xl sm:text-3xl font-black text-[#2e5d9c] font-mono tracking-tight">
            ₹{(finalAmount || 0).toFixed(2)}
          </p>
          <p className="text-[11px] font-mono font-bold text-neutral-700">
            {invoiceNumber}
          </p>
          <p className="text-[11px] font-semibold text-neutral-600">
            DATE: {todayDisplay}
          </p>
        </div>
      </div>

      {/* ==============================================================
          3. COLORFUL ITEMS TABLE (Pink Header + Sunny Yellow Body)
         ============================================================== */}
      <div className="relative mb-5">
        {/* Table Container */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-[#e2dac7]">
          {/* Salmon Pink Table Header */}
          <div className="bg-[#ff6f91] text-white py-2.5 px-4 grid grid-cols-12 text-xs font-extrabold uppercase tracking-wider">
            <div className="col-span-6">DESCRIPTION</div>
            <div className="col-span-2 text-center">WEIGHT</div>
            <div className="col-span-2 text-center">RATE / KG</div>
            <div className="col-span-2 text-right">SUBTOTAL</div>
          </div>

          {/* Bright Sunny Yellow Table Body */}
          <div className="bg-[#fed636] p-3 text-neutral-900 text-xs font-medium space-y-2">
            {/* Primary Cloth Item Row */}
            <div className="grid grid-cols-12 items-center py-1.5 border-b border-black/10">
              <div className="col-span-6 font-bold text-neutral-900 pr-2">
                Ladies Readymade Garment / Dress Material
                <span className="block text-[10px] font-medium text-neutral-700">
                  Exclusive weight-based clothing selection
                </span>
              </div>
              <div className="col-span-2 text-center font-bold font-mono">
                {weightGrams}g
                <span className="block text-[10px] text-neutral-700">
                  ({((weightGrams || 1000) / 1000).toFixed(2)} KG)
                </span>
              </div>
              <div className="col-span-2 text-center font-bold font-mono">
                ₹{ratePerKg}
              </div>
              <div className="col-span-2 text-right font-black font-mono text-sm text-neutral-950">
                ₹{(subtotal || 0).toFixed(2)}
              </div>
            </div>

            {/* Loyalty Reward Row if applied */}
            {discountAmount > 0 && (
              <div className="grid grid-cols-12 items-center py-1.5 bg-white/40 rounded-lg px-2 text-emerald-950 font-bold border border-emerald-600/20">
                <div className="col-span-6">
                  🎁 6th Visit Loyalty Reward (50% OFF on 1 KG)
                </div>
                <div className="col-span-2 text-center font-mono">1000g</div>
                <div className="col-span-2 text-center">-</div>
                <div className="col-span-2 text-right font-black font-mono text-emerald-900">
                  -₹{(discountAmount || 0).toFixed(2)}
                </div>
              </div>
            )}

            {/* Manual Discount / Round Down Concession Row if applied */}
            {typeof roundOff === 'number' && roundOff < 0 && (
              <div className="grid grid-cols-12 items-center py-1 bg-white/30 rounded-lg px-2 text-neutral-800 font-semibold border border-black/5 text-[11px]">
                <div className="col-span-6">
                  🏷️ Special Concession / Discount
                </div>
                <div className="col-span-2 text-center">-</div>
                <div className="col-span-2 text-center">-</div>
                <div className="col-span-2 text-right font-black font-mono text-rose-900">
                  -₹{Math.abs(roundOff).toFixed(2)}
                </div>
              </div>
            )}

            {/* Aesthetic Filler Dotted Lines */}
            <div className="grid grid-cols-12 py-1 text-neutral-600/40 text-[11px] border-t border-black/5">
              <div className="col-span-6 italic">Terry Boutique Women Collection</div>
              <div className="col-span-2 text-center">&bull;</div>
              <div className="col-span-2 text-center">&bull;</div>
              <div className="col-span-2 text-right">&bull;</div>
            </div>
          </div>
        </div>

        {/* Floating Percentage "%" Badge (Exactly matching reference image!) */}
        <div className="absolute -bottom-3 right-4 z-20">
          <div className="w-10 h-10 rounded-full bg-[#2e5d9c] text-white font-black text-lg flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-[#fed636]">
            %
          </div>
        </div>
      </div>

      {/* ==============================================================
          4. PAYMENT METHOD & SUMMARY CARDS (Pink + Deep Blue Blocks)
         ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start my-3">
        {/* Left Column (7 cols): Payment Method, UPI & Terms */}
        <div className="sm:col-span-7 space-y-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2e5d9c] block">
              PAYMENT METHOD
            </span>
            <p className="text-xs font-bold text-neutral-800">
              Mode: <span className="uppercase text-[#2e5d9c] font-black">{paymentMethod}</span>
            </p>
            <p className="text-xs text-neutral-700">
              UPI / GPay: <strong className="font-mono text-neutral-900">7736723917@okaxis</strong>
            </p>
            <p className="text-xs text-neutral-700">
              Tel / WhatsApp: <strong className="font-mono text-neutral-900">+91 7736723917</strong>
            </p>
          </div>

          {/* Terms & Conditions Box */}
          <div className="p-2.5 bg-[#e7e1d3] rounded-xl text-[10px] text-neutral-800 border border-[#dad1be] leading-relaxed">
            <span className="font-black uppercase text-[9px] text-[#2e5d9c] block mb-0.5">
              TERMS & CONDITIONS
            </span>
            <p>1. Goods once sold will NOT be exchanged or returned under any circumstances.</p>
            <p>2. Earn loyalty reward points on every visit (50% OFF on 1 KG upon completing 5 visits).</p>
          </div>
        </div>

        {/* Right Column (5 cols): Pink Subtotal + Blue Total Blocks */}
        <div className="sm:col-span-5 rounded-2xl overflow-hidden shadow-sm border border-[#e2dac7]">
          {/* Pink Subtotal / Discount Block */}
          <div className="bg-[#ff9ebb] p-3 text-neutral-900 space-y-1 text-xs font-bold">
            <div className="flex justify-between items-center">
              <span className="uppercase text-[11px] text-neutral-800">SUBTOTAL</span>
              <span className="font-mono">₹{(subtotal || 0).toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between items-center text-rose-900 font-extrabold">
                <span className="uppercase text-[11px]">DISCOUNT</span>
                <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Connected Deep Blue Grand Total Block */}
          <div className="bg-[#2e5d9c] text-white p-3 flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-white">
              TOTAL
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-xs">
              ₹{(finalAmount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ==============================================================
          5. BOTTOM FLORAL GARDEN ILLUSTRATION & SIGNATURE
         ============================================================== */}
      <div className="mt-4 pt-3 border-t border-[#ded6c5] flex flex-col sm:flex-row justify-between items-end gap-3">
        {/* Cheerful Floral Garden SVG Artwork */}
        <div className="flex items-end gap-1.5">
          {/* Red Poppy Flower with Stems & Leaves */}
          <svg viewBox="0 0 80 90" className="w-16 h-18">
            {/* Green Stem & Leaves */}
            <path d="M40 90 Q38 55 40 40" stroke="#587b32" strokeWidth="4" fill="none" />
            <path d="M40 65 Q25 60 20 50 Q30 50 40 60" fill="#587b32" />
            <path d="M40 70 Q55 65 60 55 Q50 55 40 65" fill="#587b32" />
            {/* Red Flower Petals */}
            <circle cx="40" cy="30" r="18" fill="#e83d44" />
            <circle cx="28" cy="24" r="14" fill="#ef4444" />
            <circle cx="52" cy="24" r="14" fill="#ef4444" />
            <circle cx="40" cy="18" r="12" fill="#dc2626" />
            {/* Yellow Center */}
            <circle cx="40" cy="28" r="8" fill="#ffe033" />
            <circle cx="40" cy="28" r="4" fill="#ffffff" />
          </svg>

          {/* Soft Pink Blossom */}
          <svg viewBox="0 0 60 70" className="w-12 h-14">
            <path d="M30 70 Q28 45 30 35" stroke="#587b32" strokeWidth="3" fill="none" />
            <circle cx="30" cy="24" r="14" fill="#ff789e" />
            <circle cx="20" cy="20" r="10" fill="#ff9ebb" />
            <circle cx="40" cy="20" r="10" fill="#ff9ebb" />
            <circle cx="30" cy="24" r="6" fill="#ffe033" />
          </svg>

          {/* Yellow Flower Accent */}
          <svg viewBox="0 0 50 60" className="w-10 h-12">
            <path d="M25 60 Q24 40 25 30" stroke="#587b32" strokeWidth="3" fill="none" />
            <circle cx="25" cy="20" r="12" fill="#fed636" />
            <circle cx="25" cy="20" r="5" fill="#ffffff" />
          </svg>

          {/* Cute Smiling Sky-Blue Cloud Character (from reference image) */}
          <div className="relative ml-1">
            <svg viewBox="0 0 80 70" className="w-16 h-14">
              {/* Scalloped Cloud / Flower Petals in Blue */}
              <circle cx="40" cy="35" r="22" fill="#4895ef" />
              <circle cx="22" cy="35" r="16" fill="#4895ef" />
              <circle cx="58" cy="35" r="16" fill="#4895ef" />
              <circle cx="32" cy="20" r="16" fill="#4895ef" />
              <circle cx="48" cy="20" r="16" fill="#4895ef" />
              <circle cx="32" cy="50" r="16" fill="#4895ef" />
              <circle cx="48" cy="50" r="16" fill="#4895ef" />
              {/* Cute Eyes */}
              <circle cx="34" cy="34" r="3" fill="#ffffff" />
              <circle cx="46" cy="34" r="3" fill="#ffffff" />
              {/* Happy Smile */}
              <path d="M36 41 Q40 47 44 41" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Pink Cute Cheeks */}
              <circle cx="28" cy="40" r="3.5" fill="#ff789e" />
              <circle cx="52" cy="40" r="3.5" fill="#ff789e" />
            </svg>
          </div>
        </div>

        {/* Right: Signature Block */}
        <div className="text-center w-36 sm:w-40">
          <div className="h-8 flex items-center justify-center italic text-xl font-serif text-[#2e5d9c] font-black">
            Terry Women
          </div>
          <div className="w-full h-0.5 bg-neutral-900 my-0.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6b7b91]">
            Signature
          </span>
        </div>
      </div>
    </div>
  );
}
