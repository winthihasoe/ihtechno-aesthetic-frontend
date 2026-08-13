import { useEffect, useMemo, useState } from "react";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import {
  Alert,
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
import { getAttendanceLogs, getOvertimes } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";

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

const formatMonth = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

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

const formatOvertimeDate = (value) => formatShiftDate(value);

const monthKeyFrom = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const attendanceDate = (row) => row.shift_date || row.check_in || row.created_at;

const sortByDateDesc = (rows, dateAccessor) =>
  [...rows].sort((a, b) => String(dateAccessor(b)).localeCompare(String(dateAccessor(a))));

const groupByMonth = (attendance, overtimes) => {
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

  return Array.from(months.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

const statusChipColor = (status) => {
  const normalized = String(status || "present").toLowerCase();
  if (normalized === "absent") return "error";
  if (normalized === "late") return "warning";
  return "default";
};

const approvalLabel = (row) => (row.approved_at ? "Approved" : "Pending");

export default function MyDailyRecordPage() {
  const [attendance, setAttendance] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getAttendanceLogs({ per_page: 200 }),
      getOvertimes({ per_page: 200 }),
    ])
      .then(([attendanceRes, overtimeRes]) => {
        if (!mounted) return;
        setAttendance(attendanceRes.data || []);
        setOvertimes(overtimeRes.data || []);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(resolveApiError(loadError, "Failed to load daily records."));
      });

    return () => {
      mounted = false;
    };
  }, []);

  const groupedMonths = useMemo(
    () => groupByMonth(attendance, overtimes),
    [attendance, overtimes],
  );

  return (
    <HrPageShell title="HR Module" subtitle="My daily record">
      <Stack spacing={1.5}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        {groupedMonths.map((month) => {
          const sortedAttendance = sortByDateDesc(month.attendance, attendanceDate);
          const sortedOvertimes = sortByDateDesc(month.overtimes, (row) => row.date);

          return (
            <Card key={month.monthKey} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {month.monthKey === "Unknown" ? "Unknown month" : formatMonth(month.monthKey)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`${month.attendance.length} attendance`} />
                    <Chip size="small" variant="outlined" label={`${month.overtimes.length} overtime`} />
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
                    <Card variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                        No attendance records for this month.
                      </Typography>
                    </Card>
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
                          {sortedAttendance.map((row) => (
                            <TableRow key={row.id} hover>
                              <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                {formatShiftDate(attendanceDate(row))}
                              </TableCell>
                              <TableCell>{formatTimeOnly(row.check_in)}</TableCell>
                              <TableCell>{formatTimeOnly(row.check_out)}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.status || "present"}
                                  color={statusChipColor(row.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={row.approved_at ? "success" : "warning"}
                                  variant={row.approved_at ? "filled" : "outlined"}
                                  label={approvalLabel(row)}
                                />
                              </TableCell>
                              <TableCell align="right">{row.late_minutes_final || 0}m</TableCell>
                              <TableCell align="right">{row.overtime_minutes_final || 0}m</TableCell>
                            </TableRow>
                          ))}
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
                    <Card variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
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
                              <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                {formatOvertimeDate(row.date)}
                              </TableCell>
                              <TableCell align="right">{Number(row.hours || 0).toFixed(2)}h</TableCell>
                              <TableCell sx={{ color: "text.secondary", maxWidth: 280 }}>
                                {row.note || "-"}
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

        {groupedMonths.length === 0 && !error ? (
          <MyDailyRecordEmptyState />
        ) : null}
      </Stack>
    </HrPageShell>
  );
}

function MyDailyRecordEmptyState() {
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
      <EventNoteOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No daily records yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 480, mx: "auto", mb: 2 }}
      >
        This page shows your attendance check-in/out and overtime hours, grouped
        by month. Approved records feed into monthly payroll.
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
          <strong>Attendance:</strong> Check-in and check-out times, late
          minutes, and approval status for each shift.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Overtime:</strong> Extra hours from approved attendance or
          manual HR entries.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payroll:</strong> HR reviews and approves records before they
          are included in your monthly pay.
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Records appear here after you check in or HR imports month-end
        attendance.
      </Typography>
    </Box>
  );
}
