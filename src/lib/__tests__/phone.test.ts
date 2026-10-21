import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppPhone, normalizePhone } from '../phone.ts';

describe('Phone Normalization & Validation', () => {
  test('Indian 10-digit number without country code', () => {
    const res = normalizeWhatsAppPhone('9876543210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
    assert.equal(res.formattedDisplay, '+91 98765 43210');
    assert.equal(res.countryCode, '91');
  });

  test('Indian number with +91 and spaces', () => {
    const res = normalizeWhatsAppPhone('+91 98765 43210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
    assert.equal(res.formattedDisplay, '+91 98765 43210');
  });

  test('Indian number with hyphens and spaces', () => {
    const res = normalizeWhatsAppPhone('98765-43210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
  });

  test('Indian number with parentheses', () => {
    const res = normalizeWhatsAppPhone('+91 (98765) 43210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
  });

  test('Indian number with leading 0 trunk prefix', () => {
    const res = normalizeWhatsAppPhone('09876543210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
  });

  test('Duplicate country code (+91 91 9876543210)', () => {
    const res = normalizeWhatsAppPhone('+91 91 98765 43210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
  });

  test('Duplicate country code as digits (91919876543210)', () => {
    const res = normalizeWhatsAppPhone('91919876543210');
    assert.equal(res.isValid, true);
    assert.equal(res.normalizedPhone, '9876543210');
    assert.equal(res.waDestination, '919876543210');
  });

  test('Customer without mobile number (empty / null / undefined)', () => {
    const res1 = normalizeWhatsAppPhone('');
    assert.equal(res1.isValid, false);
    assert.ok(res1.error);

    const res2 = normalizeWhatsAppPhone(null);
    assert.equal(res2.isValid, false);
    assert.ok(res2.error);

    const res3 = normalizeWhatsAppPhone('   ');
    assert.equal(res3.isValid, false);
    assert.ok(res3.error);
  });

  test('Invalid or incomplete mobile number (< 10 digits)', () => {
    const res = normalizeWhatsAppPhone('987654');
    assert.equal(res.isValid, false);
    assert.ok(res.error?.includes('incomplete'));
  });

  test('Indian number starting with invalid digit (e.g. 1-5)', () => {
    const res = normalizeWhatsAppPhone('3456789012');
    assert.equal(res.isValid, false);
    assert.ok(res.error?.includes('must start with 6, 7, 8, or 9'));
  });

  test('Valid International number (UAE +971 50 123 4567)', () => {
    const res = normalizeWhatsAppPhone('+971 50 123 4567');
    assert.equal(res.isValid, true);
    assert.equal(res.waDestination, '971501234567');
  });

  test('Valid International number (US +1 202 555 0123)', () => {
    const res = normalizeWhatsAppPhone('+1 (202) 555-0123');
    assert.equal(res.isValid, true);
    assert.equal(res.waDestination, '12025550123');
  });

  test('Valid International number (Saudi Arabia +966 50 123 4567)', () => {
    const res = normalizeWhatsAppPhone('+966 50 123 4567');
    assert.equal(res.isValid, true);
    assert.equal(res.waDestination, '966501234567');
  });

  test('International number starting with 00', () => {
    const res = normalizeWhatsAppPhone('00971501234567');
    assert.equal(res.isValid, true);
    assert.equal(res.waDestination, '971501234567');
  });

  test('normalizePhone backward compatibility', () => {
    assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
    assert.equal(normalizePhone('9876543210'), '9876543210');
    assert.equal(normalizePhone('+971 50 123 4567'), '971501234567');
  });
});
