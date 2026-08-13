export const JOURNAL_ENTRY_CATEGORIES = {
  income: "income",
  expense: "expense",
  transfer: "transfer",
};

const SOURCE_TYPE_MAP = {
  invoice: "income",
  other_income: "income",
  expense: "expense",
  supplier_payable: "expense",
  payable_transaction: "expense",
  asset_depreciation: "expense",
  fixed_asset: "expense",
  payment_transaction: "transfer",
  journal_entry: "transfer",
};

export function normalizeSourceType(sourceType) {
  if (!sourceType) return "";
  let base = String(sourceType);
  for (const suffix of ["_reversal", "_void"]) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
    }
  }
  return base;
}

export function resolveJournalEntryCategory(entry) {
  const baseType = normalizeSourceType(entry?.source_type);
  if (baseType === "manual") {
    return resolveFromManualLines(entry?.lines ?? []);
  }
  if (baseType === "inventory_adjustment") {
    return resolveInventoryAdjustmentCategory(entry?.lines ?? []);
  }
  return SOURCE_TYPE_MAP[baseType] ?? JOURNAL_ENTRY_CATEGORIES.transfer;
}

function resolveInventoryAdjustmentCategory(lines) {
  for (const line of lines) {
    if (line.voided_at) continue;
    if (line.account?.type === "income" && Number(line.credit) > 0) {
      return JOURNAL_ENTRY_CATEGORIES.income;
    }
  }
  return JOURNAL_ENTRY_CATEGORIES.expense;
}

function resolveFromManualLines(lines) {
  for (const line of lines) {
    if (line.voided_at) continue;
    if (line.account?.type === "income" && Number(line.credit) > 0) {
      return JOURNAL_ENTRY_CATEGORIES.income;
    }
  }
  for (const line of lines) {
    if (line.voided_at) continue;
    if (line.account?.type === "expense" && Number(line.debit) > 0) {
      return JOURNAL_ENTRY_CATEGORIES.expense;
    }
  }
  return JOURNAL_ENTRY_CATEGORIES.transfer;
}

export function journalEntryCategoryLabel(category) {
  switch (category) {
    case JOURNAL_ENTRY_CATEGORIES.income:
      return "Income";
    case JOURNAL_ENTRY_CATEGORIES.expense:
      return "Expense";
    case JOURNAL_ENTRY_CATEGORIES.transfer:
      return "Transfer";
    default:
      return category ? String(category) : "—";
  }
}

export const ENTRY_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];
