import { Box, Button, Paper, Stack } from "@mui/material";
import { useFinanceTokens } from "./financeTokens";

export default function FinanceFilterBar({
  children,
  onApply,
  onClear,
  onRefresh,
  applyLabel = "Apply",
  clearLabel = "Clear",
  showRefresh = false,
  refreshLabel = "Refresh",
  embedded = false,
  sx,
}) {
  const { financeSurfaceSx, financeFilterStripSx } = useFinanceTokens();

  const inner = (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
        {children}
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
        {onApply ? (
          <Button variant="contained" size="small" onClick={onApply}>
            {applyLabel}
          </Button>
        ) : null}
        {onClear ? (
          <Button variant="outlined" size="small" onClick={onClear}>
            {clearLabel}
          </Button>
        ) : null}
        {showRefresh && onRefresh ? (
          <Button variant="outlined" size="small" onClick={onRefresh}>
            {refreshLabel}
          </Button>
        ) : null}
      </Stack>
    </>
  );

  if (embedded) {
    return (
      <Stack spacing={0} sx={{ ...financeFilterStripSx, ...sx }}>
        {inner}
      </Stack>
    );
  }

  return (
    <Paper sx={{ mb: 2, overflow: "hidden", ...financeSurfaceSx, ...sx }}>
      <Stack spacing={0} sx={financeFilterStripSx}>
        {inner}
      </Stack>
    </Paper>
  );
}

export function FinanceFilterField({ children, sx }) {
  return <Box sx={{ flex: 1, minWidth: 160, ...sx }}>{children}</Box>;
}
