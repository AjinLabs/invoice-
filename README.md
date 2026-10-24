# 👗 TERRY7 WOMEN — Multi-Branch POS Billing & Loyalty Engine

An enterprise-grade, high-performance Point of Sale (POS) billing and weight-based customer loyalty management platform built for **TERRY7 WOMEN** retail stores (Vaniyambalam & Pookkottumpadam branches, Kerala).

Deployed on **Vercel** with high-availability cloud database clustering on **Supabase PostgreSQL (AWS Mumbai)** and dual-layer local failover caching.

---

## 🌟 Key Highlights & Engineering Features

### 1. ⚖️ Weight-Based Clothing POS Billing
- **Precise Pricing Engine**: Instant calculation of ladies' readymade garments and dress materials sold by weight (standard ₹899/KG or store-specific rates).
- **Flexible Round-off Engine**: Supports Exact Billing, Nearest ₹10 Round-down (`FLOOR_10`), and Custom Manual Overrides.
- **Mixed Cart Support**: Handles bulk clothing weight alongside custom itemized apparel entries seamlessly.

### 2. 🏪 Strict Multi-Branch Isolation
- **Store-Scored Isolation**: Distinct branch domains for **Vaniyambalam (VNB)** and **Pookkottumpadam (PKDM)**.
- **Customer Privacy & Segregation**: Customer profiles, phone numbers, search autocomplete, purchase records, and loyalty accounts are strictly isolated per branch.
- **Role-Based Access Control**: Branch managers (`adminvnb`, `adminpkdm`) have isolated portals, while Super Admin (`admin`) maintains centralized multi-store oversight.

### 3. 🎁 5 KG Milestone Customer Loyalty Engine
- **Visual Progress Bar**: 10-segment Unicode / responsive progress tracker (`0 KG ▰▰▰▱▱▱▱▱▱▱ 5 KG`).
- **Milestone Reward**: When cumulative purchases reach 5 KG, unlocks **50% OFF on 1 KG (500g FREE)** on their next qualifying visit (>= 1 KG).
- **Cycle Reset**: Automatically resets the loyalty counter upon reward redemption while permanently preserving the customer's purchase history and lifetime financials.

### 4. ⚡ Sub-60ms High-Speed Lookup & Tablet POS UX
- **Rapid 4-Digit Autocomplete**: Instant customer identification and auto-population within 60ms of typing a phone number.
- **Client-Side Query Cache**: 0ms local in-memory cache for ultra-responsive search without network latency.
- **Tablet & Mobile Native**: PWA-ready layout optimized for touch interaction, fast keyboard navigation, and instant WhatsApp chat opening (`api.whatsapp.com`).

### 5. 🛡️ Crash Protection & One-Click Backup System
- **Dual-Layer Persistence**: Memory Cache + Atomic Disk Fallback + Supabase Cloud PostgreSQL. System functions smoothly even during intermittent network fluctuations.
- **Automated Cloud Snapshots**: Daily automated cloud backups on Supabase.
- **One-Click Disaster Recovery**: Complete full-database JSON backups and CSV exports available directly from the Store Settings dashboard.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Language** | TypeScript 5 (Strict Mode) |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **Database** | Supabase Managed PostgreSQL (AWS Mumbai - `aws-0-ap-south-1`) |
| **Transactions** | `pg` connection pooling with atomic read-write transaction locks |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert/strict`) — 47 unit & workflow tests |
| **Deployment** | Vercel Serverless Platform |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/your-username/terry.git
cd terry
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your database and WhatsApp credentials:
```env
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxx:xxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Run Test Suite
```bash
npm test
```
Executes all 47 test suites verifying:
- Billing workflow, discounts, and rounding accuracy
- Branch customer data isolation
- 5 KG milestone loyalty cycle evaluation and redemption
- Phone normalization (+91, international, formatting)
- WhatsApp cash memo text formatting & zero-URL compliance

---

## 🔐 Default Access Portals

| Role | Username | Default Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Full Access (All Stores, Invoices, CSVs, Settings) |
| **Vaniyambalam Manager** | `adminvnb` | `vnb123` | Vaniyambalam Store Billing, Invoices & Customers |
| **Pookkottumpadam Manager** | `adminpkdm` | `pkdm123` | Pookkottumpadam Store Billing, Invoices & Customers |

---

## 📄 License
Private & Proprietary — Built for TERRY7 WOMEN.
