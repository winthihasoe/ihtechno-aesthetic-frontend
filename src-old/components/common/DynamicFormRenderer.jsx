import { useRef, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { sanitizeRichHtml } from "./RichTextEditor";
import useAuthStore from "../../stores/authStore";
import { getBirthSelectOptionPairs } from "../../utils/identityBirthSelectOptions";
import { filterVisibleFields } from "../../utils/formFieldVisibility";

const FIELD_LABEL_SX = {
  display: "block",
  mb: 0.75,
  typography: "subtitle2",
  fontWeight: 600,
  color: "text.primary",
};

export function RequiredAsterisk() {
  return (
    <Typography
      component="span"
      aria-hidden
      sx={(theme) => ({
        ml: 0.35,
        color: theme.palette.error.main,
        fontWeight: 800,
        fontSize: "1.1em",
        lineHeight: 1,
        textShadow:
          theme.palette.mode === "light"
            ? `0 0 1px ${theme.palette.grey[100]}, 0 0 2px ${theme.palette.grey[100]}`
            : `0 0 1px ${theme.palette.grey[900]}, 0 0 2px ${theme.palette.grey[900]}`,
      })}
    >
      *
    </Typography>
  );
}

function FieldLabel({ label, required }) {
  if (!label) return null;
  return (
    <Typography component="div" sx={FIELD_LABEL_SX}>
      {label}
      {required ? <RequiredAsterisk /> : null}
    </Typography>
  );
}

function buildSelectOptions(field) {
  const birthPairs = getBirthSelectOptionPairs(field.name);
  if (birthPairs) return birthPairs;
  const raw = Array.isArray(field.options) ? field.options : [];
  if (
    raw.length > 0 &&
    typeof raw[0] === "object" &&
    raw[0] !== null &&
    "value" in raw[0]
  ) {
    return raw.map((o) => ({
      value: String(o.value),
      label: o.label != null ? String(o.label) : String(o.value),
    }));
  }
  return raw.map((opt) => ({ value: String(opt), label: String(opt) }));
}

/** Strip negatives and non-numeric characters; optional single decimal segment. */
function sanitizeNonNegativeNumericInput(raw, allowDecimal) {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/\u2212/g, "").replace(/-/g, "");
  s = s.replace(/[^\d.]/g, "");
  if (!allowDecimal) {
    return s.replace(/\./g, "");
  }
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

function numberFieldAllowsDecimal(name) {
  return name === "weight_kg";
}

function isSignatureFieldName(name) {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  return (
    n === "consent_signature" || n === "signature" || n.endsWith("_signature")
  );
}

function isLockedStaffIdentityField(name) {
  return name === "explained_by" || name === "explainer_role";
}

function hasAnyRole(user, roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  const normalized = roles.map((item) => String(item || "").toLowerCase());
  if (Array.isArray(user?.roles)) {
    return user.roles.some((item) =>
      normalized.includes(String(item?.slug || item?.name || "").toLowerCase()),
    );
  }
  return normalized.includes(String(user?.role || "").toLowerCase());
}

function RichTextFieldInput({
  label,
  required,
  value,
  defaultHtml,
  disabled,
  canEdit,
  error,
  onChange,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: sanitizeRichHtml(value || defaultHtml || ""),
    editable: !disabled && canEdit,
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = sanitizeRichHtml(value || defaultHtml || "");
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, false);
    }
    editor.setEditable(!disabled && canEdit);
  }, [editor, value, defaultHtml, disabled, canEdit]);

  if (!editor) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <FieldLabel label={label} required={required} />
      {canEdit && !disabled ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Bold
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullet list
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            Paragraph
          </Button>
        </Stack>
      ) : null}
      <Box
        sx={{
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1.5,
          py: 1.25,
          minHeight: 180,
          fontSize: 11,
          fontFamily:
            "'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar Text', sans-serif",
          lineHeight: 1.8,
          "& p": { my: 0.75 },
          "& ul": { my: 0.75, pl: 3 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
      {!canEdit && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          Only owner/admin can edit this text.
        </Typography>
      )}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", mt: 0.5 }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}

function SignatureFieldInput({
  label,
  required,
  disabled,
  error,
  value,
  onChange,
}) {
  const theme = useTheme();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value && ref.current && !ref.current.isEmpty()) {
      ref.current.clear();
    }
  }, [value]);

  const syncFromPad = () => {
    const pad = ref.current;
    if (!pad) return;
    if (pad.isEmpty()) onChange("");
    else onChange(pad.getCanvas().toDataURL("image/png"));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <FieldLabel label={label} required={required} />
      {value ? (
        <Box
          sx={{
            border: "1px solid",
            borderColor: error ? "error.main" : "divider",
            borderRadius: 1.5,
            p: 1,
            mb: 1,
            bgcolor: "background.paper",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            Signature preview
          </Typography>
          <Box
            component="img"
            src={value}
            alt="Customer signature preview"
            sx={{
              width: "100%",
              maxWidth: 320,
              maxHeight: 120,
              objectFit: "contain",
            }}
          />
        </Box>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          E-sign
        </Button>
        {value ? (
          <Typography variant="caption" color="success.main">
            Signature captured
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No signature yet
          </Typography>
        )}
      </Box>
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", mt: 0.5, mb: 1 }}
        >
          {error}
        </Typography>
      )}
      <Button
        size="small"
        sx={{ mt: 1.5 }}
        disabled={disabled}
        onClick={() => {
          onChange("");
        }}
      >
        Clear
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{label || "E-signature"}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: "1px solid",
              borderColor: error ? "error.main" : "divider",
              borderRadius: 1,
              bgcolor: "background.paper",
              touchAction: "none",
            }}
            onPointerLeave={syncFromPad}
          >
            <SignatureCanvas
              ref={ref}
              penColor={theme.palette.text.primary}
              canvasProps={{
                style: { width: "100%", height: 220 },
                className: "signature-canvas",
                onMouseUp: syncFromPad,
                onTouchEnd: syncFromPad,
              }}
              onEnd={syncFromPad}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              ref.current?.clear();
              onChange("");
            }}
          >
            Clear
          </Button>
          <Button onClick={() => setOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * DynamicFormRenderer
 *
 * Props:
 *   fields   – array of field objects from the API
 *   formData – { [field.name]: value }
 *   onChange – (fieldName, value) => void
 *   disabled – boolean (read-only mode)
 *   errors   – { [field.name]: string } (optional validation messages)
 *   getFieldGridSize – optional per-field MUI Grid v7 `size` config
 */
export default function DynamicFormRenderer({
  fields = [],
  formData = {},
  onChange,
  disabled = false,
  errors = {},
  getFieldGridSize,
  forceReadonlyRichText = false,
}) {
  const { user } = useAuthStore();
  const visibleFields = filterVisibleFields(fields, formData);

  if (!visibleFields.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          {fields.length ? "No fields to show for the current answers." : "No fields in this form yet."}
        </Typography>
      </Box>
    );
  }

  const handleChange = (name, value) => {
    if (onChange) onChange(name, value);
  };

  const resolveFieldGridSize = (field) =>
    getFieldGridSize?.(field) ?? { xs: 12 };

  return (
    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      {visibleFields.map((field) => {
        const value = formData[field.name] ?? "";
        const error = errors[field.name];
        const gridSize = resolveFieldGridSize(field);
        const fieldDisabled =
          disabled ||
          isLockedStaffIdentityField(field.name) ||
          field.readOnly === true;
        let control = null;

        if (isSignatureFieldName(field.name)) {
          control = (
            <SignatureFieldInput
              label={field.label}
              required={field.required}
              disabled={disabled}
              error={error}
              value={value}
              onChange={(next) => handleChange(field.name, next)}
            />
          );
        } else {
          const fieldOptions =
            field.options && typeof field.options === "object"
              ? field.options
              : {};
          const isRichTextField = fieldOptions?.rich_text === true;

          if (isRichTextField) {
            const editableRoles = fieldOptions?.editable_roles ?? [];
            const canEditRichText =
              !forceReadonlyRichText && hasAnyRole(user, editableRoles);
            control = (
              <RichTextFieldInput
                label={field.label}
                required={field.required}
                value={value}
                defaultHtml={fieldOptions?.default_html}
                disabled={disabled}
                canEdit={canEditRichText}
                error={error}
                onChange={(next) => handleChange(field.name, next)}
              />
            );
          } else {
            switch (field.type) {
              // ── Short text ───────────────────────────────
              case "text":
              case "email":
              case "phone":
              case "number": {
                const isNumber = field.type === "number";
                const inputType =
                  field.type === "email"
                    ? "email"
                    : field.type === "phone"
                      ? "tel"
                      : "text";
                const helperText = error
                  ? error
                  : [
                      isLockedStaffIdentityField(field.name)
                        ? "Auto-filled from current logged-in user."
                        : null,
                      field.readOnly && field.name === "age"
                        ? "Calculated from birth date."
                        : null,
                      field.name === "consent_signature"
                        ? "E-sign placeholder. Staff can type the patient's name or e-sign reference for now."
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined;
                control = (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <FieldLabel label={field.label} required={field.required} />
                    <TextField
                      type={inputType}
                      value={value}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (isNumber) {
                          const next = sanitizeNonNegativeNumericInput(
                            raw,
                            numberFieldAllowsDecimal(field.name),
                          );
                          handleChange(field.name, next);
                        } else {
                          handleChange(field.name, raw);
                        }
                      }}
                      disabled={fieldDisabled}
                      error={!!error}
                      placeholder={
                        field.name === "consent_signature"
                          ? "Patient e-sign placeholder"
                          : undefined
                      }
                      fullWidth
                      size="small"
                      multiline={field.name === "consent_signature"}
                      minRows={
                        field.name === "consent_signature" ? 3 : undefined
                      }
                      inputProps={
                        isNumber
                          ? {
                              inputMode: numberFieldAllowsDecimal(field.name)
                                ? "decimal"
                                : "numeric",
                              autoComplete: "off",
                            }
                          : undefined
                      }
                      slotProps={
                        field.name === "consent_signature"
                          ? {
                              input: {
                                sx: {
                                  alignItems: "flex-end",
                                  "& textarea::placeholder": {
                                    fontStyle: "italic",
                                    opacity: 0.75,
                                  },
                                },
                              },
                            }
                          : undefined
                      }
                      FormHelperTextProps={{ component: "div" }}
                      helperText={helperText}
                    />
                  </Box>
                );
                break;
              }

              // ── Long text ────────────────────────────────
              case "textarea":
                control = (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <FieldLabel label={field.label} required={field.required} />
                    <TextField
                      multiline
                      minRows={3}
                      value={value}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      disabled={fieldDisabled}
                      error={!!error}
                      fullWidth
                      size="small"
                      FormHelperTextProps={{ component: "div" }}
                      helperText={error || undefined}
                    />
                  </Box>
                );
                break;

              // ── Date picker ──────────────────────────────
              case "date":
                control = (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <FieldLabel label={field.label} required={field.required} />
                    <TextField
                      type="date"
                      value={value}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      required={field.required}
                      disabled={disabled}
                      error={!!error}
                      fullWidth
                      size="small"
                      FormHelperTextProps={{ component: "div" }}
                      helperText={error || undefined}
                    />
                  </Box>
                );
                break;

              // ── Dropdown select ─────────────────────────
              case "select": {
                const selectPairs = buildSelectOptions(field);
                control = (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <FieldLabel label={field.label} required={field.required} />
                    <FormControl fullWidth size="small" error={!!error}>
                      <Select
                        displayEmpty
                        value={
                          value === undefined || value === null
                            ? ""
                            : String(value)
                        }
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                        disabled={fieldDisabled}
                        renderValue={(selected) => {
                          if (selected === "" || selected == null) {
                            return (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                — Select —
                              </Typography>
                            );
                          }
                          const found = selectPairs.find(
                            (p) => p.value === selected,
                          );
                          return found?.label ?? selected;
                        }}
                      >
                        <MenuItem value="">
                          <em>— Select —</em>
                        </MenuItem>
                        {selectPairs.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {error ? (
                        <FormHelperText error sx={{ fontWeight: 600 }}>
                          {error}
                        </FormHelperText>
                      ) : null}
                    </FormControl>
                  </Box>
                );
                break;
              }

              // ── Radio (single choice) ────────────────────
              case "radio": {
                const options = Array.isArray(field.options)
                  ? field.options
                  : [];
                control = (
                  <FormControl
                    error={!!error}
                    required={field.required}
                    fullWidth
                  >
                    <FormLabel sx={{ ...FIELD_LABEL_SX, mb: 1 }}>
                      {field.label}
                      {field.required ? <RequiredAsterisk /> : null}
                    </FormLabel>
                    <RadioGroup
                      value={value}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      row
                      sx={{ gap: 1, alignItems: "stretch" }}
                    >
                      {options.map((opt) => (
                        <Box
                          key={opt}
                          component="label"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor:
                              value === opt ? "primary.main" : "divider",
                            bgcolor:
                              value === opt
                                ? "action.selected"
                                : "background.paper",
                            minWidth: { xs: "100%", sm: 140 },
                            transition: "all 0.2s ease",
                            cursor: fieldDisabled ? "default" : "pointer",
                          }}
                        >
                          <FormControlLabel
                            value={opt}
                            control={
                              <Radio size="small" disabled={fieldDisabled} />
                            }
                            label={opt}
                            sx={{ m: 0, width: "100%", pointerEvents: "none" }}
                          />
                        </Box>
                      ))}
                    </RadioGroup>
                    {error && (
                      <Typography variant="caption" color="error">
                        {error}
                      </Typography>
                    )}
                  </FormControl>
                );
                break;
              }

              // ── Checkbox (multiple choices) ──────────────
              case "checkbox": {
                const options = Array.isArray(field.options)
                  ? field.options
                  : [];
                // value is an array of selected items
                const selected = Array.isArray(value) ? value : [];

                const toggle = (opt) => {
                  const next = selected.includes(opt)
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  handleChange(field.name, next);
                };

                control = (
                  <FormControl
                    error={!!error}
                    required={field.required}
                    fullWidth
                  >
                    <FormLabel sx={{ ...FIELD_LABEL_SX, mb: 1 }}>
                      {field.label}
                      {field.required ? <RequiredAsterisk /> : null}
                    </FormLabel>
                    <FormGroup row sx={{ gap: 1, alignItems: "stretch" }}>
                      {options.map((opt) => (
                        <Box
                          key={opt}
                          component="label"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: selected.includes(opt)
                              ? "primary.main"
                              : "divider",
                            bgcolor: selected.includes(opt)
                              ? "action.selected"
                              : "background.paper",
                            minWidth: { xs: "100%", sm: 160 },
                            transition: "all 0.2s ease",
                            cursor: fieldDisabled ? "default" : "pointer",
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={selected.includes(opt)}
                                onChange={() => toggle(opt)}
                                disabled={fieldDisabled}
                              />
                            }
                            label={opt}
                            sx={{ m: 0, width: "100%", pointerEvents: "none" }}
                          />
                        </Box>
                      ))}
                    </FormGroup>
                    {/* Show currently selected as chips when disabled (read-only view) */}
                    {disabled && selected.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        {selected.map((s) => (
                          <Chip key={s} label={s} size="small" />
                        ))}
                      </Box>
                    )}
                    {error && (
                      <Typography variant="caption" color="error">
                        {error}
                      </Typography>
                    )}
                  </FormControl>
                );
                break;
              }

              default:
                control = null;
            }
          }
        }

        if (!control) {
          return null;
        }

        return (
          <Grid
            key={field.id}
            size={gridSize}
            sx={{ display: "flex", minWidth: 0 }}
          >
            <Box sx={{ width: "100%", minWidth: 0 }}>{control}</Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
