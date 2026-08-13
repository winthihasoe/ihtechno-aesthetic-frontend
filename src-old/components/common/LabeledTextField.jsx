import { Box, TextField, Typography } from "@mui/material";

export function LabeledField({ title, children, required = false }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 0.5, display: "block", fontWeight: 600 }}
      >
        {title}
        {required ? " *" : ""}
      </Typography>
      {children}
    </Box>
  );
}

export default function LabeledTextField({ title, required = false, ...props }) {
  return (
    <LabeledField title={title} required={required}>
      <TextField {...props} />
    </LabeledField>
  );
}
