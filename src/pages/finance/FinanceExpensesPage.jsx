import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  ListSubheader,
  Chip,
  Pagination,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import {
  listExpenses,
  createExpense,
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
import { groupedTransactionMethodsForSelect } from "../../utils/financialLedgerKindUtils";
import {
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  financeHighlightCellSx,
  matchesExpenseHighlight,
} from "../../utils/financeSourceNavigation";

const PAGE_SIZE = 50;
const TABLE_COLUMN_COUNT = 7;

function expenseCategoryLabel(category) {
  const raw = String(category ?? "").trim();
  if (!raw) return "-";
  const sep = raw.includes(" — ") ? " — " : raw.includes(" - ") ? " - " : null;
  if (!sep) return raw;
  const [code, ...rest] = raw.split(sep);
  const name = rest.join(sep).trim();
  if (!code.trim() || !name) return raw;
  return `${code.trim()} - ${name}`;
}

function expenseMethodLabel(row) {
  return (
    row.transaction_method?.name ??
    row.payment_method ??
    row.transaction_method_name ??
    "-"
  );
}

function groupExpensesByDate(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = dayjs(row.expense_date).format("YYYY-MM-DD");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
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

export default function FinanceExpensesPage() {
  const theme = useTheme();
  const location = useLocation();
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const pendingFilters = location.state?.financeFilters ?? null;

  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const canManage = hasPermission(user, "payments.manage");

  const [fromDate, setFromDate] = useState(
    pendingFilters?.from_date ?? dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [toDate, setToDate] = useState(
    pendingFilters?.to_date ?? dayjs().format("YYYY-MM-DD"),
  );
  const [lineSearch, setLineSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expenseCoaRows, setExpenseCoaRows] = useState([]);
  const [expenseTransactionMethods, setExpenseTransactionMethods] = useState(
    [],
  );
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
      };
      const data = await listExpenses(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not load expenses."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const displayedRows = useMemo(() => {
    if (!lineSearch.trim()) return rows;
    const q = lineSearch.trim().toLowerCase();
    return rows.filter((r) =>
      [r.category, r.vendor_name, r.description, r.reference_number]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [rows, lineSearch]);

  const periodTotal = useMemo(
    () => displayedRows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [displayedRows],
  );

  const pageCount = Math.max(1, Math.ceil(displayedRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return displayedRows.slice(start, start + PAGE_SIZE);
  }, [displayedRows, page]);
  const groupedExpenses = useMemo(
    () => groupExpensesByDate(pagedRows),
    [pagedRows],
  );

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, lineSearch]);

  useEffect(() => {
    if (!pendingHighlight || displayedRows.length === 0) return;
    const idx = displayedRows.findIndex((row) =>
      matchesExpenseHighlight(row, pendingHighlight),
    );
    if (idx >= 0) {
      setPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }, [pendingHighlight, displayedRows]);

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      pagedRows.find((row) => matchesExpenseHighlight(row, pendingHighlight)) ??
      null
    );
  }, [pagedRows, pendingHighlight]);

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
    setForm(emptyForm());
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [accounts, methods] = await Promise.all([
          listChartOfAccounts({
            type: "expense",
            is_active: true,
          }),
          getTransactionMethods().catch(() => []),
        ]);
        if (cancelled) return;
        setExpenseCoaRows(Array.isArray(accounts) ? accounts : []);
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
    return serializeExpenseForm(form) !== serializeExpenseForm(emptyForm());
  }, [form]);

  const attemptCloseDialog = async () => {
    if (saving) return;
    if (!expenseFormDirty) {
      setDialogOpen(false);
      setForm(emptyForm());
      return;
    }
    const ok = await askConfirm({
      title: "Discard expense?",
      message:
        "You have entered details that are not posted yet. Close without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (ok) {
      setDialogOpen(false);
      setForm(emptyForm());
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
      const idem = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await createExpense(
        {
          expense_date: form.expense_date,
          category: categoryLabel,
          amount: amt,
          chart_of_account_id: Number(form.chart_of_account_id),
          transaction_method_id: Number(form.transaction_method_id),
          vendor_name: form.vendor_name?.trim() || null,
          reference_number: form.reference_number?.trim() || null,
          description: form.description?.trim() || null,
        },
        idem,
      );
      pushToast({
        message:
          "Expense recorded. It is posted to the ledger and appears in cash outflows.",
        severity: "success",
      });
      setDialogOpen(false);
      setForm(emptyForm());
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

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        sx={{ mb: 2 }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
          }}
        >
          <ReceiptLongIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            General expense register
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 720, lineHeight: 1.65, mt: 0.5 }}
          >
            Record operating costs the same way as a simple accounting package:
            each line is dated, categorized, and optionally tied to a vendor and
            reference. Saving posts to the <strong>general ledger</strong> and{" "}
            <strong>cash outflow</strong>.
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNew}
            sx={{ flexShrink: 0 }}
          >
            Record expense
          </Button>
        ) : null}
      </Stack>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Log every operating cost here — utilities, rent, maintenance, cleaning
        and supplies. Tag each with a <strong>category</strong> and (optionally)
        a vendor and reference so the totals and reports stay meaningful. Use
        the filters to review spend by category or date.
      </Alert>

      {!canManage ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can view this register. Ask an administrator to grant{" "}
          <strong>payments.manage</strong> to record new expenses.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Register filters
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "end",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) auto",
            },
          }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <TextField
            label="Search in register"
            size="small"
            fullWidth
            value={lineSearch}
            onChange={(e) => setLineSearch(e.target.value)}
            placeholder="Category, vendor, memo, reference…"
          />
          <Button
            variant="outlined"
            onClick={load}
            disabled={loading}
            sx={{ height: 40, gridColumn: { xs: "1 / -1", md: "auto" } }}
          >
            {loading ? <CircularProgress size={22} /> : "Refresh"}
          </Button>
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Period total (filtered list)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formatKyats(periodTotal)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {displayedRows.length} line{displayedRows.length === 1 ? "" : "s"}{" "}
            in view
          </Typography>
        </Stack>
      </Paper>

      {loading ? (
        <CircularProgress size={24} />
      ) : groupedExpenses.length === 0 ? (
        <Alert severity="info">
          No expenses in this period. Use <strong>Record expense</strong> to add
          rent, utilities, and other costs.
        </Alert>
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
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Vendor / payee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Memo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedExpenses.map(([dateKey, dateRows]) => {
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
                      <TableCell colSpan={TABLE_COLUMN_COUNT}>
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
                            {dateRows.length} line
                            {dateRows.length === 1 ? "" : "s"} •{" "}
                            {formatKyats(sum)}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {dateRows.map((row) => {
                      const isHighlightRow = matchesExpenseHighlight(
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
                          <TableCell>
                            {expenseCategoryLabel(row.category)}
                          </TableCell>
                          <TableCell>{row.vendor_name || "-"}</TableCell>
                          <TableCell>{row.description || "-"}</TableCell>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {expenseMethodLabel(row)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={
                                row.status === "void" ? "default" : "success"
                              }
                              label={row.status === "void" ? "Void" : "Posted"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && displayedRows.length > PAGE_SIZE && (
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
          Record expense (journal voucher)
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info" variant="outlined">
              This creates a cash outflow and an expense posting in the ledger.
              Use a clear memo for auditors later.
            </Alert>
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
              onChange={(id) =>
                setForm((f) => ({ ...f, chart_of_account_id: id }))
              }
              onAccountsChange={setExpenseCoaRows}
              listParams={{ type: "expense", is_active: true }}
              dialogDefaultType="expense"
              label="Expense account (chart of accounts)"
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
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => void attemptCloseDialog()} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitExpense} disabled={saving}>
            {saving ? <CircularProgress size={22} /> : "Post expense"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
