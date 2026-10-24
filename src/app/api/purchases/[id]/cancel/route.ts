import { NextResponse } from 'next/server';
import { withTransaction, generateId, savePurchaseDeltaToPostgres } from '@/lib/db';
import { LoyaltyTransaction } from '@/lib/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await withTransaction((db) => {
      const purchase = db.purchases.find((p) => p.id === id);
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (purchase.status === 'CANCELLED') {
        throw new Error('Purchase is already cancelled');
      }

      const now = new Date().toISOString();
      const customer = db.customers.find((c) => c.id === purchase.customer_id);

      // 1. Mark transaction as Cancelled (never delete audit record)
      purchase.status = 'CANCELLED';
      purchase.updated_at = now;

      if (customer) {
        // 2. Reverse customer financials
        customer.total_purchases = Math.max(0, customer.total_purchases - 1);
        customer.total_weight_grams = Math.max(0, customer.total_weight_grams - purchase.weight_grams);
        customer.total_amount_spent = Math.max(
          0,
          Math.round((customer.total_amount_spent - purchase.final_amount) * 100) / 100
        );

        const countBefore = customer.loyalty_weight_grams ?? customer.loyalty_count ?? 0;
        let countAfter = countBefore;

        // 3. Reverse loyalty status
        if (purchase.loyalty_applied) {
          // If customer redeemed their reward on this purchase, restore the unlocked 5 KG milestone to them!
          customer.loyalty_count = db.shop_settings.required_visits || 5;
          customer.loyalty_reward_unlocked = true;
          customer.loyalty_weight_grams = 5000;
          countAfter = 5000;
        } else {
          // If this purchase contributed to their progress, roll back the weight
          const prevGrams = customer.loyalty_weight_grams ?? 0;
          customer.loyalty_weight_grams = Math.max(0, prevGrams - purchase.weight_grams);
          countAfter = customer.loyalty_weight_grams;
          if (customer.loyalty_weight_grams < 5000) {
            customer.loyalty_reward_unlocked = false;
          }
          customer.loyalty_count = Math.max(0, (customer.loyalty_count || 1) - 1);
        }
        customer.updated_at = now;

        // 4. Log Reversal in loyalty_transactions table
        const reversalTx: LoyaltyTransaction = {
          id: generateId('ltx'),
          customer_id: customer.id,
          purchase_id: purchase.id,
          type: 'REVERSED',
          count_before: countBefore,
          count_after: countAfter,
          notes: `Purchase ${purchase.invoice_number} cancelled. Loyalty weight reversed from ${countBefore}g to ${countAfter}g.`,
          created_at: now,
        };
        db.loyalty_transactions.push(reversalTx);
      }

      return { purchase, customer };
    });

    if (result.purchase && result.customer && savePurchaseDeltaToPostgres) {
      try {
        await savePurchaseDeltaToPostgres(result.purchase, result.customer);
      } catch (pgErr) {
        console.warn('Postgres cancel delta save warning:', pgErr);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error cancelling purchase';
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
}
