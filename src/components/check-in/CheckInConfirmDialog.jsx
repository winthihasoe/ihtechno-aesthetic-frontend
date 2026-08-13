import { useState } from "react";
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
 */
export default function CheckInConfirmDialog({
  open,
  onClose,
  patientName,
  onCheckIn,
  submitLabel = "Check-in",
}) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setForm(initialForm());
    onClose();
  };

  const canSubmit = form.newComplaint || form.followUp;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCheckIn({
        newComplaint: form.newComplaint,
        followUp: form.followUp,
        checkInMode: form.checkInMode,
        note: form.note.trim() || null,
      });
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
