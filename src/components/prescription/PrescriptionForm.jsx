import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PrescriptionItemRow from "./PrescriptionItemRow";

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
  is_billable: false,
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
 */
export default function PrescriptionForm({
  items = [],
  notes = "",
  productOptions = [],
  onItemsChange,
  onNotesChange,
  onDirty,
}) {
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
              key={index}
              item={item}
              index={index}
              productOptions={productOptions}
              onChange={handleItemChange}
              onBatchChange={handleItemBatchChange}
              onRemove={handleRemoveItem}
            />
          ))
        )}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Medicine
        </Button>

        <TextField
          size="small"
          label="Prescription Notes"
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
