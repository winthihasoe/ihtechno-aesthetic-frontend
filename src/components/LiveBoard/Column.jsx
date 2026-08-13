import { Box, Typography, Card, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PatientCard from "./PatientCard";
import { STATUS_CONFIG } from "../../utils/roleUtils";

export default function Column({
  status,
  visits,
  user,
  onAction,
  onOpenVisit,
  onOpenDenied,
  pendingVisitIds = [],
  markDoneBlockedByVisitId = {},
  onHandoverComplete,
}) {
  const theme = useTheme();
  const cfg = STATUS_CONFIG[status];
  const paletteKey = cfg.color;
  const chroma = theme.palette[paletteKey];
  const main = chroma?.main ?? theme.palette.divider;
  const columnBg = alpha(
    main,
    theme.palette.mode === "dark" ? 0.18 : 0.1,
  );
  const columnBorder = alpha(
    main,
    theme.palette.mode === "dark" ? 0.45 : 0.35,
  );

  return (
    <Card
      data-testid={`column-${status}`}
      variant="outlined"
      sx={{
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: columnBg,
        borderColor: columnBorder,
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: columnBorder,
        }}
      >
        <Typography variant="subtitle2">{cfg.label}</Typography>
        <Chip label={visits.length} size="small" color={paletteKey} />
      </Box>

      {/* Cards */}
      <Box
        sx={{
          p: 1.25,
          flexGrow: 1,
          overflowY: "auto",
          maxHeight: "calc(100vh - 260px)",
        }}
      >
        {visits.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 3 }}
          >
            No patients
          </Typography>
        ) : (
          visits.map((visit) => (
            <PatientCard
              key={visit.id}
              visit={visit}
              user={user}
              onAction={onAction}
              onOpenVisit={onOpenVisit}
              onOpenDenied={onOpenDenied}
              onHandoverComplete={onHandoverComplete}
              pending={pendingVisitIds.includes(visit.id)}
              disableMarkTreatmentDone={Boolean(markDoneBlockedByVisitId[visit.id])}
              markTreatmentDoneDisabledReason={markDoneBlockedByVisitId[visit.id] ?? ""}
            />
          ))
        )}
      </Box>
    </Card>
  );
}
