import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from "@mui/material";

export default function SignaturePadDialog({
  open,
  onClose,
  onConfirm,
  title = "E-signature",
  confirmLabel = "Confirm signature",
}) {
  const theme = useTheme();
  const ref = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      ref.current?.clear();
    }
  }, [open]);

  const handleConfirm = () => {
    const pad = ref.current;
    if (!pad || pad.isEmpty()) {
      setError("Please sign before confirming.");
      return;
    }
    onConfirm(pad.getCanvas().toDataURL("image/png"));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            border: "1px solid",
            borderColor: error ? "error.main" : "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            touchAction: "none",
          }}
        >
          <SignatureCanvas
            ref={ref}
            penColor={theme.palette.text.primary}
            canvasProps={{
              style: { width: "100%", height: 220 },
              className: "signature-canvas",
            }}
            onEnd={() => setError("")}
          />
        </Box>
        {error ? (
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
            {error}
          </Typography>
        ) : null}
        <Button size="small" sx={{ mt: 1.5 }} onClick={() => ref.current?.clear()}>
          Clear pad
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
