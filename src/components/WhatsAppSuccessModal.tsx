'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Printer,
  Download,
  X,
  RotateCcw,
  Copy,
  Check,
  MessageSquare,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';
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

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/) ? parts[0].match(/:(.*?);/)![1] : 'image/png';
  const byteString = atob(parts[1]);
  const byteNumbers = new Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteNumbers[i] = byteString.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

export default function WhatsAppSuccessModal({
  isOpen,
  onClose,
  purchase,
  settings,
  billImageDataUrl,
}: WhatsAppSuccessModalProps) {
  const newBillBtnRef = useRef<HTMLButtonElement>(null);
  const [copiedPhoto, setCopiedPhoto] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [chatOpened, setChatOpened] = useState(false);

  // Validate and format recipient phone number
  const phoneValidation = purchase ? normalizeWhatsAppPhone(purchase.customer_phone) : { isValid: false, waDestination: '', formattedDisplay: '' };
  const destinationPhone = phoneValidation.waDestination;
  const formattedPhone = phoneValidation.formattedDisplay || (purchase?.customer_phone ?? '');

  // Format the cash memo message text
  const messageText = purchase && settings
    ? formatWhatsAppInvoiceText(purchase, settings)
    : purchase
    ? `🧾 *TERRY WOMEN CASH MEMO*\nCustomer: ${purchase.customer_name}\nBill No: ${purchase.invoice_number}\nTotal: ₹${purchase.final_amount.toFixed(2)}`
    : '';

  // Synchronously copy bill photo to clipboard
  const copyPhoto = async (): Promise<boolean> => {
    if (!billImageDataUrl) return false;
    try {
      const blob = dataUrlToBlob(billImageDataUrl);
      const win = window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => unknown };
      if (navigator.clipboard && win.ClipboardItem) {
        await (navigator.clipboard as unknown as { write: (items: unknown[]) => Promise<void> }).write([
          new win.ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedPhoto(true);
        setTimeout(() => setCopiedPhoto(false), 3500);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard image write failed:', err);
    }
    return false;
  };

  // Copy caption text
  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 3000);
    } catch (err) {
      console.warn('Copy text error:', err);
    }
  };

  // Open WhatsApp directly for the customer
  const handleOpenWhatsAppChat = () => {
    if (!destinationPhone) return;

    // 1. Immediately copy photo to clipboard synchronously in user gesture
    if (billImageDataUrl) {
      try {
        const blob = dataUrlToBlob(billImageDataUrl);
        const win = window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => unknown };
        if (navigator.clipboard && win.ClipboardItem) {
          (navigator.clipboard as unknown as { write: (items: unknown[]) => Promise<void> })
            .write([new win.ClipboardItem({ 'image/png': blob })])
            .then(() => {
              setCopiedPhoto(true);
              setTimeout(() => setCopiedPhoto(false), 5000);
            })
            .catch((err) => {
              console.warn('Clipboard write failed:', err);
            });
        }
      } catch (err) {
        console.warn('Clipboard write error:', err);
      }
    }

    // 2. Open WhatsApp Web synchronously so popup blockers NEVER block it
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://wa.me/${destinationPhone}?text=${encodeURIComponent(messageText)}`
      : `https://web.whatsapp.com/send?phone=${destinationPhone}&text=${encodeURIComponent(messageText)}`;

    window.open(waUrl, '_blank');
    setChatOpened(true);
  };

  // Save bill photo to device
  const handleSavePhoto = () => {
    if (!billImageDataUrl || !purchase) return;
    const link = document.createElement('a');
    link.href = billImageDataUrl;
    link.download = `${purchase.invoice_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share photo via Mobile Web Share API
  const handleShareMobile = async () => {
    if (!billImageDataUrl || !purchase) return;
    try {
      const blob = dataUrlToBlob(billImageDataUrl);
      const file = new File([blob], `${purchase.invoice_number}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill ${purchase.invoice_number}`,
          text: messageText,
        });
      } else {
        handleOpenWhatsAppChat();
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Try to copy photo to clipboard when modal opens
  useEffect(() => {
    if (isOpen && billImageDataUrl) {
      copyPhoto();
    }
  }, [isOpen, billImageDataUrl]);

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

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
            title="Close"
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

          {/* 2. PRIMARY DIRECT WHATSAPP ACTION (ZERO API NEEDED) */}
          <div className="bg-emerald-50/80 border-2 border-emerald-500/80 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#094327]" />
                <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Send to Customer WhatsApp
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                {formattedPhone}
              </span>
            </div>

            {/* Cash memo bill photo preview thumbnail */}
            {billImageDataUrl && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-2.5 flex items-center gap-3 shadow-xs">
                <img
                  src={billImageDataUrl}
                  alt="Cash Memo Preview"
                  className="w-14 h-16 object-cover object-top rounded-lg border border-neutral-300 shadow-xs shrink-0 cursor-grab hover:scale-105 transition-transform"
                  title="Cash Memo Photo"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#094327]">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ബിൽ ഫോട്ടോ തയ്യാറാണ് (Bill Photo Ready)</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                    ലാപ്ടോപ്പിൽ ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ ഫോട്ടോ കോപ്പി ആകും. വാട്സാപ്പിൽ ചെന്ന് <strong>Ctrl + V</strong> അടിച്ചാൽ മതി.
                  </p>
                </div>
              </div>
            )}

            {/* Big Green Primary Button: Open Customer WhatsApp Chat & Copy Photo */}
            <button
              type="button"
              onClick={handleOpenWhatsAppChat}
              className="apple-pressable w-full py-4 px-4 bg-[#094327] hover:bg-[#06311d] text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 focus:ring-4 focus:ring-emerald-500/30 outline-hidden"
            >
              <MessageSquare className="w-5 h-5 text-emerald-300" />
              <span>Open WhatsApp &amp; Copy Photo ({formattedPhone})</span>
              <ExternalLink className="w-4 h-4 text-emerald-300" />
            </button>

            {/* Step-by-step guidance banner */}
            <div
              className={`p-3.5 rounded-2xl border transition-all text-xs leading-relaxed ${
                chatOpened
                  ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                  : 'bg-white/95 border-emerald-200 text-neutral-800'
              }`}
            >
              <p className="font-bold flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-[#094327]">
                  <span>{chatOpened ? '⌨️ WhatsApp തുറന്നു! അവസാന സ്റ്റെപ്പ്:' : '💡 ലാപ്ടോപ്പിൽ ഫോട്ടോ അയക്കാൻ:'}</span>
                </span>
                {copiedPhoto && (
                  <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                    Photo Copied!
                  </span>
                )}
              </p>
              <div className="mt-2 space-y-1.5 text-[11.5px] text-neutral-700">
                <p className="flex items-start gap-1.5">
                  <span className="font-bold text-emerald-800 shrink-0">1.</span>
                  <span>
                    മുകളിലെ <strong>'Open WhatsApp &amp; Copy Photo'</strong> അമർത്തുക.
                  </span>
                </p>
                <p className="flex items-start gap-1.5 font-semibold text-neutral-900">
                  <span className="font-bold text-emerald-800 shrink-0">2.</span>
                  <span>
                    തുറന്നുവരുന്ന WhatsApp ചാറ്റിൽ ചെന്ന് <strong>Ctrl + V (Paste)</strong> അടിക്കുക.
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="font-bold text-emerald-800 shrink-0">3.</span>
                  <span>
                    ബിൽ ഫോട്ടോയും മെസ്സേജും വരും $\rightarrow$ <strong>Enter</strong> അമർത്തിയാൽ സെന്റാകും!
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions Row: Copy Photo, Copy Caption, Save Photo */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={copyPhoto}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  copiedPhoto
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                }`}
                title="Copy bill photo to clipboard again"
              >
                {copiedPhoto ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-[#094327]" />}
                <span>{copiedPhoto ? 'Photo Copied!' : 'Copy Photo'}</span>
              </button>

              <button
                type="button"
                onClick={copyCaption}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  copiedCaption
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                }`}
                title="Copy cash memo text caption"
              >
                {copiedCaption ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-[#094327]" />}
                <span>{copiedCaption ? 'Text Copied!' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleSavePhoto}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Download PNG invoice photo"
              >
                <Download className="w-4 h-4 text-neutral-700" />
                <span>Save Photo</span>
              </button>
            </div>

            {/* Mobile Share Button if on mobile device */}
            {isMobile && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleShareMobile}
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Share2 className="w-4 h-4 text-emerald-300" />
                  <span>Share Photo via Mobile (Select Contact)</span>
                </button>
                <span className="text-[10px] text-neutral-500 block text-center mt-1">
                  *Android opens contact list when sharing files
                </span>
              </div>
            )}
          </div>

          {/* 3. Next Customer & Print Actions */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            {/* Primary Action: Next Customer (New Bill) */}
            <button
              ref={newBillBtnRef}
              type="button"
              onClick={onClose}
              className="apple-pressable w-full py-3.5 px-4 bg-neutral-950 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Next Customer (New Bill)</span>
            </button>

            {/* Secondary Actions: Print Bill & Download PDF */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="apple-pressable flex items-center justify-center gap-2 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="apple-pressable flex items-center justify-center gap-2 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
