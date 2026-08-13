import { useCallback, useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import ChartOfAccountPicker from "./ChartOfAccountPicker";
import FinanceCoaAccountLabel from "./FinanceCoaAccountLabel";
import FinanceRowActions from "./FinanceRowActions";
import { useFinanceTokens } from "./financeTokens";
import {
  createAssetCategory,
  deleteAssetCategory,
  getAssetCategories,
  listChartOfAccounts,
  updateAssetCategory,
} from "../../services/financeService";
import { defaultAccumDepCodeForCost } from "../../utils/fixedAssetCoaCodes";
import { resolveApiError } from "../../services/apiClient";
import useConfirmStore from "../../stores/confirmStore";
import useToastStore from "../../stores/toastStore";

const DEPRECIATION_METHODS = [
  { value: "straight_line", label: "Straight line" },
  { value: "declining_balance", label: "Declining balance" },
  { value: "units_of_production", label: "Units of production" },
];

const emptyForm = {
  code: "",
  name: "",
  default_useful_life_months: "60",
  default_depreciation_method: "straight_line",
  default_residual_pct: "0",
  cost_account_id: "",
  accum_dep_account_id: "",
  dep_expense_account_id: "",
  is_medical_device: false,
};

function formatCoa(account) {
  if (!account) return "—";
  if (!account.code && !account.name) return "—";
  return (
    <FinanceCoaAccountLabel
      code={account.code}
      name={account.name}
      separator=" — "
    />
  );
}

function methodLabel(value) {
  return DEPRECIATION_METHODS.find((m) => m.value === value)?.label ?? value;
}

function formSnapshot(form) {
  return JSON.stringify(form);
}

export default function AssetCategoriesDialog({ open, onClose, onCategoriesChange }) {
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const { compactTableSx } = useFinanceTokens();

  const [view, setView] = useState("list");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formBaseline, setFormBaseline] = useState("");
  const [assetCoaRows, setAssetCoaRows] = useState([]);
  const [accumDepCoaRows, setAccumDepCoaRows] = useState([]);
  const [expenseCoaRows, setExpenseCoaRows] = useState([]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAssetCategories();
      setCategories(Array.isArray(rows) ? rows : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load asset categories."),
        severity: "error",
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!open) return;
    setView("list");
    setEditingId(null);
    void loadCategories();
  }, [open, loadCategories]);

  useEffect(() => {
    if (!open || view !== "form") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [assetAccounts, accumDepAccounts, expenseAccounts] = await Promise.all([
          listChartOfAccounts({ type: "asset", is_active: true, is_fixed_asset_account: true }),
          listChartOfAccounts({
            type: "asset",
            is_active: true,
            is_accumulated_depreciation_account: true,
          }),
          listChartOfAccounts({ type: "expense", is_active: true }),
        ]);
        if (!cancelled) {
          setAssetCoaRows(Array.isArray(assetAccounts) ? assetAccounts : []);
          setAccumDepCoaRows(Array.isArray(accumDepAccounts) ? accumDepAccounts : []);
          setExpenseCoaRows(Array.isArray(expenseAccounts) ? expenseAccounts : []);
        }
      } catch {
        if (!cancelled) {
          setAssetCoaRows([]);
          setAccumDepCoaRows([]);
          setExpenseCoaRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, view]);

  const openCreate = () => {
    const next = { ...emptyForm };
    setEditingId(null);
    setForm(next);
    setFormBaseline(formSnapshot(next));
    setView("form");
  };

  const openEdit = (row) => {
    const next = {
      code: row.code ?? "",
      name: row.name ?? "",
      default_useful_life_months: String(row.default_useful_life_months ?? ""),
      default_depreciation_method: row.default_depreciation_method ?? "straight_line",
      default_residual_pct: String(row.default_residual_pct ?? "0"),
      cost_account_id:
        row.cost_account_id != null ? String(row.cost_account_id) : "",
      accum_dep_account_id:
        row.accum_dep_account_id != null ? String(row.accum_dep_account_id) : "",
      dep_expense_account_id:
        row.dep_expense_account_id != null ? String(row.dep_expense_account_id) : "",
      is_medical_device: Boolean(row.is_medical_device),
    };
    setEditingId(row.id);
    setForm(next);
    setFormBaseline(formSnapshot(next));
    setView("form");
  };

  const isFormDirty = () => formSnapshot(form) !== formBaseline;

  const requestClose = async () => {
    if (view === "form" && isFormDirty()) {
      const ok = await askConfirm({
        title: "Discard changes?",
        message: "You have unsaved category details. Close without saving?",
        confirmText: "Discard",
        cancelText: "Keep editing",
      });
      if (!ok) return;
    }
    onClose();
  };

  const backToList = async () => {
    if (isFormDirty()) {
      const ok = await askConfirm({
        title: "Discard changes?",
        message: "You have unsaved category details. Go back without saving?",
        confirmText: "Discard",
        cancelText: "Keep editing",
      });
      if (!ok) return;
    }
    setView("list");
    setEditingId(null);
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      default_useful_life_months: Number(form.default_useful_life_months),
      default_depreciation_method: form.default_depreciation_method,
      default_residual_pct: Number(form.default_residual_pct) || 0,
      is_medical_device: Boolean(form.is_medical_device),
    };
    const costId = String(form.cost_account_id ?? "").trim();
    const accumId = String(form.accum_dep_account_id ?? "").trim();
    const depId = String(form.dep_expense_account_id ?? "").trim();
    payload.cost_account_id = costId === "" ? null : Number(costId);
    payload.accum_dep_account_id = accumId === "" ? null : Number(accumId);
    payload.dep_expense_account_id = depId === "" ? null : Number(depId);
    if (!editingId) {
      payload.code = form.code.trim();
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateAssetCategory(editingId, payload);
        pushToast({ message: "Category updated.", severity: "success" });
      } else {
        await createAssetCategory(payload);
        pushToast({ message: "Category created.", severity: "success" });
      }
      await loadCategories();
      onCategoriesChange?.();
      setView("list");
      setEditingId(null);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save category."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if ((row.fixed_assets_count ?? 0) > 0) {
      pushToast({
        message: "This category is in use and cannot be deleted.",
        severity: "warning",
      });
      return;
    }
    const ok = await askConfirm({
      title: "Delete category?",
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await deleteAssetCategory(row.id);
      pushToast({ message: "Category deleted.", severity: "success" });
      await loadCategories();
      onCategoriesChange?.();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not delete category."),
        severity: "error",
      });
    }
  };

  const canSave =
    form.name.trim() &&
    form.default_useful_life_months &&
    Number(form.default_useful_life_months) > 0 &&
    (editingId || form.code.trim());

  return (
    <Dialog open={open} onClose={() => void requestClose()} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {view === "list" ? (
          "Asset categories"
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={() => void backToList()} aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <span>{editingId ? "Edit category" : "New category"}</span>
          </Stack>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {view === "list" ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Categories drive default useful life, depreciation method, and linked GL
              accounts when registering fixed assets.
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <LoadingIndicator size={40} />
              </Box>
            ) : (
              <Table size="small" sx={compactTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell align="right">Life (mo)</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Assets</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((row) => {
                    const inUse = (row.fixed_assets_count ?? 0) > 0;
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.code}</TableCell>
                        <TableCell align="right">
                          {row.default_useful_life_months}
                        </TableCell>
                        <TableCell>{methodLabel(row.default_depreciation_method)}</TableCell>
                        <TableCell align="right">{row.fixed_assets_count ?? 0}</TableCell>
                        <TableCell align="right">
                          <FinanceRowActions
                            actions={[
                              { variant: "edit", onClick: () => openEdit(row) },
                              {
                                variant: "delete",
                                disabled: inUse,
                                label: inUse ? "In use — cannot delete" : "Delete",
                                onClick: () => void handleDelete(row),
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!categories.length ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          No categories yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </>
        ) : (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {!editingId ? (
              <TextField
                label="Code"
                size="small"
                fullWidth
                required
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                  }))
                }
                helperText="Uppercase letters, numbers, and underscores. Used by Excel import mapping."
              />
            ) : (
              <TextField
                label="Code"
                size="small"
                fullWidth
                value={form.code}
                disabled
                helperText="Code cannot be changed after creation."
              />
            )}
            <TextField
              label="Name"
              size="small"
              fullWidth
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Default useful life (months)"
                size="small"
                fullWidth
                required
                type="number"
                value={form.default_useful_life_months}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    default_useful_life_months: e.target.value,
                  }))
                }
              />
              <TextField
                select
                label="Default depreciation method"
                size="small"
                fullWidth
                required
                value={form.default_depreciation_method}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    default_depreciation_method: e.target.value,
                  }))
                }
              >
                {DEPRECIATION_METHODS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Default residual value (%)"
              size="small"
              fullWidth
              type="number"
              value={form.default_residual_pct}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, default_residual_pct: e.target.value }))
              }
            />
            <ChartOfAccountPicker
              accounts={assetCoaRows}
              value={form.cost_account_id}
              onChange={(id) => {
                const selected = assetCoaRows.find((row) => String(row.id) === String(id));
                const pairedCode = defaultAccumDepCodeForCost(selected?.code);
                const pairedAccount = accumDepCoaRows.find((row) => row.code === pairedCode);
                setForm((prev) => ({
                  ...prev,
                  cost_account_id: id,
                  accum_dep_account_id: pairedAccount
                    ? String(pairedAccount.id)
                    : prev.accum_dep_account_id,
                }));
              }}
              onAccountsChange={setAssetCoaRows}
              listParams={{ type: "asset", is_active: true, is_fixed_asset_account: true }}
              dialogDefaultType="asset"
              label="Cost account (fixed asset GL)"
              size="small"
            />
            <ChartOfAccountPicker
              accounts={accumDepCoaRows}
              value={form.accum_dep_account_id}
              onChange={(id) =>
                setForm((prev) => ({ ...prev, accum_dep_account_id: id }))
              }
              onAccountsChange={setAccumDepCoaRows}
              listParams={{
                type: "asset",
                is_active: true,
                is_accumulated_depreciation_account: true,
              }}
              dialogDefaultType="asset"
              label="Accumulated depreciation account"
              size="small"
            />
            <ChartOfAccountPicker
              accounts={expenseCoaRows}
              value={form.dep_expense_account_id}
              onChange={(id) =>
                setForm((prev) => ({ ...prev, dep_expense_account_id: id }))
              }
              onAccountsChange={setExpenseCoaRows}
              listParams={{ type: "expense", is_active: true }}
              dialogDefaultType="expense"
              label="Depreciation expense account"
              size="small"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(form.is_medical_device)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_medical_device: e.target.checked,
                    }))
                  }
                />
              }
              label="Medical device (requires regulatory license on asset registration)"
            />
            {form.cost_account_id || form.accum_dep_account_id || form.dep_expense_account_id ? (
              <Typography variant="caption" color="text.secondary">
                Cost: {formatCoa(assetCoaRows.find((a) => String(a.id) === String(form.cost_account_id)))}
                {" · "}
                Accum dep:{" "}
                {formatCoa(
                  accumDepCoaRows.find(
                    (a) => String(a.id) === String(form.accum_dep_account_id),
                  ),
                )}
                {" · "}
                Dep expense:{" "}
                {formatCoa(
                  expenseCoaRows.find(
                    (a) => String(a.id) === String(form.dep_expense_account_id),
                  ),
                )}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {view === "list" ? (
          <>
            <Button onClick={() => void requestClose()}>Close</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add category
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void backToList()} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !canSave}>
              {saving ? <LoadingIndicator size={22} /> : editingId ? "Save" : "Create"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
