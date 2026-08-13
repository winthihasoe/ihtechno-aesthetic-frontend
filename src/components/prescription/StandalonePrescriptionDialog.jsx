import { useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PrescriptionForm from "./PrescriptionForm";
import { createStandalonePrescription } from "../../services/prescriptionService";
import { getProductPickerOptions } from "../../services/productPickerService";
import { searchPatientsForCheckIn } from "../../services/patientService";
import { resolveApiError } from "../../services/apiClient";

/**
 * Dialog for creating a standalone prescription invoice (no visit required).
 * Typically opened from the Payments/Cashier page.
 *
 * Props:
 *   open           — dialog open state
 *   onClose()      — close handler
 *   onCreated(res) — callback after successful creation; res includes { payment }
 */
export default function StandalonePrescriptionDialog({
  open,
  onClose,
  onCreated,
}) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      getProductPickerOptions()
        .then(setProductOptions)
        .catch(() => {});
    }
  }, [open]);

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery || patientQuery.length < 2) {
      setPatientOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchPatientsForCheckIn({ search: patientQuery });
        setPatientOptions(
          Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [],
        );
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  const handleClose = () => {
    if (saving) return;
    setItems([]);
    setNotes("");
    setSelectedPatient(null);
    setPatientQuery("");
    setPatientOptions([]);
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.medicine_name?.trim());
    if (!validItems.length) {
      setError("Add at least one medicine with a name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        patient_id: selectedPatient?.id || null,
        create_invoice: true,
        notes: notes || null,
        source_type: "standalone",
        items: validItems.map((item, i) => ({
          product_id: item.product_id || null,
          medicine_name: item.medicine_name,
          strength: item.strength || null,
          dosage_form: item.dosage_form || null,
          route: item.route || null,
          frequency: item.frequency || null,
          duration: item.duration || null,
          quantity: item.quantity === "" ? null : item.quantity,
          unit: item.unit || null,
          special_instructions: item.special_instructions || null,
          unit_price: item.unit_price === "" ? null : item.unit_price,
          is_dispensed: Boolean(item.is_dispensed),
          is_billable: true,
          sort_order: i,
        })),
      };

      const result = await createStandalonePrescription(payload);
      handleClose();
      onCreated?.(result);
    } catch (err) {
      setError(resolveApiError(err, "Failed to create prescription invoice."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>New Prescription Invoice</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            slotProps={{
              paper: {
                sx: {
                  bgcolor: "background.default",
                  borderRadius: 1,
                },
              },
            }}
            size="small"
            options={patientOptions}
            getOptionLabel={(opt) =>
              typeof opt === "string"
                ? opt
                : `${opt.name}${opt.phone ? ` (${opt.phone})` : ""}`
            }
            value={selectedPatient}
            onChange={(_e, val) => setSelectedPatient(val)}
            onInputChange={(_e, val, reason) => {
              if (reason === "input") setPatientQuery(val);
            }}
            isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
            filterOptions={(x) => x}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Patient (optional)"
                placeholder="Search patient by name or phone"
              />
            )}
          />

          <PrescriptionForm
            items={items}
            notes={notes}
            productOptions={productOptions}
            onItemsChange={setItems}
            onNotesChange={setNotes}
          />

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Creating..." : "Create Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
