import PhoneIcon from "@mui/icons-material/Phone";
import { Chip, Stack, Typography } from "@mui/material";
import { listDialablePhones, toTelHref } from "../../utils/phoneUtils";

/**
 * One chip per dialable number. Comma-separated `phone` values are split automatically.
 */
export default function ClickablePhoneChips({
  phone,
  emptyLabel = "—",
  size = "small",
  direction = "row",
  wrap = true,
  onClick,
}) {
  const numbers = listDialablePhones(phone);

  if (!numbers.length) {
    return (
      <Typography variant="caption" color="text.secondary" component="span">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack
      direction={direction}
      spacing={0.5}
      useFlexGap
      flexWrap={wrap ? "wrap" : "nowrap"}
      alignItems="center"
    >
      {numbers.map((num) => (
        <Chip
          key={num}
          size={size}
          icon={<PhoneIcon sx={{ fontSize: 16 }} />}
          label={num}
          component="a"
          href={toTelHref(num)}
          clickable
          variant="outlined"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(e, num);
          }}
          sx={{
            textDecoration: "none",
            "& .MuiChip-label": { fontSize: "0.75rem" },
          }}
        />
      ))}
    </Stack>
  );
}
