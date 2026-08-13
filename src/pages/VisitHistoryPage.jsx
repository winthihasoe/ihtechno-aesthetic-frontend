import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import dayjs from "dayjs";
import {
  getVisits,
  startConsultation,
  sendToPreparation,
  sendToTreatment,
  completeTreatment,
  completePayment,
} from "../services/visitService";
import { createAppointment } from "../services/appointmentService";
import { resolveApiError } from "../services/apiClient";
import useAuthStore from "../stores/authStore";
import useToastStore from "../stores/toastStore";
import StatusChip from "../components/common/StatusChip";
import { formatCheckInModeLabel } from "../utils/checkInModeUtils";
import { formatKyats } from "../utils/formatKyats";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";
import { canUpdateLiveboard } from "../utils/roleUtils";
import {
  VISIT_STATUS_FILTER_OPTIONS,
  normalizeVisitStatus,
  getVisitStatusConfig,
} from "../utils/visitStatuses";
import { getDemoStore } from "../mocks/demoDatabase";
import { isDemoMode } from "../config/demoMode";

/** Aesthetic visit journey stages, in order. */
const VISIT_FLOW = [
  { key: "waiting", label: "Waiting" },
  { key: "consulting", label: "Consultation" },
  { key: "preparation", label: "Pre-treatment" },
  { key: "treatment", label: "Treatment" },
  { key: "payment", label: "Billing" },
  { key: "completed", label: "Completed" },
];

const STATUS_OPTIONS = VISIT_STATUS_FILTER_OPTIONS;

function normalizeVisits(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatDisplayDate(value) {
  const d = dayjs(value);
  if (!d.isValid()) return "—";
  if (d.isSame(dayjs(), "day")) return `Today · ${d.format("DD-MM-YYYY")}`;
  if (d.isSame(dayjs().subtract(1, "day"), "day")) {
    return `Yesterday · ${d.format("DD-MM-YYYY")}`;
  }
  return d.format("dddd · DD-MM-YYYY");
}

function formatVisitTime(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY hh:mm") : "—";
}

function getInitials(name) {
  if (!name || name === "—") return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDoctorOptions() {
  if (!isDemoMode) return [];
  return getDemoStore().users.filter((u) =>
    ["medical_officer", "dermatologist"].includes(u.role),
  );
}

function VisitJourneyBar({ status }) {
  const theme = useTheme();
  const normalized = normalizeVisitStatus(status);
  const activeIndex = VISIT_FLOW.findIndex((s) => s.key === normalized);
  const statusCfg = getVisitStatusConfig(status);

  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {VISIT_FLOW.map((stage, index) => {
          const done = activeIndex >= 0 && index < activeIndex;
          const current = index === activeIndex;
          return (
            <Box
              key={stage.key}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                bgcolor: current
                  ? statusCfg.textColor
                  : done
                    ? alpha(statusCfg.textColor, 0.45)
                    : alpha(theme.palette.text.disabled, 0.2),
                transition: "background-color 0.2s ease",
              }}
              title={stage.label}
            />
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary" noWrap>
        {activeIndex >= 0
          ? `Stage ${activeIndex + 1} of ${VISIT_FLOW.length} · ${VISIT_FLOW[activeIndex].label}`
          : "Stage unknown"}
      </Typography>
    </Stack>
  );
}

function VisitCardActions({ actions, canAct, busy, patientId, patientName, onOpenPatient }) {
  const [menuAnchor, setMenuAnchor] = useState(null);

  const primaryAction =
    actions.find((a) => a.primary) ??
    actions.find((a) => a.variant === "contained") ??
    actions[0];
  const secondaryActions = primaryAction
    ? actions.filter((a) => a.key !== primaryAction.key)
    : [];

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="flex-end"
      flexWrap="wrap"
      useFlexGap
    >
      {patientId ? (
        <Tooltip title="Open patient record">
          <IconButton
            size="small"
            onClick={onOpenPatient}
            aria-label={`View ${patientName}`}
            sx={{
              border: (t) => `1px solid ${alpha(t.palette.divider, 0.9)}`,
              borderRadius: 1.5,
            }}
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      {canAct && secondaryActions.length > 0 ? (
        <>
          <Tooltip title="More actions">
            <IconButton
              size="small"
              disabled={busy}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="More visit actions"
              sx={{
                border: (t) => `1px solid ${alpha(t.palette.divider, 0.9)}`,
                borderRadius: 1.5,
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: { sx: { minWidth: 220, borderRadius: 2, mt: 0.5 } },
            }}
          >
            {secondaryActions.map((action) => (
              <MenuItem
                key={action.key}
                disabled={busy}
                onClick={() => {
                  closeMenu();
                  action.onClick();
                }}
                sx={{ py: 1.1 }}
              >
                {action.icon ? (
                  <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
                    {action.icon}
                  </ListItemIcon>
                ) : null}
                <ListItemText
                  primary={action.label}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: 13 }}
                />
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}

      {canAct && primaryAction ? (
        <Button
          size="small"
          variant={primaryAction.variant}
          color={primaryAction.color ?? "primary"}
          startIcon={primaryAction.icon}
          disabled={busy}
          onClick={primaryAction.onClick}
          sx={{
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 600,
            px: 1.5,
            minWidth: 0,
          }}
        >
          {primaryAction.label}
        </Button>
      ) : null}
    </Stack>
  );
}

function VisitHistoryCard({
  visit,
  actions,
  canAct,
  busy,
  onOpenPatient,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const patientName = visit.patient?.name ?? visit.patientName ?? "—";
  const patientId = visit.patient_id ?? visit.patient?.id;
  const doctorName = visit.doctor?.name ?? visit.doctorName ?? "—";
  const nurseName =
    visit.therapist?.name ??
    visit.therapistName ??
    (Array.isArray(visit.therapists)
      ? visit.therapists.map((t) => t.name).filter(Boolean).join(", ")
      : "") ||
    "—";
  const amount = visit.payment?.amount ?? visit.paymentAmount ?? 0;
  const visitTime = visit.visited_at ?? visit.created_at ?? visit.visitTime;
  const queue = visit.queue_number ?? visit.queueNumber ?? "—";
  const checkIn = formatCheckInModeLabel(visit.check_in_mode) || "—";
  const statusCfg = getVisitStatusConfig(visit.status);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 1,
        border: "none",
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: isDark
          ? `0 4px 16px ${alpha(theme.palette.common.black, 0.38)}, 0 1px 3px ${alpha(theme.palette.common.black, 0.28)}`
          : `0 6px 20px ${alpha("#1E3D3E", 0.1)}, 0 1px 3px ${alpha("#1E3D3E", 0.06)}`,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: isDark
            ? `0 10px 28px ${alpha(theme.palette.common.black, 0.48)}, 0 2px 6px ${alpha(theme.palette.common.black, 0.32)}`
            : `0 12px 28px ${alpha("#1E3D3E", 0.14)}, 0 2px 6px ${alpha("#1E3D3E", 0.08)}`,
        },
      }}
    >
      <Box
        sx={{
          height: 3,
          bgcolor: statusCfg.textColor,
          opacity: 0.85,
        }}
      />

      <Box sx={{ p: { xs: 1.75, sm: 2.25 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-start" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                fontWeight: 700,
                fontSize: 15,
                bgcolor: alpha(statusCfg.textColor, 0.12),
                color: statusCfg.textColor,
                border: `1px solid ${alpha(statusCfg.textColor, 0.2)}`,
              }}
            >
              {getInitials(patientName)}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 0.5 }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1.3 }}
                  noWrap
                >
                  {patientName}
                </Typography>
                <Chip
                  size="small"
                  label={`Q ${queue}`}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: 11,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.text.primary, isDark ? 0.12 : 0.06),
                  }}
                />
                <StatusChip status={visit.status} />
              </Stack>

              <Stack
                direction="row"
                spacing={1.5}
                flexWrap="wrap"
                useFlexGap
                sx={{ color: "text.secondary", mb: 1.25 }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AccessTimeOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption">{formatVisitTime(visitTime)}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LocalHospitalOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption">{doctorName}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PersonOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption">{nurseName}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <HowToRegOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption">{checkIn}</Typography>
                </Stack>
              </Stack>

              <VisitJourneyBar status={visit.status} />
            </Box>
          </Stack>

          <Stack
            spacing={1.25}
            alignItems={{ xs: "stretch", md: "flex-end" }}
            sx={{ minWidth: { md: 200 } }}
          >
            <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontWeight: 600, letterSpacing: 0.2 }}
              >
                Amount
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {amount > 0 ? formatKyats(amount) : "—"}
              </Typography>
            </Box>

            <VisitCardActions
              actions={actions}
              canAct={canAct}
              busy={busy}
              patientId={patientId}
              patientName={patientName}
              onOpenPatient={onOpenPatient}
            />
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}

export default function VisitHistoryPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const prefix = getWorkspaceUrlPrefix(user);
  const canAct = canUpdateLiveboard(user);
  const [busyVisitId, setBusyVisitId] = useState(null);

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateAnchor, setDateAnchor] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");

  const dateParam = selectedDate.format("YYYY-MM-DD");
  const doctorOptions = useMemo(() => getDoctorOptions(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load the full day set; status is filtered client-side so workflow
      // overview counts stay stable when a stage tile is selected.
      const params = { date: dateParam };
      if (doctorFilter) params.doctor_id = doctorFilter;
      if (searchQuery) params.search = searchQuery;

      const data = await getVisits(params);
      setVisits(normalizeVisits(data));
    } catch (err) {
      setError(resolveApiError(err, "Could not load visits for this day."));
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [dateParam, doctorFilter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVisits = useMemo(() => {
    if (!statusFilter) return visits;
    return visits.filter(
      (v) => normalizeVisitStatus(v.status) === statusFilter,
    );
  }, [visits, statusFilter]);

  const summary = useMemo(() => {
    const total = visits.length;
    const completed = visits.filter(
      (v) => normalizeVisitStatus(v.status) === "completed",
    ).length;
    const active = total - completed;
    return { total, completed, active };
  }, [visits]);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(VISIT_FLOW.map((s) => [s.key, 0]));
    visits.forEach((v) => {
      const status = normalizeVisitStatus(v.status);
      if (counts[status] != null) counts[status] += 1;
    });
    return counts;
  }, [visits]);

  const resolveDoctorId = (visit) =>
    visit.doctor_id ?? doctorOptions[0]?.id ?? 2;

  const runTransition = useCallback(
    async (visit, action, { successMsg, navigateTo } = {}) => {
      setBusyVisitId(visit.id);
      try {
        await action();
        if (navigateTo) {
          navigate(navigateTo);
          return;
        }
        if (successMsg) pushToast({ message: successMsg, severity: "success" });
        await load();
      } catch (err) {
        pushToast({
          message: resolveApiError(err, "Could not update the visit."),
          severity: "error",
        });
      } finally {
        setBusyVisitId(null);
      }
    },
    [navigate, pushToast, load],
  );

  const handleStartConsultation = (visit) =>
    runTransition(
      visit,
      () => startConsultation(visit.id, { doctor_id: resolveDoctorId(visit) }),
      { successMsg: "Consultation started." },
    );

  const handleSendToPreparation = (visit) =>
    runTransition(visit, () => sendToPreparation(visit.id), {
      successMsg: "Sent to pre-treatment.",
    });

  const handleSendToTreatment = (visit) =>
    runTransition(visit, () => sendToTreatment(visit.id), {
      successMsg: "Moved to treatment.",
    });

  const handleSendToBilling = (visit) =>
    runTransition(visit, () => completeTreatment(visit.id), {
      successMsg: "Treatment complete — sent to billing.",
    });

  const handleCollectPayment = (visit) =>
    runTransition(visit, () => completePayment(visit.id), {
      successMsg: "Payment collected — visit completed.",
    });

  const handleBookFollowUp = (visit) => {
    const patientId = visit.patient_id ?? visit.patient?.id;
    const when = dayjs().add(7, "day").hour(9).minute(0).second(0);
    runTransition(
      visit,
      () =>
        createAppointment({
          patient_id: patientId,
          patient: visit.patient
            ? { id: patientId, name: visit.patient.name }
            : null,
          doctor_id: visit.doctor_id ?? null,
          doctor: visit.doctor ?? null,
          scheduled_at: when.toISOString(),
          status: "pending",
          notes: "Follow-up visit",
        }),
      {
        successMsg: `Follow-up booked for ${when.format("D MMM YYYY, HH:mm")}.`,
      },
    );
  };

  const getVisitActions = (visit) => {
    const room = `${prefix}/visits/${visit.id}/consultation-room`;
    const treatmentRoom = `${prefix}/visits/${visit.id}/treatment-room`;
    switch (normalizeVisitStatus(visit.status)) {
      case "waiting":
        return [
          {
            key: "start",
            label: "Start consultation",
            icon: <PlayArrowRoundedIcon fontSize="small" />,
            variant: "contained",
            primary: true,
            onClick: () => handleStartConsultation(visit),
          },
        ];
      case "consulting":
        return [
          {
            key: "open",
            label: "Consultation room",
            icon: <MeetingRoomOutlinedIcon fontSize="small" />,
            variant: "outlined",
            onClick: () => navigate(room),
          },
          {
            key: "prep",
            label: "Send to Pre-treatment",
            icon: <SpaOutlinedIcon fontSize="small" />,
            variant: "text",
            onClick: () => handleSendToPreparation(visit),
          },
          {
            key: "treat",
            label: "Proceed to treatment",
            icon: <ArrowForwardRoundedIcon fontSize="small" />,
            variant: "contained",
            primary: true,
            onClick: () => handleSendToTreatment(visit),
          },
        ];
      case "preparation":
        return [
          {
            key: "prep-room",
            label: "Pre-treatment room",
            icon: <MeetingRoomOutlinedIcon fontSize="small" />,
            variant: "outlined",
            onClick: () =>
              navigate(`${prefix}/visits/${visit.id}/preparation-room`),
          },
          {
            key: "treat",
            label: "Proceed to treatment",
            icon: <ArrowForwardRoundedIcon fontSize="small" />,
            variant: "contained",
            primary: true,
            onClick: () => handleSendToTreatment(visit),
          },
        ];
      case "treatment":
        return [
          {
            key: "troom",
            label: "Treatment room",
            icon: <MeetingRoomOutlinedIcon fontSize="small" />,
            variant: "outlined",
            onClick: () => navigate(treatmentRoom),
          },
          {
            key: "bill",
            label: "Send to billing",
            icon: <ArrowForwardRoundedIcon fontSize="small" />,
            variant: "contained",
            primary: true,
            onClick: () => handleSendToBilling(visit),
          },
        ];
      case "payment":
        return [
          {
            key: "collect",
            label: "Collect payment",
            icon: <PaymentsOutlinedIcon fontSize="small" />,
            variant: "contained",
            color: "success",
            primary: true,
            onClick: () => handleCollectPayment(visit),
          },
        ];
      case "completed":
        return [
          {
            key: "followup",
            label: "Book follow-up",
            icon: <EventAvailableOutlinedIcon fontSize="small" />,
            variant: "outlined",
            primary: true,
            onClick: () => handleBookFollowUp(visit),
          },
        ];
      default:
        return [];
    }
  };

  const shiftDate = (deltaDays) => {
    setSelectedDate((prev) => prev.add(deltaDays, "day"));
  };

  const goToToday = () => setSelectedDate(dayjs());

  const handleDatePick = (value) => {
    if (!value) return;
    const next = dayjs(value);
    if (next.isValid()) setSelectedDate(next.startOf("day"));
    setDateAnchor(null);
  };

  const isDark = theme.palette.mode === "dark";
  const surfaceSx = {
    borderRadius: 1,
    border: "none",
    bgcolor: "background.paper",
    boxShadow: isDark
      ? `0 4px 16px ${alpha(theme.palette.common.black, 0.38)}, 0 1px 3px ${alpha(theme.palette.common.black, 0.28)}`
      : `0 6px 20px ${alpha("#1E3D3E", 0.1)}, 0 1px 3px ${alpha("#1E3D3E", 0.06)}`,
  };
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1,
      bgcolor: isDark
        ? alpha(theme.palette.common.white, 0.03)
        : alpha(theme.palette.text.primary, 0.02),
    },
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Visit History
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Daily visit register with status, care team, and payment summary.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          {[
            { label: "Total", value: summary.total, color: theme.palette.text.primary },
            { label: "In progress", value: summary.active, color: theme.palette.warning.dark },
            { label: "Completed", value: summary.completed, color: theme.palette.success.dark },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                minWidth: 88,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: "background.paper",
                boxShadow: surfaceSx.boxShadow,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontWeight: 600, lineHeight: 1.2 }}
              >
                {item.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ ...surfaceSx, p: { xs: 1.75, sm: 2 }, mb: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, letterSpacing: 0.3, display: "block", mb: 1.25 }}
        >
          WORKFLOW OVERVIEW
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(6, minmax(0, 1fr))",
            },
            gap: 1,
          }}
        >
          {VISIT_FLOW.map((stage, index) => {
            const count = stageCounts[stage.key] ?? 0;
            const selected = statusFilter === stage.key;
            const cfg = getVisitStatusConfig(stage.key);
            return (
              <Box
                key={stage.key}
                component="button"
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === stage.key ? "" : stage.key))
                }
                sx={{
                  all: "unset",
                  cursor: "pointer",
                  display: "block",
                  px: 1.25,
                  py: 1.1,
                  borderRadius: 1,
                  bgcolor: selected
                    ? alpha(cfg.textColor, isDark ? 0.2 : 0.1)
                    : isDark
                      ? alpha(theme.palette.common.white, 0.03)
                      : alpha(theme.palette.text.primary, 0.025),
                  transition: "background-color 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: selected
                    ? `inset 0 0 0 1px ${alpha(cfg.textColor, 0.35)}`
                    : "none",
                  "&:hover": {
                    bgcolor: alpha(cfg.textColor, isDark ? 0.16 : 0.08),
                  },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                      noWrap
                    >
                      {index + 1}. {stage.label}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.15,
                        mt: 0.25,
                        color: count > 0 ? cfg.textColor : "text.disabled",
                      }}
                    >
                      {count}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      bgcolor: count > 0 ? cfg.textColor : alpha(theme.palette.text.disabled, 0.35),
                    }}
                  />
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ ...surfaceSx, p: { xs: 1.75, sm: 2 }, mb: 2.5 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.25}
            sx={{ alignSelf: { xs: "stretch", lg: "center" } }}
          >
            <Tooltip title="Previous day">
              <IconButton size="small" onClick={() => shiftDate(-1)} aria-label="Previous day">
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              onClick={(e) => setDateAnchor(e.currentTarget)}
              startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                textTransform: "none",
                fontWeight: 600,
                minWidth: { xs: 0, sm: 240 },
                flex: { xs: 1, sm: "none" },
                color: "text.primary",
                bgcolor: isDark
                  ? alpha(theme.palette.common.white, 0.04)
                  : alpha(theme.palette.text.primary, 0.03),
                boxShadow: "none",
                "&:hover": {
                  bgcolor: isDark
                    ? alpha(theme.palette.common.white, 0.07)
                    : alpha(theme.palette.text.primary, 0.05),
                  boxShadow: "none",
                },
              }}
            >
              {formatDisplayDate(selectedDate)}
            </Button>

            <Tooltip title="Next day">
              <IconButton size="small" onClick={() => shiftDate(1)} aria-label="Next day">
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {!selectedDate.isSame(dayjs(), "day") ? (
              <Button
                size="small"
                onClick={goToToday}
                sx={{
                  ml: 0.5,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 1.25,
                }}
              >
                Today
              </Button>
            ) : null}
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <TextField
              size="small"
              placeholder="Search patient or queue #"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchQuery(searchInput.trim());
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { sm: 200 }, flex: 1, ...fieldSx }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150, ...fieldSx }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Doctor"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              sx={{ minWidth: 170, ...fieldSx }}
            >
              <MenuItem value="">All doctors</MenuItem>
              {doctorOptions.map((doc) => (
                <MenuItem key={doc.id} value={String(doc.id)}>
                  {doc.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={() => setSearchQuery(searchInput.trim())}
              sx={{
                borderRadius: 1,
                fontWeight: 600,
                whiteSpace: "nowrap",
                textTransform: "none",
                px: 2,
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              }}
            >
              Apply
            </Button>
            <Tooltip title="Refresh">
              <IconButton
                onClick={load}
                aria-label="Refresh visits"
                sx={{
                  borderRadius: 1,
                  bgcolor: isDark
                    ? alpha(theme.palette.common.white, 0.04)
                    : alpha(theme.palette.text.primary, 0.03),
                }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {(statusFilter || doctorFilter || searchQuery) && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}
          >
            <FilterListOutlinedIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Active filters
            </Typography>
            {searchQuery ? (
              <Chip
                size="small"
                label={`Search: ${searchQuery}`}
                onDelete={() => {
                  setSearchQuery("");
                  setSearchInput("");
                }}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            ) : null}
            {statusFilter ? (
              <Chip
                size="small"
                label={`Status: ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}`}
                onDelete={() => setStatusFilter("")}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            ) : null}
            {doctorFilter ? (
              <Chip
                size="small"
                label={`Doctor: ${doctorOptions.find((d) => String(d.id) === doctorFilter)?.name ?? doctorFilter}`}
                onDelete={() => setDoctorFilter("")}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            ) : null}
          </Stack>
        )}
      </Paper>

      <Popover
        open={Boolean(dateAnchor)}
        anchorEl={dateAnchor}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              borderRadius: 1,
              minWidth: 260,
              border: "none",
              boxShadow: surfaceSx.boxShadow,
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
          Select date
        </Typography>
        <TextField
          type="date"
          fullWidth
          size="small"
          value={selectedDate.format("YYYY-MM-DD")}
          onChange={(e) => handleDatePick(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
      </Popover>

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : error ? (
        <Paper
          elevation={0}
          sx={{
            ...surfaceSx,
            py: 6,
            px: 3,
            bgcolor: alpha(theme.palette.error.main, 0.04),
          }}
        >
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Paper>
      ) : filteredVisits.length === 0 ? (
        <Paper elevation={0} sx={{ ...surfaceSx, py: 8, px: 3 }}>
          <Stack alignItems="center" spacing={1}>
            <CalendarMonthOutlinedIcon color="disabled" sx={{ fontSize: 36 }} />
            <Typography color="text.secondary" align="center" sx={{ fontWeight: 600 }}>
              {visits.length === 0
                ? `No visits recorded for ${selectedDate.format("DD-MM-YYYY")}.`
                : "No visits match the selected workflow stage."}
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center">
              {visits.length === 0
                ? "Try another day or clear your filters."
                : "Click the stage again to clear the filter."}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filteredVisits.map((visit) => {
            const patientId = visit.patient_id ?? visit.patient?.id;
            return (
              <VisitHistoryCard
                key={visit.id}
                visit={visit}
                actions={getVisitActions(visit)}
                canAct={canAct}
                busy={busyVisitId === visit.id}
                onOpenPatient={() => navigate(`${prefix}/patients/${patientId}`)}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
