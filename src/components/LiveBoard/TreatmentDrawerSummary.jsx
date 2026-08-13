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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import {
  assignVisitCareTeam,
  getLiveboardAssignableStaff,
  updateVisit,
} from "../../services/visitService";
import {
  canHandoverTreatmentDoctor,
  canUpdateLiveboard,
} from "../../utils/roleUtils";
import useAuthStore from "../../stores/authStore";
import LiveBoardStagePhotoStrip from "./LiveBoardStagePhotoStrip";
import VisitQuestionnairesSection from "./VisitQuestionnairesSection";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import HandoverTreatmentDoctorDialog from "./HandoverTreatmentDoctorDialog";
import * as treatmentService from "../../services/treatmentService";

export default function TreatmentDrawerSummary({
  visit,
  consultation,
  user,
  onVisitPhotoUploaded,
  onVisitUpdated,
  onFormsSaved,
}) {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const { user: authUser } = useAuthStore();
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
  const [treatments, setTreatments] = useState([]);

  const canAssign = canUpdateLiveboard(user);
  const canHandover = canHandoverTreatmentDoctor(user, visit);

  useEffect(() => {
    setRoomInput(visit?.treatment_room_number != null ? String(visit.treatment_room_number) : "");
  }, [visit?.id, visit?.treatment_room_number]);

  useEffect(() => {
    if (!visit?.id) {
      setTreatments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await treatmentService.listVisitTreatments(visit.id);
        if (!cancelled) setTreatments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setTreatments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit?.id]);

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
    if (treatmentRoomPath) navigate(treatmentRoomPath);
  }, [navigate, treatmentRoomPath]);

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
          <strong>Primary Concern:</strong>{" "}
          {consultation?.chief_complaint ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Assessment:</strong> {consultation?.diagnosis ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Treatment Plan:</strong>{" "}
          {consultation?.treatment_plan ??
            consultation?.prescribed_treatment ??
            "—"}
        </Typography>
      </Paper>

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

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Before / after photos (treatment)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Capture both during the treatment stage. Marking the visit done on
          Visit History without them requires confirmation.
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
        treatments={treatments}
        user={user}
        onSuccess={(updated) => onVisitUpdated?.(updated)}
      />
    </Stack>
  );
}
