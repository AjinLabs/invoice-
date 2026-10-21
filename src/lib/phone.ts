/**
 * Phone Number Normalization and Validation Utility
 * Supports Indian mobile numbers (with or without +91, with spaces, hyphens, brackets, duplicate 91)
 * and valid international E.164 phone numbers.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone: string;     // Clean 10-digit number for Indian numbers, or clean international digits
  waDestination: string;       // E.164 digits without '+' formatted for wa.me / Meta Cloud API (e.g. 919876543210)
  formattedDisplay: string;    // Human-readable formatted string (e.g. +91 98765 43210)
  countryCode: string;         // '91' for India or other international code
  error?: string;
}

/**
 * Validates and normalizes phone numbers for WhatsApp click-to-chat and database storage.
 */
export function normalizeWhatsAppPhone(rawInput?: string | null): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      normalizedPhone: '',
      waDestination: '',
      formattedDisplay: '',
      countryCode: '',
      error: 'Customer mobile number is required.',
    };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedPhone: '',
      waDestination: '',
      formattedDisplay: '',
      countryCode: '',
      error: 'Customer mobile number is required.',
    };
  }

  const hasLeadingPlus = trimmed.startsWith('+');
  const hasLeadingDoubleZero = trimmed.startsWith('00');

  // Strip all non-digit characters
  let digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      normalizedPhone: '',
      waDestination: '',
      formattedDisplay: '',
      countryCode: '',
      error: 'Please enter a valid mobile number with digits.',
    };
  }

  // Handle leading 00 international prefix: e.g. 00919876543210 -> 919876543210
  if (hasLeadingDoubleZero && digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Handle duplicate country codes: e.g. +91 91 9876543210 or 91919876543210 (14 digits)
  while (digits.startsWith('9191') && digits.length >= 14) {
    digits = digits.substring(2);
  }

  // Handle Indian trunk prefix '0': e.g. 09876543210 (11 digits) -> 9876543210
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Case 1: Standard Indian 10-digit mobile number
  if (digits.length === 10) {
    // Validate Indian mobile starting digit (6, 7, 8, 9)
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        normalizedPhone: digits,
        waDestination: `91${digits}`,
        formattedDisplay: `+91 ${digits}`,
        countryCode: '91',
        error: 'Invalid Indian mobile number. Mobile numbers in India must start with 6, 7, 8, or 9.',
      };
    }

    return {
      isValid: true,
      normalizedPhone: digits,
      waDestination: `91${digits}`,
      formattedDisplay: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      countryCode: '91',
    };
  }

  // Case 2: 12-digit Indian number with 91 country code
  if (digits.length === 12 && digits.startsWith('91')) {
    const localPart = digits.substring(2);
    if (!/^[6-9]\d{9}$/.test(localPart)) {
      return {
        isValid: false,
        normalizedPhone: localPart,
        waDestination: digits,
        formattedDisplay: `+91 ${localPart}`,
        countryCode: '91',
        error: 'Invalid Indian mobile number. Mobile numbers in India must start with 6, 7, 8, or 9.',
      };
    }

    return {
      isValid: true,
      normalizedPhone: localPart,
      waDestination: digits,
      formattedDisplay: `+91 ${localPart.slice(0, 5)} ${localPart.slice(5)}`,
      countryCode: '91',
    };
  }

  // Case 3: International numbers (explicitly passed with '+' or length 11-15)
  if (hasLeadingPlus || digits.length >= 11) {
    if (digits.length < 10) {
      return {
        isValid: false,
        normalizedPhone: digits,
        waDestination: digits,
        formattedDisplay: `+${digits}`,
        countryCode: '',
        error: 'International phone number is too short (minimum 10 digits required).',
      };
    }

    if (digits.length > 15) {
      return {
        isValid: false,
        normalizedPhone: digits,
        waDestination: digits,
        formattedDisplay: `+${digits}`,
        countryCode: '',
        error: 'Phone number exceeds international E.164 maximum of 15 digits.',
      };
    }

    return {
      isValid: true,
      normalizedPhone: digits,
      waDestination: digits,
      formattedDisplay: `+${digits}`,
      countryCode: digits.slice(0, digits.length - 10) || '91',
    };
  }

  // Case 4: Digits too short
  if (digits.length < 10) {
    return {
      isValid: false,
      normalizedPhone: digits,
      waDestination: '',
      formattedDisplay: digits,
      countryCode: '',
      error: `Phone number is incomplete (${digits.length}/10 digits). Please enter at least 10 digits.`,
    };
  }

  // Default invalid
  return {
    isValid: false,
    normalizedPhone: digits,
    waDestination: digits,
    formattedDisplay: digits,
    countryCode: '',
    error: 'Invalid phone number format.',
  };
}

/**
 * Backward-compatible normalizePhone helper for database queries.
 * Returns clean 10 digits for Indian numbers or normalized digits.
 */
export function normalizePhone(raw: string): string {
  const res = normalizeWhatsAppPhone(raw);
  return res.normalizedPhone || raw.replace(/\D/g, '');
}
