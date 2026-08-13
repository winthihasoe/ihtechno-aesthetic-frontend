import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const initialForm = () => ({
  newComplaint: false,
  followUp: false,
  checkInMode: "physical",
  note: "",
});

/**
 * Check-in confirmation: New Complaint / Follow-up checkboxes + note. Check-in / Cancel.
 * When `linkedAppointment` is set, check-in is routed through the appointment (complaint flags come from appointment type).
 */
export default function CheckInConfirmDialog({
  open,
  onClose,
  patientName,
  onCheckIn,
  submitLabel = "Check-in",
  linkedAppointment = null,
}) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const isAppointmentCheckIn = Boolean(linkedAppointment?.id);

  useEffect(() => {
    if (!open) {
      setForm(initialForm());
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    setForm(initialForm());
    onClose();
  };

  const canSubmit = isAppointmentCheckIn || form.newComplaint || form.followUp;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isAppointmentCheckIn) {
        await onCheckIn({ appointmentId: linkedAppointment.id });
      } else {
        await onCheckIn({
          newComplaint: form.newComplaint,
          followUp: form.followUp,
          checkInMode: form.checkInMode,
          note: form.note.trim() || null,
        });
      }
      setForm(initialForm());
    } catch {
      // Parent is responsible for error feedback (e.g. toast).
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm check-in</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Patient: <strong>{patientName}</strong>
        </Typography>
        <Stack spacing={1.5}>
          {isAppointmentCheckIn ? (
            <Typography variant="body2" color="text.secondary">
              This check-in will be linked to the scheduled appointment
              {linkedAppointment.scheduled_at
                ? ` on ${linkedAppointment.scheduled_at}`
                : ""}
              . Complaint type follows the appointment.
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary">
                Select at least one: New complaint or Follow up.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.newComplaint}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newComplaint: e.target.checked }))
                    }
                  />
                }
                label="New Complaint"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.followUp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, followUp: e.target.checked }))
                    }
                  />
                }
                label="Follow up"
              />

              <TextField
                label="Complaint or Follow up reason"
                placeholder="Add a short note for this visit…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                multiline
                minRows={2}
                fullWidth
              />

              <FormControl component="fieldset" sx={{ pt: 0.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  Check-in type
                </Typography>
                <RadioGroup
                  row
                  value={form.checkInMode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, checkInMode: e.target.value }))
                  }
                >
                  <FormControlLabel
                    value="physical"
                    control={<Radio size="small" />}
                    label="Physical"
                  />
                  <FormControlLabel
                    value="online"
                    control={<Radio size="small" />}
                    label="Online"
                  />
                </RadioGroup>
              </FormControl>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
        >
          {submitting ? "Checking in…" : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
