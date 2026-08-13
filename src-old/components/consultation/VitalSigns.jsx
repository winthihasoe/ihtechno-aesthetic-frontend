import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { resolveApiError } from "../../services/apiClient";
import { updateVisitVitalSigns } from "../../services/consultationService";
import useToastStore from "../../stores/toastStore";

const VITAL_FIELDS = [
  { key: "vital_sign_bp", label: "BP", placeholder: "120/80" },
  { key: "vital_sign_pulse", label: "Pulse", placeholder: "78" },
  { key: "vital_sign_temp", label: "Temp", placeholder: "36.7" },
  { key: "vital_sign_spo2", label: "SpO2", placeholder: "99" },
];

function extractVitals(source) {
  return VITAL_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field.key]: source?.[field.key] ?? "",
    }),
    {},
  );
}

function normalizeVitals(values) {
  return VITAL_FIELDS.reduce((acc, field) => {
    const value = values?.[field.key];
    acc[field.key] =
      value == null || String(value).trim() === "" ? null : String(value).trim();
    return acc;
  }, {});
}

function sameVitals(a, b) {
  return VITAL_FIELDS.every(
    (field) => String(a?.[field.key] ?? "") === String(b?.[field.key] ?? ""),
  );
}

function hasAnyVitals(values) {
  return VITAL_FIELDS.some(
    (field) => String(values?.[field.key] ?? "").trim() !== "",
  );
}

export default function VitalSigns({
  visitId,
  consultation,
  title = "Vital Signs",
  subtitle = "Latest measurements for this visit.",
  editable = false,
  disabled = false,
  compact = false,
  embedded = false,
  showSave = true,
  values,
  onValuesChange,
  onSaved,
}) {
  const { pushToast } = useToastStore();
  const isControlled = values != null;
  const baseValues = useMemo(
    () => (isControlled ? extractVitals(values) : extractVitals(consultation)),
    [consultation, isControlled, values],
  );
  const [localValues, setLocalValues] = useState(baseValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalValues(baseValues);
    setError("");
  }, [baseValues]);

  const currentValues = isControlled ? baseValues : localValues;
  const referenceValues = extractVitals(consultation);
  const dirty =
    editable && !isControlled && !sameVitals(currentValues, referenceValues);
  const canSave = editable && showSave && !disabled && !saving && dirty && visitId;

  const handleChange = (field) => (event) => {
    const next = {
      ...(isControlled ? currentValues : localValues),
      [field]: event.target.value,
    };
    if (!isControlled) {
      setLocalValues(next);
    }
    onValuesChange?.(next);
  };

  const handleSave = async () => {
    if (!visitId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateVisitVitalSigns(
        visitId,
        normalizeVitals(currentValues),
      );
      setLocalValues(extractVitals(updated));
      onSaved?.(updated);
      pushToast({ message: "Vital signs saved.", severity: "success" });
    } catch (err) {
      const message = resolveApiError(err, "Failed to save vital signs.");
      setError(message);
      pushToast({ message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Stack spacing={compact ? 1 : 1.5}>
      {(title || subtitle) && (
        <Box>
          {title ? (
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      )}

      {editable ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: compact
              ? "repeat(2, minmax(0, 1fr))"
              : {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
            gap: 1,
          }}
        >
          {VITAL_FIELDS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              size="small"
              value={currentValues[field.key] ?? ""}
              onChange={handleChange(field.key)}
              disabled={disabled || saving}
              placeholder={field.placeholder}
              fullWidth
            />
          ))}
        </Box>
      ) : hasAnyVitals(currentValues) ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: compact
              ? "repeat(2, minmax(0, 1fr))"
              : {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                },
            gap: 1,
          }}
        >
          {VITAL_FIELDS.map((field) => (
            <Box
              key={field.key}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1,
                py: 0.75,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {field.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {currentValues[field.key] || "—"}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No vital signs recorded yet.
        </Typography>
      )}

      {error ? <Alert severity="error">{error}</Alert> : null}

      {editable && showSave ? (
        <Button
          variant="contained"
          size="small"
          onClick={() => void handleSave()}
          disabled={!canSave}
          sx={{ alignSelf: "flex-start" }}
        >
          {saving ? "Saving..." : "Save vital signs"}
        </Button>
      ) : null}
    </Stack>
  );

  if (embedded) {
    return content;
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: compact ? 1.5 : 2 }}>
      {content}
    </Paper>
  );
}
