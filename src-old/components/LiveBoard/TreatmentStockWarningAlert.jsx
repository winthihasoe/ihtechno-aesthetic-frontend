import { Alert, Stack, Typography } from "@mui/material";
import {
  formatStockWarningDetail,
  getTreatmentStockWarnings,
} from "../../utils/treatmentStockWarnings";

export default function TreatmentStockWarningAlert({
  treatment,
  sx,
  dense = false,
}) {
  const warnings = getTreatmentStockWarnings(treatment);
  if (warnings.length === 0) return null;

  return (
    <Alert
      severity="warning"
      sx={{
        fontSize: dense ? 12 : 13,
        ...sx,
        bgcolor: "transparent",
        width: "95%",
        mb: 2,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
        Stock short — swap or restock before treatment
      </Typography>
      <Stack component="span" spacing={0.25} sx={{ mt: 0.25 }}>
        {warnings.map((warning) => (
          <Typography
            key={warning.session_product_id ?? warning.product_id}
            variant="caption"
            component="span"
            display="block"
          >
            {formatStockWarningDetail(warning)}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}
