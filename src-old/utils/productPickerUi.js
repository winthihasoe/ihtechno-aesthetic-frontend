export function isPickerProductOutOfStock(product) {
  if (!product) return false;
  const status = product.stock_status ?? product.stockStatus;
  if (status === "out") return true;

  const available = Number(
    product.available_base_stock ?? product.availableBaseStock ?? NaN,
  );
  if (Number.isFinite(available)) return available <= 0;

  const total = Number(product.total_base_stock ?? product.totalBaseStock ?? NaN);
  const reserved = Number(
    product.reserved_base_stock ?? product.reservedBaseStock ?? 0,
  );
  if (Number.isFinite(total)) return total - reserved <= 0;

  return false;
}
