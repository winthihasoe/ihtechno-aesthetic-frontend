import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import EmptyData from "../../components/common/EmptyData";
import useToastStore from "../../stores/toastStore";
import HrPageShell from "./components/HrPageShell";

const CATEGORY_LABELS = {
  harassment: "Harassment",
  payroll: "Payroll",
  safety: "Safety",
  manager_behavior: "Manager behavior",
  other: "Other",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_CHIP = {
  submitted: { color: "default", label: "Submitted" },
  under_review: { color: "info", label: "Under review" },
  resolved: { color: "success", label: "Resolved" },
  rejected: { color: "error", label: "Rejected" },
};

const SEVERITY_CHIP = {
  low: { color: "default", label: "Low" },
  medium: { color: "warning", label: "Medium" },
  high: { color: "error", label: "High" },
};

const initialForm = {
  recipient_type: "hr",
  is_anonymous: false,
  category: "other",
  severity: "medium",
  message: "",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** DD-MM-YYYY hh:mm */
function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function daysAgo(days, hour = 10, minute = 30) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildSampleGrievances() {
  return [
    {
      id: 1003,
      status: "under_review",
      recipient_type: "hr",
      category: "payroll",
      severity: "medium",
      is_anonymous: false,
      message:
        "My overtime hours from the last roster week do not match the payslip total. Please review the attendance records for night shifts.",
      created_at: daysAgo(5, 9, 15),
      messages: [
        {
          id: 1,
          sender_is_staff: true,
          is_internal: false,
          message:
            "My overtime hours from the last roster week do not match the payslip total. Please review the attendance records for night shifts.",
          created_at: daysAgo(5, 9, 15),
        },
        {
          id: 2,
          sender_is_staff: false,
          sender: { name: "HR Officer" },
          is_internal: false,
          message:
            "Thank you for raising this. We are cross-checking attendance and payroll entries and will update you shortly.",
          created_at: daysAgo(4, 14, 20),
        },
      ],
    },
    {
      id: 1002,
      status: "resolved",
      recipient_type: "hr",
      category: "safety",
      severity: "high",
      is_anonymous: false,
      message:
        "The emergency exit light near the OPD corridor has been out for several days. Please arrange maintenance for patient and staff safety.",
      created_at: daysAgo(18, 11, 5),
      messages: [
        {
          id: 3,
          sender_is_staff: true,
          is_internal: false,
          message:
            "The emergency exit light near the OPD corridor has been out for several days. Please arrange maintenance for patient and staff safety.",
          created_at: daysAgo(18, 11, 5),
        },
        {
          id: 4,
          sender_is_staff: false,
          sender: { name: "Facilities" },
          is_internal: false,
          message:
            "Maintenance completed on-site. The exit light is working again. Closing this case as resolved.",
          created_at: daysAgo(16, 16, 40),
        },
      ],
    },
    {
      id: 1001,
      status: "submitted",
      recipient_type: "owner",
      category: "manager_behavior",
      severity: "low",
      is_anonymous: true,
      message:
        "Requesting a private review of shift handovers. Handover notes are sometimes incomplete, which delays the next consulting session.",
      created_at: daysAgo(2, 16, 45),
      messages: [
        {
          id: 5,
          sender_is_staff: true,
          is_internal: false,
          message:
            "Requesting a private review of shift handovers. Handover notes are sometimes incomplete, which delays the next consulting session.",
          created_at: daysAgo(2, 16, 45),
        },
      ],
    },
    {
      id: 1000,
      status: "rejected",
      recipient_type: "hr",
      category: "other",
      severity: "low",
      is_anonymous: false,
      message:
        "Can the staff break room kettle be replaced? It takes a long time to boil.",
      created_at: daysAgo(30, 13, 10),
      messages: [
        {
          id: 6,
          sender_is_staff: true,
          is_internal: false,
          message:
            "Can the staff break room kettle be replaced? It takes a long time to boil.",
          created_at: daysAgo(30, 13, 10),
        },
        {
          id: 7,
          sender_is_staff: false,
          sender: { name: "HR Officer" },
          is_internal: false,
          message:
            "This channel is for workplace concerns that need formal review. Please raise facility requests through the admin supply form instead.",
          created_at: daysAgo(29, 10, 0),
        },
      ],
    },
  ];
}

const SAMPLE_GRIEVANCES = buildSampleGrievances();

export default function MyGrievancePage() {
  const theme = useTheme();
  const { pushToast } = useToastStore();
  const [form, setForm] = useState(initialForm);
  const [rows, setRows] = useState(SAMPLE_GRIEVANCES);
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [anonymousToken, setAnonymousToken] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const selected = useMemo(
    () => rows.find((row) => Number(row.id) === Number(selectedId)) || null,
    [rows, selectedId],
  );

  const submitGrievance = () => {
    if (!form.message.trim()) return;
    setSubmitting(true);

    const now = new Date().toISOString();
    const nextId = Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1;
    const token = form.is_anonymous
      ? `ANON-${String(nextId).padStart(4, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      : "";

    const entry = {
      id: nextId,
      status: "submitted",
      recipient_type: form.recipient_type,
      category: form.category,
      severity: form.severity,
      is_anonymous: form.is_anonymous,
      message: form.message.trim(),
      created_at: now,
      messages: [
        {
          id: `local-${nextId}-1`,
          sender_is_staff: true,
          is_internal: false,
          message: form.message.trim(),
          created_at: now,
        },
      ],
    };

    setRows((prev) => [entry, ...prev]);
    setAnonymousToken(token);
    setForm(initialForm);
    setSubmitOpen(false);
    setStatusFilter("all");
    pushToast({
      message: "Sample grievance recorded locally.",
      severity: "success",
    });
    setSubmitting(false);
  };

  return (
    <HrPageShell
      title="My Grievance"
      subtitle="Raise workplace concerns and follow HR replies in one place."
      badge="Sample"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setSubmitOpen(true)}
        >
          Submit grievance
        </Button>
      }
    >
      <Box sx={{ maxWidth: 920, mx: "auto" }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mb: 1,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Status
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={statusFilter}
            onChange={(_event, next) => {
              if (next) setStatusFilter(next);
            }}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              "& .MuiToggleButtonGroup-grouped": {
                border: `1px solid ${theme.palette.divider} !important`,
                borderRadius: "6px !important",
                m: 0,
                px: 1.5,
                py: 0.65,
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                color: "text.secondary",
                bgcolor: "background.paper",
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  borderColor: `${theme.palette.primary.main} !important`,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                  },
                },
                "&:hover": { bgcolor: "action.hover" },
              },
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {anonymousToken ? (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            Anonymous follow-up token (save this): <strong>{anonymousToken}</strong>
          </Alert>
        ) : null}

        {filteredRows.length === 0 ? (
          <EmptyData
            icon={SupportAgentOutlinedIcon}
            title={
              statusFilter === "all"
                ? "No grievances yet"
                : "No grievances in this status"
            }
            description={
              statusFilter === "all"
                ? "Submitted concerns will appear here with status updates from HR."
                : "Try another status filter, or submit a new grievance."
            }
            action={
              statusFilter === "all"
                ? {
                    label: "Submit grievance",
                    onClick: () => setSubmitOpen(true),
                    startIcon: <AddIcon />,
                    variant: "contained",
                  }
                : {
                    label: "Show all",
                    onClick: () => setStatusFilter("all"),
                  }
            }
          />
        ) : (
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "background.paper",
              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}, 0 8px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            }}
          >
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0)} 100%)`,
              }}
            >
              <Typography variant="subtitle1" fontWeight={800}>
                Submitted grievances
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredRows.length} record
                {filteredRows.length === 1 ? "" : "s"} · click a row for the
                conversation thread
              </Typography>
            </Box>

            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
              {filteredRows.map((row) => {
                const statusCfg = STATUS_CHIP[row.status] || STATUS_CHIP.submitted;
                const severityCfg =
                  SEVERITY_CHIP[row.severity] || SEVERITY_CHIP.medium;
                const selectedRow = Number(selectedId) === Number(row.id);

                return (
                  <Box
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(row.id);
                      }
                    }}
                    sx={{
                      px: { xs: 2, sm: 2.5 },
                      py: 1.75,
                      cursor: "pointer",
                      bgcolor: selectedRow
                        ? alpha(theme.palette.primary.main, 0.06)
                        : "transparent",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={1}
                      sx={{ mb: 0.75 }}
                    >
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          color={statusCfg.color}
                          label={statusCfg.label}
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={severityCfg.label}
                          color={severityCfg.color}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={CATEGORY_LABELS[row.category] || row.category}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            row.recipient_type === "owner" ? "Owner" : "HR"
                          }
                        />
                        {row.is_anonymous ? (
                          <Chip size="small" color="warning" label="Anonymous" />
                        ) : null}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        #{row.id} · {formatDateTime(row.created_at)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: 1.55,
                        filter: row.is_anonymous ? "blur(3.5px)" : "none",
                        userSelect: row.is_anonymous ? "none" : "auto",
                      }}
                    >
                      {row.message}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 1.25,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: alpha(theme.palette.text.primary, 0.02),
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Sample grievances for demonstration — not linked to live HR
                records
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            pr: 7,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          Grievance details
          <IconButton
            aria-label="close"
            onClick={() => setSelectedId(null)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {!selected ? null : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  color={(STATUS_CHIP[selected.status] || {}).color}
                  label={(STATUS_CHIP[selected.status] || {}).label || selected.status}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    CATEGORY_LABELS[selected.category] || selected.category
                  }
                />
                <Chip
                  size="small"
                  variant="outlined"
                  color={(SEVERITY_CHIP[selected.severity] || {}).color}
                  label={(SEVERITY_CHIP[selected.severity] || {}).label}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    selected.recipient_type === "owner"
                      ? "To owner"
                      : "To HR"
                  }
                />
                {selected.is_anonymous ? (
                  <Chip size="small" color="warning" label="Anonymous" />
                ) : null}
              </Stack>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.45 }}
                >
                  Submitted
                </Typography>
                <Typography variant="body2">
                  {formatDateTime(selected.created_at)} · #{selected.id}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.45 }}
                >
                  Conversation
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {(selected.messages || [])
                    .filter((message) => !message.is_internal)
                    .map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          border: 1,
                          borderColor: "divider",
                          bgcolor: message.sender_is_staff
                            ? alpha(theme.palette.primary.main, 0.04)
                            : "background.paper",
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {message.sender_is_staff
                              ? "You"
                              : message.sender?.name || "Management"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(message.created_at)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {message.message}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Submit grievance</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Demo mode — submissions stay on this page only and are not saved
              to the server.
            </Alert>
            <TextField
              select
              size="small"
              label="Send to"
              value={form.recipient_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  recipient_type: e.target.value,
                }))
              }
            >
              <MenuItem value="hr">HR</MenuItem>
              <MenuItem value="owner">Owner only</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Category"
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <MenuItem value="harassment">Harassment</MenuItem>
              <MenuItem value="payroll">Payroll</MenuItem>
              <MenuItem value="safety">Safety</MenuItem>
              <MenuItem value="manager_behavior">Manager behavior</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <FormControl>
              <FormLabel>Severity</FormLabel>
              <RadioGroup
                row
                value={form.severity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, severity: e.target.value }))
                }
              >
                <FormControlLabel
                  value="low"
                  control={<Radio size="small" />}
                  label="Low"
                />
                <FormControlLabel
                  value="medium"
                  control={<Radio size="small" />}
                  label="Medium"
                />
                <FormControlLabel
                  value="high"
                  control={<Radio size="small" />}
                  label="High"
                />
              </RadioGroup>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_anonymous}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_anonymous: e.target.checked,
                    }))
                  }
                />
              }
              label="Submit anonymously"
            />
            <TextField
              multiline
              minRows={4}
              size="small"
              label="Message"
              value={form.message}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, message: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={submitting || !form.message.trim()}
            onClick={submitGrievance}
          >
            Submit grievance
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
