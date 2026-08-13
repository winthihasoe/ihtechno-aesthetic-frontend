import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Pagination,
  Select,
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
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ArrowOutwardOutlinedIcon from "@mui/icons-material/ArrowOutwardOutlined";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import dayjs from "dayjs";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { formatKyats } from "../../utils/formatKyats";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { resolveApiError } from "../../services/apiClient";
import {
  createOtherIncome,
  getOtherIncome,
  listChartOfAccounts,
  listOtherIncomes,
  updateOtherIncome,
  voidOtherIncome,
} from "../../services/financeService";
import { getTransactionMethods } from "../../services/transactionMethodService";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import { groupedTransactionMethodsForSelect } from "../../utils/financialLedgerKindUtils";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  financeHighlightCellSx,
  matchesOtherIncomeHighlight,
} from "../../utils/financeSourceNavigation";
import {
  getInvoicesListPath,
  getWorkspaceUrlPrefix,
} from "../../utils/workspaceRoutes";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

const PAYMENT_METHODS = ["cash", "transfer", "card", "e-wallet", "other"];

const emptyFilters = {
  reference_number: "",
  chart_query: "",
  payment_method: "",
  status: "",
};

const EMPTY_STEPS = [
  {
    icon: ArrowOutwardOutlinedIcon,
    title: "Record non-invoice income",
    body: "Use other income for grants, interest, asset sales, or misc receipts that are not patient invoices.",
  },
  {
    icon: AccountTreeOutlinedIcon,
    title: "Pick chart of accounts",
    body: "Choose the revenue account and payment method so the entry posts correctly to the ledger.",
  },
  {
    icon: PostAddOutlinedIcon,
    title: "Posts to finance",
    body: "Saved entries appear here by date and flow to transactions, cash movements, and reports.",
  },
];

function emptyForm() {
  return {
    income_date: dayjs().format("YYYY-MM-DD"),
    amount: "",
    chart_of_account_id: "",
    transaction_method_id: "",
    reference_number: "",
    description: "",
  };
}

function serializeIncomeForm(f) {
  const amt = parseCommaAmount(f.amount);
  return JSON.stringify({
    income_date: f.income_date,
    amount: Number.isFinite(amt) ? amt : null,
    chart_of_account_id: String(f.chart_of_account_id ?? ""),
    transaction_method_id: String(f.transaction_method_id ?? ""),
    reference_number: String(f.reference_number ?? "").trim(),
    description: String(f.description ?? "").trim(),
  });
}

function formFromRow(row) {
  return {
    income_date: row.income_date
      ? dayjs(row.income_date).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    amount:
      Number(row.amount) > 0
        ? formatCommaAmountFromNumber(Number(row.amount))
        : "",
    chart_of_account_id:
      row.chart_of_account_id != null ? String(row.chart_of_account_id) : "",
    transaction_method_id:
      row.transaction_method_id != null
        ? String(row.transaction_method_id)
        : "",
    reference_number: row.reference_number ?? "",
    description: row.description ?? "",
  };
}

function groupByDate(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = dayjs(row.income_date).format("YYYY-MM-DD");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function matchesFilter(row, filters) {
  if (
    filters.reference_number &&
    !String(row.reference_number || "")
      .toLowerCase()
      .includes(filters.reference_number.toLowerCase())
  ) {
    return false;
  }
  if (filters.payment_method && row.payment_method !== filters.payment_method) {
    return false;
  }
  if (filters.status && row.status !== filters.status) {
    return false;
  }
  if (
    filters.chart_query &&
    !`${row.chart_of_account?.code || ""} ${row.chart_of_account?.name || ""}`
      .toLowerCase()
      .includes(filters.chart_query.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function postingStatusLabel(row) {
  if (row?.status === "void") return "Void";
  if (row?.journal_posting_status === "posted") return "Posted";
  if (row?.journal_posting_status === "reversed") return "Reversed";
  return "Pending";
}

function postingStatusColor(row) {
  if (row?.status === "void") return "default";
  if (row?.journal_posting_status === "posted") return "success";
  if (row?.journal_posting_status === "reversed") return "warning";
  return "primary";
}

function otherIncomeCoaLabel(row) {
  const code = row.chart_of_account?.code;
  const name = row.chart_of_account?.name;
  if (code && name) return `${code} - ${name}`;
  if (name) return name;
  if (code) return code;
  return "—";
}

function otherIncomeMethodLabel(row) {
  if (!row.payment_method) return "—";
  return String(row.payment_method);
}

const OTHER_INCOME_COLUMN_FILTERS = [
  { key: "coa", getValue: (row) => otherIncomeCoaLabel(row) },
  { key: "method", getValue: (row) => otherIncomeMethodLabel(row) },
  { key: "status", getValue: (row) => postingStatusLabel(row) },
];

function isOtherIncomeEditable(row) {
  return row?.status !== "void" && row?.journal_posting_status !== "posted";
}

function canVoidOtherIncome(row) {
  return row?.status !== "void" && row?.journal_posting_status !== "posted";
}

export default function OtherIncomePage() {
  const theme = useTheme();
  const location = useLocation();
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const canView = hasPermission(user, "finance.other_income.view");
  const canManage = hasPermission(user, "finance.other_income.manage");
  const workspacePrefix = getWorkspaceUrlPrefix(user);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [voidRow, setVoidRow] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formBaseline, setFormBaseline] = useState(
    serializeIncomeForm(emptyForm()),
  );
  const [coaRows, setCoaRows] = useState([]);
  const [transactionMethods, setTransactionMethods] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOtherIncomes();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load other income."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const stripFilteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, filters)),
    [filters, rows],
  );

  const {
    filteredRows,
    columnOptions,
    columnSelections,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
    hasActiveColumnFilters,
  } = useTableColumnFilters(stripFilteredRows, {
    columns: OTHER_INCOME_COLUMN_FILTERS,
  });
  const PAGE_SIZE = 50;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);
  const grouped = useMemo(() => groupByDate(pagedRows), [pagedRows]);

  const periodTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [filteredRows],
  );

  useEffect(() => {
    if (!pendingHighlight || filteredRows.length === 0) return;
    const idx = filteredRows.findIndex((row) =>
      matchesOtherIncomeHighlight(row, pendingHighlight),
    );
    if (idx >= 0) {
      setPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }, [pendingHighlight, filteredRows]);

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      pagedRows.find((row) =>
        matchesOtherIncomeHighlight(row, pendingHighlight),
      ) ?? null
    );
  }, [pagedRows, pendingHighlight]);

  const { rowRef: highlightRowRef, highlightActive } = useFinanceRowHighlight({
    ready: !loading,
    found: Boolean(highlightMatch),
    onMissed: () => {
      pushToast({
        message:
          "That other income entry is not visible with the current filters.",
        severity: "info",
      });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [filters, columnSelections]);

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [accounts, methods] = await Promise.all([
          listChartOfAccounts({ type: "income", is_active: true }),
          getTransactionMethods().catch(() => []),
        ]);
        if (cancelled) return;
        const coaList = Array.isArray(accounts) ? accounts : [];
        const mList = Array.isArray(methods) ? methods : [];
        setCoaRows(coaList);
        setTransactionMethods(mList);
        setForm((prev) => {
          let next = { ...prev };
          if (!prev.chart_of_account_id) {
            const defaultRow =
              coaList.find((row) => row.code === "4100") ||
              coaList.find((row) => row.name?.toLowerCase() === "other income");
            if (defaultRow) {
              next = { ...next, chart_of_account_id: String(defaultRow.id) };
            }
          }
          if (!String(next.transaction_method_id || "").trim()) {
            const cash = mList.find(
              (x) => x.is_system && x.ledger_kind === "cash",
            );
            if (cash) {
              next = { ...next, transaction_method_id: String(cash.id) };
            }
          }
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(
              error,
              "Could not load income form options.",
            ),
            severity: "error",
          });
          setCoaRows([]);
          setTransactionMethods([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, pushToast]);

  const incomeFormDirty = useMemo(
    () => serializeIncomeForm(form) !== formBaseline,
    [form, formBaseline],
  );

  const openNew = () => {
    const blank = emptyForm();
    setEditingId(null);
    setForm(blank);
    setFormBaseline(serializeIncomeForm(blank));
    setDialogOpen(true);
  };

  const openEdit = async (row) => {
    try {
      const full = await getOtherIncome(row.id);
      const next = formFromRow(full);
      setEditingId(row.id);
      setForm(next);
      setFormBaseline(serializeIncomeForm(next));
      setDialogOpen(true);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load other income."),
        severity: "error",
      });
    }
  };

  const resetDialog = () => {
    const blank = emptyForm();
    setDialogOpen(false);
    setEditingId(null);
    setForm(blank);
    setFormBaseline(serializeIncomeForm(blank));
  };

  const attemptCloseDialog = async () => {
    if (saving) return;
    if (!incomeFormDirty) {
      resetDialog();
      return;
    }
    const ok = await askConfirm({
      title: editingId ? "Discard changes?" : "Discard income?",
      message: editingId
        ? "Close without saving your changes?"
        : "You have entered details that are not saved yet. Close without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (ok) {
      resetDialog();
    }
  };

  const submitIncome = async () => {
    const amt = parseCommaAmount(form.amount);
    if (
      !form.chart_of_account_id ||
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !form.income_date ||
      !String(form.transaction_method_id || "").trim()
    ) {
      pushToast({
        message:
          "Enter a valid date, income account, received-via method, and amount.",
        severity: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        income_date: form.income_date,
        amount: amt,
        chart_of_account_id: Number(form.chart_of_account_id),
        transaction_method_id: Number(form.transaction_method_id),
        reference_number: form.reference_number?.trim() || null,
        description: form.description?.trim() || null,
      };
      if (editingId) {
        await updateOtherIncome(editingId, payload);
        pushToast({ message: "Other income updated.", severity: "success" });
      } else {
        const idem = `oi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await createOtherIncome(payload, idem);
        pushToast({
          message: "Other income saved. Post it from Transactions when ready.",
          severity: "success",
        });
      }
      resetDialog();
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save other income."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitVoid = async () => {
    if (!voidRow) return;
    setVoiding(true);
    try {
      await voidOtherIncome(voidRow.id, { void_reason: voidReason || null });
      pushToast({ message: "Other income voided.", severity: "success" });
      setVoidRow(null);
      setVoidReason("");
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not void other income."),
        severity: "error",
      });
    } finally {
      setVoiding(false);
    }
  };

  if (!canView) {
    return (
      <Alert severity="warning">
        You do not have permission to view other income.
      </Alert>
    );
  }

  const hasActiveFilters = Boolean(
    filters.reference_number ||
      filters.chart_query ||
      filters.payment_method ||
      filters.status ||
      hasActiveColumnFilters,
  );
  const activeFilterCount = [
    filters.reference_number,
    filters.chart_query,
    filters.payment_method,
    filters.status,
  ].filter(Boolean).length;

  const applyFilters = () => {
    resetColumnFilters();
    setFilters(draftFilters);
  };

  const clearFilters = () => {
    resetColumnFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  const showGuidedEmpty = !loading && rows.length === 0 && !hasActiveFilters;

  return (
    <Box sx={{ maxWidth: 1280 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Other Income
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Track income not issued from invoices, grouped by recorded date.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
          />
          {canManage && rows.length > 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNew}
            >
              New Income
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
        applyLabel="Apply filters"
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          flexWrap="wrap"
        >
          <TextField
            label="Reference"
            size="small"
            value={draftFilters.reference_number}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                reference_number: event.target.value,
              }))
            }
            sx={{
              minWidth: { xs: 0, md: 180 },
              width: { xs: "100%", md: "auto" },
            }}
          />
          <TextField
            label="COA"
            size="small"
            value={draftFilters.chart_query}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                chart_query: event.target.value,
              }))
            }
            sx={{
              minWidth: { xs: 0, md: 220 },
              width: { xs: "100%", md: "auto" },
            }}
          />
          <TextField
            select
            label="Method"
            size="small"
            value={draftFilters.payment_method}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                payment_method: event.target.value,
              }))
            }
            sx={{
              minWidth: { xs: 0, md: 170 },
              width: { xs: "100%", md: "auto" },
            }}
          >
            <MenuItem value="">All</MenuItem>
            {PAYMENT_METHODS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                status: event.target.value,
              }))
            }
            sx={{
              minWidth: { xs: 0, md: 150 },
              width: { xs: "100%", md: "auto" },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="posted">Posted</MenuItem>
            <MenuItem value="void">Void</MenuItem>
          </TextField>
        </Stack>
      </CollapsibleFiltersPanel>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={ArrowOutwardOutlinedIcon}
          title="No other income entries yet"
          description="Record grants, interest, or other receipts that are not patient invoices. Each entry posts to the chart of accounts and appears in finance reports."
          steps={EMPTY_STEPS}
          primaryAction={
            canManage
              ? {
                  label: "New income",
                  onClick: openNew,
                  startIcon: <AddIcon />,
                }
              : null
          }
          footer={
            <>
              Patient billing lives under{" "}
              <Typography
                component={RouterLink}
                to={getInvoicesListPath(workspacePrefix)}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Billing & payables → Invoices
              </Typography>
              .
            </>
          }
        />
      ) : filteredRows.length === 0 ? (
        <Alert severity="info">No results match your filters.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference #</TableCell>
                <TableColumnFilterHeader
                  label="Chart of Account"
                  options={columnOptions.coa ?? []}
                  selectedValues={getColumnSelectionArray("coa")}
                  onApply={(values) => setColumnSelection("coa", values)}
                  onClear={() => clearColumnSelection("coa")}
                  cellSx={{ fontWeight: 700 }}
                />
                <TableColumnFilterHeader
                  label="Method"
                  options={columnOptions.method ?? []}
                  selectedValues={getColumnSelectionArray("method")}
                  onApply={(values) => setColumnSelection("method", values)}
                  onClear={() => clearColumnSelection("method")}
                  cellSx={{ fontWeight: 700, textTransform: "none" }}
                />
                <TableColumnFilterHeader
                  label="Status"
                  options={columnOptions.status ?? []}
                  selectedValues={getColumnSelectionArray("status")}
                  onApply={(values) => setColumnSelection("status", values)}
                  onClear={() => clearColumnSelection("status")}
                  cellSx={{ fontWeight: 700 }}
                />
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grouped.map(([dateKey, dateRows]) => {
                const sum = dateRows.reduce(
                  (total, row) => total + Number(row.amount || 0),
                  0,
                );
                return (
                  <Fragment key={dateKey}>
                    <TableRow
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        "& td": { borderBottomColor: "divider", py: 1 },
                      }}
                    >
                      <TableCell colSpan={6}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Typography fontWeight={700}>
                            {dayjs(dateKey).format("D MMM YYYY")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {dateRows.length} entr
                            {dateRows.length === 1 ? "y" : "ies"} •{" "}
                            {formatKyats(sum)}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {dateRows.map((row) => {
                      const isHighlightRow = matchesOtherIncomeHighlight(
                        row,
                        pendingHighlight,
                      );
                      const highlightReference =
                        isHighlightRow &&
                        highlightActive &&
                        pendingHighlight?.highlightColumn === "reference";
                      const highlightSourceId =
                        isHighlightRow &&
                        highlightActive &&
                        (pendingHighlight?.highlightColumn === "sourceId" ||
                          pendingHighlight?.highlightColumn === "row");

                      return (
                        <TableRow
                          key={row.id}
                          hover
                          ref={isHighlightRow ? highlightRowRef : undefined}
                        >
                          <TableCell
                            sx={financeHighlightCellSx(
                              highlightSourceId || highlightReference,
                            )}
                          >
                            {highlightSourceId ? (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  display: "block",
                                  fontVariantNumeric: "tabular-nums",
                                  fontWeight: 700,
                                  color: "info.main",
                                }}
                              >
                                ID #{row.id}
                              </Typography>
                            ) : null}
                            {row.reference_number || "-"}
                          </TableCell>
                          <TableCell>{otherIncomeCoaLabel(row)}</TableCell>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {otherIncomeMethodLabel(row)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={postingStatusColor(row)}
                              label={postingStatusLabel(row)}
                              variant={
                                row.status !== "void" &&
                                row.journal_posting_status === "posted"
                                  ? "filled"
                                  : "outlined"
                              }
                              sx={{ fontWeight: 700, height: 24 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.amount)}
                          </TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              justifyContent="flex-end"
                              spacing={1}
                            >
                              {canManage && row.status !== "void" && (
                                <>
                                  <Button
                                    size="small"
                                    startIcon={<EditIcon />}
                                    disabled={!isOtherIncomeEditable(row)}
                                    onClick={() => void openEdit(row)}
                                  >
                                    Edit
                                  </Button>
                                  {canVoidOtherIncome(row) ? (
                                    <Button
                                      size="small"
                                      color="warning"
                                      startIcon={<BlockIcon />}
                                      onClick={() => setVoidRow(row)}
                                    >
                                      Void
                                    </Button>
                                  ) : null}
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
              {filteredRows.length > 0 ? (
                <TableRow
                  sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}
                >
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: 800 }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {formatKyats(periodTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && filteredRows.length > PAGE_SIZE && (
        <Stack direction="row" justifyContent="center" mt={2}>
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Stack>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (saving) return;
          void attemptCloseDialog();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? "Edit Income" : "New Income"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Record non-invoice income like bank interest, referral fee, or
              commission fee.
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Income Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.income_date}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    income_date: event.target.value,
                  }))
                }
              />
              <TextField
                label="Amount"
                size="small"
                fullWidth
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: sanitizeCommaAmountInput(event.target.value),
                  }))
                }
                inputProps={{ inputMode: "decimal" }}
                placeholder="e.g. 100,000"
              />
            </Stack>

            <ChartOfAccountPicker
              accounts={coaRows}
              value={form.chart_of_account_id}
              onChange={(id) =>
                setForm((prev) => ({ ...prev, chart_of_account_id: id }))
              }
              onAccountsChange={setCoaRows}
              listParams={{ type: "income", is_active: true }}
              dialogDefaultType="income"
              label="Chart of Account"
              required
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel id="other-income-received-via">
                Received via
              </InputLabel>
              <Select
                labelId="other-income-received-via"
                label="Received via"
                value={form.transaction_method_id || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    transaction_method_id:
                      event.target.value === ""
                        ? ""
                        : String(event.target.value),
                  }))
                }
              >
                {groupedTransactionMethodsForSelect(
                  transactionMethods.filter((m) => m.status === "active"),
                ).flatMap((group) => [
                  <ListSubheader
                    key={`oi-tm-${group.kind}`}
                    sx={{ fontWeight: 700 }}
                  >
                    {group.label}
                  </ListSubheader>,
                  ...group.methods.map((m) => {
                    const sub = [m.bank_name, m.account_or_phone]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <MenuItem key={m.id} value={String(m.id)}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            py: 0.25,
                          }}
                        >
                          <Typography variant="body2">{m.name}</Typography>
                          {sub ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {sub}
                            </Typography>
                          ) : null}
                        </Box>
                      </MenuItem>
                    );
                  }),
                ])}
              </Select>
            </FormControl>

            <TextField
              label="Reference Number"
              size="small"
              fullWidth
              value={form.reference_number}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  reference_number: event.target.value,
                }))
              }
            />

            <TextField
              label="Description"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => void attemptCloseDialog()} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void submitIncome()}
            disabled={saving}
          >
            {saving ? (
              <LoadingIndicator size={22} />
            ) : editingId ? (
              "Save Changes"
            ) : (
              "Create Income"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(voidRow)}
        onClose={() => setVoidRow(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Void Other Income</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            This keeps the record but marks it void and creates reversing
            finance entries.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidRow(null)} disabled={voiding}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitVoid}
            disabled={voiding}
          >
            Confirm Void
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
