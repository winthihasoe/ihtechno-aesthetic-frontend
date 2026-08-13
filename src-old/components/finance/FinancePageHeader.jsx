import { Box, Stack, Typography } from "@mui/material";

export default function FinancePageHeader({ title, subtitle, actions = null }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1}
      mb={2}
    >
      <Box>
        <Typography variant="h5" color="text.primary" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, lineHeight: 1.65 }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
}
