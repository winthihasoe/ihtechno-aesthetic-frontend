/** Whether the consultation fee is charged on the invoice (not FOC / waived). */
export function isConsultationFeeApplied({ session_fee_enabled, session_fee_foc } = {}) {
  const enabled = session_fee_enabled ?? true;
  const foc = session_fee_foc ?? false;
  return enabled && !foc;
}

/** Map API consultation fee flags to a single UI "apply fee" toggle. */
export function hydrateConsultationFeeApplyFlag(consultation) {
  return isConsultationFeeApplied(consultation ?? {});
}

/** Persist apply toggle as invoice flags: off = FOC (100% waived on invoice). */
export function serializeConsultationFeeFlags(form) {
  const apply = Boolean(form?.session_fee_enabled);
  return {
    session_fee_enabled: apply,
    session_fee_foc: !apply,
  };
}

export function computeConsultationFeeTotal(form) {
  if (!isConsultationFeeApplied(form)) {
    return 0;
  }
  const base = Number(form?.session_fee_amount || 0);
  const discount = Math.max(
    0,
    Math.min(100, Number(form?.session_discount_percent || 0)),
  );
  return Math.max(0, Math.round(base * (1 - discount / 100)));
}
