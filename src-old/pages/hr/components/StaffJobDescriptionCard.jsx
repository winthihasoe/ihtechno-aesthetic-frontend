import { Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import RichTextEditor from "../../../components/common/RichTextEditor";
import LabeledField from "./LabeledField";

export default function StaffJobDescriptionCard({
  form,
  onPatchForm,
  jobPositions = [],
  selectedJobPosition = null,
  hasJobDescriptionSet = false,
  effectiveJobDescriptionPreview = "",
  jobDescriptionSourceLabel = "Source: not set",
  onEditJobDescription,
}) {
  const sourceChipLabel = jobDescriptionSourceLabel.replace(/^Source:\s*/i, "");

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Job description
        </Typography>
        <Chip
          size="small"
          color={hasJobDescriptionSet ? "primary" : "default"}
          variant="outlined"
          label={sourceChipLabel}
        />
      </Stack>

      <LabeledField id="staff-job-position-card" label="Job position template">
        <TextField
          id="staff-job-position-card"
          select
          size="small"
          fullWidth
          value={form.jobPositionId}
          onChange={(e) => {
            const nextId = e.target.value;
            const template = jobPositions.find(
              (item) => String(item.id) === String(nextId),
            );
            const patch = { jobPositionId: nextId };
            if (!form.position?.trim() && template?.title) {
              patch.position = template.title;
            }
            onPatchForm(patch);
          }}
          helperText="Template used when no custom override is set."
        >
          <MenuItem value="">None</MenuItem>
          {jobPositions.map((position) => (
            <MenuItem key={position.id} value={String(position.id)}>
              {position.title}
            </MenuItem>
          ))}
        </TextField>
      </LabeledField>

      {hasJobDescriptionSet ? (
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" variant="outlined" onClick={onEditJobDescription}>
              Edit JD
            </Button>
          </Stack>
          <RichTextEditor
            value={effectiveJobDescriptionPreview}
            readOnly
            minHeight={140}
            helperText={jobDescriptionSourceLabel}
          />
        </Stack>
      ) : (
        <LabeledField id="staff-jd-override-card" label="Custom job description">
          <RichTextEditor
            value={form.jobDescriptionOverride}
            onChange={(html) => onPatchForm({ jobDescriptionOverride: html })}
            minHeight={140}
            helperText={
              selectedJobPosition
                ? `Leave blank to use the template from ${selectedJobPosition.title}.`
                : "Optional override for this staff member."
            }
          />
        </LabeledField>
      )}
    </Stack>
  );
}
