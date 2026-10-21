'use client';

import React, { useState, useTransition } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Printer,
  Download,
  X,
  Copy,
  Image as ImageIcon,
  Check,
  RotateCw,
  AlertTriangle,
  Laptop,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';
import { normalizeWhatsAppPhone } from '@/lib/phone';
import {
  formatWhatsAppInvoiceText,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppWebUrl,
} from '@/lib/whatsapp';

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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!isOpen || !purchase) return null;

  // Validate and normalize recipient customer phone number
  const phoneValidation = normalizeWhatsAppPhone(purchase.customer_phone);
  const destinationPhone = phoneValidation.waDestination;
  const formattedPhone = phoneValidation.formattedDisplay || purchase.customer_phone;

  // Construct message text
  const messageText =
    whatsappResult?.formattedText ||
    (settings
      ? formatWhatsAppInvoiceText(purchase, settings)
      : `Hello ${purchase.customer_name},\nThank you for shopping with TERRY7 WOMEN!\n\nYour bill details:\nInvoice No: ${purchase.invoice_number}\nTotal Amount: ₹${purchase.final_amount.toFixed(2)}\n\nThank you for shopping with us!`);

  const isMobileOrTablet =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const isSentViaCloudApi =
    whatsappResult?.status === 'SENT' && !whatsappResult?.isDemo;

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      startTransition(() => {
        setActionNotice((curr) => (curr === msg ? null : curr));
      });
    }, 4500);
  };

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
      console.warn('Clipboard image write not supported or failed:', err);
    }
    return false;
  };

  // Copy text message to clipboard
  const copyTextToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedText(true);
      showNotice('Cash memo caption copied to clipboard!');
      setTimeout(() => setCopiedText(false), 3000);
    } catch (err) {
      console.warn('Copy text error:', err);
    }
  };

  // 1. Direct WhatsApp Chat: Opens exact customer's WhatsApp conversation with the clean caption (NO URLs)
  const handleDirectWhatsAppChat = () => {
    if (!phoneValidation.isValid) {
      showNotice(`Cannot open chat: ${phoneValidation.error || 'Invalid customer phone number'}`);
      return;
    }

    // Pre-copy image to clipboard so user can immediately paste the invoice image in WhatsApp
    copyPhotoToClipboard().catch(() => {});

    const waUrl = buildWhatsAppClickToChatUrl(destinationPhone, messageText);

    if (isMobileOrTablet) {
      showNotice(`Opening ${purchase.customer_name}'s chat on WhatsApp...`);
      window.location.href = waUrl;
    } else {
      showNotice(`Opening ${purchase.customer_name}'s chat in WhatsApp...`);
      window.open(waUrl, '_blank');
    }
  };

  // 2. Open WhatsApp Web (PC)
  const handleOpenWhatsAppWeb = async () => {
    if (!phoneValidation.isValid) {
      showNotice(`Cannot open WhatsApp Web: ${phoneValidation.error || 'Invalid phone number'}`);
      return;
    }

    await copyPhotoToClipboard();
    const waWebUrl = buildWhatsAppWebUrl(destinationPhone, messageText);
    showNotice('Invoice photo copied! Opening WhatsApp Web — press Ctrl + V to paste photo.');
    window.open(waWebUrl, '_blank');
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
    showNotice('Bill photo downloaded to your device!');
  };

  // Download PDF
  const handleDownloadPdf = () => {
    if (!purchase || !settings) return;
    const doc = generateInvoicePdf(purchase, settings);
    doc.save(`${purchase.invoice_number}.pdf`);
    showNotice('Invoice PDF downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print transition-all">
      <div className="apple-surface bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.25)] border border-neutral-200/80 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="apple-glass-dark bg-[#094327] text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-emerald-300 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 tracking-tight">
                <span>Bill Generated & Ready!</span>
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-mono border border-white/30">
                  {purchase.invoice_number}
                </span>
              </h3>
              <p className="text-xs text-emerald-100 tracking-tight">
                Customer: <strong className="text-white">{purchase.customer_name}</strong> ({formattedPhone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-[#094327] text-white text-xs font-semibold py-2 px-4 text-center animate-in fade-in flex items-center justify-center gap-2 border-b border-emerald-600">
            <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Key Purchase Overview */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-center">
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase block">Weight / Items</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                {purchase.weight_grams > 0 ? `${purchase.weight_grams}g` : `${purchase.items?.length || 1} Items`}
              </span>
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
                {purchase.loyalty_applied ? '500g FREE Redeemed' : `${(purchase.loyalty_weight_after_grams || 0) / 1000} KG / 5 KG`}
              </span>
            </div>
          </div>

          {/* Validation Warning if phone invalid */}
          {!phoneValidation.isValid && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Invalid Customer Phone Number</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  {phoneValidation.error || 'Please ensure a valid 10-digit mobile number is entered for WhatsApp delivery.'}
                </p>
              </div>
            </div>
          )}

          {/* ACTUAL CLOUD API STATUS BANNER */}
          {isSentViaCloudApi ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  🎉 Invoice Image Sent via WhatsApp!
                </h4>
              </div>
              <div className="text-xs text-emerald-900 space-y-1">
                <p>
                  The actual invoice image attachment with the cash memo caption was sent directly to <strong>{purchase.customer_name}</strong> (<span className="font-mono">{formattedPhone}</span>).
                </p>
                <p className="text-[11px] text-emerald-700">
                  Sender: <strong>{settings?.whatsapp_number || '+91 8330889632'}</strong> • Message ID: <span className="font-mono">{whatsappResult?.messageId}</span>
                </p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  ✅ Sent directly as an image attachment in chat. No web links or external URLs.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/80 border-2 border-amber-400 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                    WhatsApp Cloud API Status
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Recipient: {formattedPhone}
                </span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs text-neutral-800 leading-relaxed space-y-1.5">
                <p className="text-amber-950 font-medium">
                  {whatsappResult?.errorMessage || 'WhatsApp Cloud API credentials are not yet configured.'}
                </p>
                <p className="text-[11px] text-neutral-600">
                  To automatically send the generated invoice image as an attachment from business sender <strong>+91 8330889632</strong> to customer numbers, configure <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in Settings.
                </p>
              </div>

              {copiedPhoto && (
                <div className="bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Invoice photo copied to clipboard! You can paste in WhatsApp with Ctrl + V.</span>
                </div>
              )}
            </div>
          )}

          {/* PRIMARY ACTIONS */}
          <div className="space-y-2.5 pt-1">
            {/* Direct WhatsApp Chat with Clean Caption & Copied Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDirectWhatsAppChat}
                disabled={!phoneValidation.isValid}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-[#094327] hover:bg-[#07301c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Open customer chat directly with pre-filled cash memo caption"
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>Open WhatsApp Chat</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                disabled={!phoneValidation.isValid}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Open WhatsApp Web on Desktop / PC"
              >
                <Laptop className="w-4 h-4 text-neutral-600" />
                <span>WhatsApp Web (PC)</span>
              </button>
            </div>

            {/* Utility Actions: Copy Photo, Copy Caption, Save Photo */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyPhotoToClipboard();
                  if (ok) showNotice('Invoice photo copied! Paste in WhatsApp with Ctrl + V.');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold border border-neutral-200 cursor-pointer"
                title="Copy high-res cash memo image to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPhoto ? 'Copied! ✓' : 'Copy Photo'}</span>
              </button>

              <button
                type="button"
                onClick={copyTextToClipboard}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold border border-neutral-200 cursor-pointer"
                title="Copy formatted invoice cash memo text without links"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText ? 'Copied! ✓' : 'Copy Caption'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPhoto}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold border border-neutral-200 cursor-pointer"
                title="Download bill photo as PNG file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Photo</span>
              </button>
            </div>
          </div>

          {/* BILL PHOTO PREVIEW */}
          {billImageDataUrl && (
            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 shadow-xs">
              <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-neutral-800">
                  <ImageIcon className="w-4 h-4 text-[#094327]" />
                  <span>Official Cash Memo Photo (Ready to send)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                  className="text-[11px] px-2.5 py-1 rounded bg-white border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
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
                {messageText}
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

          {/* Next Customer Button (Clean state reset) */}
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
