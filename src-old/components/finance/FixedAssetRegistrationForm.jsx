import { useEffect, useMemo } from "react";
import {
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";

export function emptyFixedAssetForm() {
  return {
    asset_code: "",
    asset_name: "",
    category_id: "",
    serial_number: "",
    manufacturer: "",
    model: "",
    barcode: "",
    purchase_cost: "",
    net_book_value: "",
    additional_capitalized_costs: [],
    residual_value: "0",
    useful_life_months: "",
    remaining_useful_months: "",
    depreciation_method: "straight_line",
    in_service_date: "",
    purchase_date: "",
    warranty_expiry_date: "",
    supplier_id: "",
    room_location: "",
    custodian_user_id: "",
    is_shot_rated: false,
    rated_shots: "",
    regulatory_license_no: "",
    next_service_date: "",
    insurance_policy_no: "",
    insurance_expiry_date: "",
    opening_balance_date: "",
  };
}

export function totalCapitalizedCost(form) {
  const base = parseCommaAmount(form.purchase_cost);
  const extra = (form.additional_capitalized_costs || []).reduce(
    (sum, line) => sum + (parseCommaAmount(line.amount) || 0),
    0,
  );
  if (!Number.isFinite(base)) return extra > 0 ? extra : null;
  return Math.round((base + extra) * 100) / 100;
}

export function serializeFixedAssetPayload(form, { openingBalance = false } = {}) {
  if (openingBalance) {
    const nbv = parseCommaAmount(form.net_book_value);
    const remaining = Number(form.remaining_useful_months);
    const cutover = form.opening_balance_date;

    return {
      asset_code: String(form.asset_code || "").trim(),
      asset_name: String(form.asset_name || "").trim(),
      category_id: Number(form.category_id),
      serial_number: form.serial_number?.trim() || null,
      manufacturer: form.manufacturer?.trim() || null,
      model: form.model?.trim() || null,
      barcode: form.barcode?.trim() || null,
      net_book_value: Number.isFinite(nbv) ? nbv : 0,
      remaining_useful_months: Number.isFinite(remaining) ? remaining : 0,
      residual_value: 0,
      depreciation_method: form.depreciation_method || "straight_line",
      is_opening_balance: true,
      opening_balance_date: cutover,
      warranty_expiry_date: form.warranty_expiry_date || null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      room_location: form.room_location?.trim() || null,
      custodian_user_id: form.custodian_user_id
        ? Number(form.custodian_user_id)
        : null,
      is_shot_rated: Boolean(form.is_shot_rated),
      rated_shots:
        form.is_shot_rated || form.depreciation_method === "units_of_production"
          ? Number(form.rated_shots) || null
          : null,
      regulatory_license_no: form.regulatory_license_no?.trim() || null,
      next_service_date: form.next_service_date || null,
      insurance_policy_no: form.insurance_policy_no?.trim() || null,
      insurance_expiry_date: form.insurance_expiry_date || null,
    };
  }

  const base = parseCommaAmount(form.purchase_cost);
  const extraLines = (form.additional_capitalized_costs || [])
    .filter((line) => line.label?.trim() && parseCommaAmount(line.amount) > 0)
    .map((line) => ({
      label: line.label.trim(),
      amount: parseCommaAmount(line.amount),
    }));

  return {
    asset_code: String(form.asset_code || "").trim(),
    asset_name: String(form.asset_name || "").trim(),
    category_id: Number(form.category_id),
    serial_number: form.serial_number?.trim() || null,
    manufacturer: form.manufacturer?.trim() || null,
    model: form.model?.trim() || null,
    barcode: form.barcode?.trim() || null,
    purchase_cost: Number.isFinite(base) ? base : 0,
    additional_capitalized_costs: extraLines,
    residual_value: parseCommaAmount(form.residual_value) || 0,
    useful_life_months: Number(form.useful_life_months),
    depreciation_method: form.depreciation_method || "straight_line",
    in_service_date: form.in_service_date,
    purchase_date: form.purchase_date || form.in_service_date || null,
    warranty_expiry_date: form.warranty_expiry_date || null,
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
    room_location: form.room_location?.trim() || null,
    custodian_user_id: form.custodian_user_id
      ? Number(form.custodian_user_id)
      : null,
    is_shot_rated: Boolean(form.is_shot_rated),
    rated_shots:
      form.is_shot_rated || form.depreciation_method === "units_of_production"
        ? Number(form.rated_shots) || null
        : null,
    regulatory_license_no: form.regulatory_license_no?.trim() || null,
    next_service_date: form.next_service_date || null,
    insurance_policy_no: form.insurance_policy_no?.trim() || null,
    insurance_expiry_date: form.insurance_expiry_date || null,
  };
}

/**
 * Shared fixed-asset registration fields for expense-linked and opening-balance flows.
 * Opening-balance mode uses deemed cost (NBV) + remaining useful months only.
 */
export default function FixedAssetRegistrationForm({
  form,
  onChange,
  categories = [],
  mode = "expense",
  suggestedCode = "",
  expenseAmount = "",
  onTotalChange,
  suppliers = [],
  users = [],
}) {
  const isOpeningBalance = mode === "opening_balance";

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id],
  );

  useEffect(() => {
    if (!form.asset_code && suggestedCode) {
      onChange((prev) => ({ ...prev, asset_code: suggestedCode }));
    }
  }, [suggestedCode, form.asset_code, onChange]);

  useEffect(() => {
    if (mode === "expense" && expenseAmount && !form.purchase_cost) {
      onChange((prev) => ({ ...prev, purchase_cost: expenseAmount }));
    }
  }, [mode, expenseAmount, form.purchase_cost, onChange]);

  // Autofill life/method only when category changes — not when the user clears the field.
  useEffect(() => {
    if (!selectedCategory) return;
    if (isOpeningBalance) {
      onChange((prev) => ({
        ...prev,
        remaining_useful_months: String(
          selectedCategory.default_useful_life_months ?? "",
        ),
        depreciation_method:
          selectedCategory.default_depreciation_method || "straight_line",
      }));
      return;
    }
    onChange((prev) => ({
      ...prev,
      useful_life_months: String(
        selectedCategory.default_useful_life_months ?? "",
      ),
      depreciation_method:
        selectedCategory.default_depreciation_method || "straight_line",
      residual_value: String(
        Math.round(
          ((selectedCategory.default_residual_pct || 0) / 100) *
            (parseCommaAmount(prev.purchase_cost) || 0),
        ),
      ),
    }));
  }, [selectedCategory, isOpeningBalance, onChange]);

  useEffect(() => {
    if (isOpeningBalance) return;
    const total = totalCapitalizedCost(form);
    if (total != null && onTotalChange) {
      onTotalChange(total);
    }
  }, [form, onTotalChange, isOpeningBalance]);

  const needsRegulatory = Boolean(selectedCategory?.is_medical_device);
  const needsRatedShots =
    form.is_shot_rated || form.depreciation_method === "units_of_production";

  const setField = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const addCostLine = () => {
    onChange((prev) => ({
      ...prev,
      additional_capitalized_costs: [
        ...(prev.additional_capitalized_costs || []),
        { label: "", amount: "" },
      ],
    }));
  };

  const updateCostLine = (index, key, value) => {
    onChange((prev) => {
      const lines = [...(prev.additional_capitalized_costs || [])];
      lines[index] = { ...lines[index], [key]: value };
      return { ...prev, additional_capitalized_costs: lines };
    });
  };

  const removeCostLine = (index) => {
    onChange((prev) => ({
      ...prev,
      additional_capitalized_costs: (
        prev.additional_capitalized_costs || []
      ).filter((_, i) => i !== index),
    }));
  };

  const monthlyPreview = (() => {
    if (!isOpeningBalance) return null;
    const nbv = parseCommaAmount(form.net_book_value);
    const months = Number(form.remaining_useful_months);
    if (!Number.isFinite(nbv) || nbv <= 0 || !Number.isFinite(months) || months < 1) {
      return null;
    }
    return Math.round((nbv / months) * 100) / 100;
  })();

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {isOpeningBalance
          ? "Opening-balance asset"
          : "Fixed asset registration"}
      </Typography>

      <TextField
        label="Asset code"
        size="small"
        fullWidth
        required
        value={form.asset_code}
        onChange={(e) => setField("asset_code", e.target.value)}
      />
      <TextField
        label="Asset name"
        size="small"
        fullWidth
        required
        value={form.asset_name}
        onChange={(e) => setField("asset_name", e.target.value)}
      />
      <TextField
        select
        label="Category"
        size="small"
        fullWidth
        required
        value={form.category_id}
        onChange={(e) => setField("category_id", e.target.value)}
      >
        {categories.map((cat) => (
          <MenuItem key={cat.id} value={String(cat.id)}>
            {cat.name}
          </MenuItem>
        ))}
      </TextField>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Serial number"
          size="small"
          fullWidth
          value={form.serial_number}
          onChange={(e) => setField("serial_number", e.target.value)}
        />
        <TextField
          label="Manufacturer"
          size="small"
          fullWidth
          value={form.manufacturer}
          onChange={(e) => setField("manufacturer", e.target.value)}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Model"
          size="small"
          fullWidth
          value={form.model}
          onChange={(e) => setField("model", e.target.value)}
        />
        <TextField
          label="Barcode / asset tag"
          size="small"
          fullWidth
          value={form.barcode}
          onChange={(e) => setField("barcode", e.target.value)}
        />
      </Stack>

      <Divider />

      {isOpeningBalance ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Cutover values
          </Typography>
          <TextField
            label="Opening balance date"
            type="date"
            size="small"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            value={form.opening_balance_date}
            onChange={(e) => setField("opening_balance_date", e.target.value)}
            helperText="Go-live / cutover date. Depreciation starts from this month."
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Net book value"
              size="small"
              fullWidth
              required
              value={form.net_book_value}
              onChange={(e) =>
                setField(
                  "net_book_value",
                  sanitizeCommaAmountInput(e.target.value),
                )
              }
              inputProps={{ inputMode: "decimal" }}
              helperText="Current carrying value — stored as deemed cost."
            />
            <TextField
              label="Remaining useful life (months)"
              size="small"
              fullWidth
              required
              type="number"
              value={form.remaining_useful_months}
              onChange={(e) =>
                setField("remaining_useful_months", e.target.value)
              }
              helperText="Months left to depreciate from cutover."
            />
          </Stack>
          {monthlyPreview != null ? (
            <Typography variant="body2" color="text.secondary">
              Monthly depreciation from cutover:{" "}
              {monthlyPreview.toLocaleString()} MMK
            </Typography>
          ) : null}
          <TextField
            select
            label="Depreciation method"
            size="small"
            fullWidth
            required
            value={form.depreciation_method}
            onChange={(e) => setField("depreciation_method", e.target.value)}
          >
            <MenuItem value="straight_line">Straight line</MenuItem>
            <MenuItem value="declining_balance">Declining balance</MenuItem>
            <MenuItem value="units_of_production">Units of production</MenuItem>
          </TextField>
        </>
      ) : (
        <>
          <TextField
            label="Purchase cost (base)"
            size="small"
            fullWidth
            required
            value={form.purchase_cost}
            onChange={(e) =>
              setField(
                "purchase_cost",
                sanitizeCommaAmountInput(e.target.value),
              )
            }
            inputProps={{ inputMode: "decimal" }}
          />

          {(form.additional_capitalized_costs || []).map((line, index) => (
            <Stack
              key={index}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <TextField
                label="Capitalized cost label"
                size="small"
                fullWidth
                value={line.label}
                onChange={(e) =>
                  updateCostLine(index, "label", e.target.value)
                }
              />
              <TextField
                label="Amount"
                size="small"
                sx={{ minWidth: 140 }}
                value={line.amount}
                onChange={(e) =>
                  updateCostLine(
                    index,
                    "amount",
                    sanitizeCommaAmountInput(e.target.value),
                  )
                }
                inputProps={{ inputMode: "decimal" }}
              />
              <Button
                size="small"
                color="inherit"
                onClick={() => removeCostLine(index)}
                aria-label="Remove cost line"
              >
                <DeleteOutlineIcon fontSize="small" />
              </Button>
            </Stack>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addCostLine}>
            Add capitalized cost
          </Button>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Useful life (months)"
              size="small"
              fullWidth
              required
              type="number"
              value={form.useful_life_months}
              onChange={(e) => setField("useful_life_months", e.target.value)}
            />
            <TextField
              select
              label="Depreciation method"
              size="small"
              fullWidth
              required
              value={form.depreciation_method}
              onChange={(e) => setField("depreciation_method", e.target.value)}
            >
              <MenuItem value="straight_line">Straight line</MenuItem>
              <MenuItem value="declining_balance">Declining balance</MenuItem>
              <MenuItem value="units_of_production">
                Units of production
              </MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="In-service date"
              type="date"
              size="small"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={form.in_service_date}
              onChange={(e) => setField("in_service_date", e.target.value)}
            />
            <TextField
              label="Warranty expiry"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.warranty_expiry_date}
              onChange={(e) =>
                setField("warranty_expiry_date", e.target.value)
              }
            />
          </Stack>
        </>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Room location"
          size="small"
          fullWidth
          placeholder="e.g. Laser Room 2"
          value={form.room_location}
          onChange={(e) => setField("room_location", e.target.value)}
        />
        <TextField
          select
          label="Supplier"
          size="small"
          fullWidth
          value={form.supplier_id}
          onChange={(e) => setField("supplier_id", e.target.value)}
        >
          <MenuItem value="">—</MenuItem>
          {suppliers.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TextField
        select
        label="Custodian"
        size="small"
        fullWidth
        value={form.custodian_user_id}
        onChange={(e) => setField("custodian_user_id", e.target.value)}
      >
        <MenuItem value="">—</MenuItem>
        {users.map((u) => (
          <MenuItem key={u.id} value={String(u.id)}>
            {u.name}
          </MenuItem>
        ))}
      </TextField>

      {isOpeningBalance ? (
        <TextField
          label="Warranty expiry"
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.warranty_expiry_date}
          onChange={(e) => setField("warranty_expiry_date", e.target.value)}
        />
      ) : null}

      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(form.is_shot_rated)}
            onChange={(e) => setField("is_shot_rated", e.target.checked)}
          />
        }
        label="Shot-rated machine"
      />

      {needsRatedShots ? (
        <TextField
          label="Rated shots"
          size="small"
          fullWidth
          required
          type="number"
          value={form.rated_shots}
          onChange={(e) => setField("rated_shots", e.target.value)}
        />
      ) : null}

      <TextField
        label="Regulatory license no."
        size="small"
        fullWidth
        required={needsRegulatory}
        value={form.regulatory_license_no}
        onChange={(e) => setField("regulatory_license_no", e.target.value)}
      />
    </Stack>
  );
}
