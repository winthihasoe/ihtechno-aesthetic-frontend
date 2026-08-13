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
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HrPageShell from "./components/HrPageShell";
import HrFormSection from "./components/HrFormSection";
import StaffProfileFormSections from "./components/StaffProfileFormSections";
import StaffDocumentUploadBlock from "./components/StaffDocumentUploadBlock";
import LabeledField from "./components/LabeledField";
import StaffProfileStatusChips from "./components/StaffProfileStatusChips";
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
import {
  createStaffSalary,
  createStaffCustomFieldDefinition,
  deactivateStaffCustomFieldDefinition,
  deleteStaffProfileDocument,
  deleteUploadedStaffAvatar,
  getStaffSalaries,
  getDepartments,
  getStaffs,
  getStaffCustomFieldValues,
  getStaffProfile,
  getStaffProfileDocuments,
  getStaffSchedule,
  resignStaff,
  saveStaffCustomFieldValues,
  saveStaffSchedule,
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
  const [salaryForm, setSalaryForm] = useState({
    baseSalary: "",
    effectiveFrom: "",
    reason: "",
  });
  const [salaryExpanded, setSalaryExpanded] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [openLeaveConfirm, setOpenLeaveConfirm] = useState(false);
  const [openResignConfirm, setOpenResignConfirm] = useState(false);
  const [resignAcknowledged, setResignAcknowledged] = useState(false);
  const [showDocumentsAlert, setShowDocumentsAlert] = useState(
    Boolean(location.state?.highlightDocuments),
  );

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const load = useCallback(async () => {
    try {
      const data = await getStaffProfile(id);
      setStaff(data);
      const nextForm = mapStaffProfileToForm(data.staff_profile);
      setForm(nextForm);

      const [customPayload, schedulePayload, settings, departmentsPayload, docsPayload, staffsPayload] =
        await Promise.all([
          getStaffCustomFieldValues(id),
          getStaffSchedule(id),
          getSettings(),
          getDepartments(),
          getStaffProfileDocuments(id),
          getStaffs(),
        ]);

      setDepartments(departmentsPayload);
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

      const definitions = Array.isArray(customPayload?.definitions)
        ? customPayload.definitions
        : [];
      const customValueRows = Array.isArray(customPayload?.values)
        ? customPayload.values
        : [];
      const valueMap = {};
      for (const row of customValueRows) {
        valueMap[row.field_definition_id] = row.value?.value ?? "";
      }
      setCustomDefinitions(definitions.filter((item) => item.is_active));
      setCustomValues(valueMap);
      setAvatarTempPath("");

      let nextScheduleRows = [];
      if (Array.isArray(schedulePayload) && schedulePayload.length > 0) {
        const byWeekday = new Map(schedulePayload.map((item) => [Number(item.weekday), item]));
        nextScheduleRows = WEEKDAY_OPTIONS.map((item) => {
          const row = byWeekday.get(item.value);
          return {
            weekday: item.value,
            start_time: row?.start_time ? String(row.start_time).slice(0, 5) : scheduleDefaults.start_time,
            end_time: row?.end_time ? String(row.end_time).slice(0, 5) : scheduleDefaults.end_time,
            grace_minutes: row?.grace_minutes ?? scheduleDefaults.grace_minutes,
            is_day_off: !!row?.is_day_off,
          };
        });
      } else {
        nextScheduleRows = buildDefaultScheduleRows(scheduleDefaults);
      }
      setScheduleRows(nextScheduleRows);
      const salaryList = Array.isArray(salariesPayload?.data)
        ? salariesPayload.data
        : Array.isArray(salariesPayload)
          ? salariesPayload
          : [];
      setSalaryRows(
        salaryList
          .filter((row) => Number(row.staff_id) === Number(id))
          .sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from))),
      );
      setInitialSnapshot(
        JSON.stringify({
          form: nextForm,
          customValues: valueMap,
          scheduleRows: nextScheduleRows,
          avatarTempPath: "",
        }),
      );
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to load staff profile."), severity: "error" });
    }
  }, [id, pushToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!showDocumentsAlert || !documentsSectionRef.current) return;
    documentsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showDocumentsAlert, staff]);

  useEffect(() => () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
  }, [avatarPreviewUrl]);

  const save = async () => {
    try {
      const saveRequests = [
        updateStaffProfile(id, mapFormToStaffProfilePayload(form, { avatarTempPath })),
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
      pushToast({ message: "Profile updated.", severity: "success" });
      load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to update profile."), severity: "error" });
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
      setForm((prev) => ({ ...prev, avatarUrl: uploaded.url || prev.avatarUrl }));
      setAvatarTempPath(uploaded.temp_path || "");
      pushToast({ message: "Profile photo uploaded.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to upload photo."), severity: "error" });
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
      pushToast({ message: "Selected profile photo removed.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to remove selected photo."), severity: "error" });
    }
  };

  const handleDocumentUpload = async (documentType, file) => {
    setUploadingDocType(documentType);
    try {
      const uploaded = await uploadStaffProfileDocument(id, documentType, file);
      setDocuments((prev) => {
        const withoutSame =
          ["nrc_front", "nrc_back", "household_certificate"].includes(documentType)
            ? prev.filter((d) => d.document_type !== documentType)
            : prev;
        return [...withoutSame, { ...uploaded, url: documentStorageUrl(uploaded) }];
      });
      pushToast({ message: "Document uploaded.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to upload document."), severity: "error" });
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
      pushToast({ message: "Document permanently removed.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to remove document."), severity: "error" });
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
      pushToast({ message: "Custom field added for this profile.", severity: "success" });
      load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to create custom field."), severity: "error" });
    }
  };

  const removeCustomField = async (definitionId) => {
    try {
      await deactivateStaffCustomFieldDefinition(definitionId);
      pushToast({ message: "Custom field removed from this profile.", severity: "success" });
      load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to remove custom field."), severity: "error" });
    }
  };

  const saveSchedule = async () => {
    try {
      await saveStaffSchedule(id, {
        schedules: scheduleRows.map((row) => ({
          weekday: row.weekday,
          start_time: row.is_day_off ? null : row.start_time,
          end_time: row.is_day_off ? null : row.end_time,
          grace_minutes: row.grace_minutes,
          is_day_off: row.is_day_off,
        })),
      });
      pushToast({ message: "Weekly schedule saved.", severity: "success" });
      load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to save schedule."), severity: "error" });
    }
  };

  const markResigned = async () => {
    try {
      await resignStaff(id, { resign_date: new Date().toISOString().slice(0, 10) });
      pushToast({ message: "Resignation recorded.", severity: "success" });
      setOpenResignConfirm(false);
      setResignAcknowledged(false);
      load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to record resignation."), severity: "error" });
    }
  };

  const activeSalary = useMemo(() => {
    if (!salaryRows.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    return salaryRows.find((row) => String(row.effective_from) <= today) || salaryRows[0];
  }, [salaryRows]);

  const canSaveSalary =
    Number(salaryForm.baseSalary) > 0 &&
    (salaryDialogMode === "edit_current" || Boolean(salaryForm.effectiveFrom));

  const handleOpenPromoteSalaryDialog = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    setSalaryDialogMode("promote");
    setEditingSalaryId(null);
    setSalaryForm({
      baseSalary: "",
      effectiveFrom: defaultDate.toISOString().slice(0, 10),
      reason: "",
    });
    setOpenSalaryDialog(true);
  };

  const handleOpenEditCurrentSalaryDialog = () => {
    setSalaryDialogMode("edit_current");
    setEditingSalaryId(activeSalary?.id || null);
    setSalaryForm({
      baseSalary: activeSalary ? String(activeSalary.base_salary || "") : "",
      effectiveFrom: activeSalary?.effective_from || "",
      reason: "",
    });
    setOpenSalaryDialog(true);
  };

  const handleSaveSalary = async () => {
    if (salaryDialogMode === "promote") {
      const duplicateDate = salaryRows.some(
        (row) => String(row.effective_from) === String(salaryForm.effectiveFrom),
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
        await updateStaffSalary(editingSalaryId, { base_salary: Number(salaryForm.baseSalary) });
        pushToast({ message: "Current salary updated.", severity: "success" });
      } else {
        await createStaffSalary({
          staff_id: Number(id),
          base_salary: Number(salaryForm.baseSalary),
          effective_from: salaryForm.effectiveFrom,
        });
        pushToast({ message: "Promoted salary scheduled.", severity: "success" });
      }
      setOpenSalaryDialog(false);
      await load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to save salary."), severity: "error" });
    } finally {
      setSavingSalary(false);
    }
  };

  const salaryCardContent = (
    <Stack spacing={1.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>Salary</Typography>
        <Chip
          size="small"
          color={activeSalary ? "success" : "default"}
          label={activeSalary ? "Active Salary" : "No Salary"}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Active salary: {activeSalary ? formatKyats(activeSalary.base_salary) : "Not set"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Effective from: {activeSalary ? formatDate(activeSalary.effective_from) : "-"}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button size="small" variant="outlined" disabled={!activeSalary} onClick={handleOpenEditCurrentSalaryDialog}>
          Edit Current Salary
        </Button>
        <Button size="small" variant="contained" onClick={handleOpenPromoteSalaryDialog}>
          Promote Salary
        </Button>
      </Stack>
      <Divider />
      <Typography variant="subtitle2">Salary History (Read-only)</Typography>
      {!salaryRows.length ? (
        <Typography variant="body2" color="text.secondary">No salary history yet.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">Base Salary</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salaryRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell align="right">{formatKyats(row.base_salary)}</TableCell>
                  <TableCell>{formatDate(row.effective_from)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        form,
        customValues,
        scheduleRows,
        avatarTempPath,
      }),
    [form, customValues, scheduleRows, avatarTempPath],
  );

  const hasUnsavedChanges = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;
  const isOwnerProfile = hasRole(staff, "owner");

  const effectiveProfileStatus = form.profileStatus || staff?.staff_profile?.profile_status;
  const statusReminderDetails = useMemo(
    () =>
      getStatusReminderDetails({
        profileStatus: effectiveProfileStatus,
        hireDate: form.hireDate || staff?.staff_profile?.hire_date,
        probationMonths: form.probationMonths ?? staff?.staff_profile?.probation_months,
        resignationPeriodEndDate:
          form.resignationPeriodEndDate || staff?.staff_profile?.resignation_period_end_date,
        probationEndDate: staff?.staff_profile?.probation_end_date,
        referenceToday: getDevReferenceToday(),
      }),
    [form, staff, effectiveProfileStatus],
  );
  const isTerminalProfile = isTerminalProfileStatus(effectiveProfileStatus);
  const devReferenceToday = getDevReferenceToday();

  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      setOpenLeaveConfirm(true);
      return;
    }
    navigate("..", { relative: "path" });
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Profile details"
      actions={(
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBackToList}>
          Back to Profile List
        </Button>
      )}
    >
      {!staff ? (
        <Card variant="outlined" sx={{ p: 2.5, maxWidth: 900 }}>
          <Typography color="text.secondary">Loading...</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
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
                {statusReminderDetails.actionLabel}. Then save the profile, or use the action below.
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
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Dev preview date: {devReferenceToday} (VITE_HR_STATUS_REFERENCE_DATE)
                </Typography>
              ) : null}
            </Alert>
          ) : null}

          {!isMdUp ? (
            <Accordion expanded={salaryExpanded} onChange={(_, expanded) => setSalaryExpanded(expanded)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={700}>Salary</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active: {activeSalary ? formatKyats(activeSalary.base_salary) : "Not set"}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>{salaryCardContent}</AccordionDetails>
            </Accordion>
          ) : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-start" }}>
            <Card variant="outlined" sx={{ p: 2.5, flex: 1, minWidth: 0, width: "100%" }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={avatarPreviewUrl || form.avatarUrl || ""} alt={staff.name} sx={{ width: 72, height: 72 }} />
                  <Stack>
                    <Typography variant="h6">{staff.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{staff.email}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {staff.staff_profile?.employee_code || "No Employee Code"}
                    </Typography>
                    <StaffProfileStatusChips
                      profileStatus={effectiveProfileStatus}
                      profileStatusLabel={staff.staff_profile?.profile_status_label}
                      hireDate={form.hireDate || staff.staff_profile?.hire_date}
                      probationMonths={form.probationMonths ?? staff.staff_profile?.probation_months}
                      resignationPeriodEndDate={
                        form.resignationPeriodEndDate ||
                        staff.staff_profile?.resignation_period_end_date
                      }
                      probationEndDate={staff.staff_profile?.probation_end_date}
                      referenceToday={devReferenceToday}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Reports to:{" "}
                      {staff.staff_profile?.reporting_manager?.name ||
                        managerOptions.find(
                          (option) =>
                            String(option.id) === String(form.reportingManagerId),
                        )?.name ||
                        "—"}
                    </Typography>
                  </Stack>
                </Stack>

                <StaffProfileFormSections
                  form={form}
                  setForm={setForm}
                  departments={departments}
                  reportingManagerOptions={managerOptions}
                  excludeUserId={id}
                  avatarPreviewUrl={avatarPreviewUrl}
                  onUploadAvatar={onUploadAvatar}
                  onRemoveAvatar={removeSelectedAvatar}
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

                <HrFormSection title="Custom fields" description="Fields added here apply only to this profile.">
                  {customDefinitions.length > 0 ? (
                    <Stack spacing={1.25}>
                      {customDefinitions.map((field) => (
                        <Stack key={field.id} direction="row" spacing={1} alignItems="flex-start">
                          <LabeledField id={`custom-${field.id}`} label={field.label} required={field.required}>
                            <TextField
                              id={`custom-${field.id}`}
                              size="small"
                              fullWidth
                              required={field.required}
                              value={customValues[field.id] || ""}
                              onChange={(e) =>
                                setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                              }
                            />
                          </LabeledField>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Remove ${field.label}`}
                            onClick={() => removeCustomField(field.id)}
                            sx={{ mt: 3.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No custom fields for this profile yet.
                    </Typography>
                  )}
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-end" }}>
                    <LabeledField id="new-custom-field" label="Add custom field">
                      <TextField
                        id="new-custom-field"
                        size="small"
                        fullWidth
                        value={newCustomFieldLabel}
                        onChange={(e) => setNewCustomFieldLabel(e.target.value)}
                      />
                    </LabeledField>
                    <Button variant="outlined" onClick={createCustomField} sx={{ mb: { md: 0.25 } }}>
                      Add field
                    </Button>
                  </Stack>
                </HrFormSection>

                <HrFormSection title="Weekly schedule" showDivider={false}>
                  {scheduleRows.map((row) => (
                    <Stack key={row.weekday} direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                      <Typography variant="body2" sx={{ minWidth: 60 }}>
                        {WEEKDAY_OPTIONS.find((item) => item.value === row.weekday)?.label}
                      </Typography>
                      <TextField
                        type="time"
                        size="small"
                        label="Start"
                        InputLabelProps={{ shrink: true }}
                        value={row.start_time}
                        disabled={row.is_day_off}
                        onChange={(e) =>
                          setScheduleRows((prev) =>
                            prev.map((item) =>
                              item.weekday === row.weekday ? { ...item, start_time: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <TextField
                        type="time"
                        size="small"
                        label="End"
                        InputLabelProps={{ shrink: true }}
                        value={row.end_time}
                        disabled={row.is_day_off}
                        onChange={(e) =>
                          setScheduleRows((prev) =>
                            prev.map((item) =>
                              item.weekday === row.weekday ? { ...item, end_time: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <TextField
                        type="number"
                        size="small"
                        label="Grace min"
                        value={row.grace_minutes}
                        onChange={(e) =>
                          setScheduleRows((prev) =>
                            prev.map((item) =>
                              item.weekday === row.weekday
                                ? { ...item, grace_minutes: Number(e.target.value || 0) }
                                : item,
                            ),
                          )
                        }
                        sx={{ maxWidth: 120 }}
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption">Day off</Typography>
                        <Switch
                          checked={row.is_day_off}
                          onChange={(e) =>
                            setScheduleRows((prev) =>
                              prev.map((item) =>
                                item.weekday === row.weekday ? { ...item, is_day_off: e.target.checked } : item,
                              ),
                            )
                          }
                        />
                      </Stack>
                    </Stack>
                  ))}
                  <Button variant="outlined" onClick={saveSchedule} sx={{ alignSelf: "flex-start" }}>
                    Save weekly schedule
                  </Button>
                </HrFormSection>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="contained" onClick={save}>Save changes</Button>
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
              <Card variant="outlined" sx={{ p: 2, width: 420, maxWidth: "100%" }}>
                {salaryCardContent}
              </Card>
            ) : null}
          </Stack>
        </Stack>
      )}

      <Dialog open={openSalaryDialog} onClose={() => setOpenSalaryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{salaryDialogMode === "edit_current" ? "Edit Current Salary" : "Promote Salary"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              size="small"
              type="number"
              label="Base Salary"
              value={salaryForm.baseSalary}
              inputProps={{ min: 0, step: 1000 }}
              onChange={(e) => setSalaryForm((prev) => ({ ...prev, baseSalary: e.target.value }))}
            />
            <TextField
              type="date"
              size="small"
              label="Effective From"
              InputLabelProps={{ shrink: true }}
              value={salaryForm.effectiveFrom}
              disabled={salaryDialogMode === "edit_current"}
              onChange={(e) => setSalaryForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
            />
            <TextField
              size="small"
              label="Reason (optional)"
              value={salaryForm.reason}
              onChange={(e) => setSalaryForm((prev) => ({ ...prev, reason: e.target.value.slice(0, 255) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSalaryDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!canSaveSalary || savingSalary} onClick={handleSaveSalary}>
            {savingSalary ? "Saving..." : salaryDialogMode === "edit_current" ? "Save Current Salary" : "Save Promoted Salary"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLeaveConfirm} onClose={() => setOpenLeaveConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You have unsaved changes on this profile page. If you go back now, those changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveConfirm(false)}>Continue Editing</Button>
          <Button
            color="warning"
            onClick={() => {
              setOpenLeaveConfirm(false);
              navigate("..", { relative: "path" });
            }}
          >
            Leave Without Saving
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openResignConfirm} onClose={() => setOpenResignConfirm(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Staff Resignation</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              This sets Profile status to Resigned, records today as the resignation date, and clears
              resignation-period fields. Employment history is updated immediately — you do not need to
              save the form separately.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please confirm that all resignation documentation has been completed prior to proceeding.
            </Typography>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={resignAcknowledged}
                  onChange={(e) => setResignAcknowledged(e.target.checked)}
                />
              )}
              label="I confirm that the official resignation letter has been obtained and signed."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResignConfirm(false)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={!resignAcknowledged} onClick={markResigned}>
            Confirm Resignation
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
