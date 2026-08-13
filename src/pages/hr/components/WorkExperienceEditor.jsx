import { Button, Chip, IconButton, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LabeledField from "./LabeledField";
import { EMPTY_WORK_EXPERIENCE_ROW } from "./staffProfileFormConstants";

export default function WorkExperienceEditor({ rows, onChange }) {
  const updateRow = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...rows, EMPTY_WORK_EXPERIENCE_ROW()]);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={1.5}>
      {rows.length === 0 ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addRow}
          sx={{ alignSelf: "flex-start" }}
        >
          Add work experience
        </Button>
      ) : null}
      {rows.map((row, index) => (
        <Stack
          key={`work-exp-${index}`}
          spacing={1.25}
          sx={{
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Chip size="small" label={`Experience ${index + 1}`} />
            <IconButton
              size="small"
              color="error"
              aria-label="Remove work experience"
              onClick={() => removeRow(index)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
          <LabeledField id={`work-company-${index}`} label="Company">
            <TextField
              id={`work-company-${index}`}
              size="small"
              fullWidth
              value={row.company}
              onChange={(e) => updateRow(index, { company: e.target.value })}
            />
          </LabeledField>
          <LabeledField id={`work-position-${index}`} label="Position / role">
            <TextField
              id={`work-position-${index}`}
              size="small"
              fullWidth
              value={row.position}
              onChange={(e) => updateRow(index, { position: e.target.value })}
            />
          </LabeledField>
          <LabeledField id={`work-period-${index}`} label="Period">
            <TextField
              id={`work-period-${index}`}
              size="small"
              fullWidth
              placeholder="e.g. 2019–2022"
              value={row.period}
              onChange={(e) => updateRow(index, { period: e.target.value })}
            />
          </LabeledField>
        </Stack>
      ))}
      {rows.length > 0 ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addRow}
          sx={{ alignSelf: "flex-start" }}
        >
          Add another
        </Button>
      ) : null}
    </Stack>
  );
}
