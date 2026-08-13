import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LabeledTextField from "../common/LabeledTextField";
import PrescriptionItemRow from "./PrescriptionItemRow";
import { reorderPrescriptionItems } from "../../services/prescriptionService";

const EMPTY_ITEM = {
  product_id: null,
  medicine_name: "",
  strength: "",
  dosage_form: "",
  route: "",
  frequency: "",
  duration: "",
  quantity: "",
  unit: "",
  special_instructions: "",
  unit_price: "",
  is_dispensed: false,
  is_billable: true,
};

/**
 * Editable prescription form with a list of medicine items.
 *
 * Props:
 *   items          — array of prescription item objects
 *   notes          — prescription-level notes string
 *   productOptions — array of products for autocomplete
 *   onItemsChange(items) — setter for the items array
 *   onNotesChange(notes) — setter for the notes string
 *   onDirty()      — optional callback when anything changes
 *   persistedPrescriptionId — when set and items have ids, reorder persists via API
 */
export default function PrescriptionForm({
  items = [],
  notes = "",
  productOptions = [],
  onItemsChange,
  onNotesChange,
  onDirty,
  persistedPrescriptionId = null,
}) {
  const [reorderError, setReorderError] = useState("");
  const handleItemChange = (index, field, value) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onItemsChange(next);
    onDirty?.();
  };

  const handleItemBatchChange = (index, changes) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...changes } : item,
    );
    onItemsChange(next);
    onDirty?.();
  };

  const handleAddItem = () => {
    onItemsChange([...items, { ...EMPTY_ITEM }]);
    onDirty?.();
  };

  const handleRemoveItem = (index) => {
    onItemsChange(items.filter((_, i) => i !== index));
    onDirty?.();
  };

  const handleMoveItem = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onItemsChange(next);
    onDirty?.();
    setReorderError("");

    const canPersist =
      persistedPrescriptionId &&
      next.length > 0 &&
      next.every((item) => item.id != null);

    if (!canPersist) {
      return;
    }

    try {
      const updated = await reorderPrescriptionItems(
        persistedPrescriptionId,
        next.map((item) => item.id),
      );
      if (Array.isArray(updated?.items)) {
        onItemsChange(updated.items);
      }
    } catch {
      setReorderError("Could not save item order. Try saving the prescription again.");
    }
  };

  return (
    <Box>
      <Stack spacing={1.5}>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No medicines prescribed yet. Click "+ Add Medicine" below.
          </Typography>
        ) : (
          items.map((item, index) => (
            <PrescriptionItemRow
              key={item.id ?? `new-${index}`}
              item={item}
              index={index}
              productOptions={productOptions}
              onChange={handleItemChange}
              onBatchChange={handleItemBatchChange}
              onRemove={handleRemoveItem}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              onMoveUp={() => handleMoveItem(index, "up")}
              onMoveDown={() => handleMoveItem(index, "down")}
            />
          ))
        )}

        {reorderError ? <Alert severity="warning">{reorderError}</Alert> : null}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Medicine
        </Button>

        <LabeledTextField
          title="Prescription Notes"
          size="small"
          multiline
          minRows={2}
          placeholder="General instructions: complete full course, take with plenty of water..."
          value={notes}
          onChange={(e) => {
            onNotesChange(e.target.value);
            onDirty?.();
          }}
          fullWidth
        />
      </Stack>
    </Box>
  );
}
