import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddIcon from "@mui/icons-material/Add";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import PackageImportDialog from "./components/PackageImportDialog";
import PackageManualImportDialog from "./components/PackageManualImportDialog";
import { hasPermission } from "../../utils/accessUtils";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import {
  downloadCustomerPackageListPdf,
  getCustomerPackageList,
  getPackages,
  getPatientPackageUsages,
} from "../../services/packageService";
import { formatKyats } from "../../utils/formatKyats";
import {
  getPatientDetailPath,
  getWorkspaceUrlPrefix,
} from "../../utils/workspaceRoutes";

const TERMINAL = new Set(["traded_in", "cancelled", "refunded"]);
const NEAR_EXPIRED_DAYS = 30;
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "depleted", label: "Depleted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "traded_in", label: "Traded-in" },
  { value: "frozen", label: "Frozen" },
];

const emptyFilters = {
  search: "",
  statuses: [],
  purchasedFrom: "",
  purchasedTo: "",
  packageId: null,
  hasBalanceDue: false,
};

const EMPTY_STEPS = [
  {
    icon: ShoppingCartOutlinedIcon,
    title: "Sell or assign a bundle",
    body: "Record a package sale at reception, or import an opening balance for a patient who already paid elsewhere.",
  },
  {
    icon: UploadFileIcon,
    title: "Bulk Excel import",
    body: "Use Excel import when migrating many historical assignments with remaining sessions and optional usage history.",
  },
  {
    icon: CardGiftcardOutlinedIcon,
    title: "Track sessions here",
    body: "Each row shows remaining sessions, expiry, payment balance, and status — click a row for usage history.",
  },
];

function expiryHint(expiryDate, terminal) {
  if (terminal || !expiryDate) return null;
  const d = dayjs(expiryDate);
  const days = d.diff(dayjs(), "day");
  if (days < 0)
    return { text: `Expired ${d.format("DD-MM-YYYY")}`, color: "error.main" };
  if (days <= NEAR_EXPIRED_DAYS) {
    return {
      text: `Expires in ${days} day${days === 1 ? "" : "s"}`,
      color: "warning.main",
    };
  }
  return { text: `Expires ${d.format("DD-MM-YYYY")}`, color: "text.secondary" };
}

function paymentChipLabel(status) {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildListParams({ filters, sort, direction, page, rowsPerPage }) {
  const params = {
    page: page + 1,
    per_page: rowsPerPage,
    sort,
    direction,
  };
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.statuses.length) params.status = filters.statuses;
  if (filters.purchasedFrom) params.purchased_from = filters.purchasedFrom;
  if (filters.purchasedTo) params.purchased_to = filters.purchasedTo;
  if (filters.packageId) params.package_id = filters.packageId;
  if (filters.hasBalanceDue) params.has_balance_due = 1;
  return params;
}

export default function CustomerPackageListPage() {
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    per_page: 25,
    last_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [sort, setSort] = useState("purchased_at");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedRow, setSelectedRow] = useState(null);
  const [usageRows, setUsageRows] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manualImportOpen, setManualImportOpen] = useState(false);

  const canImportPackages = hasPermission(user, "packages.import");

  useEffect(() => {
    getPackages()
      .then((data) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setDraftFilters((prev) => ({ ...prev, search: debouncedSearch }));
    setAppliedFilters((prev) => ({ ...prev, search: debouncedSearch }));
    setPage(0);
  }, [debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.statuses.length) count += 1;
    if (appliedFilters.purchasedFrom || appliedFilters.purchasedTo) count += 1;
    if (appliedFilters.packageId) count += 1;
    if (appliedFilters.hasBalanceDue) count += 1;
    return count;
  }, [appliedFilters]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildListParams({
        filters: appliedFilters,
        sort,
        direction,
        page,
        rowsPerPage,
      });
      const data = await getCustomerPackageList(params);
      setRows(Array.isArray(data?.data) ? data.data : []);
      setMeta(
        data?.meta ?? {
          total: 0,
          current_page: 1,
          per_page: rowsPerPage,
          last_page: 1,
        },
      );
    } catch (err) {
      pushToast({ severity: "error", message: resolveApiError(err) });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, sort, direction, page, rowsPerPage, pushToast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedRow?.id) {
      setUsageRows([]);
      return;
    }
    setUsageLoading(true);
    getPatientPackageUsages(selectedRow.id)
      .then((data) => setUsageRows(Array.isArray(data) ? data : []))
      .catch(() => setUsageRows([]))
      .finally(() => setUsageLoading(false));
  }, [selectedRow]);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters, search: debouncedSearch });
    setPage(0);
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(0);
  };

  const handleSort = (column) => {
    if (sort === column) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setDirection(column === "expiry_date" ? "asc" : "desc");
    }
    setPage(0);
  };

  const handleNearExpiredSort = () => {
    setSort("expiry_date");
    setDirection("asc");
    setPage(0);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const params = buildListParams({
        filters: appliedFilters,
        sort,
        direction,
        page: 0,
        rowsPerPage,
      });
      delete params.page;
      delete params.per_page;
      const { truncated } = await downloadCustomerPackageListPdf(params);
      if (truncated) {
        pushToast({
          severity: "warning",
          message:
            "Export limited to 5,000 rows. Narrow filters to export the full list.",
        });
      } else {
        pushToast({ severity: "success", message: "PDF downloaded." });
      }
    } catch (err) {
      pushToast({ severity: "error", message: resolveApiError(err) });
    } finally {
      setExporting(false);
    }
  };

  const selectedCatalog =
    catalog.find((pkg) => pkg.id === draftFilters.packageId) ?? null;

  const hasSearchQuery = Boolean(debouncedSearch.trim());
  const hasActiveFilters = activeFilterCount > 0;
  const totalCount = meta.total ?? 0;
  const showGuidedEmpty =
    !loading && totalCount === 0 && !hasActiveFilters && !hasSearchQuery;
  const showFilteredEmpty =
    !loading && totalCount === 0 && (hasActiveFilters || hasSearchQuery);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Customer Package List
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            {showGuidedEmpty
              ? "Sold and imported patient packages with remaining sessions, expiry, and payment status."
              : `${totalCount} package${totalCount === 1 ? "" : "s"}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
          />
          {!showGuidedEmpty ? (
            <>
          <Button
            variant="outlined"
            onClick={handleNearExpiredSort}
            disabled={sort === "expiry_date" && direction === "asc"}
          >
            Near expired
          </Button>
          {canImportPackages ? (
            <>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => setImportOpen(true)}
              >
                Excel import
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setManualImportOpen(true)}
              >
                Import for patient
              </Button>
            </>
          ) : null}
          <Button
            variant="contained"
            startIcon={exporting ? null : <PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={exporting || loading}
          >
            {exporting ? <LoadingIndicator size={22} /> : "Print PDF"}
          </Button>
            </>
          ) : null}
        </Stack>
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <TextField
              size="small"
              label="Patient search"
              placeholder="Name, client ID, or phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                type="date"
                label="Purchased from"
                InputLabelProps={{ shrink: true }}
                value={draftFilters.purchasedFrom}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    purchasedFrom: e.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                size="small"
                type="date"
                label="Purchased to"
                InputLabelProps={{ shrink: true }}
                value={draftFilters.purchasedTo}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    purchasedTo: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <Autocomplete
              size="small"
              options={catalog}
              value={selectedCatalog}
              onChange={(_, value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  packageId: value?.id ?? null,
                }))
              }
              getOptionLabel={(option) => option.name ?? ""}
              renderInput={(params) => (
                <TextField {...params} label="Catalog package" />
              )}
            />
            <Autocomplete
              multiple
              size="small"
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.filter((opt) =>
                draftFilters.statuses.includes(opt.value),
              )}
              onChange={(_, values) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  statuses: values.map((v) => v.value),
                }))
              }
              getOptionLabel={(option) => option.label}
              renderInput={(params) => (
                <TextField {...params} label="Package status" />
              )}
            />
        <FormControlLabel
          control={
            <Checkbox
              checked={draftFilters.hasBalanceDue}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  hasBalanceDue: e.target.checked,
                }))
              }
            />
          }
          label="Has balance due"
        />
      </CollapsibleFiltersPanel>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={CardGiftcardOutlinedIcon}
          title="No customer packages yet"
          description="This register lists packages sold or imported for patients. Assign a bundle from the catalog, import opening balances, or record a sale to start tracking remaining sessions and expiry."
          primaryAction={
            canImportPackages
              ? {
                  label: "Import for patient",
                  onClick: () => setManualImportOpen(true),
                  startIcon: <PersonAddOutlinedIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer={
            <>
              Catalog bundles are managed under{" "}
              <Typography
                component={RouterLink}
                to={`${workspacePrefix}/packages`}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Treatment packages
              </Typography>
              .
            </>
          }
        />
      ) : (
        <>
      <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sortDirection={sort === "patient_name" ? direction : false}
                  >
                    <TableSortLabel
                      active={sort === "patient_name"}
                      direction={sort === "patient_name" ? direction : "asc"}
                      onClick={() => handleSort("patient_name")}
                    >
                      Patient
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Package</TableCell>
                  <TableCell align="right">Remaining sessions</TableCell>
                  <TableCell
                    sortDirection={sort === "purchased_at" ? direction : false}
                  >
                    <TableSortLabel
                      active={sort === "purchased_at"}
                      direction={sort === "purchased_at" ? direction : "asc"}
                      onClick={() => handleSort("purchased_at")}
                    >
                      Purchased
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell
                    sortDirection={sort === "expiry_date" ? direction : false}
                  >
                    <TableSortLabel
                      active={sort === "expiry_date"}
                      direction={sort === "expiry_date" ? direction : "asc"}
                      onClick={() => handleSort("expiry_date")}
                    >
                      Expiry date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Payment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showFilteredEmpty ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 4, color: "text.secondary" }}
                    >
                      No customer packages match your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const terminal = TERMINAL.has(row.status);
                    const frozen = Boolean(row.frozen_at);
                    const hint = expiryHint(row.expiry_date, terminal);
                    const balanceDue = Number(row.balance_due ?? 0);

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: "pointer", opacity: terminal ? 0.72 : 1 }}
                        onClick={() => setSelectedRow(row)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.patient?.name ?? "—"}
                          </Typography>
                          {row.patient?.client_id ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.patient.client_id}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>{row.package?.name ?? "—"}</TableCell>
                        <TableCell align="right">
                          {row.remaining_sessions_total ?? 0}
                        </TableCell>
                        <TableCell>
                          {row.purchased_at
                            ? dayjs(row.purchased_at).format("DD-MM-YYYY")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              size="small"
                              label={row.status}
                              sx={{ textTransform: "capitalize" }}
                            />
                            {frozen ? (
                              <Chip
                                size="small"
                                color="warning"
                                label="Frozen"
                              />
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {row.expiry_date
                              ? dayjs(row.expiry_date).format("DD-MM-YYYY")
                              : "—"}
                          </Typography>
                          {hint ? (
                            <Typography
                              variant="caption"
                              sx={{ color: hint.color, display: "block" }}
                            >
                              {hint.text}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {balanceDue > 0 ? (
                            <Stack spacing={0.5}>
                              <Typography variant="body2">
                                Bal. {formatKyats(balanceDue)}
                              </Typography>
                              <Chip
                                size="small"
                                label={paymentChipLabel(row.payment_status)}
                                color={
                                  row.payment_status === "unpaid"
                                    ? "error"
                                    : "warning"
                                }
                              />
                            </Stack>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
      </Paper>

      <TablePagination
        component="div"
        count={meta.total ?? 0}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />
        </>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
      >
        {selectedRow ? (
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box>
                <Typography variant="h6">
                  {selectedRow.patient?.name ?? "Patient"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRow.package?.name ?? "Package"}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setSelectedRow(null)}
                aria-label="Close drawer"
              >
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              sx={{ mt: 1 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                size="small"
                label={selectedRow.status}
                sx={{ textTransform: "capitalize" }}
              />
              {selectedRow.frozen_at ? (
                <Chip size="small" color="warning" label="Frozen" />
              ) : null}
            </Stack>

            <Typography variant="body2" sx={{ mt: 2 }}>
              Purchased:{" "}
              {selectedRow.purchased_at
                ? dayjs(selectedRow.purchased_at).format("DD-MM-YYYY HH:mm")
                : "—"}
            </Typography>
            <Typography variant="body2">
              Expiry:{" "}
              {selectedRow.expiry_date
                ? dayjs(selectedRow.expiry_date).format("DD-MM-YYYY")
                : "—"}
            </Typography>
            <Typography variant="body2">
              Payment:{" "}
              {Number(selectedRow.balance_due ?? 0) > 0
                ? `Bal. ${formatKyats(selectedRow.balance_due)} (${paymentChipLabel(selectedRow.payment_status)})`
                : "Paid"}
            </Typography>
            {selectedRow.sold_by?.name ? (
              <Typography variant="body2">
                Sold by: {selectedRow.sold_by.name}
              </Typography>
            ) : null}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Session breakdown
            </Typography>
            <Stack spacing={1}>
              {(selectedRow.items ?? []).map((item) => (
                <Typography key={item.id} variant="body2">
                  {item.treatment_template?.name ?? "Treatment"} —{" "}
                  {item.remaining_sessions} remaining
                </Typography>
              ))}
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Usage history
            </Typography>
            {usageLoading ? (
              <LoadingIndicator size={28} />
            ) : usageRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No usage recorded yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {usageRows.slice(0, 10).map((usage) => (
                  <Typography key={usage.id} variant="body2">
                    {usage.used_at
                      ? dayjs(usage.used_at).format("DD-MM-YYYY HH:mm")
                      : "—"}{" "}
                    · {usage.used_sessions} session(s) ·{" "}
                    {usage.treatment_template?.name ||
                      usage.treatment?.name ||
                      "Treatment"}
                  </Typography>
                ))}
              </Stack>
            )}

            {selectedRow.patient?.id ? (
              <Link
                component={RouterLink}
                to={getPatientDetailPath(
                  workspacePrefix,
                  selectedRow.patient.id,
                )}
                sx={{ display: "inline-block", mt: 2 }}
              >
                View in patient profile (Packages tab)
              </Link>
            ) : null}
          </Box>
        ) : null}
      </Drawer>

      <PackageImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadList}
      />

      <PackageManualImportDialog
        open={manualImportOpen}
        onClose={() => setManualImportOpen(false)}
        onImported={loadList}
      />
    </Box>
  );
}
