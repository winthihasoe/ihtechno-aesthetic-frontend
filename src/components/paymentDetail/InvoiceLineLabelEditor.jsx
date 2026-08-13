import { Autocomplete, TextField, Typography } from "@mui/material";
import {
  INVENTORY_CATALOG_LINE_TYPES,
  LAB_CATALOG_LINE_TYPES,
} from "../../utils/paymentDetailConstants";
import { stripMetaKeys } from "../../utils/paymentDetailUtils";

export function InvoiceLineLabelEditor({
  line,
  index,
  canEditDraft,
  productOptions,
  packagePickerOptions,
  treatmentPickerOptions,
  labTestOptions = [],
  autocompleteSlotProps,
  setLineValue,
  handleLabelBlur,
  size = "small",
  fullWidth = true,
}) {
  const lineType = line.type || "other";
  if (!canEditDraft) {
    return <Typography variant="body2">{line.label}</Typography>;
  }

  if (INVENTORY_CATALOG_LINE_TYPES.has(lineType)) {
    const labelField =
      lineType === "prescription" ? "Medicine (from products)" : "Label";
    return (
      <Autocomplete
        slotProps={autocompleteSlotProps}
        freeSolo
        options={productOptions}
        size={size}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option?.name || ""
        }
        value={null}
        inputValue={line.label || ""}
        onInputChange={(_, value) => setLineValue(index, { label: value })}
        onChange={(_, option) => {
          if (!option || typeof option === "string") return;
          setLineValue(index, {
            label: option.name,
            unit: option.unit || line.unit || "pcs",
            unit_price: Number(option.selling_price || 0),
            meta: {
              ...(line.meta || {}),
              product_id: option.id,
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={labelField}
            placeholder="Search product / medicine"
            fullWidth={fullWidth}
            onBlur={() => handleLabelBlur(index)}
          />
        )}
      />
    );
  }

  if (LAB_CATALOG_LINE_TYPES.has(lineType)) {
    return (
      <Autocomplete
        slotProps={autocompleteSlotProps}
        freeSolo
        options={labTestOptions}
        size={size}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          if (!option?.name) return "";
          return option.code ? `${option.name} (${option.code})` : option.name;
        }}
        value={null}
        inputValue={line.label || ""}
        onInputChange={(_, value) => setLineValue(index, { label: value })}
        onChange={(_, option) => {
          if (!option || typeof option === "string") return;
          setLineValue(index, {
            label: option.name || "",
            unit: option.unit || line.unit || "test",
            unit_price: Number(option.price ?? 0),
            meta: {
              ...(line.meta || {}),
              lab_test_id: option.id,
              lab_test_code: option.code || null,
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Lab test"
            placeholder="Search available lab tests"
            fullWidth={fullWidth}
            onBlur={() => handleLabelBlur(index)}
          />
        )}
      />
    );
  }

  if (lineType === "package") {
    return (
      <Autocomplete
        slotProps={autocompleteSlotProps}
        freeSolo
        options={packagePickerOptions}
        size={size}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option?.name || ""
        }
        value={null}
        inputValue={line.label || ""}
        onInputChange={(_, value) => setLineValue(index, { label: value })}
        onChange={(_, option) => {
          if (
            option &&
            typeof option === "object" &&
            option.__invoiceLineCustom
          ) {
            setLineValue(index, {
              label: "",
              meta: stripMetaKeys(line.meta, ["package_id"]),
            });
            return;
          }
          if (!option || typeof option === "string") return;
          setLineValue(index, {
            label: option.name || "",
            unit_price: Number(option.price ?? 0),
            meta: {
              ...(line.meta || {}),
              package_id: option.id,
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Label"
            fullWidth={fullWidth}
            onBlur={() => handleLabelBlur(index)}
          />
        )}
      />
    );
  }

  if (lineType === "treatment") {
    return (
      <Autocomplete
        slotProps={autocompleteSlotProps}
        freeSolo
        options={treatmentPickerOptions}
        size={size}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option?.name || ""
        }
        value={null}
        inputValue={line.label || ""}
        onInputChange={(_, value) => setLineValue(index, { label: value })}
        onChange={(_, option) => {
          if (
            option &&
            typeof option === "object" &&
            option.__invoiceLineCustom
          ) {
            setLineValue(index, {
              label: "",
              meta: stripMetaKeys(line.meta, ["treatment_template_id"]),
            });
            return;
          }
          if (!option || typeof option === "string") return;
          setLineValue(index, {
            label: option.name || "",
            unit_price: Number(option.price ?? 0),
            meta: {
              ...(line.meta || {}),
              treatment_template_id: option.id,
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Label"
            fullWidth={fullWidth}
            onBlur={() => handleLabelBlur(index)}
          />
        )}
      />
    );
  }

  return (
    <TextField
      size={size}
      fullWidth={fullWidth}
      label="Label"
      value={line.label ?? ""}
      onChange={(e) => setLineValue(index, { label: e.target.value })}
      onBlur={() => handleLabelBlur(index)}
    />
  );
}
