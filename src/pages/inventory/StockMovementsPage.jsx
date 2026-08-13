import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Pagination,
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
import { getProducts, getStockMovementsList } from "./inventoryService";

function typeLabel(type) {
  if (type === "in") return "In";
  if (type === "out") return "Out";
  if (type === "adjustment") return "Adjustment";
  return type ?? "—";
}

export default function StockMovementsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [products, setProducts] = useState([]);

  const loadProducts = useCallback(async () => {
    try {
      const list = await getProducts({ per_page: 500 });
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setProducts([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStockMovementsList({
        page,
        per_page: 30,
        product_id: productId || undefined,
        type: movementType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setRows(res.data ?? []);
      setLastPage(Math.max(1, res.last_page ?? 1));
      setTotal(res.total ?? res.data?.length ?? 0);
    } catch {
      setError("Could not load stock movements.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, productId, movementType, dateFrom, dateTo]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    load();
  }, [load]);

  const productOptions = useMemo(
    () =>
      [...products].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [products],
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
        Stock movements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Audit trail of inventory in, out, and adjustments across products.
      </Typography>

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        Every stock change is logged here for traceability. <strong>In</strong> =
        received from a purchase, <strong>Out</strong> = dispensed or used, and{" "}
        <strong>Adjustment</strong> = a correction from a stock-take. Filter by
        product, type or date to trace a batch.
      </Alert>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          flexWrap="wrap"
          useFlexGap
          alignItems={{ xs: "stretch", sm: "flex-end" }}
        >
          <TextField
            select
            size="small"
            label="Product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
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
            label="Type"
            value={movementType}
            onChange={(e) => {
              setMovementType(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: { xs: "100%", sm: 140 } }}
          >
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="in">In</MenuItem>
            <MenuItem value="out">Out</MenuItem>
            <MenuItem value="adjustment">Adjustment</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 2, overflowX: "auto" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Qty
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No movements match your filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        {m.created_at
                          ? dayjs(m.created_at).format("DD MMM YYYY HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell>{m.product?.name ?? "—"}</TableCell>
                      <TableCell>{typeLabel(m.type)}</TableCell>
                      <TableCell align="right">{m.quantity}</TableCell>
                      <TableCell>
                        {m.batch?.batch_number || `#${m.batch?.id ?? "—"}`}
                      </TableCell>
                      <TableCell>
                        {m.source_type ?? "—"}
                        {m.source_id ? ` #${m.source_id}` : ""}
                      </TableCell>
                      <TableCell>{m.creator?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              {total} movement{total !== 1 ? "s" : ""} total
            </Typography>
            <Pagination
              count={lastPage}
              page={page}
              onChange={(_, p) => {
                setPage(p);
              }}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Stack>
        </>
      )}
    </Box>
  );
}
