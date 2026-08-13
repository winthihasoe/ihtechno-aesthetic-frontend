import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

export default function LogoutConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="logout-confirm-title"
    >
      <DialogTitle id="logout-confirm-title">Confirm logout</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to log out from your account?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Logout
        </Button>
      </DialogActions>
    </Dialog>
  );
}
