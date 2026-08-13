import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import HrPageShell from "./components/HrPageShell";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import {
  backfillOvertimesFromAttendance,
  createOvertime,
  getOvertimes,
  getStaffs,
} from "../../services/hrService";

export default function HrOvertimePage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    date: new Date().toISOString().slice(0, 10),
    minutes: "60",
    note: "",
  });

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [rows],
  );

  const load = useCallback(async () => {
    try {
      const [overtimesRes, staffList] = await Promise.all([getOvertimes(), getStaffs()]);
      setRows(overtimesRes.data || []);
      setStaffs(staffList || []);
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to load overtime records."), severity: "error" });
    }
  }, [pushToast]);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const rowMinutes = (hours) => Math.round(Number(hours || 0) * 60);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await createOvertime({
        staff_id: Number(form.staffId),
        date: form.date,
        hours: Number(form.minutes) / 60,
        note: form.note || null,
      });
      pushToast({ message: "Overtime added.", severity: "success" });
      setOpen(false);
      setForm((prev) => ({ ...prev, note: "", minutes: "60" }));
      await load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to add overtime."), severity: "error" });
    }
  };

  const handleBackfill = async () => {
    try {
      const result = await backfillOvertimesFromAttendance();
      pushToast({
        message: `Backfill complete: ${result.created || 0} created, ${result.updated || 0} updated, ${result.skipped || 0} skipped.`,
        severity: "success",
      });
      await load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to backfill overtime from attendance."), severity: "error" });
    }
  };

  const canSubmit = Boolean(form.staffId) && Number(form.minutes) > 0;

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Daily record - Overtime"
      guide={[
        "Overtime hours recorded manually or captured automatically from attendance.",
        "The totals here flow into each staff member's monthly payroll.",
      ]}
    >
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6">Overtime Register</Typography>
              <Typography variant="body2" color="text.secondary">
                Track approved overtime and add manual exceptional records.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={() => setOpen(true)}>Manual Add Overtime</Button>
              <Button variant="outlined" onClick={handleBackfill}>Calculate Missing Overtime</Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Chip label={`Records: ${sortedRows.length}`} size="small" />
            <Chip
              label={`Total OT: ${sortedRows.reduce((sum, row) => sum + rowMinutes(row.hours), 0)} min`}
              size="small"
            />
          </Stack>
        </Card>
        <Card variant="outlined" sx={{ p: 2 }}>
          {!sortedRows.length ? (
            <Typography variant="body2" color="text.secondary">
              No overtime records yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">OT Minutes</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRows.map((row) => {
                    const isAttendanceDerived = String(row.note || "").startsWith("[attendance_log_id:");
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.staff?.name || "-"}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell align="right">{rowMinutes(row.hours)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={isAttendanceDerived ? "default" : "primary"}
                            label={isAttendanceDerived ? "Attendance" : "Manual"}
                          />
                        </TableCell>
                        <TableCell>
                          {isAttendanceDerived ? "Auto-synced from approved attendance" : (row.note || "-")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manual Add Overtime</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Staff"
              value={form.staffId}
              onChange={(e) => setForm((prev) => ({ ...prev, staffId: e.target.value }))}
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              size="small"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <TextField
              size="small"
              type="number"
              label="Minutes"
              value={form.minutes}
              inputProps={{ min: 15, step: 15 }}
              onChange={(e) => setForm((prev) => ({ ...prev, minutes: e.target.value }))}
            />
            <TextField
              size="small"
              label="Note (optional)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!canSubmit} onClick={handleCreate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
