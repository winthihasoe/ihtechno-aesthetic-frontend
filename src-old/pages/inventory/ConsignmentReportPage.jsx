import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import {
  Alert,
  Box,
  Button,
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
  Link,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import {
  getBatches,
  getConsignmentReport,
  getProducts,
  getSuppliers,
} from "./inventoryService";

const EMPTY_STEPS = [
  {
    icon: LocalShippingOutlinedIcon,
    title: "Receive on consignment",
    body: "Record inventory receiving with payment type Consignment. Stock stays supplier-owned until treatments consume it.",
  },
  {
    icon: TrendingDownOutlinedIcon,
    title: "Track usage",
    body: "Used counts consumption in your date range; Remaining shows on-hand consignment quantity per batch.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Settle with supplier",
    body: "Open Settlement for a supplier and period, then pay through Supplier Payables — paid status updates here.",
  },
];

function defaultFilters() {
  return {
    productId: "",
    supplierId: "",
    batchId: "",
    dateFrom: dayjs().startOf("month").format("YYYY-MM-DD"),
    dateTo: dayjs().endOf("month").format("YYYY-MM-DD"),
  };
}

export default function ConsignmentReportPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuthStore();
  const purchasesPath = `/${resolveUserPrimaryRole(user)}/purchases`;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    quantity_used: 0,
    amount: 0,
    paid_amount: 0,
  });
  const [usagePeriod, setUsagePeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    getSuppliers()
      .then((s) => setSuppliers(Array.isArray(s) ? s : []))
      .catch(() => setSuppliers([]));
    getProducts({ per_page: 500 })
      .then((list) => setProducts(Array.isArray(list) ? list : []))
      .catch(() => setProducts([]));
  }, []);

  const loadBatchOptions = useCallback(async () => {
    if (!draftFilters.productId) {
      setBatches([]);
      return;
    }
    try {
      const data = await getBatches(draftFilters.productId);
      setBatches(
        (Array.isArray(data) ? data : []).filter(
          (b) => b.ownership_type === "consignment",
        ),
      );
    } catch {
      setBatches([]);
    }
  }, [draftFilters.productId]);

  useEffect(() => {
    loadBatchOptions();
  }, [loadBatchOptions]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getConsignmentReport({
        product_id: appliedFilters.productId || undefined,
        supplier_id: appliedFilters.supplierId || undefined,
        batch_id: appliedFilters.batchId || undefined,
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
      });
      setRows(res.rows ?? []);
      setTotals(
        res.totals ?? { quantity_used: 0, amount: 0, paid_amount: 0 },
      );
      setUsagePeriod(res.usage_period ?? null);
    } catch {
      setError("Could not load consignment report.");
      setRows([]);
      setTotals({ quantity_used: 0, amount: 0, paid_amount: 0 });
      setUsagePeriod(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.productId) count += 1;
    if (appliedFilters.supplierId) count += 1;
    if (appliedFilters.batchId) count += 1;
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    const cleared = defaultFilters();
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
  };

  const productOptions = useMemo(
    () =>
      [...products].sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      ),
    [products],
  );

  const goSettlement = () => {
    const params = new URLSearchParams();
    if (appliedFilters.supplierId) {
      params.set("supplier_id", appliedFilters.supplierId);
    }
    if (appliedFilters.dateFrom) params.set("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("date_to", appliedFilters.dateTo);
    navigate(`../consignment-settlement?${params.toString()}`, {
      relative: "path",
    });
  };

  const openPurchaseByBatch = (row) => {
    const purchaseId = row?.batch?.purchase_id;
    if (!purchaseId) return;
    navigate(`../../purchases/${purchaseId}`, { relative: "path" });
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Consignment Product Report
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Consignment batches on hand; <strong>Used</strong> counts usage in
            the date range. Paid amounts match supplier payables whose
            consignment period overlaps that range.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
          />
          <Button
            variant="contained"
            onClick={goSettlement}
            sx={{ flexShrink: 0 }}
          >
            Settlement
          </Button>
        </Stack>
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            select
            size="small"
            label="Product"
            value={draftFilters.productId}
            onChange={(e) => {
              const value = e.target.value;
              setDraftFilters((prev) => ({
                ...prev,
                productId: value,
                batchId: "",
              }));
            }}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          >
            <MenuItem value="">All products</MenuItem>
            {productOptions.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Batch"
            value={draftFilters.batchId}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, batchId: e.target.value }))
            }
            disabled={!draftFilters.productId || batches.length === 0}
            sx={{ minWidth: { xs: "100%", md: 200 } }}
          >
            <MenuItem value="">All consignment batches</MenuItem>
            {batches.map((b) => (
              <MenuItem key={b.id} value={String(b.id)}>
                {b.batch_number || `Batch #${b.id}`}{" "}
                {b.expiry_date
                  ? `· exp ${dayjs(b.expiry_date).format("MMM YYYY")}`
                  : ""}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Supplier"
            value={draftFilters.supplierId}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                supplierId: e.target.value,
              }))
            }
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          >
            <MenuItem value="">All suppliers</MenuItem>
            {suppliers.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: { xs: "100%", md: "auto" },
              flex: { md: "0 0 auto" },
            }}
          >
            <TextField
              size="small"
              type="date"
              label="Usage from"
              InputLabelProps={{ shrink: true }}
              value={draftFilters.dateFrom}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  dateFrom: e.target.value,
                }))
              }
              sx={{
                flex: { xs: 1, md: "0 0 160px" },
                minWidth: 0,
              }}
            />
            <TextField
              size="small"
              type="date"
              label="Usage to"
              InputLabelProps={{ shrink: true }}
              value={draftFilters.dateTo}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
              sx={{
                flex: { xs: 1, md: "0 0 160px" },
                minWidth: 0,
              }}
            />
          </Stack>
        </Stack>
      </CollapsibleFiltersPanel>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {usagePeriod && !usagePeriod.has_window ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Set <strong>Usage from</strong> and <strong>Usage to</strong> to
          allocate paid amounts from supplier payables.
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : rows.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.06 : 0.04,
            ),
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              py: { xs: 5, sm: 7 },
              px: { xs: 2.5, sm: 4 },
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                bgcolor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.2 : 0.12,
                ),
              }}
            >
              <Inventory2OutlinedIcon
                sx={{ fontSize: 36, color: "primary.main" }}
              />
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              color="text.primary"
              gutterBottom
            >
              No consignment batches to show
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.65 }}
            >
              Rows appear when consignment stock is on hand or was used in your
              selected date range. Widen the filters, or receive consignment
              inventory first.
            </Typography>
            <Button
              variant="contained"
              onClick={goSettlement}
              sx={{ mt: 2.5 }}
            >
              Open settlement
            </Button>
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 4, sm: 5 }, pt: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ maxWidth: 960, mx: "auto" }}
            >
              {EMPTY_STEPS.map(({ icon: Icon, title, body }) => (
                <Paper
                  key={title}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    textAlign: "left",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{ mt: 0.25, color: "primary.main", display: "flex" }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        gutterBottom
                      >
                        {title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        lineHeight={1.6}
                      >
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 3, textAlign: "center" }}
            >
              To receive consignment stock, go to{" "}
              <Typography
                component={RouterLink}
                to={purchasesPath}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Inventory → Inventory Receiving
              </Typography>{" "}
              and choose payment type <strong>Consignment</strong>.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{
              px: { xs: 1.25, sm: 1.75 },
              py: { xs: 0.75, sm: 1 },
              borderRadius: 2,
              mb: 1.25,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              flexWrap="wrap"
              sx={{ gap: { xs: 1, sm: 2 }, rowGap: 0.75 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                Total used qty{" "}
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={800}
                  color="text.primary"
                >
                  {totals.quantity_used ?? 0}
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 0.75,
                }}
              >
                Total amount{" "}
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={800}
                  color="text.primary"
                >
                  {formatKyats(totals.amount ?? 0)}
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 0.75,
                }}
              >
                Total paid{" "}
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={800}
                  color="text.primary"
                >
                  {formatKyats(totals.paid_amount ?? 0)}
                </Typography>
              </Typography>
            </Stack>
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
                    Remaining (buy unit)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Paid Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Paid Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={String(row.id)} hover>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {row.product?.name ?? "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.supplier_name ?? "No supplier"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.batch?.purchase_id ? (
                        <Link
                          component="button"
                          variant="body2"
                          underline="hover"
                          onClick={() => openPurchaseByBatch(row)}
                          sx={{ fontWeight: 700, cursor: "pointer" }}
                        >
                          {row.batch?.batch_number ||
                            `#${row.batch?.id ?? "—"}`}
                        </Link>
                      ) : (
                        row.batch?.batch_number || `#${row.batch?.id ?? "—"}`
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {row.batch?.expiry_date
                          ? `exp ${dayjs(row.batch.expiry_date).format("DD MMM YYYY")}`
                          : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{row.quantity_used}</TableCell>
                    <TableCell align="right">
                      {row.remaining_quantity}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={800}>
                        {formatKyats(row.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>
                        {formatKyats(row.paid_amount ?? 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                          row.paid_status === "n/a"
                            ? "text.secondary"
                            : row.paid_status === "complete"
                              ? "success.main"
                              : "warning.main"
                        }
                        sx={{ textTransform: "capitalize" }}
                      >
                        {row.paid_status === "n/a"
                          ? "—"
                          : (row.paid_status ?? "partial")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
