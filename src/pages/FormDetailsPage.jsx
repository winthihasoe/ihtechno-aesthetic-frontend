import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createOrGetDraftVersion,
  deleteForm,
  getForm,
  getFormVersion,
} from "../services/formService";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import { resolveApiError } from "../services/apiClient";
import { hasRole } from "../utils/accessUtils";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";
import { getClinicDisplayName } from "../utils/clinicBranding";

const MYANMAR_FONT_FAMILY =
  "'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar Text', 'Padauk', sans-serif";

function sanitizeRichHtml(rawHtml) {
  if (typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
}

function getFieldPreviewValue(field) {
  const options =
    field?.options && typeof field.options === "object" ? field.options : {};
  if (options?.rich_text && typeof options.default_html === "string") {
    return options.default_html;
  }
  if (Array.isArray(field?.options) && field.options.length > 0) {
    return field.options.join(" / ");
  }
  return "";
}

export default function FormDetailsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const canEdit = hasRole(user, "admin");
  const isDark = theme.palette.mode === "dark";
  const formSheetBg = isDark ? "rgba(22,27,34,0.88)" : "rgba(255,248,253,0.94)";
  const formSheetBorder = isDark
    ? "1px solid rgba(255,255,255,0.12)"
    : "1px solid rgba(76,48,88,0.16)";
  const formTextColor = isDark ? "#f0f6fc" : "#2f1d36";
  const formMutedColor = isDark ? "rgba(240,246,252,0.72)" : "rgba(55,36,65,0.7)";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [fields, setFields] = useState([]);
  const [confirmDraftOpen, setConfirmDraftOpen] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [switchingVersion, setSwitchingVersion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const formPayload = await getForm(id);
        if (cancelled) return;
        setForm(formPayload?.form ?? null);
        setFields(formPayload?.fields ?? []);
        setSelectedVersionId(formPayload?.version?.id ?? null);
        setVersionHistory(
          Array.isArray(formPayload?.version_history)
            ? formPayload.version_history
            : [],
        );
      } catch (err) {
        if (!cancelled) {
          setError(resolveApiError(err, "Failed to load form details."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const orderedFields = useMemo(() => {
    return [...fields].sort(
      (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
    );
  }, [fields]);

  const handleEditClick = async () => {
    if (!form?.id) return;
    if (form?.draft_version?.id) {
      navigate(`${workspacePrefix}/forms/${form.id}/edit`);
      return;
    }
    setConfirmDraftOpen(true);
  };

  const handleCreateDraft = async () => {
    if (!form?.id) return;
    setCreatingDraft(true);
    try {
      await createOrGetDraftVersion(form.id);
      navigate(`${workspacePrefix}/forms/${form.id}/edit`);
    } catch (err) {
      setError(resolveApiError(err, "Failed to create draft version."));
    } finally {
      setCreatingDraft(false);
      setConfirmDraftOpen(false);
    }
  };

  const isDeleteBlocked =
    Number(form?.responses_count ?? 0) > 0 ||
    Number(form?.required_form_links_count ?? 0) > 0;

  const handleDelete = async () => {
    if (!form?.id || isDeleteBlocked) return;
    setDeleting(true);
    try {
      await deleteForm(form.id);
      navigate(`${workspacePrefix}/forms`);
    } catch (err) {
      setError(resolveApiError(err, "Failed to delete form."));
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleSelectVersion = async (versionId) => {
    if (!versionId || versionId === selectedVersionId) return;
    setSwitchingVersion(true);
    try {
      const payload = await getFormVersion(id, versionId);
      setFields(Array.isArray(payload?.fields) ? payload.fields : []);
      setSelectedVersionId(payload?.version?.id ?? versionId);
      setError("");
    } catch (err) {
      setError(resolveApiError(err, "Failed to load selected version preview."));
    } finally {
      setSwitchingVersion(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`${workspacePrefix}/forms`)}
          sx={{ borderRadius: 999 }}
        >
          Back to Forms
        </Button>
        {canEdit && form?.id ? (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditClick}
              sx={{ borderRadius: 999 }}
            >
              {form?.draft_version?.id ? "Edit Draft" : "Edit Form"}
            </Button>
            <Tooltip title={isDeleteBlocked ? "Form is in use" : "Delete form"}>
              <span>
                <IconButton
                  color="error"
                  disabled={isDeleteBlocked}
                  onClick={() => setConfirmDeleteOpen(true)}
                  sx={{ border: 1, borderColor: "divider", borderRadius: 999 }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </Stack>

      {isDeleteBlocked ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This form is in use by responses or treatment template requirements
          and cannot be deleted.
        </Alert>
      ) : null}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          borderRadius: 2,
          py: 2,
          mb: 2,
          bgcolor: isDark ? "rgba(13,17,23,0.7)" : "rgba(255,255,255,0.28)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.32)",
          overflowX: "auto",
        }}
      >
        <Box
          sx={{
            mx: "auto",
            width: { xs: "100%", sm: "210mm" },
            minHeight: "297mm",
            bgcolor: formSheetBg,
            color: formTextColor,
            border: formSheetBorder,
            px: { xs: 2, sm: 4 },
            py: { xs: 2.5, sm: 4 },
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            fontFamily: MYANMAR_FONT_FAMILY,
          }}
        >
          {switchingVersion ? (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : null}
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
              fontWeight: 700,
              mb: 1.5,
              fontFamily: MYANMAR_FONT_FAMILY,
            }}
          >
            {form?.name || "Form"}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              textAlign: "center",
              fontWeight: 600,
              color: formMutedColor,
              fontSize: "0.9rem",
              fontFamily: MYANMAR_FONT_FAMILY,
            }}
          >
            {getClinicDisplayName(settings)}
          </Typography>
          {!!settings?.clinic_description && (
            <Typography
              variant="body2"
              sx={{
                textAlign: "center",
                fontSize: "0.8rem",
                color: formMutedColor,
                mb: 2.5,
                fontFamily: MYANMAR_FONT_FAMILY,
              }}
            >
              {settings.clinic_description}
            </Typography>
          )}

          {orderedFields.length === 0 ? (
            <Typography variant="body2" sx={{ color: formMutedColor }}>
              No fields configured yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {orderedFields.map((field) => {
                const options =
                  field?.options && typeof field.options === "object"
                    ? field.options
                    : {};
                const isRichText = options?.rich_text === true;
                const previewValue = getFieldPreviewValue(field);

                if (isRichText) {
                  return (
                    <Box key={field.id}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 0.75,
                          fontWeight: 700,
                          fontFamily: MYANMAR_FONT_FAMILY,
                        }}
                      >
                        {field.label}
                      </Typography>
                      <Box
                        sx={{
                          border: "1px dashed",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.14)"
                            : "rgba(70,46,82,0.2)",
                          borderRadius: 1.5,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(255,255,255,0.4)",
                          py: 1,
                          px: 1.5,
                          lineHeight: 1.8,
                          "& p": { my: 0.75 },
                          "& ul": { my: 0.75, pl: 3 },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRichHtml(previewValue),
                        }}
                      />
                    </Box>
                  );
                }

                return (
                  <Box key={field.id}>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 0.5,
                        fontWeight: 600,
                        fontFamily: MYANMAR_FONT_FAMILY,
                      }}
                    >
                      {field.label}
                      {field.required ? " *" : ""}
                    </Typography>
                    {field.type === "radio" || field.type === "select" ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: formMutedColor,
                          fontFamily: MYANMAR_FONT_FAMILY,
                        }}
                      >
                        {previewValue || "—"}
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(70,46,82,0.24)",
                          minHeight: field.type === "textarea" ? 56 : 28,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 2.5,
          borderRadius: 3,
          color: formTextColor,
          background: isDark
            ? "linear-gradient(160deg, rgba(22,27,34,0.8), rgba(24,30,38,0.72))"
            : "linear-gradient(160deg, rgba(255,248,253,0.84), rgba(247,231,252,0.72) 50%, rgba(229,203,239,0.62) 100%)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid rgba(255,255,255,0.42)",
          boxShadow: isDark
            ? "0 14px 32px rgba(0,0,0,0.35)"
            : "0 16px 32px rgba(44,24,53,0.18)",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          {form?.name || "Form"}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip
            label={(form?.form_type ?? "other").replace("_", " ")}
            size="small"
            variant="outlined"
            sx={{ textTransform: "capitalize" }}
          />
          <Chip
            label={form?.is_active ? "Active" : "Draft"}
            size="small"
            color={form?.is_active ? "success" : "default"}
          />
          <Chip label={`v${form?.version ?? 1}`} size="small" />
          {form?.draft_version?.id ? (
            <Chip
              label={`Draft v${form.draft_version.version_number}`}
              size="small"
              color="warning"
              variant="outlined"
            />
          ) : null}
        </Stack>
        {form?.draft_version?.id ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            A draft version already exists for this form. Editing will continue
            in draft mode until published.
          </Alert>
        ) : null}
        <Typography variant="body2" sx={{ color: formMutedColor, mb: 1.5 }}>
          {form?.description || "No description provided."}
        </Typography>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Version History
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: formMutedColor }}>
            Current version: v{form?.version ?? 1}
          </Typography>
          <Typography variant="body2" sx={{ color: formMutedColor }}>
            Last updated:{" "}
            {form?.updated_at
              ? new Date(form.updated_at).toLocaleString()
              : "Not available"}
          </Typography>
          {versionHistory.map((item) => (
            <Button
              key={item.id}
              variant={item.id === selectedVersionId ? "contained" : "text"}
              size="small"
              sx={{ justifyContent: "flex-start", textTransform: "none", px: 1 }}
              onClick={() => handleSelectVersion(item.id)}
            >
              v{item.version_number} - {item.status} -{" "}
              {item.updated_at ? new Date(item.updated_at).toLocaleString() : "N/A"}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Dialog
        open={confirmDraftOpen}
        onClose={() => setConfirmDraftOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Create New Draft Version?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to create a new draft from the current published form.
            Changes will not affect current patients until you publish.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }}>
            Current: v
            {form?.published_version?.version_number ?? form?.version ?? 1}{" "}
            (Published)
          </DialogContentText>
          <DialogContentText>
            New: v
            {(form?.published_version?.version_number ?? form?.version ?? 1) +
              1}{" "}
            (Draft)
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmDraftOpen(false)}
            disabled={creatingDraft}
            sx={{ borderRadius: 999 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateDraft}
            disabled={creatingDraft}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            {creatingDraft ? "Creating…" : "Create Draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Form?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{form?.name}</strong>? This will permanently remove
            the form and all draft/published versions.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={deleting}
            sx={{ borderRadius: 999 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || isDeleteBlocked}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
