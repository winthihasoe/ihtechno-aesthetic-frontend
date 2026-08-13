import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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

const filterAccordionSx = {
  borderRadius: 1,
  overflow: "hidden",
  border: 1,
  borderColor: "divider",
  boxShadow: "none",
  "&:before": { display: "none" },
  "&.Mui-expanded": { margin: 0 },
  "& .MuiAccordionSummary-root": {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  "&:not(.Mui-expanded) .MuiAccordionSummary-root": {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  "&.Mui-expanded .MuiAccordionDetails-root": {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
};

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

function daysFromToday(offset, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

const SAMPLE_STAFF = [
  { id: 2, name: "Dr. San Oo" },
  { id: 3, name: "Dr. Yin Hla" },
  { id: 4, name: "Dr. Khine Zaw" },
  { id: 5, name: "Nurse Htet Htet" },
  { id: 6, name: "Nurse May May" },
  { id: 7, name: "Nurse Hnin Hnin" },
  { id: 8, name: "Nurse Zin Zin" },
  { id: 9, name: "Nurse Su Su" },
  { id: 10, name: "Ko Thura" },
  { id: 11, name: "Ma Phyu" },
  { id: 12, name: "Daw Cho" },
  { id: 13, name: "Ko Naing" },
  { id: 14, name: "Ma Thandar" },
  { id: 15, name: "U Ba Win" },
  { id: 16, name: "Daw Aye" },
];

const staffById = (id) => SAMPLE_STAFF.find((s) => s.id === id) || { id, name: "-" };

/** Demo rows: 22 one-off entries + 8 transport policies = 30 total. */
function buildSampleCompensationData() {
  // [id, staffId, entryType, amount, createdDaysAgo, effectiveDaysAgo, payrollLocked]
  const entrySeeds = [
    [1, 2, "commission", 85000, 1, 1, false],
    [2, 3, "commission", 72000, 2, 2, false],
    [3, 4, "commission", 68000, 3, 3, true],
    [4, 5, "transport_allowance", 25000, 1, 0, false],
    [5, 6, "transport_allowance", 25000, 2, 1, false],
    [6, 7, "adjustment", 15000, 4, 4, false],
    [7, 10, "commission", 35000, 5, 5, false],
    [8, 11, "commission", 32000, 5, 5, false],
    [9, 12, "commission", 40000, 6, 6, true],
    [10, 14, "adjustment", 10000, 3, 2, false],
    [11, 2, "adjustment", -20000, 7, 7, false],
    [12, 8, "transport_allowance", 20000, 4, 3, false],
    [13, 9, "transport_allowance", 18000, 6, 5, false],
    [14, 15, "adjustment", 50000, 8, 8, true],
    [15, 5, "commission", 28000, 0, 0, false],
    [16, 6, "commission", 22000, 1, 1, false],
    [17, 13, "adjustment", 12000, 9, 9, false],
    [18, 3, "transport_allowance", 30000, 2, 2, false],
    [19, 16, "adjustment", 8000, 10, 10, false],
    [20, 4, "commission", 55000, 11, 11, false],
    [21, 7, "commission", 18000, 0, 0, false],
    [22, 12, "adjustment", -10000, 12, 12, false],
  ];

  // [id, staffId, allowanceType, amount, createdDaysAgo, effectiveDaysAgo, payrollLocked]
  const policySeeds = [
    [101, 5, "fixed_monthly", 40000, 8, 12, false],
    [102, 6, "fixed_monthly", 40000, 8, 12, false],
    [103, 10, "per_day", 5000, 7, 10, false],
    [104, 11, "per_day", 5000, 7, 10, true],
    [105, 14, "per_trip", 3000, 6, 9, false],
    [106, 2, "fixed_monthly", 60000, 10, 14, false],
    [107, 12, "fixed_monthly", 35000, 9, 13, false],
    [108, 16, "per_day", 4000, 5, 8, false],
  ];

  const entries = entrySeeds.map(
    ([id, staffId, entry_type, amount, createdDaysAgo, effectiveDaysAgo, payroll_locked]) => {
      const created = daysFromToday(-createdDaysAgo, 9, 15 + (id % 20));
      const effective = daysFromToday(-effectiveDaysAgo);
      return {
        id,
        staff_id: staffId,
        staff: staffById(staffId),
        entry_type,
        amount,
        entry_date: toDateKey(effective),
        created_at: created.toISOString(),
        payroll_locked,
      };
    },
  );

  const policies = policySeeds.map(
    ([
      id,
      staffId,
      allowance_type,
      amount,
      createdDaysAgo,
      effectiveDaysAgo,
      payroll_locked,
    ]) => {
      const created = daysFromToday(-createdDaysAgo, 11, 5 + (id % 15));
      const effective = daysFromToday(-effectiveDaysAgo);
      return {
        id,
        staff_id: staffId,
        staff: staffById(staffId),
        allowance_type,
        amount,
        effective_from: toDateKey(effective),
        created_at: created.toISOString(),
        payroll_locked,
      };
    },
  );

  return { entries, policies };
}

const SAMPLE_COMPENSATION = buildSampleCompensationData();

const filterSampleByLoggedMonth = (rows, scope) => {
  if (scope === "all") return rows;
  const { start, end } = currentMonthRange();
  return rows.filter((row) => {
    const logged = String(row.created_at || "").slice(0, 10);
    return logged >= start && logged <= end;
  });
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
  const [staffs, setStaffs] = useState(SAMPLE_STAFF);
  const [entries, setEntries] = useState(() =>
    filterSampleByLoggedMonth(SAMPLE_COMPENSATION.entries, "month"),
  );
  const [policies, setPolicies] = useState(() =>
    filterSampleByLoggedMonth(SAMPLE_COMPENSATION.policies, "month"),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingRow, setEditingRow] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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

  const showEmptyState = !loading && filtersApplied && allRows.length === 0;
  const showTableChrome = !loading && !showEmptyState;
  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );
  const isEditingPolicy = editingRow?.source === "policy";
  const isTransportPolicy =
    isEditingPolicy ||
    (!editingRow && form.entryType === "transport_allowance");

  const applySampleData = (scope) => {
    setStaffs(SAMPLE_STAFF);
    setEntries(filterSampleByLoggedMonth(SAMPLE_COMPENSATION.entries, scope));
    setPolicies(filterSampleByLoggedMonth(SAMPLE_COMPENSATION.policies, scope));
  };

  const load = async (scope = filtersApplied ? "all" : "month") => {
    setLoading(true);
    try {
      const listParams = buildListParams(scope);
      const [staffRows, entryRows, policyRows] = await Promise.all([
        getStaffs(),
        getStaffCompensationEntries(listParams),
        getStaffTransportAllowancePolicies(listParams),
      ]);
      const nextStaffs = Array.isArray(staffRows) ? staffRows : [];
      const nextEntries = normalizeList(entryRows);
      const nextPolicies = normalizeList(policyRows);

      if (!nextEntries.length && !nextPolicies.length) {
        applySampleData(scope);
      } else {
        setStaffs(nextStaffs.length ? nextStaffs : SAMPLE_STAFF);
        setEntries(nextEntries);
        setPolicies(nextPolicies);
      }
    } catch (error) {
      applySampleData(scope);
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
      guide={[
        "One-off compensation entries — bonuses, allowances and deductions — outside base salary.",
        "Entries here adjust the staff member's payroll for the selected period.",
      ]}
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
          <CircularProgress size={32} />
        </Box>
      ) : null}

      {showEmptyState ? <CompensationEmptyState /> : null}

      {showTableChrome ? (
        <Stack spacing={2}>
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
          </Stack>

          <Accordion
            expanded={filtersExpanded}
            onChange={(_, expanded) => setFiltersExpanded(expanded)}
            variant="outlined"
            sx={filterAccordionSx}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterListIcon fontSize="small" color="action" />
                <Typography fontWeight={600}>Filters</Typography>
                {filtersApplied ? (
                  <Chip size="small" color="primary" label="All records" />
                ) : null}
                {activeFilterCount > 0 ? (
                  <Chip
                    size="small"
                    color={filtersApplied ? "primary" : "default"}
                    variant={filtersApplied ? "filled" : "outlined"}
                    label={`${activeFilterCount} active`}
                  />
                ) : null}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
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
                    onChange={(e) =>
                      updateDraftFilter("staff_id", e.target.value)
                    }
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
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={applyFilters}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={clearFilters}
                    disabled={!filtersApplied && activeFilterCount === 0}
                  >
                    Reset to this month
                  </Button>
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>

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
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {filtersApplied
                          ? "No records match the current filters."
                          : `No entries logged in ${monthView.label} (by entry date). Open Filters and click Apply to search all records.`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
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

function CompensationEmptyState() {
  return (
    <Box
      sx={{
        p: 3,
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
        No compensation records yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        Track extra pay beyond base salary — commissions, transport allowances,
        and one-off adjustments. These amounts roll into monthly payroll for
        each staff member.
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
          <strong>Commission & other:</strong> One-off lines with entry date set
          to today when you save.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Transport allowance:</strong> Recurring rules (fixed monthly,
          daily, or per trip) with an effective date.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payroll impact:</strong> Commission totals and transport
          allowance (entries plus active policy) are included in the staff total
          alongside base salary, overtime, and deductions.
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        No matching records in the full history. Use Add Entry above to create one,
        or adjust your filters.
      </Typography>
    </Box>
  );
}
