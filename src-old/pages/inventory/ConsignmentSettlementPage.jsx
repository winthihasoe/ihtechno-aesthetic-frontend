import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
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
import { formatKyats } from "../../utils/formatKyats";
import { hasPermission } from "../../utils/accessUtils";
import useToastStore from "../../stores/toastStore";
import useAuthStore from "../../stores/authStore";
import { getConsignmentSettlement, getSuppliers } from "./inventoryService";

export default function ConsignmentSettlementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const canManagePayables = hasPermission(user, "payments.manage");
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState(
    () => searchParams.get("supplier_id") || "",
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get("date_from") || "",
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get("date_to") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSuppliers()
      .then((s) => setSuppliers(Array.isArray(s) ? s : []))
      .catch(() => setSuppliers([]));
  }, []);

  const shouldAutoRun = useRef(Boolean(searchParams.get("supplier_id")));

  const run = useCallback(async () => {
    if (!supplierId) {
      setError("Select a supplier.");
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getConsignmentSettlement({
        supplier_id: supplierId,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setData(res);
      const next = new URLSearchParams();
      next.set("supplier_id", supplierId);
      if (dateFrom) next.set("date_from", dateFrom);
      if (dateTo) next.set("date_to", dateTo);
      setSearchParams(next, { replace: true });
    } catch {
      setError("Could not calculate settlement.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [supplierId, dateFrom, dateTo, setSearchParams]);

  useEffect(() => {
    if (!shouldAutoRun.current) return;
    shouldAutoRun.current = false;
    if (supplierId) run();
  }, [supplierId, run]);

  const lines = data?.lines ?? [];
  const supplierName = data?.supplier?.name ?? "—";
  const ps = data?.payment_summary;

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );

  const settlementAmount = Number(data?.summary?.amount ?? 0);

  const openPayablesList = () => {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier_id", String(supplierId));
    navigate(
      {
        pathname: "../../transactions/payables",
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { relative: "path" },
    );
  };

  const goRecordSupplierPayable = () => {
    if (!supplierId || !data?.summary || lines.length === 0) return;
    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) return;

    if (!dateFrom.trim() || !dateTo.trim()) {
      pushToast({
        message:
          "Set both Usage from and Usage to dates before posting to payables — that locks the settlement period so duplicate ranges are blocked.",
        severity: "warning",
      });
      return;
    }

    const params = new URLSearchParams({
      from: "consignment",
      supplier_id: String(supplierId),
      amount: String(settlementAmount),
    });
    const qUsed = data.summary.quantity_used;
    if (qUsed !== undefined && qUsed !== null && String(qUsed).trim() !== "") {
      params.set("qty", String(qUsed));
    }
    if (data.date_from) params.set("df", String(data.date_from).slice(0, 10));
    if (data.date_to) params.set("dt", String(data.date_to).slice(0, 10));

    navigate(
      {
        pathname: "../../transactions/payables",
        search: `?${params.toString()}`,
      },
      { relative: "path" },
    );
  };

  const showPrefillNewPayable =
    canManagePayables &&
    Boolean(dateFrom.trim() && dateTo.trim()) &&
    lines.length > 0 &&
    settlementAmount > 0 &&
    ps &&
    !ps.blocks_new_payable;

  const showOverlapUnpaid = Boolean(
    ps?.has_usage_window &&
    ps.blocks_new_payable &&
    !ps.is_fully_paid_against_payables,
  );

  const showFullyPaidNotice =
    ps?.has_usage_window &&
    ps.blocks_new_payable &&
    ps.is_fully_paid_against_payables;

  const showBillingInfo =
    lines.length > 0 &&
    settlementAmount > 0 &&
    !showFullyPaidNotice &&
    !showOverlapUnpaid;

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
        <IconButton
          aria-label="Back to consignment report"
          onClick={() =>
            navigate("../consignment-report", { relative: "path" })
          }
          sx={{ mt: -0.5 }}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>
            Consignment settlement
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Month-end payable summary from consignment usage for one supplier by
            cost on file.
          </Typography>
        </Box>
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 2, mt: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "flex-end" }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            select
            required
            size="small"
            label="Supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            sx={{
              flex: { sm: "0 0 auto" },
              width: { xs: "100%", sm: 280 },
              minWidth: { sm: 280 },
            }}
          >
            <MenuItem value="">Select supplier…</MenuItem>
            {sortedSuppliers.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: { xs: "100%", sm: "auto" },
              flex: { sm: "0 1 auto" },
            }}
          >
            <TextField
              size="small"
              type="date"
              label="Usage from"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              sx={{
                flex: { xs: 1, sm: "0 0 160px" },
                minWidth: 0,
              }}
            />
            <TextField
              size="small"
              type="date"
              label="Usage to"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              sx={{
                flex: { xs: 1, sm: "0 0 160px" },
                minWidth: 0,
              }}
            />
          </Stack>
          <Button
            variant="contained"
            onClick={run}
            disabled={loading}
            sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
          >
            {loading ? "Calculating…" : "Calculate"}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      )}

      {data && !loading && (
        <>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              {supplierName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.date_from || data.date_to
                ? `Usage dated ${data.date_from ? dayjs(data.date_from).format("DD MMM YYYY") : "…"} → ${data.date_to ? dayjs(data.date_to).format("DD MMM YYYY") : "…"}`
                : "All dates"}
            </Typography>
            <Stack
              direction="row"
              spacing={4}
              sx={{ mt: 2 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Quantity used
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {data.summary?.quantity_used ?? 0}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                >
                  Amount payable (at unit cost)
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {formatKyats(data.summary?.amount ?? 0)}
                </Typography>
              </Box>
              {ps?.has_usage_window ? (
                <>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                    >
                      On payables (overlapping period)
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {formatKyats(ps.totals?.total_amount ?? 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                    >
                      Paid on those payables
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {formatKyats(ps.totals?.paid_amount ?? 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                    >
                      Balance remaining
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {formatKyats(ps.totals?.balance ?? 0)}
                    </Typography>
                  </Box>
                </>
              ) : null}
            </Stack>

            {ps && !ps.has_usage_window ? (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                {ps.message}
              </Alert>
            ) : null}

            {showFullyPaidNotice ? (
              <Alert severity="success" variant="contained" sx={{ mt: 2 }}>
                Consignment usage for this date range is already on a supplier
                payable and fully paid. Creating another payable for an
                overlapping period is blocked; open payables if you need the
                receipt.
                {canManagePayables ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ReceiptLongIcon />}
                      onClick={openPayablesList}
                    >
                      Open supplier payables
                    </Button>
                  </Box>
                ) : null}
              </Alert>
            ) : null}

            {ps?.has_usage_window &&
            ps.blocks_new_payable &&
            !ps.is_fully_paid_against_payables ? (
              <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                A supplier payable already overlaps this usage window. You
                cannot post a second one for the same supplier and overlapping
                dates; record the remaining payment on that payable instead.
                {canManagePayables ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ReceiptLongIcon />}
                      onClick={openPayablesList}
                    >
                      Open supplier payables
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Ask someone with payable permissions to complete payment on
                    the existing consignment payable.
                  </Typography>
                )}
              </Alert>
            ) : null}

            {showBillingInfo ? (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                This total is a billing summary only. To record it under
                Transactions payables and pay it there, use the button below.
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Fill <strong>Usage from</strong> and <strong>Usage to</strong>{" "}
                  before posting — the saved payable stores that inclusive range
                  and the system blocks overlapping ranges for the same supplier
                  (void a mistaken payable first if needed).
                </Typography>
                {showPrefillNewPayable ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ReceiptLongIcon />}
                      onClick={goRecordSupplierPayable}
                    >
                      Open supplier payables (prefilled)
                    </Button>
                  </Box>
                ) : null}
                {canManagePayables && (!dateFrom.trim() || !dateTo.trim()) ? (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1 }}
                    color="text.secondary"
                  >
                    Set both usage dates to enable the prefilled payables
                    shortcut.
                  </Typography>
                ) : null}
                {!canManagePayables ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Ask a user with supplier payable permissions to create one
                    matching this amount and supplier.
                  </Typography>
                ) : null}
              </Alert>
            ) : null}
          </Paper>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Used (use unit)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Cost / use unit
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No consignment usage for this supplier in the selected
                        range.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((row) => (
                    <TableRow key={`${row.product_id}-${row.batch_id}`} hover>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {row.product_name ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.batch_number ?? `Batch #${row.batch_id}`}
                        {row.expiry_date
                          ? ` · ${dayjs(row.expiry_date).format("DD MMM YYYY")}`
                          : ""}
                      </TableCell>
                      <TableCell align="right">{row.quantity_used}</TableCell>
                      <TableCell align="right">
                        {formatKyats(row.unit_cost_price ?? 0)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={800}>
                          {formatKyats(row.amount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
