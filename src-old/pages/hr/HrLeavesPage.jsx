import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import HrPageShell from "./components/HrPageShell";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import {
  approveLeave,
  createLeaveType,
  deleteLeaveType,
  getLeaves,
  getLeaveTypes,
  rejectLeave,
  resolveLeaveAppeal,
  sendLeaveReply,
  updateLeaveType,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const STORAGE_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(
    /\/api$/,
    "",
  ) + "/storage/";

function isImagePath(path) {
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i.test(path);
}

const formatMonth = (monthKey) => {
  if (monthKey === "Unknown") return "Unknown month";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const monthKeyFrom = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const leaveMonthDate = (row) => row.start_date || row.created_at;

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "denied") return "error";
  if (status === "pending") return "warning";
  return "default";
};

const statusLabel = (status) =>
  String(status || "unknown").replaceAll("_", " ");

const emptyLeaveFilters = { status: "", leaveType: "" };

export default function HrLeavesPage() {
  const { pushToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const workspacePrefix = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/admin";
  const [rows, setRows] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyLeaveFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyLeaveFilters);
  const [decisionNote, setDecisionNote] = useState({});
  const [replyMessage, setReplyMessage] = useState({});
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypesDialogOpen, setLeaveTypesDialogOpen] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState("");
  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState(null);
  const [editingLeaveTypeName, setEditingLeaveTypeName] = useState("");
  const [savingLeaveType, setSavingLeaveType] = useState(false);
  const [deletingLeaveTypeId, setDeletingLeaveTypeId] = useState(null);

  const load = () => getLeaves().then((res) => setRows(res.data || []));
  const loadLeaveTypes = () =>
    getLeaveTypes().then((res) => setLeaveTypes(res.data || []));
  useEffect(() => {
    load();
    loadLeaveTypes().catch(() => {});
  }, []);

  const runAction = async (callback, message) => {
    try {
      await callback();
      pushToast({ message, severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Action failed."),
        severity: "error",
      });
    }
  };

  const hasActiveFilters = Boolean(
    appliedFilters.status || appliedFilters.leaveType,
  );
  const activeFilterCount =
    Number(Boolean(appliedFilters.status)) +
    Number(Boolean(appliedFilters.leaveType));

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(emptyLeaveFilters);
    setAppliedFilters(emptyLeaveFilters);
  };

  const leaveTypeFilterOptions = useMemo(() => {
    const options = new Map();
    leaveTypes.forEach((type) => options.set(type.name, type.name));
    rows.forEach((row) => {
      if (row.leave_type) options.set(row.leave_type, row.leave_type);
    });
    return Array.from(options.values()).sort((a, b) => a.localeCompare(b));
  }, [leaveTypes, rows]);

  const filteredRows = rows.filter((row) => {
    if (appliedFilters.status && row.status !== appliedFilters.status) return false;
    if (appliedFilters.leaveType && row.leave_type !== appliedFilters.leaveType)
      return false;
    return true;
  });

  const groupedMonths = useMemo(() => {
    const months = new Map();

    filteredRows.forEach((row) => {
      const monthKey = monthKeyFrom(leaveMonthDate(row));
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey).push(row);
    });

    return Array.from(months.entries())
      .map(([monthKey, monthRows]) => ({
        monthKey,
        rows: monthRows.sort((a, b) =>
          String(leaveMonthDate(b)).localeCompare(String(leaveMonthDate(a))),
        ),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredRows]);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const createType = async () => {
    const name = newLeaveType.trim();
    if (!name) {
      pushToast({ message: "Enter a leave type name.", severity: "warning" });
      return;
    }

    setSavingLeaveType(true);
    try {
      await createLeaveType({ name });
      setNewLeaveType("");
      await loadLeaveTypes();
      pushToast({ message: "Leave type created.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create leave type."),
        severity: "error",
      });
    } finally {
      setSavingLeaveType(false);
    }
  };

  const startEditType = (type) => {
    setEditingLeaveTypeId(type.id);
    setEditingLeaveTypeName(type.name);
  };

  const cancelEditType = () => {
    setEditingLeaveTypeId(null);
    setEditingLeaveTypeName("");
  };

  const saveType = async (type) => {
    const name = editingLeaveTypeName.trim();
    if (!name) {
      pushToast({ message: "Enter a leave type name.", severity: "warning" });
      return;
    }

    setSavingLeaveType(true);
    try {
      await updateLeaveType(type.id, { name });
      cancelEditType();
      await loadLeaveTypes();
      pushToast({ message: "Leave type updated.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update leave type."),
        severity: "error",
      });
    } finally {
      setSavingLeaveType(false);
    }
  };

  const closeLeaveTypesDialog = () => {
    if (savingLeaveType) return;
    setLeaveTypesDialogOpen(false);
    cancelEditType();
    setNewLeaveType("");
  };

  const deleteType = async (type) => {
    const confirmed = window.confirm(
      `Delete "${type.name}" from new leave requests? Existing requests keep their leave type text.`,
    );
    if (!confirmed) return;

    setDeletingLeaveTypeId(type.id);
    try {
      const res = await deleteLeaveType(type.id);
      setLeaveTypes(res.data || []);
      if (appliedFilters.leaveType === type.name) {
        setAppliedFilters((prev) => ({ ...prev, leaveType: "" }));
        setDraftFilters((prev) => ({ ...prev, leaveType: "" }));
      }
      pushToast({ message: "Leave type deleted.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete leave type."),
        severity: "error",
      });
    } finally {
      setDeletingLeaveTypeId(null);
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Daily record - Leaves">
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1.5}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Leave Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review HR and owner leave approvals grouped by request month.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`${filteredRows.length} showing`} />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${rows.filter((row) => row.status === "pending").length} pending`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${rows.filter((row) => row.appeal_status === "submitted").length} appeals`}
                />
              </Stack>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <CollapsibleFiltersToggle
                open={filtersOpen}
                onToggle={setFiltersOpen}
                activeCount={activeFilterCount}
                size="small"
              />
              <Button
                variant="outlined"
                onClick={() => setLeaveTypesDialogOpen(true)}
              >
                Show Leave Types
              </Button>
              <Button
                variant="outlined"
                startIcon={<RuleOutlinedIcon />}
                onClick={() =>
                  navigate(`${workspacePrefix}/hr/leave-rules`)
                }
              >
                Show Leave Rules
              </Button>
            </Stack>

            <CollapsibleFiltersPanel
              open={filtersOpen}
              onApply={applyFilters}
              onClear={clearFilters}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Filter status"
                  value={draftFilters.status}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  sx={{
                    width: { xs: "100%", md: 220, lg: 240 },
                    flex: "0 0 auto",
                  }}
                >
                  <MenuItem value="">All statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="denied">Denied</MenuItem>
                  <MenuItem value="cancelled_by_employee">Cancelled</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Filter leave type"
                  value={draftFilters.leaveType}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      leaveType: e.target.value,
                    }))
                  }
                  sx={{
                    width: { xs: "100%", md: 220, lg: 240 },
                    flex: "0 0 auto",
                  }}
                >
                  <MenuItem value="">All leave types</MenuItem>
                  {leaveTypeFilterOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CollapsibleFiltersPanel>
          </Stack>
        </Card>

        {groupedMonths.map((month) => (
          <Card
            key={month.monthKey}
            variant="outlined"
            sx={{ p: { xs: 1.5, sm: 2 } }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatMonth(month.monthKey)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {month.rows.length} leave request
                    {month.rows.length === 1 ? "" : "s"} in this month
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`${month.rows.filter((row) => row.status === "pending").length} pending`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${month.rows.filter((row) => row.appeal_status === "submitted").length} appeals`}
                  />
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(auto-fit, minmax(200px, 250px))",
                    md: "repeat(auto-fit, minmax(250px, 300px))",
                    lg: "repeat(auto-fit, minmax(360px, 420px))",
                  },
                  justifyContent: { xs: "stretch", sm: "start" },
                }}
              >
                {month.rows.map((row) => (
                  <Card
                    variant="outlined"
                    key={row.id}
                    sx={{
                      p: 1.5,
                      height: "100%",
                      transition:
                        "border-color 120ms ease, background-color 120ms ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="column"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            alignItems="center"
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {row.staff?.name || "Unassigned employee"}
                            </Typography>
                            <Chip
                              size="small"
                              color={statusColor(row.status)}
                              variant={
                                row.status === "approved"
                                  ? "filled"
                                  : "outlined"
                              }
                              label={statusLabel(row.status)}
                            />
                            {row.is_emergency ? (
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label="Emergency"
                              />
                            ) : null}
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 0.35 }}>
                            {formatDate(row.start_date)} to{" "}
                            {formatDate(row.end_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.leave_type || "Leave"} | category:{" "}
                            {row.reason_category || "-"} | submitted{" "}
                            {formatDateTime(row.created_at)}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {row.status === "pending" ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      approveLeave(row.id, {
                                        comment: decisionNote[row.id],
                                      }),
                                    "Leave approved.",
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      rejectLeave(row.id, {
                                        reason:
                                          decisionNote[row.id] ||
                                          "Denied by HR.",
                                      }),
                                    "Leave denied.",
                                  )
                                }
                              >
                                Deny
                              </Button>
                            </>
                          ) : null}
                          {row.appeal_status === "submitted" ? (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      resolveLeaveAppeal(row.id, {
                                        appeal_status: "resolved_upheld",
                                        appeal_resolution_note:
                                          decisionNote[row.id] ||
                                          "Original decision stands.",
                                      }),
                                    "Appeal resolved (upheld).",
                                  )
                                }
                              >
                                Uphold
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      resolveLeaveAppeal(row.id, {
                                        appeal_status: "resolved_revised",
                                        appeal_resolution_note:
                                          decisionNote[row.id] ||
                                          "Decision revised after review.",
                                      }),
                                    "Appeal resolved (revised).",
                                  )
                                }
                              >
                                Revise
                              </Button>
                            </>
                          ) : null}
                        </Stack>
                      </Stack>

                      <Typography variant="body2">
                        {row.reason || "No reason provided."}
                      </Typography>

                      {row.attachment_paths?.length ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                          >
                            Leave attachments ({row.attachment_paths.length})
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {row.attachment_paths.map((path, idx) =>
                              isImagePath(path) ? (
                                <Box
                                  key={idx}
                                  component="a"
                                  href={STORAGE_BASE + path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Box
                                    component="img"
                                    src={STORAGE_BASE + path}
                                    alt={`leave-attachment-${idx + 1}`}
                                    sx={{
                                      width: 72,
                                      height: 72,
                                      objectFit: "cover",
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      display: "block",
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Button
                                  key={idx}
                                  size="small"
                                  variant="outlined"
                                  component="a"
                                  href={STORAGE_BASE + path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    fontSize: "0.7rem",
                                    textTransform: "none",
                                  }}
                                >
                                  File {idx + 1}
                                </Button>
                              ),
                            )}
                          </Stack>
                        </Box>
                      ) : null}

                      {row.appeal_status === "submitted" ? (
                        <Card
                          variant="outlined"
                          sx={{ p: 1, bgcolor: "action.hover" }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Appeal
                          </Typography>
                          <Typography variant="body2">
                            {row.appeal_reason}
                          </Typography>
                        </Card>
                      ) : null}

                      {row.management_reply_message ||
                      row.employee_reply_message ? (
                        <Card variant="outlined" sx={{ p: 1 }}>
                          {row.management_reply_message ? (
                            <Typography variant="body2">
                              Management reply: {row.management_reply_message} (
                              {formatDateTime(row.management_replied_at)})
                            </Typography>
                          ) : null}
                          {row.employee_reply_message ? (
                            <Typography variant="body2">
                              Employee reply: {row.employee_reply_message} (
                              {formatDateTime(row.employee_replied_at)})
                            </Typography>
                          ) : null}
                        </Card>
                      ) : null}

                      {row.employee_reply_attachment_paths?.length ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                          >
                            Employee reply attachments (
                            {row.employee_reply_attachment_paths.length})
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {row.employee_reply_attachment_paths.map(
                              (path, idx) =>
                                isImagePath(path) ? (
                                  <Box
                                    key={idx}
                                    component="a"
                                    href={STORAGE_BASE + path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Box
                                      component="img"
                                      src={STORAGE_BASE + path}
                                      alt={`attachment-${idx + 1}`}
                                      sx={{
                                        width: 72,
                                        height: 72,
                                        objectFit: "cover",
                                        borderRadius: 1,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        display: "block",
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  <Button
                                    key={idx}
                                    size="small"
                                    variant="outlined"
                                    component="a"
                                    href={STORAGE_BASE + path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      fontSize: "0.7rem",
                                      textTransform: "none",
                                    }}
                                  >
                                    File {idx + 1}
                                  </Button>
                                ),
                            )}
                          </Stack>
                        </Box>
                      ) : null}

                      <Stack direction="column" spacing={1}>
                        <TextField
                          size="small"
                          label="Decision note"
                          value={decisionNote[row.id] || ""}
                          onChange={(e) =>
                            setDecisionNote((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          label="Reply message to employee"
                          value={replyMessage[row.id] || ""}
                          onChange={(e) =>
                            setReplyMessage((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!replyMessage[row.id]?.trim()}
                          onClick={async () => {
                            try {
                              await sendLeaveReply(row.id, {
                                management_reply_message: replyMessage[row.id],
                                decision_note:
                                  decisionNote[row.id] || undefined,
                              });
                              setReplyMessage((prev) => ({
                                ...prev,
                                [row.id]: "",
                              }));
                              pushToast({
                                message: "Management reply sent.",
                                severity: "success",
                              });
                              await load();
                            } catch (error) {
                              pushToast({
                                message: resolveApiError(
                                  error,
                                  "Action failed.",
                                ),
                                severity: "error",
                              });
                            }
                          }}
                        >
                          Send reply
                        </Button>
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Reviewed: {formatDateTime(row.reviewed_at)}
                      </Typography>
                    </Stack>
                  </Card>
                ))}
              </Box>
            </Stack>
          </Card>
        ))}

        {!groupedMonths.length ? (
          <LeavesEmptyState
            hasActiveFilters={hasActiveFilters}
            hasAnyRows={rows.length > 0}
            onClearFilters={() => setFilters({ status: "", leaveType: "" })}
          />
        ) : null}
      </Stack>

      <Dialog
        open={leaveTypesDialogOpen}
        onClose={closeLeaveTypesDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Leave Types</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Manage the leave type options staff can choose. Submitted requests
              keep their selected text even if a type is renamed or deleted
              later.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="New leave type"
                value={newLeaveType}
                onChange={(e) => setNewLeaveType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createType();
                }}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={createType}
                disabled={savingLeaveType}
                sx={{ flexShrink: 0 }}
              >
                Add type
              </Button>
            </Stack>
            <Stack spacing={1}>
              {leaveTypes.map((type) => (
                <Card key={type.id} variant="outlined" sx={{ p: 1.25 }}>
                  {editingLeaveTypeId === type.id ? (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <TextField
                        size="small"
                        value={editingLeaveTypeName}
                        onChange={(e) =>
                          setEditingLeaveTypeName(e.target.value)
                        }
                        fullWidth
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => saveType(type)}
                        disabled={savingLeaveType}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={cancelEditType}>
                        Cancel
                      </Button>
                    </Stack>
                  ) : (
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {type.name}
                        </Typography>
                        {type.system_key ? (
                          <Typography variant="caption" color="text.secondary">
                            Built-in {type.system_key}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Rename leave type">
                          <IconButton
                            size="small"
                            onClick={() => startEditType(type)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete leave type">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteType(type)}
                              disabled={deletingLeaveTypeId === type.id}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  )}
                </Card>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLeaveTypesDialog} disabled={savingLeaveType}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function LeavesEmptyState({ hasActiveFilters, hasAnyRows, onClearFilters }) {
  if (hasActiveFilters && hasAnyRows) {
    return (
      <Card variant="outlined" sx={{ p: 2.5, bgcolor: "action.hover" }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          No leave requests match these filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Try a different status or leave type, or clear filters to see the full
          inbox grouped by month.
        </Typography>
        <Button size="small" variant="outlined" onClick={onClearFilters}>
          Clear filters
        </Button>
      </Card>
    );
  }

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
      <BeachAccessOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No leave requests yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        This is HR&apos;s leave inbox. Staff submit time-off requests from their
        own page; they appear here for HR and owner review, grouped by request
        month.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Staff submit:</strong> Employees file annual, sick, or unpaid
          leave from <em>My Leave Request</em> with dates, reason, and optional
          attachments.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Review &amp; decide:</strong> Approve or deny pending
          requests. Add a decision note so the outcome is documented.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Appeals:</strong> If a request is denied, staff may appeal —
          uphold the original decision or revise it after review.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Replies:</strong> Send management replies to the employee;
          they can respond in the same thread with notes or attachments.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Monthly view:</strong> Requests are grouped by start month so
          you can scan workload period by period. Pending and appeal counts show
          in the header chips.
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        When requests arrive, use the status and leave type filters above to
        focus on pending items or a specific leave category.
      </Typography>
    </Box>
  );
}
