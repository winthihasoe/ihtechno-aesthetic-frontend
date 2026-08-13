import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Link as RouterLink } from "react-router-dom";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  applyStaffSalaryHoldToMonth,
  createStaffSalaryHold,
  getStaffSalaryHolds,
  getStaffs,
  releaseStaffSalaryHold,
  updateStaffSalaryHold,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import HrPageShell from "./components/HrPageShell";

const HOLD_MODES = [
  { value: "full_net", label: "Full net pay" },
  { value: "fixed_monthly", label: "Fixed monthly amount" },
];

const formatHumanDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const emptyForm = () => ({
  staffId: "",
  holdMode: "full_net",
  monthlyAmount: "",
  reason: "",
  heldSince: new Date().toISOString().slice(0, 10),
  expectedReleaseDate: "",
});

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export default function HrSalaryHoldRegisterPage() {
  const { pushToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const canManage = hasPermission(user, "hr.manage");

  const [statusFilter, setStatusFilter] = useState("active");
  const [applyMonth, setApplyMonth] = useState(currentMonthKey());
  const [rows, setRows] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseNote, setReleaseNote] = useState("");
  const [applyTarget, setApplyTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStaffSalaryHolds({
        status: statusFilter,
        month: applyMonth,
      });
      setRows(normalizeList(response));
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load salary holds."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, applyMonth, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getStaffs()
      .then((list) => setStaffs(Array.isArray(list) ? list : []))
      .catch(() => setStaffs([]));
  }, []);

  const missingApplyCount = useMemo(
    () =>
      rows.filter(
        (row) => row.status === "active" && row.applied_for_month === false,
      ).length,
    [rows],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      staffId: String(row.staff_id),
      holdMode: row.hold_mode,
      monthlyAmount:
        row.monthly_amount != null
          ? formatCommaAmountFromNumber(row.monthly_amount)
          : "",
      reason: row.reason || "",
      heldSince: row.held_since || new Date().toISOString().slice(0, 10),
      expectedReleaseDate: row.expected_release_date || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const submitHold = async () => {
    if (!form.staffId || !form.reason.trim() || !form.heldSince) {
      pushToast({
        message: "Staff, reason, and held-since date are required.",
        severity: "warning",
      });
      return;
    }

    const monthlyAmount =
      form.holdMode === "fixed_monthly" ? parseCommaAmount(form.monthlyAmount) : null;
    if (
      form.holdMode === "fixed_monthly" &&
      (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0)
    ) {
      pushToast({
        message: "Enter a valid monthly amount for fixed monthly holds.",
        severity: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        hold_mode: form.holdMode,
        monthly_amount: monthlyAmount,
        reason: form.reason.trim(),
        held_since: form.heldSince,
        expected_release_date: form.expectedReleaseDate || null,
      };

      if (editing) {
        await updateStaffSalaryHold(editing.id, payload);
        pushToast({ message: "Salary hold updated.", severity: "success" });
      } else {
        await createStaffSalaryHold({
          staff_id: Number(form.staffId),
          ...payload,
        });
        pushToast({ message: "Salary hold placed.", severity: "success" });
      }
      closeDialog();
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save salary hold."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmRelease = async () => {
    if (!releaseTarget) return;
    setSaving(true);
    try {
      await releaseStaffSalaryHold(releaseTarget.id, {
        release_note: releaseNote.trim() || undefined,
      });
      pushToast({ message: "Salary hold released.", severity: "success" });
      setReleaseTarget(null);
      setReleaseNote("");
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to release salary hold."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmApply = async () => {
    if (!applyTarget) return;
    setSaving(true);
    try {
      await applyStaffSalaryHoldToMonth(applyTarget.id, { month: applyMonth });
      pushToast({
        message: `Hold applied to ${applyMonth}. Regenerate payroll to refresh draft totals.`,
        severity: "success",
      });
      setApplyTarget(null);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to apply salary hold."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrPageShell
      title="Salary holds"
      subtitle="Remember who is on salary hold across months. Apply a deduction each payroll month, then regenerate payroll."
    >
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="released">Released</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </TextField>
              <TextField
                type="month"
                size="small"
                label="Apply month"
                value={applyMonth}
                onChange={(event) => setApplyMonth(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            {canManage ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                Place hold
              </Button>
            ) : null}
          </Stack>

          {statusFilter === "active" && missingApplyCount > 0 ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {missingApplyCount} active hold(s) are not yet applied for {applyMonth}. Use{" "}
              <strong>Apply to month</strong>, then regenerate payroll on{" "}
              <Typography
                component={RouterLink}
                to="/hr/payroll"
                variant="body2"
                sx={{ fontWeight: 700, color: "inherit" }}
              >
                Payroll
              </Typography>
              .
            </Alert>
          ) : null}
        </Card>

        <Card variant="outlined" sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <LoadingIndicator size={48} />
            </Box>
          ) : rows.length === 0 ? (
            <Stack spacing={1} alignItems="center" sx={{ py: 4, textAlign: "center" }}>
              <PauseCircleOutlineIcon sx={{ fontSize: 40, color: "text.secondary" }} />
              <Typography variant="h6">No salary holds</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
                Place a hold when an employee should not be paid (or only partially paid) until
                resolved. This register remembers them next month — Apply creates a linked
                deduction for the selected payroll month.
              </Typography>
            </Stack>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell align="right">Monthly amount</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Held since</TableCell>
                    <TableCell>Expected release</TableCell>
                    <TableCell align="right">Withheld total</TableCell>
                    <TableCell>{applyMonth}</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {row.staff?.name || `Staff #${row.staff_id}`}
                      </TableCell>
                      <TableCell>
                        {row.hold_mode === "fixed_monthly" ? "Fixed monthly" : "Full net"}
                      </TableCell>
                      <TableCell align="right">
                        {row.hold_mode === "fixed_monthly"
                          ? formatKyats(row.monthly_amount)
                          : "Full net"}
                      </TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>{formatHumanDate(row.held_since)}</TableCell>
                      <TableCell>{formatHumanDate(row.expected_release_date)}</TableCell>
                      <TableCell align="right">{formatKyats(row.total_withheld)}</TableCell>
                      <TableCell>
                        {row.status !== "active" ? (
                          <Chip size="small" label={row.status} />
                        ) : row.applied_for_month ? (
                          <Chip size="small" color="success" label="Applied" />
                        ) : (
                          <Chip size="small" color="warning" label="Not applied" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {canManage && row.status === "active" ? (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" onClick={() => openEdit(row)}>
                              Edit
                            </Button>
                            {!row.applied_for_month ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setApplyTarget(row)}
                              >
                                Apply
                              </Button>
                            ) : null}
                            <Button
                              size="small"
                              color="warning"
                              onClick={() => {
                                setReleaseTarget(row);
                                setReleaseNote("");
                              }}
                            >
                              Release
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit salary hold" : "Place salary hold"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Staff"
              value={form.staffId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, staffId: event.target.value }))
              }
              disabled={Boolean(editing)}
              fullWidth
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={String(staff.id)}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Hold mode"
              value={form.holdMode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, holdMode: event.target.value }))
              }
              fullWidth
            >
              {HOLD_MODES.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  {mode.label}
                </MenuItem>
              ))}
            </TextField>
            {form.holdMode === "fixed_monthly" ? (
              <TextField
                size="small"
                label="Monthly amount"
                value={form.monthlyAmount}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    monthlyAmount: sanitizeCommaAmountInput(event.target.value),
                  }))
                }
                fullWidth
              />
            ) : null}
            <TextField
              size="small"
              label="Reason"
              value={form.reason}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reason: event.target.value }))
              }
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Held since"
              value={form.heldSince}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, heldSince: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Expected release"
              value={form.expectedReleaseDate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  expectedReleaseDate: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitHold} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Place hold"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(releaseTarget)}
        onClose={() => !saving && setReleaseTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Release salary hold?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2">
              {releaseTarget?.staff?.name} will no longer appear as on hold. Stop applying
              deductions for future months.
            </Typography>
            <TextField
              size="small"
              label="Release note"
              value={releaseNote}
              onChange={(event) => setReleaseNote(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button color="warning" variant="contained" onClick={confirmRelease} disabled={saving}>
            {saving ? "Releasing…" : "Release"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(applyTarget)}
        onClose={() => !saving && setApplyTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apply hold to {applyMonth}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Creates a linked <strong>Salary hold</strong> deduction for{" "}
            {applyTarget?.staff?.name}. Then regenerate payroll so draft totals include it.
            {applyTarget?.hold_mode === "fixed_monthly"
              ? ` Amount: ${formatKyats(applyTarget.monthly_amount)}.`
              : " Amount: full draft net pay (generate draft payroll first)."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmApply} disabled={saving}>
            {saving ? "Applying…" : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
