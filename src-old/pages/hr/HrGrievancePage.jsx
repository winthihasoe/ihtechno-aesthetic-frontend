import { useCallback, useEffect, useState } from "react";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import {
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import HrPageShell from "./components/HrPageShell";
import {
  getStaffGrievances,
  replyStaffGrievance,
  updateStaffGrievance,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasRole } from "../../utils/accessUtils";

const emptyGrievanceFilters = { status: "", recipient_type: "" };

export default function HrGrievancePage() {
  const { pushToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyGrievanceFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyGrievanceFilters);
  const [replyDrafts, setReplyDrafts] = useState({});
  const isOwner = hasRole(user, "owner");
  const canManageGrievances = isOwner || hasRole(user, "hr");
  const hasActiveFilters = Boolean(
    appliedFilters.status || appliedFilters.recipient_type,
  );
  const activeFilterCount =
    Number(Boolean(appliedFilters.status)) +
    Number(Boolean(appliedFilters.recipient_type));

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(emptyGrievanceFilters);
    setAppliedFilters(emptyGrievanceFilters);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaffGrievances(appliedFilters);
      setRows(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const sendReply = async (id) => {
    const message = (replyDrafts[id] || "").trim();
    if (!message) return;
    try {
      await replyStaffGrievance(id, { message });
      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to send reply."),
        severity: "error",
      });
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await updateStaffGrievance(id, { status });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update grievance."),
        severity: "error",
      });
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Grievance">
      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterCount}
          size="small"
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            select
            size="small"
            label="Status"
            value={draftFilters.status}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="submitted">submitted</MenuItem>
            <MenuItem value="under_review">under_review</MenuItem>
            <MenuItem value="resolved">resolved</MenuItem>
            <MenuItem value="rejected">rejected</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Recipient"
            value={draftFilters.recipient_type}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                recipient_type: e.target.value,
              }))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="hr">HR</MenuItem>
            <MenuItem value="owner">Owner</MenuItem>
          </TextField>
        </Stack>
      </CollapsibleFiltersPanel>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : null}

      {!loading && rows.length === 0 ? (
        <GrievanceInboxEmptyState
          hasActiveFilters={hasActiveFilters}
          isOwner={isOwner}
          onClearFilters={clearFilters}
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <Stack spacing={1.25}>
          {rows.map((row) => (
              <Card key={row.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <Chip size="small" label={row.status} />
                  <Chip
                    size="small"
                    label={`to ${row.recipient_type}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={row.severity || "medium"}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={row.is_anonymous ? "anonymous" : "identified"}
                    color={row.is_anonymous ? "warning" : "default"}
                    variant={row.is_anonymous ? "filled" : "outlined"}
                  />
                </Stack>
                <Typography fontWeight={700}>
                  {row.category || "General concern"}
                </Typography>
                {!row.is_anonymous && row.staff?.name ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    Staff: {row.staff.name}
                  </Typography>
                ) : null}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {row.message}
                </Typography>
                {canManageGrievances ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      value={row.status}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                    >
                      <MenuItem value="submitted">submitted</MenuItem>
                      <MenuItem value="under_review">under_review</MenuItem>
                      <MenuItem value="resolved">resolved</MenuItem>
                      <MenuItem value="rejected">rejected</MenuItem>
                    </TextField>
                    <Button
                      size="small"
                      onClick={() => updateStatus(row.id, "resolved")}
                    >
                      Mark resolved
                    </Button>
                  </Stack>
                ) : null}
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {(row.messages || []).map((message) => (
                    <Typography
                      key={message.id}
                      variant="caption"
                      color="text.secondary"
                    >
                      {message.sender_is_staff
                        ? "Staff"
                        : message.sender?.name || "Management"}
                      : {message.message}
                    </Typography>
                  ))}
                  {canManageGrievances ? (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Reply to this grievance..."
                        value={replyDrafts[row.id] || ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => sendReply(row.id)}
                      >
                        Reply
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Card>
            ))}
          </Stack>
      ) : null}
    </HrPageShell>
  );
}

function GrievanceInboxEmptyState({
  hasActiveFilters,
  isOwner,
  onClearFilters,
}) {
  if (hasActiveFilters) {
    return (
      <Card variant="outlined" sx={{ p: 2.5, bgcolor: "action.hover" }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          No grievances match these filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Try a different status or recipient, or clear filters to see the full
          inbox.
        </Typography>
        <Button size="small" variant="outlined" onClick={onClearFilters}>
          Clear filters
        </Button>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <SupportAgentOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Grievance inbox is empty
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        Staff raise workplace concerns from their own HR grievance page.
        Submissions appear here for review, threaded replies, and status
        updates.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Who submits:</strong> Clinic staff (not HR or owner accounts).
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Recipients:</strong> HR (general HR matters) or Owner only
          (sensitive or leadership-related cases).
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>What you see:</strong>{" "}
          {isOwner
            ? "As owner, all grievances addressed to HR or to you are listed here."
            : "As HR, grievances sent to HR are listed here. Owner-only cases stay in the owner inbox."}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Lifecycle:</strong> submitted → under review → resolved or
          rejected. Reply in the thread to move a case forward; the first reply
          sets status to under review.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Privacy:</strong> Staff may submit anonymously; identity stays
          hidden unless they choose otherwise.
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Use the Status and Recipient filters above when cases start coming in.
      </Typography>
    </Box>
  );
}
