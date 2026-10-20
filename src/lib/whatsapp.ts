import { Purchase, ShopSettings } from './types';

export interface SendWhatsAppResult {
  success: boolean;
  isDemo: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  formattedText: string;
}

/**
 * Format official WhatsApp invoice text as specified in Section 7
 */
export function formatWhatsAppInvoiceText(purchase: Purchase, settings: ShopSettings): string {
  const dateObj = new Date(purchase.created_at);
  const dateFormatted = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const branchKey = (purchase.branch || 'vnb').toLowerCase();
  const branchTown = branchKey === 'pkdm' ? 'Pookkottumpadam' : 'Vaniyambalam';
  const branchTitle =
    branchKey === 'pkdm'
      ? 'TERRY7 WOMEN – POOKKOTTUMPADAM'
      : 'TERRY7 WOMEN – VANIYAMBALAM';

  // Format Items
  let itemsBlock = '';
  if (purchase.items && purchase.items.length > 0) {
    itemsBlock = purchase.items
      .map((it, idx) => {
        const q =
          it.quantity ||
          (it.weight_grams
            ? `${(it.weight_grams / 1000).toFixed(it.weight_grams % 1000 === 0 ? 0 : 2)} KG`
            : '1');
        const formattedAmt = it.amount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `${idx + 1}. ${it.description} (${q}) — ₹${formattedAmt}`;
      })
      .join('\n');
  } else if (purchase.weight_grams > 0) {
    const wtKg = (purchase.weight_grams / 1000).toFixed(
      purchase.weight_grams % 1000 === 0 ? 0 : 2
    );
    const formattedAmt = purchase.subtotal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const desc = purchase.notes || 'Ladies Readymade Garment / Dress Material';
    itemsBlock = `1. ${desc} (${wtKg} KG) — ₹${formattedAmt}`;
  } else {
    const formattedAmt = purchase.final_amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    itemsBlock = `1. Readymade Garment (1) — ₹${formattedAmt}`;
  }

  // Format Loyalty Rewards
  const currentWeightGrams = purchase.loyalty_weight_after_grams ?? 0;
  const currentWeightKg = (currentWeightGrams / 1000).toFixed(2);
  const remainingGrams = Math.max(0, 5000 - currentWeightGrams);
  const remainingKg = (remainingGrams / 1000).toFixed(2);

  let loyaltySection = '';
  if (purchase.loyalty_applied) {
    loyaltySection =
      `🎁 *Reward Redeemed! 50% OFF on 1 KG Applied*\n` +
      `Discount: ₹${purchase.discount_amount.toFixed(2)}\n\n` +
      `⚖️ Total Weight: ${currentWeightKg} KG / 5 KG\n` +
      `🎉 Thank you for being our loyal customer! ❤️`;
  } else if (purchase.loyalty_reward_unlocked_after || currentWeightGrams >= 5000) {
    loyaltySection =
      `⚖️ Total Weight: ${currentWeightKg} KG / 5 KG\n` +
      `🎉 *50% OFF on 1 KG Reward UNLOCKED!* (Milestone Reached)\n\n` +
      `✨ Claim your *50% OFF on 1 KG* on your next purchase!`;
  } else {
    loyaltySection =
      `⚖️ Total Weight: ${currentWeightKg} KG / 5 KG\n` +
      `🎯 Remaining: ${remainingKg} KG to unlock your reward!\n\n` +
      `🎉 Complete 5 KG of eligible purchases to unlock *50% OFF on 1 KG*.`;
  }

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
  const phone = settings.phone || settings.whatsapp_number || '+91 8330889632';

  return (
    `👗 *${branchTitle}* 👗\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *CASH MEMO*\n\n` +
    `👤 Customer: ${purchase.customer_name}\n` +
    `📅 Date: ${dateFormatted}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🛍️ *ITEM DETAILS*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    itemsBlock +
    `\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *BILL SUMMARY*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Subtotal: ₹${subtotalFormatted}\n` +
    `Discount: ₹${discountFormatted}\n` +
    (typeof purchase.round_off === 'number' && purchase.round_off !== 0
      ? `Round Off: ${purchase.round_off > 0 ? '+' : ''}₹${purchase.round_off.toFixed(2)}\n`
      : '') +
    `\n💵 *TOTAL PAID: ₹${finalFormatted}*\n` +
    `💳 Payment: ${purchase.payment_method}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎁 *LOYALTY REWARDS*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    loyaltySection +
    `\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `❤️ Thank you for shopping with *TERRY7 WOMEN!*\n\n` +
    `📍 ${branchTown}\n` +
    `📞 ${phone}`
  );
}

/**
 * Send WhatsApp Invoice via Meta Business Cloud API or Demo Simulator
 */
export async function sendWhatsAppInvoice(
  purchase: Purchase,
  settings: ShopSettings
): Promise<SendWhatsAppResult> {
  const formattedText = formatWhatsAppInvoiceText(purchase, settings);
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
    // Normalize destination number to E.164 without '+'
    let recipientPhone = purchase.customer_phone.replace(/\D/g, '');
    if (recipientPhone.length === 10) {
      recipientPhone = `91${recipientPhone}`; // Default India country code
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Send direct text invoice with no link preview
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
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
