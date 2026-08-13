import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import apiClient, { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { getUserLiveBoardPath } from "../../utils/workspaceRoutes";

const formatDateLabel = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const moduleLabel = (module) => (module || "unknown").replace(/_/g, " ");

const contextSummary = (ctx, log) => {
  if (!ctx && !log) return "";
  const patientId = ctx?.patient_id ?? log?.patient_id;
  const patientName = ctx?.patient_name ?? log?.patient_name;
  const bits = [];
  if (patientName || patientId) {
    const name = patientName || "Unknown";
    bits.push(
      patientId ? `Patient: ${name} (#${patientId})` : `Patient: ${name}`,
    );
  }
  if (ctx?.visit_queue_number || ctx?.visit_id) {
    bits.push(`Visit: #${ctx.visit_queue_number || ctx.visit_id}`);
  }
  if (ctx?.treatment_name || ctx?.treatment_id) {
    bits.push(`Treatment: ${ctx.treatment_name || `#${ctx.treatment_id}`}`);
  }
  return bits.join(" · ");
};

const emptyDateFilters = { from_date: "", to_date: "" };

const EMPTY_STEPS = [
  {
    icon: HowToRegOutlinedIcon,
    title: "Patient check-ins",
    body: "Creating visits on the Live Board writes check-in entries with queue number and patient context.",
  },
  {
    icon: MedicalServicesOutlinedIcon,
    title: "Clinical documentation",
    body: "Consultations, treatments, approvals, and prescriptions each append create and update rows to the trail.",
  },
  {
    icon: DrawOutlinedIcon,
    title: "Photos and consents",
    body: "Photo uploads, deletions, and signed consent forms are logged for compliance review.",
  },
];

export default function EmrAuditLogsPage() {
  const { user } = useAuthStore();
  const liveBoardPath = getUserLiveBoardPath(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyDateFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyDateFilters);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );

  const fetchLogs = async (filters = appliedFilters) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ limit: "300" });
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);
      const { data } = await apiClient.get(
        `/reports/emr-audit-logs?${params.toString()}`,
      );
      setLogs(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(resolveApiError(err, "Failed to load EMR audit logs."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(emptyDateFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    fetchLogs(draftFilters);
  };

  const clearFilters = () => {
    setDraftFilters(emptyDateFilters);
    setAppliedFilters(emptyDateFilters);
    fetchLogs(emptyDateFilters);
  };

  const grouped = useMemo(() => {
    return logs.reduce((acc, log) => {
      const key = formatDateLabel(log.created_at);
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});
  }, [logs]);

  const hasActiveFilters = activeFilterCount > 0;
  const showGuidedEmpty =
    !loading && logs.length === 0 && !hasActiveFilters && !error;
  const showFilteredEmptyState =
    !loading && logs.length === 0 && hasActiveFilters && !error;

  return (
    <Box sx={{ display: "grid", gap: 2, p: { xs: 0.5, sm: 1 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            EMR Audit Logs
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Chronological EMR activity trail grouped by date. Entries are
            human-readable for quick legal and clinical review.
          </Typography>
        </Box>
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField
            size="small"
            type="date"
            label="From date"
            value={draftFilters.from_date}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, from_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { sm: 180 } }}
          />
          <TextField
            size="small"
            type="date"
            label="To date"
            value={draftFilters.to_date}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, to_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { sm: 180 } }}
          />
        </Stack>
      </CollapsibleFiltersPanel>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={HistoryOutlinedIcon}
          title="No EMR audit logs yet"
          description="This read-only trail fills automatically as clinical staff work in the EMR. Once visits, treatments, or consents are recorded, entries appear here grouped by date."
          steps={EMPTY_STEPS}
          footer={
            <>
              Activity originates on the{" "}
              <Typography
                component={RouterLink}
                to={liveBoardPath}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Live Board
              </Typography>
              .
            </>
          }
        />
      ) : showFilteredEmptyState ? (
        <Alert severity="info">No EMR audit logs match your date filters.</Alert>
      ) : (
        Object.entries(grouped).map(([dateLabel, entries]) => (
          <Card key={dateLabel} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {dateLabel}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.2}>
                {entries.map((log) => (
                  <Box
                    key={log.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      p: 1.25,
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {log.summary || "Activity recorded"}
                        </Typography>
                        {contextSummary(log.context, log) ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {contextSummary(log.context, log)}
                          </Typography>
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          {log.user?.name || "System"}{" "}
                          {log.user?.email ? `(${log.user.email})` : ""}
                        </Typography>
                        {Array.isArray(log.changes_preview) &&
                        log.changes_preview.length > 0 ? (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 0.75 }}
                          >
                            {log.changes_preview.map((change, idx) => (
                              <Chip
                                key={`${log.id}-change-${idx}`}
                                size="small"
                                variant="outlined"
                                label={change}
                              />
                            ))}
                          </Stack>
                        ) : null}
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Chip size="small" label={moduleLabel(log.module)} />
                        <Chip
                          size="small"
                          label={formatTime(log.created_at)}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
