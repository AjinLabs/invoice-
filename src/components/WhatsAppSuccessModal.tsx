'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Printer,
  Download,
  X,
  Share2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Check,
  RotateCw,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';

interface WhatsAppSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  settings?: ShopSettings;
  billImageDataUrl?: string | null;
  whatsappResult?: {
    isDemo: boolean;
    status: string;
    formattedText: string;
    errorMessage?: string;
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
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

export default function WhatsAppSuccessModal({
  isOpen,
  onClose,
  purchase,
  settings,
  billImageDataUrl,
  whatsappResult,
  onResend,
  isResending = false,
}: WhatsAppSuccessModalProps) {
  const [copiedPhoto, setCopiedPhoto] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(true);

  if (!isOpen || !purchase) return null;

  const cleanCustomerPhone = purchase.customer_phone.replace(/\D/g, '');
  const destinationPhone = cleanCustomerPhone.length === 10 ? `91${cleanCustomerPhone}` : cleanCustomerPhone;
  const messageText = whatsappResult?.formattedText || '';

  // Synchronously copy photo to clipboard
  const copyPhotoToClipboard = async (): Promise<boolean> => {
    if (!billImageDataUrl) return false;
    try {
      const blob = dataUrlToBlob(billImageDataUrl);
      const win = window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => unknown };
      if (navigator.clipboard && win.ClipboardItem) {
        await (navigator.clipboard as unknown as { write: (items: unknown[]) => Promise<void> }).write([
          new win.ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedPhoto(true);
        setTimeout(() => setCopiedPhoto(false), 4000);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
    return false;
  };

  // Copy text message to clipboard
  const copyTextToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    } catch (err) {
      console.warn('Copy text error:', err);
    }
  };

  const isMobileOrTablet =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const isSentViaCloudApi =
    whatsappResult?.status === 'SENT' && !whatsappResult?.isDemo;

  // Direct open to customer's WhatsApp chat
  const handleOpenDirectCustomerChat = () => {
    copyPhotoToClipboard().catch(() => {});
    const encodedText = encodeURIComponent(messageText);
    const waUrl = isMobileOrTablet
      ? `https://api.whatsapp.com/send?phone=${destinationPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${destinationPhone}&text=${encodedText}`;

    if (isMobileOrTablet) {
      window.location.href = waUrl;
    } else {
      window.open(waUrl, '_blank');
    }
  };

  // Open WhatsApp Web with clipboard photo copy
  const handleOpenWhatsApp = async () => {
    await copyPhotoToClipboard();
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://web.whatsapp.com/send?phone=${destinationPhone}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  // Native Web Share API (Passes actual PNG file and text caption together!)
  const handleNativeShare = async () => {
    if (!billImageDataUrl) {
      handleOpenDirectCustomerChat();
      return;
    }
    try {
      const blob = dataUrlToBlob(billImageDataUrl);
      const file = new File([blob], `${purchase.invoice_number}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `TERRY7 WOMEN - ${purchase.invoice_number}`,
          text: messageText,
        });
        return;
      }
    } catch (err: unknown) {
      const shareError = err as { name?: string };
      if (shareError?.name === 'AbortError') {
        // User closed or dismissed the share sheet, do not trigger fallback
        return;
      }
      console.warn('Native share cancelled or failed:', err);
    }
    // Fallback to direct chat
    handleOpenDirectCustomerChat();
  };

  // Download Bill Photo
  const handleDownloadPhoto = () => {
    if (!billImageDataUrl) return;
    const link = document.createElement('a');
    link.href = billImageDataUrl;
    link.download = `${purchase.invoice_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    if (!purchase || !settings) return;
    const doc = generateInvoicePdf(purchase, settings);
    doc.save(`${purchase.invoice_number}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print transition-all">
      <div className="apple-surface bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.25)] border border-neutral-200/80 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header (Apple Glass Dark) */}
        <div className="apple-glass-dark bg-neutral-900/95 text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 apple-headline tracking-tight">
                <span>Bill Generated & Ready!</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  {purchase.invoice_number}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 tracking-tight">
                Customer: <strong className="text-white">{purchase.customer_name}</strong> ({purchase.customer_phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors apple-pressable"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Key Purchase Overview */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-center">
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Weight</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-900">{purchase.weight_grams}g</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Net Amount</span>
              <span className="text-xs sm:text-sm font-black text-neutral-950 font-mono">
                ₹{purchase.final_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Loyalty</span>
              <span className={`text-[11px] font-bold ${purchase.loyalty_applied ? 'text-emerald-700' : 'text-neutral-700'}`}>
                {purchase.loyalty_applied ? '50% OFF (1KG)' : `${purchase.loyalty_progress_after}/5 Visits`}
              </span>
            </div>
          </div>

          {/* STATUS / INSTRUCTION BANNER */}
          {isSentViaCloudApi ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  🎉 Bill Sent Automatically to WhatsApp!
                </h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                The cash memo and details were dispatched directly to <strong>{purchase.customer_name}</strong> (+{cleanCustomerPhone}) via Meta WhatsApp Cloud API. No further action needed!
              </p>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border-2 border-emerald-400 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                    💬 Direct WhatsApp Delivery
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Customer: +{cleanCustomerPhone}
                </span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 space-y-2 text-xs text-neutral-800 leading-relaxed">
                <p>
                  Tap the green button <strong>&apos;Open Customer&apos;s WhatsApp Chat&apos;</strong> to immediately open WhatsApp with <strong>{purchase.customer_name}&apos;s chat</strong> and the bill message pre-filled. Just tap Send!
                </p>
              </div>

              {/* Notification Toast if copied */}
              {copiedPhoto && (
                <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Invoice photo copied to clipboard! Press Ctrl + V in WhatsApp to send.</span>
                </div>
              )}
            </div>
          )}

          {/* PRIMARY ACTIONS: Direct 1-Tap Customer Chat for Tablet & PC */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleOpenDirectCustomerChat}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
              <span>💬 Open WhatsApp Chat (+{cleanCustomerPhone})</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Share bill image file through device share sheet"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>📲 Share Bill Photo File</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Open WhatsApp Web on Desktop"
              >
                <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
                <span>💻 WhatsApp Web (PC)</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={copyPhotoToClipboard}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPhoto ? 'Copied! ✓' : 'Copy Photo'}</span>
              </button>

              <button
                type="button"
                onClick={copyTextToClipboard}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText ? 'Copied! ✓' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPhoto}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold border border-neutral-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Photo</span>
              </button>
            </div>
          </div>

          {/* BILL PHOTO PREVIEW (The boutique floral design!) */}
          {billImageDataUrl && (
            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 shadow-xs">
              <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-neutral-800">
                  <ImageIcon className="w-4 h-4 text-[#487ec3]" />
                  <span>Official Cash Memo Photo (Ready to send)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                  className="text-[11px] px-2.5 py-1 rounded bg-white border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-50"
                >
                  {showPhotoPreview ? 'Collapse' : 'Expand Photo'}
                </button>
              </div>

              {showPhotoPreview && (
                <div className="p-3 bg-[#e5e0d3] max-h-80 overflow-y-auto flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={billImageDataUrl}
                    alt="TERRY7 WOMEN Cash Memo"
                    className="max-w-full rounded-2xl shadow-lg border border-neutral-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* WhatsApp Text Preview Card */}
          <div className="border border-neutral-200 rounded-2xl p-3 bg-neutral-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Invoice Message Text
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Ready for WhatsApp
              </span>
            </div>

            <div className="bg-[#e5ddd5] p-3 rounded-xl border border-[#c1b5a9] text-xs font-sans text-neutral-800 max-h-36 overflow-y-auto whitespace-pre-line shadow-inner">
              <div className="bg-white rounded-lg p-2.5 shadow-xs max-w-[98%] border border-[#dcdcdc] text-neutral-900 leading-relaxed font-sans">
                {whatsappResult?.formattedText || 'Generating WhatsApp message text...'}
              </div>
            </div>
          </div>

          {/* Print, PDF & Resend Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-800 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {onResend && (
              <button
                type="button"
                onClick={onResend}
                disabled={isResending}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Resending...' : 'Resend'}</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-neutral-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Next Customer (New Bill)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
