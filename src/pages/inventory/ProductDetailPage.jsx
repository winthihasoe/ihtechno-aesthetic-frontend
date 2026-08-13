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
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TuneIcon from "@mui/icons-material/Tune";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
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

function movementChipColor(type) {
  if (type === "in") return "success";
  if (type === "out") return "error";
  return "secondary";
}

const ADD_NEW_UNIT_VALUE = "__add_new_unit__";
const ADD_NEW_CATEGORY_VALUE = "__add_new_category__";
const ADD_NEW_TYPE_VALUE = "__add_new_type__";

function buildEditFormFromProduct(product) {
  return {
    name: product?.name ?? "",
    generic_name: product?.generic_name ?? "",
    included_amount: product?.included_amount ?? "",
    sku: product?.sku ?? "",
    unit_id: String(product?.unit_id ?? ""),
    category_id: String(product?.category_id ?? ""),
    product_type_id: String(product?.product_type_id ?? ""),
    min_stock_level: String(product?.min_stock_level ?? 0),
    selling_price:
      product?.selling_price != null ? String(product.selling_price) : "",
    description: product?.description ?? "",
  };
}

export default function ProductDetailPage() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("in");
  const [adjustForm, setAdjustForm] = useState({
    quantity: "",
    note: "",
    batch_number: "",
    expiry_date: "",
    cost_price: "",
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
  const [newUnitName, setNewUnitName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [addingUnit, setAddingUnit] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, b, m] = await Promise.all([
        getProduct(id),
        getBatches(id),
        getMovements(id),
      ]);
      const [cats, unitOptions, typeOptions] = await Promise.all([
        getCategories(),
        getProductUnits(),
        getProductTypes(),
      ]);
      setProduct(p);
      setBatches(b);
      setMovements(m);
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

  const handleAdjust = async () => {
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) return;
    setAdjusting(true);
    setAdjustError("");
    try {
      await adjustStock(id, {
        type: adjustType,
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note,
        batch_number: adjustForm.batch_number || undefined,
        expiry_date: adjustForm.expiry_date || undefined,
        cost_price: adjustForm.cost_price
          ? Number(adjustForm.cost_price)
          : undefined,
      });
      setAdjustOpen(false);
      setAdjustForm({
        quantity: "",
        note: "",
        batch_number: "",
        expiry_date: "",
        cost_price: "",
      });
      setAdjustType("in");
      load();
    } catch (e) {
      setAdjustError(
        e?.response?.data?.message ?? "Adjustment failed. Check stock levels.",
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
      await updateProduct(product.id, {
        name: editForm.name.trim(),
        generic_name: editForm.generic_name.trim() || null,
        included_amount: editForm.included_amount.trim() || null,
        sku: editForm.sku.trim() || null,
        unit_id: Number(editForm.unit_id),
        category_id: editForm.category_id ? Number(editForm.category_id) : null,
        product_type_id: editForm.product_type_id
          ? Number(editForm.product_type_id)
          : null,
        min_stock_level: Number(editForm.min_stock_level || 0),
        selling_price:
          editForm.selling_price === ""
            ? null
            : Number(editForm.selling_price),
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
      setTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
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
      setUnits((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
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
        <CircularProgress color="primary" />
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
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/inventory")}
        sx={{ mb: 2 }}
        color="primary"
      >
        Back to Inventory
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
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
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="primary"
              onClick={openEditDialog}
            >
              Edit Product
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<TuneIcon />}
              onClick={() => setAdjustOpen(true)}
            >
              Adjust Stock
            </Button>
          </Stack>
        )}
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        {[
          {
            label: "Total Stock",
            value: `${product.total_stock} ${product.unit}`,
          },
          {
            label: "Min Stock Level",
            value:
              product.min_stock_level > 0
                ? `${product.min_stock_level} ${product.unit}`
                : "—",
          },
          {
            label: "Active Batches",
            value: batches.filter((b) => b.quantity > 0).length,
          },
          {
            label: "Selling Price",
            value:
              product.selling_price != null
                ? formatKyats(product.selling_price)
                : "—",
          },
        ].map(({ label, value }) => (
          <Paper key={label} sx={{ flex: 1, p: 2.5, borderRadius: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={700} mt={0.5} color="text.primary">
              {value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
        }}
      >
        <Tab label={`Batches (${batches.length})`} />
        <Tab label={`Movements (${movements.length})`} />
      </Tabs>

      {tab === 0 &&
        (batches.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography>No batches recorded.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
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
                          {b.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {b.cost_price != null ? formatKyats(b.cost_price) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {tab === 1 &&
        (movements.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography>No movements recorded.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
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
                        label={
                          m.type.charAt(0).toUpperCase() + m.type.slice(1)
                        }
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
                        {m.source_type ?? "—"}
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
        PaperProps={{ sx: { borderRadius: 2 } }}
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
                    setEditForm((f) => ({ ...f, included_amount: e.target.value }))
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
                  Unit
                </Typography>
                <FormControl fullWidth>
                  <Select
                    displayEmpty
                    value={editForm.unit_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_UNIT_VALUE) {
                        setCreateUnitDialogOpen(true);
                        return;
                      }
                      setEditForm((f) => ({ ...f, unit_id: value }));
                    }}
                  >
                    <MenuItem value={ADD_NEW_UNIT_VALUE}>+ Add New Unit</MenuItem>
                    <MenuItem value="" disabled>
                      Select unit
                    </MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.name}
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
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Min Stock Level
                </Typography>
                <TextField
                  type="number"
                  value={editForm.min_stock_level}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      min_stock_level: e.target.value,
                    }))
                  }
                  fullWidth
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              </Box>
            </Stack>
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.75}>
                Selling Price (K)
              </Typography>
              <TextField
                type="number"
                value={editForm.selling_price}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, selling_price: e.target.value }))
                }
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
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
          <Button onClick={() => setCreateCategoryDialogOpen(false)}>Cancel</Button>
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
                onChange={(_, v) => v && setAdjustType(v)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": { textTransform: "none" },
                }}
              >
                <ToggleButton value="in">Stock In</ToggleButton>
                <ToggleButton value="out">Stock Out</ToggleButton>
                <ToggleButton value="adjustment">Adjustment</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              label="Quantity"
              type="number"
              value={adjustForm.quantity}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, quantity: e.target.value }))
              }
              fullWidth
              required
              slotProps={{ htmlInput: { min: 1 } }}
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
                <TextField
                  label="Cost (K per unit)"
                  type="number"
                  value={adjustForm.cost_price}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, cost_price: e.target.value }))
                  }
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </>
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
              !adjustForm.quantity ||
              Number(adjustForm.quantity) <= 0 ||
              adjusting
            }
          >
            {adjusting ? "Saving…" : "Apply Adjustment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
