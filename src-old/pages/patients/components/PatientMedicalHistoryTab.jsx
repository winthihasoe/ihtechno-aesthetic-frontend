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
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import {
  getPatientMedicalHistory,
  savePatientMedicalHistory,
} from "../../../services/patientService";
import { resolveApiError } from "../../../services/apiClient";
import PrescriptionSummaryBlock from "../../../components/prescription/PrescriptionSummaryBlock";
import PatientTabEmptyState from "./PatientTabEmptyState";
import { getPatientPrescriptions } from "../../../services/prescriptionService";
import { getPayments } from "../../../services/paymentService";
import { normalizePaymentLines } from "../../../utils/paymentDetailUtils";

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
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [invoicePrescriptionSignals, setInvoicePrescriptionSignals] = useState([]);
  const [invoiceSignalError, setInvoiceSignalError] = useState("");

  const loadClinical = useCallback(async () => {
    if (!patientId) return;
    setLoadingClinical(true);
    setClinicalError("");
    try {
      const data = await getPatientMedicalHistory(patientId);
      setClinicalForm(mapApiToForm(data));
    } catch (err) {
      setClinicalError(resolveApiError(err, "Could not load clinical medical history."));
    } finally {
      setLoadingClinical(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadClinical();
  }, [loadClinical]);

  const loadPatientPrescriptions = useCallback(async () => {
    if (!patientId) return;
    setLoadingPrescriptions(true);
    setPrescriptionError("");
    try {
      const data = await getPatientPrescriptions(patientId);
      setPatientPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setPrescriptionError(resolveApiError(err, "Could not load prescription history."));
      setPatientPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientPrescriptions();
  }, [loadPatientPrescriptions]);

  const loadInvoicePrescriptionSignals = useCallback(async () => {
    if (!patientId || !patient?.name) return;
    setInvoiceSignalError("");
    try {
      const payments = await getPayments({ patient_query: String(patient.name).trim() });
      const paymentRows = Array.isArray(payments) ? payments : [];
      const narrowed = paymentRows.filter((payment) => {
        const directPatientId = payment?.patient?.id;
        const visitPatientId = payment?.visit?.patient?.id;
        if (directPatientId != null || visitPatientId != null) {
          return String(directPatientId ?? visitPatientId) === String(patientId);
        }
        const customerName = String(
          payment?.customer_name ?? payment?.patient?.name ?? payment?.visit?.patient?.name ?? "",
        ).trim();
        return customerName !== "" && customerName === String(patient.name).trim();
      });

      const signals = narrowed.flatMap((payment) => {
        const lines = normalizePaymentLines(payment?.items);
        const prescriptionLines = lines.filter((line) => line?.type === "prescription");
        if (!prescriptionLines.length) return [];
        return prescriptionLines.map((line, index) => ({
          payment_id: payment.id,
          invoice_number: payment.invoice_number ?? null,
          payment_status: payment.status ?? null,
          paid_at: payment.paid_at ?? null,
          line_label: line.label || "Prescription line",
          line_meta_prescription_id:
            line?.meta?.prescription_id ?? line?.prescription_id ?? null,
          line_index: index,
        }));
      });
      setInvoicePrescriptionSignals(signals);
    } catch (err) {
      setInvoiceSignalError(resolveApiError(err, "Could not verify invoice prescription lines."));
      setInvoicePrescriptionSignals([]);
    }
  }, [patient?.name, patientId]);

  useEffect(() => {
    loadInvoicePrescriptionSignals();
  }, [loadInvoicePrescriptionSignals]);

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
      setClinicalError(resolveApiError(err, "Unable to save clinical medical history."));
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
      visit_id: rx.visit_id ?? visit.id,
    })),
  );

  const cashierPrescriptions = (
    patient?.paid_standalone_prescriptions ??
    patient?.paidStandalonePrescriptions ??
    []
  ).map((rx) => ({ ...rx }));

  const allPrescriptions = [...patientPrescriptions, ...visitPrescriptions, ...cashierPrescriptions]
    .filter(Boolean)
    .reduce((acc, rx) => {
      const key =
        rx.id != null
          ? `id:${rx.id}`
          : `fallback:${rx.visit_id ?? rx.visit?.id ?? "visitless"}:${
              rx.payment?.invoice_number ?? rx.invoice_number ?? "no-invoice"
            }:${rx.created_at ?? rx.prescribed_at ?? ""}`;
      if (acc.seen.has(key)) return acc;
      acc.seen.add(key);
      acc.rows.push(rx);
      return acc;
    }, { seen: new Set(), rows: [] }).rows
    .map((rx) => {
      const visitId = rx.visit_id ?? rx.visit?.id ?? null;
      const invoiceNumber = rx.payment?.invoice_number ?? rx.invoice_number ?? null;
      const hasConsultation = Boolean(rx.consultation_id ?? rx.consultation?.id);
      const sourceLabel = invoiceNumber
        ? `Invoice ${invoiceNumber}`
        : visitId
          ? `Visit #${visitId}${hasConsultation ? " · Consultation" : ""}`
          : "Treatment room / cashier";

      return {
        ...rx,
        source_label: sourceLabel,
      };
    })
    .sort((a, b) => {
      const ta = dayjs(
        a.prescribed_at ??
          a.visit_time ??
          a.payment?.paid_at ??
          a.created_at ??
          a.updated_at,
      ).valueOf();
      const tb = dayjs(
        b.prescribed_at ??
          b.visit_time ??
          b.payment?.paid_at ??
          b.created_at ??
          b.updated_at,
      ).valueOf();
      return tb - ta;
    });

  const linkedPrescriptionIds = new Set(
    allPrescriptions
      .map((rx) => (rx.id != null ? String(rx.id) : ""))
      .filter(Boolean),
  );
  const unmatchedInvoicePrescriptionSignals = invoicePrescriptionSignals.filter((signal) => {
    if (signal.line_meta_prescription_id == null) return true;
    return !linkedPrescriptionIds.has(String(signal.line_meta_prescription_id));
  });

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Clinical medical history
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          EMR record (allergies, medications, chronic conditions). Matching answers from the intake
          questionnaire are copied here when the patient is registered; you can edit this summary before
          consultation.
        </Typography>
        {showEmptyWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Clinical medical history is empty. Please complete it before consultation.
          </Alert>
        )}
        {clinicalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {clinicalError}
          </Alert>
        )}
        {loadingClinical ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <LoadingIndicator size={24} />
          </Box>
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
              label="Skin conditions"
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
              label="Past aesthetic history"
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
          <PatientTabEmptyState
            title="No intake questionnaire submitted yet"
            description="Patient intake answers will appear here and help prefill clinical context for consultation."
            steps={[
              "Send or open intake form for this patient.",
              "Patient submits the questionnaire.",
              "Review and confirm data in this tab before treatment.",
            ]}
            previewFields={["Identity", "Treatment request", "Medical history", "Consent"]}
          />
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

      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Prescription history
        </Typography>
        {prescriptionError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {prescriptionError}
          </Alert>
        )}
        {invoiceSignalError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {invoiceSignalError}
          </Alert>
        )}
        {!invoiceSignalError && unmatchedInvoicePrescriptionSignals.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Found {unmatchedInvoicePrescriptionSignals.length} invoice prescription line(s) without linked
            prescription EMR record. Please review consultation/treatment-room prescription linkage for:
            {" "}
            {Array.from(
              new Set(
                unmatchedInvoicePrescriptionSignals.map(
                  (signal) => signal.invoice_number || `payment#${signal.payment_id}`,
                ),
              ),
            ).join(", ")}
            .
          </Alert>
        )}
        {loadingPrescriptions && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1.5, mb: 1.5 }}>
            <LoadingIndicator size={24} />
          </Box>
        )}
        {!loadingPrescriptions && allPrescriptions.length === 0 ? (
          <PatientTabEmptyState
            title="No prescription records yet"
            description="Prescriptions from consultation, treatment-room follow-up, and paid invoice flows will be listed here."
            steps={[
              "Create prescription from consultation or treatment room.",
              "Complete invoice/payment for cashier prescriptions when needed.",
              "Refresh patient detail to review full medication history.",
            ]}
            previewFields={["Medicine", "Dosage", "Duration", "Route", "Source"]}
          />
        ) : (
          <Stack spacing={2}>
            {allPrescriptions.map((rx, index) => (
              <Box key={rx.id ?? `rx-${index}`}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  {dayjs(
                    rx.prescribed_at ??
                      rx.visit_time ??
                      rx.payment?.paid_at ??
                      rx.created_at,
                  ).isValid()
                    ? dayjs(
                        rx.prescribed_at ??
                          rx.visit_time ??
                          rx.payment?.paid_at ??
                          rx.created_at,
                      ).format("D MMM YYYY, HH:mm")
                    : "-"}
                  {" · "}
                  {rx.source_label}
                </Typography>
                <PrescriptionSummaryBlock prescription={rx} compact />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
