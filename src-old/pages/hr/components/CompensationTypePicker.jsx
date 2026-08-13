import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { createCompensationType } from "../../../services/hrService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

const CATEGORY_LABELS = {
  variable_pay: "Variable Pay",
  allowance: "Allowance",
  deduction: "Deduction",
};

export default function CompensationTypePicker({
  label = "Type",
  category,
  value,
  onChange,
  types = [],
  onCreated,
  disabled = false,
  required = false,
  size = "small",
}) {
  const { pushToast } = useToastStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () =>
      types
        .filter((type) => type.category === category)
        .filter((type) => type.is_active || String(type.id) === String(value)),
    [category, types, value],
  );

  const createType = async () => {
    if (!newLabel.trim()) return;

    setSaving(true);
    try {
      const created = await createCompensationType({
        category,
        label: newLabel.trim(),
      });
      pushToast({ message: "Compensation type added.", severity: "success" });
      onChange?.(created.id);
      await onCreated?.(created);
      setNewLabel("");
      setDialogOpen(false);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to add compensation type."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        select
        size={size}
        label={label}
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value === "__add_new__") {
            setDialogOpen(true);
            return;
          }
          onChange?.(event.target.value);
        }}
        disabled={disabled}
        required={required}
        fullWidth
      >
        {options.map((type) => (
          <MenuItem key={type.id} value={type.id}>
            {type.label}
            {!type.is_active ? " (inactive)" : ""}
          </MenuItem>
        ))}
        <ListSubheader disableSticky />
        <MenuItem value="__add_new__">
          <Stack direction="row" spacing={1} alignItems="center">
            <AddIcon fontSize="small" />
            <span>Add new type...</span>
          </Stack>
        </MenuItem>
      </TextField>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add {CATEGORY_LABELS[category] || "Compensation"} Type</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            size="small"
            label="Type name"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createType} disabled={saving || !newLabel.trim()}>
            {saving ? "Saving..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
