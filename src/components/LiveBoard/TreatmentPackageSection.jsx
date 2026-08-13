import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import {
  getVisitPatientPackageItems,
  postVisitPackageUsage,
} from "../../services/packageService";
import { getVisit } from "../../services/visitService";

export default function TreatmentPackageSection({
  visit,
  session,
  sessionCompleted,
  canAssign,
  onVisitUpdated,
}) {
  const { pushToast } = useToastStore();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [qtyByLine, setQtyByLine] = useState({});

  const refreshVisit = useCallback(async () => {
    const v = await getVisit(visit.id);
    onVisitUpdated?.(v);
  }, [visit.id, onVisitUpdated]);

  const loadLines = useCallback(async () => {
    if (visit?.status !== "treatment" || sessionCompleted) {
      setLines([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getVisitPatientPackageItems(visit.id);
      const list = Array.isArray(data) ? data : [];
      const tid = session?.treatment_template_id;
      const filtered =
        tid == null
          ? list
          : list.filter(
              (row) =>
                Number(row?.treatment_template_id) === Number(tid) ||
                Number(row?.treatment_template?.id) === Number(tid),
            );
      setLines(filtered);
      const nextQty = {};
      filtered.forEach((row) => {
        nextQty[row.id] = "1";
      });
      setQtyByLine(nextQty);
    } catch {
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [visit?.status, visit.id, session?.treatment_template_id, sessionCompleted]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const handleUse = async (patientPackageItemId) => {
    const raw = qtyByLine[patientPackageItemId] ?? "1";
    const used = Math.max(0.25, parseFloat(String(raw)) || 1);
    setUsingId(patientPackageItemId);
    try {
      await postVisitPackageUsage(visit.id, {
        patient_package_item_id: patientPackageItemId,
        used_sessions: used,
        treatment_id: session?.id ?? null,
      });
      pushToast({ message: "Package session recorded.", severity: "success" });
      await refreshVisit();
      await loadLines();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not use package session."),
        severity: "error",
      });
    } finally {
      setUsingId(null);
    }
  };

  if (visit?.status !== "treatment" || sessionCompleted || !canAssign) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Prepaid package (this session)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Lines match this session&apos;s treatment preset when one is selected. Recording usage here
        deducts prepaid sessions; inventory still follows <strong>Mark session done</strong> (FIFO on
        products above).
      </Typography>
      {loading ? (
        <CircularProgress size={22} />
      ) : lines.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          No active prepaid lines for this preset on this patient (or beneficiary) for this visit.
        </Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#F4F5F7" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Package</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Treatment</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Remaining</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Use</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((row) => (
              <TableRow key={row.id}>
                <TableCell sx={{ fontSize: 12 }}>
                  {row.patient_package?.package?.name ?? "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {row.treatment_template?.name ?? "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{row.remaining_sessions}</TableCell>
                <TableCell sx={{ fontSize: 12, width: 100 }}>
                  <TextField
                    type="number"
                    size="small"
                    value={qtyByLine[row.id] ?? "1"}
                    onChange={(e) =>
                      setQtyByLine((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    inputProps={{ min: 0.25, step: 0.25 }}
                    sx={{ width: 88 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleUse(row.id)}
                    disabled={usingId === row.id}
                  >
                    {usingId === row.id ? <CircularProgress size={18} /> : "Use"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
