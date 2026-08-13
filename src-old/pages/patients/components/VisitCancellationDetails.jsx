import { Alert, Stack, Typography } from "@mui/material";
import {
  formatVisitCancelledAt,
  parseVisitCancelReason,
} from "../../../utils/visitCancelReasonUtils";

export default function VisitCancellationDetails({ visit, sx }) {
  if (visit?.status !== "cancelled") return null;

  const parsed = parseVisitCancelReason(visit.cancel_reason);
  const cancelledAt = formatVisitCancelledAt(visit.cancelled_at);

  if (!parsed && !cancelledAt) return null;

  return (
    <Alert severity="warning" sx={sx}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Visit cancelled
      </Typography>
      <Stack spacing={0.5}>
        {cancelledAt ? (
          <Typography variant="body2">
            <strong>Cancelled at:</strong> {cancelledAt}
          </Typography>
        ) : null}
        {parsed ? (
          <>
            <Typography variant="body2">
              <strong>Source:</strong> {parsed.source}
            </Typography>
            <Typography variant="body2">
              <strong>Reason:</strong> {parsed.reason}
            </Typography>
            {parsed.note ? (
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                <strong>Note:</strong> {parsed.note}
              </Typography>
            ) : null}
          </>
        ) : visit.cancel_reason ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            <strong>Reason:</strong> {visit.cancel_reason}
          </Typography>
        ) : null}
      </Stack>
    </Alert>
  );
}
