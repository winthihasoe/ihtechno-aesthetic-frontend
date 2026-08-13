import { useMemo, useRef, useState } from "react";
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
import useToastStore from "../../stores/toastStore";

const createInitialForm = () => ({
  leaveType: "annual",
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysFromToday(offset, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatLeaveTypeLabel(leaveType) {
  const value = String(leaveType || "leave").trim();
  if (!value) return "Leave";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const SAMPLE_LEAVE_RULES = [
  {
    key: "annual_notice",
    is_enabled: true,
    label_my: "နှစ်စဉ်ခွင့်အတွက် အနည်းဆုံး ၃ ရက်ကြိုတင်လျှောက်ထားရမည်။",
  },
  {
    key: "sick_evidence",
    is_enabled: true,
    label_my: "၂ ရက်နှင့်အထက် နာမကျန်းခွင့်အတွက် ဆေးမှတ်တမ်း ပူးတွဲတင်ရမည်။",
  },
  {
    key: "handover",
    is_enabled: true,
    label_my: "ခွင့်မယူမီ လုပ်ငန်းလွှဲပြောင်း မှတ်စု ရေးသားရမည်။",
  },
  {
    key: "emergency",
    is_enabled: true,
    label_my: "အရေးပေါ်ခွင့်ကို တင်ပြပြီး နောက်မှ အထောက်အထား ဖြည့်သွင်းနိုင်သည်။",
  },
];

function buildSampleLeaves() {
  const pendingStart = daysFromToday(7);
  const pendingEnd = daysFromToday(9);
  const approvedStart = daysFromToday(-12);
  const approvedEnd = daysFromToday(-10);
  const sickStart = daysFromToday(-3);
  const sickEnd = daysFromToday(-2);
  const deniedStart = daysFromToday(14);
  const deniedEnd = daysFromToday(16);

  return [
    {
      id: 204,
      leave_type: "annual",
      status: "pending",
      start_date: toDateKey(pendingStart),
      end_date: toDateKey(pendingEnd),
      created_at: daysFromToday(-1, 9, 20).toISOString(),
      reason: "Family visit out of town; coverage arranged with OPD nurse team.",
      review_comment: null,
      management_reply_message: null,
      employee_reply_message: null,
      employee_reply_attachment_paths: [],
      appeal_status: null,
      reviewed_at: null,
      management_replied_at: null,
      employee_replied_at: null,
    },
    {
      id: 203,
      leave_type: "sick",
      status: "approved",
      start_date: toDateKey(sickStart),
      end_date: toDateKey(sickEnd),
      created_at: daysFromToday(-4, 8, 5).toISOString(),
      reason: "Acute fever; resting per clinic doctor advice.",
      review_comment: "Approved with medical note on file.",
      management_reply_message: "Feel better soon. Return fit-to-work form on first day back.",
      employee_reply_message: null,
      employee_reply_attachment_paths: [],
      appeal_status: null,
      reviewed_at: daysFromToday(-3, 11, 30).toISOString(),
      management_replied_at: daysFromToday(-3, 11, 35).toISOString(),
      employee_replied_at: null,
    },
    {
      id: 202,
      leave_type: "annual",
      status: "approved",
      start_date: toDateKey(approvedStart),
      end_date: toDateKey(approvedEnd),
      created_at: daysFromToday(-20, 14, 10).toISOString(),
      reason: "Personal appointment and short rest after roster week.",
      review_comment: "Coverage confirmed with duty roster.",
      management_reply_message: null,
      employee_reply_message: null,
      employee_reply_attachment_paths: [],
      appeal_status: null,
      reviewed_at: daysFromToday(-18, 10, 0).toISOString(),
      management_replied_at: null,
      employee_replied_at: null,
    },
    {
      id: 201,
      leave_type: "unpaid",
      status: "denied",
      start_date: toDateKey(deniedStart),
      end_date: toDateKey(deniedEnd),
      created_at: daysFromToday(-6, 16, 40).toISOString(),
      reason: "Extended personal travel request overlapping peak clinic days.",
      review_comment:
        "Denied due to staffing shortage on those dates. Please choose another period.",
      management_reply_message:
        "Suggest shifting dates after the 20th when two nurses return from leave.",
      employee_reply_message: null,
      employee_reply_attachment_paths: [],
      appeal_status: null,
      reviewed_at: daysFromToday(-5, 9, 15).toISOString(),
      management_replied_at: daysFromToday(-5, 9, 20).toISOString(),
      employee_replied_at: null,
    },
  ];
}

const SAMPLE_LEAVES = buildSampleLeaves();

export default function MyLeaveRequestPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState(SAMPLE_LEAVES);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [appealDrafts, setAppealDrafts] = useState({});
  const [employeeReplyDrafts, setEmployeeReplyDrafts] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [leaveRules] = useState(SAMPLE_LEAVE_RULES);
  const leaveRulesCardRef = useRef(null);

  const leaveBalances = useMemo(() => {
    const approved = rows.filter((row) => row.status === "approved");
    return {
      annual: Math.max(
        0,
        12 - approved.filter((row) => row.leave_type === "annual").length,
      ),
      sick: Math.max(
        0,
        8 - approved.filter((row) => row.leave_type === "sick").length,
      ),
    };
  }, [rows]);
  const activeLeaveRules = useMemo(
    () => leaveRules.filter((rule) => rule.is_enabled),
    [leaveRules],
  );

  const submitLeave = () => {
    if (!form.reason.trim()) {
      pushToast({
        message: "Please enter a reason for leave.",
        severity: "warning",
      });
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    const nextId = Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1;
    const entry = {
      id: nextId,
      leave_type: form.leaveType || "annual",
      status: "pending",
      start_date: form.startDate,
      end_date: form.endDate,
      created_at: now,
      reason: form.reason.trim(),
      review_comment: null,
      management_reply_message: null,
      employee_reply_message: null,
      employee_reply_attachment_paths: [],
      appeal_status: null,
      reviewed_at: null,
      management_replied_at: null,
      employee_replied_at: null,
    };
    setRows((prev) => [entry, ...prev]);
    setForm(createInitialForm());
    setFormOpen(false);
    pushToast({
      message: "Sample leave request recorded locally.",
      severity: "success",
    });
    setLoading(false);
  };

  const submitAppeal = (row) => {
    if (!appealDrafts[row.id]) {
      pushToast({
        message: "Appeal reason is required.",
        severity: "warning",
      });
      return;
    }
    setRows((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(row.id)
          ? {
              ...item,
              appeal_status: "submitted",
              employee_reply_message: appealDrafts[row.id],
              employee_replied_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    pushToast({ message: "Sample appeal recorded locally.", severity: "success" });
    setAppealDrafts((prev) => ({ ...prev, [row.id]: "" }));
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const confirmCancelRequest = () => {
    if (!cancelTarget) return;
    setRows((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(cancelTarget.id)
          ? { ...item, status: "cancelled" }
          : item,
      ),
    );
    pushToast({ message: "Leave request cancelled.", severity: "success" });
    setCancelTarget(null);
  };

  const submitEmployeeReply = (row) => {
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

    (draft.attachments || []).forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });

    setRows((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(row.id)
          ? {
              ...item,
              employee_reply_message: hasMessage
                ? draft.message.trim()
                : item.employee_reply_message,
              employee_reply_attachment_paths: hasFiles
                ? (draft.attachments || []).map(
                    (attachment) => attachment.file?.name || "attachment",
                  )
                : item.employee_reply_attachment_paths || [],
              employee_replied_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEmployeeReplyDrafts((prev) => ({
      ...prev,
      [row.id]: { message: "", attachments: [] },
    }));
    pushToast({
      message: "Sample reply recorded locally.",
      severity: "success",
    });
  };

  const sectionCardSx = {
    borderRadius: 2,
    borderColor: "divider",
    p: 2,
    backgroundColor: "action.hover",
  };

  return (
    <HrPageShell
      title="My Leave Request"
      subtitle="Submit leave and track approval status."
      badge="Sample"
    >      <Button
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
                    color={form.leaveType === "sick" ? "warning" : "primary"}
                    label={
                      form.leaveType === "sick"
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
                          <MenuItem value="annual">Annual</MenuItem>
                          <MenuItem value="sick">Sick</MenuItem>
                          <MenuItem value="unpaid">Unpaid</MenuItem>
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

                  {form.leaveType === "sick" ? (
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
                                {formatLeaveTypeLabel(row.leave_type)} Leave
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
                Annual remaining: {leaveBalances.annual}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sick remaining: {leaveBalances.sick}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Pending requests can be cancelled. Approved/denied requests can
                be appealed only.
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mt: 0.75 }}
              >
                Sample leave data for demonstration — not linked to live HR
                records
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
