import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
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
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../../components/common/TableColumnFilterHeader";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission, hasRole } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  getAccountingQueuePreview,
  getAssetCategories,
  listAccountingQueue,
  listAccountingQueueAll,
  listChartOfAccounts,
  listJournalTransactions,
  postAccountingQueueItem,
  saveAccountingQueueDraft,
  suggestFixedAssetCode,
  getSuppliers,
} from "../../services/financeService";
import { getUsers } from "../../services/usersService";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import FixedAssetRegistrationForm, {
  emptyFixedAssetForm,
  serializeFixedAssetPayload,
  totalCapitalizedCost,
} from "../../components/finance/FixedAssetRegistrationForm";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import {
  FinanceCreditCell,
  FinanceDebitCell,
  FinanceCoaAccountLabel,
  FinancePageHeader,
  FinanceGuidePanel,
  FinancePanel,
  FinancePanelHeader,
  FinancePeriodToolbar,
  currentMonthKey,
  formatMonthLabel,
  monthRangeLabel,
  monthToDateRange,
  useFinanceTokens,
} from "../../components/finance";
import TransactionQueueDetails, {
  TransactionLinesSectionTitle,
} from "../../components/finance/TransactionQueueDetails";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  buildTransactionDetailNavigation,
  financeHighlightCellSx,
  isCrossMonthSourceNavigation,
  ACCOUNTING_QUEUE_POSTABLE_TYPES,
  isTransactionsPostableType,
  matchesFinanceHighlight,
  monthDateFiltersForAnchor,
  rolePrefixFromPathname,
} from "../../utils/financeSourceNavigation";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

const emptyFilters = {
  status: "",
  query: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "posted", label: "Posted" },
  { value: "reversed", label: "Reversed" },
];

const TRANSACTION_COLUMNS = 7;

const EMPTY_STEPS = [
  {
    icon: PaymentsOutlinedIcon,
    title: "Record patient payments",
    body: "When front desk or cashier collects payment for a visit or invoice, the billing event is created in the payments workflow.",
  },
  {
    icon: SwapHorizOutlinedIcon,
    title: "Queue fills automatically",
    body: "Posted and pending billing activity for the selected month appears here as transactions ready for accounting review.",
  },
  {
    icon: PostAddOutlinedIcon,
    title: "Post to the ledger",
    body: "Expand each row to preview journal lines, choose the correct accounts, and post so journal entries and reports stay in sync.",
  },
];

function rowExpandKey(row) {
  return `${row.source_type}-${row.source_id}`;
}

function normalizePostedLines(transactions) {
  return (transactions ?? []).map((line) => ({
    id: line.id,
    account: line.account,
    debit: line.debit,
    credit: line.credit,
    description: line.description,
    voided_at: line.voided_at,
  }));
}

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY HH:mm");
}

function statusChipColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "default";
}

function statusLabel(status) {
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  return "Pending";
}

const TRANSACTION_COLUMN_FILTERS = [
  { key: "type", getValue: (row) => row.type_label },
  { key: "reference", getValue: (row) => row.reference },
  { key: "party", getValue: (row) => row.name },
  {
    key: "status",
    getValue: (row) => statusLabel(row.journal_posting_status),
  },
];

function emptyPreviewLine() {
  return {
    account_id: "",
    debit: "",
    credit: "",
    description: "",
    line_kind: null,
  };
}

function previewLineToForm(line) {
  return {
    account_id: String(line.account_id ?? line.account?.id ?? ""),
    debit:
      Number(line.debit) > 0 ? formatCommaAmountFromNumber(line.debit) : "",
    credit:
      Number(line.credit) > 0 ? formatCommaAmountFromNumber(line.credit) : "",
    description: line.description ?? "",
    line_kind: line.line_kind ?? null,
  };
}

function invoiceLineKindHint(lineKind) {
  switch (lineKind) {
    case "ar_package":
      return "Package portion — Accounts Receivable (patient owes).";
    case "package_deposit":
      return "Package deferred liability — Customer Deposit until sessions are used.";
    case "ar_earned":
      return "Earned portion — Accounts Receivable (consultation, products, etc.).";
    case "earned_revenue":
      return "Already delivered — Income (not a package deposit).";
    case "ar_tax":
      return "Tax portion — Accounts Receivable.";
    case "tax":
      return "Sales tax payable.";
    default:
      return null;
  }
}

function formatEarnedParts(parts) {
  if (!parts || typeof parts !== "object") return null;
  const labels = {
    consultation: "Consultation",
    treatment: "Treatments",
    product: "Products",
    prescription: "Prescriptions",
    other: "Other",
  };
  const rows = Object.entries(parts)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([key, amount]) => `${labels[key] ?? key} ${formatKyats(amount)}`);
  return rows.length ? rows.join(" · ") : null;
}

function sumPreviewLines(lines) {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    debit += parseCommaAmount(line.debit) || 0;
    credit += parseCommaAmount(line.credit) || 0;
  }
  return { debit, credit };
}

export default function TransactionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const pendingFilters = location.state?.financeFilters ?? null;
  const financeContextMonth = location.state?.financeContextMonth ?? null;
  const highlightNavigationKey = pendingHighlight
    ? `${location.key}:${pendingHighlight.sourceType}:${pendingHighlight.sourceId}:${pendingHighlight.anchorDate ?? ""}`
    : null;

  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const {
    financeSurfaceSx,
    financeFilterStripSx,
    financeTableWrapSx,
    financeTableContainerSx,
    compactTableSx,
    compactFieldSx,
    journalLinesTableSx,
  } = useFinanceTokens();

  const canManage =
    hasRole(user, "owner") ||
    hasPermission(user, "finance.chart_of_accounts.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    filteredRows,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
    hasActiveColumnFilters,
  } = useTableColumnFilters(rows, { columns: TRANSACTION_COLUMN_FILTERS });
  const highlightAnchor =
    pendingHighlight?.anchorDate ?? pendingFilters?.date_from ?? null;
  const highlightMonth =
    pendingHighlight?.targetMonth ??
    (highlightAnchor ? dayjs(highlightAnchor).format("YYYY-MM") : null);
  const contextMonthForNav =
    financeContextMonth ?? highlightMonth ?? currentMonthKey();
  const initialCrossMonth = isCrossMonthSourceNavigation(
    contextMonthForNav,
    highlightMonth,
  );
  const initialDateFilters =
    !initialCrossMonth &&
    (pendingFilters ??
      (highlightAnchor ? monthDateFiltersForAnchor(highlightAnchor) : null));

  const [appliedMonth, setAppliedMonth] = useState(() =>
    initialCrossMonth
      ? contextMonthForNav
      : (highlightMonth ?? currentMonthKey()),
  );
  const [filters, setFilters] = useState(() =>
    initialDateFilters
      ? { ...emptyFilters, ...initialDateFilters }
      : emptyFilters,
  );
  const [draftFilters, setDraftFilters] = useState(() =>
    initialDateFilters
      ? { ...emptyFilters, ...initialDateFilters }
      : emptyFilters,
  );
  const [highlightResolveReady, setHighlightResolveReady] = useState(
    () => !pendingHighlight,
  );
  const [isolatedSourceView, setIsolatedSourceView] = useState(() =>
    initialCrossMonth
      ? {
          targetMonth: highlightMonth,
          contextMonth: contextMonthForNav,
        }
      : null,
  );
  const lastHighlightNavigationKeyRef = useRef(null);
  const expandDetailRef = useRef({});
  const [accounts, setAccounts] = useState([]);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [expandDetailByKey, setExpandDetailByKey] = useState({});
  const [expandLoadingByKey, setExpandLoadingByKey] = useState({});

  const loadIsolatedSource = useCallback(
    async ({ silent = false } = {}) => {
      if (!pendingHighlight?.sourceType || !pendingHighlight?.sourceId) {
        return [];
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await listAccountingQueue({
          source_type: pendingHighlight.sourceType,
          source_id: pendingHighlight.sourceId,
          per_page: 1,
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        setRows(list);
        return list;
      } catch (error) {
        pushToast({
          message: resolveApiError(
            error,
            "Failed to load linked billing record.",
          ),
          severity: "error",
        });
        setRows([]);
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [pendingHighlight, pushToast],
  );

  useEffect(() => {
    if (!highlightNavigationKey || !pendingHighlight) return;
    if (lastHighlightNavigationKeyRef.current === highlightNavigationKey) {
      return;
    }
    lastHighlightNavigationKeyRef.current = highlightNavigationKey;

    const targetMonth = pendingHighlight.targetMonth ?? null;
    const contextMonth = financeContextMonth ?? appliedMonth;
    const crossMonth = isCrossMonthSourceNavigation(contextMonth, targetMonth);

    if (crossMonth) {
      setIsolatedSourceView({ targetMonth, contextMonth });
      setHighlightResolveReady(false);
      let cancelled = false;
      (async () => {
        await loadIsolatedSource();
        if (!cancelled) {
          setHighlightResolveReady(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    setIsolatedSourceView(null);
    setHighlightResolveReady(false);

    const anchor = pendingHighlight.anchorDate ?? pendingFilters?.date_from;
    const monthFilters = pendingFilters ?? monthDateFiltersForAnchor(anchor);
    if (!monthFilters?.date_from) {
      setHighlightResolveReady(true);
      return;
    }

    const month =
      pendingHighlight.targetMonth ??
      dayjs(monthFilters.date_from).format("YYYY-MM");
    const nextFilters = { ...emptyFilters, ...monthFilters };

    setAppliedMonth(month);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
  }, [
    highlightNavigationKey,
    pendingHighlight,
    pendingFilters,
    financeContextMonth,
    appliedMonth,
    loadIsolatedSource,
  ]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewPosting, setPreviewPosting] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [previewForm, setPreviewForm] = useState({
    journal_date: dayjs().format("YYYY-MM-DD"),
    memo: "",
    lines: [emptyPreviewLine(), emptyPreviewLine()],
  });
  const [registerAsFixedAsset, setRegisterAsFixedAsset] = useState(false);
  const [fixedAssetForm, setFixedAssetForm] = useState(emptyFixedAssetForm);
  const [assetCategories, setAssetCategories] = useState([]);
  const [suggestedAssetCode, setSuggestedAssetCode] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  const load = useCallback(
    async (
      nextFilters = filters,
      month = appliedMonth,
      { silent = false } = {},
    ) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const hasExplicitRange =
          String(nextFilters?.date_from ?? "").trim() !== "" &&
          String(nextFilters?.date_to ?? "").trim() !== "";
        const params = Object.fromEntries(
          Object.entries(
            hasExplicitRange
              ? nextFilters
              : { ...monthToDateRange(month), ...nextFilters },
          ).filter(([, value]) => String(value).trim() !== ""),
        );
        const data = await listAccountingQueueAll(params);
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        return list;
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load transactions."),
          severity: "error",
        });
        setRows([]);
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [appliedMonth, filters, pushToast],
  );

  const refreshQueue = useCallback(async () => {
    if (isolatedSourceView) {
      return loadIsolatedSource({ silent: true });
    }
    return load(filters, appliedMonth, { silent: true });
  }, [isolatedSourceView, loadIsolatedSource, load, filters, appliedMonth]);

  useEffect(() => {
    if (isolatedSourceView) return;

    let cancelled = false;
    (async () => {
      await load(filters, appliedMonth);
      if (!cancelled && !pendingHighlight) {
        setHighlightResolveReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isolatedSourceView,
    appliedMonth,
    filters.status,
    filters.query,
    filters.date_from,
    filters.date_to,
  ]);

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      rows.find((row) => matchesFinanceHighlight(row, pendingHighlight)) ?? null
    );
  }, [rows, pendingHighlight]);

  useEffect(() => {
    if (isolatedSourceView || !pendingHighlight || loading) return;
    if (highlightMatch) {
      setHighlightResolveReady(true);
    }
  }, [isolatedSourceView, pendingHighlight, loading, highlightMatch]);

  const useListHighlightScroll = Boolean(
    pendingHighlight && !isolatedSourceView,
  );

  const { rowRef: highlightRowRef, highlightActive } = useFinanceRowHighlight({
    ready: useListHighlightScroll && !loading && highlightResolveReady,
    found: Boolean(highlightMatch),
    enableScroll: useListHighlightScroll,
  });

  const isolatedRowHighlight = Boolean(isolatedSourceView && rows.length > 0);

  const hasActiveFilters = Boolean(
    filters.status ||
      String(filters.query ?? "").trim() ||
      hasActiveColumnFilters,
  );
  const showGuidedEmpty =
    !loading &&
    rows.length === 0 &&
    !hasActiveFilters &&
    !isolatedSourceView;

  useEffect(() => {
    (async () => {
      try {
        const data = await listChartOfAccounts({ is_active: true });
        setAccounts(Array.isArray(data) ? data : []);
      } catch {
        setAccounts([]);
      }
    })();
  }, []);

  const previewBalance = useMemo(
    () => sumPreviewLines(previewForm.lines),
    [previewForm.lines],
  );

  const isBalanced =
    Math.abs(previewBalance.debit - previewBalance.credit) < 0.005;

  const readOnly = previewMeta?.readOnly ?? false;
  const canPost =
    !readOnly &&
    (previewMeta?.can_post ||
      ["pending", "reversed"].includes(
        activeRow?.journal_posting_status ?? "",
      ));
  const showFixedAssetRegistration =
    activeRow?.source_type === "expense" &&
    Boolean(previewMeta?.is_fixed_asset_expense) &&
    !previewMeta?.linked_fixed_asset &&
    !readOnly;

  const resetFixedAssetRegistration = () => {
    setRegisterAsFixedAsset(false);
    setFixedAssetForm(emptyFixedAssetForm());
    setAssetCategories([]);
    setSuggestedAssetCode("");
    setSuppliers([]);
    setStaffUsers([]);
  };

  const loadFixedAssetFormOptions = async () => {
    const [categories, codeHint, supplierRows, userRows] = await Promise.all([
      getAssetCategories().catch(() => []),
      suggestFixedAssetCode().catch(() => ({})),
      getSuppliers().catch(() => []),
      getUsers().catch(() => []),
    ]);
    setAssetCategories(Array.isArray(categories) ? categories : []);
    setSuggestedAssetCode(codeHint?.asset_code ?? "");
    setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
    setStaffUsers(Array.isArray(userRows) ? userRows : []);
  };

  const stats = useMemo(() => {
    let pending = 0;
    let posted = 0;
    let reversed = 0;
    let totalAmount = 0;
    for (const row of filteredRows) {
      const amount = Number(row.amount) || 0;
      totalAmount += amount;
      if (row.journal_posting_status === "posted") posted += 1;
      else if (row.journal_posting_status === "reversed") reversed += 1;
      else pending += 1;
    }
    return { pending, posted, reversed, totalAmount, lines: filteredRows.length };
  }, [filteredRows]);

  const resetExpandedRows = useCallback(() => {
    setExpandedRowKey(null);
    expandDetailRef.current = {};
    setExpandDetailByKey({});
    setExpandLoadingByKey({});
  }, []);

  const exitIsolatedView = () => {
    setIsolatedSourceView(null);
    lastHighlightNavigationKeyRef.current = null;
    resetExpandedRows();
  };

  const applyPreviewToExpandDetail = useCallback((row, previewData) => {
    if (!row || !previewData) return;
    const key = rowExpandKey(row);
    const detail = {
      kind: "preview",
      journalDate: previewData.journal_date,
      memo: previewData.memo,
      lines: previewData.lines ?? [],
    };
    expandDetailRef.current[key] = { loaded: true };
    setExpandDetailByKey((prev) => ({ ...prev, [key]: detail }));
  }, []);

  const loadExpandDetail = useCallback(
    async (row, { force = false } = {}) => {
      const key = rowExpandKey(row);
      const cached = expandDetailRef.current[key];
      if (!force && (cached?.loaded || cached?.loading)) {
        return;
      }

      expandDetailRef.current[key] = { loading: true };
      setExpandLoadingByKey((prev) => ({ ...prev, [key]: true }));

      try {
        const showDraftPreview =
          canManage &&
          ACCOUNTING_QUEUE_POSTABLE_TYPES.has(row.source_type) &&
          ["pending", "reversed"].includes(row.journal_posting_status);

        if (showDraftPreview) {
          const data = await getAccountingQueuePreview(
            row.source_type,
            row.source_id,
          );
          const detail = {
            kind: "preview",
            journalDate: data.journal_date,
            memo: data.memo,
            lines: data.lines ?? [],
          };
          expandDetailRef.current[key] = { loaded: true };
          setExpandDetailByKey((prev) => ({ ...prev, [key]: detail }));
          return;
        }

        const txnData = await listJournalTransactions({
          source_type: row.source_type,
          source_id: row.source_id,
          per_page: 50,
        });
        const txns = Array.isArray(txnData?.data) ? txnData.data : [];
        if (txns.length > 0) {
          const detail = {
            kind: "posted",
            journalDate: txns[0]?.journal_date,
            memo: txns[0]?.memo,
            journalNo: txns[0]?.journal_no,
            lines: normalizePostedLines(txns),
          };
          expandDetailRef.current[key] = { loaded: true };
          setExpandDetailByKey((prev) => ({ ...prev, [key]: detail }));
          return;
        }

        expandDetailRef.current[key] = { loaded: true };
        setExpandDetailByKey((prev) => ({ ...prev, [key]: { kind: "empty" } }));
      } catch (error) {
        expandDetailRef.current[key] = { loaded: true };
        setExpandDetailByKey((prev) => ({
          ...prev,
          [key]: {
            kind: "error",
            message: resolveApiError(error, "Could not load transaction details."),
          },
        }));
      } finally {
        setExpandLoadingByKey((prev) => ({ ...prev, [key]: false }));
      }
    },
    [canManage],
  );

  const toggleExpand = (row) => {
    const key = rowExpandKey(row);
    setExpandedRowKey((prev) => {
      const willExpand = prev !== key;
      if (willExpand) {
        void loadExpandDetail(row);
      }
      return willExpand ? key : null;
    });
  };

  const handleMonthChange = (nextMonth) => {
    exitIsolatedView();
    resetExpandedRows();
    resetColumnFilters();
    setAppliedMonth(nextMonth);
    load(filters, nextMonth);
  };

  const applyFilters = () => {
    exitIsolatedView();
    resetExpandedRows();
    resetColumnFilters();
    setFilters(draftFilters);
    load(draftFilters, appliedMonth);
  };

  const clearFilters = () => {
    exitIsolatedView();
    resetExpandedRows();
    resetColumnFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    load(emptyFilters, appliedMonth);
  };

  const openRowAction = (row, readOnly = false) => {
    if (isTransactionsPostableType(row?.source_type)) {
      openPreview(row, readOnly);
      return;
    }
    const target = buildTransactionDetailNavigation(
      rolePrefix,
      row,
      location.pathname,
    );
    if (target) {
      navigate(target.path, { state: target.state });
    }
  };

  const openPreview = async (row, readOnly = false) => {
    setActiveRow(row);
    setPreviewOpen(true);
    setPreviewLoading(true);
    resetFixedAssetRegistration();
    try {
      const data = await getAccountingQueuePreview(
        row.source_type,
        row.source_id,
      );
      setPreviewMeta({
        ...data,
        readOnly: readOnly || !data.can_post || !canManage,
      });
      setPreviewForm({
        journal_date: data.journal_date ?? dayjs().format("YYYY-MM-DD"),
        memo: data.memo ?? "",
        lines:
          (data.lines ?? []).length > 0
            ? data.lines.map(previewLineToForm)
            : [emptyPreviewLine(), emptyPreviewLine()],
      });
      if (
        row.source_type === "expense" &&
        data.is_fixed_asset_expense &&
        !data.linked_fixed_asset &&
        !readOnly &&
        data.can_post &&
        canManage
      ) {
        await loadFixedAssetFormOptions();
      }
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load journal preview."),
        severity: "error",
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setActiveRow(null);
    setPreviewMeta(null);
    resetFixedAssetRegistration();
  };

  const buildPayloadFromForm = () => {
    const lines = previewForm.lines.map((line) => ({
      account_id: Number(line.account_id),
      debit: parseCommaAmount(line.debit) || 0,
      credit: parseCommaAmount(line.credit) || 0,
      description: line.description?.trim() || null,
    }));
    const payload = {
      journal_date: previewForm.journal_date,
      memo: previewForm.memo?.trim() || null,
      lines,
    };
    if (showFixedAssetRegistration && registerAsFixedAsset) {
      payload.fixed_asset = serializeFixedAssetPayload(fixedAssetForm);
    }
    return payload;
  };

  const validateFixedAssetRegistration = () => {
    if (!showFixedAssetRegistration || !registerAsFixedAsset) {
      return true;
    }

    const payload = serializeFixedAssetPayload(fixedAssetForm);
    if (
      !payload.asset_code ||
      !payload.asset_name ||
      !payload.category_id ||
      !payload.useful_life_months ||
      !payload.in_service_date
    ) {
      pushToast({
        message:
          "Complete asset code, name, category, useful life, and in-service date.",
        severity: "warning",
      });
      return false;
    }

    const total = totalCapitalizedCost(fixedAssetForm);
    const expenseAmount = Number(previewMeta?.amount ?? 0);
    if (
      total == null ||
      Math.round(total * 100) !== Math.round(expenseAmount * 100)
    ) {
      pushToast({
        message:
          "Total capitalized cost must equal the expense amount before posting.",
        severity: "warning",
      });
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!activeRow) return;
    setPreviewSaving(true);
    try {
      const data = await saveAccountingQueueDraft(
        activeRow.source_type,
        activeRow.source_id,
        buildPayloadFromForm(),
      );
      setPreviewMeta((prev) => ({
        ...prev,
        ...data,
        readOnly: previewMeta?.readOnly,
      }));
      setPreviewForm({
        journal_date: data.journal_date ?? previewForm.journal_date,
        memo: data.memo ?? previewForm.memo,
        lines: (data.lines ?? []).map(previewLineToForm),
      });
      pushToast({ message: "Draft saved.", severity: "success" });
      applyPreviewToExpandDetail(activeRow, data);
      closePreview();
      await refreshQueue();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save draft."),
        severity: "error",
      });
    } finally {
      setPreviewSaving(false);
    }
  };

  const handlePost = async () => {
    if (!activeRow || !isBalanced || !validateFixedAssetRegistration()) return;
    setPreviewPosting(true);
    try {
      await postAccountingQueueItem(
        activeRow.source_type,
        activeRow.source_id,
        buildPayloadFromForm(),
      );
      pushToast({
        message: registerAsFixedAsset
          ? "Posted to journal and registered fixed asset."
          : "Posted to journal.",
        severity: "success",
      });
      closePreview();
      const updatedRows = await refreshQueue();
      const expandKey = rowExpandKey(activeRow);
      if (expandedRowKey === expandKey) {
        const updatedRow =
          updatedRows.find((row) => rowExpandKey(row) === expandKey) ??
          activeRow;
        await loadExpandDetail(updatedRow, { force: true });
      }
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not post to journal."),
        severity: "error",
      });
    } finally {
      setPreviewPosting(false);
    }
  };

  const updatePreviewLine = (index, patch) => {
    setPreviewForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  return (
    <>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Transactions"
            subtitle="Invoices, collections, expenses, other income, and supplier payments. Post pending billings to the journal from here."
          />
        </FinancePanelHeader>

        <Box sx={{ px: 2, pt: 0 }}>
          <FinanceGuidePanel pageId="transactions" />
        </Box>

        <FinancePeriodToolbar
          embedded
          month={appliedMonth}
          onMonthChange={handleMonthChange}
          periodLabel={formatMonthLabel(appliedMonth)}
          periodSubLabel={monthRangeLabel(appliedMonth)}
          stats={[
            {
              label: "Pending",
              value: stats.pending,
              accent: "warning.main",
            },
            {
              label: "Posted",
              value: stats.posted,
              accent: "success.main",
            },
            {
              label: "Reversed",
              value: stats.reversed,
              accent: "text.secondary",
            },
            {
              label: "Total amount",
              value: formatKyats(stats.totalAmount),
            },
            { label: "Queue", value: stats.lines },
          ]}
        />

        {isolatedSourceView ? (
          <Alert severity="info" sx={{ mx: 2, mt: 2, mb: 0 }}>
            Showing linked billing from{" "}
            <strong>{formatMonthLabel(isolatedSourceView.targetMonth)}</strong>.
            Period toolbar stays on{" "}
            <strong>{formatMonthLabel(isolatedSourceView.contextMonth)}</strong>
            . Change month or apply filters to return to the full queue.
          </Alert>
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
            label="Posting status"
            size="small"
            value={draftFilters.status}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, status: e.target.value }))
            }
            sx={{ minWidth: 160, ...compactFieldSx }}
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
            placeholder="Reference, name, invoice no."
            sx={{ flex: 1, minWidth: 200, ...compactFieldSx }}
          />
          <Stack direction="row" spacing={0.75}>
            <Button variant="contained" size="small" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="outlined" size="small" onClick={clearFilters}>
              Clear
            </Button>
          </Stack>
        </Stack>

        <Box sx={financeTableWrapSx}>
          {showGuidedEmpty ? (
            <GuidedEmptyState
              icon={SwapHorizOutlinedIcon}
              title="No transactions in this period"
              description="This queue shows billing and payment activity for the selected month. Record patient payments to populate rows here, then post them to the general ledger."
              steps={EMPTY_STEPS}
              footer={
                <>
                  Start from{" "}
                  <Typography
                    component={RouterLink}
                    to={`${rolePrefix}/payments`}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Billing → Payments
                  </Typography>
                  .
                </>
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
                  <TableCell align="right">Amount</TableCell>
                  <TableColumnFilterHeader
                    label="Status"
                    options={columnOptions.status ?? []}
                    selectedValues={getColumnSelectionArray("status")}
                    onApply={(values) => setColumnSelection("status", values)}
                    onClear={() => clearColumnSelection("status")}
                  />
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={TRANSACTION_COLUMNS + 1}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <LoadingIndicator size={80} />
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={TRANSACTION_COLUMNS + 1}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography color="text.secondary">
                        {isolatedSourceView
                          ? "Linked billing record was not found."
                          : hasActiveFilters
                            ? "No results match your filters."
                            : "No transactions in this period."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const expandKey = rowExpandKey(row);
                    const isExpanded = expandedRowKey === expandKey;
                    const expandDetail = expandDetailByKey[expandKey] ?? null;
                    const expandLoading = Boolean(expandLoadingByKey[expandKey]);
                    const isHighlightRow = matchesFinanceHighlight(
                      row,
                      pendingHighlight,
                    );
                    const pulseHighlight = isolatedRowHighlight
                      ? true
                      : isHighlightRow && highlightActive;
                    const highlightReference =
                      pulseHighlight &&
                      (isolatedRowHighlight ||
                        pendingHighlight?.highlightColumn === "reference");
                    const highlightSourceId =
                      pulseHighlight &&
                      !isolatedRowHighlight &&
                      pendingHighlight?.highlightColumn === "sourceId";

                    return (
                      <Fragment key={expandKey}>
                        <TableRow
                          hover
                          onClick={() => toggleExpand(row)}
                          ref={isHighlightRow ? highlightRowRef : undefined}
                          data-finance-highlight={expandKey}
                          sx={{
                            cursor: "pointer",
                            "& .MuiTableCell-root": {
                              ...(isExpanded ? { borderBottom: 0 } : undefined),
                            },
                          }}
                        >
                          <TableCell sx={{ width: 36, px: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(row);
                              }}
                              sx={{
                                transform: isExpanded ? "rotate(90deg)" : "none",
                                transition: "transform 0.15s",
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell>{formatHumanDate(row.event_at ?? row.event_date)}</TableCell>
                          <TableCell
                            sx={financeHighlightCellSx(highlightSourceId, {
                              isolated: isolatedRowHighlight,
                            })}
                          >
                            {row.type_label}
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "text.secondary",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: highlightSourceId ? 700 : 500,
                              }}
                            >
                              ID #{row.source_id}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={financeHighlightCellSx(highlightReference, {
                              isolated: isolatedRowHighlight,
                            })}
                          >
                            {row.reference}
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="right">
                            {formatKyats(row.amount)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(row.journal_posting_status)}
                              color={statusChipColor(row.journal_posting_status)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {canManage &&
                            isTransactionsPostableType(row.source_type) &&
                            ["pending", "reversed"].includes(
                              row.journal_posting_status,
                            ) ? (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRowAction(row, false);
                                }}
                              >
                                Preview & post
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRowAction(row, true);
                                }}
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={TRANSACTION_COLUMNS + 1}
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
                                <TransactionQueueDetails
                                  row={row}
                                  rolePrefix={rolePrefix}
                                  pathname={location.pathname}
                                  contextMonth={appliedMonth}
                                  detail={expandDetail}
                                  actions={
                                    <Stack direction="row" spacing={0.75}>
                                      {canManage &&
                                      isTransactionsPostableType(row.source_type) &&
                                      ["pending", "reversed"].includes(
                                        row.journal_posting_status,
                                      ) ? (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() =>
                                            openRowAction(row, false)
                                          }
                                        >
                                          Preview & post
                                        </Button>
                                      ) : (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => openRowAction(row, true)}
                                        >
                                          View source
                                        </Button>
                                      )}
                                    </Stack>
                                  }
                                />

                                {expandLoading ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                      py: 2,
                                    }}
                                  >
                                    <LoadingIndicator size={32} />
                                  </Box>
                                ) : expandDetail?.kind === "error" ? (
                                  <Alert severity="warning" sx={{ mt: 1.25 }}>
                                    {expandDetail.message}
                                  </Alert>
                                ) : expandDetail?.lines?.length > 0 ? (
                                  <>
                                    <TransactionLinesSectionTitle>
                                      Journal lines
                                    </TransactionLinesSectionTitle>
                                    <Table
                                      size="small"
                                      sx={{
                                        ...compactTableSx,
                                        ...journalLinesTableSx,
                                      }}
                                    >
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Account</TableCell>
                                          <TableCell>Description</TableCell>
                                          <TableCell
                                            align="right"
                                            className="journal-dr-header"
                                          >
                                            Debit (DR)
                                          </TableCell>
                                          <TableCell
                                            align="right"
                                            className="journal-cr-header"
                                          >
                                            Credit (CR)
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {expandDetail.lines.map((line, index) => (
                                          <TableRow
                                            key={line.id ?? index}
                                            sx={{
                                              opacity: line.voided_at ? 0.5 : 1,
                                            }}
                                          >
                                            <TableCell>
                                              {line.account ? (
                                                <FinanceCoaAccountLabel
                                                  code={line.account.code}
                                                  name={line.account.name}
                                                />
                                              ) : (
                                                "—"
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {line.description ?? "—"}
                                              {line.voided_at ? " (void)" : ""}
                                            </TableCell>
                                            <FinanceDebitCell value={line.debit} />
                                            <FinanceCreditCell value={line.credit} />
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </>
                                ) : expandDetail?.kind === "empty" ? (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 1.25, fontSize: "0.8125rem" }}
                                  >
                                    No journal lines yet. Post this transaction to
                                    create journal entries.
                                  </Typography>
                                ) : null}
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

      <Dialog
        open={previewOpen}
        onClose={closePreview}
        maxWidth={showFixedAssetRegistration && registerAsFixedAsset ? "lg" : "md"}
        fullWidth
      >
        <DialogTitle>
          {readOnly ? "Journal preview" : "Preview & post to journal"}
        </DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <LoadingIndicator size={50} />
            </Box>
          ) : (
            <Stack spacing={2}>
              {previewMeta && (
                <Typography variant="body2" color="text.secondary">
                  {previewMeta.reference} · {previewMeta.name} ·{" "}
                  {formatKyats(previewMeta.amount)}
                </Typography>
              )}

              {previewMeta?.invoice_breakdown &&
              (Number(previewMeta.invoice_breakdown.package) > 0 ||
                Number(previewMeta.invoice_breakdown.earned) > 0) ? (
                <Alert severity="info" sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Invoice split
                  </Typography>
                  <Typography variant="body2" component="div">
                    {Number(previewMeta.invoice_breakdown.package) > 0 ? (
                      <div>
                        Package (deferred deposit):{" "}
                        {formatKyats(previewMeta.invoice_breakdown.package)}
                      </div>
                    ) : null}
                    {Number(previewMeta.invoice_breakdown.earned) > 0 ? (
                      <div>
                        Earned (consultation / products / other):{" "}
                        {formatKyats(previewMeta.invoice_breakdown.earned)}
                        {(() => {
                          const earnedDetail = formatEarnedParts(
                            previewMeta.invoice_breakdown.earned_parts,
                          );
                          return earnedDetail ? ` — ${earnedDetail}` : "";
                        })()}
                      </div>
                    ) : null}
                    {Number(previewMeta.invoice_breakdown.tax) > 0 ? (
                      <div>
                        Tax: {formatKyats(previewMeta.invoice_breakdown.tax)}
                      </div>
                    ) : null}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.75 }}
                  >
                    Package lines use AR + Customer Deposit. Earned lines use AR
                    + Income.
                  </Typography>
                </Alert>
              ) : null}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Journal date"
                  type="date"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  value={previewForm.journal_date}
                  onChange={(e) =>
                    setPreviewForm((f) => ({
                      ...f,
                      journal_date: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Memo"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  value={previewForm.memo}
                  onChange={(e) =>
                    setPreviewForm((f) => ({ ...f, memo: e.target.value }))
                  }
                />
              </Stack>

              {!isBalanced && (
                <Alert severity="warning">
                  Debits ({formatKyats(previewBalance.debit)}) must equal
                  credits ({formatKyats(previewBalance.credit)}).
                </Alert>
              )}

              {previewForm.lines.map((line, index) => {
                const kindHint = invoiceLineKindHint(line.line_kind);
                return (
                <Stack
                  key={index}
                  spacing={0.5}
                >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ md: "flex-start" }}
                >
                  <Box sx={{ flex: 2, minWidth: 200 }}>
                    <ChartOfAccountPicker
                      accounts={accounts}
                      value={line.account_id}
                      onChange={(id) =>
                        updatePreviewLine(index, { account_id: id })
                      }
                      onAccountsChange={setAccounts}
                      disabled={readOnly}
                      label="Account"
                    />
                  </Box>
                  <TextField
                    label="Debit"
                    size="small"
                    disabled
                    value={line.debit}
                    sx={{ width: { md: 120 } }}
                  />
                  <TextField
                    label="Credit"
                    size="small"
                    disabled
                    value={line.credit}
                    sx={{ width: { md: 120 } }}
                  />
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    disabled={readOnly}
                    value={line.description}
                    onChange={(e) =>
                      updatePreviewLine(index, {
                        description: e.target.value,
                      })
                    }
                    sx={{ flex: 2 }}
                  />
                </Stack>
                {kindHint ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ pl: { md: 0.5 } }}
                  >
                    {kindHint}
                  </Typography>
                ) : null}
                </Stack>
                );
              })}

              {!readOnly ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Amounts come from the source transaction and cannot be changed here.
                  Choose accounts and descriptions, or edit the source record if the amount is wrong.
                </Typography>
              ) : null}

              {showFixedAssetRegistration ? (
                <>
                  <Divider />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={registerAsFixedAsset}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRegisterAsFixedAsset(checked);
                          if (checked) {
                            setFixedAssetForm({
                              ...emptyFixedAssetForm(),
                              asset_code: suggestedAssetCode,
                              purchase_cost: formatCommaAmountFromNumber(
                                previewMeta?.amount ?? 0,
                              ),
                              in_service_date:
                                previewMeta?.expense_date ??
                                previewForm.journal_date,
                            });
                          } else {
                            setFixedAssetForm(emptyFixedAssetForm());
                          }
                        }}
                      />
                    }
                    label="Register as fixed asset"
                  />
                </>
              ) : null}

              {previewMeta?.linked_fixed_asset ? (
                <Alert severity="info">
                  Linked fixed asset: {previewMeta.linked_fixed_asset.asset_code}{" "}
                  — {previewMeta.linked_fixed_asset.asset_name}
                </Alert>
              ) : null}

              {showFixedAssetRegistration && registerAsFixedAsset ? (
                <FixedAssetRegistrationForm
                  form={fixedAssetForm}
                  onChange={setFixedAssetForm}
                  categories={assetCategories}
                  mode="expense"
                  suggestedCode={suggestedAssetCode}
                  expenseAmount={formatCommaAmountFromNumber(
                    previewMeta?.amount ?? 0,
                  )}
                  suppliers={suppliers}
                  users={staffUsers}
                />
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreview}>Close</Button>
          {!readOnly && (
            <>
              <Button
                onClick={handleSaveDraft}
                disabled={previewSaving || previewLoading}
              >
                {previewSaving ? "Saving…" : "Save draft"}
              </Button>
              <Button
                variant="contained"
                onClick={handlePost}
                disabled={
                  previewPosting || previewLoading || !isBalanced || !canPost
                }
              >
                {previewPosting ? "Posting…" : "Post to journal"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
