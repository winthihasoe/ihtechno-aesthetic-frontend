import { Alert, Portal, Snackbar } from "@mui/material";
import useToastStore from "../../stores/toastStore";

export default function GlobalToast() {
  const { queue, shiftToast } = useToastStore();
  const current = queue[0];

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    shiftToast();
  };

  return (
    <Portal>
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          mt: 1,
          zIndex: (theme) => theme.zIndex.tooltip + 1,
        }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity || "success"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {current?.message || ""}
        </Alert>
      </Snackbar>
    </Portal>
  );
}
