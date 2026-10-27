// Remembers the visitor's own purchase in this browser, so the code can be shown again.
// Only the payment session id is kept: the code itself always comes back from the server.
const KEY = "vcampro:purchase";
const SESSION_RE = /^cs_[A-Za-z0-9_]+$/;

export function savePurchase(sessionId: string): void {
  if (!SESSION_RE.test(sessionId)) return;
  try {
    localStorage.setItem(KEY, sessionId);
  } catch {
    /* storage refused (private mode): nothing to remember */
  }
}

export function readPurchase(): string | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && SESSION_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPurchase(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
