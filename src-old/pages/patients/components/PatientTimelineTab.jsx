import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getPatientTimeline } from "../../../services/patientTimelineService";
import { resolveApiError } from "../../../services/apiClient";
import useAuthStore from "../../../stores/authStore";
import { hasAnyPermission } from "../../../utils/accessUtils";
import { rolePrefixFromPathname } from "../../../components/finance/JournalEntrySourceDetails";

const FOLLOW_UP_TYPES = ["follow_up_task", "follow_up_log"];

const TYPE_OPTIONS = [
  { value: "follow_up", label: "All follow-up" },
  { value: "visit", label: "Visits" },
  { value: "treatment", label: "Treatments" },
  { value: "photo", label: "Photos" },
  { value: "consent", label: "Consent" },
  { value: "package_usage", label: "Package usage" },
  { value: "follow_up_task", label: "Follow-up tasks" },
  { value: "follow_up_log", label: "Follow-up calls" },
];

const FEEDBACK_LABELS = {
  interested: "Interested",
  not_interested: "Not interested",
  no_response: "No response",
  follow_again: "Follow again",
};

const CALL_LABELS = {
  answered: "Answered",
  no_answer: "No answer",
  busy: "Busy",
};

const ACTION_LABELS = {
  saved: "Saved",
  completed: "Completed",
  skipped: "Skipped",
  follow_again_created: "Follow-up scheduled",
};

function formatEventAt(value) {
  if (!value) return "—";
  const dt = dayjs(value);
  return dt.isValid() ? dt.format("DD-MM-YYYY HH:mm") : "—";
}

function formatFollowUpTaskTitle(item) {
  const meta = item.meta ?? {};
  const type = meta.task_type
    ? String(meta.task_type).replace(/_/g, " ")
    : "follow-up";
  const status = meta.status ? ` · ${meta.status}` : "";
  const due = meta.due_date
    ? ` · due ${dayjs(meta.due_date).format("DD-MM-YYYY")}`
    : "";
  return `Follow-up task — ${type}${status}${due}`;
}

function formatFollowUpLogTitle(item) {
  const meta = item.meta ?? {};
  const feedback = meta.feedback_status
    ? FEEDBACK_LABELS[meta.feedback_status] || meta.feedback_status
    : null;
  const call = meta.call_status
    ? CALL_LABELS[meta.call_status] || meta.call_status
    : null;
  const attempt =
    (meta.attempt_count ?? 0) > 0 ? ` (attempt ${meta.attempt_count})` : "";
  const parts = ["Follow-up call"];
  if (feedback) parts.push(`— ${feedback}${attempt}`);
  else if (call) parts.push(`— ${call}${attempt}`);
  else if (attempt) parts.push(attempt);
  return parts.join(" ");
}

function formatEventTitle(item) {
  if (item.type === "follow_up_task") return formatFollowUpTaskTitle(item);
  if (item.type === "follow_up_log") return formatFollowUpLogTitle(item);
  return item.title || item.type?.replace(/_/g, " ") || "Event";
}

function formatEventSubtitle(item) {
  const typeLabel =
    TYPE_OPTIONS.find((opt) => opt.value === item.type)?.label ||
    item.type?.replace(/_/g, " ") ||
    "event";
  const parts = [formatEventAt(item.event_at), typeLabel];

  if (item.type === "follow_up_log" && item.meta?.staff_name) {
    parts.push(item.meta.staff_name);
  }
  if (item.type === "follow_up_log" && item.meta?.action) {
    parts.push(ACTION_LABELS[item.meta.action] || item.meta.action);
  }
  if (item.type === "follow_up_task" && (item.meta?.attempt_count ?? 0) > 0) {
    parts.push(`${item.meta.attempt_count} attempt(s)`);
  }

  return parts.join(" · ");
}

export default function PatientTimelineTab({
  patientId,
  initialFilterType = "",
}) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [filterType, setFilterType] = useState(initialFilterType);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canOpenFollowUpCenter = hasAnyPermission(user, [
    "follow_up.view",
    "follow_up.update",
  ]);

  const followUpCenterPath = useMemo(() => {
    const prefix = rolePrefixFromPathname(location.pathname);
    return `${prefix}/follow-up-center`;
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const apiType =
      filterType && filterType !== "follow_up" ? { type: filterType } : {};
    getPatientTimeline(patientId, apiType)
      .then((data) => {
        if (!active) return;
        if (filterType === "follow_up") {
          setItems(data.filter((item) => FOLLOW_UP_TYPES.includes(item.type)));
          return;
        }
        setItems(data);
      })
      .catch((err) => {
        if (active) setError(resolveApiError(err, "Failed to load timeline."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId, filterType]);

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <FormControl size="small" sx={{ maxWidth: 260, minWidth: 200 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            label="Filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">All events</MenuItem>
            {TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {canOpenFollowUpCenter ? (
          <Button
            component={RouterLink}
            to={followUpCenterPath}
            size="small"
            endIcon={<OpenInNewIcon />}
          >
            Open Follow-Up Center
          </Button>
        ) : null}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <LoadingIndicator size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No timeline records yet.
        </Typography>
      ) : (
        <Stack spacing={1.2}>
          {items.map((item) => (
            <Box
              key={`${item.type}-${item.reference_id}-${item.event_at}`}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1.25,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatEventTitle(item)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatEventSubtitle(item)}
              </Typography>
              {item.type === "follow_up_log" && item.meta?.feedback ? (
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  {item.meta.feedback}
                </Typography>
              ) : null}
              {item.type === "follow_up_log" &&
              canOpenFollowUpCenter &&
              item.meta?.task_id ? (
                <Link
                  component={RouterLink}
                  to={followUpCenterPath}
                  variant="caption"
                  sx={{ display: "inline-block", mt: 0.5 }}
                >
                  View in Follow-Up Center
                </Link>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
