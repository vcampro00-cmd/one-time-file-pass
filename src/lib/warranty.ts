export const WARRANTY_MONTHS = 3;
// Reseller devices get a longer warranty.
export const RESELLER_WARRANTY_MONTHS = 5;

export function warrantyEnd(start: Date, months = WARRANTY_MONTHS) {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function resellerWarrantyEnd(certifiedAt: string | null) {
  if (!certifiedAt) return null;
  const start = new Date(certifiedAt);
  if (Number.isNaN(start.getTime())) return null;
  return warrantyEnd(start, RESELLER_WARRANTY_MONTHS);
}

// IMEI: 15 digits with a valid Luhn check digit.
export function isValidImei(raw: string) {
  const s = raw.replace(/\s/g, "");
  if (!/^\d{15}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(s[i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
