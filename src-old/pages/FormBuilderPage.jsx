import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Snackbar,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import PreviewIcon from "@mui/icons-material/Preview";
import ShortTextIcon from "@mui/icons-material/ShortText";
import NotesIcon from "@mui/icons-material/Notes";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NumbersIcon from "@mui/icons-material/Numbers";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import DynamicFormRenderer from "../components/common/DynamicFormRenderer";
import useAuthStore from "../stores/authStore";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";
import {
  getForm,
  getFormVersion,
  createOrGetDraftVersion,
  updateFormVersion,
  createField,
  updateField,
  deleteField,
  reorderFields,
  publishFormVersion,
} from "../services/formService";

// ── Field type catalogue ──────────────────────────
const FIELD_TYPES = [
  {
    value: "text",
    label: "Short Text",
    icon: ShortTextIcon,
    desc: "Single line answer",
  },
  {
    value: "textarea",
    label: "Long Text",
    icon: NotesIcon,
    desc: "Multi-line paragraph",
  },
  {
    value: "select",
    label: "Dropdown",
    icon: ArrowDropDownCircleIcon,
    desc: "Pick one from a list",
  },
  {
    value: "radio",
    label: "Single Choice",
    icon: RadioButtonCheckedIcon,
    desc: "Tap to pick one option",
  },
  {
    value: "checkbox",
    label: "Multiple Choices",
    icon: CheckBoxIcon,
    desc: "Tick all that apply",
  },
  {
    value: "date",
    label: "Date",
    icon: CalendarTodayIcon,
    desc: "Date picker",
  },
  {
    value: "number",
    label: "Number",
    icon: NumbersIcon,
    desc: "Numeric value",
  },
  { value: "email", label: "Email", icon: EmailIcon, desc: "Email address" },
  { value: "phone", label: "Phone", icon: PhoneIcon, desc: "Phone number" },
];

const TYPE_MAP = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t]));
const STEPS = ["Form Details", "Add Fields", "Preview & Publish"];
const NEEDS_OPTIONS = ["select", "radio", "checkbox"];
const FORM_TYPE_OPTIONS = [
  { value: "other", label: "Other" },
  { value: "questionnaire", label: "Questionnaire" },
  { value: "consent", label: "Consent" },
  { value: "intake", label: "Intake" },
];

/** Matches backend `form_fields.section` — used on Create Patient intake layout. */
const FIELD_SECTION_OPTIONS = [
  { value: "identity", label: "Patient identity (English block)" },
  { value: "discovery", label: "Discovery — how they found the clinic" },
  { value: "treatment", label: "Treatment interests & skincare" },
  { value: "medical", label: "Medical history" },
  { value: "consent", label: "Consent & signature" },
  { value: "other", label: "Other / general (not on intake sections)" },
];

const sectionLabel = (value) =>
  FIELD_SECTION_OPTIONS.find((o) => o.value === value)?.label ??
  value ??
  "other";

// ── Helpers ───────────────────────────────────────
const toSnakeCase = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const blankField = () => ({
  label: "",
  name: "",
  type: "text",
  options: [],
  optionsText: "",
  required: false,
  section: "other",
  validation_min: "",
  validation_max: "",
  validation_min_length: "",
  validation_max_length: "",
  validation_pattern: "",
  validation_message: "",
  visibility_enabled: false,
  visibility_field: "",
  visibility_operator: "equals",
  visibility_value: "",
});

const buildValidationRules = (draft) => {
  const rules = {};
  if (draft.validation_min !== "") rules.min = Number(draft.validation_min);
  if (draft.validation_max !== "") rules.max = Number(draft.validation_max);
  if (draft.validation_min_length !== "") {
    rules.min_length = Number(draft.validation_min_length);
  }
  if (draft.validation_max_length !== "") {
    rules.max_length = Number(draft.validation_max_length);
  }
  if (draft.validation_pattern.trim()) rules.pattern = draft.validation_pattern.trim();
  if (draft.validation_message.trim()) rules.message = draft.validation_message.trim();
  return Object.keys(rules).length ? rules : null;
};

const buildVisibilityRule = (draft) => {
  if (!draft.visibility_enabled || !draft.visibility_field.trim()) return null;
  return {
    field: draft.visibility_field.trim(),
    operator: draft.visibility_operator || "equals",
    value: draft.visibility_value,
  };
};

const draftFromField = (field) => ({
  label: field.label,
  name: field.name,
  type: field.type,
  options: Array.isArray(field.options) ? field.options : [],
  optionsText: Array.isArray(field.options) ? field.options.join("\n") : "",
  required: field.required,
  section: field.section ?? "other",
  validation_min: field.validation_rules?.min ?? "",
  validation_max: field.validation_rules?.max ?? "",
  validation_min_length: field.validation_rules?.min_length ?? "",
  validation_max_length: field.validation_rules?.max_length ?? "",
  validation_pattern: field.validation_rules?.pattern ?? "",
  validation_message: field.validation_rules?.message ?? "",
  visibility_enabled: Boolean(field.visibility_rule?.field),
  visibility_field: field.visibility_rule?.field ?? "",
  visibility_operator: field.visibility_rule?.operator ?? "equals",
  visibility_value: field.visibility_rule?.value ?? "",
});

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────
export default function FormBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form meta
  const [editingVersion, setEditingVersion] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("other");

  // Fields
  const [fields, setFields] = useState([]);

  // Field dialog (add / edit)
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); // null = add mode, object = edit mode
  const [draft, setDraft] = useState(blankField());

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Preview form data (step 2)
  const [previewData, setPreviewData] = useState({});

  // ── Load ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const draftPayload = await createOrGetDraftVersion(id);
        const draftVersionId = draftPayload?.version?.id;
        const { form: f } = await getForm(id);
        const versionPayload = draftVersionId
          ? await getFormVersion(id, draftVersionId)
          : await getForm(id);
        const version =
          versionPayload?.version ?? draftPayload?.version ?? null;
        const ff =
          versionPayload?.fields ?? draftPayload?.version?.fields ?? [];
        setEditingVersion(version);
        setFormName(f.name);
        setFormDesc(f.description ?? "");
        setFormType(f.form_type ?? "other");
        setFields(ff);
      } catch {
        setError("Could not load form.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Step 0: Save form details ─────────────────
  const saveDetails = async () => {
    if (!formName.trim()) return;
    if (!editingVersion?.id) return;
    setSaving(true);
    try {
      const updated = await updateFormVersion(editingVersion.id, {
        name: formName.trim(),
        description: formDesc.trim(),
        form_type: formType,
      });
      setEditingVersion(updated.version);
      setStep(1);
    } catch {
      setError("Failed to save form details.");
    } finally {
      setSaving(false);
    }
  };

  // ── Field dialog helpers ──────────────────────
  const openAddDialog = () => {
    setEditingField(null);
    setDraft(blankField());
    setFieldDialogOpen(true);
  };

  const openEditDialog = (field) => {
    setEditingField(field);
    setDraft(draftFromField(field));
    setFieldDialogOpen(true);
  };

  const handleDraftChange = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate the field key from label (only when adding, not editing)
      if (key === "label" && !editingField) {
        next.name = toSnakeCase(value);
      }
      return next;
    });
  };

  const saveField = async () => {
    if (!draft.label.trim()) return;
    setSaving(true);
    try {
      const payload = {
        label: draft.label.trim(),
        name: draft.name.trim() || toSnakeCase(draft.label),
        type: draft.type,
        required: draft.required,
        section: draft.section || "other",
        options: NEEDS_OPTIONS.includes(draft.type)
          ? draft.optionsText
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : null,
        validation_rules: buildValidationRules(draft),
        visibility_rule: buildVisibilityRule(draft),
      };

      if (editingField) {
        const updated = await updateField(id, editingField.id, payload);
        setFields((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f)),
        );
      } else {
        const created = await createField(id, payload);
        setFields((prev) => [...prev, created]);
      }
      setFieldDialogOpen(false);
    } catch {
      setError("Failed to save field.");
    } finally {
      setSaving(false);
    }
  };

  // ── Move field up/down ────────────────────────
  const moveField = async (index, direction) => {
    const next = [...fields];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    // Optimistically persist
    await reorderFields(
      id,
      next.map((f) => f.id),
    ).catch(() => setError("Reorder failed."));
  };

  // ── Delete field ──────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteField(id, deleteTarget.id);
      setFields((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("Failed to delete field.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Publish / Un-publish ──────────────────────
  const togglePublish = async () => {
    if (!editingVersion?.id) return;
    setSaving(true);
    try {
      await publishFormVersion(editingVersion.id);
      setSuccessMsg("Form published! Staff can now fill it in.");
      navigate(`${workspacePrefix}/forms`);
    } catch {
      setError("Failed to update form status.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", p: 2 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`${workspacePrefix}/forms`)}
        sx={{ mb: 2, borderRadius: 999, color: "text.secondary" }}
      >
        All Forms
      </Button>

      {/* Page title */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {formName || "Untitled Form"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Editing Draft Version (v{editingVersion?.version_number ?? "?"})
          </Typography>
        </Box>
        <Chip
          label="Draft"
          size="small"
          sx={{
            bgcolor: "#F1F3F5",
            color: "#6B7280",
            fontWeight: 600,
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={step > i}>
            <StepLabel
              sx={{ cursor: i < step ? "pointer" : "default" }}
              onClick={() => i < step && setStep(i)}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ── Step 0: Form Details ─────────────────── */}
      {step === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Step 1 — Form Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Give your form a clear name so staff know exactly when to use it.
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Form Name"
              placeholder="e.g. Botox Consent Form"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              helperText="This is what staff will see when they search for forms."
            />
            <TextField
              label="Description (optional)"
              placeholder="What is this form for?"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              fullWidth
              multiline
              rows={2}
              helperText="A short note shown on the forms list to help staff understand the purpose."
            />
            <FormControl fullWidth size="small">
              <InputLabel>Form Type</InputLabel>
              <Select
                label="Form Type"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              onClick={saveDetails}
              disabled={!formName.trim() || saving}
              sx={{ borderRadius: 999, fontWeight: 600 }}
            >
              {saving ? "Saving…" : "Next: Add Fields →"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ── Step 1: Field Builder ─────────────────── */}
      {step === 1 && (
        <Box>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Step 2 — Add Fields
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Each field becomes a question on your form.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openAddDialog}
                sx={{ borderRadius: 999, fontWeight: 600 }}
              >
                Add Field
              </Button>
            </Box>
          </Paper>

          {/* Field list */}
          {fields.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 5,
                borderRadius: 3,
                textAlign: "center",
                borderStyle: "dashed",
                color: "text.secondary",
              }}
            >
              <Typography gutterBottom>No fields yet.</Typography>
              <Typography variant="body2">
                Click <strong>Add Field</strong> above to create your first
                question.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  sectionLabel={sectionLabel(field.section)}
                  index={index}
                  total={fields.length}
                  onMoveUp={() => moveField(index, -1)}
                  onMoveDown={() => moveField(index, 1)}
                  onEdit={() => openEditDialog(field)}
                  onDelete={() => setDeleteTarget(field)}
                />
              ))}
            </Stack>
          )}

          {/* Navigation */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button onClick={() => setStep(0)} sx={{ borderRadius: 999 }}>
              ← Back
            </Button>
            <Button
              variant="contained"
              startIcon={<PreviewIcon />}
              onClick={() => setStep(2)}
              sx={{ borderRadius: 999, fontWeight: 600 }}
            >
              Preview & Publish →
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Step 2: Preview & Publish ─────────────── */}
      {step === 2 && (
        <Box>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Step 3 — Preview & Publish
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This is exactly what the form looks like to staff. When happy,
              click <strong>Publish</strong>.
            </Typography>
          </Paper>

          {/* Live preview */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              {formName}
            </Typography>
            {formDesc && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {formDesc}
              </Typography>
            )}
            <Divider sx={{ mb: 2.5 }} />
            <DynamicFormRenderer
              fields={fields}
              formData={previewData}
              onChange={(name, value) =>
                setPreviewData((p) => ({ ...p, [name]: value }))
              }
            />
            {fields.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Button variant="outlined" sx={{ borderRadius: 999 }} disabled>
                  Submit (preview only)
                </Button>
              </Box>
            )}
          </Paper>

          {/* Publish panel */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography fontWeight={700}>
                Draft — not visible to staff
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Publish when you are happy with the fields.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={togglePublish}
              disabled={saving || fields.length === 0}
              sx={{
                borderRadius: 999,
                fontWeight: 600,
                bgcolor: "#D9F275",
                color: "#1A1A2E",
                "&:hover": {
                  bgcolor: "#cce860",
                },
              }}
            >
              {saving ? "Saving…" : "Publish"}
            </Button>
          </Paper>

          <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 3 }}>
            <Button onClick={() => setStep(1)} sx={{ borderRadius: 999 }}>
              ← Back to Fields
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Add / Edit Field Dialog ─────────────────────────── */}
      <Dialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingField ? "Edit Field" : "Add New Field"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Field type selector */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Field Type
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                }}
              >
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  const active = draft.type === ft.value;
                  return (
                    <Box
                      key={ft.value}
                      onClick={() => handleDraftChange("type", ft.value)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1.5px solid",
                        borderColor: active ? "#D9F275" : "divider",
                        bgcolor: active ? "#F7FDE8" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                        textAlign: "center",
                        "&:hover": { borderColor: "#D9F275" },
                        transition: "border-color 0.15s",
                      }}
                    >
                      <Icon
                        fontSize="small"
                        sx={{ color: active ? "#1A1A2E" : "text.secondary" }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={active ? 700 : 400}
                        color={active ? "#1A1A2E" : "text.secondary"}
                        lineHeight={1.2}
                      >
                        {ft.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75 }}
              >
                {TYPE_MAP[draft.type]?.desc}
              </Typography>
            </Box>

            <Divider />

            {/* Label */}
            <TextField
              label="Question / Label"
              placeholder='e.g. "Do you have any allergies?"'
              value={draft.label}
              onChange={(e) => handleDraftChange("label", e.target.value)}
              fullWidth
              autoFocus
              helperText="The question staff or patients will see on the form."
            />

            {/* Field key (auto-generated, editable) */}
            <TextField
              label="Field Key"
              value={draft.name}
              onChange={(e) =>
                handleDraftChange(
                  "name",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              fullWidth
              size="small"
              helperText="Auto-generated from the label. Used as the data key when saving responses. Lowercase letters, numbers and underscores only."
            />

            <FormControl fullWidth size="small">
              <InputLabel>Section (Create Patient layout)</InputLabel>
              <Select
                label="Section (Create Patient layout)"
                value={draft.section || "other"}
                onChange={(e) => handleDraftChange("section", e.target.value)}
              >
                {FIELD_SECTION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Options (for select / radio / checkbox) */}
            {NEEDS_OPTIONS.includes(draft.type) && (
              <TextField
                label="Options (one per line)"
                placeholder={"Option A\nOption B\nOption C"}
                value={draft.optionsText}
                onChange={(e) =>
                  handleDraftChange("optionsText", e.target.value)
                }
                multiline
                rows={4}
                fullWidth
                helperText="Each line becomes a separate option on the form."
              />
            )}

            <Divider />
            <Typography variant="body2" fontWeight={600}>
              Validation (optional)
            </Typography>
            {draft.type === "number" ? (
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Min"
                  type="number"
                  value={draft.validation_min}
                  onChange={(e) => handleDraftChange("validation_min", e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Max"
                  type="number"
                  value={draft.validation_max}
                  onChange={(e) => handleDraftChange("validation_max", e.target.value)}
                  fullWidth
                  size="small"
                />
              </Stack>
            ) : (
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Min length"
                  type="number"
                  value={draft.validation_min_length}
                  onChange={(e) =>
                    handleDraftChange("validation_min_length", e.target.value)
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Max length"
                  type="number"
                  value={draft.validation_max_length}
                  onChange={(e) =>
                    handleDraftChange("validation_max_length", e.target.value)
                  }
                  fullWidth
                  size="small"
                />
              </Stack>
            )}
            <TextField
              label="Pattern (regex)"
              value={draft.validation_pattern}
              onChange={(e) => handleDraftChange("validation_pattern", e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Validation message"
              value={draft.validation_message}
              onChange={(e) => handleDraftChange("validation_message", e.target.value)}
              fullWidth
              size="small"
            />

            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.visibility_enabled}
                  onChange={(e) =>
                    handleDraftChange("visibility_enabled", e.target.checked)
                  }
                />
              }
              label="Show only when another field matches"
            />
            {draft.visibility_enabled ? (
              <Stack spacing={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Controlling field</InputLabel>
                  <Select
                    label="Controlling field"
                    value={draft.visibility_field}
                    onChange={(e) =>
                      handleDraftChange("visibility_field", e.target.value)
                    }
                  >
                    {fields
                      .filter((f) => !editingField || f.id !== editingField.id)
                      .map((f) => (
                        <MenuItem key={f.id} value={f.name}>
                          {f.label} ({f.name})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Operator</InputLabel>
                  <Select
                    label="Operator"
                    value={draft.visibility_operator}
                    onChange={(e) =>
                      handleDraftChange("visibility_operator", e.target.value)
                    }
                  >
                    <MenuItem value="equals">Equals</MenuItem>
                    <MenuItem value="not_equals">Not equals</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Value"
                  value={draft.visibility_value}
                  onChange={(e) =>
                    handleDraftChange("visibility_value", e.target.value)
                  }
                  fullWidth
                  size="small"
                />
              </Stack>
            ) : null}

            {/* Required toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={draft.required}
                  onChange={(e) =>
                    handleDraftChange("required", e.target.checked)
                  }
                />
              }
              label="Required field"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setFieldDialogOpen(false)}
            sx={{ borderRadius: 999 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveField}
            disabled={!draft.label.trim() || saving}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            {saving ? "Saving…" : editingField ? "Save Changes" : "Add Field"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Field Confirm ──────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Field?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.label}</strong> from this form?
            Existing responses will keep their saved data.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            sx={{ borderRadius: 999 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg("")}
        message={successMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

// ──────────────────────────────────────────────────
// Field Card (in the builder list)
// ──────────────────────────────────────────────────
function FieldCard({
  field,
  sectionLabel: sectionLabelText,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}) {
  const typeMeta = TYPE_MAP[field.type] ?? {
    label: field.type,
    icon: ShortTextIcon,
  };
  const Icon = typeMeta.icon;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      {/* Drag handle / order number */}
      <Typography
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: "#F1F3F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#6B7280",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Typography>

      {/* Type icon */}
      <Icon sx={{ color: "text.secondary", flexShrink: 0 }} fontSize="small" />

      {/* Label + type */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>
          {field.label}
          {field.required && (
            <Typography component="span" color="error" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {typeMeta.label} · key: <code>{field.name}</code>
          {sectionLabelText ? <> · {sectionLabelText}</> : null}
        </Typography>
      </Box>

      {/* Reorder + actions */}
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" onClick={onMoveUp} disabled={index === 0}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              size="small"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Edit field">
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete field">
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
