import { formatSessionQtyDisplay } from "./inventoryUnitsCopy";

export function isSessionProductOutOfStock(line) {
  if (!line) return false;
  if (line.is_out_of_stock === true || line.isOutOfStock === true) return true;

  const required = Number(line.quantity ?? 0);
  if (!(required > 0)) return false;

  const effective = Number(
    line.effective_available_quantity ?? line.effectiveAvailableQuantity ?? NaN,
  );
  if (Number.isFinite(effective)) {
    return effective <= 0;
  }

  const reserved = Number(line.reserved_quantity ?? line.reservedQuantity ?? 0);
  const available = Number(line.available_quantity ?? line.availableQuantity ?? 0);
  return reserved <= 0 && available <= 0;
}

export function getTreatmentStockWarnings(treatment) {
  if (!treatment) return [];
  const topLevel = treatment.stock_warnings ?? treatment.stockWarnings;
  if (Array.isArray(topLevel) && topLevel.length > 0) {
    return topLevel;
  }

  const lines = treatment.session_products ?? treatment.sessionProducts ?? [];
  if (!Array.isArray(lines)) return [];

  return lines
    .map((line) => {
      const shortage = Number(line.stock_shortage ?? line.stockShortage ?? 0);
      if (!(shortage > 0)) return null;
      const product = line.product ?? {};
      return {
        product_id: line.product_id ?? product.id,
        product_name: product.name ?? "Product",
        required_quantity: Number(line.quantity ?? 0),
        reserved_quantity: Number(line.reserved_quantity ?? line.reservedQuantity ?? 0),
        shortage_quantity: shortage,
        unit: product.use_unit_name ?? product.unit ?? null,
        session_product_id: line.id,
      };
    })
    .filter(Boolean);
}

export function treatmentHasStockShortage(treatment) {
  return getTreatmentStockWarnings(treatment).length > 0;
}

export function formatStockWarningSummary(warnings) {
  const list = Array.isArray(warnings) ? warnings : [];
  if (list.length === 0) return "";
  if (list.length === 1) {
    const row = list[0];
    const qty = formatStockWarningQty(row);
    return `${row.product_name}${qty ? ` (${qty} short)` : " is out of stock"}`;
  }
  return `${list.length} products are short on stock`;
}

export function formatStockWarningDetail(warning) {
  if (!warning) return "";
  const qty = formatStockWarningQty(warning);
  if (qty) {
    return `${warning.product_name}: need ${qty}, not enough in stock`;
  }
  return `${warning.product_name}: not enough in stock`;
}

export function formatStockWarningQty(warning) {
  const shortage = Number(warning.shortage_quantity ?? 0);
  if (!(shortage > 0)) return "";
  const unit = warning.unit ?? null;
  return formatSessionQtyDisplay(shortage, unit ? { use_unit_name: unit } : null);
}
