import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import {
  getTreatmentTemplates,
  getTreatmentCategories,
  createTreatmentTemplate,
  updateTreatmentTemplate,
  deleteTreatmentTemplate,
} from "../../services/treatmentTemplateService";
import { formatKyats } from "../../utils/formatKyats";

const emptyForm = () => ({
  name: "",
  category_id: "",
  duration_minutes: "",
  price: "",
  is_active: true,
});

function formatDuration(minutes) {
  if (minutes == null || minutes === "") return "—";
  const m = Number(minutes);
  if (!Number.isFinite(m)) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function TreatmentTemplatesPage() {
  const theme = useTheme();
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "treatment_templates.manage");

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        getTreatmentTemplates(),
        getTreatmentCategories().catch(() => []),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load services."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        String(r.name ?? "").toLowerCase().includes(q) ||
        String(r.category?.name ?? "").toLowerCase().includes(q);
      const matchesCategory =
        !categoryFilter || String(r.category?.id ?? r.category_id) === String(categoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [rows, search, categoryFilter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.is_active).length,
      categories: new Set(rows.map((r) => r.category?.name).filter(Boolean)).size,
    }),
    [rows],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name ?? "",
      category_id: String(row.category?.id ?? row.category_id ?? ""),
      duration_minutes: row.duration_minutes != null ? String(row.duration_minutes) : "",
      price: row.price != null ? String(row.price) : "",
      is_active: Boolean(row.is_active),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      pushToast({ message: "Service name is required.", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id ? Number(form.category_id) : null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        price: form.price ? Number(form.price) : 0,
        is_active: form.is_active,
      };
      if (editing) {
        await updateTreatmentTemplate(editing.id, payload);
        pushToast({ message: "Service updated.", severity: "success" });
      } else {
        await createTreatmentTemplate(payload);
        pushToast({ message: "Service created.", severity: "success" });
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

  const handleDelete = async (row) => {
    if (!canManage) return;
    const inUse =
      Number(row.package_items_count || 0) > 0 || Number(row.treatments_count || 0) > 0;
    if (inUse) return;
    if (!window.confirm(`Delete service “${row.name}”?`)) return;
    try {
      await deleteTreatmentTemplate(row.id);
      pushToast({ message: "Service deleted.", severity: "success" });
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Delete failed."),
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Services &amp; Procedures
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            The clinic service catalogue — consultations, procedures, diagnostics
            and their standard fees.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${stats.total} services`}
            icon={<MedicalServicesOutlinedIcon sx={{ fontSize: "16px !important" }} />}
          />
          <Chip
            size="small"
            label={`${stats.active} active`}
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: theme.palette.success.dark,
              fontWeight: 600,
            }}
          />
          <Chip size="small" variant="outlined" label={`${stats.categories} categories`} />
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              New Service
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search service or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
          <TextField
            select
            size="small"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Service / Procedure</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Standard fee
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {canManage && (
                    <TableCell sx={{ fontWeight: 700, width: 96 }} align="right">
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} sx={{ py: 6 }}>
                      <Stack alignItems="center" spacing={1}>
                        <MedicalServicesOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
                        <Typography variant="body2" color="text.secondary">
                          No services match your search.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const inUse =
                      Number(row.package_items_count || 0) > 0 ||
                      Number(row.treatments_count || 0) > 0;
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {row.category?.name ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={row.category.name}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>
                          {formatDuration(row.duration_minutes)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {row.price != null ? formatKyats(row.price) : "—"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.is_active ? "Active" : "Inactive"}
                            color={row.is_active ? "success" : "default"}
                            variant={row.is_active ? "filled" : "outlined"}
                          />
                        </TableCell>
                        {canManage && (
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEdit(row)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={
                                inUse
                                  ? "In use by a package/visit. Deactivate instead."
                                  : "Delete"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(row)}
                                  disabled={inUse}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? "Edit service" : "New service / procedure"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Service / procedure name"
              placeholder="e.g. Wound Dressing"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel id="service-category-label">Category</InputLabel>
              <Select
                labelId="service-category-label"
                label="Category"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Uncategorised</em>
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Duration (minutes)"
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Standard fee (MMK)"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label="Active (available to order)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create service"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
