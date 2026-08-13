import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import dayjs from "dayjs";
import {
  getLiveboardAssignableStaff,
  assignWaitingDoctor,
} from "../../services/visitService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { canUpdateLiveboard } from "../../utils/roleUtils";
import { formatLiveboardDuration } from "../../utils/liveboardTimeUtils";
import VitalSigns from "../consultation/VitalSigns";

function minutesWaiting(visit) {
  const startedAt =
    visit?.visited_at ?? visit?.created_at ?? visit?.visit_time ?? null;
  if (!startedAt) return 0;
  return Math.max(0, dayjs().diff(dayjs(startedAt), "minute"));
}

function physicianRoleLabel(role) {
  if (role === "dermatologist") return "Dermatologist";
  if (role === "doctor") return "Medical Officer";
  return role ?? "";
}

export default function WaitingPanel({
  visit,
  user,
  consultation,
  onVisitUpdated,
  onConsultationSaved,
}) {
  const { pushToast } = useToastStore();
  const waitingMinutes = minutesWaiting(visit);
  const followUpLabel =
    visit?.follow_up === true
      ? "Yes"
      : visit?.follow_up === false
        ? "No"
        : "Unknown";

  const canAssign = canUpdateLiveboard(user);

  const [doctors, setDoctors] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visit?.doctor_id != null && visit?.doctor_id !== "") {
      setSelectedDoctorId(String(visit.doctor_id));
    } else {
      setSelectedDoctorId("");
    }
  }, [visit?.id, visit?.doctor_id]);

  const loadStaff = useCallback(async () => {
    if (!canAssign) return;
    setLoadingStaff(true);
    try {
      const data = await getLiveboardAssignableStaff();
      setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load physicians."),
        severity: "error",
      });
      setDoctors([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [canAssign, pushToast]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const doctorOptions = useMemo(() => {
    const list = [...doctors];
    const v = visit?.doctor;
    if (v?.id && !list.some((d) => Number(d.id) === Number(v.id))) {
      list.unshift({ id: v.id, name: v.name, role: v.role });
    }
    return list;
  }, [doctors, visit?.doctor]);

  const handleSave = async () => {
    if (!visit?.id || !selectedDoctorId) {
      pushToast({
        message: "Select a Medical Officer or Dermatologist.",
        severity: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const updated = await assignWaitingDoctor(visit.id, {
        doctor_id: Number(selectedDoctorId),
      });
      onVisitUpdated?.(updated);
      pushToast({ message: "Physician assigned.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to assign physician."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const assignedName = visit?.doctor?.name ?? null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Waiting
        </Typography>
        <Typography variant="body2">
          <strong>Patient:</strong> {visit?.patient?.name ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Chief complaint:</strong> {visit?.notes ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Follow-up:</strong> {followUpLabel}
        </Typography>
        <Typography variant="body2">
          <strong>Waiting time:</strong>{" "}
          {formatLiveboardDuration(waitingMinutes)}
        </Typography>

        <VitalSigns
          visitId={visit?.id}
          consultation={consultation}
          editable={canAssign}
          compact
          title="Vital Signs"
          subtitle="Measure during check-in so the doctor can review before consultation."
          onSaved={onConsultationSaved}
        />

        {canAssign && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Assign Medical Officer / Dermatologist
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              Only the assigned physician can start consultation from the board.
            </Typography>
            {loadingStaff ? (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}
              >
                <LoadingIndicator size={22} />
                <Typography variant="body2" color="text.secondary">
                  Loading physicians…
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="waiting-assign-doctor-label">
                    Physician
                  </InputLabel>
                  <Select
                    labelId="waiting-assign-doctor-label"
                    label="Physician"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    displayEmpty
                    renderValue={(val) => {
                      const d = doctorOptions.find(
                        (x) => String(x.id) === String(val),
                      );
                      if (!d) return assignedName ?? val;
                      const tag = physicianRoleLabel(d.role);
                      return tag ? `${d.name} (${tag})` : d.name;
                    }}
                  >
                    {doctorOptions.map((d) => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.name}
                        {d.role ? ` (${physicianRoleLabel(d.role)})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={() => void handleSave()}
                  disabled={saving || !selectedDoctorId}
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                >
                  {saving ? "Saving…" : "Save assignment"}
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {!canAssign && assignedName && (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            <strong>Assigned physician:</strong> {assignedName}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
