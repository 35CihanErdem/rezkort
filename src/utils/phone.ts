/** Türkiye cep: 05xx xxx xx xx → 5xxxxxxxxx (10 hane) */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidTrMobile(phone: string): boolean {
  const p = normalizePhone(phone);
  return /^5\d{9}$/.test(p);
}

export function toE164TR(phone: string): string {
  const p = normalizePhone(phone);
  if (!/^5\d{9}$/.test(p)) return phone.trim();
  return `+90${p}`;
}

export function normalizePhoneForLookup(phone: string): string {
  const value = phone.trim();
  if (value.startsWith('+')) {
    return value.replace(/\s+/g, '');
  }
  return toE164TR(value);
}

export function formatPhoneDisplay(phone: string): string {
  const p = normalizePhone(phone);
  if (p.length !== 10) return phone;
  return `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}`;
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._]{3,24}$/.test(normalizeUsername(username));
}
