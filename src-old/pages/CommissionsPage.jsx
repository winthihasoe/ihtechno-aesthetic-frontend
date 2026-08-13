import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import LoadingIndicator from "../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../components/common/CollapsibleFilters";
import AddIcon from "@mui/icons-material/Add";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import {
  getCommissions,
  getCommissionSummary,
} from "../services/commissionService";
import { createStaffCompensationEntry, getStaffs } from "../services/hrService";
import { resolveApiError } from "../services/apiClient";
import useAuthStore from "../stores/authStore";
import useToastStore from "../stores/toastStore";
import { hasPermission } from "../utils/accessUtils";
import { formatKyats } from "../utils/formatKyats";

const formatMoney = (value) => formatKyats(Number(value || 0));
const emptyFilters = {
  staff_id: "",
  source_type: "",
  from_date: "",
  to_date: "",
};
const emptyPagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 20,
};
const buildManualForm = () => ({
  staffId: "",
  amount: "",
  entryDate: new Date().toISOString().slice(0, 10),
  sourceType: "manual",
  sourceReference: "",
  note: "",
});
const compactParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );
const sourceLabel = (sourceType) => {
  const labels = {
    manual: "Manual",
    treatment: "Treatment",
    package_purchase: "Package purchase",
  };
  return labels[sourceType] || sourceType || "-";
};
const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

export default function CommissionsPage() {
  const { pushToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const canCreateManualCommission = hasPermission(user, "hr.manage");
  const canLoadStaffOptions =
    canCreateManualCommission || hasPermission(user, "hr.view");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(buildManualForm);
  const [savingManual, setSavingManual] = useState(false);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );
  const totalCommission = useMemo(
    () =>
      summary.reduce((sum, row) => sum + Number(row.total_commission || 0), 0),
    [summary],
  );
  const totalEntries = useMemo(
    () => summary.reduce((sum, row) => sum + Number(row.entry_count || 0), 0),
    [summary],
  );
  const canSubmitManual =
    Boolean(manualForm.staffId) &&
    Number(manualForm.amount) > 0 &&
    Boolean(manualForm.entryDate);
  const hasActiveFilters = activeFilterCount > 0;
  const showFullEmptyState =
    !loading && pagination.total === 0 && !hasActiveFilters;
  const showFilteredEmptyState =
    !loading && rows.length === 0 && hasActiveFilters;

  const load = async (nextFilters = appliedFilters, nextPage = page) => {
    setLoading(true);
    try {
      const params = compactParams(nextFilters);
      const [entriesResponse, totals] = await Promise.all([
        getCommissions({ ...params, page: nextPage }),
        getCommissionSummary(params),
      ]);

      const entryRows = Array.isArray(entriesResponse?.data)
        ? entriesResponse.data
        : Array.isArray(entriesResponse)
          ? entriesResponse
          : [];
      setRows(entryRows);
      setPagination({
        current_page: Number(entriesResponse?.current_page || nextPage),
        last_page: Number(entriesResponse?.last_page || 1),
        total: Number(entriesResponse?.total || entryRows.length),
        per_page: Number(entriesResponse?.per_page || 20),
      });
      setPage(Number(entriesResponse?.current_page || nextPage));
      setSummary(Array.isArray(totals) ? totals : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load commissions."),
        severity: "error",
      });
      setRows([]);
      setSummary([]);
      setPagination(emptyPagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(emptyFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canLoadStaffOptions) return;

    setStaffLoading(true);
    getStaffs()
      .then((staffRows) => setStaffs(Array.isArray(staffRows) ? staffRows : []))
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load staff options."),
          severity: "error",
        });
      })
      .finally(() => setStaffLoading(false));
  }, [canLoadStaffOptions, pushToast]);

  const updateDraftFilter = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
    load(draftFilters, 1);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
    load(emptyFilters, 1);
  };

  const handlePageChange = (_, value) => {
    setPage(value);
    load(appliedFilters, value);
  };

  const updateManualForm = (key, value) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateManualCommission = async () => {
    if (!canSubmitManual) return;

    setSavingManual(true);
    try {
      await createStaffCompensationEntry({
        staff_id: Number(manualForm.staffId),
        entry_type: "commission",
        amount: Number(manualForm.amount),
        entry_date: manualForm.entryDate,
        source_type: manualForm.sourceType.trim() || null,
        source_reference: manualForm.sourceReference.trim() || null,
        note: manualForm.note.trim() || null,
      });
      pushToast({
        message: "Manual commission created.",
        severity: "success",
      });
      setManualOpen(false);
      setManualForm(buildManualForm());
      await load(appliedFilters, page);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create manual commission."),
        severity: "error",
      });
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <Box sx={{ pb: 3 }}>
      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 3 }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Staff commissions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Review generated commission entries, filter by staff and date, and
              add manual commission adjustments for payroll.
            </Typography>
          </Box>
          {canCreateManualCommission && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setManualOpen(true)}
              sx={{ alignSelf: { xs: "stretch", md: "center" } }}
            >
              Create Commission
            </Button>
          )}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: { xs: 0.75, sm: 1.5 },
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1, sm: 1.5 },
              minWidth: 0,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                lineHeight: 1.2,
                fontSize: { xs: "0.65rem", sm: "inherit" },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Filtered total
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "inline", sm: "none" } }}
              >
                Total
              </Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.95rem", sm: "inherit" },
                lineHeight: 1.2,
              }}
            >
              {formatMoney(totalCommission)}
            </Typography>
          </Paper>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1, sm: 1.5 },
              minWidth: 0,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                lineHeight: 1.2,
                fontSize: { xs: "0.65rem", sm: "inherit" },
              }}
            >
              Entries
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.95rem", sm: "inherit" },
                lineHeight: 1.2,
              }}
            >
              {totalEntries}
            </Typography>
          </Paper>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1, sm: 1.5 },
              minWidth: 0,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                lineHeight: 1.2,
                fontSize: { xs: "0.65rem", sm: "inherit" },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Staff with commission
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "inline", sm: "none" } }}
              >
                Staff
              </Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.95rem", sm: "inherit" },
                lineHeight: 1.2,
              }}
            >
              {summary.length}
            </Typography>
          </Paper>
        </Box>
      </Paper>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: filtersOpen ? 0 : 2 }}>
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterCount}
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {canLoadStaffOptions ? (
            <TextField
              select
              fullWidth
              size="small"
              label="Staff"
              value={draftFilters.staff_id}
              onChange={(e) => updateDraftFilter("staff_id", e.target.value)}
              disabled={staffLoading}
            >
              <MenuItem value="">All staff</MenuItem>
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            select
            fullWidth
            size="small"
            label="Source"
            value={draftFilters.source_type}
            onChange={(e) => updateDraftFilter("source_type", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="manual">Manual</MenuItem>
            <MenuItem value="treatment">Treatment</MenuItem>
            <MenuItem value="package_purchase">Package purchase</MenuItem>
          </TextField>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.from_date}
            onChange={(e) => updateDraftFilter("from_date", e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.to_date}
            onChange={(e) => updateDraftFilter("to_date", e.target.value)}
          />
        </Box>
      </CollapsibleFiltersPanel>

      {!showFullEmptyState ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Totals by staff
            </Typography>
            <Chip
              size="small"
              label={`${summary.length} staff`}
              variant="outlined"
            />
          </Stack>
          {loading ? (
            <LoadingIndicator size={40} />
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {summary.map((row) => (
                <Paper
                  key={row.staff_id}
                  variant="outlined"
                  sx={{
                    px: 1.5,
                    borderRadius: 1.5,
                    py: 1,
                    minWidth: { xs: "100%", sm: 220 },
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {row.staff_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatMoney(row.total_commission)} - {row.entry_count}{" "}
                    entries
                  </Typography>
                </Paper>
              ))}
              {summary.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No data.
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      ) : null}

      {showFullEmptyState ? (
        <CommissionsEmptyState
          onCreateCommission={() => setManualOpen(true)}
          canCreate={canCreateManualCommission}
        />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Commission entries
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {rows.length} of {pagination.total} filtered records.
              </Typography>
            </Box>
            <Chip
              size="small"
              color={activeFilterCount > 0 ? "primary" : "default"}
              label={activeFilterCount > 0 ? "Filtered" : "All records"}
            />
          </Stack>
          {loading ? (
            <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
              <LoadingIndicator size={40} />
            </Box>
          ) : showFilteredEmptyState ? (
            <CommissionsFilteredEmptyState onClearFilters={clearFilters} />
          ) : (
            <>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Staff</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{formatDate(row.created_at)}</TableCell>
                          <TableCell>{row.staff?.name || "-"}</TableCell>
                          <TableCell>{row.patient?.name || "-"}</TableCell>
                          <TableCell>{sourceLabel(row.source_type)}</TableCell>
                          <TableCell>{row.reason || "-"}</TableCell>
                          <TableCell align="right">
                            {formatMoney(row.commission_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Stack
                spacing={1.5}
                sx={{ display: { xs: "flex", sm: "none" }, p: 2 }}
              >
                {rows.map((row) => (
                  <Paper key={row.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                        alignItems="flex-start"
                      >
                        <Box>
                          <Typography variant="subtitle2">
                            {row.staff?.name || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(row.created_at)} -{" "}
                            {sourceLabel(row.source_type)}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" color="primary">
                          {formatMoney(row.commission_amount)}
                        </Typography>
                      </Stack>
                      <Divider />
                      <Typography variant="body2">
                        Patient: {row.patient?.name || "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reason: {row.reason || "-"}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              {pagination.last_page > 1 && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  spacing={1}
                  sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Page {pagination.current_page} of {pagination.last_page}
                  </Typography>
                  <Pagination
                    count={pagination.last_page}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                  />
                </Stack>
              )}
            </>
          )}
        </Paper>
      )}

      <Dialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        fullWidth
        fullScreen={isMobile}
        maxWidth="sm"
      >
        <DialogTitle>Create Manual Commission</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Manual commission entries are saved as staff compensation lines
              for payroll.
            </Typography>
            <TextField
              select
              required
              size="small"
              label="Staff"
              value={manualForm.staffId}
              onChange={(e) => updateManualForm("staffId", e.target.value)}
              disabled={staffLoading}
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              size="small"
              type="number"
              label="Amount"
              value={manualForm.amount}
              inputProps={{ min: 0, step: 100 }}
              onChange={(e) => updateManualForm("amount", e.target.value)}
            />
            <TextField
              required
              size="small"
              type="date"
              label="Entry date"
              InputLabelProps={{ shrink: true }}
              value={manualForm.entryDate}
              onChange={(e) => updateManualForm("entryDate", e.target.value)}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                label="Source type"
                value={manualForm.sourceType}
                onChange={(e) => updateManualForm("sourceType", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Source reference"
                value={manualForm.sourceReference}
                onChange={(e) =>
                  updateManualForm("sourceReference", e.target.value)
                }
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              size="small"
              label="Note"
              value={manualForm.note}
              onChange={(e) => updateManualForm("note", e.target.value)}
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSubmitManual || savingManual}
            onClick={handleCreateManualCommission}
          >
            {savingManual ? "Saving..." : "Create Commission"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CommissionsEmptyState({ onCreateCommission, canCreate }) {
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
      <PercentOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No commission entries yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 480, mx: "auto", mb: 2 }}
      >
        This page tracks staff commissions from treatments, package sales, and
        manual adjustments. Totals roll into monthly payroll.
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
          <strong>Auto-generated:</strong> Commissions from completed treatments
          and package purchases appear here automatically.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Manual:</strong> HR can add one-off commission lines with{" "}
          <em>Create Commission</em> when needed.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payroll:</strong> Filter by staff and date, then include
          totals when generating <Link to="/hr/payroll">payroll</Link>.
        </Typography>
      </Stack>
      {canCreate ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="center"
          sx={{ mb: 1 }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateCommission}
          >
            Create commission
          </Button>
        </Stack>
      ) : null}
      <Typography variant="caption" color="text.secondary" display="block">
        {canCreate
          ? "Entries appear after treatments are completed or when you add a manual line."
          : "Commissions appear here after treatments are completed or HR adds manual entries."}
      </Typography>
    </Box>
  );
}

function CommissionsFilteredEmptyState({ onClearFilters }) {
  return (
    <Box sx={{ p: 2.5, bgcolor: "action.hover" }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        No records match these filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Try a different staff member, source, or date range, or clear filters to
        see all commission entries.
      </Typography>
      <Button size="small" variant="outlined" onClick={onClearFilters}>
        Clear filters
      </Button>
    </Box>
  );
}
