import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  LinearProgress,
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
import Grid from "@mui/material/Grid";
import { useLocation } from "react-router-dom";
import HrPageShell from "./components/HrPageShell";
import { getHrDailyStaffSnapshot } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";

const todayLocalDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const atTimeOnDate = (dateKey, hour, minute = 0) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return d.toISOString();
};

/** Demo daily staff snapshot — manpower, coverage, and leave for the report date. */
function buildSampleStaffSnapshot(dateKey = todayLocalDate()) {
  const staffConditions = [
    {
      staff_id: 2,
      name: "Dr. San Oo",
      department: "Outpatient (OPD)",
      email: "doctor1@ihtechno.demo",
      role: "Medical Officer",
      position: "Medical Officer",
      schedule: { is_day_off: false, start_time: "08:00", end_time: "16:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 8, 5),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 3,
      name: "Dr. Yin Hla",
      department: "Outpatient (OPD)",
      email: "doctor2@ihtechno.demo",
      role: "Dermatologist",
      position: "Dermatologist",
      schedule: { is_day_off: false, start_time: "08:00", end_time: "16:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 8, 34),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 4,
      name: "Dr. Khine Zaw",
      department: "Outpatient (OPD)",
      email: "doctor3@ihtechno.demo",
      role: "Medical Officer",
      position: "Medical Officer",
      schedule: { is_day_off: false, start_time: "12:00", end_time: "20:00" },
      attendance: null,
      condition: "upcoming_shift",
    },
    {
      staff_id: 5,
      name: "Nurse Htet Htet",
      department: "Nursing Ward",
      email: "nurse1@ihtechno.demo",
      role: "Senior Nurse",
      position: "Senior Nurse",
      schedule: { is_day_off: false, start_time: "07:00", end_time: "15:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 7, 2),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 6,
      name: "Nurse May May",
      department: "Nursing Ward",
      email: "nurse2@ihtechno.demo",
      role: "Senior Nurse",
      position: "Senior Nurse",
      schedule: { is_day_off: false, start_time: "07:00", end_time: "15:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 7, 8),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 7,
      name: "Nurse Hnin Hnin",
      department: "Nursing Ward",
      email: "nurse3@ihtechno.demo",
      role: "Staff Nurse",
      position: "Staff Nurse",
      schedule: { is_day_off: false, start_time: "07:00", end_time: "15:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 7, 42),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 8,
      name: "Nurse Zin Zin",
      department: "Nursing Ward",
      email: "nurse4@ihtechno.demo",
      role: "Staff Nurse",
      position: "Staff Nurse",
      schedule: { is_day_off: true, start_time: null, end_time: null },
      attendance: null,
      condition: "day_off",
    },
    {
      staff_id: 9,
      name: "Nurse Su Su",
      department: "Nursing Ward",
      email: "nurse5@ihtechno.demo",
      role: "Staff Nurse",
      position: "Staff Nurse",
      schedule: { is_day_off: false, start_time: "14:00", end_time: "22:00" },
      attendance: null,
      condition: "upcoming_shift",
    },
    {
      staff_id: 10,
      name: "Ko Thura",
      department: "Laboratory",
      email: "labtech1@ihtechno.demo",
      role: "Lab Technician",
      position: "Lab Technician",
      schedule: { is_day_off: false, start_time: "08:00", end_time: "16:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 8, 10),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 11,
      name: "Ma Phyu",
      department: "Laboratory",
      email: "labtech2@ihtechno.demo",
      role: "Lab Technician",
      position: "Lab Technician",
      schedule: { is_day_off: false, start_time: "08:00", end_time: "16:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 8, 0),
        check_out: atTimeOnDate(dateKey, 12, 5),
      },
      condition: "already_left",
    },
    {
      staff_id: 12,
      name: "Daw Cho",
      department: "Pharmacy",
      email: "pharmacist1@ihtechno.demo",
      role: "Pharmacist",
      position: "Pharmacist",
      schedule: { is_day_off: false, start_time: "08:30", end_time: "16:30" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 8, 28),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 13,
      name: "Ko Naing",
      department: "Pharmacy",
      email: "pharmacy2@ihtechno.demo",
      role: "Pharmacy Assistant",
      position: "Pharmacy Assistant",
      schedule: { is_day_off: false, start_time: "08:30", end_time: "16:30" },
      attendance: null,
      condition: "no_check_in",
    },
    {
      staff_id: 14,
      name: "Ma Thandar",
      department: "Administration",
      email: "reception1@ihtechno.demo",
      role: "Receptionist",
      position: "Receptionist",
      schedule: { is_day_off: false, start_time: "08:00", end_time: "17:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 7, 55),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 15,
      name: "U Ba Win",
      department: "Administration",
      email: "accountant1@ihtechno.demo",
      role: "Accountant",
      position: "Accountant",
      schedule: { is_day_off: false, start_time: "09:00", end_time: "17:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 9, 5),
        check_out: null,
      },
      condition: "working_now",
    },
    {
      staff_id: 16,
      name: "Daw Aye",
      department: "Administration",
      email: "housekeeping1@ihtechno.demo",
      role: "Housekeeping",
      position: "Housekeeping Supervisor",
      schedule: { is_day_off: false, start_time: "06:00", end_time: "14:00" },
      attendance: {
        check_in: atTimeOnDate(dateKey, 5, 58),
        check_out: atTimeOnDate(dateKey, 14, 2),
      },
      condition: "already_left",
    },
    {
      staff_id: 1,
      name: "U Aung Min",
      department: "Administration",
      email: "ceo@ihtechno.demo",
      role: "Medical Director",
      position: "Medical Director / CEO",
      schedule: null,
      attendance: null,
      condition: "unscheduled",
    },
  ];

  const coverage_counts = staffConditions.reduce(
    (acc, row) => {
      if (row.condition in acc) acc[row.condition] += 1;
      return acc;
    },
    {
      working_now: 0,
      upcoming_shift: 0,
      already_left: 0,
      no_check_in: 0,
      day_off: 0,
      unscheduled: 0,
    },
  );

  const workingNow = staffConditions.filter((row) => row.condition === "working_now");
  const roleMap = new Map();
  workingNow.forEach((row) => {
    const role = row.role || "Staff";
    if (!roleMap.has(role)) {
      roleMap.set(role, { role, count: 0, staff: [] });
    }
    const group = roleMap.get(role);
    group.count += 1;
    group.staff.push({ id: row.staff_id, name: row.name });
  });
  const role_power = Array.from(roleMap.values()).sort((a, b) => b.count - a.count);

  const leave_overview = {
    counts: {
      pending: 3,
      active_today: 2,
      approved_today: 1,
      appeals: 1,
    },
    urgent_requests: [
      {
        id: 101,
        staff_name: "Nurse Zin Zin",
        leave_type: "annual",
        start_date: dateKey,
        end_date: dateKey,
        status: "approved",
        appeal_status: null,
      },
      {
        id: 102,
        staff_name: "Ma Phyu",
        leave_type: "casual",
        start_date: dateKey,
        end_date: dateKey,
        status: "pending",
        appeal_status: null,
      },
      {
        id: 103,
        staff_name: "Nurse Htet Htet",
        leave_type: "annual",
        start_date: dateKey,
        end_date: (() => {
          const d = new Date(`${dateKey}T00:00:00`);
          d.setDate(d.getDate() + 2);
          return todayLocalDateFrom(d);
        })(),
        status: "pending",
        appeal_status: null,
      },
      {
        id: 104,
        staff_name: "Ko Naing",
        leave_type: "sick",
        start_date: dateKey,
        end_date: dateKey,
        status: "denied",
        appeal_status: "submitted",
      },
    ],
  };

  return {
    date: dateKey,
    coverage_counts,
    staff_conditions: staffConditions,
    role_power,
    leave_overview,
    manpower: {
      total_staff: staffConditions.length,
      working_now: coverage_counts.working_now,
      by_role: role_power,
    },
  };
}

function todayLocalDateFrom(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function isEmptySnapshot(data) {
  if (!data || typeof data !== "object") return true;
  const hasConditions = Array.isArray(data.staff_conditions) && data.staff_conditions.length > 0;
  const hasPower = Array.isArray(data.role_power) && data.role_power.length > 0;
  return !hasConditions && !hasPower;
}

export default function HrReportsPage() {
  const location = useLocation();
  const workspacePrefix = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/admin";
  const [selectedDate, setSelectedDate] = useState(todayLocalDate);
  const [snapshot, setSnapshot] = useState(() =>
    buildSampleStaffSnapshot(todayLocalDate()),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHrDailyStaffSnapshot({ date: selectedDate });
      if (isEmptySnapshot(data)) {
        setSnapshot(buildSampleStaffSnapshot(selectedDate));
      } else {
        setSnapshot(data);
      }
    } catch (err) {
      setSnapshot(buildSampleStaffSnapshot(selectedDate));
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
  const manpowerTotal = useMemo(() => {
    if (snapshot?.manpower?.total_staff != null) {
      return snapshot.manpower.total_staff;
    }
    return staffConditions.length;
  }, [snapshot, staffConditions]);
  const reportDateLabel = useMemo(
    () => formatDate(snapshot?.date || selectedDate),
    [snapshot?.date, selectedDate],
  );

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

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Staff report"
      guide={[
        "Daily manpower and coverage snapshot for the selected report date.",
        "Use these figures for shift follow-up, leave approvals, and staffing decisions.",
      ]}
      badge={reportDateLabel}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
      <Stack spacing={2}>
        {loading ? <LinearProgress /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="Manpower"
              value={manpowerTotal}
              color="primary"
              dateLabel={reportDateLabel}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="Working now"
              value={coverageCounts.working_now || 0}
              color="success"
              dateLabel={reportDateLabel}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="Upcoming shifts"
              value={coverageCounts.upcoming_shift || 0}
              color="info"
              dateLabel={reportDateLabel}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="Already left"
              value={coverageCounts.already_left || 0}
              color="default"
              dateLabel={reportDateLabel}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="No check-in"
              value={coverageCounts.no_check_in || 0}
              color="warning"
              dateLabel={reportDateLabel}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <MetricCard
              title="Pending leaves"
              value={leaveCounts.pending || 0}
              color="warning"
              dateLabel={reportDateLabel}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard
              title="Staff Power By Role"
              description={`Working manpower by role for ${reportDateLabel}.`}
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
              description={`Shift coverage from schedules and attendance for ${reportDateLabel}.`}
              actions={
                <TextField
                  select
                  size="small"
                  label="Condition"
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  sx={{ minWidth: 190 }}
                >
                  {conditionFilterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              }
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

function MetricCard({ title, value, color, dateLabel }) {
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
          label={dateLabel || "Today"}
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
  const date = new Date(
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value,
  );
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function statusLabel(value) {
  return String(value || "unknown").replaceAll("_", " ");
}
