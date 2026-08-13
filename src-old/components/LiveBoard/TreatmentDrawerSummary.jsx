import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import useLiveBoardStore from "../../stores/liveBoardStore";
import useSettingsStore from "../../stores/settingsStore";
import { resolveApiError } from "../../services/apiClient";
import {
  assignVisitCareTeam,
  getLiveboardAssignableStaff,
  updateVisit,
} from "../../services/visitService";
import {
  canHandoverTreatmentDoctor,
  canUpdateLiveboard,
  canUseLiveboardButton,
} from "../../utils/roleUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import { confirmIfMissingStagePhotos } from "../../utils/visitStagePhotos";
import {
  formatTreatmentSessionApprovalLabel,
  getTreatmentDoneBlockReason,
} from "../../utils/treatmentSessionUtils";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/useUIStore";
import LiveBoardStagePhotoStrip from "./LiveBoardStagePhotoStrip";
import VisitQuestionnairesSection from "./VisitQuestionnairesSection";
import HandoverTreatmentDoctorDialog from "./HandoverTreatmentDoctorDialog";
import VitalSigns from "../consultation/VitalSigns";

export default function TreatmentDrawerSummary({
  visit,
  consultation,
  visitTreatments = [],
  user,
  onVisitPhotoUploaded,
  onVisitUpdated,
  onFormsSaved,
  onConsultationSaved,
  onRefreshTreatments,
}) {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const markTreatmentDone = useLiveBoardStore((s) => s.markTreatmentDone);
  const liveboardRules = useSettingsStore(
    (s) => s.settings?.liveboard_rules || {},
  );
  const { user: authUser } = useAuthStore();
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const [open, setOpen] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState({ doctors: [], therapists: [] });
  const [doctorId, setDoctorId] = useState("");
  const [therapistIds, setTherapistIds] = useState([]);
  const [error, setError] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [roomSaving, setRoomSaving] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [markingVisitDone, setMarkingVisitDone] = useState(false);

  const canAssign = canUpdateLiveboard(user);
  const canHandover = canHandoverTreatmentDoctor(user, visit);
  const canMarkDone =
    visit?.status === "treatment" &&
    canUseLiveboardButton(user, visit, "mark_done", liveboardRules);
  const markDoneBlockReason = useMemo(
    () => getTreatmentDoneBlockReason(visitTreatments),
    [visitTreatments],
  );

  useEffect(() => {
    setRoomInput(visit?.treatment_room_number != null ? String(visit.treatment_room_number) : "");
  }, [visit?.id, visit?.treatment_room_number]);

  useEffect(() => {
    if (visit?.status === "treatment") {
      onRefreshTreatments?.();
    }
  }, [visit?.id, visit?.status, onRefreshTreatments]);

  const treatmentRoomPath = useMemo(() => {
    if (!visit?.id) return "";
    const prefix = getWorkspaceUrlPrefix(authUser);
    return `${prefix}/visits/${visit.id}/treatment-room`;
  }, [visit?.id, authUser]);

  const assignedTherapists = useMemo(
    () => (Array.isArray(visit?.therapists) ? visit.therapists : []),
    [visit?.therapists],
  );

  const therapistNames = useMemo(() => {
    if (assignedTherapists.length)
      return assignedTherapists.map((t) => t.name).join(", ");
    return visit?.therapist?.name ?? "—";
  }, [assignedTherapists, visit?.therapist?.name]);

  const openAssignModal = async () => {
    setOpen(true);
    setError("");
    setDoctorId(String(visit?.doctor_id ?? visit?.doctor?.id ?? ""));
    const preselectedTherapists = assignedTherapists.length
      ? assignedTherapists.map((t) => String(t.id))
      : visit?.therapist_id
        ? [String(visit.therapist_id)]
        : [];
    setTherapistIds(preselectedTherapists.slice(0, 2));
    setLoadingStaff(true);
    try {
      const data = await getLiveboardAssignableStaff();
      setStaff({
        doctors: data?.doctors ?? [],
        therapists: data?.therapists ?? [],
      });
    } catch (err) {
      setError(resolveApiError(err, "Failed to load assignable staff."));
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSaveAssign = async () => {
    if (!doctorId || therapistIds.length < 1 || therapistIds.length > 2) {
      setError("Please choose 1 doctor and 1-2 therapists.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updatedVisit = await assignVisitCareTeam(visit.id, {
        doctor_id: Number(doctorId),
        therapist_ids: therapistIds.map((id) => Number(id)),
      });
      onVisitUpdated?.(updatedVisit);
      pushToast({ message: "Care team assigned.", severity: "success" });
      setOpen(false);
    } catch (err) {
      const message = resolveApiError(err, "Failed to assign care team.");
      setError(message);
      pushToast({ message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRoom = useCallback(() => {
    if (!treatmentRoomPath) return;
    closeDrawer();
    navigate(treatmentRoomPath);
  }, [closeDrawer, navigate, treatmentRoomPath]);

  const handleMarkVisitDone = async () => {
    if (!visit?.id || !canMarkDone) return;
    if (markDoneBlockReason) {
      pushToast({ message: markDoneBlockReason, severity: "warning" });
      return;
    }
    const { ok, payload } = await confirmIfMissingStagePhotos({
      askConfirm,
      photos: visit.photos,
      stage: "treatment",
    });
    if (!ok) return;
    const approved = await askConfirm({
      title: "Confirm status change",
      message: `Move ${visit.patient?.name ?? "this patient"} to Payment?`,
      confirmText: "Continue",
    });
    if (!approved) return;
    setMarkingVisitDone(true);
    try {
      const updated = await markTreatmentDone(visit.id, payload);
      onVisitUpdated?.(updated);
      pushToast({
        message: "Visit moved to Payment.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to mark treatment done."),
        severity: "error",
      });
    } finally {
      setMarkingVisitDone(false);
    }
  };

  const handleSaveRoomNumber = async () => {
    if (!visit?.id) return;
    setRoomSaving(true);
    try {
      const trimmed = roomInput.trim();
      const updatedVisit = await updateVisit(visit.id, {
        treatment_room_number: trimmed === "" ? null : trimmed,
      });
      onVisitUpdated?.(updatedVisit);
      pushToast({ message: "Treatment room saved.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save treatment room."),
        severity: "error",
      });
    } finally {
      setRoomSaving(false);
    }
  };

  const consultationSkipped = Boolean(visit?.consultation_skipped);

  return (
    <Stack spacing={2}>
      {consultationSkipped && (
        <Alert severity="warning">
          Consultation skipped: consultation data is not saved and consultation fee will not be collected.
        </Alert>
      )}
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
          Consultation summary
        </Typography>
        <Typography variant="body2">
          <strong>Chief Complaint:</strong>{" "}
          {consultation?.chief_complaint ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Diagnosis:</strong> {consultation?.diagnosis ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Treatment Plan:</strong>{" "}
          {consultation?.treatment_plan ??
            consultation?.prescribed_treatment ??
            "—"}
        </Typography>
      </Paper>

      <VitalSigns
        visitId={visit?.id}
        consultation={consultation}
        editable={canAssign}
        compact
        title="Vital Signs"
        subtitle="Latest measurements for treatment."
        onSaved={onConsultationSaved}
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
        <VisitQuestionnairesSection
          visit={visit}
          onResponsesChanged={onFormsSaved}
        />
      </Paper>

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
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          <strong>Therapist(s):</strong> {therapistNames}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Room no.:</strong> {visit?.treatment_room_number ?? "—"}
        </Typography>
        {canAssign && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }} alignItems={{ sm: "flex-start" }}>
            <TextField
              label="Edit room number"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              size="small"
              fullWidth
              disabled={roomSaving}
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" onClick={handleSaveRoomNumber} disabled={roomSaving}>
              {roomSaving ? "Saving…" : "Save room"}
            </Button>
          </Stack>
        )}
        {canHandover && (
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            onClick={() => setHandoverOpen(true)}
            sx={{ mb: 1 }}
          >
            Hand over to doctor
          </Button>
        )}
        {canAssign && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<AssignmentIndIcon />}
              onClick={openAssignModal}
            >
              Assign doctor
            </Button>
            <Button
              variant="outlined"
              startIcon={<GroupAddIcon />}
              onClick={openAssignModal}
            >
              Assign therapist
            </Button>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenRoom}
              disabled={!treatmentRoomPath}
            >
              Open treatment room
            </Button>
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Treatment sessions
        </Typography>
        {visitTreatments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No sessions yet. Open the treatment room to add and complete sessions.
          </Typography>
        ) : (
          <Stack spacing={0.75} sx={{ mb: 1.5 }}>
            {visitTreatments.map((session) => (
              <Stack
                key={session.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {session.name || `Session #${session.id}`}
                </Typography>
                <Chip
                  size="small"
                  label={formatTreatmentSessionApprovalLabel(session)}
                  color={
                    session.approval_status === "approved"
                      ? "success"
                      : session.status !== "completed"
                        ? "default"
                        : "warning"
                  }
                  variant="outlined"
                />
              </Stack>
            ))}
          </Stack>
        )}
        {markDoneBlockReason ? (
          <Alert severity="info" sx={{ mb: 1.5, fontSize: 13 }}>
            {markDoneBlockReason}
          </Alert>
        ) : null}
        {canMarkDone ? (
          <Tooltip
            title={markDoneBlockReason || ""}
            disableHoverListener={!markDoneBlockReason}
            arrow
          >
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CheckCircleIcon />}
                onClick={() => void handleMarkVisitDone()}
                disabled={Boolean(markDoneBlockReason) || markingVisitDone}
                data-testid="visit-action-mark_treatment_done"
              >
                {markingVisitDone ? "Moving…" : "Mark Done"}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Before / after photos (treatment)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Capture both during the treatment stage. Marking the visit done on the
          Live Board without them requires confirmation.
        </Typography>
        <LiveBoardStagePhotoStrip
          visitId={visit?.id}
          stage="treatment"
          photos={visit?.photos ?? []}
          onPhotoUploaded={onVisitPhotoUploaded}
        />
      </Paper>

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign care team</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {loadingStaff ? (
              <Typography variant="body2" color="text.secondary">
                Loading staff...
              </Typography>
            ) : (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Doctor</InputLabel>
                  <Select
                    label="Doctor"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                  >
                    {staff.doctors.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Therapists (max 2)</InputLabel>
                  <Select
                    multiple
                    label="Therapists (max 2)"
                    value={therapistIds}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTherapistIds(next.slice(0, 2));
                    }}
                    renderValue={(selected) =>
                      selected
                        .map(
                          (id) =>
                            staff.therapists.find((t) => String(t.id) === id)
                              ?.name ?? id,
                        )
                        .join(", ")
                    }
                  >
                    {staff.therapists.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAssign}
            disabled={saving || loadingStaff}
          >
            {saving ? "Saving..." : "Save assignment"}
          </Button>
        </DialogActions>
      </Dialog>

      <HandoverTreatmentDoctorDialog
        open={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        visit={visit}
        treatments={visitTreatments}
        user={user}
        onSuccess={(updated) => onVisitUpdated?.(updated)}
      />
    </Stack>
  );
}
