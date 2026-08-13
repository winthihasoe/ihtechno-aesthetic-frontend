import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

/**
 * After check-in from patient details: choose Live Board or stay.
 */
export default function PostCheckInDestinationDialog({
  open,
  onClose,
  onGoToLiveBoard,
  queueNumber,
}) {
  const formattedQueueNumber =
    queueNumber != null && queueNumber !== "" ? `#${queueNumber}` : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Check-in complete</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {formattedQueueNumber
            ? `Queue number ${formattedQueueNumber}. The visit is on the Live Board (Waiting List).`
            : "The visit was created and appears on the Live Board (Waiting List)."}
        </Typography>
      </DialogContent>
      <DialogActions
        disableSpacing
        sx={{
          px: 3,
          pb: 2,
          flexDirection: "column",
          alignItems: "stretch",
          gap: 1,
        }}
      >
        <Button variant="contained" fullWidth onClick={onGoToLiveBoard}>
          Go to Live Board
        </Button>
        <Button variant="outlined" fullWidth onClick={onClose}>
          Stay on this page
        </Button>
      </DialogActions>
    </Dialog>
  );
}
