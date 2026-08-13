/**
 * Format numeric amounts stored as Myanmar Kyats — display suffix "K", not MMK.
 */
export function formatKyats(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const n = Number(value);
  return `${n.toLocaleString("en-US")} K`;
}
