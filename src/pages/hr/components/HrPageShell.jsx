import { Alert, AlertTitle, Box, Chip, Stack, Typography } from "@mui/material";

export default function HrPageShell({
  title,
  subtitle,
  badge,
  actions,
  guide,
  children,
}) {
  const guideItems = Array.isArray(guide) ? guide.filter(Boolean) : [];
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
      {guideItems.length > 0 ? (
        <Alert severity="info" icon={false} sx={{ mb: 2.5, borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>How to use this page</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {guideItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </Box>
        </Alert>
      ) : null}
      {children}
    </Box>
  );
}
