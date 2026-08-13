import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { updateStaffProfile } from "../../../services/hrService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

export default function ReportingManagerDialog({
  open,
  staffMember,
  staffList = [],
  canEdit = false,
  onClose,
  onSaved,
}) {
  const { pushToast } = useToastStore();
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = staffMember?.staff_profile;

  useEffect(() => {
    if (!open || !staffMember) return;
    const current =
      profile?.reporting_manager_id ??
      profile?.reporting_manager?.id ??
      null;
    setReportingManagerId(current != null ? String(current) : "");
  }, [open, staffMember, profile?.reporting_manager?.id, profile?.reporting_manager_id]);

  const managerOptions = useMemo(() => {
    if (!staffMember) return [];
    return staffList
      .filter((member) => Number(member.id) !== Number(staffMember.id))
      .map((member) => ({
        id: member.id,
        name: member.name,
        subtitle: member.staff_profile?.position_title || "No staff profile",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, staffMember]);

  const currentManagerLabel = useMemo(() => {
    if (!reportingManagerId) return "None";
    const match = managerOptions.find((option) => String(option.id) === reportingManagerId);
    if (match) return match.name;
    return profile?.reporting_manager?.name || "—";
  }, [managerOptions, profile?.reporting_manager?.name, reportingManagerId]);

  const handleSave = async () => {
    if (!staffMember || !canEdit) return;
    setSaving(true);
    try {
      await updateStaffProfile(staffMember.id, {
        reporting_manager_id: reportingManagerId ? Number(reportingManagerId) : null,
        position_title: profile?.position_title ?? null,
        department_id: profile?.department_id ?? profile?.department?.id ?? null,
        employment_type: profile?.employment_type ?? null,
        employee_code: profile?.employee_code ?? null,
      });
      pushToast({ message: "Reporting manager updated.", severity: "success" });
      onSaved?.();
      onClose?.();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update reporting manager."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!staffMember) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Reporting manager</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={profile?.avatar_url || undefined}
              alt={staffMember.name}
              sx={{ width: 48, height: 48 }}
            >
              {(staffMember.name || "?").slice(0, 1)}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {staffMember.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {profile?.position_title || "No position"}
              </Typography>
            </Stack>
          </Stack>

          {canEdit ? (
            <TextField
              select
              size="small"
              fullWidth
              label="Reports to"
              value={reportingManagerId}
              onChange={(e) => setReportingManagerId(e.target.value)}
              helperText="Choose who this person reports to in the organization chart."
            >
              <MenuItem value="">None (top level)</MenuItem>
              {managerOptions.map((option) => (
                <MenuItem key={option.id} value={String(option.id)}>
                  {option.name}
                  {option.subtitle ? ` · ${option.subtitle}` : ""}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Reports to
              </Typography>
              <Typography variant="body1">{currentManagerLabel}</Typography>
              <Typography variant="caption" color="text.secondary">
                You need HR manage permission to edit reporting lines here.
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {canEdit ? "Cancel" : "Close"}
        </Button>
        {canEdit ? (
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
