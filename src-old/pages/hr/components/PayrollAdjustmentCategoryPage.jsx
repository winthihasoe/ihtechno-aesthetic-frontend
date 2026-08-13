import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
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
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../../components/common/CollapsibleFilters";
import {
  createPayrollAdjustment,
  deletePayrollAdjustment,
  getCompensationTypes,
  getPayrollAdjustments,
  getStaffs,
  updatePayrollAdjustment,
} from "../../../services/hrService";
import { getCommissions } from "../../../services/commissionService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";
import { formatKyats } from "../../../utils/formatKyats";
import CompensationTypePicker from "./CompensationTypePicker";
import HrCompensationPageEmptyState from "./HrCompensationPageEmptyState";
import HrPageShell from "./HrPageShell";

const PAYROLL_LOCK_HELPER =
  "This line is calculated in the payroll and can't be edited.";

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

const formatHumanDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const emptyForm = () => ({
  staffId: "",
  typeId: "",
  amount: "",
  effectiveDate: todayIsoDate(),
  note: "",
});

const defaultWideRange = () => {
  const end = new Date();
  const start = new Date(end.getFullYear() - 2, end.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

export default function PayrollAdjustmentCategoryPage({
  category,
  title,
  subtitle,
  addLabel,
  emptyState,
  includeAutoCommissions = false,
  topBanner = null,
}) {
  const { pushToast } = useToastStore();
  const [staffs, setStaffs] = useState([]);
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [autoRows, setAutoRows] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(currentMonthRange);
  const [appliedFilters, setAppliedFilters] = useState(currentMonthRange);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const availableTypes = useMemo(
    () => types.filter((type) => type.category === category && type.is_active),
    [category, types],
  );

  const isDefaultMonthRange = useMemo(() => {
    const current = currentMonthRange();
    return (
      appliedFilters.from === current.from && appliedFilters.to === current.to
    );
  }, [appliedFilters.from, appliedFilters.to]);

  const activeFilterCount = isDefaultMonthRange ? 0 : 1;

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    const current = currentMonthRange();
    setDraftFilters(current);
    setAppliedFilters(current);
  };

  const applyDateRange = (range) => {
    setDraftFilters(range);
    setAppliedFilters(range);
  };

  const displayRows = useMemo(
    () => [
      ...autoRows,
      ...rows.map((row) => ({
        ...row,
        source: "manual",
        displayDate: row.effective_date,
        displayAmount: row.amount,
        typeLabel: row.compensation_type?.label || row.compensationType?.label || row.type,
      })),
    ],
    [autoRows, rows],
  );

  const loadTypes = async () => {
    const response = await getCompensationTypes({ category });
    setTypes(normalizeList(response));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [staffList, typeList, adjustmentList, commissionList] = await Promise.all([
        getStaffs(),
        getCompensationTypes({ category }),
        getPayrollAdjustments({
          category,
          effective_from: appliedFilters.from,
          effective_to: appliedFilters.to,
          per_page: 100,
        }),
        includeAutoCommissions
          ? getCommissions({
              from_date: appliedFilters.from,
              to_date: appliedFilters.to,
            })
          : Promise.resolve({ data: [] }),
      ]);

      setStaffs(Array.isArray(staffList) ? staffList : []);
      setTypes(normalizeList(typeList));
      setRows(normalizeList(adjustmentList));
      setAutoRows(
        includeAutoCommissions
          ? normalizeList(commissionList)
              .filter((row) => row.entry_kind === "commission_entry")
              .map((row) => ({
                id: `auto-${row.id}`,
                source: "auto",
                staff: row.staff,
                typeLabel: "Commission",
                displayAmount: row.commission_amount,
                displayDate: row.created_at,
                note: row.reason,
                payroll_locked: true,
              }))
          : [],
      );
    } catch (error) {
      pushToast({
        message: resolveApiError(error, `Failed to load ${title.toLowerCase()}.`),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, appliedFilters.from, appliedFilters.to]);

  const openAddDialog = () => {
    setEditingRow(null);
    setForm({
      ...emptyForm(),
      typeId: availableTypes[0]?.id ? String(availableTypes[0].id) : "",
    });
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    if (row.payroll_locked || row.source === "auto") return;
    setEditingRow(row);
    setForm({
      staffId: String(row.staff_id),
      typeId: String(row.type_id || ""),
      amount: String(row.amount),
      effectiveDate: row.effective_date?.slice(0, 10) || todayIsoDate(),
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
    if (!form.staffId || !form.typeId || !form.amount || !form.effectiveDate) return;

    setSaving(true);
    try {
      const payload = {
        type_id: Number(form.typeId),
        amount: Number(form.amount),
        effective_date: form.effectiveDate,
        note: form.note || null,
      };

      if (editingRow) {
        await updatePayrollAdjustment(editingRow.id, payload);
        pushToast({ message: `${title} entry updated.`, severity: "success" });
      } else {
        await createPayrollAdjustment({
          staff_id: Number(form.staffId),
          ...payload,
        });
        pushToast({ message: `${title} entry created.`, severity: "success" });
      }

      closeDialog();
      await load();
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
    if (!deleteTarget || deleteTarget.payroll_locked) return;

    setDeleting(true);
    try {
      await deletePayrollAdjustment(deleteTarget.id);
      pushToast({ message: `${title} entry deleted.`, severity: "success" });
      setDeleteTarget(null);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete entry."),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <HrPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            {addLabel}
          </Button>
        </Stack>
      }
    >
      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
        clearLabel="Reset to this month"
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            type="date"
            size="small"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, from: event.target.value }))
            }
          />
          <TextField
            type="date"
            size="small"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, to: event.target.value }))
            }
          />
        </Stack>
      </CollapsibleFiltersPanel>

      {topBanner ? <Box sx={{ mb: 2 }}>{topBanner}</Box> : null}

      <Card variant="outlined" sx={{ p: displayRows.length || loading ? 0 : 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : displayRows.length === 0 && emptyState ? (
          <HrCompensationPageEmptyState
            icon={emptyState.icon}
            title={
              isDefaultMonthRange
                ? emptyState.titleMonth
                : emptyState.titleAll || emptyState.titleMonth
            }
            description={emptyState.description}
            bullets={emptyState.bullets}
            primaryAction={{
              label: addLabel,
              onClick: openAddDialog,
            }}
            secondaryAction={
              isDefaultMonthRange
                ? {
                    label: "Expand date range",
                    onClick: () => applyDateRange(defaultWideRange()),
                  }
                : {
                    label: "Reset to this month",
                    onClick: () => applyDateRange(currentMonthRange()),
                  }
            }
            footerCaption={
              isDefaultMonthRange
                ? emptyState.footerMonth
                : emptyState.footerExpanded ||
                  `Showing ${formatHumanDate(appliedFilters.from)} to ${formatHumanDate(appliedFilters.to)}. Reset to this month or add a new entry.`
            }
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row) => (
                  <TableRow key={`${row.source}-${row.id}`} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.staff?.name || `Staff #${row.staff_id}`}
                    </TableCell>
                    <TableCell>{row.typeLabel}</TableCell>
                    <TableCell align="right">{formatKyats(row.displayAmount)}</TableCell>
                    <TableCell>{formatHumanDate(row.displayDate)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.source === "auto" ? "Auto" : "Manual"}
                        color={row.source === "auto" ? "info" : "default"}
                        variant={row.source === "auto" ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell align="right">
                      {row.payroll_locked || row.source === "auto" ? (
                        <Tooltip title={row.source === "auto" ? "Auto commission rows are read-only." : PAYROLL_LOCK_HELPER}>
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
        <DialogTitle>{editingRow ? `Edit ${title}` : addLabel}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
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
              category={category}
              types={types}
              value={form.typeId}
              onChange={(typeId) => setForm((prev) => ({ ...prev, typeId: String(typeId) }))}
              onCreated={loadTypes}
              required
            />
            <TextField
              size="small"
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              inputProps={{ min: 0, step: 1000 }}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="Effective date"
              InputLabelProps={{ shrink: true }}
              value={form.effectiveDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, effectiveDate: event.target.value }))
              }
              fullWidth
            />
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
        <DialogTitle>Delete entry?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes the entry from future payroll calculations.
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
