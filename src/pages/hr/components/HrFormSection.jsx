import { Divider, Stack, Typography } from "@mui/material";

export default function HrFormSection({ title, description, children, showDivider = true }) {
  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
      {children}
      {showDivider ? <Divider flexItem /> : null}
    </Stack>
  );
}
