import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { getDb, readDb, withTransaction, generateId, normalizePhone, INVOICES_DIR, getBranchInfo } from '@/lib/db';
import { normalizeWhatsAppPhone } from '@/lib/phone';
import { calculateBilling } from '@/lib/billing';
import { sendWhatsAppInvoice, formatWhatsAppInvoiceText } from '@/lib/whatsapp';
import { Purchase, PurchaseItem, LoyaltyTransaction, WhatsAppMessage, PaymentMethod, RoundOffMode, BranchId } from '@/lib/types';

declare global {
  var __INVOICE_IMAGE_CACHE__: Map<string, Buffer> | undefined;
}

function saveInvoiceImage(purchaseId: string, imageDataUrl: string) {
  try {
    if (!imageDataUrl || !imageDataUrl.includes('base64,')) return;
    const base64Content = imageDataUrl.split('base64,')[1];
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Store in global memory cache
    const memoryCache = globalThis.__INVOICE_IMAGE_CACHE__ || new Map<string, Buffer>();
    memoryCache.set(purchaseId, buffer);
    globalThis.__INVOICE_IMAGE_CACHE__ = memoryCache;

    // Store in filesystem if writable
    try {
      if (!fs.existsSync(INVOICES_DIR)) {
        fs.mkdirSync(INVOICES_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(INVOICES_DIR, `${purchaseId}.png`), buffer);
    } catch (fsErr) {
      console.warn('Could not write image to disk, stored in memory cache:', fsErr);
    }
  } catch (err) {
    console.warn('Could not save invoice image:', err);
  }
}

async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('terry_session');
    if (sessionCookie) {
      return JSON.parse(sessionCookie.value);
    }
  } catch {}
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('q')?.toLowerCase();
    const branchParam = searchParams.get('branch');

    const sessionUser = await getSessionUser();
    const effectiveBranch = branchParam || sessionUser?.branch;

    const db = await getDb();
    let purchases = [...db.purchases];

    // Branch isolation: If logged in as branch admin or branch specified, only return that branch's invoices
    if (effectiveBranch && effectiveBranch !== 'all') {
      purchases = purchases.filter((p) => (p.branch || 'vnb') === effectiveBranch);
    }

    if (status) {
      purchases = purchases.filter((p) => p.status === status);
    }

    if (search) {
      purchases = purchases.filter(
        (p) =>
          p.invoice_number.toLowerCase().includes(search) ||
          p.customer_name.toLowerCase().includes(search) ||
          p.customer_phone.includes(search)
      );
    }

    if (sessionUser?.role === 'DEMO_VIEWER') {
      purchases = purchases.map((p) => ({
        ...p,
        customer_phone: p.customer_phone ? `${p.customer_phone.slice(0, 5)}•••••` : '',
      }));
    }

    // Sort descending by date
    purchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      purchases: purchases.slice(0, limit),
      total: purchases.length,
      branch: effectiveBranch || 'all',
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error fetching purchases';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPhone = body.phone?.trim();
    const customerName = body.name?.trim();
    const customerAddress = body.address?.trim() || '';
    const rawWeight = parseFloat(body.weight);
    const weight = isNaN(rawWeight) || rawWeight < 0 ? 0 : rawWeight;
    const unit = (body.unit === 'kg' ? 'kg' : 'g') as 'g' | 'kg';
    const paymentMethod = (body.payment_method || 'CASH') as PaymentMethod;
    const itemDesc = body.description?.trim() || 'Ladies Readymade Garment / Dress Material';
    const customItemsInput = Array.isArray(body.custom_items) ? body.custom_items : [];

    // Determine branch: from session cookie, request header, or body
    const sessionUser = await getSessionUser();
    const branch: BranchId = (sessionUser?.branch || body.branch || request.headers.get('x-branch') || 'vnb') as BranchId;

    // Validation
    if (!rawPhone || !customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number and name are required' },
        { status: 400 }
      );
    }

    const phoneRes = normalizeWhatsAppPhone(rawPhone);
    if (!phoneRes.isValid) {
      return NextResponse.json(
        { success: false, error: phoneRes.error || 'Please enter a valid mobile number' },
        { status: 400 }
      );
    }
    const phone = phoneRes.normalizedPhone;

    // Must have either weight > 0 or at least one custom item
    if (weight <= 0 && customItemsInput.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter clothing weight or add at least one item' },
        { status: 400 }
      );
    }

    if (weight > 100000 && unit === 'g') {
      return NextResponse.json(
        { success: false, error: 'Weight exceeds maximum allowable limit' },
        { status: 400 }
      );
    }

    const roundOffMode = body.round_off_mode as RoundOffMode | undefined;
    const manualAmount = typeof body.manual_amount === 'number'
      ? body.manual_amount
      : body.manual_amount ? parseFloat(body.manual_amount) : undefined;
    const customRoundOff = typeof body.custom_round_off === 'number' ? body.custom_round_off : undefined;
    const invoiceImage = typeof body.invoice_image === 'string' ? body.invoice_image : '';

    // Safe simulation for Demo Mode
    if (sessionUser?.role === 'DEMO_VIEWER') {
      const db = readDb();
      const branchInfo = getBranchInfo(db, branch);
      const calc = calculateBilling({
        weight,
        unit,
        ratePerKg: branchInfo.rate_per_kg || db.shop_settings.rate_per_kg,
        customer: {
          id: 'cust_demo',
          phone,
          name: customerName,
          address: customerAddress,
          branch,
          total_purchases: 1,
          total_weight_grams: 1000,
          total_amount_spent: 899,
          loyalty_count: 1,
          loyalty_reward_unlocked: false,
          last_purchase_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        shopSettings: db.shop_settings,
        roundOffMode,
        manualAmount,
        customRoundOff,
        customItems: customItemsInput,
      });

      const demoPurchase: Purchase = {
        id: 'pur_demo_' + Date.now(),
        invoice_number: `INV-${branchInfo.prefix}-${new Date().getFullYear()}-DEMO88`,
        customer_id: 'cust_demo',
        customer_name: customerName,
        customer_phone: `${phone.slice(0, 5)}•••••`,
        customer_address: customerAddress || 'Sample Address',
        weight_grams: calc.weightGrams,
        weight_kg: calc.weightKg,
        rate_per_kg: calc.ratePerKg,
        subtotal: calc.subtotal,
        discount_amount: calc.discountAmount,
        final_amount: calc.finalAmount,
        payment_method: paymentMethod,
        status: 'COMPLETED',
        loyalty_applied: calc.isRewardUnlocked,
        loyalty_progress_before: 0,
        loyalty_progress_after: 1,
        loyalty_message: calc.loyaltyMessage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
        branch,
      };

      return NextResponse.json({
        success: true,
        purchase: demoPurchase,
        isDemo: true,
        whatsapp: {
          success: true,
          status: 'DEMO_SIMULATED',
          message: 'Demo Preview: Transaction calculated in demo sandbox. Real WhatsApp API is locked for the store owner.',
        },
      });
    }

    // Atomic transaction execution
    const { createdPurchase, updatedCustomer, branchSettings, formattedText } = await withTransaction(async (db) => {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const branchInfo = getBranchInfo(db, branch);

      // Find or create customer
      let customer = db.customers.find((c) => c.phone === phone);
      if (!customer) {
        customer = {
          id: generateId('cust'),
          phone,
          name: customerName,
          address: customerAddress,
          branch,
          total_purchases: 0,
          total_weight_grams: 0,
          total_amount_spent: 0,
          loyalty_count: 0,
          loyalty_reward_unlocked: false,
          last_purchase_at: null,
          created_at: now,
          updated_at: now,
        };
        db.customers.push(customer);
      } else {
        // Update name and address if provided
        customer.name = customerName;
        if (customerAddress) customer.address = customerAddress;
        if (!customer.branch) customer.branch = branch;
      }

      // Calculate exact billing and loyalty status
      const calc = calculateBilling({
        weight,
        unit,
        ratePerKg: branchInfo.rate_per_kg || db.shop_settings.rate_per_kg,
        customer,
        shopSettings: db.shop_settings,
        roundOffMode,
        manualAmount,
        customRoundOff,
        customItems: customItemsInput,
      });

      // Generate sequential invoice number: INV-[PREFIX]-YYYY-000001
      const seq = db.meta.invoice_sequence++;
      const invoiceNumber = `INV-${branchInfo.prefix}-${currentYear}-${String(seq).padStart(6, '0')}`;

      // Build purchase items list
      const purchaseItems: PurchaseItem[] = [];
      const purchaseId = generateId('pur');

      // Kilo clothing item if weight > 0
      if (calc.weightGrams > 0) {
        const qtyLabel = calc.weightKg >= 1 ? `${calc.weightKg} KG` : `${calc.weightGrams}g`;
        purchaseItems.push({
          id: generateId('item'),
          purchase_id: purchaseId,
          description: itemDesc,
          item_type: 'KILO',
          weight_grams: calc.weightGrams,
          rate_per_kg: calc.ratePerKg,
          quantity: qtyLabel,
          unit_price: calc.ratePerKg,
          amount: calc.kiloSubtotal,
        });
      }

      // Custom items (inners, garments, accessories, etc.)
      if (calc.customItems && calc.customItems.length > 0) {
        for (const ci of calc.customItems) {
          purchaseItems.push({
            id: generateId('item'),
            purchase_id: purchaseId,
            description: ci.name,
            item_type: 'CUSTOM',
            quantity: ci.quantity,
            unit_price: ci.unitPrice,
            amount: ci.amount || ci.quantity * ci.unitPrice,
          });
        }
      }

      // Create Purchase Record
      const purchase: Purchase = {
        id: purchaseId,
        invoice_number: invoiceNumber,
        branch,
        branch_name: branchInfo.name,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        weight_grams: calc.weightGrams,
        weight_kg: calc.weightKg,
        rate_per_kg: calc.ratePerKg,
        subtotal: calc.subtotal,
        discount_amount: calc.discountAmount,
        round_off: calc.roundOffAmount,
        final_amount: calc.finalAmount,
        payment_method: paymentMethod,
        status: 'COMPLETED',
        loyalty_applied: calc.canApplyReward,
        loyalty_progress_before: calc.currentLoyaltyWeightGrams,
        loyalty_progress_after: calc.nextLoyaltyWeightGrams,
        loyalty_weight_after_grams: calc.nextLoyaltyWeightGrams,
        loyalty_reward_unlocked_after: calc.nextRewardUnlocked,
        loyalty_message: calc.loyaltyMessage,
        created_at: now,
        updated_at: now,
        items: purchaseItems,
      };

      if (invoiceImage) {
        saveInvoiceImage(purchase.id, invoiceImage);
        purchase.invoice_image_url = `/api/invoices/${purchase.id}/image`;
      }

      // Update Customer Stats
      customer.total_purchases += 1;
      customer.total_weight_grams += calc.weightGrams;
      customer.loyalty_weight_grams = calc.nextLoyaltyWeightGrams;
      customer.total_amount_spent = Math.round((customer.total_amount_spent + calc.finalAmount) * 100) / 100;
      customer.loyalty_count = calc.nextLoyaltyCount;
      customer.loyalty_reward_unlocked = calc.nextRewardUnlocked;
      customer.last_purchase_at = now;
      customer.updated_at = now;

      // Record Loyalty Transaction Audit Log
      const loyaltyTx: LoyaltyTransaction = {
        id: generateId('ltx'),
        customer_id: customer.id,
        purchase_id: purchase.id,
        type: calc.canApplyReward ? 'REDEEMED' : 'EARNED',
        count_before: purchase.loyalty_progress_before,
        count_after: purchase.loyalty_progress_after,
        notes: calc.canApplyReward
          ? `[${branchInfo.town}] Redeemed 50% OFF on 1 KG (₹${calc.discountAmount}) reward on ${calc.weightGrams}g purchase`
          : `[${branchInfo.town}] Purchase ${customer.total_purchases} (+${calc.weightGrams}g). Cumulative loyalty weight: ${calc.nextLoyaltyWeightGrams}g / ${calc.targetLoyaltyGrams}g`,
        created_at: now,
      };

      // Prepare branch-specific settings and WhatsApp text
      const branchSettings = {
        ...db.shop_settings,
        shop_name: branchInfo.name,
        address: branchInfo.address,
        phone: branchInfo.phone,
      };

      const formattedText = formatWhatsAppInvoiceText(purchase, branchSettings);

      const waMsg: WhatsAppMessage = {
        id: generateId('msg'),
        purchase_id: purchase.id,
        customer_id: customer.id,
        phone: purchase.customer_phone,
        message_type: 'INVOICE',
        content: formattedText,
        status: 'PENDING',
        is_demo: false,
        created_at: now,
        updated_at: now,
      };

      db.purchases.push(purchase);
      db.loyalty_transactions.push(loyaltyTx);
      db.whatsapp_messages.push(waMsg);

      return {
        createdPurchase: purchase,
        updatedCustomer: { ...customer },
        branchSettings,
        formattedText,
      };
    });

    const waResult = {
      success: true,
      status: 'PENDING',
      formattedText,
      recipientPhone: createdPurchase.customer_phone,
      senderPhone: branchSettings.phone || '+91 8330889632',
    };

    // If Meta Business Cloud API credentials are configured, dispatch in background without blocking
    const token = process.env.WHATSAPP_ACCESS_TOKEN || branchSettings.whatsapp_access_token;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || branchSettings.whatsapp_phone_number_id;
    if (token && phoneNumberId) {
      sendWhatsAppInvoice(createdPurchase, branchSettings, { imageDataUrl: invoiceImage }).catch((err) => {
        console.warn('Background WhatsApp send failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      purchase: createdPurchase,
      customer: updatedCustomer,
      whatsapp: waResult,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Error creating purchase';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
