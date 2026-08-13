import { Chip } from "@mui/material";
import { getVisitStatusConfig } from "../../utils/visitStatuses";

export default function StatusChip({ status, size = "small" }) {
  const cfg = getVisitStatusConfig(status);
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        bgcolor: cfg.chipColor,
        color: cfg.textColor,
        fontWeight: 600,
        fontSize: 11,
        height: 22,
        borderRadius: 1,
      }}
    />
  );
}
