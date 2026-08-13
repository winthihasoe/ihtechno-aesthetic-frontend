import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import dayjs from "dayjs";
import { getPreparationChecklist } from "../../services/visitService";
import {
  getLatestVisitFormResponses,
  getForm,
} from "../../services/formService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import DynamicFormRenderer from "../common/DynamicFormRenderer";
import VisitPhotoThumbnails from "./VisitPhotoThumbnails";
import TreatmentPreparationDetailDialog, {
  formatTreatmentDuration,
  getTemplateIdFromTreatment,
} from "./TreatmentPreparationDetailDialog";
import TreatmentStockWarningAlert from "./TreatmentStockWarningAlert";
import { formatKyats } from "../../utils/formatKyats";
import {
  photosForStage,
  shortVisitPhotoCaption,
} from "../../utils/visitPhotoLabels";
import { canAccessPreparationPanel } from "../../utils/roleUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import useUIStore from "../../stores/useUIStore";
import { formatLiveboardRelativeTime } from "../../utils/liveboardTimeUtils";
import VitalSigns from "../consultation/VitalSigns";

function formatPlanPrice(amount) {
  if (amount == null || amount === "") return "—";
  return formatKyats(amount);
}

function formatTimestamp(value) {
  return formatLiveboardRelativeTime(value);
}

function FormStatusListItem({ complete, primary, secondary }) {
  return (
    <ListItem
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        mb: 0.75,
        py: 0.75,
      }}
    >
      {complete ? (
        <CheckCircleOutlineIcon color="success" sx={{ mr: 1, fontSize: 22 }} />
      ) : (
        <ErrorOutlineIcon color="warning" sx={{ mr: 1, fontSize: 22 }} />
      )}
      <ListItemText
        primary={primary}
        secondary={secondary}
        primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
        secondaryTypographyProps={{ variant: "caption" }}
      />
    </ListItem>
  );
}

export default function PreparationBriefPanel({
  visit,
  consultation,
  visitTreatments = [],
  user,
}) {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const canOpenPreparationRoom = canAccessPreparationPanel(user, visit);
  const preparationRoomPath = useMemo(() => {
    if (!visit?.id || !user) return "";
    const prefix = getWorkspaceUrlPrefix(user);
    return `${prefix}/visits/${visit.id}/preparation-room`;
  }, [visit?.id, user]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [formResponses, setFormResponses] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [photoDialog, setPhotoDialog] = useState(null);
  const [viewFormOpen, setViewFormOpen] = useState(false);
  const [viewFormName, setViewFormName] = useState("");
  const [viewFormFields, setViewFormFields] = useState([]);
  const [viewFormData, setViewFormData] = useState({});
  const [viewFormLoading, setViewFormLoading] = useState(false);
  const [detailTreatment, setDetailTreatment] = useState(null);

  const assignedTherapists = useMemo(
    () => (Array.isArray(visit?.therapists) ? visit.therapists : []),
    [visit?.therapists],
  );

  const therapistNames = useMemo(() => {
    if (assignedTherapists.length) {
      return assignedTherapists.map((t) => t.name).join(", ");
    }
    return visit?.therapist?.name ?? "—";
  }, [assignedTherapists, visit?.therapist?.name]);

  const plannedTreatments = useMemo(
    () => (visitTreatments || []).filter((t) => t.status === "planned"),
    [visitTreatments],
  );

  const hasPlannedTemplatePreset = useMemo(
    () => plannedTreatments.some((t) => getTemplateIdFromTreatment(t) != null),
    [plannedTreatments],
  );

  const preparationPhotos = useMemo(
    () => photosForStage(visit?.photos ?? [], "preparation"),
    [visit?.photos],
  );

  const beforePhotos = useMemo(
    () => preparationPhotos.filter((p) => p.type === "before"),
    [preparationPhotos],
  );

  const afterPhotos = useMemo(
    () => preparationPhotos.filter((p) => p.type === "after"),
    [preparationPhotos],
  );

  const loadChecklist = useCallback(async () => {
    if (!visit?.id) return;
    setChecklistLoading(true);
    try {
      const res = await getPreparationChecklist(visit.id);
      setChecklistItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load preparation checklist."),
        severity: "error",
      });
    } finally {
      setChecklistLoading(false);
    }
  }, [visit?.id, pushToast]);

  const loadFormResponses = useCallback(async () => {
    if (!visit?.id) return;
    setFormsLoading(true);
    try {
      const rows = await getLatestVisitFormResponses(visit.id);
      setFormResponses(Array.isArray(rows) ? rows : []);
    } catch {
      setFormResponses([]);
    } finally {
      setFormsLoading(false);
    }
  }, [visit?.id]);

  useEffect(() => {
    void loadChecklist();
    void loadFormResponses();
  }, [loadChecklist, loadFormResponses]);

  const openFormViewer = async (row) => {
    if (!row?.form_id) return;
    setViewFormOpen(true);
    setViewFormName(row.form_name || "Form");
    setViewFormFields([]);
    setViewFormData(row.data ?? {});
    setViewFormLoading(true);
    try {
      const response = await getForm(row.form_id);
      setViewFormName(response?.form?.name ?? row.form_name ?? "Form");
      setViewFormFields(response?.fields ?? []);
      setViewFormData(row.data ?? {});
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load form."),
        severity: "error",
      });
      setViewFormOpen(false);
    } finally {
      setViewFormLoading(false);
    }
  };

  const consultationSkipped = Boolean(visit?.consultation_skipped);
  const doctorPlan =
    consultation?.treatment_plan ?? consultation?.prescribed_treatment ?? null;
  const roomNumber =
    visit?.treatment_room_number != null &&
    String(visit.treatment_room_number).trim() !== ""
      ? String(visit.treatment_room_number)
      : "—";

  const handleOpenPreparationRoom = useCallback(() => {
    if (!preparationRoomPath) return;
    closeDrawer();
    navigate(preparationRoomPath);
  }, [closeDrawer, navigate, preparationRoomPath]);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Read-only view. Front desk staff manage treatment preparation from the
        Preparation Room.
      </Alert>

      {consultationSkipped ? (
        <Alert severity="warning">Consultation skipped</Alert>
      ) : null}

      <VitalSigns
        consultation={consultation}
        compact
        title="Vital Signs"
        subtitle="Latest measurements for this visit."
      />

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          p: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(22,27,34,0.72)"
              : "rgba(255,246,252,0.78)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
          Treatment assignment
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          <strong>Doctor:</strong> {visit?.doctor?.name ?? "—"}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Therapist(s):</strong> {therapistNames}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Treatment room no.{" "}
          <span style={{ fontWeight: 400 }}>{roomNumber}</span>
        </Typography>
        {canOpenPreparationRoom ? (
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenPreparationRoom}
            disabled={!preparationRoomPath}
            sx={{ mt: 1 }}
          >
            Open preparation room
          </Button>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Treatments
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Use <strong>Details</strong> to view products, patient checks, and
          instruction steps.
        </Typography>
        {doctorPlan ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            <strong>Treatment selected by doctor:</strong> {doctorPlan}
          </Typography>
        ) : null}
        {!hasPlannedTemplatePreset && plannedTreatments.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            No treatment selected.
          </Typography>
        ) : null}
        {plannedTreatments.length > 0 ? (
          <List dense disablePadding>
            {plannedTreatments.map((treatment) => {
              const template =
                treatment.treatment_template ?? treatment.treatmentTemplate;
              const templateId = getTemplateIdFromTreatment(treatment);
              const duration = formatTreatmentDuration(treatment, template);
              const price = formatPlanPrice(template?.price ?? null);
              const isPreset = templateId != null;
              const secondaryParts = [
                duration ? `Duration: ${duration}` : null,
                `Price: ${price}`,
              ].filter(Boolean);
              return (
                <ListItem
                  key={treatment.id}
                  disablePadding
                  divider
                  sx={{
                    mb: 0.75,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                    boxShadow: isPreset ? 3 : 0,
                    display: "block",
                  }}
                >
                  <Box sx={{ p: 1.5 }}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {treatment.name || "Procedure"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {secondaryParts.join(" · ")}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDetailTreatment(treatment)}
                        sx={{ flexShrink: 0 }}
                      >
                        Details
                      </Button>
                    </Stack>
                    <TreatmentStockWarningAlert treatment={treatment} dense />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No planned procedures yet.
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Required forms
        </Typography>
        {checklistLoading && checklistItems.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : checklistItems.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No template-required forms for the current presets.
          </Typography>
        ) : (
          <List dense disablePadding>
            {checklistItems.map((row) => (
              <FormStatusListItem
                key={row.form_definition_id}
                complete={Boolean(row.complete)}
                primary={row.name}
                secondary={row.complete ? "Completed" : "Not completed"}
              />
            ))}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Questionnaires & Consents
        </Typography>
        {formsLoading && formResponses.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <LoadingIndicator size={28} />
          </Box>
        ) : formResponses.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No questionnaire or consent has been saved for this visit yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {formResponses.map((row) => {
              const submitterName =
                row?.submitted_by && typeof row.submitted_by === "object"
                  ? row.submitted_by.name
                  : "Unknown";
              return (
                <ListItem
                  key={row.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 0.75,
                  }}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void openFormViewer(row)}
                    >
                      View
                    </Button>
                  }
                >
                  <CheckCircleOutlineIcon
                    color="success"
                    sx={{ mr: 1, fontSize: 22 }}
                  />
                  <ListItemText
                    primary={row.form_name || "Form"}
                    secondary={`Completed · ${formatTimestamp(
                      row.updated_at ?? row.created_at,
                    )} · Submitted by: ${submitterName}`}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                    }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Before / after photos (preparation)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Uploaded during preparation. Before: {beforePhotos.length} · After:{" "}
          {afterPhotos.length}
        </Typography>
        {preparationPhotos.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No preparation photos uploaded yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {beforePhotos.length > 0 ? (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.75, fontWeight: 600 }}
                >
                  Before
                </Typography>
                <VisitPhotoThumbnails
                  photos={beforePhotos}
                  onPhotoClick={setPhotoDialog}
                />
              </Box>
            ) : null}
            {afterPhotos.length > 0 ? (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.75, fontWeight: 600 }}
                >
                  After
                </Typography>
                <VisitPhotoThumbnails
                  photos={afterPhotos}
                  onPhotoClick={setPhotoDialog}
                />
              </Box>
            ) : null}
          </Stack>
        )}
      </Paper>

      <TreatmentPreparationDetailDialog
        open={Boolean(detailTreatment)}
        onClose={() => setDetailTreatment(null)}
        treatment={detailTreatment}
        checklistItems={checklistItems}
      />

      <Dialog
        open={viewFormOpen}
        onClose={() => setViewFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{viewFormName || "Form"}</DialogTitle>
        <DialogContent dividers>
          {viewFormLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <LoadingIndicator size={28} />
            </Box>
          ) : viewFormFields.length > 0 ? (
            <DynamicFormRenderer
              fields={viewFormFields}
              formData={viewFormData}
              onChange={() => {}}
              disabled
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No form fields to display.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewFormOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(photoDialog)}
        onClose={() => setPhotoDialog(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {photoDialog ? shortVisitPhotoCaption(photoDialog) : "Photo"}
        </DialogTitle>
        <DialogContent dividers>
          {photoDialog?.url ? (
            <Box
              component="img"
              src={photoDialog.url}
              alt={shortVisitPhotoCaption(photoDialog)}
              sx={{
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                display: "block",
                bgcolor: "black",
                borderRadius: 2,
              }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
