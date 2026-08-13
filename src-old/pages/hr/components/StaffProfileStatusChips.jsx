import { Chip, Stack, Tooltip, Typography } from "@mui/material";
import {
  PROFILE_STATUS_LABELS,
  getDevReferenceToday,
  getStatusReminderDetails,
} from "./staffProfileStatusHelpers";

export default function StaffProfileStatusChips({
  profileStatus,
  profileStatusLabel,
  statusReminder,
  statusReminderLabel,
  hireDate,
  probationMonths,
  resignationPeriodEndDate,
  probationEndDate,
  referenceToday,
  size = "small",
}) {
  const {
    reminder,
    label: reminderLabel,
    actionLabel,
  } = getStatusReminderDetails({
    profileStatus,
    hireDate,
    probationMonths,
    resignationPeriodEndDate,
    probationEndDate,
    statusReminder,
    referenceToday: referenceToday ?? getDevReferenceToday(),
  });

  const statusText =
    profileStatusLabel || PROFILE_STATUS_LABELS[profileStatus] || profileStatus;
  const warningText = statusReminderLabel || reminderLabel;

  if (!statusText && !warningText) return null;

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {statusText ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "left", fontSize: "0.7rem" }}
          noWrap
          title={statusText}
        >
          {statusText}
        </Typography>
      ) : null}
      {warningText ? (
        <Tooltip title={actionLabel || ""} arrow>
          <Chip
            size={size}
            label={warningText}
            color="warning"
            variant="filled"
          />
        </Tooltip>
      ) : null}
    </Stack>
  );
}
