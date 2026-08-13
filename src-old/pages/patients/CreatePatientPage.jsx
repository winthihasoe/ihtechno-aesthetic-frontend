import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SignatureCanvas from "react-signature-canvas";
import DynamicFormRenderer, {
  RequiredAsterisk,
} from "../../components/common/DynamicFormRenderer";
import { resolveApiError } from "../../services/apiClient";
import { createPatient } from "../../services/patientService";
import { updateAppointment } from "../../services/appointmentService";
import {
  getForm,
  getFormByCode,
  submitResponse,
} from "../../services/formService";
import useToastStore from "../../stores/toastStore";
import useSettingsStore from "../../stores/settingsStore";
import useAuthStore from "../../stores/authStore";
import {
  getPatientDetailPath,
  getPatientsListPath,
  getWorkspaceUrlPrefix,
} from "../../utils/workspaceRoutes";
import { getClinicDisplayName } from "../../utils/clinicBranding";
import DuplicatePhoneWarning from "../../components/Patients/DuplicatePhoneWarning";
import { findPatientsWithPhone } from "../../utils/patientDuplicatePhone";
import {
  isValidPhone,
  normalizePhone,
  phoneValidationMessage,
} from "../../utils/phoneUtils";
import { getBirthSelectOptionPairs } from "../../utils/identityBirthSelectOptions";
import { validateFormFields } from "../../utils/formFieldValidation";

const QUESTIONNAIRE_FORM_CODE = "aesthetic_health_information_mm";
const PATIENT_TYPE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "relative", label: "Relative" },
  { value: "friends", label: "Friends" },
  { value: "doctor", label: "Doctor" },
  { value: "custom", label: "Custom" },
];

/** Must match backend `form_fields.section` values. */
const INTAKE_SECTION_ORDER = [
  "identity",
  "discovery",
  "treatment",
  "medical",
  "consent",
  "other",
];

const INTAKE_IDENTITY_CARD = {
  title: "Patient Information",
  subtitle:
    "Enter the main registration details in English for front desk use.",
};

const INTAKE_SECTION_BLOCKS = {
  discovery: {
    title: "သိရှိပုံ",
    subtitle: "",
  },
  treatment: {
    title: "ကုထုံးနှင့် အသားအရေ",
    subtitle:
      "လက်ရှိ စိတ်ဝင်စားမှုနှင့် အသုံးပြုနေသော skincare များကို ဖြည့်ပါ။",
  },
  medical: {
    title: "ကျန်းမာရေးဆိုင်ရာ အချက်အလက်များ",
    subtitle:
      "လက်ရှိကုသမှု၊ ခွဲစိတ်မှုနှင့် ဓာတ်မတည်မှု အချက်အလက်များကို ဖြည့်ပါ။",
  },
  consent: {
    title: "သဘောတူညီချက်",
    subtitle: "အောက်ပါအချက်အလက်များကို ဖတ်ရှုပြီး အတည်ပြုပါ။",
  },
  other: {
    title: "အခြား",
    subtitle: null,
  },
};

const DEFAULT_IDENTITY_FIELDS = [
  {
    id: "builtin_full_name",
    name: "full_name",
    label: "Patient Name",
    type: "text",
    required: true,
    section: "identity",
    order: 1,
  },
  {
    id: "builtin_client_id",
    name: "client_id",
    label: "Client ID",
    type: "text",
    required: false,
    section: "identity",
    order: 1.5,
  },
  {
    id: "builtin_gender",
    name: "gender",
    label: "Gender",
    type: "select",
    required: true,
    section: "identity",
    options: ["Female", "Male", "Other"],
    order: 2,
  },
  {
    id: "builtin_birth_day",
    name: "birth_day",
    label: "Birth day",
    type: "select",
    required: false,
    section: "identity",
    order: 3,
    options: [],
  },
  {
    id: "builtin_birth_month",
    name: "birth_month",
    label: "Birth month",
    type: "select",
    required: false,
    section: "identity",
    order: 4,
    options: [],
  },
  {
    id: "builtin_birth_year",
    name: "birth_year",
    label: "Birth year",
    type: "select",
    required: false,
    section: "identity",
    order: 5,
    options: [],
  },
  {
    id: "builtin_age",
    name: "age",
    label: "Age",
    type: "number",
    required: false,
    readOnly: true,
    section: "identity",
    order: 6,
  },
  {
    id: "builtin_occupation",
    name: "occupation",
    label: "Occupation",
    type: "text",
    required: false,
    section: "identity",
    order: 7,
  },
  {
    id: "builtin_address",
    name: "address",
    label: "Address",
    type: "textarea",
    required: false,
    section: "identity",
    order: 8,
  },
  {
    id: "builtin_marital_status",
    name: "marital_status",
    label: "Marital Status",
    type: "select",
    required: false,
    section: "identity",
    options: ["Single", "Married"],
    order: 9,
  },
  {
    id: "builtin_pregnant",
    name: "pregnant",
    label: "Pregnant",
    type: "radio",
    required: true,
    section: "identity",
    options: ["Yes", "No"],
    order: 10,
  },
  {
    id: "builtin_breastfeeding",
    name: "breastfeeding",
    label: "Breastfeeding",
    type: "radio",
    required: true,
    section: "identity",
    options: ["Yes", "No"],
    order: 11,
  },
  {
    id: "builtin_weight_kg",
    name: "weight_kg",
    label: "Weight (kg)",
    type: "number",
    required: false,
    section: "identity",
    order: 12,
  },
  {
    id: "builtin_height_cm",
    name: "height_cm",
    label: "Height (cm)",
    type: "number",
    required: false,
    section: "identity",
    order: 13,
  },
  {
    id: "builtin_primary_phone",
    name: "primary_phone",
    label: "Primary Phone",
    type: "phone",
    required: true,
    section: "identity",
    order: 14,
  },
  {
    id: "builtin_emergency_contact_phone",
    name: "emergency_contact_phone",
    label: "Emergency Contact Phone",
    type: "phone",
    required: false,
    section: "identity",
    order: 15,
  },
  {
    id: "builtin_relationship",
    name: "relationship",
    label: "Relationship",
    type: "text",
    required: false,
    section: "identity",
    order: 16,
  },
  {
    id: "builtin_viber_phone",
    name: "viber_phone",
    label: "Viber Phone",
    type: "phone",
    required: false,
    section: "identity",
    order: 17,
  },
  {
    id: "builtin_email",
    name: "email",
    label: "Email",
    type: "email",
    required: false,
    section: "identity",
    order: 18,
  },
  {
    id: "builtin_telegram_phone",
    name: "telegram_phone",
    label: "Telegram No.",
    type: "phone",
    required: false,
    section: "identity",
    order: 19,
  },

  {
    id: "builtin_patient_signature",
    name: "patient_signature",
    label: "Patient Signature",
    type: "text",
    required: true,
    section: "identity",
    order: 20,
  },
];

/** Sections rendered under the wide card (excluding identity + consent UI). */
const INTAKE_BODY_SECTION_KEYS = ["discovery", "treatment", "medical", "other"];

const FORM_RESPONSE_EXCLUDED_FIELDS = [
  "full_name",
  "gender",
  "birth_day",
  "birth_month",
  "birth_year",
  "age",
  "address",
  "weight_kg",
  "height_cm",
  "primary_phone",
  "viber_phone",
  "telegram_phone",
  "referral_name",
  "patient_signature",
];
const IDENTITY_FIELD_PRIORITY = [
  "full_name",
  "gender",
  "birth_day",
  "birth_month",
  "birth_year",
  "age",
  "occupation",
  "marital_status",
  "address",
  "pregnant",
  "breastfeeding",
  "weight_kg",
  "height_cm",
  "primary_phone",
  "viber_phone",
  "emergency_contact_phone",
  "email",
  "telegram_phone",
  "relationship",
  "patient_signature",
];
const MARRIAGE_ONLY_FIELD_NAMES = ["pregnant", "breastfeeding"];
const PATIENT_SIGNATURE_FIELD_NAME = "patient_signature";
const SAMPLE_FORM_DATA = {
  full_name: "Daw Thandar Win",
  gender: "Female",
  birth_day: "15",
  birth_month: "8",
  birth_year: "1994",
  age: "31",
  occupation: "Office Staff",
  address: "No. 12, Bahan Township, Yangon",
  marital_status: "Married",
  pregnant: "No",
  breastfeeding: "No",
  weight_kg: "52",
  height_cm: "160",
  primary_phone: "09987654321",
  emergency_contact_phone: "09912345678",
  viber_phone: "09987654321",
  email: "thandar.win@example.com",
  telegram_phone: "09987654321",
  relationship: "Husband",
  how_did_you_hear: "Facebook",
  referral_name: "May Thu",
  requested_treatment: "Facial and skin consultation",
  interested_treatment: "Laser toning",
  current_skincare: "Cleanser, moisturizer, sunscreen",
  current_medical_treatment: "No current medical treatment.",
  surgery_history: "No previous cosmetic or medical surgery.",
  allergies: "No known drug or food allergies.",
  lidocaine_allergy: "မရှိ",
  recent_herpes_outbreak: "မရှိ",
  underlying_conditions:
    "No diabetes, hypertension, heart disease, or autoimmune disease.",
  consent_date: dayjs().format("YYYY-MM-DD"),
  consent_signature: "",
};

const isEmptyValue = (value) =>
  value === "" ||
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0);

const normalizeQuestionnaireField = (field) => {
  // Keep backward compatibility with older seeded data that still uses `sex`.
  if (field.name === "sex") {
    return {
      ...field,
      name: "gender",
      label: "Gender",
    };
  }

  if (field.name === "consent_name") {
    return null;
  }

  if (field.name === "how_did_you_hear") {
    return {
      ...field,
      type: "radio",
      required: false,
      options: Array.isArray(field.options)
        ? field.options
        : ["Facebook", "Website", "Friend/Referral", "Others"],
    };
  }

  if (field.name === "referral_name") {
    return {
      ...field,
      required: false,
    };
  }

  if (field.name === "age") {
    return {
      ...field,
      readOnly: true,
      required: false,
    };
  }

  return field;
};

const BIRTH_PART_FIELD_NAMES = new Set([
  "birth_day",
  "birth_month",
  "birth_year",
]);

const IDENTITY_FALLBACK_PRIORITY_MAP = new Map(
  IDENTITY_FIELD_PRIORITY.map((name, index) => [name, index]),
);

const mergeIdentityFields = (apiFields) => {
  const withoutLegacyDob = apiFields.filter(
    (field) => field.name !== "date_of_birth",
  );
  const seenNames = new Set(withoutLegacyDob.map((field) => field.name));
  const missingIdentityFields = DEFAULT_IDENTITY_FIELDS.filter(
    (field) => !seenNames.has(field.name),
  );
  const merged = [...missingIdentityFields, ...withoutLegacyDob];
  return merged.map((field) =>
    BIRTH_PART_FIELD_NAMES.has(field.name)
      ? {
          ...field,
          type: "select",
          options: Array.isArray(field.options) ? field.options : [],
        }
      : field,
  );
};

const IDENTITY_LAYOUT_ORDER = [
  "full_name",
  "gender",
  "birth_day",
  "birth_month",
  "birth_year",
  "age",
  "occupation",
  "marital_status",
  "address",
  "weight_kg",
  "height_cm",
  "primary_phone",
  "viber_phone",
  "emergency_contact_phone",
  "relationship",
  "email",
  "telegram_phone",
  "patient_signature",
];

const IDENTITY_LAYOUT_ORDER_MAP = new Map(
  IDENTITY_LAYOUT_ORDER.map((name, index) => [name, index]),
);

function sortIdentityFieldsForLayout(fields) {
  return [...fields].sort((a, b) => {
    const ai = IDENTITY_LAYOUT_ORDER_MAP.get(a.name) ?? -1;
    const bi = IDENTITY_LAYOUT_ORDER_MAP.get(b.name) ?? -1;
    if (ai === -1 && bi === -1) return (a.order ?? 0) - (b.order ?? 0);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/** Splits identity fields so birth parts + age can be rendered outside DynamicFormRenderer. */
function splitIdentityForBirthBlock(fields) {
  // Keep incoming UI order (already arranged by `sortIdentityFieldsForLayout`).
  const ordered = [...fields];
  const indexes = ordered
    .map((f, i) => (BIRTH_PART_FIELD_NAMES.has(f.name) ? i : null))
    .filter((i) => i != null);
  if (indexes.length === 0) {
    return {
      identityBeforeBirth: ordered.filter((f) => f.name !== "age"),
      identityAfterBirth: [],
      birthFields: [],
    };
  }
  const lo = Math.min(...indexes);
  const hi = Math.max(...indexes);
  const identityBeforeBirth = ordered
    .slice(0, lo)
    .filter((f) => f.name !== "age");
  const birthFields = ordered
    .slice(lo, hi + 1)
    .filter((f) => BIRTH_PART_FIELD_NAMES.has(f.name));
  const identityAfterBirth = ordered
    .slice(hi + 1)
    .filter((f) => f.name !== "age");
  const birthOrder = { birth_day: 0, birth_month: 1, birth_year: 2 };
  birthFields.sort(
    (a, b) => (birthOrder[a.name] ?? 9) - (birthOrder[b.name] ?? 9),
  );
  return { identityBeforeBirth, identityAfterBirth, birthFields };
}

function buildInitialFormData(completeFields) {
  return Object.fromEntries(
    completeFields.map((field) => [
      field.name,
      field.name === "consent_date"
        ? dayjs().format("YYYY-MM-DD")
        : field.type === "checkbox"
          ? []
          : "",
    ]),
  );
}

function mapFieldsBySection(fields) {
  const sectionMap = Object.fromEntries(
    INTAKE_SECTION_ORDER.map((sectionKey) => [sectionKey, []]),
  );

  for (const field of fields) {
    const section =
      field.section && INTAKE_SECTION_ORDER.includes(field.section)
        ? field.section
        : "other";
    sectionMap[section].push(field);
  }

  for (const sectionKey of INTAKE_SECTION_ORDER) {
    sectionMap[sectionKey].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  return sectionMap;
}

function getFallbackIdentityFields(fields) {
  return fields
    .filter((field) => IDENTITY_FALLBACK_PRIORITY_MAP.has(field.name))
    .sort(
      (a, b) =>
        (IDENTITY_FALLBACK_PRIORITY_MAP.get(a.name) ?? 999) -
        (IDENTITY_FALLBACK_PRIORITY_MAP.get(b.name) ?? 999),
    );
}

function getNextFormDataOnFieldChange(previousData, name, value) {
  if (name === "age") return previousData;

  const nextData = { ...previousData, [name]: value };

  if (name === "marital_status" && value === "Single") {
    nextData.pregnant = "";
    nextData.breastfeeding = "";
  }

  if (BIRTH_PART_FIELD_NAMES.has(name)) {
    nextData.age = calculateAgeFromBirthParts(
      name === "birth_day" ? value : nextData.birth_day,
      name === "birth_month" ? value : nextData.birth_month,
      name === "birth_year" ? value : nextData.birth_year,
    );
  }

  return nextData;
}

function getNextFieldErrorsOnFieldChange(previousErrors, name, value) {
  const nextErrors = { ...previousErrors };
  delete nextErrors[name];

  if (name === "marital_status" && value === "Single") {
    delete nextErrors.pregnant;
    delete nextErrors.breastfeeding;
  }

  if (name === "birth_month" || name === "birth_year") {
    delete nextErrors.birth_day;
  }

  return nextErrors;
}

const IDENTITY_FIELD_LABEL_SX = {
  display: "block",
  mb: 0.75,
  typography: "subtitle2",
  fontWeight: 600,
  color: "text.primary",
};

function IdentityBirthDateSection({
  birthFields,
  formData,
  fieldErrors,
  disabled,
  onChange,
}) {
  const birthDayField = birthFields.find((f) => f.name === "birth_day");
  const birthMonthField = birthFields.find((f) => f.name === "birth_month");
  const birthYearField = birthFields.find((f) => f.name === "birth_year");
  const ageText = String(formData.age ?? "").trim();

  const renderBirthSelect = (field) => {
    if (!field) return null;
    const pairs = getBirthSelectOptionPairs(field.name) ?? [];
    const raw = formData[field.name];
    const value = raw === undefined || raw === null ? "" : String(raw);
    const error = fieldErrors[field.name];
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography component="div" sx={IDENTITY_FIELD_LABEL_SX}>
          {field.label}
          {field.required ? <RequiredAsterisk /> : null}
        </Typography>
        <FormControl fullWidth size="small" error={!!error}>
          <Select
            displayEmpty
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(field.name, e.target.value)}
            renderValue={(selected) => {
              if (selected === "" || selected == null) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    — Select —
                  </Typography>
                );
              }
              const found = pairs.find((p) => p.value === selected);
              return found?.label ?? selected;
            }}
          >
            <MenuItem value="">
              <em>— Select —</em>
            </MenuItem>
            {pairs.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {error ? (
            <FormHelperText sx={{ fontWeight: 600 }}>{error}</FormHelperText>
          ) : null}
        </FormControl>
      </Box>
    );
  };

  return (
    <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
      <Grid size={{ xs: 12, lg: 12 }}>
        <Box
          sx={(theme) => ({
            p: { xs: 1.75, sm: 2, md: 2.25 },
            borderRadius: 2,
            border: `3px solid ${theme.palette.divider}`,
          })}
        >
          <Typography
            component="div"
            sx={{ ...IDENTITY_FIELD_LABEL_SX, mb: 1.25 }}
          >
            Date of birth
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              {renderBirthSelect(birthDayField)}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              {renderBirthSelect(birthMonthField)}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              {renderBirthSelect(birthYearField)}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                Age
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  mt: 0.5,
                  color: "text.primary",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {ageText || "—"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75 }}
              >
                {ageText
                  ? "years (from date of birth)"
                  : "Select date of birth to calculate"}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
}

// These layout helpers keep section-specific sizing close to the page,
// so future maintenance can change the intake design without touching
// the shared renderer used by other forms.
const getIdentityFieldGridSize = (field) => {
  switch (field.name) {
    case "full_name":
      return { xs: 12, md: 8 };
    case "gender":
      return { xs: 12, sm: 6, md: 4 };
    case "address":
      return { xs: 12 };
    case "weight_kg":
    case "height_cm":
      return { xs: 12, sm: 6, md: 6 };
    case "client_id":
    case "email":
    case "telegram_phone":
    case "occupation":
    case "marital_status":
    case "primary_phone":
    case "viber_phone":
    case "emergency_contact_phone":
    case "relationship":
      return { xs: 12, sm: 6, md: 6 };
    case "pregnant":
    case "breastfeeding":
      return { xs: 12, md: 6 };
    case "patient_signature":
      return { xs: 12 };
    default:
      return { xs: 12 };
  }
};

const getQuestionnaireFieldGridSize = (field) => {
  switch (field.type) {
    case "textarea":
    case "checkbox":
      return { xs: 12 };
    case "radio":
    case "date":
      return { xs: 12, md: 6 };
    default:
      return { xs: 12, sm: 6 };
  }
};

const isLeapYear = (year) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

/** Returns YYYY-MM-DD only when day/month/year form a real calendar date. */
const buildDobFromBirthParts = (dayVal, monthVal, yearVal) => {
  if (
    dayVal === "" ||
    monthVal === "" ||
    yearVal === "" ||
    dayVal == null ||
    monthVal == null ||
    yearVal == null
  ) {
    return "";
  }
  const d = Number(dayVal);
  const m = Number(monthVal);
  const y = Number(yearVal);
  if (![d, m, y].every((n) => Number.isFinite(n))) return "";
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const parsed = dayjs(iso);
  if (!parsed.isValid()) return "";
  if (parsed.date() !== d || parsed.month() + 1 !== m || parsed.year() !== y)
    return "";
  return parsed.format("YYYY-MM-DD");
};

const calculateAgeFromBirthParts = (dayVal, monthVal, yearVal) => {
  const iso = buildDobFromBirthParts(dayVal, monthVal, yearVal);
  if (!iso) return "";
  const dob = dayjs(iso);
  const years = dayjs().diff(dob, "year");
  return years >= 0 ? String(years) : "";
};

const toNullableInt = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const resolvePatientReferralName = (data) => {
  const typedReferral = String(data.referral_name ?? "").trim();
  if (typedReferral) return typedReferral;

  const selectedSource = String(data.how_did_you_hear ?? "").trim();
  return selectedSource || null;
};

/** February: days 1–29; day 29 only when year is a leap year (if year is provided). */
const validateFebruaryBirthDay = (data, nextErrors) => {
  const bm = toNullableInt(data.birth_month);
  const bd = toNullableInt(data.birth_day);
  const by = toNullableInt(data.birth_year);
  if (bm !== 2 || bd == null) return;
  if (bd < 1 || bd > 29) {
    nextErrors.birth_day = "For February, day must be between 1 and 29.";
    return;
  }
  if (bd === 29 && by != null && !isLeapYear(by)) {
    nextErrors.birth_day =
      "February 29 is only valid in a leap year — use day 28 or change the year.";
  }
};

/** Main app content scrolls inside `#workspace-scroll-container`, not `window`. */
const WORKSPACE_SCROLL_CONTAINER_ID = "workspace-scroll-container";

const scrollPageToTop = () => {
  const run = () => {
    const main = document.getElementById(WORKSPACE_SCROLL_CONTAINER_ID);
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
};

export default function CreatePatientPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const returnTo = searchParams.get("returnTo");
  const appointmentId = searchParams.get("appointmentId");
  const prefillName = searchParams.get("name");
  const { pushToast } = useToastStore();
  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [partialError, setPartialError] = useState("");
  const [formId, setFormId] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdPatientId, setCreatedPatientId] = useState(null);
  const [patientType, setPatientType] = useState("customer");
  const [duplicatePhoneMatches, setDuplicatePhoneMatches] = useState([]);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      setLoading(true);
      setError("");
      try {
        const form = await getFormByCode(QUESTIONNAIRE_FORM_CODE);
        if (!form?.id) {
          throw new Error("Questionnaire form was not found.");
        }
        const formPayload = await getForm(form.id);
        const normalizedFields = Array.isArray(formPayload?.fields)
          ? formPayload.fields.map(normalizeQuestionnaireField).filter(Boolean)
          : [];
        const completeFields = mergeIdentityFields(normalizedFields);
        setFormId(form.id);
        setFields(completeFields);
        const initialData = buildInitialFormData(completeFields);
        if (prefillName?.trim()) {
          initialData.full_name = prefillName.trim();
        }
        setFormData(initialData);
        setPatientType("customer");
      } catch (err) {
        setError(
          resolveApiError(err, "Could not load the intake questionnaire."),
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestionnaire();
  }, [prefillName]);

  const clinicDisplayName = getClinicDisplayName(settings);
  const intakeSectionBlocks = useMemo(
    () => ({
      ...INTAKE_SECTION_BLOCKS,
      discovery: {
        ...INTAKE_SECTION_BLOCKS.discovery,
        subtitle: `${clinicDisplayName} ကို ဘယ်လိုသိရှိခဲ့သည်ကို ဖြည့်ပါ။`,
      },
    }),
    [clinicDisplayName],
  );

  const fieldsBySection = useMemo(() => {
    return mapFieldsBySection(fields);
  }, [fields]);

  const maritalStatus = formData.marital_status;
  const showMarriageOnlyFields = maritalStatus === "Married";

  const identityFields = useMemo(() => {
    const sectionIdentity = fieldsBySection.identity ?? [];
    if (sectionIdentity.length > 0) {
      return sectionIdentity;
    }

    // Keep a predictable order when section metadata is missing.
    return getFallbackIdentityFields(fields);
  }, [fields, fieldsBySection]);

  const identityMainFields = useMemo(
    () =>
      sortIdentityFieldsForLayout(
        identityFields.filter(
          (f) =>
            !MARRIAGE_ONLY_FIELD_NAMES.includes(f.name) &&
            f.name !== PATIENT_SIGNATURE_FIELD_NAME,
        ),
      ),
    [identityFields],
  );
  const { identityBeforeBirth, identityAfterBirth, birthFields } = useMemo(
    () => splitIdentityForBirthBlock(identityMainFields),
    [identityMainFields],
  );
  const pregnancyFields = useMemo(
    () =>
      showMarriageOnlyFields
        ? identityFields.filter((f) =>
            MARRIAGE_ONLY_FIELD_NAMES.includes(f.name),
          )
        : [],
    [identityFields, showMarriageOnlyFields],
  );
  const consentDateFields = useMemo(
    () => fieldsBySection.consent.filter((f) => f.name !== "consent_signature"),
    [fieldsBySection],
  );
  const consentSignatureField = useMemo(
    () => fields.find((field) => field.name === "consent_signature") ?? null,
    [fields],
  );
  const patientSignatureField = useMemo(
    () =>
      fields.find((field) => field.name === PATIENT_SIGNATURE_FIELD_NAME) ??
      null,
    [fields],
  );
  const signaturePadRef = useRef(null);

  useEffect(() => {
    const calculatedAge = calculateAgeFromBirthParts(
      formData.birth_day,
      formData.birth_month,
      formData.birth_year,
    );
    if (formData.age === calculatedAge) return;
    setFormData((prev) => ({ ...prev, age: calculatedAge }));
  }, [
    formData.birth_day,
    formData.birth_month,
    formData.birth_year,
    formData.age,
  ]);

  const handleFieldChange = (name, value) => {
    setFormData((prev) => getNextFormDataOnFieldChange(prev, name, value));
    setFieldErrors((prev) =>
      getNextFieldErrorsOnFieldChange(prev, name, value),
    );
    if (name === "primary_phone" && !normalizePhone(value)) {
      setDuplicatePhoneMatches([]);
    }
  };

  useEffect(() => {
    const phone = normalizePhone(formData.primary_phone);
    if (!phone || !isValidPhone(phone)) {
      setDuplicatePhoneMatches([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      findPatientsWithPhone(phone)
        .then((matches) => {
          if (active) setDuplicatePhoneMatches(matches);
        })
        .catch(() => {
          if (active) setDuplicatePhoneMatches([]);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.primary_phone]);

  const syncSignatureValue = () => {
    const signaturePad = signaturePadRef.current;
    if (!signaturePad) return;

    const nextValue = signaturePad.isEmpty()
      ? ""
      : signaturePad.getCanvas().toDataURL("image/png");

    handleFieldChange("consent_signature", nextValue);
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    handleFieldChange("consent_signature", "");
  };

  const drawSampleSignature = () => {
    const signaturePad = signaturePadRef.current;
    if (!signaturePad) return "";

    signaturePad.clear();

    // Draw a deterministic sample signature so staff can test the entire flow quickly.
    const signatureCanvas = signaturePad.getCanvas();
    const context = signatureCanvas.getContext("2d");
    if (!context) return "";

    context.strokeStyle = theme.palette.text.primary;
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    context.moveTo(60, 150);
    context.bezierCurveTo(110, 110, 145, 190, 200, 145);
    context.bezierCurveTo(235, 118, 275, 168, 320, 138);
    context.bezierCurveTo(355, 116, 390, 150, 450, 132);
    context.stroke();

    context.beginPath();
    context.moveTo(190, 175);
    context.quadraticCurveTo(280, 190, 390, 172);
    context.stroke();

    return signatureCanvas.toDataURL("image/png");
  };

  const fillSampleData = () => {
    // Merge with the current field registry so future added fields still receive safe defaults.
    const seededData = Object.fromEntries(
      fields.map((field) => [field.name, field.type === "checkbox" ? [] : ""]),
    );
    const sampleData = {
      ...seededData,
      ...SAMPLE_FORM_DATA,
    };

    const sampleSignature = drawSampleSignature();
    sampleData.consent_signature = sampleSignature;
    sampleData.patient_signature = sampleSignature;

    setFormData(sampleData);
    setPatientType("customer");
    setFieldErrors({});
    setError("");
    setPartialError("");
  };

  const buildSubmissionData = () => {
    const signaturePad = signaturePadRef.current;
    const consentSignature =
      signaturePad && !signaturePad.isEmpty()
        ? signaturePad.getCanvas().toDataURL("image/png")
        : (formData.consent_signature ?? "");

    return {
      ...formData,
      age: calculateAgeFromBirthParts(
        formData.birth_day,
        formData.birth_month,
        formData.birth_year,
      ),
      consent_date: formData.consent_date || dayjs().format("YYYY-MM-DD"),
      consent_signature: consentSignature,
    };
  };

  const buildFormResponseData = (data) =>
    Object.fromEntries(
      Object.entries(data).filter(
        ([fieldName]) => !FORM_RESPONSE_EXCLUDED_FIELDS.includes(fieldName),
      ),
    );

  const validateForm = (data) => {
    const nextErrors = {
      ...validateFormFields(fields, data, {
        skipFieldNames: ["primary_phone", "viber_phone", "telegram_phone"],
      }),
    };

    validateFebruaryBirthDay(data, nextErrors);

    const primaryPhoneMsg = phoneValidationMessage(data.primary_phone, {
      required: true,
    });
    if (primaryPhoneMsg) nextErrors.primary_phone = primaryPhoneMsg;

    for (const fieldName of ["viber_phone", "telegram_phone"]) {
      const msg = phoneValidationMessage(data[fieldName]);
      if (msg) nextErrors[fieldName] = msg;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPatientPayload = (data) => ({
    name: String(data.full_name ?? "").trim(),
    client_id: String(data.client_id ?? "").trim() || null,
    type: patientType,
    gender: String(data.gender ?? "").trim() || null,
    phone: normalizePhone(data.primary_phone),
    viber_phone: normalizePhone(data.viber_phone) || null,
    telegram_phone: normalizePhone(data.telegram_phone) || null,
    email: String(data.email ?? "").trim() || null,
    referral_name: resolvePatientReferralName(data),
    signature: data.patient_signature || null,
    birth_day: toNullableInt(data.birth_day),
    birth_month: toNullableInt(data.birth_month),
    birth_year: toNullableInt(data.birth_year),
    weight_kg: String(data.weight_kg ?? "").trim() || null,
    height_cm: String(data.height_cm ?? "").trim() || null,
    address: String(data.address ?? "").trim() || null,
    status: "active",
    notes: null,
  });

  const handleSubmit = async () => {
    if (!formId || saving) return;

    setError("");
    setPartialError("");
    const submissionData = buildSubmissionData();
    setFormData(submissionData);

    if (!validateForm(submissionData)) {
      setError("Please complete the required fields before saving.");
      scrollPageToTop();
      return;
    }

    setSaving(true);
    let patientId = createdPatientId;

    try {
      if (!patientId) {
        const createdPatient = await createPatient(
          buildPatientPayload(submissionData),
        );
        patientId = createdPatient.id;
      }

      setCreatedPatientId(patientId);

      await submitResponse(formId, {
        patient_id: patientId,
        data: buildFormResponseData(submissionData),
      });

      if (appointmentId) {
        await updateAppointment(Number(appointmentId), {
          patient_id: patientId,
          provisional_patient_name: null,
        });
      }

      pushToast({
        message: "Patient created successfully.",
        severity: "success",
      });
      if (appointmentId) {
        navigate(
          getPatientDetailPath(workspacePrefix, patientId, { appointmentId }),
          { replace: true },
        );
      } else if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        navigate(getPatientDetailPath(workspacePrefix, patientId));
      }
    } catch (err) {
      if (!patientId) {
        setError(resolveApiError(err, "Failed to create patient."));
      } else {
        setPartialError(
          resolveApiError(
            err,
            "Patient was created, but the intake questionnaire could not be saved yet.",
          ),
        );
      }
      scrollPageToTop();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  return (
    <Box pb={2}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(getPatientsListPath(workspacePrefix))}
        sx={{ mb: 2 }}
      >
        Back to Patients
      </Button>

      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Create Patient
            </Typography>
            <Typography variant="body2" color="text.secondary">
              English identity section with Myanmar intake questionnaire
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={fillSampleData}
            disabled={loading || saving}
          >
            Fill Sample Data
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {partialError && (
          <Alert
            severity="warning"
            action={
              createdPatientId ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() =>
                    navigate(
                      getPatientDetailPath(workspacePrefix, createdPatientId, {
                        appointmentId,
                      }),
                    )
                  }
                >
                  Open Patient
                </Button>
              ) : null
            }
          >
            {partialError}
          </Alert>
        )}

        <DuplicatePhoneWarning matches={duplicatePhoneMatches} />

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={0}
              sx={(theme) => ({
                p: { xs: 2, md: 3 },
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <Stack spacing={3}>
                <Box
                  sx={{
                    pb: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {INTAKE_IDENTITY_CARD.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {INTAKE_IDENTITY_CARD.subtitle}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Patient Type
                  </Typography>
                  <Stack
                    direction={"row"}
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {PATIENT_TYPE_OPTIONS.map((option) => (
                      <Box
                        key={option.value}
                        component="button"
                        type="button"
                        onClick={() => setPatientType(option.value)}
                        disabled={saving || !!createdPatientId}
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor:
                            patientType === option.value
                              ? "primary.main"
                              : "divider",
                          bgcolor:
                            patientType === option.value
                              ? "action.selected"
                              : "background.paper",
                          textAlign: "left",
                          cursor:
                            saving || !!createdPatientId
                              ? "default"
                              : "pointer",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {option.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                {(identityBeforeBirth.length > 0 ||
                  birthFields.length > 0 ||
                  identityAfterBirth.length > 0) && (
                  <Stack spacing={2.5}>
                    {identityBeforeBirth.length > 0 && (
                      <DynamicFormRenderer
                        fields={identityBeforeBirth}
                        formData={formData}
                        onChange={handleFieldChange}
                        errors={fieldErrors}
                        disabled={saving || !!createdPatientId}
                        getFieldGridSize={getIdentityFieldGridSize}
                      />
                    )}
                    {birthFields.length > 0 && (
                      <IdentityBirthDateSection
                        birthFields={birthFields}
                        formData={formData}
                        fieldErrors={fieldErrors}
                        disabled={saving || !!createdPatientId}
                        onChange={handleFieldChange}
                      />
                    )}
                    {identityAfterBirth.length > 0 && (
                      <DynamicFormRenderer
                        fields={identityAfterBirth}
                        formData={formData}
                        onChange={handleFieldChange}
                        errors={fieldErrors}
                        disabled={saving || !!createdPatientId}
                        getFieldGridSize={getIdentityFieldGridSize}
                      />
                    )}
                  </Stack>
                )}
                {showMarriageOnlyFields && pregnancyFields.length > 0 && (
                  <Box
                    sx={{
                      mt: 0.5,
                      p: { xs: 1.5, md: 2 },
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Married Patient Details
                      </Typography>
                      <DynamicFormRenderer
                        fields={pregnancyFields}
                        formData={formData}
                        onChange={handleFieldChange}
                        errors={fieldErrors}
                        disabled={saving || !!createdPatientId}
                        getFieldGridSize={getIdentityFieldGridSize}
                      />
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={3.5}>
                {INTAKE_BODY_SECTION_KEYS.map((sectionKey) => {
                  const blockFields = fieldsBySection[sectionKey];
                  if (!blockFields.length) return null;
                  const meta = intakeSectionBlocks[sectionKey];
                  return (
                    <Fragment key={sectionKey}>
                      <Divider />
                      <SectionBlock title={meta.title} subtitle={meta.subtitle}>
                        <DynamicFormRenderer
                          fields={blockFields}
                          formData={formData}
                          onChange={handleFieldChange}
                          errors={fieldErrors}
                          disabled={saving}
                          getFieldGridSize={getQuestionnaireFieldGridSize}
                        />
                      </SectionBlock>
                    </Fragment>
                  );
                })}

                <Divider />

                <SectionBlock
                  title={intakeSectionBlocks.consent.title}
                  subtitle={intakeSectionBlocks.consent.subtitle}
                >
                  <Typography variant="body2" color="text.secondary">
                    ဆေးခန်းပြသမည့်သူများ၏ ကုသမှု မခံယူမီ
                    မှတ်တမ်းဓာတ်ပုံများနှင့် ကုသမှုအပြီး မှတ်တမ်းဓာတ်ပုံများကို
                    ရိုက်ယူသိမ်းဆည်းထားမည်ဖြစ်ပါသည်။ ကြော်ငြာအတွက် အသုံးပြုရန်
                    မဟုတ်ပါ။
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    အထက်ပါ အကြောင်းအရာကို ကုသမှု ခံယူမည့်သူဘက်မှ သဘောတူကြောင်း
                    လက်မှတ်ထိုးပါသည်။
                  </Typography>
                  {consentDateFields.length > 0 && (
                    <DynamicFormRenderer
                      fields={consentDateFields}
                      formData={formData}
                      onChange={handleFieldChange}
                      errors={fieldErrors}
                      disabled={saving}
                      getFieldGridSize={getQuestionnaireFieldGridSize}
                    />
                  )}
                  {consentSignatureField && (
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mb: 1 }}
                      >
                        {consentSignatureField.label}
                        {consentSignatureField.required ? (
                          <RequiredAsterisk />
                        ) : null}
                      </Typography>
                      <Box
                        sx={{
                          border: "1px dashed",
                          borderColor: fieldErrors.consent_signature
                            ? "error.main"
                            : "divider",
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderBottom: 1,
                            borderColor: "divider",
                            bgcolor: "background.default",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Sign inside the box below.
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1 }}>
                          {/* Store the signature as a data URL so it fits the existing form response payload. */}
                          <SignatureCanvas
                            ref={signaturePadRef}
                            penColor={theme.palette.text.primary}
                            canvasProps={{
                              width: 900,
                              height: 220,
                              style: {
                                width: "100%",
                                height: "220px",
                                display: "block",
                                borderRadius: theme.shape.borderRadius,
                                background: theme.palette.background.paper,
                              },
                            }}
                            onEnd={syncSignatureValue}
                          />
                        </Box>
                      </Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          This signature will be saved with the intake form.
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={clearSignature}
                          disabled={saving}
                        >
                          Clear Signature
                        </Button>
                      </Stack>
                      {fieldErrors.consent_signature && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.75, display: "block" }}
                        >
                          {fieldErrors.consent_signature}
                        </Typography>
                      )}
                    </Box>
                  )}
                </SectionBlock>
              </Stack>
            </Card>
          </Grid>
        </Grid>

        {patientSignatureField && (
          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <SectionBlock
              title="Patient E-sign"
              subtitle="Collect patient signature before final submission."
            >
              <DynamicFormRenderer
                fields={[patientSignatureField]}
                formData={formData}
                onChange={handleFieldChange}
                errors={fieldErrors}
                disabled={saving || !!createdPatientId}
              />
            </SectionBlock>
          </Card>
        )}

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1.5}
          justifyContent="flex-end"
          sx={{ pt: 1 }}
        >
          {createdPatientId && (
            <Button
              variant="outlined"
              onClick={() =>
                navigate(
                  getPatientDetailPath(workspacePrefix, createdPatientId, {
                    appointmentId,
                  }),
                )
              }
            >
              Open Patient
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => navigate(getPatientsListPath(workspacePrefix))}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !formId}
          >
            {saving
              ? createdPatientId
                ? "Saving Questionnaire..."
                : "Creating Patient..."
              : createdPatientId
                ? "Save Questionnaire Again"
                : "Submit"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function SectionBlock({ title, subtitle, children }) {
  return (
    <Stack spacing={2.25}>
      <Box
        sx={{
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Stack>
  );
}
