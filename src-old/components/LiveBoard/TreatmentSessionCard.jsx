import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  ListSubheader,
  IconButton,
  Switch,
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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
  submitTreatmentApproval,
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
import TreatmentStockWarningAlert from "./TreatmentStockWarningAlert";
import {
  getTreatmentStockWarnings,
  isSessionProductOutOfStock,
} from "../../utils/treatmentStockWarnings";
import {
  canEditProcedureRecordOnVisit,
  canUpdateLiveboard,
} from "../../utils/roleUtils";
import { hasRole } from "../../utils/accessUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import {
  BODY_AREA_OPTIONS,
  shortVisitPhotoCaption,
} from "../../utils/visitPhotoLabels";
import {
  COPY,
  allowsFractionalQty,
  formatSessionQtyDisplay,
  parseSessionQty,
  productPickerSubtitle,
} from "../../utils/inventoryUnitsCopy";
import ProductPickerMenuItem from "../inventory/ProductPickerMenuItem";
import {
  DIAGRAM_OPTIONS,
  DIAGRAM_OPTION_BY_KEY,
  resolveDefaultDiagramKeyByGender,
  resolvePreferredMapTarget,
} from "../../utils/diagramProfiles";
import {
  ANNOTATION_TYPES,
  MAP_TOOLS,
  clamp01,
  composeLabelledNote,
  extractLabelAndNote,
  minifyPathPoints,
  nearestZoneLabel,
  resolveAnnotationType,
  resolvePathStyle,
  resolveZoneLabelsForDiagram,
} from "../../utils/diagramAnnotations";
import TreatmentDiagramCanvas from "./TreatmentDiagramCanvas";
import TreatmentMapEditorDialog from "./TreatmentMapEditorDialog";
import { formatKyats } from "../../utils/formatKyats";

const scrollableTableContainerSx = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  maxWidth: "100%",
  mb: 1.5,
};

function sessionStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  if (status === "planned") return "Planned";
  if (status === "cancelled") return "Cancelled";
  return status ?? "—";
}

function resolveLineProduct(line, productOptions) {
  const productId = line.product_id ?? line.product?.id;
  const fromPicker =
    productId != null
      ? productOptions.find((p) => String(p.id) === String(productId))
      : null;
  return fromPicker ? { ...line.product, ...fromPicker } : line.product;
}

function resolveLineSellingPrice(line, productOptions) {
  const product = resolveLineProduct(line, productOptions);
  if (product?.selling_price != null && product.selling_price !== "") {
    return product.selling_price;
  }
  return null;
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
  const [mapTool, setMapTool] = useState(MAP_TOOLS.INJECTION);
  const [mapEditorOpen, setMapEditorOpen] = useState(false);
  const mapTargetUserPickedRef = useRef(false);
  const sessionCompleted = session.status === "completed";
  const plannedPackageItemIds = useMemo(
    () =>
      (visit?.appointment?.planned_package_items ?? []).map((row) =>
        Number(row.id),
      ),
    [visit?.appointment?.planned_package_items],
  );
  const { user: sessionAuthUser } = useAuthStore();
  const canEditThisSession =
    !sessionCompleted &&
    canEditProcedureRecordOnVisit(sessionAuthUser, visit, session);
  const assignedDoctorName = session.assigned_doctor?.name ?? null;
  const workspacePrefix = getWorkspaceUrlPrefix(sessionAuthUser);
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
          list.filter(
            (f) =>
              f.form_type === "procedure" &&
              (f.is_usable ?? (f.is_active && f.published_version)),
          ),
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
    if (!session?.id) {
      setMapPoints([]);
      return;
    }
    mapTargetUserPickedRef.current = false;
    let cancelled = false;
    listTreatmentMapPoints(session.id)
      .then((rows) => {
        if (!cancelled) setMapPoints(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setMapPoints([]);
      });
    return () => {
      cancelled = true;
    };
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
    const annotationType = resolveAnnotationType(activePoint);
    const diagramKey = activePoint.diagram_key || defaultDiagramKey;
    setMapAnatomyLabel(
      parsed.label ||
        (annotationType === ANNOTATION_TYPES.POINT
          ? activePoint.photo_id
            ? "Photo point"
            : nearestZoneLabel(
                activePoint.x_position,
                activePoint.y_position,
                diagramKey,
              )
          : annotationType === ANNOTATION_TYPES.PATH
            ? resolvePathStyle(activePoint) === MAP_TOOLS.SUTURE
              ? "Suture"
              : "Incision"
            : "Label"),
    );
    setMapNote(parsed.note);
    setMapUnit(activePoint.unit ?? "");
    setMapProductId(
      activePoint.product_id != null ? String(activePoint.product_id) : "",
    );
    setMapTarget(
      activePoint.photo_id
        ? `photo:${activePoint.photo_id}`
        : `diagram:${diagramKey}`,
    );
    if (annotationType === ANNOTATION_TYPES.POINT) {
      setPendingMapClick({
        x: clamp01(activePoint.x_position),
        y: clamp01(activePoint.y_position),
      });
    } else {
      setPendingMapClick(null);
    }
  }, [selectedPointId, mapPoints, defaultDiagramKey]);
  const sessionLines = session.session_products ?? [];
  const committedLines = session.patient_treatment_products ?? [];
  const presetProductLines = useMemo(
    () => sessionLines.filter((line) => line.source === "template"),
    [sessionLines],
  );
  const additionalProductLines = useMemo(
    () => sessionLines.filter((line) => line.source !== "template"),
    [sessionLines],
  );
  const additionalStockWarnings = useMemo(() => {
    const warnings = getTreatmentStockWarnings(session);
    const additionalLineIds = new Set(
      additionalProductLines.map((line) => Number(line.id)),
    );
    return warnings.filter((warning) =>
      additionalLineIds.has(Number(warning.session_product_id)),
    );
  }, [session, additionalProductLines]);

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

  const handleQtyBlur = async (lineId, value, product) => {
    const q = parseSessionQty(value, product);
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

  const handleBillableToggle = async (lineId, isBillable) => {
    try {
      await updateSessionProduct(lineId, { is_billable: isBillable });
      await refreshVisit();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update billing option."),
        severity: "error",
      });
    }
  };

  const handleAddProduct = async () => {
    if (!session?.id || !newProductId) return;
    const picked = productOptions.find(
      (p) => String(p.id) === String(newProductId),
    );
    const q = parseSessionQty(newQty, picked);
    setAddProductLoading(true);
    try {
      await addSessionProduct(session.id, {
        product_id: Number(newProductId),
        quantity: q,
        is_billable: true,
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
    if (mapTargetUserPickedRef.current) return;
    const preferred = resolvePreferredMapTarget(
      mapPoints,
      defaultDiagramKey,
      mapPhotoOptions,
    );
    setMapTarget((current) => (current === preferred ? current : preferred));
  }, [mapPoints, mapPhotoOptions, defaultDiagramKey]);

  useEffect(() => {
    if (!mapTarget.startsWith("photo:")) {
      return;
    }
    const activePhotoId = Number(mapTarget.replace("photo:", ""));
    const exists = mapPhotoOptions.some(
      (photo) => Number(photo.id) === Number(activePhotoId),
    );
    if (!exists) {
      const fallback = resolvePreferredMapTarget(
        mapPoints,
        defaultDiagramKey,
        mapPhotoOptions,
      );
      setMapTarget(fallback);
    }
  }, [mapPhotoOptions, mapTarget, defaultDiagramKey, mapPoints]);
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
  const visibleAnnotations = mapPoints.filter((point) => {
    if (isDiagramTarget) {
      return (
        !point.photo_id &&
        String(point.diagram_key || defaultDiagramKey) ===
          String(selectedDiagramKey)
      );
    }
    return Number(point.photo_id) === Number(selectedTargetPhotoId);
  });
  const selectedAnnotation = useMemo(
    () =>
      mapPoints.find((point) => Number(point.id) === Number(selectedPointId)) ??
      null,
    [mapPoints, selectedPointId],
  );
  const selectedAnnotationType = resolveAnnotationType(selectedAnnotation);
  const isInjectionSelection =
    !selectedAnnotation || selectedAnnotationType === ANNOTATION_TYPES.POINT;
  const zoneLabelOptions = useMemo(() => {
    if (!isDiagramTarget) return [{ value: "Photo point" }];
    return [
      ...resolveZoneLabelsForDiagram(selectedDiagramKey).map((zone) => ({
        value: zone.value,
      })),
      { value: "Photo point" },
    ];
  }, [isDiagramTarget, selectedDiagramKey]);
  const pointNumberById = useMemo(() => {
    const scopedPoints = [...visibleAnnotations]
      .filter(
        (point) => resolveAnnotationType(point) === ANNOTATION_TYPES.POINT,
      )
      .sort((a, b) => Number(a.id) - Number(b.id));
    const seq = new Map();
    scopedPoints.forEach((point, index) => {
      seq.set(Number(point.id), index + 1);
    });
    return seq;
  }, [visibleAnnotations]);
  const assignedTherapistIds = useMemo(() => {
    const ids = new Set();
    if (visit?.therapist_id != null) ids.add(Number(visit.therapist_id));
    if (visit?.therapist?.id != null) ids.add(Number(visit.therapist.id));
    (Array.isArray(visit?.therapists) ? visit.therapists : []).forEach(
      (therapist) => {
        if (therapist?.id != null) ids.add(Number(therapist.id));
      },
    );
    if (session?.therapist_id != null) ids.add(Number(session.therapist_id));
    return ids;
  }, [visit, session?.therapist_id]);
  const isAssignedTherapistForSession =
    sessionAuthUser?.id != null &&
    assignedTherapistIds.has(Number(sessionAuthUser.id));
  const canSubmitApproval =
    sessionCompleted &&
    session?.approval_status !== "approved" &&
    (isAssignedTherapistForSession || hasRole(sessionAuthUser, "owner"));
  const canReviewApproval =
    hasRole(sessionAuthUser, "owner") ||
    hasRole(sessionAuthUser, "doctor") ||
    hasRole(sessionAuthUser, "dermatologist");
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

  const buildMapTargetPayload = () => ({
    photo_id: isDiagramTarget ? null : selectedTargetPhotoId,
    diagram_key: isDiagramTarget ? selectedDiagramKey : null,
  });

  const handleInjectionClickAutoSave = async (pos) => {
    if (!canAssign || sessionCompleted || !session?.id || savingPoint) return;
    const label = isDiagramTarget
      ? nearestZoneLabel(pos.x, pos.y, selectedDiagramKey)
      : "Photo point";
    setSavingPoint(true);
    try {
      const created = await createTreatmentMapPoint(session.id, {
        ...buildMapTargetPayload(),
        x_position: pos.x,
        y_position: pos.y,
        annotation_type: ANNOTATION_TYPES.POINT,
        note: composeLabelledNote(label, ""),
        unit: null,
        product_id: null,
      });
      setMapPoints((prev) => [created, ...prev]);
      setSelectedPointId(created.id);
      setPendingMapClick(null);
      setMapAnatomyLabel(label);
      setMapNote("");
      setMapUnit("");
      setMapProductId("");
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not add map point."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handlePathComplete = async ({ points, style }) => {
    const normalizedPoints = minifyPathPoints(points);
    if (!session?.id || savingPoint || normalizedPoints.length < 2) return;
    setSavingPoint(true);
    try {
      const label = style === MAP_TOOLS.SUTURE ? "Suture" : "Incision";
      const created = await createTreatmentMapPoint(session.id, {
        ...buildMapTargetPayload(),
        x_position: normalizedPoints[0][0],
        y_position: normalizedPoints[0][1],
        annotation_type: ANNOTATION_TYPES.PATH,
        geometry: { points: normalizedPoints, style },
        note: `[${label}]`,
      });
      setMapPoints((prev) => [created, ...prev]);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save sketch."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handleTextPlace = async ({ x, y, text }) => {
    if (!session?.id || savingPoint) return;
    setSavingPoint(true);
    try {
      const created = await createTreatmentMapPoint(session.id, {
        ...buildMapTargetPayload(),
        x_position: x,
        y_position: y,
        annotation_type: ANNOTATION_TYPES.TEXT,
        geometry: { text },
        note: `[Label] ${text}`,
      });
      setMapPoints((prev) => [created, ...prev]);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save text label."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handleSelectAnnotation = (item) => {
    setSelectedPointId(item.id);
  };

  const handleUpdateSelectedMapPoint = async () => {
    if (!selectedPointId || savingPoint) return;
    if (isInjectionSelection && !String(mapAnatomyLabel || "").trim()) {
      pushToast({
        message: "Please select anatomical label.",
        severity: "warning",
      });
      return;
    }
    setSavingPoint(true);
    try {
      const updated = await updateTreatmentMapPoint(selectedPointId, {
        ...buildMapTargetPayload(),
        note: composeLabelledNote(mapAnatomyLabel, mapNote),
        unit: isInjectionSelection ? mapUnit || null : null,
        product_id:
          isInjectionSelection && mapProductId ? Number(mapProductId) : null,
      });
      setMapPoints((prev) =>
        prev.map((p) => (Number(p.id) === Number(updated.id) ? updated : p)),
      );
      pushToast({ message: "Annotation updated.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update annotation."),
        severity: "error",
      });
    } finally {
      setSavingPoint(false);
    }
  };

  const handleDeleteMapPoint = async (pointId) => {
    const approved = await askConfirm({
      title: "Delete annotation?",
      message: "This removes the marker or sketch from this treatment session.",
      confirmText: "Delete",
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
        mapTargetUserPickedRef.current = true;
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
        minWidth: 0,
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
                <LoadingIndicator size={20} />
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
        locked. Assigned doctor or therapist (or Live Board editors) can update
        records.
      </Typography>
      {canEditThisSession && (
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
            : "No procedure forms are linked to this preset. Add charts in Inventory → Treatments → Required forms, or attach forms above."}
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
                    {canEditThisSession &&
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
      {additionalStockWarnings.length > 0 ? (
        <TreatmentStockWarningAlert
          treatment={{ ...session, stock_warnings: additionalStockWarnings }}
          sx={{ mb: 1.5 }}
        />
      ) : null}
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
      >
        {sessionCompleted
          ? "Recorded products are fixed after mark done. You can still edit the session name and notes above."
          : "Preset products are included in the treatment price and are not billed separately. Out-of-stock preset products are skipped at mark done. Add extra products below; use Add to bill when they should appear on the invoice."}
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
      >
        Products included in the treatment price
      </Typography>
      {presetProductLines.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 13, mb: 1.5 }}>
          No preset products on this treatment. Choose a template with products
          or add extras below.
        </Alert>
      ) : (
        <TableContainer sx={scrollableTableContainerSx}>
          <Table size="small" sx={{ minWidth: 320 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                {["Product", "SKU", "Qty"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: 700, fontSize: 12, py: 1 }}
                  >
                    {h === "Qty" &&
                    presetProductLines[0]?.product?.use_unit_name
                      ? COPY.sessionQty(
                          presetProductLines[0].product.use_unit_name,
                        )
                      : h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {presetProductLines.map((line) => {
                const lineProduct = resolveLineProduct(line, productOptions);
                const outOfStock = isSessionProductOutOfStock(line);
                return (
                  <TableRow key={line.id}>
                    <TableCell sx={{ fontSize: 12, minWidth: 180 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <span>{lineProduct?.name ?? "—"}</span>
                        {outOfStock ? (
                          <Chip
                            size="small"
                            label="Out of stock"
                            color="error"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {lineProduct?.sku ?? "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {formatSessionQtyDisplay(line.quantity, lineProduct)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
      >
        Additional products
      </Typography>
      {additionalProductLines.length === 0 &&
      (sessionCompleted || !canAssign) ? (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          None added.
        </Typography>
      ) : (
        <TableContainer sx={scrollableTableContainerSx}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                  Product
                </TableCell>

                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                  {additionalProductLines[0]?.product?.use_unit_name
                    ? COPY.sessionQty(
                        additionalProductLines[0].product.use_unit_name,
                      )
                    : "Qty"}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                  Price
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1 }}>
                  Add to bill
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: 12, py: 1 }}
                  align="right"
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {additionalProductLines.map((line) => {
                const lineProduct = resolveLineProduct(line, productOptions);
                const outOfStock = isSessionProductOutOfStock(line);
                return (
                  <TableRow key={line.id}>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <span>{lineProduct?.name ?? "—"}</span>
                        {outOfStock ? (
                          <Chip
                            size="small"
                            label="Out of stock"
                            color="error"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ fontSize: 12, width: 100 }}>
                      <TextField
                        type="number"
                        size="small"
                        defaultValue={formatSessionQtyDisplay(
                          line.quantity,
                          lineProduct,
                        )}
                        disabled={sessionCompleted || !canAssign}
                        inputProps={{
                          min: allowsFractionalQty(lineProduct) ? 0.001 : 1,
                          step: allowsFractionalQty(lineProduct) ? 0.1 : 1,
                        }}
                        onBlur={(e) =>
                          handleQtyBlur(line.id, e.target.value, lineProduct)
                        }
                        sx={{ width: 88 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {formatKyats(
                        resolveLineSellingPrice(line, productOptions),
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Switch
                        size="small"
                        checked={line.is_billable !== false}
                        disabled={sessionCompleted || !canAssign}
                        onChange={(e) =>
                          handleBillableToggle(line.id, e.target.checked)
                        }
                        inputProps={{ "aria-label": "Add to bill" }}
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {canAssign && !sessionCompleted && (
        <Stack
          direction={"row"}
          spacing={1}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel>Add extra product</InputLabel>
            <Select
              label="Add extra product"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
            >
              <MenuItem value="">Select…</MenuItem>
              {productOptions.map((p) => (
                <ProductPickerMenuItem
                  key={p.id}
                  product={p}
                  value={String(p.id)}
                >
                  {productPickerSubtitle(p)}
                </ProductPickerMenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={
              productOptions.find((p) => String(p.id) === String(newProductId))
                ?.use_unit_name
                ? COPY.sessionQty(
                    productOptions.find(
                      (p) => String(p.id) === String(newProductId),
                    ).use_unit_name,
                  )
                : "Qty"
            }
            type="number"
            size="small"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            inputProps={{
              min: allowsFractionalQty(
                productOptions.find(
                  (p) => String(p.id) === String(newProductId),
                ),
              )
                ? 0.001
                : 1,
              step: allowsFractionalQty(
                productOptions.find(
                  (p) => String(p.id) === String(newProductId),
                ),
              )
                ? 0.1
                : 1,
            }}
            sx={{ width: 80 }}
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
          <TableContainer
            sx={{ ...scrollableTableContainerSx, mt: 0.5, mb: 2 }}
          >
            <Table size="small" sx={{ minWidth: 320 }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "background.default",
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
          </TableContainer>
        </>
      )}

      <TreatmentPackageSection
        visit={visit}
        session={session}
        sessionCompleted={sessionCompleted}
        canAssign={canAssign}
        onVisitUpdated={onVisitUpdated}
        plannedPackageItemIds={plannedPackageItemIds}
      />

      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Anatomical mapping
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Document where treatment was applied. Preview below is read-only;
              use the marking editor to annotate safely on mobile.
            </Typography>
          </Box>
          {visibleAnnotations.length > 0 && (
            <Chip
              size="small"
              label={`${visibleAnnotations.length} on view`}
              variant="outlined"
              color="primary"
            />
          )}
        </Stack>

        {canAssign && !sessionCompleted && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.5,
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
              bgcolor: "action.hover",
            }}
          >
            <Typography
              variant="caption"
              sx={{ display: "block", fontWeight: 700, mb: 0.25 }}
            >
              1. Upload for treatment record
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.25 }}
            >
              Set photo type and body part first, then capture or choose a file.
              The photo is saved to this visit and can be selected below for
              marking.
            </Typography>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id={`map-upload-type-${session.id}`}>
                    Photo type
                  </InputLabel>
                  <Select
                    labelId={`map-upload-type-${session.id}`}
                    label="Photo type"
                    value={mapUploadType}
                    onChange={(e) => setMapUploadType(e.target.value)}
                    disabled={photoUploading}
                  >
                    <MenuItem value="before">Before</MenuItem>
                    <MenuItem value="after">After</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id={`map-upload-area-${session.id}`}>
                    Body part
                  </InputLabel>
                  <Select
                    labelId={`map-upload-area-${session.id}`}
                    label="Body part"
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
                <FormControl size="small" sx={{ minWidth: 150 }}>
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
                      <em>No left/right side</em>
                    </MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                    <MenuItem value="front">Front</MenuItem>
                    <MenuItem value="back">Back</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
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
                  variant="outlined"
                  component="label"
                  disabled={photoUploading}
                >
                  Choose file
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
          </Box>
        )}

        <Typography
          variant="caption"
          sx={{ display: "block", fontWeight: 700, mb: 0.25 }}
        >
          {canAssign && !sessionCompleted
            ? "2. Choose canvas to annotate"
            : "Choose canvas to annotate"}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Pick a preset body diagram or a treatment record photo from this
          visit.
        </Typography>

        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <InputLabel id={`map-target-${session.id}`}>Canvas</InputLabel>
          <Select
            labelId={`map-target-${session.id}`}
            label="Canvas"
            value={mapTarget}
            onChange={(e) => {
              mapTargetUserPickedRef.current = true;
              setMapTarget(e.target.value);
              setPendingMapClick(null);
              setSelectedPointId(null);
            }}
          >
            <ListSubheader sx={{ lineHeight: "32px", fontSize: 12 }}>
              Preset diagrams
            </ListSubheader>
            {DIAGRAM_OPTIONS.map((diagram) => (
              <MenuItem key={diagram.key} value={`diagram:${diagram.key}`}>
                {diagram.label}
              </MenuItem>
            ))}
            {mapPhotoOptions.length > 0 && (
              <ListSubheader sx={{ lineHeight: "32px", fontSize: 12 }}>
                Treatment record photos
              </ListSubheader>
            )}
            {mapPhotoOptions.map((photo) => (
              <MenuItem key={photo.id} value={`photo:${photo.id}`}>
                {shortVisitPhotoCaption(photo) || `Photo #${photo.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {mapPhotoOptions.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75 }}
            >
              Quick switch between treatment photos
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {mapPhotoOptions.slice(0, 8).map((photo) => {
                const locked =
                  Number(photo.completed_map_points_count || 0) > 0;
                const caption =
                  shortVisitPhotoCaption(photo) || `Photo #${photo.id}`;
                return (
                  <Chip
                    key={photo.id}
                    size="small"
                    variant={
                      mapTarget === `photo:${photo.id}` ? "filled" : "outlined"
                    }
                    color={
                      mapTarget === `photo:${photo.id}` ? "primary" : "default"
                    }
                    label={locked ? `${caption} · Locked` : caption}
                    onClick={() => {
                      mapTargetUserPickedRef.current = true;
                      setMapTarget(`photo:${photo.id}`);
                    }}
                    onDelete={
                      canAssign && !sessionCompleted && !locked
                        ? () => handleDeleteMapPhoto(photo)
                        : undefined
                    }
                    deleteIcon={<DeleteOutlineIcon />}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 1 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flex: 1 }}
            >
              Preview only. Open the editor to mark without accidental taps.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setMapEditorOpen(true)}
              sx={{ flexShrink: 0, px: 1.25, py: 0.5, fontSize: 12 }}
            >
              {canAssign && !sessionCompleted ? "Mark" : "View"}
            </Button>
          </Stack>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", md: 260 },
                flexShrink: 0,
              }}
            >
              <TreatmentDiagramCanvas
                imageUrl={mapBaseImageUrl}
                imageAlt={
                  isDiagramTarget
                    ? `${selectedDiagram?.label || "Face"} diagram`
                    : "Treatment map photo"
                }
                diagramLoadError={mapDiagramLoadError}
                isDiagramTarget={isDiagramTarget}
                editable={false}
                annotations={visibleAnnotations}
                pointNumberById={pointNumberById}
                selectedId={selectedPointId}
                onSelect={handleSelectAnnotation}
                onDiagramLoad={() => {
                  if (isDiagramTarget) setMapDiagramLoadError(false);
                }}
                onDiagramError={() => {
                  if (isDiagramTarget) setMapDiagramLoadError(true);
                }}
                emptyMessage={
                  isDiagramTarget
                    ? "Diagram file missing. Add files in public/images/diagrams (face, axilla, perineal)."
                    : "No treatment record photo yet. Upload one above, or choose a preset diagram."
                }
                preservePhotoAspect={!isDiagramTarget}
                compact
              />
            </Box>

            {visibleAnnotations.length > 0 && (
              <Box
                sx={{
                  width: { xs: "100%", md: "auto" },
                  flex: { md: 1 },
                  minWidth: 0,
                  mt: { xs: 1, md: 0 },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.75, fontWeight: 600 }}
                >
                  Annotations ({visibleAnnotations.length})
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 1,
                  }}
                >
                  {visibleAnnotations.map((point) => {
                    const parsed = extractLabelAndNote(point.note);
                    const annotationType = resolveAnnotationType(point);
                    const isPath = annotationType === ANNOTATION_TYPES.PATH;
                    const isText = annotationType === ANNOTATION_TYPES.TEXT;
                    const pathStyle = isPath ? resolvePathStyle(point) : null;
                    const typeLabel = isPath
                      ? pathStyle === MAP_TOOLS.SUTURE
                        ? "Suture"
                        : "Incision"
                      : isText
                        ? "Text"
                        : "Injection";
                    const pointNumber = pointNumberById.get(Number(point.id));
                    const title = isText
                      ? point.geometry?.text || "Text label"
                      : parsed.label ||
                        (isPath ? typeLabel : "Injection point");
                    const note = isText ? "" : parsed.note;
                    const annotationProduct =
                      point.product_id != null
                        ? productOptions.find(
                            (p) => String(p.id) === String(point.product_id),
                          )
                        : null;
                    const isSelected =
                      Number(selectedPointId) === Number(point.id);
                    const accentColor = isPath
                      ? "error.main"
                      : isText
                        ? "info.main"
                        : "primary.main";

                    return (
                      <Box
                        key={point.id}
                        onClick={() => handleSelectAnnotation(point)}
                        sx={{
                          position: "relative",
                          p: 1,
                          pl: 1.25,
                          borderRadius: 1,
                          border: 1,
                          borderColor: isSelected ? accentColor : "divider",
                          bgcolor: isSelected
                            ? "action.selected"
                            : "background.paper",
                          cursor: "pointer",
                          transition:
                            "border-color 0.15s, background-color 0.15s",

                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          gap={0.75}
                          sx={{
                            mb:
                              note || annotationProduct || point.unit ? 0.5 : 0,
                          }}
                        >
                          <Chip
                            size="small"
                            label={
                              !isPath && !isText && pointNumber
                                ? `${typeLabel} #${pointNumber}`
                                : typeLabel
                            }
                            color={
                              isPath ? "error" : isText ? "info" : "primary"
                            }
                            variant="outlined"
                            sx={{ height: 20, fontSize: 10.5, flexShrink: 0 }}
                          />
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}
                            title={title}
                          >
                            {title}
                          </Typography>
                        </Stack>
                        {note ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              lineHeight: 1.4,
                              mb: annotationProduct || point.unit ? 0.5 : 0,
                            }}
                          >
                            {note}
                          </Typography>
                        ) : null}
                        {(point.unit || annotationProduct) && (
                          <Stack
                            direction="row"
                            gap={0.5}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {point.unit ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={point.unit}
                                sx={{ height: 20, fontSize: 10.5 }}
                              />
                            ) : null}
                            {annotationProduct ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="secondary"
                                label={annotationProduct.name}
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  maxWidth: "100%",
                                }}
                              />
                            ) : null}
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <TreatmentMapEditorDialog
          open={mapEditorOpen}
          onClose={() => {
            setMapEditorOpen(false);
            resetMapDraft();
          }}
          title="Anatomical marking"
          subtitle={
            isDiagramTarget
              ? selectedDiagram?.label || "Body diagram"
              : shortVisitPhotoCaption(selectedTargetPhoto) ||
                "Treatment record photo"
          }
          imageUrl={mapBaseImageUrl}
          imageAlt={
            isDiagramTarget
              ? `${selectedDiagram?.label || "Face"} diagram`
              : "Treatment map photo"
          }
          diagramLoadError={mapDiagramLoadError}
          isDiagramTarget={isDiagramTarget}
          editable={canAssign && !sessionCompleted}
          activeTool={mapTool}
          onToolChange={setMapTool}
          annotations={visibleAnnotations}
          pointNumberById={pointNumberById}
          selectedPointId={selectedPointId}
          pendingClick={pendingMapClick}
          onInjectionClick={handleInjectionClickAutoSave}
          onPathComplete={handlePathComplete}
          onTextPlace={handleTextPlace}
          onSelectAnnotation={handleSelectAnnotation}
          onDiagramLoad={() => {
            if (isDiagramTarget) setMapDiagramLoadError(false);
          }}
          onDiagramError={() => {
            if (isDiagramTarget) setMapDiagramLoadError(true);
          }}
          emptyMessage={
            isDiagramTarget
              ? "Diagram file missing. Add files in public/images/diagrams (face, axilla, perineal)."
              : "No treatment record photo yet. Upload one above, or choose a preset diagram."
          }
          isInjectionSelection={isInjectionSelection}
          mapAnatomyLabel={mapAnatomyLabel}
          onMapAnatomyLabelChange={setMapAnatomyLabel}
          mapNote={mapNote}
          onMapNoteChange={setMapNote}
          mapUnit={mapUnit}
          onMapUnitChange={setMapUnit}
          mapProductId={mapProductId}
          onMapProductIdChange={setMapProductId}
          zoneLabelOptions={zoneLabelOptions}
          productOptions={productOptions}
          onUpdateSelected={handleUpdateSelectedMapPoint}
          onResetDraft={resetMapDraft}
          onDeletePoint={handleDeleteMapPoint}
          savingPoint={savingPoint}
          sessionId={session.id}
        />
      </Paper>

      {canAssign && !sessionCompleted && (
        <Button
          variant="contained"
          color="success"
          startIcon={
            completing ? <LoadingIndicator size={18} /> : <TaskAltIcon />
          }
          onClick={handleMarkSessionDone}
          disabled={completing}
          sx={{ mt: 2 }}
        >
          {completing ? "Saving…" : "Mark session done"}
        </Button>
      )}
      {sessionCompleted && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 1.5 }}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Chip
            size="small"
            color={
              session?.approval_status === "approved"
                ? "success"
                : session?.approval_status === "rejected"
                  ? "error"
                  : "warning"
            }
            label={
              session?.approval_status === "approved"
                ? "Approved"
                : session?.approval_status === "rejected"
                  ? "Rejected"
                  : "Pending approval"
            }
          />
          {canSubmitApproval && (
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await submitTreatmentApproval(session.id);
                  pushToast({
                    message: "Submitted for doctor/owner approval.",
                    severity: "success",
                  });
                  await refreshVisit();
                } catch (err) {
                  pushToast({
                    message: resolveApiError(
                      err,
                      "Could not submit for approval.",
                    ),
                    severity: "error",
                  });
                }
              }}
            >
              Submit for approval
            </Button>
          )}
          {canReviewApproval && (
            <Button
              component={RouterLink}
              to={`${workspacePrefix}/treatment-approvals`}
              variant="contained"
            >
              Open approval queue
            </Button>
          )}
        </Stack>
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
