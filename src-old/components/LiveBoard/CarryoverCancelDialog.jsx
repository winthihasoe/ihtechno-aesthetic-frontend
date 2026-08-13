import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { CARRYOVER_CANCEL_REASONS } from "../../utils/liveboardDrawerContext";

export default function CarryoverCancelDialog({
  open,
  visit,
  saving = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState(CARRYOVER_CANCEL_REASONS[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason(CARRYOVER_CANCEL_REASONS[0]);
    setNote("");
  }, [open, visit?.id]);

  const requiresNote = reason === "Other";
  const patientName = visit?.patient?.name || visit?.patientName || "Patient";
  const hasUnpaidPayment =
    visit?.status === "payment" &&
    visit?.payment &&
    visit.payment.status !== "paid" &&
    visit.payment.status !== "void";

  const canSubmit =
    Boolean(reason) && (!requiresNote || note.trim().length > 0) && !saving;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cancel carryover visit</DialogTitle>
      <DialogContent dividers>
        <StackLike spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Cancel the open visit for {patientName}? This clears the prior-day
            card so the patient can check in again.
          </Typography>
          {hasUnpaidPayment ? (
            <Typography variant="body2" color="warning.dark">
              This will void the unpaid invoice draft linked to this visit.
            </Typography>
          ) : null}
          <FormControl fullWidth size="small">
            <InputLabel id="carryover-cancel-reason-label">Reason</InputLabel>
            <Select
              labelId="carryover-cancel-reason-label"
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {CARRYOVER_CANCEL_REASONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {requiresNote ? (
            <TextField
              label="Details"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              minRows={2}
              size="small"
              required
              helperText="Required when reason is Other."
            />
          ) : (
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              minRows={2}
              size="small"
            />
          )}
        </StackLike>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Back
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={!canSubmit}
          onClick={() =>
            onConfirm?.({
              reason,
              note: note.trim() || undefined,
            })
          }
        >
          {saving ? "Cancelling..." : "Cancel visit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function StackLike({ spacing = 1, children }) {
  return (
    <Box sx={{ display: "grid", gap: spacing }}>{children}</Box>
  );
}
