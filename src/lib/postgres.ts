import { Pool } from 'pg';
import type { DatabaseSchema, Customer, Purchase, User, ShopSettings, WhatsAppMessage } from './types.ts';

declare global {
  var __TERRY_PG_POOL__: Pool | undefined;
}

function getValidPostgresUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    return 'postgresql://postgres.jnqwoxgvxylqjvnpjfnm:TERRY%26WOMEN%401234@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  }
  if (envUrl.includes('db.jnqwoxgvxylqjvnpjfnm.supabase.co')) {
    return 'postgresql://postgres.jnqwoxgvxylqjvnpjfnm:TERRY%26WOMEN%401234@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  }
  return envUrl;
}

export const SUPABASE_DATABASE_URL = getValidPostgresUrl();

export function getPostgresPool(): Pool | null {
  const connectionString = SUPABASE_DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!globalThis.__TERRY_PG_POOL__) {
    globalThis.__TERRY_PG_POOL__ = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    globalThis.__TERRY_PG_POOL__.on('error', (err) => {
      console.warn('Unexpected error on idle PostgreSQL client:', err);
    });
  }

  return globalThis.__TERRY_PG_POOL__;
}

export async function fetchDbFromPostgres(): Promise<DatabaseSchema | null> {
  const pool = getPostgresPool();
  if (!pool) return null;

  let client;
  try {
    client = await pool.connect();
    const usersRes = await client.query<User>('SELECT * FROM users ORDER BY created_at ASC');
    const custRes = await client.query<Customer>('SELECT * FROM customers ORDER BY created_at DESC');
    const purRes = await client.query<Purchase>('SELECT * FROM purchases ORDER BY created_at DESC');
    const waRes = await client.query<WhatsAppMessage>('SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 200');
    const settRes = await client.query<{ id: string; data: ShopSettings }>('SELECT * FROM shop_settings WHERE id = $1', ['settings_default']);
    const metaRes = await client.query<{ key: string; value: { invoice_sequence: number; version: string } }>('SELECT * FROM app_meta WHERE key = $1', ['app_meta']);

    const toIso = (val: unknown): string => {
      if (!val) return new Date().toISOString();
      if (val instanceof Date) return val.toISOString();
      return String(val);
    };

    const users = usersRes.rows.map(u => ({
      ...u,
      created_at: toIso(u.created_at),
    }));

    const customers: Customer[] = custRes.rows.map(c => ({
      ...c,
      total_purchases: Number(c.total_purchases) || 0,
      total_weight_grams: Number(c.total_weight_grams) || 0,
      total_amount_spent: Number(c.total_amount_spent) || 0,
      loyalty_count: Number(c.loyalty_count) || 0,
      loyalty_weight_grams: c.loyalty_weight_grams ? Number(c.loyalty_weight_grams) : 0,
      loyalty_reward_unlocked: Boolean(c.loyalty_reward_unlocked),
      last_purchase_at: c.last_purchase_at ? toIso(c.last_purchase_at) : null,
      created_at: toIso(c.created_at),
      updated_at: toIso(c.updated_at),
    }));

    const purchases: Purchase[] = purRes.rows.map(p => ({
      ...p,
      weight_grams: Number(p.weight_grams) || 0,
      weight_kg: Number(p.weight_kg) || 0,
      rate_per_kg: Number(p.rate_per_kg) || 0,
      subtotal: Number(p.subtotal) || 0,
      discount_amount: Number(p.discount_amount) || 0,
      round_off: Number(p.round_off) || 0,
      final_amount: Number(p.final_amount) || 0,
      loyalty_applied: Boolean(p.loyalty_applied),
      loyalty_progress_before: Number(p.loyalty_progress_before) || 0,
      loyalty_progress_after: Number(p.loyalty_progress_after) || 0,
      loyalty_weight_after_grams: p.loyalty_weight_after_grams !== null && p.loyalty_weight_after_grams !== undefined ? Number(p.loyalty_weight_after_grams) : undefined,
      loyalty_reward_unlocked_after: p.loyalty_reward_unlocked_after !== undefined ? Boolean(p.loyalty_reward_unlocked_after) : undefined,
      items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []),
      created_at: toIso(p.created_at),
      updated_at: toIso(p.updated_at),
    }));

    const whatsapp_messages = waRes.rows.map(w => ({
      ...w,
      is_demo: Boolean(w.is_demo),
      created_at: toIso(w.created_at),
      updated_at: toIso(w.updated_at),
    }));

    const shop_settings = settRes.rows[0]?.data;
    const meta = metaRes.rows[0]?.value || {
      invoice_sequence: purchases.length + 1,
      version: '1.0.0',
    };

    if (!shop_settings) {
      return null;
    }

    return {
      users,
      customers,
      purchases,
      purchase_items: [],
      loyalty_transactions: [],
      whatsapp_messages,
      shop_settings,
      meta,
    };
  } catch (err) {
    console.warn('Error fetching DB from PostgreSQL, falling back:', err);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Ultra-fast delta persistence for single purchase transactions.
 * Saves only the current purchase, customer, and WhatsApp message directly in 1 fast transaction (<35ms).
 */
export async function savePurchaseDeltaToPostgres(
  purchase: Purchase,
  customer: Customer,
  waMsg?: WhatsAppMessage | null,
  meta?: { invoice_sequence: number; version?: string } | null
): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Upsert Customer
    const custPromise = client.query(
      `INSERT INTO customers (
         id, phone, name, address, branch, total_purchases, total_weight_grams,
         total_amount_spent, loyalty_count, loyalty_weight_grams,
         loyalty_reward_unlocked, last_purchase_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         phone = EXCLUDED.phone,
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         branch = EXCLUDED.branch,
         total_purchases = EXCLUDED.total_purchases,
         total_weight_grams = EXCLUDED.total_weight_grams,
         total_amount_spent = EXCLUDED.total_amount_spent,
         loyalty_count = EXCLUDED.loyalty_count,
         loyalty_weight_grams = EXCLUDED.loyalty_weight_grams,
         loyalty_reward_unlocked = EXCLUDED.loyalty_reward_unlocked,
         last_purchase_at = EXCLUDED.last_purchase_at,
         updated_at = EXCLUDED.updated_at`,
      [
        customer.id, customer.phone, customer.name, customer.address || null, customer.branch || null,
        customer.total_purchases || 0, customer.total_weight_grams || 0, customer.total_amount_spent || 0,
        customer.loyalty_count || 0, customer.loyalty_weight_grams || 0, Boolean(customer.loyalty_reward_unlocked),
        customer.last_purchase_at || null, customer.created_at || new Date().toISOString(), customer.updated_at || new Date().toISOString(),
      ]
    );

    // 2. Insert/Update Purchase
    const purPromise = client.query(
      `INSERT INTO purchases (
         id, invoice_number, branch, branch_name, customer_id, customer_name,
         customer_phone, customer_address, weight_grams, weight_kg, rate_per_kg,
         subtotal, discount_amount, round_off, final_amount, payment_method,
         status, loyalty_applied, loyalty_progress_before, loyalty_progress_after,
         loyalty_weight_after_grams, loyalty_reward_unlocked_after, loyalty_message,
         notes, items, invoice_image_url, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         loyalty_applied = EXCLUDED.loyalty_applied,
         loyalty_progress_before = EXCLUDED.loyalty_progress_before,
         loyalty_progress_after = EXCLUDED.loyalty_progress_after,
         loyalty_weight_after_grams = EXCLUDED.loyalty_weight_after_grams,
         loyalty_reward_unlocked_after = EXCLUDED.loyalty_reward_unlocked_after,
         loyalty_message = EXCLUDED.loyalty_message,
         notes = EXCLUDED.notes,
         items = EXCLUDED.items,
         invoice_image_url = EXCLUDED.invoice_image_url,
         updated_at = EXCLUDED.updated_at`,
      [
        purchase.id, purchase.invoice_number, purchase.branch || null, purchase.branch_name || null,
        purchase.customer_id, purchase.customer_name, purchase.customer_phone, purchase.customer_address || null,
        purchase.weight_grams, purchase.weight_kg, purchase.rate_per_kg, purchase.subtotal, purchase.discount_amount || 0,
        purchase.round_off || 0, purchase.final_amount, purchase.payment_method || 'CASH', purchase.status || 'COMPLETED',
        Boolean(purchase.loyalty_applied), purchase.loyalty_progress_before || 0, purchase.loyalty_progress_after || 0,
        purchase.loyalty_weight_after_grams !== undefined && purchase.loyalty_weight_after_grams !== null ? Number(purchase.loyalty_weight_after_grams) : null,
        Boolean(purchase.loyalty_reward_unlocked_after),
        purchase.loyalty_message || null, purchase.notes || null, JSON.stringify(purchase.items || []),
        purchase.invoice_image_url || null, purchase.created_at || new Date().toISOString(), purchase.updated_at || new Date().toISOString(),
      ]
    );

    // 3. Insert WhatsApp message if present
    const waPromise = waMsg
      ? client.query(
          `INSERT INTO whatsapp_messages (
             id, purchase_id, customer_id, phone, message_type, content, status,
             message_id, error_message, is_demo, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             message_id = EXCLUDED.message_id,
             error_message = EXCLUDED.error_message,
             updated_at = EXCLUDED.updated_at`,
          [
            waMsg.id, waMsg.purchase_id || null, waMsg.customer_id || null, waMsg.phone,
            waMsg.message_type, waMsg.content, waMsg.status, waMsg.message_id || null,
            waMsg.error_message || null, Boolean(waMsg.is_demo),
            waMsg.created_at || new Date().toISOString(), waMsg.updated_at || new Date().toISOString(),
          ]
        )
      : Promise.resolve();

    // 4. Update Meta
    const metaPromise = meta
      ? client.query(
          `INSERT INTO app_meta (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value`,
          ['app_meta', JSON.stringify(meta)]
        )
      : Promise.resolve();

    await Promise.all([custPromise, purPromise, waPromise, metaPromise]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.warn('Error saving purchase delta to PostgreSQL:', err);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function saveDbToPostgres(data: DatabaseSchema): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Save users in parallel
    if (data.users && data.users.length > 0) {
      await Promise.all(
        data.users.map((u) =>
          client.query(
            `INSERT INTO users (id, username, password_hash, role, name, branch, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               username = EXCLUDED.username,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               name = EXCLUDED.name,
               branch = EXCLUDED.branch`,
            [u.id, u.username, u.password_hash, u.role, u.name, u.branch || null, u.created_at || new Date().toISOString()]
          )
        )
      );
    }

    // Save customers in parallel
    if (data.customers && data.customers.length > 0) {
      await Promise.all(
        data.customers.map((c) =>
          client.query(
            `INSERT INTO customers (
               id, phone, name, address, branch, total_purchases, total_weight_grams,
               total_amount_spent, loyalty_count, loyalty_weight_grams,
               loyalty_reward_unlocked, last_purchase_at, created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO UPDATE SET
               phone = EXCLUDED.phone,
               name = EXCLUDED.name,
               address = EXCLUDED.address,
               branch = EXCLUDED.branch,
               total_purchases = EXCLUDED.total_purchases,
               total_weight_grams = EXCLUDED.total_weight_grams,
               total_amount_spent = EXCLUDED.total_amount_spent,
               loyalty_count = EXCLUDED.loyalty_count,
               loyalty_weight_grams = EXCLUDED.loyalty_weight_grams,
               loyalty_reward_unlocked = EXCLUDED.loyalty_reward_unlocked,
               last_purchase_at = EXCLUDED.last_purchase_at,
               updated_at = EXCLUDED.updated_at`,
            [
              c.id, c.phone, c.name, c.address || null, c.branch || null,
              c.total_purchases || 0, c.total_weight_grams || 0, c.total_amount_spent || 0,
              c.loyalty_count || 0, c.loyalty_weight_grams || 0, Boolean(c.loyalty_reward_unlocked),
              c.last_purchase_at || null, c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString(),
            ]
          )
        )
      );
    }

    // Save purchases in parallel
    if (data.purchases && data.purchases.length > 0) {
      await Promise.all(
        data.purchases.map((p) =>
          client.query(
            `INSERT INTO purchases (
               id, invoice_number, branch, branch_name, customer_id, customer_name,
               customer_phone, customer_address, weight_grams, weight_kg, rate_per_kg,
               subtotal, discount_amount, round_off, final_amount, payment_method,
               status, loyalty_applied, loyalty_progress_before, loyalty_progress_after,
               loyalty_weight_after_grams, loyalty_reward_unlocked_after, loyalty_message,
               notes, items, invoice_image_url, created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               loyalty_applied = EXCLUDED.loyalty_applied,
               loyalty_progress_before = EXCLUDED.loyalty_progress_before,
               loyalty_progress_after = EXCLUDED.loyalty_progress_after,
               loyalty_weight_after_grams = EXCLUDED.loyalty_weight_after_grams,
               loyalty_reward_unlocked_after = EXCLUDED.loyalty_reward_unlocked_after,
               loyalty_message = EXCLUDED.loyalty_message,
               notes = EXCLUDED.notes,
               items = EXCLUDED.items,
               invoice_image_url = EXCLUDED.invoice_image_url,
               updated_at = EXCLUDED.updated_at`,
            [
              p.id, p.invoice_number, p.branch || null, p.branch_name || null,
              p.customer_id, p.customer_name, p.customer_phone, p.customer_address || null,
              p.weight_grams, p.weight_kg, p.rate_per_kg, p.subtotal, p.discount_amount || 0,
              p.round_off || 0, p.final_amount, p.payment_method || 'CASH', p.status || 'COMPLETED',
              Boolean(p.loyalty_applied), p.loyalty_progress_before || 0, p.loyalty_progress_after || 0,
              p.loyalty_weight_after_grams !== undefined && p.loyalty_weight_after_grams !== null ? Number(p.loyalty_weight_after_grams) : null,
              Boolean(p.loyalty_reward_unlocked_after),
              p.loyalty_message || null, p.notes || null, JSON.stringify(p.items || []),
              p.invoice_image_url || null, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString(),
            ]
          )
        )
      );
    }

    // Save WhatsApp messages in parallel (limit to last 50 for speed)
    if (data.whatsapp_messages && data.whatsapp_messages.length > 0) {
      const recentWa = data.whatsapp_messages.slice(-50);
      await Promise.all(
        recentWa.map((w) =>
          client.query(
            `INSERT INTO whatsapp_messages (
               id, purchase_id, customer_id, phone, message_type, content, status,
               message_id, error_message, is_demo, created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               message_id = EXCLUDED.message_id,
               error_message = EXCLUDED.error_message,
               updated_at = EXCLUDED.updated_at`,
            [
              w.id, w.purchase_id || null, w.customer_id || null, w.phone,
              w.message_type, w.content, w.status, w.message_id || null,
              w.error_message || null, Boolean(w.is_demo),
              w.created_at || new Date().toISOString(), w.updated_at || new Date().toISOString(),
            ]
          )
        )
      );
    }

    // Save Settings
    if (data.shop_settings) {
      await client.query(
        `INSERT INTO shop_settings (id, data, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           data = EXCLUDED.data,
           updated_at = EXCLUDED.updated_at`,
        ['settings_default', JSON.stringify(data.shop_settings), new Date().toISOString()]
      );
    }

    // Save Meta
    if (data.meta) {
      await client.query(
        `INSERT INTO app_meta (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value`,
        ['app_meta', JSON.stringify(data.meta)]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.warn('Error saving DB to PostgreSQL, changes kept locally:', err);
    return false;
  } finally {
    client.release();
  }
}

let isSavingToPostgres = false;
let pendingPostgresSaveData: DatabaseSchema | null = null;

/**
 * Serialized background sync queue to PostgreSQL.
 * Ensures at most one background transaction runs at a time,
 * eliminating row-lock contention and pool exhaustion while remaining non-blocking.
 */
export async function queueSaveToPostgres(data: DatabaseSchema): Promise<boolean> {
  if (isSavingToPostgres) {
    pendingPostgresSaveData = data;
    return true;
  }

  isSavingToPostgres = true;
  try {
    return await saveDbToPostgres(data);
  } catch (err) {
    console.warn('Error during queued PostgreSQL save:', err);
    return false;
  } finally {
    isSavingToPostgres = false;
    if (pendingPostgresSaveData) {
      const nextData = pendingPostgresSaveData;
      pendingPostgresSaveData = null;
      queueSaveToPostgres(nextData).catch(() => {});
    }
  }
}

