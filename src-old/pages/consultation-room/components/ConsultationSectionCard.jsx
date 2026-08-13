import { Box, Paper, Stack, Typography } from "@mui/material";
import { sectionCardSx } from "./consultationSectionStyles";

export function SectionTitle({ title, subtitle, action }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1}
      sx={{ mb: 1.5 }}
    >
      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 900, lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}

export default function ConsultationSectionCard({
  title,
  subtitle,
  action,
  children,
  sx,
}) {
  return (
    <Paper variant="outlined" sx={{ ...sectionCardSx, ...sx }}>
      <SectionTitle title={title} subtitle={subtitle} action={action} />
      {children}
    </Paper>
  );
}
