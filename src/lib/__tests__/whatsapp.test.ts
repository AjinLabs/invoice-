import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWhatsAppInvoiceText,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppWebUrl,
  buildWhatsAppMobileAppUrl,
} from '../whatsapp.ts';
import type { Purchase, ShopSettings } from '../types.ts';

const mockSettings: ShopSettings = {
  id: 'sett_1',
  shop_name: 'TERRY7 WOMEN - Vaniyambalam',
  address: 'Near Town Hall & Railway Station, Vaniyambalam',
  phone: '+91 8330889632',
  whatsapp_number: '+91 8330889632',
  gstin: '32AAAAA0000A1Z5',
  rate_per_kg: 899,
  loyalty_discount: 449.5,
  min_weight_grams: 1000,
  required_visits: 5,
  round_off_mode: 'NONE',
  whatsapp_mode: 'DEMO',
  whatsapp_api_version: 'v20.0',
  whatsapp_verify_token: 'tok_1',
  updated_at: '2026-10-21T10:00:00.000Z',
};

const mockPurchase: Purchase = {
  id: 'pur_test_101',
  invoice_number: 'INV-VNB-2026-000101',
  branch: 'vnb',
  customer_id: 'cust_test_1',
  customer_name: 'Priya Sharma',
  customer_phone: '9876543210',
  customer_address: 'Nilambur, Kerala',
  weight_grams: 1250,
  weight_kg: 1.25,
  rate_per_kg: 899,
  subtotal: 1123.75,
  discount_amount: 100.0,
  round_off: -0.75,
  final_amount: 1023.0,
  payment_method: 'UPI',
  status: 'COMPLETED',
  loyalty_applied: false,
  loyalty_progress_before: 0,
  loyalty_progress_after: 1250,
  loyalty_weight_after_grams: 1250,
  loyalty_reward_unlocked_after: false,
  loyalty_message: 'Keep going!',
  created_at: '2026-10-21T10:00:00.000Z',
  updated_at: '2026-10-21T10:00:00.000Z',
  items: [
    {
      id: 'it_1',
      purchase_id: 'pur_test_101',
      description: 'Ladies Readymade Garment',
      weight_grams: 1250,
      quantity: '1.25 KG',
      unit_price: 899,
      amount: 1123.75,
    },
  ],
};

describe('WhatsApp Message Formatting & Link Builders', () => {
  test('formatWhatsAppInvoiceText matches Section 4 cash memo format', () => {
    const text = formatWhatsAppInvoiceText(mockPurchase, mockSettings, 'https://terry7women.vercel.app');

    // Section 4 required elements
    assert.ok(text.includes('👗 *TERRY WOMEN — VANIYAMBALAM*'), 'Must have brand header');
    assert.ok(text.includes('━━━━━━━━━━━━━━━━━━'), 'Must have separators');
    assert.ok(text.includes('🧾 *CASH MEMO*'), 'Must have cash memo header');
    assert.ok(text.includes('👤 Customer: Priya Sharma'), 'Must show customer name');
    assert.ok(text.includes('🧾 Invoice: INV-VNB-2026-000101'), 'Must include invoice number');
    assert.ok(text.includes('🌐 Bill Link: https://terry7women.vercel.app/invoice/pur_test_101'), 'Must include bill URL');
    assert.ok(text.includes('🛍️ *ITEM DETAILS*'), 'Must have item details header');
    assert.ok(text.includes('Ladies Readymade Garment — 1.25 KG'), 'Must have product and weight');
    assert.ok(text.includes('Amount: ₹1,123.75'), 'Must have line total');
    assert.ok(text.includes('💰 *BILL SUMMARY*'), 'Must have bill summary');
    assert.ok(text.includes('Subtotal: ₹1,123.75'), 'Must include subtotal');
    assert.ok(text.includes('Discount: ₹100.00'), 'Must include discount');
    assert.ok(text.includes('Round Off: -₹0.75'), 'Must include round off');
    assert.ok(text.includes('*TOTAL PAID: ₹1,023.00*'), 'Must include bold TOTAL PAID');
    assert.ok(text.includes('Payment: UPI'), 'Must include payment method');
    assert.ok(text.includes('🎁 *YOUR LOYALTY REWARDS*'), 'Must include rewards header');
    assert.ok(text.includes('❤️ Thank you for shopping with *TERRY WOMEN!*'), 'Must include brand thank you');
    assert.ok(text.includes('📍 Vaniyambalam'), 'Must include town');
    assert.ok(text.includes('📞 +91 8330889632'), 'Must include contact phone');
  });

  test('formatWhatsAppInvoiceText correctly reflects loyalty rewards when redeemed', () => {
    const redeemedPurchase: Purchase = {
      ...mockPurchase,
      loyalty_applied: true,
      discount_amount: 449.5,
      loyalty_weight_after_grams: 700,
    };
    const text = formatWhatsAppInvoiceText(redeemedPurchase, mockSettings);
    assert.ok(text.includes('🎉 *500g FREE REWARD REDEEMED!*'));
    assert.ok(text.includes('Applied: 500g FREE Dress Material (-₹449.50)'));
    assert.ok(text.includes('0.70 KG / 5.00 KG'));
  });

  test('buildWhatsAppClickToChatUrl creates proper wa.me link with encoded text', () => {
    const url = buildWhatsAppClickToChatUrl('919876543210', 'Hello Priya! Your bill is ₹1023');
    assert.ok(url.startsWith('https://wa.me/919876543210?text='));
    assert.ok(url.includes(encodeURIComponent('Hello Priya! Your bill is ₹1023')));
  });

  test('buildWhatsAppWebUrl creates web.whatsapp.com link', () => {
    const url = buildWhatsAppWebUrl('919876543210', 'Test message');
    assert.ok(url.startsWith('https://web.whatsapp.com/send?phone=919876543210&text=Test%20message'));
  });

  test('buildWhatsAppMobileAppUrl creates api.whatsapp.com link', () => {
    const url = buildWhatsAppMobileAppUrl('919876543210', 'Test message');
    assert.ok(url.startsWith('https://api.whatsapp.com/send?phone=919876543210&text=Test%20message'));
  });
});
