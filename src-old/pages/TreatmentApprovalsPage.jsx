import { useCallback, useEffect, useMemo, useState } from "react";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import { Link as RouterLink } from "react-router-dom";
import useToastStore from "../stores/toastStore";
import useAuthStore from "../stores/authStore";
import { resolveApiError } from "../services/apiClient";
import {
  listPendingTreatmentApprovals,
  reviewTreatmentApproval,
} from "../services/treatmentService";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";

function approvalStatusLabel(status) {
  if (status === "pending_approval") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status || "Unknown";
}

function TreatmentApprovalsEmptyState() {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderStyle: "dashed",
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.25,
              bgcolor: "primary.light",
              color: "primary.dark",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <FactCheckOutlinedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              No sessions waiting for approval
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.35 }}
            >
              Review completed treatments before the visit can move to payment.
              When staff submit a session, it appears here for you to approve or
              reject.
            </Typography>
            <Stack spacing={0.35} sx={{ mt: 1.15 }}>
              <Typography variant="caption" color="text.secondary">
                1. Therapist or doctor completes a treatment session in the
                treatment room.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                2. They submit it for approval (or it auto-submits on mark
                done).
              </Typography>
              <Typography variant="caption" color="text.secondary">
                3. You review the session here and approve or reject with an
                optional comment.
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.75, fontWeight: 600 }}
          >
            Preview — what a pending review looks like
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1.25,
              bgcolor: "action.hover",
              opacity: 0.72,
              pointerEvents: "none",
            }}
          >
            <Stack spacing={1}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Chemical peel — session 1
                  </Typography>
                  <Chip size="small" color="warning" label="Pending review" />
                </Stack>
                <Button size="small" variant="outlined" disabled>
                  Open treatment room
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Patient: Su Su (ID: 1042) · Doctor: Dr. Soe Soe · Therapist:
                Hnin Hnin
              </Typography>
              <TextField
                size="small"
                label="Review comment (optional)"
                value=""
                disabled
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="success" disabled>
                  Approve
                </Button>
                <Button variant="outlined" color="error" disabled>
                  Reject
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function TreatmentApprovalsPage() {
  const pushToast = useToastStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [commentById, setCommentById] = useState({});
  const prefix = useMemo(() => getWorkspaceUrlPrefix(user), [user]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingTreatmentApprovals();
      setRows(data);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not load treatment approvals."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleReview = async (treatmentId, status) => {
    setBusyId(treatmentId);
    try {
      await reviewTreatmentApproval(treatmentId, {
        status,
        comment: commentById[treatmentId] || null,
      });
      setRows((prev) =>
        prev.filter((row) => Number(row.id) !== Number(treatmentId)),
      );
      pushToast({
        message:
          status === "approved" ? "Treatment approved." : "Treatment rejected.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update approval."),
        severity: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Treatment Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Simple review queue for owner, doctor, and dermatologist.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={loadRows} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Paper
          variant="outlined"
          sx={{ p: 3, display: "grid", placeItems: "center" }}
        >
          <LoadingIndicator size={24} />
        </Paper>
      ) : rows.length === 0 ? (
        <TreatmentApprovalsEmptyState />
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row) => {
            const patient = row?.visit?.patient;
            const doctorName = row?.visit?.doctor?.name || "Unassigned";
            const therapistName =
              row?.therapist?.name ||
              row?.visit?.therapist?.name ||
              "Unassigned";
            const isBusy = Number(busyId) === Number(row.id);
            return (
              <Paper key={row.id} variant="outlined" sx={{ p: 1.25 }}>
                <Stack spacing={1}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {row.name || "Treatment session"}
                      </Typography>
                      <Chip
                        size="small"
                        color="warning"
                        label={approvalStatusLabel(row.approval_status)}
                      />
                    </Stack>
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`${prefix}/visits/${row.visit_id}/treatment-room`}
                    >
                      Open treatment room
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Patient: {patient?.name || "-"} (ID: {patient?.id || "-"}) ·
                    Doctor: {doctorName} · Therapist: {therapistName}
                  </Typography>
                  <TextField
                    size="small"
                    label="Review comment (optional)"
                    value={commentById[row.id] || ""}
                    onChange={(e) =>
                      setCommentById((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleReview(row.id, "approved")}
                      disabled={isBusy}
                    >
                      {isBusy ? "Saving..." : "Approve"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleReview(row.id, "rejected")}
                      disabled={isBusy}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
