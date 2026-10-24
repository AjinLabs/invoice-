const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = encodeURIComponent('TERRY&WOMEN@1234');
const connectionString = process.env.DATABASE_URL || `postgresql://postgres:${password}@db.jnqwoxgvxylqjvnpjfnm.supabase.co:5432/postgres`;

async function initSupabase() {
  console.log('Connecting to Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL successfully!');

  // Create tables
  console.log('Creating tables if they do not exist...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(32) NOT NULL,
      name VARCHAR(128) NOT NULL,
      branch VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(32) NOT NULL,
      name VARCHAR(128) NOT NULL,
      address TEXT,
      branch VARCHAR(32) DEFAULT 'vnb',
      total_purchases INT NOT NULL DEFAULT 0,
      total_weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 0,
      total_amount_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
      loyalty_count INT NOT NULL DEFAULT 0,
      loyalty_weight_grams NUMERIC(10, 2) DEFAULT 0,
      loyalty_reward_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
      last_purchase_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT customers_phone_branch_key UNIQUE (phone, branch)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id VARCHAR(64) PRIMARY KEY,
      invoice_number VARCHAR(64) UNIQUE NOT NULL,
      branch VARCHAR(32),
      branch_name VARCHAR(128),
      customer_id VARCHAR(64),
      customer_name VARCHAR(128) NOT NULL,
      customer_phone VARCHAR(32) NOT NULL,
      customer_address TEXT,
      weight_grams NUMERIC(10, 2) NOT NULL,
      weight_kg NUMERIC(10, 3) NOT NULL,
      rate_per_kg NUMERIC(10, 2) NOT NULL,
      subtotal NUMERIC(12, 2) NOT NULL,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      round_off NUMERIC(10, 2) DEFAULT 0,
      final_amount NUMERIC(12, 2) NOT NULL,
      payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
      status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
      loyalty_applied BOOLEAN NOT NULL DEFAULT FALSE,
      loyalty_progress_before INT NOT NULL DEFAULT 0,
      loyalty_progress_after INT NOT NULL DEFAULT 0,
      loyalty_weight_after_grams NUMERIC(10, 2),
      loyalty_reward_unlocked_after BOOLEAN,
      loyalty_message TEXT,
      notes TEXT,
      items JSONB DEFAULT '[]'::jsonb,
      invoice_image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id VARCHAR(64) PRIMARY KEY,
      purchase_id VARCHAR(64),
      description TEXT NOT NULL,
      item_type VARCHAR(32),
      quantity VARCHAR(32),
      unit_price NUMERIC(10, 2),
      weight_grams NUMERIC(10, 2),
      rate_per_kg NUMERIC(10, 2),
      amount NUMERIC(10, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) NOT NULL,
      purchase_id VARCHAR(64) NOT NULL,
      type VARCHAR(32) NOT NULL,
      count_before INT NOT NULL,
      count_after INT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id VARCHAR(64) PRIMARY KEY,
      purchase_id VARCHAR(64),
      customer_id VARCHAR(64),
      phone VARCHAR(32) NOT NULL,
      message_type VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
      message_id VARCHAR(128),
      error_message TEXT,
      is_demo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shop_settings (
      id VARCHAR(64) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL
    );

    ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS purchase_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS loyalty_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS whatsapp_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS shop_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS app_meta ENABLE ROW LEVEL SECURITY;
  `);
  console.log('Tables created and secured with RLS successfully!');

  // Check if existing data needs to be migrated
  const existingUsers = await client.query('SELECT COUNT(*) FROM users');
  if (parseInt(existingUsers.rows[0].count, 10) === 0) {
    console.log('Database empty. Migrating from data/terry.db.json...');
    const localDbPath = path.join(process.cwd(), 'data', 'terry.db.json');
    if (fs.existsSync(localDbPath)) {
      const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));

      // Users
      for (const u of data.users || []) {
        await client.query(
          `INSERT INTO users (id, username, password_hash, role, name, branch, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.username, u.password_hash, u.role, u.name, u.branch || null, u.created_at || new Date().toISOString()]
        );
      }
      console.log(`Migrated ${data.users?.length || 0} users.`);

      // Customers
      for (const c of data.customers || []) {
        await client.query(
          `INSERT INTO customers (id, phone, name, address, branch, total_purchases, total_weight_grams, total_amount_spent, loyalty_count, loyalty_weight_grams, loyalty_reward_unlocked, last_purchase_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [
            c.id, c.phone, c.name, c.address || null, c.branch || null,
            c.total_purchases || 0, c.total_weight_grams || 0, c.total_amount_spent || 0,
            c.loyalty_count || 0, c.loyalty_weight_grams || 0, Boolean(c.loyalty_reward_unlocked),
            c.last_purchase_at || null, c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString()
          ]
        );
      }
      console.log(`Migrated ${data.customers?.length || 0} customers.`);

      // Purchases
      for (const p of data.purchases || []) {
        await client.query(
          `INSERT INTO purchases (id, invoice_number, branch, branch_name, customer_id, customer_name, customer_phone, customer_address, weight_grams, weight_kg, rate_per_kg, subtotal, discount_amount, round_off, final_amount, payment_method, status, loyalty_applied, loyalty_progress_before, loyalty_progress_after, loyalty_weight_after_grams, loyalty_reward_unlocked_after, loyalty_message, notes, items, invoice_image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
           ON CONFLICT (id) DO NOTHING`,
          [
            p.id, p.invoice_number, p.branch || null, p.branch_name || null,
            p.customer_id, p.customer_name, p.customer_phone, p.customer_address || null,
            p.weight_grams, p.weight_kg, p.rate_per_kg, p.subtotal, p.discount_amount || 0,
            p.round_off || 0, p.final_amount, p.payment_method || 'CASH', p.status || 'COMPLETED',
            Boolean(p.loyalty_applied), p.loyalty_progress_before || 0, p.loyalty_progress_after || 0,
            p.loyalty_weight_after_grams || null, Boolean(p.loyalty_reward_unlocked_after),
            p.loyalty_message || null, p.notes || null, JSON.stringify(p.items || []),
            p.invoice_image_url || null, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
          ]
        );
      }
      console.log(`Migrated ${data.purchases?.length || 0} purchases.`);

      // WhatsApp messages
      for (const w of data.whatsapp_messages || []) {
        await client.query(
          `INSERT INTO whatsapp_messages (id, purchase_id, customer_id, phone, message_type, content, status, message_id, error_message, is_demo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [
            w.id, w.purchase_id || null, w.customer_id || null, w.phone,
            w.message_type, w.content, w.status, w.message_id || null,
            w.error_message || null, Boolean(w.is_demo),
            w.created_at || new Date().toISOString(), w.updated_at || new Date().toISOString()
          ]
        );
      }

      // Settings
      if (data.shop_settings) {
        await client.query(
          `INSERT INTO shop_settings (id, data, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3`,
          ['settings_default', JSON.stringify(data.shop_settings), new Date().toISOString()]
        );
      }

      // Meta
      if (data.meta) {
        await client.query(
          `INSERT INTO app_meta (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = $2`,
          ['app_meta', JSON.stringify(data.meta)]
        );
      }
    }
  } else {
    console.log('Database already contains users. Skipping initial seed migration.');
  }

  // Summary count
  const custCount = await client.query('SELECT COUNT(*) FROM customers');
  const purCount = await client.query('SELECT COUNT(*) FROM purchases');
  console.log(`Current DB Status: ${custCount.rows[0].count} customers, ${purCount.rows[0].count} purchases in Supabase.`);

  await client.end();
  console.log('All migrations completed successfully!');
}

initSupabase().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
