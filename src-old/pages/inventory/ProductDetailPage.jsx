import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TuneIcon from "@mui/icons-material/Tune";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission, hasRole } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { COPY } from "../../utils/inventoryUnitsCopy";
import ProductPackSizeFields from "../../components/inventory/ProductPackSizeFields";
import RecordWastageDialog from "../../components/inventory/RecordWastageDialog";
import {
  getProduct,
  getBatches,
  getMovements,
  adjustStock,
  updateProduct,
  getCategories,
  createCategory,
  getProductUnits,
  createProductUnit,
  getProductTypes,
  createProductType,
  getBatchAffectedPatients,
  getProductReservations,
  openBatchRecall,
} from "./inventoryService";

function stockStatusChipColor(status) {
  if (status === "out") return "error";
  if (status === "low") return "warning";
  return "success";
}

function stockStatusLabel(status) {
  if (status === "out") return "Out";
  if (status === "low") return "Low Stock";
  return "In Stock";
}

function movementSourceLabel(sourceType) {
  if (sourceType === "inventory_adjustment") return "Manual adjustment";
  if (sourceType === "purchase") return "Receipt";
  if (sourceType === "manual") return "Manual (legacy)";
  return sourceType ?? "—";
}

function movementChipColor(type) {
  if (type === "in") return "success";
  if (type === "out") return "error";
  return "secondary";
}

function treatmentStatusLabel(status) {
  if (status === "planned") return "Planned";
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status ?? "—";
}

function visitStatusLabel(status) {
  if (status === "waiting") return "Waiting";
  if (status === "consulting") return "Consulting";
  if (status === "preparation") return "Preparation";
  if (status === "treatment") return "Treatment";
  if (status === "payment") return "Payment";
  if (status === "completed") return "Completed";
  return status ?? "—";
}

function formatReservedAt(iso) {
  if (!iso) return "—";
  const parsed = dayjs(iso);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY HH:mm") : "—";
}

const scrollableTablePaperSx = {
  borderRadius: 2,
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const pageRootSx = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const ADD_NEW_UNIT_VALUE = "__add_new_unit__";
const ADD_NEW_CATEGORY_VALUE = "__add_new_category__";
const ADD_NEW_TYPE_VALUE = "__add_new_type__";

function buildEditFormFromProduct(product) {
  const usesPack =
    product?.uses_pack_conversion ||
    Number(product?.stock_unit_id) !== Number(product?.base_unit_id) ||
    Number(product?.base_per_stock_unit) > 1;
  return {
    name: product?.name ?? "",
    generic_name: product?.generic_name ?? "",
    included_amount: product?.included_amount ?? "",
    sku: product?.sku ?? "",
    unit_id: String(product?.unit_id ?? ""),
    stock_unit_id: String(product?.stock_unit_id ?? product?.unit_id ?? ""),
    base_unit_id: String(product?.base_unit_id ?? product?.unit_id ?? ""),
    base_per_stock_unit: product?.base_per_stock_unit ?? 1,
    same_unit_for_buying_and_using: !usesPack,
    track_open_units: Boolean(product?.track_open_units),
    open_use_by_hours: product?.open_use_by_hours
      ? String(product.open_use_by_hours)
      : "",
    category_id: String(product?.category_id ?? ""),
    product_type_id: String(product?.product_type_id ?? ""),
    min_stock_level: String(product?.min_stock_level ?? 0),
    selling_price:
      product?.selling_price != null
        ? formatCommaAmountFromNumber(product.selling_price)
        : "",
    description: product?.description ?? "",
  };
}

export default function ProductDetailPage() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const canManage = hasPermission(user, "inventory.manage");
  const canAbsoluteAdjust = hasRole(user, "owner");
  const canViewPatients = hasPermission(user, "patients.view");

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [reservationData, setReservationData] = useState({
    availability: null,
    availability_display: null,
    holds: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("in");
  const [adjustForm, setAdjustForm] = useState({
    quantity: "",
    reason: "loss_damage",
    note: "",
    batch_number: "",
    expiry_date: "",
    cost_price: "",
    is_sample: false,
  });
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    generic_name: "",
    included_amount: "",
    sku: "",
    unit_id: "",
    category_id: "",
    product_type_id: "",
    min_stock_level: "",
    selling_price: "",
    description: "",
  });
  const [editing, setEditing] = useState(false);
  const [editFormBaseline, setEditFormBaseline] = useState(null);
  const [editError, setEditError] = useState("");
  const [wastageOpen, setWastageOpen] = useState(false);
  const [affectedPatients, setAffectedPatients] = useState([]);
  const [affectedBatch, setAffectedBatch] = useState(null);
  const [affectedLoading, setAffectedLoading] = useState(false);
  const [recallBatch, setRecallBatch] = useState(null);
  const [recallReason, setRecallReason] = useState("");
  const [recallSeverity, setRecallSeverity] = useState("voluntary");
  const [recalling, setRecalling] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [addingUnit, setAddingUnit] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    useState(false);
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, b, m, reservations] = await Promise.all([
        getProduct(id),
        getBatches(id),
        getMovements(id),
        getProductReservations(id),
      ]);
      const [cats, unitOptions, typeOptions] = await Promise.all([
        getCategories(),
        getProductUnits(),
        getProductTypes(),
      ]);
      setProduct(p);
      setBatches(b);
      setMovements(m);
      setReservationData(
        reservations ?? {
          availability: null,
          availability_display: null,
          holds: [],
        },
      );
      setCategories(cats);
      setUnits(unitOptions);
      setTypes(typeOptions);
    } catch {
      setError("Could not load product details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const viewAffectedPatients = async (batch) => {
    setAffectedBatch(batch);
    setAffectedLoading(true);
    try {
      setAffectedPatients(await getBatchAffectedPatients(batch.id));
    } catch {
      pushToast({
        message: "Could not load affected patients.",
        severity: "error",
      });
      setAffectedBatch(null);
    } finally {
      setAffectedLoading(false);
    }
  };

  const submitRecall = async () => {
    if (!recallBatch || !recallReason.trim()) return;
    setRecalling(true);
    try {
      await openBatchRecall({
        batch_id: recallBatch.id,
        reason: recallReason.trim(),
        severity: recallSeverity,
      });
      pushToast({ message: "Batch recall opened.", severity: "success" });
      setRecallBatch(null);
      setRecallReason("");
      await load();
    } catch {
      pushToast({ message: "Failed to open recall.", severity: "error" });
    } finally {
      setRecalling(false);
    }
  };

  const adjustWriteOffReasons = Object.keys(COPY.adjustmentWriteOffReasons);
  const stockUnitName = product?.stock_unit_name || product?.unit || "unit";
  const useUnitName = product?.use_unit_name || product?.unit || "unit";
  const currentStockCount = Number(product?.total_stock ?? 0);
  const needsWriteOffReason =
    adjustType === "out" ||
    (adjustType === "adjustment" &&
      adjustForm.quantity !== "" &&
      !Number.isNaN(Number(adjustForm.quantity)) &&
      Number(adjustForm.quantity) < currentStockCount);

  const adjustQtyLabel =
    adjustType === "adjustment"
      ? `New sealed count (${stockUnitName})`
      : COPY.purchaseQty(stockUnitName);

  const adjustTypeHelperText = {
    in: `Adds sealed ${stockUnitName}. With cost → Dr Inventory (12000) / Cr Other Income (45500). Sample/gift → stock only, no journal.`,
    out: `Removes sealed ${stockUnitName} (converted to ${useUnitName} for stock). Write-off → Dr expense by reason / Cr Inventory.`,
    adjustment: `Sets sealed ${stockUnitName} count (owner only). Increase → same as Stock In; decrease → same write-off journals as Stock Out.`,
  };

  const handleAdjust = async () => {
    const qty = Number(adjustForm.quantity);
    if (adjustForm.quantity === "" || Number.isNaN(qty)) return;
    if (adjustType === "adjustment" && !canAbsoluteAdjust) return;
    if (adjustType !== "adjustment" && qty <= 0) return;
    if (adjustType === "adjustment" && qty < 0) return;
    if (needsWriteOffReason && !adjustForm.reason) return;
    if (adjustType === "in" && !adjustForm.is_sample) {
      const cost = parseCommaAmount(adjustForm.cost_price);
      if (adjustForm.cost_price === "" || !Number.isFinite(cost) || cost <= 0) {
        return;
      }
    }
    setAdjusting(true);
    setAdjustError("");
    try {
      await adjustStock(id, {
        type: adjustType,
        quantity: qty,
        note: adjustForm.note,
        reason: needsWriteOffReason ? adjustForm.reason : undefined,
        batch_number: adjustForm.batch_number || undefined,
        expiry_date: adjustForm.expiry_date || undefined,
        is_sample: adjustType === "in" ? Boolean(adjustForm.is_sample) : undefined,
        cost_price: (() => {
          if (adjustType !== "in") return undefined;
          if (adjustForm.is_sample) return 0;
          const parsed = parseCommaAmount(adjustForm.cost_price);
          return Number.isFinite(parsed) ? parsed : undefined;
        })(),
      });
      const adjustSuccessMessage =
        adjustType === "in"
          ? "Stock in recorded."
          : adjustType === "out"
            ? "Stock out recorded."
            : "Stock count adjusted.";
      pushToast({ message: adjustSuccessMessage, severity: "success" });
      setAdjustOpen(false);
      setAdjustForm({
        quantity: "",
        reason: "loss_damage",
        note: "",
        batch_number: "",
        expiry_date: "",
        cost_price: "",
        is_sample: false,
      });
      setAdjustType("in");
      load();
    } catch (e) {
      setAdjustError(
        e?.response?.data?.errors?.type?.[0] ??
          e?.response?.data?.errors?.cost_price?.[0] ??
          e?.response?.data?.errors?.reason?.[0] ??
          e?.response?.data?.message ??
          "Adjustment failed. Check stock levels.",
      );
    } finally {
      setAdjusting(false);
    }
  };

  const openEditDialog = () => {
    setEditError("");
    const initial = buildEditFormFromProduct(product);
    setEditForm(initial);
    setEditFormBaseline(initial);
    setEditOpen(true);
  };

  const editFormHasChanges = useMemo(() => {
    if (!editFormBaseline) return false;
    return Object.keys(editForm).some(
      (key) => editForm[key] !== editFormBaseline[key],
    );
  }, [editForm, editFormBaseline]);

  const handleSaveEdit = async () => {
    if (
      !product?.id ||
      !editForm.name.trim() ||
      !editForm.unit_id ||
      !editFormHasChanges
    ) {
      return;
    }
    setEditing(true);
    setEditError("");
    try {
      const sameUnit = editForm.same_unit_for_buying_and_using !== false;
      const unitId = Number(editForm.unit_id);
      await updateProduct(product.id, {
        name: editForm.name.trim(),
        generic_name: editForm.generic_name.trim() || null,
        included_amount: editForm.included_amount.trim() || null,
        sku: editForm.sku.trim() || null,
        unit_id: unitId,
        stock_unit_id: sameUnit
          ? unitId
          : Number(editForm.stock_unit_id || unitId),
        base_unit_id: sameUnit
          ? unitId
          : Number(editForm.base_unit_id || unitId),
        base_per_stock_unit: sameUnit
          ? 1
          : Number(editForm.base_per_stock_unit) || 1,
        track_open_units: Boolean(editForm.track_open_units),
        open_use_by_hours:
          editForm.track_open_units && editForm.open_use_by_hours
            ? Number(editForm.open_use_by_hours)
            : null,
        category_id: editForm.category_id ? Number(editForm.category_id) : null,
        product_type_id: editForm.product_type_id
          ? Number(editForm.product_type_id)
          : null,
        min_stock_level: Number(editForm.min_stock_level || 0),
        selling_price: (() => {
          if (editForm.selling_price === "") return null;
          const parsed = parseCommaAmount(editForm.selling_price);
          return Number.isFinite(parsed) ? parsed : null;
        })(),
        description: editForm.description.trim() || null,
      });
      setEditOpen(false);
      await load();
    } catch (e) {
      setEditError(
        e?.response?.data?.message ?? "Failed to update product details.",
      );
    } finally {
      setEditing(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const created = await createProductType({ name: newTypeName.trim() });
      setTypes((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditForm((f) => ({ ...f, product_type_id: String(created.id) }));
      setNewTypeName("");
      setCreateTypeDialogOpen(false);
    } catch {
      setEditError("Failed to add new product type.");
    } finally {
      setAddingType(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) return;
    setAddingUnit(true);
    try {
      const created = await createProductUnit({ name: newUnitName.trim() });
      setUnits((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditForm((f) => ({ ...f, unit_id: String(created.id) }));
      setNewUnitName("");
      setCreateUnitDialogOpen(false);
    } catch {
      setEditError("Failed to add new unit.");
    } finally {
      setAddingUnit(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await createCategory({ name: newCategoryName.trim() });
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditForm((f) => ({ ...f, category_id: String(created.id) }));
      setNewCategoryName("");
      setCreateCategoryDialogOpen(false);
    } catch {
      setEditError("Failed to add new category.");
    } finally {
      setAddingCategory(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Product not found."}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/inventory")}
        >
          Back
        </Button>
      </Box>
    );
  }

  const statusChipColor = stockStatusChipColor(product.stock_status);
  const today = dayjs();

  return (
    <Box sx={pageRootSx}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/inventory")}
        sx={{ mb: { xs: 1.5, md: 2 } }}
        color="primary"
        size="small"
      >
        Back to Inventory
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 1.5 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0, width: { xs: "100%", sm: "auto" } }}>
          <Typography
            variant="h5"
            fontWeight={700}
            color="text.primary"
            sx={{
              fontSize: { xs: "1.15rem", sm: "1.35rem", md: "1.5rem" },
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {product.name}
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            mt={0.5}
            flexWrap="wrap"
            useFlexGap
          >
            {product.sku && (
              <Typography variant="body2" color="text.secondary">
                SKU: {product.sku}
              </Typography>
            )}
            {product.category?.name && (
              <Chip
                label={product.category.name}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "divider",
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? alpha(t.palette.common.white, 0.04)
                      : alpha(t.palette.common.black, 0.04),
                }}
              />
            )}
            <Chip
              label={stockStatusLabel(product.stock_status)}
              color={statusChipColor}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          {product.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {product.description}
            </Typography>
          )}
        </Box>
        {canManage && (
          <Stack
            direction="row"
            flexWrap="wrap"
            columnGap={1}
            rowGap={1}
            sx={{
              width: { xs: "100%", sm: "auto" },
              maxWidth: "100%",
              pb: { xs: 0.25, sm: 0 },
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={openEditDialog}
            >
              Edit Product
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setWastageOpen(true)}
              disabled={
                !batches.some((b) => Number(b.open_units_remaining) > 0)
              }
            >
              Record wastage
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<TuneIcon />}
              onClick={() => {
                setAdjustError("");
                setAdjustType("in");
                setAdjustOpen(true);
              }}
            >
              Adjust Stock
            </Button>
          </Stack>
        )}
      </Box>

      <Stack
        direction="row"
        flexWrap="wrap"
        spacing={{ xs: 0.75, sm: 1, md: 2 }}
        mb={{ xs: 1.5, md: 3 }}
        useFlexGap
        sx={{ rowGap: { xs: 0.75, sm: 1, md: 2 } }}
      >
        {[
          {
            label: "On hand",
            shortLabel: "On hand",
            value:
              product.on_hand_display ??
              `${product.total_stock} ${product.unit}`,
          },
          {
            label: "Reserved (soft)",
            shortLabel: "Reserved",
            value:
              reservationData.availability_display?.reserved ??
              `0 ${product.use_unit_name ?? product.unit}`,
            emphasize: Number(reservationData.availability?.reserved ?? 0) > 0,
          },
          {
            label: "Available",
            shortLabel: "Available",
            value:
              reservationData.availability_display?.available ??
              product.on_hand_display ??
              `${product.total_stock} ${product.unit}`,
          },
          {
            label: "Min Stock Level",
            shortLabel: "Min stock",
            value:
              product.min_stock_level > 0
                ? `${product.min_stock_level} ${product.use_unit_name ?? product.unit}`
                : "—",
          },
          {
            label: "Active Batches",
            shortLabel: "Batches",
            value: batches.filter((b) => b.quantity > 0).length,
          },
          {
            label: "Selling Price",
            shortLabel: "Price",
            value:
              product.selling_price != null
                ? formatKyats(product.selling_price)
                : "—",
          },
        ].map(({ label, shortLabel, value, emphasize }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              flex: {
                xs: "1 1 calc(33.333% - 6px)",
                sm: "1 1 calc(33.333% - 8px)",
                md: "1 1 calc(16.666% - 16px)",
              },
              minWidth: { xs: 0, md: 140 },
              p: { xs: 0.75, sm: 1, md: 2.5 },
              borderRadius: { xs: 1, md: 2 },
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              textTransform="uppercase"
              letterSpacing={0.2}
              noWrap
              sx={{
                display: "block",
                fontSize: { xs: "0.58rem", sm: "0.62rem", md: "0.75rem" },
                lineHeight: 1.15,
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", md: "inline" } }}
              >
                {label}
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "inline", md: "none" } }}
              >
                {shortLabel}
              </Box>
            </Typography>
            <Typography
              fontWeight={700}
              mt={{ xs: 0.125, md: 0.5 }}
              color={emphasize ? "warning.main" : "text.primary"}
              sx={{
                fontSize: { xs: "0.78rem", sm: "0.85rem", md: "1.25rem" },
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { xs: "nowrap", md: "normal" },
              }}
            >
              {value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: "divider",
          maxWidth: "100%",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
            minHeight: { xs: 40, md: 48 },
            px: { xs: 1.25, sm: 2 },
          },
        }}
      >
        <Tab label={`Batches (${batches.length})`} />
        <Tab
          label={`Soft reservations (${(reservationData.holds ?? []).length})`}
        />
        <Tab label={`Movements (${movements.length})`} />
      </Tabs>

      {tab === 0 &&
        (batches.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography>No batches recorded.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={scrollableTablePaperSx}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Batch #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ownership</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Quantity
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Cost (K)
                  </TableCell>
                  {(canManage || canViewPatients) && (
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {batches.map((b) => {
                  const expired =
                    b.expiry_date &&
                    dayjs(b.expiry_date).isBefore(today, "day");
                  return (
                    <TableRow
                      key={b.id}
                      hover
                      sx={
                        expired
                          ? {
                              bgcolor: alpha(
                                theme.palette.error.main,
                                theme.palette.mode === "dark" ? 0.16 : 0.08,
                              ),
                            }
                          : undefined
                      }
                    >
                      <TableCell>
                        {b.batch_number ?? "—"}
                        {b.is_quarantined && (
                          <Chip
                            label="Quarantined"
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                          />
                        )}
                        {expired && (
                          <Chip
                            label="Expired"
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {b.ownership_type === "consignment"
                          ? "Consignment"
                          : "Purchased"}
                      </TableCell>
                      <TableCell>
                        {b.expiry_date
                          ? dayjs(b.expiry_date).format("DD MMM YYYY")
                          : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="text.primary">
                          {b.on_hand_display ?? b.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {b.cost_price != null ? formatKyats(b.cost_price) : "—"}
                      </TableCell>
                      {(canManage || canViewPatients) && (
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            {canViewPatients && (
                              <Button
                                size="small"
                                onClick={() => viewAffectedPatients(b)}
                              >
                                Affected patients
                              </Button>
                            )}
                            {canManage && !b.is_quarantined && (
                              <Button
                                size="small"
                                color="warning"
                                onClick={() => setRecallBatch(b)}
                              >
                                Open recall
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {tab === 1 &&
        ((reservationData.holds ?? []).length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography fontWeight={600} color="text.primary" gutterBottom>
              No active soft reservations
            </Typography>
            <Typography variant="body2" maxWidth={480} mx="auto">
              Stock is soft-reserved when a treatment session plans to use this
              product. On-hand quantity does not change until the session is
              marked done.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={scrollableTablePaperSx}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Treatment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Visit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Reserved
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Since</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Staff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reservationData.holds ?? []).map((row) => {
                  const treatmentLabel =
                    row.treatment_template_name ||
                    row.treatment_name ||
                    row.label ||
                    "—";
                  const staff = row.doctor_name || row.therapist_name || "—";

                  return (
                    <TableRow key={`${row.source_type}-${row.source_id}`} hover>
                      <TableCell>
                        {canViewPatients && row.patient_id ? (
                          <Typography
                            onClick={() =>
                              navigate(`/patients/${row.patient_id}`)
                            }
                            variant="body2"
                            fontWeight={700}
                            color="text.primary"
                            sx={{ cursor: "pointer" }}
                          >
                            {row.patient_name ?? "—"}
                          </Typography>
                        ) : row.patient_name ? (
                          row.patient_name
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {canViewPatients ? "—" : "Restricted"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{treatmentLabel}</TableCell>
                      <TableCell>
                        {treatmentStatusLabel(row.treatment_status)}
                      </TableCell>
                      <TableCell>
                        {visitStatusLabel(row.visit_status)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          {row.quantity_display ?? row.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatReservedAt(row.reserved_at)}</TableCell>
                      <TableCell>{staff}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {tab === 2 &&
        (movements.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography>No movements recorded.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={scrollableTablePaperSx}>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Quantity
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Staff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Typography variant="body2" color="text.primary">
                        {dayjs(m.created_at).format("DD MMM YYYY")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(m.created_at).format("HH:mm")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                        size="small"
                        color={movementChipColor(m.type)}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={700}
                        color={m.quantity < 0 ? "error.main" : "success.main"}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {movementSourceLabel(m.source_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.primary">
                        {m.note ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {m.creator?.name ?? "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            m: { xs: 0, sm: 2 },
            width: { xs: "100%", sm: "auto" },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          Edit Product — {product.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.75}>
                Product Name
              </Typography>
              <TextField
                placeholder="A-cream"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                fullWidth
                required
              />
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Generic Name
                </Typography>
                <TextField
                  placeholder="Clindamycin"
                  value={editForm.generic_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, generic_name: e.target.value }))
                  }
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Included Amount
                </Typography>
                <TextField
                  placeholder="500mg"
                  value={editForm.included_amount}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      included_amount: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Product Type
                </Typography>
                <FormControl fullWidth>
                  <Select
                    displayEmpty
                    value={editForm.product_type_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_TYPE_VALUE) {
                        setCreateTypeDialogOpen(true);
                        return;
                      }
                      setEditForm((f) => ({ ...f, product_type_id: value }));
                    }}
                  >
                    <MenuItem value={ADD_NEW_TYPE_VALUE}>
                      + Add New Product Type
                    </MenuItem>
                    <MenuItem value="">No Product Type</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Category
                </Typography>
                <FormControl fullWidth>
                  <Select
                    displayEmpty
                    value={editForm.category_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_CATEGORY_VALUE) {
                        setCreateCategoryDialogOpen(true);
                        return;
                      }
                      setEditForm((f) => ({ ...f, category_id: value }));
                    }}
                  >
                    <MenuItem value={ADD_NEW_CATEGORY_VALUE}>
                      + Add New Category
                    </MenuItem>
                    <MenuItem value="">No Category</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>
            <ProductPackSizeFields
              form={editForm}
              setForm={setEditForm}
              units={units}
              addNewUnitValue={ADD_NEW_UNIT_VALUE}
              onUnitSelect={() => setCreateUnitDialogOpen(true)}
              disabled={editing}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  SKU / Code
                </Typography>
                <TextField
                  placeholder="SKU-001"
                  value={editForm.sku}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  fullWidth
                />
              </Box>
            </Stack>
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.75}>
                Selling Price (K)
              </Typography>
              <TextField
                value={editForm.selling_price}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    selling_price: sanitizeCommaAmountInput(e.target.value),
                  }))
                }
                fullWidth
                inputProps={{ inputMode: "decimal" }}
                placeholder="e.g. 100,000"
              />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.75}>
                Description
              </Typography>
              <TextField
                placeholder="Optional description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveEdit}
            disabled={
              !editForm.name.trim() ||
              !editForm.unit_id ||
              editing ||
              !editFormHasChanges
            }
          >
            {editing ? "Saving…" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createUnitDialogOpen}
        onClose={() => setCreateUnitDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Unit</DialogTitle>
        <DialogContent>
          <Stack sx={{ pt: 1 }}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Unit Name
            </Typography>
            <TextField
              placeholder="e.g. pcs, ml, box, bot"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateUnitDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateUnit}
            disabled={!newUnitName.trim() || addingUnit}
          >
            {addingUnit ? "Adding..." : "Add Unit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createCategoryDialogOpen}
        onClose={() => setCreateCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Category</DialogTitle>
        <DialogContent>
          <Stack sx={{ pt: 1 }}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Category Name
            </Typography>
            <TextField
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateCategoryDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim() || addingCategory}
          >
            {addingCategory ? "Adding..." : "Add Category"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createTypeDialogOpen}
        onClose={() => setCreateTypeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Product Type</DialogTitle>
        <DialogContent>
          <Stack sx={{ pt: 1 }}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Product Type Name
            </Typography>
            <TextField
              placeholder="e.g. Medication"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateTypeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateType}
            disabled={!newTypeName.trim() || addingType}
          >
            {addingType ? "Adding..." : "Add Product Type"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          Adjust Stock — {product.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {adjustError && <Alert severity="error">{adjustError}</Alert>}

            <Box>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Type
              </Typography>
              <ToggleButtonGroup
                value={adjustType}
                exclusive
                onChange={(_, v) => {
                  if (!v) return;
                  if (v === "adjustment" && !canAbsoluteAdjust) return;
                  setAdjustType(v);
                }}
                size="small"
                fullWidth
                sx={{
                  "& .MuiToggleButton-root": { textTransform: "none" },
                }}
              >
                <ToggleButton value="in">Stock In</ToggleButton>
                <ToggleButton value="out">Stock Out</ToggleButton>
                {canAbsoluteAdjust ? (
                  <ToggleButton value="adjustment">Adjustment</ToggleButton>
                ) : null}
              </ToggleButtonGroup>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, lineHeight: 1.5 }}
              >
                {adjustTypeHelperText[adjustType]}
              </Typography>
            </Box>

            <TextField
              label={adjustQtyLabel}
              type="number"
              value={adjustForm.quantity}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, quantity: e.target.value }))
              }
              fullWidth
              required
              helperText={
                adjustType === "out" || adjustType === "adjustment"
                  ? `On hand (sealed): ${currentStockCount} ${stockUnitName}`
                  : undefined
              }
              slotProps={{
                htmlInput: { min: adjustType === "adjustment" ? 0 : 1 },
              }}
            />

            {adjustType === "in" && (
              <>
                <Divider />
                <Typography variant="caption" color="text.secondary">
                  Batch info (optional for stock-in)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Batch Number"
                    value={adjustForm.batch_number}
                    onChange={(e) =>
                      setAdjustForm((f) => ({
                        ...f,
                        batch_number: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Expiry Date"
                    type="date"
                    value={adjustForm.expiry_date}
                    onChange={(e) =>
                      setAdjustForm((f) => ({
                        ...f,
                        expiry_date: e.target.value,
                      }))
                    }
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={adjustForm.is_sample}
                      onChange={(_, checked) =>
                        setAdjustForm((f) => ({
                          ...f,
                          is_sample: checked,
                          cost_price: checked ? "" : f.cost_price,
                        }))
                      }
                      color="primary"
                    />
                  }
                  label="Sample / gift (no purchase cost)"
                />
                <TextField
                  label="Cost (K per unit)"
                  value={adjustForm.cost_price}
                  onChange={(e) =>
                    setAdjustForm((f) => ({
                      ...f,
                      cost_price: sanitizeCommaAmountInput(e.target.value),
                    }))
                  }
                  fullWidth
                  required={!adjustForm.is_sample}
                  disabled={adjustForm.is_sample}
                  helperText="Cost means purchased price"
                  inputProps={{ inputMode: "decimal" }}
                  placeholder="e.g. 100,000"
                />
              </>
            )}

            {needsWriteOffReason && (
              <FormControl fullWidth required>
                <InputLabel>{COPY.adjustmentWriteOffReasonLabel}</InputLabel>
                <Select
                  label={COPY.adjustmentWriteOffReasonLabel}
                  value={adjustForm.reason}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                  }
                >
                  {adjustWriteOffReasons.map((key) => (
                    <MenuItem key={key} value={key}>
                      {COPY.adjustmentWriteOffReasons[key]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Note (optional)"
              value={adjustForm.note}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, note: e.target.value }))
              }
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAdjust}
            disabled={
              adjustForm.quantity === "" ||
              Number.isNaN(Number(adjustForm.quantity)) ||
              (adjustType !== "adjustment" &&
                Number(adjustForm.quantity) <= 0) ||
              (adjustType === "adjustment" &&
                Number(adjustForm.quantity) < 0) ||
              (needsWriteOffReason && !adjustForm.reason) ||
              (adjustType === "in" &&
                !adjustForm.is_sample &&
                (adjustForm.cost_price === "" ||
                  !Number.isFinite(parseCommaAmount(adjustForm.cost_price)) ||
                  parseCommaAmount(adjustForm.cost_price) <= 0)) ||
              adjusting
            }
          >
            {adjusting ? "Saving…" : "Apply Adjustment"}
          </Button>
        </DialogActions>
      </Dialog>

      <RecordWastageDialog
        open={wastageOpen}
        onClose={() => setWastageOpen(false)}
        product={product}
        batches={batches}
        onSuccess={load}
      />

      <Dialog
        open={Boolean(affectedBatch)}
        onClose={() => !affectedLoading && setAffectedBatch(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            m: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
          Affected patients — batch{" "}
          {affectedBatch?.batch_number ?? affectedBatch?.id}
        </DialogTitle>
        <DialogContent>
          {affectedLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <LoadingIndicator size={28} />
            </Box>
          ) : affectedPatients.length === 0 ? (
            <Typography color="text.secondary">
              No patient usage recorded for this batch.
            </Typography>
          ) : (
            <TableContainer sx={scrollableTablePaperSx}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Treatment date</TableCell>
                    <TableCell align="right">Qty used</TableCell>
                    <TableCell>Doctor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {affectedPatients.map((row, idx) => (
                    <TableRow
                      key={`${row.patient_id}-${row.treatment_id}-${idx}`}
                    >
                      <TableCell>{row.patient_name ?? "—"}</TableCell>
                      <TableCell>{row.treatment_date ?? "—"}</TableCell>
                      <TableCell align="right">{row.quantity_used}</TableCell>
                      <TableCell>
                        {row.doctor_name ?? row.therapist_name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            flexWrap: "nowrap",
            overflowX: "auto",
            px: { xs: 2, sm: 3 },
          }}
        >
          <Button onClick={() => setAffectedBatch(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(recallBatch)}
        onClose={() => !recalling && setRecallBatch(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            m: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle>Open batch recall</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: { xs: 0, sm: 360 } }}>
            <Typography variant="body2" color="text.secondary">
              Batch {recallBatch?.batch_number ?? recallBatch?.id} will be
              quarantined and excluded from FIFO.
            </Typography>
            <TextField
              select
              label="Severity"
              value={recallSeverity}
              onChange={(e) => setRecallSeverity(e.target.value)}
              fullWidth
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="voluntary">Voluntary</MenuItem>
              <MenuItem value="mandatory">Mandatory</MenuItem>
            </TextField>
            <TextField
              label="Reason"
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            flexWrap: "nowrap",
            overflowX: "auto",
            px: { xs: 2, sm: 3 },
          }}
        >
          <Button onClick={() => setRecallBatch(null)} disabled={recalling}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitRecall}
            disabled={recalling || !recallReason.trim()}
          >
            {recalling ? "Opening…" : "Open recall"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
