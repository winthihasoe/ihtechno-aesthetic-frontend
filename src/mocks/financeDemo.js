import dayjs from "dayjs";

const now = dayjs();

// ── Chart of accounts ───────────────────────────────────────────────────────
// [code, name, type, memo]
const coaSeeds = [
  ["1010", "Cash on Hand", "asset", "Petty cash & till float"],
  ["1020", "Bank — KBZ", "asset", "Main operating bank account"],
  ["1100", "Accounts Receivable", "asset", "Unpaid patient invoices"],
  ["1200", "Inventory", "asset", "Pharmacy & medical supplies on hand"],
  ["1500", "Fixed Assets (net)", "asset", "Equipment net of depreciation"],
  ["2010", "Accounts Payable", "liability", "Amounts owed to suppliers"],
  ["2100", "Salaries Payable", "liability", "Accrued unpaid wages"],
  ["2200", "Tax Payable", "liability", "SSB / commercial tax payable"],
  ["3010", "Owner's Capital", "equity", "Paid-in capital"],
  ["3100", "Retained Earnings", "equity", "Accumulated profit"],
  ["4100", "Consultation Income", "income", "OPD & specialist consultations"],
  ["4200", "Pharmacy Sales", "income", "Dispensing & OTC sales"],
  ["4300", "Laboratory Income", "income", "Investigations"],
  ["4400", "Health Package Sales", "income", "Screening & care packages"],
  ["4900", "Other Operating Income", "income", "Rent, sponsorship, misc."],
  ["5100", "Salaries & Wages", "expense", "Staff payroll"],
  ["5200", "Rent", "expense", "Clinic premises"],
  ["5300", "Utilities", "expense", "Electricity, water, internet"],
  ["5400", "Medical Supplies", "expense", "Consumables used"],
  ["5500", "Maintenance & Repairs", "expense", "Equipment servicing"],
  ["5600", "Marketing", "expense", "Advertising & printing"],
  ["5700", "Cleaning & Laundry", "expense", "Housekeeping services"],
  ["5900", "Other Expenses", "expense", "Sundry costs"],
];

export const demoChartOfAccounts = coaSeeds.map(([code, name, type, memo], i) => ({
  id: i + 1,
  code,
  name,
  type,
  memo,
  is_active: true,
  is_system: ["1010", "1020", "3010", "3100"].includes(code),
}));

const acct = (code) => demoChartOfAccounts.find((a) => a.code === code);
const line = (code, amount) => {
  const a = acct(code);
  return { account_id: a.id, code: a.code, name: a.name, amount };
};

// ── Profit & Loss (current period) ──────────────────────────────────────────
const income = [
  ["4100", 2400000],
  ["4200", 1800000],
  ["4300", 900000],
  ["4400", 600000],
  ["4900", 1650000],
];
const expense = [
  ["5100", 3200000],
  ["5200", 1500000],
  ["5300", 600000],
  ["5400", 900000],
  ["5500", 330000],
  ["5600", 130000],
  ["5700", 255000],
  ["5900", 200000],
];
const totalRevenue = income.reduce((s, [, v]) => s + v, 0);
const totalExpense = expense.reduce((s, [, v]) => s + v, 0);
const netProfit = totalRevenue - totalExpense;

export function buildProfitAndLoss() {
  return {
    lines: [
      ...income.map(([code, amount]) => ({ ...line(code, amount), type: "income" })),
      ...expense.map(([code, amount]) => ({ ...line(code, amount), type: "expense" })),
    ],
    totals: {
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      net_profit: netProfit,
    },
  };
}

// ── Balance sheet (balanced) ────────────────────────────────────────────────
const bsAssets = [
  ["1010", 1200000],
  ["1020", 8500000],
  ["1100", 1050000],
  ["1200", 3400000],
  ["1500", 6800000],
];
const bsLiabilities = [
  ["2010", 1895000],
  ["2100", 400000],
  ["2200", 155000],
];
const bsEquity = [
  ["3010", 18000000],
  ["3100", 500000],
];
const bsLine = (code, balance) => {
  const a = acct(code);
  return { account_id: a.id, code: a.code, name: a.name, balance };
};
const sum = (rows) => rows.reduce((s, [, v]) => s + v, 0);

export function buildBalanceSheet() {
  const assets = sum(bsAssets);
  const liabilities = sum(bsLiabilities);
  const equity = sum(bsEquity);
  return {
    sections: [
      { label: "Assets", total: assets, lines: bsAssets.map(([c, v]) => bsLine(c, v)) },
      { label: "Liabilities", total: liabilities, lines: bsLiabilities.map(([c, v]) => bsLine(c, v)) },
      { label: "Equity", total: equity, lines: bsEquity.map(([c, v]) => bsLine(c, v)) },
    ],
    totals: {
      assets,
      liabilities: liabilities,
      equity,
      liabilities_plus_equity: liabilities + equity,
    },
  };
}

// ── Fixed assets ────────────────────────────────────────────────────────────
// [code, name, cost, lifeMonths, deprRuns]
const fixedAssetSeeds = [
  ["FA-001", "Ultrasound Machine", 3500000, 60, 8],
  ["FA-002", "X-Ray Machine", 2800000, 60, 6],
  ["FA-003", "ECG Machine", 900000, 48, 5],
  ["FA-004", "Nebulizers (x3)", 200000, 36, 4],
  ["FA-005", "Autoclave Sterilizer", 650000, 60, 7],
  ["FA-006", "Patient Beds (x10)", 1200000, 84, 3],
  ["FA-007", "Standby Generator", 1500000, 96, 9],
  ["FA-008", "Computers & POS", 900000, 36, 6],
];

export const demoFixedAssets = fixedAssetSeeds.map(([asset_code, asset_name, purchase_cost, useful_life_months, runs], i) => ({
  id: i + 1,
  asset_code,
  asset_name,
  purchase_cost,
  useful_life_months,
  purchase_date: now.subtract(runs, "month").format("YYYY-MM-DD"),
  depreciations: Array.from({ length: runs }, (_, r) => ({
    id: (i + 1) * 100 + r,
    amount: Math.round(purchase_cost / useful_life_months),
    period: now.subtract(runs - r, "month").format("YYYY-MM"),
  })),
}));

// ── Cash movements ──────────────────────────────────────────────────────────
// [daysAgo, source_type, type, amount]
const cashSeeds = [
  [0, "invoice_payment", "inflow", 350000],
  [0, "pharmacy_sale", "inflow", 480000],
  [1, "expense", "outflow", 380000],
  [1, "invoice_payment", "inflow", 220000],
  [2, "supplier_payment", "outflow", 350000],
  [2, "other_income", "inflow", 450000],
  [3, "expense", "outflow", 140000],
  [4, "invoice_payment", "inflow", 680000],
  [5, "payroll", "outflow", 2800000],
  [6, "supplier_payment", "outflow", 200000],
  [7, "invoice_payment", "inflow", 95000],
  [8, "expense", "outflow", 110000],
];

export function buildCashFlows() {
  return cashSeeds.map((s, i) => {
    const [daysAgo, source_type, type, amount] = s;
    return {
      id: i + 1,
      occurred_at: now.subtract(daysAgo, "day").hour(11).minute(0).toISOString(),
      source_type,
      type,
      amount,
    };
  });
}

// ── Journal entries (balanced) ──────────────────────────────────────────────
const CATEGORY_LABEL = { income: "Income", expense: "Expense", transfer: "Transfer" };

const jl = (code, debit, credit, description) => {
  const a = acct(code);
  return {
    account: { id: a.id, code: a.code, name: a.name, type: a.type },
    name: a.name,
    debit,
    credit,
    description,
  };
};

const journalSeeds = [
  {
    daysAgo: 0,
    journal_no: "JR-2026-001",
    name: "Consultation income (cash)",
    source_type: "invoice",
    entry_category: "income",
    is_manual: false,
    description: "Consultation income received in cash from Ma Thiri (OPD).",
    memo: "Posted from invoice INV-2026-1001",
    source_reference: "INV-2026-1001",
    source_id: 1001,
    lines: [
      jl("1010", 350000, 0, "Cash till — consultation receipt"),
      jl("4100", 0, 350000, "OPD consultation fee — Ma Thiri"),
    ],
  },
  {
    daysAgo: 5,
    journal_no: "JR-2026-002",
    name: "Monthly premises rent",
    source_type: "expense",
    entry_category: "expense",
    is_manual: true,
    description: "Monthly clinic premises rent for August 2026.",
    memo: "Manual adjusting entry — City Property Holdings",
    source_reference: "EX-2026-103",
    source_id: 103,
    can_edit: true,
    can_reverse: true,
    lines: [
      jl("5200", 1500000, 0, "August premises rent"),
      jl("1020", 0, 1500000, "KBZ bank payment to landlord"),
    ],
  },
  {
    daysAgo: 3,
    journal_no: "JR-2026-003",
    name: "Supplies purchased on credit",
    source_type: "supplier_payable",
    entry_category: "expense",
    is_manual: false,
    description: "Medical supplies purchased on credit from Golden Health Imports.",
    memo: "Posted from supplier payable PO-2026-0130",
    source_reference: "PO-2026-0130",
    source_id: 3,
    lines: [
      jl("1200", 620000, 0, "Pharmacy inventory received"),
      jl("2010", 0, 620000, "Accounts payable — Golden Health Imports"),
    ],
  },
  {
    daysAgo: 5,
    journal_no: "JR-2026-004",
    name: "Monthly payroll",
    source_type: "expense",
    entry_category: "expense",
    is_manual: false,
    description: "Monthly staff payroll including accrued unpaid wages.",
    memo: "Posted from payroll run PR-2026-07",
    source_reference: "PR-2026-07",
    source_id: 1,
    lines: [
      jl("5100", 3200000, 0, "Gross salaries & wages for July"),
      jl("1020", 0, 2800000, "Net pay transferred from KBZ"),
      jl("2100", 0, 400000, "Salaries payable — remaining accrual"),
    ],
  },
  {
    daysAgo: 0,
    journal_no: "JR-2026-005",
    name: "Pharmacy sales (cash)",
    source_type: "invoice",
    entry_category: "income",
    is_manual: false,
    description: "Pharmacy dispensing and OTC cash sales for the day.",
    memo: "Posted from pharmacy invoice INV-2026-1008",
    source_reference: "INV-2026-1008",
    source_id: 1008,
    lines: [
      jl("1010", 480000, 0, "Cash till — pharmacy sales"),
      jl("4200", 0, 480000, "Dispensing & OTC revenue"),
    ],
  },
  {
    daysAgo: 1,
    journal_no: "JR-2026-006",
    name: "Laboratory income (on account)",
    source_type: "invoice",
    entry_category: "income",
    is_manual: false,
    description: "Laboratory investigations billed on account to Ko Aung Ko.",
    memo: "Posted from invoice INV-2026-1006",
    source_reference: "INV-2026-1006",
    source_id: 1006,
    lines: [
      jl("1100", 220000, 0, "Accounts receivable — Ko Aung Ko"),
      jl("4300", 0, 220000, "Lab investigation income"),
    ],
  },
  {
    daysAgo: 2,
    journal_no: "JR-2026-007",
    name: "Cafeteria rental income",
    source_type: "other_income",
    entry_category: "income",
    is_manual: false,
    description: "Cafeteria space rental collected from the in-house vendor.",
    memo: "Posted from other income OI-2026-001",
    source_reference: "OI-2026-001",
    source_id: 1,
    lines: [
      jl("1010", 450000, 0, "Cash received — cafeteria rent"),
      jl("4900", 0, 450000, "Other operating income"),
    ],
  },
  {
    daysAgo: 4,
    journal_no: "JR-2026-008",
    name: "Cash-to-bank transfer",
    source_type: "payment_transaction",
    entry_category: "transfer",
    is_manual: false,
    description: "Patient collection transferred from cash till to KBZ operating account.",
    memo: "Cash-to-bank transfer",
    source_reference: "PAY-2026-044",
    source_id: 44,
    lines: [
      jl("1020", 680000, 0, "Deposit to Bank — KBZ"),
      jl("1010", 0, 680000, "Cash on hand withdrawn for deposit"),
    ],
  },
];

export const demoJournalEntries = journalSeeds.map((seed, i) => {
  const id = i + 1;
  const journal_date = now.subtract(seed.daysAgo, "day").format("YYYY-MM-DD");
  return {
    id,
    journal_entry_id: id,
    journal_no: seed.journal_no,
    journal_date,
    posted_at: now.subtract(seed.daysAgo, "day").hour(10).minute(30).toISOString(),
    name: seed.name ?? seed.description,
    description: seed.description,
    memo: seed.memo,
    source: seed.source_type,
    source_type: seed.source_type,
    source_label: seed.is_manual ? "Manual" : "Auto",
    source_reference: seed.source_reference,
    source_id: seed.source_id,
    source_event_date: journal_date,
    entry_category: seed.entry_category,
    entry_category_label: CATEGORY_LABEL[seed.entry_category],
    is_manual: seed.is_manual,
    is_auto_posted: !seed.is_manual,
    can_edit: Boolean(seed.can_edit),
    can_reverse: Boolean(seed.can_reverse),
    reversed_at: null,
    amount: seed.lines.reduce((s, l) => s + l.debit, 0),
    lines: seed.lines.map((line, li) => ({
      ...line,
      id: id * 100 + li + 1,
      voided_at: null,
    })),
  };
});

export function buildJournalEntriesSummary(entries = demoJournalEntries) {
  return {
    entries: entries.length,
    total_debit: entries.reduce((s, e) => s + (e.amount ?? 0), 0),
    income: entries.filter((e) => e.entry_category === "income").length,
    expense: entries.filter((e) => e.entry_category === "expense").length,
    transfer: entries.filter((e) => e.entry_category === "transfer").length,
    manual: entries.filter((e) => e.is_manual).length,
    auto: entries.filter((e) => !e.is_manual).length,
  };
}

// ── General ledger ──────────────────────────────────────────────────────────
export function buildGeneralLedgerAccounts() {
  // closing balance = net movement across journal entries for each account.
  const balances = {};
  demoJournalEntries.forEach((e) => {
    e.lines.forEach((l) => {
      balances[l.account.code] = (balances[l.account.code] ?? 0) + l.debit - l.credit;
    });
  });
  return demoChartOfAccounts.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    closing_balance: Math.abs(balances[a.code] ?? 0),
  }));
}

export function buildGeneralLedgerLines(accountId) {
  const account = demoChartOfAccounts.find((a) => a.id === Number(accountId));
  if (!account) return [];
  let running = 0;
  let seq = 0;
  const rows = [];
  demoJournalEntries
    .slice()
    .sort((a, b) => dayjs(a.journal_date).valueOf() - dayjs(b.journal_date).valueOf())
    .forEach((e) => {
      e.lines
        .filter((l) => l.account.code === account.code)
        .forEach((l) => {
          running += l.debit - l.credit;
          rows.push({
            id: `${accountId}-${e.id}-${seq++}`,
            journal_date: e.journal_date,
            journal_no: e.journal_no,
            description: e.description,
            memo: e.description,
            name: e.journal_no,
            debit: l.debit,
            credit: l.credit,
            balance: Math.abs(running),
            running_balance: Math.abs(running),
          });
        });
    });
  return rows;
}

// ── Accounting queue (Transactions) ─────────────────────────────────────────
// [daysAgo, type_label, source_type, source_id, reference, party, amount, status]
const queueSeeds = [
  [0, "Invoice", "invoice", 1003, "INV-2026-1003", "Ma Ei Mon", 45000, "pending"],
  [0, "Invoice", "invoice", 1009, "INV-2026-1009", "Ko Aung Ko", 12000, "pending"],
  [1, "Invoice", "invoice", 1001, "INV-2026-1001", "Ma Thiri", 35000, "posted"],
  [1, "Expense", "expense", 101, "EX-2026-101", "Yangon Electricity Supply Board", 380000, "posted"],
  [2, "Expense", "expense", 103, "EX-2026-103", "City Property Holdings", 1500000, "posted"],
  [2, "Supplier payment", "supplier_payable", 3, "PO-2026-0130", "Golden Health Imports", 350000, "posted"],
  [3, "Other income", "other_income", 1, "OI-2026-001", "Cafeteria rent", 450000, "posted"],
  [4, "Invoice", "invoice", 1005, "INV-2026-1005", "Daw Khin Mya", 68000, "posted"],
  [5, "Expense", "expense", 104, "EX-2026-104", "Yangon Pharma Distribution", 620000, "pending"],
  [5, "Payroll", "payroll", 1, "PR-2026-07", "Monthly payroll", 3200000, "posted"],
];

export function buildAccountingQueue() {
  return queueSeeds.map((s, i) => {
    const [daysAgo, type_label, source_type, source_id, reference, name, amount, status] = s;
    return {
      id: i + 1,
      event_date: now.subtract(daysAgo, "day").format("YYYY-MM-DD"),
      type_label,
      source_type,
      source_id,
      reference,
      name,
      amount,
      journal_posting_status: status,
    };
  });
}

function previewLine(code, debit, credit, description, line_kind = null) {
  const a = acct(code);
  return {
    account_id: a?.id ?? null,
    account: a ? { id: a.id, code: a.code, name: a.name } : null,
    debit,
    credit,
    description,
    line_kind,
  };
}

export function defaultQueueMemo(row) {
  return [row?.type_label, row?.reference, row?.name].filter(Boolean).join(" — ");
}

function classifyInvoiceItem(label = "", type = "") {
  const t = `${label} ${type}`.toLowerCase();
  if (t.includes("package")) return "package";
  if (t.includes("consultation") || t.includes("follow-up")) return "consultation";
  if (t.includes("prescription")) return "prescription";
  if (
    /\bspf\b/.test(t) ||
    t.includes("ointment") ||
    t.includes("serum") ||
    t.includes("moisturizer") ||
    t.includes("cream") ||
    t.includes("product")
  ) {
    return "product";
  }
  const normalizedType = String(type).toLowerCase();
  if (
    ["package", "consultation", "treatment", "product", "prescription"].includes(
      normalizedType,
    )
  ) {
    return normalizedType;
  }
  return "treatment";
}

const INCOME_CODE_BY_KIND = {
  package: "4400",
  consultation: "4100",
  treatment: "4100",
  product: "4200",
  prescription: "4200",
  other: "4100",
};

const CREDIT_LINE_KIND = {
  package: "package_deposit",
  consultation: "earned_revenue",
  treatment: "earned_revenue",
  product: "earned_revenue",
  prescription: "earned_revenue",
  other: "earned_revenue",
};

export function buildInvoiceBreakdown(items = []) {
  const earned_parts = {
    consultation: 0,
    treatment: 0,
    product: 0,
    prescription: 0,
    other: 0,
  };
  let packageAmount = 0;
  for (const item of items) {
    const kind = classifyInvoiceItem(item.label ?? item.name, item.type);
    const value = Number(item.line_total ?? item.price ?? item.amount ?? 0) || 0;
    if (kind === "package") packageAmount += value;
    else if (earned_parts[kind] != null) earned_parts[kind] += value;
    else earned_parts.other += value;
  }
  return {
    package: packageAmount,
    earned: Object.values(earned_parts).reduce((s, v) => s + v, 0),
    tax: 0,
    earned_parts,
  };
}

export function buildInvoiceJournalLines(row, items = []) {
  const desc = defaultQueueMemo(row);
  const amount = Number(row.amount) || 0;
  const credits = items
    .map((item) => {
      const kind = classifyInvoiceItem(item.label ?? item.name, item.type);
      const value = Number(item.line_total ?? item.price ?? item.amount ?? 0) || 0;
      if (value <= 0) return null;
      return previewLine(
        INCOME_CODE_BY_KIND[kind] ?? "4100",
        0,
        value,
        item.label ?? desc,
        CREDIT_LINE_KIND[kind] ?? "earned_revenue",
      );
    })
    .filter(Boolean);

  if (credits.length === 0) {
    return [
      previewLine("1100", amount, 0, desc, "ar_earned"),
      previewLine("4100", 0, amount, desc, "earned_revenue"),
    ];
  }

  const creditTotal = credits.reduce((s, line) => s + Number(line.credit), 0);
  if (amount > creditTotal && Math.abs(amount - creditTotal) > 0.005) {
    credits.push(
      previewLine("4100", 0, amount - creditTotal, desc, "earned_revenue"),
    );
  }

  const packageTotal = credits
    .filter((line) => line.line_kind === "package_deposit")
    .reduce((s, line) => s + Number(line.credit), 0);
  const earnedTotal = Math.max(0, amount - packageTotal);
  const debits = [];
  if (packageTotal > 0) {
    debits.push(
      previewLine("1100", packageTotal, 0, `${desc} (package)`, "ar_package"),
    );
  }
  if (earnedTotal > 0) {
    debits.push(
      previewLine("1100", earnedTotal, 0, `${desc} (earned)`, "ar_earned"),
    );
  }
  return [...debits, ...credits];
}

const EXPENSE_COA = {
  Utilities: "5300",
  Rent: "5200",
  "Medical Supplies": "5400",
  Fuel: "5900",
  Maintenance: "5500",
  Cleaning: "5700",
  Marketing: "5600",
  Laundry: "5700",
  Office: "5900",
};

export function suggestedQueueLines(row, extras = {}) {
  const amount = Number(row?.amount) || 0;
  const desc = defaultQueueMemo(row);
  switch (row?.source_type) {
    case "invoice":
      return extras.invoiceItems?.length
        ? buildInvoiceJournalLines(row, extras.invoiceItems)
        : [
            previewLine("1100", amount, 0, desc, "ar_earned"),
            previewLine("4100", 0, amount, desc, "earned_revenue"),
          ];
    case "payment_transaction":
      return [
        previewLine("1010", amount, 0, desc),
        previewLine("1100", 0, amount, desc),
      ];
    case "expense":
      return [
        previewLine(
          extras.expenseCode ?? EXPENSE_COA[extras.category] ?? "5900",
          amount,
          0,
          desc,
        ),
        previewLine("1020", 0, amount, desc),
      ];
    case "other_income":
      return [
        previewLine("1020", amount, 0, desc),
        previewLine("4900", 0, amount, desc),
      ];
    case "supplier_payable":
    case "payable_transaction":
      return [
        previewLine("2010", amount, 0, desc),
        previewLine("1020", 0, amount, desc),
      ];
    case "payroll": {
      const bank = Math.round(amount * 0.875);
      return [
        previewLine("5100", amount, 0, desc),
        previewLine("1020", 0, bank, desc),
        previewLine("2100", 0, amount - bank, desc),
      ];
    }
    default:
      return [
        previewLine("1010", amount, 0, desc),
        previewLine("4100", 0, amount, desc),
      ];
  }
}

export function buildAccountingQueuePreview(row, extras = {}) {
  if (!row) return null;
  const status = row.journal_posting_status ?? "pending";
  const lines =
    row.draft_lines ??
    row.posted_lines ??
    extras.lines ??
    suggestedQueueLines(row, extras);
  return {
    source_type: row.source_type,
    source_id: row.source_id,
    reference: row.reference,
    name: row.name,
    amount: row.amount,
    event_date: row.event_date,
    type_label: row.type_label,
    journal_posting_status: status,
    journal_date: row.draft_journal_date ?? row.journal_date ?? row.event_date,
    memo: row.draft_memo ?? row.memo ?? defaultQueueMemo(row),
    can_post: status === "pending" || status === "reversed",
    invoice_breakdown:
      extras.invoice_breakdown ??
      row.invoice_breakdown ??
      (extras.invoiceItems?.length
        ? buildInvoiceBreakdown(extras.invoiceItems)
        : null),
    lines,
  };
}
