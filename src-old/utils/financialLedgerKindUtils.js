/** Canonical `ledger_kind` order for grouped selects (labels match clinic wording). */
export const LEDGER_KIND_SELECT_ORDER = [
  "cash",
  "transfer",
  "e-wallet",
  "card",
  "other",
];

const LEDGER_KIND_GROUP_LABELS = {
  cash: "Cash",
  transfer: "Bank",
  "e-wallet": "E-wallet",
  card: "Card",
  other: "Other",
};

export function ledgerKindGroupLabel(kind) {
  return LEDGER_KIND_GROUP_LABELS[kind] ?? kind;
}

/**
 * @param {Array<{ id: number, name?: string, ledger_kind?: string, status?: string, bank_name?: string | null, account_or_phone?: string | null }>} methods
 * @returns {Array<{ kind: string, label: string, methods: typeof methods }>}
 */
export function groupedTransactionMethodsForSelect(methods) {
  const list = Array.isArray(methods) ? methods : [];
  const byKind = {};
  for (const m of list) {
    const k = m.ledger_kind || "other";
    if (!byKind[k]) {
      byKind[k] = [];
    }
    byKind[k].push(m);
  }
  for (const k of Object.keys(byKind)) {
    byKind[k].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
  }

  const out = [];
  for (const kind of LEDGER_KIND_SELECT_ORDER) {
    if (byKind[kind]?.length) {
      out.push({
        kind,
        label: ledgerKindGroupLabel(kind),
        methods: byKind[kind],
      });
    }
  }
  for (const kind of Object.keys(byKind)) {
    if (!LEDGER_KIND_SELECT_ORDER.includes(kind) && byKind[kind]?.length) {
      out.push({
        kind,
        label: ledgerKindGroupLabel(kind),
        methods: byKind[kind],
      });
    }
  }
  return out;
}
