import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import dayjs from "dayjs";
import { getAppointmentReport } from "../../services/reportService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import {
  getUserLiveBoardPath,
  resolveUserPrimaryRole,
} from "../../utils/workspaceRoutes";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "month", label: "Month" },
];

const defaultAppliedQuery = { mode: "period", period: "today" };

const buildDefaultDraft = () => ({
  selection: "today",
  fromDate: "",
  toDate: "",
});

const APPOINTMENT_TYPE_LABELS = {
  consultation: "Consultation",
  treatment: "Treatment Session",
  package_session: "Package Session",
  follow_up_visit: "Follow-Up Visit",
};

const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;

const formatReportDate = (value) =>
  value ? dayjs(value).format("DD-MM-YYYY") : "-";

const tableHeadSx = {
  bgcolor: "background.paper",
  "& .MuiTableCell-head": {
    color: "text.secondary",
  },
};

const EMPTY_STEPS = [
  {
    icon: EventAvailableOutlinedIcon,
    title: "Schedule visits",
    body: "Reception books consultations, treatments, package sessions, and follow-ups on the Appointments calendar.",
  },
  {
    icon: HowToRegOutlinedIcon,
    title: "Check in on the day",
    body: "When the patient arrives, check-in creates a visit from the appointment so the queue can move forward.",
  },
  {
    icon: CheckCircleOutlineOutlinedIcon,
    title: "Complete the visit",
    body: "Finishing the linked visit marks the appointment completed and feeds completion rate in this report.",
  },
];

function KpiCard({ title, value, subtitle, compactTitle }) {
  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", minWidth: 0, borderRadius: 1 }}
    >
      <CardContent
        sx={{
          p: 1,
          "&:last-child": { pb: { xs: 0.75, lg: 1 } },
          textAlign: "center",
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{
            fontSize: { xs: "0.55rem", lg: "0.6rem" },
            lineHeight: 1.15,
            letterSpacing: 0.3,
            display: "block",
          }}
        >
          <Box
            component="span"
            sx={{
              display: { xs: compactTitle ? "none" : "inline", lg: "inline" },
            }}
          >
            {title}
          </Box>
          {compactTitle ? (
            <Box
              component="span"
              sx={{ display: { xs: "inline", lg: "none" } }}
            >
              {compactTitle}
            </Box>
          ) : null}
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            mt: { xs: 0.25, lg: 0.35 },
            fontSize: { xs: "0.95rem", lg: "1.05rem" },
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.6rem", lg: "0.65rem" } }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AppointmentsReportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const rolePrefix = `/${resolveUserPrimaryRole(user)}`;
  const liveBoardPath = getUserLiveBoardPath(user);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedQuery, setAppliedQuery] = useState(defaultAppliedQuery);
  const [draftFilters, setDraftFilters] = useState(buildDefaultDraft);
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const activeFilterCount = useMemo(() => {
    if (appliedQuery.mode === "custom") return 1;
    if (
      appliedQuery.mode === "period" &&
      appliedQuery.period !== defaultAppliedQuery.period
    ) {
      return 1;
    }
    return 0;
  }, [appliedQuery]);

  const load = useCallback(async (query) => {
    setLoading(true);
    setError("");
    try {
      const params =
        query.mode === "custom"
          ? { from_date: query.fromDate, to_date: query.toDate }
          : { period: query.period };
      const data = await getAppointmentReport(params);
      setReport(data);
      if (data?.from_date && data?.to_date) {
        setDraftFilters((prev) => ({
          ...prev,
          fromDate: data.from_date,
          toDate: data.to_date,
        }));
      }
    } catch (err) {
      setError(resolveApiError(err, "Could not load appointment report."));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(appliedQuery);
  }, [appliedQuery, load]);

  const handleDraftPeriodChange = (_, value) => {
    if (!value) return;
    setDateError("");
    setDraftFilters((prev) => ({
      ...prev,
      selection: value,
    }));
  };

  const applyFilters = () => {
    if (draftFilters.selection === "custom") {
      if (!draftFilters.fromDate || !draftFilters.toDate) {
        setDateError("Choose both start and end dates.");
        return;
      }
      if (
        dayjs(draftFilters.fromDate).isAfter(dayjs(draftFilters.toDate), "day")
      ) {
        setDateError("Start date must be on or before end date.");
        return;
      }
      setDateError("");
      setAppliedQuery({
        mode: "custom",
        fromDate: draftFilters.fromDate,
        toDate: draftFilters.toDate,
      });
      return;
    }

    setDateError("");
    setAppliedQuery({ mode: "period", period: draftFilters.selection });
  };

  const clearFilters = () => {
    const nextDraft = buildDefaultDraft();
    setDraftFilters(nextDraft);
    setDateError("");
    setAppliedQuery(defaultAppliedQuery);
  };

  const draftPeriodToggleValue =
    draftFilters.selection === "custom" ? null : draftFilters.selection;

  const summary = report?.summary ?? {};
  const rangeLabel = useMemo(() => {
    if (!report?.from_date) return "";
    if (report.from_date === report.to_date) {
      return formatReportDate(report.from_date);
    }
    return `${formatReportDate(report.from_date)} – ${formatReportDate(report.to_date)}`;
  }, [report]);

  const bookedTotal = summary.booked ?? 0;
  const hasActiveFilters = activeFilterCount > 0;
  const showGuidedEmpty =
    !loading && !error && bookedTotal === 0 && !hasActiveFilters;
  const showFilteredEmptyState =
    !loading && !error && bookedTotal === 0 && hasActiveFilters;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          spacing={1.5}
        >
          {/* Title and stat group  */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Appointment Report
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
            >
              {rangeLabel
                ? `Scheduled appointments for ${rangeLabel}.`
                : "Booked vs completed outcomes by type, doctor, and treatment plan."}
            </Typography>
          </Box>

          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
        </Stack>
      </Box>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <Stack spacing={1.5}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={draftPeriodToggleValue}
            onChange={handleDraftPeriodChange}
            sx={{
              flexWrap: "wrap",
              "& .MuiToggleButton-root.Mui-selected": {
                color: "common.white",
              },
            }}
          >
            {PERIODS.map((item) => (
              <ToggleButton key={item.key} value={item.key}>
                {item.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              type="date"
              label="From"
              value={draftFilters.fromDate}
              onChange={(e) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  selection: "custom",
                  fromDate: e.target.value,
                }));
                setDateError("");
              }}
              InputLabelProps={{ shrink: true }}
              error={Boolean(dateError)}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={draftFilters.toDate}
              onChange={(e) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  selection: "custom",
                  toDate: e.target.value,
                }));
                setDateError("");
              }}
              InputLabelProps={{ shrink: true }}
              error={Boolean(dateError)}
              helperText={dateError || " "}
              FormHelperTextProps={{
                sx: {
                  mx: 0,
                  minHeight: 20,
                  visibility: dateError ? "visible" : "hidden",
                },
              }}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />
          </Stack>
        </Stack>
      </CollapsibleFiltersPanel>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={CalendarMonthOutlinedIcon}
          title="No appointments in this period"
          description="This report compares booked and completed appointments for the selected range. Schedule visits on the calendar — once patients are checked in and visits complete, KPIs and breakdowns appear here."
          primaryAction={{
            label: "Open appointments",
            onClick: () => navigate(`${rolePrefix}/appointments`),
            startIcon: <EventNoteOutlinedIcon />,
          }}
          steps={EMPTY_STEPS}
          footer={
            <>
              Check-ins and visit completion happen on the{" "}
              <Typography
                component={RouterLink}
                to={liveBoardPath}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Live Board
              </Typography>
              .
            </>
          }
        />
      ) : (
        <>
          {showFilteredEmptyState ? (
            <Alert severity="info">
              No appointments were scheduled in this date range.
            </Alert>
          ) : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: { xs: 0.75, lg: 1 },
        }}
      >
        <KpiCard title="Booked" value={summary.booked ?? 0} />
        <KpiCard
          title="Completed"
          compactTitle="Done"
          value={summary.completed ?? 0}
        />
        <KpiCard
          title="Completion rate"
          compactTitle="Rate"
          value={formatPercent(summary.completion_rate)}
        />
        <KpiCard
          title="Cancelled"
          compactTitle="Cancel"
          value={summary.cancelled ?? 0}
        />
        <KpiCard title="No-show" value={summary.no_show ?? 0} />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              By type
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={tableHeadSx}>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Booked</TableCell>
                    <TableCell align="right">Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.by_type ?? []).map((row) => (
                    <TableRow key={row.type}>
                      <TableCell>
                        {APPOINTMENT_TYPE_LABELS[row.type] ?? row.type}
                      </TableCell>
                      <TableCell align="right">{row.booked}</TableCell>
                      <TableCell align="right">{row.completed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              By doctor
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={tableHeadSx}>
                  <TableRow>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Booked</TableCell>
                    <TableCell align="right">Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.by_doctor ?? []).map((row) => (
                    <TableRow
                      key={`${row.doctor_id ?? "none"}-${row.doctor_name}`}
                    >
                      <TableCell>{row.doctor_name}</TableCell>
                      <TableCell align="right">{row.booked}</TableCell>
                      <TableCell align="right">{row.completed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              Top planned treatments
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={tableHeadSx}>
                  <TableRow>
                    <TableCell>Treatment</TableCell>
                    <TableCell align="right">Planned</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.planned_treatments ?? []).map((row) => (
                    <TableRow key={row.template_id}>
                      <TableCell>{row.template_name}</TableCell>
                      <TableCell align="right">{row.planned_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              Planned package usage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {report?.planned_packages?.line_count ?? 0} lines ·{" "}
              {report?.planned_packages?.planned_sessions_total ?? 0} sessions
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={tableHeadSx}>
                  <TableRow>
                    <TableCell>Package</TableCell>
                    <TableCell align="right">Lines</TableCell>
                    <TableCell align="right">Sessions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.planned_packages?.by_package ?? []).map((row) => (
                    <TableRow key={row.package_name}>
                      <TableCell>{row.package_name}</TableCell>
                      <TableCell align="right">{row.line_count}</TableCell>
                      <TableCell align="right">
                        {row.planned_sessions}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            Daily booked vs completed
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Booked</TableCell>
                  <TableCell align="right">Completed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(report?.daily_series ?? []).map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{formatReportDate(row.date)}</TableCell>
                    <TableCell align="right">{row.booked}</TableCell>
                    <TableCell align="right">{row.completed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
        </>
      )}
    </Box>
  );
}
