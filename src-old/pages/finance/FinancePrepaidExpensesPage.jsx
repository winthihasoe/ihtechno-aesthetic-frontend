import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../../components/common/TableColumnFilterHeader";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import dayjs from "dayjs";
import {
  batchPostPrepaidAmortization,
  getPrepaidExpenses,
  postPrepaidAmortization,
  suggestPrepaidCode,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import PrepaidExpenseDetailPanel from "../../components/finance/PrepaidExpenseDetailPanel";
import RecordPrepaidExpenseDialog from "../../components/finance/RecordPrepaidExpenseDialog";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePeriodToolbar,
  currentMonthKey,
  formatMonthLabel,
  monthRangeLabel,
  useFinanceTokens,
} from "../../components/finance";
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";
import {
  amortizationListSummary,
  formatPeriod,
  periodFromMonthKey,
  summarizeRegisterAmortization,
} from "../../utils/prepaidAmortizationUtils";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

const PREPAID_COLUMNS = 7;

function prepaidTypeLabel(row) {
  return row.type?.name ?? "Prepaid";
}

function prepaidReferenceLabel(row) {
  return row.reference_number || row.prepaid_code || "—";
}

function prepaidPartyLabel(row) {
  return row.vendor_name ?? "—";
}

const PREPAID_COLUMN_FILTERS = [
  { key: "type", getValue: (row) => prepaidTypeLabel(row) },
  { key: "reference", getValue: (row) => prepaidReferenceLabel(row) },
  { key: "party", getValue: (row) => prepaidPartyLabel(row) },
];

const emptyFilters = {
  status: "",
  query: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "fully_amortized", label: "Fully amortized" },
  { value: "payment_pending", label: "Payment pending" },
];

const EMPTY_STEPS = [
  {
    icon: PaymentsOutlinedIcon,
    title: "Record a prepaid payment",
    body: "Use Record prepaid expense when cash leaves for insurance, rent, or subscriptions.",
  },
  {
    icon: EventNoteOutlinedIcon,
    title: "Post the payment",
    body: "Cash payments appear on Transactions as pending until you post Dr Prepaid / Cr Cash.",
  },
  {
    icon: TrendingDownOutlinedIcon,
    title: "Run monthly amortization",
    body: "Each period, post Dr Expense / Cr Prepaid so the P&L reflects the consumed portion.",
  },
];

function formatHumanDate(value, fallback) {
  const raw = value ?? fallback;
  if (!raw) return "—";
  const d = dayjs(raw);
  return d.isValid() ? d.format("DD-MM-YYYY HH:mm") : raw;
}

function amortizationStatusLabel(summary) {
  if (summary.selectedPosted) return "Posted";
  if (summary.selectedDue) return "Due";
  if (summary.status === "behind") return "Behind";
  return "Current";
}

function amortizationStatusColor(summary) {
  if (summary.selectedPosted) return "success";
  if (summary.selectedDue || summary.status === "behind") return "warning";
  return "default";
}

function paymentStatusLabel(row) {
  if (row.is_opening_balance) return "Opening balance";
  if (row.journal_posting_status === "posted") return "Payment posted";
  return "Payment pending";
}

function paymentStatusColor(row) {
  if (row.is_opening_balance) return "info";
  if (row.journal_posting_status === "posted") return "success";
  return "warning";
}

function matchesFilters(row, filters) {
  if (filters.status === "active" && row.status !== "active") return false;
  if (
    filters.status === "fully_amortized" &&
    row.status !== "fully_amortized"
  ) {
    return false;
  }
  if (
    filters.status === "payment_pending" &&
    (row.is_opening_balance || row.journal_posting_status === "posted")
  ) {
    return false;
  }

  const q = String(filters.query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;

  return [
    row.prepaid_code,
    row.vendor_name,
    row.reference_number,
    row.type?.name,
    row.description,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export default function FinancePrepaidExpensesPage() {
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const {
    financeFilterStripSx,
    financeTableWrapSx,
    financeTableContainerSx,
    compactTableSx,
    compactFieldSx,
  } = useFinanceTokens();
  const canManage = hasPermission(user, "payments.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingWindowOpen, setOpeningWindowOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [postingMonth, setPostingMonth] = useState(currentMonthKey());
  const [batchPosting, setBatchPosting] = useState(false);
  const [rowPostingId, setRowPostingId] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [prepaidDialogOpen, setPrepaidDialogOpen] = useState(false);
  const [prepaidDialogMode, setPrepaidDialogMode] = useState("cash_payment");

  const openPrepaidDialog = useCallback((mode = "cash_payment") => {
    setPrepaidDialogMode(mode);
    setPrepaidDialogOpen(true);
  }, []);

  const postingPeriod = useMemo(
    () => periodFromMonthKey(postingMonth),
    [postingMonth],
  );

  const stripFilteredRows = useMemo(
    () => rows.filter((row) => matchesFilters(row, filters)),
    [rows, filters],
  );

  const {
    filteredRows,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
    hasActiveColumnFilters,
  } = useTableColumnFilters(stripFilteredRows, { columns: PREPAID_COLUMN_FILTERS });

  const hasActiveFilters = Boolean(
    filters.status || filters.query.trim() || hasActiveColumnFilters,
  );

  const registerStats = useMemo(
    () =>
      summarizeRegisterAmortization(
        filteredRows,
        postingPeriod.period_year,
        postingPeriod.period_month,
      ),
    [filteredRows, postingPeriod.period_year, postingPeriod.period_month],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrepaidExpenses();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not load prepaid expenses."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    suggestPrepaidCode()
      .then((hint) =>
        setOpeningWindowOpen(Boolean(hint?.opening_balance_window_open)),
      )
      .catch(() => {});
  }, []);

  const applyFilters = () => {
    resetColumnFilters();
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    resetColumnFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  const runBatchAmortization = async (catchUp) => {
    setBatchPosting(true);
    try {
      const result = await batchPostPrepaidAmortization({
        period_year: postingPeriod.period_year,
        period_month: postingPeriod.period_month,
        catch_up: catchUp,
      });
      pushToast({
        message: catchUp
          ? `Catch-up posted ${result.periods_created} period(s).`
          : `Posted amortization for ${formatMonthLabel(postingMonth)} on ${result.periods_created} prepaid(s).`,
        severity: result.periods_created > 0 ? "success" : "info",
      });
      await load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Batch amortization failed."),
        severity: "error",
      });
    } finally {
      setBatchPosting(false);
    }
  };

  const postForPrepaid = async (prepaid, catchUp = false) => {
    setRowPostingId(prepaid.id);
    try {
      const result = await postPrepaidAmortization(prepaid.id, {
        period_year: postingPeriod.period_year,
        period_month: postingPeriod.period_month,
        catch_up: catchUp,
      });
      pushToast({
        message: catchUp
          ? `Catch-up posted ${result.created_count ?? result.posted_periods?.length ?? 0} period(s).`
          : result.created === false
            ? "That period was already posted."
            : "Amortization posted.",
        severity: "success",
      });
      await load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not post amortization."),
        severity: "error",
      });
    } finally {
      setRowPostingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const showGuidedEmpty = !loading && rows.length === 0;

  return (
    <>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Prepaid expenses"
            subtitle="Prepaid insurance, rent, and subscriptions. Post cash payments from Transactions. Amortization for the current month auto-posts on the 1st; use the buttons below for manual or catch-up runs."
          />
        </FinancePanelHeader>

        {!canManage ? (
          <Alert severity="info" sx={{ mx: 2, mt: 2, mb: 0 }}>
            View-only access. Ask an administrator for{" "}
            <strong>payments.manage</strong> to record or amortize prepaid
            expenses.
          </Alert>
        ) : null}

        {openingWindowOpen ? (
          <Alert severity="info" sx={{ mx: 2, mt: 2, mb: 0 }}>
            Opening-balance migration window is open.{" "}
            {canManage ? (
              <>
                Use{" "}
                <Typography
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => openPrepaidDialog("opening_balance")}
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    border: 0,
                    bgcolor: "transparent",
                    p: 0,
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  Record prepaid expense
                </Typography>{" "}
                and choose Migrate opening balance.
              </>
            ) : (
              "Ask staff with payments.manage to record migrated balances."
            )}
          </Alert>
        ) : null}

        <FinancePeriodToolbar
          embedded
          month={postingMonth}
          onMonthChange={setPostingMonth}
          periodLabel={formatMonthLabel(postingMonth)}
          periodSubLabel={monthRangeLabel(postingMonth)}
          stats={[
            {
              label: "Posted",
              value: registerStats.postedForMonth,
              accent: "success.main",
            },
            {
              label: "Due",
              value: registerStats.duePrepaids,
              accent: "warning.main",
            },
            {
              label: "Behind",
              value: registerStats.behindPrepaids,
              accent: "error.main",
            },
            {
              label: "Missing runs",
              value: registerStats.totalDuePeriods,
            },
            { label: "Register", value: filteredRows.length },
          ]}
        />

        {canManage ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={0.75}
            flexWrap="wrap"
            sx={{ px: { xs: 2, sm: 3 }, py: 1 }}
          >
            <Button
              variant="contained"
              size="small"
              disabled={batchPosting || loading}
              onClick={() => void runBatchAmortization(false)}
            >
              Post all for {formatMonthLabel(postingMonth)}
            </Button>
            {/* <Button
              variant="outlined"
              size="small"
              disabled={batchPosting || loading}
              onClick={() => void runBatchAmortization(true)}
            >
              Catch up all through {formatMonthLabel(postingMonth)}
            </Button> */}
          </Stack>
        ) : null}

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ md: "flex-end" }}
          sx={{
            ...financeFilterStripSx,
            borderTop: 0,
          }}
        >
          <TextField
            select
            label="Status"
            size="small"
            value={draftFilters.status}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, status: e.target.value }))
            }
            sx={{ minWidth: 180, ...compactFieldSx }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Search"
            size="small"
            value={draftFilters.query}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, query: e.target.value }))
            }
            placeholder="Code, vendor, reference, type"
            sx={{ flex: 1, minWidth: 200, ...compactFieldSx }}
          />
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Button variant="contained" size="small" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="outlined" size="small" onClick={clearFilters}>
              Clear
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
            {canManage ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openPrepaidDialog()}
              >
                Record prepaid
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box sx={financeTableWrapSx}>
          {showGuidedEmpty ? (
            <GuidedEmptyState
              icon={EventNoteOutlinedIcon}
              title="No prepaid expenses yet"
              description="Record insurance premiums, rent paid in advance, or software subscriptions. Cash payments queue on Transactions; opening balances post immediately against equity."
              steps={EMPTY_STEPS}
              primaryAction={
                canManage
                  ? {
                      label: "Record prepaid expense",
                      onClick: () => openPrepaidDialog(),
                      startIcon: <AddIcon />,
                    }
                  : null
              }
            />
          ) : (
            <TableContainer sx={financeTableContainerSx}>
              <Table size="small" sx={compactTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 36 }} />
                    <TableCell>Date</TableCell>
                    <TableColumnFilterHeader
                      label="Type"
                      options={columnOptions.type ?? []}
                      selectedValues={getColumnSelectionArray("type")}
                      onApply={(values) => setColumnSelection("type", values)}
                      onClear={() => clearColumnSelection("type")}
                    />
                    <TableColumnFilterHeader
                      label="Reference"
                      options={columnOptions.reference ?? []}
                      selectedValues={getColumnSelectionArray("reference")}
                      onApply={(values) => setColumnSelection("reference", values)}
                      onClear={() => clearColumnSelection("reference")}
                    />
                    <TableColumnFilterHeader
                      label="Party"
                      options={columnOptions.party ?? []}
                      selectedValues={getColumnSelectionArray("party")}
                      onApply={(values) => setColumnSelection("party", values)}
                      onClear={() => clearColumnSelection("party")}
                    />
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={PREPAID_COLUMNS + 1}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <LoadingIndicator size={80} />
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={PREPAID_COLUMNS + 1}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          {hasActiveFilters
                            ? "No results match your filters."
                            : "No prepaid expenses in the register."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const isExpanded = expandedId === row.id;
                      const summary = amortizationListSummary(
                        row,
                        postingPeriod.period_year,
                        postingPeriod.period_month,
                      );
                      const canPostRow =
                        canManage &&
                        summary.selectedDue &&
                        !summary.selectedPosted &&
                        row.status === "active";

                      return (
                        <Fragment key={row.id}>
                          <TableRow
                            hover
                            onClick={() => toggleExpand(row.id)}
                            sx={{
                              cursor: "pointer",
                              "& .MuiTableCell-root": {
                                ...(isExpanded
                                  ? { borderBottom: 0 }
                                  : undefined),
                              },
                            }}
                          >
                            <TableCell sx={{ width: 36, px: 0.5 }}>
                              <IconButton
                                size="small"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(row.id);
                                }}
                                sx={{
                                  transform: isExpanded
                                    ? "rotate(90deg)"
                                    : "none",
                                  transition: "transform 0.15s",
                                }}
                              >
                                <ChevronRightIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              {formatHumanDate(
                                row.payment_date,
                                row.created_at,
                              )}
                            </TableCell>
                            <TableCell>
                              {prepaidTypeLabel(row)}
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  display: "block",
                                  color: "text.secondary",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                ID #{row.id}
                              </Typography>
                            </TableCell>
                            <TableCell>{prepaidReferenceLabel(row)}</TableCell>
                            <TableCell>{prepaidPartyLabel(row)}</TableCell>
                            <TableCell align="right">
                              {formatKyats(row.remaining_balance)}
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5} alignItems="flex-start">
                                <Chip
                                  size="small"
                                  label={amortizationStatusLabel(summary)}
                                  color={amortizationStatusColor(summary)}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={paymentStatusLabel(row)}
                                  color={paymentStatusColor(row)}
                                  variant="outlined"
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {isExpanded ? (
                            <TableRow>
                              <TableCell
                                colSpan={PREPAID_COLUMNS + 1}
                                sx={{ py: 0, px: 1, borderBottom: 0 }}
                              >
                                <Box
                                  sx={{
                                    p: 2,
                                    mb: 0.25,
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PrepaidExpenseDetailPanel
                                    prepaid={row}
                                    postingPeriod={postingPeriod}
                                    rolePrefix={rolePrefix}
                                    canManage={canManage}
                                    posting={rowPostingId === row.id}
                                    onPostPeriod={(p) =>
                                      postForPrepaid(p, false)
                                    }
                                    onPostCatchUp={(p) =>
                                      postForPrepaid(p, true)
                                    }
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </FinancePanel>

      <RecordPrepaidExpenseDialog
        open={prepaidDialogOpen}
        mode={prepaidDialogMode}
        onClose={() => setPrepaidDialogOpen(false)}
        onSuccess={load}
      />
    </>
  );
}
