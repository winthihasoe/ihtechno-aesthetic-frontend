import {
  computeLineTotal,
  migrateConsultationLegacyDiscount,
} from "./invoiceReceiptUtils";
import {
  DRAFT_REFRESHABLE_PAYMENT_STATUSES,
  PAYABLE_PAYMENT_STATUSES,
} from "./paymentDetailConstants";

export const isDraftRefreshablePaymentStatus = (status) =>
  DRAFT_REFRESHABLE_PAYMENT_STATUSES.has(String(status || "").toLowerCase());

export const isPayablePaymentStatus = (status) =>
  PAYABLE_PAYMENT_STATUSES.has(String(status || "").toLowerCase());

export const isInvoiceTerminalStatus = (status) =>
  ["paid", "void"].includes(String(status || "").toLowerCase());

/** Open preview dialog (read-only collect for paid; no re-issue). */
export const isInvoicePreviewOpenStatus = (status) =>
  ["issued", "partial", "unpaid", "paid"].includes(
    String(status || "").toLowerCase(),
  );

export const normalizePaymentLines = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.map((item) => ({
      type: item?.type || "other",
      label: item?.label || item?.name || "",
      qty: Number(item?.qty ?? 1),
      unit_price: Number(item?.unit_price ?? item?.price ?? 0),
      line_total: Number(item?.line_total ?? item?.price ?? 0),
      meta: item?.meta || {},
    }));
  }
  if (!Array.isArray(items.lines)) return [];
  return items.lines.map((line) => {
    const qty = Number(line?.qty ?? 1);
    const unitPrice = Number(line?.unit_price ?? line?.line_total ?? 0);
    const type = line?.type || "other";
    const base = {
      ...line,
      type,
      label: line?.label || line?.name || "",
      qty,
      unit_price: unitPrice,
      discount_type: line?.discount_type || "none",
      discount_value: Number(line?.discount_value || 0),
      discount_percent: Number(line?.discount_percent ?? 0),
      foc: Boolean(line?.foc),
      session_fee_enabled: line?.session_fee_enabled !== false,
      meta: line?.meta || {},
    };
    if (type === "package_discount") {
      base.unit_price = 0;
      base.line_total = 0;
      return base;
    }
    const withLegacy =
      type === "consultation" ? migrateConsultationLegacyDiscount(base) : base;
    return {
      ...withLegacy,
      line_total: computeLineTotal(withLegacy),
    };
  });
};

export const normalizeOrderDiscount = (items) => ({
  type: items?.order_discount?.type || "none",
  value: Number(items?.order_discount?.value || 0),
});

export const lineDefaultLabelByType = (type) => {
  switch (type) {
    case "consultation":
      return "Consultation fee";
    case "treatment":
      return "Treatment";
    case "package":
      return "Package";
    case "product":
      return "Product";
    case "prescription":
      return "Prescribed medicine";
    case "lab":
      return "Lab test";
    default:
      return "Other";
  }
};

export const computeTotalsFromLines = (lines = []) => {
  const totals = {
    consultation: 0,
    treatment: 0,
    product: 0,
    prescription: 0,
    lab: 0,
    package_discount: 0,
    package: 0,
    other: 0,
    grand: 0,
  };

  lines.forEach((line) => {
    const value = computeLineTotal(line);
    const type = String(line?.type || "other");
    if (Object.hasOwn(totals, type) && type !== "grand") {
      totals[type] += value;
      return;
    }
    totals.other += value;
  });

  totals.grand =
    totals.consultation +
    totals.treatment +
    totals.product +
    totals.prescription +
    totals.lab +
    totals.package_discount +
    totals.package +
    totals.other;

  return totals;
};

export const applyOrderDiscountToTotals = (totals, orderDiscount) => {
  const subtotal = Number(totals.grand || 0);
  const type = orderDiscount?.type || "none";
  const value = Number(orderDiscount?.value || 0);
  let discountAmount = 0;
  if (type === "percent") {
    discountAmount = Number(
      ((subtotal * Math.max(0, Math.min(100, value))) / 100).toFixed(2),
    );
  } else if (type === "fixed") {
    discountAmount = Number(Math.max(0, Math.min(subtotal, value)).toFixed(2));
  }
  return {
    ...totals,
    subtotal_before_order_discount: subtotal,
    order_discount: discountAmount,
    grand: Number(Math.max(0, subtotal - discountAmount).toFixed(2)),
  };
};

/**
 * Mirrors backend FinancialService::initializeInvoiceTotals VAT resolution:
 * explicit payment.tax_percentage wins; otherwise when settings.vat_enabled,
 * use settings.default_vat_percent.
 *
 * @param {object|null|undefined} payment
 * @param {object|null|undefined} settings
 */
export const resolveEffectiveVatPercent = (payment, settings) => {
  const fromPayment = Number(payment?.tax_percentage ?? 0);
  if (fromPayment > 0) {
    return Math.min(100, Math.max(0, fromPayment));
  }
  if (settings?.vat_enabled) {
    return Math.min(100, Math.max(0, Number(settings?.default_vat_percent ?? 0)));
  }
  return 0;
};

/**
 * @param {object} totalsAfterOrderDiscount - from applyOrderDiscountToTotals; `grand` is net before VAT
 * @param {number} vatPercent
 * @returns {object} adds net_before_tax, tax, tax_percent; `grand` becomes net + tax (invoice total)
 */
export const applyVatToTotals = (totalsAfterOrderDiscount, vatPercent) => {
  const net = Number(totalsAfterOrderDiscount.grand || 0);
  const pct = Math.min(100, Math.max(0, Number(vatPercent || 0)));
  const tax = pct > 0 ? Number(((net * pct) / 100).toFixed(2)) : 0;
  const grand = Number((net + tax).toFixed(2));
  return {
    ...totalsAfterOrderDiscount,
    net_before_tax: net,
    tax,
    tax_percent: pct,
    grand,
  };
};

export const canEditLineDiscount = (line = {}) => {
  const type = String(line?.type || "other");
  return type !== "package_discount";
};

export function stripMetaKeys(meta, keys) {
  const m = { ...(meta || {}) };
  keys.forEach((k) => {
    delete m[k];
  });
  return m;
}

/** Balance still owed before the next collection (prefers API `balance`, then invoice total). */
export const invoiceAmountDueBeforeNextPayment = (payment, totalsGrand = 0) => {
  // Do not treat null/undefined as 0 (Number(null) === 0 would block full payment).
  if (payment?.balance != null && payment.balance !== "") {
    const balance = Number(payment.balance);
    if (Number.isFinite(balance) && balance >= 0) {
      return balance;
    }
  }
  if (payment?.total_amount != null && payment.total_amount !== "") {
    const total = Number(payment.total_amount);
    const paid = Number(payment?.paid_amount ?? 0);
    if (Number.isFinite(total) && total > 0) {
      return Math.max(0, total - (Number.isFinite(paid) ? paid : 0));
    }
  }
  return Number(totalsGrand || payment?.amount || 0);
};

/**
 * Amount to post as a new payment_transactions row (never replaces prior rows).
 * - full: entire amount still due (new invoice or final settlement on partial)
 * - partial: user-entered amount only
 */
export const resolvePaymentCollectionAmount = ({
  paymentCollectionMode,
  partialPaymentAmount,
  payment,
  totalsGrand = 0,
}) => {
  const amountDue = invoiceAmountDueBeforeNextPayment(payment, totalsGrand);
  const mode = paymentCollectionMode === "partial" ? "partial" : "full";

  if (mode === "partial") {
    const amount = Number(partialPaymentAmount);
    if (!(amount > 0)) {
      return { ok: false, reason: "partial_empty", amountDue };
    }
    if (amount > amountDue + 0.005) {
      return { ok: false, reason: "exceeds_balance", amountDue, amount };
    }
    return { ok: true, mode, amount, amountDue };
  }

  const amount = amountDue;
  if (!(amount > 0)) {
    return { ok: false, reason: "nothing_due", amountDue };
  }
  return { ok: true, mode: "full", amount, amountDue };
};

/** Display name for invoice customer (standalone, visit-linked, or draft override). */
export const resolvePaymentCustomerName = (payment, customerNameOverride = "") => {
  const override = String(customerNameOverride || "").trim();
  if (override) return override;
  return (
    String(payment?.customer_name || "").trim() ||
    String(payment?.visit?.patient?.name || "").trim() ||
    String(payment?.patient?.name || "").trim()
  );
};
