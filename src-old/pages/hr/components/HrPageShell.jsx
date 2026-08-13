import { Box, Chip, Stack, Typography } from "@mui/material";

export default function HrPageShell({
  title,
  subtitle,
  badge,
  actions,
  children,
}) {
  return (
    <Box sx={{ pb: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        mb={2.5}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {badge ? <Chip size="small" label={badge} /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        {actions ?? null}
      </Stack>
      {children}
    </Box>
  );
}
