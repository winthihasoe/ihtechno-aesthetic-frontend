import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
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
import AddIcon from "@mui/icons-material/Add";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import { getProducts, getStockMovementsList } from "./inventoryService";

function typeLabel(type) {
  if (type === "in") return "In";
  if (type === "out") return "Out";
  if (type === "adjustment") return "Adjustment";
  return type ?? "—";
}

function movementSourceLabel(sourceType) {
  if (sourceType === "inventory_adjustment") return "Manual adjustment";
  if (sourceType === "purchase") return "Receipt";
  if (sourceType === "manual") return "Manual (legacy)";
  return sourceType ?? "—";
}

const emptyFilters = {
  productId: "",
  movementType: "",
  dateFrom: "",
  dateTo: "",
};

const EMPTY_STEPS = [
  {
    icon: ShoppingCartOutlinedIcon,
    title: "Receive stock",
    body: "Each purchase or consignment receipt creates an in movement tied to a batch, supplier, and cost.",
  },
  {
    icon: TuneOutlinedIcon,
    title: "Adjust on hand",
    body: "Manual stock in, out, or count corrections from a product page write adjustment movements here.",
  },
  {
    icon: MedicalServicesOutlinedIcon,
    title: "Treatment usage",
    body: "Completed sessions consume stock FIFO; supplier returns and recalls also appear as out movements.",
  },
];

export default function StockMovementsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const rolePrefix = `/${resolveUserPrimaryRole(user)}`;
  const canManage = hasPermission(user, "inventory.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
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
        product_id: appliedFilters.productId || undefined,
        type: appliedFilters.movementType || undefined,
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
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
  }, [page, appliedFilters]);

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.productId) count += 1;
    if (appliedFilters.movementType) count += 1;
    if (appliedFilters.dateFrom || appliedFilters.dateTo) count += 1;
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveFilters = activeFilterCount > 0;
  const showGuidedEmpty =
    !loading && total === 0 && !hasActiveFilters && !error;
  const showFilteredEmptyState =
    !loading && total === 0 && hasActiveFilters && !error;

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
            Stock movements
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Audit trail of inventory in, out, and adjustments across products.
          </Typography>
        </Box>
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterCount}
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
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
            value={draftFilters.productId}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                productId: e.target.value,
              }))
            }
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
            value={draftFilters.movementType}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                movementType: e.target.value,
              }))
            }
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
            value={draftFilters.dateFrom}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                dateFrom: e.target.value,
              }))
            }
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={draftFilters.dateTo}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
          />
        </Stack>
      </CollapsibleFiltersPanel>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={SwapHorizOutlinedIcon}
          title="No stock movements yet"
          description="This ledger fills automatically when stock is received, adjusted, consumed in treatments, or written off. Record your first receipt or open a product to start building the audit trail."
          primaryAction={
            canManage
              ? {
                  label: "Record receipt",
                  onClick: () => navigate(`${rolePrefix}/purchases`),
                  startIcon: <AddIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer={
            <>
              Per-product history and manual adjustments live on{" "}
              <Typography
                component={RouterLink}
                to={`${rolePrefix}/inventory`}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Inventory
              </Typography>
              .
            </>
          }
        />
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
                  <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Staff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showFilteredEmptyState ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 4, color: "text.secondary" }}
                    >
                      No movements match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        {row.created_at
                          ? dayjs(row.created_at).format("DD-MM-YYYY HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell>{row.product?.name ?? "—"}</TableCell>
                      <TableCell>{typeLabel(row.type)}</TableCell>
                      <TableCell align="right">{row.quantity ?? "—"}</TableCell>
                      <TableCell>{row.batch?.batch_number ?? "—"}</TableCell>
                      <TableCell>
                        {movementSourceLabel(row.source_type)}
                      </TableCell>
                      <TableCell>{row.note ?? "—"}</TableCell>
                      <TableCell>{row.creator?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {lastPage > 1 ? (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination
                count={lastPage}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          ) : null}
        </>
      )}
    </Box>
  );
}
