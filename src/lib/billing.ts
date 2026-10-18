import { Customer, ShopSettings, RoundOffMode } from './types';

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

  let isRewardUnlocked = false;
  let canApplyReward = false;
  let rewardReason: string | undefined;
  let discountAmount = 0;
  let nextLoyaltyCount = 1;
  let nextRewardUnlocked = false;
  let loyaltyMessage = '';

  const customer = input.customer;
  const currentLoyaltyWeightGrams = customer
    ? (customer.loyalty_weight_grams ?? ((customer.total_weight_grams || 0) % targetLoyaltyGrams))
    : 0;
  let nextLoyaltyWeightGrams = 0;

  if (!customer) {
    // New customer first purchase
    if (weightGrams >= targetLoyaltyGrams) {
      nextRewardUnlocked = true;
      nextLoyaltyWeightGrams = targetLoyaltyGrams;
      loyaltyMessage = `🔥 Congratulations! You have reached 5 KG (5,000g) clothing! Your 50% OFF on 1 KG Loyalty Reward is now UNLOCKED!`;
    } else {
      nextRewardUnlocked = false;
      nextLoyaltyWeightGrams = weightGrams;
      const remaining = Math.max(0, targetLoyaltyGrams - weightGrams);
      loyaltyMessage = `🎉 Purchase recorded! Total loyalty weight: ${weightGrams}g / 5,000g (${(weightGrams / 1000).toFixed(2)} KG). ${remaining}g (${(remaining / 1000).toFixed(2)} KG) more to unlock 50% OFF on 1 KG reward.`;
    }
    nextLoyaltyCount = 1;
  } else {
    // Check if customer already has reward unlocked (from 5000g previous purchases)
    isRewardUnlocked = customer.loyalty_reward_unlocked || currentLoyaltyWeightGrams >= targetLoyaltyGrams;

    if (isRewardUnlocked) {
      if (weightGrams >= minGrams) {
        canApplyReward = true;
        // Discount is strictly 50% off on 1000g (1 KG).
        discountAmount = rewardAmount;
        // Upon redemption, progress resets to 0 and loyalty cycle repeats!
        nextLoyaltyWeightGrams = 0;
        nextLoyaltyCount = 0;
        nextRewardUnlocked = false;
        loyaltyMessage = `🎁 50% OFF on 1 KG Loyalty Reward Applied (-₹${rewardAmount.toFixed(2)})! Thank you for shopping with us!`;
      } else {
        canApplyReward = false;
        rewardReason = `Minimum 1 KG (1000g) purchase required to redeem 50% off reward.`;
        // Customer keeps the unlocked reward for their next 1kg+ purchase
        nextLoyaltyWeightGrams = currentLoyaltyWeightGrams;
        nextLoyaltyCount = customer.loyalty_count || 5;
        nextRewardUnlocked = true;
        loyaltyMessage = `Minimum 1 KG (1000g) purchase required to use your 50% OFF on 1 KG reward. Your reward remains unlocked!`;
      }
    } else {
      // Cumulative weight progress towards 5,000 grams
      const newWeight = currentLoyaltyWeightGrams + weightGrams;
      if (newWeight >= targetLoyaltyGrams) {
        nextLoyaltyWeightGrams = targetLoyaltyGrams;
        nextRewardUnlocked = true;
        loyaltyMessage = `🔥 Congratulations! You have reached 5,000g (5 KG) cumulative clothing! Your 50% OFF on 1 KG Loyalty Reward is now UNLOCKED! Use it on your next purchase of 1 KG or more.`;
      } else {
        nextLoyaltyWeightGrams = newWeight;
        nextRewardUnlocked = false;
        const remaining = Math.max(0, targetLoyaltyGrams - newWeight);
        loyaltyMessage = `🎉 Purchase recorded! Total loyalty weight: ${newWeight}g / 5,000g (${(newWeight / 1000).toFixed(2)} KG). ${remaining}g (${(remaining / 1000).toFixed(2)} KG) more to unlock 50% OFF on 1 KG reward.`;
      }
      nextLoyaltyCount = (customer.loyalty_count || 0) + 1;
    }
  }

  const baseAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const roundOffMode: RoundOffMode =
    input.roundOffMode ?? input.shopSettings?.round_off_mode ?? 'FLOOR_10';

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
    // Round down to tens (Discount): E.g. 779 -> 770 (-9.00), 899 -> 890 (-9.00)
    const rounded = Math.floor(baseAmount / 10) * 10;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NONE') {
    // Exact: no rounding
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
