import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWhatsAppInvoiceText,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppWebUrl,
  buildWhatsAppMobileAppUrl,
  sendWhatsAppInvoice,
  resolveInvoiceImageBuffer,
} from '../whatsapp.ts';
import type { Purchase, ShopSettings } from '../types.ts';

const mockSettings: ShopSettings = {
  id: 'sett_1',
  shop_name: 'TERRY WOMEN - Vaniyambalam',
  address: 'Near Town Hall & Railway Station, Vaniyambalam',
  phone: '+91 8330889632',
  whatsapp_number: '+91 8330889632',
  gstin: '32AAAAA0000A1Z5',
  rate_per_kg: 899,
  loyalty_discount: 449.5,
  min_weight_grams: 1000,
  required_visits: 5,
  round_off_mode: 'NONE',
  whatsapp_mode: 'PRODUCTION',
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

describe('WhatsApp Message Formatting — Strict Zero URL Guarantee & Zero Invoice Number', () => {
  test('formatWhatsAppInvoiceText contains NO invoice URL, NO website URL, and NO invoice number', () => {
    const text = formatWhatsAppInvoiceText(mockPurchase, mockSettings);

    // Required elements matching user template
    assert.ok(text.includes('👗 TERRY 7 WOMEN — VANIYAMBALAM'), 'Must have brand header');
    assert.ok(text.includes('━━━━━━━━━━━━━━━━━━'), 'Must have separators');
    assert.ok(text.includes('Hello PRIYA SHARMA 👋'), 'Must show customer greeting');
    assert.ok(text.includes('Thank you for shopping with us! ❤️'), 'Must show thank you greeting');
    assert.ok(text.includes('🛍️ PURCHASE DETAILS'), 'Must have purchase details header');
    assert.ok(text.includes('• Item: Ladies Readymade Garment'), 'Must have product');
    assert.ok(text.includes('• Quantity: 1.25 KG'), 'Must have weight');
    assert.ok(text.includes('• Amount: ₹1,123.75'), 'Must have amount');
    assert.ok(text.includes('• Discount: ₹100.00'), 'Must include discount');
    assert.ok(text.includes('• Round Off: -₹0.75'), 'Must include round off');
    assert.ok(text.includes('💰 TOTAL PAID: ₹1,023.00'), 'Must include TOTAL PAID');
    assert.ok(text.includes('💵 Payment: UPI'), 'Must include payment method');
    assert.ok(text.includes('🎁 SPECIAL CUSTOMER OFFER'), 'Must include special customer offer');
    assert.ok(text.includes('Complete 5 KG in dress purchases and get 500g FREE on your next 1 KG purchase!'));
    assert.ok(text.includes('📊 Your Progress: 1.25 KG / 5 KG'), 'Must show progress');
    assert.ok(text.includes('❤️ Thanks for choosing TERRY 7 WOMEN!'), 'Must include brand thank you');
    assert.ok(text.includes('📍 Vaniyambalam'), 'Must include town');
    assert.ok(text.includes('📞 +91 8330889632'), 'Must include contact phone');

    // Strict Negative Checks — Zero Invoice Number & Zero URLs
    assert.ok(!text.includes('Invoice:'), 'Must NOT contain "Invoice:"');
    assert.ok(!text.includes('INV-'), 'Must NOT contain "INV-" code');
    assert.ok(!text.includes('CASH MEMO'), 'Must NOT contain "CASH MEMO"');
    assert.ok(!text.includes('Bill Link'), 'Must NOT contain any "Bill Link"');
    assert.ok(!text.includes('http://'), 'Must NOT contain "http://"');
    assert.ok(!text.includes('https://'), 'Must NOT contain "https://"');
    assert.ok(!text.includes('invoice/'), 'Must NOT contain any invoice webpage path');
    assert.ok(!text.includes('terry7women.vercel.app'), 'Must NOT contain any domain name');
  });

  test('formatWhatsAppInvoiceText correctly reflects loyalty rewards without links when redeemed', () => {
    const redeemedPurchase: Purchase = {
      ...mockPurchase,
      loyalty_applied: true,
      discount_amount: 449.5,
      loyalty_weight_after_grams: 0,
    };
    const text = formatWhatsAppInvoiceText(redeemedPurchase, mockSettings);
    assert.ok(text.includes('🎉 500g FREE Reward Redeemed on 1 KG!'));
    assert.ok(text.includes('0.00 KG / 5 KG'));
    assert.ok(!text.includes('http'), 'Redeemed message must also contain ZERO URLs');
    assert.ok(!text.includes('INV-'), 'Redeemed message must contain NO invoice number');
  });

  test('buildWhatsAppClickToChatUrl creates proper wa.me link with encoded text and zero URLs in text', () => {
    const cleanText = formatWhatsAppInvoiceText(mockPurchase, mockSettings);
    const url = buildWhatsAppClickToChatUrl('919876543210', cleanText);
    assert.ok(url.startsWith('https://wa.me/919876543210?text='));
    assert.ok(url.includes(encodeURIComponent('👗 TERRY 7 WOMEN — VANIYAMBALAM')));
    assert.ok(!decodeURIComponent(url).includes('Bill Link'));
    assert.ok(!decodeURIComponent(url).includes('Invoice:'));
  });

  test('buildWhatsAppWebUrl creates web.whatsapp.com link with customer phone', () => {
    const url = buildWhatsAppWebUrl('919876543210', 'Test memo');
    assert.ok(url.startsWith('https://web.whatsapp.com/send?phone=919876543210&text=Test%20memo'));
  });

  test('buildWhatsAppMobileAppUrl creates api.whatsapp.com link with customer phone', () => {
    const url = buildWhatsAppMobileAppUrl('919876543210', 'Test memo');
    assert.ok(url.startsWith('https://api.whatsapp.com/send?phone=919876543210&text=Test%20memo'));
  });
});

describe('Meta WhatsApp Business Cloud API Integration & Image Delivery', () => {
  test('sendWhatsAppInvoice reports CREDENTIALS_MISSING when unconfigured and does NOT simulate success', async () => {
    // Empty credentials settings
    const unconfiguredSettings: ShopSettings = {
      ...mockSettings,
      whatsapp_access_token: '',
      whatsapp_phone_number_id: '',
    };

    // Ensure env does not provide credentials during this test
    const origToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const origPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;

    try {
      const result = await sendWhatsAppInvoice(mockPurchase, unconfiguredSettings);

      assert.strictEqual(result.success, false, 'Must report failure when credentials missing');
      assert.strictEqual(result.status, 'FAILED');
      assert.strictEqual(result.errorCode, 'CREDENTIALS_MISSING');
      assert.ok(
        result.errorMessage?.includes('WHATSAPP_ACCESS_TOKEN and/or WHATSAPP_PHONE_NUMBER_ID are missing'),
        'Must explain exactly what configuration is missing'
      );
      assert.strictEqual(result.recipientPhone, '919876543210', 'Recipient must be customer number');
      assert.strictEqual(result.senderPhone, '+91 8330889632', 'Sender must be store number');
    } finally {
      if (origToken) process.env.WHATSAPP_ACCESS_TOKEN = origToken;
      if (origPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = origPhoneId;
    }
  });

  test('sendWhatsAppInvoice strictly separates Sender and Recipient fields', async () => {
    const customCustomerPurchase: Purchase = {
      ...mockPurchase,
      customer_phone: '+91 94471 23456',
    };

    const res = await sendWhatsAppInvoice(customCustomerPurchase, mockSettings);
    // Recipient must be the entered customer number normalized
    assert.strictEqual(res.recipientPhone, '919447123456');
    // Sender must be the business sender number (+91 8330889632)
    assert.strictEqual(res.senderPhone, '+91 8330889632');
    assert.notStrictEqual(res.recipientPhone, res.senderPhone, 'Sender and recipient must be separate');
  });

  test('resolveInvoiceImageBuffer retrieves image buffer from base64 data URL', async () => {
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = await resolveInvoiceImageBuffer('pur_sample', { imageDataUrl: sampleBase64 });
    assert.ok(buffer !== null, 'Buffer must be resolved');
    assert.ok(Buffer.isBuffer(buffer), 'Result must be a Buffer');
    assert.strictEqual(buffer!.length > 0, true, 'Buffer must not be empty');
  });
});
