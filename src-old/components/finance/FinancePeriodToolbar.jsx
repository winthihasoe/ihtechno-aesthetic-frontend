import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { shiftMonth } from "./financePeriodUtils";
import { useFinanceTokens } from "./financeTokens";

function FinancePeriodStat({ label, value, subvalue, accent }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{
          fontVariantNumeric: "tabular-nums",
          fontSize: "0.85rem",
          color: accent || "text.primary",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
      {subvalue ? (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
          {subvalue}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Month navigator + summary stats for financial list pages.
 * Use embedded={true} inside a continuous finance Paper panel.
 */
export default function FinancePeriodToolbar({
  month,
  onMonthChange,
  periodLabel,
  periodSubLabel,
  stats = [],
  embedded = true,
  showJumpTo = true,
  sx,
}) {
  const { financeFilterStripSx, compactFieldSx } = useFinanceTokens();

  const body = (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      alignItems={{ xs: "stretch", lg: "center" }}
      justifyContent="space-between"
      spacing={2}
      useFlexGap
      sx={embedded ? { ...financeFilterStripSx, ...sx } : { px: 2, py: 1.5, ...sx }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
        <CalendarMonthOutlinedIcon
          fontSize="small"
          color="primary"
          sx={{ mr: 0.25, display: { xs: "none", sm: "block" } }}
        />
        <IconButton
          size="small"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.12)",
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Box sx={{ textAlign: "center", minWidth: 140, px: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            Reporting period
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
            {periodLabel}
          </Typography>
          {periodSubLabel ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {periodSubLabel}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          size="small"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.12)",
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
        {showJumpTo ? (
          <TextField
            type="month"
            size="small"
            value={month}
            onChange={(e) => {
              if (e.target.value) onMonthChange(e.target.value);
            }}
            label="Jump to"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{
              ml: { xs: 0, sm: 1 },
              width: { xs: "100%", sm: 150 },
              ...compactFieldSx,
            }}
          />
        ) : null}
      </Stack>

      {stats.length > 0 ? (
        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          gap={{ xs: 2, md: 3 }}
          alignItems="flex-start"
          sx={{
            py: { xs: 0.5, lg: 0 },
            px: { xs: 0, lg: 0.5 },
          }}
        >
          {stats.map((stat, index) => (
            <Box
              key={stat.label}
              sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 2, md: 3 } }}
            >
              {index > 0 ? (
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", md: "block" }, borderColor: "divider" }}
                />
              ) : null}
              <FinancePeriodStat {...stat} />
            </Box>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );

  if (embedded) {
    return body;
  }

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden", borderColor: "divider" }}>
      {body}
    </Paper>
  );
}
