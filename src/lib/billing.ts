import type { Customer, ShopSettings, RoundOffMode } from './types.ts';
import { evaluateLoyaltyState } from './loyalty.ts';

export interface CustomItemInput {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface BillingCalculationInput {
  weight: number;
  unit: 'g' | 'kg';
  ratePerKg?: number;
  customer?: Customer | null;
  shopSettings?: ShopSettings;
  roundOffMode?: RoundOffMode;
  manualAmount?: number | string;
  customRoundOff?: number;
  customItems?: CustomItemInput[];
}

export interface BillingCalculationResult {
  weightGrams: number;
  weightKg: number;
  ratePerKg: number;
  kiloSubtotal: number;
  customItemsSubtotal: number;
  subtotal: number;
  isRewardUnlocked: boolean;
  canApplyReward: boolean;
  rewardReason?: string;
  discountAmount: number;
  baseAmount: number;
  roundOffAmount: number;
  roundOffMode: RoundOffMode;
  manualAmount?: number;
  finalAmount: number;
  loyaltyMessage: string;
  nextLoyaltyCount: number;
  nextLoyaltyWeightGrams: number;
  targetLoyaltyGrams: number;
  currentLoyaltyWeightGrams: number;
  nextRewardUnlocked: boolean;
  customItems?: CustomItemInput[];
}

/**
 * Perform exact decimal calculation rounded to 2 decimal places
 */
export function calculateBilling(input: BillingCalculationInput): BillingCalculationResult {
  const ratePerKg = input.ratePerKg ?? input.shopSettings?.rate_per_kg ?? 899;
  const minGrams = input.shopSettings?.min_weight_grams ?? 1000;
  const targetLoyaltyGrams = input.shopSettings?.target_loyalty_grams ?? 5000;

  // 50% discount on 1000g (1 KG)
  const halfPrice1kgDiscount = Math.round((ratePerKg * 0.5) * 100) / 100;
  const rewardAmount = input.shopSettings?.loyalty_discount && input.shopSettings.loyalty_discount !== 299
    ? input.shopSettings.loyalty_discount
    : halfPrice1kgDiscount;

  // Normalize weight to grams and kilograms
  const safeWeight = Math.max(0, Number(input.weight) || 0);
  const weightGrams = input.unit === 'kg' 
    ? Math.round(safeWeight * 1000) 
    : Math.round(safeWeight);

  const weightKg = Number((weightGrams / 1000).toFixed(3));

  // Kilo Subtotal = grams * rate / 1000
  const rawKiloSubtotal = (weightGrams * ratePerKg) / 1000;
  const kiloSubtotal = Math.round(rawKiloSubtotal * 100) / 100;

  // Custom Items Subtotal
  const customItems = (input.customItems || []).map((ci, idx) => {
    const qty = Math.max(1, Number(ci.quantity) || 1);
    const uPrice = Math.max(0, Number(ci.unitPrice) || 0);
    const itemAmount = Math.round(qty * uPrice * 100) / 100;
    return {
      id: ci.id || `item_${idx}_${Date.now()}`,
      name: ci.name.trim() || 'Custom Item',
      quantity: qty,
      unitPrice: uPrice,
      amount: itemAmount,
    };
  });

  const customItemsSubtotal = customItems.reduce((acc, ci) => acc + (ci.amount || 0), 0);
  const subtotal = Math.round((kiloSubtotal + customItemsSubtotal) * 100) / 100;

  const customer = input.customer;
  const currentLoyaltyWeightGrams = customer
    ? Math.max(0, customer.loyalty_weight_grams ?? ((customer.total_weight_grams || 0) % targetLoyaltyGrams))
    : 0;

  const loyaltyEval = evaluateLoyaltyState({
    customer,
    currentPurchaseWeightGrams: weightGrams,
    ratePerKg,
    targetGrams: targetLoyaltyGrams,
  });

  const isRewardUnlocked = customer?.loyalty_reward_unlocked === true || currentLoyaltyWeightGrams >= targetLoyaltyGrams;
  const canApplyReward = loyaltyEval.isRedeemed;
  const rewardReason = loyaltyEval.state === 'REWARD_AVAILABLE'
    ? 'Minimum 1 KG (1000g) purchase of eligible dress material required to redeem 500g FREE reward.'
    : undefined;
  const discountAmount = loyaltyEval.discountAmount;
  const nextLoyaltyWeightGrams = loyaltyEval.nextCycleGrams;
  const nextRewardUnlocked = loyaltyEval.isUnlocked && !loyaltyEval.isRedeemed;
  const loyaltyMessage = loyaltyEval.explanation;
  const nextLoyaltyCount = (customer?.loyalty_count || 0) + 1;

  const baseAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const roundOffMode: RoundOffMode =
    input.roundOffMode ?? input.shopSettings?.round_off_mode ?? 'NONE';

  let roundOffAmount = 0;
  let finalAmount = baseAmount;
  let manualNumeric: number | undefined;

  if (roundOffMode === 'MANUAL') {
    const rawManual = typeof input.manualAmount === 'number'
      ? input.manualAmount
      : parseFloat(String(input.manualAmount ?? ''));
    if (!isNaN(rawManual) && rawManual >= 0) {
      manualNumeric = Math.round(rawManual * 100) / 100;
      finalAmount = manualNumeric;
      roundOffAmount = Math.round((finalAmount - baseAmount) * 100) / 100;
    } else {
      finalAmount = baseAmount;
      roundOffAmount = 0;
    }
  } else if (roundOffMode === 'FLOOR_10') {
    // Round down to previous multiple of 10: E.g. 899 -> 890, 896 -> 890, 891 -> 890, 890 -> 890, 904 -> 900
    const rounded = Math.floor((Math.round(baseAmount * 100) / 100 + 0.00001) / 10) * 10;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, rounded);
  } else if (roundOffMode === 'NONE') {
    // Exact Amount (DEFAULT): no rounding
    roundOffAmount = 0;
    finalAmount = baseAmount;
  } else if (roundOffMode === 'NEAREST_10') {
    // E.g. 779 -> 780 (+1.00), 815 -> 820 (+5.00), 459 -> 460 (+1.00)
    const rounded = Math.round(baseAmount / 10) * 10;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NEAREST_5') {
    const rounded = Math.round(baseAmount / 5) * 5;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NEAREST_1') {
    const rounded = Math.round(baseAmount);
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'CUSTOM' && typeof input.customRoundOff === 'number') {
    roundOffAmount = Math.round(input.customRoundOff * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  }

  return {
    weightGrams,
    weightKg,
    ratePerKg,
    subtotal,
    isRewardUnlocked,
    canApplyReward,
    rewardReason,
    discountAmount,
    baseAmount,
    roundOffAmount,
    roundOffMode,
    manualAmount: manualNumeric,
    finalAmount,
    loyaltyMessage,
    nextLoyaltyCount,
    nextLoyaltyWeightGrams,
    targetLoyaltyGrams,
    currentLoyaltyWeightGrams,
    nextRewardUnlocked,
    kiloSubtotal,
    customItemsSubtotal,
    customItems,
  };
}

/**
 * Generate standard loyalty milestone messages
 */
export function generateLoyaltyMessage(
  count: number,
  required: number,
  unlocked: boolean,
  redeemed: boolean,
  rewardDiscount: number = 449.50
): string {
  if (redeemed) {
    return `🎁 50% OFF on 1 KG Loyalty Reward Applied (-₹${rewardDiscount.toFixed(2)})! Thank you for shopping with us!`;
  }
  if (unlocked || count >= required) {
    return '🔥 Congratulations! You have completed 5 purchases and unlocked your 50% OFF on 1 KG Loyalty Reward! Use it on your next purchase of 1 KG or more.';
  }

  const remaining = required - count;
  return `🎉 Purchase ${count} completed! ${remaining} more purchase${remaining > 1 ? 's' : ''} to unlock 50% OFF on 1 KG Loyalty Reward.`;
}
