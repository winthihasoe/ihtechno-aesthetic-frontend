import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import SaveIcon from "@mui/icons-material/Save";
import DynamicFormRenderer from "../common/DynamicFormRenderer";
import { resolveApiError } from "../../services/apiClient";
import {
  createTreatment,
  deleteTreatment,
} from "../../services/treatmentService";
import { getActiveTreatmentTemplates } from "../../services/treatmentTemplateService";
import useToastStore from "../../stores/toastStore";
import {
  getForm,
  getForms,
  getLatestVisitFormResponses,
  submitResponse,
  updateResponse,
} from "../../services/formService";
import useConfirmStore from "../../stores/confirmStore";
import useAuthStore from "../../stores/authStore";
import useLiveBoardStore from "../../stores/liveBoardStore";
import { formatKyats } from "../../utils/formatKyats";
import { getPhotos } from "../../services/photoService";
import LiveBoardStagePhotoStrip from "./LiveBoardStagePhotoStrip";

const DEFAULT_FORM = {
  chief_complaint: "",
  doctor_note: "",
  vital_sign_bp: "",
  vital_sign_pulse: "",
  vital_sign_temp: "",
  vital_sign_spo2: "",
  examination_note: "",
  treatment_plan_notes: "",
  session_fee_enabled: true,
  session_fee_amount: "25000",
  session_discount_percent: 0,
  session_fee_foc: false,
};

function formatPlanPrice(amount) {
  if (amount == null || amount === "") return "—";
  return formatKyats(amount);
}

function resolvePrimaryRoleLabel(user) {
  if (!user) return "";
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0]?.name || user.roles[0]?.slug || "";
  }
  return user.role || "";
}

function prettifyFieldName(name = "") {
  return String(name || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function hasFieldValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export default function ConsultingPanel({
  visit,
  consultation,
  visitTreatments = [],
  onVisitTreatmentsChange,
  onSave,
  saving = false,
  saveError = "",
  onUnsavedChange,
  onCheckoutFromConsultation,
  checkoutLoading = false,
}) {
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formDirty, setFormDirty] = useState(false);
  const [skipTreatmentRoom, setSkipTreatmentRoom] = useState(false);

  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [activeForms, setActiveForms] = useState([]);
  const [savedFormResponses, setSavedFormResponses] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedFormFields, setSelectedFormFields] = useState([]);
  const [selectedFormName, setSelectedFormName] = useState("");
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [questionnaireData, setQuestionnaireData] = useState({});
  const [questionnaireSaving, setQuestionnaireSaving] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState("");
  const [questionnaireSuccess, setQuestionnaireSuccess] = useState("");
  const [questionnaireFieldErrors, setQuestionnaireFieldErrors] = useState({});
  const [questionnaireSubmitErrorSummary, setQuestionnaireSubmitErrorSummary] =
    useState("");
  const [questionnaireDirty, setQuestionnaireDirty] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customTreatmentName, setCustomTreatmentName] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [photoRows, setPhotoRows] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const updateVisitInBoard = useLiveBoardStore((s) => s.updateVisit);

  const mergedVisitPhotos = useMemo(() => {
    const m = new Map();
    [...(visit?.photos ?? []), ...photoRows].forEach((p) => {
      if (p?.id != null) {
        m.set(p.id, p);
      }
    });
    return Array.from(m.values()).sort((a, b) => Number(b.id) - Number(a.id));
  }, [visit?.photos, photoRows]);

  const plannedTreatments = useMemo(
    () => (visitTreatments || []).filter((t) => t.status === "planned"),
    [visitTreatments],
  );

  const followUpLabel = useMemo(() => {
    if (visit?.follow_up === true) return "Yes";
    if (visit?.follow_up === false) return "No";
    return "—";
  }, [visit?.follow_up]);

  useEffect(() => {
    setForm({
      chief_complaint: consultation?.chief_complaint ?? "",
      doctor_note:
        consultation?.doctor_note ??
        consultation?.assessment_notes ??
        consultation?.summary ??
        consultation?.notes ??
        "",
      vital_sign_bp: consultation?.vital_sign_bp ?? "",
      vital_sign_pulse: consultation?.vital_sign_pulse ?? "",
      vital_sign_temp: consultation?.vital_sign_temp ?? "",
      vital_sign_spo2: consultation?.vital_sign_spo2 ?? "",
      examination_note: consultation?.examination_note ?? "",
      treatment_plan_notes: consultation?.notes ?? "",
      session_fee_enabled: consultation?.session_fee_enabled ?? true,
      session_fee_amount:
        consultation?.session_fee_amount != null
          ? String(consultation.session_fee_amount)
          : "25000",
      session_discount_percent: Number(
        consultation?.session_discount_percent ?? 0,
      ),
      session_fee_foc: consultation?.session_fee_foc ?? false,
    });
    setFeeError("");
    setFormDirty(false);
  }, [consultation]);

  useEffect(() => {
    onUnsavedChange?.(formDirty || questionnaireDirty);
  }, [formDirty, questionnaireDirty, onUnsavedChange]);

  useEffect(() => {
    if (visit?.status !== "consulting") {
      setSkipTreatmentRoom(false);
    }
  }, [visit?.status]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const list = await getActiveTreatmentTemplates();
        if (!cancelled) setTemplates(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  const loadVisitFormResponses = useCallback(async () => {
    if (!visit?.id) return;
    try {
      const rows = await getLatestVisitFormResponses(visit.id);
      setSavedFormResponses(rows);
      if (rows.length > 0) {
        setActiveForms((prev) => {
          const byId = new Map((prev || []).map((f) => [String(f.id), f]));
          rows.forEach((row) => {
            byId.set(String(row.form_id), {
              id: row.form_id,
              name: row.form_name,
              form_type: row.form_type,
              is_active: true,
            });
          });
          return Array.from(byId.values());
        });
      }
    } catch {
      setSavedFormResponses([]);
    }
  }, [visit?.id]);

  useEffect(() => {
    loadVisitFormResponses();
  }, [loadVisitFormResponses]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      setPhotosLoading(true);
      try {
        const rows = await getPhotos(visit.id);
        if (!cancelled) setPhotoRows(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setPhotoRows([]);
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  const handleChange = (key) => (e) => {
    const nextValue = e.target.value;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
    setFormDirty(true);
  };

  const validateConsultation = () => {
    if (
      form.session_fee_enabled &&
      String(form.session_fee_amount ?? "").trim() === ""
    ) {
      setFeeError("Consulting fee is required. Please enter an amount.");
      return false;
    }
    setFeeError("");
    return true;
  };

  const normalizedPayload = {
    ...form,
    session_fee_amount:
      String(form.session_fee_amount ?? "").trim() === ""
        ? null
        : Number(form.session_fee_amount),
  };

  const handleSave = async () => {
    if (!validateConsultation()) return;
    const ok = await onSave?.(normalizedPayload);
    if (ok !== false) setFormDirty(false);
  };

  const handleCheckout = async () => {
    if (!onCheckoutFromConsultation) return;
    if (!validateConsultation()) return;
    const ok = await onSave?.(normalizedPayload);
    if (ok === false) return;
    await onCheckoutFromConsultation();
  };

  const openQuestionnaires = async () => {
    setQuestionnaireOpen(true);
    setQuestionnaireLoading(true);
    setQuestionnaireError("");
    setQuestionnaireSuccess("");
    setQuestionnaireFieldErrors({});
    setQuestionnaireSubmitErrorSummary("");
    setSelectedFormId("");
    setSelectedFormFields([]);
    setSelectedFormName("");
    setEditingResponseId(null);
    setQuestionnaireData({});
    setQuestionnaireDirty(false);
    try {
      const [forms, rows] = await Promise.all([
        getForms(),
        getLatestVisitFormResponses(visit?.id),
      ]);
      setSavedFormResponses(rows);
      const activeRows = (forms || []).filter(
        (f) =>
          f.is_active &&
          (f.form_type === "questionnaire" || f.form_type === "consent"),
      );
      setActiveForms(activeRows);
    } catch (err) {
      setQuestionnaireError(resolveApiError(err, "Failed to load forms."));
    } finally {
      setQuestionnaireLoading(false);
    }
  };

  const handleSelectForm = async (formId) => {
    setSelectedFormId(formId);
    setSelectedFormFields([]);
    setQuestionnaireData({});
    setQuestionnaireDirty(false);
    setQuestionnaireError("");
    setQuestionnaireSuccess("");
    setQuestionnaireFieldErrors({});
    setQuestionnaireSubmitErrorSummary("");
    setEditingResponseId(null);
    if (!formId) return;

    setQuestionnaireLoading(true);
    try {
      const response = await getForm(formId);
      setSelectedFormName(response?.form?.name ?? "Questionnaire");
      const fields = response?.fields ?? [];
      setSelectedFormFields(fields);
      const saved = savedFormResponses.find(
        (row) => String(row.form_id) === String(formId),
      );
      const existingData = saved?.data ?? {};
      if (saved?.id) setEditingResponseId(saved.id);
      const defaults = {};
      if (fields.some((f) => f.name === "explained_by")) {
        defaults.explained_by = user?.name ?? "";
      }
      if (fields.some((f) => f.name === "explainer_role")) {
        defaults.explainer_role = resolvePrimaryRoleLabel(user);
      }
      if (fields.some((f) => f.name === "consent_date")) {
        defaults.consent_date = new Date().toISOString().slice(0, 10);
      }
      setQuestionnaireData({ ...defaults, ...existingData });
    } catch (err) {
      setQuestionnaireError(
        resolveApiError(err, "Failed to load selected form."),
      );
    } finally {
      setQuestionnaireLoading(false);
    }
  };

  const handleSubmitQuestionnaire = async () => {
    if (!selectedFormId) return;
    const nextFieldErrors = {};
    selectedFormFields.forEach((field) => {
      if (!field?.required) return;
      const value = questionnaireData?.[field.name];
      if (hasFieldValue(value)) return;
      const label = field?.label?.trim() || prettifyFieldName(field?.name);
      nextFieldErrors[field.name] = `${label} is required.`;
    });
    if (Object.keys(nextFieldErrors).length > 0) {
      setQuestionnaireFieldErrors(nextFieldErrors);
      setQuestionnaireSubmitErrorSummary(
        "Please complete the required fields highlighted in red.",
      );
      return;
    }

    setQuestionnaireSaving(true);
    setQuestionnaireError("");
    setQuestionnaireSubmitErrorSummary("");
    try {
      const payload = {
        patient_id: visit?.patient_id ?? visit?.patient?.id ?? null,
        visit_id: visit?.id ?? null,
        data: questionnaireData,
      };
      let savedResponse = null;
      if (editingResponseId) {
        savedResponse = await updateResponse(editingResponseId, payload);
      } else {
        savedResponse = await submitResponse(selectedFormId, payload);
      }
      setQuestionnaireSuccess("Questionnaire response saved.");
      if (savedResponse?.id) {
        setEditingResponseId(savedResponse.id);
      }
      await loadVisitFormResponses();
      setQuestionnaireDirty(false);
      setQuestionnaireOpen(false);
    } catch (err) {
      setQuestionnaireError(
        resolveApiError(err, "Failed to save questionnaire response."),
      );
      setQuestionnaireSubmitErrorSummary(
        resolveApiError(err, "Failed to save questionnaire response."),
      );
    } finally {
      setQuestionnaireSaving(false);
    }
  };

  const refreshVisitTreatments = () => {
    onVisitTreatmentsChange?.();
  };

  const handleAddTemplateToPlan = async () => {
    if (!visit?.id || !selectedTemplateId) return;
    const template = templates.find(
      (t) => String(t.id) === String(selectedTemplateId),
    );
    if (!template) return;
    setPlanBusy(true);
    setPlanError("");
    try {
      await createTreatment(visit.id, {
        status: "planned",
        treatment_template_id: template.id,
        name: template.name,
      });
      setSelectedTemplateId("");
      pushToast({
        message: "Preset added to the treatment plan.",
        severity: "success",
      });
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add preset to the plan."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleAddCustomToPlan = async () => {
    const trimmed = customTreatmentName.trim();
    if (!visit?.id || !trimmed) return;
    setPlanBusy(true);
    setPlanError("");
    try {
      await createTreatment(visit.id, {
        status: "planned",
        name: trimmed,
      });
      pushToast({
        message: "Custom treatment added to the plan.",
        severity: "success",
      });
      setCustomTreatmentName("");
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add custom treatment."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRemovePlanned = async (treatmentId) => {
    setPlanBusy(true);
    setPlanError("");
    try {
      await deleteTreatment(treatmentId);
      pushToast({ message: "Removed from plan.", severity: "success" });
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not remove this line."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleQuestionnaireClose = async (_, reason) => {
    if (
      (reason === "backdropClick" || reason === "escapeKeyDown") &&
      questionnaireDirty
    ) {
      const approved = await askConfirm({
        title: "Discard questionnaire changes?",
        message:
          "You have unsaved questionnaire answers. Close and lose changes?",
        confirmText: "Discard",
        cancelText: "Keep editing",
      });
      if (!approved) return;
    }
    setQuestionnaireOpen(false);
    setQuestionnaireDirty(false);
  };

  const checkinComplaint = visit?.notes || "—";
  const medicalHistory =
    visit?.patient?.medical_history ?? visit?.patient?.medicalHistory ?? {};
  const hasMedicalHistory = Object.values(medicalHistory || {}).some(Boolean);
  const sessionDiscount = Number(form.session_discount_percent || 0);
  const sessionFeeBase = Number(form.session_fee_amount || 0);
  const sessionFeeFinal = form.session_fee_foc
    ? 0
    : Math.max(0, Math.round(sessionFeeBase * (1 - sessionDiscount / 100)));

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
          Consulting Session
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5 }}
        >
          Follow Up: {followUpLabel}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Check-in Complaint:</strong> {checkinComplaint}
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
            Medical History (Brief)
          </Typography>
          {!hasMedicalHistory ? (
            <Typography variant="caption" color="text.secondary">
              No medical history provided.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="caption">
                Allergy: {medicalHistory?.allergies || "—"}
              </Typography>
              <Typography variant="caption">
                Current Medications:{" "}
                {medicalHistory?.current_medications || "—"}
              </Typography>
              <Typography variant="caption">
                Chronic Diseases: {medicalHistory?.chronic_diseases || "—"}
              </Typography>
              <Typography variant="caption">
                Skin Conditions: {medicalHistory?.skin_conditions || "—"}
              </Typography>
            </Stack>
          )}
        </Paper>
        <Stack spacing={1.5}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Primary Concern</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.25 }}>
              {form.chief_complaint || "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">Doctor Notes</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {form.doctor_note || "—"}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Vital Signs
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Typography variant="body2"><strong>BP:</strong> {form.vital_sign_bp || "—"}</Typography>
              <Typography variant="body2"><strong>Pulse:</strong> {form.vital_sign_pulse || "—"}</Typography>
              <Typography variant="body2"><strong>Temp:</strong> {form.vital_sign_temp || "—"}</Typography>
              <Typography variant="body2"><strong>SpO2:</strong> {form.vital_sign_spo2 || "—"}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Examination Note
            </Typography>
            <Typography variant="body2">{form.examination_note || "—"}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Questionnaires & Consents
            </Typography>
            {savedFormResponses.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No questionnaire/consent saved for this visit yet.
              </Typography>
            ) : (
              <List dense disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                {savedFormResponses.map((row) => (
                  <ListItem key={row.id} divider>
                    <ListItemText
                      primary={row.form_name || "Form"}
                      secondary={`Saved: ${new Date(
                        row.updated_at ?? row.created_at ?? Date.now(),
                      ).toLocaleString()}`}
                      primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: "caption" }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
              Treatment Plan
            </Typography>
            {plannedTreatments.length > 0 ? (
              <List
                dense
                disablePadding
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                {plannedTreatments.map((t) => {
                  const tmpl = t.treatment_template ?? t.treatmentTemplate;
                  const duration =
                    tmpl?.duration_minutes != null ? `${tmpl.duration_minutes} min` : "—";
                  const price = formatPlanPrice(tmpl?.price ?? null);
                  return (
                    <ListItem key={t.id} divider sx={{ py: 0.75 }}>
                      <ListItemText
                        primary={t.name || "Procedure"}
                        secondary={`Duration: ${duration} · Price: ${price}`}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No planned procedures in this visit.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Treatment Plan Notes
            </Typography>
            <Typography variant="body2">{form.treatment_plan_notes || "—"}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Visit photos
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Label each shot (body area, optional left/right), then upload before or after. When you
              move to pre-treatment or treatment, earlier photos appear as reference so the team avoids
              duplicate intake.
            </Typography>
            {photosLoading ? (
              <Typography variant="caption" color="text.secondary">
                Loading photos…
              </Typography>
            ) : (
              <LiveBoardStagePhotoStrip
                visitId={visit?.id}
                stage="consultation"
                photos={mergedVisitPhotos}
                disabled={saving}
                onPhotoUploaded={(uploaded) => {
                  setPhotoRows((prev) => [uploaded, ...prev]);
                  updateVisitInBoard({
                    ...visit,
                    photos: [uploaded, ...(visit.photos ?? [])],
                  });
                }}
              />
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Consulting Fee
            </Typography>
            <Typography variant="body2">
              <strong>Apply fee:</strong> {form.session_fee_enabled ? "Yes" : "No"}
            </Typography>
            <Typography variant="body2">
              <strong>Fee amount:</strong> {formatKyats(Number(form.session_fee_amount || 0))}
            </Typography>
            <Typography variant="body2">
              <strong>Discount %:</strong> {Number(form.session_discount_percent || 0)}
            </Typography>
            <Typography variant="body2">
              <strong>FOC:</strong> {form.session_fee_foc ? "Yes" : "No"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Final consulting fee: {formatKyats(sessionFeeFinal)}
            </Typography>
          </Paper>
        </Stack>

        {saveError && <Alert severity="error" sx={{ mt: 1.5 }}>{saveError}</Alert>}
      </Paper>

      <Dialog
        open={questionnaireOpen}
        onClose={handleQuestionnaireClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Consultation Questionnaires</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Choose Active Form</InputLabel>
              <Select
                label="Choose Active Form"
                value={selectedFormId}
                onChange={(e) => handleSelectForm(e.target.value)}
                disabled={questionnaireLoading}
              >
                {activeForms.map((f) => (
                  <MenuItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {questionnaireLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            )}
            {questionnaireError && (
              <Alert severity="error">{questionnaireError}</Alert>
            )}
            {questionnaireSuccess && (
              <Alert severity="success">{questionnaireSuccess}</Alert>
            )}
            {!questionnaireLoading &&
              selectedFormId &&
              selectedFormFields.length === 0 && (
                <Alert severity="warning">Selected form has no fields.</Alert>
              )}
            {selectedFormFields.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {selectedFormName}
                </Typography>
                <DynamicFormRenderer
                  fields={selectedFormFields}
                  formData={questionnaireData}
                  errors={questionnaireFieldErrors}
                  forceReadonlyRichText
                  onChange={(name, value) => {
                    setQuestionnaireData((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                    setQuestionnaireFieldErrors((prev) => {
                      if (!prev[name]) return prev;
                      const next = { ...prev };
                      delete next[name];
                      return next;
                    });
                    setQuestionnaireSubmitErrorSummary((prev) =>
                      prev ? "" : prev,
                    );
                    setQuestionnaireDirty(true);
                  }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {questionnaireSubmitErrorSummary && (
            <Alert severity="error" sx={{ mr: "auto", py: 0 }}>
              {questionnaireSubmitErrorSummary}
            </Alert>
          )}
          <Button onClick={(e) => handleQuestionnaireClose(e, "escapeKeyDown")}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitQuestionnaire}
            disabled={
              questionnaireSaving ||
              !selectedFormId ||
              selectedFormFields.length === 0
            }
          >
            {questionnaireSaving ? "Saving..." : "Save Response"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
