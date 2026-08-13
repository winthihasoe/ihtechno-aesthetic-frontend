import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import {
  createSupplier,
  updateSupplier,
} from "../../pages/inventory/inventoryService";

const emptyForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
});

/**
 * Shared create/edit supplier dialog for inventory and finance flows.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {"create"|"edit"} [props.mode]
 * @param {number|null} [props.supplierId] required when mode is edit
 * @param {{ name?: string, phone?: string, email?: string, address?: string }} [props.initialValues]
 * @param {(supplier: object) => void} [props.onSaved]
 */
export default function SupplierFormDialog({
  open,
  onClose,
  mode = "create",
  supplierId = null,
  initialValues = null,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormError("");
    if (mode === "edit" && initialValues) {
      setForm({
        name: initialValues.name ?? "",
        phone: initialValues.phone ?? "",
        email: initialValues.email ?? "",
        address: initialValues.address ?? "",
      });
    } else {
      setForm({
        ...emptyForm(),
        name: initialValues?.name ?? "",
        phone: initialValues?.phone ?? "",
        email: initialValues?.email ?? "",
        address: initialValues?.address ?? "",
      });
    }
  }, [open, mode, initialValues]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      };
      const saved =
        mode === "edit" && supplierId
          ? await updateSupplier(supplierId, payload)
          : await createSupplier(payload);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setFormError(
        e?.response?.data?.message ?? "Could not save supplier.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
        {mode === "create" ? "Add supplier" : "Edit supplier"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <TextField
            label="Name"
            required
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Phone"
            fullWidth
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Address"
            fullWidth
            multiline
            minRows={2}
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <LoadingIndicator size={22} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
