const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export function splitPhoneSegments(phone) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return [];

  return trimmed
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Strip spaces and dashes from a single segment; keep optional leading +.
 */
export function normalizePhoneSegment(phone) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = (hasPlus ? trimmed.slice(1) : trimmed).replace(/[\s-]/g, "");
  if (!digits) return "";

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize phone value; supports comma-separated multiple numbers.
 */
export function normalizePhone(phone) {
  const segments = splitPhoneSegments(phone);
  if (!segments.length) return "";

  const normalized = segments
    .map((segment) => normalizePhoneSegment(segment))
    .filter(Boolean);

  return normalized.join(",");
}

export function isValidPhoneSegment(phone) {
  const normalized = normalizePhoneSegment(phone);
  if (!normalized) return false;

  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  if (!/^\d+$/.test(digits)) return false;

  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}

export function isValidPhone(phone) {
  const segments = splitPhoneSegments(phone);
  if (!segments.length) return false;

  return segments.some((segment) => isValidPhoneSegment(segment));
}

/**
 * Normalized, dialable segments from a phone field (comma/semicolon separated).
 * Invalid segments are dropped; duplicates removed.
 */
export function listDialablePhones(phone) {
  const seen = new Set();
  const result = [];

  for (const segment of splitPhoneSegments(phone)) {
    const normalized = normalizePhoneSegment(segment);
    if (!normalized || !isValidPhoneSegment(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

/** `tel:` href for a single normalized segment. */
export function toTelHref(phone) {
  const normalized = normalizePhoneSegment(phone);
  if (!normalized || !isValidPhoneSegment(normalized)) {
    return null;
  }

  return `tel:${normalized}`;
}

export function phoneValidationMessage(phone, { required = false } = {}) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) {
    return required ? "Phone number is required." : "";
  }
  if (!isValidPhone(trimmed)) {
    return "Enter a valid phone number (7–15 digits per number; separate multiple with commas).";
  }
  return "";
}
