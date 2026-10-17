import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, withTransaction, getBranchInfo, DEFAULT_BRANCHES } from '@/lib/db';
import { ShopSettings, BranchId } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get('branch');

    let sessionBranch: BranchId | undefined;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        sessionBranch = session.branch;
      }
    } catch {}

    const effectiveBranch: BranchId = (sessionBranch || branchParam || 'vnb') as BranchId;
    const db = readDb();
    const branchInfo = getBranchInfo(db, effectiveBranch);
    const settings = {
      ...db.shop_settings,
      shop_name: branchInfo.name,
      address: branchInfo.address,
      phone: branchInfo.phone,
      rate_per_kg: branchInfo.rate_per_kg || db.shop_settings.rate_per_kg,
      branch_id: effectiveBranch,
      branches: db.shop_settings.branches || DEFAULT_BRANCHES,
    };

    const currentYear = new Date().getFullYear();
    const nextSeq = db.meta.invoice_sequence || 1;
    const next_invoice_number = `INV-${branchInfo.prefix}-${currentYear}-${String(nextSeq).padStart(6, '0')}`;

    return NextResponse.json({
      success: true,
      settings,
      branchInfo,
      next_invoice_number,
      active_branch: effectiveBranch,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    let sessionBranch: BranchId | undefined;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('terry_session');
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie.value);
        sessionBranch = session.branch;
      }
    } catch {}

    const effectiveBranch: BranchId = (body.branch || sessionBranch || 'vnb') as BranchId;

    const updated = await withTransaction((db) => {
      const current = db.shop_settings;
      if (!current.branches) {
        current.branches = { ...DEFAULT_BRANCHES };
      }

      // Update specific branch details
      const bInfo = current.branches[effectiveBranch] || DEFAULT_BRANCHES[effectiveBranch];
      if (body.address !== undefined) bInfo.address = body.address.trim();
      if (body.phone !== undefined) bInfo.phone = body.phone.trim();
      if (body.shop_name !== undefined) bInfo.name = body.shop_name.trim();

      if (body.rate_per_kg !== undefined) {
        const rate = parseFloat(body.rate_per_kg);
        if (!isNaN(rate) && rate > 0) {
          bInfo.rate_per_kg = rate;
          current.rate_per_kg = rate;
        }
      }

      current.branches[effectiveBranch] = bInfo;

      // Update password for branch admin if requested
      if (body.new_password && body.new_password.trim().length >= 4) {
        const username = effectiveBranch === 'pkdm' ? 'adminpkdm' : 'adminvnb';
        const u = db.users.find((user) => user.username.toLowerCase() === username);
        if (u) {
          u.password_hash = bcrypt.hashSync(body.new_password.trim(), 10);
        }
      }

      if (body.whatsapp_number !== undefined) current.whatsapp_number = body.whatsapp_number.trim();
      if (body.gstin !== undefined) current.gstin = body.gstin.trim();

      if (body.loyalty_discount !== undefined) {
        const disc = parseFloat(body.loyalty_discount);
        if (!isNaN(disc) && disc >= 0) current.loyalty_discount = disc;
      }

      if (body.min_weight_grams !== undefined) {
        const minG = parseInt(body.min_weight_grams, 10);
        if (!isNaN(minG) && minG > 0) current.min_weight_grams = minG;
      }

      if (body.required_visits !== undefined) {
        const reqV = parseInt(body.required_visits, 10);
        if (!isNaN(reqV) && reqV > 0) current.required_visits = reqV;
      }

      if (body.round_off_mode) {
        current.round_off_mode = body.round_off_mode;
      }

      if (body.whatsapp_mode === 'DEMO' || body.whatsapp_mode === 'PRODUCTION') {
        current.whatsapp_mode = body.whatsapp_mode;
      }

      if (body.whatsapp_phone_number_id !== undefined) {
        current.whatsapp_phone_number_id = body.whatsapp_phone_number_id.trim();
      }

      if (body.whatsapp_business_account_id !== undefined) {
        current.whatsapp_business_account_id = body.whatsapp_business_account_id.trim();
      }

      if (body.whatsapp_api_version !== undefined) {
        current.whatsapp_api_version = body.whatsapp_api_version.trim();
      }

      if (body.whatsapp_verify_token !== undefined) {
        current.whatsapp_verify_token = body.whatsapp_verify_token.trim();
      }

      if (body.whatsapp_access_token && !body.whatsapp_access_token.includes('••••')) {
        current.whatsapp_access_token = body.whatsapp_access_token.trim();
      }

      if (body.message_templates) {
        current.message_templates = {
          ...current.message_templates,
          ...body.message_templates,
        };
      }

      current.updated_at = new Date().toISOString();
      return current;
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
