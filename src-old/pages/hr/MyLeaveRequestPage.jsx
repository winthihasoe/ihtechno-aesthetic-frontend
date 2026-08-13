import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";
import HrPageShell from "./components/HrPageShell";
import {
  appealLeave,
  cancelLeave,
  createLeave,
  getLeaveBalance,
  getLeaves,
  getLeaveRules,
  getLeaveTypes,
  sendEmployeeLeaveReply,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const createInitialForm = (leaveType = "Annual") => ({
  leaveType,
  reasonCategory: "personal",
  durationUnit: "full_day",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  expectedReturnDate: "",
  reason: "",
  handoverNotes: "",
  contactDuringLeave: "",
  requestTiming: "planned",
  isEmergency: "no",
  incidentSummary: "",
  treatmentProvider: "",
  fitToWorkDate: "",
  employeeSignature: "",
  attachments: [],
});

export default function MyLeaveRequestPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [appealDrafts, setAppealDrafts] = useState({});
  const [employeeReplyDrafts, setEmployeeReplyDrafts] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [leaveRules, setLeaveRules] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState({
    annual: { remaining: 0 },
    sick: { remaining: 0 },
  });
  const leaveRulesCardRef = useRef(null);

  const load = useCallback(async () => {
    const res = await getLeaves();
    setRows(res.data || []);
    try {
      const balance = await getLeaveBalance();
      setLeaveBalances(balance);
    } catch {
      setLeaveBalances({
        annual: { remaining: 0 },
        sick: { remaining: 0 },
      });
    }
  }, []);

  useEffect(() => {
    load();
    getLeaveRules()
      .then((res) => setLeaveRules(res.data || []))
      .catch(() => {});
    getLeaveTypes()
      .then((res) => setLeaveTypes(res.data || []))
      .catch(() => {});
  }, [load]);
  const activeLeaveRules = useMemo(
    () => leaveRules.filter((rule) => rule.is_enabled),
    [leaveRules],
  );
  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => type.name === form.leaveType),
    [form.leaveType, leaveTypes],
  );
  const isSickLeave =
    selectedLeaveType?.system_key === "sick" ||
    form.leaveType.trim().toLowerCase() === "sick";

  useEffect(() => {
    if (!leaveTypes.length) return;
    if (leaveTypes.some((type) => type.name === form.leaveType)) return;
    setForm((prev) => ({ ...prev, leaveType: leaveTypes[0].name }));
  }, [form.leaveType, leaveTypes]);

  const submitLeave = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("leave_type", form.leaveType);
      payload.append("reason_category", form.reasonCategory);
      payload.append("duration_unit", form.durationUnit);
      payload.append("start_date", form.startDate);
      payload.append("end_date", form.endDate);
      if (form.expectedReturnDate)
        payload.append("expected_return_date", form.expectedReturnDate);
      payload.append("reason", form.reason);
      payload.append("handover_notes", form.handoverNotes);
      payload.append("contact_during_leave", form.contactDuringLeave);
      payload.append("request_timing", form.requestTiming);
      payload.append("is_emergency", form.isEmergency === "yes" ? "1" : "0");
      payload.append("employee_acknowledged", "1");
      payload.append("employee_signature", form.employeeSignature);
      if (isSickLeave) {
        payload.append("incident_summary", form.incidentSummary);
        payload.append("treatment_provider", form.treatmentProvider);
        if (form.fitToWorkDate)
          payload.append("fit_to_work_date", form.fitToWorkDate);
      }
      form.attachments.forEach(({ file }) =>
        payload.append("attachments[]", file),
      );
      await createLeave(payload);
      setForm(createInitialForm(leaveTypes[0]?.name || "Annual"));
      setFormOpen(false);
      pushToast({ message: "Leave request submitted.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to submit leave request."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitAppeal = async (row) => {
    try {
      if (!appealDrafts[row.id]) {
        pushToast({
          message: "Appeal reason is required.",
          severity: "warning",
        });
        return;
      }
      await appealLeave(row.id, { appeal_reason: appealDrafts[row.id] });
      pushToast({ message: "Appeal submitted.", severity: "success" });
      setAppealDrafts((prev) => ({ ...prev, [row.id]: "" }));
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to submit appeal."),
        severity: "error",
      });
    }
  };

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

  const confirmCancelRequest = async () => {
    if (!cancelTarget) return;
    try {
      await cancelLeave(cancelTarget.id);
      pushToast({ message: "Leave request cancelled.", severity: "success" });
      setCancelTarget(null);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to cancel leave request."),
        severity: "error",
      });
    }
  };

  const submitEmployeeReply = async (row) => {
    const draft = employeeReplyDrafts[row.id] || {
      message: "",
      attachments: [],
    };
    const hasMessage = !!draft.message?.trim();
    const hasFiles = (draft.attachments || []).length > 0;
    if (!hasMessage && !hasFiles) {
      pushToast({
        message: "Please enter a message or attach a file.",
        severity: "warning",
      });
      return;
    }
    try {
      const payload = new FormData();
      if (hasMessage)
        payload.append("employee_reply_message", draft.message.trim());
      (draft.attachments || []).forEach((item) =>
        payload.append("employee_reply_attachments[]", item.file),
      );
      await sendEmployeeLeaveReply(row.id, payload);
      // revoke preview URLs to free memory
      (draft.attachments || []).forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
      setEmployeeReplyDrafts((prev) => ({
        ...prev,
        [row.id]: { message: "", attachments: [] },
      }));
      pushToast({ message: "Reply sent to management.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to send reply."),
        severity: "error",
      });
    }
  };

  const sectionCardSx = {
    borderRadius: 2,
    borderColor: "divider",
    p: 2,
    backgroundColor: "action.hover",
  };

  return (
    <HrPageShell title="HR Module" subtitle="Leave request">
      <Button
        variant="contained"
        color="primary"
        onClick={() =>
          leaveRulesCardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
        sx={{ mb: 2 }}
      >
        See Leave Rules
      </Button>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            variant="outlined"
            sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}
          >
            {/* Collapsed header — always visible */}
            <Box
              onClick={() => setFormOpen((v) => !v)}
              sx={{
                px: 2.5,
                py: 1.75,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: formOpen ? "background.paper" : "action.hover",
                borderBottom: formOpen ? "1px solid" : "none",
                borderColor: "divider",
                userSelect: "none",
                transition: "background-color 0.2s",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    bgcolor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AddIcon
                    sx={{ color: "primary.contrastText", fontSize: 18 }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      lineHeight: 1.2,
                    }}
                  >
                    Submit Leave Request
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formOpen
                      ? "Fill in the form below and submit"
                      : "Click to open the request form"}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {!formOpen && (
                  <Chip
                    size="small"
                    label="New request"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                <ExpandMoreIcon
                  sx={{
                    color: "text.secondary",
                    fontSize: 24,
                    transform: formOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                />
              </Stack>
            </Box>

            {/* Collapsible form body */}
            <Collapse in={formOpen} timeout={300}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                  mb={2}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Submit Leave Request
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complete all sections for faster manager review.
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={isSickLeave ? "warning" : "primary"}
                    label={
                      isSickLeave
                        ? "Medical evidence recommended"
                        : "Standard request"
                    }
                  />
                </Stack>
                <Stack spacing={1.5}>
                  <Box sx={sectionCardSx}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, fontWeight: 700 }}
                    >
                      Leave Details
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Leave type"
                          value={form.leaveType}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              leaveType: e.target.value,
                            }))
                          }
                        >
                          {leaveTypes.length ? (
                            leaveTypes.map((type) => (
                              <MenuItem key={type.id} value={type.name}>
                                {type.name}
                              </MenuItem>
                            ))
                          ) : (
                            <MenuItem value={form.leaveType}>
                              {form.leaveType || "No leave types available"}
                            </MenuItem>
                          )}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Reason category"
                          value={form.reasonCategory}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              reasonCategory: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="personal">Personal</MenuItem>
                          <MenuItem value="medical">Medical</MenuItem>
                          <MenuItem value="family">Family</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Duration"
                          value={form.durationUnit}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              durationUnit: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="full_day">Full day</MenuItem>
                          <MenuItem value="half_day">Half day</MenuItem>
                          <MenuItem value="hours">Hours</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          size="small"
                          type="date"
                          fullWidth
                          label="Start date"
                          InputLabelProps={{ shrink: true }}
                          value={form.startDate}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          size="small"
                          type="date"
                          fullWidth
                          label="End date"
                          InputLabelProps={{ shrink: true }}
                          value={form.endDate}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, endDate: e.target.value }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          size="small"
                          type="date"
                          fullWidth
                          label="Expected return"
                          InputLabelProps={{ shrink: true }}
                          value={form.expectedReturnDate}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              expectedReturnDate: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={sectionCardSx}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, fontWeight: 700 }}
                    >
                      Work Coverage
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={12}>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          label="Reason details"
                          value={form.reason}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, reason: e.target.value }))
                          }
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          label="Handover notes"
                          value={form.handoverNotes}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              handoverNotes: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Contact during leave"
                          value={form.contactDuringLeave}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              contactDuringLeave: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Request timing"
                          value={form.requestTiming}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              requestTiming: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="planned">Planned</MenuItem>
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Emergency"
                          value={form.isEmergency}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              isEmergency: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="no">No</MenuItem>
                          <MenuItem value="yes">Yes</MenuItem>
                        </TextField>
                      </Grid>
                    </Grid>
                  </Box>

                  {isSickLeave ? (
                    <Box sx={sectionCardSx}>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1, fontWeight: 700 }}
                      >
                        Medical Information
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid size={12}>
                          <Alert severity="info">
                            Sick leave: upload medical records, photos, or
                            incident evidence.
                          </Alert>
                        </Grid>
                        <Grid size={12}>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            label="Incident summary"
                            value={form.incidentSummary}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                incidentSummary: e.target.value,
                              }))
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Hospital / provider"
                            value={form.treatmentProvider}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                treatmentProvider: e.target.value,
                              }))
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            size="small"
                            type="date"
                            fullWidth
                            label="Fit-to-work date"
                            InputLabelProps={{ shrink: true }}
                            value={form.fitToWorkDate}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                fitToWorkDate: e.target.value,
                              }))
                            }
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ) : null}

                  <Box sx={sectionCardSx}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, fontWeight: 700 }}
                    >
                      Attachments and Confirmation
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Button
                          component="label"
                          variant="outlined"
                          fullWidth
                          sx={{ height: 40 }}
                        >
                          Upload files
                          <input
                            hidden
                            type="file"
                            multiple
                            onChange={(e) => {
                              const newFiles = Array.from(e.target.files || []);
                              setForm((p) => ({
                                ...p,
                                attachments: [
                                  ...p.attachments,
                                  ...newFiles.map((file) => ({
                                    file,
                                    url: file.type.startsWith("image/")
                                      ? URL.createObjectURL(file)
                                      : null,
                                    name: file.name,
                                  })),
                                ],
                              }));
                              e.target.value = "";
                            }}
                          />
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Signature (typed name)"
                          value={form.employeeSignature}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              employeeSignature: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                      {form.attachments.length > 0 && (
                        <Grid size={12}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {form.attachments.map((item, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                {item.url ? (
                                  <Box
                                    component="img"
                                    src={item.url}
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
                                ) : (
                                  <Box
                                    sx={{
                                      width: 72,
                                      height: 72,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid",
                                      borderColor: "divider",
                                      borderRadius: 1,
                                      p: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        textAlign: "center",
                                        wordBreak: "break-all",
                                        fontSize: "0.6rem",
                                      }}
                                    >
                                      {item.name}
                                    </Typography>
                                  </Box>
                                )}
                                <IconButton
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    top: -8,
                                    right: -8,
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    p: "2px",
                                    "&:hover": { bgcolor: "action.hover" },
                                  }}
                                  onClick={() => {
                                    if (item.url) URL.revokeObjectURL(item.url);
                                    setForm((p) => ({
                                      ...p,
                                      attachments: p.attachments.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    }));
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                              </Box>
                            ))}
                          </Stack>
                        </Grid>
                      )}
                      <Grid size={12}>
                        <Typography variant="caption" color="text.secondary">
                          {form.attachments.length} file
                          {form.attachments.length !== 1 ? "s" : ""} selected.
                          Form clears after successful submission.
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="flex-end"
                  spacing={1}
                >
                  <Button
                    variant="contained"
                    disabled={loading}
                    onClick={submitLeave}
                    sx={{ px: 3 }}
                  >
                    Submit leave request
                  </Button>
                </Stack>
              </CardContent>
            </Collapse>
          </Card>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <Box
              sx={{
                px: 2.5,
                py: 1.75,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                My Leave Requests
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {rows.length} request{rows.length !== 1 ? "s" : ""} total
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {rows.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  No leave requests yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((row) => {
                    const isReadOnly = ["cancelled", "denied"].includes(
                      row.status,
                    );
                    const statusChipColor =
                      row.status === "approved"
                        ? "success"
                        : row.status === "denied"
                          ? "error"
                          : row.status === "pending"
                            ? "warning"
                            : "default";
                    const statusBorderColor =
                      row.status === "approved"
                        ? "success.main"
                        : row.status === "denied"
                          ? "error.main"
                          : row.status === "pending"
                            ? "warning.main"
                            : row.status === "cancelled"
                              ? "action.disabledBackground"
                              : "divider";

                    return (
                      <Card
                        key={row.id}
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          overflow: "hidden",
                          borderLeft: "4px solid",
                          borderLeftColor: statusBorderColor,
                        }}
                      >
                        {/* Card header */}
                        <Box
                          sx={{
                            px: 2,
                            py: 1.25,
                            bgcolor: "action.hover",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ sm: "center" }}
                            spacing={0.5}
                          >
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700 }}
                              >
                                Leave #{row.id} —{" "}
                                {row.leave_type.charAt(0).toUpperCase() +
                                  row.leave_type.slice(1)}{" "}
                                Leave
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1.5}
                                flexWrap="wrap"
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatDate(row.start_date)} →{" "}
                                  {formatDate(row.end_date)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Submitted: {formatDateTime(row.created_at)}
                                </Typography>
                              </Stack>
                            </Box>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                              flexShrink={0}
                            >
                              {row.appeal_status && (
                                <Chip
                                  size="small"
                                  label={`Appeal: ${row.appeal_status}`}
                                  variant="outlined"
                                  sx={{ fontSize: "0.65rem" }}
                                />
                              )}
                              <Chip
                                size="small"
                                label={row.status}
                                color={statusChipColor}
                                sx={{
                                  textTransform: "capitalize",
                                  fontWeight: 600,
                                }}
                              />
                            </Stack>
                          </Stack>
                        </Box>

                        {/* Card body */}
                        <Box sx={{ p: 2 }}>
                          <Stack spacing={1.25}>
                            {/* Timestamps */}
                            {(row.reviewed_at ||
                              row.management_replied_at ||
                              row.employee_replied_at) && (
                              <Stack
                                direction="row"
                                spacing={2}
                                flexWrap="wrap"
                              >
                                {row.reviewed_at && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Reviewed: {formatDateTime(row.reviewed_at)}
                                  </Typography>
                                )}
                                {row.management_replied_at && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Admin replied:{" "}
                                    {formatDateTime(row.management_replied_at)}
                                  </Typography>
                                )}
                                {row.employee_replied_at && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Your reply:{" "}
                                    {formatDateTime(row.employee_replied_at)}
                                  </Typography>
                                )}
                              </Stack>
                            )}

                            {/* Management/HR messages */}
                            {(row.review_comment ||
                              row.management_reply_message) && (
                              <Box
                                sx={{
                                  bgcolor: "action.hover",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderLeft: "3px solid",
                                  borderLeftColor: "primary.main",
                                  borderRadius: 1,
                                  p: 1.5,
                                }}
                              >
                                {row.review_comment && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      mb: row.management_reply_message
                                        ? 0.5
                                        : 0,
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      HR review:{" "}
                                    </Box>
                                    {row.review_comment}
                                  </Typography>
                                )}
                                {row.management_reply_message && (
                                  <Typography variant="body2">
                                    <Box
                                      component="span"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      Admin:{" "}
                                    </Box>
                                    {row.management_reply_message}
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {/* Employee's previous reply */}
                            {(row.employee_reply_message ||
                              row.employee_reply_attachment_paths?.length) && (
                              <Box
                                sx={{
                                  bgcolor: "action.hover",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderLeft: "3px solid",
                                  borderLeftColor: "success.main",
                                  borderRadius: 1,
                                  p: 1.5,
                                }}
                              >
                                {row.employee_reply_message && (
                                  <Typography variant="body2">
                                    <Box
                                      component="span"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      Your reply:{" "}
                                    </Box>
                                    {row.employee_reply_message}
                                  </Typography>
                                )}
                                {row.employee_reply_attachment_paths?.length ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    +{" "}
                                    {row.employee_reply_attachment_paths.length}{" "}
                                    attachment
                                    {row.employee_reply_attachment_paths
                                      .length !== 1
                                      ? "s"
                                      : ""}
                                  </Typography>
                                ) : null}
                              </Box>
                            )}

                            {/* Cancel action */}
                            {["draft", "pending"].includes(row.status) && (
                              <Box>
                                <Button
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  onClick={() => setCancelTarget(row)}
                                >
                                  Cancel request
                                </Button>
                              </Box>
                            )}

                            {/* Appeal action */}
                            {["approved", "denied"].includes(row.status) &&
                              row.appeal_status !== "submitted" && (
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                >
                                  <TextField
                                    size="small"
                                    placeholder="State your appeal reason…"
                                    value={appealDrafts[row.id] || ""}
                                    onChange={(e) =>
                                      setAppealDrafts((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.value,
                                      }))
                                    }
                                    sx={{ flex: 1 }}
                                  />
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => submitAppeal(row)}
                                  >
                                    Submit appeal
                                  </Button>
                                </Stack>
                              )}

                            {/* Reply section */}
                            {isReadOnly ? (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ fontStyle: "italic" }}
                              >
                                Replies are disabled for {row.status} requests.
                              </Typography>
                            ) : (
                              <>
                                <Divider />
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                >
                                  <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Reply to admin / HR…"
                                    value={
                                      employeeReplyDrafts[row.id]?.message || ""
                                    }
                                    onChange={(e) =>
                                      setEmployeeReplyDrafts((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          message: e.target.value,
                                          attachments:
                                            prev[row.id]?.attachments || [],
                                        },
                                      }))
                                    }
                                  />
                                  <Button
                                    component="label"
                                    size="small"
                                    variant="outlined"
                                    sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                                  >
                                    Attach file
                                    <input
                                      hidden
                                      type="file"
                                      multiple
                                      onChange={(e) => {
                                        const newFiles = Array.from(
                                          e.target.files || [],
                                        );
                                        setEmployeeReplyDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: {
                                            message:
                                              prev[row.id]?.message || "",
                                            attachments: [
                                              ...(prev[row.id]?.attachments ||
                                                []),
                                              ...newFiles.map((file) => ({
                                                file,
                                                url: file.type.startsWith(
                                                  "image/",
                                                )
                                                  ? URL.createObjectURL(file)
                                                  : null,
                                                name: file.name,
                                              })),
                                            ],
                                          },
                                        }));
                                        e.target.value = "";
                                      }}
                                    />
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ flexShrink: 0 }}
                                    disabled={
                                      !employeeReplyDrafts[
                                        row.id
                                      ]?.message?.trim() &&
                                      !employeeReplyDrafts[row.id]?.attachments
                                        ?.length
                                    }
                                    onClick={() => submitEmployeeReply(row)}
                                  >
                                    Send reply
                                  </Button>
                                </Stack>
                                {(
                                  employeeReplyDrafts[row.id]?.attachments || []
                                ).length > 0 && (
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                  >
                                    {(
                                      employeeReplyDrafts[row.id]
                                        ?.attachments || []
                                    ).map((item, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          position: "relative",
                                          display: "inline-block",
                                        }}
                                      >
                                        {item.url ? (
                                          <Box
                                            component="img"
                                            src={item.url}
                                            sx={{
                                              width: 64,
                                              height: 64,
                                              objectFit: "cover",
                                              borderRadius: 1,
                                              border: "1px solid",
                                              borderColor: "divider",
                                              display: "block",
                                            }}
                                          />
                                        ) : (
                                          <Box
                                            sx={{
                                              width: 64,
                                              height: 64,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              border: "1px solid",
                                              borderColor: "divider",
                                              borderRadius: 1,
                                              p: 0.5,
                                            }}
                                          >
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                textAlign: "center",
                                                wordBreak: "break-all",
                                                fontSize: "0.6rem",
                                              }}
                                            >
                                              {item.name}
                                            </Typography>
                                          </Box>
                                        )}
                                        <IconButton
                                          size="small"
                                          sx={{
                                            position: "absolute",
                                            top: -8,
                                            right: -8,
                                            bgcolor: "background.paper",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            p: "2px",
                                          }}
                                          onClick={() => {
                                            if (item.url)
                                              URL.revokeObjectURL(item.url);
                                            setEmployeeReplyDrafts((prev) => ({
                                              ...prev,
                                              [row.id]: {
                                                ...prev[row.id],
                                                attachments: (
                                                  prev[row.id]?.attachments ||
                                                  []
                                                ).filter((_, i) => i !== idx),
                                              },
                                            }));
                                          }}
                                        >
                                          <CloseIcon sx={{ fontSize: 12 }} />
                                        </IconButton>
                                      </Box>
                                    ))}
                                  </Stack>
                                )}
                              </>
                            )}
                          </Stack>
                        </Box>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} mb={2} ref={leaveRulesCardRef}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Balance summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual remaining: {leaveBalances.annual?.remaining ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sick remaining: {leaveBalances.sick?.remaining ?? 0}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Pending requests can be cancelled. Approved/denied requests can
                be appealed only.
              </Typography>
              <Divider sx={{ my: 1.25 }} />
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 0.75 }}
              >
                လက်ရှိ ခွင့်စည်းမျဉ်းများ
              </Typography>
              {activeLeaveRules.length ? (
                <Stack spacing={0.75}>
                  {activeLeaveRules.map((rule) => (
                    <Typography
                      key={rule.key}
                      variant="caption"
                      color="text.secondary"
                    >
                      • {rule.label_my}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  လက်ရှိ အသုံးပြုနေသော ခွင့်စည်းမျဉ်း မရှိသေးပါ။
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm cancellation</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to cancel this leave request? This action
            cannot be undone.
          </Typography>
          {cancelTarget ? (
            <Typography variant="caption" color="text.secondary">
              Leave #{cancelTarget.id}: {formatDate(cancelTarget.start_date)} to{" "}
              {formatDate(cancelTarget.end_date)}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Keep request</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={confirmCancelRequest}
          >
            Confirm cancel
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
