'use client';

import React from 'react';
import { Purchase, ShopSettings, PurchaseItem, BranchId } from '@/lib/types';
import { CustomItemInput } from '@/lib/billing';

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
  items?: any[];
  branch?: BranchId;
  branchName?: string;
}

export default function CashMemoPreview({
  customerName = 'Imani Olowe',
  customerPhone = '+123-456-7890',
  customerAddress = '63 Ivy Road, Hawkville, GA, USA 31036',
  weightGrams = 1000,
  ratePerKg = 899,
  subtotal = 899,
  discountAmount = 0,
  roundOff = 0,
  finalAmount = 899,
  invoiceNumber = '12345',
  dateStr,
  settings,
  items,
  branch,
  purchase,
}: CashMemoPreviewProps) {
  // Format date cleanly e.g. "16 June 2025" matching reference
  const [displayDate, setDisplayDate] = React.useState<string>('16 June 2025');

  React.useEffect(() => {
    if (dateStr) {
      setDisplayDate(dateStr);
    } else if (purchase?.created_at) {
      const d = new Date(purchase.created_at);
      setDisplayDate(
        d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    } else {
      const now = new Date();
      setDisplayDate(
        now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    }
  }, [dateStr, purchase?.created_at]);

  const effectiveInvoiceNo =
    purchase?.invoice_number || invoiceNumber || '12345';
  const effectiveCustomerName = purchase?.customer_name || customerName || 'Walk-in Customer';
  const effectivePhoneNum = purchase?.customer_phone || customerPhone || '';
  const effectiveCustAddress = purchase?.customer_address || customerAddress || '';

  const effectiveSubtotal = purchase?.subtotal ?? subtotal ?? 0;
  const effectiveDiscount = purchase?.discount_amount ?? discountAmount ?? 0;
  const effectiveRoundOff = purchase?.round_off ?? roundOff ?? 0;
  const effectiveFinalAmount = purchase?.final_amount ?? finalAmount ?? 0;

  // Resolve items to display
  const resolvedItems = React.useMemo(() => {
    if (purchase?.items && purchase.items.length > 0) {
      return purchase.items;
    }
    if (items && items.length > 0) {
      return items;
    }
    const wt = purchase?.weight_grams ?? weightGrams ?? 1000;
    const rate = purchase?.rate_per_kg ?? ratePerKg ?? 899;
    const qtyLabel =
      wt >= 1000
        ? `${(wt / 1000).toFixed(wt % 1000 === 0 ? 0 : 2)} KG`
        : `${wt}g`;
    const lineTotal = Math.round(((wt * rate) / 1000) * 100) / 100;

    return [
      {
        id: 'default_item',
        description: 'Ladies Readymade Garment',
        quantity: qtyLabel,
        unit_price: rate,
        amount: lineTotal,
      },
    ];
  }, [purchase, items, weightGrams, ratePerKg]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .invoice-serif-title {
          font-family: 'Playfair Display', Georgia, serif;
          letter-spacing: 0.04em;
        }
        .invoice-body-font {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
      `}</style>

      <div
        id="cash-memo-preview-node"
        className="invoice-body-font w-full max-w-[620px] mx-auto bg-white text-black p-8 sm:p-10 shadow-xl border border-neutral-200 select-none relative overflow-hidden"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Subtle Terry Green Top Brand Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#094327]" />

        {/* ==============================================================
            1. TOP HEADER: [Circular TERRY7 Logo] Centered with small INVOICE below
           ============================================================== */}
        <div className="flex flex-col items-center justify-center text-center pb-2 pt-1">
          {/* Circular logo enlarged and prominent */}
          <img
            src="/logo.png"
            alt="TERRY7 WOMEN"
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-full shadow-md hover:scale-102 transition-transform"
          />
          {/* Small INVOICE text below logo */}
          <span className="text-[12px] font-bold tracking-[0.35em] text-[#094327] uppercase mt-2.5">
            INVOICE
          </span>
        </div>

        {/* ==============================================================
            2. BILLED TO (Left) & DATE (Right) - (No Invoice Number as requested)
           ============================================================== */}
        <div className="grid grid-cols-12 items-start justify-between mt-6 mb-6">
          {/* Billed To */}
          <div className="col-span-7 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-black">
              BILLED TO:
            </p>
            <p className="text-sm font-semibold text-neutral-900 capitalize">
              {effectiveCustomerName}
            </p>
            {effectivePhoneNum && effectivePhoneNum !== '-' && (
              <p className="text-xs text-neutral-600 font-mono">
                {effectivePhoneNum.startsWith('+') ? effectivePhoneNum : `+91 ${effectivePhoneNum}`}
              </p>
            )}
            {effectiveCustAddress && effectiveCustAddress !== '-' && (
              <p className="text-xs text-neutral-600 leading-tight">
                {effectiveCustAddress}
              </p>
            )}
          </div>

          {/* Date Only (No Invoice No.) */}
          <div className="col-span-5 text-right space-y-1">
            <p className="text-xs sm:text-sm font-medium text-neutral-800">
              {displayDate}
            </p>
          </div>
        </div>

        {/* ==============================================================
            3. TABLE HEADER ROW (Divided by Crisp 1px Black Lines)
           ============================================================== */}
        <div className="border-t border-black w-full" />

        <div className="grid grid-cols-12 py-3 text-xs sm:text-sm font-bold text-black tracking-normal">
          <div className="col-span-6 pl-1 text-left">Item</div>
          <div className="col-span-2 text-center">Quantity</div>
          <div className="col-span-2 text-center">Unit Price</div>
          <div className="col-span-2 text-right pr-1">Total</div>
        </div>

        <div className="border-t border-black w-full" />

        {/* ==============================================================
            4. TABLE ITEMS ROWS
           ============================================================== */}
        <div className="py-3 space-y-3 min-h-[120px]">
          {resolvedItems.map((item: any, idx: number) => {
            const desc = item.description || item.name || 'Garment Item';
            const qty = item.quantity ?? (item.weight_grams ? `${(item.weight_grams / 1000).toFixed(2)} KG` : 1);
            const uPrice = item.unit_price ?? item.rate_per_kg ?? 0;
            const lineAmt = item.amount ?? (item.weight_grams ? (item.weight_grams * uPrice) / 1000 : uPrice * Number(qty));

            return (
              <div
                key={item.id || idx}
                className="grid grid-cols-12 text-xs sm:text-sm text-neutral-900 items-center py-1"
              >
                <div className="col-span-6 pl-1 font-medium text-black pr-2">
                  <span>{desc}</span>
                </div>
                <div className="col-span-2 text-center text-neutral-800">
                  {qty}
                </div>
                <div className="col-span-2 text-center text-neutral-800 font-mono">
                  ₹{Number(uPrice).toFixed(0)}
                </div>
                <div className="col-span-2 text-right pr-1 font-semibold text-black font-mono">
                  ₹{Number(lineAmt).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-black w-full mt-2" />

        {/* ==============================================================
            5. TOTALS SECTION (Right-aligned matching reference image - No Tax)
           ============================================================== */}
        <div className="flex justify-end pt-4 pb-2">
          <div className="w-full sm:w-60 space-y-2 text-xs sm:text-sm">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-black">
              <span className="font-bold">Subtotal</span>
              <span className="font-semibold font-mono">₹{effectiveSubtotal.toFixed(0)}</span>
            </div>

            {/* Loyalty Discount */}
            {effectiveDiscount > 0 && (
              <div className="flex justify-between items-center text-neutral-800">
                <span className="font-medium">Loyalty Reward (50% OFF 1 KG)</span>
                <span className="font-semibold font-mono">-₹{effectiveDiscount.toFixed(0)}</span>
              </div>
            )}

            {/* Round Off / Concession */}
            {typeof effectiveRoundOff === 'number' && effectiveRoundOff !== 0 && (
              <div className="flex justify-between items-center text-neutral-800">
                <span className="font-medium">Round Off / Concession</span>
                <span className="font-semibold font-mono">
                  {effectiveRoundOff > 0 ? '+' : ''}₹{effectiveRoundOff.toFixed(0)}
                </span>
              </div>
            )}

            {/* Divider line before Grand Total */}
            <div className="border-t border-neutral-300 pt-2" />

            {/* Grand Total */}
            <div className="flex justify-between items-center text-black pt-1">
              <span className="text-base sm:text-lg font-bold">Total</span>
              <span className="text-xl sm:text-2xl font-black font-mono">
                ₹{effectiveFinalAmount.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* ==============================================================
            6. "Thank you!" - SMALL & CENTERED
           ============================================================== */}
        <div className="mt-8 mb-2 text-center">
          <p className="text-sm font-semibold text-neutral-600 tracking-wider">
            Thank you!
          </p>
        </div>
      </div>
    </>
  );
}
