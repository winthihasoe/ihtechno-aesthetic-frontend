import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { COPY } from "../../utils/inventoryUnitsCopy";
import { recordProductWastage } from "../../pages/inventory/inventoryService";

const REASONS = Object.keys(COPY.wastageReasons);

export default function RecordWastageDialog({
  open,
  onClose,
  product,
  batches,
  onSuccess,
}) {
  const useUnit = product?.use_unit_name ?? product?.unit ?? "unit";
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("spillage");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openBatches = (batches ?? []).filter(
    (b) => Number(b.open_units_remaining) > 0,
  );

  const handleClose = () => {
    if (saving) return;
    setBatchId("");
    setQuantity("");
    setReason("spillage");
    setError("");
    onClose?.();
  };

  const handleSave = async () => {
    setError("");
    const q = parseFloat(quantity);
    if (!batchId || !Number.isFinite(q) || q <= 0) {
      setError("Select a batch and enter a valid quantity.");
      return;
    }
    setSaving(true);
    try {
      await recordProductWastage(product.id, {
        batch_id: Number(batchId),
        quantity: q,
        reason,
      });
      await onSuccess?.();
      handleClose();
    } catch (e) {
      setError(
        e?.response?.data?.message ??
          e?.response?.data?.errors?.quantity?.[0] ??
          "Could not record wastage.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{COPY.wastageTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : null}
          <FormControl size="small" fullWidth>
            <InputLabel>Open batch</InputLabel>
            <Select
              label="Open batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              {openBatches.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.batch_number || `#${b.id}`} — {b.open_units_remaining}{" "}
                  {useUnit} open
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={COPY.wastageQty(useUnit)}
            type="number"
            size="small"
            fullWidth
            value={quantity}
            inputProps={{ min: 0.001, step: 0.1 }}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Reason</InputLabel>
            <Select
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {COPY.wastageReasons[r]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Record wastage"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
