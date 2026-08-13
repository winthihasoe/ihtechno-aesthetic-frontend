import dayjs from "dayjs";

const now = dayjs();

export const demoProductCategories = [
  { id: 1, name: "Medicine" },
  { id: 2, name: "Medical Supplies" },
  { id: 3, name: "Lab Reagents" },
  { id: 4, name: "Equipment" },
];

export const demoProductUnits = [
  "tablet",
  "capsule",
  "bottle",
  "vial",
  "ampoule",
  "sachet",
  "inhaler",
  "box",
  "piece",
  "pack",
  "roll",
  "pair",
].map((name, i) => ({ id: i + 1, name }));

export const demoProductTypes = [
  { id: 1, name: "Medicine" },
  { id: 2, name: "Supply" },
  { id: 3, name: "Consumable" },
  { id: 4, name: "Reagent" },
  { id: 5, name: "Equipment" },
];

const categoryById = new Map(demoProductCategories.map((c) => [c.id, c]));

// [name, sku, categoryId, unit, sellingPrice, minStock, typeId,
//   batches: [ [batchNumber, daysToExpiry|null, quantity, costPrice], ... ] ]
const productSeeds = [
  ["Paracetamol 500mg", "MED-PARA-500", 1, "tablet", 50, 200, 1, [["PARA-2405", 120, 800, 30], ["PARA-2312", 400, 400, 32]]],
  ["Amoxicillin 500mg", "MED-AMOX-500", 1, "capsule", 120, 100, 1, [["AMOX-2404", 60, 340, 80]]],
  ["Metformin 1000mg", "MED-MET-1000", 1, "tablet", 80, 150, 1, [["MET-2403", 300, 500, 45]]],
  ["Amlodipine 5mg", "MED-AML-5", 1, "tablet", 60, 100, 1, [["AML-2402", 200, 250, 35]]],
  ["Salbutamol Inhaler", "MED-SAL-INH", 1, "inhaler", 4500, 20, 1, [["SAL-2401", 150, 35, 3000]]],
  ["Ceftriaxone 1g Injection", "MED-CEF-1G", 1, "vial", 3500, 30, 1, [["CEF-2312", 25, 40, 2500]]],
  ["ORS Sachet", "MED-ORS", 1, "sachet", 300, 100, 1, [["ORS-2405", 500, 600, 150]]],
  ["Ferrous Sulphate 200mg", "MED-FES-200", 1, "tablet", 40, 100, 1, [["FES-2404", 365, 400, 20]]],
  ["Diclofenac 50mg", "MED-DIC-50", 1, "tablet", 70, 80, 1, [["DIC-2310", -10, 60, 40], ["DIC-2404", 90, 30, 42]]],
  ["Insulin (Regular) Vial", "MED-INS", 1, "vial", 12000, 15, 1, [["INS-2403", 80, 0, 9000]]],
  ["Normal Saline 500ml", "SUP-NS-500", 2, "bottle", 1500, 50, 2, []],
  ["Gauze Pad Sterile", "SUP-GAUZE", 2, "pack", 800, 40, 3, [["GAU-2405", 600, 64, 400]]],
  ["Disposable Syringe 5ml", "SUP-SYR-5", 2, "piece", 150, 150, 3, [["SYR-2405", 700, 85, 90]]],
  ["Surgical Gloves (M)", "SUP-GLV-M", 2, "pair", 250, 200, 3, [["GLV-2404", 500, 500, 150]]],
  ["Face Mask 3-ply", "SUP-MASK", 2, "piece", 100, 500, 3, [["MSK-2405", 800, 1200, 50]]],
  ["IV Cannula 22G", "SUP-CAN-22", 2, "piece", 600, 100, 3, [["CAN-2404", 365, 220, 400]]],
  ["Adhesive Bandage", "SUP-BAND", 2, "box", 900, 30, 3, [["BAN-2405", 900, 45, 500]]],
  ["Cotton Roll", "SUP-COT", 2, "roll", 700, 40, 3, [["COT-2404", 365, 30, 450]]],
  ["Glucose Test Strips", "LAB-GLU-STRIP", 3, "box", 8000, 20, 4, [["GLU-2404", 120, 40, 5500]]],
  ["Urine Test Strips", "LAB-URINE", 3, "box", 6000, 15, 4, [["URN-2403", 40, 25, 4000]]],
  ["Digital Thermometer", "EQP-THERMO", 4, "piece", 5000, 10, 5, [["THR-LOT1", null, 25, 3200]]],
  ["BP Monitor (Digital)", "EQP-BP", 4, "piece", 45000, 5, 5, [["BP-LOT1", null, 8, 32000]]],
  ["Nebulizer Machine", "EQP-NEB", 4, "piece", 65000, 3, 5, [["NEB-LOT1", null, 4, 48000]]],
  ["Pulse Oximeter", "EQP-OXI", 4, "piece", 18000, 8, 5, [["OXI-LOT1", null, 12, 12000]]],
];

let batchIdSeq = 7000;
export const demoBatchesByProduct = {};

export const demoProducts = productSeeds.map((seed, index) => {
  const [name, sku, categoryId, unit, selling_price, min_stock_level, type_id, batchDefs] = seed;
  const id = index + 1;
  const batches = batchDefs.map(([batch_number, days, quantity, cost_price]) => ({
    id: batchIdSeq++,
    product_id: id,
    batch_number,
    expiry_date: days == null ? null : now.add(days, "day").format("YYYY-MM-DD"),
    quantity,
    cost_price,
  }));
  demoBatchesByProduct[id] = batches;
  const total_stock = batches.reduce((s, b) => s + b.quantity, 0);
  const stock_status =
    total_stock <= 0 ? "out" : total_stock <= min_stock_level ? "low" : "in";
  const datedBatches = batches
    .filter((b) => b.quantity > 0 && b.expiry_date)
    .map((b) => b.expiry_date)
    .sort();
  return {
    id,
    name,
    sku,
    category_id: categoryId,
    category: categoryById.get(categoryId) ?? null,
    unit,
    type_id,
    selling_price,
    min_stock_level,
    total_stock,
    stock_status,
    nearest_expiry_date: datedBatches[0] ?? null,
  };
});

const productById = new Map(demoProducts.map((p) => [p.id, p]));

export const demoSuppliers = [
  { id: 1, name: "Yangon Pharma Distribution", phone: "01-555-2011", email: "sales@ygnpharma.demo", address: "No. 12, Pansodan St, Yangon" },
  { id: 2, name: "Mandalay Medical Supplies", phone: "02-555-3044", email: "orders@mdymed.demo", address: "84th St, Mandalay" },
  { id: 3, name: "Golden Health Imports", phone: "01-555-7788", email: "info@goldenhealth.demo", address: "Hledan Center, Yangon" },
  { id: 4, name: "Asia Diagnostics & Reagents", phone: "01-555-9021", email: "lab@asiadx.demo", address: "Insein Rd, Yangon" },
  { id: 5, name: "MediEquip Myanmar", phone: "01-555-1200", email: "support@mediequip.demo", address: "Kabaraye Pagoda Rd, Yangon" },
  { id: 6, name: "City Surgical Supplies", phone: "01-555-4460", email: "sales@citysurgical.demo", address: "Bogyoke Market, Yangon" },
];

// [supplierId, daysAgo, status, receipt_type, items: [[productName, batchNumber, qty, cost, daysToExpiry|null]]]
const purchaseSeeds = [
  [1, 5, "received", "purchased", [["Paracetamol 500mg", "PARA-2405", 800, 30, 120], ["Amoxicillin 500mg", "AMOX-2404", 340, 80, 60], ["Metformin 1000mg", "MET-2403", 500, 45, 300]]],
  [3, 9, "received", "purchased", [["Salbutamol Inhaler", "SAL-2401", 35, 3000, 150], ["Ceftriaxone 1g Injection", "CEF-2312", 40, 2500, 25]]],
  [6, 12, "received", "purchased", [["Gauze Pad Sterile", "GAU-2405", 64, 400, 600], ["Surgical Gloves (M)", "GLV-2404", 500, 150, 500], ["Face Mask 3-ply", "MSK-2405", 1200, 50, 800]]],
  [4, 15, "received", "purchased", [["Glucose Test Strips", "GLU-2404", 40, 5500, 120], ["Urine Test Strips", "URN-2403", 25, 4000, 40]]],
  [5, 20, "received", "purchased", [["Digital Thermometer", "THR-LOT1", 25, 3200, null], ["Pulse Oximeter", "OXI-LOT1", 12, 12000, null]]],
  [2, 25, "received", "purchased", [["ORS Sachet", "ORS-2405", 600, 150, 500], ["Ferrous Sulphate 200mg", "FES-2404", 400, 20, 365]]],
  [1, 2, "draft", "purchased", [["Amlodipine 5mg", "AML-2402", 250, 35, 200], ["Diclofenac 50mg", "DIC-2404", 30, 42, 90]]],
  [5, 1, "draft", "purchased", [["Nebulizer Machine", "NEB-LOT1", 4, 48000, null], ["BP Monitor (Digital)", "BP-LOT1", 8, 32000, null]]],
];

const supplierById = new Map(demoSuppliers.map((s) => [s.id, s]));
const batchByNumber = new Map(
  Object.values(demoBatchesByProduct)
    .flat()
    .map((b) => [b.batch_number, b]),
);

export const demoPurchases = purchaseSeeds.map(([supplierId, daysAgo, status, receipt_type, itemDefs], index) => {
  const items = itemDefs.map(([productName, batchNumber, quantity, cost_price, days], itemIndex) => {
    const product = demoProducts.find((p) => p.name === productName) ?? null;
    return {
      id: (index + 1) * 100 + itemIndex,
      product_id: product?.id ?? null,
      product: product ? { id: product.id, name: product.name, unit: product.unit } : null,
      batch_number: batchNumber,
      expiry_date: days == null ? null : now.add(days, "day").format("YYYY-MM-DD"),
      quantity,
      cost_price,
      line_total: quantity * cost_price,
    };
  });
  const total = items.reduce((s, it) => s + it.line_total, 0);
  return {
    id: index + 1,
    date: now.subtract(daysAgo, "day").format("YYYY-MM-DD"),
    supplier_id: supplierId,
    supplier: supplierById.get(supplierId) ?? null,
    receipt_type,
    status,
    items,
    items_count: items.length,
    total,
    created_by: { id: 2, name: "Nurse May May" },
    created_at: now.subtract(daysAgo, "day").toISOString(),
  };
});

// Stock movements: "in" from received purchases, plus dispensing "out" and adjustments.
let movementIdSeq = 8000;
export const demoStockMovements = [];

demoPurchases
  .filter((po) => po.status === "received")
  .forEach((po) => {
    po.items.forEach((item) => {
      if (!item.product_id) return;
      const batch = batchByNumber.get(item.batch_number);
      demoStockMovements.push({
        id: movementIdSeq++,
        product_id: item.product_id,
        product: { id: item.product_id, name: item.product?.name },
        type: "in",
        quantity: item.quantity,
        batch: batch ? { id: batch.id, batch_number: batch.batch_number } : null,
        source_type: "purchase",
        source_id: po.id,
        user: po.created_by,
        created_at: po.created_at,
      });
    });
  });

// A few dispensing / adjustment movements for realism.
const manualMovements = [
  ["Paracetamol 500mg", "PARA-2405", "out", -60, "dispense", 3, 2],
  ["Amoxicillin 500mg", "AMOX-2404", "out", -45, "dispense", 3, 4],
  ["Face Mask 3-ply", "MSK-2405", "out", -200, "dispense", 5, 1],
  ["Surgical Gloves (M)", "GLV-2404", "out", -120, "dispense", 4, 2],
  ["Metformin 1000mg", "MET-2403", "out", -80, "dispense", 3, 6],
  ["Cotton Roll", "COT-2404", "adjustment", -10, "stock-take", 2, 7],
  ["Glucose Test Strips", "GLU-2404", "out", -8, "dispense", 4, 3],
];
manualMovements.forEach(([productName, batchNumber, type, quantity, source_type, userId, daysAgo]) => {
  const product = demoProducts.find((p) => p.name === productName);
  if (!product) return;
  const batch = batchByNumber.get(batchNumber);
  demoStockMovements.push({
    id: movementIdSeq++,
    product_id: product.id,
    product: { id: product.id, name: product.name },
    type,
    quantity,
    batch: batch ? { id: batch.id, batch_number: batch.batch_number } : null,
    source_type,
    source_id: null,
    user: { id: userId, name: userId === 2 ? "Nurse May May" : "Nurse Htet Htet" },
    created_at: now.subtract(daysAgo, "day").toISOString(),
  });
});

demoStockMovements.sort(
  (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
);

/** Low-stock / reorder + expiry alerts derived from products & batches. */
export function buildInventoryAlerts({ days = 90 } = {}) {
  const today = dayjs();
  const low_stock = demoProducts
    .filter((p) => p.stock_status === "low" || p.stock_status === "out")
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      stock_status: p.stock_status,
      quantity: p.total_stock,
      reorder_level: p.min_stock_level,
      category: p.category?.name ?? null,
    }));
  const expiring_soon = [];
  const expired = [];
  Object.values(demoBatchesByProduct)
    .flat()
    .forEach((b) => {
      if (b.quantity <= 0 || !b.expiry_date) return;
      const exp = dayjs(b.expiry_date);
      const product = productById.get(b.product_id);
      const row = {
        id: b.id,
        batch_number: b.batch_number,
        product_id: b.product_id,
        product_name: product?.name ?? "—",
        unit: product?.unit ?? "",
        quantity: b.quantity,
        expiry_date: b.expiry_date,
        days_to_expiry: exp.diff(today, "day"),
      };
      if (exp.isBefore(today, "day")) expired.push(row);
      else if (exp.diff(today, "day") <= days) expiring_soon.push(row);
    });
  expiring_soon.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
  return { low_stock, expiring_soon, expired };
}

export function filterStockMovements(params = {}) {
  let rows = [...demoStockMovements];
  if (params.product_id) {
    rows = rows.filter((m) => String(m.product_id) === String(params.product_id));
  }
  if (params.type) {
    rows = rows.filter((m) => m.type === params.type);
  }
  if (params.date_from) {
    const from = dayjs(String(params.date_from)).startOf("day");
    rows = rows.filter((m) => dayjs(m.created_at).valueOf() >= from.valueOf());
  }
  if (params.date_to) {
    const to = dayjs(String(params.date_to)).endOf("day");
    rows = rows.filter((m) => dayjs(m.created_at).valueOf() <= to.valueOf());
  }
  return rows;
}
