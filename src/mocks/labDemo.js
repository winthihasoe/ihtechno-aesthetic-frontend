import dayjs from "dayjs";

const now = dayjs();

// [code, name, category, unit, reference_range, sample_type, price]
const testSeeds = [
  ["LAB-CBC", "Complete Blood Count (CBC)", "Haematology", "", "See differential", "Whole blood (EDTA)", 18000],
  ["LAB-HGB", "Haemoglobin", "Haematology", "g/dL", "12–16 (F) / 13–17 (M)", "Whole blood (EDTA)", 6000],
  ["LAB-ESR", "Erythrocyte Sed. Rate (ESR)", "Haematology", "mm/hr", "0–20", "Whole blood (EDTA)", 5000],
  ["LAB-PLT", "Platelet Count", "Haematology", "×10⁹/L", "150–410", "Whole blood (EDTA)", 7000],
  ["LAB-ABO", "Blood Group & Rh", "Haematology", "", "—", "Whole blood (EDTA)", 8000],
  ["LAB-FBS", "Fasting Blood Sugar", "Biochemistry", "mg/dL", "70–100", "Serum (fasting)", 8000],
  ["LAB-RBS", "Random Blood Sugar", "Biochemistry", "mg/dL", "< 140", "Serum", 6000],
  ["LAB-HBA1C", "HbA1c", "Biochemistry", "%", "4.0–5.6", "Whole blood (EDTA)", 22000],
  ["LAB-LIPID", "Lipid Profile", "Biochemistry", "mg/dL", "See panel", "Serum (fasting)", 25000],
  ["LAB-LFT", "Liver Function Test", "Biochemistry", "U/L", "See panel", "Serum", 28000],
  ["LAB-RFT", "Renal Function Test", "Biochemistry", "mg/dL", "See panel", "Serum", 26000],
  ["LAB-CREAT", "Serum Creatinine", "Biochemistry", "mg/dL", "0.6–1.3", "Serum", 9000],
  ["LAB-UREA", "Blood Urea", "Biochemistry", "mg/dL", "15–40", "Serum", 9000],
  ["LAB-ELEC", "Serum Electrolytes", "Biochemistry", "mmol/L", "See panel", "Serum", 20000],
  ["LAB-URIC", "Uric Acid", "Biochemistry", "mg/dL", "3.5–7.2", "Serum", 10000],
  ["LAB-TSH", "Thyroid Stimulating Hormone", "Hormones", "mIU/L", "0.4–4.0", "Serum", 24000],
  ["LAB-FT4", "Free T4", "Hormones", "ng/dL", "0.8–1.8", "Serum", 22000],
  ["LAB-HBSAG", "Hepatitis B Surface Antigen", "Serology", "", "Non-reactive", "Serum", 15000],
  ["LAB-HCV", "Anti-HCV", "Serology", "", "Non-reactive", "Serum", 16000],
  ["LAB-HIV", "HIV Screening", "Serology", "", "Non-reactive", "Serum", 15000],
  ["LAB-DENG", "Dengue NS1 / IgM / IgG", "Serology", "", "Negative", "Serum", 20000],
  ["LAB-UA", "Urine Routine Examination", "Urinalysis", "", "See panel", "Urine", 6000],
  ["LAB-MP", "Malaria Parasite (smear)", "Microbiology", "", "Not seen", "Whole blood (EDTA)", 7000],
  ["LAB-STOOL", "Stool Routine Examination", "Microbiology", "", "See panel", "Stool", 6000],
];

export const demoLabTests = testSeeds.map(
  ([code, name, category, unit, reference_range, sample_type, price], i) => ({
    id: i + 1,
    code,
    name,
    category,
    unit,
    reference_range,
    sample_type,
    price,
    is_active: true,
  }),
);

const testByCode = new Map(demoLabTests.map((t) => [t.code, t]));

// Realistic results for completed items.
const RESULT_BY_CODE = {
  "LAB-CBC": ["WBC 9.1 ×10⁹/L · Hb 13.2 g/dL", "Within normal limits"],
  "LAB-HGB": ["9.8 g/dL", "Low — microcytic picture"],
  "LAB-ESR": ["24 mm/hr", "Mildly raised"],
  "LAB-PLT": ["260 ×10⁹/L", "Normal"],
  "LAB-FBS": ["162 mg/dL", "Elevated"],
  "LAB-RBS": ["188 mg/dL", "Elevated"],
  "LAB-HBA1C": ["8.2 %", "Above target — reinforce adherence"],
  "LAB-LIPID": ["TC 232 · LDL 158 · HDL 38", "Borderline high LDL"],
  "LAB-LFT": ["ALT 68 · AST 54", "Mild transaminitis"],
  "LAB-RFT": ["Urea 34 · Creat 1.1", "Normal"],
  "LAB-CREAT": ["1.1 mg/dL", "Normal"],
  "LAB-TSH": ["3.1 mIU/L", "Normal"],
  "LAB-UA": ["Protein trace · No RBC/WBC", "No significant abnormality"],
  "LAB-MP": ["Not seen", "No malaria parasite detected"],
};

const resultFor = (code) =>
  RESULT_BY_CODE[code] ?? ["Within normal limits", ""];

let itemIdSeq = 6000;

function buildItems(codes, status, completedAt) {
  return codes.map((code, index) => {
    const test = testByCode.get(code);
    // completed: all items done; partial: first half done; pending: none.
    let itemStatus = "pending";
    if (status === "completed") itemStatus = "completed";
    else if (status === "partial" && index === 0) itemStatus = "completed";
    const done = itemStatus === "completed";
    const [value, notes] = done ? resultFor(code) : ["", ""];
    return {
      id: itemIdSeq++,
      lab_test: test
        ? {
            id: test.id,
            code: test.code,
            name: test.name,
            category: test.category,
            unit: test.unit,
            reference_range: test.reference_range,
            sample_type: test.sample_type,
          }
        : { code, name: code },
      status: itemStatus,
      result_value: value,
      result_notes: notes,
      completed_at: done ? completedAt : null,
      completed_by: done ? { id: 4, name: "Technician Hnin" } : null,
    };
  });
}

// [id, patientName, gender, phone, patientId, queue, visitStatus, requestedBy, minutesAgo, status, priority, notes, [testCodes]]
const requestSeeds = [
  [3001, "Daw Khin Mya", "Female", "09-421-111-002", 2, "A-045", "lab", "Dr. San Oo", 40, "pending", "routine", "Diabetes review — glycaemic control", ["LAB-HBA1C", "LAB-FBS"]],
  [3002, "Ma Ei Mon", "Female", "09-421-111-008", 8, "B-018", "consulting", "Dr. Yin Hla", 65, "pending", "urgent", "URTI — rule out bacterial cause", ["LAB-CBC", "LAB-ESR"]],
  [3003, "Ko Min Thu", "Male", "09-502-334455", null, "C-007", "consulting", "Dr. Yin Hla", 20, "pending", "stat", "Symptomatic hyperglycaemia — prioritise", ["LAB-RBS", "LAB-UA"]],
  [3004, "Daw Shwe Yi", "Female", "09-421-111-012", 12, "A-051", "lab", "Dr. San Oo", 95, "partial", "routine", "Anaemia workup", ["LAB-CBC", "LAB-HGB"]],
  [3005, "U Kyaw Lin", "Male", "09-421-111-001", 1, "A-039", "consulting", "Dr. San Oo", 130, "partial", "routine", "Hypertension — baseline renal & lipids", ["LAB-RFT", "LAB-LIPID"]],
  [3006, "U Than Win", "Male", "09-421-111-009", 9, "B-022", "pharmacy", "Dr. Yin Hla", 180, "completed", "routine", "COPD — infection screen", ["LAB-CBC"]],
  [3007, "Ma Ei Mon", "Female", "09-421-111-008", 8, "B-016", "completed", "Dr. Yin Hla", 220, "completed", "routine", "Fever — malaria & CBC", ["LAB-MP", "LAB-CBC"]],
  [3008, "Daw Khin Mya", "Female", "09-421-111-002", 2, "A-030", "completed", "Dr. San Oo", 300, "completed", "routine", "HbA1c monitoring", ["LAB-HBA1C"]],
  [3009, "U Hla Tun", "Male", "09-421-111-005", 5, "A-028", "completed", "Dr. San Oo", 360, "completed", "urgent", "Pre-physiotherapy screen", ["LAB-LFT", "LAB-RFT"]],
];

export const demoLabRequestsRich = requestSeeds.map(
  ([id, name, gender, phone, patientId, queue, visitStatus, requestedBy, minutesAgo, status, priority, notes, codes]) => {
    const requestedAt = now.subtract(minutesAgo, "minute").toISOString();
    const completedAt = now.subtract(Math.max(0, minutesAgo - 20), "minute").toISOString();
    const items = buildItems(codes, status, completedAt);
    return {
      id,
      patient_id: patientId,
      patient: { id: patientId, name, gender, phone },
      visit: { queue_number: queue, status: visitStatus },
      requested_by: { name: requestedBy },
      requested_at: requestedAt,
      status,
      priority,
      notes,
      items,
      items_count: items.length,
      tests: codes.map((c) => testByCode.get(c)?.name ?? c),
    };
  },
);

/** Recompute a request's status from its item statuses. */
export function recomputeLabRequestStatus(request) {
  const items = request.items ?? [];
  const done = items.filter((it) => it.status === "completed").length;
  if (done === 0) return "pending";
  if (done < items.length) return "partial";
  return "completed";
}

export function buildLabStats(requests) {
  const today = dayjs().format("YYYY-MM-DD");
  return {
    pending: requests.filter((r) => r.status === "pending").length,
    partial: requests.filter((r) => r.status === "partial").length,
    completed: requests.filter((r) => r.status === "completed").length,
    todayTotal: requests.filter(
      (r) => dayjs(r.requested_at).format("YYYY-MM-DD") === today,
    ).length,
  };
}

/** Patient pool for the local lab-results register (no API / DB). */
const REGISTER_PATIENTS = [
  ["Daw Khin Mya", "Female", "09-421-111-002"],
  ["U Kyaw Lin", "Male", "09-421-111-001"],
  ["Ma Ei Mon", "Female", "09-421-111-008"],
  ["Daw Shwe Yi", "Female", "09-421-111-012"],
  ["U Than Win", "Male", "09-421-111-009"],
  ["U Hla Tun", "Male", "09-421-111-005"],
  ["Ko Min Thu", "Male", "09-502-334455"],
  ["Ma Thandar Oo", "Female", "09-421-111-015"],
  ["Daw Aye Aye", "Female", "09-421-111-018"],
  ["U Myint Aung", "Male", "09-421-111-021"],
  ["Ma Su Su Hlaing", "Female", "09-421-111-024"],
  ["Ko Zaw Win", "Male", "09-421-111-027"],
];

const REGISTER_DOCTORS = ["Dr. San Oo", "Dr. Yin Hla", "Dr. May Thu", "Dr. Aung Ko"];
const REGISTER_TECHS = ["Technician Hnin", "Lab Tech Moe", "Lab Tech Zin"];
const REGISTER_NOTES = [
  "Diabetes review — glycaemic control",
  "Hypertension — baseline renal & lipids",
  "Fever workup",
  "Antenatal screening",
  "Pre-operative screen",
  "Anaemia follow-up",
  "Thyroid monitoring",
  "Infection screen",
  "Routine OPD investigations",
  "Chest infection — inflammatory markers",
];

const REGISTER_PANELS = [
  ["LAB-HBA1C", "LAB-FBS"],
  ["LAB-CBC", "LAB-ESR"],
  ["LAB-RBS", "LAB-UA"],
  ["LAB-CBC", "LAB-HGB"],
  ["LAB-RFT", "LAB-LIPID"],
  ["LAB-CBC"],
  ["LAB-MP", "LAB-CBC"],
  ["LAB-HBA1C"],
  ["LAB-LFT", "LAB-RFT"],
  ["LAB-TSH", "LAB-FT4"],
  ["LAB-CREAT", "LAB-UREA"],
  ["LAB-HBSAG", "LAB-HCV"],
  ["LAB-PLT", "LAB-HGB"],
  ["LAB-LIPID"],
  ["LAB-UA", "LAB-RBS"],
];

/**
 * Local register of completed lab reports for today (~120 rows).
 * Not loaded from the database — regenerated from the current date.
 */
export function buildDemoLabResultsRegister(count = 120) {
  const today = dayjs();
  const startOfDay = today.startOf("day").hour(8).minute(0);
  const results = [];

  for (let i = 0; i < count; i += 1) {
    const [name, gender, phone] = REGISTER_PATIENTS[i % REGISTER_PATIENTS.length];
    const codes = REGISTER_PANELS[i % REGISTER_PANELS.length];
    const reportedAt = startOfDay
      .add(Math.floor((i * 9) % 540), "minute")
      .add((i % 3) * 2, "minute");
    const requestedAt = reportedAt.subtract(25 + (i % 40), "minute");
    const completedAt = reportedAt.toISOString();
    const doctor = REGISTER_DOCTORS[i % REGISTER_DOCTORS.length];
    const tech = REGISTER_TECHS[i % REGISTER_TECHS.length];
    const queueLetter = String.fromCharCode(65 + (i % 3));
    const queueNum = String(10 + (i % 80)).padStart(3, "0");

    const items = codes.map((code, index) => {
      const test = testByCode.get(code);
      const [value, notes] = resultFor(code);
      return {
        id: 70000 + i * 10 + index,
        lab_test: test
          ? {
              id: test.id,
              code: test.code,
              name: test.name,
              category: test.category,
              unit: test.unit,
              reference_range: test.reference_range,
              sample_type: test.sample_type,
            }
          : { code, name: code },
        status: "completed",
        result_value: value,
        result_notes: notes,
        completed_at: completedAt,
        completed_by: { id: 4 + (i % 3), name: tech },
      };
    });

    results.push({
      id: 10001 + i,
      report_number: `LR-${today.format("YYYYMMDD")}-${String(i + 1).padStart(3, "0")}`,
      patient_id: (i % REGISTER_PATIENTS.length) + 1,
      patient: {
        id: (i % REGISTER_PATIENTS.length) + 1,
        name,
        gender,
        phone,
        age: 22 + ((i * 7) % 55),
      },
      visit: {
        queue_number: `${queueLetter}-${queueNum}`,
        status: "completed",
      },
      requested_by: { name: doctor },
      requested_at: requestedAt.toISOString(),
      reported_at: completedAt,
      status: "completed",
      priority: i % 17 === 0 ? "urgent" : i % 31 === 0 ? "stat" : "routine",
      notes: REGISTER_NOTES[i % REGISTER_NOTES.length],
      items,
      items_count: items.length,
      tests: codes.map((c) => testByCode.get(c)?.name ?? c),
    });
  }

  return results.sort(
    (a, b) => dayjs(b.reported_at).valueOf() - dayjs(a.reported_at).valueOf(),
  );
}

/** Lookup a single local register row by id. */
export function getDemoLabResultById(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  return buildDemoLabResultsRegister(120).find((row) => row.id === numericId) ?? null;
}
