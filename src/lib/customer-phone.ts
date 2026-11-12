// Client phone numbers: shared rules for the owner panel.
// Accepts national or international format, e.g. "06 12 34 56 78" or "+33 6 12 34 56 78".
export function normalizeCustomerPhone(raw: string) {
  const s = raw.replace(/[^\d+]/g, "");
  const plus = s.startsWith("+") ? "+" : "";
  return plus + s.replace(/\+/g, "");
}

// 8 to 15 digits, at most one leading "+".
export function isValidCustomerPhone(raw: string) {
  const s = normalizeCustomerPhone(raw);
  return /^\+?\d{8,15}$/.test(s);
}
