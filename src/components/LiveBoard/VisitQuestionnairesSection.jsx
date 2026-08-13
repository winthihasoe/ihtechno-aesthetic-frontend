import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import DynamicFormRenderer from "../common/DynamicFormRenderer";
import { resolveApiError } from "../../services/apiClient";
import { getForm, getLatestVisitFormResponses, submitResponse, updateResponse } from "../../services/formService";
import useToastStore from "../../stores/toastStore";
import useAuthStore from "../../stores/authStore";

export default function VisitQuestionnairesSection({
  visit,
  title = "Questionnaires & Consents",
  onResponsesChanged,
}) {
  const { pushToast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const [visitFormResponses, setVisitFormResponses] = useState([]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [activeFormId, setActiveFormId] = useState(null);
  const [activeFormName, setActiveFormName] = useState("");
  const [activeFormFields, setActiveFormFields] = useState([]);
  const [activeFormData, setActiveFormData] = useState({});
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeFormReadOnly, setActiveFormReadOnly] = useState(false);

  const loadVisitForms = useCallback(async () => {
    if (!visit?.id) return;
    try {
      const rows = await getLatestVisitFormResponses(visit.id);
      setVisitFormResponses(rows);
    } catch {
      setVisitFormResponses([]);
    }
  }, [visit?.id]);

  useEffect(() => {
    loadVisitForms();
  }, [loadVisitForms]);

  const openVisitFormEditor = async (row) => {
    setFormDialogOpen(true);
    setFormError("");
    setActiveFormId(row.form_id);
    setActiveFormName(row.form_name || "Form");
    setEditingResponseId(row.id);
    const submitterId =
      row?.submitted_by && typeof row.submitted_by === "object"
        ? row.submitted_by.id
        : row?.submitted_by;
    setActiveFormReadOnly(Number(submitterId) !== Number(authUser?.id));
    try {
      const details = await getForm(row.form_id);
      const fields = details?.fields ?? [];
      setActiveFormFields(fields);
      const defaults = {};
      if (fields.some((f) => f.name === "explained_by")) defaults.explained_by = authUser?.name ?? "";
      if (fields.some((f) => f.name === "explainer_role"))
        defaults.explainer_role = authUser?.role ?? "";
      if (fields.some((f) => f.name === "consent_date"))
        defaults.consent_date = new Date().toISOString().slice(0, 10);
      setActiveFormData({ ...defaults, ...(row.data ?? {}) });
    } catch (err) {
      setFormError(resolveApiError(err, "Failed to load form."));
    }
  };

  const handleSaveVisitForm = async () => {
    if (!activeFormId || !visit?.id) return;
    if (activeFormReadOnly) return;
    setFormSaving(true);
    setFormError("");
    try {
      const payload = {
        patient_id: visit?.patient_id ?? visit?.patient?.id ?? null,
        visit_id: visit.id,
        data: activeFormData,
      };
      if (editingResponseId) await updateResponse(editingResponseId, payload);
      else await submitResponse(activeFormId, payload);
      pushToast({ message: "Form saved.", severity: "success" });
      setFormDialogOpen(false);
      await loadVisitForms();
      onResponsesChanged?.();
    } catch (err) {
      setFormError(resolveApiError(err, "Failed to save form."));
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {visitFormResponses.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No questionnaire/consent has been saved in this visit yet.
        </Typography>
      ) : (
        <List dense disablePadding>
          {visitFormResponses.map((row) => (
            <ListItem
              key={`${row.form_id}-${row.id ?? "new"}`}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 0.75 }}
              secondaryAction={
                <Button size="small" variant="outlined" onClick={() => openVisitFormEditor(row)}>
                  {Number(
                    row?.submitted_by && typeof row.submitted_by === "object"
                      ? row.submitted_by.id
                      : row?.submitted_by,
                  ) === Number(authUser?.id)
                    ? "Edit"
                    : "View"}
                </Button>
              }
            >
              <ListItemText
                primary={row.form_name || "Form"}
                secondary={`Last updated: ${new Date(
                  row.updated_at ?? row.created_at ?? Date.now(),
                ).toLocaleString()} · Submitted by: ${
                  row?.submitted_by && typeof row.submitted_by === "object"
                    ? row.submitted_by.name ?? "Unknown"
                    : "Unknown"
                } · ${
                  Number(
                    row?.submitted_by && typeof row.submitted_by === "object"
                      ? row.submitted_by.id
                      : row?.submitted_by,
                  ) === Number(authUser?.id)
                    ? "Editable"
                    : "Read only"
                }`}
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={formDialogOpen} onClose={() => !formSaving && setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{activeFormName || "Form"}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          {activeFormReadOnly && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Read only: only the user who submitted this form can edit it.
            </Alert>
          )}
          {activeFormFields.length > 0 ? (
            <DynamicFormRenderer
              fields={activeFormFields}
              formData={activeFormData}
              onChange={(name, value) => {
                if (activeFormReadOnly) return;
                setActiveFormData((prev) => ({ ...prev, [name]: value }));
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Loading form fields...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)} disabled={formSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveVisitForm}
            disabled={activeFormReadOnly || formSaving || !activeFormFields.length}
          >
            {activeFormReadOnly ? "Read only" : formSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
