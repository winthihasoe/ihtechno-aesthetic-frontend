import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  getPatientMedicalHistory,
  savePatientMedicalHistory,
} from "../../../services/patientService";
import { resolveApiError } from "../../../services/apiClient";
import PrescriptionSummaryBlock from "../../../components/prescription/PrescriptionSummaryBlock";

const QUESTIONNAIRE_SECTIONS = [
  {
    title: "Patient Identity",
    fields: [
      ["full_name", "Full Name"],
      ["gender", "Gender"],
      ["date_of_birth", "Date of Birth"],
      ["age", "Age"],
      ["occupation", "Occupation"],
      ["marital_status", "Marital Status"],
      ["pregnant", "Pregnant"],
      ["breastfeeding", "Breastfeeding"],
      ["weight_kg", "Weight (kg)"],
      ["height_cm", "Height (cm)"],
      ["primary_phone", "Primary Phone"],
      ["viber_phone", "Viber Phone"],
      ["emergency_contact_phone", "Emergency Contact Phone"],
      ["relationship", "Relationship"],
      ["email", "Email"],
      ["address", "Address"],
    ],
  },
  {
    title: "How Patient Found Us",
    fields: [
      ["how_did_you_hear", "How did you hear about us?"],
      ["referral_name", "Referral Name"],
    ],
  },
  {
    title: "Treatment Request",
    fields: [
      ["requested_treatment", "Requested Treatment"],
      ["interested_treatment", "Interested Treatment"],
      ["current_skincare", "Current Skincare"],
    ],
  },
  {
    title: "Medical History (intake)",
    fields: [
      ["current_medical_treatment", "Current Medical Treatment"],
      ["surgery_history", "Surgery History"],
      ["allergies", "Allergies"],
      ["lidocaine_allergy", "Lidocaine Allergy"],
      ["recent_herpes_outbreak", "Recent Herpes Outbreak"],
      ["underlying_conditions", "Underlying Conditions"],
    ],
  },
  {
    title: "Consent",
    fields: [
      ["consent_date", "Consent Date"],
      ["consent_name", "Consent Name"],
      ["consent_signature", "Signature"],
    ],
  },
];

function formatQuestionnaireValue(fieldName, value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (fieldName === "date_of_birth" || fieldName === "consent_date") {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("D MMM YYYY") : String(value);
  }
  return String(value);
}

const emptyClinicalForm = () => ({
  allergies: "",
  current_medications: "",
  chronic_diseases: "",
  pregnancy_status: false,
  breastfeeding_status: false,
  skin_conditions: "",
  past_aesthetic_history: "",
});

function mapApiToForm(record) {
  if (!record) return emptyClinicalForm();
  return {
    allergies: record.allergies ?? "",
    current_medications: record.current_medications ?? "",
    chronic_diseases: record.chronic_diseases ?? "",
    pregnancy_status: Boolean(record.pregnancy_status),
    breastfeeding_status: Boolean(record.breastfeeding_status),
    skin_conditions: record.skin_conditions ?? "",
    past_aesthetic_history: record.past_aesthetic_history ?? "",
  };
}

export default function PatientMedicalHistoryTab({
  patientId,
  latestQuestionnaireResponse,
  patient,
  visits,
  canEditClinicalHistory,
  onClinicalHistorySaved,
}) {
  const [clinicalForm, setClinicalForm] = useState(emptyClinicalForm);
  const [loadingClinical, setLoadingClinical] = useState(true);
  const [savingClinical, setSavingClinical] = useState(false);
  const [clinicalError, setClinicalError] = useState("");

  const loadClinical = useCallback(async () => {
    if (!patientId) return;
    setLoadingClinical(true);
    setClinicalError("");
    try {
      const data = await getPatientMedicalHistory(patientId);
      setClinicalForm(mapApiToForm(data));
    } catch (err) {
      setClinicalError(resolveApiError(err, "Could not load medical & aesthetic history."));
    } finally {
      setLoadingClinical(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadClinical();
  }, [loadClinical]);

  const handleSaveClinical = async () => {
    if (!patientId || !canEditClinicalHistory) return;
    setSavingClinical(true);
    setClinicalError("");
    try {
      const payload = {
        allergies: clinicalForm.allergies || null,
        current_medications: clinicalForm.current_medications || null,
        chronic_diseases: clinicalForm.chronic_diseases || null,
        pregnancy_status: clinicalForm.pregnancy_status,
        breastfeeding_status: clinicalForm.breastfeeding_status,
        skin_conditions: clinicalForm.skin_conditions || null,
        past_aesthetic_history: clinicalForm.past_aesthetic_history || null,
      };
      const saved = await savePatientMedicalHistory(patientId, payload);
      setClinicalForm(mapApiToForm(saved));
      onClinicalHistorySaved?.(saved);
    } catch (err) {
      setClinicalError(resolveApiError(err, "Unable to save medical & aesthetic history."));
    } finally {
      setSavingClinical(false);
    }
  };

  const hasText =
    clinicalForm.allergies.trim() ||
    clinicalForm.current_medications.trim() ||
    clinicalForm.chronic_diseases.trim() ||
    clinicalForm.skin_conditions.trim() ||
    clinicalForm.past_aesthetic_history.trim();
  const showEmptyWarning =
    !loadingClinical && !hasText && !clinicalForm.pregnancy_status && !clinicalForm.breastfeeding_status;

  const patientFieldMap = {
    gender: patient?.gender,
    weight_kg: patient?.weight_kg,
    height_cm: patient?.height_cm,
  };

  const questionnaireSections =
    latestQuestionnaireResponse &&
    QUESTIONNAIRE_SECTIONS.map((section) => ({
      ...section,
      entries: section.fields
        .map(([fieldName, label]) => {
          const responseData = latestQuestionnaireResponse.data ?? {};
          const value =
            responseData[fieldName] !== undefined
              ? responseData[fieldName]
              : patientFieldMap[fieldName];
          return { fieldName, label, value };
        })
        .filter((entry) => {
          if (entry.fieldName === "consent_signature") return Boolean(entry.value);
          return entry.value !== undefined;
        }),
    })).filter((section) => section.entries.length > 0);

  const visitPrescriptions = (visits ?? []).flatMap((visit) =>
    (visit.prescriptions ?? []).map((rx) => ({
      ...rx,
      visit_time: visit.visit_time ?? visit.created_at,
      visit_id: visit.id,
      source_label: `Visit #${visit.id}`,
    })),
  );

  const cashierPrescriptions = (patient?.paid_standalone_prescriptions ??
    patient?.paidStandalonePrescriptions ??
    []
  ).map((rx) => ({
    ...rx,
    source_label: rx.payment?.invoice_number
      ? `Invoice ${rx.payment.invoice_number}`
      : "Cashier purchase",
  }));

  const allPrescriptions = [...visitPrescriptions, ...cashierPrescriptions].sort(
    (a, b) => {
      const ta = dayjs(a.prescribed_at ?? a.visit_time ?? a.payment?.paid_at).valueOf();
      const tb = dayjs(b.prescribed_at ?? b.visit_time ?? b.payment?.paid_at).valueOf();
      return tb - ta;
    },
  );

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Medical & aesthetic history
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Patient record (allergies, medications, skin conditions, and prior treatments). Matching
          answers from the intake questionnaire are copied here when the patient is registered; you
          can edit this summary before consultation.
        </Typography>
        {showEmptyWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Medical & aesthetic history is empty. Please complete it before consultation.
          </Alert>
        )}
        {clinicalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {clinicalError}
          </Alert>
        )}
        {loadingClinical ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : (
          <Stack spacing={2} maxWidth={640}>
            <TextField
              label="Allergies"
              value={clinicalForm.allergies}
              onChange={(e) =>
                setClinicalForm((f) => ({ ...f, allergies: e.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
              disabled={!canEditClinicalHistory}
            />
            <TextField
              label="Current medications"
              value={clinicalForm.current_medications}
              onChange={(e) =>
                setClinicalForm((f) => ({ ...f, current_medications: e.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
              disabled={!canEditClinicalHistory}
            />
            <TextField
              label="Chronic diseases"
              value={clinicalForm.chronic_diseases}
              onChange={(e) =>
                setClinicalForm((f) => ({ ...f, chronic_diseases: e.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
              disabled={!canEditClinicalHistory}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={clinicalForm.pregnancy_status}
                    onChange={(e) =>
                      setClinicalForm((f) => ({
                        ...f,
                        pregnancy_status: e.target.checked,
                      }))
                    }
                    disabled={!canEditClinicalHistory}
                  />
                }
                label="Pregnancy"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={clinicalForm.breastfeeding_status}
                    onChange={(e) =>
                      setClinicalForm((f) => ({
                        ...f,
                        breastfeeding_status: e.target.checked,
                      }))
                    }
                    disabled={!canEditClinicalHistory}
                  />
                }
                label="Breastfeeding"
              />
            </Stack>
            <TextField
              label="Other conditions"
              value={clinicalForm.skin_conditions}
              onChange={(e) =>
                setClinicalForm((f) => ({ ...f, skin_conditions: e.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
              disabled={!canEditClinicalHistory}
            />
            <TextField
              label="Past surgical / medical history"
              value={clinicalForm.past_aesthetic_history}
              onChange={(e) =>
                setClinicalForm((f) => ({
                  ...f,
                  past_aesthetic_history: e.target.value,
                }))
              }
              multiline
              minRows={2}
              fullWidth
              disabled={!canEditClinicalHistory}
            />
            {canEditClinicalHistory && (
              <Button
                variant="contained"
                onClick={handleSaveClinical}
                disabled={savingClinical}
              >
                {savingClinical ? "Saving…" : "Save clinical history"}
              </Button>
            )}
          </Stack>
        )}
      </Card>

      <Divider />

      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Intake questionnaire
        </Typography>
        {!latestQuestionnaireResponse ? (
          <Typography variant="body2" color="text.secondary">
            No intake questionnaire has been submitted yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
              <Typography variant="body2" fontWeight={600}>
                {latestQuestionnaireResponse.form?.name || "Intake form"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted by {latestQuestionnaireResponse.submitted_by?.name || latestQuestionnaireResponse.submittedBy?.name || "Unknown"} on{" "}
                {latestQuestionnaireResponse.created_at
                  ? dayjs(latestQuestionnaireResponse.created_at).format("D MMM YYYY, HH:mm")
                  : "-"}
              </Typography>
            </Card>
            {questionnaireSections.map((section) => (
              <Card key={section.title} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  {section.title}
                </Typography>
                <Stack spacing={1.25}>
                  {section.entries.map(({ fieldName, label, value }) => (
                    <Box key={fieldName}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600 }}
                      >
                        {label}
                      </Typography>
                      {fieldName === "consent_signature" ? (
                        <Box
                          component="img"
                          src={value}
                          alt="Consent signature"
                          sx={{
                            display: "block",
                            mt: 0.75,
                            maxWidth: 280,
                            width: "100%",
                            border: 1,
                            borderColor: "divider",
                            bgcolor: "background.paper",
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mt: 0.3, whiteSpace: "pre-wrap" }}>
                          {formatQuestionnaireValue(fieldName, value)}
                        </Typography>
                      )}
                      <Divider sx={{ mt: 1.25 }} />
                    </Box>
                  ))}
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {allPrescriptions.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Prescription history
            </Typography>
            <Stack spacing={2}>
              {allPrescriptions.map((rx) => (
                <Box key={rx.id}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                    {dayjs(rx.prescribed_at ?? rx.visit_time ?? rx.payment?.paid_at).format(
                      "D MMM YYYY, HH:mm",
                    )}
                    {" · "}
                    {rx.source_label}
                  </Typography>
                  <PrescriptionSummaryBlock prescription={rx} compact />
                </Box>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
