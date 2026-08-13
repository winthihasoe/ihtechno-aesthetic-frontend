/** Strip grouping commas and parse a numeric amount (NaN if empty/invalid). */
export function parseCommaAmount(str) {
  if (str === null || str === undefined) return NaN;
  const cleaned = String(str).replace(/,/g, "").trim();
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Format a finite number with comma grouping (e.g. 100000 → "100,000"). */
export function formatCommaAmountFromNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

/**
 * Normalizes raw keyboard/paste input into a comma-grouped display string.
 * Allows digits and at most one decimal point (up to 2 fractional digits).
 */
export function sanitizeCommaAmountInput(raw) {
  let s = String(raw ?? "").replace(/,/g, "");
  s = s.replace(/[^\d.]/g, "");
  const parts = s.split(".");
  const intRaw = parts[0] ?? "";
  const fracJoined = parts.slice(1).join("");
  const intFmt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts.length <= 1) return intFmt;
  return `${intFmt}.${fracJoined.slice(0, 2)}`;
}
