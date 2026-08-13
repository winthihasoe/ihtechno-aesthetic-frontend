import { Alert, Typography } from "@mui/material";
import dayjs from "dayjs";

export function getVisitAppointmentNote(visit) {
  const notes = String(visit?.appointment?.notes ?? "").trim();
  if (!notes) return null;
  return {
    notes,
    scheduledAt: visit?.appointment?.scheduled_at ?? null,
  };
}

export default function VisitAppointmentNote({ visit, sx }) {
  const info = getVisitAppointmentNote(visit);
  if (!info) return null;

  const scheduledLabel = info.scheduledAt
    ? dayjs(info.scheduledAt).format("DD-MM-YYYY HH:mm")
    : null;

  return (
    <Alert severity="info" sx={sx}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Appointment note
      </Typography>
      {scheduledLabel ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 0.5 }}
        >
          Scheduled: {scheduledLabel}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {info.notes}
      </Typography>
    </Alert>
  );
}
