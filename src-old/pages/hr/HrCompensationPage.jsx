import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { Link as RouterLink } from "react-router-dom";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
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
import HrPageShell from "./components/HrPageShell";
import {
  createStaffCompensationEntry,
  createStaffTransportAllowancePolicy,
  deleteStaffCompensationEntry,
  deleteStaffTransportAllowancePolicy,
  getStaffCompensationEntries,
  getStaffTransportAllowancePolicies,
  getStaffs,
  updateStaffCompensationEntry,
  updateStaffTransportAllowancePolicy,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";

const emptyFilters = {
  staff_id: "",
  type: "",
  effective_from: "",
  effective_to: "",
};

const PAYROLL_LOCK_HELPER =
  "This line is calculated in the payroll and can't be edited.";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const currentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(now),
  };
};

const buildListParams = (scope) => {
  if (scope === "all") {
    return { per_page: 500 };
  }
  const { start, end } = currentMonthRange();
  return { logged_from: start, logged_to: end, per_page: 100 };
};

const DEFAULT_FORM = () => ({
  staffId: "",
  entryType: "commission",
  allowanceType: "fixed_monthly",
  amount: "",
  effectiveDate: todayIsoDate(),
});

const compactTableSx = {
  minWidth: 880,
  "& .MuiTableCell-root": {
    fontSize: "0.8125rem",
    py: 0.75,
    px: 1.25,
  },
  "& .MuiTableCell-head": {
    fontWeight: 700,
    color: "text.secondary",
    bgcolor: "action.hover",
    py: 2,
    px: 1.25,
  },
};

const formatHumanDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const formatHumanDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const toIsoDateInput = (value) => {
  if (!value) return todayIsoDate();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const formatEntryTypeLabel = (entryType) => {
  const labels = {
    commission: "Commission",
    transport_allowance: "Transport allowance",
    adjustment: "Other",
  };
  return labels[entryType] || entryType || "-";
};

const formatPolicyTypeLabel = (allowanceType) => {
  const labels = {
    fixed_monthly: "Transport allowance (Fixed monthly)",
    per_day: "Transport allowance (Daily)",
    per_trip: "Transport allowance (Per trip)",
  };
  return labels[allowanceType] || "Transport allowance";
};

const normalizeList = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const buildTableRows = (entries, policies) => {
  const entryRows = (entries || []).map((row) => ({
    id: `entry-${row.id}`,
    recordId: row.id,
    source: "entry",
    entryDate: row.created_at,
    name: row.staff?.name || "-",
    typeLabel: formatEntryTypeLabel(row.entry_type),
    amount: row.amount,
    effectiveDate: row.entry_date,
    staffId: row.staff_id,
    typeKey: row.entry_type,
    payrollLocked: Boolean(row.payroll_locked),
    sortKey: new Date(row.entry_date || row.created_at).getTime(),
  }));

  const policyRows = (policies || []).map((row) => ({
    id: `policy-${row.id}`,
    recordId: row.id,
    source: "policy",
    entryDate: row.created_at,
    name: row.staff?.name || "-",
    typeLabel: formatPolicyTypeLabel(row.allowance_type),
    amount: row.amount,
    effectiveDate: row.effective_from,
    staffId: row.staff_id,
    typeKey: "policy",
    policyKind: row.allowance_type,
    payrollLocked: Boolean(row.payroll_locked),
    sortKey: new Date(row.effective_from || row.created_at).getTime(),
  }));

  return [...entryRows, ...policyRows].sort((a, b) => b.sortKey - a.sortKey);
};

const matchesTypeFilter = (row, typeFilter) => {
  if (!typeFilter) return true;
  if (typeFilter === "policy") return row.typeKey === "policy";
  if (typeFilter === "transport_allowance") {
    return row.typeKey === "transport_allowance" || row.typeKey === "policy";
  }
  return row.typeKey === typeFilter;
};

export default function HrCompensationPage() {
  const { pushToast } = useToastStore();
  const [staffs, setStaffs] = useState([]);
  const [entries, setEntries] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingRow, setEditingRow] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [filtersApplied, setFiltersApplied] = useState(false);

  const monthView = useMemo(() => currentMonthRange(), []);

  const allRows = useMemo(
    () => buildTableRows(entries, policies),
    [entries, policies],
  );

  const filteredRows = useMemo(() => {
    if (!filtersApplied) {
      return allRows;
    }

    return allRows.filter((row) => {
      if (
        appliedFilters.staff_id &&
        String(row.staffId) !== String(appliedFilters.staff_id)
      ) {
        return false;
      }
      if (!matchesTypeFilter(row, appliedFilters.type)) {
        return false;
      }
      if (appliedFilters.effective_from) {
        const from = new Date(appliedFilters.effective_from);
        const effective = new Date(row.effectiveDate);
        if (effective < from) return false;
      }
      if (appliedFilters.effective_to) {
        const to = new Date(appliedFilters.effective_to);
        const effective = new Date(row.effectiveDate);
        if (effective > to) return false;
      }
      return true;
    });
  }, [allRows, appliedFilters, filtersApplied]);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );
  const hasActiveFilters = filtersApplied && activeFilterCount > 0;
  const showFullEmptyState = !loading && allRows.length === 0;
  const showFilteredEmptyState =
    !loading && allRows.length > 0 && filteredRows.length === 0;
  const isEditingPolicy = editingRow?.source === "policy";
  const isTransportPolicy =
    isEditingPolicy ||
    (!editingRow && form.entryType === "transport_allowance");

  const load = async (scope = filtersApplied ? "all" : "month") => {
    setLoading(true);
    try {
      const listParams = buildListParams(scope);
      const [staffRows, entryRows, policyRows] = await Promise.all([
        getStaffs(),
        getStaffCompensationEntries(listParams),
        getStaffTransportAllowancePolicies(listParams),
      ]);
      setStaffs(Array.isArray(staffRows) ? staffRows : []);
      setEntries(normalizeList(entryRows));
      setPolicies(normalizeList(policyRows));
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load compensation data."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("month");
  }, []);

  const updateDraftFilter = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = async () => {
    setAppliedFilters(draftFilters);
    setFiltersApplied(true);
    await load("all");
  };

  const clearFilters = async () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFiltersApplied(false);
    await load("month");
  };

  const searchAllRecords = async () => {
    setFiltersApplied(true);
    await load("all");
  };

  const reloadCurrentView = async () => {
    await load(filtersApplied ? "all" : "month");
  };

  const closeEntryDialog = () => {
    if (saving) return;
    setOpenDialog(false);
    setEditingRow(null);
    setForm(DEFAULT_FORM());
  };

  const openAddDialog = () => {
    setEditingRow(null);
    setForm(DEFAULT_FORM());
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    if (row.payrollLocked) return;

    if (row.source === "policy") {
      setForm({
        staffId: String(row.staffId),
        entryType: "transport_allowance",
        allowanceType: row.policyKind,
        amount: String(row.amount),
        effectiveDate: toIsoDateInput(row.effectiveDate),
      });
    } else {
      setForm({
        staffId: String(row.staffId),
        entryType: row.typeKey,
        allowanceType: "fixed_monthly",
        amount: String(row.amount),
        effectiveDate: toIsoDateInput(row.effectiveDate),
      });
    }
    setEditingRow(row);
    setOpenDialog(true);
  };

  const submitEntry = async () => {
    if (!form.staffId || !form.amount || !form.effectiveDate) return;

    setSaving(true);
    try {
      if (editingRow) {
        if (editingRow.source === "policy") {
          await updateStaffTransportAllowancePolicy(editingRow.recordId, {
            allowance_type: form.allowanceType,
            amount: Number(form.amount),
            effective_from: form.effectiveDate,
          });
          pushToast({
            message: "Transport allowance policy updated.",
            severity: "success",
          });
        } else {
          await updateStaffCompensationEntry(editingRow.recordId, {
            entry_type: form.entryType,
            amount: Number(form.amount),
            entry_date: form.effectiveDate,
          });
          pushToast({
            message: "Compensation entry updated.",
            severity: "success",
          });
        }
      } else if (isTransportPolicy) {
        await createStaffTransportAllowancePolicy({
          staff_id: Number(form.staffId),
          allowance_type: form.allowanceType,
          amount: Number(form.amount),
          effective_from: form.effectiveDate,
        });
        pushToast({
          message: "Transport allowance policy created.",
          severity: "success",
        });
      } else {
        await createStaffCompensationEntry({
          staff_id: Number(form.staffId),
          entry_type: form.entryType,
          amount: Number(form.amount),
          entry_date: form.effectiveDate,
        });
        pushToast({
          message: "Compensation entry created.",
          severity: "success",
        });
      }
      closeEntryDialog();
      await reloadCurrentView();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Request failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.payrollLocked) return;

    setDeleting(true);
    try {
      if (deleteTarget.source === "policy") {
        await deleteStaffTransportAllowancePolicy(deleteTarget.recordId);
        pushToast({
          message: "Transport allowance policy deleted.",
          severity: "success",
        });
      } else {
        await deleteStaffCompensationEntry(deleteTarget.recordId);
        pushToast({
          message: "Compensation entry deleted.",
          severity: "success",
        });
      }
      setDeleteTarget(null);
      await reloadCurrentView();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete record."),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Compensation"
      actions={
        !loading ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Add Entry
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : null}

      {!loading ? (
        <Stack spacing={2}>
          <Alert
            severity="info"
            action={
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button component={RouterLink} to="../salary" size="small">
                  Salary
                </Button>
                <Button component={RouterLink} to="../variable-pay" size="small">
                  Variable Pay
                </Button>
                <Button component={RouterLink} to="../allowances" size="small">
                  Allowances
                </Button>
                <Button component={RouterLink} to="../deductions" size="small">
                  Deductions
                </Button>
              </Stack>
            }
          >
            This legacy Compensation page is deprecated. Use the focused HR
            compensation pages for new work.
          </Alert>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              {filtersApplied
                ? "Showing all records. Effective-date filters apply to the loaded data."
                : `Showing ${monthView.label} by entry date. Effective dates may fall in other months.`}
            </Typography>
            {!filtersApplied ? (
              <Chip
                size="small"
                variant="outlined"
                label={`${monthView.label} · entry date`}
              />
            ) : (
              <Chip size="small" color="primary" label="All records" />
            )}
            <CollapsibleFiltersToggle
              open={filtersOpen}
              onToggle={setFiltersOpen}
              activeCount={filtersApplied ? activeFilterCount : 0}
              size="small"
            />
          </Stack>

          <CollapsibleFiltersPanel
            open={filtersOpen}
            onApply={applyFilters}
            onClear={clearFilters}
            clearLabel="Reset to this month"
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                select
                size="small"
                label="Staff"
                value={draftFilters.staff_id}
                onChange={(e) => updateDraftFilter("staff_id", e.target.value)}
              >
                <MenuItem value="">All staff</MenuItem>
                {staffs.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Type"
                value={draftFilters.type}
                onChange={(e) => updateDraftFilter("type", e.target.value)}
              >
                <MenuItem value="">All types</MenuItem>
                <MenuItem value="commission">Commission</MenuItem>
                <MenuItem value="transport_allowance">
                  Transport allowance
                </MenuItem>
                <MenuItem value="adjustment">Other</MenuItem>
                <MenuItem value="policy">Transport policy</MenuItem>
              </TextField>
              <TextField
                type="date"
                size="small"
                label="Effective from"
                InputLabelProps={{ shrink: true }}
                value={draftFilters.effective_from}
                onChange={(e) =>
                  updateDraftFilter("effective_from", e.target.value)
                }
              />
              <TextField
                type="date"
                size="small"
                label="Effective to"
                InputLabelProps={{ shrink: true }}
                value={draftFilters.effective_to}
                onChange={(e) =>
                  updateDraftFilter("effective_to", e.target.value)
                }
              />
            </Box>
          </CollapsibleFiltersPanel>

          {showFullEmptyState ? (
            <CompensationEmptyState
              filtersApplied={filtersApplied}
              monthLabel={monthView.label}
              onAddEntry={openAddDialog}
              onSearchAllRecords={searchAllRecords}
            />
          ) : (
            <TableContainer
              sx={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                backgroundColor: "background.paper",
                borderRadius: 1,
              }}
            >
              <Table size="small" sx={compactTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>Entry Date</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Effective date</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatHumanDateTime(row.entryDate)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell>{row.typeLabel}</TableCell>
                      <TableCell align="right">
                        {formatKyats(row.amount)}
                      </TableCell>
                      <TableCell>{formatHumanDate(row.effectiveDate)}</TableCell>
                      <TableCell align="right" sx={{ minWidth: 168 }}>
                        {row.payrollLocked ? (
                          <Stack spacing={0.5} alignItems="flex-end">
                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title={PAYROLL_LOCK_HELPER}>
                                <span>
                                  <IconButton size="small" disabled>
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={PAYROLL_LOCK_HELPER}>
                                <span>
                                  <IconButton size="small" disabled>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                maxWidth: 200,
                                textAlign: "right",
                                lineHeight: 1.25,
                              }}
                            >
                              {PAYROLL_LOCK_HELPER}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack
                            direction="row"
                            spacing={0.25}
                            justifyContent="flex-end"
                          >
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(row)}
                              >
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
                  {showFilteredEmptyState ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, borderBottom: 0 }}>
                        <CompensationFilteredEmptyState
                          hasActiveFilters={hasActiveFilters}
                          onClearFilters={clearFilters}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      ) : null}

      <Dialog
        open={openDialog}
        onClose={closeEntryDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingRow ? "Edit entry" : "Add entry"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Staff"
              value={form.staffId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, staffId: e.target.value }))
              }
              disabled={Boolean(editingRow)}
              fullWidth
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Type"
              value={form.entryType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  entryType: e.target.value,
                  allowanceType:
                    e.target.value === "transport_allowance"
                      ? prev.allowanceType || "fixed_monthly"
                      : "fixed_monthly",
                }))
              }
              disabled={Boolean(editingRow)}
              fullWidth
            >
              <MenuItem value="commission">Commission</MenuItem>
              <MenuItem value="transport_allowance">
                Transport allowance
              </MenuItem>
              <MenuItem value="adjustment">Other</MenuItem>
            </TextField>
            {isTransportPolicy ? (
              <TextField
                select
                size="small"
                label="Allowance basis"
                value={form.allowanceType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    allowanceType: e.target.value,
                  }))
                }
                fullWidth
              >
                <MenuItem value="fixed_monthly">Fixed monthly</MenuItem>
                <MenuItem value="per_day">Daily</MenuItem>
                <MenuItem value="per_trip">Per trip</MenuItem>
              </TextField>
            ) : null}
            <TextField
              size="small"
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Effective date"
              InputLabelProps={{ shrink: true }}
              value={form.effectiveDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
              }
              fullWidth
            />
            {!editingRow ? (
              <Typography variant="caption" color="text.secondary">
                Entry date is recorded automatically as today (
                {formatHumanDate(todayIsoDate())}).
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEntryDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              saving || !form.staffId || !form.amount || !form.effectiveDate
            }
            onClick={submitEntry}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete entry?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete {deleteTarget?.typeLabel} for {deleteTarget?.name} (
            {formatHumanDate(deleteTarget?.effectiveDate)})? This cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={confirmDelete}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function CompensationEmptyState({
  filtersApplied,
  monthLabel,
  onAddEntry,
  onSearchAllRecords,
}) {
  const isMonthView = !filtersApplied;

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
      <PaymentsOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {isMonthView
          ? `No compensation entries in ${monthLabel}`
          : "No compensation records yet"}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        This page tracks extra pay beyond base salary — commissions, transport
        allowances, and one-off adjustments. Amounts roll into monthly payroll
        for each staff member.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Add entries:</strong> Use <em>Add Entry</em> to log commission,
          transport allowance, or other one-off lines for a staff member.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Commission &amp; other:</strong> One-off lines with entry date
          recorded automatically when you save.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Transport allowance:</strong> Recurring rules — fixed monthly,
          daily, or per trip — with an effective start date.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payroll impact:</strong> Commission totals and transport
          allowance (entries plus active policy) are included in the staff total
          alongside base salary, overtime, and deductions.
        </Typography>
        {isMonthView ? (
          <Typography variant="body2" color="text.secondary">
            <strong>Monthly view:</strong> By default this page shows{" "}
            {monthLabel} by entry date. Open <em>Filters</em> and click{" "}
            <em>Apply</em> to search the full history by staff, type, or effective
            date range.
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            <strong>Search &amp; filter:</strong> Use the filters above to narrow
            by staff, type, or effective date range after records are added.
          </Typography>
        )}
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="center"
        sx={{ mb: 1 }}
      >
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddEntry}>
          Add entry
        </Button>
        {isMonthView ? (
          <Button variant="outlined" onClick={onSearchAllRecords}>
            Search all records
          </Button>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        {isMonthView
          ? `Nothing logged in ${monthLabel} yet. Add an entry, or search all records if the line was entered in another month.`
          : "No matching records in the full history. Add an entry, or adjust the filters above when records exist."}
      </Typography>
    </Box>
  );
}

function CompensationFilteredEmptyState({ hasActiveFilters, onClearFilters }) {
  return (
    <Card variant="outlined" sx={{ m: 1.5, p: 2.5, bgcolor: "action.hover" }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        No records match these filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {hasActiveFilters
          ? "Try a different staff member, type, or effective date range, or reset to this month to see the default view."
          : "No entries match the current view. Reset to this month or adjust your filters."}
      </Typography>
      <Button size="small" variant="outlined" onClick={onClearFilters}>
        Reset to this month
      </Button>
    </Card>
  );
}
