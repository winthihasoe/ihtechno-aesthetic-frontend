import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission, hasRole } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  getAccountingQueuePreview,
  listAccountingQueue,
  listChartOfAccounts,
  postAccountingQueueItem,
  saveAccountingQueueDraft,
} from "../../services/financeService";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePeriodToolbar,
  currentMonthKey,
  formatMonthLabel,
  monthRangeLabel,
  monthToDateRange,
  useFinanceTokens,
} from "../../components/finance";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  buildTransactionDetailNavigation,
  financeHighlightCellSx,
  isCrossMonthSourceNavigation,
  isTransactionsPostableType,
  matchesFinanceHighlight,
  monthDateFiltersForAnchor,
  rolePrefixFromPathname,
} from "../../utils/financeSourceNavigation";

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

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
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

function emptyPreviewLine() {
  return {
    account_id: "",
    debit: "",
    credit: "",
    description: "",
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
  };
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
  } = useFinanceTokens();

  const canManage =
    hasRole(user, "owner") ||
    hasPermission(user, "finance.chart_of_accounts.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [accounts, setAccounts] = useState([]);

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
        const data = await listAccountingQueue({ ...params, per_page: 100 });
        const list = Array.isArray(data?.data) ? data.data : [];
        setRows(list);
        return list;
      } catch (error) {
        pushToast({
          message: resolveApiError(
            error,
            "Failed to load transactions.",
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

  const stats = useMemo(() => {
    let pending = 0;
    let posted = 0;
    let reversed = 0;
    let totalAmount = 0;
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      totalAmount += amount;
      if (row.journal_posting_status === "posted") posted += 1;
      else if (row.journal_posting_status === "reversed") reversed += 1;
      else pending += 1;
    }
    return { pending, posted, reversed, totalAmount, lines: rows.length };
  }, [rows]);

  const exitIsolatedView = () => {
    setIsolatedSourceView(null);
    lastHighlightNavigationKeyRef.current = null;
  };

  const handleMonthChange = (nextMonth) => {
    exitIsolatedView();
    setAppliedMonth(nextMonth);
    load(filters, nextMonth);
  };

  const applyFilters = () => {
    exitIsolatedView();
    setFilters(draftFilters);
    load(draftFilters, appliedMonth);
  };

  const clearFilters = () => {
    exitIsolatedView();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    load(emptyFilters, appliedMonth);
  };

  const openRowAction = (row, readOnly = false) => {
    if (isTransactionsPostableType(row?.source_type)) {
      openPreview(row, readOnly);
      return;
    }
    const target = buildTransactionDetailNavigation(rolePrefix, row, location.pathname);
    if (target) {
      navigate(target.path, { state: target.state });
    }
  };

  const openPreview = async (row, readOnly = false) => {
    setActiveRow(row);
    setPreviewOpen(true);
    setPreviewLoading(true);
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
  };

  const buildPayloadFromForm = () => {
    const lines = previewForm.lines.map((line) => ({
      account_id: Number(line.account_id),
      debit: parseCommaAmount(line.debit) || 0,
      credit: parseCommaAmount(line.credit) || 0,
      description: line.description?.trim() || null,
    }));
    return {
      journal_date: previewForm.journal_date,
      memo: previewForm.memo?.trim() || null,
      lines,
    };
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
    if (!activeRow || !isBalanced) return;
    setPreviewPosting(true);
    try {
      await postAccountingQueueItem(
        activeRow.source_type,
        activeRow.source_id,
        buildPayloadFromForm(),
      );
      pushToast({ message: "Posted to journal.", severity: "success" });
      closePreview();
      await refreshQueue();
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

  const addPreviewLine = () => {
    setPreviewForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptyPreviewLine()],
    }));
  };

  const removePreviewLine = (index) => {
    setPreviewForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const readOnly = previewMeta?.readOnly ?? false;
  const canPost =
    !readOnly &&
    (previewMeta?.can_post ||
      ["pending", "reversed"].includes(
        activeRow?.journal_posting_status ?? "",
      ));

  return (
    <>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Transactions"
            subtitle="Invoices, collections, expenses, other income, and supplier payments. Post pending billings to the journal from here."
            guide={[
              "The accounting inbox — every source document (invoice, expense, payment) flowing toward the ledger.",
              "Pending items still need to be posted to a journal entry; posted items are already in the books.",
              "This is where finance reviews and posts day-to-day activity.",
            ]}
          />
        </FinancePanelHeader>

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
          <TableContainer sx={financeTableContainerSx}>
            <Table size="small" sx={compactTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {isolatedSourceView
                          ? "Linked billing record was not found."
                          : "No transactions in this period."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
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
                      <TableRow
                        key={`${row.source_type}-${row.source_id}`}
                        hover
                        ref={isHighlightRow ? highlightRowRef : undefined}
                        data-finance-highlight={`${row.source_type}-${row.source_id}`}
                      >
                        <TableCell>{formatHumanDate(row.event_date)}</TableCell>
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
                              onClick={() => openRowAction(row, false)}
                            >
                              Preview & post
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openRowAction(row, true)}
                            >
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </FinancePanel>

      <Dialog open={previewOpen} onClose={closePreview} maxWidth="md" fullWidth>
        <DialogTitle>
          {readOnly ? "Journal preview" : "Preview & post to journal"}
        </DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {previewMeta && (
                <Typography variant="body2" color="text.secondary">
                  {previewMeta.reference} · {previewMeta.name} ·{" "}
                  {formatKyats(previewMeta.amount)}
                </Typography>
              )}
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

              {previewForm.lines.map((line, index) => (
                <Stack
                  key={index}
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
                    disabled={readOnly}
                    value={line.debit}
                    onChange={(e) =>
                      updatePreviewLine(index, {
                        debit: sanitizeCommaAmountInput(e.target.value),
                        credit: "",
                      })
                    }
                    sx={{ width: { md: 120 } }}
                  />
                  <TextField
                    label="Credit"
                    size="small"
                    disabled={readOnly}
                    value={line.credit}
                    onChange={(e) =>
                      updatePreviewLine(index, {
                        credit: sanitizeCommaAmountInput(e.target.value),
                        debit: "",
                      })
                    }
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
                  {!readOnly && previewForm.lines.length > 2 && (
                    <IconButton
                      aria-label="Remove line"
                      onClick={() => removePreviewLine(index)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </Stack>
              ))}

              {!readOnly && (
                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={addPreviewLine}
                >
                  Add line
                </Button>
              )}
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
