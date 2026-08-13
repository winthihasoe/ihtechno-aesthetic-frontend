import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  createCategory,
  createProductUnit,
  createProductType,
  createProduct,
} from "../../pages/inventory/inventoryService";

import {
  ADD_NEW_UNIT_VALUE,
  ADD_NEW_CATEGORY_VALUE,
  ADD_NEW_TYPE_VALUE,
  emptyNewProductForm,
} from "./newProductShared";

function normalizeCreatePayload(form) {
  return {
    ...form,
    category_id: form.category_id || null,
    sku: form.sku.trim() || null,
    generic_name: form.generic_name.trim() || null,
    included_amount: form.included_amount.trim() || null,
    product_type_id: form.product_type_id || null,
    min_stock_level: Number(form.min_stock_level) || 0,
    selling_price:
      form.selling_price === "" ? null : Number(form.selling_price),
    description: form.description.trim() || null,
    unit_id: Number(form.unit_id),
  };
}

/**
 * Add Product dialog plus nested Add Unit / Category / Product Type dialogs.
 */
export default function NewProductDialog({
  open,
  onClose,
  categories,
  units,
  types,
  onUnitsUpdated,
  onCategoriesUpdated,
  onTypesUpdated,
  /** Merged into form when `open` becomes true */
  defaultFormValues,
  /** Optional Alert content under the title (receipt context, etc.) */
  contextAlert,
  /** Optional error banner inside the main dialog (e.g. API message from parent) */
  bannerError,
  /** Disable primary submit (e.g. parent options still loading) */
  disableSubmit,
  title = "Add Product",
  submitLabel = "Add Product",
  savingLabel = "Saving…",
  onSuccess,
  /** Called for any failed save (main product or nested dialogs) */
  onSaveError,
}) {
  const [form, setForm] = useState(() => emptyNewProductForm());
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyNewProductForm(),
      ...(defaultFormValues || {}),
    });
    setNewUnitName("");
    setNewCategoryName("");
    setNewTypeName("");
    setCreateUnitDialogOpen(false);
    setCreateCategoryDialogOpen(false);
    setCreateTypeDialogOpen(false);
  }, [open, defaultFormValues]);

  const handleCloseMain = () => {
    if (saving) return;
    onClose?.();
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.unit_id) return;
    setSaving(true);
    try {
      const created = await createProduct(normalizeCreatePayload(form));
      await onSuccess?.(created);
      handleCloseMain();
      setForm(emptyNewProductForm());
      setCreateUnitDialogOpen(false);
      setCreateCategoryDialogOpen(false);
      setCreateTypeDialogOpen(false);
    } catch (e) {
      const msg =
        e?.response?.data?.message ?? "Failed to create product.";
      onSaveError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const created = await createProductType({ name: newTypeName.trim() });
      const next = [...types, created].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      onTypesUpdated?.(next);
      setForm((f) => ({ ...f, product_type_id: String(created.id) }));
      setNewTypeName("");
      setCreateTypeDialogOpen(false);
    } catch {
      onSaveError?.("Failed to add new product type.");
    } finally {
      setAddingType(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) return;
    setAddingUnit(true);
    try {
      const created = await createProductUnit({ name: newUnitName.trim() });
      const next = [...units, created].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      onUnitsUpdated?.(next);
      setForm((f) => ({ ...f, unit_id: String(created.id) }));
      setNewUnitName("");
      setCreateUnitDialogOpen(false);
    } catch {
      onSaveError?.("Failed to add new unit.");
    } finally {
      setAddingUnit(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await createCategory({ name: newCategoryName.trim() });
      const next = [...categories, created].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      onCategoriesUpdated?.(next);
      setForm((f) => ({ ...f, category_id: String(created.id) }));
      setNewCategoryName("");
      setCreateCategoryDialogOpen(false);
    } catch {
      onSaveError?.("Failed to add new category.");
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseMain}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          {title}
        </DialogTitle>
        <DialogContent sx={{ overflowX: "hidden" }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {bannerError ? (
              <Alert severity="error">{bannerError}</Alert>
            ) : null}
            {contextAlert}
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.75}>
                Product Name
              </Typography>
              <TextField
                placeholder="A-cream"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                fullWidth
                autoFocus
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
                  value={form.generic_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, generic_name: e.target.value }))
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
                  value={form.included_amount}
                  onChange={(e) =>
                    setForm((f) => ({
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
                    value={form.product_type_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_TYPE_VALUE) {
                        setCreateTypeDialogOpen(true);
                        return;
                      }
                      setForm((f) => ({ ...f, product_type_id: value }));
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
                    value={form.unit_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_UNIT_VALUE) {
                        setCreateUnitDialogOpen(true);
                        return;
                      }
                      setForm((f) => ({ ...f, unit_id: value }));
                    }}
                  >
                    <MenuItem value={ADD_NEW_UNIT_VALUE}>
                      + Add New Unit
                    </MenuItem>
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
                    value={form.category_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_CATEGORY_VALUE) {
                        setCreateCategoryDialogOpen(true);
                        return;
                      }
                      setForm((f) => ({ ...f, category_id: value }));
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
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
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
                  value={form.min_stock_level}
                  onChange={(e) =>
                    setForm((f) => ({
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
                value={form.selling_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, selling_price: e.target.value }))
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
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseMain}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            disabled={
              !form.name.trim() || !form.unit_id || saving || disableSubmit
            }
          >
            {saving ? savingLabel : submitLabel}
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
    </>
  );
}
