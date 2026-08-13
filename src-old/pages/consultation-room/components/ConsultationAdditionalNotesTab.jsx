import { TextField, Typography } from "@mui/material";

export default function ConsultationAdditionalNotesTab({ value, onChange }) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Additional Notes
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        value={value}
        onChange={onChange}
      />
    </>
  );
}
