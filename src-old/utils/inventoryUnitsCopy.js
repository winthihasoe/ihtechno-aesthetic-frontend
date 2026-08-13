/** Staff-facing labels for inventory units (never expose DB field names). */

export const COPY = {
  sameUnitCheckbox: "Same unit for buying and using",
  stockUnitLabel: "When buying / receiving",
  baseUnitLabel: "When using in treatment",
  amountPerPack: "Amount per pack",
  packPreview: (stockUnit, factor, useUnit) =>
    `1 ${stockUnit} = ${factor} ${useUnit}`,
  minStockHelper: (useUnit) =>
    `Counted in ${useUnit} (e.g. total across all packs on hand).`,
  minStockLabel: "Minimum on hand",
  packNoteLabel: "Label on packaging (optional)",
  purchaseQty: (stockUnit) => `Qty (${stockUnit})`,
  purchaseAdds: (baseQty, useUnit) => `Adds ${baseQty} ${useUnit} to stock`,
  sessionQty: (useUnit) => `Qty (${useUnit})`,
  usedQty: (useUnit) => `Used (${useUnit})`,
  onHand: "On hand",
  openVialSection: "Opened vials / partial use",
  trackOpenSwitch: "Track opened vials (e.g. Botox, partial syringes)",
  openUseByHours: "Discard open vial after (hours)",
  openUseByHelper:
    "After opening, remaining amount must be used or will be wasted when time is up.",
  openOnHandAlert: (qty, useUnit, expiresAt) =>
    `Open vial on hand: ${qty} ${useUnit}${expiresAt ? ` — use before ${expiresAt}` : ""}`,
  wastageTitle: "Record wasted product",
  wastageQty: (useUnit) => `Quantity (${useUnit})`,
  wastageReasons: {
    open_expired: "Open vial expired",
    spillage: "Spillage",
    single_use_remainder: "Leftover discarded",
    other: "Other",
  },
  adjustmentWriteOffReasons: {
    expired: "Expired",
    loss_damage: "Loss / damage",
    office_use: "Office / internal use",
  },
  adjustmentWriteOffReasonLabel: "Write-off reason",
};

export function productPickerSubtitle(product) {
  if (!product?.uses_pack_conversion) return product?.name ?? "";
  const stock = product.stock_unit_name ?? product.unit ?? "pack";
  const use = product.use_unit_name ?? product.unit ?? "unit";
  const factor = product.base_per_stock_unit ?? 1;
  return `${product.name} · 1 ${stock} = ${factor} ${use}`;
}

export function allowsFractionalQty(product) {
  return Boolean(
    product?.track_open_units || product?.uses_pack_conversion,
  );
}

export function parseSessionQty(value, product) {
  const raw = parseFloat(String(value));
  const min = allowsFractionalQty(product) ? 0.001 : 1;
  const step = allowsFractionalQty(product) ? 0.001 : 1;
  let q = Number.isFinite(raw) ? raw : min;
  q = Math.max(min, q);
  if (!allowsFractionalQty(product)) {
    q = Math.round(q);
  } else {
    q = Math.round(q / step) * step;
    q = Math.round(q * 1000) / 1000;
  }
  return q;
}

/** Display qty without trailing zeros for whole numbers (e.g. 1 not 1.000). */
export function formatSessionQtyDisplay(value, product) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (!allowsFractionalQty(product)) {
    return String(Math.round(n));
  }
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}
