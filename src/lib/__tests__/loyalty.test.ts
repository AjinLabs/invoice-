import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOYALTY_TARGET_GRAMS,
  QUALIFYING_PURCHASE_MIN_GRAMS,
  REWARD_FREE_GRAMS,
  renderUnicodeProgressBar,
  evaluateLoyaltyState,
  formatWhatsAppLoyaltySection,
} from '../loyalty.ts';
import { calculateBilling } from '../billing.ts';
import { formatWhatsAppInvoiceText, buildWhatsAppClickToChatUrl } from '../whatsapp.ts';
import type { Customer, Purchase, ShopSettings } from '../types.ts';

const testSettings: ShopSettings = {
  id: 'sett_1',
  shop_name: 'TERRY WOMEN - Vaniyambalam',
  address: 'Near Town Hall, Vaniyambalam',
  phone: '+91 8330889632',
  whatsapp_number: '+91 8330889632',
  gstin: '32AAAAA0000A1Z5',
  rate_per_kg: 899,
  loyalty_discount: 449.5,
  min_weight_grams: 1000,
  target_loyalty_grams: 5000,
  required_visits: 5,
  round_off_mode: 'NONE',
  whatsapp_mode: 'DEMO',
  whatsapp_api_version: 'v20.0',
  whatsapp_verify_token: 'tok_1',
  updated_at: '2026-10-21T10:00:00.000Z',
};

describe('Weight-Based Customer Loyalty Program & Acceptance Criteria', () => {
  // Test 1: New customer with 0 KG eligible purchases (State E)
  test('New customer with 0 KG eligible purchases displays empty progress bar and 0.00 KG / 5.00 KG', () => {
    const bar = renderUnicodeProgressBar(0, 5000);
    assert.strictEqual(bar, '0 KG  ▱▱▱▱▱▱▱▱▱▱  5 KG', 'Bar should have 0 filled and 10 unfilled segments');

    const evalResult = evaluateLoyaltyState({
      customer: null,
      currentPurchaseWeightGrams: 0,
      ratePerKg: 899,
    });

    assert.strictEqual(evalResult.state, 'NO_PURCHASES');
    assert.strictEqual(evalResult.completedKg, '0.00');
    assert.strictEqual(evalResult.remainingKg, '5.00');
    assert.strictEqual(evalResult.isUnlocked, false);
    assert.strictEqual(evalResult.discountAmount, 0);

    const mockPur: Purchase = {
      id: 'pur_zero',
      invoice_number: 'INV-VNB-2026-000001',
      branch: 'vnb',
      customer_id: 'cust_new',
      customer_name: 'New Shopper',
      customer_phone: '9876543210',
      customer_address: '',
      weight_grams: 0,
      weight_kg: 0,
      rate_per_kg: 899,
      subtotal: 500,
      discount_amount: 0,
      final_amount: 500,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 0,
      loyalty_progress_after: 0,
      loyalty_weight_after_grams: 0,
      loyalty_reward_unlocked_after: false,
      loyalty_message: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    const section = formatWhatsAppLoyaltySection(mockPur, testSettings);
    assert.ok(section.includes('0.00 KG / 5.00 KG'), 'Shows 0.00 KG / 5.00 KG');
    assert.ok(section.includes('0 KG  ▱▱▱▱▱▱▱▱▱▱  5 KG'), 'Shows 10 empty segments');
    assert.ok(section.includes('Completed: 0.00 KG'));
    assert.ok(section.includes('Remaining: 5.00 KG to go'));
  });

  // Test 2: Customer with 1.63 KG eligible purchases (State A)
  test('Customer with 1.63 KG eligible purchases renders exactly 3 filled segments and 3.37 KG remaining', () => {
    // 1630g / 5000g = 0.326 -> 3.26 -> Math.round(3.26) = 3
    const bar = renderUnicodeProgressBar(1630, 5000);
    assert.strictEqual(bar, '0 KG  ▰▰▰▱▱▱▱▱▱▱  5 KG', 'Should have exactly 3 filled and 7 unfilled segments');

    const evalResult = evaluateLoyaltyState({
      customer: {
        id: 'cust_1',
        phone: '9876543210',
        name: 'Fatima',
        address: '',
        branch: 'vnb',
        total_purchases: 0,
        total_weight_grams: 0,
        loyalty_weight_grams: 0,
        total_amount_spent: 0,
        loyalty_count: 0,
        loyalty_reward_unlocked: false,
        last_purchase_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentPurchaseWeightGrams: 1630,
      ratePerKg: 899,
    });

    assert.strictEqual(evalResult.state, 'IN_PROGRESS');
    assert.strictEqual(evalResult.completedKg, '1.63');
    assert.strictEqual(evalResult.remainingKg, '3.37');
    assert.strictEqual(evalResult.discountAmount, 0, 'No discount while accumulating weight');
    assert.strictEqual(evalResult.isUnlocked, false);

    const mockPur: Purchase = {
      id: 'pur_163',
      invoice_number: 'INV-VNB-2026-000002',
      branch: 'vnb',
      customer_id: 'cust_1',
      customer_name: 'Fatima',
      customer_phone: '9876543210',
      customer_address: '',
      weight_grams: 1630,
      weight_kg: 1.63,
      rate_per_kg: 899,
      subtotal: 1465.37,
      discount_amount: 0,
      final_amount: 1465.37,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 0,
      loyalty_progress_after: 1630,
      loyalty_weight_after_grams: 1630,
      loyalty_reward_unlocked_after: false,
      loyalty_message: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    const section = formatWhatsAppLoyaltySection(mockPur, testSettings);
    assert.ok(section.includes('1.63 KG / 5.00 KG'));
    assert.ok(section.includes('0 KG  ▰▰▰▱▱▱▱▱▱▱  5 KG'));
    assert.ok(section.includes('Completed: 1.63 KG'));
    assert.ok(section.includes('Remaining: 3.37 KG to go'));
  });

  // Test 3: Customer reaching exactly 5 KG (State B)
  test('Customer reaching 5 KG completes milestone, fills bar 10/10, but receives NO discount on this bill', () => {
    const customer: Customer = {
      id: 'cust_2',
      phone: '9876543211',
      name: 'Aisha',
      address: '',
      branch: 'vnb',
      total_purchases: 2,
      total_weight_grams: 3500,
      loyalty_weight_grams: 3500,
      total_amount_spent: 3146.5,
      loyalty_count: 2,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Purchase 1500g brings cumulative to exactly 5000g
    const billing = calculateBilling({
      weight: 1500,
      unit: 'g',
      ratePerKg: 899,
      customer,
      shopSettings: testSettings,
    });

    assert.strictEqual(billing.weightGrams, 1500);
    assert.strictEqual(billing.isRewardUnlocked, false, 'Was not unlocked before this bill');
    assert.strictEqual(billing.canApplyReward, false, 'Completing 5 KG alone does NOT grant discount on this bill');
    assert.strictEqual(billing.discountAmount, 0, 'Must have zero loyalty discount on the milestone completion bill');
    assert.strictEqual(billing.nextRewardUnlocked, true, 'Reward must now be unlocked for subsequent purchase');
    assert.strictEqual(billing.nextLoyaltyWeightGrams, 5000);

    const mockPur: Purchase = {
      id: 'pur_5k',
      invoice_number: 'INV-VNB-2026-000003',
      branch: 'vnb',
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: '',
      weight_grams: 1500,
      weight_kg: 1.5,
      rate_per_kg: 899,
      subtotal: 1348.5,
      discount_amount: 0,
      final_amount: 1348.5,
      payment_method: 'UPI',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 3500,
      loyalty_progress_after: 5000,
      loyalty_weight_after_grams: 5000,
      loyalty_reward_unlocked_after: true,
      loyalty_message: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    const section = formatWhatsAppLoyaltySection(mockPur, testSettings);
    assert.ok(section.includes('5.00 KG / 5.00 KG'));
    assert.ok(section.includes('0 KG  ▰▰▰▰▰▰▰▰▰▰  5 KG'));
    assert.ok(section.includes('Completed: 5.00 KG (Target Reached!)'));
    assert.ok(section.includes('5 KG TARGET COMPLETED — 500g FREE UNLOCKED!'));
    assert.ok(section.includes('Valid on your subsequent qualifying purchase containing 1 KG or more'));
  });

  // Test 4: Subsequent purchase with LESS THAN 1 KG (< 1000g) retains unlocked reward (State C)
  test('Subsequent purchase with < 1 KG (e.g. 700g) does NOT apply reward but preserves it for next visit', () => {
    const customerWithUnlockedReward: Customer = {
      id: 'cust_2',
      phone: '9876543211',
      name: 'Aisha',
      address: '',
      branch: 'vnb',
      total_purchases: 3,
      total_weight_grams: 5000,
      loyalty_weight_grams: 5000,
      total_amount_spent: 4495,
      loyalty_count: 3,
      loyalty_reward_unlocked: true, // Milestone achieved on previous purchase
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Customer buys 700g (< 1000g min qualifying threshold)
    const billing = calculateBilling({
      weight: 700,
      unit: 'g',
      ratePerKg: 899,
      customer: customerWithUnlockedReward,
      shopSettings: testSettings,
    });

    assert.strictEqual(billing.canApplyReward, false, 'Cannot apply reward because purchase is < 1 KG');
    assert.strictEqual(billing.discountAmount, 0, 'Zero discount applied');
    assert.strictEqual(billing.nextRewardUnlocked, true, 'Reward remains UNLOCKED and saved for next time');
    assert.strictEqual(billing.nextLoyaltyWeightGrams, 5000, 'Weight retained at 5000g');

    const mockPur: Purchase = {
      id: 'pur_sub_small',
      invoice_number: 'INV-VNB-2026-000004',
      branch: 'vnb',
      customer_id: customerWithUnlockedReward.id,
      customer_name: customerWithUnlockedReward.name,
      customer_phone: customerWithUnlockedReward.phone,
      customer_address: '',
      weight_grams: 700,
      weight_kg: 0.7,
      rate_per_kg: 899,
      subtotal: 629.3,
      discount_amount: 0,
      final_amount: 629.3,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 5000,
      loyalty_progress_after: 5000,
      loyalty_weight_after_grams: 5000,
      loyalty_reward_unlocked_after: true,
      loyalty_message: billing.loyaltyMessage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    const section = formatWhatsAppLoyaltySection(mockPur, testSettings);
    assert.ok(section.includes('Reward Status: Unlocked & Available!'));
    assert.ok(section.includes('500g FREE DRESS MATERIAL WAITING!'));
    assert.ok(section.includes('qualifying purchase of 1 KG or more'));
  });

  // Test 5: Subsequent qualifying purchase with >= 1 KG (e.g. 1.20 KG) redeems 500g free reward (State D)
  test('Subsequent qualifying purchase with >= 1 KG redeems 500g FREE and resets cycle to paid weight', () => {
    const customerWithUnlockedReward: Customer = {
      id: 'cust_2',
      phone: '9876543211',
      name: 'Aisha',
      address: '',
      branch: 'vnb',
      total_purchases: 3,
      total_weight_grams: 5000,
      loyalty_weight_grams: 5000,
      total_amount_spent: 4495,
      loyalty_count: 3,
      loyalty_reward_unlocked: true,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Customer purchases 1200g (1.20 KG)
    const billing = calculateBilling({
      weight: 1200,
      unit: 'g',
      ratePerKg: 899,
      customer: customerWithUnlockedReward,
      shopSettings: testSettings,
    });

    assert.strictEqual(billing.canApplyReward, true, 'Qualifies for reward');
    // 500g FREE value = 0.5 * 899 = 449.50
    assert.strictEqual(billing.discountAmount, 449.5, 'Exact 500g free discount = ₹449.50');
    // Next cycle starts fresh at 0g:
    assert.strictEqual(billing.nextLoyaltyWeightGrams, 0, 'Next cycle starts fresh at 0g');
    assert.strictEqual(billing.nextRewardUnlocked, false, 'Reward lock resets to false');

    // Subtotal: 1200 * 899 / 1000 = 1078.80. Final = 1078.80 - 449.50 = 629.30
    assert.strictEqual(billing.subtotal, 1078.8);
    assert.strictEqual(billing.finalAmount, 629.3);

    const mockPur: Purchase = {
      id: 'pur_redeemed',
      invoice_number: 'INV-VNB-2026-000005',
      branch: 'vnb',
      customer_id: customerWithUnlockedReward.id,
      customer_name: customerWithUnlockedReward.name,
      customer_phone: customerWithUnlockedReward.phone,
      customer_address: '',
      weight_grams: 1200,
      weight_kg: 1.2,
      rate_per_kg: 899,
      subtotal: 1078.8,
      discount_amount: 449.5,
      final_amount: 629.3,
      payment_method: 'UPI',
      status: 'COMPLETED',
      loyalty_applied: true,
      loyalty_progress_before: 5000,
      loyalty_progress_after: 0,
      loyalty_weight_after_grams: 0,
      loyalty_reward_unlocked_after: false,
      loyalty_message: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'it_red',
          purchase_id: 'pur_redeemed',
          description: 'Designer Churidar Material',
          weight_grams: 1200,
          quantity: '1.20 KG',
          unit_price: 899,
          amount: 1078.8,
        },
      ],
    };

    const section = formatWhatsAppLoyaltySection(mockPur, testSettings);
    assert.ok(section.includes('500g FREE REWARD REDEEMED!'));
    assert.ok(section.includes('Applied: 500g FREE Dress Material (-₹449.50)'));
    assert.ok(section.includes('0.00 KG / 5.00 KG'));
    assert.ok(section.includes('Remaining: 5.00 KG to go'));
    assert.ok(section.includes('Your new 5 KG loyalty cycle starts fresh from 0.00 KG'));
  });

  // Test 6: Single redemption & duplicate redemption prevention
  test('Prevents duplicate reward redemption on consecutive qualifying purchases', () => {
    // Aisha now has loyalty_reward_unlocked: false and loyalty_weight_grams: 0
    const customerAfterRedemption: Customer = {
      id: 'cust_2',
      phone: '9876543211',
      name: 'Aisha',
      address: '',
      branch: 'vnb',
      total_purchases: 4,
      total_weight_grams: 6200,
      loyalty_weight_grams: 0,
      total_amount_spent: 5124.3,
      loyalty_count: 4,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Aisha comes back and buys 1500g
    const nextBill = calculateBilling({
      weight: 1500,
      unit: 'g',
      ratePerKg: 899,
      customer: customerAfterRedemption,
      shopSettings: testSettings,
    });

    assert.strictEqual(nextBill.canApplyReward, false, 'Cannot redeem again because reward is not unlocked');
    assert.strictEqual(nextBill.discountAmount, 0, 'No discount on this visit');
    // Accumulating towards next 5 KG: starts fresh from 0 + 1500 = 1500g
    assert.strictEqual(nextBill.nextLoyaltyWeightGrams, 1500, 'Weight progresses in new cycle');
  });

  // Test 7: Multiple products with different weights and custom items
  test('Calculates combined weight from multiple products and custom items correctly without corrupting weight', () => {
    const customer: Customer = {
      id: 'cust_multi',
      phone: '9876543212',
      name: 'Mariyam',
      address: '',
      branch: 'vnb',
      total_purchases: 0,
      total_weight_grams: 0,
      loyalty_weight_grams: 0,
      total_amount_spent: 0,
      loyalty_count: 0,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const multiBill = calculateBilling({
      weight: 2350, // 2.35 KG kilo clothing
      unit: 'g',
      ratePerKg: 899,
      customer,
      shopSettings: testSettings,
      customItems: [
        { name: 'Leggings', quantity: 2, unitPrice: 250, amount: 500 },
        { name: 'Shawl', quantity: 1, unitPrice: 199, amount: 199 },
      ],
    });

    assert.strictEqual(multiBill.weightGrams, 2350, 'Kilo weight is exactly 2350g');
    assert.strictEqual(multiBill.customItemsSubtotal, 699, 'Custom items subtotal is ₹699.00');
    // Kilo subtotal = 2350 * 899 / 1000 = 2112.65
    assert.strictEqual(multiBill.kiloSubtotal, 2112.65);
    // Subtotal = 2112.65 + 699 = 2811.65
    assert.strictEqual(multiBill.subtotal, 2811.65);
    assert.strictEqual(multiBill.nextLoyaltyWeightGrams, 2350, 'Only eligible dress material weight counts for loyalty');
  });

  // Test 8: Progress bar clamping and edge cases
  test('Unicode progress bar correctly clamps edge cases and never displays negative remaining weight', () => {
    // 0g
    assert.strictEqual(renderUnicodeProgressBar(0, 5000), '0 KG  ▱▱▱▱▱▱▱▱▱▱  5 KG');
    // Negative weight clamped to 0
    assert.strictEqual(renderUnicodeProgressBar(-500, 5000), '0 KG  ▱▱▱▱▱▱▱▱▱▱  5 KG');
    // 2500g (50%) -> 5 filled
    assert.strictEqual(renderUnicodeProgressBar(2500, 5000), '0 KG  ▰▰▰▰▰▱▱▱▱▱  5 KG');
    // 5000g (100%) -> 10 filled
    assert.strictEqual(renderUnicodeProgressBar(5000, 5000), '0 KG  ▰▰▰▰▰▰▰▰▰▰  5 KG');
    // Over 5000g clamped to 10
    assert.strictEqual(renderUnicodeProgressBar(7500, 5000), '0 KG  ▰▰▰▰▰▰▰▰▰▰  5 KG');
  });

  // Test 9: Complete WhatsApp Cash Memo structure verification
  test('Complete WhatsApp cash memo strictly matches Section 4 template with Indian currency format', () => {
    const purchase: Purchase = {
      id: 'pur_full_test',
      invoice_number: 'INV-VNB-2026-000888',
      branch: 'vnb',
      customer_id: 'cust_888',
      customer_name: 'Zeenath',
      customer_phone: '9876543210',
      customer_address: 'Vaniyambalam',
      weight_grams: 1630,
      weight_kg: 1.63,
      rate_per_kg: 899,
      subtotal: 1465.37,
      discount_amount: 0,
      round_off: -5.37,
      final_amount: 1460.0,
      payment_method: 'CASH',
      status: 'COMPLETED',
      loyalty_applied: false,
      loyalty_progress_before: 0,
      loyalty_progress_after: 1630,
      loyalty_weight_after_grams: 1630,
      loyalty_reward_unlocked_after: false,
      loyalty_message: '',
      created_at: '2026-10-21T10:00:00.000Z',
      updated_at: '2026-10-21T10:00:00.000Z',
      items: [
        {
          id: 'it_z1',
          purchase_id: 'pur_full_test',
          description: 'Cotton Silk Dress Material',
          weight_grams: 1630,
          quantity: '1.63 KG',
          unit_price: 899,
          amount: 1465.37,
        },
      ],
    };

    const memo = formatWhatsAppInvoiceText(purchase, testSettings);

    // Structural checks for WhatsApp message
    assert.ok(memo.startsWith('👗 *TERRY 7 WOMEN*\n📍 Vaniyambalam\n\nHello Zeenath! 👋'));
    assert.ok(!memo.includes('Bill No'), 'Must NOT contain Bill No');
    assert.ok(!memo.includes('BILL SUMMARY'), 'Must NOT contain BILL SUMMARY');
    assert.ok(!memo.includes('Invoice'), 'Must NOT contain Invoice');
    assert.ok(!memo.includes('INV-'), 'Must NOT contain INV-');
    assert.ok(memo.includes('Item: Cotton Silk Dress Material'));
    assert.ok(memo.includes('Quantity: 1.63 KG'));
    assert.ok(memo.includes('Amount: ₹1,465.37'));
    assert.ok(memo.includes('Discount: ₹5.37'));
    assert.ok(!memo.includes('Round Off'));
    assert.ok(memo.includes('💰 *Total Paid: ₹1,460.00*'));
    assert.ok(memo.includes('💵 Payment: Cash'));
    assert.ok(memo.includes('🎁 *TERRY REWARDS*'));
    assert.ok(memo.includes('Buy 5 KG in total and get *500 g FREE* on your next 1 KG purchase!'));
    assert.ok(memo.includes('📊 Progress: *1.63 KG / 5 KG*'));
    assert.ok(memo.includes('Thank you for shopping with us ❤️\n📞 +91 8330889632'));

    // Zero-URL Guarantee
    assert.ok(!memo.includes('Bill Link'), 'Must NOT contain any Bill Link');
    assert.ok(!memo.includes('http://'), 'Must NOT contain http://');
    assert.ok(!memo.includes('https://'), 'Must NOT contain https://');
    assert.ok(!memo.includes('invoice/'), 'Must NOT contain invoice path');

    // Test URL encoding
    const clickUrl = buildWhatsAppClickToChatUrl('919876543210', memo);
    assert.ok(clickUrl.startsWith('https://wa.me/919876543210?text='));
    assert.ok(clickUrl.includes(encodeURIComponent('👗 *TERRY 7 WOMEN*')));
  });
});
