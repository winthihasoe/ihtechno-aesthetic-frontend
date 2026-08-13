import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import { formatKyats } from "../../utils/formatKyats";

/**
 * Read-only display of a prescription — used in TreatmentRoomPage, PatientConsultationTab,
 * and PatientMedicalHistoryTab.
 *
 * Props:
 *   prescription  — the full prescription object including items[] and prescribedBy
 *   compact       — if true, renders a slimmer layout (for inline use in cards)
 */
export default function PrescriptionSummaryBlock({ prescription, compact = false }) {
  if (!prescription || !prescription.items?.length) return null;

  const items = prescription.items || [];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.25 : 1.5,
        borderRadius: 2,
        borderColor: "info.main",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(33, 150, 243, 0.08)"
            : "rgba(33, 150, 243, 0.04)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <MedicationIcon fontSize="small" color="info" />
        <Typography variant={compact ? "body2" : "subtitle2"} fontWeight={700}>
          Prescribed Medicines ({items.length})
        </Typography>
        {prescription.prescribed_by?.name && (
          <Typography variant="caption" color="text.secondary">
            by {prescription.prescribed_by.name}
          </Typography>
        )}
      </Stack>

      <Stack spacing={1} divider={<Divider flexItem />}>
        {items.map((item, idx) => (
          <Box key={item.id ?? idx}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={0.5}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {item.medicine_name}
                  {item.strength ? ` ${item.strength}` : ""}
                  {item.dosage_form ? ` (${item.dosage_form})` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[
                    item.route,
                    item.frequency,
                    item.duration ? `× ${item.duration}` : null,
                    item.quantity
                      ? `${item.quantity} ${item.unit || "pcs"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
                {item.special_instructions && (
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ fontStyle: "italic", mt: 0.25 }}
                  >
                    {item.special_instructions}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                {item.is_dispensed && (
                  <Chip label="Dispensed" size="small" color="success" variant="outlined" />
                )}
                {item.is_billable && item.unit_price != null && (
                  <Chip
                    label={formatKyats(item.unit_price)}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>

      {prescription.notes && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Notes: {prescription.notes}
        </Typography>
      )}
    </Paper>
  );
}
