'use client';

import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Printer,
  Download,
  X,
  RotateCcw,
  AlertCircle,
  RotateCw,
  Send,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';
import { normalizeWhatsAppPhone } from '@/lib/phone';

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
  whatsappResult,
  onResend,
  isResending = false,
}: WhatsAppSuccessModalProps) {
  const newBillBtnRef = useRef<HTMLButtonElement>(null);

  // Focus New Bill button when modal opens so pressing Enter starts next customer
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        newBillBtnRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  // Validate and format recipient phone number
  const phoneValidation = normalizeWhatsAppPhone(purchase.customer_phone);
  const formattedPhone = phoneValidation.formattedDisplay || purchase.customer_phone;

  const isSent = whatsappResult?.status === 'SENT' || whatsappResult?.status === 'DELIVERED';
  const isFailed = whatsappResult?.status === 'FAILED';

  // Download PDF
  const handleDownloadPdf = () => {
    if (!purchase || !settings) return;
    const doc = generateInvoicePdf(purchase, settings);
    doc.save(`${purchase.invoice_number}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print transition-all">
      <div className="apple-surface bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.3)] border border-neutral-200/80 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="bg-[#094327] text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-emerald-300 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 tracking-tight">
                <span>Bill Generated &amp; Ready!</span>
              </h3>
              <span className="text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-mono border border-white/30 inline-block mt-0.5">
                {purchase.invoice_number}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Next Bill)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* 1. Customer & Bill Summary Card */}
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
                    : `${((purchase.loyalty_weight_after_grams || 0) / 1000).toFixed(2)} KG / 5.00 KG`}
                </span>
              </div>
            </div>
          </div>

          {/* 2. WhatsApp Delivery Status */}
          {isSent ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Invoice Image Sent via WhatsApp
                </h4>
              </div>
              <div className="text-xs text-emerald-900 space-y-1">
                <p>
                  Delivered as an image attachment with the cash memo caption to <strong>{purchase.customer_name}</strong> (<span className="font-mono">{formattedPhone}</span>).
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Sender: {settings?.whatsapp_number || '+91 8330889632'} • Delivery Accepted
                </p>
              </div>
            </div>
          ) : isFailed ? (
            <div className="bg-amber-50/90 border-2 border-amber-400 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                    WhatsApp Delivery Notice
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {formattedPhone}
                </span>
              </div>

              <div className="text-xs text-neutral-800 leading-relaxed">
                {whatsappResult?.errorCode === 'CREDENTIALS_MISSING' ? (
                  <p className="text-amber-950 font-medium">
                    WhatsApp Business API is not configured on the server. Please inform the store administrator to set up WhatsApp credentials in Admin Settings.
                  </p>
                ) : (
                  <p className="text-amber-950 font-medium">
                    {whatsappResult?.errorMessage || 'WhatsApp message could not be delivered.'}
                  </p>
                )}
              </div>

              {onResend && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Retrying WhatsApp...' : 'Retry WhatsApp Send'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 flex items-center gap-2 text-xs text-neutral-700">
              <Send className="w-4 h-4 text-neutral-500 animate-pulse" />
              <span>Processing WhatsApp delivery...</span>
            </div>
          )}

          {/* 3. Primary Cashier Actions */}
          <div className="space-y-2.5 pt-2">
            {/* Primary Action: New Bill (Next Customer) */}
            <button
              ref={newBillBtnRef}
              type="button"
              onClick={onClose}
              className="apple-pressable w-full py-4 px-4 bg-[#094327] hover:bg-[#06311d] text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 focus:ring-4 focus:ring-emerald-500/30 outline-hidden"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Next Customer (New Bill)</span>
            </button>

            {/* Secondary Actions: Print Bill & Download PDF */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="apple-pressable flex items-center justify-center gap-2 py-3 px-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="apple-pressable flex items-center justify-center gap-2 py-3 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
