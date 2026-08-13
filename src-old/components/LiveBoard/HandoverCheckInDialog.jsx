import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import {
  getLiveboardAssignableStaff,
  handoverCheckIn,
} from "../../services/visitService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

export default function HandoverCheckInDialog({
  open,
  onClose,
  visit,
  user,
  onSuccess,
}) {
  const pushToast = useToastStore((s) => s.pushToast);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedId("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getLiveboardAssignableStaff();
        const raw = Array.isArray(data?.front_desk) ? data.front_desk : [];
        const uid = user?.id != null ? Number(user.id) : null;
        const filtered =
          uid != null ? raw.filter((u) => Number(u.id) !== uid) : raw;
        if (!cancelled) setOptions(filtered);
      } catch (err) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(err, "Could not load staff list."),
            severity: "error",
          });
          setOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pushToast, user?.id]);

  const handleConfirm = async () => {
    const id = Number(selectedId);
    if (!visit?.id || !id) return;
    setSaving(true);
    try {
      const updated = await handoverCheckIn(visit.id, {
        check_in_staff_id: id,
      });
      pushToast({ message: "Handover request sent.", severity: "success" });
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not request handover."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Hand over visit</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Request another reception or sales staff member to receive this
          patient. They must accept from their LiveBoard before ownership
          changes.
        </Typography>
        {loading ? (
          <LoadingIndicator size={28} />
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel>Staff member</InputLabel>
            <Select
              labelId="handover-staff-label"
              label="Staff member"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              displayEmpty
            >
              {options.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.name}
                  {u.role ? ` (${u.role})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={saving || !selectedId || loading}
        >
          {saving ? "Saving…" : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
