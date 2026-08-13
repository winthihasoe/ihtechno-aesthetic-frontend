import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  getSupplierPayable,
  paySupplierPayable,
  voidSupplierPayable,
  listChartOfAccounts,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import {
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  financeHighlightCellSx,
  matchesPayableTransactionHighlight,
} from "../../utils/financeSourceNavigation";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "e-wallet", label: "E-wallet" },
  { value: "other", label: "Other" },
];

function statusColor(status) {
  if (status === "closed") return "success";
  if (status === "partial") return "warning";
  if (status === "void") return "default";
  return "primary";
}

function humanDateTime(value) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY, h:mm A") : value;
}

function emptyPayForm() {
  return {
    transaction_date: dayjs().format("YYYY-MM-DD"),
    amount: "",
    chart_of_account_id: "",
    payment_method: "cash",
    payment_memo: "",
  };
}

function serializePayForm(form) {
  const amt = parseCommaAmount(form.amount);
  return JSON.stringify({
    transaction_date: form.transaction_date,
    amount: Number.isFinite(amt) ? amt : null,
    chart_of_account_id: String(form.chart_of_account_id ?? ""),
    payment_method: form.payment_method,
    payment_memo: String(form.payment_memo ?? "").trim(),
  });
}

export default function SupplierPayableDetailPage() {
  const { payableId, id } = useParams();
  const payableIdParam = payableId ?? id;
  const location = useLocation();
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const canManage = hasPermission(user, "payments.manage");

  const [payable, setPayable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paymentCoaRows, setPaymentCoaRows] = useState([]);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    if (!payableIdParam) {
      pushToast({ message: "Missing payable ID in route.", severity: "error" });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getSupplierPayable(payableIdParam);
      setPayable(data);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Failed to load payable."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [payableIdParam, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!payDialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const accounts = await listChartOfAccounts({
          type: "asset",
          is_active: true,
        });
        if (cancelled) return;
        setPaymentCoaRows(Array.isArray(accounts) ? accounts : []);
      } catch (e) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(e, "Could not load cash / bank accounts."),
            severity: "error",
          });
          setPaymentCoaRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payDialogOpen, pushToast]);

  const payFormDirty = useMemo(
    () => serializePayForm(payForm) !== serializePayForm(emptyPayForm()),
    [payForm],
  );

  const attemptClosePayDialog = async () => {
    if (paying) return;
    if (!payFormDirty) {
      setPayDialogOpen(false);
      setPayForm(emptyPayForm());
      return;
    }
    const ok = await askConfirm({
      title: "Discard payment?",
      message:
        "You have entered details that are not saved yet. Close without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (ok) {
      setPayDialogOpen(false);
      setPayForm(emptyPayForm());
    }
  };

  const openPayDialog = () => {
    setPayForm(emptyPayForm());
    setPayDialogOpen(true);
  };

  const handlePay = async () => {
    if (!payableIdParam || !payable) return;

    const amt = parseCommaAmount(payForm.amount);
    const maxBalance = Number(payable.balance);

    if (!payForm.transaction_date) {
      pushToast({
        message: "Enter a transaction date.",
        severity: "warning",
      });
      return;
    }
    if (!payForm.chart_of_account_id) {
      pushToast({
        message: "Select a chart of account (cash / bank).",
        severity: "warning",
      });
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast({
        message: "Enter a valid amount.",
        severity: "warning",
      });
      return;
    }
    if (amt > maxBalance) {
      pushToast({
        message: `Amount cannot exceed remaining balance (${formatKyats(maxBalance)}).`,
        severity: "warning",
      });
      return;
    }

    setPaying(true);
    try {
      const key = `ap-pay-${payableIdParam}-${Date.now()}`;
      await paySupplierPayable(
        payableIdParam,
        {
          amount: amt,
          payment_method: payForm.payment_method,
          payment_date: payForm.transaction_date,
          chart_of_account_id: Number(payForm.chart_of_account_id),
          description: payForm.payment_memo.trim() || undefined,
        },
        key,
      );
      pushToast({ message: "Payment recorded.", severity: "success" });
      setPayForm(emptyPayForm());
      setPayDialogOpen(false);
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Payment failed."),
        severity: "error",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleVoidPayable = async () => {
    if (!payableIdParam || !payable || voiding) return;
    const ok = await askConfirm({
      title: "Void this payable?",
      message:
        "This reverses the supplier payable in the ledger and marks the bill void. Inventory already received is not changed.",
      confirmText: "Void payable",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setVoiding(true);
    try {
      await voidSupplierPayable(payableIdParam);
      pushToast({ message: "Payable voided.", severity: "success" });
      await load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not void payable."),
        severity: "error",
      });
    } finally {
      setVoiding(false);
    }
  };

  const transactions = useMemo(() => payable?.transactions || [], [payable]);
  const payableHasPayments = transactions.length > 0;

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      transactions.find((txn) =>
        matchesPayableTransactionHighlight(txn, pendingHighlight),
      ) ?? null
    );
  }, [transactions, pendingHighlight]);

  const { rowRef: highlightRowRef, highlightActive } = useFinanceRowHighlight({
    ready: !loading && Boolean(payable),
    found: Boolean(highlightMatch),
    onMissed: () => {
      pushToast({
        message: "That supplier payment is not listed on this payable.",
        severity: "info",
      });
    },
  });
  const showVoidEligible =
    canManage &&
    payable != null &&
    payable.status !== "void" &&
    !payableHasPayments;
  const paidPercent = payable
    ? Math.min(
        100,
        Math.round(
          (Number(payable.paid_amount || 0) /
            Number(payable.total_amount || 1)) *
            100,
        ),
      )
    : 0;

  const showPayCta =
    canManage && payable != null && Number(payable.balance) > 0;

  if (loading || !payable) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1120, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("..", { relative: "path" })}
        sx={{ mb: 2 }}
      >
        Back to list
      </Button>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Payable #{payable.id}
          </Typography>
          <Typography color="text.secondary">
            {payable.supplier?.name ?? "No supplier"}{" "}
            {payable.reference ? `• ${payable.reference}` : ""}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          justifyContent={{ xs: "flex-start", sm: "flex-end" }}
        >
          {showPayCta ? (
            <Button variant="contained" onClick={openPayDialog}>
              Record payment
            </Button>
          ) : null}
          {showVoidEligible ? (
            <Button
              color="error"
              variant="outlined"
              onClick={() => void handleVoidPayable()}
              disabled={voiding}
            >
              {voiding ? <CircularProgress size={22} /> : "Void payable"}
            </Button>
          ) : null}
          <Chip
            label={payable.status}
            color={statusColor(payable.status)}
            sx={{ fontWeight: 800, textTransform: "capitalize" }}
          />
        </Stack>
      </Stack>

      {canManage && payable.status !== "void" && payableHasPayments ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Payments on file.</strong> Void is only available before any
          payment is posted. To fix a bill after partial or full payment, use
          supplier credits or accounting adjustments (this app does not reverse
          settled cash).
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
          gap: 2,
          mb: 2,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
          }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Total payable
                </Typography>
                <Typography variant="h5" fontWeight={900}>
                  {formatKyats(Number(payable.total_amount))}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="success.main"
                  fontWeight={700}
                >
                  Paid
                </Typography>
                <Typography variant="h6" color="success.main" fontWeight={800}>
                  {formatKyats(Number(payable.paid_amount))}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Balance
                </Typography>
                <Typography variant="h6" fontWeight={900} color="primary.main">
                  {formatKyats(Number(payable.balance))}
                </Typography>
              </Box>
            </Stack>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Settlement progress
                </Typography>
                <Typography variant="body2" fontWeight={800}>
                  {paidPercent}%
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, 0.16),
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${paidPercent}%`,
                    borderRadius: 999,
                    bgcolor: "primary.main",
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            Source details
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Purchase:</strong>{" "}
              {payable.purchase_id
                ? `#${payable.purchase_id}`
                : "Manual payable"}
            </Typography>
            <Typography variant="body2">
              <strong>Reference:</strong> {payable.reference ?? "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Due date:</strong>{" "}
              {payable.due_date
                ? dayjs(payable.due_date).format("DD MMM YYYY")
                : "—"}
            </Typography>
            {payable.description ? (
              <>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  {payable.description}
                </Typography>
              </>
            ) : null}
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Payment history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Partial and full supplier payments recorded by cashier.
          </Typography>
        </Box>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date and time</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Memo</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t) => {
                const isHighlightRow = matchesPayableTransactionHighlight(
                  t,
                  pendingHighlight,
                );
                const highlightReference =
                  isHighlightRow &&
                  highlightActive &&
                  pendingHighlight?.highlightColumn === "reference";
                const highlightSourceId =
                  isHighlightRow &&
                  highlightActive &&
                  pendingHighlight?.highlightColumn === "sourceId";

                return (
                <TableRow key={t.id} ref={isHighlightRow ? highlightRowRef : undefined}>
                  <TableCell sx={financeHighlightCellSx(highlightSourceId)}>
                    {humanDateTime(t.payment_date)}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ID #{t.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.payment_method}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 280,
                      ...financeHighlightCellSx(highlightReference),
                    }}
                  >
                    <Typography
                      variant="body2"
                      noWrap
                      title={
                        [t.description, t.memo]
                          .map((x) =>
                            x != null && String(x).trim()
                              ? String(x).trim()
                              : "",
                          )
                          .find(Boolean) ||
                        t.reference_number ||
                        ""
                      }
                    >
                      {[t.description, t.memo]
                        .map((x) =>
                          x != null && String(x).trim()
                            ? String(x).trim()
                            : "",
                        )
                        .find(Boolean) ||
                        t.reference_number ||
                        "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={800}>
                      {formatKyats(Number(t.amount))}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
              })}
              {!transactions.length ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography
                      color="text.secondary"
                      sx={{ py: 2, textAlign: "center" }}
                    >
                      No payments yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={payDialogOpen}
        onClose={() => void attemptClosePayDialog()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Record payment</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Transaction date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={payForm.transaction_date}
              onChange={(e) =>
                setPayForm((f) => ({
                  ...f,
                  transaction_date: e.target.value,
                }))
              }
            />
            <TextField
              label="Amount"
              size="small"
              fullWidth
              value={payForm.amount}
              onChange={(e) =>
                setPayForm((f) => ({
                  ...f,
                  amount: sanitizeCommaAmountInput(e.target.value),
                }))
              }
              inputProps={{ inputMode: "decimal" }}
              placeholder="e.g. 100,000"
              helperText={`Balance due: ${formatKyats(Number(payable.balance))}`}
            />
            <ChartOfAccountPicker
              accounts={paymentCoaRows}
              value={payForm.chart_of_account_id}
              onChange={(coaId) =>
                setPayForm((f) => ({ ...f, chart_of_account_id: coaId }))
              }
              onAccountsChange={setPaymentCoaRows}
              listParams={{ type: "asset", is_active: true }}
              dialogDefaultType="asset"
              label="Chart of account (cash / bank)"
              required
              size="small"
            />
            <TextField
              select
              label="Method"
              size="small"
              fullWidth
              value={payForm.payment_method}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, payment_method: e.target.value }))
              }
            >
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Memo"
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder="Notes for this payment"
              value={payForm.payment_memo}
              onChange={(e) =>
                setPayForm((f) => ({
                  ...f,
                  payment_memo: e.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => void attemptClosePayDialog()} disabled={paying}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handlePay} disabled={paying}>
            {paying ? <CircularProgress size={22} /> : "Record payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
