import type { Purchase, ShopSettings } from './types.ts';
import { normalizeWhatsAppPhone } from './phone.ts';
import { formatWhatsAppLoyaltySection } from './loyalty.ts';

export interface SendWhatsAppResult {
  success: boolean;
  isDemo: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  formattedText: string;
}

/**
 * Format official WhatsApp cash memo text strictly according to Section 4 structure:
 * 👗 *TERRY WOMEN — VANIYAMBALAM*
 * ━━━━━━━━━━━━━━━━━━
 * 🧾 *CASH MEMO*
 * ...
 * 🛍️ *ITEM DETAILS*
 * ...
 * 💰 *BILL SUMMARY*
 * ...
 * 🎁 *YOUR LOYALTY REWARDS*
 * ...
 * ❤️ Thank you for shopping with *TERRY WOMEN!*
 */
export function formatWhatsAppInvoiceText(
  purchase: Purchase,
  settings: ShopSettings,
  baseUrl?: string
): string {
  const host =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://terry7women.vercel.app');

  const digitalBillUrl = `${host}/invoice/${purchase.id}`;

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

  // Loyalty Rewards section
  const loyaltyBlock = formatWhatsAppLoyaltySection(purchase, settings);
  const phone = settings.phone || settings.whatsapp_number || '+91 8330889632';

  return (
    `👗 *${branchTitle}*\n` +
    `${separator}\n` +
    `🧾 *CASH MEMO*\n\n` +
    `👤 Customer: ${purchase.customer_name}\n` +
    `🧾 Invoice: ${purchase.invoice_number}\n` +
    `📅 Date: ${dateFormatted}\n` +
    (digitalBillUrl ? `🌐 Bill Link: ${digitalBillUrl}\n` : '') +
    `\n${separator}\n` +
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
 * Send WhatsApp Invoice via Meta Business Cloud API or Demo Simulator
 */
export async function sendWhatsAppInvoice(
  purchase: Purchase,
  settings: ShopSettings,
  baseUrl?: string
): Promise<SendWhatsAppResult> {
  const formattedText = formatWhatsAppInvoiceText(purchase, settings, baseUrl);
  const isDemo = settings.whatsapp_mode === 'DEMO';

  // Demo Mode Simulation
  if (isDemo) {
    return {
      success: true,
      isDemo: true,
      status: 'DELIVERED',
      messageId: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      formattedText,
    };
  }

  // Validate recipient phone number
  const phoneValidation = normalizeWhatsAppPhone(purchase.customer_phone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      isDemo: false,
      status: 'FAILED',
      errorMessage: phoneValidation.error || 'Invalid customer phone number',
      formattedText,
    };
  }

  // Production Mode: Meta WhatsApp Business Cloud API
  const token = process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsapp_access_token;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsapp_phone_number_id;
  const apiVersion = process.env.WHATSAPP_API_VERSION || settings.whatsapp_api_version || 'v20.0';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      isDemo: false,
      status: 'FAILED',
      errorMessage: 'WhatsApp credentials missing: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.',
      formattedText,
    };
  }

  try {
    const recipientPhone = phoneValidation.waDestination;
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: true, // Enables rich OpenGraph preview card for the bill link!
        body: formattedText,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return {
        success: false,
        isDemo: false,
        status: 'FAILED',
        errorMessage: data.error?.message || `WhatsApp API error ${response.status}`,
        formattedText,
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
    return {
      success: true,
      isDemo: false,
      status: 'SENT',
      messageId,
      formattedText,
    };
  } catch (err: unknown) {
    console.error('Network error sending WhatsApp message:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown network error occurred';
    return {
      success: false,
      isDemo: false,
      status: 'FAILED',
      errorMessage,
      formattedText,
    };
  }
}
