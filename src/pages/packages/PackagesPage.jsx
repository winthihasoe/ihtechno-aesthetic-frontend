import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
} from "../../services/packageService";
import { getTreatmentTemplates } from "../../services/treatmentTemplateService";

const emptyItem = () => ({
  treatment_template_id: "",
  total_sessions: "6",
});

const PACKAGE_COMMISSION_ROLE_KEYS = [
  { prefix: "doctor", label: "Doctor" },
  { prefix: "dermatologist", label: "Dermatologist" },
  { prefix: "therapist", label: "Therapist" },
  { prefix: "reception", label: "Reception / sales" },
];

const emptyPackagePerRoleCommission = () =>
  Object.fromEntries(
    PACKAGE_COMMISSION_ROLE_KEYS.map(({ prefix }) => [prefix, { type: "", value: "" }]),
  );

function mergeLegacyPackageReception(pkg, perRole) {
  const next = { ...perRole, reception: { ...perRole.reception } };
  if (next.reception.type) {
    return next;
  }
  const lt = pkg.commission_type;
  if (lt === "percent" || lt === "fixed") {
    next.reception = {
      type: lt,
      value: pkg.commission_value != null ? String(pkg.commission_value) : "",
    };
  }
  return next;
}

export default function PackagesPage() {
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canView = hasPermission(user, "packages.view");
  const canCreate = hasPermission(user, "packages.create");
  const canUpdate = hasPermission(user, "packages.update");
  const canDelete = hasPermission(user, "packages.delete");

  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "0",
    perRoleCommission: emptyPackagePerRoleCommission(),
    validity_days: "90",
    is_active: true,
    items: [emptyItem()],
  });

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await getPackages();
      setRows(Array.isArray(data) ? data : []);
      const tpl = await getTreatmentTemplates();
      setTemplates(Array.isArray(tpl) ? tpl : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load packages."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [canView, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "0",
      perRoleCommission: emptyPackagePerRoleCommission(),
      validity_days: "90",
      is_active: true,
      items: [emptyItem()],
    });
    setDialogOpen(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    const fromApi = Object.fromEntries(
      PACKAGE_COMMISSION_ROLE_KEYS.map(({ prefix }) => [
        prefix,
        {
          type: pkg[`${prefix}_commission_type`] ?? "",
          value:
            pkg[`${prefix}_commission_value`] != null
              ? String(pkg[`${prefix}_commission_value`])
              : "",
        },
      ]),
    );
    setForm({
      name: pkg.name ?? "",
      description: pkg.description ?? "",
      price: String(pkg.price ?? 0),
      perRoleCommission: mergeLegacyPackageReception(pkg, fromApi),
      validity_days: String(pkg.validity_days ?? 0),
      is_active: Boolean(pkg.is_active),
      items:
        Array.isArray(pkg.items) && pkg.items.length
          ? pkg.items.map((i) => ({
              treatment_template_id: String(i.treatment_template_id),
              total_sessions: String(i.total_sessions ?? 1),
            }))
          : [emptyItem()],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      pushToast({ message: "Name is required.", severity: "warning" });
      return;
    }
    const items = form.items
      .filter((r) => r.treatment_template_id)
      .map((r) => ({
        treatment_template_id: Number(r.treatment_template_id),
        total_sessions: Math.max(1, parseInt(String(r.total_sessions), 10) || 1),
      }));
    if (items.length === 0) {
      pushToast({ message: "Add at least one treatment line.", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        commission_type: null,
        commission_value: null,
        ...Object.fromEntries(
          PACKAGE_COMMISSION_ROLE_KEYS.flatMap(({ prefix }) => {
            const r = form.perRoleCommission[prefix];
            return [
              [`${prefix}_commission_type`, r.type || null],
              [
                `${prefix}_commission_value`,
                r.type && r.value !== "" ? Number(r.value) || 0 : null,
              ],
            ];
          }),
        ),
        validity_days: Math.max(0, parseInt(String(form.validity_days), 10) || 0),
        is_active: form.is_active,
        items,
      };
      if (editing) {
        await updatePackage(editing.id, payload);
        pushToast({ message: "Package updated.", severity: "success" });
      } else {
        await createPackage(payload);
        pushToast({ message: "Package created.", severity: "success" });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Save failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg) => {
    if (!canDelete) return;
    const isDeleteBlocked =
      Number(pkg.patient_packages_count ?? 0) > 0 || Number(pkg.items_count ?? 0) > 0;
    if (isDeleteBlocked) return;
    if (!window.confirm(`Delete catalog package “${pkg.name}”?`)) return;
    try {
      await deletePackage(pkg.id);
      pushToast({ message: "Package deleted.", severity: "success" });
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Delete failed."),
        severity: "error",
      });
    }
  };

  if (!canView) {
    return <Alert severity="warning">You do not have permission to view packages.</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Treatment packages
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New package
          </Button>
        )}
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Validity (days)</TableCell>
                <TableCell>Lines</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => {
                const isDeleteBlocked =
                  Number(p.patient_packages_count ?? 0) > 0 || Number(p.items_count ?? 0) > 0;
                const deleteTooltip = isDeleteBlocked
                  ? "In use by patient assignments or treatment lines. Deactivate instead."
                  : "Delete";

                return (
                  <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>{p.validity_days}</TableCell>
                  <TableCell>{p.items_count ?? (Array.isArray(p.items) ? p.items.length : 0)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.is_active ? "Yes" : "No"}
                      color={p.is_active ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title={deleteTooltip}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(p)}
                            disabled={isDeleteBlocked}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No packages yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Validity (days)"
                type="number"
                value={form.validity_days}
                onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Typography variant="subtitle2" fontWeight={700}>
              Commission by seller role (optional)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Reception / sales matches the former single package commission for reception and sales
              staff. Older packages show that value here; saving moves it into the new field.
            </Typography>
            {PACKAGE_COMMISSION_ROLE_KEYS.map(({ prefix, label }) => {
              const r = form.perRoleCommission[prefix];
              return (
                <Stack key={prefix} direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label={`${label} — type`}
                    value={r.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        perRoleCommission: {
                          ...f.perRoleCommission,
                          [prefix]: { ...f.perRoleCommission[prefix], type: e.target.value },
                        },
                      }))
                    }
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="percent">Percent</MenuItem>
                    <MenuItem value="fixed">Fixed</MenuItem>
                  </TextField>
                  <TextField
                    label={
                      r.type === "percent"
                        ? `${label} — percent`
                        : `${label} — fixed amount`
                    }
                    type="number"
                    value={r.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        perRoleCommission: {
                          ...f.perRoleCommission,
                          [prefix]: { ...f.perRoleCommission[prefix], value: e.target.value },
                        },
                      }))
                    }
                    fullWidth
                    disabled={!r.type}
                  />
                </Stack>
              );
            })}
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label="Active (sellable)"
            />
            <Typography variant="subtitle2" fontWeight={700}>
              Included treatments
            </Typography>
            {form.items.map((row, idx) => (
              <Stack key={idx} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                <FormControl size="small" fullWidth>
                  <InputLabel>Treatment template</InputLabel>
                  <Select
                    label="Treatment template"
                    value={row.treatment_template_id}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const next = [...f.items];
                        next[idx] = { ...next[idx], treatment_template_id: v };
                        return { ...f, items: next };
                      });
                    }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Sessions"
                  type="number"
                  size="small"
                  value={row.total_sessions}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => {
                      const next = [...f.items];
                      next[idx] = { ...next[idx], total_sessions: v };
                      return { ...f, items: next };
                    });
                  }}
                  sx={{ width: 120 }}
                  inputProps={{ min: 1 }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      items: f.items.filter((_, i) => i !== idx),
                    }))
                  }
                  disabled={form.items.length <= 1}
                >
                  Remove
                </Button>
              </Stack>
            ))}
            <Button
              size="small"
              onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
            >
              Add treatment line
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
