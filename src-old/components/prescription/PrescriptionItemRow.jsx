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
  Alert,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LabeledTextField, {
  LabeledField,
} from "../common/LabeledTextField";

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
 *   canMoveUp / canMoveDown / onMoveUp / onMoveDown — reorder controls
 */
export default function PrescriptionItemRow({
  item,
  index,
  productOptions = [],
  onChange,
  onBatchChange,
  onRemove,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}) {
  const handleField = (field) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    onChange(index, field, value);
  };

  const handleDispensedChange = (e) => {
    const isDispensed = e.target.checked;
    onBatchChange(index, {
      is_dispensed: isDispensed,
      is_billable: !isDispensed,
    });
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
      <Stack
        direction="row"
        spacing={0.25}
        sx={{ position: "absolute", top: 8, right: 8 }}
      >
        <IconButton
          size="small"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Move medicine up"
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Move medicine down"
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onRemove(index)}
          aria-label="Remove medicine"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, display: "block", fontWeight: 600 }}
      >
        Medicine #{index + 1}
      </Typography>

      <Stack spacing={1.25}>
        <LabeledField title="Medicine Name" required>
          <Autocomplete
            freeSolo
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
                placeholder="Search product or type custom name"
              />
            )}
            isOptionEqualToValue={(opt, val) => {
              if (typeof val === "string") return opt?.name === val;
              return opt?.id === val?.id;
            }}
          />
        </LabeledField>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 1.25,
          }}
        >
          <LabeledTextField
            title="Strength"
            size="small"
            placeholder="e.g. 500mg, 0.025%"
            value={item.strength || ""}
            onChange={handleField("strength")}
            fullWidth
          />
          <LabeledTextField
            title="Dosage Form"
            select
            size="small"
            value={item.dosage_form || ""}
            onChange={handleField("dosage_form")}
            fullWidth
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {DOSAGE_FORMS.map((f) => (
              <MenuItem key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </MenuItem>
            ))}
          </LabeledTextField>
          <LabeledTextField
            title="Route"
            select
            size="small"
            value={item.route || ""}
            onChange={handleField("route")}
            fullWidth
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {ROUTES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </LabeledTextField>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" },
            gap: 1.25,
          }}
        >
          <LabeledField title="Frequency">
            <Autocomplete
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
                <TextField {...params} placeholder="e.g. Twice daily" />
              )}
            />
          </LabeledField>
          <LabeledTextField
            title="Duration"
            size="small"
            placeholder="e.g. 7 days"
            value={item.duration || ""}
            onChange={handleField("duration")}
            fullWidth
          />
          <LabeledTextField
            title="Quantity"
            size="small"
            type="number"
            inputProps={{ min: 0, step: 0.5 }}
            value={item.quantity ?? ""}
            onChange={handleField("quantity")}
            fullWidth
          />
          <LabeledTextField
            title="Unit"
            size="small"
            placeholder="pcs / ml / tube"
            value={item.unit || ""}
            onChange={handleField("unit")}
            fullWidth
          />
        </Box>

        <LabeledTextField
          title="Special Instructions"
          size="small"
          multiline
          minRows={1}
          placeholder="e.g. take with food, avoid sunlight"
          value={item.special_instructions || ""}
          onChange={handleField("special_instructions")}
          fullWidth
        />

        <Stack spacing={1.25}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 1.25, sm: 2 },
              alignItems: { xs: "stretch", sm: "flex-start" },
            }}
          >
            <LabeledTextField
              title="Price"
              size="small"
              type="number"
              inputProps={{ min: 0, step: 100 }}
              value={item.unit_price ?? ""}
              onChange={handleField("unit_price")}
              sx={{ width: { xs: "100%", sm: 140 }, flexShrink: 0 }}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 0, sm: 2 }}
              sx={{ flex: { sm: 1 }, minWidth: 0, pt: { sm: 2.25 } }}
            >
              <FormControlLabel
                sx={{ mx: 0, alignItems: "center" }}
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(item.is_dispensed)}
                    onChange={handleDispensedChange}
                  />
                }
                label="Dispensed by clinic"
              />
              {!item.is_dispensed && (
                <FormControlLabel
                  sx={{ mx: 0, alignItems: "center" }}
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(item.is_billable)}
                      onChange={handleField("is_billable")}
                    />
                  }
                  label="Add to invoice"
                />
              )}
            </Stack>
          </Box>
          {item.is_dispensed && (
            <Alert severity="info" sx={{ py: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                Clinic handed/supplied the medicine to the patient without any
                charge.
              </Typography>
            </Alert>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
