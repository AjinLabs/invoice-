'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  X,
  RotateCcw,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { normalizeWhatsAppPhone } from '@/lib/phone';
import { formatWhatsAppInvoiceText } from '@/lib/whatsapp';

interface WhatsAppSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  settings?: ShopSettings;
  billImageDataUrl?: string | null;
  whatsappResult?: {
    isDemo?: boolean;
    status: string;
    formattedText: string;
    messageId?: string;
    mediaId?: string;
    errorMessage?: string;
    errorCode?: string;
  } | null;
  onResend?: () => void;
  isResending?: boolean;
}

export default function WhatsAppSuccessModal({
  isOpen,
  onClose,
  purchase,
  settings,
}: WhatsAppSuccessModalProps) {
  const newBillBtnRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  // Validate and format recipient phone number
  const phoneValidation = purchase
    ? normalizeWhatsAppPhone(purchase.customer_phone)
    : { isValid: false, waDestination: '', formattedDisplay: '' };
  const destinationPhone = phoneValidation.waDestination;
  const formattedPhone = phoneValidation.formattedDisplay || (purchase?.customer_phone ?? '');

  // Format WhatsApp sales message (No invoice number, no photo, no clickable links)
  const messageText = purchase
    ? formatWhatsAppInvoiceText(purchase, settings)
    : '';

  const encoded = encodeURIComponent(messageText);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Ultra-fast official Universal wa.me link (<100ms fast load on mobile and desktop)
  const waMeUrl = destinationPhone
    ? `https://wa.me/${destinationPhone}?text=${encoded}`
    : '#';

  // Instant native WhatsApp Desktop protocol link (0ms direct launch in Windows/Mac desktop app)
  const waDesktopAppUrl = destinationPhone
    ? `whatsapp://send?phone=${destinationPhone}&text=${encoded}`
    : '#';

  // Direct WhatsApp Web URL fallback
  const waWebUrl = destinationPhone
    ? `https://web.whatsapp.com/send?phone=${destinationPhone}&text=${encoded}`
    : '#';

  const handleCopy = async () => {
    if (!messageText) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback if clipboard API is restricted
    }
  };

  // Global keydown listener when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print transition-all">
      <div className="apple-surface bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.3)] border border-neutral-200/80 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="bg-[#094327] text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-emerald-300 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 tracking-tight">
                <span>Sale Completed!</span>
              </h3>
              <span className="text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium border border-white/30 inline-block mt-0.5">
                TERRY 7 WOMEN
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Customer & Sale Summary Card */}
          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Customer</span>
                <span className="text-base font-bold text-neutral-950">{purchase.customer_name}</span>
                <span className="text-xs text-neutral-600 font-mono block mt-0.5">{formattedPhone}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Net Payable</span>
                <span className="text-2xl font-black text-neutral-950 font-mono">
                  ₹{purchase.final_amount.toFixed(2)}
                </span>
                <span className="text-[11px] font-semibold text-neutral-500 block uppercase">
                  {purchase.payment_method}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Weight / Items</span>
                <span className="font-bold text-neutral-900">
                  {purchase.weight_grams > 0 ? `${purchase.weight_grams}g (${(purchase.weight_grams / 1000).toFixed(2)} KG)` : `${purchase.items?.length || 1} Items`}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Loyalty Program</span>
                <span className={`font-bold ${purchase.loyalty_applied ? 'text-emerald-700' : 'text-neutral-800'}`}>
                  {purchase.loyalty_applied
                    ? '🎉 500g FREE Redeemed'
                    : `${((purchase.loyalty_weight_after_grams || 0) / 1000).toFixed(2)} KG / 5 KG`}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#094327]">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Message to Send</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white/90 hover:bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
                title="Copy message to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] text-neutral-700 bg-white/80 p-3 rounded-xl border border-emerald-100 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
              {messageText}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* 1. Primary Action: Instant Universal WhatsApp Link (wa.me) */}
            {destinationPhone ? (
              <a
                href={waMeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-pressable w-full py-4 px-4 bg-[#094327] hover:bg-[#06311d] text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 focus:ring-4 focus:ring-emerald-500/30 outline-hidden no-underline"
              >
                <MessageSquare className="w-5 h-5 text-emerald-300" />
                <span>Send WhatsApp Message ({formattedPhone})</span>
                <ExternalLink className="w-4 h-4 text-emerald-300" />
              </a>
            ) : (
              <div className="w-full py-3.5 px-4 bg-neutral-200 text-neutral-500 rounded-2xl text-xs font-bold text-center">
                Invalid or Missing WhatsApp Number
              </div>
            )}

            {/* Desktop Direct Triggers: 0ms Native Desktop App & Web Link */}
            {!isMobile && destinationPhone && (
              <div className="flex items-center gap-2">
                <a
                  href={waDesktopAppUrl}
                  className="apple-pressable flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-200 no-underline shadow-2xs"
                  title="Open immediately in WhatsApp Windows Desktop App"
                >
                  <span>⚡ Open Desktop App</span>
                </a>
                <a
                  href={waWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pressable flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-neutral-200/80 no-underline shadow-2xs"
                  title="Open in WhatsApp Web browser tab"
                >
                  <span>🌐 Open WhatsApp Web</span>
                </a>
              </div>
            )}

            {/* 2. Next Customer Button */}
            <button
              ref={newBillBtnRef}
              type="button"
              onClick={onClose}
              className="apple-pressable w-full py-3.5 px-4 bg-neutral-950 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Next Customer</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
