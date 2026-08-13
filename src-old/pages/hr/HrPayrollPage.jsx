import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import HrPageShell from "./components/HrPageShell";
import PayrollBreakdownPanel from "./components/PayrollBreakdownPanel";
import {
  finalizePayroll,
  generatePayroll,
  getPayrolls,
  updatePayrollOverrides,
} from "../../services/hrService";
import {
  completePayrollPayout,
  getPayrollFinanceMonthStatus,
} from "../../services/financeService";
import { getTransactionMethods } from "../../services/transactionMethodService";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import { formatKyats } from "../../utils/formatKyats";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";

const PAYROLL_BUCKETS = [
  { field: "base_salary", overrideField: "override_base_salary", label: "Base Salary" },
  { field: "overtime_amount", overrideField: "override_overtime_amount", label: "Overtime" },
  { field: "commission_amount", overrideField: "override_commission_amount", label: "Commission" },
  {
    field: "transport_allowance_amount",
    overrideField: "override_transport_allowance_amount",
    label: "Transport",
  },
  { field: "adjustments_amount", overrideField: "override_adjustments_amount", label: "Adjustments" },
  { field: "deductions", overrideField: "override_deductions", label: "Deductions" },
];

const PAYROLL_TABLE_COLUMN_COUNT = 2 + PAYROLL_BUCKETS.length + 3;

const PAYROLL_TABLE_SX = {
  tableLayout: "fixed",
  width: "100%",
  minWidth: 1040,
};

const PAYROLL_COLUMN_WIDTHS = {
  expand: 40,
  staff: "12%",
  amount: "9%",
  netPay: "9%",
  status: 96,
  action: 88,
};

const formatMonth = (monthKey) => {
  if (!monthKey || monthKey === "-") return "this month";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

function postingStatusLabel(status) {
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  if (status === "pending") return "Pending";
  return "Not queued";
}

function postingStatusColor(status) {
  if (status === "posted") return "success.main";
  if (status === "reversed") return "warning.main";
  if (status === "pending") return "info.main";
  return "text.secondary";
}

export default function HrPayrollPage() {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const role = resolveUserPrimaryRole(user);
  const rolePrefix = `/${role}`;
  const [payrollRows, setPayrollRows] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [monthStatus, setMonthStatus] = useState(null);
  const [monthStatusLoading, setMonthStatusLoading] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [completingPayout, setCompletingPayout] = useState(false);
  const [transactionMethods, setTransactionMethods] = useState([]);
  const [payoutForm, setPayoutForm] = useState({
    payment_date: dayjs().format("YYYY-MM-DD"),
    transaction_method: null,
    reference_number: "",
    memo: "",
  });
  const [overrideDialog, setOverrideDialog] = useState(null);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const canManagePayroll = hasPermission(user, "hr.manage");
  const canOpenTransactions =
    hasPermission(user, "payments.view") ||
    hasPermission(user, "finance.reports.view") ||
    hasPermission(user, "finance.chart_of_accounts.manage");

  const load = async (monthKey = month) => {
    const payrollRes = await getPayrolls({ month: monthKey, per_page: 500 });
    setPayrollRows(payrollRes.data || []);
  };

  const loadMonthStatus = useCallback(
    async (monthKey = month) => {
      setMonthStatusLoading(true);
      try {
        const res = await getPayrollFinanceMonthStatus(monthKey);
        setMonthStatus(res?.data || null);
      } catch (error) {
        setMonthStatus(null);
        pushToast({
          message: resolveApiError(error, "Failed to load payroll payout status."),
          severity: "error",
        });
      } finally {
        setMonthStatusLoading(false);
      }
    },
    [month, pushToast],
  );

  useEffect(() => {
    load(month).catch((error) => {
      pushToast({
        message: resolveApiError(error, "Failed to load payroll data."),
        severity: "error",
      });
    });
    loadMonthStatus(month);
  }, [month, pushToast, loadMonthStatus]);

  useEffect(() => {
    getTransactionMethods()
      .then((methods) => setTransactionMethods(Array.isArray(methods) ? methods : []))
      .catch(() => setTransactionMethods([]));
  }, []);

  const payrollForMonth = useMemo(
    () => payrollRows.filter((row) => String(row.month) === String(month)),
    [payrollRows, month],
  );

  const monthStatusRow = monthStatus?.month_status;
  const hasDraftForMonth =
    payrollForMonth.some((row) => row.status !== "finalized") ||
    Number(monthStatusRow?.draft_count || 0) > 0;
  const hasAnyPayroll = payrollRows.length > 0;
  const monthLabel = formatMonth(month);
  const accrual = monthStatus?.accrual;
  const payoutPayments = monthStatus?.payments || [];
  const canCompletePayout =
    Boolean(monthStatusRow?.can_complete_payout) && !hasDraftForMonth;
  const monthNetTotal = Number(monthStatusRow?.net_payable_total || 0);
  const accrualStatus = monthStatusRow?.accrual_status || "none";
  const paymentStatus = monthStatusRow?.payment_status || "none";
  const missingSalaryRows = useMemo(
    () => payrollForMonth.filter((row) => !Number(row.base_salary)),
    [payrollForMonth],
  );

  const holdsMissingApply = useMemo(
    () =>
      payrollForMonth.filter(
        (row) =>
          row.active_salary_hold && row.active_salary_hold.applied_this_month === false,
      ),
    [payrollForMonth],
  );

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const result = await generatePayroll({ month });
      const count = Number(result?.generated ?? 0);
      const missingSalary = Number(result?.missing_salary_count ?? 0);

      if (count === 0) {
        pushToast({
          message:
            "No payroll rows were created. Import and process attendance for this month, or add base salary on staff profiles.",
          severity: "warning",
        });
      } else {
        const salaryNote =
          missingSalary > 0
            ? ` ${missingSalary} staff have no base salary set (shown as 0).`
            : "";
        pushToast({
          message: `Payroll draft generated for ${count} staff.${salaryNote}`,
          severity: missingSalary > 0 ? "warning" : "success",
        });
      }
      await load(month);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to generate payroll."),
        severity: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async (id) => {
    try {
      await finalizePayroll(id);
      pushToast({ message: "Payroll finalized.", severity: "success" });
      await load();
      await loadMonthStatus(month);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to finalize payroll."),
        severity: "error",
      });
    }
  };

  const openOverrideDialog = (row, bucket) => {
    const note = row.override_notes?.[bucket.field] || "";
    setOverrideDialog({ row, bucket });
    setOverrideValue(
      row[bucket.overrideField] == null
        ? ""
        : formatCommaAmountFromNumber(row[bucket.overrideField]),
    );
    setOverrideReason(note);
  };

  const closeOverrideDialog = () => {
    if (savingOverride) return;
    setOverrideDialog(null);
    setOverrideValue("");
    setOverrideReason("");
  };

  const submitOverride = async ({ clear = false } = {}) => {
    if (!overrideDialog) return;
    const { row, bucket } = overrideDialog;
    const value = clear ? null : parseCommaAmount(overrideValue);
    if (!clear && (!Number.isFinite(value) || value < 0 || !overrideReason.trim())) {
      pushToast({
        message: "Override value and reason are required.",
        severity: "warning",
      });
      return;
    }

    setSavingOverride(true);
    try {
      await updatePayrollOverrides(row.id, {
        [bucket.overrideField]: value,
        override_notes: clear ? {} : { [bucket.field]: overrideReason.trim() },
      });
      pushToast({
        message: clear ? "Override cleared." : "Override saved.",
        severity: "success",
      });
      closeOverrideDialog();
      await load(month);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save override."),
        severity: "error",
      });
    } finally {
      setSavingOverride(false);
    }
  };

  const latestGeneratedMonth = useMemo(() => {
    if (!payrollRows.length) return "-";
    const latest = [...payrollRows].sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
    )[0];
    return latest?.month || "-";
  }, [payrollRows]);

  const toggleExpandRow = (rowId) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  };

  const openTransactions = (sourceType, sourceId, eventDate) => {
    navigate(`${rolePrefix}/finance/transactions`, {
      state: {
        financeHighlight: {
          sourceType,
          sourceId,
          highlightColumn: "reference",
          anchorDate: eventDate,
          targetMonth: month,
        },
        financeFilters: eventDate
          ? {
              date_from: dayjs(eventDate).startOf("month").format("YYYY-MM-DD"),
              date_to: dayjs(eventDate).endOf("month").format("YYYY-MM-DD"),
            }
          : undefined,
      },
    });
  };

  const openPayoutDialog = () => {
    setPayoutForm({
      payment_date: dayjs().format("YYYY-MM-DD"),
      transaction_method:
        transactionMethods.find((method) => method.status === "active") ?? null,
      reference_number: "",
      memo: `Payroll payout — ${month}`,
    });
    setPayoutDialogOpen(true);
  };

  const handleCompletePayout = async () => {
    if (!payoutForm.transaction_method?.id) {
      pushToast({
        message: "Select the bank or cash account used for the transfer.",
        severity: "warning",
      });
      return;
    }

    setCompletingPayout(true);
    try {
      await completePayrollPayout({
        month,
        payment_date: payoutForm.payment_date,
        transaction_method_id: payoutForm.transaction_method.id,
        reference_number: payoutForm.reference_number || undefined,
        memo: payoutForm.memo || undefined,
      });
      pushToast({
        message: "Payroll payout queued in Transactions.",
        severity: "success",
      });
      setPayoutDialogOpen(false);
      await loadMonthStatus(month);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to complete payroll payout."),
        severity: "error",
      });
    } finally {
      setCompletingPayout(false);
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Payroll generation and finalization">
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography variant="h6">Payroll Generation</Typography>
              <Typography variant="body2" color="text.secondary">
                Draft payroll auto-recalculates when attendance/overtime/commission source data changes.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                type="month"
                size="small"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <Button variant="contained" onClick={handleGeneratePayroll} disabled={generating}>
                {generating ? "Generating..." : "Generate Payroll"}
              </Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
            <Chip
              size="small"
              color="info"
              label={`Last Generated Month: ${
                latestGeneratedMonth === "-" ? "—" : formatMonth(latestGeneratedMonth)
              }`}
            />
            <Chip size="small" label={`Rows in ${monthLabel}: ${payrollForMonth.length}`} />
            {hasDraftForMonth ? (
              <Chip size="small" color="warning" variant="outlined" label="Draft payroll exists for this month" />
            ) : null}
          </Stack>
          {missingSalaryRows.length ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {missingSalaryRows.length} draft row(s) have no base salary. Open the staff profile and add
              salary, then generate again to recalculate.
            </Alert>
          ) : null}
        </Card>

        {payrollForMonth.length > 0 ? (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h6">Complete payout</Typography>
                <Typography variant="body2" color="text.secondary">
                  After salaries are transferred outside the system, queue the month total for
                  finance to post in Transactions. Individual staff amounts stay confidential.
                </Typography>
              </Box>
              {canManagePayroll && canCompletePayout ? (
                <Button variant="contained" onClick={openPayoutDialog}>
                  Complete payout
                </Button>
              ) : null}
            </Stack>

            {hasDraftForMonth ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Finalize every payroll row for {monthLabel} before completing payout.
                {Number(monthStatusRow?.draft_count || 0) > 0
                  ? ` ${monthStatusRow.draft_count} row(s) still draft.`
                  : ""}
              </Alert>
            ) : null}

            {!hasDraftForMonth && monthNetTotal <= 0 && monthStatusRow?.hr_status === "finalized" ? (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                No payable amount this month (all staff net pay is 0). Complete payout is not
                required.
              </Alert>
            ) : null}

            {monthStatusLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Loading payout status…
              </Typography>
            ) : monthStatusRow?.hr_status === "payout_queued" ? (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                  <Typography variant="body2">
                    Month total:{" "}
                    <Typography component="span" fontWeight={700}>
                      {formatKyats(monthNetTotal)}
                    </Typography>
                  </Typography>
                  <Typography variant="body2">
                    Accrual:{" "}
                    <Typography
                      component="span"
                      fontWeight={600}
                      color={postingStatusColor(accrualStatus)}
                    >
                      {postingStatusLabel(accrualStatus)}
                    </Typography>
                  </Typography>
                  <Typography variant="body2">
                    Payment:{" "}
                    <Typography
                      component="span"
                      fontWeight={600}
                      color={postingStatusColor(paymentStatus)}
                    >
                      {postingStatusLabel(paymentStatus)}
                    </Typography>
                  </Typography>
                </Stack>

                {canOpenTransactions ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    {["pending", "reversed"].includes(accrualStatus) && accrual?.id ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewOutlinedIcon />}
                        onClick={() =>
                          openTransactions(
                            "payroll_month_accrual",
                            accrual.id,
                            accrual.period_end || accrual.journal_draft_date,
                          )
                        }
                      >
                        Open accrual in Transactions
                      </Button>
                    ) : null}
                    {["pending", "reversed"].includes(paymentStatus) &&
                    payoutPayments[0]?.id ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewOutlinedIcon />}
                        onClick={() =>
                          openTransactions(
                            "payroll_payment",
                            payoutPayments[0].id,
                            payoutPayments[0].payment_date,
                          )
                        }
                      >
                        Open payment in Transactions
                      </Button>
                    ) : null}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Finance will post the accrual and payment from Transactions.
                  </Typography>
                )}
              </Stack>
            ) : canManagePayroll && !hasDraftForMonth && monthNetTotal > 0 ? (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                All staff rows are finalized. Transfer salaries, then click Complete payout to
                queue the month total.
              </Alert>
            ) : null}
          </Card>
        ) : null}

        {payrollForMonth.length > 0 ? (
          <Alert severity="info">
            <Typography variant="body2" component="div">
              <strong>Bonuses, fines, and salary holds</strong> are managed on{" "}
              <Link to="/hr/variable-pay">Variable Pay</Link>,{" "}
              <Link to="/hr/deductions">Deductions</Link>, and{" "}
              <Link to="/hr/salary-holds">Salary holds</Link> — not on this page. Add or
              edit those lines <strong>before</strong> you finalize payroll, then click{" "}
              <em>Generate Payroll</em> again to refresh draft totals. After finalize,
              those entries and this payroll table are locked.
            </Typography>
          </Alert>
        ) : null}

        {holdsMissingApply.length > 0 ? (
          <Alert severity="warning">
            <Typography variant="body2" component="div">
              {holdsMissingApply.length} staff on salary hold still need a deduction applied
              for {monthLabel}:{" "}
              {holdsMissingApply.map((row, index) => (
                <span key={row.id}>
                  {index > 0 ? ", " : ""}
                  <strong>{row.staff?.name || `Staff #${row.staff_id}`}</strong>
                </span>
              ))}
              . Open{" "}
              <Link to="/hr/salary-holds">Salary holds</Link> → Apply to month, then
              regenerate payroll.
            </Typography>
          </Alert>
        ) : null}

        {!payrollForMonth.length ? (
          <PayrollEmptyState
            monthLabel={monthLabel}
            hasAnyPayroll={hasAnyPayroll}
            latestGeneratedMonth={formatMonth(latestGeneratedMonth)}
            onGenerate={handleGeneratePayroll}
            generating={generating}
          />
        ) : (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Click a row to expand earnings, deductions, and calculation detail for that staff member.
            </Typography>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={PAYROLL_TABLE_SX}>
                <colgroup>
                  <col style={{ width: PAYROLL_COLUMN_WIDTHS.expand }} />
                  <col style={{ width: PAYROLL_COLUMN_WIDTHS.staff }} />
                  {PAYROLL_BUCKETS.map((bucket) => (
                    <col key={bucket.field} style={{ width: PAYROLL_COLUMN_WIDTHS.amount }} />
                  ))}
                  <col style={{ width: PAYROLL_COLUMN_WIDTHS.netPay }} />
                  <col style={{ width: PAYROLL_COLUMN_WIDTHS.status }} />
                  <col style={{ width: PAYROLL_COLUMN_WIDTHS.action }} />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: PAYROLL_COLUMN_WIDTHS.expand, px: 0.5 }} />
                    <TableCell sx={{ width: PAYROLL_COLUMN_WIDTHS.staff }}>Staff</TableCell>
                    {PAYROLL_BUCKETS.map((bucket) => (
                      <TableCell
                        key={bucket.field}
                        align="right"
                        sx={{ width: PAYROLL_COLUMN_WIDTHS.amount }}
                      >
                        {bucket.label}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ width: PAYROLL_COLUMN_WIDTHS.netPay }}>
                      Net Pay
                    </TableCell>
                    <TableCell sx={{ width: PAYROLL_COLUMN_WIDTHS.status }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: PAYROLL_COLUMN_WIDTHS.action }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrollForMonth.map((row) => {
                    const isExpanded = expandedRowId === row.id;

                    return (
                      <Fragment key={row.id}>
                        <TableRow
                          hover
                          onClick={() => toggleExpandRow(row.id)}
                          sx={{
                            cursor: "pointer",
                            "& .MuiTableCell-root": isExpanded ? { borderBottom: 0 } : undefined,
                          }}
                        >
                          <TableCell sx={{ width: PAYROLL_COLUMN_WIDTHS.expand, px: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? "Collapse payroll detail" : "Expand payroll detail"}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpandRow(row.id);
                              }}
                              sx={{
                                transform: isExpanded ? "rotate(90deg)" : "none",
                                transition: "transform 0.15s",
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell
                            sx={{
                              width: PAYROLL_COLUMN_WIDTHS.staff,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {row.staff?.name || "-"}
                              </Typography>
                              {row.active_salary_hold ? (
                                <Tooltip
                                  title={
                                    row.active_salary_hold.hold_mode === "fixed_monthly"
                                      ? `Salary hold: ${formatKyats(row.active_salary_hold.monthly_amount)} / month — ${row.active_salary_hold.reason}`
                                      : `Salary hold: full net — ${row.active_salary_hold.reason}`
                                  }
                                >
                                  <Chip
                                    size="small"
                                    color="warning"
                                    label="On hold"
                                    sx={{ flexShrink: 0 }}
                                  />
                                </Tooltip>
                              ) : null}
                            </Stack>
                          </TableCell>
                          {PAYROLL_BUCKETS.map((bucket) => (
                            <PayrollAmountCell
                              key={bucket.field}
                              row={row}
                              bucket={bucket}
                              canEdit={canManagePayroll && row.status !== "finalized"}
                              onEdit={openOverrideDialog}
                            />
                          ))}
                          <TableCell align="right" sx={{ width: PAYROLL_COLUMN_WIDTHS.netPay }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                            >
                              {formatKyats(row.total_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: PAYROLL_COLUMN_WIDTHS.status }}>
                            <Chip
                              size="small"
                              color={row.status === "finalized" ? "success" : "warning"}
                              label={row.status === "finalized" ? "Finalized" : "Draft"}
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ width: PAYROLL_COLUMN_WIDTHS.action }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {row.status !== "finalized" ? (
                              <Button size="small" onClick={() => handleFinalize(row.id)}>
                                Finalize
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Locked
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={PAYROLL_TABLE_COLUMN_COUNT}
                              sx={{ py: 0, px: 1.5, borderBottom: 0, width: "100%" }}
                            >
                              <Box
                                sx={{
                                  py: 1.5,
                                  px: { xs: 1.25, sm: 2 },
                                  mb: 0.5,
                                  borderRadius: 1.5,
                                  border: 1,
                                  borderColor: "divider",
                                  bgcolor: "rgba(255,255,255,0.04)",
                                  width: "100%",
                                  minWidth: 0,
                                  overflow: "auto",
                                }}
                              >
                                <PayrollBreakdownPanel row={row} />
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Stack>
      <PayrollOverrideDialog
        open={Boolean(overrideDialog)}
        row={overrideDialog?.row}
        bucket={overrideDialog?.bucket}
        value={overrideValue}
        reason={overrideReason}
        saving={savingOverride}
        onValueChange={setOverrideValue}
        onReasonChange={setOverrideReason}
        onClose={closeOverrideDialog}
        onSave={() => submitOverride()}
        onClear={() => submitOverride({ clear: true })}
      />

      <Dialog
        open={payoutDialogOpen}
        onClose={() => !completingPayout && setPayoutDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Complete payout</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Month total to queue: {formatKyats(monthNetTotal)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirm salaries were already transferred outside DermaFairy. This creates pending
              accrual and payment entries for finance to post.
            </Typography>
            <TextField
              size="small"
              type="date"
              label="Payment date"
              value={payoutForm.payment_date}
              onChange={(event) =>
                setPayoutForm((current) => ({
                  ...current,
                  payment_date: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <Autocomplete
              options={transactionMethods.filter((method) => method.status === "active")}
              value={payoutForm.transaction_method}
              onChange={(_event, value) =>
                setPayoutForm((current) => ({ ...current, transaction_method: value }))
              }
              getOptionLabel={(option) => option?.name || ""}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Transfer account" />
              )}
            />
            <TextField
              size="small"
              label="Reference"
              value={payoutForm.reference_number}
              onChange={(event) =>
                setPayoutForm((current) => ({
                  ...current,
                  reference_number: event.target.value,
                }))
              }
            />
            <TextField
              size="small"
              label="Memo"
              value={payoutForm.memo}
              onChange={(event) =>
                setPayoutForm((current) => ({ ...current, memo: event.target.value }))
              }
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayoutDialogOpen(false)} disabled={completingPayout}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCompletePayout}
            disabled={completingPayout}
          >
            {completingPayout ? "Queueing…" : "Complete payout"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function PayrollAmountCell({ row, bucket, canEdit, onEdit }) {
  const autoValue = Number(row[bucket.field] || 0);
  const overrideValue = row[bucket.overrideField];
  const hasOverride = overrideValue !== null && overrideValue !== undefined;
  const effectiveValue = hasOverride ? Number(overrideValue) : autoValue;
  const reason = row.override_notes?.[bucket.field] || "No reason recorded.";
  const editor = row.overrider?.name ? ` by ${row.overrider.name}` : "";

  return (
    <TableCell
      align="right"
      sx={{
        width: PAYROLL_COLUMN_WIDTHS.amount,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        justifyContent="flex-end"
        sx={{ minWidth: 0 }}
      >
        <Tooltip
          title={
            hasOverride
              ? `Auto: ${formatKyats(autoValue)}. Manual: ${formatKyats(effectiveValue)}. Reason: ${reason}${editor}.`
              : ""
          }
          disableHoverListener={!hasOverride}
        >
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={hasOverride ? 700 : 400}
              noWrap
              sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {formatKyats(effectiveValue)}
            </Typography>
            {hasOverride ? <Chip size="small" color="info" label="Manual" /> : null}
          </Stack>
        </Tooltip>
        {canEdit ? (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(row, bucket);
            }}
            aria-label={`Edit ${bucket.label}`}
          >
            <EditOutlinedIcon fontSize="inherit" />
          </IconButton>
        ) : null}
      </Stack>
    </TableCell>
  );
}

function PayrollOverrideDialog({
  open,
  row,
  bucket,
  value,
  reason,
  saving,
  onValueChange,
  onReasonChange,
  onClose,
  onSave,
  onClear,
}) {
  if (!bucket || !row) return null;

  const autoValue = Number(row[bucket.field] || 0);
  const hasOverride = row[bucket.overrideField] !== null && row[bucket.overrideField] !== undefined;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Override {bucket.label}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {row.staff?.name || "Staff"} · {formatMonth(row.month)}
          </Typography>
          <TextField
            size="small"
            label="Auto value"
            value={formatKyats(autoValue)}
            InputProps={{ readOnly: true }}
          />
          <TextField
            size="small"
            label="Override value"
            value={value}
            inputMode="decimal"
            placeholder="Leave blank and clear to use auto value"
            onChange={(event) => onValueChange(sanitizeCommaAmountInput(event.target.value))}
          />
          <TextField
            size="small"
            label="Reason"
            value={reason}
            multiline
            minRows={2}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onClear} disabled={saving || !hasOverride}>
          Clear override
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save override"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PayrollEmptyState({
  monthLabel,
  hasAnyPayroll,
  latestGeneratedMonth,
  onGenerate,
  generating,
}) {
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
      <RequestQuoteOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {hasAnyPayroll
          ? `No payroll draft for ${monthLabel}`
          : "No payroll generated yet"}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        This page runs monthly payroll — it combines base salary, overtime,
        commission, transport allowance, and adjustments, applies absence
        deductions, and produces a net pay total for each staff member.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Prepare source data:</strong> Import and process attendance on{" "}
          <Link to="/hr/daily/attendance">Attendance</Link>, log overtime and{" "}
          <Link to="/hr/compensation">compensation</Link> entries, and set base
          salary on each <Link to="/hr/staff">staff profile</Link>.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Generate draft:</strong> Select the payroll month (match the
          attendance import period) and click <em>Generate Payroll</em>. One draft
          row is created per eligible staff member.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Review &amp; adjust:</strong> Check totals in the table. For one-off
          bonuses or fines, use <Link to="/hr/variable-pay">Variable Pay</Link> or{" "}
          <Link to="/hr/deductions">Deductions</Link>, then regenerate draft payroll.
          Use row overrides (pencil icon) for manual corrections on draft rows only.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Finalize:</strong> When totals are correct, finalize each row to
          lock pay for the month. Staff can then view their payslip; compensation
          and attendance for that month cannot be changed.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Complete payout:</strong> After bank transfer, queue the month total for
          finance posting in Transactions.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Auto-recalculation:</strong> Draft payroll updates when you
          regenerate after attendance, overtime, or compensation changes. Finalized
          records stay locked.
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="center"
        sx={{ mb: 1 }}
      >
        <Button variant="contained" onClick={onGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate payroll"}
        </Button>
        <Button variant="outlined" component={Link} to="/hr/daily/attendance">
          Go to attendance
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        {hasAnyPayroll
          ? `Payroll exists for other months (latest: ${latestGeneratedMonth}). Select that month above or generate for ${monthLabel}.`
          : "Start after month-end attendance is imported, or generate now to preview drafts — staff without a base salary appear with 0 until their profile is updated."}
      </Typography>
    </Box>
  );
}
