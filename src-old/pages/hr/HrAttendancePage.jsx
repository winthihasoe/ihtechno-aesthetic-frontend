import { useCallback, useEffect, useMemo, useState } from "react";
import DoneIcon from "@mui/icons-material/Done";
import EditIcon from "@mui/icons-material/Edit";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import HrPageShell from "./components/HrPageShell";
import {
  addAttendanceAdjustment,
  approveAttendanceLog,
  checkInStaff,
  checkOutStaff,
  createAttendanceMapping,
  correctAttendanceLog,
  getAttendanceMappings,
  getAttendanceLogs,
  getStaffs,
  importAttendanceReport,
  previewAttendanceImport,
} from "../../services/hrService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";

const formatShiftDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTimeOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const timelineTableSx = {
  "& .MuiTableCell-root": {
    fontSize: "0.8125rem",
    py: 0.75,
    px: 1.25,
  },
  "& .MuiTableCell-head": {
    fontWeight: 700,
    color: "text.secondary",
    bgcolor: "action.hover",
  },
};

const dialogMaxHeightSx = {
  PaperProps: {
    sx: {
      maxHeight: "70vh",
      display: "flex",
      flexDirection: "column",
    },
  },
};

const formatPeriodDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatPayrollMonthLabel = (monthKey) => {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const TIMELINE_PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_TIMELINE_PAGE_SIZE = 50;

const toDateTimeLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const filterImportedPreviewRows = (preview, importedExternalIds) => {
  if (!preview) return null;
  const importedSet = new Set(importedExternalIds);
  const rows = (preview.rows || []).filter(
    (row) => !importedSet.has(row.external_user_id),
  );
  const mappedRows = rows.filter((row) => row.mapped);
  const unmappedExternalIds = rows
    .filter((row) => !row.mapped)
    .map((row) => row.external_user_id);

  return {
    ...preview,
    rows,
    mapped_count: mappedRows.length,
    unmapped_count: unmappedExternalIds.length,
    unmapped_external_ids: unmappedExternalIds,
    can_import: mappedRows.length > 0,
    importable_punches: mappedRows.reduce(
      (sum, row) => sum + (row.punch_count || 0),
      0,
    ),
    total_punches: rows.reduce((sum, row) => sum + (row.punch_count || 0), 0),
  };
};

export default function HrAttendancePage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [checkInAt, setCheckInAt] = useState("");
  const [checkOutLogId, setCheckOutLogId] = useState("");
  const [checkOutAt, setCheckOutAt] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionIn, setCorrectionIn] = useState("");
  const [correctionOut, setCorrectionOut] = useState("");
  const [targetId, setTargetId] = useState(null);
  const [lateDelta, setLateDelta] = useState("0");
  const [overtimeDelta, setOvertimeDelta] = useState("0");
  const [adjustReason, setAdjustReason] = useState("");
  const [mappings, setMappings] = useState([]);
  const [newMapExternalUserId, setNewMapExternalUserId] = useState("");
  const [newMapStaffId, setNewMapStaffId] = useState("");
  const [manualRecordOpen, setManualRecordOpen] = useState(false);
  const [mappingsDialogOpen, setMappingsDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importPreviewing, setImportPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [linkProfileOpen, setLinkProfileOpen] = useState(false);
  const [linkProfileRow, setLinkProfileRow] = useState(null);
  const [linkProfileStaffId, setLinkProfileStaffId] = useState("");
  const [linkProfileSaving, setLinkProfileSaving] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importedExternalIds, setImportedExternalIds] = useState([]);
  const [timelineMonth, setTimelineMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [staffSearchInput, setStaffSearchInput] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelinePerPage, setTimelinePerPage] = useState(
    DEFAULT_TIMELINE_PAGE_SIZE,
  );
  const [timelineMeta, setTimelineMeta] = useState({
    total: 0,
    from: 0,
    to: 0,
    last_page: 1,
  });
  const [timelinePeriod, setTimelinePeriod] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadMappings = useCallback(
    () =>
      getAttendanceMappings()
        .then((res) => setMappings(res.data || []))
        .catch(() => {}),
    [],
  );

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const params = {
        month: timelineMonth,
        page: timelinePage,
        per_page: timelinePerPage,
      };
      if (staffSearch) {
        params.staff_name = staffSearch;
      }
      const res = await getAttendanceLogs(params);
      setRows(Array.isArray(res.data) ? res.data : []);
      setTimelineMeta({
        total: Number(res.total ?? 0),
        from: Number(res.from ?? 0),
        to: Number(res.to ?? 0),
        last_page: Number(res.last_page ?? 1),
      });
      setTimelinePeriod(res.period || null);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load attendance records."),
        severity: "error",
      });
    } finally {
      setTimelineLoading(false);
    }
  }, [
    timelineMonth,
    timelinePage,
    timelinePerPage,
    staffSearch,
    pushToast,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffSearch(staffSearchInput.trim());
      setTimelinePage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [staffSearchInput]);

  useEffect(() => {
    loadTimeline();
    loadMappings();
    getStaffs()
      .then(setStaffs)
      .catch(() => {});
  }, [loadTimeline, loadMappings]);

  const openLogs = useMemo(() => rows.filter((row) => !row.check_out), [rows]);
  const selectedCorrectionRow = useMemo(
    () => rows.find((row) => row.id === targetId),
    [rows, targetId],
  );

  const submitMapping = async () => {
    try {
      await createAttendanceMapping({
        external_user_id: newMapExternalUserId,
        employee_id: newMapStaffId ? Number(newMapStaffId) : null,
      });
      pushToast({ message: "Mapping saved.", severity: "success" });
      setNewMapExternalUserId("");
      setNewMapStaffId("");
      await loadMappings();
      if (importFile) {
        await refreshImportPreview();
      }
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save mapping."),
        severity: "error",
      });
    }
  };

  const submitCheckIn = async () => {
    try {
      await checkInStaff({
        staff_id: Number(staffId),
        check_in: checkInAt || undefined,
      });
      pushToast({ message: "Check-in created.", severity: "success" });
      setCheckInAt("");
      setManualRecordOpen(false);
      loadTimeline();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create check-in."),
        severity: "error",
      });
    }
  };

  const submitCheckOut = async () => {
    try {
      await checkOutStaff({
        attendance_log_id: Number(checkOutLogId),
        check_out: checkOutAt || undefined,
      });
      pushToast({ message: "Check-out saved.", severity: "success" });
      setCheckOutAt("");
      setCheckOutLogId("");
      setManualRecordOpen(false);
      loadTimeline();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to check out."),
        severity: "error",
      });
    }
  };

  const closeCorrectionDialog = () => {
    setTargetId(null);
    setCorrectionIn("");
    setCorrectionOut("");
    setCorrectionNote("");
    setLateDelta("0");
    setOvertimeDelta("0");
    setAdjustReason("");
  };

  const submitCorrection = async () => {
    if (!targetId) return;
    try {
      await correctAttendanceLog(targetId, {
        check_in: correctionIn,
        check_out: correctionOut || null,
        correction_note: correctionNote || "Manual correction",
      });

      const hasAdjustment =
        Number(lateDelta || 0) !== 0 ||
        Number(overtimeDelta || 0) !== 0 ||
        Boolean(adjustReason.trim());

      if (hasAdjustment) {
        await addAttendanceAdjustment(targetId, {
          late_delta_minutes: Number(lateDelta || 0),
          overtime_delta_minutes: Number(overtimeDelta || 0),
          reason: adjustReason || "Manual HR adjustment",
        });
      }

      pushToast({ message: "Attendance record updated.", severity: "success" });
      closeCorrectionDialog();
      loadTimeline();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update attendance."),
        severity: "error",
      });
    }
  };

  const openCorrectionDialog = (row) => {
    setTargetId(row.id);
    setCorrectionIn(toDateTimeLocalInput(row.check_in));
    setCorrectionOut(toDateTimeLocalInput(row.check_out));
    setCorrectionNote("");
    setLateDelta("0");
    setOvertimeDelta("0");
    setAdjustReason("");
  };

  const handlePreviewImport = async () => {
    if (!importFile) return;
    setImportPreviewing(true);
    try {
      const preview = await previewAttendanceImport(importFile);
      setImportPreview(preview);
    } catch (error) {
      setImportPreview(null);
      pushToast({
        message: resolveApiError(error, "Failed to preview attendance import."),
        severity: "error",
      });
    } finally {
      setImportPreviewing(false);
    }
  };

  const displayImportPreview = useMemo(
    () => filterImportedPreviewRows(importPreview, importedExternalIds),
    [importPreview, importedExternalIds],
  );

  const runImportAttendance = async () => {
    if (!importFile || !displayImportPreview?.can_import) return;
    const importedIds = (displayImportPreview.rows || [])
      .filter((row) => row.mapped)
      .map((row) => row.external_user_id);
    setImporting(true);
    try {
      const result = await importAttendanceReport(importFile);
      const skipped = result.skipped_unmapped_external_ids?.length ?? 0;
      pushToast({
        message: `Imported ${result.imported_punches} punches for ${result.staff_count} staff.${
          skipped ? ` Skipped ${skipped} unmapped ID(s).` : ""
        }`,
        severity: "success",
      });
      setImportedExternalIds((prev) => [...prev, ...importedIds]);
      if (result.period?.month) {
        setTimelineMonth(result.period.month);
        setTimelinePage(1);
      }
      loadTimeline();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to import attendance report."),
        severity: "error",
      });
    } finally {
      setImporting(false);
      setImportConfirmOpen(false);
    }
  };

  const handleImportAttendance = () => {
    if (!importFile || !displayImportPreview?.can_import) return;
    if (displayImportPreview.unmapped_external_ids?.length) {
      setImportConfirmOpen(true);
      return;
    }
    runImportAttendance();
  };

  const staffNameById = useMemo(
    () => Object.fromEntries(staffs.map((staff) => [staff.id, staff.name])),
    [staffs],
  );

  const externalIdByStaffId = useMemo(() => {
    const map = {};
    mappings.forEach((mapping) => {
      if (mapping.employee_id && mapping.external_user_id) {
        map[mapping.employee_id] = mapping.external_user_id;
      }
    });
    return map;
  }, [mappings]);

  const formatTimelineName = (row) => {
    const name = row.staff?.name || "Unassigned";
    const staffId = row.staff_id ?? row.staff?.id;
    const externalId = staffId ? externalIdByStaffId[staffId] : null;
    return externalId ? `${name} (${externalId})` : name;
  };

  const mappedStaffIds = useMemo(() => {
    const ids = new Set();
    mappings.forEach((mapping) => {
      if (mapping.employee_id) {
        ids.add(mapping.employee_id);
      }
    });
    return ids;
  }, [mappings]);

  const unmappedStaffOptions = useMemo(
    () => staffs.filter((staff) => !mappedStaffIds.has(staff.id)),
    [staffs, mappedStaffIds],
  );

  const refreshImportPreview = useCallback(async () => {
    if (!importFile) return;
    const preview = await previewAttendanceImport(importFile);
    setImportPreview(preview);
  }, [importFile]);

  const openLinkProfileDialog = (row) => {
    setLinkProfileRow(row);
    setLinkProfileStaffId("");
    setLinkProfileOpen(true);
  };

  const closeLinkProfileDialog = () => {
    setLinkProfileOpen(false);
    setLinkProfileRow(null);
    setLinkProfileStaffId("");
  };

  const saveLinkProfile = async () => {
    if (!linkProfileRow?.external_user_id || !linkProfileStaffId) return;
    setLinkProfileSaving(true);
    try {
      await createAttendanceMapping({
        external_user_id: linkProfileRow.external_user_id,
        employee_id: Number(linkProfileStaffId),
      });
      pushToast({
        message: "Profile linked to external ID.",
        severity: "success",
      });
      await loadMappings();
      if (importFile) {
        await refreshImportPreview();
      }
      closeLinkProfileDialog();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to link profile."),
        severity: "error",
      });
    } finally {
      setLinkProfileSaving(false);
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Daily record - Attendance">
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Import month-end attendance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload the ZKBioTime Attendance Record Report (.xls/.xlsx). Map
                external IDs below, then import daily punches before generating
                payroll.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
            >
              <Button variant="outlined" component="label">
                {importFile ? importFile.name : "Choose file"}
                <input
                  hidden
                  type="file"
                  accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] || null);
                    setImportPreview(null);
                    setImportedExternalIds([]);
                  }}
                />
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={!importFile || importPreviewing}
                  onClick={handlePreviewImport}
                >
                  {importPreviewing ? "Previewing..." : "Preview"}
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={
                    !importFile || !displayImportPreview?.can_import || importing
                  }
                  onClick={handleImportAttendance}
                >
                  {importing ? "Importing..." : "Import"}
                </Button>
              </Stack>
            </Stack>

            {displayImportPreview ? (
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`Period: ${formatPeriodDate(displayImportPreview.period?.from)} – ${formatPeriodDate(displayImportPreview.period?.to)}`}
                  />
                  <Chip
                    size="small"
                    label={`Punches: ${displayImportPreview.total_punches ?? 0}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Staff remaining: ${displayImportPreview.rows?.length ?? 0}`}
                  />
                  {importedExternalIds.length ? (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label={`Imported: ${importedExternalIds.length}`}
                    />
                  ) : null}
                  {displayImportPreview.skipped_no_punches?.length ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Ignored (no punches): ${displayImportPreview.skipped_no_punches.length}`}
                    />
                  ) : null}
                  <Chip
                    size="small"
                    color={displayImportPreview.can_import ? "success" : "warning"}
                    label={
                      !displayImportPreview.rows?.length && importedExternalIds.length
                        ? "All rows imported"
                        : !displayImportPreview.can_import
                          ? "Link at least one profile"
                          : displayImportPreview.unmapped_count
                            ? `Ready (${displayImportPreview.mapped_count ?? 0} linked, ${displayImportPreview.unmapped_count} skipped)`
                            : "Ready to import"
                    }
                  />
                  {displayImportPreview.can_import &&
                  displayImportPreview.importable_punches != null ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Importable punches: ${displayImportPreview.importable_punches}`}
                    />
                  ) : null}
                </Stack>

                {displayImportPreview.skipped_no_punches?.length ? (
                  <Alert severity="info">
                    External IDs with no punches in this period are ignored
                    (e.g. former staff):{" "}
                    {displayImportPreview.skipped_no_punches
                      .map((row) => row.external_user_id)
                      .join(", ")}
                  </Alert>
                ) : null}

                {displayImportPreview.unmapped_external_ids?.length ? (
                  <Alert severity="info">
                    Unlinked IDs will be skipped on import (you can link more
                    and import again):{" "}
                    {displayImportPreview.unmapped_external_ids.join(", ")}
                  </Alert>
                ) : null}

                {displayImportPreview.rows?.length ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>External ID</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Employee</TableCell>
                          <TableCell align="right">Punches</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayImportPreview.rows.map((row) => (
                          <TableRow key={row.external_user_id}>
                            <TableCell>{row.external_user_id}</TableCell>
                            <TableCell>{row.name || "-"}</TableCell>
                            <TableCell>
                              {row.mapped ? (
                                staffNameById[row.employee_id] ||
                                `#${row.employee_id}`
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openLinkProfileDialog(row)}
                                >
                                  Link Profile
                                </Button>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {row.punch_count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : importedExternalIds.length ? (
                  <Alert severity="success">
                    All linked staff from this file have been imported. Review
                    attendance records below, then{" "}
                    <Link to="/hr/payroll">
                      generate payroll
                    </Link>{" "}
                    for {displayImportPreview.period?.month}.
                  </Alert>
                ) : null}

                {displayImportPreview.can_import ? (
                  <Typography variant="body2" color="text.secondary">
                    After import, review attendance records, then{" "}
                    <Link to="/hr/payroll">generate payroll</Link> for{" "}
                    {displayImportPreview.period?.month}.
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </Stack>
        </Card>

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={2}>
            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle2">
                    Attendance timeline
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={
                        timelineMeta.total
                          ? `${timelineMeta.from}-${timelineMeta.to} of ${timelineMeta.total} record${timelineMeta.total === 1 ? "" : "s"}`
                          : "0 records"
                      }
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatPayrollMonthLabel(timelineMonth)}
                    />
                    {timelinePeriod?.period_start && timelinePeriod?.period_end ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${formatPeriodDate(timelinePeriod.period_start)} – ${formatPeriodDate(timelinePeriod.period_end)}`}
                      />
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Payroll month uses the 26–25 cutoff period. Browse page by
                    page to review every record in the range.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setManualRecordOpen(true)}
                  >
                    Add Attendance Record
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setMappingsDialogOpen(true)}
                  >
                    External ID mappings
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
            >
              <TextField
                type="month"
                size="small"
                label="Payroll month"
                InputLabelProps={{ shrink: true }}
                value={timelineMonth}
                onChange={(e) => {
                  setTimelineMonth(e.target.value);
                  setTimelinePage(1);
                }}
                sx={{ minWidth: { sm: 180 } }}
              />
              <TextField
                size="small"
                label="Search staff name"
                value={staffSearchInput}
                onChange={(e) => setStaffSearchInput(e.target.value)}
                sx={{ minWidth: { sm: 220 }, flex: 1 }}
              />
            </Stack>

            <Box>
              {!timelineLoading && !timelineMeta.total ? (
                <AttendanceEmptyState
                  onAddRecord={() => setManualRecordOpen(true)}
                  onOpenMappings={() => setMappingsDialogOpen(true)}
                />
              ) : (
                <TableContainer>
                  <Table size="small" sx={timelineTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>In time</TableCell>
                        <TableCell>Out time</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            {formatShiftDate(row.shift_date || row.check_in)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {formatTimelineName(row)}
                          </TableCell>
                          <TableCell>{formatTimeOnly(row.check_in)}</TableCell>
                          <TableCell>{formatTimeOnly(row.check_out)}</TableCell>
                          <TableCell align="right">
                            {!row.approved_at ? (
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: "0.7rem" }}
                                onClick={async () => {
                                  try {
                                    await approveAttendanceLog(row.id);
                                    pushToast({
                                      message: "Attendance approved.",
                                      severity: "success",
                                    });
                                    loadTimeline();
                                  } catch (error) {
                                    pushToast({
                                      message: resolveApiError(
                                        error,
                                        "Failed to approve attendance.",
                                      ),
                                      severity: "error",
                                    });
                                  }
                                }}
                              >
                                Approve
                              </Button>
                            ) : (
                              <DoneIcon
                                fontSize="small"
                                sx={{ mr: 3 }}
                                color="success"
                              />
                            )}
                            <Tooltip title="Correct">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openCorrectionDialog(row)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={timelineMeta.total}
                    page={Math.max(timelinePage - 1, 0)}
                    onPageChange={(_, newPage) => setTimelinePage(newPage + 1)}
                    rowsPerPage={timelinePerPage}
                    onRowsPerPageChange={(event) => {
                      setTimelinePerPage(parseInt(event.target.value, 10));
                      setTimelinePage(1);
                    }}
                    rowsPerPageOptions={TIMELINE_PAGE_SIZE_OPTIONS}
                    labelDisplayedRows={({ from, to, count }) =>
                      `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                    }
                  />
                </TableContainer>
              )}
            </Box>
          </Stack>
        </Card>
      </Stack>

      <Dialog
        open={manualRecordOpen}
        onClose={() => setManualRecordOpen(false)}
        fullWidth
        maxWidth="sm"
        {...dialogMaxHeightSx}
      >
        <DialogTitle>Manual attendance record</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                label="Staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                sx={{ minWidth: { md: 200 }, flex: 1 }}
              >
                {staffs.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="datetime-local"
                size="small"
                label="Check-in time"
                InputLabelProps={{ shrink: true }}
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                disabled={!staffId}
                onClick={submitCheckIn}
              >
                Create Check-in
              </Button>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                label="Open attendance log"
                value={checkOutLogId}
                onChange={(e) => setCheckOutLogId(e.target.value)}
                sx={{ minWidth: { md: 220 }, flex: 1 }}
              >
                {openLogs.map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    #{row.id} {row.staff?.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="datetime-local"
                size="small"
                label="Check-out time"
                InputLabelProps={{ shrink: true }}
                value={checkOutAt}
                onChange={(e) => setCheckOutAt(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                disabled={!checkOutLogId}
                onClick={submitCheckOut}
              >
                Save Check-out
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualRecordOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mappingsDialogOpen}
        onClose={() => setMappingsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        {...dialogMaxHeightSx}
      >
        <DialogTitle>External ID Mappings</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Stack spacing={2} sx={{ mt: 0.5, flex: 1, minHeight: 0 }}>
            <Box>
              <Typography
                variant="body1"
                gutterBottom
                fontWeight={600}
                color="text.secondary"
              >
                Manual Link Profile to External Id
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems="flex-start"
              >
                <TextField
                  size="small"
                  label="External user ID"
                  value={newMapExternalUserId}
                  onChange={(e) => setNewMapExternalUserId(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  select
                  size="small"
                  label="Employee profile"
                  value={newMapStaffId}
                  onChange={(e) => setNewMapStaffId(e.target.value)}
                  sx={{ minWidth: { sm: 200 }, flex: 1 }}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {staffs.map((staff) => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  disabled={!newMapExternalUserId.trim()}
                  onClick={submitMapping}
                  sx={{ minWidth: 88 }}
                >
                  Save
                </Button>
              </Stack>
            </Box>

            <TableContainer sx={{ flex: 1, overflow: "auto", minHeight: 120 }}>
              <Table size="small" stickyHeader sx={timelineTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>External ID</TableCell>
                    <TableCell>Profile name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id} hover>
                      <TableCell>{mapping.external_user_id}</TableCell>
                      <TableCell>
                        {mapping.employee?.name || "Unassigned"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!mappings.length ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography variant="body2" color="text.secondary">
                          No external ID mappings yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirm partial import</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2">
              You have linked {displayImportPreview?.mapped_count ?? 0} external ID
              {(displayImportPreview?.mapped_count ?? 0) === 1 ? "" : "s"}.{" "}
              {displayImportPreview?.unmapped_count ?? 0} row
              {(displayImportPreview?.unmapped_count ?? 0) === 1 ? "" : "s"} still need
              Link Profile and will be skipped.
            </Typography>
            {displayImportPreview?.unmapped_external_ids?.length ? (
              <Typography variant="body2" color="text.secondary">
                Skipped IDs: {displayImportPreview.unmapped_external_ids.join(", ")}
              </Typography>
            ) : null}
            <Typography variant="body2">
              Import will load {displayImportPreview?.importable_punches ?? 0}{" "}
              punch(es) for linked staff only. Re-importing the same file
              replaces previous import punches for those staff in this period.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setImportConfirmOpen(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={importing}
            onClick={runImportAttendance}
          >
            {importing ? "Importing..." : "Import linked staff"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={linkProfileOpen}
        onClose={closeLinkProfileDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Link profile</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                External ID
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {linkProfileRow?.external_user_id || "-"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Name (from report)
              </Typography>
              <Typography variant="body1">
                {linkProfileRow?.name || "-"}
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              label="Staff profile"
              value={linkProfileStaffId}
              onChange={(e) => setLinkProfileStaffId(e.target.value)}
              helperText={
                unmappedStaffOptions.length
                  ? "Profiles not linked to any external ID yet."
                  : "All staff profiles are already linked. Add staff or free a mapping first."
              }
            >
              <MenuItem value="">Select profile</MenuItem>
              {unmappedStaffOptions.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLinkProfileDialog} disabled={linkProfileSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !linkProfileStaffId ||
              linkProfileSaving ||
              !unmappedStaffOptions.length
            }
            onClick={saveLinkProfile}
          >
            {linkProfileSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(targetId)}
        onClose={closeCorrectionDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Correct attendance record</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {selectedCorrectionRow
                  ? formatTimelineName(selectedCorrectionRow)
                  : "Selected record"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current: {formatTimeOnly(selectedCorrectionRow?.check_in)} –{" "}
                {formatTimeOnly(selectedCorrectionRow?.check_out)} · Late{" "}
                {selectedCorrectionRow?.late_minutes_final || 0}m · OT{" "}
                {selectedCorrectionRow?.overtime_minutes_final || 0}m
              </Typography>
            </Box>
            <TextField
              type="datetime-local"
              size="small"
              label="Corrected check-in"
              InputLabelProps={{ shrink: true }}
              value={correctionIn}
              onChange={(e) => setCorrectionIn(e.target.value)}
            />
            <TextField
              type="datetime-local"
              size="small"
              label="Corrected check-out"
              InputLabelProps={{ shrink: true }}
              value={correctionOut}
              onChange={(e) => setCorrectionOut(e.target.value)}
            />
            <TextField
              size="small"
              label="Correction note"
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
            />
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Minute adjustments (optional — applied on top of calculated
              late/OT)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Late +/- min"
                type="number"
                value={lateDelta}
                onChange={(e) => setLateDelta(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="OT +/- min"
                type="number"
                value={overtimeDelta}
                onChange={(e) => setOvertimeDelta(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              size="small"
              label="Adjustment reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCorrectionDialog}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!correctionIn}
            onClick={submitCorrection}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function AttendanceEmptyState({ onAddRecord, onOpenMappings }) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <HowToRegOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No attendance records yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 480, mx: "auto", mb: 2 }}
      >
        Track staff check-in and check-out, import month-end ZKBioTime reports,
        and approve duty records before payroll runs.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 440,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Import:</strong> Upload the report above, link external IDs to
          staff profiles, then import daily punches.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Manual:</strong> Add check-in and check-out for individual staff
          when needed.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Approve:</strong> Review each row and approve — approved hours
          feed overtime and monthly{" "}
          <Link to="/hr/payroll">payroll</Link>.
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="center"
        sx={{ mb: 1 }}
      >
        <Button variant="contained" onClick={onAddRecord}>
          Add attendance record
        </Button>
        <Button variant="outlined" onClick={onOpenMappings}>
          External ID mappings
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Start with a month-end import, or add manual records for today.
      </Typography>
    </Box>
  );
}
