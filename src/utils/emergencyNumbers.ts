/**
 * Locale-aware emergency contact helpers.
 *
 * This is a convenience default, not a guaranteed directory. Emergency numbers
 * vary by country and can change; the user can override the number in Settings.
 */

export const FALLBACK_EMERGENCY_NUMBER = '112';

const REGION_EMERGENCY_NUMBERS: Record<string, string> = {
  US: '911',
  CA: '911',
  MX: '911',
  PH: '911',
  GB: '999',
  IE: '999',
  AU: '000',
  NZ: '111',
  IN: '112',
  BD: '999',
  PK: '1122',
  LK: '1990',
  NP: '112',
  JP: '119',
  KR: '119',
  CN: '120',
  HK: '999',
  TW: '119',
  SG: '995',
  MY: '999',
  ID: '112',
  TH: '1669',
  VN: '115',
  BR: '192',
  AR: '107',
  CL: '131',
  CO: '125',
  PE: '106',
  ZA: '10177',
  NG: '112',
  KE: '999',
  EG: '123',
  SA: '997',
  AE: '998',
  TR: '112',
  RU: '103',
  UA: '103',
  IL: '101',
  DE: '112',
  FR: '112',
  ES: '112',
  IT: '112',
  NL: '112',
  BE: '112',
  PT: '112',
  PL: '112',
  SE: '112',
  NO: '113',
  DK: '112',
  FI: '112',
  CH: '144',
  AT: '112',
  GR: '112',
  CZ: '112',
  HU: '112',
  RO: '112',
  BG: '112',
  HR: '112',
  RS: '112',
  SI: '112',
  SK: '112',
  LT: '112',
  LV: '112',
  EE: '112',
  IS: '112',
};

/**
 * Best-effort region detection using the JS runtime locale.
 * Falls back to the browser language tag, then null.
 */
export function getDeviceRegion(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale) {
      try {
        const region = new Intl.Locale(locale).region;
        if (region) return region.toUpperCase();
      } catch {
        const parts = locale.replace('_', '-').split('-');
        const candidate = parts.find((part) => /^[A-Za-z]{2}$/.test(part));
        if (candidate) return candidate.toUpperCase();
      }
    }
  } catch {
    // Fall through to navigator below.
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    const parts = navigator.language.replace('_', '-').split('-');
    const candidate = parts.find((part) => /^[A-Za-z]{2}$/.test(part));
    if (candidate) return candidate.toUpperCase();
  }

  return null;
}

export function getDefaultEmergencyNumber(): string {
  const region = getDeviceRegion();
  if (region && REGION_EMERGENCY_NUMBERS[region]) {
    return REGION_EMERGENCY_NUMBERS[region];
  }
  return FALLBACK_EMERGENCY_NUMBER;
}

export function isEmergencyNumberValid(value: string): boolean {
  return /^\+?[0-9][0-9\s-]{1,14}$/.test(value.trim());
}

export function normalizeEmergencyNumber(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/[^\d+]/g, '');
}

export function emergencyDialUrl(number: string): string {
  return `tel:${normalizeEmergencyNumber(number)}`;
}
