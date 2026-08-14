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
import { buildAccountingQueue } from "./financeDemo";

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
          paid_at:
            seed.status === "completed"
              ? dayBase.subtract((seed.minutesAgo ?? 60) - 15, "minute").toISOString()
              : null,
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
    notes:
      "Patient prefers morning slots. Remind to pause hydroquinone 5 days before next laser.",
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
    notes: "Sulfa allergy — avoid related meds. First IV drip; monitor for 20 minutes post-infusion.",
  },
  3: {
    chief_complaint: "Acne scarring on cheeks; wants smoother texture.",
    examination_note:
      "Ice-pick and rolling scars on both cheeks. Mild active comedones on T-zone. Fitzpatrick IV.",
    diagnosis_primary: "Acne scarring — peel candidate",
    diagnosis_secondary: ["Mild comedonal acne"],
    assessment: "Good peel candidate once active acne settles. Start gentle prep.",
    treatment_plan:
      "Chemical peel consult today. Benzoyl peroxide pause 3 days pre-peel. Book first peel in 2 weeks.",
    vitals: { bp: "120/78", pulse: "76", temp: "36.6", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "Topical adapalene (nightly)",
      chronic_diseases: "Nil",
      skin_conditions: "Acne scarring, mild comedonal acne",
      past_aesthetic_history: "None",
    },
    prescription: [
      {
        medicine_name: "Gentle cleanser",
        strength: "",
        dosage_form: "gel",
        route: "Topical",
        frequency: "Twice daily",
        duration: "30 days",
        quantity: "1",
        unit: "bottle",
        special_instructions: "Stop actives 3 days before peel",
      },
    ],
    treatments: [{ name: "Chemical Peel", area: "Cheeks" }],
    followUp: { purpose: "next_session", note: "First peel in 2 weeks" },
    notes: "Teen patient — parent consent on file. Prefers Friday afternoon.",
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
    notes: "Bridal timeline: wedding in 8 weeks. Avoid new actives within 10 days of the event.",
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
    notes: "Works outdoors — stress SPF and hat. Mild photosensitivity after laser expected.",
  },
  6: {
    chief_complaint: "Dry, thin skin; archived follow-up before transfer.",
    examination_note:
      "Thin, dry facial skin. No active lesions. Records prepared for transfer.",
    diagnosis_primary: "Xerosis / age-related thinning",
    diagnosis_secondary: [],
    assessment: "Supportive skincare only. Patient relocating; chart closed after today.",
    treatment_plan: "Hydrating facial completed. Discharge summary given for new clinic.",
    vitals: { bp: "138/84", pulse: "68", temp: "36.5", spo2: "97" },
    medical_history: {
      allergies: "Aspirin — stomach upset",
      current_medications: "Calcium supplement",
      chronic_diseases: "Osteopenia",
      skin_conditions: "Xerosis",
      past_aesthetic_history: "Hydrating facials quarterly",
    },
    prescription: [
      {
        medicine_name: "Ceramide cream",
        strength: "",
        dosage_form: "cream",
        route: "Topical",
        frequency: "Twice daily",
        duration: "30 days",
        quantity: "1",
        unit: "jar",
        special_instructions: "Apply to face and neck after washing",
      },
    ],
    treatments: [{ name: "Hydrafacial", area: "Full face" }],
    followUp: { purpose: "review", note: "Transferred — no local follow-up" },
    notes: "Moved clinics — keep records archived. Aspirin sensitivity noted.",
  },
  7: {
    chief_complaint: "Underarm hair; requesting laser hair removal.",
    examination_note:
      "Dense underarm hair. Skin intact, no folliculitis today. Fitzpatrick IV.",
    diagnosis_primary: "Unwanted axillary hair — LHR candidate",
    diagnosis_secondary: [],
    assessment: "Suitable for laser hair removal. Patch test discussed.",
    treatment_plan:
      "Laser hair removal underarms. Shave night before. Avoid deodorant 24h after.",
    vitals: { bp: "124/80", pulse: "72", temp: "36.6", spo2: "98" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Nil significant",
      past_aesthetic_history: "None",
    },
    prescription: [
      {
        medicine_name: "Aloe gel",
        strength: "",
        dosage_form: "gel",
        route: "Topical",
        frequency: "As needed",
        duration: "7 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "Cool underarms if warm after laser",
      },
    ],
    treatments: [{ name: "Laser Hair Removal", area: "Underarms" }],
    followUp: { purpose: "next_session", note: "LHR session 2 in 6 weeks" },
    notes: "Prefers male therapist for underarm sessions. Patch test clear.",
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
    notes: "Day-5 peel aftercare. No actives until erythema clears. Next peel in ~4 weeks.",
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
    notes: "Lidocaine allergy — use plain toxin only. Last Botox ~5 months ago.",
  },
  10: {
    chief_complaint: "Fine lines and loss of glow; anti-aging package interest.",
    examination_note:
      "Early fine lines periocular. Mild dullness. Good candidate for staged anti-aging plan.",
    diagnosis_primary: "Early photoaging — anti-aging package",
    diagnosis_secondary: [],
    assessment: "Start with hydrafacial and SPF; consider light peel next visit.",
    treatment_plan:
      "Hydrafacial today. Enrol anti-aging package. Review texture in 4 weeks.",
    vitals: { bp: "116/72", pulse: "74", temp: "36.6", spo2: "99" },
    medical_history: {
      allergies: "No known drug allergy",
      current_medications: "None",
      chronic_diseases: "Nil",
      skin_conditions: "Early fine lines, dullness",
      past_aesthetic_history: "Occasional facials",
    },
    prescription: [
      {
        medicine_name: "Retinol cream 0.3%",
        strength: "0.3%",
        dosage_form: "cream",
        route: "Topical",
        frequency: "Nightly (start every other night)",
        duration: "30 days",
        quantity: "1",
        unit: "tube",
        special_instructions: "Use SPF daily; stop if irritation",
      },
    ],
    treatments: [{ name: "Hydrafacial", area: "Full face" }],
    followUp: { purpose: "next_session", note: "Peel or laser per package plan" },
    notes: "Package deposit paid. Prefers evening appointments after work.",
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
    notes: "Parent present for counselling. Observe café-au-lait; optional laser later.",
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
    notes: "No herpes history. Avoid dental work 2 weeks either side of filler.",
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
    notes: profile.notes ?? "",
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

/**
 * Guarantee every patient has prior completed visits with consultation + treatments
 * so Consultation Room "Past consults / Treatments / Notes" are never empty in demo.
 */
function attachClinicalBundle(visit) {
  visit.visit_time = visit.visited_at;
  const consultation = buildConsultationForVisit(visit);
  if (!consultation) {
    visit.consultations = [];
    visit.consultation = null;
    visit.prescriptions = [];
    visit.treatments = [];
    visit.photos = [];
    return visit;
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
  return visit;
}

function countCompletedConsultedVisits(patientId) {
  return demoVisits.filter(
    (v) =>
      Number(v.patient_id) === Number(patientId) &&
      v.status === "completed" &&
      v.consultation,
  ).length;
}

let historyVisitIdSeq = Math.max(0, ...demoVisits.map((v) => Number(v.id) || 0)) + 1;

demoPatients.forEach((patient, patientIndex) => {
  const needed = 2;
  let have = countCompletedConsultedVisits(patient.id);
  let historySlot = 0;
  while (have < needed) {
    historySlot += 1;
    const dayOffset = 14 + patientIndex * 2 + historySlot * 10;
    const doctor = patientIndex % 2 === 0 ? doctor1 : doctor2;
    const nurse = patientIndex % 2 === 0 ? nurse1 : nurse2;
    const seed = {
      id: historyVisitIdSeq++,
      patientId: patient.id,
      dayOffset,
      status: "completed",
      minutesAgo: 180 + historySlot * 40,
      queue: String(100 + patient.id * 2 + historySlot).padStart(3, "0"),
      doctor,
      nurse,
      paymentAmount: 25000 + patient.id * 1000 + historySlot * 1500,
    };
    const visit = attachClinicalBundle(buildVisit(seed));
    demoVisits.push(visit);
    have += 1;
  }
});

// Current-day consulting/preparation/etc. visits already attached above; ensure
// any remaining without clinical still have empty arrays for safe UI reads.
demoVisits.forEach((visit) => {
  if (!Array.isArray(visit.consultations)) visit.consultations = [];
  if (!Array.isArray(visit.treatments)) visit.treatments = [];
  if (!Array.isArray(visit.prescriptions)) visit.prescriptions = [];
  if (!visit.visit_time) visit.visit_time = visit.visited_at;
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
    past_surgical_history: mh.past_surgical_history ?? mh.past_aesthetic_history ?? "",
    family_history: mh.family_history ?? "",
    hospitalizations: mh.hospitalizations ?? "",
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
      items: {
        lines: items.map(([name, price]) => ({
          type: "other",
          label: name,
          qty: 1,
          unit_price: price,
          line_total: price,
        })),
      },
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

// Field tuple: [label, type, required?, options?, extra?]
//   options = array  → choices for radio/select/checkbox
//   type "rich_text" → options string becomes the printed consent/legal text
const YES_NO = ["Yes", "No"];
const YES_NO_NA = ["Yes", "No", "Not applicable"];
const YES_NO_UNSURE = ["Yes", "No", "Not sure"];
const HEAR_ABOUT_US = [
  "Walk-in",
  "Instagram",
  "Facebook",
  "Friend / family",
  "Google",
  "Hotel / partner",
  "Other",
];
const TREATMENT_INTERESTS = [
  "Botulinum toxin (Botox)",
  "Dermal filler",
  "Skin booster",
  "Laser facial",
  "Laser hair removal",
  "Pigmentation laser",
  "Chemical peel",
  "Hydrafacial",
  "Carbon laser facial",
  "Body contouring",
  "IV drip / vitamin infusion",
  "Consultation only",
];

const toFieldName = (label) =>
  String(label)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const T = (label, type = "text", required = false, options = null, extra = {}) => ({
  label,
  type,
  required,
  options,
  name: extra.name || toFieldName(label),
  section: extra.section || "other",
});

const consentBlock = (html) =>
  T("Statement", "rich_text", false, html, { name: "statement" });

const consentSignOff = () => [
  T("Patient acknowledgement", "checkbox", true, [
    "I have read this form, had the chance to ask questions, and consent to the treatment described.",
  ], { name: "patient_acknowledgement", section: "consent" }),
  T("Patient / guardian name", "text", true, null, {
    name: "consent_name",
    section: "consent",
  }),
  T("Relationship (if guardian)", "text", false, null, {
    name: "relationship",
    section: "consent",
  }),
  T("Patient signature", "text", true, null, {
    name: "consent_signature",
    section: "consent",
  }),
  T("Date", "date", true, null, { name: "consent_date", section: "consent" }),
  T("Clinician name", "text", false, null, { name: "explained_by" }),
];

// [name, slug, form_type, description, is_active, fields[]]
const formSeeds = [
  [
    "Patient Registration",
    "patient-registration",
    "intake",
    "Front-desk registration for new aesthetic patients.",
    true,
    [
      T("Full name", "text", true, null, { name: "full_name", section: "identity" }),
      T("NRC / National ID", "text", false, null, { name: "nrc", section: "identity" }),
      T("Date of birth", "date", true, null, {
        name: "date_of_birth",
        section: "identity",
      }),
      T("Gender", "radio", true, ["Female", "Male", "Other"], {
        name: "gender",
        section: "identity",
      }),
      T("Primary phone", "phone", true, null, {
        name: "primary_phone",
        section: "identity",
      }),
      T("Email", "email", false, null, { name: "email", section: "identity" }),
      T("Home address", "textarea", true, null, {
        name: "address",
        section: "identity",
      }),
      T("Emergency contact name", "text", false, null, {
        name: "emergency_contact_name",
        section: "identity",
      }),
      T("Emergency contact phone", "phone", false, null, {
        name: "emergency_contact_phone",
        section: "identity",
      }),
      T("How did you hear about us?", "select", false, HEAR_ABOUT_US, {
        name: "how_did_you_hear",
        section: "discovery",
      }),
      T("Referral name", "text", false, null, {
        name: "referral_name",
        section: "discovery",
      }),
    ],
  ],
  [
    "Aesthetic Medical Questionnaire",
    "aesthetic_health_information_mm",
    "questionnaire",
    "Treatment goals, skincare, allergies and aesthetic medical screening before procedures.",
    true,
    [
      T("Requested treatment", "textarea", true, null, {
        name: "requested_treatment",
        section: "treatment",
      }),
      T("Treatments of interest", "checkbox", false, TREATMENT_INTERESTS, {
        name: "interested_treatment",
        section: "treatment",
      }),
      T("Current skincare routine", "textarea", false, null, {
        name: "current_skincare",
        section: "treatment",
      }),
      T("Known drug allergies", "textarea", true, null, {
        name: "allergies",
        section: "medical",
      }),
      T("Lidocaine allergy?", "radio", true, YES_NO_UNSURE, {
        name: "lidocaine_allergy",
        section: "medical",
      }),
      T("Current medications / supplements", "textarea", false, null, {
        name: "current_medical_treatment",
        section: "medical",
      }),
      T("Underlying medical conditions", "textarea", false, null, {
        name: "underlying_conditions",
        section: "medical",
      }),
      T("Oral isotretinoin in the last 6 months?", "radio", true, YES_NO, {
        name: "isotretinoin_last_6_months",
        section: "medical",
      }),
      T("Blood thinners or aspirin regularly?", "radio", false, YES_NO, {
        name: "blood_thinners",
        section: "medical",
      }),
      T("Keloid or abnormal scarring?", "radio", false, YES_NO_UNSURE, {
        name: "keloid_scarring",
        section: "medical",
      }),
      T("Recent herpes / cold-sore outbreak?", "radio", true, YES_NO, {
        name: "recent_herpes_outbreak",
        section: "medical",
      }),
      T("Skin conditions", "textarea", false, null, {
        name: "skin_conditions",
        section: "medical",
      }),
      T("Past aesthetic / surgical history", "textarea", false, null, {
        name: "surgery_history",
        section: "medical",
      }),
      T("Last injectable treatment (date / product)", "text", false, null, {
        name: "last_injectable",
        section: "medical",
      }),
      T("Are you pregnant or planning pregnancy?", "radio", false, YES_NO_NA, {
        name: "pregnant",
        section: "medical",
      }),
      T("Currently breastfeeding?", "radio", false, YES_NO_NA, {
        name: "breastfeeding",
        section: "medical",
      }),
      T("Recent sun exposure, tan or sunburn?", "radio", false, YES_NO, {
        name: "recent_sun_exposure",
        section: "medical",
      }),
    ],
  ],
  [
    "General Health Information",
    "general_health_information",
    "questionnaire",
    "General medical screening for aesthetic consultation and treatment.",
    true,
    [
      T("Full name", "text", true, null, { name: "full_name", section: "identity" }),
      T("Date of birth", "date", true, null, {
        name: "date_of_birth",
        section: "identity",
      }),
      T("Occupation", "text", false, null, {
        name: "occupation",
        section: "identity",
      }),
      T("Weight (kg)", "number", false, null, {
        name: "weight_kg",
        section: "identity",
      }),
      T("Height (cm)", "number", false, null, {
        name: "height_cm",
        section: "identity",
      }),
      T("Do you smoke?", "radio", false, YES_NO, {
        name: "smokes",
        section: "medical",
      }),
      T("Current medications / supplements", "textarea", false, null, {
        name: "current_medical_treatment",
        section: "medical",
      }),
      T("Allergies", "textarea", true, null, {
        name: "allergies",
        section: "medical",
      }),
      T("Chronic diseases", "textarea", false, null, {
        name: "underlying_conditions",
        section: "medical",
      }),
      T("Previous surgery or hospitalisation", "textarea", false, null, {
        name: "surgery_history",
        section: "medical",
      }),
      T("Pacemaker, implant or metal in the body?", "radio", false, YES_NO, {
        name: "implants_or_pacemaker",
        section: "medical",
      }),
      T("Autoimmune or neuromuscular condition?", "radio", false, YES_NO_UNSURE, {
        name: "autoimmune_or_neuromuscular",
        section: "medical",
      }),
      T("Are you pregnant?", "radio", false, YES_NO_NA, {
        name: "pregnant",
        section: "medical",
      }),
      T("Currently breastfeeding?", "radio", false, YES_NO_NA, {
        name: "breastfeeding",
        section: "medical",
      }),
    ],
  ],
  [
    "General Consent for Aesthetic Treatment",
    "general-consent",
    "consent",
    "Clinic-wide consent to examination, photography for the chart, and aesthetic treatment.",
    true,
    [
      consentBlock(
        "<p>I consent to consultation, examination and such aesthetic treatment as the attending doctor or therapist considers appropriate after discussing my goals, alternatives, likely downtime and cost.</p><p>Aesthetic treatments are elective. Results vary and no outcome is guaranteed. Possible effects include redness, swelling, bruising, pigment change, infection, scarring and the need for further sessions.</p><p>I have disclosed my medical history, allergies, medications (including isotretinoin, blood thinners and supplements), pregnancy or breastfeeding status, and previous aesthetic procedures. I will follow pre- and aftercare advice, including sun protection.</p><p>I may ask questions at any time and may withdraw consent before treatment begins.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Botulinum Toxin Consent",
    "botox-consent",
    "consent",
    "Informed consent for botulinum toxin (Botox / Dysport) treatments.",
    true,
    [
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      T("Product", "select", true, ["Botox", "Dysport", "Other"], {
        name: "product",
      }),
      T("Planned units (if known)", "text", false, null, { name: "planned_units" }),
      consentBlock(
        "<p>Botulinum toxin is injected to temporarily relax selected facial muscles and soften dynamic wrinkles. Onset is usually 3–14 days; effect typically lasts 3–5 months.</p><p>Risks include bruising, headache, asymmetry, drooping eyelid or brow (ptosis), a heavy feeling, flu-like symptoms, and rare spread of toxin effect. Results are not permanent and not guaranteed.</p><p>I should not have treatment if I am pregnant, breastfeeding, have a neuromuscular disorder, or have an active infection at the injection site. I will remain upright for 4 hours and avoid rubbing the area, strenuous exercise and alcohol the same day as advised.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Dermal Filler Consent",
    "filler-consent",
    "consent",
    "Informed consent for hyaluronic acid dermal filler, including vascular occlusion risk.",
    true,
    [
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      T("Product / range", "text", true, null, { name: "product" }),
      consentBlock(
        "<p>Hyaluronic acid dermal filler is injected to restore volume, soften folds or enhance contours. Results are immediate but settle over 1–2 weeks and typically last 6–18 months depending on product and area.</p><p>Risks include swelling, bruising, lumps, asymmetry, infection, delayed nodules, Tyndall effect, and — rarely — vascular occlusion which can cause tissue damage or, very rarely, vision loss. Hyaluronidase may be used in an emergency.</p><p>I will avoid dental work, vaccinations and long-haul flights around the treatment window as advised, and will contact the clinic immediately for increasing pain, blanching, mottled skin or visual symptoms.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Skin Booster Consent",
    "skin-booster-consent",
    "consent",
    "Informed consent for skin-booster and injectable hydration treatments.",
    true,
    [
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      T("Product", "text", false, null, { name: "product" }),
      consentBlock(
        "<p>Skin boosters are micro-injections of hyaluronic acid or similar products to improve hydration and skin quality. A course of sessions is often recommended.</p><p>Expected effects include pin-point swelling, bruising and tenderness for a few days. Infection, lumps and rare allergic reaction can occur. Results vary and are not guaranteed.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Laser & Light Treatment Consent",
    "laser-consent",
    "consent",
    "Informed consent for laser facial, hair removal, pigmentation laser and IPL.",
    true,
    [
      T("Laser / device", "text", true, null, { name: "laser_device" }),
      T("Indication", "select", true, [
        "Rejuvenation / texture",
        "Hair reduction",
        "Pigmentation",
        "Acne marks",
        "Other",
      ], { name: "indication" }),
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      T("Fitzpatrick skin type (if known)", "select", false, [
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
      ], { name: "fitzpatrick_skin_type" }),
      consentBlock(
        "<p>Laser or intense pulsed light is used for hair reduction, pigmentation, texture or rejuvenation. Multiple sessions are usually required. Response depends on skin type, hair colour and sun exposure.</p><p>Risks include redness, swelling, crusting, blistering, temporary or permanent pigment change, scarring (rare), eye injury if protection is not worn, and paradoxical hair growth (hair removal). Tanned or recently sun-exposed skin increases risk.</p><p>I will use broad-spectrum SPF, avoid sunbeds and self-tan as advised, and disclose tattoos, gold therapy, photosensitising medicines and a history of keloid or herpes in the treatment area.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Chemical Peel Consent",
    "peel-consent",
    "consent",
    "Consent and aftercare acknowledgement for chemical peels.",
    true,
    [
      T("Peel type", "select", true, [
        "Superficial",
        "Medium",
        "Combination / cocktail",
      ], { name: "peel_type" }),
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      consentBlock(
        "<p>A chemical peel uses acids to exfoliate the skin and improve texture, acne marks or pigmentation. Peeling, tightness and redness are expected; downtime depends on peel depth.</p><p>Risks include prolonged redness, pigment change, infection, scarring (rare) and a herpes flare. I will not pick peeling skin, will avoid sun and active skincare (retinoids, AHAs, scrubs) until advised, and will use bland moisturiser and SPF.</p><p>I confirm I am not currently using oral isotretinoin (or have completed the waiting period advised by the doctor) and will disclose any recent procedures in the area.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Facial & Hydrafacial Consent",
    "facial-consent",
    "consent",
    "Consent for Hydrafacial, carbon laser facial and clinic facial treatments.",
    true,
    [
      T("Treatment", "select", true, [
        "Hydrafacial",
        "Carbon laser facial",
        "Vitamin glow facial",
        "Other facial",
      ], { name: "treatment" }),
      T("Treatment area", "text", false, null, { name: "treatment_area" }),
      consentBlock(
        "<p>Facial treatments (including Hydrafacial, carbon laser facial and similar) cleanse, exfoliate and hydrate the skin. Mild redness or sensitivity can occur for 24–48 hours.</p><p>I will inform staff of active acne, cold sores, recent sunburn, or allergy to skincare ingredients. Results vary; a course of treatments is often recommended.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "IV Therapy Consent",
    "iv-therapy-consent",
    "consent",
    "Informed consent for clinic IV drips and vitamin infusions.",
    true,
    [
      T("Infusion / drip", "text", true, null, { name: "infusion" }),
      consentBlock(
        "<p>Intravenous vitamin or hydration infusions are elective wellness treatments. Benefits such as energy or glow are not medically guaranteed.</p><p>Risks include bruising or pain at the cannula site, phlebitis, allergic reaction, dizziness and, rarely, infection or infiltration of fluid into tissue. I confirm I have disclosed allergies, kidney or heart conditions, and current medications.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Clinical Photography Consent",
    "photo-consent",
    "consent",
    "Consent to clinical photography for the patient chart and optional marketing use.",
    true,
    [
      T("Allow chart / medical-record photos", "radio", true, YES_NO, {
        name: "allow_chart_photos",
      }),
      T("Allow marketing / social use (no name)", "radio", true, YES_NO, {
        name: "allow_marketing_use",
      }),
      consentBlock(
        "<p>Clinical photographs help plan treatment and compare progress. They form part of my confidential medical record.</p><p>Marketing use (website, social media, before/after galleries) is optional and separate. If I agree, images will not include my name. I may withdraw marketing consent later; images already published may not always be retrievable.</p>",
      ),
      ...consentSignOff(),
    ],
  ],
  [
    "Injectable Treatment Record",
    "injectable-procedure-record",
    "procedure",
    "Chairside chart for botulinum toxin, filler and skin-booster sessions.",
    true,
    [
      T("Procedure date", "date", true, null, { name: "procedure_date" }),
      T("Product", "text", true, null, { name: "product" }),
      T("Lot / batch number", "text", false, null, { name: "lot_number" }),
      T("Expiry date", "date", false, null, { name: "expiry_date" }),
      T("Areas treated and dose / volume", "textarea", true, null, {
        name: "areas_and_dose",
      }),
      T("Total units or ml", "text", false, null, { name: "total_dose" }),
      T("Needle / cannula", "text", false, null, { name: "needle_or_cannula" }),
      T("Immediate complications", "textarea", false, null, {
        name: "complications",
      }),
      T("Aftercare explained", "radio", true, YES_NO, {
        name: "aftercare_explained",
      }),
      T("Clinician name", "text", true, null, { name: "explained_by" }),
    ],
  ],
  [
    "Laser Treatment Record",
    "laser-procedure-record",
    "procedure",
    "Chairside chart for laser and light-based sessions.",
    true,
    [
      T("Procedure date", "date", true, null, { name: "procedure_date" }),
      T("Device", "text", true, null, { name: "device" }),
      T("Indication", "text", true, null, { name: "indication" }),
      T("Treatment area", "text", true, null, { name: "treatment_area" }),
      T("Settings (fluence, pulse, passes)", "textarea", true, null, {
        name: "settings",
      }),
      T("Eye protection used", "radio", true, YES_NO, {
        name: "eye_protection_used",
      }),
      T("Skin reaction / endpoint", "textarea", false, null, {
        name: "skin_reaction",
      }),
      T("Immediate complications", "textarea", false, null, {
        name: "complications",
      }),
      T("Aftercare explained", "radio", true, YES_NO, {
        name: "aftercare_explained",
      }),
      T("Clinician name", "text", true, null, { name: "explained_by" }),
    ],
  ],
  [
    "Treatment Aftercare Record",
    "aftercare-instructions",
    "other",
    "Written aftercare given to the patient after an aesthetic procedure.",
    true,
    [
      T("Treatment given", "text", true, null, { name: "treatment_given" }),
      T("Aftercare instructions", "textarea", true, null, {
        name: "aftercare_instructions",
      }),
      T("Products to use", "textarea", false, null, { name: "products_to_use" }),
      T("Products to avoid", "textarea", false, null, {
        name: "products_to_avoid",
      }),
      T("Warning signs — contact the clinic if", "textarea", false, null, {
        name: "warning_signs",
      }),
      T("Follow-up date", "date", false, null, { name: "follow_up_date" }),
      T("Clinician name", "text", false, null, { name: "explained_by" }),
    ],
  ],
  [
    "Patient Feedback Survey",
    "feedback-survey",
    "questionnaire",
    "Post-visit satisfaction survey for clinic service quality.",
    false,
    [
      T("Overall satisfaction", "radio", false, [
        "Very satisfied",
        "Satisfied",
        "Neutral",
        "Dissatisfied",
      ], { name: "overall_satisfaction" }),
      T("Waiting time", "radio", false, ["Short", "Acceptable", "Too long"], {
        name: "waiting_time",
      }),
      T("Staff courtesy", "radio", false, ["Excellent", "Good", "Fair", "Poor"], {
        name: "staff_courtesy",
      }),
      T("Would you recommend us?", "radio", false, ["Yes", "No", "Maybe"], {
        name: "would_recommend",
      }),
      T("Comments / suggestions", "textarea", false, null, { name: "comments" }),
    ],
  ],
];

let formFieldIdSeq = 9000;

export const demoForms = formSeeds.map(
  ([name, slug, form_type, description, is_active, fieldDefs], index) => ({
    id: index + 1,
    name,
    slug,
    code: slug,
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
    name: def.name || toFieldName(def.label),
    label: def.label,
    type: def.type,
    required: Boolean(def.required),
    section: def.section || "other",
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
      required_form_links_count: demoTreatmentTemplates.filter((t) =>
        (t.required_form_links ?? []).some(
          (l) => Number(l.form_definition_id) === Number(form.id),
        ),
      ).length,
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

const AESTHETIC_INTAKE_FORM =
  demoForms.find((f) => f.slug === "aesthetic_health_information_mm") ??
  demoForms[1];
const GENERAL_HEALTH_FORM =
  demoForms.find((f) => f.slug === "general_health_information") ??
  demoForms[2];

const formBySlug = (slug) => demoForms.find((f) => f.slug === slug);

const TEMPLATE_REQUIRED_FORMS = {
  Botox: [["botox-consent", true]],
  "Dermal Filler": [["filler-consent", true]],
  "Skin Booster": [["skin-booster-consent", true]],
  "Laser Facial": [["laser-consent", true]],
  "Laser Hair Removal": [["laser-consent", true]],
  "Pigmentation Laser": [["laser-consent", true]],
  "Chemical Peel": [["peel-consent", true]],
  Hydrafacial: [["facial-consent", true]],
  "Carbon Laser Facial": [["facial-consent", true]],
  "Vitamin Glow Facial": [["facial-consent", true]],
  "IV Drip": [["iv-therapy-consent", true]],
};

for (const template of demoTreatmentTemplates) {
  const links = TEMPLATE_REQUIRED_FORMS[template.name];
  if (!links) continue;
  template.required_form_links = links
    .map(([slug, is_required]) => {
      const form = formBySlug(slug);
      if (!form) return null;
      return {
        form_definition_id: form.id,
        is_required,
        form_definition: {
          id: form.id,
          name: form.name,
          form_type: form.form_type,
          slug: form.slug,
          code: form.code,
        },
      };
    })
    .filter(Boolean);
}

let formResponseIdSeq = 7000;

function buildIntakeDataForPatient(patient, profile) {
  const mh = profile?.medical_history ?? {};
  const treatmentNames = (profile?.treatments ?? []).map((t) => t.name).join(", ");
  return {
    full_name: patient.name,
    gender: patient.gender,
    date_of_birth: patient.dob,
    age: String(Math.max(1, now.diff(dayjs(patient.dob), "year"))),
    occupation: patient.gender === "female" ? "Professional" : "Business owner",
    marital_status: "Married",
    pregnant: "No",
    breastfeeding: "No",
    weight_kg: patient.gender === "female" ? "54" : "68",
    height_cm: patient.gender === "female" ? "158" : "170",
    primary_phone: patient.phone,
    viber_phone: patient.phone,
    emergency_contact_phone: "09-421-000-999",
    relationship: "Spouse",
    email: patient.email,
    address: patient.address,
    how_did_you_hear: "Friend / family",
    referral_name: "",
    requested_treatment: treatmentNames || patient.notes || "Consultation",
    interested_treatment: treatmentNames
      ? [treatmentNames]
      : ["Consultation only"],
    current_skincare: "Gentle cleanser, moisturiser and daily SPF 50",
    current_medical_treatment: mh.current_medications || "None",
    surgery_history: mh.past_aesthetic_history || "None",
    allergies: mh.allergies || "No known drug allergy",
    lidocaine_allergy: String(mh.allergies || "")
      .toLowerCase()
      .includes("lidocaine")
      ? "Yes"
      : "No",
    recent_herpes_outbreak: "No",
    isotretinoin_last_6_months: "No",
    blood_thinners: "No",
    keloid_scarring: "No",
    last_injectable: mh.past_aesthetic_history || "None recorded",
    recent_sun_exposure: "No",
    underlying_conditions: mh.chronic_diseases || "Nil",
    skin_conditions: mh.skin_conditions || "",
    smokes: "No",
    implants_or_pacemaker: "No",
    autoimmune_or_neuromuscular: "No",
    consent_date: now.subtract(20, "day").format("YYYY-MM-DD"),
    consent_name: patient.name,
    consent_signature: patient.name,
    patient_acknowledgement: [
      "I have read this form, had the chance to ask questions, and consent to the treatment described.",
    ],
  };
}

/** Intake / questionnaire responses attached to every patient chart. */
export const demoFormResponsesByPatient = {};
demoPatients.forEach((patient, index) => {
  const profile = clinicalProfiles[patient.id];
  const visit =
    demoVisits.find(
      (v) =>
        Number(v.patient_id) === Number(patient.id) && v.status === "completed",
    ) ?? demoVisits.find((v) => Number(v.patient_id) === Number(patient.id));
  const submittedAt = now.subtract(18 + index, "day").toISOString();
  const data = buildIntakeDataForPatient(patient, profile);
  const aestheticResponse = {
    id: formResponseIdSeq++,
    patient_id: patient.id,
    visit_id: visit?.id ?? null,
    visit: visit
      ? {
          id: visit.id,
          queue_number: visit.queue_number,
          visit_time: visit.visited_at,
          status: visit.status,
        }
      : null,
    form_id: AESTHETIC_INTAKE_FORM?.id,
    form: {
      id: AESTHETIC_INTAKE_FORM?.id,
      name: AESTHETIC_INTAKE_FORM?.name,
      code: "aesthetic_health_information_mm",
      slug: AESTHETIC_INTAKE_FORM?.slug,
      definition: {
        name: AESTHETIC_INTAKE_FORM?.name,
        code: "aesthetic_health_information_mm",
      },
    },
    form_definition: {
      name: AESTHETIC_INTAKE_FORM?.name,
      code: "aesthetic_health_information_mm",
    },
    data,
    submitted_by: { id: 4, name: "Nurse Htet Htet" },
    created_at: submittedAt,
    updated_at: submittedAt,
  };
  const generalResponse = {
    id: formResponseIdSeq++,
    patient_id: patient.id,
    visit_id: visit?.id ?? null,
    visit: aestheticResponse.visit,
    form_id: GENERAL_HEALTH_FORM?.id,
    form: {
      id: GENERAL_HEALTH_FORM?.id,
      name: GENERAL_HEALTH_FORM?.name,
      code: GENERAL_HEALTH_FORM?.code ?? "general_health_information",
      slug: GENERAL_HEALTH_FORM?.slug ?? "general_health_information",
      definition: {
        name: GENERAL_HEALTH_FORM?.name,
        code: GENERAL_HEALTH_FORM?.code ?? "general_health_information",
      },
    },
    form_definition: {
      name: GENERAL_HEALTH_FORM?.name,
      code: GENERAL_HEALTH_FORM?.code ?? "general_health_information",
    },
    data,
    submitted_by: { id: 4, name: "Nurse Htet Htet" },
    created_at: submittedAt,
    updated_at: submittedAt,
  };
  demoFormResponsesByPatient[patient.id] = [aestheticResponse, generalResponse];
});

/** Purchased package rows for patient Packages tab. */
export const demoPatientPackagesByPatient = {};
demoPatients.forEach((patient, index) => {
  const catalog = demoPackages[index % demoPackages.length];
  if (!catalog) {
    demoPatientPackagesByPatient[patient.id] = [];
    return;
  }
  const purchasedAt = now.subtract(30 + index * 3, "day");
  const totalSessions = (catalog.items ?? []).reduce(
    (sum, it) => sum + (it.total_sessions ?? 0),
    0,
  );
  const usedSessions = Math.min(totalSessions, 1 + (index % 3));
  demoPatientPackagesByPatient[patient.id] = [
    {
      id: 8000 + patient.id,
      patient_id: patient.id,
      package_id: catalog.id,
      package: {
        id: catalog.id,
        name: catalog.name,
        price: catalog.price,
        validity_days: catalog.validity_days,
      },
      name: catalog.name,
      status: patient.status === "inactive" ? "expired" : "active",
      purchased_at: purchasedAt.toISOString(),
      expires_at: purchasedAt
        .add(catalog.validity_days ?? 90, "day")
        .toISOString(),
      total_sessions: totalSessions,
      used_sessions: usedSessions,
      remaining_sessions: Math.max(0, totalSessions - usedSessions),
      items: (catalog.items ?? []).map((it, itemIndex) => ({
        id: 8100 + patient.id * 10 + itemIndex,
        treatment_template_id: it.treatment_template_id,
        treatment_template: it.treatment_template,
        total_sessions: it.total_sessions,
        used_sessions: itemIndex === 0 ? Math.min(1, it.total_sessions) : 0,
        remaining_sessions:
          it.total_sessions - (itemIndex === 0 ? Math.min(1, it.total_sessions) : 0),
      })),
    },
  ];
});

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
    accountingQueue: buildAccountingQueue().map((r) => ({ ...r })),
    nextOtherIncomeId: demoOtherIncomes.length + 1,
    nextExpenseId: demoExpenses.length + 1,
    nextSupplierPayableId: demoSupplierPayables.length + 1,
    treatmentTemplates: demoTreatmentTemplates.map((t) => ({
      ...t,
      required_form_links: (t.required_form_links ?? []).map((l) => ({
        ...l,
        form_definition: l.form_definition
          ? { ...l.form_definition }
          : l.form_definition,
      })),
    })),
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
    formResponsesByPatient: Object.fromEntries(
      Object.entries(demoFormResponsesByPatient).map(([k, rows]) => [
        k,
        rows.map((r) => ({
          ...r,
          data: { ...(r.data ?? {}) },
          form: r.form ? { ...r.form } : r.form,
        })),
      ]),
    ),
    patientPackagesByPatient: Object.fromEntries(
      Object.entries(demoPatientPackagesByPatient).map(([k, rows]) => [
        k,
        rows.map((r) => ({
          ...r,
          package: r.package ? { ...r.package } : r.package,
          items: (r.items ?? []).map((it) => ({ ...it })),
        })),
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
    nextPhotoId: 90001,
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
