import { Chip } from "@mui/material";
import { STATUS_CONFIG } from "../../utils/roleUtils";

export default function StatusChip({ status, size = "small" }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    chipColor: "#F3F4F6",
    textColor: "#374151",
  };
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
