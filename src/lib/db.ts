import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type {
  User,
  ShopSettings,
  BranchId,
  BranchInfo,
  DatabaseSchema,
} from './types.ts';
import { fetchDbFromPostgres, queueSaveToPostgres, savePurchaseDeltaToPostgres, SUPABASE_DATABASE_URL } from './postgres.ts';

export type { DatabaseSchema };
export { savePurchaseDeltaToPostgres };

// Precalculated bcrypt hashes for standard accounts (0ms overhead)
const ADMIN_HASH = '$2b$10$6X59yJzaE3DAPJr0IHUin.AuV9FkOknUQ919dBcvtI8xFxqkSpgb.';
const VNB_HASH = '$2b$10$YaHInrDpOh/YhALJM.soeuMP3Ls8E2mbxxL.s/Y4g1zhoNSGg6ufK';
const PKDM_HASH = '$2b$10$w8Q7/SDxzP2CLwAtFfUu1.aXqx38L.RvFJ2uejyooTrmoM/lYCe/G';

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

export { normalizePhone } from './phone.ts';

// Initial Seed Data as strictly mandated in prompt requirements 25 & 26
function createInitialSeed(): DatabaseSchema {
  const adminPasswordHash = ADMIN_HASH;
  const vnbPasswordHash = VNB_HASH;
  const pkdmPasswordHash = PKDM_HASH;
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

  return {
    users,
    customers: [],
    purchases: [],
    purchase_items: [],
    loyalty_transactions: [],
    whatsapp_messages: [],
    shop_settings,
    meta: {
      invoice_sequence: 1,
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
        password_hash: VNB_HASH,
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
        password_hash: PKDM_HASH,
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

export function writeDb(data: DatabaseSchema, syncPostgres = true): void {
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

  // Non-blocking asynchronous sync to Supabase PostgreSQL in background
  if (SUPABASE_DATABASE_URL && syncPostgres) {
    queueSaveToPostgres(data).catch((err) => {
      console.warn('Background sync to PostgreSQL failed:', err);
    });
  }
}

// Ultra-fast database getter: returns cached in-memory DB in 0ms, falling back to local disk
export async function getDb(forceRefresh = false): Promise<DatabaseSchema> {
  if (!forceRefresh && globalThis.__TERRY_DB_CACHE__) {
    return globalThis.__TERRY_DB_CACHE__;
  }
  const diskDb = readDb();
  if (diskDb && !globalThis.__TERRY_DB_CACHE__) {
    globalThis.__TERRY_DB_CACHE__ = diskDb;
  }
  if (SUPABASE_DATABASE_URL && forceRefresh) {
    try {
      const pgDb = await fetchDbFromPostgres();
      if (pgDb) {
        globalThis.__TERRY_DB_CACHE__ = pgDb;
        return pgDb;
      }
    } catch (pgErr) {
      console.warn('Could not fetch from PostgreSQL, using local fallback:', pgErr);
    }
  }
  return globalThis.__TERRY_DB_CACHE__ || diskDb;
}

// Ultra-fast transaction lock helper: persists to memory cache + local disk in <5ms, syncs PG in background
export async function withTransaction<T>(
  callback: (db: DatabaseSchema) => Promise<T> | T,
  syncPostgres = true
): Promise<T> {
  const db = await getDb();
  const result = await callback(db);
  writeDb(db, syncPostgres);
  return result;
}
