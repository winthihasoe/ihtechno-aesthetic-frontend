import { useCallback, useEffect, useMemo, useState } from "react";
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

function money(n) {
  return formatKyats(Number(n || 0));
}

function humanExpenseDate(row) {
  const date = dayjs(row.expense_date);
  if (!date.isValid()) return row.expense_date ?? "—";

  const enteredAt = dayjs(row.created_at);
  const dateLabel = date.format("DD MMM YYYY");
  return enteredAt.isValid()
    ? `${dateLabel}, ${enteredAt.format("h:mm A")}`
    : dateLabel;
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
    pendingFilters?.from_date ??
      dayjs().startOf("month").format("YYYY-MM-DD"),
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
  const [expenseTransactionMethods, setExpenseTransactionMethods] = useState([]);

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

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      displayedRows.find((row) => matchesExpenseHighlight(row, pendingHighlight)) ??
      null
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
          const cash = mList.find((x) => x.is_system && x.ledger_kind === "cash");
          return cash ? { ...prev, transaction_method_id: String(cash.id) } : prev;
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
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: 6,
        width: "100%",
        maxWidth: { xs: "100%", md: 1320 },
        mx: "auto",
        boxSizing: "border-box",
      }}
    >
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
        Log every operating cost here — utilities, rent, maintenance, cleaning and
        supplies. Tag each with a <strong>category</strong> and (optionally) a
        vendor and reference so the totals and reports stay meaningful. Use the
        filters to review spend by category or date.
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
              {money(periodTotal)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {displayedRows.length} line{displayedRows.length === 1 ? "" : "s"}{" "}
            in view
          </Typography>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, maxHeight: { xs: 480, md: "min(70vh, 720px)" } }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Vendor / payee</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Memo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Debit (amount)
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entered by</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && displayedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography
                    color="text.secondary"
                    sx={{ py: 3, textAlign: "center" }}
                  >
                    No expenses in this period. Use{" "}
                    <strong>Record expense</strong> to add rent, utilities, and
                    other costs.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!loading &&
              displayedRows.map((r) => {
                const isHighlightRow = matchesExpenseHighlight(r, pendingHighlight);
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
                  key={r.id}
                  hover
                  ref={isHighlightRow ? highlightRowRef : undefined}
                >
                  <TableCell sx={financeHighlightCellSx(highlightSourceId)}>
                    {humanExpenseDate(r)}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ID #{r.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={financeHighlightCellSx(highlightReference)}>
                    {r.reference_number ?? "—"}
                  </TableCell>
                  <TableCell>{r.vendor_name ?? "—"}</TableCell>
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
                  <TableCell>{r.payment_method ?? "—"}</TableCell>
                  <TableCell>
                    {r.branch?.name ?? (r.branch_id ? `#${r.branch_id}` : "—")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                  >
                    {money(r.amount)}
                  </TableCell>
                  <TableCell>{r.creator?.name ?? "—"}</TableCell>
                </TableRow>
              );
              })}
            {!loading && displayedRows.length > 0 ? (
              <TableRow
                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}
              >
                <TableCell colSpan={7} align="right" sx={{ fontWeight: 800 }}>
                  Total
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {money(periodTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

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
                  expenseTransactionMethods.filter((m) => m.status === "active"),
                ).flatMap((group) => [
                  <ListSubheader key={`exp-tm-${group.kind}`} sx={{ fontWeight: 700 }}>
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
                            <Typography variant="caption" color="text.secondary">
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
