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
  settings?: Partial<ShopSettings> | null,
  _options?: { includeInvoiceLink?: boolean; baseUrl?: string; hideProgressBar?: boolean }
): string {
  const branchKey = (purchase.branch || 'vnb').toLowerCase();
  const branchTown = branchKey === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam';
  const separator = '━━━━━━━━━━━━━━━';

  const customerName = (purchase.customer_name || 'Customer').trim();
  const billNo = purchase.invoice_number || '0001';

  const dateObj = new Date(purchase.created_at);
  const dateFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today';

  const discountFormatted = (purchase.discount_amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const finalFormatted = (purchase.final_amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const subtotalFormatted = (purchase.subtotal || purchase.final_amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Format Items
  let itemsBlock = '';
  if (purchase.items && purchase.items.length === 1) {
    const it = purchase.items[0];
    let weightOrQty = '';
    if (it.weight_grams && it.weight_grams > 0) {
      weightOrQty = (it.weight_grams / 1000).toFixed(2);
    } else if (purchase.weight_grams > 0) {
      weightOrQty = (purchase.weight_grams / 1000).toFixed(2);
    } else {
      weightOrQty = typeof it.quantity === 'string' ? it.quantity.replace(/\s*KG/i, '') : '1';
    }
    const itAmt = it.amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    itemsBlock = (
      `Item: ${it.description || 'Ladies Readymade Garment / Dress Material'}\n` +
      `Quantity: ${weightOrQty} KG\n` +
      `Amount: ₹${itAmt}\n` +
      `Discount: ₹${discountFormatted}`
    );
  } else if (purchase.items && purchase.items.length > 1) {
    const itemLines = purchase.items.map((it) => {
      let qty = '';
      if (it.weight_grams && it.weight_grams > 0) {
        qty = `${(it.weight_grams / 1000).toFixed(2)} KG`;
      } else if (it.quantity) {
        qty = `${it.quantity}`;
      } else {
        qty = '1 Pc';
      }
      const amt = it.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `Item: ${it.description} (${qty}) - ₹${amt}`;
    });
    const wtKg = purchase.weight_grams > 0 ? (purchase.weight_grams / 1000).toFixed(2) : '0.00';
    itemsBlock = (
      itemLines.join('\n') +
      `\nQuantity: ${wtKg} KG\n` +
      `Amount: ₹${subtotalFormatted}\n` +
      `Discount: ₹${discountFormatted}`
    );
  } else {
    let weightOrQty = '0.00';
    if (purchase.weight_grams && purchase.weight_grams > 0) {
      weightOrQty = (purchase.weight_grams / 1000).toFixed(2);
    }
    const desc = purchase.notes || 'Ladies Readymade Garment / Dress Material';
    itemsBlock = (
      `Item: ${desc}\n` +
      `Quantity: ${weightOrQty} KG\n` +
      `Amount: ₹${subtotalFormatted}\n` +
      `Discount: ₹${discountFormatted}`
    );
  }

  // Round off note if non-zero
  let roundOffLine = '';
  if (typeof purchase.round_off === 'number' && purchase.round_off !== 0) {
    const sign = purchase.round_off < 0 ? '-' : '+';
    roundOffLine = `\nRound Off: ${sign}₹${Math.abs(purchase.round_off).toFixed(2)}`;
  }

  // Payment label
  let paymentLabel = 'Cash';
  const pmUpper = (purchase.payment_method || 'CASH').toUpperCase();
  if (pmUpper === 'UPI') paymentLabel = 'UPI';
  else if (pmUpper === 'CARD') paymentLabel = 'Card';
  else if (pmUpper === 'CASH') paymentLabel = 'Cash';
  else if (purchase.payment_method) {
    paymentLabel = purchase.payment_method.charAt(0).toUpperCase() + purchase.payment_method.slice(1).toLowerCase();
  }

  // Loyalty offer block (TERRY REWARDS or Unlock Congratulations)
  const currentWeightGrams = typeof purchase.loyalty_weight_after_grams === 'number'
    ? purchase.loyalty_weight_after_grams
    : (purchase.weight_grams || 0);
  const completedKg = (currentWeightGrams / 1000).toFixed(2);

  let rewardsBlock = '';
  if (purchase.loyalty_reward_unlocked_after) {
    rewardsBlock = (
      `🎉 *Congratulations ${customerName}!*\n` +
      `Reward unlocked! Buy 1 KG on your next visit and pay for only 500 g.`
    );
  } else if (purchase.loyalty_applied) {
    rewardsBlock = (
      `🎉 *Congratulations ${customerName}!*\n` +
      `500 g FREE Reward Redeemed on 1 KG!\n` +
      `Buy 5 KG in total and get *500 g FREE* on your next 1 KG purchase!\n` +
      `📊 Progress: *0.00 KG / 5 KG*`
    );
  } else {
    rewardsBlock = (
      `🎁 *TERRY REWARDS*\n` +
      `Buy 5 KG in total and get *500 g FREE* on your next 1 KG purchase!\n` +
      `📊 Progress: *${completedKg} KG / 5 KG*`
    );
  }

  const phone = settings?.phone || settings?.whatsapp_number || '+91 8330889632';

  return (
    `👗 *TERRY 7 WOMEN*\n` +
    `📍 ${branchTown}\n\n` +
    `Hello ${customerName}! 👋\n\n` +
    `${separator}\n` +
    `${itemsBlock}` +
    `${roundOffLine}\n\n` +
    `💰 *Total Paid: ₹${finalFormatted}*\n` +
    `💵 Payment: ${paymentLabel}\n` +
    `${separator}\n\n` +
    `${rewardsBlock}\n\n` +
    `Thank you for shopping with us ❤️\n` +
    `📞 ${phone}`
  );
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
 * Sends official sales message via Meta WhatsApp Business Platform Cloud API.
 * Rules:
 * - Recipient is strictly derived from purchase.customer_phone.
 * - Sender is the configured Meta Phone Number ID (+91 8330889632).
 * - Sends clean text message directly without invoice links or attachments.
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
          errorMessage: `Message has already been sent to customer ${phoneValidation.formattedDisplay || recipientPhone} (Message ID: ${alreadySent.message_id || 'unknown'}). Use resend if you wish to dispatch again.`,
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
        'Please send message via WhatsApp Web / App directly.',
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }

  // 4. Send WhatsApp Text Message via Meta Graph API
  try {
    const messageEndpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        body: formattedText,
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
        recipientPhone,
        senderPhone: businessSenderPhone,
      };
    }

    const messageId = msgData.messages[0].id;
    return {
      success: true,
      status: 'SENT',
      messageId,
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error sending message';
    console.error('Network error sending WhatsApp message:', err);
    return {
      success: false,
      status: 'FAILED',
      errorCode: 'MESSAGE_SEND_NETWORK_ERROR',
      errorMessage: `Network error sending WhatsApp message: ${errorMsg}`,
      formattedText,
      recipientPhone,
      senderPhone: businessSenderPhone,
    };
  }
}


