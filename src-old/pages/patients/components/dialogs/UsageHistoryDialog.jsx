import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import LoadingIndicator from "../../../../components/common/LoadingIndicator";
import dayjs from "dayjs";
import { getPatientPackageUsages } from "../../../../services/packageService";
import PatientTabEmptyState from "../PatientTabEmptyState";

export default function UsageHistoryDialog({ patientPackage, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [treatmentFilter, setTreatmentFilter] = useState("");

  useEffect(() => {
    if (!patientPackage?.id) return;
    setLoading(true);
    getPatientPackageUsages(patientPackage.id)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [patientPackage]);

  const treatments = useMemo(() => {
    const names = new Set();
    rows.forEach((r) => {
      const n = r.treatment_template?.name || r.treatment?.name;
      if (n) names.add(n);
    });
    return [...names];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (treatmentFilter && (r.treatment_template?.name || r.treatment?.name) !== treatmentFilter) return false;
      const usedAt = r.used_at ? dayjs(r.used_at) : null;
      if (dateFrom && usedAt && usedAt.isBefore(dayjs(dateFrom), "day")) return false;
      if (dateTo && usedAt && usedAt.isAfter(dayjs(dateTo), "day")) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, treatmentFilter]);

  return (
    <Dialog open={Boolean(patientPackage)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Usage history — {patientPackage?.package?.name ?? ""}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Treatment</InputLabel>
            <Select label="Treatment" value={treatmentFilter} onChange={(e) => setTreatmentFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {treatments.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <LoadingIndicator size={28} />
        ) : filtered.length === 0 ? (
          <PatientTabEmptyState
            title="No package usage recorded yet"
            description="Usage entries are created when sessions are consumed during visits."
            steps={["Use package session in a patient visit.", "Complete treatment and save visit."]}
            previewFields={["When", "Sessions used", "Visit", "Treatment", "Staff"]}
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Sessions</TableCell>
                <TableCell>Visit</TableCell>
                <TableCell>Treatment</TableCell>
                <TableCell>Staff</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.used_at ? dayjs(u.used_at).format("DD-MM-YYYY HH:mm") : "—"}</TableCell>
                  <TableCell>{u.used_sessions}</TableCell>
                  <TableCell>{u.visit_id ? `#${u.visit_id}` : "—"}</TableCell>
                  <TableCell>{u.treatment_template?.name || u.treatment?.name || "—"}</TableCell>
                  <TableCell>{u.recorded_by?.name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
