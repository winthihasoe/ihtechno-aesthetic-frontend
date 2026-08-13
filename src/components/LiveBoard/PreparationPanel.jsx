import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DynamicFormRenderer from "../common/DynamicFormRenderer";
import { resolveApiError } from "../../services/apiClient";
import {
  createTreatment,
  deleteTreatment,
} from "../../services/treatmentService";
import { getActiveTreatmentTemplates } from "../../services/treatmentTemplateService";
import {
  getPackages,
  getVisitPatientPackageItems,
  postVisitPackageUsage,
} from "../../services/packageService";
import {
  getForm,
  getLatestVisitFormResponses,
  getPublishedConsentQuestionnaireForms,
  submitResponse,
  updateResponse,
} from "../../services/formService";
import {
  getPayment,
  savePreparationPaymentPreferences,
} from "../../services/paymentService";
import {
  assignVisitCareTeam,
  getLiveboardAssignableStaff,
  getPreparationChecklist,
  updateVisit,
} from "../../services/visitService";
import useToastStore from "../../stores/toastStore";
import useAuthStore from "../../stores/authStore";
import useConfirmStore from "../../stores/confirmStore";
import LiveBoardStagePhotoStrip from "./LiveBoardStagePhotoStrip";
import { formatKyats } from "../../utils/formatKyats";
import { canUpdateLiveboard } from "../../utils/roleUtils";

function formatPlanPrice(amount) {
  if (amount == null || amount === "") return "—";
  return formatKyats(amount);
}

/** Empty string while clearing a discount field; numbers when saved or typed. */
function discountFieldDisplay(v) {
  return v === "" ? "" : v;
}

function parseDiscountFieldChange(raw) {
  if (raw === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
}

function normalizeDiscountForSave(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function newPreparationLineClientId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `prep-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function resolvePrimaryRoleLabel(user) {
  if (!user) return "";
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0]?.name || user.roles[0]?.slug || "";
  }
  return user.role || "";
}

function formatPhotoMeta(photo) {
  if (!photo) return "";
  const parts = [
    photo.type === "before" ? "Before" : "After",
    photo.body_area,
    photo.side,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function PreparationPanel({
  visit,
  consultation,
  visitTreatments = [],
  onVisitTreatmentsChange,
  onProceedToTreatment,
  onVisitPhotoUploaded,
  onVisitUpdated,
}) {
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customTreatmentName, setCustomTreatmentName] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");

  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [allComplete, setAllComplete] = useState(true);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [activeFormId, setActiveFormId] = useState(null);
  const [activeFormName, setActiveFormName] = useState("");
  const [activeFormFields, setActiveFormFields] = useState([]);
  const [formResponsesByFormId, setFormResponsesByFormId] = useState({});
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeFormReadOnly, setActiveFormReadOnly] = useState(false);
  const [packageOptions, setPackageOptions] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packagePromotions, setPackagePromotions] = useState([]);
  const [treatmentPromotions, setTreatmentPromotions] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState({
    type: "none",
    value: 0,
  });
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [packageUsageLines, setPackageUsageLines] = useState([]);
  const [packageUsageLoading, setPackageUsageLoading] = useState(false);
  const [packageUsageDialog, setPackageUsageDialog] = useState({
    open: false,
    treatmentId: null,
    treatmentLabel: "",
    treatmentTemplateId: null,
  });
  const [manualFormOptions, setManualFormOptions] = useState([]);
  const [manualFormsLoading, setManualFormsLoading] = useState(false);
  const [selectedManualFormId, setSelectedManualFormId] = useState("");
  const [usageQtyByLine, setUsageQtyByLine] = useState({});
  const [usageSignatureByLine, setUsageSignatureByLine] = useState({});
  const [usingPackageLineId, setUsingPackageLineId] = useState(null);
  const [photoDialog, setPhotoDialog] = useState(null);
  const signaturePadRefs = useRef({});

  const canAssign = canUpdateLiveboard(user);

  const [assignOpen, setAssignOpen] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [staff, setStaff] = useState({ doctors: [], therapists: [] });
  const [doctorId, setDoctorId] = useState("");
  const [therapistIds, setTherapistIds] = useState([]);
  const [assignError, setAssignError] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [roomSaving, setRoomSaving] = useState(false);

  const assignedTherapists = useMemo(
    () => (Array.isArray(visit?.therapists) ? visit.therapists : []),
    [visit?.therapists],
  );

  const therapistNames = useMemo(() => {
    if (assignedTherapists.length)
      return assignedTherapists.map((t) => t.name).join(", ");
    return visit?.therapist?.name ?? "—";
  }, [assignedTherapists, visit?.therapist?.name]);

  useEffect(() => {
    setRoomInput(
      visit?.treatment_room_number != null
        ? String(visit.treatment_room_number)
        : "",
    );
  }, [visit?.id, visit?.treatment_room_number]);

  const plannedTreatments = useMemo(
    () => (visitTreatments || []).filter((t) => t.status === "planned"),
    [visitTreatments],
  );

  const refreshVisitTreatments = () => onVisitTreatmentsChange?.();

  const loadPackageUsageLines = useCallback(async () => {
    if (!visit?.id) return;
    setPackageUsageLoading(true);
    try {
      const data = await getVisitPatientPackageItems(visit.id);
      const list = Array.isArray(data) ? data : [];
      setPackageUsageLines(list);
      setUsageQtyByLine((prev) => {
        const next = {};
        list.forEach((line) => {
          next[line.id] = prev[line.id] ?? "1";
        });
        return next;
      });
    } catch {
      setPackageUsageLines([]);
    } finally {
      setPackageUsageLoading(false);
    }
  }, [visit?.id]);

  const loadChecklist = useCallback(async () => {
    if (!visit?.id) return;
    setChecklistLoading(true);
    try {
      const res = await getPreparationChecklist(visit.id);
      setChecklistItems(Array.isArray(res?.items) ? res.items : []);
      setAllComplete(Boolean(res?.all_complete));
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load pre-treatment checklist."),
        severity: "error",
      });
    } finally {
      setChecklistLoading(false);
    }
  }, [visit?.id, pushToast]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      setManualFormsLoading(true);
      try {
        const list = await getPublishedConsentQuestionnaireForms();
        if (!cancelled) setManualFormOptions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setManualFormOptions([]);
      } finally {
        if (!cancelled) setManualFormsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getLatestVisitFormResponses(visit.id);
        if (cancelled) return;
        const map = rows.reduce((acc, row) => {
          acc[String(row.form_id)] = row;
          return acc;
        }, {});
        setFormResponsesByFormId(map);
      } catch {
        if (!cancelled) setFormResponsesByFormId({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getPackages({ active_only: true });
        if (!cancelled) setPackageOptions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setPackageOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTreatmentPromotions((prev) => {
      const prevMap = new Map(prev.map((x) => [String(x.treatment_id), x]));
      return plannedTreatments.map((t) => {
        const prevRow = prevMap.get(String(t.id));
        const template = t.treatment_template ?? t.treatmentTemplate;
        return {
          treatment_id: t.id,
          label: t.name || template?.name || "Treatment",
          qty: 1,
          unit_price: Number(prevRow?.unit_price ?? template?.price ?? 0),
          discount_type: prevRow?.discount_type ?? "none",
          discount_value: Number(prevRow?.discount_value ?? 0),
          meta: { treatment_id: t.id, source: "preparation" },
        };
      });
    });
  }, [plannedTreatments]);

  useEffect(() => {
    loadPackageUsageLines();
  }, [loadPackageUsageLines]);

  useEffect(() => {
    if (!visit?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const payment = await getPayment(visit.id);
        const rawItems = payment?.items ?? {};
        const lines = Array.isArray(rawItems?.lines) ? rawItems.lines : [];
        const prepLines = lines.filter(
          (line) => line?.meta?.source === "preparation",
        );
        if (cancelled) return;
        const treatmentLines = prepLines.filter(
          (line) => line.type === "treatment",
        );
        const packageLines = prepLines.filter(
          (line) => line.type === "package",
        );
        if (treatmentLines.length > 0) {
          setTreatmentPromotions((prev) => {
            const byId = new Map(
              treatmentLines
                .filter((line) => line?.meta?.treatment_id != null)
                .map((line) => [String(line.meta.treatment_id), line]),
            );
            return prev.map((row) => {
              const match = byId.get(String(row.treatment_id));
              if (!match) return row;
              return {
                ...row,
                unit_price: Number(match.unit_price ?? row.unit_price ?? 0),
                discount_type: match.discount_type ?? "none",
                discount_value: Number(match.discount_value ?? 0),
              };
            });
          });
        }
        setPackagePromotions(
          packageLines.map((line, idx) => ({
            id: line?.meta?.package_id ?? `${line.label}-${idx}`,
            label: line?.label ?? "Package",
            qty: Number(line?.qty ?? 1),
            unit_price: Number(line?.unit_price ?? 0),
            discount_type: line?.discount_type ?? "none",
            discount_value: Number(line?.discount_value ?? 0),
            meta: {
              ...(line?.meta ?? {}),
              source: "preparation",
              preparation_line_id:
                line?.meta?.preparation_line_id ?? newPreparationLineClientId(),
            },
          })),
        );
        setOrderDiscount({
          type: rawItems?.order_discount?.type ?? "none",
          value: Number(rawItems?.order_discount?.value ?? 0),
        });
      } catch {
        // no draft payment yet; keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

  const handleAddPackagePromotion = () => {
    const pkg = packageOptions.find(
      (row) => String(row.id) === String(selectedPackageId),
    );
    if (!pkg) return;
    setPackagePromotions((prev) => [
      ...prev,
      {
        id: pkg.id,
        label: pkg.name,
        qty: 1,
        unit_price: Number(pkg.price ?? 0),
        discount_type: "none",
        discount_value: 0,
        meta: {
          package_id: pkg.id,
          source: "preparation",
          preparation_line_id: newPreparationLineClientId(),
        },
      },
    ]);
    setSelectedPackageId("");
  };

  const applyPaymentSnapshotToPromotionState = useCallback((payment) => {
    const rawItems = payment?.items ?? {};
    const lines = Array.isArray(rawItems?.lines) ? rawItems.lines : [];
    const prepLines = lines.filter(
      (line) => line?.meta?.source === "preparation",
    );
    const treatmentLines = prepLines.filter(
      (line) => line.type === "treatment",
    );
    const packageLines = prepLines.filter((line) => line.type === "package");
    if (treatmentLines.length > 0) {
      setTreatmentPromotions((prev) => {
        const byId = new Map(
          treatmentLines
            .filter((line) => line?.meta?.treatment_id != null)
            .map((line) => [String(line.meta.treatment_id), line]),
        );
        return prev.map((row) => {
          const match = byId.get(String(row.treatment_id));
          if (!match) return row;
          return {
            ...row,
            unit_price: Number(match.unit_price ?? row.unit_price ?? 0),
            discount_type: match.discount_type ?? "none",
            discount_value: Number(match.discount_value ?? 0),
          };
        });
      });
    }
    setPackagePromotions(
      packageLines.map((line, idx) => ({
        id: line?.meta?.package_id ?? `${line.label}-${idx}`,
        label: line?.label ?? "Package",
        qty: Number(line?.qty ?? 1),
        unit_price: Number(line?.unit_price ?? 0),
        discount_type: line?.discount_type ?? "none",
        discount_value: Number(line?.discount_value ?? 0),
        meta: {
          ...(line?.meta ?? {}),
          source: "preparation",
          preparation_line_id:
            line?.meta?.preparation_line_id ?? newPreparationLineClientId(),
        },
      })),
    );
    setOrderDiscount({
      type: rawItems?.order_discount?.type ?? "none",
      value: Number(rawItems?.order_discount?.value ?? 0),
    });
  }, []);

  const persistPreparationPaymentPreferences = useCallback(
    async (packageRowsOverride = null) => {
      if (!visit?.id) return null;
      const pkgRows = packageRowsOverride ?? packagePromotions;
      const lines = [
        ...treatmentPromotions.map((row) => ({
          type: "treatment",
          label: row.label,
          qty: Number(row.qty ?? 1),
          unit_price: Number(row.unit_price ?? 0),
          discount_type: row.discount_type ?? "none",
          discount_value: normalizeDiscountForSave(row.discount_value),
          meta: { ...(row.meta ?? {}), source: "preparation" },
        })),
        ...pkgRows.map((row) => ({
          type: "package",
          label: row.label,
          qty: Number(row.qty ?? 1),
          unit_price: Number(row.unit_price ?? 0),
          discount_type: row.discount_type ?? "none",
          discount_value: normalizeDiscountForSave(row.discount_value),
          meta: { ...(row.meta ?? {}), source: "preparation" },
        })),
      ];
      const payment = await savePreparationPaymentPreferences(visit.id, {
        lines,
        order_discount: {
          type: orderDiscount.type ?? "none",
          value: normalizeDiscountForSave(orderDiscount.value),
        },
      });
      applyPaymentSnapshotToPromotionState(payment);
      await loadPackageUsageLines();
      return payment;
    },
    [
      visit?.id,
      packagePromotions,
      treatmentPromotions,
      orderDiscount,
      applyPaymentSnapshotToPromotionState,
      loadPackageUsageLines,
    ],
  );

  const handleRemovePackagePromotionRow = async (idx) => {
    const row = packagePromotions[idx];
    if (!row) return;
    const meta = row.meta ?? {};
    const hasProvisioned =
      meta.patient_package_id != null ||
      (Array.isArray(meta.patient_package_ids) &&
        meta.patient_package_ids.length > 0);
    if (hasProvisioned) {
      const ok = await askConfirm({
        title: "Remove package from this visit?",
        message:
          "This package was saved to this visit’s bill and sessions were activated. Remove it from the list and cancel the provisional package (only if no sessions have been used yet)?",
        confirmText: "Remove",
        cancelText: "Keep",
      });
      if (!ok) return;
      const snapshotBefore = [...packagePromotions];
      const nextPackages = packagePromotions.filter((_, i) => i !== idx);
      setPackagePromotions(nextPackages);
      setPromotionSaving(true);
      try {
        await persistPreparationPaymentPreferences(nextPackages);
        pushToast({
          message: "Package removed from bill.",
          severity: "success",
        });
      } catch (err) {
        pushToast({
          message: resolveApiError(err, "Could not remove package from bill."),
          severity: "error",
        });
        setPackagePromotions(snapshotBefore);
      } finally {
        setPromotionSaving(false);
      }
      return;
    }
    setPackagePromotions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSavePromotions = async () => {
    if (!visit?.id) return;
    setPromotionSaving(true);
    try {
      await persistPreparationPaymentPreferences();
      pushToast({
        message: "Promotion setup saved for payment.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save promotions."),
        severity: "error",
      });
    } finally {
      setPromotionSaving(false);
    }
  };

  const getTemplateIdFromTreatment = (treatment) => {
    const template =
      treatment?.treatment_template ?? treatment?.treatmentTemplate;
    const top =
      treatment?.treatment_template_id ??
      treatment?.treatmentTemplateId ??
      null;
    const nestedId = template?.id ?? template?.template_id ?? null;
    const n = Number(top ?? nestedId ?? 0);
    return n > 0 ? n : null;
  };

  const hasPlannedTemplatePreset = useMemo(
    () => plannedTreatments.some((t) => getTemplateIdFromTreatment(t) != null),
    [plannedTreatments],
  );

  const promotionTemplateIdSet = useMemo(() => {
    const s = new Set();
    packagePromotions.forEach((row) => {
      const pkgId = Number(row?.meta?.package_id ?? row?.id ?? 0);
      if (!pkgId) return;
      const pkg = packageOptions.find((p) => Number(p.id) === pkgId);
      (pkg?.items ?? []).forEach((it) => {
        const tid = Number(
          it?.treatment_template_id ?? it?.treatment_template?.id ?? 0,
        );
        if (tid > 0) s.add(tid);
      });
    });
    return s;
  }, [packagePromotions, packageOptions]);

  const prepaidTemplateIdSet = useMemo(() => {
    const s = new Set();
    packageUsageLines.forEach((line) => {
      const tid = Number(
        line?.treatment_template_id ?? line?.treatment_template?.id ?? 0,
      );
      if (tid > 0) s.add(tid);
    });
    return s;
  }, [packageUsageLines]);

  const canShowUsePackageForTemplate = (templateId) =>
    templateId != null &&
    (prepaidTemplateIdSet.has(templateId) ||
      promotionTemplateIdSet.has(templateId));

  const getMatchingPackageLines = useCallback(
    (templateId) => {
      if (templateId == null) return [];
      return packageUsageLines.filter(
        (line) =>
          Number(
            line?.treatment_template_id ?? line?.treatment_template?.id ?? 0,
          ) === Number(templateId),
      );
    },
    [packageUsageLines],
  );

  const openPackageUsageDialog = (treatment) => {
    const treatmentTemplateId = getTemplateIdFromTreatment(treatment);
    const treatmentLabel = treatment?.name || "Treatment";
    setPackageUsageDialog({
      open: true,
      treatmentId: treatment?.id ?? null,
      treatmentLabel,
      treatmentTemplateId,
    });
    const lines = getMatchingPackageLines(treatmentTemplateId);
    const qtyMap = {};
    const signMap = {};
    lines.forEach((line) => {
      qtyMap[line.id] = usageQtyByLine[line.id] ?? "1";
      signMap[line.id] = "";
    });
    setUsageQtyByLine((prev) => ({ ...prev, ...qtyMap }));
    setUsageSignatureByLine(signMap);
  };

  const closePackageUsageDialog = () => {
    setPackageUsageDialog({
      open: false,
      treatmentId: null,
      treatmentLabel: "",
      treatmentTemplateId: null,
    });
    setUsageSignatureByLine({});
  };

  const syncSignatureFromPad = (lineId) => {
    const pad = signaturePadRefs.current[lineId];
    if (!pad) return;
    if (pad.isEmpty()) {
      setUsageSignatureByLine((prev) => ({ ...prev, [lineId]: "" }));
      return;
    }
    setUsageSignatureByLine((prev) => ({
      ...prev,
      [lineId]: pad.getCanvas().toDataURL("image/png"),
    }));
  };

  const clearLineSignature = (lineId) => {
    signaturePadRefs.current[lineId]?.clear();
    setUsageSignatureByLine((prev) => ({ ...prev, [lineId]: "" }));
  };

  const handleUsePackageLine = async (line) => {
    if (!visit?.id || !line?.id) return;
    const rawQty = usageQtyByLine[line.id] ?? "1";
    const usedSessions = Math.max(0.25, parseFloat(String(rawQty)) || 1);
    if (!usageSignatureByLine[line.id]) {
      pushToast({
        message: "Customer signature is required.",
        severity: "warning",
      });
      return;
    }
    if (usedSessions > Number(line.remaining_sessions ?? 0)) {
      pushToast({
        message: "Use sessions cannot exceed remaining sessions.",
        severity: "warning",
      });
      return;
    }
    setUsingPackageLineId(line.id);
    try {
      await postVisitPackageUsage(visit.id, {
        patient_package_item_id: line.id,
        used_sessions: usedSessions,
        treatment_id: packageUsageDialog.treatmentId,
      });
      pushToast({
        message: "Package session recorded for this visit.",
        severity: "success",
      });
      clearLineSignature(line.id);
      await loadPackageUsageLines();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not use package session."),
        severity: "error",
      });
    } finally {
      setUsingPackageLineId(null);
    }
  };

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

  const handleCheckForms = async () => {
    setChecklistLoading(true);
    await new Promise((r) => setTimeout(r, 450));
    try {
      await loadChecklist();
    } finally {
      setChecklistLoading(false);
    }
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
      pushToast({ message: "Preset added to the plan.", severity: "success" });
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add preset."));
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
      pushToast({ message: "Custom treatment added.", severity: "success" });
      setCustomTreatmentName("");
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not add custom treatment."));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRemovePlanned = async (treatmentId) => {
    const row = plannedTreatments.find(
      (t) => String(t.id) === String(treatmentId),
    );
    const label = row?.name?.trim() || "this procedure";
    const ok = await askConfirm({
      title: "Remove planned procedure?",
      message: `Remove "${label}" from the plan? This cannot be undone.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setPlanBusy(true);
    setPlanError("");
    try {
      await deleteTreatment(treatmentId);
      pushToast({ message: "Removed from plan.", severity: "success" });
      refreshVisitTreatments();
    } catch (err) {
      setPlanError(resolveApiError(err, "Could not remove."));
    } finally {
      setPlanBusy(false);
    }
  };

  const openFormDialog = async (formId) => {
    setActiveFormId(formId);
    setFormDialogOpen(true);
    setFormError("");
    setFormData({});
    setActiveFormFields([]);
    setActiveFormName("");
    setEditingResponseId(null);
    setActiveFormReadOnly(false);
    try {
      const response = await getForm(formId);
      setActiveFormName(response?.form?.name ?? "Form");
      const fields = response?.fields ?? [];
      setActiveFormFields(fields);
      const saved = formResponsesByFormId[String(formId)];
      if (saved?.id) setEditingResponseId(saved.id);
      const canEditSaved =
        !saved?.id || Number(saved?.submitted_by) === Number(user?.id);
      setActiveFormReadOnly(!canEditSaved);
      const existingData = saved?.data ?? {};
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
      setFormData({ ...defaults, ...existingData });
    } catch (err) {
      setFormError(resolveApiError(err, "Failed to load form."));
    }
  };

  const handleSaveForm = async () => {
    if (!activeFormId || !visit?.id) return;
    if (activeFormReadOnly) return;
    setFormSaving(true);
    setFormError("");
    try {
      // Let signature pads flush onEnd / pointer handlers into React state before reading formData.
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      const payload = {
        patient_id: visit?.patient_id ?? visit?.patient?.id ?? null,
        visit_id: visit.id,
        data: formData,
      };
      if (editingResponseId) {
        await updateResponse(editingResponseId, payload);
      } else {
        await submitResponse(activeFormId, payload);
      }
      pushToast({ message: "Form saved.", severity: "success" });
      setFormDialogOpen(false);
      setSelectedManualFormId("");
      const rows = await getLatestVisitFormResponses(visit.id);
      const map = rows.reduce((acc, row) => {
        acc[String(row.form_id)] = row;
        return acc;
      }, {});
      setFormResponsesByFormId(map);
      await loadChecklist();
    } catch (err) {
      setFormError(resolveApiError(err, "Failed to save form."));
    } finally {
      setFormSaving(false);
    }
  };

  const openAssignModal = async () => {
    setAssignOpen(true);
    setAssignError("");
    setDoctorId(String(visit?.doctor_id ?? visit?.doctor?.id ?? ""));
    const preselected = assignedTherapists.length
      ? assignedTherapists.map((t) => String(t.id))
      : visit?.therapist_id
        ? [String(visit.therapist_id)]
        : [];
    setTherapistIds(preselected.slice(0, 2));
    setLoadingStaff(true);
    try {
      const data = await getLiveboardAssignableStaff();
      setStaff({
        doctors: data?.doctors ?? [],
        therapists: data?.therapists ?? [],
      });
    } catch (err) {
      setAssignError(resolveApiError(err, "Failed to load assignable staff."));
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSaveAssign = async () => {
    if (!doctorId || therapistIds.length < 1 || therapistIds.length > 2) {
      setAssignError("Please choose 1 doctor and 1-2 therapists.");
      return;
    }
    if (!visit?.id) return;
    setAssignSaving(true);
    setAssignError("");
    try {
      const updatedVisit = await assignVisitCareTeam(visit.id, {
        doctor_id: Number(doctorId),
        therapist_ids: therapistIds.map((id) => Number(id)),
      });
      onVisitUpdated?.(updatedVisit);
      pushToast({ message: "Care team assigned.", severity: "success" });
      setAssignOpen(false);
    } catch (err) {
      const message = resolveApiError(err, "Failed to assign care team.");
      setAssignError(message);
      pushToast({ message, severity: "error" });
    } finally {
      setAssignSaving(false);
    }
  };

  const handleSaveRoomNumber = async () => {
    if (!visit?.id) return;
    setRoomSaving(true);
    try {
      const trimmed = roomInput.trim();
      const updatedVisit = await updateVisit(visit.id, {
        treatment_room_number: trimmed === "" ? null : trimmed,
      });
      onVisitUpdated?.(updatedVisit);
      pushToast({ message: "Treatment room saved.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save treatment room."),
        severity: "error",
      });
    } finally {
      setRoomSaving(false);
    }
  };

  const consultationSkipped = Boolean(visit?.consultation_skipped);

  return (
    <Stack spacing={2}>
      {consultationSkipped && (
        <Alert severity="warning">Consultation skipped</Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          p: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(22,27,34,0.72)"
              : "rgba(255,246,252,0.78)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
          Treatment assignment
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          <strong>Doctor:</strong> {visit?.doctor?.name ?? "—"}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Therapist(s):</strong> {therapistNames}
        </Typography>
        {canAssign && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AssignmentIndIcon />}
              onClick={openAssignModal}
            >
              Assign doctor
            </Button>
            <Button
              variant="outlined"
              startIcon={<GroupAddIcon />}
              onClick={openAssignModal}
            >
              Assign therapist
            </Button>
          </Stack>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Treatment room no.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Shown on the Treatment Room page for this visit. You can change it
          here or from the treatment column on the board.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "flex-start" }}
        >
          <TextField
            label="Room number"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            size="small"
            fullWidth
            disabled={!canAssign || roomSaving}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSaveRoomNumber}
            disabled={!canAssign || roomSaving || !visit?.id}
          >
            {roomSaving ? "Saving…" : "Save room"}
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Planned procedures
        </Typography>
        {planError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {planError}
          </Alert>
        )}
        {(consultation?.treatment_plan ||
          consultation?.prescribed_treatment) && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            <strong>Doctor plan:</strong>{" "}
            {consultation.treatment_plan ?? consultation.prescribed_treatment}
          </Typography>
        )}
        {!hasPlannedTemplatePreset && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            No treatment preset.
          </Typography>
        )}
        {plannedTreatments.length > 0 ? (
          <List dense disablePadding sx={{ mb: 1.5 }}>
            {plannedTreatments.map((t) => {
              const tmpl = t.treatment_template ?? t.treatmentTemplate;
              const templateId = getTemplateIdFromTreatment(t);
              const duration =
                tmpl?.duration_minutes != null
                  ? `${tmpl.duration_minutes} min`
                  : "—";
              const price = formatPlanPrice(tmpl?.price ?? null);
              const isPreset = templateId != null;
              return (
                <ListItem
                  key={t.id}
                  divider
                  sx={{
                    py: 0.75,
                    pr: 6,
                    mb: 0.75,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                    boxShadow: isPreset ? 3 : 0,
                  }}
                >
                  <ListItemText
                    primary={t.name || "Procedure"}
                    secondary={`Duration: ${duration} · Price: ${price}`}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                    }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {canShowUsePackageForTemplate(templateId) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={packageUsageLoading}
                          onClick={() => openPackageUsageDialog(t)}
                        >
                          Use package (this time)
                        </Button>
                      ) : null}
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label="Remove"
                        disabled={planBusy}
                        onClick={() => handleRemovePlanned(t.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        ) : null}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
        >
          New Treatment
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 1.5 }}
          alignItems={{ sm: "flex-start" }}
        >
          <FormControl size="small" fullWidth sx={{ flex: 1 }}>
            <InputLabel>Preset</InputLabel>
            <Select
              label="Preset"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={planBusy || templatesLoading}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {templates.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.duration_minutes != null
                    ? ` · ${t.duration_minutes} min`
                    : ""}
                  {` · ${formatPlanPrice(t.price)}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={planBusy || !selectedTemplateId}
            onClick={handleAddTemplateToPlan}
            sx={{ flexShrink: 0 }}
          >
            Add
          </Button>
        </Stack>
        <TextField
          label="Custom procedure name"
          value={customTreatmentName}
          onChange={(e) => setCustomTreatmentName(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
          disabled={planBusy}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={planBusy || !customTreatmentName.trim()}
          onClick={handleAddCustomToPlan}
          sx={{ mb: plannedTreatments.length ? 0 : 1 }}
        >
          Add custom
        </Button>
        {plannedTreatments.length === 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            No planned procedures yet.
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          Prices & discounts (for Payment step)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fill this in before the patient pays. The Payment screen uses these
          numbers for the final total.
        </Typography>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          1. Treatments on the bill
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5 }}
        >
          One card per planned treatment. Set the price, then add a discount if
          needed.
        </Typography>
        <Stack spacing={1.5}>
          {treatmentPromotions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No planned treatments yet — add procedures above first.
            </Typography>
          ) : (
            treatmentPromotions.map((row) => (
              <Paper
                key={row.treatment_id}
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover" }}
              >
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                  {row.label}
                </Typography>
                <Stack spacing={1.25}>
                  <TextField
                    size="small"
                    label="Price on bill"
                    type="number"
                    value={row.unit_price}
                    onChange={(e) =>
                      setTreatmentPromotions((prev) =>
                        prev.map((x) =>
                          x.treatment_id === row.treatment_id
                            ? { ...x, unit_price: Number(e.target.value || 0) }
                            : x,
                        ),
                      )
                    }
                    fullWidth
                    helperText="Amount for this treatment before discount"
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <FormControl size="small" fullWidth sx={{ flex: 1 }}>
                      <InputLabel>Discount type</InputLabel>
                      <Select
                        label="Discount type"
                        value={row.discount_type}
                        onChange={(e) =>
                          setTreatmentPromotions((prev) =>
                            prev.map((x) =>
                              x.treatment_id === row.treatment_id
                                ? { ...x, discount_type: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        <MenuItem value="none">No discount</MenuItem>
                        <MenuItem value="percent">Percent off (%)</MenuItem>
                        <MenuItem value="fixed">Fixed amount off</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label={
                        row.discount_type === "percent"
                          ? "Percent"
                          : "Amount off"
                      }
                      type="number"
                      value={discountFieldDisplay(row.discount_value)}
                      onChange={(e) => {
                        const next = parseDiscountFieldChange(e.target.value);
                        setTreatmentPromotions((prev) =>
                          prev.map((x) =>
                            x.treatment_id === row.treatment_id
                              ? { ...x, discount_value: next }
                              : x,
                          ),
                        );
                      }}
                      fullWidth
                      sx={{ flex: 1 }}
                      disabled={row.discount_type === "none"}
                      helperText={
                        row.discount_type === "percent"
                          ? "Example: 10 means 10% off"
                          : row.discount_type === "fixed"
                            ? "Subtract this many kyats from the line"
                            : "Choose a discount type first"
                      }
                    />
                  </Stack>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          2. Sell a package (optional)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5 }}
        >
          Add a package to the bill, then click Save below. Sessions activate
          for this visit right away (no need to wait for payment). Remaining
          sessions stay on the patient for next visits.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 1.5 }}
          alignItems={{ sm: "flex-start" }}
        >
          <FormControl size="small" fullWidth sx={{ flex: 1 }}>
            <InputLabel>Choose package</InputLabel>
            <Select
              label="Choose package"
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
            >
              <MenuItem value="">
                <em>Select a package…</em>
              </MenuItem>
              {packageOptions.map((pkg) => (
                <MenuItem key={pkg.id} value={String(pkg.id)}>
                  {pkg.name} · {formatPlanPrice(pkg.price)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={!selectedPackageId}
            onClick={handleAddPackagePromotion}
          >
            Add to bill
          </Button>
        </Stack>
        <Stack spacing={1.5}>
          {packagePromotions.map((row, idx) => (
            <Paper
              key={row.meta?.preparation_line_id ?? `${row.id}-${idx}`}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 1.5 }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                gap={1}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {row.label}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  aria-label="Remove package from bill"
                  onClick={() => void handleRemovePackagePromotionRow(idx)}
                  disabled={promotionSaving}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={1.25}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    label="How many"
                    type="number"
                    value={row.qty}
                    onChange={(e) =>
                      setPackagePromotions((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, qty: Number(e.target.value || 1) }
                            : x,
                        ),
                      )
                    }
                    sx={{ width: { xs: "100%", md: 120 } }}
                    helperText="Packages sold"
                  />
                  <TextField
                    size="small"
                    label="Price each"
                    type="number"
                    value={row.unit_price}
                    onChange={(e) =>
                      setPackagePromotions((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, unit_price: Number(e.target.value || 0) }
                            : x,
                        ),
                      )
                    }
                    fullWidth
                    helperText="Selling price per package"
                  />
                </Stack>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <FormControl
                    size="small"
                    fullWidth
                    sx={{ minWidth: { md: 180 } }}
                  >
                    <InputLabel>Discount type</InputLabel>
                    <Select
                      label="Discount type"
                      value={row.discount_type}
                      onChange={(e) =>
                        setPackagePromotions((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, discount_type: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      <MenuItem value="none">No discount</MenuItem>
                      <MenuItem value="percent">Percent off (%)</MenuItem>
                      <MenuItem value="fixed">Fixed amount off</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    label={
                      row.discount_type === "percent" ? "Percent" : "Amount off"
                    }
                    type="number"
                    value={discountFieldDisplay(row.discount_value)}
                    onChange={(e) => {
                      const next = parseDiscountFieldChange(e.target.value);
                      setPackagePromotions((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, discount_value: next } : x,
                        ),
                      );
                    }}
                    fullWidth
                    disabled={row.discount_type === "none"}
                    helperText={
                      row.discount_type === "none"
                        ? "Choose discount type first"
                        : row.discount_type === "percent"
                          ? "Example: 10 means 10% off"
                          : "Amount to subtract"
                    }
                  />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          3. Extra discount on the whole visit
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5 }}
        >
          Applies on top of line discounts, on the whole bill in Payment.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "flex-start" }}
        >
          <FormControl size="small" fullWidth sx={{ maxWidth: { sm: 220 } }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={orderDiscount.type}
              onChange={(e) =>
                setOrderDiscount((prev) => ({ ...prev, type: e.target.value }))
              }
            >
              <MenuItem value="none">No extra discount</MenuItem>
              <MenuItem value="percent">Percent off whole bill</MenuItem>
              <MenuItem value="fixed">Fixed amount off whole bill</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label={orderDiscount.type === "percent" ? "Percent" : "Amount off"}
            type="number"
            value={discountFieldDisplay(orderDiscount.value)}
            onChange={(e) => {
              const next = parseDiscountFieldChange(e.target.value);
              setOrderDiscount((prev) => ({ ...prev, value: next }));
            }}
            sx={{ width: { xs: "100%", sm: 160 } }}
            disabled={orderDiscount.type === "none"}
          />
        </Stack>

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2 }}
          onClick={handleSavePromotions}
          disabled={promotionSaving}
        >
          {promotionSaving ? "Saving…" : "Save — use these in Payment"}
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Required forms
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCheckForms}
            disabled={checklistLoading}
          >
            {checklistLoading ? "Checking…" : "Check forms"}
          </Button>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.75 }}
        >
          Pick any published consent or questionnaire (same as consulting).
          Saved forms appear in {"Questionnaires & Consents"} below.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 1.5 }}
          alignItems={{ sm: "flex-start" }}
        >
          <FormControl size="small" fullWidth sx={{ flex: 1 }}>
            <InputLabel>Add form</InputLabel>
            <Select
              label="Add form"
              value={selectedManualFormId}
              onChange={(e) => setSelectedManualFormId(e.target.value)}
              disabled={manualFormsLoading}
            >
              <MenuItem value="">
                <em>Select published form…</em>
              </MenuItem>
              {manualFormOptions.map((f) => (
                <MenuItem key={f.id} value={String(f.id)}>
                  {f.name} ({f.form_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            disabled={!selectedManualFormId || manualFormsLoading}
            onClick={() => {
              const id = Number(selectedManualFormId);
              if (id) void openFormDialog(id);
            }}
            sx={{ flexShrink: 0 }}
          >
            Open / fill
          </Button>
        </Stack>
        {checklistLoading && !checklistItems.length ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : checklistItems.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No template-required forms for the current presets. Use “Add form”
            above if something is missing from the treatment template.
          </Typography>
        ) : (
          <List dense disablePadding>
            {checklistItems.map((row) => (
              <ListItem
                key={row.form_definition_id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 0.75,
                  cursor: "pointer",
                }}
                onClick={() => void openFormDialog(row.form_definition_id)}
              >
                {row.complete ? (
                  <CheckCircleOutlineIcon
                    color="success"
                    sx={{ mr: 1, fontSize: 22 }}
                  />
                ) : (
                  <ErrorOutlineIcon
                    color="warning"
                    sx={{ mr: 1, fontSize: 22 }}
                  />
                )}
                <ListItemText
                  primary={row.name}
                  secondary={
                    row.complete
                      ? "Completed — tap to review or edit"
                      : "Tap to fill and sign"
                  }
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                />
              </ListItem>
            ))}
          </List>
        )}
        {!allComplete && checklistItems.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Complete every required form before proceeding to treatment.
          </Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Questionnaires & Consents
        </Typography>
        {Object.values(formResponsesByFormId).length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No questionnaire/consent has been saved in this visit yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {Object.values(formResponsesByFormId).map((row) => {
              const canEdit = Number(row?.submitted_by) === Number(user?.id);
              return (
                <ListItem
                  key={row.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 0.75,
                  }}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openFormDialog(row.form_id)}
                    >
                      {canEdit ? "Edit" : "View"}
                    </Button>
                  }
                >
                  <ListItemText
                    primary={row.form_name || "Form"}
                    secondary={`Last updated: ${new Date(
                      row.updated_at ?? row.created_at ?? Date.now(),
                    ).toLocaleString()} · Submitted by: ${row?.submitted_by?.name ?? "Unknown"} · ${
                      canEdit ? "Editable" : "Read only"
                    }`}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                    }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Before / after photos (pre-treatment)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Capture both before the patient enters the treatment room. Proceeding
          without them requires confirmation.
        </Typography>
        <LiveBoardStagePhotoStrip
          visitId={visit?.id}
          stage="preparation"
          photos={visit?.photos ?? []}
          onPhotoUploaded={onVisitPhotoUploaded}
          onPhotoClick={setPhotoDialog}
        />
      </Paper>

      <Button
        variant="contained"
        color="secondary"
        onClick={() => onProceedToTreatment?.()}
        disabled={planBusy}
      >
        Proceed to treatment
      </Button>

      <Dialog
        open={assignOpen}
        onClose={() => !assignSaving && setAssignOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign care team</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {loadingStaff ? (
              <Typography variant="body2" color="text.secondary">
                Loading staff...
              </Typography>
            ) : (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Doctor</InputLabel>
                  <Select
                    label="Doctor"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                  >
                    {staff.doctors.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Therapists (max 2)</InputLabel>
                  <Select
                    multiple
                    label="Therapists (max 2)"
                    value={therapistIds}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTherapistIds(next.slice(0, 2));
                    }}
                    renderValue={(selected) =>
                      selected
                        .map(
                          (id) =>
                            staff.therapists.find((t) => String(t.id) === id)
                              ?.name ?? id,
                        )
                        .join(", ")
                    }
                  >
                    {staff.therapists.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            {assignError && <Alert severity="error">{assignError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)} disabled={assignSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAssign}
            disabled={assignSaving || loadingStaff}
          >
            {assignSaving ? "Saving..." : "Save assignment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{activeFormName || "Form"}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          {activeFormReadOnly && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Read only: only the user who submitted this form can edit it.
            </Alert>
          )}
          {activeFormFields.length > 0 && (
            <DynamicFormRenderer
              fields={activeFormFields}
              formData={formData}
              onChange={(name, value) => {
                if (activeFormReadOnly) return;
                setFormData((prev) => ({ ...prev, [name]: value }));
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveForm}
            disabled={
              activeFormReadOnly || formSaving || !activeFormFields.length
            }
          >
            {activeFormReadOnly ? "Read only" : formSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={packageUsageDialog.open}
        onClose={() => {
          if (!usingPackageLineId) closePackageUsageDialog();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Use package now - {packageUsageDialog.treatmentLabel}
        </DialogTitle>
        <DialogContent dividers>
          {packageUsageLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            (() => {
              const dialogLines = getMatchingPackageLines(
                packageUsageDialog.treatmentTemplateId,
              );
              const tid = packageUsageDialog.treatmentTemplateId;
              const packageOnBillCovers =
                tid != null &&
                promotionTemplateIdSet.has(tid) &&
                dialogLines.length === 0;
              if (dialogLines.length === 0) {
                return (
                  <Alert severity="info">
                    {packageOnBillCovers
                      ? "This package is on today’s bill. Click “Save — use these in Payment” in Prices & discounts to activate sessions for this visit, then open this dialog again to sign and use them."
                      : "No prepaid sessions are available for this treatment yet. Add a package on the bill and save, assign a package from Patient Profile, or complete package payment, then try again."}
                  </Alert>
                );
              }
              return (
                <Stack spacing={1.5}>
                  {dialogLines.map((line) => (
                    <Paper
                      key={line.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        borderStyle: "dashed",
                      }}
                    >
                      <Box
                        sx={{ px: 1.5, py: 0.75, bgcolor: "action.selected" }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {line.patient_package?.package?.name ??
                            "Package card"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {line.treatment_template?.name ?? "Treatment"} -
                          Session card
                        </Typography>
                      </Box>
                      <Stack spacing={1.25} sx={{ p: 1.5 }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                        >
                          <TextField
                            size="small"
                            label="Remaining sessions"
                            value={line.remaining_sessions}
                            InputProps={{ readOnly: true }}
                            sx={{ width: 180 }}
                          />
                          <TextField
                            size="small"
                            label="Use sessions"
                            type="number"
                            value={usageQtyByLine[line.id] ?? "1"}
                            onChange={(e) =>
                              setUsageQtyByLine((prev) => ({
                                ...prev,
                                [line.id]: e.target.value,
                              }))
                            }
                            inputProps={{ min: 0.25, step: 0.25 }}
                            sx={{ width: 160 }}
                          />
                        </Stack>
                        <Box
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1.5,
                            bgcolor: "background.paper",
                            touchAction: "none",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", px: 1, pt: 1 }}
                          >
                            Customer signature for this session
                          </Typography>
                          <SignatureCanvas
                            ref={(el) => {
                              if (el) signaturePadRefs.current[line.id] = el;
                            }}
                            penColor="#111827"
                            canvasProps={{
                              style: { width: "100%", height: 150 },
                              className: "signature-canvas",
                              onMouseUp: () => syncSignatureFromPad(line.id),
                              onTouchEnd: () => syncSignatureFromPad(line.id),
                            }}
                            onEnd={() => syncSignatureFromPad(line.id)}
                          />
                        </Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Button
                            size="small"
                            onClick={() => clearLineSignature(line.id)}
                          >
                            Clear signature
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={
                              usingPackageLineId === line.id ||
                              !usageSignatureByLine[line.id] ||
                              Number.parseFloat(
                                String(usageQtyByLine[line.id] ?? "1"),
                              ) < 0.25
                            }
                            onClick={() => handleUsePackageLine(line)}
                          >
                            {usingPackageLineId === line.id
                              ? "Using..."
                              : "Confirm use this session"}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              );
            })()
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closePackageUsageDialog}
            disabled={Boolean(usingPackageLineId)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(photoDialog)}
        onClose={() => setPhotoDialog(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {photoDialog ? formatPhotoMeta(photoDialog) : "Photo"}
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
    </Stack>
  );
}
