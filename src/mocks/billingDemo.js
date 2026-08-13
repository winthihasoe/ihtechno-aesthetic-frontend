import dayjs from "dayjs";
import { demoSuppliers } from "./inventoryDemo";

const now = dayjs();
const pad = (n) => String(n).padStart(3, "0");

// ── Other income ──────────────────────────────────────────────────────────
const incomeAccounts = {
  cafeteria: { code: "4900", name: "Other Operating Income" },
  service: { code: "4900", name: "Other Operating Income" },
  records: { code: "4900", name: "Other Operating Income" },
  sponsor: { code: "4910", name: "Sponsorship & Grants" },
  interest: { code: "4950", name: "Bank Interest" },
  training: { code: "4920", name: "Training & Workshop Income" },
};

// [reference, daysAgo, accountKey, payment_method, amount, status, description]
const otherIncomeSeeds = [
  ["OI-2026-001", 1, "cafeteria", "Bank Transfer", 450000, "posted", "Cafeteria space monthly rent"],
  ["OI-2026-002", 2, "service", "Cash", 60000, "posted", "Ambulance service fee"],
  ["OI-2026-003", 3, "records", "Cash", 15000, "posted", "Medical record copy fee"],
  ["OI-2026-004", 5, "sponsor", "Bank Transfer", 800000, "posted", "Community health-camp sponsorship"],
  ["OI-2026-005", 6, "service", "KBZ Pay", 250000, "posted", "Staff training workshop fee"],
  ["OI-2026-006", 8, "interest", "Bank Transfer", 95000, "posted", "Quarterly bank interest"],
  ["OI-2026-007", 9, "service", "Cash", 40000, "void", "Parking fees (reversed — duplicate entry)"],
  ["OI-2026-008", 12, "records", "Cash", 30000, "posted", "Duplicate lab report printing"],
];

export const demoOtherIncomes = otherIncomeSeeds.map(
  ([reference_number, daysAgo, accountKey, payment_method, amount, status, description], i) => {
    const date = now.subtract(daysAgo, "day");
    return {
      id: i + 1,
      reference_number,
      income_date: date.format("YYYY-MM-DD"),
      received_at: date.toISOString(),
      created_at: date.toISOString(),
      chart_of_account: incomeAccounts[accountKey],
      payment_method,
      amount,
      status,
      description,
      creator: { id: 1, name: "U Aung Min" },
    };
  },
);

// ── Expenses ──────────────────────────────────────────────────────────────
// [reference, daysAgo, vendor, category, description, method, amount]
const expenseSeeds = [
  ["EX-2026-101", 1, "Yangon Electricity Supply Board", "Utilities", "Monthly electricity bill", "Bank Transfer", 380000],
  ["EX-2026-102", 1, "City Water Board", "Utilities", "Water supply charge", "Cash", 65000],
  ["EX-2026-103", 2, "City Property Holdings", "Rent", "Clinic building rent", "Bank Transfer", 1500000],
  ["EX-2026-104", 3, "Yangon Pharma Distribution", "Medical Supplies", "Consumables restock", "Bank Transfer", 620000],
  ["EX-2026-105", 4, "Shwe Fuel Station", "Fuel", "Standby generator diesel", "Cash", 140000],
  ["EX-2026-106", 5, "MediEquip Myanmar", "Maintenance", "Nebulizer & BP monitor servicing", "Bank Transfer", 220000],
  ["EX-2026-107", 6, "CleanCare Services", "Cleaning", "Monthly cleaning contract", "Bank Transfer", 180000],
  ["EX-2026-108", 7, "MPT", "Utilities", "Internet & phone lines", "Cash", 90000],
  ["EX-2026-109", 9, "Print House", "Marketing", "Brochures & signage printing", "Cash", 130000],
  ["EX-2026-110", 11, "Fresh Linen Laundry", "Laundry", "Staff uniforms & ward linen", "Cash", 75000],
  ["EX-2026-111", 12, "Office Mart", "Office", "Stationery & printer toner", "Cash", 45000],
  ["EX-2026-112", 14, "SafeWaste Disposal", "Maintenance", "Biohazard waste collection", "Bank Transfer", 110000],
];

export const demoExpenses = expenseSeeds.map(
  ([reference_number, daysAgo, vendor_name, category, description, payment_method, amount], i) => {
    const date = now.subtract(daysAgo, "day");
    return {
      id: i + 1,
      reference_number,
      expense_date: date.format("YYYY-MM-DD"),
      created_at: date.toISOString(),
      vendor_name,
      category,
      description,
      payment_method,
      branch: { id: 1, name: "Main Clinic" },
      branch_id: 1,
      amount,
      status: "posted",
      creator: { id: 1, name: "U Aung Min" },
    };
  },
);

// ── Supplier payables ───────────────────────────────────────────────────────
const supplierById = new Map(demoSuppliers.map((s) => [s.id, s]));

// [supplierId, reference, total, paid, status, dueInDays]
const payableSeeds = [
  [1, "PO-2026-0142", 620000, 0, "open", 10],
  [2, "PO-2026-0138", 480000, 200000, "partial", 5],
  [3, "PO-2026-0130", 350000, 350000, "paid", -2],
  [4, "PO-2026-0145", 275000, 0, "open", 14],
  [5, "PO-2026-0120", 900000, 500000, "partial", 20],
  [6, "PO-2026-0150", 190000, 0, "open", 7],
  [1, "PO-2026-0110", 410000, 410000, "paid", -10],
  [3, "PO-2026-0151", 130000, 0, "open", 3],
];

export const demoSupplierPayables = payableSeeds.map(
  ([supplierId, reference, total, paid, status, dueInDays], i) => {
    const created = now.subtract(30 - i, "day");
    return {
      id: i + 1,
      supplier_id: supplierId,
      supplier: supplierById.get(supplierId) ?? null,
      reference,
      description: `Stock received against ${reference}`,
      total_amount: total,
      paid_amount: paid,
      balance: total - paid,
      status,
      due_date: now.add(dueInDays, "day").format("YYYY-MM-DD"),
      created_at: created.toISOString(),
    };
  },
);

export const demoChartOfIncomeAccounts = Object.values(incomeAccounts).filter(
  (v, i, arr) => arr.findIndex((x) => x.code === v.code) === i,
);

export function filterByStatus(rows, status) {
  if (!status) return rows;
  return rows.filter((r) => r.status === status);
}
