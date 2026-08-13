import { formatKyats } from "./formatKyats";

export const formatReceiptMoney = (value) => formatKyats(Number(value || 0));

/** Strip internal audit-only suffixes from labels on printed / customer-facing invoice. */
export const labelForPrintedInvoice = (line) => {
  let s = String(line?.label || "").trim();
  if (!s) return "-";
  s = s.replace(/\s*\(Applied by cashier\)/gi, "").trim();
  return s || "-";
};

export const migrateConsultationLegacyDiscount = (line) => {
  if (line.type !== "consultation") return line;
  const dt = String(line.discount_type || "none").toLowerCase();
  if (dt !== "none") return line;
  const dv = Number(line.discount_value || 0);
  if (dv > 0) return line;
  if (line.foc || line.session_fee_enabled === false) {
    return { ...line, discount_type: "percent", discount_value: 100 };
  }
  const dp = Number(line.discount_percent || 0);
  if (dp > 0) {
    return {
      ...line,
      discount_type: "percent",
      discount_value: Math.max(0, Math.min(100, dp)),
    };
  }
  return line;
};

export const computeLineSubtotalBeforeDiscount = (line = {}) => {
  const type = String(line?.type || "other");
  if (type === "package_discount") return 0;
  const qty = Number(line?.qty ?? 1);
  const unit = Number(line?.unit_price || 0);
  return Number((qty * unit).toFixed(2));
};

export const formatRowDiscountCaption = (line) => {
  const t = line.discount_type || "none";
  if (t === "none") return "";
  const v = Number(line.discount_value || 0);
  if (t === "percent") return `${v}%`;
  return formatReceiptMoney(v);
};

export const computeLineTotal = (line = {}) => {
  const type = String(line?.type || "other");
  const unitPrice = Number(line?.unit_price || 0);
  const qty = Number(line?.qty ?? 1);

  if (type === "package_discount") {
    return 0;
  }

  const lineSubtotal = Number((qty * unitPrice).toFixed(2));
  const discountType = line?.discount_type || "none";
  const discountValue = Number(line?.discount_value || 0);
  let lineDiscount = 0;
  if (discountType === "percent") {
    lineDiscount = Number(
      (
        (lineSubtotal * Math.max(0, Math.min(100, discountValue))) /
        100
      ).toFixed(2),
    );
  } else if (discountType === "fixed") {
    lineDiscount = Number(
      Math.max(0, Math.min(lineSubtotal, discountValue)).toFixed(2),
    );
  }
  return Number((lineSubtotal - lineDiscount).toFixed(2));
};

export const computeRowDiscountTaken = (line = {}) => {
  const type = String(line?.type || "other");
  if (type === "package_discount") return 0;
  const sub = computeLineSubtotalBeforeDiscount(line);
  const total = computeLineTotal(line);
  return Math.max(0, Number((sub - total).toFixed(2)));
};
