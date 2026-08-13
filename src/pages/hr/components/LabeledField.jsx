import { Stack, Typography } from "@mui/material";

export default function LabeledField({ id, label, children, required = false }) {
  return (
    <Stack spacing={0.75}>
      <Typography
        component="label"
        htmlFor={id}
        variant="body2"
        sx={{ fontWeight: 600, color: "text.primary" }}
      >
        {label}
        {required ? " *" : ""}
      </Typography>
      {children}
    </Stack>
  );
}
