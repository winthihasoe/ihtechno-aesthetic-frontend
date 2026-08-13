import Typography from "@mui/material/Typography";
import { useFinanceTokens } from "./financeTokens";

/** Text-only active/inactive status (no Chip). */
export default function FinanceStatusLabel({ active, sx }) {
  const { statusActiveSx, statusInactiveSx } = useFinanceTokens();

  return (
    <Typography
      component="span"
      sx={{ ...(active ? statusActiveSx : statusInactiveSx), ...sx }}
    >
      {active ? "Active" : "Inactive"}
    </Typography>
  );
}
