import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  getInventoryAlerts,
  getProducts,
} from "../inventory/inventoryService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import { formatKyats } from "../../utils/formatKyats";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function stockStatusChipColor(status) {
  if (status === "out") return "error";
  if (status === "low") return "warning";
  return "success";
}

function stockStatusLabel(status) {
  if (status === "out") return "Out";
  if (status === "low") return "Low stock";
  return "In stock";
}

function formatExpiry(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "—";
}

function StatCard({ icon, label, value, tint }) {
  const theme = useTheme();
  const color = theme.palette[tint]?.main ?? theme.palette.primary.main;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        flex: 1,
        minWidth: 140,
        borderRadius: 2,
        border: `1px solid ${alpha(color, 0.22)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.1)}, transparent 72%)`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(color, 0.14),
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function InventoryReportPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const prefix = getWorkspaceUrlPrefix(user);

  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState({
    low_stock: [],
    expiring_soon: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, alertData] = await Promise.all([
        getProducts(),
        getInventoryAlerts({ days: 90 }),
      ]);
      setProducts(normalizeList(prods));
      setAlerts({
        low_stock: alertData?.low_stock ?? [],
        expiring_soon: alertData?.expiring_soon ?? [],
        expired: alertData?.expired ?? [],
      });
    } catch (err) {
      setError(resolveApiError(err, "Could not load inventory report."));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const counts = { in: 0, low: 0, out: 0, total: products.length };
    products.forEach((p) => {
      const status = p.stock_status ?? "in";
      if (status in counts) counts[status] += 1;
      else counts.in += 1;
    });
    return counts;
  }, [products]);

  const categoryBrief = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const name = p.category?.name ?? "Uncategorised";
      const prev = map.get(name) ?? { name, total: 0, low: 0, out: 0, units: 0 };
      prev.total += 1;
      prev.units += Number(p.total_stock ?? 0);
      if (p.stock_status === "low") prev.low += 1;
      if (p.stock_status === "out") prev.out += 1;
      map.set(name, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [products]);

  const categories = useMemo(() => {
    const names = new Set();
    products.forEach((p) => {
      if (p.category?.name) names.add(p.category.name);
    });
    return Array.from(names).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "all" && (p.stock_status ?? "in") !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && (p.category?.name ?? "") !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const hay = `${p.name ?? ""} ${p.sku ?? ""} ${p.category?.name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, search, statusFilter, categoryFilter]);

  const openProduct = (productId) => {
    if (productId) navigate(`${prefix}/inventory/${productId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Inventory Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
            Stock health snapshot and product brief — on-hand levels, status, and expiry
            risk across the catalogue.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate(`${prefix}/inventory/alerts`)}
          >
            Stock alerts
          </Button>
          <Button
            size="small"
            variant="contained"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate(`${prefix}/inventory`)}
          >
            Open inventory
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" icon={false} sx={{ mb: 2.5, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>How to use this page</AlertTitle>
        Review the status cards for overall health, scan the category brief for
        concentration of risk, then filter the product list for SKUs that need reorder
        or expiry action. Click a row to open the product record.
      </Alert>

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 2.5 }}
      >
        <StatCard
          icon={<Inventory2OutlinedIcon fontSize="small" />}
          label="Total products"
          value={statusCounts.total}
          tint="primary"
        />
        <StatCard
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          label="In stock"
          value={statusCounts.in}
          tint="success"
        />
        <StatCard
          icon={<WarningAmberIcon fontSize="small" />}
          label="Low stock"
          value={statusCounts.low}
          tint="warning"
        />
        <StatCard
          icon={<ErrorOutlineIcon fontSize="small" />}
          label="Out of stock"
          value={statusCounts.out}
          tint="error"
        />
        <StatCard
          icon={<EventBusyOutlinedIcon fontSize="small" />}
          label="Expiring ≤90 days"
          value={alerts.expiring_soon.length}
          tint="info"
        />
        <StatCard
          icon={<EventBusyOutlinedIcon fontSize="small" />}
          label="Expired batches"
          value={alerts.expired.length}
          tint="error"
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.9fr) minmax(0, 1.4fr)" },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Category brief
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Products and on-hand units by category
            </Typography>
          </Box>
          {categoryBrief.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No products in catalogue.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      SKUs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Units
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Risk
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryBrief.map((row) => (
                    <TableRow key={row.name} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                      <TableCell align="right">{row.units}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                          {row.low > 0 ? (
                            <Chip size="small" color="warning" label={`${row.low} low`} sx={{ fontWeight: 700 }} />
                          ) : null}
                          {row.out > 0 ? (
                            <Chip size="small" color="error" label={`${row.out} out`} sx={{ fontWeight: 700 }} />
                          ) : null}
                          {row.low === 0 && row.out === 0 ? (
                            <Chip size="small" color="success" variant="outlined" label="OK" sx={{ fontWeight: 700 }} />
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Attention queue
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Low / out stock and near-expiry batches
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
            {alerts.low_stock.length === 0 && alerts.expiring_soon.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No reorder or expiry alerts right now.
              </Typography>
            ) : (
              <>
                {alerts.low_stock.slice(0, 5).map((row) => (
                  <Stack
                    key={`low-${row.id}`}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      py: 0.75,
                      px: 1,
                      borderRadius: 1.5,
                      bgcolor: alpha(
                        theme.palette[row.stock_status === "out" ? "error" : "warning"].main,
                        0.06,
                      ),
                      cursor: "pointer",
                    }}
                    onClick={() => openProduct(row.id)}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.sku} · qty {row.quantity ?? 0} / min {row.reorder_level ?? "—"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={stockStatusChipColor(row.stock_status)}
                      label={stockStatusLabel(row.stock_status)}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                ))}
                {alerts.expiring_soon.slice(0, 4).map((row) => (
                  <Stack
                    key={`exp-${row.id}-${row.batch_number}`}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      py: 0.75,
                      px: 1,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.info.main, 0.06),
                      cursor: "pointer",
                    }}
                    onClick={() => openProduct(row.product_id)}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {row.product_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Batch {row.batch_number} · expires {formatExpiry(row.expiry_date)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={`${row.days_to_expiry ?? "?"}d`}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                ))}
              </>
            )}
          </Box>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            alignItems: { md: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Product brief
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filteredProducts.length} of {products.length} products
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", md: "auto" } }}>
            <TextField
              size="small"
              label="Search"
              placeholder="Name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="in">In stock</MenuItem>
                <MenuItem value="low">Low stock</MenuItem>
                <MenuItem value="out">Out of stock</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All categories</MenuItem>
                {categories.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {filteredProducts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            No products match these filters.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    On hand
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Min
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nearest expiry</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Sell price
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => openProduct(product.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      {product.unit ? (
                        <Typography variant="caption" color="text.secondary">
                          {product.unit}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {product.sku ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{product.category?.name ?? "—"}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {product.total_stock ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {product.min_stock_level ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={stockStatusChipColor(product.stock_status)}
                        label={stockStatusLabel(product.stock_status)}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatExpiry(product.nearest_expiry_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {product.selling_price != null ? formatKyats(product.selling_price) : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
