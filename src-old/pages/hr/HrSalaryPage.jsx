import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Card,
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
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import {
  createStaffSalary,
  getStaffSalaries,
  getStaffs,
  updateStaffSalary,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import HrPageShell from "./components/HrPageShell";

const salaryFields = [
  ["basic_salary", "Basic salary"],
  ["basic_increase", "Basic increase"],
  ["yearly_increase", "Yearly increase"],
  ["license_amount", "License amount"],
  ["probation_increase", "Probation increase"],
];

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

const emptyForm = () => ({
  staffId: "",
  effectiveFrom: todayIsoDate(),
  basic_salary: "",
  basic_increase: "0",
  yearly_increase: "0",
  license_amount: "0",
  probation_increase: "0",
});

export default function HrSalaryPage() {
  const { pushToast } = useToastStore();
  const [staffs, setStaffs] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffFilter, setStaffFilter] = useState("");
  const [draftStaffFilter, setDraftStaffFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filteredRows = useMemo(
    () =>
      staffFilter
        ? rows.filter((row) => String(row.staff_id) === String(staffFilter))
        : rows,
    [rows, staffFilter],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [salaryList, staffList] = await Promise.all([getStaffSalaries(), getStaffs()]);
      setRows(normalizeList(salaryList));
      setStaffs(Array.isArray(staffList) ? staffList : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load salaries."),
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

  const openAddDialog = () => {
    setEditingRow(null);
    setForm(emptyForm());
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    setEditingRow(row);
    setForm({
      staffId: String(row.staff_id),
      effectiveFrom: row.effective_from?.slice(0, 10) || todayIsoDate(),
      basic_salary: String(row.basic_salary ?? row.base_salary ?? ""),
      basic_increase: String(row.basic_increase ?? 0),
      yearly_increase: String(row.yearly_increase ?? 0),
      license_amount: String(row.license_amount ?? 0),
      probation_increase: String(row.probation_increase ?? 0),
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
    if (!form.staffId || !form.effectiveFrom || !form.basic_salary) return;

    setSaving(true);
    try {
      const payload = {
        staff_id: Number(form.staffId),
        effective_from: form.effectiveFrom,
      };
      salaryFields.forEach(([field]) => {
        payload[field] = Number(form[field] || 0);
      });
      payload.base_salary = salaryFields.reduce(
        (sum, [field]) => sum + Number(form[field] || 0),
        0,
      );

      if (editingRow) {
        await updateStaffSalary(editingRow.id, payload);
        pushToast({ message: "Salary updated.", severity: "success" });
      } else {
        await createStaffSalary(payload);
        pushToast({ message: "Salary created.", severity: "success" });
      }

      closeDialog();
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save salary."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const activeFilterCount = staffFilter ? 1 : 0;

  const applyFilters = () => {
    setStaffFilter(draftStaffFilter);
  };

  const clearFilters = () => {
    setDraftStaffFilter("");
    setStaffFilter("");
  };

  return (
    <HrPageShell
      title="Salary"
      subtitle="Base salary history from staff salary records."
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add Salary
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
          label="Staff"
          value={draftStaffFilter}
          onChange={(event) => setDraftStaffFilter(event.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">All staff</MenuItem>
          {staffs.map((staff) => (
            <MenuItem key={staff.id} value={staff.id}>
              {staff.name}
            </MenuItem>
          ))}
        </TextField>
      </CollapsibleFiltersPanel>

      <Card variant="outlined">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Effective from</TableCell>
                  <TableCell align="right">Base salary</TableCell>
                  <TableCell align="right">Basic increase</TableCell>
                  <TableCell align="right">Yearly increase</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.staff?.name || `Staff #${row.staff_id}`}
                    </TableCell>
                    <TableCell>{formatHumanDate(row.effective_from)}</TableCell>
                    <TableCell align="right">{formatKyats(row.base_salary)}</TableCell>
                    <TableCell align="right">{formatKyats(row.basic_increase || 0)}</TableCell>
                    <TableCell align="right">{formatKyats(row.yearly_increase || 0)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(row)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No salary records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingRow ? "Edit Salary" : "Add Salary"}</DialogTitle>
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
            <TextField
              type="date"
              size="small"
              label="Effective from"
              InputLabelProps={{ shrink: true }}
              value={form.effectiveFrom}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))
              }
              fullWidth
            />
            {salaryFields.map(([field, label]) => (
              <TextField
                key={field}
                size="small"
                type="number"
                label={label}
                value={form[field]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [field]: event.target.value }))
                }
                inputProps={{ min: 0, step: 1000 }}
                fullWidth
              />
            ))}
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
    </HrPageShell>
  );
}
