/** Whole-number fee strings for form inputs (MMK, no decimals). */
export function formatFeeInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value).trim();
  return String(Math.round(n));
}
