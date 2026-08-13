const LEGACY_CANCEL_LABELS = {
  clinic_closed_no_show: "Clinic closed — no show",
  clinic_closed_incomplete_consult: "Clinic closed — incomplete consultation",
};

const MANUAL_CARRYOVER_PREFIX = "manual_carryover_cancel:";

/**
 * Parse visits.cancel_reason into staff-facing labels.
 * @returns {{ source: string, reason: string, note: string | null } | null}
 */
export function parseVisitCancelReason(cancelReason) {
  const raw = String(cancelReason ?? "").trim();
  if (!raw) return null;

  if (LEGACY_CANCEL_LABELS[raw]) {
    return {
      source: "Overnight close",
      reason: LEGACY_CANCEL_LABELS[raw],
      note: null,
    };
  }

  if (raw.startsWith(MANUAL_CARRYOVER_PREFIX)) {
    const remainder = raw.slice(MANUAL_CARRYOVER_PREFIX.length).trim();
    const noteSeparator = " — ";
    const separatorIndex = remainder.indexOf(noteSeparator);
    if (separatorIndex >= 0) {
      return {
        source: "Carryover cancel",
        reason: remainder.slice(0, separatorIndex).trim() || "—",
        note: remainder.slice(separatorIndex + noteSeparator.length).trim() || null,
      };
    }

    return {
      source: "Carryover cancel",
      reason: remainder || "—",
      note: null,
    };
  }

  return {
    source: "Visit cancelled",
    reason: raw,
    note: null,
  };
}

export function formatVisitCancelledAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
