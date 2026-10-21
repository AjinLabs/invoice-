import type { Customer, Purchase, ShopSettings } from './types.ts';

export const LOYALTY_TARGET_GRAMS = 5000; // 5 KG
export const QUALIFYING_PURCHASE_MIN_GRAMS = 1000; // 1 KG
export const REWARD_FREE_GRAMS = 500; // 500g FREE

export type LoyaltyState =
  | 'NO_PURCHASES'        // State E: 0.00 KG / 5.00 KG, empty progress bar
  | 'IN_PROGRESS'         // State A: 0 < weight < 5000g, unlocked = false
  | 'TARGET_REACHED'      // State B: weight == 5000g, milestone completed on this bill
  | 'REWARD_AVAILABLE'    // State C: reward is unlocked, but current purchase < 1000g (waiting for 1 KG)
  | 'REWARD_REDEEMED';    // State D: reward redeemed on qualifying 1 KG+ purchase

export interface LoyaltyStatusInfo {
  state: LoyaltyState;
  completedGrams: number;
  completedKg: string;
  targetGrams: number;
  targetKg: string;
  remainingGrams: number;
  remainingKg: string;
  isUnlocked: boolean;
  isRedeemed: boolean;
  discountGrams: number;
  discountAmount: number;
  nextCycleGrams: number;
  nextCycleKg: string;
  progressBar: string;
  headline: string;
  explanation: string;
}

/**
 * Generates a compact Unicode progress bar with 10 segments:
 * Example: 0 KG  ▰▰▰▱▱▱▱▱▱▱  5 KG
 */
export function renderUnicodeProgressBar(
  currentWeightGrams: number,
  targetGrams: number = LOYALTY_TARGET_GRAMS,
  segments: number = 10
): string {
  const safeCurrent = Math.max(0, Math.min(targetGrams, currentWeightGrams));
  const ratio = safeCurrent / targetGrams;
  // Filled segments calculation rounded to nearest segment (e.g. 1630g / 5000g = 0.326 -> 3 filled)
  const filledCount = Math.min(segments, Math.max(0, Math.round(ratio * segments)));
  const unfilledCount = segments - filledCount;

  const bar = '▰'.repeat(filledCount) + '▱'.repeat(unfilledCount);
  return `0 KG  ${bar}  5 KG`;
}

/**
 * Evaluates the loyalty state and calculates progress according to business rules:
 * - 5 KG milestone unlocks reward for subsequent qualifying purchases.
 * - Qualifying purchase must contain >= 1 KG (1000g) of eligible dress material.
 * - Reward is 500g FREE from qualifying dress material (value = 0.5 * ratePerKg).
 * - Completing 5 KG alone does not grant the reward on the same bill.
 * - Non-qualifying purchases (< 1000g) preserve the unlocked reward.
 * - When redeemed, customer starts next cycle with paid weight (weight - 500g).
 */
export function evaluateLoyaltyState(params: {
  customer?: Customer | null;
  currentPurchaseWeightGrams: number;
  ratePerKg: number;
  targetGrams?: number;
  isAlreadyRedeemedOnPurchase?: boolean;
}): LoyaltyStatusInfo {
  const targetGrams = params.targetGrams ?? LOYALTY_TARGET_GRAMS;
  const currentPurchaseWeight = Math.max(0, params.currentPurchaseWeightGrams);
  const ratePerKg = params.ratePerKg || 899;

  // 500g FREE value calculation: (500 / 1000) * ratePerKg = 0.5 * ratePerKg
  const rewardValue = Math.round((ratePerKg * 0.5) * 100) / 100;

  const customer = params.customer;
  const wasRewardUnlocked = customer?.loyalty_reward_unlocked === true;
  const previousCycleGrams = customer
    ? Math.max(0, customer.loyalty_weight_grams ?? ((customer.total_weight_grams || 0) % targetGrams))
    : 0;

  // Case 1: If evaluating an existing purchase that already redeemed the reward
  if (params.isAlreadyRedeemedOnPurchase) {
    const paidWeight = Math.max(0, currentPurchaseWeight - REWARD_FREE_GRAMS);
    const nextGrams = Math.min(targetGrams - 1, paidWeight);
    return {
      state: 'REWARD_REDEEMED',
      completedGrams: nextGrams,
      completedKg: (nextGrams / 1000).toFixed(2),
      targetGrams,
      targetKg: (targetGrams / 1000).toFixed(2),
      remainingGrams: Math.max(0, targetGrams - nextGrams),
      remainingKg: (Math.max(0, targetGrams - nextGrams) / 1000).toFixed(2),
      isUnlocked: false,
      isRedeemed: true,
      discountGrams: REWARD_FREE_GRAMS,
      discountAmount: rewardValue,
      nextCycleGrams: nextGrams,
      nextCycleKg: (nextGrams / 1000).toFixed(2),
      progressBar: renderUnicodeProgressBar(nextGrams, targetGrams),
      headline: '🎁 500g FREE Reward Redeemed!',
      explanation: `Applied: 500g FREE Dress Material (-₹${rewardValue.toFixed(2)}).\nYour new 5 KG loyalty cycle has started!`,
    };
  }

  // Case 2: Customer already has reward unlocked from prior milestone
  if (wasRewardUnlocked) {
    if (currentPurchaseWeight >= QUALIFYING_PURCHASE_MIN_GRAMS) {
      // QUALIFYING PURCHASE: REDEEM REWARD!
      const paidWeight = Math.max(0, currentPurchaseWeight - REWARD_FREE_GRAMS);
      const nextGrams = Math.min(targetGrams - 1, paidWeight);

      return {
        state: 'REWARD_REDEEMED',
        completedGrams: nextGrams,
        completedKg: (nextGrams / 1000).toFixed(2),
        targetGrams,
        targetKg: (targetGrams / 1000).toFixed(2),
        remainingGrams: Math.max(0, targetGrams - nextGrams),
        remainingKg: (Math.max(0, targetGrams - nextGrams) / 1000).toFixed(2),
        isUnlocked: false,
        isRedeemed: true,
        discountGrams: REWARD_FREE_GRAMS,
        discountAmount: rewardValue,
        nextCycleGrams: nextGrams,
        nextCycleKg: (nextGrams / 1000).toFixed(2),
        progressBar: renderUnicodeProgressBar(nextGrams, targetGrams),
        headline: '🎁 500g FREE Reward Redeemed!',
        explanation: `Applied: 500g FREE Dress Material (-₹${rewardValue.toFixed(2)}).\nYour new 5 KG loyalty cycle has started!`,
      };
    } else {
      // NON-QUALIFYING PURCHASE (< 1 KG): REWARD IS RETAINED!
      return {
        state: 'REWARD_AVAILABLE',
        completedGrams: targetGrams,
        completedKg: (targetGrams / 1000).toFixed(2),
        targetGrams,
        targetKg: (targetGrams / 1000).toFixed(2),
        remainingGrams: 0,
        remainingKg: '0.00',
        isUnlocked: true,
        isRedeemed: false,
        discountGrams: 0,
        discountAmount: 0,
        nextCycleGrams: targetGrams,
        nextCycleKg: (targetGrams / 1000).toFixed(2),
        progressBar: renderUnicodeProgressBar(targetGrams, targetGrams),
        headline: '⭐ 500g FREE Reward is Available!',
        explanation:
          'Your 500g FREE reward is unlocked and waiting!\n' +
          '📌 Terms: Requires a qualifying purchase of at least 1 KG of eligible dress material. Your reward remains saved for your next 1 KG+ purchase.',
      };
    }
  }

  // Case 3: Customer accumulating weight towards 5 KG milestone
  const newCumulativeGrams = previousCycleGrams + currentPurchaseWeight;

  if (newCumulativeGrams >= targetGrams) {
    // TARGET REACHED! Milestone completed on this purchase.
    // Completing 5 KG alone does NOT grant the reward on the same bill.
    return {
      state: 'TARGET_REACHED',
      completedGrams: targetGrams,
      completedKg: (targetGrams / 1000).toFixed(2),
      targetGrams,
      targetKg: (targetGrams / 1000).toFixed(2),
      remainingGrams: 0,
      remainingKg: '0.00',
      isUnlocked: true,
      isRedeemed: false,
      discountGrams: 0,
      discountAmount: 0,
      nextCycleGrams: targetGrams,
      nextCycleKg: (targetGrams / 1000).toFixed(2),
      progressBar: renderUnicodeProgressBar(targetGrams, targetGrams),
      headline: '🎉 5 KG Target Reached!',
      explanation:
        '🔥 Congratulations! You have completed your 5 KG milestone!\n' +
        'Your reward of 500g FREE Dress Material is now UNLOCKED.\n' +
        '📌 Terms: Redeemable on your subsequent qualifying purchase containing 1 KG or more of eligible dress material.',
    };
  }

  // Case 4: No purchases or zero weight
  if (newCumulativeGrams === 0) {
    return {
      state: 'NO_PURCHASES',
      completedGrams: 0,
      completedKg: '0.00',
      targetGrams,
      targetKg: (targetGrams / 1000).toFixed(2),
      remainingGrams: targetGrams,
      remainingKg: (targetGrams / 1000).toFixed(2),
      isUnlocked: false,
      isRedeemed: false,
      discountGrams: 0,
      discountAmount: 0,
      nextCycleGrams: 0,
      nextCycleKg: '0.00',
      progressBar: renderUnicodeProgressBar(0, targetGrams),
      headline: '⚖️ Weight Loyalty Program',
      explanation:
        'Buy eligible dress material by weight. Complete 5 KG to unlock 500g FREE dress material on your subsequent qualifying 1 KG purchase!',
    };
  }

  // Case 5: Progress in progress
  const remainingGrams = Math.max(0, targetGrams - newCumulativeGrams);
  return {
    state: 'IN_PROGRESS',
    completedGrams: newCumulativeGrams,
    completedKg: (newCumulativeGrams / 1000).toFixed(2),
    targetGrams,
    targetKg: (targetGrams / 1000).toFixed(2),
    remainingGrams,
    remainingKg: (remainingGrams / 1000).toFixed(2),
    isUnlocked: false,
    isRedeemed: false,
    discountGrams: 0,
    discountAmount: 0,
    nextCycleGrams: newCumulativeGrams,
    nextCycleKg: (newCumulativeGrams / 1000).toFixed(2),
    progressBar: renderUnicodeProgressBar(newCumulativeGrams, targetGrams),
    headline: '⚖️ Your Loyalty Progress',
    explanation:
      `Complete 5 KG of eligible dress purchases to unlock 500g FREE on your subsequent qualifying 1 KG purchase.`,
  };
}

/**
 * Formats the loyalty rewards text section for WhatsApp messages according to Section 3, 4 & 5:
 * Includes the dynamic Unicode progress bar and appropriate state messaging for:
 * - State A: Progress in progress
 * - State B: Target reached (5 KG milestone completed on this invoice)
 * - State C: Reward available (unlocked from previous milestone, waiting for 1 KG+ qualifying purchase)
 * - State D: Reward redeemed (500g FREE applied on qualifying 1 KG+ purchase)
 * - State E: No eligible purchases (0.00 KG / 5.00 KG)
 */
export function formatWhatsAppLoyaltySection(
  purchase: Purchase,
  settings?: ShopSettings,
  forcedState?: LoyaltyState
): string {
  const targetGrams = settings?.target_loyalty_grams || LOYALTY_TARGET_GRAMS;
  const currentWeightGrams = typeof purchase.loyalty_weight_after_grams === 'number'
    ? purchase.loyalty_weight_after_grams
    : (purchase.weight_grams || 0);
  const isRedeemed = purchase.loyalty_applied === true;
  const isUnlocked = purchase.loyalty_reward_unlocked_after === true;
  const progressBefore = purchase.loyalty_progress_before ?? 0;

  // Determine loyalty state
  let state: LoyaltyState;
  if (forcedState) {
    state = forcedState;
  } else if (isRedeemed) {
    state = 'REWARD_REDEEMED';
  } else if (isUnlocked) {
    if (progressBefore >= targetGrams || (purchase.loyalty_message && purchase.loyalty_message.includes('Available'))) {
      state = 'REWARD_AVAILABLE';
    } else {
      state = 'TARGET_REACHED';
    }
  } else if (currentWeightGrams === 0) {
    state = 'NO_PURCHASES';
  } else {
    state = 'IN_PROGRESS';
  }

  const completedKg = (currentWeightGrams / 1000).toFixed(2);
  const remainingGrams = Math.max(0, targetGrams - currentWeightGrams);
  const remainingKg = (remainingGrams / 1000).toFixed(2);
  const bar = renderUnicodeProgressBar(currentWeightGrams, targetGrams);

  if (state === 'REWARD_REDEEMED') {
    const discountFormatted = (purchase.discount_amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      `🎁 *YOUR LOYALTY REWARDS*\n\n` +
      `🎉 *500g FREE REWARD REDEEMED!*\n` +
      `Applied: 500g FREE Dress Material (-₹${discountFormatted})\n\n` +
      `⚖️ *YOUR NEXT LOYALTY CYCLE*\n` +
      `${completedKg} KG / 5.00 KG\n\n` +
      `${bar}\n\n` +
      `✅ Completed: ${completedKg} KG\n` +
      `🎯 Remaining: ${remainingKg} KG to go\n\n` +
      `❤️ Thank you for being our loyal customer! Your new 5 KG loyalty cycle has started.`
    );
  }

  if (state === 'REWARD_AVAILABLE') {
    return (
      `🎁 *YOUR LOYALTY REWARDS*\n\n` +
      `⚖️ *YOUR LOYALTY PROGRESS*\n` +
      `5.00 KG / 5.00 KG\n\n` +
      `${renderUnicodeProgressBar(targetGrams, targetGrams)}\n\n` +
      `✅ Completed: 5.00 KG\n` +
      `🎯 Reward Status: Unlocked & Available!\n\n` +
      `⭐ *500g FREE DRESS MATERIAL WAITING!*\n` +
      `Your 500g FREE reward is unlocked and saved.\n` +
      `📌 *Terms:* Redeemable on a qualifying purchase of 1 KG or more of eligible dress material. Your reward remains saved for your next 1 KG+ purchase.`
    );
  }

  if (state === 'TARGET_REACHED') {
    return (
      `🎁 *YOUR LOYALTY REWARDS*\n\n` +
      `⚖️ *YOUR LOYALTY PROGRESS*\n` +
      `5.00 KG / 5.00 KG\n\n` +
      `${renderUnicodeProgressBar(targetGrams, targetGrams)}\n\n` +
      `✅ Completed: 5.00 KG (Target Reached!)\n` +
      `🎯 Remaining: 0.00 KG\n\n` +
      `🎉 *5 KG TARGET COMPLETED — 500g FREE UNLOCKED!*\n` +
      `You have completed your 5 KG milestone!\n` +
      `📌 *Terms:* Valid on your subsequent qualifying purchase containing 1 KG or more of eligible dress material.`
    );
  }

  if (state === 'NO_PURCHASES') {
    return (
      `🎁 *YOUR LOYALTY REWARDS*\n\n` +
      `⚖️ *YOUR LOYALTY PROGRESS*\n` +
      `0.00 KG / 5.00 KG\n\n` +
      `${renderUnicodeProgressBar(0, targetGrams)}\n\n` +
      `✅ Completed: 0.00 KG\n` +
      `🎯 Remaining: 5.00 KG to go\n\n` +
      `✨ Buy eligible dress material by weight. Complete 5 KG to unlock 500g FREE dress material on your subsequent qualifying 1 KG purchase!`
    );
  }

  // IN_PROGRESS (State A)
  return (
    `🎁 *YOUR LOYALTY REWARDS*\n\n` +
    `⚖️ *YOUR LOYALTY PROGRESS*\n` +
    `${completedKg} KG / 5.00 KG\n\n` +
    `${bar}\n\n` +
    `✅ Completed: ${completedKg} KG\n` +
    `🎯 Remaining: ${remainingKg} KG to go\n\n` +
    `✨ Complete 5 KG of eligible dress purchases to unlock 500g FREE dress material on your subsequent qualifying 1 KG purchase!`
  );
}
