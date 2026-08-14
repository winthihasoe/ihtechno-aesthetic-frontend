import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { getPatientTimeline } from "../../../services/patientTimelineService";
import { resolveApiError } from "../../../services/apiClient";

export default function PatientTimelineTab({ patientId }) {
  const [filterType, setFilterType] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getPatientTimeline(patientId, filterType ? { type: filterType } : {})
      .then((data) => {
        if (active) setItems(data);
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

  const typeOptions = useMemo(
    () => ["visit", "consultation", "lab", "prescription", "payment", "appointment"],
    [],
  );

  return (
    <Stack spacing={2}>
      <FormControl size="small" sx={{ maxWidth: 260 }}>
        <InputLabel>Filter</InputLabel>
        <Select
          label="Filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <MenuItem value="">All events</MenuItem>
          {typeOptions.map((type) => (
            <MenuItem key={type} value={type}>
              {type.replace(/_/g, " ")}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No timeline records yet.
        </Typography>
      ) : (
        <Stack spacing={1.2}>
          {items.map((item) => (
            <Box key={`${item.type}-${item.reference_id}-${item.event_at}`} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(item.event_at).format("DD-MM-YYYY hh:mm")} · {item.type.replace(/_/g, " ")}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
