import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppPhone } from '../phone.ts';
import { formatWhatsAppInvoiceText, buildWhatsAppClickToChatUrl } from '../whatsapp.ts';
import { calculateBilling } from '../billing.ts';
import type { Customer, Purchase, ShopSettings } from '../types.ts';

const mockShopSettings: ShopSettings = {
  id: 'sett_1',
  shop_name: 'TERRY7 WOMEN - Vaniyambalam',
  address: 'Near Town Hall & Railway Station, Vaniyambalam, Malappuram - 679339',
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

describe('Billing Workflow, Customer Association & Isolation', () => {
  test('Customer A billing with discount and rounding calculates exact final amount', () => {
    const customerA: Customer = {
      id: 'cust_A',
      name: 'Ananya Nair',
      phone: '9847011111',
      address: 'Vaniyambalam',
      branch: 'vnb',
      total_purchases: 5,
      total_weight_grams: 5000,
      total_amount_spent: 4500,
      loyalty_count: 5,
      loyalty_reward_unlocked: true,
      last_purchase_at: null,
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
    };

    // Calculate billing for 1200g with loyalty reward unlocked (50% off on 1000g = 449.50 discount)
    const calc = calculateBilling({
      weight: 1200,
      unit: 'g',
      ratePerKg: 899,
      customer: customerA,
      shopSettings: mockShopSettings,
      roundOffMode: 'NEAREST_10',
    });

    assert.equal(calc.weightGrams, 1200);
    assert.equal(calc.ratePerKg, 899);
    assert.equal(calc.isRewardUnlocked, true);
    assert.equal(calc.canApplyReward, true);
    assert.equal(calc.discountAmount, 449.5);
    // Subtotal: 1.2 * 899 = 1078.80. After discount: 629.30.
    // Rounded to nearest 10: 630.00, round off = +0.70.
    assert.equal(calc.finalAmount, 630);
    assert.equal(calc.roundOffAmount, 0.7);

    const phoneRes = normalizeWhatsAppPhone(customerA.phone);
    assert.equal(phoneRes.isValid, true);
    assert.equal(phoneRes.waDestination, '919847011111');

    const purchaseA: Purchase = {
      id: 'pur_A',
      invoice_number: 'INV-VNB-2026-000101',
      branch: 'vnb',
      customer_id: customerA.id,
      customer_name: customerA.name,
      customer_phone: customerA.phone,
      customer_address: customerA.address,
      weight_grams: calc.weightGrams,
      weight_kg: calc.weightKg,
      rate_per_kg: calc.ratePerKg,
      subtotal: calc.subtotal,
      discount_amount: calc.discountAmount,
      round_off: calc.roundOffAmount,
      final_amount: calc.finalAmount,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: calc.canApplyReward,
      loyalty_progress_before: 5000,
      loyalty_progress_after: 1200,
      loyalty_weight_after_grams: 1200,
      loyalty_reward_unlocked_after: false,
      loyalty_message: calc.loyaltyMessage,
      created_at: '2026-10-21T09:00:00.000Z',
      updated_at: '2026-10-21T09:00:00.000Z',
      items: [],
    };

    const waTextA = formatWhatsAppInvoiceText(purchaseA, mockShopSettings);
    assert.ok(waTextA.includes('👤 Customer: Ananya Nair'));
    assert.ok(waTextA.includes('🧾 Invoice: INV-VNB-2026-000101'));
    assert.ok(waTextA.includes('*TOTAL PAID: ₹630.00*'));
    assert.ok(waTextA.includes('Discount: ₹449.50'));
    assert.ok(waTextA.includes('Round Off: +₹0.70'));

    const waUrlA = buildWhatsAppClickToChatUrl(phoneRes.waDestination, waTextA);
    assert.ok(waUrlA.includes('wa.me/919847011111'));
  });

  test('Consecutive billing of Customer B does not leak Customer A data', () => {
    // Customer B with a different phone number
    const customerB: Customer = {
      id: 'cust_B',
      name: 'Fatima Zahra',
      phone: '+91 97450 22222',
      address: 'Pookkottumpadam',
      branch: 'pkdm',
      total_purchases: 0,
      total_weight_grams: 0,
      total_amount_spent: 0,
      loyalty_count: 0,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: '2026-10-21T09:10:00.000Z',
      updated_at: '2026-10-21T09:10:00.000Z',
    };

    const phoneResB = normalizeWhatsAppPhone(customerB.phone);
    assert.equal(phoneResB.isValid, true);
    assert.equal(phoneResB.waDestination, '919745022222');
    assert.notEqual(phoneResB.waDestination, '919847011111', 'Must not have Customer A phone');

    const calcB = calculateBilling({
      weight: 850,
      unit: 'g',
      ratePerKg: 899,
      customer: customerB,
      shopSettings: mockShopSettings,
      roundOffMode: 'NONE',
    });

    const purchaseB: Purchase = {
      id: 'pur_B',
      invoice_number: 'INV-PKDM-2026-000102',
      branch: 'pkdm',
      customer_id: customerB.id,
      customer_name: customerB.name,
      customer_phone: customerB.phone,
      customer_address: customerB.address,
      weight_grams: calcB.weightGrams,
      weight_kg: calcB.weightKg,
      rate_per_kg: calcB.ratePerKg,
      subtotal: calcB.subtotal,
      discount_amount: calcB.discountAmount,
      round_off: calcB.roundOffAmount,
      final_amount: calcB.finalAmount,
      payment_method: 'UPI',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 0,
      loyalty_progress_after: 850,
      loyalty_weight_after_grams: 850,
      loyalty_reward_unlocked_after: false,
      loyalty_message: calcB.loyaltyMessage,
      created_at: '2026-10-21T09:15:00.000Z',
      updated_at: '2026-10-21T09:15:00.000Z',
      items: [],
    };

    const waTextB = formatWhatsAppInvoiceText(purchaseB, mockShopSettings);
    // Verify Customer B message has NO traces of Customer A
    assert.ok(waTextB.includes('👤 Customer: Fatima Zahra'));
    assert.ok(!waTextB.includes('Ananya Nair'));
    assert.ok(waTextB.includes('🧾 Invoice: INV-PKDM-2026-000102'));
    assert.ok(!waTextB.includes('INV-VNB-2026-000101'));

    const waUrlB = buildWhatsAppClickToChatUrl(phoneResB.waDestination, waTextB);
    assert.ok(waUrlB.includes('wa.me/919745022222'));
    assert.ok(!waUrlB.includes('919847011111'));
  });

  test('Missing or invalid mobile numbers are rejected with clear messages', () => {
    assert.equal(normalizeWhatsAppPhone('').isValid, false);
    assert.equal(normalizeWhatsAppPhone('12345').isValid, false);
    assert.equal(normalizeWhatsAppPhone('abcdefghij').isValid, false);
  });
});
