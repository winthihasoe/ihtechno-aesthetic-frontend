import { Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HrFormSection from "./HrFormSection";
import LabeledField from "./LabeledField";

export default function StaffCustomFieldsSection({
  customDefinitions = [],
  customValues = {},
  onChangeCustomValues,
  newCustomFieldLabel = "",
  onChangeNewCustomFieldLabel,
  onCreateCustomField,
  onRemoveCustomField,
}) {
  return (
    <HrFormSection
      title="Custom fields"
      description="Fields added here apply only to this profile."
    >
      {customDefinitions.length > 0 ? (
        <Stack spacing={1.25}>
          {customDefinitions.map((field) => (
            <Stack
              key={field.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
            >
              <LabeledField
                id={`custom-${field.id}`}
                label={field.label}
                required={field.required}
              >
                <TextField
                  id={`custom-${field.id}`}
                  size="small"
                  fullWidth
                  required={field.required}
                  value={customValues[field.id] || ""}
                  onChange={(e) =>
                    onChangeCustomValues((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                />
              </LabeledField>
              <IconButton
                size="small"
                color="error"
                aria-label={`Remove ${field.label}`}
                onClick={() => onRemoveCustomField(field.id)}
                sx={{ mt: 3.5 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No custom fields for this profile yet.
        </Typography>
      )}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ md: "flex-end" }}
      >
        <LabeledField id="new-custom-field" label="Add custom field">
          <TextField
            id="new-custom-field"
            size="small"
            fullWidth
            value={newCustomFieldLabel}
            onChange={(e) => onChangeNewCustomFieldLabel(e.target.value)}
          />
        </LabeledField>
        <Button
          variant="outlined"
          onClick={onCreateCustomField}
          sx={{ mb: { md: 0.25 } }}
        >
          Add field
        </Button>
      </Stack>
    </HrFormSection>
  );
}
