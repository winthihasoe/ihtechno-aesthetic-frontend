import {
  Box,
  Typography,
  Stack,
  TextField,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Collapse,
  FormHelperText,
} from "@mui/material";
import { COPY } from "../../utils/inventoryUnitsCopy";

/**
 * Pack & units fields for product create/edit.
 * Expects form state with: unit_id, stock_unit_id, base_unit_id, base_per_stock_unit,
 * same_unit_for_buying_and_using, track_open_units, open_use_by_hours, min_stock_level
 */
export default function ProductPackSizeFields({
  form,
  setForm,
  units,
  addNewUnitValue,
  onUnitSelect,
  disabled,
}) {
  const sameUnit = form.same_unit_for_buying_and_using !== false;
  const stockUnitId = sameUnit ? form.unit_id : form.stock_unit_id;
  const baseUnitId = sameUnit ? form.unit_id : form.base_unit_id;

  const stockName =
    units.find((u) => String(u.id) === String(stockUnitId))?.name ?? "pack";
  const useName =
    units.find((u) => String(u.id) === String(baseUnitId))?.name ?? "unit";
  const factor = Number(form.base_per_stock_unit) || 1;

  const unitSelect = (label, field, value) => (
    <FormControl size="small" fullWidth disabled={disabled}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Select
        value={value}
        displayEmpty
        onChange={(e) => {
          const v = e.target.value;
          if (v === addNewUnitValue) {
            onUnitSelect?.(field);
            return;
          }
          setForm((f) => ({ ...f, [field]: v }));
        }}
      >
        <MenuItem value="">Select…</MenuItem>
        {units.map((u) => (
          <MenuItem key={u.id} value={String(u.id)}>
            {u.name}
          </MenuItem>
        ))}
        {addNewUnitValue ? (
          <MenuItem value={addNewUnitValue}>+ Add new unit…</MenuItem>
        ) : null}
      </Select>
    </FormControl>
  );

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
        mb: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Pack & units
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={sameUnit}
            disabled={disabled}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((f) => ({
                ...f,
                same_unit_for_buying_and_using: checked,
                stock_unit_id: checked ? f.unit_id : f.stock_unit_id || f.unit_id,
                base_unit_id: checked ? f.unit_id : f.base_unit_id || f.unit_id,
                base_per_stock_unit: checked ? 1 : f.base_per_stock_unit,
              }));
            }}
          />
        }
        label={COPY.sameUnitCheckbox}
        sx={{ mb: 1, display: "block" }}
      />

      {unitSelect("Unit", "unit_id", form.unit_id)}

      <Collapse in={!sameUnit}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
          {unitSelect(COPY.stockUnitLabel, "stock_unit_id", form.stock_unit_id)}
          {unitSelect(COPY.baseUnitLabel, "base_unit_id", form.base_unit_id)}
        </Stack>
        <TextField
          label={COPY.amountPerPack}
          type="number"
          size="small"
          fullWidth
          disabled={disabled}
          sx={{ mt: 2 }}
          value={form.base_per_stock_unit ?? 1}
          inputProps={{ min: 0.001, step: "any" }}
          onChange={(e) =>
            setForm((f) => ({ ...f, base_per_stock_unit: e.target.value }))
          }
          helperText={COPY.packPreview(stockName, factor, useName)}
        />
      </Collapse>

      <TextField
        label={COPY.minStockLabel}
        type="number"
        size="small"
        fullWidth
        disabled={disabled}
        sx={{ mt: 2 }}
        value={form.min_stock_level}
        onChange={(e) =>
          setForm((f) => ({ ...f, min_stock_level: e.target.value }))
        }
        helperText={COPY.minStockHelper(useName)}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
        {COPY.openVialSection}
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(form.track_open_units)}
            disabled={disabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                track_open_units: e.target.checked,
                open_use_by_hours: e.target.checked ? f.open_use_by_hours : "",
              }))
            }
          />
        }
        label={COPY.trackOpenSwitch}
      />
      <Collapse in={Boolean(form.track_open_units)}>
        <TextField
          label={COPY.openUseByHours}
          type="number"
          size="small"
          fullWidth
          disabled={disabled}
          sx={{ mt: 1 }}
          value={form.open_use_by_hours ?? ""}
          inputProps={{ min: 1 }}
          onChange={(e) =>
            setForm((f) => ({ ...f, open_use_by_hours: e.target.value }))
          }
          helperText={COPY.openUseByHelper}
        />
      </Collapse>
    </Box>
  );
}
