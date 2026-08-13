import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import SignatureCanvas from "react-signature-canvas";
import { resolveApiError } from "../../services/apiClient";
import {
  createPatient,
  getPatients,
  savePatientMedicalHistory,
} from "../../services/patientService";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import { getBirthSelectOptionPairs } from "../../utils/identityBirthSelectOptions";
import {
  computePatientAge,
  formatPatientNumber,
  resolvePatientNumber,
} from "../../utils/patientUtils";

const WORKSPACE_SCROLL_CONTAINER_ID = "workspace-scroll-container";

const emptyForm = () => ({
  full_name: "",
  gender: "",
  birth_day: "",
  birth_month: "",
  birth_year: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  weight_kg: "",
  height_cm: "",
  allergies: "",
  current_medications: "",
  chronic_conditions: "",
  pregnancy_status: "",
  breastfeeding_status: "",
  registration_notes: "",
  consent_signature: "",
});

/** Clinical demo cases aligned with the patient registry demo data. */
const DEMO_REGISTRATION_SAMPLES = [
  {
    id: "laser_facial",
    label: "Adult — Laser facial consult",
    data: {
      full_name: "U Kyaw Lin",
      gender: "Male",
      birth_day: "12",
      birth_month: "3",
      birth_year: "1965",
      phone: "09-421-555-001",
      email: "kyaw.lin@patient.demo",
      address: "No. 45, Kamayut Township, Yangon",
      emergency_contact_name: "Daw Khin Khin",
      emergency_contact_phone: "09-421-555-002",
      weight_kg: "72",
      height_cm: "168",
      allergies: "No known drug allergies.",
      current_medications: "None.",
      chronic_conditions: "None.",
      registration_notes: "Laser facial consult — pigmentation on cheeks; first visit.",
    },
  },
  {
    id: "acne_peel",
    label: "Young adult — Chemical peel",
    data: {
      full_name: "Mg Zaw Htet",
      gender: "Male",
      birth_day: "20",
      birth_month: "11",
      birth_year: "2008",
      phone: "09-421-555-003",
      address: "No. 8, Sanchaung Township, Yangon",
      emergency_contact_name: "U Myint Aung (Father)",
      emergency_contact_phone: "09-421-555-004",
      weight_kg: "48",
      height_cm: "158",
      allergies: "None reported.",
      current_medications: "Topical benzoyl peroxide.",
      chronic_conditions: "Acne-prone skin.",
      registration_notes: "Chemical peel consult — acne scarring on cheeks; parent present.",
    },
  },
  {
    id: "bridal_glow",
    label: "Adult — Bridal glow package",
    data: {
      full_name: "Ma Thiri",
      gender: "Female",
      birth_day: "18",
      birth_month: "5",
      birth_year: "1998",
      phone: "09-421-555-005",
      email: "ma.thiri@patient.demo",
      address: "No. 22, Bahan Township, Yangon",
      emergency_contact_name: "Ko Min Thu (Spouse)",
      emergency_contact_phone: "09-421-555-006",
      weight_kg: "58",
      height_cm: "162",
      allergies: "None.",
      current_medications: "None.",
      chronic_conditions: "None.",
      pregnancy_status: "no",
      breastfeeding_status: "no",
      registration_notes: "Bridal glow package — wedding in 8 weeks; wants even skin tone.",
    },
  },
  {
    id: "botox",
    label: "Adult — Botox consult",
    data: {
      full_name: "Daw Nwe Nwe",
      gender: "Female",
      birth_day: "11",
      birth_month: "2",
      birth_year: "1987",
      phone: "09-421-555-007",
      address: "No. 90, Kamayut Township, Yangon",
      emergency_contact_name: "Daw Yi Yi",
      emergency_contact_phone: "09-421-555-008",
      weight_kg: "58",
      height_cm: "162",
      allergies: "Lidocaine — mild swelling.",
      current_medications: "None.",
      chronic_conditions: "None.",
      registration_notes: "Botox consult — forehead and crow's feet; returning patient.",
    },
  },
  {
    id: "iv_drip",
    label: "Adult — IV drip wellness",
    data: {
      full_name: "Daw Khin Mya",
      gender: "Female",
      birth_day: "4",
      birth_month: "8",
      birth_year: "1972",
      phone: "09-421-555-009",
      email: "khin.mya@patient.demo",
      address: "No. 14, Mayangone Township, Yangon",
      emergency_contact_name: "U Tun Tun",
      emergency_contact_phone: "09-421-555-010",
      weight_kg: "68",
      height_cm: "155",
      allergies: "None.",
      current_medications: "None.",
      chronic_conditions: "None.",
      registration_notes: "IV drip wellness — tiredness and dull skin; booked with facial.",
    },
  },
];

function scrollPageToTop() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const main = document.getElementById(WORKSPACE_SCROLL_CONTAINER_ID);
      if (main) {
        main.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    });
  });
}

function toNullableInt(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildDobIso(dayVal, monthVal, yearVal) {
  if (!dayVal || !monthVal || !yearVal) return null;
  const iso = `${yearVal}-${String(monthVal).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`;
  const parsed = dayjs(iso);
  return parsed.isValid() ? iso : null;
}

function BirthDateFields({ form, errors, disabled, onChange }) {
  const renderSelect = (fieldName, label) => {
    const pairs = getBirthSelectOptionPairs(fieldName) ?? [];
    const value = form[fieldName] ?? "";
    const error = errors[fieldName];
    return (
      <FormControl fullWidth size="small" error={Boolean(error)}>
        <InputLabel shrink>{label}</InputLabel>
        <Select
          notched
          label={label}
          displayEmpty
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(fieldName, e.target.value)}
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
        {error ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
    );
  };

  const age = computePatientAge({
    birth_day: form.birth_day,
    birth_month: form.birth_month,
    birth_year: form.birth_year,
  });

  return (
    <Box
      sx={(theme) => ({
        p: 2,
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      })}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        Date of birth
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>{renderSelect("birth_day", "Day")}</Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          {renderSelect("birth_month", "Month")}
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>{renderSelect("birth_year", "Year")}</Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary">
            Age
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {age != null ? `${age} years` : "—"}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        p: { xs: 2, md: 2.5 },
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {children}
      </Stack>
    </Card>
  );
}

export default function CreatePatientPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const prefix = getWorkspaceUrlPrefix(user);
  const returnTo = searchParams.get("returnTo");
  const prefillName = searchParams.get("name");

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [demoSampleId, setDemoSampleId] = useState("");
  const signaturePadRef = useRef(null);

  useEffect(() => {
    if (prefillName?.trim()) {
      setForm((prev) => ({ ...prev, full_name: prefillName.trim() }));
    }
  }, [prefillName]);

  const isFemale = String(form.gender).toLowerCase() === "female";

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (name === "phone" && !String(value).trim()) {
      setDuplicateMatches([]);
    }
  };

  useEffect(() => {
    const phone = String(form.phone ?? "").trim();
    if (phone.length < 8) {
      setDuplicateMatches([]);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await getPatients({ phone, per_page: 5 });
        const rows = Array.isArray(data) ? data : (data?.data ?? []);
        if (active) setDuplicateMatches(rows);
      } catch {
        if (active) setDuplicateMatches([]);
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.phone]);

  const nextPatientPreview = useMemo(
    () => formatPatientNumber("####", dayjs().year()).replace("####", "····"),
    [],
  );

  const applyDemoSample = (sampleId) => {
    const sample = DEMO_REGISTRATION_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setDemoSampleId(sampleId);
    setForm({ ...emptyForm(), ...sample.data, consent_signature: "" });
    signaturePadRef.current?.clear();
    setErrors({});
    setError("");
  };

  const drawSampleSignature = useCallback(() => {
    const signaturePad = signaturePadRef.current;
    if (!signaturePad) return "";
    signaturePad.clear();
    const canvas = signaturePad.getCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.strokeStyle = theme.palette.text.primary;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(60, 150);
    ctx.bezierCurveTo(110, 110, 145, 190, 200, 145);
    ctx.bezierCurveTo(235, 118, 275, 168, 320, 138);
    ctx.stroke();
    return canvas.toDataURL("image/png");
  }, [theme.palette.text.primary]);

  const fillDemoWithSignature = () => {
    if (!demoSampleId) {
      applyDemoSample(DEMO_REGISTRATION_SAMPLES[0].id);
    }
    const signature = drawSampleSignature();
    setForm((prev) => ({ ...prev, consent_signature: signature }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!String(form.full_name).trim()) {
      nextErrors.full_name = "Patient name is required.";
    }
    if (!String(form.gender).trim()) {
      nextErrors.gender = "Gender is required.";
    }
    if (!String(form.phone).trim()) {
      nextErrors.phone = "Phone number is required.";
    }
    if (!String(form.consent_signature).trim()) {
      nextErrors.consent_signature = "Patient or guardian signature is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPatientPayload = () => {
    const dob = buildDobIso(form.birth_day, form.birth_month, form.birth_year);
    const notes = [
      form.registration_notes,
      form.emergency_contact_name
        ? `Emergency contact: ${form.emergency_contact_name}${form.emergency_contact_phone ? ` (${form.emergency_contact_phone})` : ""}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      name: String(form.full_name).trim(),
      type: "customer",
      gender: String(form.gender).trim() || null,
      phone: String(form.phone).trim(),
      email: String(form.email).trim() || null,
      dob,
      birth_day: toNullableInt(form.birth_day),
      birth_month: toNullableInt(form.birth_month),
      birth_year: toNullableInt(form.birth_year),
      weight_kg: String(form.weight_kg).trim() || null,
      height_cm: String(form.height_cm).trim() || null,
      address: String(form.address).trim() || null,
      signature: form.consent_signature || null,
      status: "active",
      notes: notes || null,
    };
  };

  const buildMedicalHistoryPayload = () => ({
    allergies: String(form.allergies).trim() || null,
    current_medications: String(form.current_medications).trim() || null,
    chronic_diseases: String(form.chronic_conditions).trim() || null,
    pregnancy_status: isFemale ? form.pregnancy_status || null : null,
    breastfeeding_status: isFemale ? form.breastfeeding_status || null : null,
  });

  const handleSubmit = async () => {
    if (saving) return;
    setError("");

    const signaturePad = signaturePadRef.current;
    const consentSignature =
      signaturePad && !signaturePad.isEmpty()
        ? signaturePad.getCanvas().toDataURL("image/png")
        : form.consent_signature;

    const submission = { ...form, consent_signature: consentSignature };
    setForm(submission);

    if (!validate()) {
      setError("Please complete the required fields before registering.");
      scrollPageToTop();
      return;
    }

    setSaving(true);
    try {
      const created = await createPatient(buildPatientPayload());
      const clinical = buildMedicalHistoryPayload();
      const hasClinicalData = Object.values(clinical).some(Boolean);
      if (hasClinicalData) {
        try {
          await savePatientMedicalHistory(created.id, clinical);
        } catch {
          pushToast({
            message:
              "Patient registered, but clinical history could not be saved yet. Complete it on the Medical History tab.",
            severity: "warning",
          });
        }
      }

      pushToast({
        message: `Patient registered — ${created.patient_number ?? resolvePatientNumber(created)}.`,
        severity: "success",
      });

      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        navigate(`${prefix}/patients/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(resolveApiError(err, "Failed to register patient."));
      scrollPageToTop();
    } finally {
      setSaving(false);
    }
  };

  const isDark = theme.palette.mode === "dark";
  const headerSurfaceSx = {
    borderRadius: 1,
    border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.28 : 0.14)}`,
    background: [
      isDark
        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
        : `linear-gradient(135deg, ${alpha("#ffffff", 0.94)} 0%, ${alpha(theme.palette.background.default, 0.88)} 100%)`,
      `radial-gradient(ellipse 80% 60% at 100% 0%, ${alpha(theme.palette.primary.main, isDark ? 0.14 : 0.07)}, transparent 55%)`,
    ].join(", "),
    boxShadow: isDark
      ? `0 10px 28px ${alpha(theme.palette.common.black, 0.35)}`
      : `0 10px 28px ${alpha(theme.palette.text.primary, 0.06)}`,
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`${prefix}/patients`)}
        sx={{ mb: 2 }}
      >
        Back to Patient Registry
      </Button>

      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Register Patient
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Patient registration — demographics, contact, and clinical baseline
              for the patient chart.
            </Typography>
          </Box>
          <Chip
            icon={<PersonAddOutlinedIcon sx={{ fontSize: "16px !important" }} />}
            label={`Patient no. assigned on save · ${nextPatientPreview}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}
          />
        </Stack>

        <Paper elevation={0} sx={{ ...headerSurfaceSx, p: { xs: 2, sm: 2.5 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              select
              size="small"
              label="Load demo case"
              value={demoSampleId}
              onChange={(e) => {
                const value = e.target.value;
                setDemoSampleId(value);
                if (value) applyDemoSample(value);
              }}
              sx={{ minWidth: { xs: "100%", sm: 280 } }}
            >
              <MenuItem value="">
                <em>— Select a clinical demo case —</em>
              </MenuItem>
              {DEMO_REGISTRATION_SAMPLES.map((sample) => (
                <MenuItem key={sample.id} value={sample.id}>
                  {sample.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<ScienceOutlinedIcon />}
              onClick={fillDemoWithSignature}
              disabled={saving}
            >
              Fill demo + signature
            </Button>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        {duplicateMatches.length > 0 ? (
          <Alert severity="warning">
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Possible duplicate — phone already registered
            </Typography>
            {duplicateMatches.map((match) => (
              <Typography key={match.id} variant="body2">
                {match.patient_number ?? formatPatientNumber(match.id)} ·{" "}
                {match.name}
                {match.phone ? ` · ${match.phone}` : ""}
              </Typography>
            ))}
          </Alert>
        ) : null}

        <SectionCard
          title="Demographics"
          subtitle="Core identity used across consultation, treatment, and billing."
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="Full name"
                required
                fullWidth
                value={form.full_name}
                error={Boolean(errors.full_name)}
                helperText={errors.full_name}
                disabled={saving}
                onChange={(e) => setField("full_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required error={Boolean(errors.gender)}>
                <InputLabel>Gender</InputLabel>
                <Select
                  label="Gender"
                  value={form.gender}
                  disabled={saving}
                  onChange={(e) => setField("gender", e.target.value)}
                >
                  <MenuItem value="">
                    <em>— Select —</em>
                  </MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </Select>
                {errors.gender ? (
                  <FormHelperText>{errors.gender}</FormHelperText>
                ) : null}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <BirthDateFields
                form={form}
                errors={errors}
                disabled={saving}
                onChange={setField}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address"
                fullWidth
                multiline
                minRows={2}
                value={form.address}
                disabled={saving}
                onChange={(e) => setField("address", e.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Contact"
          subtitle="Primary phone is used for appointment reminders and patient lookup."
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone"
                required
                fullWidth
                value={form.phone}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                disabled={saving}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={form.email}
                disabled={saving}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Emergency contact name"
                fullWidth
                value={form.emergency_contact_name}
                disabled={saving}
                onChange={(e) => setField("emergency_contact_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Emergency contact phone"
                fullWidth
                value={form.emergency_contact_phone}
                disabled={saving}
                onChange={(e) =>
                  setField("emergency_contact_phone", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Clinical baseline"
          subtitle="Captured at registration — editable later on the Medical History tab."
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Weight (kg)"
                type="number"
                fullWidth
                value={form.weight_kg}
                disabled={saving}
                onChange={(e) => setField("weight_kg", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Height (cm)"
                type="number"
                fullWidth
                value={form.height_cm}
                disabled={saving}
                onChange={(e) => setField("height_cm", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Known allergies"
                fullWidth
                multiline
                minRows={2}
                placeholder="e.g. Penicillin — rash; No known drug allergies"
                value={form.allergies}
                disabled={saving}
                onChange={(e) => setField("allergies", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Current medications"
                fullWidth
                multiline
                minRows={2}
                value={form.current_medications}
                disabled={saving}
                onChange={(e) => setField("current_medications", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Chronic conditions"
                fullWidth
                multiline
                minRows={2}
                value={form.chronic_conditions}
                disabled={saving}
                onChange={(e) => setField("chronic_conditions", e.target.value)}
              />
            </Grid>
            {isFemale ? (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Pregnancy status</InputLabel>
                    <Select
                      label="Pregnancy status"
                      value={form.pregnancy_status}
                      disabled={saving}
                      onChange={(e) =>
                        setField("pregnancy_status", e.target.value)
                      }
                    >
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="yes">Yes</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                      <MenuItem value="unknown">Unknown</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Breastfeeding</InputLabel>
                    <Select
                      label="Breastfeeding"
                      value={form.breastfeeding_status}
                      disabled={saving}
                      onChange={(e) =>
                        setField("breastfeeding_status", e.target.value)
                      }
                    >
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="yes">Yes</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            ) : null}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Registration notes"
                fullWidth
                multiline
                minRows={2}
                placeholder="Primary concern, referral source, or front-desk notes for today's visit"
                value={form.registration_notes}
                disabled={saving}
                onChange={(e) => setField("registration_notes", e.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Registration consent"
          subtitle="Patient or authorised guardian confirms data accuracy and consent to care."
        >
          <Typography variant="body2" color="text.secondary">
            I confirm that the information provided is accurate to the best of my
            knowledge. I consent to clinical assessment, documentation, and
            treatment at this facility in accordance with clinic policy and
            applicable medical regulations.
          </Typography>
          <Box
            sx={{
              border: "1px dashed",
              borderColor: errors.consent_signature ? "error.main" : "divider",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 1.5, py: 1, bgcolor: "background.default" }}>
              <Typography variant="body2" color="text.secondary">
                Signature
              </Typography>
            </Box>
            <Box sx={{ p: 1 }}>
              <SignatureCanvas
                ref={signaturePadRef}
                penColor={theme.palette.text.primary}
                canvasProps={{
                  width: 900,
                  height: 200,
                  style: {
                    width: "100%",
                    height: "200px",
                    display: "block",
                    borderRadius: 1,
                    background: theme.palette.background.paper,
                  },
                }}
                onEnd={() => {
                  const pad = signaturePadRef.current;
                  if (!pad || pad.isEmpty()) return;
                  setField(
                    "consent_signature",
                    pad.getCanvas().toDataURL("image/png"),
                  );
                }}
              />
            </Box>
          </Box>
          {errors.consent_signature ? (
            <FormHelperText error>{errors.consent_signature}</FormHelperText>
          ) : null}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                signaturePadRef.current?.clear();
                setField("consent_signature", "");
              }}
              disabled={saving}
            >
              Clear signature
            </Button>
          </Stack>
        </SectionCard>

        <Divider />

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            disabled={saving}
            onClick={() => navigate(`${prefix}/patients`)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSubmit}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {saving ? "Registering…" : "Register patient"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
