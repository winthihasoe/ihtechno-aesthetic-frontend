import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import Grid from "@mui/material/Grid";
import { useLocation } from "react-router-dom";
import HrPageShell from "./components/HrPageShell";
import { getHrDailyStaffSnapshot } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";

export default function HrReportsPage() {
  const location = useLocation();
  const workspacePrefix = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/admin";
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHrDailyStaffSnapshot({ date: selectedDate });
      setSnapshot(data);
    } catch (err) {
      setError(resolveApiError(err, "Failed to load HR staff report."));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const coverageCounts = useMemo(
    () => snapshot?.coverage_counts || {},
    [snapshot],
  );
  const leaveCounts = useMemo(
    () => snapshot?.leave_overview?.counts || {},
    [snapshot],
  );
  const staffConditions = useMemo(
    () => snapshot?.staff_conditions || [],
    [snapshot],
  );
  const rolePower = useMemo(() => snapshot?.role_power || [], [snapshot]);

  const conditionFilterOptions = useMemo(
    () => [
      { value: "", label: "All conditions" },
      { value: "working_now", label: "Working now" },
      { value: "upcoming_shift", label: "Upcoming shift" },
      { value: "already_left", label: "Already left" },
      { value: "no_check_in", label: "No check-in" },
      { value: "day_off", label: "Day off" },
      { value: "unscheduled", label: "Unscheduled" },
    ],
    [],
  );
  const [conditionFilter, setConditionFilter] = useState("");
  const [draftConditionFilter, setDraftConditionFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredStaffConditions = useMemo(
    () =>
      conditionFilter
        ? staffConditions.filter((row) => row.condition === conditionFilter)
        : staffConditions,
    [conditionFilter, staffConditions],
  );

  const directionLinks = useMemo(
    () => [
      {
        title: "Daily Attendance",
        description: "Review timeline records, corrections, and approvals.",
        href: `${workspacePrefix}/hr/daily/attendance`,
      },
      {
        title: "Leaves",
        description: "Approve requests, reply to staff, and resolve appeals.",
        href: `${workspacePrefix}/hr/daily/leaves`,
      },
      {
        title: "Staff Profiles",
        description: "Maintain positions, departments, and staff schedules.",
        href: `${workspacePrefix}/hr/staff`,
      },
      {
        title: "Overtime",
        description: "Check overtime entries and attendance backfills.",
        href: `${workspacePrefix}/hr/daily/overtime`,
      },
      {
        title: "Public Holidays",
        description: "Keep holiday coverage rules visible to HR.",
        href: `${workspacePrefix}/hr/public-holidays`,
      },
      {
        title: "Payroll & Compensation",
        description: "Continue payroll, salaries, allowances, and adjustments.",
        href: `${workspacePrefix}/hr/payroll`,
      },
    ],
    [workspacePrefix],
  );

  const activeFilterCount = conditionFilter ? 1 : 0;

  const applyFilters = () => {
    setConditionFilter(draftConditionFilter);
  };

  const clearFilters = () => {
    setDraftConditionFilter("");
    setConditionFilter("");
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Staff report"
      badge={snapshot?.date || selectedDate}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
          <TextField
            type="date"
            size="small"
            label="Report date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={loadSnapshot} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      }
    >
      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <TextField
          select
          size="small"
          label="Staff condition"
          value={draftConditionFilter}
          onChange={(e) => setDraftConditionFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {conditionFilterOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </CollapsibleFiltersPanel>

      <Stack spacing={2}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MetricCard
              title="Working now"
              value={coverageCounts.working_now || 0}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MetricCard
              title="Upcoming shifts"
              value={coverageCounts.upcoming_shift || 0}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MetricCard
              title="Already left"
              value={coverageCounts.already_left || 0}
              color="default"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MetricCard
              title="No check-in"
              value={coverageCounts.no_check_in || 0}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MetricCard
              title="Pending leaves"
              value={leaveCounts.pending || 0}
              color="warning"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard
              title="Staff Power By Role"
              description="Current working headcount based on open attendance logs."
            >
              <Stack spacing={1.25}>
                {rolePower.map((group) => (
                  <Card key={group.role} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {group.role}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.staff.map((staff) => staff.name).join(", ") ||
                            "No active staff"}
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {group.count}
                      </Typography>
                    </Stack>
                  </Card>
                ))}
                {!rolePower.length ? (
                  <EmptyState message="No staff are currently checked in." />
                ) : null}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard
              title="Staff Conditions"
              description="Shift coverage from today’s schedules and attendance timeline."
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell>Role / Position</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Attendance</TableCell>
                      <TableCell align="right">Condition</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStaffConditions.map((row) => (
                      <TableRow key={row.staff_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {row.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.department || row.email || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.role}</Typography>
                          {row.position && row.position !== row.role ? (
                            <Typography variant="caption" color="text.secondary">
                              {row.position}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.schedule?.is_day_off
                            ? "Day off"
                            : formatTimeRange(
                                row.schedule?.start_time,
                                row.schedule?.end_time,
                              )}
                        </TableCell>
                        <TableCell>
                          {row.attendance ? (
                            <Stack spacing={0.25}>
                              <Typography variant="body2">
                                In {formatDateTime(row.attendance.check_in)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Out {formatDateTime(row.attendance.check_out)}
                              </Typography>
                            </Stack>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <ConditionChip condition={row.condition} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {!filteredStaffConditions.length ? (
                <EmptyState message="No staff conditions match this filter." />
              ) : null}
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <SectionCard
              title="Leave Requested Overview"
              description="Open approvals, active leave today, and submitted appeals."
              actions={
                <Button
                  size="small"
                  variant="outlined"
                  href={`${workspacePrefix}/hr/daily/leaves`}
                >
                  Open Leaves
                </Button>
              }
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${leaveCounts.pending || 0} pending`} color="warning" />
                  <Chip
                    label={`${leaveCounts.active_today || 0} active today`}
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label={`${leaveCounts.approved_today || 0} approved today`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${leaveCounts.appeals || 0} appeals`}
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  {(snapshot?.leave_overview?.urgent_requests || []).map((row) => (
                    <Card key={row.id} variant="outlined" sx={{ p: 1.25 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {row.staff_name || "Staff"} - {statusLabel(row.leave_type)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(row.start_date)} to {formatDate(row.end_date)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={row.appeal_status === "submitted" ? "secondary" : "warning"}
                          label={
                            row.appeal_status === "submitted"
                              ? "Appeal"
                              : statusLabel(row.status)
                          }
                        />
                      </Stack>
                    </Card>
                  ))}
                  {!snapshot?.leave_overview?.urgent_requests?.length ? (
                    <EmptyState message="No pending leave requests or appeals." />
                  ) : null}
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <SectionCard
              title="HR Page Direction"
              description="Quick paths from this report into the HR pages that need follow-up."
            >
              <Grid container spacing={1.25}>
                {directionLinks.map((link) => (
                  <Grid key={link.href} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {link.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {link.description}
                        </Typography>
                        <Box>
                          <Button size="small" href={link.href}>
                            Go to page
                          </Button>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </HrPageShell>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <Card variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        <Chip
          size="small"
          color={color === "default" ? undefined : color}
          variant={color === "default" ? "outlined" : "filled"}
          label="Today"
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Card>
  );
}

function SectionCard({ title, description, actions, children }) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, height: "100%" }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions ?? null}
        </Stack>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
}

function ConditionChip({ condition }) {
  const meta = {
    working_now: { label: "Working now", color: "success" },
    upcoming_shift: { label: "Upcoming", color: "info" },
    already_left: { label: "Already left", color: "default" },
    no_check_in: { label: "No check-in", color: "warning" },
    day_off: { label: "Day off", color: "default" },
    unscheduled: { label: "Unscheduled", color: "default" },
  }[condition] || { label: statusLabel(condition), color: "default" };

  return (
    <Chip
      size="small"
      color={meta.color === "default" ? undefined : meta.color}
      variant={meta.color === "default" ? "outlined" : "filled"}
      label={meta.label}
    />
  );
}

function EmptyState({ message }) {
  return (
    <Card variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Card>
  );
}

function formatTimeRange(start, end) {
  if (!start && !end) return "-";
  return `${start || "-"} - ${end || "-"}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value) {
  return String(value || "unknown").replaceAll("_", " ");
}
