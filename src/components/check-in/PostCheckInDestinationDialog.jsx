import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

/**
 * After check-in from patient details: choose Visit History or stay.
 */
export default function PostCheckInDestinationDialog({
  open,
  onClose,
  onGoToLiveBoard,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Check-in complete</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          The visit was created and appears on Visit History (Waiting).
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
          Go to Visit History
        </Button>
        <Button variant="outlined" fullWidth onClick={onClose}>
          Stay on this page
        </Button>
      </DialogActions>
    </Dialog>
  );
}
