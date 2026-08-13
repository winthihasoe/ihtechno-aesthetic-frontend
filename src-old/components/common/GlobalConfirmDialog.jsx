import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import useConfirmStore from "../../stores/confirmStore";

export default function GlobalConfirmDialog() {
  const { dialog, confirm, cancel } = useConfirmStore();

  return (
    <Dialog open={dialog.open} onClose={cancel} maxWidth="xs" fullWidth>
      <DialogTitle>{dialog.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{dialog.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel}>{dialog.cancelText}</Button>
        <Button onClick={confirm} variant="contained" color="primary">
          {dialog.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
