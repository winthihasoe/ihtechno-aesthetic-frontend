import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HrPageShell from "./components/HrPageShell";
import HrFormSection from "./components/HrFormSection";
import StaffProfileFormSections from "./components/StaffProfileFormSections";
import StaffJobDescriptionCard from "./components/StaffJobDescriptionCard";
import StaffDocumentUploadBlock from "./components/StaffDocumentUploadBlock";
import StaffProfileStatusChips from "./components/StaffProfileStatusChips";
import StaffSalaryCard from "./components/StaffSalaryCard";
import StaffDepositCard from "./components/StaffDepositCard";
import StaffSalaryHoldCard from "./components/StaffSalaryHoldCard";
import StaffCustomFieldsSection from "./components/StaffCustomFieldsSection";
import StaffScheduleSection from "./components/StaffScheduleSection";
import RichTextEditor, {
  hasMeaningfulRichHtml,
  sanitizeRichHtml,
} from "../../components/common/RichTextEditor";
import {
  getDevReferenceToday,
  getStatusReminderDetails,
  isTerminalProfileStatus,
} from "./components/staffProfileStatusHelpers";
import {
  documentStorageUrl,
  mapFormToStaffProfilePayload,
  mapStaffProfileToForm,
} from "./components/staffProfileFormConstants";
import SignaturePadDialog from "../../components/common/SignaturePadDialog";
import {
  createStaffSalary,
  createStaffCustomFieldDefinition,
  createStaffDeposit,
  createStaffSalaryHold,
  deactivateStaffCustomFieldDefinition,
  deleteStaffProfileDocument,
  deleteUploadedStaffAvatar,
  getActiveStaffDeposit,
  getActiveStaffSalaryHold,
  getStaffDeposits,
  getStaffSalaryHoldHistory,
  getStaffSalaries,
  getDepartments,
  getJobPositions,
  getStaffs,
  getStaffCustomFieldValues,
  getStaffProfile,
  getStaffProfileDocuments,
  getStaffSchedule,
  releaseStaffDeposit,
  releaseStaffSalaryHold,
  resignStaff,
  saveStaffCustomFieldValues,
  saveStaffSchedule,
  updateStaffDeposit,
  updateStaffSalaryHold,
  updateStaffProfile,
  updateStaffSalary,
  uploadStaffAvatar,
  uploadStaffProfileDocument,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import { getSettings } from "../../services/settingsService";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { hasRole } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";

const SALARY_COMPONENT_FIELDS = [
  { key: "basicSalary", apiKey: "basic_salary", label: "Basic Salary" },
  { key: "basicIncrease", apiKey: "basic_increase", label: "Basic Increase" },
  { key: "yearlyIncrease", apiKey: "yearly_increase", label: "Yearly Increase" },
  { key: "licenseAmount", apiKey: "license_amount", label: "License Amount" },
  { key: "probationIncrease", apiKey: "probation_increase", label: "Probation Increase" },
];

const emptySalaryForm = (overrides = {}) => ({
  basicSalary: "",
  basicIncrease: "",
  yearlyIncrease: "",
  licenseAmount: "",
  probationIncrease: "",
  effectiveFrom: "",
  reason: "",
  ...overrides,
});

const salaryFormTotal = (salaryForm) =>
  SALARY_COMPONENT_FIELDS.reduce(
    (total, field) => total + Number(salaryForm[field.key] || 0),
    0,
  );

const salaryPayloadFromForm = (salaryForm) =>
  SALARY_COMPONENT_FIELDS.reduce((payload, field) => {
    payload[field.apiKey] = Number(salaryForm[field.key] || 0);
    return payload;
  }, {});

const salaryFormFromRow = (row = null, overrides = {}) =>
  emptySalaryForm({
    basicSalary: row ? String(row.basic_salary ?? row.base_salary ?? "") : "",
    basicIncrease: row ? String(row.basic_increase ?? 0) : "",
    yearlyIncrease: row ? String(row.yearly_increase ?? 0) : "",
    licenseAmount: row ? String(row.license_amount ?? 0) : "",
    probationIncrease: row ? String(row.probation_increase ?? 0) : "",
    effectiveFrom: row?.effective_from || "",
    ...overrides,
  });

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const buildDefaultScheduleRows = (defaults = {}) =>
  WEEKDAY_OPTIONS.map((item) => ({
    weekday: item.value,
    start_time: defaults.start_time || "09:00",
    end_time: defaults.end_time || "18:00",
    grace_minutes: defaults.grace_minutes ?? 10,
    is_day_off: false,
  }));

const normalizeDocuments = (docs) =>
  (docs || []).map((doc) => ({
    ...doc,
    url: documentStorageUrl(doc),
  }));

const normalizeCustomValues = (customValues, customFieldDefinitions = []) =>
  Object.fromEntries(
    customFieldDefinitions.map((definition) => [
      definition.id,
      customValues[definition.id] ?? "",
    ]),
  );

const normalizeFormForSnapshot = (form) => ({
  ...form,
  jobDescriptionOverride: hasMeaningfulRichHtml(form.jobDescriptionOverride)
    ? sanitizeRichHtml(form.jobDescriptionOverride)
    : "",
});

const normalizeScheduleRowsForSnapshot = (scheduleRows) =>
  (scheduleRows || []).map((row) => ({
    weekday: Number(row.weekday),
    start_time: row.start_time ? String(row.start_time).slice(0, 5) : "",
    end_time: row.end_time ? String(row.end_time).slice(0, 5) : "",
    grace_minutes: Number(row.grace_minutes ?? 0),
    is_day_off: !!row.is_day_off,
  }));

const buildProfileSnapshot = ({
  form: snapshotForm,
  customValues: snapshotCustomValues,
  avatarTempPath: snapshotAvatarTempPath,
  customFieldDefinitions = [],
}) =>
  JSON.stringify({
    form: normalizeFormForSnapshot(snapshotForm),
    customValues: normalizeCustomValues(
      snapshotCustomValues,
      customFieldDefinitions,
    ),
    avatarTempPath: snapshotAvatarTempPath ?? "",
  });

const buildScheduleSnapshot = (scheduleRows) =>
  JSON.stringify(normalizeScheduleRowsForSnapshot(scheduleRows));

export default function StaffProfileDetailsPage() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const documentsSectionRef = useRef(null);

  const [staff, setStaff] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [form, setForm] = useState(() => mapStaffProfileToForm(null));
  const [documents, setDocuments] = useState([]);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [customDefinitions, setCustomDefinitions] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [avatarTempPath, setAvatarTempPath] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [scheduleRows, setScheduleRows] = useState(buildDefaultScheduleRows());
  const [salaryRows, setSalaryRows] = useState([]);
  const [openSalaryDialog, setOpenSalaryDialog] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryDialogMode, setSalaryDialogMode] = useState("promote");
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [salaryForm, setSalaryForm] = useState(() => emptySalaryForm());
  const [salaryExpanded, setSalaryExpanded] = useState(false);
  const [depositExpanded, setDepositExpanded] = useState(false);
  const [jobDescriptionExpanded, setJobDescriptionExpanded] = useState(false);
  const [depositRows, setDepositRows] = useState([]);
  const [activeDeposit, setActiveDeposit] = useState(null);
  const [openReleaseDialog, setOpenReleaseDialog] = useState(false);
  const [openSignatureDialog, setOpenSignatureDialog] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    releaseDate: new Date().toISOString().slice(0, 10),
    note: "",
    signature: "",
  });
  const [releasingDeposit, setReleasingDeposit] = useState(false);
  const [openCreateDepositDialog, setOpenCreateDepositDialog] = useState(false);
  const [createDepositAmount, setCreateDepositAmount] = useState("");
  const [createDepositHeldDate, setCreateDepositHeldDate] = useState("");
  const [
    createDepositScheduledReleaseDate,
    setCreateDepositScheduledReleaseDate,
  ] = useState("");
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [openEditDepositDialog, setOpenEditDepositDialog] = useState(false);
  const [editDepositAmount, setEditDepositAmount] = useState("");
  const [editDepositHeldDate, setEditDepositHeldDate] = useState("");
  const [editDepositScheduledReleaseDate, setEditDepositScheduledReleaseDate] =
    useState("");
  const [editDepositNote, setEditDepositNote] = useState("");
  const [savingDepositDetails, setSavingDepositDetails] = useState(false);
  const [salaryHoldExpanded, setSalaryHoldExpanded] = useState(false);
  const [salaryHoldRows, setSalaryHoldRows] = useState([]);
  const [activeSalaryHold, setActiveSalaryHold] = useState(null);
  const [openCreateSalaryHoldDialog, setOpenCreateSalaryHoldDialog] = useState(false);
  const [openEditSalaryHoldDialog, setOpenEditSalaryHoldDialog] = useState(false);
  const [openReleaseSalaryHoldDialog, setOpenReleaseSalaryHoldDialog] = useState(false);
  const [savingSalaryHold, setSavingSalaryHold] = useState(false);
  const [salaryHoldReleaseNote, setSalaryHoldReleaseNote] = useState("");
  const [salaryHoldForm, setSalaryHoldForm] = useState({
    holdMode: "full_net",
    monthlyAmount: "",
    reason: "",
    heldSince: new Date().toISOString().slice(0, 10),
    expectedReleaseDate: "",
  });
  const [openJobDescriptionDialog, setOpenJobDescriptionDialog] =
    useState(false);
  const [jobDescriptionDraft, setJobDescriptionDraft] = useState("");
  const [initialProfileSnapshot, setInitialProfileSnapshot] = useState("");
  const [initialScheduleSnapshot, setInitialScheduleSnapshot] = useState("");
  const [baselineVersion, setBaselineVersion] = useState(0);
  const [dirtyTrackingReady, setDirtyTrackingReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openLeaveConfirm, setOpenLeaveConfirm] = useState(false);
  const [openResignConfirm, setOpenResignConfirm] = useState(false);
  const [resignAcknowledged, setResignAcknowledged] = useState(false);
  const [showDocumentsAlert, setShowDocumentsAlert] = useState(
    Boolean(location.state?.highlightDocuments),
  );
  const dirtyStateRef = useRef({
    form,
    customValues,
    scheduleRows,
    avatarTempPath,
    customDefinitions,
  });

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const formatHrDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const formatHrDate = (value) => {
    if (!value) return "-";
    if (typeof value === "string" && !value.includes("T")) {
      return value.slice(0, 10).split("-").reverse().join("-");
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      return String(value).slice(0, 10).split("-").reverse().join("-");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const toDateInputValue = (value) => {
    if (!value) return "";
    if (typeof value === "string" && !value.includes("T")) {
      return value.slice(0, 10);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const load = useCallback(async () => {
    setDirtyTrackingReady(false);
    try {
      const data = await getStaffProfile(id);
      setStaff(data);
      const nextForm = mapStaffProfileToForm(data.staff_profile);
      setForm(nextForm);

      const [
        customPayload,
        schedulePayload,
        settings,
        departmentsPayload,
        jobPositionsPayload,
        docsPayload,
        staffsPayload,
        depositsPayload,
        activeDepositPayload,
        salaryHoldsPayload,
        activeSalaryHoldPayload,
      ] = await Promise.all([
        getStaffCustomFieldValues(id),
        getStaffSchedule(id),
        getSettings(),
        getDepartments(),
        getJobPositions(),
        getStaffProfileDocuments(id),
        getStaffs(),
        getStaffDeposits(id).catch(() => []),
        getActiveStaffDeposit(id).catch(() => null),
        getStaffSalaryHoldHistory(id).catch(() => ({ data: [] })),
        getActiveStaffSalaryHold(id).catch(() => null),
      ]);

      setDepartments(departmentsPayload);
      setJobPositions(jobPositionsPayload || []);
      setManagerOptions(
        (staffsPayload || [])
          .filter((member) => Number(member.id) !== Number(id))
          .map((member) => ({ id: member.id, name: member.name })),
      );
      setDocuments(normalizeDocuments(docsPayload));

      const salariesPayload = await getStaffSalaries();
      const scheduleDefaults = {
        start_time: settings?.hr_default_shift_start || "09:00",
        end_time: settings?.hr_default_shift_end || "18:00",
        grace_minutes: settings?.hr_default_grace_minutes ?? 10,
      };

      const definitions = customPayload?.definitions || [];
      const valueMap = {};
      for (const row of customPayload?.values || []) {
        valueMap[row.field_definition_id] = row.value?.value ?? "";
      }
      setCustomDefinitions(definitions.filter((item) => item.is_active));
      setCustomValues(valueMap);
      setAvatarTempPath("");

      let nextScheduleRows = [];
      if (Array.isArray(schedulePayload) && schedulePayload.length > 0) {
        const byWeekday = new Map(
          schedulePayload.map((item) => [Number(item.weekday), item]),
        );
        nextScheduleRows = WEEKDAY_OPTIONS.map((item) => {
          const row = byWeekday.get(item.value);
          return {
            weekday: item.value,
            start_time: row?.start_time
              ? String(row.start_time).slice(0, 5)
              : scheduleDefaults.start_time,
            end_time: row?.end_time
              ? String(row.end_time).slice(0, 5)
              : scheduleDefaults.end_time,
            grace_minutes: row?.grace_minutes ?? scheduleDefaults.grace_minutes,
            is_day_off: !!row?.is_day_off,
          };
        });
      } else {
        nextScheduleRows = buildDefaultScheduleRows(scheduleDefaults);
      }
      setScheduleRows(nextScheduleRows);
      setSalaryRows(
        (salariesPayload?.data || [])
          .filter((row) => Number(row.staff_id) === Number(id))
          .sort((a, b) =>
            String(b.effective_from).localeCompare(String(a.effective_from)),
          ),
      );
      setDepositRows(Array.isArray(depositsPayload) ? depositsPayload : []);
      setActiveDeposit(activeDepositPayload);
      setSalaryHoldRows(
        Array.isArray(salaryHoldsPayload?.data)
          ? salaryHoldsPayload.data
          : Array.isArray(salaryHoldsPayload)
            ? salaryHoldsPayload
            : [],
      );
      setActiveSalaryHold(activeSalaryHoldPayload);
      const activeDefinitions = definitions.filter((item) => item.is_active);
      setInitialProfileSnapshot(
        buildProfileSnapshot({
          form: nextForm,
          customValues: valueMap,
          avatarTempPath: "",
          customFieldDefinitions: activeDefinitions,
        }),
      );
      setInitialScheduleSnapshot(buildScheduleSnapshot(nextScheduleRows));
      setBaselineVersion((version) => version + 1);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load staff profile."),
        severity: "error",
      });
    }
  }, [id, pushToast]);

  useEffect(() => {
    dirtyStateRef.current = {
      form,
      customValues,
      scheduleRows,
      avatarTempPath,
      customDefinitions,
    };
  }, [form, customValues, scheduleRows, avatarTempPath, customDefinitions]);

  useEffect(() => {
    if (!staff || baselineVersion === 0) {
      setDirtyTrackingReady(false);
      return undefined;
    }

    setDirtyTrackingReady(false);
    const timer = window.setTimeout(() => {
      const state = dirtyStateRef.current;
      setInitialProfileSnapshot(
        buildProfileSnapshot({
          form: state.form,
          customValues: state.customValues,
          avatarTempPath: state.avatarTempPath,
          customFieldDefinitions: state.customDefinitions,
        }),
      );
      setInitialScheduleSnapshot(buildScheduleSnapshot(state.scheduleRows));
      setDirtyTrackingReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [staff?.id, baselineVersion]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!showDocumentsAlert || !documentsSectionRef.current) return;
    documentsSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [showDocumentsAlert, staff]);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    },
    [avatarPreviewUrl],
  );

  const save = async () => {
    if (saving) return false;
    setSaving(true);
    try {
      const saveRequests = [
        updateStaffProfile(
          id,
          mapFormToStaffProfilePayload(form, { avatarTempPath }),
        ),
        saveStaffSchedule(id, {
          schedules: scheduleRows.map((row) => ({
            weekday: row.weekday,
            start_time: row.is_day_off ? null : row.start_time,
            end_time: row.is_day_off ? null : row.end_time,
            grace_minutes: row.grace_minutes,
            is_day_off: row.is_day_off,
          })),
        }),
      ];

      if (customDefinitions.length > 0) {
        saveRequests.push(
          saveStaffCustomFieldValues(id, {
            values: customDefinitions.map((definition) => ({
              field_definition_id: definition.id,
              value: customValues[definition.id] ?? null,
            })),
          }),
        );
      }

      await Promise.all(saveRequests);
      setAvatarTempPath("");
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl("");
      }
      setInitialProfileSnapshot(
        buildProfileSnapshot({
          form,
          customValues,
          avatarTempPath: "",
          customFieldDefinitions: customDefinitions,
        }),
      );
      setInitialScheduleSnapshot(buildScheduleSnapshot(scheduleRows));
      pushToast({ message: "Profile saved.", severity: "success" });
      await load();
      return true;
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save profile."),
        severity: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onUploadAvatar = async (file) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(localPreview);
    try {
      if (avatarTempPath) {
        await deleteUploadedStaffAvatar(avatarTempPath);
      }
      const uploaded = await uploadStaffAvatar(file);
      setForm((prev) => ({
        ...prev,
        avatarUrl: uploaded.url || prev.avatarUrl,
      }));
      setAvatarTempPath(uploaded.temp_path || "");
      pushToast({ message: "Profile photo uploaded.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to upload photo."),
        severity: "error",
      });
    }
  };

  const removeSelectedAvatar = async () => {
    try {
      if (avatarTempPath) {
        await deleteUploadedStaffAvatar(avatarTempPath);
      }
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarTempPath("");
      setAvatarPreviewUrl("");
      setForm((prev) => ({ ...prev, avatarUrl: "" }));
      pushToast({
        message: "Selected profile photo removed.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to remove selected photo."),
        severity: "error",
      });
    }
  };

  const handleDocumentUpload = async (documentType, file) => {
    setUploadingDocType(documentType);
    try {
      const uploaded = await uploadStaffProfileDocument(id, documentType, file);
      setDocuments((prev) => {
        const withoutSame = [
          "nrc_front",
          "nrc_back",
          "household_certificate",
        ].includes(documentType)
          ? prev.filter((d) => d.document_type !== documentType)
          : prev;
        return [
          ...withoutSame,
          { ...uploaded, url: documentStorageUrl(uploaded) },
        ];
      });
      pushToast({ message: "Document uploaded.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to upload document."),
        severity: "error",
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDocumentDelete = async (doc) => {
    const fileName = doc.original_name || "this file";
    const confirmed = await askConfirm({
      title: "Remove uploaded file?",
      message: `"${fileName}" will be permanently deleted from storage and cannot be recovered.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      await deleteStaffProfileDocument(id, doc.id);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      pushToast({
        message: "Document permanently removed.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to remove document."),
        severity: "error",
      });
    }
  };

  const createCustomField = async () => {
    if (!newCustomFieldLabel.trim()) return;
    try {
      await createStaffCustomFieldDefinition({
        staff_id: Number(id),
        label: newCustomFieldLabel.trim(),
        field_type: "text",
      });
      setNewCustomFieldLabel("");
      pushToast({
        message: "Custom field added for this profile.",
        severity: "success",
      });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create custom field."),
        severity: "error",
      });
    }
  };

  const removeCustomField = async (definitionId) => {
    try {
      await deactivateStaffCustomFieldDefinition(definitionId);
      pushToast({
        message: "Custom field removed from this profile.",
        severity: "success",
      });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to remove custom field."),
        severity: "error",
      });
    }
  };

  const markResigned = async () => {
    try {
      await resignStaff(id, {
        resign_date: new Date().toISOString().slice(0, 10),
      });
      pushToast({ message: "Resignation recorded.", severity: "success" });
      setOpenResignConfirm(false);
      setResignAcknowledged(false);
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to record resignation."),
        severity: "error",
      });
    }
  };

  const activeSalary = useMemo(() => {
    if (!salaryRows.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    return (
      salaryRows.find((row) => String(row.effective_from) <= today) ||
      salaryRows[0]
    );
  }, [salaryRows]);

  const canSaveSalary =
    salaryFormTotal(salaryForm) > 0 &&
    (salaryDialogMode === "edit_current" || Boolean(salaryForm.effectiveFrom));

  const handleOpenPromoteSalaryDialog = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    setSalaryDialogMode("promote");
    setEditingSalaryId(null);
    setSalaryForm(emptySalaryForm({
      effectiveFrom: defaultDate.toISOString().slice(0, 10),
    }));
    setOpenSalaryDialog(true);
  };

  const handleOpenEditCurrentSalaryDialog = () => {
    setSalaryDialogMode("edit_current");
    setEditingSalaryId(activeSalary?.id || null);
    setSalaryForm(salaryFormFromRow(activeSalary));
    setOpenSalaryDialog(true);
  };

  const handleSaveSalary = async () => {
    if (salaryDialogMode === "promote") {
      const duplicateDate = salaryRows.some(
        (row) =>
          String(row.effective_from) === String(salaryForm.effectiveFrom),
      );
      if (duplicateDate) {
        pushToast({
          message: "A salary entry already exists for this effective date.",
          severity: "warning",
        });
        return;
      }
    }
    setSavingSalary(true);
    try {
      if (salaryDialogMode === "edit_current" && editingSalaryId) {
        await updateStaffSalary(editingSalaryId, {
          ...salaryPayloadFromForm(salaryForm),
        });
        pushToast({ message: "Current salary updated.", severity: "success" });
      } else {
        await createStaffSalary({
          staff_id: Number(id),
          ...salaryPayloadFromForm(salaryForm),
          effective_from: salaryForm.effectiveFrom,
        });
        pushToast({
          message: "Promoted salary scheduled.",
          severity: "success",
        });
      }
      setOpenSalaryDialog(false);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save salary."),
        severity: "error",
      });
    } finally {
      setSavingSalary(false);
    }
  };

  const heldDeposit = useMemo(() => {
    if (!activeDeposit?.id || activeDeposit.status !== "held") return null;
    return activeDeposit;
  }, [activeDeposit]);

  const latestReleasedDeposit = useMemo(() => {
    const releasedRows = (depositRows || []).filter(
      (row) => row.status === "released",
    );
    if (!releasedRows.length) return null;

    return [...releasedRows].sort((a, b) =>
      String(b.released_at || b.created_at || "").localeCompare(
        String(a.released_at || a.created_at || ""),
      ),
    )[0];
  }, [depositRows]);

  const depositReleaseDue =
    heldDeposit?.suggested_release_date &&
    new Date(heldDeposit.suggested_release_date) <= new Date();

  const handleReleaseDeposit = async () => {
    if (!activeDeposit?.id || !releaseForm.signature) {
      pushToast({
        message: "Staff signature is required to release the deposit.",
        severity: "warning",
      });
      return;
    }
    setReleasingDeposit(true);
    try {
      const released = await releaseStaffDeposit(id, activeDeposit.id, {
        release_date: releaseForm.releaseDate,
        signature: releaseForm.signature,
        note: releaseForm.note || null,
      });
      pushToast({ message: "Deposit released.", severity: "success" });
      setOpenReleaseDialog(false);
      setReleaseForm({
        releaseDate: new Date().toISOString().slice(0, 10),
        note: "",
        signature: "",
      });
      setActiveDeposit(null);
      const deposits = await getStaffDeposits(id).catch(() => null);
      if (Array.isArray(deposits)) {
        setDepositRows(deposits);
      } else if (released?.id) {
        setDepositRows((prev) => {
          const withoutCurrent = prev.filter((row) => row.id !== released.id);
          return [released, ...withoutCurrent];
        });
      }
      setDepositExpanded(true);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to release deposit."),
        severity: "error",
      });
    } finally {
      setReleasingDeposit(false);
    }
  };

  const handleCreateDeposit = async () => {
    const parsed = Number(createDepositAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      pushToast({
        message: "Enter a positive deposit amount.",
        severity: "warning",
      });
      return;
    }
    if (!createDepositHeldDate) {
      pushToast({
        message: "Select the held date for this deposit.",
        severity: "warning",
      });
      return;
    }
    setCreatingDeposit(true);
    try {
      await createStaffDeposit(id, {
        amount: parsed,
        held_since: createDepositHeldDate,
        scheduled_release_date: createDepositScheduledReleaseDate || null,
      });
      pushToast({ message: "Deposit recorded.", severity: "success" });
      setOpenCreateDepositDialog(false);
      setCreateDepositAmount("");
      setCreateDepositHeldDate("");
      setCreateDepositScheduledReleaseDate("");
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to record deposit."),
        severity: "error",
      });
    } finally {
      setCreatingDeposit(false);
    }
  };

  const handleEditDepositDetails = async () => {
    if (!activeDeposit?.id) return;
    const parsed = Number(editDepositAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      pushToast({
        message: "Enter a positive deposit amount.",
        severity: "warning",
      });
      return;
    }
    if (!editDepositHeldDate) {
      pushToast({
        message: "Select the held date for this deposit.",
        severity: "warning",
      });
      return;
    }
    setSavingDepositDetails(true);
    try {
      const updated = await updateStaffDeposit(id, activeDeposit.id, {
        amount: parsed,
        held_since: editDepositHeldDate,
        scheduled_release_date: editDepositScheduledReleaseDate || null,
        note: editDepositNote || null,
      });
      setActiveDeposit(updated);
      setOpenEditDepositDialog(false);
      setEditDepositHeldDate("");
      setEditDepositScheduledReleaseDate("");
      setEditDepositNote("");
      pushToast({ message: "Deposit details updated.", severity: "success" });
      const deposits = await getStaffDeposits(id);
      setDepositRows(deposits);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update deposit details."),
        severity: "error",
      });
    } finally {
      setSavingDepositDetails(false);
    }
  };

  const openEditDepositDetailsDialog = () => {
    if (!activeDeposit) return;
    setEditDepositAmount(String(activeDeposit.amount ?? ""));
    setEditDepositHeldDate(toDateInputValue(activeDeposit.held_since));
    setEditDepositScheduledReleaseDate(
      toDateInputValue(activeDeposit.scheduled_release_date),
    );
    setEditDepositNote("");
    setOpenEditDepositDialog(true);
  };

  const resetSalaryHoldForm = (overrides = {}) => {
    setSalaryHoldForm({
      holdMode: "full_net",
      monthlyAmount: "",
      reason: "",
      heldSince: new Date().toISOString().slice(0, 10),
      expectedReleaseDate: "",
      ...overrides,
    });
  };

  const handleOpenCreateSalaryHoldDialog = () => {
    resetSalaryHoldForm();
    setOpenCreateSalaryHoldDialog(true);
  };

  const handleOpenEditSalaryHoldDialog = () => {
    if (!activeSalaryHold) return;
    resetSalaryHoldForm({
      holdMode: activeSalaryHold.hold_mode || "full_net",
      monthlyAmount:
        activeSalaryHold.monthly_amount != null
          ? formatCommaAmountFromNumber(activeSalaryHold.monthly_amount)
          : "",
      reason: activeSalaryHold.reason || "",
      heldSince: toDateInputValue(activeSalaryHold.held_since),
      expectedReleaseDate: toDateInputValue(activeSalaryHold.expected_release_date),
    });
    setOpenEditSalaryHoldDialog(true);
  };

  const buildSalaryHoldPayload = () => {
    const monthlyAmount =
      salaryHoldForm.holdMode === "fixed_monthly"
        ? parseCommaAmount(salaryHoldForm.monthlyAmount)
        : null;

    if (
      salaryHoldForm.holdMode === "fixed_monthly" &&
      (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0)
    ) {
      return null;
    }

    if (!salaryHoldForm.reason.trim() || !salaryHoldForm.heldSince) {
      return null;
    }

    return {
      hold_mode: salaryHoldForm.holdMode,
      monthly_amount: monthlyAmount,
      reason: salaryHoldForm.reason.trim(),
      held_since: salaryHoldForm.heldSince,
      expected_release_date: salaryHoldForm.expectedReleaseDate || null,
    };
  };

  const refreshSalaryHolds = async () => {
    const [history, active] = await Promise.all([
      getStaffSalaryHoldHistory(id).catch(() => ({ data: [] })),
      getActiveStaffSalaryHold(id).catch(() => null),
    ]);
    setSalaryHoldRows(
      Array.isArray(history?.data)
        ? history.data
        : Array.isArray(history)
          ? history
          : [],
    );
    setActiveSalaryHold(active);
  };

  const handleCreateSalaryHold = async () => {
    const payload = buildSalaryHoldPayload();
    if (!payload) {
      pushToast({
        message: "Reason, held-since date, and valid monthly amount are required.",
        severity: "warning",
      });
      return;
    }

    setSavingSalaryHold(true);
    try {
      await createStaffSalaryHold({
        staff_id: Number(id),
        ...payload,
      });
      pushToast({ message: "Salary hold placed.", severity: "success" });
      setOpenCreateSalaryHoldDialog(false);
      resetSalaryHoldForm();
      await refreshSalaryHolds();
      setSalaryHoldExpanded(true);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to place salary hold."),
        severity: "error",
      });
    } finally {
      setSavingSalaryHold(false);
    }
  };

  const handleEditSalaryHold = async () => {
    if (!activeSalaryHold?.id) return;
    const payload = buildSalaryHoldPayload();
    if (!payload) {
      pushToast({
        message: "Reason, held-since date, and valid monthly amount are required.",
        severity: "warning",
      });
      return;
    }

    setSavingSalaryHold(true);
    try {
      const updated = await updateStaffSalaryHold(activeSalaryHold.id, payload);
      setActiveSalaryHold(updated);
      pushToast({ message: "Salary hold updated.", severity: "success" });
      setOpenEditSalaryHoldDialog(false);
      await refreshSalaryHolds();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update salary hold."),
        severity: "error",
      });
    } finally {
      setSavingSalaryHold(false);
    }
  };

  const handleReleaseSalaryHold = async () => {
    if (!activeSalaryHold?.id) return;
    setSavingSalaryHold(true);
    try {
      await releaseStaffSalaryHold(activeSalaryHold.id, {
        release_note: salaryHoldReleaseNote.trim() || undefined,
      });
      pushToast({ message: "Salary hold released.", severity: "success" });
      setOpenReleaseSalaryHoldDialog(false);
      setSalaryHoldReleaseNote("");
      await refreshSalaryHolds();
      setSalaryHoldExpanded(true);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to release salary hold."),
        severity: "error",
      });
    } finally {
      setSavingSalaryHold(false);
    }
  };

  const depositAmountCorrections = useMemo(() => {
    const source = heldDeposit ?? latestReleasedDeposit;
    if (!source?.amount_corrections?.length) return [];
    return source.amount_corrections;
  }, [heldDeposit, latestReleasedDeposit]);

  const depositCardContent = (
    <StaffDepositCard
      heldDeposit={heldDeposit}
      latestReleasedDeposit={latestReleasedDeposit}
      depositRows={depositRows}
      depositAmountCorrections={depositAmountCorrections}
      depositReleaseDue={depositReleaseDue}
      onEditDepositDetails={openEditDepositDetailsDialog}
      onOpenReleaseDeposit={() => setOpenReleaseDialog(true)}
      onCreateDeposit={() => setOpenCreateDepositDialog(true)}
      formatHrDate={formatHrDate}
      formatHrDateTime={formatHrDateTime}
    />
  );

  const salaryHoldCardContent = (
    <StaffSalaryHoldCard
      activeHold={activeSalaryHold}
      holdRows={salaryHoldRows}
      onEditHold={handleOpenEditSalaryHoldDialog}
      onOpenReleaseHold={() => {
        setSalaryHoldReleaseNote("");
        setOpenReleaseSalaryHoldDialog(true);
      }}
      onCreateHold={handleOpenCreateSalaryHoldDialog}
      formatHrDate={formatHrDate}
      formatHrDateTime={formatHrDateTime}
    />
  );

  const salaryCardContent = (
    <StaffSalaryCard
      activeSalary={activeSalary}
      salaryRows={salaryRows}
      onEditCurrentSalary={handleOpenEditCurrentSalaryDialog}
      onPromoteSalary={handleOpenPromoteSalaryDialog}
      formatDate={formatDate}
    />
  );

  const currentProfileSnapshot = useMemo(
    () =>
      buildProfileSnapshot({
        form,
        customValues,
        avatarTempPath,
        customFieldDefinitions: customDefinitions,
      }),
    [form, customValues, avatarTempPath, customDefinitions],
  );

  const currentScheduleSnapshot = useMemo(
    () => buildScheduleSnapshot(scheduleRows),
    [scheduleRows],
  );

  const hasUnsavedProfileChanges =
    dirtyTrackingReady &&
    Boolean(initialProfileSnapshot) &&
    currentProfileSnapshot !== initialProfileSnapshot;
  const hasUnsavedScheduleChanges =
    dirtyTrackingReady &&
    Boolean(initialScheduleSnapshot) &&
    currentScheduleSnapshot !== initialScheduleSnapshot;
  const hasUnsavedChanges =
    hasUnsavedProfileChanges || hasUnsavedScheduleChanges;

  const unsavedAreaLabels = useMemo(() => {
    const labels = [];
    if (hasUnsavedProfileChanges) {
      labels.push("Profile details and custom fields");
    }
    if (hasUnsavedScheduleChanges) {
      labels.push("Weekly schedule");
    }
    return labels;
  }, [hasUnsavedProfileChanges, hasUnsavedScheduleChanges]);
  const isOwnerProfile = hasRole(staff, "owner");

  const effectiveProfileStatus =
    form.profileStatus || staff?.staff_profile?.profile_status;
  const statusReminderDetails = useMemo(
    () =>
      getStatusReminderDetails({
        profileStatus: effectiveProfileStatus,
        hireDate: form.hireDate || staff?.staff_profile?.hire_date,
        probationMonths:
          form.probationMonths ?? staff?.staff_profile?.probation_months,
        resignationPeriodEndDate:
          form.resignationPeriodEndDate ||
          staff?.staff_profile?.resignation_period_end_date,
        probationEndDate: staff?.staff_profile?.probation_end_date,
        referenceToday: getDevReferenceToday(),
      }),
    [form, staff, effectiveProfileStatus],
  );
  const isTerminalProfile = isTerminalProfileStatus(effectiveProfileStatus);
  const devReferenceToday = getDevReferenceToday();

  const selectedJobPosition = useMemo(
    () =>
      jobPositions.find(
        (item) => String(item.id) === String(form.jobPositionId),
      ) || null,
    [jobPositions, form.jobPositionId],
  );

  const hasJobDescriptionSet = useMemo(() => {
    if (hasMeaningfulRichHtml(form.jobDescriptionOverride)) {
      return true;
    }
    if (
      selectedJobPosition?.description &&
      hasMeaningfulRichHtml(selectedJobPosition.description)
    ) {
      return true;
    }
    return hasMeaningfulRichHtml(
      staff?.staff_profile?.effective_job_description,
    );
  }, [
    form.jobDescriptionOverride,
    selectedJobPosition,
    staff?.staff_profile?.effective_job_description,
  ]);

  const effectiveJobDescriptionPreview = useMemo(() => {
    if (hasMeaningfulRichHtml(form.jobDescriptionOverride)) {
      return sanitizeRichHtml(form.jobDescriptionOverride);
    }
    if (
      selectedJobPosition?.description &&
      hasMeaningfulRichHtml(selectedJobPosition.description)
    ) {
      return sanitizeRichHtml(selectedJobPosition.description);
    }
    return sanitizeRichHtml(
      staff?.staff_profile?.effective_job_description || "",
    );
  }, [
    form.jobDescriptionOverride,
    selectedJobPosition,
    staff?.staff_profile?.effective_job_description,
  ]);

  const jobDescriptionSourceLabel = useMemo(() => {
    if (hasMeaningfulRichHtml(form.jobDescriptionOverride)) {
      return "Source: custom override";
    }
    if (
      selectedJobPosition?.description &&
      hasMeaningfulRichHtml(selectedJobPosition.description)
    ) {
      return "Source: position template";
    }
    if (staff?.staff_profile?.job_description_source === "override") {
      return "Source: custom override";
    }
    if (staff?.staff_profile?.job_description_source === "template") {
      return "Source: position template";
    }
    return "Source: not set";
  }, [
    form.jobDescriptionOverride,
    selectedJobPosition,
    staff?.staff_profile?.job_description_source,
  ]);

  const openJobDescriptionEditor = () => {
    setJobDescriptionDraft(form.jobDescriptionOverride || "");
    setOpenJobDescriptionDialog(true);
  };

  const saveJobDescriptionDraft = () => {
    setForm((prev) => ({
      ...prev,
      jobDescriptionOverride: jobDescriptionDraft,
    }));
    setOpenJobDescriptionDialog(false);
  };

  const patchJobDescriptionForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const jobDescriptionCardContent = (
    <StaffJobDescriptionCard
      form={form}
      onPatchForm={patchJobDescriptionForm}
      jobPositions={jobPositions}
      selectedJobPosition={selectedJobPosition}
      hasJobDescriptionSet={hasJobDescriptionSet}
      effectiveJobDescriptionPreview={effectiveJobDescriptionPreview}
      jobDescriptionSourceLabel={jobDescriptionSourceLabel}
      onEditJobDescription={openJobDescriptionEditor}
    />
  );

  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      setOpenLeaveConfirm(true);
      return;
    }
    navigate("..", { relative: "path" });
  };

  const handleSaveAndLeave = async () => {
    const saved = await save();
    if (!saved) return;
    setOpenLeaveConfirm(false);
    navigate("..", { relative: "path" });
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Profile details"
      actions={
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
        >
          {hasUnsavedChanges ? (
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          ) : null}
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToList}
          >
            Back to Profile List
          </Button>
        </Stack>
      }
    >
      {!staff ? (
        <Card variant="outlined" sx={{ p: 2.5, maxWidth: 900 }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <LoadingIndicator size={112} />
          </Box>
        </Card>
      ) : (
        <Stack spacing={2}>
          {hasUnsavedChanges ? (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              }
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Unsaved changes
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {unsavedAreaLabels.join(" and ")}{" "}
                {unsavedAreaLabels.length === 1 ? "has" : "have"} not been saved
                yet. Use Save changes before leaving this page.
              </Typography>
            </Alert>
          ) : null}

          {showDocumentsAlert ? (
            <Alert severity="info" onClose={() => setShowDocumentsAlert(false)}>
              Profile created. Upload documents below when ready.
            </Alert>
          ) : null}

          {statusReminderDetails.reminder ? (
            <Alert severity="warning">
              <Typography variant="subtitle2" fontWeight={600}>
                {statusReminderDetails.label}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {statusReminderDetails.actionLabel}. Then save the profile, or
                use the action below.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
                {statusReminderDetails.reminder === "probation_period_end" ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        profileStatus: "permanent",
                        probationMonths: "",
                      }))
                    }
                  >
                    Set status to Permanent
                  </Button>
                ) : null}
                {statusReminderDetails.reminder === "resignation_period_end" &&
                !isOwnerProfile &&
                !isTerminalProfile ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      setResignAcknowledged(false);
                      setOpenResignConfirm(true);
                    }}
                  >
                    Mark resigned
                  </Button>
                ) : null}
              </Stack>
              {devReferenceToday ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 1 }}
                >
                  Dev preview date: {devReferenceToday}{" "}
                  (VITE_HR_STATUS_REFERENCE_DATE)
                </Typography>
              ) : null}
            </Alert>
          ) : null}

          {!isMdUp ? (
            <Stack spacing={1}>
              <Accordion
                expanded={salaryExpanded}
                onChange={(_, expanded) => setSalaryExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700}>Salary</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active:{" "}
                      {activeSalary
                        ? formatKyats(activeSalary.base_salary)
                        : "Not set"}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>{salaryCardContent}</AccordionDetails>
              </Accordion>
              <Accordion
                expanded={depositExpanded}
                onChange={(_, expanded) => setDepositExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography fontWeight={700}>Security deposit</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {heldDeposit
                        ? `Held: ${formatKyats(heldDeposit.amount)}`
                        : latestReleasedDeposit
                          ? `Released: ${formatKyats(latestReleasedDeposit.amount)}`
                          : "None on file"}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>{depositCardContent}</AccordionDetails>
              </Accordion>
              <Accordion
                expanded={salaryHoldExpanded}
                onChange={(_, expanded) => setSalaryHoldExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography fontWeight={700}>Salary hold</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activeSalaryHold
                        ? activeSalaryHold.hold_mode === "fixed_monthly"
                          ? `On hold: ${formatKyats(activeSalaryHold.monthly_amount)} / mo`
                          : "On hold: full net"
                        : "None on file"}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>{salaryHoldCardContent}</AccordionDetails>
              </Accordion>
              <Accordion
                expanded={jobDescriptionExpanded}
                onChange={(_, expanded) => setJobDescriptionExpanded(expanded)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography fontWeight={700}>Job description</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedJobPosition?.title ||
                        form.position ||
                        (hasJobDescriptionSet ? "Assigned" : "Not set")}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>{jobDescriptionCardContent}</AccordionDetails>
              </Accordion>
            </Stack>
          ) : null}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "flex-start" }}
          >
            <Card
              variant="outlined"
              sx={{ p: 2.5, flex: 1, minWidth: 0, width: "100%" }}
            >
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={avatarPreviewUrl || form.avatarUrl || ""}
                    alt={staff.name}
                    sx={{ width: 72, height: 72 }}
                  />
                  <Stack>
                    <Typography variant="h6">{staff.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {staff.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {staff.staff_profile?.employee_code || "No Employee Code"}
                    </Typography>
                    <StaffProfileStatusChips
                      profileStatus={effectiveProfileStatus}
                      profileStatusLabel={
                        staff.staff_profile?.profile_status_label
                      }
                      hireDate={form.hireDate || staff.staff_profile?.hire_date}
                      probationMonths={
                        form.probationMonths ??
                        staff.staff_profile?.probation_months
                      }
                      resignationPeriodEndDate={
                        form.resignationPeriodEndDate ||
                        staff.staff_profile?.resignation_period_end_date
                      }
                      probationEndDate={staff.staff_profile?.probation_end_date}
                      referenceToday={devReferenceToday}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Reports to:{" "}
                      {staff.staff_profile?.reporting_manager?.name ||
                        managerOptions.find(
                          (option) =>
                            String(option.id) ===
                            String(form.reportingManagerId),
                        )?.name ||
                        "—"}
                    </Typography>
                  </Stack>
                </Stack>

                <StaffProfileFormSections
                  form={form}
                  setForm={setForm}
                  departments={departments}
                  jobPositions={jobPositions}
                  reportingManagerOptions={managerOptions}
                  excludeUserId={id}
                  avatarPreviewUrl={avatarPreviewUrl}
                  onUploadAvatar={onUploadAvatar}
                  onRemoveAvatar={removeSelectedAvatar}
                  hideJobDescriptionFields
                />

                <div ref={documentsSectionRef}>
                  <HrFormSection
                    title="Upload documents"
                    description="NRC photos, certificates, qualifications, and recommendation letters."
                  >
                    <StaffDocumentUploadBlock
                      documents={documents}
                      uploadingType={uploadingDocType}
                      onUpload={handleDocumentUpload}
                      onDelete={handleDocumentDelete}
                    />
                  </HrFormSection>
                </div>

                <StaffCustomFieldsSection
                  customDefinitions={customDefinitions}
                  customValues={customValues}
                  onChangeCustomValues={setCustomValues}
                  newCustomFieldLabel={newCustomFieldLabel}
                  onChangeNewCustomFieldLabel={setNewCustomFieldLabel}
                  onCreateCustomField={createCustomField}
                  onRemoveCustomField={removeCustomField}
                />

                <StaffScheduleSection
                  scheduleRows={scheduleRows}
                  onChangeScheduleRows={setScheduleRows}
                  weekdayOptions={WEEKDAY_OPTIONS}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={save}
                    disabled={!hasUnsavedChanges || saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                  {!isOwnerProfile && !isTerminalProfile ? (
                    <Button
                      color="warning"
                      onClick={() => {
                        setResignAcknowledged(false);
                        setOpenResignConfirm(true);
                      }}
                    >
                      Mark resigned
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Card>

            {isMdUp ? (
              <Stack
                spacing={2}
                sx={{ width: 420, maxWidth: "100%", flexShrink: 0 }}
              >
                <Card variant="outlined" sx={{ p: 2 }}>
                  {salaryCardContent}
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  {depositCardContent}
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  {salaryHoldCardContent}
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  {jobDescriptionCardContent}
                </Card>
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      )}

      <Dialog
        open={openReleaseDialog}
        onClose={() => setOpenReleaseDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Release deposit</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              type="date"
              size="small"
              label="Release date"
              InputLabelProps={{ shrink: true }}
              value={releaseForm.releaseDate}
              onChange={(e) =>
                setReleaseForm((prev) => ({
                  ...prev,
                  releaseDate: e.target.value,
                }))
              }
            />
            <TextField
              size="small"
              label="Note (optional)"
              multiline
              minRows={2}
              value={releaseForm.note}
              onChange={(e) =>
                setReleaseForm((prev) => ({ ...prev, note: e.target.value }))
              }
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                onClick={() => setOpenSignatureDialog(true)}
              >
                Staff e-sign
              </Button>
              {releaseForm.signature ? (
                <Typography variant="caption" color="success.main">
                  Signature captured
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Required before release
                </Typography>
              )}
            </Stack>
            {releaseForm.signature ? (
              <Box
                component="img"
                src={releaseForm.signature}
                alt="Staff signature"
                sx={{ maxWidth: 280, maxHeight: 100, objectFit: "contain" }}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReleaseDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={releasingDeposit || !releaseForm.signature}
            onClick={() => void handleReleaseDeposit()}
          >
            {releasingDeposit ? "Releasing..." : "Confirm release"}
          </Button>
        </DialogActions>
      </Dialog>

      <SignaturePadDialog
        open={openSignatureDialog}
        onClose={() => setOpenSignatureDialog(false)}
        title="Staff signature for deposit release"
        confirmLabel="Use signature"
        onConfirm={(signature) =>
          setReleaseForm((prev) => ({ ...prev, signature }))
        }
      />

      <Dialog
        open={openCreateDepositDialog}
        onClose={() => setOpenCreateDepositDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add deposit</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              type="number"
              label="Deposit amount (MMK)"
              inputProps={{ min: 0, step: 1000 }}
              value={createDepositAmount}
              onChange={(e) => setCreateDepositAmount(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Held date"
              InputLabelProps={{ shrink: true }}
              value={createDepositHeldDate}
              onChange={(e) => setCreateDepositHeldDate(e.target.value)}
              required
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Scheduled release date"
              InputLabelProps={{ shrink: true }}
              value={createDepositScheduledReleaseDate}
              onChange={(e) =>
                setCreateDepositScheduledReleaseDate(e.target.value)
              }
              helperText="Optional"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDepositDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={creatingDeposit}
            onClick={() => void handleCreateDeposit()}
          >
            {creatingDeposit ? "Saving..." : "Add deposit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openJobDescriptionDialog}
        onClose={() => setOpenJobDescriptionDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Custom job description</DialogTitle>
        <DialogContent>
          <RichTextEditor
            label="Override for this staff member"
            value={jobDescriptionDraft}
            onChange={setJobDescriptionDraft}
            helperText={
              selectedJobPosition
                ? `Leave blank to use the template from ${selectedJobPosition.title}. Save the profile to apply changes.`
                : "Optional override for this staff member. Save the profile to apply changes."
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJobDescriptionDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveJobDescriptionDraft}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditDepositDialog}
        onClose={() => setOpenEditDepositDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit deposit details</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              type="number"
              label="Deposit amount (MMK)"
              inputProps={{ min: 0, step: 1000 }}
              value={editDepositAmount}
              onChange={(e) => setEditDepositAmount(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Held date"
              InputLabelProps={{ shrink: true }}
              value={editDepositHeldDate}
              onChange={(e) => setEditDepositHeldDate(e.target.value)}
              required
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Scheduled release date"
              InputLabelProps={{ shrink: true }}
              value={editDepositScheduledReleaseDate}
              onChange={(e) =>
                setEditDepositScheduledReleaseDate(e.target.value)
              }
              helperText="Optional"
            />
            <TextField
              fullWidth
              size="small"
              label="Edit note (optional)"
              multiline
              minRows={2}
              value={editDepositNote}
              onChange={(e) => setEditDepositNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDepositDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingDepositDetails}
            onClick={() => void handleEditDepositDetails()}
          >
            {savingDepositDetails ? "Saving..." : "Save details"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCreateSalaryHoldDialog || openEditSalaryHoldDialog}
        onClose={() => {
          if (savingSalaryHold) return;
          setOpenCreateSalaryHoldDialog(false);
          setOpenEditSalaryHoldDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {openEditSalaryHoldDialog ? "Edit salary hold" : "Place salary hold"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Hold mode"
              value={salaryHoldForm.holdMode}
              onChange={(event) =>
                setSalaryHoldForm((prev) => ({
                  ...prev,
                  holdMode: event.target.value,
                }))
              }
              fullWidth
            >
              <MenuItem value="full_net">Full net pay</MenuItem>
              <MenuItem value="fixed_monthly">Fixed monthly amount</MenuItem>
            </TextField>
            {salaryHoldForm.holdMode === "fixed_monthly" ? (
              <TextField
                size="small"
                label="Monthly amount"
                value={salaryHoldForm.monthlyAmount}
                inputMode="decimal"
                onChange={(event) =>
                  setSalaryHoldForm((prev) => ({
                    ...prev,
                    monthlyAmount: sanitizeCommaAmountInput(event.target.value),
                  }))
                }
                fullWidth
              />
            ) : null}
            <TextField
              size="small"
              label="Reason"
              value={salaryHoldForm.reason}
              onChange={(event) =>
                setSalaryHoldForm((prev) => ({ ...prev, reason: event.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Held since"
              value={salaryHoldForm.heldSince}
              onChange={(event) =>
                setSalaryHoldForm((prev) => ({
                  ...prev,
                  heldSince: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Expected release"
              value={salaryHoldForm.expectedReleaseDate}
              onChange={(event) =>
                setSalaryHoldForm((prev) => ({
                  ...prev,
                  expectedReleaseDate: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenCreateSalaryHoldDialog(false);
              setOpenEditSalaryHoldDialog(false);
            }}
            disabled={savingSalaryHold}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingSalaryHold}
            onClick={() =>
              void (openEditSalaryHoldDialog
                ? handleEditSalaryHold()
                : handleCreateSalaryHold())
            }
          >
            {savingSalaryHold
              ? "Saving..."
              : openEditSalaryHoldDialog
                ? "Save"
                : "Place hold"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openReleaseSalaryHoldDialog}
        onClose={() => !savingSalaryHold && setOpenReleaseSalaryHoldDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Release salary hold?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2">
              Stop applying salary-hold deductions for future months. Existing linked
              deductions for past payroll months are unchanged.
            </Typography>
            <TextField
              size="small"
              label="Release note"
              value={salaryHoldReleaseNote}
              onChange={(event) => setSalaryHoldReleaseNote(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenReleaseSalaryHoldDialog(false)}
            disabled={savingSalaryHold}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={savingSalaryHold}
            onClick={() => void handleReleaseSalaryHold()}
          >
            {savingSalaryHold ? "Releasing..." : "Release"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSalaryDialog}
        onClose={() => setOpenSalaryDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {salaryDialogMode === "edit_current"
            ? "Edit Current Salary"
            : "Promote Salary"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            {SALARY_COMPONENT_FIELDS.map((field) => (
              <TextField
                key={field.key}
                size="small"
                type="number"
                label={field.label}
                value={salaryForm[field.key]}
                inputProps={{ min: 0, step: 1000 }}
                onChange={(e) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
              />
            ))}
            <Typography variant="body2" color="text.secondary">
              Computed base salary: {formatKyats(salaryFormTotal(salaryForm))}
            </Typography>
            <TextField
              type="date"
              size="small"
              label="Effective From"
              InputLabelProps={{ shrink: true }}
              value={salaryForm.effectiveFrom}
              disabled={salaryDialogMode === "edit_current"}
              onChange={(e) =>
                setSalaryForm((prev) => ({
                  ...prev,
                  effectiveFrom: e.target.value,
                }))
              }
            />
            <TextField
              size="small"
              label="Reason (optional)"
              value={salaryForm.reason}
              onChange={(e) =>
                setSalaryForm((prev) => ({
                  ...prev,
                  reason: e.target.value.slice(0, 255),
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSalaryDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSaveSalary || savingSalary}
            onClick={handleSaveSalary}
          >
            {savingSalary
              ? "Saving..."
              : salaryDialogMode === "edit_current"
                ? "Save Current Salary"
                : "Save Promoted Salary"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLeaveConfirm}
        onClose={() => setOpenLeaveConfirm(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              These sections still have edits that are not saved:
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {unsavedAreaLabels.map((label) => (
                <Typography key={label} component="li" variant="body2">
                  {label}
                </Typography>
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Save your work before leaving, or discard the edits.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveConfirm(false)}>
            Keep editing
          </Button>
          <Button
            color="warning"
            onClick={() => {
              setOpenLeaveConfirm(false);
              navigate("..", { relative: "path" });
            }}
          >
            Discard and leave
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAndLeave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save and leave"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openResignConfirm}
        onClose={() => setOpenResignConfirm(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirm Staff Resignation</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              This sets Profile status to Resigned, records today as the
              resignation date, and clears resignation-period fields. Employment
              history is updated immediately — you do not need to save the form
              separately.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please confirm that all resignation documentation has been
              completed prior to proceeding.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={resignAcknowledged}
                  onChange={(e) => setResignAcknowledged(e.target.checked)}
                />
              }
              label="I confirm that the official resignation letter has been obtained and signed."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResignConfirm(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={!resignAcknowledged}
            onClick={markResigned}
          >
            Confirm Resignation
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
