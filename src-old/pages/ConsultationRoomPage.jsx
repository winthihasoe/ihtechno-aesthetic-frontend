import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  IconButton,
  Container,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import { resolveApiError } from "../services/apiClient";
import * as visitService from "../services/visitService";
import * as consultationService from "../services/consultationService";
import * as consentService from "../services/consentService";
import {
  createTreatment,
  deleteTreatment,
  listVisitTreatments,
} from "../services/treatmentService";
import {
  getPatient,
  getPatientMedicalHistory,
} from "../services/patientService";
import { getPatientPackages } from "../services/packageService";
import { getPhotos } from "../services/photoService";
import {
  getActiveTreatmentTemplates,
  getTreatmentTemplateRequiredForms,
} from "../services/treatmentTemplateService";
import DynamicFormRenderer from "../components/common/DynamicFormRenderer";
import TreatmentStockWarningAlert from "../components/LiveBoard/TreatmentStockWarningAlert";
import {
  formatStockWarningSummary,
  getTreatmentStockWarnings,
} from "../utils/treatmentStockWarnings";
import {
  getForm,
  getForms,
  getLatestVisitFormResponses,
  submitResponse,
  updateResponse,
  deleteResponse,
} from "../services/formService";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import useToastStore from "../stores/toastStore";
import { getUserLiveBoardPath } from "../utils/workspaceRoutes";
import LiveBoardStagePhotoStrip from "../components/LiveBoard/LiveBoardStagePhotoStrip";
import VisitAppointmentNote from "../components/visits/VisitAppointmentNote";
import { formatKyats } from "../utils/formatKyats";
import { getProductPickerOptions } from "../services/productPickerService";
import ConsultationFeeSection from "./consultation-room/components/ConsultationFeeSection";
import {
  hydrateConsultationFeeApplyFlag,
  serializeConsultationFeeFlags,
} from "../utils/consultationFeeUtils";
import ConsultationPrescriptionSection from "./consultation-room/components/ConsultationPrescriptionSection";
import ConsultationRoomHeader from "./consultation-room/components/ConsultationRoomHeader";
import { SectionTitle } from "./consultation-room/components/ConsultationSectionCard";
import { sectionCardSx } from "./consultation-room/components/consultationSectionStyles";
import VitalSigns from "../components/consultation/VitalSigns";
import TabbedPanel from "../components/common/TabbedPanel";
import PatientConsultationTab from "./patients/components/PatientConsultationTab";
import PatientTreatmentHistoryTab from "./patients/components/PatientTreatmentHistoryTab";
import ConsultationAdditionalNotesTab from "./consultation-room/components/ConsultationAdditionalNotesTab";
import PatientMedicalHistoryTab from "./patients/components/PatientMedicalHistoryTab";
import LabeledTextField from "../components/common/LabeledTextField";
import { formatFeeInput } from "../utils/formatFeeInput";
import LoadingIndicator from "../components/common/LoadingIndicator";

const EMPTY_FORM = {
  chief_complaint: "",
  doctor_note: "",
  diagnosis_primary: "",
  diagnosis_secondary: "",
  skin_type: "normal",
  fitzpatrick: "3",
  is_pregnant: false,
  has_active_infection: false,
  allergies: "",
  medications: "",
  follow_up_date: "",
  follow_up_purpose: "next_session",
  follow_up_note: "",
  vital_sign_bp: "",
  vital_sign_pulse: "",
  vital_sign_temp: "",
  vital_sign_spo2: "",
  examination_note: "",
  session_fee_enabled: true,
  session_fee_amount: "",
  session_discount_percent: 0,
  notes: "",
};

const fieldGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 1.25,
};

const QUESTIONNAIRE_FORM_CODE = "aesthetic_health_information_mm";

const QUESTIONNAIRE_REFERENCE_FIELDS = [
  ["pregnant", "Pregnant"],
  ["breastfeeding", "Breastfeeding"],
  ["requested_treatment", "Requested treatment"],
  ["interested_treatment", "Interested treatment"],
  ["current_skincare", "Current skincare"],
  ["current_medical_treatment", "Current medical treatment / medications"],
  ["surgery_history", "Surgery history"],
  ["allergies", "Allergies"],
  ["lidocaine_allergy", "Lidocaine allergy"],
  ["recent_herpes_outbreak", "Recent herpes outbreak"],
  ["underlying_conditions", "Underlying conditions"],
  ["how_did_you_hear", "How patient found us"],
  ["referral_name", "Referral name"],
];

function formatReferenceValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatPlanPrice(amount) {
  if (amount == null || amount === "") return "—";
  return formatKyats(amount);
}

function getQuestionnaireCode(response) {
  return (
    response?.form?.definition?.code ??
    response?.form_definition?.code ??
    response?.form?.code ??
    ""
  );
}

function responseTimestamp(response) {
  return dayjs(response?.updated_at ?? response?.created_at).valueOf() || 0;
}

function readFirstResponseValue(data, keys) {
  for (const key of keys) {
    if (
      data?.[key] !== undefined &&
      data?.[key] !== null &&
      data?.[key] !== ""
    ) {
      return data[key];
    }
  }
  return undefined;
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

function yesNoLikeToBool(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  const normalized = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "pregnant"].includes(normalized)) return true;
  if (["no", "n", "false", "none", "not pregnant"].includes(normalized)) {
    return false;
  }
  return null;
}

export default function ConsultationRoomPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { pushToast } = useToastStore();
  const liveBoardPath = getUserLiveBoardPath(user);
  const defaultConsultationFee = formatFeeInput(settings.default_consultation_fee ?? 25000);
  const idNum = visitId != null ? Number(visitId) : NaN;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visit, setVisit] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [patientPackages, setPatientPackages] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [visitTreatments, setVisitTreatments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customTreatmentName, setCustomTreatmentName] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const [activeForms, setActiveForms] = useState([]);
  const [savedFormResponses, setSavedFormResponses] = useState([]);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedFormFields, setSelectedFormFields] = useState([]);
  const [selectedFormName, setSelectedFormName] = useState("");
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [questionnaireData, setQuestionnaireData] = useState({});
  const [questionnaireDirty, setQuestionnaireDirty] = useState(false);
  const [questionnaireDraftsByFormId, setQuestionnaireDraftsByFormId] =
    useState({});
  const [
    questionnaireFieldErrorsByFormId,
    setQuestionnaireFieldErrorsByFormId,
  ] = useState({});
  const [selectedQuestionnaireFormIds, setSelectedQuestionnaireFormIds] =
    useState([]);
  const [expandedQuestionnaireFormId, setExpandedQuestionnaireFormId] =
    useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [photoDialog, setPhotoDialog] = useState(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);

  // Prescription state
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [gfeStatus, setGfeStatus] = useState(null);
  const [gfeBusy, setGfeBusy] = useState(false);

  const isLocked = Boolean(consultation?.locked_at);

  useEffect(() => {
    if (!Number.isFinite(idNum)) {
      setError("Invalid visit.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [v, c, p, gfe] = await Promise.all([
          visitService.getVisit(idNum),
          consultationService.getConsultation(idNum),
          getPhotos(idNum),
          consentService.getGfeStatus(idNum).catch(() => null),
        ]);
        if (cancelled) return;
        setVisit(v);
        setConsultation(c ?? null);
        setGfeStatus(gfe);
        setPhotos(Array.isArray(p) ? p : []);
        const patientId = v?.patient_id ?? v?.patient?.id ?? null;
        if (patientId) {
          try {
            const [pDetail, mHistory, pPackages] = await Promise.all([
              getPatient(patientId),
              getPatientMedicalHistory(patientId).catch(() => null),
              getPatientPackages(patientId).catch(() => []),
            ]);
            if (!cancelled) {
              setPatientDetail(pDetail);
              setMedicalHistory(mHistory);
              setPatientPackages(Array.isArray(pPackages) ? pPackages : []);
            }
          } catch {
            if (!cancelled) {
              setPatientDetail(null);
              setMedicalHistory(null);
              setPatientPackages([]);
            }
          }
        } else if (!cancelled) {
          setPatientDetail(null);
          setMedicalHistory(null);
          setPatientPackages([]);
        }
        try {
          const [tList, tpl, prodOpts] = await Promise.all([
            listVisitTreatments(idNum).catch(() => []),
            getActiveTreatmentTemplates().catch(() => []),
            getProductPickerOptions().catch(() => []),
          ]);
          if (!cancelled) {
            setVisitTreatments(Array.isArray(tList) ? tList : []);
            setTemplates(Array.isArray(tpl) ? tpl : []);
            setProductOptions(Array.isArray(prodOpts) ? prodOpts : []);
          }
        } catch {
          if (!cancelled) {
            setVisitTreatments([]);
            setTemplates([]);
            setProductOptions([]);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(resolveApiError(err, "Could not load consultation room."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idNum]);

  useEffect(() => {
    if (!consultation) {
      setForm({ ...EMPTY_FORM, session_fee_amount: defaultConsultationFee });
      setHasUnsavedChanges(false);
      return;
    }
    setForm({
      chief_complaint: consultation.chief_complaint ?? "",
      doctor_note:
        consultation.doctor_note ?? consultation.assessment_notes ?? "",
      diagnosis_primary: consultation.diagnosis_structured?.primary ?? "",
      diagnosis_secondary: (
        consultation.diagnosis_structured?.secondary ?? []
      ).join(", "),
      skin_type: consultation.condition_snapshot?.skin_type ?? "",
      fitzpatrick: consultation.condition_snapshot?.fitzpatrick ?? "",
      is_pregnant: Boolean(consultation.risk_flags?.is_pregnant),
      has_active_infection: Boolean(
        consultation.risk_flags?.has_active_infection,
      ),
      allergies: (consultation.risk_flags?.allergies ?? []).join(", "),
      medications: (consultation.risk_flags?.medications ?? []).join(", "),
      follow_up_date: consultation.next_follow_up?.date ?? "",
      follow_up_purpose: consultation.next_follow_up?.purpose ?? "",
      follow_up_note: consultation.next_follow_up?.note ?? "",
      vital_sign_bp: consultation.vital_sign_bp ?? "",
      vital_sign_pulse: consultation.vital_sign_pulse ?? "",
      vital_sign_temp: consultation.vital_sign_temp ?? "",
      vital_sign_spo2: consultation.vital_sign_spo2 ?? "",
      examination_note: consultation.examination_note ?? "",
      session_fee_enabled: hydrateConsultationFeeApplyFlag(consultation),
      session_fee_amount:
        consultation.session_fee_amount != null
          ? formatFeeInput(consultation.session_fee_amount)
          : defaultConsultationFee,
      session_discount_percent: Number(
        consultation.session_discount_percent ?? 0,
      ),
      notes: consultation.notes ?? "",
    });

    // Hydrate prescription from consultation response
    if (consultation.prescription) {
      setPrescriptionId(consultation.prescription.id ?? null);
      setPrescriptionItems(
        (consultation.prescription.items || []).map((item) => ({
          id: item.id ?? null,
          product_id: item.product_id ?? null,
          medicine_name: item.medicine_name ?? "",
          strength: item.strength ?? "",
          dosage_form: item.dosage_form ?? "",
          route: item.route ?? "",
          frequency: item.frequency ?? "",
          duration: item.duration ?? "",
          quantity: item.quantity ?? "",
          unit: item.unit ?? "",
          special_instructions: item.special_instructions ?? "",
          unit_price: item.unit_price ?? "",
          is_dispensed: Boolean(item.is_dispensed),
          is_billable: Boolean(item.is_billable),
        })),
      );
      setPrescriptionNotes(consultation.prescription.notes ?? "");
    } else {
      setPrescriptionId(null);
      setPrescriptionItems([]);
      setPrescriptionNotes("");
    }

    setHasUnsavedChanges(false);
  }, [consultation, defaultConsultationFee]);

  const patientName = useMemo(
    () => visit?.patient?.full_name ?? visit?.patient?.name ?? "Patient",
    [visit?.patient],
  );

  const latestQuestionnaireResponse = useMemo(() => {
    const responses = [
      patientDetail?.questionnaireResponse,
      patientDetail?.questionnaire_response,
      ...(Array.isArray(patientDetail?.formResponses)
        ? patientDetail.formResponses
        : []),
    ].filter(Boolean);

    return (
      responses
        .filter(
          (response) =>
            getQuestionnaireCode(response) === QUESTIONNAIRE_FORM_CODE,
        )
        .sort((a, b) => responseTimestamp(b) - responseTimestamp(a))[0] ?? null
    );
  }, [patientDetail]);

  const questionnaireReferenceData = latestQuestionnaireResponse?.data ?? {};
  const questionnairePregnantValue = readFirstResponseValue(
    questionnaireReferenceData,
    ["pregnant", "pregnant_or_planning", "pregnancy_status"],
  );
  const questionnairePregnantRisk = yesNoLikeToBool(questionnairePregnantValue);

  useEffect(() => {
    if (questionnairePregnantRisk === null) return;
    setForm((prev) => ({
      ...prev,
      is_pregnant: questionnairePregnantRisk,
    }));
  }, [questionnairePregnantRisk]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      setQuestionnaireLoading(true);
      setQuestionnaireError("");
      try {
        const [forms, rows] = await Promise.all([
          getForms(),
          getLatestVisitFormResponses(visit.id),
        ]);
        if (cancelled) return;
        const safeRows = Array.isArray(rows) ? rows : [];
        setSavedFormResponses(safeRows);
        setSelectedQuestionnaireFormIds(() =>
          safeRows
            .slice()
            .sort(
              (a, b) =>
                dayjs(b?.updated_at ?? b?.created_at).valueOf() -
                dayjs(a?.updated_at ?? a?.created_at).valueOf(),
            )
            .map((row) => String(row.form_id)),
        );
        setActiveForms(
          (forms || []).filter(
            (f) =>
              (f.is_usable ?? (f.is_active && f.published_version)) &&
              (f.form_type === "questionnaire" || f.form_type === "consent"),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setQuestionnaireError(resolveApiError(err, "Failed to load forms."));
          setSavedFormResponses([]);
          setActiveForms([]);
        }
      } finally {
        if (!cancelled) setQuestionnaireLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  const prioritizeQuestionnaireForm = (formId) => {
    const target = String(formId);
    setSelectedQuestionnaireFormIds((prev) => [
      target,
      ...prev.filter((id) => id !== target),
    ]);
  };

  const handleSelectQuestionnaireForm = async (formId) => {
    if (!formId) return;
    if (selectedFormId) {
      setQuestionnaireDraftsByFormId((prev) => ({
        ...prev,
        [String(selectedFormId)]: {
          data: questionnaireData,
          dirty: questionnaireDirty,
          editingResponseId,
          fields: selectedFormFields,
          name: selectedFormName,
        },
      }));
    }
    prioritizeQuestionnaireForm(formId);
    setExpandedQuestionnaireFormId(String(formId));
    setSelectedFormId(formId);
    setSelectedFormFields([]);
    setSelectedFormName("");
    setEditingResponseId(null);
    setQuestionnaireError("");
    setQuestionnaireData({});
    setQuestionnaireDirty(false);
    const existingDraft = questionnaireDraftsByFormId[String(formId)];
    if (existingDraft) {
      setSelectedFormFields(existingDraft.fields ?? []);
      setSelectedFormName(existingDraft.name ?? "Form");
      setEditingResponseId(existingDraft.editingResponseId ?? null);
      setQuestionnaireData(existingDraft.data ?? {});
      setQuestionnaireDirty(Boolean(existingDraft.dirty));
      return;
    }
    setQuestionnaireLoading(true);
    try {
      const response = await getForm(formId);
      const fields = response?.fields ?? [];
      const saved = savedFormResponses.find(
        (row) => String(row.form_id) === String(formId),
      );
      setSelectedFormFields(fields);
      setSelectedFormName(response?.form?.name ?? "Form");
      setEditingResponseId(saved?.id ?? null);
      setQuestionnaireData(saved?.data ?? {});
      setQuestionnaireFieldErrorsByFormId((prev) => ({
        ...prev,
        [String(formId)]: {},
      }));
    } catch (err) {
      setQuestionnaireError(
        resolveApiError(err, "Failed to load selected form."),
      );
    } finally {
      setQuestionnaireLoading(false);
    }
  };

  const handleRemoveQuestionnaireForm = async (formId) => {
    const target = String(formId);
    const confirm = window.confirm(
      "Delete this selected questionnaire/consent form response?",
    );
    if (!confirm) return;
    const responseRow = savedFormResponses.find(
      (row) => String(row.form_id) === target,
    );
    const responseId =
      responseRow?.id ?? questionnaireDraftsByFormId[target]?.editingResponseId;
    try {
      if (responseId) {
        await deleteResponse(responseId);
      }
      const rows = await getLatestVisitFormResponses(visit.id);
      setSavedFormResponses(Array.isArray(rows) ? rows : []);
      setSelectedQuestionnaireFormIds((prev) =>
        prev.filter((id) => String(id) !== target),
      );
      setQuestionnaireDraftsByFormId((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
      if (String(selectedFormId) === target) {
        setSelectedFormId("");
        setSelectedFormFields([]);
        setSelectedFormName("");
        setEditingResponseId(null);
        setQuestionnaireData({});
        setQuestionnaireDirty(false);
      }
      if (String(expandedQuestionnaireFormId) === target) {
        setExpandedQuestionnaireFormId("");
      }
      setHasUnsavedChanges(true);
      pushToast({ message: "Form removed.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not delete form response."),
        severity: "error",
      });
    }
  };

  const onField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setHasUnsavedChanges(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = (overrides = {}) => ({
    chief_complaint: form.chief_complaint,
    doctor_note: form.doctor_note,
    assessment_notes: form.doctor_note,
    summary: form.doctor_note || null,
    vital_sign_bp: form.vital_sign_bp || null,
    vital_sign_pulse: form.vital_sign_pulse || null,
    vital_sign_temp: form.vital_sign_temp || null,
    vital_sign_spo2: form.vital_sign_spo2 || null,
    examination_note: form.examination_note || null,
    ...serializeConsultationFeeFlags(form),
    session_fee_amount:
      String(form.session_fee_amount ?? "").trim() === ""
        ? null
        : Number(form.session_fee_amount),
    session_discount_percent: Number(form.session_discount_percent || 0),
    notes: form.notes,
    condition_snapshot: {
      skin_type: form.skin_type || null,
      fitzpatrick: form.fitzpatrick ? Number(form.fitzpatrick) : null,
      conditions: [],
    },
    risk_flags: {
      is_pregnant: Boolean(form.is_pregnant),
      has_active_infection: Boolean(form.has_active_infection),
      allergies: form.allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      medications: form.medications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
    diagnosis_structured: {
      primary: form.diagnosis_primary || null,
      secondary: form.diagnosis_secondary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
    treatment_plan_structured: {
      items: [],
    },
    next_follow_up: {
      date: form.follow_up_date || null,
      purpose: form.follow_up_purpose || null,
      note: form.follow_up_note || null,
      priority: "required",
    },
    ai_suggestion: consultation?.ai_suggestion ?? null,
    prescription_notes: prescriptionNotes || null,
    prescription_items: prescriptionItems
      .filter((item) => item.medicine_name?.trim())
      .map((item, i) => ({
        ...item,
        sort_order: i,
        quantity: item.quantity === "" ? null : item.quantity,
        unit_price: item.unit_price === "" ? null : item.unit_price,
        product_id: item.product_id || null,
        strength: item.strength || null,
        dosage_form: item.dosage_form || null,
        route: item.route || null,
        frequency: item.frequency || null,
        duration: item.duration || null,
        unit: item.unit || null,
        special_instructions: item.special_instructions || null,
      })),
    ...overrides,
  });

  const handleSave = async () => {
    if (!visit?.id || isLocked) return;
    const payload = buildPayload();
    setSaving(true);
    try {
      const draftsToSave = { ...questionnaireDraftsByFormId };
      if (selectedFormId) {
        draftsToSave[String(selectedFormId)] = {
          data: questionnaireData,
          dirty: questionnaireDirty,
          editingResponseId,
          fields: selectedFormFields,
          name: selectedFormName,
        };
      }

      const validationErrorsByFormId = {};
      for (const formId of selectedQuestionnaireFormIds) {
        const key = String(formId);
        const draft = draftsToSave[key] ?? {};
        let fields = draft.fields ?? [];
        if (!fields.length) {
          try {
            const details = await getForm(Number(formId));
            fields = details?.fields ?? [];
            draftsToSave[key] = {
              ...draft,
              fields,
              name: draft?.name ?? details?.form?.name ?? `Form #${formId}`,
            };
          } catch {
            // If field metadata fails to load, keep backend validation as fallback.
          }
        }
        if (!fields.length) continue;
        const data = draft.data ?? {};
        const nextErrors = {};
        fields.forEach((field) => {
          if (!field?.required) return;
          const value = data?.[field.name];
          if (hasFieldValue(value)) return;
          const label = field?.label?.trim() || prettifyFieldName(field?.name);
          nextErrors[field.name] = `${label} is required.`;
        });
        if (Object.keys(nextErrors).length > 0) {
          validationErrorsByFormId[key] = nextErrors;
        }
      }

      if (Object.keys(validationErrorsByFormId).length > 0) {
        const firstInvalidFormId = Object.keys(validationErrorsByFormId)[0];
        setQuestionnaireFieldErrorsByFormId(validationErrorsByFormId);
        setQuestionnaireError(
          "Please complete all required questionnaire/consent fields before saving.",
        );
        await handleSelectQuestionnaireForm(firstInvalidFormId);
        setExpandedQuestionnaireFormId(firstInvalidFormId);
        setSaving(false);
        return;
      }

      const next = consultation?.id
        ? await consultationService.updateConsultation(consultation.id, payload)
        : await consultationService.createConsultation(visit.id, payload);
      const dirtyEntries = Object.entries(draftsToSave).filter(([, draft]) =>
        Boolean(draft?.dirty),
      );
      for (const [formId, draft] of dirtyEntries) {
        const formPayload = {
          patient_id: visit?.patient_id ?? visit?.patient?.id ?? null,
          visit_id: visit.id,
          data: draft?.data ?? {},
        };
        if (draft?.editingResponseId) {
          await updateResponse(draft.editingResponseId, formPayload);
        } else {
          await submitResponse(Number(formId), formPayload);
        }
      }
      if (dirtyEntries.length) {
        const rows = await getLatestVisitFormResponses(visit.id);
        setSavedFormResponses(Array.isArray(rows) ? rows : []);
        setQuestionnaireDirty(false);
        setQuestionnaireDraftsByFormId((prev) => {
          const nextDrafts = { ...prev };
          dirtyEntries.forEach(([formId]) => {
            if (nextDrafts[formId]) nextDrafts[formId].dirty = false;
          });
          return nextDrafts;
        });
      }
      setConsultation(next);
      setHasUnsavedChanges(false);
      try {
        const refreshedGfe = await consentService.getGfeStatus(visit.id);
        setGfeStatus(refreshedGfe);
      } catch {
        // Non-blocking refresh after save.
      }
      pushToast({ message: "Consultation Room saved.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Save failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkGfeComplete = async () => {
    if (!visit?.id || gfeBusy) return;
    setGfeBusy(true);
    try {
      const result = await consentService.markGfeComplete(visit.id);
      setGfeStatus(result?.gfe_status ?? result);
      pushToast({
        message: "Good Faith Exam marked complete.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not mark GFE complete."),
        severity: "error",
      });
    } finally {
      setGfeBusy(false);
    }
  };

  const priorVisits = useMemo(() => {
    const rows = Array.isArray(patientDetail?.visits)
      ? patientDetail.visits
      : [];
    if (!visit?.id) return [];
    return rows
      .filter((v) => Number(v.id) !== Number(visit.id))
      .sort(
        (a, b) =>
          dayjs(b.visit_time ?? b.created_at).valueOf() -
          dayjs(a.visit_time ?? a.created_at).valueOf(),
      )
      .slice(0, 8);
  }, [patientDetail?.visits, visit?.id]);

  const historyTabItems = useMemo(
    () => [
      {
        label: "Notes",
        content: (
          <ConsultationAdditionalNotesTab
            value={form.notes}
            onChange={onField("notes")}
          />
        ),
      },
      {
        label: "Previous Consultations",
        content: <PatientConsultationTab visits={priorVisits} />,
      },
      {
        label: "Treatment History",
        content: <PatientTreatmentHistoryTab visits={priorVisits} />,
      },
    ],
    [priorVisits, form.notes],
  );

  const plannedTreatments = useMemo(
    () => (visitTreatments || []).filter((t) => t.status === "planned"),
    [visitTreatments],
  );

  useEffect(() => {
    const templateById = new Map(
      (templates || []).map((t) => [Number(t.id), t]),
    );
    const autoRequiredFormIds = (plannedTreatments || [])
      .flatMap((treatment) => {
        const templateId = Number(
          treatment?.treatment_template_id ??
            treatment?.treatment_template?.id ??
            treatment?.treatmentTemplate?.id,
        );
        const template =
          treatment?.treatment_template ??
          treatment?.treatmentTemplate ??
          templateById.get(templateId);
        const links =
          template?.required_form_links ?? template?.requiredFormLinks ?? [];
        return links
          .map((link) =>
            Number(link?.form_definition_id ?? link?.form_definition?.id),
          )
          .filter((id) => Number.isFinite(id) && id > 0)
          .map((id) => String(id));
      })
      .filter(Boolean);
    if (!autoRequiredFormIds.length) return;
    setSelectedQuestionnaireFormIds((prev) => [
      ...new Set([...autoRequiredFormIds, ...prev]),
    ]);
  }, [plannedTreatments, templates]);

  const consultationPhotos = useMemo(
    () =>
      (photos || []).filter(
        (p) => (p.stage || "consultation") === "consultation",
      ),
    [photos],
  );

  const beforePhotos = useMemo(
    () => consultationPhotos.filter((p) => p.type === "before"),
    [consultationPhotos],
  );

  const afterPhotos = useMemo(
    () => consultationPhotos.filter((p) => p.type === "after"),
    [consultationPhotos],
  );
  const [selectedBeforePhotoId, setSelectedBeforePhotoId] = useState(null);
  const [selectedAfterPhotoId, setSelectedAfterPhotoId] = useState(null);

  useEffect(() => {
    if (!beforePhotos.length) {
      setSelectedBeforePhotoId(null);
      return;
    }
    if (!beforePhotos.some((p) => p.id === selectedBeforePhotoId)) {
      setSelectedBeforePhotoId(beforePhotos[0].id);
    }
  }, [beforePhotos, selectedBeforePhotoId]);

  useEffect(() => {
    if (!afterPhotos.length) {
      setSelectedAfterPhotoId(null);
      return;
    }
    if (!afterPhotos.some((p) => p.id === selectedAfterPhotoId)) {
      setSelectedAfterPhotoId(afterPhotos[0].id);
    }
  }, [afterPhotos, selectedAfterPhotoId]);

  const selectedBeforePhoto = useMemo(
    () => beforePhotos.find((p) => p.id === selectedBeforePhotoId) ?? null,
    [beforePhotos, selectedBeforePhotoId],
  );
  const selectedAfterPhoto = useMemo(
    () => afterPhotos.find((p) => p.id === selectedAfterPhotoId) ?? null,
    [afterPhotos, selectedAfterPhotoId],
  );

  const formatPhotoMeta = (photo) => {
    if (!photo) return "";
    const parts = [
      photo.type === "before" ? "Before" : "After",
      photo.body_area,
      photo.side,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const confirmDiscardIfNeeded = () => {
    const hasDirtyQuestionnaireDraft = Object.values(
      questionnaireDraftsByFormId,
    ).some((draft) => Boolean(draft?.dirty));
    if (
      !hasUnsavedChanges &&
      !questionnaireDirty &&
      !hasDirtyQuestionnaireDraft
    )
      return true;
    return window.confirm(
      "You have unsaved changes. Are you sure you want to leave this page?",
    );
  };

  useEffect(() => {
    const hasDirtyQuestionnaireDraft = Object.values(
      questionnaireDraftsByFormId,
    ).some((draft) => Boolean(draft?.dirty));
    const hasUnsaved =
      hasUnsavedChanges || questionnaireDirty || hasDirtyQuestionnaireDraft;
    const onBeforeUnload = (event) => {
      if (!hasUnsaved) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges, questionnaireDirty, questionnaireDraftsByFormId]);

  const handleAddTemplateToPlan = async (templateId) => {
    if (!visit?.id || !templateId) return;
    const template = templates.find((t) => String(t.id) === String(templateId));
    if (!template) return;
    const alreadyExists = plannedTreatments.some(
      (t) =>
        String(t?.treatment_template_id ?? "") === String(template.id) ||
        String(t?.name ?? "")
          .trim()
          .toLowerCase() ===
          String(template.name ?? "")
            .trim()
            .toLowerCase(),
    );
    if (alreadyExists) {
      setPlanError("This preset is already in the selected treatment plan.");
      setSelectedTemplateId("");
      return;
    }
    setPlanBusy(true);
    setPlanError("");
    try {
      const created = await createTreatment(visit.id, {
        status: "planned",
        treatment_template_id: template.id,
        name: template.name,
      });
      const rows = await listVisitTreatments(visit.id);
      setVisitTreatments(Array.isArray(rows) ? rows : []);
      const warnings = getTreatmentStockWarnings(created);
      if (warnings.length > 0) {
        pushToast({
          message: `Added with stock warning: ${formatStockWarningSummary(warnings)}`,
          severity: "warning",
        });
      }
      let requiredLinks =
        template.required_form_links ?? template.requiredFormLinks ?? [];
      if (!Array.isArray(requiredLinks) || requiredLinks.length === 0) {
        requiredLinks = await getTreatmentTemplateRequiredForms(
          template.id,
        ).catch(() => []);
      }
      const requiredFormIds = requiredLinks
        .map((link) =>
          Number(link?.form_definition_id ?? link?.form_definition?.id),
        )
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => String(id));
      if (requiredFormIds.length) {
        setSelectedQuestionnaireFormIds((prev) => [
          ...requiredFormIds.filter((id) => !prev.includes(id)),
          ...prev,
        ]);
      }
      setSelectedTemplateId("");
      setHasUnsavedChanges(true);
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add preset to plan."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleAddCustomToPlan = async () => {
    const trimmed = customTreatmentName.trim();
    if (!visit?.id || !trimmed) return;
    const alreadyExists = plannedTreatments.some(
      (t) =>
        String(t?.name ?? "")
          .trim()
          .toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) {
      setPlanError("This treatment is already in the selected treatment plan.");
      return;
    }
    setPlanBusy(true);
    setPlanError("");
    try {
      await createTreatment(visit.id, { status: "planned", name: trimmed });
      const rows = await listVisitTreatments(visit.id);
      setVisitTreatments(Array.isArray(rows) ? rows : []);
      setCustomTreatmentName("");
      setHasUnsavedChanges(true);
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add custom treatment."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRemovePlanned = async (id) => {
    const okay = window.confirm("Delete this treatment from the plan?");
    if (!okay) return;
    setPlanBusy(true);
    setPlanError("");
    try {
      await deleteTreatment(id);
      const rows = await listVisitTreatments(visit.id);
      setVisitTreatments(Array.isArray(rows) ? rows : []);
      setHasUnsavedChanges(true);
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not remove planned treatment."));
    } finally {
      setPlanBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  if (error || !visit) {
    return (
      <Box sx={{ p: 3, maxWidth: 720 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(liveBoardPath)}
          sx={{ mb: 2 }}
        >
          Back to board
        </Button>
        <Alert severity="error">{error || "Visit not found."}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 2 }}>
      <Box
        sx={{
          width: "100%",
          "& .MuiTextField-root .MuiOutlinedInput-root": { borderRadius: 2 },
          "& .MuiButton-root": {
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
          },
          "& .MuiPaper-root": {
            transition: "border-color 160ms ease, background-color 160ms ease",
          },
        }}
      >
        <ConsultationRoomHeader
          patient={visit?.patient}
          visit={visit}
          photoCount={photos.length}
          plannedTreatmentCount={plannedTreatments.length}
          saving={saving}
          readOnly={isLocked}
          lockedAt={consultation?.locked_at}
          gfeStatus={gfeStatus}
          onBackToBoard={() => {
            if (!confirmDiscardIfNeeded()) return;
            navigate(liveBoardPath);
          }}
          onPatientDetails={() => {
            const patientId = visit?.patient_id ?? visit?.patient?.id;
            if (!patientId) return;
            if (!confirmDiscardIfNeeded()) return;
            navigate(`/patients/${patientId}`);
          }}
          onCancel={() => {
            if (!confirmDiscardIfNeeded()) return;
            navigate(liveBoardPath);
          }}
          onSave={handleSave}
          saveTestId="consultation-room-save-structured"
        />

        <VisitAppointmentNote visit={visit} sx={{ mb: 1.5 }} />

        {isLocked && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            This consultation was locked on{" "}
            {dayjs(consultation.locked_at).format("DD-MM-YYYY hh:mm")} and is
            read-only. Contact an admin to unlock if corrections are needed.
          </Alert>
        )}

        {gfeStatus?.status === "required" && (
          <Alert
            severity="warning"
            sx={{ mb: 1.5 }}
            action={
              <Button
                color="inherit"
                size="small"
                disabled={gfeBusy || isLocked}
                onClick={handleMarkGfeComplete}
              >
                {gfeBusy ? "Saving..." : "Mark GFE complete"}
              </Button>
            }
          >
            Good Faith Exam is required for this visit before treatment can
            proceed.
          </Alert>
        )}

        <fieldset
          disabled={isLocked}
          style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 1.5, md: 2 },
            }}
          >
            {/* Clinical Summary */}
            <Paper variant="outlined" sx={sectionCardSx}>
              <SectionTitle
                title="Clinical Summary"
                subtitle="Assessment, skin profile, vitals, examination and diagnosis."
              />
              <Stack spacing={1.5}>
                <LabeledTextField
                  title="Chief Complaint"
                  size="small"
                  value={form.chief_complaint}
                  onChange={onField("chief_complaint")}
                  fullWidth
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Skin Profile
                </Typography>

                <FormControl size="small" fullWidth>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Skin Type
                  </Typography>

                  <Select
                    title="Skin Type"
                    value={form.skin_type}
                    onChange={onField("skin_type")}
                  >
                    <MenuItem value="dry">Dry</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="combination">Combination</MenuItem>
                    <MenuItem value="oily">Oily</MenuItem>
                    <MenuItem value="sensitive">Sensitive</MenuItem>
                  </Select>
                </FormControl>

                <FormControl
                  sx={{
                    p: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Fitzpatrick
                  </Typography>

                  <RadioGroup
                    row
                    value={String(form.fitzpatrick)}
                    onChange={onField("fitzpatrick")}
                  >
                    {["1", "2", "3", "4", "5", "6"].map((level) => (
                      <FormControlLabel
                        key={level}
                        value={level}
                        control={<Radio size="small" />}
                        label={level}
                      />
                    ))}
                  </RadioGroup>
                  <Typography variant="caption" color="text.secondary">
                    1: very fair · 2: fair · 3: medium · 4: olive/brown · 5:
                    dark brown · 6: deepest tone
                  </Typography>
                </FormControl>

                <Divider />
                <VitalSigns
                  embedded
                  editable={!isLocked}
                  showSave={false}
                  values={form}
                  onValuesChange={(nextVitals) => {
                    setForm((prev) => ({ ...prev, ...nextVitals }));
                    setHasUnsavedChanges(true);
                  }}
                  subtitle="Latest measurements for this consultation."
                />
                <LabeledTextField
                  title="Examination Note"
                  size="small"
                  multiline
                  minRows={2}
                  value={form.examination_note}
                  onChange={onField("examination_note")}
                  fullWidth
                />
                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Diagnosis
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
                  <LabeledTextField
                    title="Diagnosis Primary"
                    size="small"
                    value={form.diagnosis_primary}
                    onChange={onField("diagnosis_primary")}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <LabeledTextField
                    title="Diagnosis Secondary (multiple input with comma)"
                    size="small"
                    value={form.diagnosis_secondary}
                    onChange={onField("diagnosis_secondary")}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Clinical References */}
            <Paper variant="outlined" sx={sectionCardSx}>
              <SectionTitle
                title="Clinical References"
                subtitle="Read-only context from current visit, history, packages and questionnaire records."
              />
              <Stack spacing={1}>
                {visit?.appointment?.notes?.trim() ? (
                  <Typography variant="body2">
                    <strong>Appointment note:</strong>{" "}
                    {visit.appointment.notes.trim()}
                  </Typography>
                ) : null}
                <Typography variant="body2">
                  <strong>Current check-in complaint:</strong>{" "}
                  {visit?.notes || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Current visit follow-up:</strong>{" "}
                  {visit?.follow_up === true
                    ? "Yes"
                    : visit?.follow_up === false
                      ? "No"
                      : "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Aesthetic health info (medications):</strong>{" "}
                  {medicalHistory?.current_medications || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Aesthetic health info (allergies):</strong>{" "}
                  {medicalHistory?.allergies || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Purchased packages:</strong>{" "}
                  {patientPackages.length
                    ? patientPackages
                        .map(
                          (pkg) =>
                            pkg?.package?.name ||
                            pkg?.name ||
                            `Package #${pkg.id}`,
                        )
                        .join(", ")
                    : "—"}
                </Typography>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.25,
                    bgcolor: "action.hover",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={0.5}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Latest questionnaire response
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {latestQuestionnaireResponse
                        ? [
                            latestQuestionnaireResponse.form?.definition
                              ?.name ??
                              latestQuestionnaireResponse.form_definition?.name,
                            latestQuestionnaireResponse.form?.version_number
                              ? `v${latestQuestionnaireResponse.form.version_number}`
                              : null,
                            (latestQuestionnaireResponse.updated_at ??
                            latestQuestionnaireResponse.created_at)
                              ? dayjs(
                                  latestQuestionnaireResponse.updated_at ??
                                    latestQuestionnaireResponse.created_at,
                                ).format("D MMM YYYY")
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "Not found"}
                    </Typography>
                  </Stack>
                  {latestQuestionnaireResponse ? (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 1,
                      }}
                    >
                      {QUESTIONNAIRE_REFERENCE_FIELDS.map(([key, label]) => (
                        <Box key={key}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {formatReferenceValue(
                              questionnaireReferenceData[key],
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No intake questionnaire answer is linked to this patient
                      yet.
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Previous visits/treatments
                  </Typography>
                  {priorVisits.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No previous visits.
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {priorVisits.map((pv) => {
                        const tnames = (pv.treatments ?? [])
                          .map((t) => t.name)
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <Typography
                            key={pv.id}
                            variant="caption"
                            color="text.secondary"
                          >
                            {dayjs(pv.visit_time ?? pv.created_at).format(
                              "YYYY-MM-DD",
                            )}{" "}
                            · {pv.status ?? "—"} · {tnames || "No treatments"}
                          </Typography>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Treatment and Follow up*/}
          <Box
            sx={{
              mt: 2,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: { xs: 1.5, md: 2 },
            }}
          >
            <Paper variant="outlined" sx={sectionCardSx}>
              <SectionTitle
                title="Treatment"
                subtitle="Select treatment, add custom treatment, and plan the treatment."
              />
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.25, sm: 2 },
                  mb: 2,
                  borderRadius: 2,
                  borderColor: "secondary.main",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(168, 85, 247, 0.10)"
                      : "rgba(168, 85, 247, 0.06)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                      Select Treatment
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Procedures selected here are prepared for this visit.
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight={900}
                    color="secondary.main"
                  >
                    {plannedTreatments.length} selected
                  </Typography>
                </Stack>
                {planError && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {planError}
                  </Alert>
                )}
                <LabeledTextField
                  title="Select Treatment"
                  select
                  size="small"
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (!nextId) {
                      setSelectedTemplateId("");
                      return;
                    }
                    setSelectedTemplateId("");
                    handleAddTemplateToPlan(nextId);
                  }}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  <MenuItem value="">
                    <em>Select Treatment</em>
                  </MenuItem>
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.name} · {t.price != null ? formatKyats(t.price) : "—"}
                    </MenuItem>
                  ))}
                </LabeledTextField>
                {plannedTreatments.length > 0 ? (
                  <>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      Add Selected Treatment
                    </Typography>
                    <List
                      dense
                      disablePadding
                      sx={{
                        borderRadius: 2,
                      }}
                    >
                      {plannedTreatments.map((t, index) => {
                        const templateId =
                          t?.treatment_template_id ??
                          t?.treatment_template?.id ??
                          t?.treatmentTemplate?.id;
                        const tmpl =
                          t.treatment_template ??
                          t.treatmentTemplate ??
                          templates.find(
                            (tpl) => String(tpl.id) === String(templateId),
                          );
                        const duration =
                          tmpl?.duration_minutes != null
                            ? `${tmpl.duration_minutes} min`
                            : "—";
                        const price = formatPlanPrice(tmpl?.price ?? null);
                        const label = [
                          t.name || "Procedure",
                          `Duration: ${duration}`,
                          `Price: ${price}`,
                        ].join(" · ");

                        return (
                          <ListItem
                            key={t.id}
                            divider
                            sx={{
                              mb: 0.75,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                              bgcolor: "rgba(168, 85, 247, 0.10)",
                              boxShadow: 1,
                              flexDirection: "column",
                              alignItems: "stretch",
                            }}
                            secondaryAction={
                              <ListItemSecondaryAction>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemovePlanned(t.id)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </ListItemSecondaryAction>
                            }
                          >
                            <ListItemText
                              primary={`${index + 1}. ${label}`}
                              primaryTypographyProps={{
                                variant: "body2",
                                fontWeight: 600,
                              }}
                              secondaryTypographyProps={{ variant: "caption" }}
                            />
                            <TreatmentStockWarningAlert
                              treatment={t}
                              dense
                              sx={{ mt: 0.75, pr: 5 }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No planned treatments yet.
                  </Typography>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "flex-end", mt: 1.5 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LabeledTextField
                      title="Custom Treatment"
                      size="small"
                      value={customTreatmentName}
                      onChange={(e) => {
                        setCustomTreatmentName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      fullWidth
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={planBusy || !customTreatmentName.trim()}
                    onClick={handleAddCustomToPlan}
                    sx={{ flexShrink: 0, alignSelf: "flex-end" }}
                  >
                    Add
                  </Button>
                </Stack>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, mb: 2 }}
              >
                <SectionTitle
                  title="Questionnaires & Consents"
                  subtitle="Select forms, fill responses, and keep each selected form visible."
                />
                <Stack spacing={1.5}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="consult-form-select-label">
                      Select form
                    </InputLabel>
                    <Select
                      labelId="consult-form-select-label"
                      label="Select form"
                      value=""
                      onChange={(e) =>
                        handleSelectQuestionnaireForm(e.target.value)
                      }
                      disabled={questionnaireLoading}
                    >
                      <MenuItem value="">
                        <em>Select a questionnaire or consent form</em>
                      </MenuItem>
                      {activeForms.map((f) => (
                        <MenuItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {questionnaireError ? (
                    <Alert severity="error">{questionnaireError}</Alert>
                  ) : null}
                  {selectedQuestionnaireFormIds.length > 0 ? (
                    <Stack spacing={1}>
                      {selectedQuestionnaireFormIds.map((formId) => {
                        const row = savedFormResponses.find(
                          (it) => String(it.form_id) === String(formId),
                        );
                        const formMeta =
                          activeForms.find(
                            (f) => String(f.id) === String(formId),
                          ) ?? {};
                        const draft =
                          questionnaireDraftsByFormId[String(formId)];
                        const isOpen =
                          String(expandedQuestionnaireFormId) ===
                          String(formId);
                        const isLoaded =
                          String(selectedFormId) === String(formId);
                        const title =
                          draft?.name ??
                          formMeta?.name ??
                          row?.form_name ??
                          `Form #${formId}`;
                        return (
                          <Accordion key={formId} expanded={isOpen}>
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              onClick={() => {
                                if (isOpen) {
                                  setExpandedQuestionnaireFormId("");
                                  return;
                                }
                                handleSelectQuestionnaireForm(formId);
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ width: "100%", pr: 1 }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700 }}
                                >
                                  {title}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveQuestionnaireForm(formId);
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              {isLoaded && selectedFormFields.length > 0 ? (
                                <DynamicFormRenderer
                                  fields={selectedFormFields}
                                  formData={questionnaireData}
                                  errors={
                                    questionnaireFieldErrorsByFormId[
                                      String(formId)
                                    ] ?? {}
                                  }
                                  onChange={(name, value) => {
                                    const nextData = {
                                      ...questionnaireData,
                                      [name]: value,
                                    };
                                    setQuestionnaireData(nextData);
                                    setQuestionnaireDirty(true);
                                    setHasUnsavedChanges(true);
                                    setQuestionnaireError("");
                                    setQuestionnaireFieldErrorsByFormId(
                                      (prev) => ({
                                        ...prev,
                                        [String(formId)]: {
                                          ...(prev[String(formId)] ?? {}),
                                          [name]: undefined,
                                        },
                                      }),
                                    );
                                    setQuestionnaireDraftsByFormId((prev) => ({
                                      ...prev,
                                      [String(formId)]: {
                                        data: nextData,
                                        dirty: true,
                                        editingResponseId,
                                        fields: selectedFormFields,
                                        name: selectedFormName || title,
                                      },
                                    }));
                                  }}
                                />
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {questionnaireLoading
                                    ? "Loading form fields..."
                                    : "Expand to load this form."}
                                </Typography>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Stack>
                  ) : null}
                </Stack>
              </Paper>
              <Stack spacing={1.5}>
                <FormGroup
                  row
                  sx={{
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    gap: 1,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.is_pregnant)}
                        onChange={onField("is_pregnant")}
                      />
                    }
                    label="Pregnant"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.has_active_infection)}
                        onChange={onField("has_active_infection")}
                      />
                    }
                    label="Active infection"
                  />
                </FormGroup>

                <Box sx={fieldGridSx}>
                  <LabeledTextField
                    title="Allergies (multiple input with comma)"
                    size="small"
                    value={form.allergies}
                    onChange={onField("allergies")}
                    fullWidth
                    placeholder="Penicillin, Pain Killers, Dust, etc."
                  />
                  <LabeledTextField
                    title="Medications (multiple input with comma)"
                    size="small"
                    value={form.medications}
                    onChange={onField("medications")}
                    fullWidth
                    placeholder="Aspirin, Paracetamol, Ibuprofen, etc."
                  />
                </Box>

                <Box sx={fieldGridSx}>
                  <LabeledTextField
                    title="Next Follow-up Date"
                    type="date"
                    size="small"
                    value={form.follow_up_date}
                    onChange={onField("follow_up_date")}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <LabeledTextField
                    title="Follow-up Purpose"
                    select
                    size="small"
                    value={form.follow_up_purpose}
                    onChange={onField("follow_up_purpose")}
                    fullWidth
                  >
                    <MenuItem value="next_session">Next session</MenuItem>
                    <MenuItem value="review_progress">Review progress</MenuItem>
                    <MenuItem value="adverse_event_check">
                      Adverse event check
                    </MenuItem>
                  </LabeledTextField>
                </Box>

                <LabeledTextField
                  title="Follow-up Note"
                  size="small"
                  multiline
                  minRows={2}
                  value={form.follow_up_note}
                  onChange={onField("follow_up_note")}
                  fullWidth
                />

                <Typography variant="caption" color="text.secondary">
                  Next session date automatically follows follow-up date.
                </Typography>
              </Stack>
            </Paper>
          </Box>

          {/* Prescription Medical Section  */}
          <ConsultationPrescriptionSection
            items={prescriptionItems}
            notes={prescriptionNotes}
            productOptions={productOptions}
            prescriptionId={prescriptionId}
            onItemsChange={setPrescriptionItems}
            onNotesChange={setPrescriptionNotes}
          />

          {/* Before & After Photos */}
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              borderWidth: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.10)"
                  : "rgba(59, 130, 246, 0.06)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1.25 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Before & After Photos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Key visual evidence for diagnosis, treatment planning, and
                  downstream handoff.
                </Typography>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 1,
                  alignSelf: { xs: "stretch", sm: "center" },
                  bgcolor: "background.paper",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Consultation photos
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {photos.length}
                </Typography>
              </Paper>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.5,
                mb: 1.5,
              }}
            >
              {[
                {
                  label: "Before",
                  photo: selectedBeforePhoto,
                  thumbnails: beforePhotos,
                  onSelect: setSelectedBeforePhotoId,
                  selectedId: selectedBeforePhotoId,
                },
                {
                  label: "After",
                  photo: selectedAfterPhoto,
                  thumbnails: afterPhotos,
                  onSelect: setSelectedAfterPhotoId,
                  selectedId: selectedAfterPhotoId,
                },
              ].map(({ label, photo, thumbnails, onSelect, selectedId }) => (
                <Paper
                  key={label}
                  variant="outlined"
                  sx={{
                    minHeight: { xs: 300, sm: 380, md: 420, lg: 450 },
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                    bgcolor: "background.paper",
                    borderStyle: photo ? "solid" : "dashed",
                  }}
                >
                  {photo?.url ? (
                    <Box
                      component="img"
                      src={photo.url}
                      alt={formatPhotoMeta(photo)}
                      onClick={() => setPhotoDialog(photo)}
                      sx={{
                        width: "100%",
                        height: { xs: 260, sm: 340, md: 360, lg: 390 },
                        objectFit: "cover",
                        display: "block",
                        cursor: "zoom-in",
                      }}
                    />
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        height: { xs: 260, sm: 340, md: 360, lg: 390 },
                        px: 2,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={800}>
                        No {label.toLowerCase()} photo yet
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                      >
                        Upload a {label.toLowerCase()} photo below.
                      </Typography>
                    </Stack>
                  )}
                  <Box
                    sx={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: "rgba(0,0,0,0.64)",
                      color: "white",
                    }}
                  >
                    <Typography variant="caption" fontWeight={900}>
                      {label}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      p: 1,
                      overflowX: "auto",
                      borderTop: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    {thumbnails.length ? (
                      thumbnails.map((thumb) => (
                        <Box
                          key={thumb.id}
                          component="img"
                          src={thumb.url}
                          alt={formatPhotoMeta(thumb)}
                          onClick={() => onSelect(thumb.id)}
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 1,
                            objectFit: "cover",
                            cursor: "pointer",
                            border: "2px solid",
                            borderColor:
                              selectedId === thumb.id
                                ? "primary.main"
                                : "transparent",
                            boxShadow: selectedId === thumb.id ? 2 : 0,
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No {label.toLowerCase()} photo thumbnails yet.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Box>
            <LiveBoardStagePhotoStrip
              visitId={visit?.id}
              stage="consultation"
              photos={photos}
              disabled={saving}
              onPhotoUploaded={(uploaded) =>
                setPhotos((prev) => [uploaded, ...prev])
              }
              onPhotoClick={setPhotoDialog}
            />
          </Paper>

          <TabbedPanel
            items={historyTabItems}
            value={tab}
            onChange={setTab}
            wrapper="paper"
            wrapperProps={{
              variant: "outlined",
              sx: { mt: 2, borderRadius: 3, overflow: "hidden" },
            }}
            contentSx={{ p: { xs: 1.5, sm: 2 } }}
          />

          {/* Fee Section */}
          <ConsultationFeeSection form={form} onField={onField} />
        </fieldset>

        {/* Photo Preview Dialog */}
        <Dialog
          open={Boolean(photoDialog)}
          onClose={() => setPhotoDialog(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ pr: 6 }}>
            {photoDialog ? formatPhotoMeta(photoDialog) : "Photo"}
            <IconButton
              aria-label="Close photo preview"
              onClick={() => setPhotoDialog(null)}
              sx={{ position: "absolute", right: 12, top: 10 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {photoDialog?.url ? (
              <Box
                component="img"
                src={photoDialog.url}
                alt={formatPhotoMeta(photoDialog)}
                sx={{
                  width: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  display: "block",
                  bgcolor: "black",
                  borderRadius: 2,
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
}
