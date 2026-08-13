import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Alert,
  TextField,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../components/common/LoadingIndicator";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../components/common/TableColumnFilterHeader";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../components/common/CollapsibleFilters";
import MedicationIcon from "@mui/icons-material/Medication";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  getInvoiceDetailPath,
  getInvoicesListPath,
  getUserLiveBoardPath,
  getWorkspaceUrlPrefix,
} from "../utils/workspaceRoutes";
import { generatePaymentDraft, getPayments } from "../services/paymentService";
import { resolveApiError } from "../services/apiClient";
import useAuthStore from "../stores/authStore";
import { hasPermission } from "../utils/accessUtils";
import useToastStore from "../stores/toastStore";
import { formatKyats } from "../utils/formatKyats";
import { resolvePaymentCustomerName } from "../utils/paymentDetailUtils";
import useSettingsStore from "../stores/settingsStore";
import StandalonePrescriptionDialog from "../components/prescription/StandalonePrescriptionDialog";
import useTableColumnFilters from "../hooks/useTableColumnFilters";

const EMPTY_STEPS = [
  {
    icon: ViewKanbanOutlinedIcon,
    title: "Check in the patient",
    body: "When a visit starts on the Live Board, the clinic can attach services and packages to that visit.",
  },
  {
    icon: ReceiptLongOutlinedIcon,
    title: "Generate the invoice",
    body: "Completing visit billing creates a draft or issued invoice with line items, taxes, and payment status.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Collect payment",
    body: "Record cash, transfer, or card here — posted payments flow to finance transactions and the ledger.",
  },
];

dayjs.extend(isToday);

const formatMoney = (value) => formatKyats(Number(value || 0));
const DRAFTABLE_PAYMENT_STATUSES = new Set(["draft", "unpaid", "issued"]);
const formatInvoiceNumberPreview = (nextNumber) =>
  `INV-${String(Math.max(1, Number(nextNumber || 1))).padStart(6, "0")}`;

function canGenerateDraftForPayment(payment) {
  return DRAFTABLE_PAYMENT_STATUSES.has(
    String(payment?.status || "").toLowerCase(),
  );
}

function paymentStatusChip(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid") return { label: "Paid", color: "success" };
  if (normalized === "issued") return { label: "Issued", color: "info" };
  if (normalized === "draft") return { label: "Draft", color: "warning" };
  if (normalized === "void") return { label: "Void", color: "default" };
  if (normalized === "unpaid") return { label: "Unpaid", color: "warning" };
  return { label: normalized || "Unknown", color: "default" };
}

function paymentPatientLabel(payment) {
  return resolvePaymentCustomerName(payment) || "—";
}

function paymentStatusFilterLabel(payment) {
  return paymentStatusChip(payment.status).label;
}

const PAYMENT_COLUMN_FILTERS = [
  { key: "patient", getValue: (row) => paymentPatientLabel(row) },
  { key: "status", getValue: (row) => paymentStatusFilterLabel(row) },
];

const emptyFilters = {
  status: "",
  method: "",
  patient_query: "",
  invoice_query: "",
  from_date: "",
  to_date: "",
  min_amount: "",
  max_amount: "",
};

function invoiceTimestamp(p) {
  return p?.paid_at || p?.created_at;
}

function groupKeyForPayment(p) {
  return dayjs(invoiceTimestamp(p)).format("YYYY-MM-DD");
}

function sortGroupKeys(keys) {
  const today = dayjs().format("YYYY-MM-DD");
  return [...keys].sort((a, b) => {
    if (a === today) return -1;
    if (b === today) return 1;
    return b.localeCompare(a);
  });
}

function labelForGroupKey(key) {
  const today = dayjs().format("YYYY-MM-DD");
  if (key === today) return "Today";
  return dayjs(key).format("D MMM YYYY");
}

export default function PaymentsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const { pushToast } = useToastStore();
  const { settings, fetchSettings } = useSettingsStore();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftingPaymentId, setDraftingPaymentId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [rxDialogOpen, setRxDialogOpen] = useState(false);

  const {
    filteredRows: filteredPayments,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
  } = useTableColumnFilters(payments, { columns: PAYMENT_COLUMN_FILTERS });

  const buildQueryParams = useCallback((f) => {
    const params = {};
    if (f.status) params.status = f.status;
    if (f.method.trim()) params.method = f.method.trim();
    if (f.patient_query.trim()) params.patient_query = f.patient_query.trim();
    if (f.invoice_query.trim()) params.invoice_query = f.invoice_query.trim();
    if (f.from_date) params.from_date = f.from_date;
    if (f.to_date) params.to_date = f.to_date;
    if (f.min_amount !== "" && f.min_amount != null)
      params.min_amount = f.min_amount;
    if (f.max_amount !== "" && f.max_amount != null)
      params.max_amount = f.max_amount;
    return params;
  }, []);

  const load = async (filterState = appliedFilters) => {
    setLoading(true);
    setError("");
    try {
      const params = buildQueryParams(filterState);
      const data = await getPayments(params);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load payments."));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const canEditPayments = hasPermission(user, "payments.manage");

  const groupedPayments = useMemo(() => {
    const map = {};
    filteredPayments.forEach((p) => {
      const k = groupKeyForPayment(p);
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return map;
  }, [filteredPayments]);

  const sortedGroupKeys = useMemo(
    () => sortGroupKeys(Object.keys(groupedPayments)),
    [groupedPayments],
  );

  const periodTotal = useMemo(
    () => filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [filteredPayments],
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const f = appliedFilters;
    if (f.status) chips.push({ key: "status", label: `Status: ${f.status}` });
    if (f.method.trim())
      chips.push({ key: "method", label: `Method: ${f.method}` });
    if (f.patient_query.trim())
      chips.push({
        key: "patient_query",
        label: `Patient: ${f.patient_query}`,
      });
    if (f.invoice_query.trim())
      chips.push({
        key: "invoice_query",
        label: `Invoice: ${f.invoice_query}`,
      });
    if (f.from_date)
      chips.push({ key: "from_date", label: `From: ${f.from_date}` });
    if (f.to_date) chips.push({ key: "to_date", label: `To: ${f.to_date}` });
    if (f.min_amount !== "" && f.min_amount != null)
      chips.push({ key: "min_amount", label: `Min: ${f.min_amount}` });
    if (f.max_amount !== "" && f.max_amount != null)
      chips.push({ key: "max_amount", label: `Max: ${f.max_amount}` });
    return chips;
  }, [appliedFilters]);

  const clearFilterKey = (key) => {
    const next = { ...appliedFilters, [key]: emptyFilters[key] };
    setAppliedFilters(next);
    setDraftFilters((d) => ({ ...d, [key]: emptyFilters[key] }));
    load(next);
  };

  const clearAllFilters = () => {
    resetColumnFilters();
    setAppliedFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    load(emptyFilters);
  };

  const applyFilters = () => {
    resetColumnFilters();
    setAppliedFilters(draftFilters);
    load(draftFilters);
  };

  const handleGenerateDraft = async (payment) => {
    if (!payment?.visit_id || draftingPaymentId) return;
    try {
      setDraftingPaymentId(payment.id);
      const updated = await generatePaymentDraft(payment.visit_id);
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? updated : p)),
      );
      pushToast({ message: "Invoice draft generated.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to generate invoice draft."),
        severity: "error",
      });
    } finally {
      setDraftingPaymentId(null);
    }
  };

  const handlePaymentRowClick = async (payment) => {
    if (
      canEditPayments &&
      canGenerateDraftForPayment(payment) &&
      payment?.visit_id &&
      draftingPaymentId == null
    ) {
      await handleGenerateDraft(payment);
    }
    navigate(getInvoiceDetailPath(workspacePrefix, payment.id));
  };

  const setDraft = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasStripFilters = activeFilterChips.length > 0;
  const showGuidedEmpty = !loading && payments.length === 0 && !hasStripFilters;
  const showListEmpty =
    !loading && (payments.length === 0 || filteredPayments.length === 0);
  const emptyListMessage = "No payments match your filters.";

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Invoices{" "}
              <Chip
                variant="outlined"
                color="primary"
                label={`Next invoice: ${formatInvoiceNumberPreview(settings?.invoice_next_number)}`}
              />
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
            >
              Patient invoices and payment status
            </Typography>
          </Box>
          <Stack
            direction={"row"}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <CollapsibleFiltersToggle
              open={filtersOpen}
              onToggle={setFiltersOpen}
              activeCount={activeFilterChips.length}
            />
            {canEditPayments && payments.length > 0 ? (
              <>
                <Tooltip title="Create an invoice for prescription medicines only (no visit required)">
                  <Button
                    variant="outlined"
                    startIcon={<MedicationIcon />}
                    onClick={() => setRxDialogOpen(true)}
                  >
                    Prescription Invoice
                  </Button>
                </Tooltip>
                <Tooltip title="Start a new blank invoice draft — add customer, lines, and payment">
                  <Button
                    variant="contained"
                    onClick={() =>
                      navigate(getInvoiceDetailPath(workspacePrefix, "new"))
                    }
                  >
                    Create Invoice
                  </Button>
                </Tooltip>
              </>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearAllFilters}
        applyLabel="Apply filters"
        clearLabel="Clear all"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          <TextField
            select
            fullWidth
            label="Status"
            size="small"
            value={draftFilters.status}
            onChange={(e) => setDraft("status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Payment method"
            size="small"
            value={draftFilters.method}
            onChange={(e) => setDraft("method", e.target.value)}
          />
          <TextField
            fullWidth
            label="Patient search"
            size="small"
            value={draftFilters.patient_query}
            onChange={(e) => setDraft("patient_query", e.target.value)}
          />
          <TextField
            fullWidth
            label="Invoice # search"
            size="small"
            value={draftFilters.invoice_query}
            onChange={(e) => setDraft("invoice_query", e.target.value)}
          />
          <TextField
            fullWidth
            label="From date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.from_date}
            onChange={(e) => setDraft("from_date", e.target.value)}
          />
          <TextField
            fullWidth
            label="To date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.to_date}
            onChange={(e) => setDraft("to_date", e.target.value)}
          />
          <TextField
            fullWidth
            label="Min amount"
            type="number"
            size="small"
            value={draftFilters.min_amount}
            onChange={(e) => setDraft("min_amount", e.target.value)}
          />
          <TextField
            fullWidth
            label="Max amount"
            type="number"
            size="small"
            value={draftFilters.max_amount}
            onChange={(e) => setDraft("max_amount", e.target.value)}
          />
        </Box>
      </CollapsibleFiltersPanel>

      {activeFilterChips.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          sx={{ mb: 2 }}
          alignItems="center"
        >
          <Typography variant="caption" color="text.secondary">
            Active:
          </Typography>
          {activeFilterChips.map((c) => (
            <Chip
              key={c.key}
              size="small"
              label={c.label}
              onDelete={() => clearFilterKey(c.key)}
            />
          ))}
          <Button size="small" onClick={clearAllFilters}>
            Clear all
          </Button>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {showGuidedEmpty ? (
        <GuidedEmptyState
          icon={ReceiptLongOutlinedIcon}
          title="No invoices yet"
          description="Invoices appear here after visits are billed or you create a draft manually. Start from the Live Board for visit-based billing, or create a blank invoice for walk-in sales."
          steps={EMPTY_STEPS}
          primaryAction={
            canEditPayments
              ? {
                  label: "Create invoice",
                  onClick: () =>
                    navigate(getInvoiceDetailPath(workspacePrefix, "new")),
                }
              : null
          }
          footer={
            <>
              Visit billing usually starts on{" "}
              <Typography
                component={RouterLink}
                to={getUserLiveBoardPath(user)}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Live Board
              </Typography>
              .
            </>
          }
        />
      ) : (
        <>
          <Box
            sx={{
              display: { xs: "block", sm: "none" },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: "none",
              }}
            >
              {loading && payments.length === 0 ? (
                <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                  <LoadingIndicator size={112} />
                </Box>
              ) : null}
              {!loading && showListEmpty ? (
                <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    {emptyListMessage}
                  </Typography>
                </Box>
              ) : null}
              {!loading &&
                !showListEmpty &&
                sortedGroupKeys.map((dateKey, idx) => (
                  <Box key={dateKey}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.common.white, 0.04)
                            : alpha(theme.palette.common.black, 0.04),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        borderTop:
                          idx > 0
                            ? `2px solid ${theme.palette.divider}`
                            : undefined,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color="text.secondary"
                      >
                        {labelForGroupKey(dateKey)}
                      </Typography>
                    </Box>
                    <Stack spacing={1} sx={{ p: 1 }}>
                      {groupedPayments[dateKey].map((p) => {
                        const chip = paymentStatusChip(p.status);
                        return (
                          <Paper
                            key={p.id}
                            variant="outlined"
                            onClick={() => handlePaymentRowClick(p)}
                            sx={{
                              p: 1.25,
                              borderRadius: 2,
                              cursor: "pointer",
                              bgcolor: "background.paper",
                            }}
                          >
                            <Stack spacing={1}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {p.invoice_number || "Draft invoice"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {paymentPatientLabel(p)}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={chip.label}
                                  color={chip.color}
                                  size="small"
                                  sx={{
                                    fontSize: 11,
                                    height: 22,
                                    flexShrink: 0,
                                  }}
                                />
                              </Stack>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                spacing={1}
                              >
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Amount
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700}>
                                    {formatMoney(p.amount)}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  textAlign="right"
                                >
                                  {p.paid_at
                                    ? dayjs(p.paid_at).format(
                                        "D MMM YYYY, HH:mm",
                                      )
                                    : dayjs(p.created_at).format(
                                        "D MMM YYYY, HH:mm",
                                      )}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                ))}
              {loading && payments.length > 0 ? (
                <Box sx={{ py: 1, textAlign: "center" }}>
                  <LoadingIndicator size={22} />
                </Box>
              ) : null}
            </Paper>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              display: { xs: "none", sm: "block" },
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "none",
              borderRadius: 2,
              maxWidth: "100%",
              overflowX: "auto",
            }}
          >
            {loading && payments.length === 0 ? (
              <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                <LoadingIndicator size={112} />
              </Box>
            ) : null}
            {!loading && showListEmpty ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {emptyListMessage}
                </Typography>
              </Box>
            ) : null}
            {!loading && !showListEmpty && filteredPayments.length > 0 ? (
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? alpha(theme.palette.common.white, 0.02)
                          : alpha(theme.palette.common.black, 0.02),
                    }}
                  >
                    <TableColumnFilterHeader
                      label="Patient"
                      options={columnOptions.patient ?? []}
                      selectedValues={getColumnSelectionArray("patient")}
                      onApply={(values) =>
                        setColumnSelection("patient", values)
                      }
                      onClear={() => clearColumnSelection("patient")}
                      cellSx={{ fontWeight: 600, width: "28%" }}
                    />
                    <TableCell sx={{ fontWeight: 600, width: "13%" }}>
                      Amount
                    </TableCell>
                    <TableColumnFilterHeader
                      label="Status"
                      options={columnOptions.status ?? []}
                      selectedValues={getColumnSelectionArray("status")}
                      onApply={(values) => setColumnSelection("status", values)}
                      onClear={() => clearColumnSelection("status")}
                      cellSx={{ fontWeight: 600, width: "13%" }}
                    />
                    <TableCell sx={{ fontWeight: 600, width: "26%" }}>
                      Date
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, width: "20%" }}
                      align="right"
                    >
                      Invoice #
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedGroupKeys.flatMap((dateKey, idx) => {
                    const groupLabelRow = (
                      <TableRow key={`group-${dateKey}`}>
                        <TableCell
                          colSpan={5}
                          sx={{
                            px: 2,
                            py: 1,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            borderTop:
                              idx > 0
                                ? `2px solid ${theme.palette.divider}`
                                : undefined,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? alpha(theme.palette.common.white, 0.04)
                                : alpha(theme.palette.common.black, 0.04),
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            color="text.secondary"
                          >
                            {labelForGroupKey(dateKey)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                    const dataRows = groupedPayments[dateKey].map((p) => (
                      <TableRow
                        key={p.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => handlePaymentRowClick(p)}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={paymentPatientLabel(p)}
                        >
                          {paymentPatientLabel(p)}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatMoney(p.amount)}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {(() => {
                            const chip = paymentStatusChip(p.status);
                            return (
                              <Chip
                                label={chip.label}
                                color={chip.color}
                                size="small"
                                sx={{ fontSize: 11, height: 20 }}
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: 13,
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.paid_at
                            ? dayjs(p.paid_at).format("D MMM YYYY, HH:mm")
                            : dayjs(p.created_at).format("D MMM YYYY, HH:mm")}
                        </TableCell>
                        <TableCell
                          align="right"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.invoice_number || (
                            <Typography
                              component="span"
                              color="text.secondary"
                              variant="body2"
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                    return [groupLabelRow, ...dataRows];
                  })}
                  {filteredPayments.length > 0 ? (
                    <TableRow
                      sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}
                    >
                      <TableCell
                        colSpan={1}
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {formatMoney(periodTotal)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : null}
            {loading && payments.length > 0 ? (
              <Box sx={{ py: 1, textAlign: "center" }}>
                <LoadingIndicator size={22} />
              </Box>
            ) : null}
          </TableContainer>
        </>
      )}

      <StandalonePrescriptionDialog
        open={rxDialogOpen}
        onClose={() => setRxDialogOpen(false)}
        onCreated={(result) => {
          if (result?.payment?.id) {
            navigate(getInvoiceDetailPath(workspacePrefix, result.payment.id));
          } else {
            pushToast({
              message: "Prescription created.",
              severity: "success",
            });
            load(appliedFilters);
          }
        }}
      />
    </Box>
  );
}
