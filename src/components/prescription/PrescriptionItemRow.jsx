import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const DOSAGE_FORMS = [
  "tablet",
  "capsule",
  "cream",
  "gel",
  "ointment",
  "syrup",
  "injection",
  "drop",
  "patch",
  "inhaler",
  "other",
];

const ROUTES = [
  "oral",
  "topical",
  "IV",
  "IM",
  "subcutaneous",
  "nasal",
  "ophthalmic",
  "rectal",
  "sublingual",
  "other",
];

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 8 hours",
  "Every 12 hours",
  "Once weekly",
  "As needed (PRN)",
  "At bedtime",
  "Before meals",
  "After meals",
];

/**
 * A single row in the prescription form — renders fields for one medicine item.
 *
 * Props:
 *   item           — the prescription item object
 *   index          — positional index
 *   productOptions — array of { id, name, unit, selling_price } for autocomplete
 *   onChange(index, field, value) — field-level change handler
 *   onRemove(index) — remove handler
 */
export default function PrescriptionItemRow({
  item,
  index,
  productOptions = [],
  onChange,
  onBatchChange,
  onRemove,
}) {
  const handleField = (field) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    onChange(index, field, value);
  };

  const handleProductSelect = (_event, newValue) => {
    if (newValue && typeof newValue === "object") {
      onBatchChange(index, {
        product_id: newValue.id,
        medicine_name: newValue.name || "",
        unit: newValue.unit || "pcs",
        unit_price: newValue.selling_price ?? "",
      });
    } else if (typeof newValue === "string") {
      onBatchChange(index, {
        product_id: null,
        medicine_name: newValue,
      });
    } else {
      onChange(index, "product_id", null);
    }
  };

  const selectedProduct = item.product_id
    ? productOptions.find((p) => p.id === item.product_id) || null
    : null;

  const autocompleteSlotProps = {
    paper: {
      sx: {
        bgcolor: "background.default",

        borderRadius: 1,
      },
    },
  };
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      <IconButton
        size="small"
        onClick={() => onRemove(index)}
        sx={{ position: "absolute", top: 8, right: 8 }}
        aria-label="Remove medicine"
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, display: "block" }}
      >
        Medicine #{index + 1}
      </Typography>

      <Stack spacing={1.25}>
        {/* Row 1: Medicine name (autocomplete from products or free text) */}
        <Autocomplete
          freeSolo
          slotProps={autocompleteSlotProps}
          size="small"
          options={productOptions}
          getOptionLabel={(opt) =>
            typeof opt === "string" ? opt : opt?.name || ""
          }
          value={selectedProduct || item.medicine_name || ""}
          onChange={handleProductSelect}
          onInputChange={(_e, newInput, reason) => {
            if (reason === "input") {
              onChange(index, "medicine_name", newInput);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Medicine Name *"
              placeholder="Search product or type custom name"
            />
          )}
          isOptionEqualToValue={(opt, val) => {
            if (typeof val === "string") return opt?.name === val;
            return opt?.id === val?.id;
          }}
        />

        {/* Row 2: Strength, Dosage Form, Route */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Strength"
            placeholder="e.g. 500mg, 0.025%"
            value={item.strength || ""}
            onChange={handleField("strength")}
          />
          <TextField
            select
            size="small"
            label="Dosage Form"
            value={item.dosage_form || ""}
            onChange={handleField("dosage_form")}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {DOSAGE_FORMS.map((f) => (
              <MenuItem key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Route"
            value={item.route || ""}
            onChange={handleField("route")}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {ROUTES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Row 3: Frequency, Duration, Quantity, Unit */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" },
            gap: 1,
          }}
        >
          <Autocomplete
            slotProps={autocompleteSlotProps}
            freeSolo
            size="small"
            options={FREQUENCIES}
            value={item.frequency || ""}
            onInputChange={(_e, val, reason) => {
              if (reason === "input" || reason === "reset") {
                onChange(index, "frequency", val);
              }
            }}
            onChange={(_e, val) => onChange(index, "frequency", val || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Frequency"
                placeholder="e.g. Twice daily"
              />
            )}
          />
          <TextField
            size="small"
            label="Duration"
            placeholder="e.g. 7 days"
            value={item.duration || ""}
            onChange={handleField("duration")}
          />
          <TextField
            size="small"
            label="Quantity"
            type="number"
            inputProps={{ min: 0, step: 0.5 }}
            value={item.quantity ?? ""}
            onChange={handleField("quantity")}
          />
          <TextField
            size="small"
            label="Unit"
            placeholder="pcs / ml / tube"
            value={item.unit || ""}
            onChange={handleField("unit")}
          />
        </Box>

        {/* Row 4: Special instructions */}
        <TextField
          size="small"
          label="Special Instructions"
          multiline
          minRows={1}
          placeholder="e.g. take with food, avoid sunlight"
          value={item.special_instructions || ""}
          onChange={handleField("special_instructions")}
          fullWidth
        />

        {/* Row 5: Billing controls */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Price"
            type="number"
            inputProps={{ min: 0, step: 100 }}
            value={item.unit_price ?? ""}
            onChange={handleField("unit_price")}
            sx={{ width: 140 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={Boolean(item.is_dispensed)}
                onChange={handleField("is_dispensed")}
              />
            }
            label="Dispensed"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={Boolean(item.is_billable)}
                onChange={handleField("is_billable")}
              />
            }
            label="Add to invoice"
          />
        </Stack>
      </Stack>
    </Box>
  );
}
