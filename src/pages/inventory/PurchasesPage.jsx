import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  FormControl,
  FormHelperText,
  IconButton,
  Tooltip,
  Divider,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import NewProductDialog from "../../components/inventory/NewProductDialog";
import { emptyNewProductForm } from "../../components/inventory/newProductShared";
import {
  getPurchases,
  createPurchase,
  getSuppliers,
  getCategories,
  getProductUnits,
  getProductTypes,
  searchProducts,
  createSupplier,
} from "./inventoryService";

function purchaseStatusLabel(status) {
  if (status === "received") return "Received";
  return "Draft";
}

function purchaseStatusChipColor(status) {
  if (status === "received") return "success";
  return "default";
}

function receiptTypeChipColor(receiptType) {
  if (receiptType === "consignment") return "warning";
  return "default";
}

function receiptTypeLabel(receiptType) {
  if (receiptType === "consignment") return "Consignment";
  return "Purchased";
}

/** True if "New receipt" dialog has anything beyond a fresh blank form. */
function createDialogHasDraft(form, supplierInputValue, items) {
  if (form.supplier_id) return true;
  if ((supplierInputValue ?? "").trim()) return true;
  if ((form.notes ?? "").trim()) return true;
  if (
    (form.receipt_type ?? "purchased") === "purchased" &&
    (form.payable_due_date ?? "").trim()
  )
    return true;
  if ((form.receipt_type ?? "purchased") === "consignment") return true;

  const itemTouched = (it) =>
    !!(it.product_id ?? "").toString().trim() ||
    !!(it.batch_number ?? "").trim() ||
    !!(it.expiry_date ?? "").trim() ||
    !!(String(it.quantity ?? "").trim()) ||
    !!(String(it.cost_price ?? "").trim()) ||
    !!(it.product_name_query ?? "").trim() ||
    !!(it.generic_name_query ?? "").trim();

  return items.length > 1 || items.some(itemTouched);
}

const EMPTY_ITEM = {
  product_id: "",
  selected_product: null,
  product_name_query: "",
  generic_name_query: "",
  search_options: [],
  search_loading: false,
  batch_number: "",
  expiry_date: "",
  quantity: "",
  cost_price: "",
};

const PRODUCT_SEARCH_MIN_CHARS = 3;
const PRODUCT_SEARCH_DEBOUNCE_MS = 450;

const emptySupplierForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
});

export default function PurchasesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [productUnits, setProductUnits] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [dialogDataLoading, setDialogDataLoading] = useState(false);

  const [form, setForm] = useState({
    supplier_id: "",
    date: dayjs().format("YYYY-MM-DD"),
    notes: "",
    payable_due_date: "",
    receipt_type: "purchased",
  });
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState(emptySupplierForm);
  const [addSupplierSaving, setAddSupplierSaving] = useState(false);
  const [addSupplierError, setAddSupplierError] = useState("");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductDefaults, setAddProductDefaults] = useState(() =>
    emptyNewProductForm(),
  );
  const [addProductError, setAddProductError] = useState("");
  const [addProductContext, setAddProductContext] = useState({
    idx: null,
    field: "product",
  });
  const searchTimersRef = useRef({});
  const productSearchCacheRef = useRef(new Map());
  const productSearchRequestRef = useRef({});

  const autocompleteSlotProps = {
    paper: {
      sx: {
        bgcolor: "background.default",

        borderRadius: 1,
      },
    },
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setPurchases(await getPurchases());
    } catch {
      setError("Could not load receipts.");
    } finally {
      setLoading(false);
    }
  };

  const loadDialogData = async () => {
    setSuppliersLoading(true);
    setDialogDataLoading(true);
    try {
      const [s, categories, units, types] = await Promise.all([
        getSuppliers(),
        getCategories(),
        getProductUnits(),
        getProductTypes(),
      ]);
      setSuppliers(s);
      setProductCategories(categories);
      setProductUnits(units);
      setProductTypes(types);
    } finally {
      setSuppliersLoading(false);
      setDialogDataLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = async () => {
    setForm({
      supplier_id: "",
      date: dayjs().format("YYYY-MM-DD"),
      notes: "",
      payable_due_date: "",
      receipt_type: "purchased",
    });
    setSupplierInputValue("");
    setItems([{ ...EMPTY_ITEM }]);
    setSaveError("");
    setCreateOpen(true);
    if (suppliers.length === 0) await loadDialogData();
  };

  const openAddSupplier = (initialName = "") => {
    setNewSupplier({ ...emptySupplierForm(), name: initialName.trim() });
    setAddSupplierError("");
    setAddSupplierOpen(true);
  };

  const saveNewSupplierFromPurchase = async () => {
    if (!newSupplier.name.trim()) {
      setAddSupplierError("Name is required.");
      return;
    }
    setAddSupplierSaving(true);
    setAddSupplierError("");
    try {
      const created = await createSupplier({
        name: newSupplier.name.trim(),
        phone: newSupplier.phone.trim() || null,
        email: newSupplier.email.trim() || null,
        address: newSupplier.address.trim() || null,
      });
      setSuppliers((prev) =>
        [...prev, { ...created, purchases_count: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setForm((f) => ({ ...f, supplier_id: String(created.id) }));
      setSupplierInputValue(created.name);
      setAddSupplierOpen(false);
      setNewSupplier(emptySupplierForm());
    } catch (e) {
      setAddSupplierError(
        e?.response?.data?.message ?? "Could not create supplier.",
      );
    } finally {
      setAddSupplierSaving(false);
    }
  };

  const setItem = (idx, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  };

  const setItemPatch = (idx, patch) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  };

  const applySelectedProduct = (idx, product) => {
    setItemPatch(idx, {
      selected_product: product,
      product_id: String(product.id),
      product_name_query: product.name ?? "",
      generic_name_query: product.generic_name ?? "",
    });
  };

  const clearSelectedProduct = (idx) => {
    setItemPatch(idx, {
      selected_product: null,
      product_id: "",
      product_name_query: "",
      generic_name_query: "",
      search_options: [],
      search_loading: false,
    });
  };

  const handleProductSearchInput = (idx, field, inputValue) => {
    const query = inputValue.trim();
    const isSearchable = query.length >= PRODUCT_SEARCH_MIN_CHARS;
    const patch =
      field === "product"
        ? { product_name_query: inputValue }
        : { generic_name_query: inputValue };
    setItemPatch(idx, {
      ...patch,
      product_id: "",
      selected_product: null,
      search_loading: isSearchable,
      search_options: isSearchable ? [] : [],
    });

    const timerKey = `${idx}-${field}`;
    if (searchTimersRef.current[timerKey]) {
      clearTimeout(searchTimersRef.current[timerKey]);
    }

    if (!isSearchable) {
      productSearchRequestRef.current[timerKey] = null;
      return;
    }

    const cacheKey = query.toLowerCase();
    const cachedRows = productSearchCacheRef.current.get(cacheKey);
    if (cachedRows) {
      setItemPatch(idx, {
        search_options: cachedRows,
        search_loading: false,
      });
      productSearchRequestRef.current[timerKey] = null;
      return;
    }

    const requestToken = Symbol(cacheKey);
    productSearchRequestRef.current[timerKey] = requestToken;

    searchTimersRef.current[timerKey] = setTimeout(async () => {
      try {
        const rows = await searchProducts(query);
        productSearchCacheRef.current.set(cacheKey, rows);
        if (productSearchRequestRef.current[timerKey] !== requestToken) return;
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  search_options: rows,
                  search_loading: false,
                }
              : it,
          ),
        );
      } catch {
        if (productSearchRequestRef.current[timerKey] !== requestToken) return;
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? { ...it, search_options: [], search_loading: false }
              : it,
          ),
        );
      }
    }, PRODUCT_SEARCH_DEBOUNCE_MS);
  };

  const openAddProductDialog = (idx, field) => {
    const row = items[idx];
    const fromProduct = field === "product";
    setAddProductContext({ idx, field });
    setAddProductError("");
    const costRaw = row.cost_price;
    const costStr =
      costRaw !== "" &&
      costRaw != null &&
      String(costRaw).trim() !== "" &&
      !Number.isNaN(Number(costRaw))
        ? String(costRaw)
        : "";
    setAddProductDefaults({
      ...emptyNewProductForm(),
      name: fromProduct ? row.product_name_query : "",
      generic_name: !fromProduct ? row.generic_name_query : "",
      ...(costStr !== "" ? { selling_price: costStr } : {}),
    });
    setAddProductOpen(true);
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const totalAmount = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const c = Number(it.cost_price) || 0;
    return sum + q * c;
  }, 0);

  const duplicateProductIds = new Set(
    Object.entries(
      items.reduce((counts, it) => {
        if (!it.product_id) return counts;
        counts[it.product_id] = (counts[it.product_id] || 0) + 1;
        return counts;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([productId]) => productId),
  );

  const selectedSupplier =
    suppliers.find((s) => String(s.id) === String(form.supplier_id)) ?? null;

  const persistCreateReceipt = async () => {
    const validItems = items.filter(
      (it) => it.product_id && Number(it.quantity) > 0,
    );
    if (validItems.length === 0) {
      setSaveError("Add at least one item with a product and quantity.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const receiptType = form.receipt_type ?? "purchased";
      await createPurchase({
        supplier_id: form.supplier_id || null,
        date: form.date,
        notes: form.notes,
        payable_due_date:
          receiptType === "purchased" && form.payable_due_date?.trim()
            ? form.payable_due_date
            : undefined,
        receipt_type: receiptType,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          batch_number: it.batch_number || undefined,
          expiry_date: it.expiry_date || undefined,
          quantity: Number(it.quantity),
          cost_price: Number(it.cost_price ?? 0),
        })),
      });
      setCreateOpen(false);
      load();
    } catch (e) {
      setSaveError(e?.response?.data?.message ?? "Failed to save receipt.");
    } finally {
      setSaving(false);
    }
  };

  const attemptCloseCreateDialog = () => {
    if (!createDialogHasDraft(form, supplierInputValue, items)) {
      setCreateOpen(false);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Discard this receipt? Any data you entered will be lost.",
      )
    ) {
      setCreateOpen(false);
    }
  };

  const handleSaveReceiptClick = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Save this receipt? It cannot be edited after it is saved.",
      )
    ) {
      return;
    }
    await persistCreateReceipt();
  };

  return (
    <Box>
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
            Inventory receiving
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record stock received from suppliers into batches
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            New receipt
          </Button>
        )}
      </Box>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Create a receipt for each delivery: pick the supplier, then add each item
        with its <strong>batch number</strong>, <strong>expiry date</strong>,
        quantity and cost. Receiving a purchase automatically creates stock
        batches and an <em>in</em> movement — no need to adjust stock by hand.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : purchases.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, color: "text.secondary" }}>
          <ShoppingCartIcon
            sx={{
              fontSize: 56,
              mb: 1,
              color: "action.disabled",
              opacity: theme.palette.mode === "dark" ? 0.35 : 0.5,
            }}
          />
          <Typography variant="h6" color="text.primary">
            No receipts yet
          </Typography>
          {canManage && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Click <strong>New receipt</strong> to record your first stock-in.
            </Typography>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Receipt type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Total
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created by</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((po) => {
                const chipColor = purchaseStatusChipColor(po.status);
                const rt = po.receipt_type ?? "purchased";
                return (
                  <TableRow
                    key={po.id}
                    hover
                    onClick={() => navigate(`./${po.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography fontWeight={600} color="text.primary">
                        {dayjs(po.date).format("DD MMM YYYY")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {po.supplier?.name ?? (
                        <Typography color="text.secondary">
                          No supplier
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={receiptTypeLabel(rt)}
                        color={receiptTypeChipColor(rt)}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {po.items_count ?? po.items?.length ?? "—"} item(s)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={700}
                        color={
                          rt === "consignment"
                            ? "warning.main"
                            : "text.primary"
                        }
                      >
                        {formatKyats(
                          rt === "consignment" &&
                            po.reference_amount != null
                            ? po.reference_amount
                            : po.total_amount,
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={purchaseStatusLabel(po.status)}
                        color={chipColor}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {po.creator?.name ?? "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={createOpen}
        onClose={() => attemptCloseCreateDialog()}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          New inventory receipt
        </DialogTitle>
        <DialogContent sx={{ overflowX: "hidden" }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Autocomplete
                options={suppliers}
                loading={suppliersLoading}
                value={selectedSupplier}
                inputValue={supplierInputValue}
                slotProps={autocompleteSlotProps}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : (option?.name ?? "")
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(_, value, reason) => {
                  if (reason === "input" || reason === "clear") {
                    setSupplierInputValue(value);
                    if (reason === "clear") {
                      setForm((f) => ({ ...f, supplier_id: "" }));
                    }
                    if (
                      reason === "input" &&
                      value !== selectedSupplier?.name
                    ) {
                      setForm((f) => ({ ...f, supplier_id: "" }));
                    }
                  }
                }}
                onChange={(_, value) => {
                  setForm((f) => ({
                    ...f,
                    supplier_id: value ? String(value.id) : "",
                  }));
                  setSupplierInputValue(value?.name ?? "");
                }}
                noOptionsText={
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">
                      No matching supplier.
                    </Typography>
                    {canManage && (
                      <Button
                        size="small"
                        variant="outlined"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openAddSupplier(supplierInputValue)}
                      >
                        Add Supplier
                      </Button>
                    )}
                  </Stack>
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Supplier (optional)"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {suppliersLoading ? (
                            <CircularProgress color="inherit" size={16} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                fullWidth
                sx={{ flex: { sm: "0 0 200px" } }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <FormControl component="fieldset" variant="standard">
              <FormLabel component="legend" sx={{ fontWeight: 700, mb: 0.5 }}>
                Receipt type
              </FormLabel>
              <RadioGroup
                row
                value={form.receipt_type ?? "purchased"}
                onChange={(e) => {
                  const receipt_type = e.target.value;
                  setForm((f) => ({
                    ...f,
                    receipt_type,
                    ...(receipt_type === "consignment"
                      ? { payable_due_date: "" }
                      : {}),
                  }));
                }}
              >
                <FormControlLabel
                  value="purchased"
                  control={<Radio size="small" />}
                  label="Purchased"
                />
                <FormControlLabel
                  value="consignment"
                  control={<Radio size="small" />}
                  label="Consignment"
                />
              </RadioGroup>
              <FormHelperText sx={{ mt: 0 }}>
                Purchased receipts can set a payable due date (optional);
                consignment receipts do not.
              </FormHelperText>
            </FormControl>

            <TextField
              label="Memo (optional)"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              fullWidth
              multiline
              rows={1}
            />
            {(form.receipt_type ?? "purchased") === "purchased" ? (
              <TextField
                label="Payable due date (optional)"
                type="date"
                value={form.payable_due_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payable_due_date: e.target.value,
                  }))
                }
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                helperText="Shown on Supplier payables; overdue and upcoming dues are highlighted there."
              />
            ) : null}

            <Divider />

            <Box>
              <Typography fontWeight={600} mb={1} color="text.primary">
                Items
              </Typography>
              <Stack spacing={1.5}>
                {items.map((it, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                      >
                        <Autocomplete
                          size="small"
                          options={it.search_options || []}
                          loading={it.search_loading}
                          value={it.selected_product}
                          inputValue={it.product_name_query}
                          slotProps={autocompleteSlotProps}
                          getOptionLabel={(option) =>
                            typeof option === "string"
                              ? option
                              : (option?.name ?? "")
                          }
                          isOptionEqualToValue={(option, value) =>
                            option.id === value.id
                          }
                          onInputChange={(_, value, reason) => {
                            if (reason === "input") {
                              handleProductSearchInput(idx, "product", value);
                            } else if (reason === "clear") {
                              clearSelectedProduct(idx);
                            }
                          }}
                          onChange={(_, value) => {
                            if (value) {
                              applySelectedProduct(idx, value);
                            } else {
                              clearSelectedProduct(idx);
                            }
                          }}
                          noOptionsText={
                            it.product_name_query.trim().length <
                            PRODUCT_SEARCH_MIN_CHARS ? (
                              `Type at least ${PRODUCT_SEARCH_MIN_CHARS} characters`
                            ) : (
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                alignItems={{ xs: "stretch", sm: "center" }}
                                justifyContent="space-between"
                              >
                                <Typography variant="body2">
                                  No matching product.
                                </Typography>
                                {canManage && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() =>
                                      openAddProductDialog(idx, "product")
                                    }
                                  >
                                    Add Product
                                  </Button>
                                )}
                              </Stack>
                            )
                          }
                          renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" fontWeight={600}>
                                  {option.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {option.generic_name || "No generic"}{" "}
                                  {option.included_amount
                                    ? `• ${option.included_amount}`
                                    : ""}
                                  {option.sku ? ` • SKU: ${option.sku}` : ""}
                                </Typography>
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Product Name *"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {it.search_loading ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={16}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                        <Autocomplete
                          size="small"
                          options={it.search_options || []}
                          loading={it.search_loading}
                          value={it.selected_product}
                          inputValue={it.generic_name_query}
                          slotProps={autocompleteSlotProps}
                          getOptionLabel={(option) =>
                            typeof option === "string"
                              ? option
                              : option?.generic_name || option?.name || ""
                          }
                          isOptionEqualToValue={(option, value) =>
                            option.id === value.id
                          }
                          onInputChange={(_, value, reason) => {
                            if (reason === "input") {
                              handleProductSearchInput(idx, "generic", value);
                            } else if (reason === "clear") {
                              clearSelectedProduct(idx);
                            }
                          }}
                          onChange={(_, value) => {
                            if (value) {
                              applySelectedProduct(idx, value);
                            } else {
                              clearSelectedProduct(idx);
                            }
                          }}
                          noOptionsText={
                            it.generic_name_query.trim().length <
                            PRODUCT_SEARCH_MIN_CHARS ? (
                              `Type at least ${PRODUCT_SEARCH_MIN_CHARS} characters`
                            ) : (
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                alignItems={{ xs: "stretch", sm: "center" }}
                                justifyContent="space-between"
                              >
                                <Typography variant="body2">
                                  No matching generic.
                                </Typography>
                                {canManage && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() =>
                                      openAddProductDialog(idx, "generic")
                                    }
                                  >
                                    Add Product
                                  </Button>
                                )}
                              </Stack>
                            )
                          }
                          renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" fontWeight={600}>
                                  {option.generic_name || option.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {option.name}
                                  {option.included_amount
                                    ? ` • ${option.included_amount}`
                                    : ""}
                                  {option.sku ? ` • SKU: ${option.sku}` : ""}
                                </Typography>
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Generic Name"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {it.search_loading ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={16}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      </Stack>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <TextField
                          label="Batch #"
                          size="small"
                          value={it.batch_number}
                          onChange={(e) =>
                            setItem(idx, "batch_number", e.target.value)
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Expiry"
                          type="date"
                          size="small"
                          value={it.expiry_date}
                          onChange={(e) =>
                            setItem(idx, "expiry_date", e.target.value)
                          }
                          sx={{ flex: 1 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          label="Qty *"
                          type="number"
                          size="small"
                          value={it.quantity}
                          onChange={(e) =>
                            setItem(idx, "quantity", e.target.value)
                          }
                          sx={{ flex: 1 }}
                          slotProps={{ htmlInput: { min: 1 } }}
                        />
                        <TextField
                          label="Cost/unit (K)"
                          type="number"
                          size="small"
                          value={it.cost_price}
                          onChange={(e) =>
                            setItem(idx, "cost_price", e.target.value)
                          }
                          sx={{ flex: 1 }}
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        />
                        <Tooltip title="Remove row">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => removeItem(idx)}
                              disabled={items.length === 1}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                      {duplicateProductIds.has(String(it.product_id)) && (
                        <FormHelperText error sx={{ mt: -0.5, mx: 0 }}>
                          This product is already added in another purchase item
                          row.
                        </FormHelperText>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addItem}
                sx={{ mt: 1 }}
              >
                Add Row
              </Button>
            </Box>

            {totalAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Typography fontWeight={700} variant="h6" color="text.primary">
                  Total: {formatKyats(totalAmount)}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={attemptCloseCreateDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveReceiptClick}
            disabled={saving || suppliersLoading}
          >
            {saving ? "Saving…" : "Save receipt"}
          </Button>
        </DialogActions>
      </Dialog>

      <NewProductDialog
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        categories={productCategories}
        units={productUnits}
        types={productTypes}
        onUnitsUpdated={setProductUnits}
        onCategoriesUpdated={setProductCategories}
        onTypesUpdated={setProductTypes}
        defaultFormValues={addProductDefaults}
        bannerError={addProductError}
        disableSubmit={dialogDataLoading}
        submitLabel="Save Product"
        contextAlert={
          addProductContext.idx != null ? (
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              <Typography variant="body2">
                New product for line <strong>{addProductContext.idx + 1}</strong>{" "}
                on this receipt
                {selectedSupplier?.name ? (
                  <>
                    {" "}
                    · Supplier: <strong>{selectedSupplier.name}</strong>
                  </>
                ) : null}
                {form.date ? (
                  <>
                    {" "}
                    · Receipt date:{" "}
                    <strong>{dayjs(form.date).format("DD MMM YYYY")}</strong>
                  </>
                ) : null}
                . After saving, it is selected on that line so you can enter
                batch, quantity, and cost.
              </Typography>
            </Alert>
          ) : null
        }
        onSuccess={(created) => {
          if (addProductContext.idx != null) {
            applySelectedProduct(addProductContext.idx, created);
          }
          productSearchCacheRef.current.clear();
        }}
        onSaveError={(msg) => setAddProductError(msg)}
      />

      <Dialog
        open={addSupplierOpen}
        onClose={() => !addSupplierSaving && setAddSupplierOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          Add supplier
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {addSupplierError && (
              <Alert severity="error">{addSupplierError}</Alert>
            )}
            <TextField
              label="Name"
              required
              fullWidth
              value={newSupplier.name}
              onChange={(e) =>
                setNewSupplier((f) => ({ ...f, name: e.target.value }))
              }
            />
            <TextField
              label="Phone"
              fullWidth
              value={newSupplier.phone}
              onChange={(e) =>
                setNewSupplier((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newSupplier.email}
              onChange={(e) =>
                setNewSupplier((f) => ({ ...f, email: e.target.value }))
              }
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              minRows={2}
              value={newSupplier.address}
              onChange={(e) =>
                setNewSupplier((f) => ({ ...f, address: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setAddSupplierOpen(false)}
            disabled={addSupplierSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveNewSupplierFromPurchase}
            disabled={addSupplierSaving}
          >
            {addSupplierSaving ? "Saving…" : "Save supplier"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
