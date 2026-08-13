import { Box, TableContainer } from "@mui/material";
import { useFinanceTokens } from "./financeTokens";

/**
 * Single outer ledger panel. Toolbar, filters, and table are direct children
 * (section dividers only — no nested Paper/cards).
 */
export default function FinancePanel({ children, sx }) {
  const { financeSurfaceSx } = useFinanceTokens();

  return (
    <Box sx={{ ...financeSurfaceSx, overflow: "hidden", ...sx }}>{children}</Box>
  );
}

export function FinancePanelHeader({ children, sx }) {
  const { financePageHeaderSx } = useFinanceTokens();

  return <Box sx={{ ...financePageHeaderSx, ...sx }}>{children}</Box>;
}

export function FinancePanelTable({ children, sx }) {
  const { financeTableContainerSx } = useFinanceTokens();

  return (
    <TableContainer sx={{ ...financeTableContainerSx, ...sx }}>
      {children}
    </TableContainer>
  );
}
