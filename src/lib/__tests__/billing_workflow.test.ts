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

describe('Priority 3 — Amount Section with Three Modes & Boundary Tests', () => {
  // A. Exact Amount (DEFAULT)
  test('Exact Amount is the default selection and preserves exact calculated amount (e.g. ₹899 -> ₹899)', () => {
    // 1000g at ₹899/KG = ₹899
    const calcDefault = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      shopSettings: mockShopSettings,
      // no roundOffMode provided -> must default to 'NONE'
    });

    assert.equal(calcDefault.roundOffMode, 'NONE');
    assert.equal(calcDefault.subtotal, 899);
    assert.equal(calcDefault.finalAmount, 899);
    assert.equal(calcDefault.roundOffAmount, 0);

    // Explicit mode 'NONE'
    const calcExplicit = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'NONE',
    });
    assert.equal(calcExplicit.finalAmount, 899);
    assert.equal(calcExplicit.roundOffAmount, 0);
  });

  // B. Round Down to ₹10: Examples from prompt
  test('Round Down to ₹10 satisfies all user prompt examples (₹899->₹890, ₹896->₹890, ₹891->₹890, ₹890->₹890, ₹904->₹900)', () => {
    // Formula: floor(calculatedAmount / 10) * 10
    const cases = [
      { calculated: 899, expected: 890, expectedRoundOff: -9 },
      { calculated: 896, expected: 890, expectedRoundOff: -6 },
      { calculated: 891, expected: 890, expectedRoundOff: -1 },
      { calculated: 890, expected: 890, expectedRoundOff: 0 },
      { calculated: 904, expected: 900, expectedRoundOff: -4 },
    ];

    for (const c of cases) {
      // Create weight that produces exact calculated amount at rate = 1000
      const calc = calculateBilling({
        weight: c.calculated,
        unit: 'g',
        ratePerKg: 1000, // 1g = ₹1, so weight = amount
        roundOffMode: 'FLOOR_10',
      });

      assert.equal(
        calc.finalAmount,
        c.expected,
        `Amount ₹${c.calculated} in FLOOR_10 mode must equal ₹${c.expected}`
      );
      assert.equal(
        calc.roundOffAmount,
        c.expectedRoundOff,
        `Amount ₹${c.calculated} roundOffAmount must be ₹${c.expectedRoundOff}`
      );
      // Verify finalAmount = baseAmount + roundOffAmount
      assert.equal(Math.round((calc.baseAmount + calc.roundOffAmount) * 100) / 100, calc.finalAmount);
    }
  });

  // Boundary Values for Round Down to ₹10
  test('Round Down to ₹10 handles boundary values correctly', () => {
    const boundaryCases = [
      { amount: 0, expected: 0 },
      { amount: 0.5, expected: 0 },
      { amount: 9, expected: 0 },
      { amount: 9.99, expected: 0 },
      { amount: 10, expected: 10 },
      { amount: 10.01, expected: 10 },
      { amount: 19.99, expected: 10 },
      { amount: 20, expected: 20 },
      { amount: 999.99, expected: 990 },
      { amount: 1000, expected: 1000 },
      { amount: 1009.95, expected: 1000 },
    ];

    for (const b of boundaryCases) {
      const calc = calculateBilling({
        weight: 0,
        unit: 'g',
        customItems: [{ name: 'Test', quantity: 1, unitPrice: b.amount }],
        roundOffMode: 'FLOOR_10',
      });
      assert.equal(
        calc.finalAmount,
        b.expected,
        `Boundary ₹${b.amount} in FLOOR_10 must be ₹${b.expected}`
      );
    }
  });

  // C. Custom Amount
  test('Custom Amount allows manual entry and saves exact amount (e.g. ₹899 -> ₹850)', () => {
    const calc = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'MANUAL',
      manualAmount: 850,
    });

    assert.equal(calc.subtotal, 899);
    assert.equal(calc.baseAmount, 899);
    assert.equal(calc.finalAmount, 850);
    assert.equal(calc.roundOffAmount, -49);
    assert.equal(calc.manualAmount, 850);
  });

  test('Custom Amount gracefully handles non-negative monetary values and invalid inputs', () => {
    // String numeric input
    const calcString = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'MANUAL',
      manualAmount: '750.50',
    });
    assert.equal(calcString.finalAmount, 750.5);

    // Empty or undefined manual input falls back safely to base amount
    const calcEmpty = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'MANUAL',
      manualAmount: '',
    });
    assert.equal(calcEmpty.finalAmount, 899);
  });

  // Consistency across Purchase, Invoice & WhatsApp text
  test('Final amount is used consistently in invoice data and WhatsApp caption', () => {
    const calc = calculateBilling({
      weight: 1000,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'FLOOR_10', // 899 -> 890
    });

    const purchase: Purchase = {
      id: 'pur_consist',
      invoice_number: 'INV-VNB-2026-000105',
      branch: 'vnb',
      customer_id: 'cust_c',
      customer_name: 'Zainab',
      customer_phone: '9847123456',
      customer_address: 'Vaniyambalam',
      weight_grams: calc.weightGrams,
      weight_kg: calc.weightKg,
      rate_per_kg: calc.ratePerKg,
      subtotal: calc.subtotal,
      discount_amount: calc.discountAmount,
      round_off: calc.roundOffAmount,
      final_amount: calc.finalAmount,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 0,
      loyalty_progress_after: 1000,
      loyalty_weight_after_grams: 1000,
      loyalty_reward_unlocked_after: false,
      loyalty_message: '',
      created_at: '2026-10-21T10:00:00.000Z',
      updated_at: '2026-10-21T10:00:00.000Z',
      items: [],
    };

    assert.equal(purchase.final_amount, 890);
    assert.equal(purchase.round_off, -9);

    const waText = formatWhatsAppInvoiceText(purchase, mockShopSettings);
    assert.ok(waText.includes('*TOTAL PAID: ₹890.00*'));
    assert.ok(waText.includes('Round Off: -₹9.00'));
    assert.ok(!waText.includes('http'), 'Caption must contain zero URLs');
  });

  test('Switching amount mode does not alter entered dress weight', () => {
    const initialWeight = 1450;
    const calcExact = calculateBilling({
      weight: initialWeight,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'NONE',
    });
    const calcFloor = calculateBilling({
      weight: initialWeight,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'FLOOR_10',
    });
    const calcManual = calculateBilling({
      weight: initialWeight,
      unit: 'g',
      ratePerKg: 899,
      roundOffMode: 'MANUAL',
      manualAmount: 1200,
    });

    assert.equal(calcExact.weightGrams, initialWeight);
    assert.equal(calcFloor.weightGrams, initialWeight);
    assert.equal(calcManual.weightGrams, initialWeight);
  });
});
