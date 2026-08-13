import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  CircularProgress,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { resolveApiError } from "../../services/apiClient";
import { getVisit } from "../../services/visitService";
import {
  updateTreatment,
  addSessionProduct,
  updateSessionProduct,
  deleteSessionProduct,
  completeTreatmentSession,
  deleteTreatment,
  createTreatmentMapPoint,
  deleteTreatmentMapPoint,
  listTreatmentMapPoints,
  updateTreatmentMapPoint,
} from "../../services/treatmentService";
import {
  deletePhoto,
  getPhotos,
  uploadPhoto,
} from "../../services/photoService";
import DynamicFormRenderer from "../common/DynamicFormRenderer";
import {
  getForm,
  getForms,
  getProcedureFormRowsForSession,
  submitResponse,
  updateResponse,
} from "../../services/formService";
import { getTreatmentTemplateRequiredForms } from "../../services/treatmentTemplateService";
import useAuthStore from "../../stores/authStore";
import TreatmentPackageSection from "./TreatmentPackageSection";
import {
  canEditProcedureRecordOnVisit,
  canUpdateLiveboard,
} from "../../utils/roleUtils";
import { BODY_AREA_OPTIONS } from "../../utils/visitPhotoLabels";
import {
  DIAGRAM_OPTIONS,
  DIAGRAM_OPTION_BY_KEY,
  resolveDefaultDiagramKeyByGender,
} from "../../utils/diagramProfiles";

function sessionStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  if (status === "planned") return "Planned";
  if (status === "cancelled") return "Cancelled";
  return status ?? "—";
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

const FACE_ZONE_LABELS = [
  { value: "Forehead", x: 0.5, y: 0.2 },
  { value: "Glabella", x: 0.5, y: 0.3 },
  { value: "Left temple", x: 0.28, y: 0.3 },
  { value: "Right temple", x: 0.72, y: 0.3 },
  { value: "Nose bridge", x: 0.5, y: 0.42 },
  { value: "Left cheek", x: 0.35, y: 0.5 },
  { value: "Right cheek", x: 0.65, y: 0.5 },
  { value: "Perioral", x: 0.5, y: 0.62 },
  { value: "Chin", x: 0.5, y: 0.74 },
  { value: "Jawline left", x: 0.36, y: 0.72 },
  { value: "Jawline right", x: 0.64, y: 0.72 },
];

function nearestFaceZoneLabel(x, y) {
  let best = FACE_ZONE_LABELS[0]?.value || "Face";
  let bestDistance = Number.POSITIVE_INFINITY;
  FACE_ZONE_LABELS.forEach((zone) => {
    const dx = Number(x) - zone.x;
    const dy = Number(y) - zone.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = zone.value;
    }
  });
  return best;
}

function extractLabelAndNote(rawNote) {
  const text = String(rawNote ?? "").trim();
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return { label: "", note: text };
  return {
    label: String(match[1] || "").trim(),
    note: String(match[2] || "").trim(),
  };
}

function composeLabelledNote(label, note) {
  const trimmedLabel = String(label ?? "").trim();
  const trimmedNote = String(note ?? "").trim();
  if (!trimmedLabel) return trimmedNote || null;
  return trimmedNote ? `[${trimmedLabel}] ${trimmedNote}` : `[${trimmedLabel}]`;
}

export default function TreatmentSessionCard({
  visit,
  session,
  templates,
  templatesLoading,
  productOptions,
  canAssign,
  onVisitUpdated,
}) {
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const [templateSaving, setTemplateSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [sessionName, setSessionName] = useState(session.name ?? "");
  const [sessionNotes, setSessionNotes] = useState(session.notes ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);
  const [visitPhotos, setVisitPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [mapUploadType, setMapUploadType] = useState("before");
  const [mapUploadBodyArea, setMapUploadBodyArea] = useState("face");
  const [mapUploadSide, setMapUploadSide] = useState("");
  const [mapAnatomyLabel, setMapAnatomyLabel] = useState("");
  const [mapNote, setMapNote] = useState("");
  const [mapUnit, setMapUnit] = useState("");
  const [mapProductId, setMapProductId] = useState("");
  const patientGenderRaw =
    visit?.patient?.gender ??
    visit?.patient_gender ??
    visit?.gender ??
    visit?.patient?.sex ??
    "";
  const [mapTarget, setMapTarget] = useState(
    () => `diagram:${resolveDefaultDiagramKeyByGender(patientGenderRaw)}`,
  );
  const [mapDiagramLoadError, setMapDiagramLoadError] = useState(false);
  const [pendingMapClick, setPendingMapClick] = useState(null);
  const [savingPoint, setSavingPoint] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const sessionCompleted = session.status === "completed";
  const { user: sessionAuthUser } = useAuthStore();
  const canEditThisSession =
    !sessionCompleted &&
    canEditProcedureRecordOnVisit(sessionAuthUser, visit, session);
  const assignedDoctorName = session.assigned_doctor?.name ?? null;
  const defaultDiagramKey = resolveDefaultDiagramKeyByGender(patientGenderRaw);

  const mayFillOrEditProcedure = useCallback(
    (submitterId) => {
      if (sessionCompleted) return false;
      if (canUpdateLiveboard(sessionAuthUser)) return true;
      if (canEditProcedureRecordOnVisit(sessionAuthUser, visit, session))
        return true;
      if (
        submitterId != null &&
        submitterId !== "" &&
        Number(submitterId) === Number(sessionAuthUser?.id)
      ) {
        return true;
      }
      return false;
    },
    [sessionCompleted, sessionAuthUser, visit, session],
  );

  const extraProcedureDefIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(session.extra_procedure_form_definition_ids)
          ? session.extra_procedure_form_definition_ids
          : []
        ).map((x) => Number(x)),
      ),
    [session.extra_procedure_form_definition_ids],
  );

  const [procedureRows, setProcedureRows] = useState([]);
  const [procedureRowsLoading, setProcedureRowsLoading] = useState(false);
  const [procedureFormCatalog, setProcedureFormCatalog] = useState([]);
  const [selectedExtraProcedureId, setSelectedExtraProcedureId] = useState("");
  const [addingExtraProcedure, setAddingExtraProcedure] = useState(false);
  const [procFormDialogOpen, setProcFormDialogOpen] = useState(false);
  const [procActiveFormId, setProcActiveFormId] = useState(null);
  const [procActiveFormName, setProcActiveFormName] = useState("");
  const [procActiveFormFields, setProcActiveFormFields] = useState([]);
  const [procActiveFormData, setProcActiveFormData] = useState({});
  const [procEditingResponseId, setProcEditingResponseId] = useState(null);
  const [procFormSaving, setProcFormSaving] = useState(false);
  const [procFormError, setProcFormError] = useState("");
  const [procActiveFormReadOnly, setProcActiveFormReadOnly] = useState(false);

  const loadProcedureRows = useCallback(async () => {
    if (!visit?.id || !session?.id) {
      setProcedureRows([]);
      return;
    }
    setProcedureRowsLoading(true);
    try {
      const templateLinks =
        session.treatment_template_id != null
          ? await getTreatmentTemplateRequiredForms(
              session.treatment_template_id,
            )
          : [];
      const mergedLinks = [...(templateLinks ?? [])];
      const extraIds = Array.isArray(
        session.extra_procedure_form_definition_ids,
      )
        ? session.extra_procedure_form_definition_ids
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];
      const existingProcDefIds = new Set(
        mergedLinks
          .filter((l) => l.form_definition?.form_type === "procedure")
          .map((l) => Number(l.form_definition_id)),
      );
      for (const fid of extraIds) {
        if (existingProcDefIds.has(fid)) {
          continue;
        }
        const meta = procedureFormCatalog.find((f) => Number(f.id) === fid);
        mergedLinks.push({
          form_definition_id: fid,
          is_required: false,
          form_definition: {
            id: fid,
            name: meta?.name ?? `Procedure form #${fid}`,
            form_type: "procedure",
          },
        });
        existingProcDefIds.add(fid);
      }
      const rows = await getProcedureFormRowsForSession(
        visit.id,
        session.id,
        mergedLinks,
      );
      setProcedureRows(rows);
    } catch {
      setProcedureRows([]);
    } finally {
      setProcedureRowsLoading(false);
    }
  }, [
    visit?.id,
    session?.id,
    session.treatment_template_id,
    session.extra_procedure_form_definition_ids,
    procedureFormCatalog,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const forms = await getForms();
        if (cancelled) return;
        const list = Array.isArray(forms) ? forms : [];
        setProcedureFormCatalog(
          list.filter((f) => f.form_type === "procedure" && f.is_active),
        );
      } catch {
        if (!cancelled) setProcedureFormCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadProcedureRows();
  }, [loadProcedureRows]);

  useEffect(() => {
    setSessionName(session.name ?? "");
    setSessionNotes(session.notes ?? "");
  }, [session.id, session.name, session.notes]);
  useEffect(() => {
    if (!session?.id) return;
    listTreatmentMapPoints(session.id)
      .then((rows) => setMapPoints(rows))
      .catch(() => setMapPoints([]));
  }, [session?.id]);
  const loadVisitPhotos = useCallback(async () => {
    if (!visit?.id) {
      setVisitPhotos([]);
      return [];
    }
    try {
      const rows = await getPhotos(visit.id);
      const next = Array.isArray(rows) ? rows : [];
      setVisitPhotos(next);
      return next;
    } catch {
      setVisitPhotos([]);
      return [];
    }
  }, [visit?.id]);
  useEffect(() => {
    loadVisitPhotos();
  }, [loadVisitPhotos]);
  useEffect(() => {
    const activePoint = mapPoints.find(
      (point) => Number(point.id) === Number(selectedPointId),
    );
    if (!activePoint) return;
    const parsed = extractLabelAndNote(activePoint.note);
    setMapAnatomyLabel(
      parsed.label ||
        (activePoint.photo_id
          ? "Photo point"
          : nearestFaceZoneLabel(
              activePoint.x_position,
              activePoint.y_position,
            )),
    );
    setMapNote(parsed.note);
    setMapUnit(activePoint.unit ?? "");
    setMapProductId(
      activePoint.product_id != null ? String(activePoint.product_id) : "",
    );
    setMapTarget(
      activePoint.photo_id
        ? `photo:${activePoint.photo_id}`
        : `diagram:${activePoint.diagram_key || defaultDiagramKey}`,
    );
  }, [selectedPointId, mapPoints, defaultDiagramKey]);
  const items = session.items ?? [];
  const sessionLines = session.session_products ?? [];
  const committedLines = session.patient_treatment_products ?? [];

  const templateSelectValue = useMemo(() => {
    const tid = session?.treatment_template_id;
    if (tid == null) return "";
    const inList = templates.some((x) => Number(x.id) === Number(tid));
    return inList ? String(tid) : "";
  }, [session?.treatment_template_id, templates]);

  const refreshVisit = async () => {
    const v = await getVisit(visit.id);
    onVisitUpdated?.(v);
  };

  const handleTemplateChange = async (e) => {
    const raw = e.target.value;
    const templateId = raw === "" ? null : Number(raw);
    if (!session?.id) return;
    setTemplateSaving(true);
    try {
      await updateTreatment(session.id, {
        treatment_template_id: templateId,
      });
      await refreshVisit();
      pushToast({ message: "Template updated.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not apply template."),
        severity: "error",
      });
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleQtyBlur = async (lineId, value) => {
    const q = Math.max(1, parseInt(String(value), 10) || 1);
    try {
      await updateSessionProduct(lineId, { quantity: q });
      await refreshVisit();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update quantity."),
        severity: "error",
      });
    }
  };

  const handleRemoveLine = async (lineId) => {
    try {
      await deleteSessionProduct(lineId);
      await refreshVisit();
      pushToast({ message: "Product line removed.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not remove line."),
        severity: "error",
      });
    }
  };

  const handleAddProduct = async () => {
    if (!session?.id || !newProductId) return;
    const q = Math.max(1, parseInt(String(newQty), 10) || 1);
    setAddProductLoading(true);
    try {
      await addSessionProduct(session.id, {
        product_id: Number(newProductId),
        quantity: q,
      });
      setNewProductId("");
      setNewQty("1");
      await refreshVisit();
      pushToast({ message: "Product added.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not add product."),
        severity: "error",
      });
    } finally {
      setAddProductLoading(false);
    }
  };

  const saveSessionNameIfChanged = async () => {
    if (!canAssign || !session?.id) return;
    const next = (sessionName || "").trim() || "Treatment Session";
    const prev = (session.name || "").trim() || "Treatment Session";
    if (next === prev) return;
    setNameSaving(true);
    try {
      await updateTreatment(session.id, { name: next });
      await refreshVisit();
      pushToast({ message: "Session name saved.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save session name."),
        severity: "error",
      });
    } finally {
      setNameSaving(false);
    }
  };

  const saveSessionNotesIfChanged = async () => {
    if (!canAssign || !session?.id) return;
    const next = sessionNotes ?? "";
    const prev = session.notes ?? "";
    if (next === prev) return;
    setNotesSaving(true);
    try {
      await updateTreatment(session.id, { notes: next });
      await refreshVisit();
      pushToast({ message: "Notes saved.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save notes."),
        severity: "error",
      });
    } finally {
      setNotesSaving(false);
    }
  };

  const handleDeleteSession = async () => {
    const approved = await askConfirm({
      title: "Delete this session?",
      message:
        "This removes the session and its draft product lines. You cannot delete a session after it is marked done.",
      confirmText: "Delete session",
    });
    if (!approved) return;
    setDeleting(true);
    try {
      await deleteTreatment(session.id);
      await refreshVisit();
      pushToast({ message: "Session deleted.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not delete session."),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkSessionDone = async () => {
    const approved = await askConfirm({
      title: "Mark this session done?",
      message:
        "Products on this session will be deducted from inventory (FIFO). After this, you can still edit the session name and notes, but not the preset or recorded products. You will not be able to delete this session.",
      confirmText: "Mark done",
    });
    if (!approved) return;
    setCompleting(true);
    try {
      await completeTreatmentSession(session.id);
      await refreshVisit();
      await loadProcedureRows();
      pushToast({ message: "Session marked done.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not complete session."),
        severity: "error",
      });
    } finally {
      setCompleting(false);
    }
  };

  const openProcedureFormEditor = async (row) => {
    setProcFormDialogOpen(true);
    setProcFormError("");
    setProcActiveFormId(row.form_id);
    setProcActiveFormName(row.form_name || "Procedure form");
    setProcEditingResponseId(row.id);
    const submitterId =
      row?.submitted_by && typeof row.submitted_by === "object"
        ? row.submitted_by.id
        : row?.submitted_by;
    setProcActiveFormReadOnly(!mayFillOrEditProcedure(submitterId));
    try {
      const details = await getForm(row.form_id);
      const fields = details?.fields ?? [];
      setProcActiveFormFields(fields);
      setProcActiveFormData({ ...(row.data ?? {}) });
    } catch (err) {
      setProcFormError(resolveApiError(err, "Failed to load form."));
    }
  };

  const handleSaveProcedureForm = async () => {
    if (!procActiveFormId || !visit?.id || !session?.id) return;
    if (procActiveFormReadOnly) return;
    setProcFormSaving(true);
    setProcFormError("");
    try {
      const payload = {
        patient_id: visit?.patient_id ?? visit?.patient?.id ?? null,
        visit_id: visit.id,
        treatment_id: session.id,
        data: procActiveFormData,
      };
      if (procEditingResponseId)
        await updateResponse(procEditingResponseId, payload);
      else await submitResponse(procActiveFormId, payload);
      pushToast({ message: "Procedure record saved.", severity: "success" });
      setProcFormDialogOpen(false);
      await loadProcedureRows();
    } catch (err) {
      setProcFormError(resolveApiError(err, "Failed to save form."));
    } finally {
      setProcFormSaving(false);
    }
  };

  const handleAddExtraProcedureForm = async () => {
    if (!session?.id || !selectedExtraProcedureId) return;
    const n = Number(selectedExtraProcedureId);
    if (!Number.isFinite(n) || n <= 0) return;
    const current = (
      Array.isArray(session.extra_procedure_form_definition_ids)
        ? session.extra_procedure_form_definition_ids
        : []
    ).map(Number);
    if (current.includes(n)) return;
    setAddingExtraProcedure(true);
    try {
      await updateTreatment(session.id, {
        extra_procedure_form_definition_ids: [...current, n],
      });
      setSelectedExtraProcedureId("");
      await refreshVisit();
      pushToast({
        message: "Procedure form added to this session.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not add procedure form."),
        severity: "error",
      });
    } finally {
      setAddingExtraProcedure(false);
    }
  };

  const handleRemoveExtraProcedureForm = async (formDefId) => {
    if (!session?.id || !extraProcedureDefIdSet.has(Number(formDefId))) return;
    const current = (
      Array.isArray(session.extra_procedure_form_definition_ids)
        ? session.extra_procedure_form_definition_ids
        : []
    ).map(Number);
    const next = current.filter((id) => id !== Number(formDefId));
    try {
      await updateTreatment(session.id, {
        extra_procedure_form_definition_ids: next,
      });
      await refreshVisit();
      pushToast({
        message: "Procedure form removed from this session.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not remove procedure form."),
        severity: "error",
      });
    }
  };

  const mapPhotoOptions = useMemo(
    () =>
      (visitPhotos || []).filter((photo) => {
        if (!photo || !photo.url) return false;
        return photo.stage === "treatment" || photo.body_area === "face";
      }),
    [visitPhotos],
  );
  const isDiagramTarget = mapTarget.startsWith("diagram:");
  const selectedDiagramKey = isDiagramTarget
    ? mapTarget.replace("diagram:", "")
    : defaultDiagramKey;
  const selectedDiagram =
    DIAGRAM_OPTION_BY_KEY[selectedDiagramKey] ??
    DIAGRAM_OPTION_BY_KEY[defaultDiagramKey];
  useEffect(() => {
    if (!mapTarget.startsWith("photo:")) {
      return;
    }
    const activePhotoId = Number(mapTarget.replace("photo:", ""));
    const exists = mapPhotoOptions.some(
      (photo) => Number(photo.id) === Number(activePhotoId),
    );
    if (!exists) {
      setMapTarget(`diagram:${defaultDiagramKey}`);
    }
  }, [mapPhotoOptions, mapTarget, defaultDiagramKey]);
  useEffect(() => {
    if (!String(patientGenderRaw || "").trim()) return;
    if (!mapTarget.startsWith("diagram:")) return;
    if (
      mapTarget === "diagram:female_front" ||
      mapTarget === "diagram:male_front"
    ) {
      const next = `diagram:${defaultDiagramKey}`;
      if (next !== mapTarget) setMapTarget(next);
    }
  }, [patientGenderRaw, mapTarget, defaultDiagramKey]);
  const selectedTargetPhotoId = mapTarget.startsWith("photo:")
    ? Number(mapTarget.replace("photo:", ""))
    : null;
  const selectedTargetPhoto = mapPhotoOptions.find(
    (photo) => Number(photo.id) === Number(selectedTargetPhotoId),
  );
  const mapBaseImageUrl = isDiagramTarget
    ? selectedDiagram?.src || ""
    : selectedTargetPhoto?.url || "";
  const visiblePoints = mapPoints.filter((point) => {
    if (isDiagramTarget) {
      return (
        !point.photo_id &&
        String(point.diagram_key || defaultDiagramKey) ===
          String(selectedDiagramKey)
      );
    }
    return Number(point.photo_id) === Number(selectedTargetPhotoId);
  });
  const pointNumberById = useMemo(() => {
    const scopedPoints = [...visiblePoints].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
    const seq = new Map();
    scopedPoints.forEach((point, index) => {
      seq.set(Number(point.id), index + 1);
    });
    return seq;
  }, [visiblePoints]);
  useEffect(() => {
    if (isDiagramTarget) {
      setMapDiagramLoadError(false);
    }
  }, [isDiagramTarget, mapTarget]);

  const resetMapDraft = () => {
    setMapAnatomyLabel("");
    setMapNote("");
    setMapUnit("");
    setMapProductId("");
    setPendingMapClick(null);
    setSelectedPointId(null);
  };

  const handleMapSurfaceClick = (event) => {
    if (!canAssign || sessionCompleted || !session?.id) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    setPendingMapClick({ x, y });
    setMapAnatomyLabel(
      isDiagramTarget ? nearestFaceZoneLabel(x, y) : "Photo point",
    );
    setSelectedPointId(null);
  };

  const handleSaveMapPoint = async () => {
    if (!session?.id || !pendingMapClick || savingPoint) return;
    if (!String(mapAnatomyLabel || "").trim()) {
      pushToast({
        message: "Please select anatomical label.",
        severity: "warning",
      });
      return;
    }
    setSavingPoint(true);
    try {
      const payload = {
        x_position: pendingMapClick.x,
        y_position: pendingMapClick.y,
        photo_id: isDiagramTarget ? null : selectedTargetPhotoId,
        diagram_key: isDiagramTarget ? selectedDiagramKey : null,
        note: composeLabelledNote(mapAnatomyLabel, mapNote),
        unit: mapUnit || null,
        product_id: mapProductId ? Number(mapProductId) : null,
      };
      const created = await createTreatmentMapPoint(session.id, payload);
      setMapPoints((prev) => [created, ...prev]);
      resetMapDraft();
      pushToast({ message: "Map point added.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not add map point."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handleUpdateSelectedMapPoint = async () => {
    if (!selectedPointId || savingPoint) return;
    if (!String(mapAnatomyLabel || "").trim()) {
      pushToast({
        message: "Please select anatomical label.",
        severity: "warning",
      });
      return;
    }
    setSavingPoint(true);
    try {
      const updated = await updateTreatmentMapPoint(selectedPointId, {
        photo_id: isDiagramTarget ? null : selectedTargetPhotoId,
        diagram_key: isDiagramTarget ? selectedDiagramKey : null,
        note: composeLabelledNote(mapAnatomyLabel, mapNote),
        unit: mapUnit || null,
        product_id: mapProductId ? Number(mapProductId) : null,
      });
      setMapPoints((prev) =>
        prev.map((p) => (Number(p.id) === Number(updated.id) ? updated : p)),
      );
      pushToast({ message: "Map point updated.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update point."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handleDeleteMapPoint = async (pointId) => {
    const approved = await askConfirm({
      title: "Delete map point?",
      message:
        "This removes the anatomical marker from this treatment session.",
      confirmText: "Delete point",
    });
    if (!approved) return;
    try {
      await deleteTreatmentMapPoint(pointId);
      setMapPoints((prev) =>
        prev.filter((point) => Number(point.id) !== Number(pointId)),
      );
      if (Number(selectedPointId) === Number(pointId)) resetMapDraft();
      pushToast({ message: "Map point deleted.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not delete point."),
        severity: "error",
      });
    }
  };

  const handleCaptureMapPhoto = async (file) => {
    if (!file || !visit?.id || photoUploading) return;
    setPhotoUploading(true);
    try {
      const uploaded = await uploadPhoto(
        visit.id,
        file,
        mapUploadType,
        "treatment",
        {
          body_area: mapUploadBodyArea || "face",
          side: mapUploadSide || undefined,
        },
      );
      await loadVisitPhotos();
      if (uploaded?.id != null) {
        setMapTarget(`photo:${uploaded.id}`);
      }
      pushToast({ message: "Treatment photo captured.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not capture treatment photo."),
        severity: "error",
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeleteMapPhoto = async (photo) => {
    if (!photo?.id) return;
    const linkedPointCount =
      Number(photo.map_points_count) ||
      mapPoints.filter((point) => Number(point.photo_id) === Number(photo.id))
        .length;
    const linkedCompletedPointCount =
      Number(photo.completed_map_points_count) || 0;
    if (linkedCompletedPointCount > 0) {
      pushToast({
        message:
          "Cannot delete: this photo is linked to a completed treatment session.",
        severity: "warning",
      });
      return;
    }
    const baseConfirm = await askConfirm({
      title: "Delete this treatment photo?",
      message:
        "This will permanently remove the uploaded image from this visit.",
      confirmText: "Delete photo",
    });
    if (!baseConfirm) return;
    if (linkedPointCount > 0) {
      const confirmWithPoints = await askConfirm({
        title: "Photo has mapped points",
        message: `This photo has ${linkedPointCount} anatomical map point(s). Deleting it will also remove those point references.`,
        confirmText: "Delete anyway",
      });
      if (!confirmWithPoints) return;
    }
    try {
      await deletePhoto(photo.id);
      const nextPhotos = await loadVisitPhotos();
      setMapPoints((prev) =>
        prev.filter((point) => Number(point.photo_id) !== Number(photo.id)),
      );
      if (mapTarget === `photo:${photo.id}`) {
        const remaining = nextPhotos
          .filter(
            (row) => row?.stage === "treatment" || row?.body_area === "face",
          )
          .sort((a, b) => Number(b.id) - Number(a.id));
        setMapTarget(
          remaining[0]?.id
            ? `photo:${remaining[0].id}`
            : `diagram:${defaultDiagramKey}`,
        );
      }
      pushToast({ message: "Treatment photo deleted.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not delete treatment photo."),
        severity: "error",
      });
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        p: 2,
        borderColor: sessionCompleted ? "success.light" : "divider",
        bgcolor: (theme) =>
          sessionCompleted
            ? theme.palette.mode === "dark"
              ? "rgba(34,197,94,0.12)"
              : "rgba(236,255,245,0.82)"
            : theme.palette.mode === "dark"
              ? "rgba(22,27,34,0.72)"
              : "rgba(255,246,252,0.78)",
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 1.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {canAssign && canEditThisSession ? (
            <TextField
              label="Session name"
              size="small"
              fullWidth
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={() => saveSessionNameIfChanged()}
              disabled={nameSaving}
            />
          ) : (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {session.name || "Treatment session"}
            </Typography>
          )}
        </Box>
        <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
          <Chip
            size="small"
            label={sessionStatusLabel(session.status)}
            color={sessionCompleted ? "success" : "default"}
            sx={{ fontWeight: 600 }}
          />
          {canAssign && canEditThisSession && (
            <IconButton
              size="small"
              color="error"
              title="Delete session"
              aria-label="Delete session"
              onClick={handleDeleteSession}
              disabled={deleting}
            >
              {deleting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DeleteOutlineIcon />
              )}
            </IconButton>
          )}
        </Stack>
      </Stack>

      {assignedDoctorName && !canEditThisSession && !sessionCompleted ? (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 13 }}>
          Assigned to {assignedDoctorName}. You cannot edit this session.
        </Alert>
      ) : null}

      {canAssign && canEditThisSession ? (
        <TextField
          label="Session notes"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          onBlur={() => saveSessionNotesIfChanged()}
          disabled={notesSaving}
          sx={{ mb: 2 }}
          placeholder="Visible to your team; editable before and after the session is marked done."
        />
      ) : (
        session.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Notes:</strong> {session.notes}
          </Typography>
        )
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Select Treatment
      </Typography>
      {!canAssign ? (
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Preset:</strong>{" "}
          {session.treatment_template?.name ?? "None (ad-hoc)"}
          {session.treatment_template?.duration_minutes != null
            ? ` · ${session.treatment_template.duration_minutes} min`
            : ""}
        </Typography>
      ) : templatesLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Loading templates…
        </Typography>
      ) : (
        <FormControl
          size="small"
          fullWidth
          disabled={sessionCompleted || templateSaving}
          sx={{ mb: 1.5 }}
        >
          <Select
            key={session.id}
            label=""
            value={templateSelectValue}
            onChange={handleTemplateChange}
          >
            <MenuItem value="">None (ad-hoc)</MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.name}
                {t.duration_minutes != null
                  ? ` · ${t.duration_minutes} min`
                  : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {Array.isArray(session.treatment_template?.steps) &&
        session.treatment_template.steps.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Suggested steps
            </Typography>
            <Stack component="ol" sx={{ m: 0, pl: 2.5, mt: 0.5 }} spacing={0.5}>
              {session.treatment_template.steps.map((s) => (
                <Typography key={s.id} component="li" variant="body2">
                  <strong>{s.title}</strong>
                  {s.description ? ` — ${s.description}` : ""}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Procedure record (this session)
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1.25 }}
      >
        Charts stay editable until this session is marked done, then they are
        locked. Assigned doctor or therapist (or Visit History editors) can update
        records.
      </Typography>
      {canAssign && !sessionCompleted && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "flex-start" }}
          sx={{ mb: 1.5 }}
        >
          <FormControl size="small" fullWidth sx={{ flex: 1 }}>
            <InputLabel>Add procedure form</InputLabel>
            <Select
              label="Add procedure form"
              value={selectedExtraProcedureId}
              onChange={(e) => setSelectedExtraProcedureId(e.target.value)}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {procedureFormCatalog
                .filter(
                  (f) =>
                    !procedureRows.some(
                      (r) => Number(r.form_id) === Number(f.id),
                    ),
                )
                .map((f) => (
                  <MenuItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            disabled={!selectedExtraProcedureId || addingExtraProcedure}
            onClick={handleAddExtraProcedureForm}
          >
            {addingExtraProcedure ? "Adding…" : "Add"}
          </Button>
        </Stack>
      )}
      {procedureRowsLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Loading procedure forms…
        </Typography>
      ) : procedureRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {!session.treatment_template_id
            ? "No procedure charts yet. Add one above, or choose a preset for template-linked procedure forms."
            : "No procedure forms are linked to this preset. Add charts in Inventory → Treatment templates → Required forms, or attach forms above."}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ mb: 2 }}>
          {procedureRows.map((row) => {
            const submitterId =
              row?.submitted_by && typeof row.submitted_by === "object"
                ? row.submitted_by.id
                : row?.submitted_by;
            const canEditRow = mayFillOrEditProcedure(submitterId);
            const label = row.id
              ? canEditRow
                ? "Edit"
                : "View"
              : canEditRow
                ? "Fill in"
                : "View";
            const secondaryExtra = row.id
              ? canEditRow
                ? "Editable while session is open"
                : "View only"
              : "Not saved yet for this session.";
            return (
              <ListItem
                key={`${session.id}-${row.form_id}`}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 0.75,
                  pr: 14,
                }}
                secondaryAction={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {canAssign &&
                    !sessionCompleted &&
                    extraProcedureDefIdSet.has(Number(row.form_id)) ? (
                      <IconButton
                        size="small"
                        aria-label="Remove procedure form from session"
                        onClick={() =>
                          handleRemoveExtraProcedureForm(row.form_id)
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openProcedureFormEditor(row)}
                    >
                      {label}
                    </Button>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={0.75}
                      flexWrap="wrap"
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                      >
                        {row.form_name || "Procedure form"}
                      </Typography>
                      {row.is_required ? (
                        <Chip
                          size="small"
                          label="Required to mark done"
                          color="warning"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                  }
                  secondary={
                    row.id
                      ? `Last updated: ${new Date(
                          row.updated_at ?? row.created_at ?? Date.now(),
                        ).toLocaleString()} · ${secondaryExtra}`
                      : secondaryExtra
                  }
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Products for this session
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
      >
        {sessionCompleted
          ? "Recorded products are fixed after mark done. You can still edit the session name and notes above."
          : "Quantities are deducted when you mark this session done. Use Mark Done on Visit History only after every session here is completed."}
      </Typography>
      {sessionLines.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 13, mb: 1 }}>
          No products added. Add lines below or choose a template with preset
          products.
        </Alert>
      ) : (
        <Table size="small" sx={{ mb: 1.5 }}>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(238,215,246,0.44)",
              }}
            >
              <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                Product
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                SKU
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                Qty
              </TableCell>
              <TableCell
                sx={{ fontWeight: 700, fontSize: 12, py: 1 }}
                align="right"
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {sessionLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell sx={{ fontSize: 12 }}>
                  {line.product?.name ?? "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {line.product?.sku ?? "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12, width: 100 }}>
                  <TextField
                    type="number"
                    size="small"
                    defaultValue={line.quantity}
                    disabled={sessionCompleted || !canAssign}
                    inputProps={{ min: 1 }}
                    onBlur={(e) => handleQtyBlur(line.id, e.target.value)}
                    sx={{ width: 88 }}
                  />
                </TableCell>
                <TableCell align="right">
                  {canAssign && !sessionCompleted && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveLine(line.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canAssign && !sessionCompleted && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel>Add product</InputLabel>
            <Select
              label="Add product"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
            >
              <MenuItem value="">Select…</MenuItem>
              {productOptions.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Qty"
            type="number"
            size="small"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ width: 88 }}
          />
          <Button
            variant="outlined"
            onClick={handleAddProduct}
            disabled={addProductLoading || !newProductId}
          >
            {addProductLoading ? "Adding…" : "Add"}
          </Button>
        </Stack>
      )}
      {sessionCompleted && committedLines.length > 0 && (
        <>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block" }}
          >
            Recorded usage (completed)
          </Typography>
          <Table size="small" sx={{ mt: 0.5, mb: 2 }}>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(238,215,246,0.44)",
                }}
              >
                {["Product", "Batch", "Qty"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: 700, fontSize: 12, py: 1 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {committedLines.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.product?.name ?? "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.batch?.batch_number ?? row.batch_id ?? "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.quantity_used}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Procedure lines
      </Typography>
      {items.length === 0 ? (
        <Alert severity="warning" sx={{ fontSize: 13, mb: 1.5 }}>
          No procedure lines on this session (optional if you only track
          products).
        </Alert>
      ) : (
        <Table size="small" sx={{ mb: 1.5 }}>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(238,215,246,0.44)",
              }}
            >
              {["Procedure", "Product", "Dosage", "Unit", "Area"].map((h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, fontSize: 12, py: 1 }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.procedure_name || "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.product_name || "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.dosage || "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.unit || "—"}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.treatment_area || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TreatmentPackageSection
        visit={visit}
        session={session}
        sessionCompleted={sessionCompleted}
        canAssign={canAssign}
        onVisitUpdated={onVisitUpdated}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, mt: 2 }}>
        Anatomical mapping
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
      >
        Visual-first injection/treatment mapping for aesthetic clinical
        documentation.
      </Typography>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        sx={{ mb: 1.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
            <InputLabel id={`map-target-${session.id}`}>Map target</InputLabel>
            <Select
              labelId={`map-target-${session.id}`}
              label="Map target"
              value={mapTarget}
              onChange={(e) => {
                setMapTarget(e.target.value);
                setPendingMapClick(null);
                setSelectedPointId(null);
              }}
            >
              {DIAGRAM_OPTIONS.map((diagram) => (
                <MenuItem key={diagram.key} value={`diagram:${diagram.key}`}>
                  {diagram.label}
                </MenuItem>
              ))}
              {mapPhotoOptions.map((photo) => (
                <MenuItem key={photo.id} value={`photo:${photo.id}`}>
                  Treatment photo #{photo.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {mapPhotoOptions.length > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              sx={{ mb: 1 }}
            >
              {mapPhotoOptions.slice(0, 8).map((photo) => (
                <Chip
                  key={photo.id}
                  size="small"
                  variant={
                    mapTarget === `photo:${photo.id}` ? "filled" : "outlined"
                  }
                  color={
                    mapTarget === `photo:${photo.id}` ? "primary" : "default"
                  }
                  label={
                    Number(photo.completed_map_points_count || 0) > 0
                      ? `#${photo.id} ${photo.type || ""} · Locked by completed session`
                      : `#${photo.id} ${photo.type || ""}`
                  }
                  onClick={() => setMapTarget(`photo:${photo.id}`)}
                  onDelete={
                    canAssign &&
                    !sessionCompleted &&
                    Number(photo.completed_map_points_count || 0) === 0
                      ? () => handleDeleteMapPhoto(photo)
                      : undefined
                  }
                  deleteIcon={<DeleteOutlineIcon />}
                />
              ))}
            </Stack>
          )}
          {canAssign && !sessionCompleted && (
            <Stack spacing={1} sx={{ mb: 1 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id={`map-upload-type-${session.id}`}>
                    Type
                  </InputLabel>
                  <Select
                    labelId={`map-upload-type-${session.id}`}
                    label="Type"
                    value={mapUploadType}
                    onChange={(e) => setMapUploadType(e.target.value)}
                    disabled={photoUploading}
                  >
                    <MenuItem value="before">Before</MenuItem>
                    <MenuItem value="after">After</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel id={`map-upload-area-${session.id}`}>
                    Area
                  </InputLabel>
                  <Select
                    labelId={`map-upload-area-${session.id}`}
                    label="Area"
                    value={mapUploadBodyArea}
                    onChange={(e) => setMapUploadBodyArea(e.target.value)}
                    disabled={photoUploading}
                  >
                    {BODY_AREA_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel id={`map-upload-side-${session.id}`}>
                    Side
                  </InputLabel>
                  <Select
                    labelId={`map-upload-side-${session.id}`}
                    label="Side"
                    value={mapUploadSide}
                    onChange={(e) => setMapUploadSide(e.target.value)}
                    disabled={photoUploading}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  disabled={photoUploading}
                >
                  {photoUploading ? "Uploading..." : "Take photo"}
                  <input
                    hidden
                    type="file"
                    accept="image/*,image/heic,image/heif,.heic,.heif"
                    capture="environment"
                    onChange={(e) => {
                      handleCaptureMapPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </Button>
                <Button
                  size="small"
                  variant="text"
                  component="label"
                  disabled={photoUploading}
                >
                  Upload file
                  <input
                    hidden
                    type="file"
                    accept="image/*,image/heic,image/heif,.heic,.heif"
                    onChange={(e) => {
                      handleCaptureMapPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </Button>
              </Stack>
            </Stack>
          )}
          <Box
            onClick={handleMapSurfaceClick}
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              aspectRatio: "1/1",
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
              cursor: canAssign && !sessionCompleted ? "crosshair" : "default",
              bgcolor: "action.hover",
              mx: { xs: "auto", md: 0 },
            }}
          >
            {mapBaseImageUrl && !(isDiagramTarget && mapDiagramLoadError) ? (
              <Box
                component="img"
                src={mapBaseImageUrl}
                alt={
                  isDiagramTarget
                    ? `${selectedDiagram?.label || "Face"} diagram`
                    : "Treatment map photo"
                }
                onLoad={() => {
                  if (isDiagramTarget) setMapDiagramLoadError(false);
                }}
                onError={() => {
                  if (isDiagramTarget) setMapDiagramLoadError(true);
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  px: 2,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  textAlign="center"
                >
                  {isDiagramTarget
                    ? "Diagram file missing. Add files in public/images/diagrams (female-front/left/right, male-front/left/right)."
                    : "No treatment photo available for mapping yet. Choose face diagram or upload treatment photos."}
                </Typography>
              </Box>
            )}
            {visiblePoints.map((point, idx) => (
              <Box
                key={point.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPointId(point.id);
                  setPendingMapClick({
                    x: clamp01(point.x_position),
                    y: clamp01(point.y_position),
                  });
                }}
                sx={{
                  position: "absolute",
                  left: `${clamp01(point.x_position) * 100}%`,
                  top: `${clamp01(point.y_position) * 100}%`,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor:
                    Number(selectedPointId) === Number(point.id)
                      ? "error.main"
                      : "primary.main",
                  border: "2px solid white",
                  boxShadow: 2,
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {pointNumberById.get(Number(point.id)) || idx + 1}
              </Box>
            ))}
            {pendingMapClick && canAssign && !sessionCompleted && (
              <Box
                sx={{
                  position: "absolute",
                  left: `${pendingMapClick.x * 100}%`,
                  top: `${pendingMapClick.y * 100}%`,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  border: "2px dashed",
                  borderColor: "warning.main",
                  bgcolor: "rgba(255,255,255,0.45)",
                  pointerEvents: "none",
                }}
              />
            )}
          </Box>
        </Box>
        <Stack sx={{ width: { xs: "100%", md: 260 } }} spacing={1}>
          <FormControl
            size="small"
            fullWidth
            disabled={!canAssign || sessionCompleted}
          >
            <InputLabel id={`map-label-${session.id}`}>
              Anatomical label
            </InputLabel>
            <Select
              labelId={`map-label-${session.id}`}
              label="Anatomical label"
              value={mapAnatomyLabel}
              onChange={(e) => setMapAnatomyLabel(e.target.value)}
            >
              {FACE_ZONE_LABELS.map((zone) => (
                <MenuItem key={zone.value} value={zone.value}>
                  {zone.value}
                </MenuItem>
              ))}
              <MenuItem value="Photo point">Photo point</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Point note"
            value={mapNote}
            onChange={(e) => setMapNote(e.target.value)}
            disabled={!canAssign || sessionCompleted}
          />
          <TextField
            size="small"
            label="Unit / dosage"
            placeholder="e.g. Botox 4U"
            value={mapUnit}
            onChange={(e) => setMapUnit(e.target.value)}
            disabled={!canAssign || sessionCompleted}
          />
          <FormControl
            size="small"
            fullWidth
            disabled={!canAssign || sessionCompleted}
          >
            <InputLabel id={`map-product-${session.id}`}>Product</InputLabel>
            <Select
              labelId={`map-product-${session.id}`}
              label="Product"
              value={mapProductId}
              onChange={(e) => setMapProductId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {productOptions.map((product) => (
                <MenuItem key={product.id} value={String(product.id)}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleSaveMapPoint}
            disabled={
              !canAssign || sessionCompleted || !pendingMapClick || savingPoint
            }
          >
            {savingPoint ? "Saving..." : "Save new point"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleUpdateSelectedMapPoint}
            disabled={
              !canAssign || sessionCompleted || !selectedPointId || savingPoint
            }
          >
            Update selected point
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={resetMapDraft}
            disabled={savingPoint}
          >
            Clear selection
          </Button>
          <Typography variant="caption" color="text.secondary">
            Click diagram/photo to place a marker. Label is required for
            clinical cross-check.
          </Typography>
        </Stack>
      </Stack>
      {visiblePoints.length > 0 && (
        <List dense sx={{ mb: 1.5 }}>
          {visiblePoints.slice(0, 8).map((point) => (
            <ListItem key={point.id} sx={{ px: 0 }}>
              {(() => {
                const parsed = extractLabelAndNote(point.note);
                return (
                  <>
                    <Chip
                      size="small"
                      label={`#${pointNumberById.get(Number(point.id)) || "?"}`}
                      color="secondary"
                      variant="outlined"
                      sx={{ mr: 0.75, minWidth: 42, justifyContent: "center" }}
                    />
                    <Chip
                      size="small"
                      label={parsed.label || "Unlabelled"}
                      color={parsed.label ? "primary" : "default"}
                      variant={parsed.label ? "filled" : "outlined"}
                      sx={{ mr: 1 }}
                    />
                    <ListItemText
                      primary={parsed.note || "Treatment point"}
                      secondary={`x:${point.x_position}, y:${point.y_position}${point.unit ? ` · ${point.unit}` : ""}`}
                    />
                  </>
                );
              })()}
              {canAssign && !sessionCompleted && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteMapPoint(point.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </ListItem>
          ))}
        </List>
      )}

      {canAssign && !sessionCompleted && (
        <Button
          variant="contained"
          color="success"
          startIcon={
            completing ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <TaskAltIcon />
            )
          }
          onClick={handleMarkSessionDone}
          disabled={completing}
        >
          {completing ? "Saving…" : "Mark session done"}
        </Button>
      )}

      <Dialog
        open={procFormDialogOpen}
        onClose={() => !procFormSaving && setProcFormDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{procActiveFormName || "Procedure form"}</DialogTitle>
        <DialogContent>
          {procFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {procFormError}
            </Alert>
          )}
          {procActiveFormReadOnly && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {sessionCompleted
                ? "Read only: this session is marked done and procedure records are locked."
                : "Read only: you do not have permission to edit this procedure record."}
            </Alert>
          )}
          {procActiveFormFields.length > 0 ? (
            <DynamicFormRenderer
              fields={procActiveFormFields}
              formData={procActiveFormData}
              onChange={(name, value) => {
                if (procActiveFormReadOnly) return;
                setProcActiveFormData((prev) => ({ ...prev, [name]: value }));
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Loading form fields...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setProcFormDialogOpen(false)}
            disabled={procFormSaving}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProcedureForm}
            disabled={
              procActiveFormReadOnly ||
              procFormSaving ||
              !procActiveFormFields.length
            }
          >
            {procActiveFormReadOnly
              ? "Read only"
              : procFormSaving
                ? "Saving…"
                : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
