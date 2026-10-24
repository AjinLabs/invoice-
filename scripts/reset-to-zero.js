const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Read .env.local if DATABASE_URL is not set
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      process.env.DATABASE_URL = trimmed.substring('DATABASE_URL='.length).trim();
      break;
    }
  }
}

async function resetAllData() {
  console.log('Connecting to Supabase...');
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.jnqwoxgvxylqjvnpjfnm:TERRY%26WOMEN%401234@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Clearing old transaction and customer data in Supabase...');
  await client.query('DELETE FROM purchase_items;');
  await client.query('DELETE FROM loyalty_transactions;');
  await client.query('DELETE FROM whatsapp_messages;');
  await client.query('DELETE FROM purchases;');
  await client.query('DELETE FROM customers;');

  // Update customer table constraint so each branch has isolated customer records
  console.log('Configuring branch-isolated customer uniqueness...');
  await client.query('ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;');
  await client.query('ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_branch_key;');
  await client.query('ALTER TABLE customers ADD CONSTRAINT customers_phone_branch_key UNIQUE (phone, branch);');

  // Reset sequence
  await client.query(`
    INSERT INTO app_meta (key, value)
    VALUES ('app_meta', '{"invoice_sequence": 1, "version": "1.0.0"}'::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `);

  // Ensure default users exist with default passwords
  const adminPass = bcrypt.hashSync('admin123', 10);
  const vnbPass = bcrypt.hashSync('vnb123', 10);
  const pkdmPass = bcrypt.hashSync('pkdm123', 10);
  const now = new Date().toISOString();

  await client.query('DELETE FROM users;');
  await client.query(`
    INSERT INTO users (id, username, password_hash, role, name, branch, created_at)
    VALUES 
      ('usr_admin', 'admin', $1, 'SUPER_ADMIN', 'TERRY7 General Manager', null, $4),
      ('usr_vnb', 'adminvnb', $2, 'ADMIN', 'Store Manager (Vaniyambalam)', 'vnb', $4),
      ('usr_pkdm', 'adminpkdm', $3, 'ADMIN', 'Store Manager (Pookkottumpadam)', 'pkdm', $4);
  `, [adminPass, vnbPass, pkdmPass, now]);

  // Ensure default shop settings
  const defaultSettings = {
    id: 'settings_default',
    shop_name: 'TERRY7 WOMEN',
    logo_url: '/logo.png',
    address: 'Near Railway Station Road, Vaniyambalam, Malappuram - 679339',
    phone: '+91 8330889632',
    whatsapp_number: '+91 8330889632',
    gstin: '32AAAAA0000A1Z5',
    rate_per_kg: 899,
    loyalty_discount: 449.50,
    min_weight_grams: 1000,
    required_visits: 5,
    target_loyalty_grams: 5000,
    whatsapp_mode: 'DEMO',
    whatsapp_api_version: 'v20.0',
    whatsapp_verify_token: 'terry_verify_token_2026',
    round_off_mode: 'FLOOR_10',
    branches: {
      vnb: {
        id: 'vnb',
        name: 'TERRY7 WOMEN - Vaniyambalam',
        town: 'Vaniyambalam',
        code: 'VNB',
        address: 'Near Town Hall & Railway Station, Vaniyambalam, Malappuram - 679339',
        phone: '+91 8330889632',
        prefix: 'VNB',
        rate_per_kg: 899
      },
      pkdm: {
        id: 'pkdm',
        name: 'TERRY7 WOMEN - Pookkottumpadam',
        town: 'Pookkottumpadam',
        code: 'PKDM',
        address: 'Main Commercial Road, Pookkottumpadam, Malappuram - 679332',
        phone: '+91 8330889632',
        prefix: 'PKDM',
        rate_per_kg: 899
      }
    },
    message_templates: {
      purchase_confirmation: 'Hi {{customer_name}} 👋\nThank you for shopping with us!\nYour purchase of {{weight}} has been recorded.\nInvoice Amount: ₹{{amount}}\nThank you ❤️',
      loyalty_progress: 'Hi {{customer_name}} 👋\nYour cumulative purchase weight is {{weight}}.\nReach 5 KG to unlock 50% OFF on 1 KG (500g FREE) 🎁',
      reward_unlocked: '🎉 Congratulations {{customer_name}}!\nYour 50% OFF on 1 KG reward is now unlocked.\nUse it on your next purchase of 1 KG or more!',
      reward_redeemed: '🎁 Your 50% OFF on 1 KG (₹449.50 discount) has been successfully applied.\nThank you for shopping with us!'
    },
    updated_at: now
  };

  await client.query(`
    INSERT INTO shop_settings (id, data, updated_at)
    VALUES ('settings_default', $1, $2)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
  `, [JSON.stringify(defaultSettings), now]);

  // Verify counts
  const cCount = await client.query('SELECT COUNT(*) FROM customers');
  const pCount = await client.query('SELECT COUNT(*) FROM purchases');
  const uCount = await client.query('SELECT COUNT(*) FROM users');
  console.log('Supabase reset complete:');
  console.log('- Customers count:', cCount.rows[0].count);
  console.log('- Purchases count:', pCount.rows[0].count);
  console.log('- Users count:', uCount.rows[0].count);
  await client.end();

  // Reset local file data/terry.db.json as well
  const localDb = {
    users: [
      {
        id: 'usr_admin',
        username: 'admin',
        password_hash: adminPass,
        role: 'SUPER_ADMIN',
        name: 'TERRY7 General Manager',
        created_at: now
      },
      {
        id: 'usr_vnb',
        username: 'adminvnb',
        password_hash: vnbPass,
        role: 'ADMIN',
        name: 'Store Manager (Vaniyambalam)',
        branch: 'vnb',
        created_at: now
      },
      {
        id: 'usr_pkdm',
        username: 'adminpkdm',
        password_hash: pkdmPass,
        role: 'ADMIN',
        name: 'Store Manager (Pookkottumpadam)',
        branch: 'pkdm',
        created_at: now
      }
    ],
    customers: [],
    purchases: [],
    purchase_items: [],
    loyalty_transactions: [],
    whatsapp_messages: [],
    shop_settings: defaultSettings,
    meta: {
      invoice_sequence: 1,
      version: '1.0.0'
    }
  };

  const localFile = path.join(process.cwd(), 'data', 'terry.db.json');
  fs.writeFileSync(localFile, JSON.stringify(localDb, null, 2), 'utf-8');
  console.log('Local file data/terry.db.json also reset to 0 customers and 0 purchases.');
}

resetAllData().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
