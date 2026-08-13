import dayjs from "dayjs";
import { Typography } from "@mui/material";
import { formatCheckInModeLabel } from "../../../utils/checkInModeUtils";

function formatVisitDateTime(visit) {
  const raw = visit?.visit_time ?? visit?.created_at;
  if (!raw) return "—";
  const d = dayjs(raw);
  return d.isValid() ? d.format("D MMM YYYY, HH:mm") : "—";
}

/**
 * Consistent visit context line for patient chart lists (date · doctor · therapist).
 */
export default function VisitReferenceHeader({ visit, sx }) {
  const dateStr = formatVisitDateTime(visit);
  const doctor = visit?.doctor?.name?.trim() || "—";
  const therapist = visit?.therapist?.name?.trim() || "—";
  const checkInLabel = formatCheckInModeLabel(visit?.check_in_mode);

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 600, display: "block", letterSpacing: 0.01, ...sx }}
    >
      {dateStr} · Doctor: {doctor} · Therapist: {therapist} · Check-in: {checkInLabel}
    </Typography>
  );
}
