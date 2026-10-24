import test from 'node:test';
import assert from 'node:assert/strict';
import type { Customer } from '../types.ts';

test('Branch Customer Isolation Logic', async (t) => {
  const mockCustomers: Customer[] = [
    {
      id: 'cust_pkdm_1',
      phone: '9847000001',
      name: 'Amina (Pookkottumpadam)',
      branch: 'pkdm',
      total_purchases: 1,
      total_weight_grams: 1200,
      total_amount_spent: 1078.8,
      loyalty_count: 1,
      loyalty_reward_unlocked: false,
      last_purchase_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cust_vnb_1',
      phone: '9847000002',
      name: 'Fathima (Vaniyambalam)',
      branch: 'vnb',
      total_purchases: 2,
      total_weight_grams: 2500,
      total_amount_spent: 2247.5,
      loyalty_count: 2,
      loyalty_reward_unlocked: false,
      last_purchase_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  await t.test('Pookkottumpadam search cannot see Vaniyambalam customer', () => {
    const effectiveBranch = 'pkdm';
    const queryPhone = '9847000002'; // VNB phone

    const scopedCustomers = mockCustomers.filter((c) => (c.branch || 'vnb') === effectiveBranch);
    const found = scopedCustomers.find((c) => c.phone === queryPhone);

    assert.equal(found, undefined, 'Vaniyambalam customer must NOT appear in Pookkottumpadam search');
  });

  await t.test('Vaniyambalam search cannot see Pookkottumpadam customer', () => {
    const effectiveBranch = 'vnb';
    const queryPhone = '9847000001'; // PKDM phone

    const scopedCustomers = mockCustomers.filter((c) => (c.branch || 'vnb') === effectiveBranch);
    const found = scopedCustomers.find((c) => c.phone === queryPhone);

    assert.equal(found, undefined, 'Pookkottumpadam customer must NOT appear in Vaniyambalam search');
  });

  await t.test('Same phone number can be registered independently per branch', () => {
    const sharedPhone = '9995000000';
    const pkdmCust: Customer = {
      id: 'cust_pkdm_2',
      phone: sharedPhone,
      name: 'PKDM Profile',
      branch: 'pkdm',
      total_purchases: 0,
      total_weight_grams: 0,
      total_amount_spent: 0,
      loyalty_count: 0,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const vnbCust: Customer = {
      id: 'cust_vnb_2',
      phone: sharedPhone,
      name: 'VNB Profile',
      branch: 'vnb',
      total_purchases: 0,
      total_weight_grams: 0,
      total_amount_spent: 0,
      loyalty_count: 0,
      loyalty_reward_unlocked: false,
      last_purchase_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const all = [...mockCustomers, pkdmCust, vnbCust];

    const foundInPkdm = all.find((c) => c.phone === sharedPhone && (c.branch || 'vnb') === 'pkdm');
    const foundInVnb = all.find((c) => c.phone === sharedPhone && (c.branch || 'vnb') === 'vnb');

    assert.equal(foundInPkdm?.name, 'PKDM Profile');
    assert.equal(foundInVnb?.name, 'VNB Profile');
  });
});
