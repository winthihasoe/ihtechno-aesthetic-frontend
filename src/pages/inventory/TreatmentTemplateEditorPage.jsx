import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  ListSubheader,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import {
  getTreatmentCategories,
  getTreatmentTemplate,
  createTreatmentTemplate,
  updateTreatmentTemplate,
  syncTreatmentTemplateRequiredForms,
} from "../../services/treatmentTemplateService";
import { getForms } from "../../services/formService";
import { getProducts } from "./inventoryService";
import NewTreatmentCategoryDialog from "../../components/inventory/NewTreatmentCategoryDialog";
import { ADD_NEW_TREATMENT_CATEGORY_VALUE } from "../../components/inventory/newTreatmentCategoryShared";

const emptyStep = () => ({ title: "", description: "", step_order: 0 });
const emptyProductRow = () => ({
  product_id: "",
  default_quantity: 1,
  unit: "",
  is_required: true,
});

const COMMISSION_ROLE_KEYS = [
  { prefix: "doctor", label: "Doctor" },
  { prefix: "dermatologist", label: "Dermatologist" },
  { prefix: "therapist", label: "Therapist" },
  { prefix: "reception", label: "Reception / sales" },
];

const emptyPerRoleCommissionState = () =>
  Object.fromEntries(
    COMMISSION_ROLE_KEYS.map(({ prefix }) => [prefix, { type: "", value: "" }]),
  );

/** Legacy `commission_*` and `reception_commission_*` are the same pool in the API; merge for display. */
function mergeLegacyReceptionIntoPerRole(template, perRole) {
  const next = { ...perRole, reception: { ...perRole.reception } };
  if (next.reception.type) {
    return next;
  }
  const lt = template.commission_type;
  if (lt === "percent" || lt === "fixed") {
    next.reception = {
      type: lt,
      value:
        template.commission_value != null ? String(template.commission_value) : "",
    };
  }
  return next;
}

export default function TreatmentTemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "treatment_templates.manage");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [price, setPrice] = useState("0");
  const [perRoleCommission, setPerRoleCommission] = useState(emptyPerRoleCommissionState);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState([emptyStep()]);
  const [productRows, setProductRows] = useState([emptyProductRow()]);
  const [loadError, setLoadError] = useState("");
  const [allForms, setAllForms] = useState([]);
  const [requiredFormRows, setRequiredFormRows] = useState([
    { form_definition_id: "", is_required: true },
  ]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        getTreatmentCategories(),
        getProducts(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load reference data."),
        severity: "error",
      });
    }
  }, [pushToast]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    getForms()
      .then((list) => {
        if (!cancelled) {
          setAllForms(
            (list || []).filter(
              (f) =>
                f.is_active &&
                (f.form_type === "questionnaire" || f.form_type === "consent"),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setAllForms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setPerRoleCommission(emptyPerRoleCommissionState());
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const t = await getTreatmentTemplate(id);
        if (cancelled) return;
        setName(t.name ?? "");
        setCategoryId(t.category_id != null ? String(t.category_id) : "");
        setDurationMinutes(t.duration_minutes != null ? String(t.duration_minutes) : "");
        setPrice(t.price != null ? String(t.price) : "0");
        const fromApi = Object.fromEntries(
          COMMISSION_ROLE_KEYS.map(({ prefix }) => [
            prefix,
            {
              type: t[`${prefix}_commission_type`] ?? "",
              value:
                t[`${prefix}_commission_value`] != null
                  ? String(t[`${prefix}_commission_value`])
                  : "",
            },
          ]),
        );
        setPerRoleCommission(mergeLegacyReceptionIntoPerRole(t, fromApi));
        setDescription(t.description ?? "");
        setIsActive(Boolean(t.is_active));
        const st = Array.isArray(t.steps) && t.steps.length ? t.steps : [emptyStep()];
        setSteps(
          st.map((s, i) => ({
            title: s.title ?? "",
            description: s.description ?? "",
            step_order: s.step_order ?? i,
          })),
        );
        const tp = Array.isArray(t.template_products) && t.template_products.length
          ? t.template_products
          : [];
        setProductRows(
          tp.length
            ? tp.map((p) => ({
                product_id: String(p.product_id),
                default_quantity: p.default_quantity ?? 1,
                unit: p.unit ?? "",
                is_required: p.is_required !== false,
              }))
            : [emptyProductRow()],
        );
        const links = t.required_form_links ?? t.requiredFormLinks ?? [];
        setRequiredFormRows(
          Array.isArray(links) && links.length
            ? links.map((l) => ({
                form_definition_id: String(
                  l.form_definition_id ?? l.form_definition?.id ?? "",
                ),
                is_required: l.is_required !== false,
              }))
            : [{ form_definition_id: "", is_required: true }],
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(resolveApiError(err, "Failed to load template."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const buildPayload = () => {
    const stepPayload = steps
      .filter((s) => s.title.trim())
      .map((s, i) => ({
        title: s.title.trim(),
        description: s.description?.trim() || null,
        step_order: s.step_order ?? i,
      }));
    const productPayload = productRows
      .filter((r) => r.product_id)
      .map((r) => ({
        product_id: Number(r.product_id),
        default_quantity: Math.max(1, Number(r.default_quantity) || 1),
        unit: r.unit?.trim() || null,
        is_required: Boolean(r.is_required),
      }));

    return {
      category_id: categoryId ? Number(categoryId) : null,
      name: name.trim(),
      duration_minutes:
        durationMinutes === "" ? null : Math.max(1, parseInt(durationMinutes, 10) || 1),
      price: price === "" ? 0 : Number(price) || 0,
      commission_type: null,
      commission_value: null,
      ...Object.fromEntries(
        COMMISSION_ROLE_KEYS.flatMap(({ prefix }) => {
          const r = perRoleCommission[prefix];
          return [
            [`${prefix}_commission_type`, r.type || null],
            [
              `${prefix}_commission_value`,
              r.type && r.value !== "" ? Number(r.value) || 0 : null,
            ],
          ];
        }),
      ),
      description: description.trim() || null,
      is_active: isActive,
      steps: stepPayload,
      products: productPayload,
    };
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!name.trim()) {
      pushToast({ message: "Name is required.", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        await createTreatmentTemplate(payload);
        pushToast({ message: "Template created.", severity: "success" });
      } else {
        await updateTreatmentTemplate(id, payload);
        await syncTreatmentTemplateRequiredForms(id, {
          required_forms: requiredFormRows
            .filter((r) => r.form_definition_id)
            .map((r) => ({
              form_definition_id: Number(r.form_definition_id),
              is_required: Boolean(r.is_required),
            })),
        });
        pushToast({ message: "Template saved.", severity: "success" });
      }
      navigate("/inventory/treatment-templates");
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Save failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/inventory/treatment-templates"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to list
      </Button>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        {isNew ? "New treatment template" : "Edit treatment template"}
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            disabled={!canManage}
          />
          <TextField
            select
            label="Category"
            value={categoryId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === ADD_NEW_TREATMENT_CATEGORY_VALUE) {
                setCategoryDialogOpen(true);
                return;
              }
              setCategoryId(value);
            }}
            size="small"
            fullWidth
            disabled={!canManage}
          >
            {canManage && (
              <MenuItem
                value={ADD_NEW_TREATMENT_CATEGORY_VALUE}
                sx={{ fontWeight: 600, color: "primary.main" }}
              >
                + Add new category
              </MenuItem>
            )}
            {canManage && categories.length > 0 ? (
              <ListSubheader disableSticky>Categories</ListSubheader>
            ) : null}
            <MenuItem value="">None</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              size="small"
              fullWidth
              disabled={!canManage}
            />
            <TextField
              label="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              size="small"
              fullWidth
              disabled={!canManage}
            />
          </Stack>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
            Commission by role (optional)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Reception / sales is the same setting as the former single “commission” on this template
            (percent or fixed on the treatment line, then split between check-in and last follow-up).
            Older templates only using that field will show the value under Reception / sales; saving
            stores it in the new field and clears the duplicate legacy column.
          </Typography>
          {COMMISSION_ROLE_KEYS.map(({ prefix, label }) => {
            const r = perRoleCommission[prefix];
            return (
              <Stack key={prefix} direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label={`${label} — type`}
                  value={r.type}
                  onChange={(e) =>
                    setPerRoleCommission((prev) => ({
                      ...prev,
                      [prefix]: { ...prev[prefix], type: e.target.value },
                    }))
                  }
                  size="small"
                  fullWidth
                  disabled={!canManage}
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
                    setPerRoleCommission((prev) => ({
                      ...prev,
                      [prefix]: { ...prev[prefix], value: e.target.value },
                    }))
                  }
                  size="small"
                  fullWidth
                  disabled={!canManage || !r.type}
                />
              </Stack>
            );
          })}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            disabled={!canManage}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!canManage}
              />
            }
            label="Active (visible on Visit History)"
          />

          {!isNew && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Required forms before treatment
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Linked forms must be satisfied in Pre-treatment before this preset can move to
                the treatment room.
              </Typography>
              {requiredFormRows.map((row, idx) => (
                <Stack
                  key={idx}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    select
                    label="Form"
                    value={row.form_definition_id}
                    onChange={(e) => {
                      const next = [...requiredFormRows];
                      next[idx] = { ...next[idx], form_definition_id: e.target.value };
                      setRequiredFormRows(next);
                    }}
                    size="small"
                    fullWidth
                    disabled={!canManage}
                  >
                    <MenuItem value="">—</MenuItem>
                    {allForms.map((f) => (
                      <MenuItem key={f.id} value={String(f.id)}>
                        {f.name} ({f.form_type ?? "other"})
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={row.is_required}
                        onChange={(e) => {
                          const next = [...requiredFormRows];
                          next[idx] = { ...next[idx], is_required: e.target.checked };
                          setRequiredFormRows(next);
                        }}
                        disabled={!canManage}
                        size="small"
                      />
                    }
                    label="Required gate"
                  />
                  <IconButton
                    aria-label="Remove form link"
                    onClick={() =>
                      setRequiredFormRows((r) => r.filter((_, i) => i !== idx))
                    }
                    disabled={!canManage || requiredFormRows.length <= 1}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  setRequiredFormRows((r) => [
                    ...r,
                    { form_definition_id: "", is_required: true },
                  ])
                }
                disabled={!canManage}
              >
                Add form link
              </Button>
            </>
          )}

          <Divider sx={{ my: 1 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              Steps
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setSteps((s) => [...s, emptyStep()])}
              disabled={!canManage}
            >
              Add step
            </Button>
          </Stack>
          {steps.map((step, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <TextField
                    label={`Step ${idx + 1} title`}
                    value={step.title}
                    onChange={(e) => {
                      const next = [...steps];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setSteps(next);
                    }}
                    size="small"
                    fullWidth
                    disabled={!canManage}
                  />
                  <TextField
                    label="Description"
                    value={step.description}
                    onChange={(e) => {
                      const next = [...steps];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setSteps(next);
                    }}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canManage}
                  />
                </Stack>
                <IconButton
                  aria-label="Remove step"
                  onClick={() => setSteps((s) => s.filter((_, i) => i !== idx))}
                  disabled={!canManage || steps.length <= 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}

          <Divider sx={{ my: 1 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              Preset products
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setProductRows((r) => [...r, emptyProductRow()])}
              disabled={!canManage}
            >
              Add product
            </Button>
          </Stack>
          {productRows.map((row, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                <TextField
                  select
                  label="Product"
                  value={row.product_id}
                  onChange={(e) => {
                    const next = [...productRows];
                    const pid = e.target.value;
                    const p = products.find((x) => String(x.id) === pid);
                    next[idx] = {
                      ...next[idx],
                      product_id: pid,
                      unit: p?.unit ?? next[idx].unit,
                    };
                    setProductRows(next);
                  }}
                  size="small"
                  sx={{ minWidth: 220, flex: 1 }}
                  fullWidth
                  disabled={!canManage}
                >
                  <MenuItem value="">Select…</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.sku || "—"})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Default qty"
                  type="number"
                  value={row.default_quantity}
                  onChange={(e) => {
                    const next = [...productRows];
                    next[idx] = { ...next[idx], default_quantity: e.target.value };
                    setProductRows(next);
                  }}
                  size="small"
                  sx={{ width: 120 }}
                  disabled={!canManage}
                />
                <TextField
                  label="Unit"
                  value={row.unit}
                  onChange={(e) => {
                    const next = [...productRows];
                    next[idx] = { ...next[idx], unit: e.target.value };
                    setProductRows(next);
                  }}
                  size="small"
                  sx={{ width: 100 }}
                  disabled={!canManage}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={row.is_required}
                      onChange={(e) => {
                        const next = [...productRows];
                        next[idx] = { ...next[idx], is_required: e.target.checked };
                        setProductRows(next);
                      }}
                      size="small"
                      disabled={!canManage}
                    />
                  }
                  label="Required"
                />
                <IconButton
                  aria-label="Remove product"
                  onClick={() => setProductRows((r) => r.filter((_, i) => i !== idx))}
                  disabled={!canManage || productRows.length <= 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}

          {canManage && (
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 2 }}>
              <Button variant="outlined" onClick={() => navigate("/inventory/treatment-templates")}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      <NewTreatmentCategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onSuccess={(created) => {
          setCategories((prev) =>
            [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setCategoryId(String(created.id));
          pushToast({ message: "Category created.", severity: "success" });
        }}
      />
    </Box>
  );
}
