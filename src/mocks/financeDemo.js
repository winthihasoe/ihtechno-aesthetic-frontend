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
const jl = (code, debit, credit) => {
  const a = acct(code);
  return { account: { id: a.id, code: a.code, name: a.name }, name: a.name, debit, credit };
};
// [journalNo, daysAgo, type, description, source, lines]
const journalSeeds = [
  ["JR-2026-001", 0, "auto", "Consultation income (cash)", "invoice", [jl("1010", 350000, 0), jl("4100", 0, 350000)]],
  ["JR-2026-002", 5, "manual", "Monthly premises rent", "expense", [jl("5200", 1500000, 0), jl("1020", 0, 1500000)]],
  ["JR-2026-003", 3, "auto", "Supplies purchased on credit", "purchase", [jl("1200", 620000, 0), jl("2010", 0, 620000)]],
  ["JR-2026-004", 5, "auto", "Monthly payroll", "payroll", [jl("5100", 3200000, 0), jl("1020", 0, 2800000), jl("2100", 0, 400000)]],
  ["JR-2026-005", 0, "auto", "Pharmacy sales (cash)", "pharmacy", [jl("1010", 480000, 0), jl("4200", 0, 480000)]],
  ["JR-2026-006", 1, "auto", "Laboratory income (on account)", "invoice", [jl("1100", 220000, 0), jl("4300", 0, 220000)]],
];

export const demoJournalEntries = journalSeeds.map(([journal_no, daysAgo, type, description, source, lines], i) => ({
  id: i + 1,
  journal_no,
  journal_date: now.subtract(daysAgo, "day").format("YYYY-MM-DD"),
  type,
  description,
  memo: description,
  source,
  amount: lines.reduce((s, l) => s + l.debit, 0),
  lines,
}));

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
