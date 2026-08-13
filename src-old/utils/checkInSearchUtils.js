import { normalizePhone } from "./phoneUtils";

/**
 * Treat as phone lookup when the query is only digits (optional leading +) and long enough for exact match.
 */
export function isPhoneQueryInput(q) {
  const s = normalizePhone(q);
  if (s.length < 6) return false;
  return /^\+?\d+$/.test(s);
}

export function normalizePhoneQuery(q) {
  return normalizePhone(q);
}
