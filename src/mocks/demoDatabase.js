import dayjs from "dayjs";
import { BRAND_COLORS } from "../theme/brandColors";
import { DEFAULT_LIVEBOARD_RULES } from "../utils/roleUtils";
import {
  demoProducts,
  demoSuppliers,
  demoPurchases,
  demoProductCategories,
  demoProductUnits,
  demoProductTypes,
  demoBatchesByProduct,
  demoStockMovements,
  buildInventoryAlerts,
  filterStockMovements,
} from "./inventoryDemo";
import {
  demoLabTests,
  demoLabRequestsRich,
  recomputeLabRequestStatus,
  buildLabStats,
} from "./labDemo";
import {
  demoOtherIncomes,
  demoExpenses,
  demoSupplierPayables,
  demoChartOfIncomeAccounts,
} from "./billingDemo";
import {
  demoStaffs,
  demoLeaves,
  demoAttendance,
  demoOvertimes,
  demoPayrolls,
  demoPublicHolidays,
  demoGrievances,
  buildHrHeadcount,
} from "./hrDemo";

const now = dayjs();
export const DEMO_PASSWORD = "password";

export const DEMO_PERMISSIONS = [
  "patients.view",
  "patients.manage",
  "patients.notes.update",
  "appointments.manage",
  "consultations.manage",
  "treatments.manage",
  "payments.view",
  "payments.manage",
  "liveboard.view",
  "liveboard.update",
  "inventory.view",
  "inventory.manage",
  "treatment_templates.view",
  "treatment_templates.manage",
  "packages.view",
  "packages.create",
  "packages.update",
  "packages.delete",
  "packages.lifecycle",
  "follow_up.update",
  "follow_up.assign",
  "lab.view",
  "lab.results.manage",
  "hr.view",
  "hr.manage",
  "hr.self_service",
  "users.manage",
  "settings.manage",
  "forms.manage",
  "finance.reports.view",
  "finance.chart_of_accounts.view",
  "finance.chart_of_accounts.manage",
  "finance.other_income.view",
  "finance.other_income.manage",
];

const ROLE_PERMISSIONS = {
  ceo: DEMO_PERMISSIONS,
  dermatologist: [
    "patients.view",
    "patients.manage",
    "appointments.manage",
    "consultations.manage",
    "treatments.manage",
    "liveboard.view",
    "liveboard.update",
    "lab.view",
    "lab.results.manage",
    "follow_up.update",
    "hr.self_service",
  ],
  medical_officer: [
    "patients.view",
    "appointments.manage",
    "consultations.manage",
    "treatments.manage",
    "liveboard.view",
    "liveboard.update",
    "lab.view",
    "lab.results.manage",
    "follow_up.update",
    "hr.self_service",
  ],
  senior_nurse: [
    "patients.view",
    "patients.notes.update",
    "consultations.manage",
    "treatments.manage",
    "liveboard.view",
    "liveboard.update",
    "lab.view",
    "lab.results.manage",
    "follow_up.update",
    "follow_up.assign",
    "hr.self_service",
  ],
};

function buildUser(seed) {
  const permissions = ROLE_PERMISSIONS[seed.role] ?? [];
  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    role: seed.role,
    roles: [
      { id: seed.id, slug: seed.role, name: seed.roleLabel ?? seed.role },
    ],
    permissions,
    is_active: true,
    avatar: seed.avatar,
  };
}

/** CEO + 2 doctors + 5 nurses */
export const demoUsers = [
  buildUser({
    id: 1,
    name: "U Aung Min",
    email: "ceo@ihtechno.demo",
    role: "ceo",
    roleLabel: "CEO",
    avatar: "AM",
  }),
  buildUser({
    id: 2,
    name: "Dr. San Oo",
    email: "doctor1@ihtechno.demo",
    role: "medical_officer",
    roleLabel: "Doctor",
    avatar: "SO",
  }),
  buildUser({
    id: 3,
    name: "Dr. Yin Hla",
    email: "doctor2@ihtechno.demo",
    role: "dermatologist",
    roleLabel: "Dermatologist",
    avatar: "YH",
  }),
  buildUser({
    id: 4,
    name: "Nurse Htet Htet",
    email: "nurse1@ihtechno.demo",
    role: "senior_nurse",
    roleLabel: "Senior Nurse",
    avatar: "HH",
  }),
  buildUser({
    id: 5,
    name: "Nurse May May",
    email: "nurse2@ihtechno.demo",
    role: "senior_nurse",
    roleLabel: "Senior Nurse",
    avatar: "MM",
  }),
  buildUser({
    id: 6,
    name: "Nurse Hnin Hnin",
    email: "nurse3@ihtechno.demo",
    role: "senior_nurse",
    roleLabel: "Senior Nurse",
    avatar: "HN",
  }),
  buildUser({
    id: 7,
    name: "Nurse Zin Zin",
    email: "nurse4@ihtechno.demo",
    role: "senior_nurse",
    roleLabel: "Senior Nurse",
    avatar: "ZZ",
  }),
  buildUser({
    id: 8,
    name: "Nurse Su Su",
    email: "nurse5@ihtechno.demo",
    role: "senior_nurse",
    roleLabel: "Senior Nurse",
    avatar: "SS",
  }),
];

export const demoPasswords = Object.fromEntries(
  demoUsers.map((user) => [user.email, DEMO_PASSWORD]),
);

const DEMO_LOGIN_EMAILS = new Set([
  "ceo@ihtechno.demo",
  "doctor1@ihtechno.demo",
  "doctor2@ihtechno.demo",
  "nurse1@ihtechno.demo",
]);

export const DEMO_LOGIN_ACCOUNTS = demoUsers
  .filter((user) => DEMO_LOGIN_EMAILS.has(user.email))
  .map((user) => ({
    email: user.email,
    name: user.name,
    role: user.roles?.[0]?.name ?? user.role,
  }));

const REGISTRY_YEAR = now.year();

const patientSeeds = [
  {
    id: 1,
    name: "U Kyaw Lin",
    phone: "09-421-111-001",
    gender: "male",
    dob: "1965-03-12",
    status: "active",
    daysAgo: 1,
    notes: "Laser facial — pigmentation on cheeks",
  },
  {
    id: 2,
    name: "Daw Khin Mya",
    phone: "09-421-111-002",
    gender: "female",
    dob: "1972-08-04",
    status: "active",
    daysAgo: 3,
    notes: "IV drip wellness — dull skin and fatigue",
  },
  {
    id: 3,
    name: "Mg Zaw Htet",
    phone: "09-421-111-003",
    gender: "male",
    dob: "2008-11-20",
    status: "active",
    daysAgo: 0,
    notes: "Chemical peel consult — acne scarring",
  },
  {
    id: 4,
    name: "Ma Thiri",
    phone: "09-421-111-004",
    gender: "female",
    dob: "1998-05-18",
    status: "active",
    daysAgo: 7,
    notes: "Bridal glow package — wedding in 8 weeks",
  },
  {
    id: 5,
    name: "U Hla Tun",
    phone: "09-421-111-005",
    gender: "male",
    dob: "1958-01-30",
    status: "active",
    daysAgo: 14,
    notes: "Skin rejuvenation — pigmentation on cheeks",
  },
  {
    id: 6,
    name: "Daw Myint Myint",
    phone: "09-421-111-006",
    gender: "female",
    dob: "1949-09-07",
    status: "inactive",
    daysAgo: 45,
    notes: "Moved to another clinic — records archived",
  },
  {
    id: 7,
    name: "Ko Aung Ko",
    phone: "09-421-111-007",
    gender: "male",
    dob: "1990-12-02",
    status: "active",
    daysAgo: 0,
    notes: "Laser hair removal — underarms",
  },
  {
    id: 8,
    name: "Ma Ei Mon",
    phone: "09-421-111-008",
    gender: "female",
    dob: "2001-07-25",
    status: "active",
    daysAgo: 5,
    notes: "Chemical peel follow-up — day 5 aftercare",
  },
  {
    id: 9,
    name: "U Than Win",
    phone: "09-421-111-009",
    gender: "male",
    dob: "1960-04-16",
    status: "active",
    daysAgo: 2,
    notes: "Botox top-up — forehead and crow's feet",
  },
  {
    id: 10,
    name: "Daw Nwe Nwe",
    phone: "09-421-111-010",
    gender: "female",
    dob: "1987-02-11",
    status: "active",
    daysAgo: 0,
    notes: "Anti-aging package booked",
  },
  {
    id: 11,
    name: "Mg Paing",
    phone: "09-421-111-011",
    gender: "male",
    dob: "2016-06-03",
    status: "active",
    daysAgo: 4,
    notes: "Mole mapping with parent present",
  },
  {
    id: 12,
    name: "Daw Shwe Yi",
    phone: "09-421-111-012",
    gender: "female",
    dob: "1993-10-28",
    status: "active",
    daysAgo: 6,
    notes: "Filler consult — nasolabial folds",
  },
];

function buildDemoPatient(seed) {
  const dob = dayjs(seed.dob);
  const registeredAt = now.subtract(120 - seed.id * 3, "day");
  return {
    id: seed.id,
    patient_number: `P-${REGISTRY_YEAR}-${String(seed.id).padStart(4, "0")}`,
    name: seed.name,
    phone: seed.phone,
    email: `${seed.name.toLowerCase().replace(/\s+/g, ".")}@patient.demo`,
    dob: seed.dob,
    birth_day: dob.date(),
    birth_month: dob.month() + 1,
    birth_year: dob.year(),
    gender: seed.gender,
    type: "customer",
    address: "Kamayut Township, Junction City, Yangon, Myanmar",
    status: seed.status,
    notes: seed.notes,
    last_visit_at: now.subtract(seed.daysAgo, "day").toISOString(),
    created_at: registeredAt.toISOString(),
    data_collector: { id: 4, name: "Nurse Htet Htet" },
  };
}

export const demoPatients = patientSeeds.map(buildDemoPatient);

const doctor1 = { id: 2, name: "Dr. San Oo" };
const doctor2 = { id: 3, name: "Dr. Yin Hla" };
const nurse1 = { id: 4, name: "Nurse Htet Htet" };
const nurse2 = { id: 5, name: "Nurse May May" };

function buildVisit(seed) {
  const patient = demoPatients.find((p) => p.id === seed.patientId);
  const dayBase = seed.dayOffset ? now.subtract(seed.dayOffset, "day") : now;
  const visitedAt = dayBase
    .subtract(seed.minutesAgo ?? 60, "minute")
    .toISOString();
  const nurse = seed.nurse ?? null;
  return {
    id: seed.id,
    patient_id: seed.patientId,
    patient: patient
      ? { id: patient.id, name: patient.name, phone: patient.phone }
      : null,
    doctor_id: seed.doctor?.id ?? null,
    doctor: seed.doctor ?? null,
    therapist_id: nurse?.id ?? null,
    therapist: nurse,
    therapists: nurse ? [nurse] : [],
    status: seed.status,
    queue_number: seed.queue,
    visited_at: visitedAt,
    created_at: visitedAt,
    updated_at: visitedAt,
    check_in_mode: seed.checkInMode ?? "walk_in",
    check_in_staff: { id: 4, name: "Nurse Htet Htet" },
    payment: seed.paymentAmount
      ? {
          id: seed.id,
          amount: seed.paymentAmount,
          status: seed.status === "completed" ? "paid" : "unpaid",
        }
      : null,
    paymentAmount: seed.paymentAmount ?? 0,
  };
}

const visitSeeds = [
  { id: 1, patientId: 3, status: "waiting", minutesAgo: 95, queue: "001" },
  { id: 2, patientId: 7, status: "waiting", minutesAgo: 80, queue: "002" },
  {
    id: 3,
    patientId: 1,
    status: "consulting",
    minutesAgo: 65,
    queue: "003",
    doctor: doctor1,
  },
  {
    id: 4,
    patientId: 9,
    status: "consulting",
    minutesAgo: 58,
    queue: "004",
    doctor: doctor2,
  },
  {
    id: 5,
    patientId: 2,
    status: "preparation",
    minutesAgo: 130,
    queue: "005",
    doctor: doctor1,
    nurse: nurse1,
  },
  {
    id: 6,
    patientId: 8,
    status: "payment",
    minutesAgo: 155,
    queue: "006",
    doctor: doctor2,
    nurse: nurse2,
    paymentAmount: 45000,
  },
  {
    id: 7,
    patientId: 4,
    status: "completed",
    minutesAgo: 210,
    queue: "007",
    doctor: doctor1,
    nurse: nurse1,
    paymentAmount: 35000,
  },
  {
    id: 8,
    patientId: 5,
    status: "completed",
    minutesAgo: 190,
    queue: "008",
    doctor: doctor2,
    nurse: nurse2,
    paymentAmount: 52000,
  },
  { id: 9, patientId: 10, status: "waiting", minutesAgo: 35, queue: "009" },
  {
    id: 10,
    patientId: 11,
    status: "treatment",
    minutesAgo: 110,
    queue: "010",
    doctor: doctor1,
    nurse: nurse1,
  },
  {
    id: 11,
    patientId: 12,
    dayOffset: 1,
    status: "completed",
    minutesAgo: 300,
    queue: "001",
    doctor: doctor1,
    nurse: nurse1,
    paymentAmount: 28000,
  },
  {
    id: 12,
    patientId: 6,
    dayOffset: 1,
    status: "completed",
    minutesAgo: 420,
    queue: "002",
    doctor: doctor2,
    nurse: nurse2,
    paymentAmount: 15000,
  },
  {
    id: 13,
    patientId: 1,
    dayOffset: 1,
    status: "completed",
    minutesAgo: 360,
    queue: "003",
    doctor: doctor1,
    paymentAmount: 22000,
  },
  {
    id: 14,
    patientId: 8,
    dayOffset: 2,
    status: "completed",
    minutesAgo: 280,
    queue: "001",
    doctor: doctor2,
    nurse: nurse1,
    paymentAmount: 38000,
  },
  {
    id: 15,
    patientId: 9,
    dayOffset: 2,
    status: "completed",
    minutesAgo: 340,
    queue: "002",
    doctor: doctor1,
    nurse: nurse2,
    paymentAmount: 41000,
  },
];

export const demoVisits = visitSeeds.map(buildVisit);

// ── Clinical records (patient chart depth) ────────────────────────────────
// Condition-appropriate aesthetic content keyed by patient. Attached to each
// patient's doctor-attended visits so charts and the Consultation Room show
// real records in demo mode.
const clinicalProfiles = {
  1: {
    chief_complaint:
      "Uneven pigmentation on both cheeks; wants a brighter, more even tone.",
    examination_note:
      "Fitzpatrick IV. Melasma-like patches on malar cheeks. No active dermatitis. Skin slightly dry.",
    diagnosis_primary: "Facial pigmentation / melasma",
    diagnosis_secondary: ["Sun damage"],
    assessment:
      "Suitable for laser facial with strict SPF. Pause hydroquinone for 5 days before next session.",
    treatment_plan:
      "Laser facial today. Daily SPF 50, gentle cleanser. Review pigmentation in 4 weeks.",
    vitals: { bp: "128/82", pulse: "72", temp: "36.6", spo2: "98" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Melasma, sun damage",
      past_aesthetic_history: "Chemical peel 2024 at another clinic",
    },
    prescription: [
      {
        medicine_name: "Broad-spectrum SPF 50",
        strength: "",
        dosage_form: "cream",
        route: "Topical",
        frequency: "Every morning",
        duration: "30 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "Reapply every 2 hours if outdoors",
      },
    ],
    treatments: [{ name: "Laser Facial", area: "Cheeks" }],
    followUp: { purpose: "review", note: "Pigmentation review at 4 weeks" },
  },
  2: {
    chief_complaint:
      "Tiredness and dull complexion; interested in a wellness IV drip.",
    examination_note:
      "Skin dull, mild dehydration. No active infection. Veins suitable for IV drip.",
    diagnosis_primary: "Dull skin / fatigue — wellness drip candidate",
    diagnosis_secondary: [],
    assessment:
      "No contraindication for vitamin drip. Hydration and glow protocol today.",
    treatment_plan:
      "IV drip wellness session. Increase water intake. Repeat monthly if tolerated.",
    vitals: { bp: "118/76", pulse: "76", temp: "36.6", spo2: "98" },
    medical_history: {
      allergies: "Sulfa drugs — rash",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Dull, dehydrated skin",
      past_aesthetic_history: "Facials only; first IV drip",
    },
    prescription: [
      {
        medicine_name: "Vitamin C serum",
        strength: "15%",
        dosage_form: "serum",
        route: "Topical",
        frequency: "Once nightly",
        duration: "30 days",
        quantity: "1",
        unit: "bottle",
        special_instructions: "Apply after cleanser; use SPF in the morning",
      },
    ],
    treatments: [{ name: "IV Drip", area: "Systemic" }],
    followUp: { purpose: "review", note: "Glow check in 4 weeks" },
  },
  4: {
    chief_complaint:
      "Wants even skin tone and glow before a wedding in 8 weeks.",
    examination_note:
      "Combination skin, mild PIH on cheeks. No active acne. Fitzpatrick III.",
    diagnosis_primary: "Bridal glow — uneven tone and dullness",
    diagnosis_secondary: [],
    assessment: "Good candidate for a staged bridal package. Not pregnant.",
    treatment_plan:
      "Start hydrafacial today. Plan laser facial in 3 weeks, then makeup trial week.",
    vitals: { bp: "112/70", pulse: "80", temp: "36.8", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Mild post-inflammatory hyperpigmentation",
      past_aesthetic_history: "Home facials only",
    },
    prescription: [
      {
        medicine_name: "Hydrating moisturizer",
        strength: "",
        dosage_form: "cream",
        route: "Topical",
        frequency: "Twice daily",
        duration: "30 days",
        quantity: "1",
        unit: "jar",
        special_instructions: "Use after serum; avoid new actives this week",
      },
    ],
    treatments: [{ name: "Hydrafacial", area: "Full face" }],
    followUp: { purpose: "next_session", note: "Laser facial in 3 weeks" },
  },
  5: {
    chief_complaint: "Sun spots on cheeks and forehead; wants clearer skin.",
    examination_note:
      "Solar lentigines on malar and forehead. Texture slightly rough. No open wounds.",
    diagnosis_primary: "Photoaging / solar lentigines",
    diagnosis_secondary: [],
    assessment: "Suitable for skin rejuvenation laser. Strict sun avoidance.",
    treatment_plan:
      "Laser facial today. SPF and hat outdoors. Review pigment fade in 3 weeks.",
    vitals: { bp: "132/80", pulse: "74", temp: "36.5", spo2: "98" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Photoaging, solar lentigines",
      past_aesthetic_history: "None",
    },
    prescription: [
      {
        medicine_name: "Broad-spectrum SPF 50",
        strength: "",
        dosage_form: "cream",
        route: "Topical",
        frequency: "Every morning",
        duration: "30 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "Reapply if sweating or outdoors",
      },
    ],
    treatments: [{ name: "Laser Facial", area: "Full face" }],
    followUp: { purpose: "review", note: "Pigment fade review" },
  },
  8: {
    chief_complaint: "Acne scarring on cheeks; peeling redness on day 5.",
    examination_note:
      "Mild residual erythema after chemical peel. No infection. Ice-pick scars on cheeks.",
    diagnosis_primary: "Acne scarring — post-peel aftercare",
    diagnosis_secondary: [],
    assessment: "Healing as expected. Continue bland skincare; no actives yet.",
    treatment_plan:
      "Soothing aftercare. Next peel in 4 weeks if erythema settled.",
    vitals: { bp: "118/76", pulse: "72", temp: "36.7", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "Topical benzoyl peroxide (paused)",
      chronic_diseases: "Nil",
      skin_conditions: "Acne scarring, post-peel erythema",
      past_aesthetic_history: "Chemical peel 5 days ago",
    },
    prescription: [
      {
        medicine_name: "Healing ointment",
        strength: "",
        dosage_form: "ointment",
        route: "Topical",
        frequency: "Twice daily",
        duration: "7 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "Thin layer on peeled areas; no picking",
      },
    ],
    treatments: [{ name: "Chemical Peel", area: "Cheeks" }],
    followUp: {
      purpose: "review",
      note: "Next peel if erythema settled",
    },
  },
  9: {
    chief_complaint:
      "Forehead lines and crow's feet; requesting Botox top-up.",
    examination_note:
      "Dynamic wrinkles on glabella, forehead, and lateral canthus. No ptosis. Last Botox 5 months ago.",
    diagnosis_primary: "Dynamic facial wrinkles — Botox candidate",
    diagnosis_secondary: [],
    assessment: "Good response historically. Lidocaine allergy noted — use plain toxin.",
    treatment_plan:
      "Botox to forehead, glabella, and crow's feet. Avoid lying flat for 4 hours. Review in 2 weeks.",
    vitals: { bp: "128/78", pulse: "70", temp: "36.5", spo2: "98" },
    medical_history: {
      allergies: "Lidocaine — mild swelling",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Dynamic wrinkles",
      past_aesthetic_history: "Botox every 5–6 months since 2023",
    },
    prescription: [
      {
        medicine_name: "Arnica gel",
        strength: "",
        dosage_form: "gel",
        route: "Topical",
        frequency: "Twice daily",
        duration: "5 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "For bruising if it appears",
      },
    ],
    treatments: [{ name: "Botox", area: "Forehead / crow's feet" }],
    followUp: { purpose: "review", note: "2-week Botox review" },
  },
  11: {
    chief_complaint: "Brown birthmark on the cheek; parent present for mapping.",
    examination_note:
      "Well-defined café-au-lait macule on left cheek. No ulceration. Photos taken.",
    diagnosis_primary: "Café-au-lait macule — mapping and counselling",
    diagnosis_secondary: [],
    assessment: "Benign appearance. Laser option discussed with parent; observe for now.",
    treatment_plan:
      "Photo documentation today. Optional laser consult when older. SPF on the area.",
    vitals: { bp: "—", pulse: "88", temp: "36.6", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "Nil",
      chronic_diseases: "Nil",
      skin_conditions: "Café-au-lait macule",
      past_aesthetic_history: "None",
    },
    prescription: [
      {
        medicine_name: "Children's SPF 50",
        strength: "",
        dosage_form: "lotion",
        route: "Topical",
        frequency: "Every morning",
        duration: "30 days",
        quantity: "1",
        unit: "bottle",
        special_instructions: "Apply to exposed skin before going out",
      },
    ],
    treatments: [{ name: "Initial Consultation", area: "Left cheek" }],
    followUp: { purpose: "review", note: "Photo compare in 6 months" },
  },
  12: {
    chief_complaint: "Nasolabial folds; interested in hyaluronic acid filler.",
    examination_note:
      "Moderate nasolabial folds at rest. Good tissue support. No active cold sores.",
    diagnosis_primary: "Nasolabial folds — filler candidate",
    diagnosis_secondary: [],
    assessment: "Suitable for HA filler. Pre-procedure bloods optional; no herpes history.",
    treatment_plan:
      "Filler to nasolabial folds. Avoid massage for 24 hours. Review in 2 weeks.",
    vitals: { bp: "110/68", pulse: "74", temp: "36.6", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Volume loss, nasolabial folds",
      past_aesthetic_history: "None",
    },
    prescription: [
      {
        medicine_name: "Arnica gel",
        strength: "",
        dosage_form: "gel",
        route: "Topical",
        frequency: "Twice daily",
        duration: "5 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "For bruising if it appears",
      },
    ],
    treatments: [{ name: "Dermal Filler", area: "Nasolabial folds" }],
    followUp: { purpose: "review", note: "Filler review at 2 weeks" },
  },
};

/** Visits that carry a consultation record (doctor attended, past waiting stage). */
const CONSULTED_STATUSES = new Set([
  "consulting",
  "preparation",
  "treatment",
  "payment",
  "completed",
]);

let clinicalIdSeq = 5000;

function buildConsultationForVisit(visit) {
  const profile = clinicalProfiles[visit.patient_id];
  if (!profile || !CONSULTED_STATUSES.has(visit.status) || !visit.doctor) {
    return null;
  }
  const consultationId = clinicalIdSeq++;
  const items = (profile.prescription ?? []).map((rx) => ({
    id: clinicalIdSeq++,
    is_dispensed: visit.status === "completed",
    is_billable: false,
    ...rx,
  }));
  const prescription = items.length
    ? {
        id: clinicalIdSeq++,
        consultation_id: consultationId,
        prescribed_at: visit.visited_at,
        prescribed_by: visit.doctor,
        notes: "Return earlier if swelling, infection, or unexpected reaction.",
        items,
      }
    : null;
  const diagnosisText = [
    profile.diagnosis_primary,
    ...(profile.diagnosis_secondary ?? []),
  ]
    .filter(Boolean)
    .join("; ");

  return {
    id: consultationId,
    visit_id: visit.id,
    patient_id: visit.patient_id,
    doctor: visit.doctor,
    // Flat fields (chart tabs)
    chief_complaint: profile.chief_complaint,
    diagnosis: diagnosisText,
    assessment_notes: profile.assessment,
    treatment_plan: profile.treatment_plan,
    summary: profile.assessment,
    prescribed_treatment: (profile.treatments ?? [])
      .map((t) => t.name)
      .join(", "),
    notes: "",
    // Structured fields (Consultation Room editor)
    diagnosis_structured: {
      primary: profile.diagnosis_primary,
      secondary: profile.diagnosis_secondary ?? [],
    },
    condition_snapshot: { skin_type: null, fitzpatrick: null, conditions: [] },
    risk_flags: {
      is_pregnant: Boolean(profile.isPregnant),
      has_active_infection: Boolean(profile.hasInfection),
      allergies: profile.medical_history?.allergies
        ? [profile.medical_history.allergies]
        : [],
      medications: profile.medical_history?.current_medications
        ? [profile.medical_history.current_medications]
        : [],
    },
    vital_sign_bp: profile.vitals?.bp ?? "",
    vital_sign_pulse: profile.vitals?.pulse ?? "",
    vital_sign_temp: profile.vitals?.temp ?? "",
    vital_sign_spo2: profile.vitals?.spo2 ?? "",
    examination_note: profile.examination_note ?? "",
    next_follow_up: {
      date: null,
      purpose: profile.followUp?.purpose ?? null,
      note: profile.followUp?.note ?? null,
      priority: "required",
    },
    session_fee_enabled: true,
    session_fee_amount: 15000,
    session_discount_percent: 0,
    session_fee_foc: false,
    prescription: prescription
      ? { items: prescription.items, notes: prescription.notes }
      : null,
    prescriptionRecord: prescription,
    treatmentSeeds: profile.treatments ?? [],
    created_at: visit.visited_at,
    updated_at: visit.visited_at,
  };
}

function buildTreatmentsForConsultation(consultation) {
  return (consultation.treatmentSeeds ?? []).map((t) => ({
    id: clinicalIdSeq++,
    visit_id: consultation.visit_id,
    name: t.name,
    status: "done",
    notes: "",
    items: [
      {
        id: clinicalIdSeq++,
        procedure_name: t.name,
        product_name: "—",
        treatment_area: t.area ?? "General",
      },
    ],
  }));
}

// Attach clinical records to each visit and build lookup maps.
export const demoConsultationsByVisit = {};
export const demoPrescriptionsByVisit = {};
export const demoTreatmentsByVisit = {};

demoVisits.forEach((visit) => {
  visit.visit_time = visit.visited_at;
  const consultation = buildConsultationForVisit(visit);
  if (!consultation) {
    visit.consultations = [];
    visit.consultation = null;
    visit.prescriptions = [];
    visit.treatments = [];
    visit.photos = [];
    return;
  }
  const treatments = buildTreatmentsForConsultation(consultation);
  const prescriptions = consultation.prescriptionRecord
    ? [consultation.prescriptionRecord]
    : [];
  demoConsultationsByVisit[visit.id] = consultation;
  demoPrescriptionsByVisit[visit.id] = prescriptions;
  demoTreatmentsByVisit[visit.id] = treatments;
  visit.consultation = consultation;
  visit.consultations = [consultation];
  visit.prescriptions = prescriptions;
  visit.treatments = treatments;
  visit.photos = [];
});

/** Medical & aesthetic history record per patient (Medical History tab). */
export const demoMedicalHistoriesByPatient = {};
Object.entries(clinicalProfiles).forEach(([patientId, profile]) => {
  const mh = profile.medical_history ?? {};
  demoMedicalHistoriesByPatient[Number(patientId)] = {
    id: Number(patientId),
    patient_id: Number(patientId),
    allergies: mh.allergies ?? "",
    current_medications: mh.current_medications ?? "",
    chronic_diseases: mh.chronic_diseases ?? "",
    pregnancy_status: Boolean(mh.pregnancy),
    breastfeeding_status: false,
    skin_conditions: mh.skin_conditions ?? "",
    past_aesthetic_history: mh.past_aesthetic_history ?? "",
  };
});

/** Detailed lab requests + results per patient (Lab Results tab). */
export const demoLabResultsByPatient = {};
demoVisits.forEach((visit) => {
  const profile = clinicalProfiles[visit.patient_id];
  if (!profile?.labs?.length || !demoConsultationsByVisit[visit.id]) return;
  const request = {
    id: clinicalIdSeq++,
    patient_id: visit.patient_id,
    visit_id: visit.id,
    visit: {
      id: visit.id,
      visit_time: visit.visited_at,
      created_at: visit.visited_at,
      status: visit.status,
      doctor: visit.doctor,
      therapist: visit.therapist,
      check_in_mode: visit.check_in_mode,
    },
    status: "completed",
    requested_at: visit.visited_at,
    requested_by: visit.doctor,
    notes: "",
    items: profile.labs.map((lab) => ({
      id: clinicalIdSeq++,
      status: lab.status ?? "completed",
      result_value: lab.value,
      result_notes: lab.notes,
      completed_at: visit.visited_at,
      lab_test: {
        name: lab.name,
        code: lab.code,
        reference_range: lab.reference,
      },
    })),
  };
  if (!demoLabResultsByPatient[visit.patient_id]) {
    demoLabResultsByPatient[visit.patient_id] = [];
  }
  demoLabResultsByPatient[visit.patient_id].push(request);
});

const patientById = new Map(demoPatients.map((p) => [p.id, p]));

/** Clinic-wide encounter (consultation) register across all patients. */
export function buildEncountersRegister() {
  return demoVisits
    .filter((visit) => visit.consultation)
    .map((visit) => {
      const patient = patientById.get(visit.patient_id);
      const c = visit.consultation;
      return {
        id: c.id,
        visit_id: visit.id,
        patient_id: visit.patient_id,
        patient_name: patient?.name ?? visit.patient?.name ?? "—",
        patient_number: patient?.patient_number ?? "—",
        gender: patient?.gender ?? null,
        doctor_name: visit.doctor?.name ?? "—",
        date: visit.visited_at,
        chief_complaint: c.chief_complaint ?? "",
        diagnosis: c.diagnosis_structured?.primary ?? c.diagnosis ?? "",
        status: visit.status,
        has_prescription: (visit.prescriptions ?? []).length > 0,
        follow_up: c.next_follow_up?.note ?? null,
      };
    })
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
}

/** Clinic-wide prescription register across all patients. */
export function buildPrescriptionsRegister() {
  const rows = [];
  demoVisits.forEach((visit) => {
    const patient = patientById.get(visit.patient_id);
    (visit.prescriptions ?? []).forEach((rx) => {
      rows.push({
        id: rx.id,
        visit_id: visit.id,
        patient_id: visit.patient_id,
        patient_name: patient?.name ?? visit.patient?.name ?? "—",
        patient_number: patient?.patient_number ?? "—",
        doctor_name: rx.prescribed_by?.name ?? visit.doctor?.name ?? "—",
        date: rx.prescribed_at ?? visit.visited_at,
        item_count: (rx.items ?? []).length,
        medicines: (rx.items ?? [])
          .map(
            (it) =>
              `${it.medicine_name}${it.strength ? ` ${it.strength}` : ""}`,
          )
          .join(", "),
        dispensed: (rx.items ?? []).some((it) => it.is_dispensed),
        notes: rx.notes ?? "",
      });
    });
  });
  return rows.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
}

/** Build a chronological patient-chart timeline from their records. */
export function buildPatientTimeline(patientId, visits) {
  const events = [];
  visits.forEach((visit) => {
    events.push({
      type: "visit",
      reference_id: visit.id,
      event_at: visit.visited_at ?? visit.created_at,
      title: `Visit #${visit.queue_number ?? visit.id} — ${visit.status}`,
    });
    if (visit.consultation) {
      events.push({
        type: "consultation",
        reference_id: visit.consultation.id,
        event_at: visit.visited_at ?? visit.created_at,
        title: `Consultation — ${visit.consultation.diagnosis_structured?.primary ?? "recorded"}`,
      });
    }
    (visit.prescriptions ?? []).forEach((rx) => {
      events.push({
        type: "prescription",
        reference_id: rx.id,
        event_at: rx.prescribed_at,
        title: `Prescription — ${rx.items.length} medicine(s)`,
      });
    });
    if (visit.payment) {
      events.push({
        type: "payment",
        reference_id: visit.payment.id,
        event_at: visit.visited_at ?? visit.created_at,
        title: `Payment — ${visit.payment.status}`,
      });
    }
  });
  (demoLabResultsByPatient[patientId] ?? []).forEach((req) => {
    events.push({
      type: "lab",
      reference_id: req.id,
      event_at: req.requested_at,
      title: `Lab — ${req.items.map((i) => i.lab_test.name).join(", ")}`,
    });
  });
  return events.sort(
    (a, b) => dayjs(b.event_at).valueOf() - dayjs(a.event_at).valueOf(),
  );
}

export const demoAppointments = [
  {
    id: 1,
    patient_id: 1,
    patient: { id: 1, name: "U Kyaw Lin", phone: "09-421-111-001" },
    doctor_id: 2,
    doctor: doctor1,
    scheduled_at: now.add(1, "day").hour(9).minute(0).toISOString(),
    status: "confirmed",
    notes: "Laser facial — pigmentation review",
  },
  {
    id: 2,
    patient_id: 2,
    patient: { id: 2, name: "Daw Khin Mya", phone: "09-421-111-002" },
    doctor_id: 3,
    doctor: doctor2,
    scheduled_at: now.add(1, "day").hour(10).minute(30).toISOString(),
    status: "pending",
    notes: "IV drip wellness follow-up",
  },
  {
    id: 3,
    patient_id: 4,
    patient: { id: 4, name: "Ma Thiri", phone: "09-421-111-004" },
    doctor_id: 2,
    doctor: doctor1,
    scheduled_at: now.add(2, "day").hour(11).minute(0).toISOString(),
    status: "confirmed",
    notes: "Bridal glow — laser facial session",
  },
  {
    id: 4,
    patient_id: 6,
    patient: { id: 6, name: "Daw Myint Myint", phone: "09-421-111-006" },
    doctor_id: 3,
    doctor: doctor2,
    scheduled_at: now.subtract(1, "day").hour(14).minute(0).toISOString(),
    status: "completed",
    notes: "Records handover completed",
  },
  {
    id: 5,
    patient_id: 9,
    patient: { id: 9, name: "U Than Win", phone: "09-421-111-009" },
    doctor_id: 3,
    doctor: doctor2,
    scheduled_at: now.add(3, "day").hour(15).minute(0).toISOString(),
    status: "pending",
    notes: "Botox 2-week review",
  },
  {
    id: 6,
    patient_id: 10,
    patient: { id: 10, name: "Daw Nwe Nwe", phone: "09-421-111-010" },
    doctor_id: 2,
    doctor: doctor1,
    scheduled_at: now.add(4, "day").hour(8).minute(30).toISOString(),
    status: "confirmed",
    notes: "Anti-aging package session",
  },
];

// [id, invoiceNo, visitId, patientId, patientName, amount, status, hoursAgo, items]
const invoiceSeeds = [
  [
    1,
    "INV-2026-1001",
    7,
    4,
    "Ma Thiri",
    35000,
    "paid",
    3,
    [
      ["Initial Consultation", 15000],
      ["Hydrafacial", 20000],
    ],
  ],
  [
    2,
    "INV-2026-1002",
    8,
    5,
    "U Hla Tun",
    52000,
    "paid",
    4,
    [
      ["Initial Consultation", 15000],
      ["Laser Facial", 25000],
      ["SPF 50", 12000],
    ],
  ],
  [
    3,
    "INV-2026-1003",
    6,
    8,
    "Ma Ei Mon",
    45000,
    "unpaid",
    2,
    [
      ["Initial Consultation", 15000],
      ["Chemical Peel", 18000],
      ["Healing ointment", 12000],
    ],
  ],
  [
    4,
    "INV-2026-1004",
    13,
    1,
    "U Kyaw Lin",
    22000,
    "paid",
    26,
    [
      ["Initial Consultation", 15000],
      ["Laser Facial", 7000],
    ],
  ],
  [
    5,
    "INV-2026-1005",
    5,
    2,
    "Daw Khin Mya",
    68000,
    "paid",
    27,
    [
      ["Initial Consultation", 15000],
      ["IV Drip", 22000],
      ["Vitamin C serum", 8000],
      ["Hydrating moisturizer", 23000],
    ],
  ],
  [
    6,
    "INV-2026-1006",
    4,
    9,
    "U Than Win",
    41000,
    "issued",
    5,
    [
      ["Initial Consultation", 15000],
      ["Botox", 10000],
      ["Arnica gel", 16000],
    ],
  ],
  [
    7,
    "INV-2026-1007",
    10,
    11,
    "Mg Paing",
    18000,
    "paid",
    28,
    [
      ["Initial Consultation", 15000],
      ["Children's SPF 50", 3000],
    ],
  ],
  [
    8,
    "INV-2026-1008",
    11,
    12,
    "Daw Shwe Yi",
    28000,
    "paid",
    30,
    [
      ["Initial Consultation", 15000],
      ["Dermal Filler", 18000],
    ],
  ],
  [
    9,
    "INV-2026-1009",
    2,
    7,
    "Ko Aung Ko",
    12000,
    "unpaid",
    1,
    [["Laser Hair Removal", 12000]],
  ],
  [
    10,
    "INV-2026-1010",
    9,
    10,
    "Daw Nwe Nwe",
    95000,
    "paid",
    50,
    [["Anti-aging Package", 95000]],
  ],
  [
    11,
    "INV-2026-1011",
    1,
    3,
    "Mg Zaw Htet",
    15000,
    "issued",
    1,
    [["Initial Consultation", 15000]],
  ],
  [
    12,
    "INV-2026-1012",
    8,
    5,
    "U Hla Tun",
    8000,
    "void",
    52,
    [["Follow-up Consultation", 8000]],
  ],
];

export const demoPayments = invoiceSeeds.map(
  ([
    id,
    invoice_number,
    visit_id,
    patient_id,
    patientName,
    amount,
    status,
    hoursAgo,
    items,
  ]) => {
    const createdAt = now.subtract(hoursAgo, "hour");
    const isPaid = status === "paid";
    return {
      id,
      invoice_number,
      visit_id,
      patient_id,
      patient: { id: patient_id, name: patientName },
      customer_name: patientName,
      amount,
      total_amount: amount,
      paid_amount: isPaid ? amount : 0,
      balance: isPaid ? 0 : amount,
      status,
      paid_at: isPaid ? createdAt.add(20, "minute").toISOString() : null,
      created_at: createdAt.toISOString(),
      items: items.map(([name, price]) => ({ name, price })),
      transactions: [],
    };
  },
);

export const demoFollowUps = [
  {
    id: 1,
    patient_id: 1,
    patient: { id: 1, name: "U Kyaw Lin" },
    due_date: now.subtract(1, "day").format("YYYY-MM-DD"),
    status: "pending",
    type: "treatment",
    follow_up_context: { headline: "Laser facial pigment review" },
  },
  {
    id: 2,
    patient_id: 2,
    patient: { id: 2, name: "Daw Khin Mya" },
    due_date: now.format("YYYY-MM-DD"),
    status: "in_progress",
    type: "treatment",
    follow_up_context: { headline: "IV drip glow check" },
  },
  {
    id: 3,
    patient_id: 9,
    patient: { id: 9, name: "U Than Win" },
    due_date: now.add(2, "day").format("YYYY-MM-DD"),
    status: "pending",
    type: "after_service",
    follow_up_context: { headline: "Botox 2-week review" },
  },
  {
    id: 4,
    patient_id: 11,
    patient: { id: 11, name: "Mg Paing" },
    due_date: now.add(1, "day").format("YYYY-MM-DD"),
    status: "pending",
    type: "treatment",
    follow_up_context: { headline: "Birthmark photo compare" },
  },
];

export const demoSettings = {
  logo_url: null,
  primary_color: BRAND_COLORS.primary,
  secondary_color: BRAND_COLORS.secondary,
  background_color: BRAND_COLORS.background,
  sidebar_accent_color: BRAND_COLORS.sidebarAccent,
  clinic_name: "Beautisoon",
  clinic_description:
    "Aesthetic clinic in Yangon — skincare, laser treatments, injectables, and beauty wellness",
  clinic_address:
    "Level 4, Junction City, Kyun Taw Road, Kamayut Township, Yangon 11041, Myanmar",
  clinic_phones: ["09-779-123-456", "01-230-4567"],
  clinic_emails: ["hello@beautisoon.com"],
  clinic_website: "https://aesthetic.ihtechno.com",
  invoice_next_number: 1001,
  appointment_hours_start: "08:00",
  appointment_hours_end: "20:00",
  hr_default_grace_minutes: 10,
  hr_default_shift_start: "08:00",
  hr_default_shift_end: "20:00",
  default_branch_id: 1,
  vat_enabled: false,
  default_vat_percent: 0,
  liveboard_rules: DEFAULT_LIVEBOARD_RULES,
  assign_doctor_roles: [
    "medical_officer",
    "dermatologist",
    "senior_nurse",
    "ceo",
  ],
  inventory_fifo_ownership_preference: "purchased",
};

export const demoRoles = [
  { id: 1, slug: "ceo", name: "CEO", permissions: DEMO_PERMISSIONS },
  {
    id: 2,
    slug: "medical_officer",
    name: "Doctor",
    permissions: ROLE_PERMISSIONS.medical_officer,
  },
  {
    id: 3,
    slug: "dermatologist",
    name: "Dermatologist",
    permissions: ROLE_PERMISSIONS.dermatologist,
  },
  {
    id: 4,
    slug: "senior_nurse",
    name: "Senior Nurse",
    permissions: ROLE_PERMISSIONS.senior_nurse,
  },
];

export const demoDepartments = [
  { id: 1, name: "Administration", code: "management" },
  { id: 2, name: "Front Desk", code: "operation" },
  { id: 3, name: "Treatment Room", code: "operation" },
  { id: 4, name: "Dermatology", code: "operation" },
  { id: 5, name: "Pharmacy", code: "operation" },
];

// demoStaffs now comes from ./hrDemo (rich clinic roster) — see imports/exports.

export {
  demoProducts,
  demoSuppliers,
  demoPurchases,
  demoProductCategories,
  demoProductUnits,
  demoProductTypes,
  demoBatchesByProduct,
  demoStockMovements,
  buildInventoryAlerts,
  filterStockMovements,
};
export { demoLabTests, recomputeLabRequestStatus, buildLabStats };
export {
  demoOtherIncomes,
  demoExpenses,
  demoSupplierPayables,
  demoChartOfIncomeAccounts,
};
export {
  demoStaffs,
  demoLeaves,
  demoAttendance,
  demoOvertimes,
  demoPayrolls,
  demoPublicHolidays,
  demoGrievances,
  buildHrHeadcount,
};

export const demoTreatmentCategories = [
  { id: 1, name: "Consultation" },
  { id: 2, name: "Injectables" },
  { id: 3, name: "Laser & Light" },
  { id: 4, name: "Peels & Facials" },
  { id: 5, name: "Body & Hair" },
  { id: 6, name: "Wellness" },
];

const treatmentCategoryById = new Map(
  demoTreatmentCategories.map((c) => [c.id, c]),
);

// [name, categoryId, duration_minutes, price]
const treatmentTemplateSeeds = [
  ["Initial Consultation", 1, 20, 15000],
  ["Specialist Consultation", 1, 30, 30000],
  ["Follow-up Consultation", 1, 15, 8000],
  ["Botox", 2, 30, 180000],
  ["Dermal Filler", 2, 45, 350000],
  ["Skin Booster", 2, 40, 220000],
  ["Laser Facial", 3, 45, 120000],
  ["Laser Hair Removal", 3, 30, 80000],
  ["Pigmentation Laser", 3, 40, 150000],
  ["Chemical Peel", 4, 30, 65000],
  ["Hydrafacial", 4, 45, 85000],
  ["Carbon Laser Facial", 4, 40, 95000],
  ["Body Contouring", 5, 60, 180000],
  ["IV Drip", 6, 45, 75000],
  ["Vitamin Glow Facial", 6, 50, 90000],
];

export const demoTreatmentTemplates = treatmentTemplateSeeds.map(
  ([name, categoryId, duration_minutes, price], index) => ({
    id: index + 1,
    name,
    category: treatmentCategoryById.get(categoryId) ?? null,
    category_id: categoryId,
    duration_minutes,
    price,
    is_active: true,
  }),
);

const templateIdByName = new Map(
  demoTreatmentTemplates.map((t) => [t.name, t.id]),
);
const tpl = (name) => templateIdByName.get(name);

// [name, price, validity_days, description, [ [templateName, sessions], ... ]]
const packageSeeds = [
  [
    "Skin Rejuvenation Package",
    280000,
    90,
    "Consultation, hydrafacial and laser facial for brighter, even skin.",
    [
      ["Initial Consultation", 1],
      ["Hydrafacial", 2],
      ["Laser Facial", 1],
    ],
  ],
  [
    "Anti-aging Package",
    450000,
    120,
    "Botox, skin booster and follow-up for expression lines.",
    [
      ["Initial Consultation", 1],
      ["Botox", 1],
      ["Skin Booster", 1],
      ["Follow-up Consultation", 1],
    ],
  ],
  [
    "Bridal Glow Package",
    380000,
    90,
    "Staged glow plan: hydrafacial, peel and laser before the wedding.",
    [
      ["Initial Consultation", 1],
      ["Hydrafacial", 2],
      ["Chemical Peel", 1],
      ["Laser Facial", 1],
    ],
  ],
  [
    "Acne Clear Package",
    220000,
    90,
    "Peels and carbon laser for acne marks and texture.",
    [
      ["Follow-up Consultation", 2],
      ["Chemical Peel", 3],
      ["Carbon Laser Facial", 1],
    ],
  ],
  [
    "Laser Hair Removal Package",
    320000,
    180,
    "Six underarm or small-area laser hair sessions.",
    [["Laser Hair Removal", 6]],
  ],
  [
    "Wellness Glow Package",
    210000,
    90,
    "IV drip and vitamin facial for dull, tired skin.",
    [
      ["IV Drip", 3],
      ["Vitamin Glow Facial", 1],
    ],
  ],
  [
    "Pigmentation Reset Package",
    360000,
    120,
    "Targeted laser and peel for melasma and sun spots.",
    [
      ["Specialist Consultation", 1],
      ["Pigmentation Laser", 3],
      ["Chemical Peel", 1],
    ],
  ],
  [
    "Filler Refresh Package",
    520000,
    90,
    "Dermal filler with review and aftercare consult.",
    [
      ["Initial Consultation", 1],
      ["Dermal Filler", 1],
      ["Follow-up Consultation", 1],
    ],
  ],
];

export const demoPackages = packageSeeds.map(
  ([name, price, validity_days, description, lines], index) => {
    const items = lines
      .map(([templateName, sessions], itemIndex) => {
        const treatmentTemplateId = tpl(templateName);
        if (!treatmentTemplateId) return null;
        return {
          id: (index + 1) * 100 + itemIndex,
          treatment_template_id: treatmentTemplateId,
          treatment_template: { id: treatmentTemplateId, name: templateName },
          total_sessions: sessions,
        };
      })
      .filter(Boolean);
    const sessionsTotal = items.reduce((s, it) => s + it.total_sessions, 0);
    return {
      id: index + 1,
      name,
      description,
      price,
      validity_days,
      is_active: true,
      items,
      items_count: items.length,
      sessions_total: sessionsTotal,
      sessions_remaining: sessionsTotal,
    };
  },
);

export const demoLabRequests = demoLabRequestsRich;

// demoLeaves and demoAttendance now come from ./hrDemo — see imports/exports.

export const demoTransactionMethods = [
  {
    id: 1,
    name: "Cash",
    ledger_kind: "cash",
    bank_name: null,
    account_or_phone: null,
    is_default: true,
    is_system: true,
    status: "active",
  },
  {
    id: 2,
    name: "Bank Transfer",
    ledger_kind: "transfer",
    bank_name: "KBZ Bank",
    account_or_phone: "012-345-6789",
    is_default: false,
    is_system: false,
    status: "active",
  },
  {
    id: 3,
    name: "KBZ Pay",
    ledger_kind: "e-wallet",
    bank_name: "KBZ Pay",
    account_or_phone: "09-421-000-111",
    is_default: false,
    is_system: false,
    status: "active",
  },
];

// Field tuple: [label, type, required?, options?]
//   options = array  → choices for radio/select
//   type "rich_text" → options string becomes the printed consent/legal text
const T = (label, type = "text", required = false, options = null) => ({
  label,
  type,
  required,
  options,
});

const consentBlock = (html) => T("Statement", "rich_text", false, html);

// [name, slug, form_type, description, is_active, fields[]]
const formSeeds = [
  [
    "Patient Registration",
    "patient-registration",
    "intake",
    "Front-desk registration for new patients.",
    true,
    [
      T("Full name", "text", true),
      T("NRC / National ID", "text"),
      T("Date of birth", "date", true),
      T("Gender", "radio", true, ["Male", "Female", "Other"]),
      T("Primary phone", "text", true),
      T("Email", "text"),
      T("Home address", "textarea", true),
      T("Emergency contact name", "text"),
      T("Emergency contact phone", "text"),
      T("How did you hear about us?", "select", false, [
        "Walk-in",
        "Instagram",
        "Friend / family",
        "Google",
        "Other",
      ]),
    ],
  ],
  [
    "Aesthetic Health Information",
    "aesthetic_health_information_mm",
    "questionnaire",
    "Treatment interests, skincare, allergies and aesthetic medical history.",
    true,
    [
      T("Requested treatment", "textarea", true),
      T("Treatments of interest", "textarea"),
      T("Current skincare routine", "textarea"),
      T("Known drug allergies", "textarea"),
      T("Lidocaine allergy?", "radio", true, ["Yes", "No", "Not sure"]),
      T("Recent herpes outbreak?", "radio", false, ["Yes", "No"]),
      T("Skin conditions", "textarea"),
      T("Past aesthetic / surgical history", "textarea"),
      T("Are you pregnant?", "radio", false, ["Yes", "No", "Not applicable"]),
      T("Currently breastfeeding?", "radio", false, [
        "Yes",
        "No",
        "Not applicable",
      ]),
    ],
  ],
  [
    "General Consent for Treatment",
    "general-consent",
    "consent",
    "Standard consent to examination and aesthetic treatment.",
    true,
    [
      consentBlock(
        "<p>I hereby consent to examination and to such aesthetic treatment as the attending doctor or therapist considers appropriate. I confirm that the nature of the proposed treatment, expected results and possible side-effects have been explained to me.</p><p>I understand that no guarantee has been made regarding the outcome of treatment.</p>",
      ),
      T("Patient / guardian name", "text", true),
      T("Relationship (if guardian)", "text"),
      T("Signature", "text", true),
      T("Date", "date", true),
    ],
  ],
  [
    "Botox / Injectable Consent",
    "botox-consent",
    "consent",
    "Informed consent for botulinum toxin and injectable treatments.",
    true,
    [
      T("Treatment area", "text", true),
      T("Product", "select", true, ["Botox", "Dysport", "Skin booster", "Other"]),
      consentBlock(
        "<p>The nature, purpose, benefits, risks and alternatives of injectable treatment have been explained to me, including bruising, swelling, asymmetry and rare complications. I consent to the treatment recorded above.</p>",
      ),
      T("Patient name", "text", true),
      T("Signature", "text", true),
      T("Witness name", "text"),
      T("Date", "date", true),
    ],
  ],
  [
    "Photo / Before-After Consent",
    "photo-consent",
    "consent",
    "Consent to clinical photography for the patient chart and optional marketing.",
    true,
    [
      T("Allow chart photos", "radio", true, ["Yes", "No"]),
      T("Allow marketing / social use", "radio", true, ["Yes", "No"]),
      consentBlock(
        "<p>I consent to photographs being taken for my clinical record. If I also agree to marketing use, images may be used on the clinic website or social media without identifying my name.</p>",
      ),
      T("Patient name", "text", true),
      T("Signature", "text", true),
      T("Date", "date", true),
    ],
  ],
  [
    "Laser Treatment Consent",
    "laser-consent",
    "consent",
    "Informed consent for laser facial, hair removal and pigmentation laser.",
    true,
    [
      T("Laser type / device", "text", true),
      T("Treatment area", "text", true),
      consentBlock(
        "<p>Risks including redness, swelling, pigment change, blistering and the need for multiple sessions have been explained. I will follow sun-avoidance and aftercare instructions.</p>",
      ),
      T("Patient name", "text", true),
      T("Signature", "text", true),
      T("Date", "date", true),
    ],
  ],
  [
    "Chemical Peel Consent",
    "peel-consent",
    "consent",
    "Consent and aftercare acknowledgement for chemical peels.",
    true,
    [
      T("Peel type", "select", true, ["Superficial", "Medium", "Combination"]),
      T("Treatment area", "text", true),
      consentBlock(
        "<p>Expected peeling, redness and downtime have been explained. I will avoid picking, sun exposure and active skincare until advised.</p>",
      ),
      T("Patient name", "text", true),
      T("Signature", "text", true),
      T("Date", "date", true),
    ],
  ],
  [
    "Treatment Aftercare",
    "aftercare-instructions",
    "other",
    "Post-treatment care instructions given to the patient.",
    true,
    [
      T("Treatment given", "text", true),
      T("Aftercare instructions", "textarea", true),
      T("Products to use", "textarea"),
      T("Products to avoid", "textarea"),
      T("Follow-up date", "date"),
      T("Clinician name", "text"),
    ],
  ],
  [
    "Patient Feedback Survey",
    "feedback-survey",
    "questionnaire",
    "Post-visit satisfaction survey.",
    false,
    [
      T("Overall satisfaction", "radio", false, [
        "Very satisfied",
        "Satisfied",
        "Neutral",
        "Dissatisfied",
      ]),
      T("Waiting time", "radio", false, ["Short", "Acceptable", "Too long"]),
      T("Staff courtesy", "radio", false, [
        "Excellent",
        "Good",
        "Fair",
        "Poor",
      ]),
      T("Would you recommend us?", "radio", false, ["Yes", "No", "Maybe"]),
      T("Comments / suggestions", "textarea"),
    ],
  ],
];

let formFieldIdSeq = 9000;

export const demoForms = formSeeds.map(
  ([name, slug, form_type, description, is_active, fieldDefs], index) => ({
    id: index + 1,
    name,
    slug,
    form_type,
    description,
    fields_count: fieldDefs.length,
    is_active: is_active !== false,
    version: 1,
    updated_at: now.subtract(index, "day").toISOString(),
    created_at: now.subtract(index + 30, "day").toISOString(),
  }),
);

/** Detailed field definitions per form id (for the form details / preview page). */
export const demoFormFieldsByFormId = {};
formSeeds.forEach(([, , , , , fieldDefs], index) => {
  const formId = index + 1;
  demoFormFieldsByFormId[formId] = fieldDefs.map((def, fieldIndex) => ({
    id: formFieldIdSeq++,
    form_id: formId,
    order: fieldIndex + 1,
    label: def.label,
    type: def.type,
    required: Boolean(def.required),
    options:
      def.type === "rich_text"
        ? { rich_text: true, default_html: def.options }
        : Array.isArray(def.options)
          ? def.options
          : null,
  }));
});

/** Build the full form-detail payload the details/preview page expects. */
export function buildFormDetail(formId) {
  const form = demoForms.find((f) => f.id === Number(formId));
  if (!form) return null;
  const versionId = form.id * 10 + 1;
  return {
    form: {
      ...form,
      responses_count: 0,
      required_form_links_count: 0,
      draft_version: null,
      published_version: { id: versionId, version_number: 1 },
    },
    fields: demoFormFieldsByFormId[form.id] ?? [],
    version: { id: versionId, version_number: 1, status: "published" },
    version_history: [
      {
        id: versionId,
        version_number: 1,
        status: "published",
        updated_at: form.updated_at,
      },
    ],
  };
}

/** Mutable in-memory store — survives for the browser session. */
export function createDemoStore() {
  return {
    users: demoUsers.map((u) => ({ ...u })),
    patients: demoPatients.map((p) => ({ ...p })),
    visits: demoVisits.map((v) => ({ ...v })),
    appointments: demoAppointments.map((a) => ({ ...a })),
    payments: demoPayments.map((p) => ({ ...p })),
    followUps: demoFollowUps.map((f) => ({ ...f })),
    settings: { ...demoSettings },
    roles: demoRoles.map((r) => ({ ...r })),
    departments: demoDepartments.map((d) => ({ ...d })),
    staffs: demoStaffs.map((s) => ({ ...s })),
    products: demoProducts.map((p) => ({ ...p })),
    suppliers: demoSuppliers.map((s) => ({ ...s })),
    purchases: demoPurchases.map((p) => ({ ...p })),
    productCategories: demoProductCategories.map((c) => ({ ...c })),
    productUnits: demoProductUnits.map((u) => ({ ...u })),
    productTypes: demoProductTypes.map((t) => ({ ...t })),
    nextSupplierId: demoSuppliers.length + 1,
    nextPurchaseId: demoPurchases.length + 1,
    otherIncomes: demoOtherIncomes.map((r) => ({ ...r })),
    expenses: demoExpenses.map((r) => ({ ...r })),
    supplierPayables: demoSupplierPayables.map((r) => ({ ...r })),
    nextOtherIncomeId: demoOtherIncomes.length + 1,
    nextExpenseId: demoExpenses.length + 1,
    nextSupplierPayableId: demoSupplierPayables.length + 1,
    treatmentTemplates: demoTreatmentTemplates.map((t) => ({ ...t })),
    treatmentCategories: demoTreatmentCategories.map((c) => ({ ...c })),
    packages: demoPackages.map((p) => ({ ...p })),
    nextTemplateId: demoTreatmentTemplates.length + 1,
    nextPackageId: demoPackages.length + 1,
    nextFormId: demoForms.length + 1,
    labTests: demoLabTests.map((t) => ({ ...t })),
    labRequests: demoLabRequests.map((r) => ({
      ...r,
      items: (r.items ?? []).map((it) => ({ ...it })),
    })),
    medicalHistories: Object.fromEntries(
      Object.entries(demoMedicalHistoriesByPatient).map(([k, v]) => [
        k,
        { ...v },
      ]),
    ),
    leaves: demoLeaves.map((l) => ({ ...l })),
    attendance: demoAttendance.map((a) => ({ ...a })),
    overtimes: demoOvertimes.map((o) => ({ ...o })),
    payrolls: demoPayrolls.map((p) => ({ ...p })),
    publicHolidays: demoPublicHolidays.map((h) => ({ ...h })),
    grievances: demoGrievances.map((g) => ({ ...g })),
    forms: demoForms.map((f) => ({ ...f })),
    transactionMethods: demoTransactionMethods.map((m) => ({ ...m })),
    nextPatientId: demoPatients.length + 1,
    nextVisitId: demoVisits.length + 1,
    nextAppointmentId: demoAppointments.length + 1,
    nextPaymentId: demoPayments.length + 1,
  };
}

let store = createDemoStore();

export function getDemoStore() {
  return store;
}

export function resetDemoStore() {
  store = createDemoStore();
  return store;
}

export function paginate(items, { page = 1, per_page = 30 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.max(1, Number(per_page) || 30);
  const start = (pageNum - 1) * perPage;
  const slice = items.slice(start, start + perPage);
  return {
    data: slice,
    total: items.length,
    current_page: pageNum,
    per_page: perPage,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
  };
}
