import dayjs from "dayjs";

/** @typedef {'reference' | 'sourceId' | 'row'} FinanceHighlightColumn */

/**
 * @typedef {Object} FinanceHighlightState
 * @property {string} sourceType
 * @property {number} sourceId
 * @property {FinanceHighlightColumn} [highlightColumn]
 * @property {number} [payableId]
 * @property {string} [anchorDate] YYYY-MM-DD — used to widen list filters on target page
 */

export function rolePrefixFromPathname(pathname) {
  const segment = pathname?.split("/")?.[1];
  return segment ? `/${segment}` : "";
}

export function normalizeJournalSourceType(sourceType) {
  if (!sourceType) return "";
  let base = String(sourceType);
  for (const suffix of ["_reversal", "_void"]) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
    }
  }
  return base;
}

const SOURCE_TYPE_LABELS = {
  invoice: "Invoice",
  payment_transaction: "Payment collection",
  expense: "Expense",
  prepaid_expense: "Prepaid expense payment",
  other_income: "Other income",
  supplier_payable: "Supplier payable",
  payable_transaction: "Supplier payment",
  payroll_month_accrual: "Payroll accrual",
  payroll_payment: "Payroll payment",
  journal_entry: "Manual journal",
  manual: "Manual journal",
  inventory_adjustment: "Inventory adjustment",
};

export function journalSourceTypeLabel(sourceType) {
  const base = normalizeJournalSourceType(sourceType);
  return SOURCE_TYPE_LABELS[base] ?? base.replace(/_/g, " ");
}

/**
 * Build navigation target for a journal entry source.
 *
 * @param {string} rolePrefix e.g. `/owner`
 * @param {object} entry journal entry row from API
 * @returns {{ path: string, state: { financeHighlight: FinanceHighlightState, financeFilters?: Record<string, string> } } | null}
 */
/** Month bounds for accounting-queue API from an anchor day. */
export function monthDateFiltersForAnchor(anchorDate) {
  if (!anchorDate) return null;
  const anchor = dayjs(anchorDate);
  if (!anchor.isValid()) return null;
  return {
    date_from: anchor.startOf("month").format("YYYY-MM-DD"),
    date_to: anchor.endOf("month").format("YYYY-MM-DD"),
  };
}

/** Wider range when the billing event is outside the journal posting month. */
export function widenedDateFiltersForAnchor(anchorDate, monthsEachSide = 6) {
  if (!anchorDate) return null;
  const anchor = dayjs(anchorDate);
  if (!anchor.isValid()) return null;
  return {
    date_from: anchor
      .subtract(monthsEachSide, "month")
      .startOf("month")
      .format("YYYY-MM-DD"),
    date_to: anchor
      .add(monthsEachSide, "month")
      .endOf("month")
      .format("YYYY-MM-DD"),
  };
}

export function expensesPathForRole(rolePrefix, pathname = "") {
  if (String(pathname).includes("/transactions/")) {
    return `${rolePrefix}/transactions/expenses`;
  }
  return `${rolePrefix}/finance/expenses`;
}

/**
 * @param {object} [options]
 * @param {FinanceHighlightColumn} [options.highlightColumn]
 */
export function buildJournalSourceNavigation(
  rolePrefix,
  entry,
  pathname = "",
  options = {},
) {
  const sourceType = normalizeJournalSourceType(entry?.source_type);
  const sourceId = Number(entry?.source_id);
  if (!sourceType || !Number.isFinite(sourceId) || sourceId <= 0) {
    return null;
  }

  const anchorRaw = entry?.source_event_date ?? entry?.journal_date;
  const anchorDate = anchorRaw
    ? dayjs(anchorRaw).format("YYYY-MM-DD")
    : undefined;
  const dateFilters = monthDateFiltersForAnchor(anchorDate) ?? undefined;

  const highlightColumn =
    options.highlightColumn === "sourceId" ? "sourceId" : "reference";

  const targetMonth = anchorDate
    ? dayjs(anchorDate).format("YYYY-MM")
    : undefined;

  const highlight = {
    sourceType,
    sourceId,
    highlightColumn,
    anchorDate,
    targetMonth,
    payableId: entry?.source_payable_id
      ? Number(entry.source_payable_id)
      : undefined,
  };

  if (
    sourceType === "invoice" ||
    sourceType === "payment_transaction" ||
    sourceType === "expense" ||
    sourceType === "prepaid_expense" ||
    sourceType === "other_income" ||
    sourceType === "payable_transaction"
  ) {
    const highlightState = {
      ...highlight,
      payableId:
        sourceType === "payable_transaction"
          ? (entry?.source_payable_id
              ? Number(entry.source_payable_id)
              : highlight.payableId)
          : highlight.payableId,
    };

    return {
      path: `${rolePrefix}/finance/transactions`,
      state: {
        financeHighlight: highlightState,
        financeFilters: dateFilters,
        financeContextMonth: options.contextMonth ?? undefined,
      },
    };
  }

  if (sourceType === "supplier_payable") {
    return {
      path: `${rolePrefix}/transactions/payables/${sourceId}`,
      state: {
        financeHighlight: {
          ...highlight,
          highlightColumn:
            highlightColumn === "sourceId" ? "sourceId" : "reference",
        },
      },
    };
  }

  if (sourceType === "payroll_month_accrual") {
    return {
      path: `${rolePrefix}/finance/payroll-statement-inputs`,
      state: { payrollMonth: targetMonth },
    };
  }

  if (sourceType === "payroll_payment") {
    return {
      path: `${rolePrefix}/finance/transactions`,
      state: {
        financeHighlight: highlight,
        financeFilters: dateFilters,
        financeContextMonth: options.contextMonth ?? undefined,
      },
    };
  }

  return null;
}

/** True when billing month differs from the month the user was viewing. */
export function isCrossMonthSourceNavigation(contextMonth, targetMonth) {
  if (!contextMonth || !targetMonth) return false;
  return contextMonth !== targetMonth;
}

const financeIsolatedHighlightSx = {
  bgcolor: "warning.light",
  color: "warning.dark",
  fontWeight: 700,
};

export function financeHighlightCellSx(active, options = {}) {
  if (!active) return undefined;
  if (options.isolated) {
    return financeIsolatedHighlightSx;
  }
  return {
    bgcolor: "warning.main",
    color: "warning.contrastText",
    boxShadow: (theme) => `0 0 0 2px ${theme.palette.warning.light}`,
    transition:
      "background-color 0.4s ease, color 0.4s ease, box-shadow 0.4s ease",
    animation: "financeHighlightPulse 2.2s ease-out",
    "@keyframes financeHighlightPulse": {
      "0%": {
        bgcolor: "warning.main",
        boxShadow: (theme) => `0 0 0 3px ${theme.palette.warning.light}`,
      },
      "70%": {
        bgcolor: "warning.light",
        color: "warning.dark",
      },
      "100%": {
        bgcolor: "transparent",
        color: "inherit",
        boxShadow: "none",
      },
    },
  };
}

export function matchesFinanceHighlight(row, highlight) {
  if (!highlight?.sourceType || !highlight?.sourceId) return false;
  const type = normalizeJournalSourceType(
    row?.source_type ?? highlight.sourceType,
  );
  const targetType = normalizeJournalSourceType(highlight.sourceType);
  if (type !== targetType) return false;

  const rowSourceId = Number(row?.source_id ?? row?.id);
  return rowSourceId === Number(highlight.sourceId);
}

export function matchesExpenseHighlight(row, highlight) {
  if (!highlight?.sourceId) return false;
  return Number(row?.id) === Number(highlight.sourceId);
}

export function matchesOtherIncomeHighlight(row, highlight) {
  if (!highlight?.sourceId) return false;
  return Number(row?.id) === Number(highlight.sourceId);
}

export function matchesPayableTransactionHighlight(txn, highlight) {
  if (!highlight?.sourceId) return false;
  return Number(txn?.id) === Number(highlight.sourceId);
}

/** Source types that show draft preview and can be posted from the Transactions page. */
export const ACCOUNTING_QUEUE_POSTABLE_TYPES = new Set([
  "invoice",
  "payment_transaction",
  "purchase",
  "payable_transaction",
  "supplier_payable",
  "supplier_return",
  "staff_deposit_transaction",
  "expense",
  "prepaid_expense",
  "other_income",
  "payroll_month_accrual",
  "payroll_payment",
]);

const TRANSACTIONS_POSTABLE_TYPES = ACCOUNTING_QUEUE_POSTABLE_TYPES;

/**
 * Open the detail screen for a row on the finance Transactions page.
 *
 * @param {string} rolePrefix
 * @param {object} row accounting-queue row
 * @param {string} [pathname]
 * @returns {{ path: string, state?: object } | null}
 */
export function buildTransactionDetailNavigation(rolePrefix, row, pathname = "") {
  const sourceType = normalizeJournalSourceType(row?.source_type);
  const sourceId = Number(row?.source_id);
  if (!sourceType || !Number.isFinite(sourceId) || sourceId <= 0) {
    return null;
  }

  const anchorDate = row?.event_date
    ? dayjs(row.event_date).format("YYYY-MM-DD")
    : undefined;

  const highlight = {
    sourceType,
    sourceId,
    highlightColumn: "reference",
    anchorDate,
    targetMonth: anchorDate ? dayjs(anchorDate).format("YYYY-MM") : undefined,
    payableId: row?.payable_id ? Number(row.payable_id) : undefined,
  };

  if (sourceType === "invoice" || sourceType === "payment_transaction") {
    return {
      path: `${rolePrefix}/finance/transactions`,
      state: {
        financeHighlight: highlight,
        financeFilters: monthDateFiltersForAnchor(anchorDate) ?? undefined,
      },
    };
  }

  if (sourceType === "expense") {
    return {
      path: expensesPathForRole(rolePrefix, pathname),
      state: {
        financeHighlight: highlight,
        financeFilters: anchorDate
          ? {
              from_date: dayjs(anchorDate).startOf("month").format("YYYY-MM-DD"),
              to_date: dayjs(anchorDate).endOf("month").format("YYYY-MM-DD"),
            }
          : undefined,
      },
    };
  }

  if (sourceType === "prepaid_expense") {
    return {
      path: `${rolePrefix}/finance/transactions`,
      state: {
        financeHighlight: highlight,
        financeFilters: monthDateFiltersForAnchor(anchorDate) ?? undefined,
      },
    };
  }

  if (sourceType === "other_income") {
    return {
      path: `${rolePrefix}/other-income`,
      state: { financeHighlight: highlight },
    };
  }

  if (sourceType === "payable_transaction") {
    const payableId = row?.payable_id ? Number(row.payable_id) : null;
    if (!payableId) return null;
    return {
      path: `${rolePrefix}/transactions/payables/${payableId}`,
      state: { financeHighlight: highlight },
    };
  }

  if (sourceType === "supplier_payable") {
    return {
      path: `${rolePrefix}/transactions/payables/${sourceId}`,
      state: { financeHighlight: highlight },
    };
  }

  if (sourceType === "purchase") {
    return {
      path: `${rolePrefix}/purchases/${sourceId}`,
      state: { financeHighlight: highlight },
    };
  }

  if (sourceType === "supplier_return") {
    return {
      path: `${rolePrefix}/inventory/supplier-returns`,
      state: { financeHighlight: highlight },
    };
  }

  if (
    sourceType === "payroll_month_accrual" ||
    sourceType === "payroll_payment" ||
    sourceType === "staff_deposit_transaction"
  ) {
    return {
      path: `${rolePrefix}/finance/transactions`,
      state: {
        financeHighlight: highlight,
        financeFilters: monthDateFiltersForAnchor(anchorDate) ?? undefined,
      },
    };
  }

  return null;
}

export function isTransactionsPostableType(sourceType) {
  return TRANSACTIONS_POSTABLE_TYPES.has(
    normalizeJournalSourceType(sourceType),
  );
}
