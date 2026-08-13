export const COA_TYPE_GROUPS = [
  { key: "asset", label: "Asset" },
  { key: "liability", label: "Liability" },
  { key: "equity", label: "Equity" },
  { key: "income", label: "Revenue" },
  { key: "expense", label: "Expense" },
];

export const COA_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  ...COA_TYPE_GROUPS.map((g) => ({ value: g.key, label: g.label })),
];

export function coaTypeLabel(type) {
  const found = COA_TYPE_GROUPS.find((g) => g.key === type);
  return found?.label ?? type ?? "—";
}

export const ACCOUNT_TYPES_DIALOG = COA_TYPE_GROUPS.map((g) => ({
  value: g.key,
  label: g.label,
}));
