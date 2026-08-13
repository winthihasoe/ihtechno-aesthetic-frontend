import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  createStaffAllowancePolicy,
  createStaffCompensationEntry,
  deleteStaffAllowancePolicy,
  deleteStaffCompensationEntry,
  getCompensationTypes,
  getStaffAllowancePolicies,
  getStaffCompensationEntries,
  getStaffs,
  updateStaffAllowancePolicy,
  updateStaffCompensationEntry,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import CompensationTypePicker from "./components/CompensationTypePicker";
import HrCompensationPageEmptyState from "./components/HrCompensationPageEmptyState";
import HrPageShell from "./components/HrPageShell";

const PAYROLL_LOCK_HELPER =
  "This line is calculated in the payroll and can't be edited.";

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const formatHumanDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const allowanceBasisLabel = {
  fixed_monthly: "Fixed monthly",
  per_day: "Per day",
  per_trip: "Per trip",
};

const emptyForm = () => ({
  mode: "policy",
  staffId: "",
  typeId: "",
  allowanceType: "fixed_monthly",
  amount: "",
  date: todayIsoDate(),
  effectiveTo: "",
  isActive: true,
  note: "",
});

export default function HrAllowancesPage() {
  const { pushToast } = useToastStore();
  const [staffs, setStaffs] = useState([]);
  const [types, setTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const activeAllowanceTypes = useMemo(
    () => types.filter((type) => type.category === "allowance" && type.is_active),
    [types],
  );

  const rows = useMemo(
    () => [
      ...policies.map((policy) => ({
        ...policy,
        source: "policy",
        displayDate: policy.effective_from,
        typeLabel: policy.compensation_type?.label || policy.compensationType?.label || "Allowance",
        note: policy.note,
      })),
      ...entries.map((entry) => ({
        ...entry,
        source: "one_time",
        displayDate: entry.entry_date,
        typeLabel: entry.compensation_type?.label || entry.compensationType?.label || "Allowance",
        allowance_type: null,
      })),
    ],
    [entries, policies],
  );

  const loadTypes = async () => {
    setTypes(normalizeList(await getCompensationTypes({ category: "allowance" })));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [staffList, typeList, policyList, entryList] = await Promise.all([
        getStaffs(),
        getCompensationTypes({ category: "allowance" }),
        getStaffAllowancePolicies({ per_page: 100 }),
        getStaffCompensationEntries({ category: "allowance", per_page: 100 }),
      ]);
      setStaffs(Array.isArray(staffList) ? staffList : []);
      setTypes(normalizeList(typeList));
      setPolicies(normalizeList(policyList));
      setEntries(normalizeList(entryList));
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load allowances."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddDialog = (mode = "policy") => {
    setEditingRow(null);
    setForm({
      ...emptyForm(),
      mode,
      typeId: activeAllowanceTypes[0]?.id ? String(activeAllowanceTypes[0].id) : "",
    });
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    if (row.payroll_locked) return;
    setEditingRow(row);
    setForm({
      mode: row.source,
      staffId: String(row.staff_id),
      typeId: String(row.type_id || ""),
      allowanceType: row.allowance_type || "fixed_monthly",
      amount: String(row.amount),
      date: (row.effective_from || row.entry_date)?.slice(0, 10) || todayIsoDate(),
      effectiveTo: row.effective_to?.slice(0, 10) || "",
      isActive: row.is_active ?? true,
      note: row.note || "",
    });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setOpenDialog(false);
    setEditingRow(null);
    setForm(emptyForm());
  };

  const submit = async () => {
    if (!form.staffId || !form.typeId || !form.amount || !form.date) return;

    setSaving(true);
    try {
      if (form.mode === "policy") {
        const payload = {
          staff_id: Number(form.staffId),
          type_id: Number(form.typeId),
          allowance_type: form.allowanceType,
          amount: Number(form.amount),
          effective_from: form.date,
          effective_to: form.effectiveTo || null,
          is_active: form.isActive,
          note: form.note || null,
        };

        if (editingRow) {
          await updateStaffAllowancePolicy(editingRow.id, payload);
        } else {
          await createStaffAllowancePolicy(payload);
        }
      } else {
        const payload = {
          staff_id: Number(form.staffId),
          type_id: Number(form.typeId),
          entry_type: "transport_allowance",
          amount: Number(form.amount),
          entry_date: form.date,
          note: form.note || null,
        };

        if (editingRow) {
          await updateStaffCompensationEntry(editingRow.id, payload);
        } else {
          await createStaffCompensationEntry(payload);
        }
      }

      pushToast({ message: "Allowance saved.", severity: "success" });
      closeDialog();
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save allowance."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.payroll_locked) return;

    setDeleting(true);
    try {
      if (deleteTarget.source === "policy") {
        await deleteStaffAllowancePolicy(deleteTarget.id);
      } else {
        await deleteStaffCompensationEntry(deleteTarget.id);
      }
      pushToast({ message: "Allowance deleted.", severity: "success" });
      setDeleteTarget(null);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete allowance."),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <HrPageShell
      title="Allowances"
      subtitle="Recurring allowance policies and one-time allowance entries."
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openAddDialog("one_time")}>
            Add One-Time
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAddDialog("policy")}>
            Add Policy
          </Button>
        </Stack>
      }
    >
      <Card variant="outlined" sx={{ p: rows.length || loading ? 0 : 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <HrCompensationPageEmptyState
            icon={CardGiftcardIcon}
            title="No allowance records yet"
            description="Manage recurring allowance policies and one-time allowance payments. Transportation, attendance, punctuality, and custom types all feed the payroll allowance total."
            bullets={[
              {
                label: "Recurring policy:",
                text: "Set a staff member's allowance type, basis (fixed monthly, per day, or per trip), amount, and effective dates. Active policies apply each payroll run.",
              },
              {
                label: "One-time entry:",
                text: "Log a single allowance payment for a specific date — useful for ad-hoc stipends.",
              },
              {
                label: "Custom types:",
                text: "Use Add new type in the type picker to create clinic-specific allowance categories beyond the defaults.",
              },
              {
                label: "Payroll impact:",
                text: "One-time entries plus the active recurring policy amount are included in the staff allowance total on payroll.",
              },
              {
                label: "Payroll lock:",
                text: "Rows tied to a finalized payroll month cannot be edited or deleted.",
              },
            ]}
            primaryAction={{
              label: "Add Policy",
              onClick: () => openAddDialog("policy"),
            }}
            secondaryAction={{
              label: "Add One-Time",
              onClick: () => openAddDialog("one_time"),
            }}
            footerCaption="Start with a recurring policy for monthly transport or attendance, or add a one-time line for a specific payment."
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Basis</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.source}-${row.id}`} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.staff?.name || `Staff #${row.staff_id}`}
                    </TableCell>
                    <TableCell>{row.typeLabel}</TableCell>
                    <TableCell>{allowanceBasisLabel[row.allowance_type] || "-"}</TableCell>
                    <TableCell align="right">{formatKyats(row.amount)}</TableCell>
                    <TableCell>{formatHumanDate(row.displayDate)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.source === "policy" ? "Policy" : "One-time"}
                        variant={row.source === "policy" ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell align="right">
                      {row.payroll_locked ? (
                        <Tooltip title={PAYROLL_LOCK_HELPER}>
                          <span>
                            <IconButton size="small" disabled>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEditDialog(row)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingRow ? "Edit Allowance" : "Add Allowance"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Mode"
              value={form.mode}
              onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
              disabled={Boolean(editingRow)}
              fullWidth
            >
              <MenuItem value="policy">Recurring policy</MenuItem>
              <MenuItem value="one_time">One-time entry</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Staff"
              value={form.staffId}
              onChange={(event) => setForm((prev) => ({ ...prev, staffId: event.target.value }))}
              disabled={Boolean(editingRow)}
              fullWidth
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <CompensationTypePicker
              category="allowance"
              types={types}
              value={form.typeId}
              onChange={(typeId) => setForm((prev) => ({ ...prev, typeId: String(typeId) }))}
              onCreated={loadTypes}
              required
            />
            {form.mode === "policy" ? (
              <TextField
                select
                size="small"
                label="Allowance basis"
                value={form.allowanceType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowanceType: event.target.value }))
                }
                fullWidth
              >
                {Object.entries(allowanceBasisLabel).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField
              size="small"
              type="number"
              label="Amount"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              inputProps={{ min: 0, step: 1000 }}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label={form.mode === "policy" ? "Effective from" : "Entry date"}
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              fullWidth
            />
            {form.mode === "policy" ? (
              <>
                <TextField
                  type="date"
                  size="small"
                  label="Effective to"
                  InputLabelProps={{ shrink: true }}
                  value={form.effectiveTo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, effectiveTo: event.target.value }))
                  }
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.isActive)}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                    />
                  }
                  label="Active"
                />
              </>
            ) : null}
            <TextField
              size="small"
              label="Note"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : editingRow ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete allowance?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes the allowance from future payroll calculations.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
