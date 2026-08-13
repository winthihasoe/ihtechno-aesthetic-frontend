import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import Person4RoundedIcon from "@mui/icons-material/Person4Rounded";
import Person3RoundedIcon from "@mui/icons-material/Person3Rounded";
import useScrollCollapse from "../../../hooks/useScrollCollapse";

function resolveGenderAvatarConfig(gender, name) {
  const value = String(gender ?? "")
    .trim()
    .toLowerCase();
  if (value === "male") {
    return {
      icon: <Person4RoundedIcon />,
      sx: { bgcolor: "info.light", color: "info.dark" },
    };
  }
  if (value === "female") {
    return {
      icon: <Person3RoundedIcon />,
      sx: { bgcolor: "secondary.light", color: "secondary.dark" },
    };
  }

  return {
    icon:
      String(name ?? "")
        .trim()
        .charAt(0)
        .toUpperCase() || "?",
    sx: { bgcolor: "grey.200", color: "text.primary", fontWeight: 700 },
  };
}

export default function ConsultationRoomHeader({
  title = "Consultation Room",
  patient,
  visit,
  photoCount = 0,
  plannedTreatmentCount = 0,
  saving = false,
  readOnly = false,
  lockedAt = null,
  gfeStatus = null,
  saveLabel = "Save",
  savingLabel = "Saving...",
  lockedLabel = "Consultation locked",
  saveTestId,
  headerActions = null,
  pairHeaderActionsWithCancel = false,
  onBackToBoard,
  onPatientDetails,
  onCancel,
  onSave,
}) {
  const collapsed = useScrollCollapse();

  const patientName = patient?.full_name ?? patient?.name ?? "Patient";
  const genderAvatar = resolveGenderAvatarConfig(patient?.gender, patientName);
  const showSave = typeof onSave === "function";
  const showCollapsed = collapsed;
  const usePairedActions =
    pairHeaderActionsWithCancel && headerActions && !showCollapsed;

  const cancelButton = (
    <Button
      variant="outlined"
      onClick={onCancel}
      size="small"
      sx={{ minWidth: 96, py: 0.375, fontSize: "0.8125rem" }}
    >
      Cancel
    </Button>
  );

  const saveButton = showSave ? (
    <Button
      variant="contained"
      disabled={saving || readOnly}
      onClick={onSave}
      data-testid={saveTestId}
      size="small"
      sx={{ minWidth: 112, py: 0.375, fontSize: "0.8125rem" }}
    >
      {readOnly ? lockedLabel : saving ? savingLabel : saveLabel}
    </Button>
  ) : null;

  const pairedActionRow = usePairedActions ? (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ width: "100%", flexShrink: 0 }}
    >
      <Box sx={{ flexShrink: 0 }}>{headerActions}</Box>
      {cancelButton}
    </Stack>
  ) : null;

  const actionButtons = usePairedActions ? (
    saveButton ? (
      <Stack direction="row" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
        {saveButton}
      </Stack>
    ) : null
  ) : (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="flex-end"
      alignItems="center"
      sx={{ flexShrink: 0 }}
    >
      {cancelButton}
      {saveButton}
    </Stack>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: showCollapsed ? 0.75 : 1.25,
        mb: 1.5,
        borderRadius: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.default",
        boxShadow: 10,
        overflowAnchor: "none",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: showCollapsed ? 0 : 1,
      }}
    >
      {showCollapsed ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ minWidth: 0, width: "100%", px: 2 }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={800}
            noWrap
            sx={{ minWidth: 0, flex: 1, color: "secondary.primary" }}
          >
            {patientName}
          </Typography>
          {actionButtons}
        </Stack>
      ) : (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.75, sm: 1 }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: "100%", flexShrink: 0, gap: { xs: 0.75, sm: 1 } }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <IconButton
                aria-label="Back to live board"
                onClick={onBackToBoard}
                size="small"
                sx={{ flexShrink: 0, p: 0.5 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                sx={{ lineHeight: 1.1 }}
                noWrap
              >
                {title}
              </Typography>
              {headerActions && !usePairedActions ? (
                <Box sx={{ ml: "auto", flexShrink: 0 }}>{headerActions}</Box>
              ) : null}
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ minWidth: 0, pl: 0.25 }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: "0.9rem",
                  ...genderAvatar.sx,
                }}
              >
                {genderAvatar.icon}
              </Avatar>
              <Box
                onClick={onPatientDetails}
                sx={{
                  minWidth: 0,
                  flex: 1,
                  cursor: onPatientDetails ? "pointer" : "default",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    lineHeight: 1.15,
                    fontWeight: 800,
                    color: "secondary.primary",
                  }}
                  noWrap
                >
                  {patientName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ lineHeight: 1.2, display: "block" }}
                >
                  Visit #{visit.queue_number ?? visit.id} ·{" "}
                  {dayjs(visit.visit_time ?? visit.created_at).format(
                    "DD-MM-YYYY hh:mm",
                  )}
                  {onPatientDetails ? " · See patient's details" : ""}
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              justifyContent="flex-end"
              sx={{
                "& .MuiChip-root": {
                  height: 22,
                  fontSize: "0.7rem",
                  "& .MuiChip-label": { px: 0.75 },
                },
              }}
            >
              <Chip
                label={visit?.follow_up ? "Follow-up" : "New complaint"}
                color="info"
                size="small"
              />
              <Chip
                label={`${photoCount} photo(s)`}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${plannedTreatmentCount} treatment(s)`}
                color="secondary"
                size="small"
                variant="outlined"
              />
              {readOnly && (
                <Chip
                  label={`Locked${lockedAt ? ` · ${dayjs(lockedAt).format("DD-MM-YYYY hh:mm")}` : ""}`}
                  color="warning"
                  size="small"
                />
              )}
              {gfeStatus?.status === "complete" && (
                <Chip
                  label="GFE complete"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
              {gfeStatus?.status === "required" && (
                <Chip label="GFE required" color="warning" size="small" />
              )}
            </Stack>

            {pairedActionRow}
            {actionButtons}
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
