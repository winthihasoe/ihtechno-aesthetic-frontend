import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../../components/common/TableColumnFilterHeader";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import {
  listExpenses,
  getPrepaidExpenses,
  createExpense,
  updateExpense,
  listChartOfAccounts,
} from "../../services/financeService";
import { getTransactionMethods } from "../../services/transactionMethodService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import RecordPrepaidExpenseDialog from "../../components/finance/RecordPrepaidExpenseDialog";
import { FinanceRowActions, FinanceGuidePanel } from "../../components/finance";
import { groupedTransactionMethodsForSelect } from "../../utils/financialLedgerKindUtils";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  financeHighlightCellSx,
  matchesExpenseHighlight,
  rolePrefixFromPathname,
} from "../../utils/financeSourceNavigation";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

const EMPTY_STEPS = [
  {
    icon: PostAddOutlinedIcon,
    title: "Record an expense",
    body: "Enter date, category, amount, and payment method for rent, utilities, supplies, and other operating costs.",
  },
  {
    icon: AccountTreeOutlinedIcon,
    title: "Queue for accounting",
    body: "Saved expenses appear on the Transactions page as pending items, like invoices, ready for journal review.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Post from Transactions",
    body: "Preview journal lines, adjust if needed, and post so cash outflows and the general ledger stay in sync.",
  },
];

function money(n) {
  return formatKyats(Number(n || 0));
}

const DATE_COL_WIDTH = 96;

function expenseRegisterDateParts(row) {
  const date = dayjs(row.expense_date);
  const enteredAt = dayjs(row.created_at);
  return {
    dateLabel: date.isValid()
      ? date.format("DD-MM-YYYY")
      : (row.expense_date ?? "—"),
    timeLabel: enteredAt.isValid() ? enteredAt.format("HH:mm") : null,
  };
}

function prepaidInDateRange(prepaid, fromDate, toDate) {
  const raw = prepaid.payment_date ?? prepaid.opening_balance_date;
  if (!raw) return false;
  const paymentDate = dayjs(raw);
  if (!paymentDate.isValid()) return false;
  const from = dayjs(fromDate);
  const to = dayjs(toDate);
  if (from.isValid() && paymentDate.isBefore(from, "day")) return false;
  if (to.isValid() && paymentDate.isAfter(to, "day")) return false;
  return true;
}

function normalizePrepaidRegisterRow(prepaid) {
  const typeName = prepaid.type?.name ?? "Prepaid";
  const prepaidAccount = prepaid.prepaid_account ?? prepaid.prepaidAccount;
  const category = prepaidAccount?.code
    ? `${prepaidAccount.code} — ${typeName}`
    : typeName;

  return {
    id: prepaid.id,
    registerKind: "prepaid",
    expense_date: prepaid.payment_date ?? prepaid.opening_balance_date,
    created_at: prepaid.created_at,
    reference_number: prepaid.reference_number || prepaid.prepaid_code || null,
    vendor_name: prepaid.vendor_name,
    category,
    description: prepaid.description,
    amount: prepaid.original_amount,
    transaction_method: prepaid.transaction_method ?? prepaid.transactionMethod,
    payment_method:
      prepaid.transaction_method?.ledger_kind ??
      prepaid.transactionMethod?.ledger_kind,
    journal_posting_status:
      prepaid.journal_posting_status ??
      (prepaid.is_opening_balance ? "posted" : "pending"),
    creator: prepaid.creator,
    source_type: "prepaid_expense",
  };
}

function sortExpenseRegisterRows(a, b) {
  const dateA = dayjs(a.expense_date);
  const dateB = dayjs(b.expense_date);
  if (dateA.isValid() && dateB.isValid() && !dateA.isSame(dateB, "day")) {
    return dateB.valueOf() - dateA.valueOf();
  }
  const createdA = dayjs(a.created_at);
  const createdB = dayjs(b.created_at);
  if (createdA.isValid() && createdB.isValid() && !createdA.isSame(createdB)) {
    return createdB.valueOf() - createdA.valueOf();
  }
  return Number(b.id) - Number(a.id);
}

function emptyForm() {
  return {
    expense_date: dayjs().format("YYYY-MM-DD"),
    reference_number: "",
    vendor_name: "",
    chart_of_account_id: "",
    amount: "",
    transaction_method_id: "",
    description: "",
  };
}

function serializeExpenseForm(f) {
  const amt = parseCommaAmount(f.amount);
  return JSON.stringify({
    expense_date: f.expense_date,
    reference_number: String(f.reference_number ?? "").trim(),
    vendor_name: String(f.vendor_name ?? "").trim(),
    chart_of_account_id: String(f.chart_of_account_id ?? ""),
    amount: Number.isFinite(amt) ? amt : null,
    transaction_method_id: String(f.transaction_method_id ?? ""),
    description: String(f.description ?? "").trim(),
  });
}

function formFromRow(row) {
  return {
    expense_date: row.expense_date
      ? dayjs(row.expense_date).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    reference_number: row.reference_number ?? "",
    vendor_name: row.vendor_name ?? "",
    chart_of_account_id: row.chart_of_account_id
      ? String(row.chart_of_account_id)
      : "",
    amount:
      Number(row.amount) > 0 ? formatCommaAmountFromNumber(row.amount) : "",
    transaction_method_id: row.transaction_method_id
      ? String(row.transaction_method_id)
      : "",
    description: row.description ?? "",
  };
}

function expenseReferenceLabel(row) {
  return row.reference_number ?? "—";
}

function expenseVendorLabel(row) {
  return row.vendor_name ?? "—";
}

function expenseMethodLabel(row) {
  return row.transaction_method?.name ?? row.payment_method ?? "—";
}

function postingStatusLabel(status) {
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  return "Pending";
}

const EXPENSE_COLUMN_FILTERS = [
  { key: "reference", getValue: (row) => expenseReferenceLabel(row) },
  { key: "vendor", getValue: (row) => expenseVendorLabel(row) },
  { key: "category", getValue: (row) => row.category ?? "—" },
  { key: "method", getValue: (row) => expenseMethodLabel(row) },
  {
    key: "status",
    getValue: (row) => postingStatusLabel(row.journal_posting_status),
  },
];

function postingStatusColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "primary";
}

function isExpenseEditable(row) {
  return row?.journal_posting_status !== "posted" && !row?.source_type;
}

function editDisabledReason(row) {
  if (row?.registerKind === "prepaid") {
    return "Prepaid expense — manage on Prepaid expenses register";
  }
  if (row?.journal_posting_status === "posted") {
    return "Posted to the journal — reverse before editing";
  }
  if (row?.source_type) {
    return "System-generated expense";
  }
  return "";
}

const emptyFilters = () => ({
  from_date: dayjs().startOf("month").format("YYYY-MM-DD"),
  to_date: dayjs().format("YYYY-MM-DD"),
  search: "",
});

export default function FinanceExpensesPage() {
  const theme = useTheme();
  const location = useLocation();
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const pendingFilters = location.state?.financeFilters ?? null;

  const { user } = useAuthStore();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const canManage = hasPermission(user, "payments.manage");
  const canViewPrepaid = hasPermission(user, "finance.prepaid_expenses.view");

  const initialFilters = pendingFilters
    ? {
        from_date: pendingFilters.from_date ?? emptyFilters().from_date,
        to_date: pendingFilters.to_date ?? emptyFilters().to_date,
        search: "",
      }
    : emptyFilters();

  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formBaseline, setFormBaseline] = useState(
    serializeExpenseForm(emptyForm()),
  );
  const [expenseCoaRows, setExpenseCoaRows] = useState([]);
  const [expenseTransactionMethods, setExpenseTransactionMethods] = useState(
    [],
  );
  const [prepaidDialogOpen, setPrepaidDialogOpen] = useState(false);
  const [prepaidDialogMode, setPrepaidDialogMode] = useState("cash_payment");

  const load = useCallback(
    async (nextFilters = filters) => {
      setLoading(true);
      try {
        const requests = [
          listExpenses({
            from_date: nextFilters.from_date,
            to_date: nextFilters.to_date,
          }),
        ];
        if (canViewPrepaid) {
          requests.push(getPrepaidExpenses());
        }

        const [expenseData, prepaidData] = await Promise.all(requests);
        const expenseRows = (Array.isArray(expenseData) ? expenseData : []).map(
          (row) => ({ ...row, registerKind: "expense" }),
        );
        const prepaidRows = canViewPrepaid
          ? (Array.isArray(prepaidData) ? prepaidData : [])
              .filter((row) =>
                prepaidInDateRange(
                  row,
                  nextFilters.from_date,
                  nextFilters.to_date,
                ),
              )
              .map(normalizePrepaidRegisterRow)
          : [];

        setRows([...expenseRows, ...prepaidRows].sort(sortExpenseRegisterRows));
      } catch (e) {
        pushToast({
          message: resolveApiError(e, "Could not load expenses."),
          severity: "error",
        });
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [canViewPrepaid, filters, pushToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openPrepaid = useCallback((mode = "cash_payment") => {
    setPrepaidDialogMode(mode);
    setPrepaidDialogOpen(true);
  }, []);

  useEffect(() => {
    if (location.state?.openPrepaidDialog) {
      openPrepaid(
        location.state?.prepaidMode === "opening_balance"
          ? "opening_balance"
          : "cash_payment",
      );
    }
  }, [
    location.state?.openPrepaidDialog,
    location.state?.prepaidMode,
    openPrepaid,
  ]);

  const displayedRows = useMemo(() => {
    if (!filters.search.trim()) return rows;
    const q = filters.search.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.category,
        r.vendor_name,
        r.description,
        r.reference_number,
        r.registerKind === "prepaid" ? "prepaid" : "",
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [rows, filters.search]);

  const {
    filteredRows,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
    hasActiveColumnFilters,
  } = useTableColumnFilters(displayedRows, { columns: EXPENSE_COLUMN_FILTERS });

  const periodTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [filteredRows],
  );

  const summary = useMemo(() => {
    let pending = 0;
    let posted = 0;
    let reversed = 0;
    for (const row of filteredRows) {
      if (row.journal_posting_status === "posted") posted += 1;
      else if (row.journal_posting_status === "reversed") reversed += 1;
      else pending += 1;
    }
    return {
      count: filteredRows.length,
      total: periodTotal,
      pending,
      posted,
      reversed,
    };
  }, [filteredRows, periodTotal]);

  const activeFilterCount = [
    filters.search.trim(),
    filters.from_date !== emptyFilters().from_date ? filters.from_date : "",
    filters.to_date !== emptyFilters().to_date ? filters.to_date : "",
  ].filter(Boolean).length;

  const applyFilters = () => {
    resetColumnFilters();
    setFilters(draftFilters);
    load(draftFilters);
  };

  const clearFilters = () => {
    resetColumnFilters();
    const cleared = emptyFilters();
    setDraftFilters(cleared);
    setFilters(cleared);
    load(cleared);
  };

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      displayedRows.find((row) =>
        matchesExpenseHighlight(row, pendingHighlight),
      ) ?? null
    );
  }, [displayedRows, pendingHighlight]);

  const { rowRef: highlightRowRef, highlightActive } = useFinanceRowHighlight({
    ready: !loading,
    found: Boolean(highlightMatch),
    onMissed: () => {
      pushToast({
        message:
          "That expense is not in the current date range. Widen the period and try again.",
        severity: "info",
      });
    },
  });

  const openNew = () => {
    const blank = emptyForm();
    setEditingId(null);
    setForm(blank);
    setFormBaseline(serializeExpenseForm(blank));
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    const next = formFromRow(row);
    setEditingId(row.id);
    setForm(next);
    setFormBaseline(serializeExpenseForm(next));
    setDialogOpen(true);
  };

  const resetDialog = () => {
    const blank = emptyForm();
    setDialogOpen(false);
    setEditingId(null);
    setForm(blank);
    setFormBaseline(serializeExpenseForm(blank));
  };

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [accounts, assetAccounts, methods] = await Promise.all([
          listChartOfAccounts({
            type: "expense",
            is_active: true,
          }),
          listChartOfAccounts({
            is_fixed_asset_account: true,
            is_active: true,
          }),
          getTransactionMethods().catch(() => []),
        ]);
        if (cancelled) return;
        const expenseList = Array.isArray(accounts) ? accounts : [];
        const assetList = Array.isArray(assetAccounts) ? assetAccounts : [];
        const merged = [...expenseList];
        const seen = new Set(expenseList.map((a) => a.id));
        assetList.forEach((a) => {
          if (!seen.has(a.id)) merged.push(a);
        });
        setExpenseCoaRows(merged);
        const mList = Array.isArray(methods) ? methods : [];
        setExpenseTransactionMethods(mList);
        setForm((prev) => {
          if (String(prev.transaction_method_id || "").trim()) {
            return prev;
          }
          const cash = mList.find(
            (x) => x.is_system && x.ledger_kind === "cash",
          );
          return cash
            ? { ...prev, transaction_method_id: String(cash.id) }
            : prev;
        });
      } catch (e) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(e, "Could not load expense form options."),
            severity: "error",
          });
          setExpenseCoaRows([]);
          setExpenseTransactionMethods([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, pushToast]);

  const expenseFormDirty = useMemo(() => {
    return serializeExpenseForm(form) !== formBaseline;
  }, [form, formBaseline]);

  const attemptCloseDialog = async () => {
    if (saving) return;
    if (!expenseFormDirty) {
      resetDialog();
      return;
    }
    const ok = await askConfirm({
      title: editingId ? "Discard changes?" : "Discard expense?",
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

  const submitExpense = async () => {
    const amt = parseCommaAmount(form.amount);
    const account = expenseCoaRows.find(
      (row) => String(row.id) === String(form.chart_of_account_id),
    );
    const categoryLabel = account
      ? `${account.code ? `${account.code} — ` : ""}${account.name ?? ""}`.trim()
      : "";

    if (
      !form.chart_of_account_id ||
      !categoryLabel ||
      !form.expense_date ||
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !String(form.transaction_method_id || "").trim()
    ) {
      pushToast({
        message:
          "Enter a valid date, expense account, paid-from method, and amount.",
        severity: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        expense_date: form.expense_date,
        category: categoryLabel,
        amount: amt,
        chart_of_account_id: Number(form.chart_of_account_id),
        transaction_method_id: Number(form.transaction_method_id),
        vendor_name: form.vendor_name?.trim() || null,
        reference_number: form.reference_number?.trim() || null,
        description: form.description?.trim() || null,
      };
      if (editingId) {
        await updateExpense(editingId, payload);
        pushToast({
          message: "Expense updated.",
          severity: "success",
        });
      } else {
        const idem = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await createExpense(payload, idem);
        pushToast({
          message:
            "Expense recorded. Post it from Transactions to update the ledger and cash outflows.",
          severity: "success",
        });
      }
      resetDialog();
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not save expense."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasActiveFilters = activeFilterCount > 0;
  const hasLineSearch = Boolean(filters.search.trim());
  const hasColumnFilters = hasActiveColumnFilters;
  const showGuidedEmpty = !loading && rows.length === 0 && !hasActiveFilters;
  const columnCount = canManage ? 10 : 9;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            General expense register
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Record operating costs, then post pending lines from Transactions.
          </Typography>
        </Box>
        {canManage && rows.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexShrink: 0 }}
            flexWrap="wrap"
          >
            <CollapsibleFiltersToggle
              open={filtersOpen}
              onToggle={setFiltersOpen}
              activeCount={activeFilterCount}
            />
            <Button variant="outlined" onClick={() => openPrepaid()}>
              Record prepaid
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNew}
            >
              Record expense
            </Button>
          </Stack>
        ) : (
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
          />
        )}
      </Stack>

      <FinanceGuidePanel pageId="expenses" />

      {!canManage ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can view this register. Ask an administrator to grant{" "}
          <strong>payments.manage</strong> to record new expenses.
        </Alert>
      ) : null}

      <Accordion
        expanded={statsExpanded}
        onChange={(_, expanded) => setStatsExpanded(expanded)}
        sx={{ mb: 1, borderRadius: 2, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.5, sm: 1 }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ width: "100%" }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Register overview
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${summary.count} lines • ${money(summary.total)}`}
                sx={{ fontWeight: 700, height: 24 }}
              />
              {summary.pending > 0 ? (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${summary.pending} pending`}
                  sx={{ fontWeight: 700, height: 24 }}
                />
              ) : null}
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 1.25,
            }}
          >
            {[
              ["Lines in view", summary.count],
              ["Period total", money(summary.total)],
              ["Pending", summary.pending],
              ["Posted", summary.posted],
            ].map(([label, value]) => (
              <Paper
                key={label}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  background: alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === "dark" ? 0.08 : 0.04,
                  ),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  display="block"
                >
                  {label}
                </Typography>
                <Typography variant="subtitle2" fontWeight={800}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

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
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={draftFilters.from_date}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, from_date: e.target.value }))
            }
          />
          <TextField
            label="To"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={draftFilters.to_date}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, to_date: e.target.value }))
            }
          />
          <TextField
            label="Search"
            size="small"
            fullWidth
            value={draftFilters.search}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, search: e.target.value }))
            }
            placeholder="Category, vendor, memo, reference…"
          />
        </Box>
      </CollapsibleFiltersPanel>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}>
            <LoadingIndicator size={112} />
          </Box>
        ) : showGuidedEmpty ? (
          <GuidedEmptyState
            icon={ReceiptLongIcon}
            title="No expenses in this period"
            description="Record rent, utilities, supplies, and other operating costs here. Each saved line appears on Transactions as pending until you post it to the ledger."
            steps={EMPTY_STEPS}
            primaryAction={
              canManage
                ? {
                    label: "Record expense",
                    onClick: openNew,
                    startIcon: <AddIcon />,
                  }
                : null
            }
            footer={
              <>
                Set up payment methods under{" "}
                <Typography
                  component={RouterLink}
                  to={`${rolePrefix}/finance/transaction-methods`}
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Financial Management → Transaction Methods
                </Typography>
                .
              </>
            }
          />
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ width: DATE_COL_WIDTH, maxWidth: DATE_COL_WIDTH }}
                  >
                    Date
                  </TableCell>
                  <TableColumnFilterHeader
                    label="Reference"
                    options={columnOptions.reference ?? []}
                    selectedValues={getColumnSelectionArray("reference")}
                    onApply={(values) => setColumnSelection("reference", values)}
                    onClear={() => clearColumnSelection("reference")}
                  />
                  <TableColumnFilterHeader
                    label="Vendor / payee"
                    options={columnOptions.vendor ?? []}
                    selectedValues={getColumnSelectionArray("vendor")}
                    onApply={(values) => setColumnSelection("vendor", values)}
                    onClear={() => clearColumnSelection("vendor")}
                  />
                  <TableColumnFilterHeader
                    label="Category"
                    options={columnOptions.category ?? []}
                    selectedValues={getColumnSelectionArray("category")}
                    onApply={(values) => setColumnSelection("category", values)}
                    onClear={() => clearColumnSelection("category")}
                  />
                  <TableCell>Memo</TableCell>
                  <TableColumnFilterHeader
                    label="Method"
                    options={columnOptions.method ?? []}
                    selectedValues={getColumnSelectionArray("method")}
                    onApply={(values) => setColumnSelection("method", values)}
                    onClear={() => clearColumnSelection("method")}
                  />
                  <TableCell align="right">Amount</TableCell>
                  <TableColumnFilterHeader
                    label="Status"
                    options={columnOptions.status ?? []}
                    selectedValues={getColumnSelectionArray("status")}
                    onApply={(values) => setColumnSelection("status", values)}
                    onClear={() => clearColumnSelection("status")}
                  />
                  <TableCell>Entered by</TableCell>
                  {canManage ? <TableCell align="right" /> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((r) => {
                  const isHighlightRow = matchesExpenseHighlight(
                    r,
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
                  const editable = isExpenseEditable(r);

                  const { dateLabel, timeLabel } = expenseRegisterDateParts(r);

                  return (
                    <TableRow
                      key={`${r.registerKind ?? "expense"}-${r.id}`}
                      hover
                      ref={isHighlightRow ? highlightRowRef : undefined}
                    >
                      <TableCell
                        sx={{
                          width: DATE_COL_WIDTH,
                          maxWidth: DATE_COL_WIDTH,
                          ...financeHighlightCellSx(highlightSourceId),
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontSize: "0.8125rem", lineHeight: 1.35 }}
                        >
                          {dateLabel}
                        </Typography>
                        {timeLabel ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              fontVariantNumeric: "tabular-nums",
                              lineHeight: 1.35,
                            }}
                          >
                            {timeLabel}
                          </Typography>
                        ) : null}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "text.secondary",
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1.35,
                          }}
                        >
                          ID #{r.id}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={financeHighlightCellSx(highlightReference)}
                      >
                        {expenseReferenceLabel(r)}
                      </TableCell>
                      <TableCell>{expenseVendorLabel(r)}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 180,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.category}
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 220,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {expenseMethodLabel(r)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {money(r.amount)}
                        </Typography>
                        {r.registerKind === "prepaid" ? (
                          <Chip
                            label="Prepaid"
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{
                              mt: 0.5,
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                            }}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={postingStatusLabel(r.journal_posting_status)}
                          size="small"
                          color={postingStatusColor(r.journal_posting_status)}
                          variant={
                            r.journal_posting_status === "posted"
                              ? "filled"
                              : "outlined"
                          }
                          sx={{ fontWeight: 700, height: 24 }}
                        />
                      </TableCell>
                      <TableCell>{r.creator?.name ?? "—"}</TableCell>
                      {canManage ? (
                        <TableCell align="right" sx={{ px: 0.5 }}>
                          <FinanceRowActions
                            actions={[
                              {
                                variant: "edit",
                                label: editable
                                  ? "Edit expense"
                                  : editDisabledReason(r),
                                disabled: !editable,
                                onClick: () => openEdit(r),
                              },
                            ]}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
                {!filteredRows.length ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>
                      <Typography
                        color="text.secondary"
                        sx={{ py: 3, textAlign: "center" }}
                      >
                        {hasLineSearch || hasActiveFilters || hasColumnFilters
                          ? "No expenses match the current filters."
                          : "No expenses in this period."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredRows.length > 0 ? (
                  <TableRow
                    sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}
                  >
                    <TableCell
                      colSpan={6}
                      align="right"
                      sx={{ fontWeight: 800 }}
                    >
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {money(periodTotal)}
                    </TableCell>
                    <TableCell colSpan={canManage ? 3 : 2} />
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
          {editingId ? "Edit expense" : "Record expense"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {!editingId ? (
              <Alert severity="info" variant="outlined">
                Saves as pending. Post from Transactions to update the ledger
                and cash outflows.
              </Alert>
            ) : null}
            <TextField
              label="Transaction date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.expense_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, expense_date: e.target.value }))
              }
            />
            <TextField
              label="Reference #"
              size="small"
              fullWidth
              placeholder="Invoice / meter bill / receipt #"
              value={form.reference_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference_number: e.target.value }))
              }
            />
            <TextField
              label="Vendor / payee"
              size="small"
              fullWidth
              placeholder="e.g. landlord, utility company"
              value={form.vendor_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendor_name: e.target.value }))
              }
            />
            <ChartOfAccountPicker
              accounts={expenseCoaRows}
              value={form.chart_of_account_id}
              onChange={(id) => {
                setForm((f) => ({ ...f, chart_of_account_id: id }));
              }}
              onAccountsChange={setExpenseCoaRows}
              listParams={{ type: "expense", is_active: true }}
              dialogDefaultType="expense"
              label="Account (expense or fixed asset)"
              required
              size="small"
            />
            <TextField
              label="Amount"
              size="small"
              fullWidth
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amount: sanitizeCommaAmountInput(e.target.value),
                }))
              }
              inputProps={{ inputMode: "decimal" }}
              placeholder="e.g. 100,000"
            />
            <FormControl fullWidth size="small">
              <InputLabel id="expense-paid-from-label">Paid from</InputLabel>
              <Select
                labelId="expense-paid-from-label"
                label="Paid from"
                value={form.transaction_method_id || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transaction_method_id:
                      e.target.value === "" ? "" : String(e.target.value),
                  }))
                }
              >
                {groupedTransactionMethodsForSelect(
                  expenseTransactionMethods.filter(
                    (m) => m.status === "active",
                  ),
                ).flatMap((group) => [
                  <ListSubheader
                    key={`exp-tm-${group.kind}`}
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
              label="Memo / description"
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder="What was purchased or which period this covers"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => void attemptCloseDialog()} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitExpense} disabled={saving}>
            {saving ? (
              <LoadingIndicator size={22} />
            ) : editingId ? (
              "Save changes"
            ) : (
              "Save expense"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <RecordPrepaidExpenseDialog
        open={prepaidDialogOpen}
        mode={prepaidDialogMode}
        onClose={() => setPrepaidDialogOpen(false)}
        onSuccess={load}
      />
    </Box>
  );
}
