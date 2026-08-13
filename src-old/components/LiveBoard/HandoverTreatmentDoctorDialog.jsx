import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import {
  getLiveboardAssignableStaff,
  handoverTreatmentDoctor,
} from "../../services/visitService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

export default function HandoverTreatmentDoctorDialog({
  open,
  onClose,
  visit,
  treatments = [],
  user,
  onSuccess,
}) {
  const pushToast = useToastStore((s) => s.pushToast);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [scope, setScope] = useState("all");
  const [treatmentId, setTreatmentId] = useState("");

  const incompleteSessions = useMemo(() => {
    const list = Array.isArray(treatments) ? treatments : [];
    return list.filter((t) => t.status !== "completed");
  }, [treatments]);

  const defaultTreatmentId = useMemo(() => {
    const inProgress = incompleteSessions.find((t) => t.status === "in_progress");
    if (inProgress?.id) return String(inProgress.id);
    if (incompleteSessions[0]?.id) return String(incompleteSessions[0].id);
    return "";
  }, [incompleteSessions]);

  useEffect(() => {
    if (!open) {
      setSelectedDoctorId("");
      setScope("all");
      setTreatmentId("");
      return;
    }
    setTreatmentId(defaultTreatmentId);
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getLiveboardAssignableStaff();
        const raw = Array.isArray(data?.doctors) ? data.doctors : [];
        const uid = user?.id != null ? Number(user.id) : null;
        const filtered =
          uid != null ? raw.filter((u) => Number(u.id) !== uid) : raw;
        if (!cancelled) setDoctors(filtered);
      } catch (err) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(err, "Could not load doctors."),
            severity: "error",
          });
          setDoctors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pushToast, user?.id, defaultTreatmentId]);

  const handleConfirm = async () => {
    const doctorId = Number(selectedDoctorId);
    if (!visit?.id || !doctorId) return;
    if (scope === "current_session" && !treatmentId) {
      pushToast({
        message: "Select a treatment session to hand over.",
        severity: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        doctor_id: doctorId,
        scope,
      };
      if (scope === "current_session") {
        payload.treatment_id = Number(treatmentId);
      }
      const updated = await handoverTreatmentDoctor(visit.id, payload);
      pushToast({ message: "Treatment handover request sent.", severity: "success" });
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not request handover."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Hand over to doctor</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The selected doctor must accept on their Live Board before they can
          work in the Treatment Room. Consultation commission stays with the
          consulting doctor.
        </Typography>
        {loading ? (
          <LoadingIndicator size={24} />
        ) : (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="handover-doctor-label">Doctor</InputLabel>
              <Select
                labelId="handover-doctor-label"
                label="Doctor"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <RadioGroup
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              sx={{ mb: scope === "current_session" ? 1 : 0 }}
            >
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label="All treatment sessions"
              />
              <FormControlLabel
                value="current_session"
                control={<Radio size="small" />}
                label="Current session only"
              />
            </RadioGroup>
            {scope === "current_session" && (
              <FormControl fullWidth size="small">
                <InputLabel id="handover-session-label">Session</InputLabel>
                <Select
                  labelId="handover-session-label"
                  label="Session"
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                >
                  {incompleteSessions.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.name ?? `Session #${t.id}`}
                      {t.status ? ` (${t.status})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={saving || loading || !selectedDoctorId}
        >
          {saving ? "Sending…" : "Confirm handover"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
