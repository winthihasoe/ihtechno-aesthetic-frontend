import { Alert, AlertTitle, Box, Stack, Typography } from "@mui/material";

export default function FinancePageHeader({
  title,
  subtitle,
  actions = null,
  guide = null,
}) {
  const guideItems = Array.isArray(guide) ? guide.filter(Boolean) : [];
  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        mb={guideItems.length ? 1.5 : 2}
      >
        <Box>
          <Typography variant="h5" color="text.primary" fontWeight={700}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ? <Box>{actions}</Box> : null}
      </Stack>
      {guideItems.length ? (
        <Alert severity="info" icon={false} sx={{ mb: 2, borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>How to use this page</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {guideItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </Box>
        </Alert>
      ) : null}
    </Box>
  );
}
