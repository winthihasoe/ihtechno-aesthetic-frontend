import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StatusChip from "../common/StatusChip";
import { formatCarryoverCheckInTime } from "../../utils/liveboardTimeUtils";
import { resolveLiveboardDrawerContext } from "../../utils/liveboardDrawerContext";

export default function CarryoverChip({
  visit,
  onOpenVisit,
  onCancelVisit,
  canCancel = false,
}) {
  const patientName = visit.patient?.name || visit.patientName || "Patient";
  const checkInLabel =
    visit.carryover_age_label || formatCarryoverCheckInTime(visit.visit_time);
  const staffName =
    visit.last_touched_staff_name ||
    visit.lastStatusTransitionBy?.name ||
    visit.check_in_staff?.name ||
    "—";
  const dayNumber = visit.carryover_day_number;
  const drawerContext = resolveLiveboardDrawerContext(visit);

  const handleOpen = () => onOpenVisit?.(visit, drawerContext);

  const handleCancel = (event) => {
    event.stopPropagation();
    onCancelVisit?.(visit);
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 1,
        border: 1,
        borderColor: "warning.light",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(245, 158, 11, 0.12)"
            : "rgba(255, 251, 235, 0.9)",
        minWidth: 0,
        overflow: "hidden",
        "&:hover": {
          borderColor: "warning.main",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          p: 1.5,
          border: 0,
          bgcolor: "transparent",
          cursor: "pointer",
          textAlign: "left",
          minWidth: 0,
          flex: 1,
        }}
      >
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          sx={{ maxWidth: 140 }}
        >
          {patientName}
        </Typography>
        <StatusChip status={visit.status} size="small" />
        <Typography variant="caption" color="text.secondary" noWrap>
          {checkInLabel}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ maxWidth: 100 }}
        >
          {staffName}
        </Typography>
        {dayNumber != null && dayNumber >= 2 ? (
          <Chip
            label={`Day ${dayNumber}`}
            size="small"
            color="warning"
            variant="outlined"
          />
        ) : null}
      </Box>
      {canCancel ? (
        <Tooltip title="Cancel visit">
          <IconButton
            size="small"
            aria-label="Cancel carryover visit"
            onClick={handleCancel}
            sx={{
              alignSelf: "center",
              mr: 0.5,
              color: "error.main",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}
