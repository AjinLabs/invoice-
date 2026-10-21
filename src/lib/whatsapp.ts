import type { Purchase, ShopSettings } from './types.ts';
import { normalizeWhatsAppPhone } from './phone.ts';
import { formatWhatsAppLoyaltySection } from './loyalty.ts';

export interface SendWhatsAppOptions {
  imageBuffer?: Buffer;
  imageDataUrl?: string;
  forceResend?: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string;
  mediaId?: string;
  errorMessage?: string;
  errorCode?: string;
  formattedText: string;
  recipientPhone: string;
  senderPhone: string;
}

declare global {
  var __INVOICE_IMAGE_CACHE__: Map<string, Buffer> | undefined;
}

/**
 * Resolves binary image buffer for an invoice from:
 * 1. Provided imageBuffer
 * 2. Provided base64 data URL
 * 3. In-memory global cache
 * 4. Local disk storage (INVOICES_DIR)
 */
export async function resolveInvoiceImageBuffer(
  purchaseId: string,
  options?: SendWhatsAppOptions
): Promise<Buffer | null> {
  if (options?.imageBuffer && Buffer.isBuffer(options.imageBuffer)) {
    return options.imageBuffer;
  }
  if (options?.imageDataUrl && options.imageDataUrl.includes('base64,')) {
    try {
      const b64 = options.imageDataUrl.split('base64,')[1];
      return Buffer.from(b64, 'base64');
    } catch (e) {
      console.warn('Failed to parse imageDataUrl to Buffer:', e);
    }
  }

  // Check global memory cache
  const memCache = (globalThis as unknown as { __INVOICE_IMAGE_CACHE__?: Map<string, Buffer> })
    .__INVOICE_IMAGE_CACHE__;
  if (memCache && memCache.has(purchaseId)) {
    return memCache.get(purchaseId)!;
  }

  // Check filesystem on server
  if (typeof window === 'undefined') {
    try {
      const { INVOICES_DIR } = await import('./db.ts');
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(INVOICES_DIR, `${purchaseId}.png`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch {}
  }

  return null;
}

/**
 * Format official WhatsApp cash memo text strictly according to Section 4 structure:
 * 👗 *TERRY WOMEN — VANIYAMBALAM*
 * ━━━━━━━━━━━━━━━━━━
 * 🧾 *CASH MEMO*
 *
 * 👤 Customer: [Customer Name]
 * 🧾 Invoice: [Invoice Number]
 * 📅 Date: [Date]
 *
 * ━━━━━━━━━━━━━━━━━━
 * 🛍️ *ITEM DETAILS*
 * ...
 * 💰 *BILL SUMMARY*
 * ...
 * 🎁 *YOUR LOYALTY REWARDS*
 * ...
 * ❤️ Thank you for shopping with *TERRY WOMEN!*
 *
 * CRITICAL RULE:
 * Absolutely NO invoice URL, NO website link, NO "Bill Link", and NO external webpage.
 * The invoice is delivered as an actual image attachment on WhatsApp.
 */
export function formatWhatsAppInvoiceText(
  purchase: Purchase,
  settings: ShopSettings,
  options?: { includeInvoiceLink?: boolean; baseUrl?: string }
): string {
  const dateObj = new Date(purchase.created_at);
  const dateFormatted = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const branchKey = (purchase.branch || 'vnb').toLowerCase();
  const branchTown = branchKey === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam';
  const branchTitle = `TERRY WOMEN — ${branchTown.toUpperCase()}`;
  const separator = '━━━━━━━━━━━━━━━━━━';

  // Format Items
  let itemsBlock = '';
  if (purchase.items && purchase.items.length > 0) {
    itemsBlock = purchase.items
      .map((it) => {
        let weightOrQty = '';
        if (it.weight_grams && it.weight_grams > 0) {
          const kg = (it.weight_grams / 1000).toFixed(2);
          weightOrQty = `${kg} KG`;
        } else if (it.quantity) {
          weightOrQty = `${it.quantity}`;
        } else {
          weightOrQty = '1 Pc';
        }
        const formattedAmt = it.amount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `${it.description} — ${weightOrQty}\nAmount: ₹${formattedAmt}`;
      })
      .join('\n\n');
  } else if (purchase.weight_grams > 0) {
    const wtKg = (purchase.weight_grams / 1000).toFixed(2);
    const formattedAmt = purchase.subtotal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const desc = purchase.notes || 'Dress Material / Ready-made Garment';
    itemsBlock = `${desc} — ${wtKg} KG\nAmount: ₹${formattedAmt}`;
  } else {
    const formattedAmt = purchase.final_amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    itemsBlock = `Dress Material / Ready-made Garment — 1 Pc\nAmount: ₹${formattedAmt}`;
  }

  // Format Bill Summary
  const subtotalFormatted = purchase.subtotal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const discountFormatted = purchase.discount_amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const finalFormatted = purchase.final_amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const roundOffStr =
    typeof purchase.round_off === 'number' && purchase.round_off !== 0
      ? `Round Off: ${purchase.round_off < 0 ? '-' : '+'}₹${Math.abs(purchase.round_off).toFixed(2)}\n`
      : '';

  // Loyalty Rewards section (dynamic 10-segment Unicode bar)
  const loyaltyBlock = formatWhatsAppLoyaltySection(purchase, settings);
  const phone = settings.phone || settings.whatsapp_number || '+91 8330889632';

  let text = (
    `👗 *${branchTitle}*\n` +
    `${separator}\n` +
    `🧾 *CASH MEMO*\n\n` +
    `👤 Customer: ${purchase.customer_name}\n` +
    `🧾 Invoice: ${purchase.invoice_number}\n` +
    `📅 Date: ${dateFormatted}\n\n` +
    `${separator}\n` +
    `🛍️ *ITEM DETAILS*\n\n` +
    `${itemsBlock}\n\n` +
    `${separator}\n` +
    `💰 *BILL SUMMARY*\n\n` +
    `Subtotal: ₹${subtotalFormatted}\n` +
    `Discount: ₹${discountFormatted}\n` +
    roundOffStr +
    `*TOTAL PAID: ₹${finalFormatted}*\n` +
    `Payment: ${purchase.payment_method}\n\n` +
    `${separator}\n` +
    `${loyaltyBlock}\n\n` +
    `${separator}\n` +
    `❤️ Thank you for shopping with *TERRY WOMEN!*\n` +
    `📍 ${branchTown}\n` +
    `📞 ${phone}`
  );

  if (options?.includeInvoiceLink) {
    const baseUrl = options.baseUrl || 'https://terry7women.vercel.app';
    text += `\n\n🧾 *Invoice Photo:*\n${baseUrl}/invoice/${purchase.id}`;
  }

  return text;
}

/**
 * Builds the official universal WhatsApp click-to-chat URL:
 * https://wa.me/[destinationPhone]?text=[encodedMessage]
 */
export function buildWhatsAppClickToChatUrl(destinationPhone: string, text: string): string {
  const cleanPhone = destinationPhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Builds direct WhatsApp Web URL for PC/desktop:
 * https://web.whatsapp.com/send?phone=[destinationPhone]&text=[encodedMessage]
 */
export function buildWhatsAppWebUrl(destinationPhone: string, text: string): string {
  const cleanPhone = destinationPhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Builds mobile app deep link:
 * https://api.whatsapp.com/send?phone=[destinationPhone]&text=[encodedMessage]
 */
export function buildWhatsAppMobileAppUrl(destinationPhone: string, text: string): string {
  const cleanPhone = destinationPhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Sends actual invoice image attachment with the cash memo as caption
 * via Meta WhatsApp Business Platform Cloud API.
 *
 * Rules:
 * - Recipient is strictly derived from purchase.customer_phone.
 * - Sender is the configured Meta Phone Number ID (+91 8330889632).
 * - Uploads the actual invoice PNG to Meta Media API.
 * - Sends message as type: "image" with the uploaded media ID and cash memo caption.
 * - NO invoice link, NO website URL.
 * - Prevents duplicate sends unless forceResend is true.
 * - Does NOT simulate successful delivery if credentials are unconfigured;
 *   returns clear, actionable status and instructions.
 */
export async function sendWhatsAppInvoice(
  purchase: Purchase,
  settings: ShopSettings,
  options?: SendWhatsAppOptions
): Promise<SendWhatsAppResult> {
  const formattedText = formatWhatsAppInvoiceText(purchase, settings);
  const businessSenderPhone = settings.whatsapp_number || settings.phone || '+91 8330889632';

  // 1. Validate Recipient Phone Number
  const phoneValidation = normalizeWhatsAppPhone(purchase.customer_phone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'INVALID_RECIPIENT_PHONE',
      errorMessage: `Invalid customer phone number: ${phoneValidation.error || 'Please enter a valid 10-digit mobile number.'}`,
      formattedText,
      recipientPhone: purchase.customer_phone,
      senderPhone: businessSenderPhone,
    };
  }

  const recipientPhone = phoneValidation.waDestination;

  // 2. Prevent Duplicate Delivery
  if (!options?.forceResend && typeof window === 'undefined') {
    try {
      const { readDb } = await import('./db.ts');
      const db = readDb();
      const alreadySent = db.whatsapp_messages?.find(
        (m) =>
          m.purchase_id === purchase.id &&
          (m.status === 'SENT' || m.status === 'DELIVERED') &&
          !m.is_demo
      );
      if (alreadySent) {
        return {
          success: false,
          status: 'FAILED',
          errorCode: 'ALREADY_SENT',
          errorMessage: `Invoice ${purchase.invoice_number} has already been sent to customer ${phoneValidation.formattedDisplay || recipientPhone} (Message ID: ${alreadySent.message_id || 'unknown'}). Use resend if you wish to dispatch again.`,
          formattedText,
          messageId: alreadySent.message_id,
          recipientPhone,
          senderPhone: businessSenderPhone,
        };
      }
    } catch {}
  }

  // 3. Verify WhatsApp Cloud API Credentials
  const token = process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsapp_access_token;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsapp_phone_number_id;
  const apiVersion = process.env.WHATSAPP_API_VERSION || settings.whatsapp_api_version || 'v20.0';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'CREDENTIALS_MISSING',
      errorMessage:
        'WhatsApp Business Cloud API is not configured: WHATSAPP_ACCESS_TOKEN and/or WHATSAPP_PHONE_NUMBER_ID are missing. ' +
        'To send invoice image attachments automatically to customer WhatsApp numbers from business sender +91 8330889632, ' +
        'please configure these credentials in your .env or Settings.',
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }

  // 4. Resolve Invoice Image Buffer
  const imageBuffer = await resolveInvoiceImageBuffer(purchase.id, options);
  if (!imageBuffer || imageBuffer.length === 0) {
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'IMAGE_NOT_FOUND',
      errorMessage: `Could not locate invoice image for ${purchase.invoice_number} to attach to WhatsApp.`,
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }

  // 5. Upload Invoice Image to Meta WhatsApp Media API
  let mediaId: string;
  try {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'image/png');
    formData.append(
      'file',
      new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }),
      `${purchase.invoice_number}.png`
    );

    const mediaUploadEndpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`;
    const uploadRes = await fetch(mediaUploadEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.id) {
      console.error('Meta Media Upload Error:', uploadData);
      return {
        success: false,
        status: 'FAILED',
        errorCode: 'MEDIA_UPLOAD_FAILED',
        errorMessage:
          uploadData.error?.message ||
          `Failed to upload invoice image to WhatsApp Business Media API (HTTP ${uploadRes.status}).`,
        formattedText,
        recipientPhone,
        senderPhone: businessSenderPhone,
      };
    }

    mediaId = uploadData.id;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error during media upload';
    console.error('Network error uploading invoice image to WhatsApp:', err);
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'MEDIA_UPLOAD_NETWORK_ERROR',
      errorMessage: `Network error uploading invoice image to WhatsApp: ${errorMsg}`,
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }

  // 6. Send WhatsApp Message with Image Attachment + Cash Memo Caption
  try {
    const messageEndpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'image',
      image: {
        id: mediaId,
        caption: formattedText,
      },
    };

    const msgRes = await fetch(messageEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const msgData = await msgRes.json();
    if (!msgRes.ok || !msgData.messages?.[0]?.id) {
      console.error('Meta Send Message Error:', msgData);
      return {
        success: false,
        status: 'FAILED',
        errorCode: 'MESSAGE_SEND_FAILED',
        errorMessage:
          msgData.error?.message ||
          `WhatsApp message delivery failed (HTTP ${msgRes.status}).`,
        formattedText,
        mediaId,
        recipientPhone,
        senderPhone: businessSenderPhone,
      };
    }

    const messageId = msgData.messages[0].id;
    return {
      success: true,
      status: 'SENT',
      messageId,
      mediaId,
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error sending message';
    console.error('Network error sending WhatsApp invoice message:', err);
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'MESSAGE_SEND_NETWORK_ERROR',
      errorMessage: `Network error sending WhatsApp invoice message: ${errorMsg}`,
      formattedText,
      mediaId,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }
}

