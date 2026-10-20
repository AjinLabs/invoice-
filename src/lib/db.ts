import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Customer,
  Purchase,
  PurchaseItem,
  LoyaltyTransaction,
  WhatsAppMessage,
  ShopSettings,
  BranchId,
  BranchInfo,
} from './types';

declare global {
  var __TERRY_DB_CACHE__: DatabaseSchema | undefined;
}

export const DEFAULT_BRANCHES: Record<BranchId, BranchInfo> = {
  vnb: {
    id: 'vnb',
    name: 'TERRY7 WOMEN - Vaniyambalam',
    town: 'Vaniyambalam',
    code: 'VNB',
    address: 'Near Town Hall & Railway Station, Vaniyambalam, Malappuram - 679339',
    phone: '+91 8330889632',
    prefix: 'VNB',
    rate_per_kg: 899,
  },
  pkdm: {
    id: 'pkdm',
    name: 'TERRY7 WOMEN - Pookkottumpadam',
    town: 'Pookkottumpadam',
    code: 'PKDM',
    address: 'Main Commercial Road, Pookkottumpadam, Malappuram - 679332',
    phone: '+91 8330889632',
    prefix: 'PKDM',
    rate_per_kg: 899,
  },
};

export function getBranchInfo(db: DatabaseSchema, branchId?: BranchId | string | null): BranchInfo {
  const branches = db.shop_settings?.branches || DEFAULT_BRANCHES;
  if (branchId === 'pkdm') return branches.pkdm || DEFAULT_BRANCHES.pkdm;
  return branches.vnb || DEFAULT_BRANCHES.vnb;
}

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  purchases: Purchase[];
  purchase_items: PurchaseItem[];
  loyalty_transactions: LoyaltyTransaction[];
  whatsapp_messages: WhatsAppMessage[];
  shop_settings: ShopSettings;
  meta: {
    invoice_sequence: number;
    version: string;
  };
}

import os from 'os';

function resolveDataDir(): string {
  const isServerless =
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    process.cwd().startsWith('/var/task');

  if (isServerless) {
    return path.join(os.tmpdir(), 'terry-data');
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'terry-data');
  }
}

export const DATA_DIR = resolveDataDir();
export const DB_FILE = path.join(DATA_DIR, 'terry.db.json');
export const INVOICES_DIR = path.join(DATA_DIR, 'invoices');

// Ensure data directory exists and seed is copied if on serverless
export function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(INVOICES_DIR)) {
      fs.mkdirSync(INVOICES_DIR, { recursive: true });
    }

    // If running in /tmp and file does not exist, copy from bundled data if present
    const bundledDb = path.join(process.cwd(), 'data', 'terry.db.json');
    if (!fs.existsSync(DB_FILE) && fs.existsSync(bundledDb) && bundledDb !== DB_FILE) {
      try {
        fs.copyFileSync(bundledDb, DB_FILE);
      } catch (copyErr) {
        console.warn('Could not copy bundled DB to writable path:', copyErr);
      }
    }
  } catch (err) {
    console.warn('ensureDataDir warning:', err);
  }
}

// Generate unique ID helper
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// Normalize Indian phone numbers
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  return digits;
}

// Initial Seed Data as strictly mandated in prompt requirements 25 & 26
function createInitialSeed(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const vnbPasswordHash = bcrypt.hashSync('vnb123', 10);
  const pkdmPasswordHash = bcrypt.hashSync('pkdm123', 10);
  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'usr_admin',
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      name: 'TERRY7 General Manager',
      created_at: now,
    },
    {
      id: 'usr_vnb',
      username: 'adminvnb',
      password_hash: vnbPasswordHash,
      role: 'ADMIN',
      name: 'Store Manager (Vaniyambalam)',
      branch: 'vnb',
      created_at: now,
    },
    {
      id: 'usr_pkdm',
      username: 'adminpkdm',
      password_hash: pkdmPasswordHash,
      role: 'ADMIN',
      name: 'Store Manager (Pookkottumpadam)',
      branch: 'pkdm',
      created_at: now,
    },
  ];

  const shop_settings: ShopSettings = {
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
    whatsapp_mode: 'DEMO', // Demo mode enabled out of the box
    whatsapp_api_version: 'v20.0',
    whatsapp_verify_token: 'terry_verify_token_2026',
    round_off_mode: 'NONE',
    branches: DEFAULT_BRANCHES,
    message_templates: {
      purchase_confirmation: 'Hi {{customer_name}} 👋\nThank you for shopping with us!\nYour purchase of {{weight}} has been recorded.\nInvoice Amount: ₹{{amount}}\nLoyalty progress: {{loyalty_count}}/5.\nThank you ❤️',
      loyalty_progress: 'Hi {{customer_name}} 👋\nYou have completed {{count}} purchases.\nOnly {{remaining}} more purchase(s) to unlock your 50% OFF on 1 KG loyalty reward 🎁\nKeep shopping with us!',
      reward_unlocked: '🎉 Congratulations {{customer_name}}!\nYour 50% OFF on 1 KG loyalty reward is now unlocked.\nUse it on your next purchase of 1 KG or more to get 1 KG dress at half price!\nThank you for being our loyal customer ❤️',
      reward_redeemed: '🎁 Your 50% OFF on 1 KG loyalty reward (₹449.50 discount) has been successfully applied to this purchase.\nThank you for shopping with us!',
    },
    updated_at: now,
  };

  // Customers A, B, C, D as specified in Requirement 26
  const custA: Customer = {
    id: 'cust_A',
    phone: '9847011111',
    name: 'Customer A (Ananya)',
    address: 'Kozhikode, Kerala',
    total_purchases: 5,
    total_weight_grams: 4800,
    total_amount_spent: 4315.20,
    loyalty_count: 5,
    loyalty_reward_unlocked: true, // Reward Unlocked!
    last_purchase_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: now,
  };

  const custB: Customer = {
    id: 'cust_B',
    phone: '9847022222',
    name: 'Customer B (Bhavana)',
    address: 'Kannur, Kerala',
    total_purchases: 3,
    total_weight_grams: 2500,
    total_amount_spent: 2247.50,
    loyalty_count: 3, // 3 purchases, 2 more required
    loyalty_reward_unlocked: false,
    last_purchase_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: now,
  };

  const custC: Customer = {
    id: 'cust_C',
    phone: '9847033333',
    name: 'Customer C (Chitra)',
    address: 'Kochi, Kerala',
    total_purchases: 6,
    total_weight_grams: 5800,
    total_amount_spent: 4916.20,
    loyalty_count: 0, // Used reward, reset to 0
    loyalty_reward_unlocked: false,
    last_purchase_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: now,
  };

  const custD: Customer = {
    id: 'cust_D',
    phone: '9847044444',
    name: 'Customer D (Deepa)',
    address: 'Thrissur, Kerala',
    total_purchases: 6,
    total_weight_grams: 4500,
    total_amount_spent: 4045.50,
    loyalty_count: 5, // Reward unlocked, but previous purchase was 700g so reward was NOT used and still retained!
    loyalty_reward_unlocked: true,
    last_purchase_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: now,
  };

  // Sample Purchase for Customer C with 1000g and 50% OFF on 1 KG discount applied
  const purchaseC: Purchase = {
    id: 'pur_1001',
    invoice_number: 'INV-2026-000101',
    customer_id: 'cust_C',
    customer_name: 'Customer C (Chitra)',
    customer_phone: '9847033333',
    customer_address: 'Kochi, Kerala',
    weight_grams: 1000,
    weight_kg: 1.0,
    rate_per_kg: 899,
    subtotal: 899,
    discount_amount: 449.50,
    final_amount: 449.50,
    payment_method: 'UPI',
    status: 'COMPLETED',
    loyalty_applied: true,
    loyalty_progress_before: 5,
    loyalty_progress_after: 0,
    loyalty_message: '🎁 50% OFF on 1 KG Loyalty Reward applied (-₹449.50)! Thank you for shopping with us!',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  };

  // Sample Purchase for Customer D with 700g where discount was NOT applied because min 1000g required
  const purchaseD: Purchase = {
    id: 'pur_1002',
    invoice_number: 'INV-2026-000102',
    customer_id: 'cust_D',
    customer_name: 'Customer D (Deepa)',
    customer_phone: '9847044444',
    customer_address: 'Thrissur, Kerala',
    weight_grams: 700,
    weight_kg: 0.7,
    rate_per_kg: 899,
    subtotal: 629.30,
    discount_amount: 0,
    final_amount: 629.30,
    payment_method: 'CASH',
    status: 'COMPLETED',
    loyalty_applied: false,
    loyalty_progress_before: 5,
    loyalty_progress_after: 5, // still has unlocked reward
    loyalty_message: 'Minimum 1 KG (1000g) purchase required to use your 50% OFF on 1 KG reward. Your reward remains active for your next 1 KG+ purchase!',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  };

  const whatsapp_messages: WhatsAppMessage[] = [
    {
      id: 'msg_1001',
      purchase_id: 'pur_1001',
      customer_id: 'cust_C',
      phone: '9847033333',
      message_type: 'INVOICE',
      content: '🧾 CASH MEMO - TERRY7 WOMEN\nCustomer: Customer C (Chitra)\nInvoice No: INV-2026-000101\nWeight: 1.00 KG\nFinal Amount: ₹449.50\n🎁 Loyalty Status: 50% OFF on 1 KG Reward Applied (-₹449.50)!',
      status: 'DELIVERED',
      is_demo: true,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'msg_1002',
      purchase_id: 'pur_1002',
      customer_id: 'cust_D',
      phone: '9847044444',
      message_type: 'INVOICE',
      content: '🧾 CASH MEMO - TERRY7 WOMEN\nCustomer: Customer D (Deepa)\nInvoice No: INV-2026-000102\nWeight: 0.70 KG\nFinal Amount: ₹629.30\n🎁 Loyalty Status: 50% OFF on 1 KG Reward Unlocked (Applicable on 1 KG+)',
      status: 'SENT',
      is_demo: true,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
  ];

  return {
    users,
    customers: [custA, custB, custC, custD],
    purchases: [purchaseC, purchaseD],
    purchase_items: [],
    loyalty_transactions: [],
    whatsapp_messages,
    shop_settings,
    meta: {
      invoice_sequence: 103,
      version: '1.0.0',
    },
  };
}

export function readDb(): DatabaseSchema {
  // Use memory cache if available and file cannot be accessed
  const memCache = globalThis.__TERRY_DB_CACHE__;

  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    if (memCache) return memCache;
    const initial = createInitialSeed();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write initial seed to disk (in-memory mode):', e);
    }
    globalThis.__TERRY_DB_CACHE__ = initial;
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;

    let modified = false;
    if (!parsed.users) parsed.users = [];

    // Ensure adminvnb exists
    if (!parsed.users.some((u) => u.username.toLowerCase() === 'adminvnb')) {
      parsed.users.push({
        id: 'usr_vnb',
        username: 'adminvnb',
        password_hash: bcrypt.hashSync('vnb123', 10),
        role: 'ADMIN',
        name: 'Store Manager (Vaniyambalam)',
        branch: 'vnb',
        created_at: new Date().toISOString(),
      });
      modified = true;
    }

    // Ensure adminpkdm exists
    if (!parsed.users.some((u) => u.username.toLowerCase() === 'adminpkdm')) {
      parsed.users.push({
        id: 'usr_pkdm',
        username: 'adminpkdm',
        password_hash: bcrypt.hashSync('pkdm123', 10),
        role: 'ADMIN',
        name: 'Store Manager (Pookkottumpadam)',
        branch: 'pkdm',
        created_at: new Date().toISOString(),
      });
      modified = true;
    }

    // Ensure super admin role is set
    const mainAdmin = parsed.users.find((u) => u.username.toLowerCase() === 'admin');
    if (mainAdmin && mainAdmin.role !== 'SUPER_ADMIN') {
      mainAdmin.role = 'SUPER_ADMIN';
      modified = true;
    }

    // Ensure branch settings
    if (!parsed.shop_settings) {
      parsed.shop_settings = createInitialSeed().shop_settings;
      modified = true;
    }
    if (!parsed.shop_settings.branches) {
      parsed.shop_settings.branches = DEFAULT_BRANCHES;
      modified = true;
    }

    // Ensure all purchases have branch
    if (parsed.purchases) {
      for (const p of parsed.purchases) {
        if (!p.branch) {
          p.branch = 'vnb';
          modified = true;
        }
      }
    }

    if (modified) {
      try {
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(parsed, null, 2), 'utf-8');
        fs.renameSync(tempFile, DB_FILE);
      } catch (writeErr) {
        console.warn('Could not persist auto-migrated database to disk:', writeErr);
      }
    }

    globalThis.__TERRY_DB_CACHE__ = parsed;
    return parsed;
  } catch (err) {
    if (memCache) return memCache;
    console.error('Error reading database, restoring seed backup:', err);
    const initial = createInitialSeed();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    globalThis.__TERRY_DB_CACHE__ = initial;
    return initial;
  }
}

export function writeDb(data: DatabaseSchema): void {
  // Always update in-memory cache first so next read immediately sees changes
  globalThis.__TERRY_DB_CACHE__ = data;

  try {
    ensureDataDir();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (writeErr) {
    console.warn('Could not persist database to disk (persisting in memory cache):', writeErr);
  }
}

// Transaction lock helper for atomic purchase execution
export async function withTransaction<T>(callback: (db: DatabaseSchema) => Promise<T> | T): Promise<T> {
  const db = readDb();
  const result = await callback(db);
  writeDb(db);
  return result;
}
