import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { formatKyats } from "./formatKyats";
import { parseCommaAmount } from "./amountInputUtils";

dayjs.extend(customParseFormat);

export const formatReceiptMoney = (value) => {
  const n = parseCommaAmount(value);
  return formatKyats(Number.isFinite(n) ? n : 0);
};

function formatHm12(hm) {
  const raw = String(hm || "").trim();
  if (!raw) return "";
  const parsed = dayjs(raw, "HH:mm", true);
  if (!parsed.isValid()) return raw;
  return parsed.format("h:mm A");
}

/** Voucher print line: `Open Daily : From 9:00 AM to 6:00 PM` */
export function formatInvoiceOpeningHours(settings) {
  const start = settings?.appointment_hours_start ?? "09:00";
  const end = settings?.appointment_hours_end ?? "18:00";
  return `Open Daily : From ${formatHm12(start)} to ${formatHm12(end)}`;
}

/** Invoice / voucher print date — DD-MM-YYYY HH:mm */
export function formatInvoicePrintDate(payment) {
  if (payment?.created_at) {
    return dayjs(payment.created_at).format("DD-MM-YYYY HH:mm");
  }
  return dayjs().format("DD-MM-YYYY HH:mm");
}

export function resolveInvoiceSalesPersonName(payment) {
  const name = payment?.visit?.check_in_staff?.name;
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || "—";
}

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
  const parsedUnit = parseCommaAmount(line?.unit_price);
  const unit = Number.isFinite(parsedUnit) ? parsedUnit : 0;
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
  const parsedUnit = parseCommaAmount(line?.unit_price);
  const unitPrice = Number.isFinite(parsedUnit) ? parsedUnit : 0;
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
