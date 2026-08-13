import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import apiClient, { resolveApiError } from "../../services/apiClient";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

const contextSummary = (ctx) => {
  if (!ctx) return "";
  const bits = [];
  if (ctx.patient_name) bits.push(`Patient: ${ctx.patient_name}`);
  if (ctx.visit_queue_number || ctx.visit_id) {
    bits.push(`Visit: #${ctx.visit_queue_number || ctx.visit_id}`);
  }
  if (ctx.treatment_name || ctx.treatment_id) {
    bits.push(`Treatment: ${ctx.treatment_name || `#${ctx.treatment_id}`}`);
  }
  return bits.join(" · ");
};

export default function EmrAuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = async ({ from = "", to = "" } = {}) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ limit: "300" });
      if (from) params.set("from_date", from);
      if (to) params.set("to_date", to);
      const { data } = await apiClient.get(`/reports/emr-audit-logs?${params.toString()}`);
      setLogs(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(resolveApiError(err, "Failed to load clinical audit logs."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    return logs.reduce((acc, log) => {
      const key = formatDateLabel(log.created_at);
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});
  }, [logs]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2, p: { xs: 0.5, sm: 1 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Clinical Audit Logs
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Patient record activity trail grouped by date. Entries are human-readable for quick legal and clinical review.
      </Typography>
      <Alert severity="info" icon={false} sx={{ borderRadius: 2 }}>
        <strong>How to use this page.</strong> Every clinical action — consultations,
        prescriptions, check-ins, treatments, payments and record changes — is logged here
        with who did it and when. Use the date filters to review activity for a period; this
        is your tamper-evident trail for compliance and dispute resolution.
      </Alert>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "flex-end" }}>
            <TextField
              size="small"
              type="date"
              label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="contained"
              onClick={() => {
                void fetchLogs({ from: fromDate, to: toDate });
              }}
              disabled={loading}
            >
              Apply
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {Object.keys(grouped).length === 0 ? (
        <Alert severity="info">No clinical audit logs recorded yet.</Alert>
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
                        {contextSummary(log.context) ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {contextSummary(log.context)}
                          </Typography>
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          {log.user?.name || "System"} {log.user?.email ? `(${log.user.email})` : ""}
                        </Typography>
                        {Array.isArray(log.changes_preview) && log.changes_preview.length > 0 ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                            {log.changes_preview.map((change, idx) => (
                              <Chip key={`${log.id}-change-${idx}`} size="small" variant="outlined" label={change} />
                            ))}
                          </Stack>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={moduleLabel(log.module)} />
                        <Chip size="small" label={formatTime(log.created_at)} variant="outlined" />
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
