import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";
import { getVisit } from "../../../services/visitService";
import { resolveApiError } from "../../../services/apiClient";
import VisitReferenceHeader from "./VisitReferenceHeader";
import { formatKyats } from "../../../utils/formatKyats";

function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function PatientVisitsTab({ visits }) {
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () =>
      [...(visits ?? [])].sort((a, b) => {
        const ta = dayjs(a.visit_time ?? a.created_at).valueOf();
        const tb = dayjs(b.visit_time ?? b.created_at).valueOf();
        return tb - ta;
      }),
    [visits],
  );

  useEffect(() => {
    if (!sorted.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev != null && sorted.some((v) => String(v.id) === String(prev))) {
        return prev;
      }
      return sorted[0].id;
    });
  }, [sorted]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const v = await getVisit(id);
      setDetail(v);
    } catch (err) {
      setDetail(null);
      setError(resolveApiError(err, "Could not load visit."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  if (!sorted.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No visits recorded for this patient yet.
      </Typography>
    );
  }

  const consultation =
    detail?.consultation ?? detail?.consultations?.[0] ?? null;
  const treatments = detail?.treatments ?? [];

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      alignItems="flex-start"
    >
      <Stack spacing={1} sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Visits
        </Typography>
        {sorted.map((v) => {
          const active = String(selectedId) === String(v.id);
          return (
            <Card
              key={v.id}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: "pointer",
                borderColor: active ? "primary.main" : "divider",
                bgcolor: active ? "action.selected" : "background.paper",
              }}
              onClick={() => setSelectedId(v.id)}
            >
              <VisitReferenceHeader visit={v} />
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mt: 0.75 }}
              >
                <Typography variant="caption" color="text.secondary">
                  #{v.id}
                </Typography>
                {v.status && (
                  <Chip
                    label={v.status}
                    size="small"
                    sx={{ textTransform: "capitalize" }}
                  />
                )}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <Card
        variant="outlined"
        sx={{ flex: 1, width: "100%", p: 2, minHeight: 320 }}
      >
        {!selectedId && (
          <Typography variant="body2" color="text.secondary">
            Select a visit to view full visit details.
          </Typography>
        )}
        {selectedId && loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {selectedId && !loading && error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        {selectedId && !loading && detail && !error && (
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <VisitReferenceHeader visit={detail} />
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => loadDetail(selectedId)}
              >
                Refresh
              </Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <DetailSection title="Consultation">
              {consultation ? (
                <Stack spacing={1}>
                  {consultation.chief_complaint && (
                    <Typography variant="body2">
                      <strong>Primary concern:</strong>{" "}
                      {consultation.chief_complaint}
                    </Typography>
                  )}
                  {consultation.diagnosis && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      <strong>Assessment:</strong> {consultation.diagnosis}
                    </Typography>
                  )}
                  {consultation.assessment_notes && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      <strong>Assessment:</strong>{" "}
                      {consultation.assessment_notes}
                    </Typography>
                  )}
                  {consultation.treatment_plan && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      <strong>Plan:</strong> {consultation.treatment_plan}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No consultation on file.
                </Typography>
              )}
            </DetailSection>

            <DetailSection title="Treatment">
              {treatments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No treatments recorded.
                </Typography>
              ) : (
                treatments.map((t) => {
                  const items = t.items ?? [];
                  return (
                    <Box key={t.id} sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {t.name || "Treatment"}
                      </Typography>
                      {items.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t.notes || "No line items."}
                        </Typography>
                      ) : (
                        <Table size="small" sx={{ mt: 1 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Procedure
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Product
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Area
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {item.procedure_name || "—"}
                                </TableCell>
                                <TableCell>
                                  {item.product_name || "—"}
                                </TableCell>
                                <TableCell>
                                  {item.treatment_area || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  );
                })
              )}
            </DetailSection>

            <DetailSection title="Photos">
              {(detail.photos ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No photos.
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {detail.photos.map((ph) => (
                    <Box
                      key={ph.id}
                      component="img"
                      src={ph.url}
                      alt={ph.type}
                      sx={{
                        width: 96,
                        height: 96,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                      }}
                    />
                  ))}
                </Stack>
              )}
            </DetailSection>

            <DetailSection title="Payment">
              {!detail.payment ? (
                <Typography variant="body2" color="text.secondary">
                  No payment record.
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography variant="body2">
                    {formatKyats(detail.payment.amount || 0)}
                  </Typography>
                  <Chip
                    size="small"
                    label={detail.payment.status === "paid" ? "Paid" : "Unpaid"}
                    color={
                      detail.payment.status === "paid" ? "success" : "warning"
                    }
                  />
                </Stack>
              )}
            </DetailSection>
          </Box>
        )}
      </Card>
    </Stack>
  );
}
