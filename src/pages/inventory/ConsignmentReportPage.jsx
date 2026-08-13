import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatKyats } from "../../utils/formatKyats";
import {
  getBatches,
  getConsignmentReport,
  getProducts,
  getSuppliers,
} from "./inventoryService";

export default function ConsignmentReportPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  /** Mobile: collapsed by default; desktop: expanded. Tracks user toggles once set. */
  const [filterAccordionExpanded, setFilterAccordionExpanded] = useState(null);
  const filtersExpanded =
    filterAccordionExpanded === null ? isSmUp : filterAccordionExpanded;

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    quantity_used: 0,
    amount: 0,
    paid_amount: 0,
  });
  const [usagePeriod, setUsagePeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [dateFrom, setDateFrom] = useState(() =>
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [dateTo, setDateTo] = useState(() =>
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
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
    if (!productId) {
      setBatches([]);
      return;
    }
    try {
      const data = await getBatches(productId);
      setBatches(
        (Array.isArray(data) ? data : []).filter(
          (b) => b.ownership_type === "consignment",
        ),
      );
    } catch {
      setBatches([]);
    }
  }, [productId]);

  useEffect(() => {
    loadBatchOptions();
  }, [loadBatchOptions]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getConsignmentReport({
        product_id: productId || undefined,
        supplier_id: supplierId || undefined,
        batch_id: batchId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
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
  }, [productId, supplierId, batchId, dateFrom, dateTo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const productOptions = useMemo(
    () =>
      [...products].sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      ),
    [products],
  );

  const goSettlement = () => {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier_id", supplierId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
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
          <Typography variant="body2" color="text.secondary">
            Consignment batches on hand; <strong>Used</strong> counts usage in
            the date range. Paid amounts match supplier payables whose
            consignment period overlaps that range.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={goSettlement}
          sx={{ flexShrink: 0 }}
        >
          Settlement
        </Button>
      </Stack>

      <Accordion
        expanded={filtersExpanded}
        onChange={(_, expanded) => setFilterAccordionExpanded(expanded)}
        disableGutters
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          "&:before": { display: "none" },
          mb: 2,
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>Filters</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
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
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setBatchId("");
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
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={!productId || batches.length === 0}
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
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
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
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
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
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                sx={{
                  flex: { xs: 1, md: "0 0 160px" },
                  minWidth: 0,
                }}
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

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

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Used
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Remaining
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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No consignment batches match the selected filters (with
                      stock remaining or usage in range).
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
