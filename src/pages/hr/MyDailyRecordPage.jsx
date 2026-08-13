import { useMemo } from "react";
import {
  Box,
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import HrPageShell from "./components/HrPageShell";
import EmptyData from "../../components/common/EmptyData";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";

const PREVIOUS_DAYS = 20;

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, offset) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + offset);
  return d;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function atTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatShiftDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatTimeOnly(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function monthKeyFrom(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function attendanceDate(row) {
  return row.shift_date || row.check_in || row.created_at;
}

function sortByDateDesc(rows, dateAccessor) {
  return [...rows].sort((a, b) =>
    String(dateAccessor(b)).localeCompare(String(dateAccessor(a))),
  );
}

function groupByMonth(attendance, overtimes) {
  const months = new Map();
  const ensureMonth = (key) => {
    if (!months.has(key)) {
      months.set(key, { monthKey: key, attendance: [], overtimes: [] });
    }
    return months.get(key);
  };

  attendance.forEach((row) => {
    ensureMonth(monthKeyFrom(attendanceDate(row))).attendance.push(row);
  });

  overtimes.forEach((row) => {
    ensureMonth(monthKeyFrom(row.date)).overtimes.push(row);
  });

  return Array.from(months.values()).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey),
  );
}

function statusChipColor(status) {
  const normalized = String(status || "present").toLowerCase();
  if (normalized === "absent") return "error";
  if (normalized === "late") return "warning";
  if (normalized === "weekend") return "default";
  return "success";
}

function approvalLabel(row) {
  return row.approved_at ? "Approved" : "Pending";
}

/** Stable variation from a date key so demo values feel consistent day-to-day. */
function daySeed(dateKey) {
  return [...dateKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

/**
 * Build demo attendance for today and the previous N days using the live clock.
 */
function buildSampleAttendance(today = new Date()) {
  const base = startOfLocalDay(today);
  const rows = [];

  for (let offset = 0; offset <= PREVIOUS_DAYS; offset += 1) {
    const day = addDays(base, -offset);
    const dateKey = toDateKey(day);
    const weekday = day.getDay(); // 0 Sun … 6 Sat
    const seed = daySeed(dateKey);
    const isWeekend = weekday === 0 || weekday === 6;
    const id = Number(dateKey.replaceAll("-", ""));

    if (isWeekend) {
      rows.push({
        id,
        shift_date: dateKey,
        check_in: null,
        check_out: null,
        status: "weekend",
        approved_at: null,
        late_minutes_final: 0,
        overtime_minutes_final: 0,
      });
      continue;
    }

    // ~1 in 7 weekdays absent for realism
    if (seed % 7 === 0 && offset !== 0) {
      rows.push({
        id,
        shift_date: dateKey,
        check_in: null,
        check_out: null,
        status: "absent",
        approved_at: null,
        late_minutes_final: 0,
        overtime_minutes_final: 0,
      });
      continue;
    }

    const lateMinutes = seed % 5 === 0 ? 8 + (seed % 20) : 0;
    const overtimeMinutes = seed % 4 === 0 ? 30 + (seed % 3) * 15 : 0;
    const inHour = 8;
    const inMinute = lateMinutes > 0 ? 30 + Math.min(lateMinutes, 45) : 55 + (seed % 5);
    const outHour = 17 + Math.floor(overtimeMinutes / 60);
    const outMinute = (overtimeMinutes % 60) + (seed % 10);

    const isToday = offset === 0;
    const checkedOut = !isToday || new Date().getHours() >= 17;

    rows.push({
      id,
      shift_date: dateKey,
      check_in: atTime(day, inHour, inMinute),
      check_out: checkedOut ? atTime(day, outHour, outMinute) : null,
      status: lateMinutes > 0 ? "late" : "present",
      approved_at: offset === 0 ? null : atTime(day, 18, 30),
      late_minutes_final: lateMinutes,
      overtime_minutes_final: overtimeMinutes,
    });
  }

  return rows;
}

function buildSampleOvertimes(attendance) {
  return attendance
    .filter((row) => Number(row.overtime_minutes_final) > 0)
    .map((row) => ({
      id: `ot-${row.id}`,
      date: row.shift_date,
      hours: Number((row.overtime_minutes_final / 60).toFixed(2)),
      note: "Clinic coverage after OPD closing",
    }));
}

export default function MyDailyRecordPage() {
  const { attendance, overtimes } = useMemo(() => {
    const sampleAttendance = buildSampleAttendance(new Date());
    return {
      attendance: sampleAttendance,
      overtimes: buildSampleOvertimes(sampleAttendance),
    };
  }, []);

  const groupedMonths = useMemo(
    () => groupByMonth(attendance, overtimes),
    [attendance, overtimes],
  );

  const todayKey = toDateKey(startOfLocalDay(new Date()));

  return (
    <HrPageShell
      title="My Daily Record"
      subtitle={`Demo attendance for today and the previous ${PREVIOUS_DAYS} days.`}
      badge="Sample"
    >
      <Stack spacing={1.5}>
        {groupedMonths.map((month) => {
          const sortedAttendance = sortByDateDesc(
            month.attendance,
            attendanceDate,
          );
          const sortedOvertimes = sortByDateDesc(
            month.overtimes,
            (row) => row.date,
          );

          return (
            <Card key={month.monthKey} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {month.monthKey === "Unknown"
                      ? "Unknown month"
                      : formatMonth(month.monthKey)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={`${month.attendance.length} attendance`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${month.overtimes.length} overtime`}
                    />
                  </Stack>
                </Stack>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Attendance{" "}
                    <Chip
                      size="small"
                      label={`${sortedAttendance.length} record${sortedAttendance.length === 1 ? "" : "s"}`}
                    />
                  </Typography>

                  {!sortedAttendance.length ? (
                    <EmptyData
                      size="compact"
                      icon={EventAvailableOutlinedIcon}
                      title="No attendance records"
                      description="No attendance records for this month."
                    />
                  ) : (
                    <TableContainer>
                      <Table size="small" sx={timelineTableSx}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>In time</TableCell>
                            <TableCell>Out time</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Approval</TableCell>
                            <TableCell align="right">Late</TableCell>
                            <TableCell align="right">OT</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedAttendance.map((row) => {
                            const isToday =
                              String(row.shift_date) === todayKey;
                            return (
                              <TableRow
                                key={row.id}
                                hover
                                sx={
                                  isToday
                                    ? {
                                        bgcolor: "action.selected",
                                        "& td": { fontWeight: 600 },
                                      }
                                    : undefined
                                }
                              >
                                <TableCell
                                  sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                                >
                                  {formatShiftDate(attendanceDate(row))}
                                  {isToday ? (
                                    <Chip
                                      size="small"
                                      color="primary"
                                      label="Today"
                                      sx={{ ml: 1, height: 20, fontSize: 11 }}
                                    />
                                  ) : null}
                                </TableCell>
                                <TableCell>
                                  {formatTimeOnly(row.check_in)}
                                </TableCell>
                                <TableCell>
                                  {formatTimeOnly(row.check_out)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={row.status || "present"}
                                    color={statusChipColor(row.status)}
                                    variant="outlined"
                                    sx={{ textTransform: "capitalize" }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={
                                      row.approved_at ? "success" : "warning"
                                    }
                                    variant={
                                      row.approved_at ? "filled" : "outlined"
                                    }
                                    label={approvalLabel(row)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {row.late_minutes_final || 0}m
                                </TableCell>
                                <TableCell align="right">
                                  {row.overtime_minutes_final || 0}m
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Overtime{" "}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${sortedOvertimes.length} record${sortedOvertimes.length === 1 ? "" : "s"}`}
                    />
                  </Typography>

                  {!sortedOvertimes.length ? (
                    <Card
                      variant="outlined"
                      sx={{ p: 2, bgcolor: "action.hover" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.8125rem" }}
                      >
                        No overtime records for this month.
                      </Typography>
                    </Card>
                  ) : (
                    <TableContainer>
                      <Table size="small" sx={timelineTableSx}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Hours</TableCell>
                            <TableCell>Note</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedOvertimes.map((row) => (
                            <TableRow key={row.id} hover>
                              <TableCell
                                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                              >
                                {formatShiftDate(row.date)}
                              </TableCell>
                              <TableCell align="right">
                                {Number(row.hours || 0).toFixed(2)}h
                              </TableCell>
                              <TableCell
                                sx={{ color: "text.secondary", maxWidth: 280 }}
                              >
                                {row.note || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </Card>
          );
        })}

        {groupedMonths.length === 0 ? (
          <EmptyData
            icon={EventAvailableOutlinedIcon}
            title="No attendance records yet"
            description="Daily attendance will appear here once check-in logs are available."
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Sample attendance generated from the current date — not linked to
            live punch records.
          </Typography>
        )}
      </Stack>
    </HrPageShell>
  );
}
