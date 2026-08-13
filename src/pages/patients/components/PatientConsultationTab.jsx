import dayjs from "dayjs";
import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import VisitReferenceHeader from "./VisitReferenceHeader";
import PrescriptionSummaryBlock from "../../../components/prescription/PrescriptionSummaryBlock";

function Field({ label, children }) {
  if (children == null || children === "") return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.3, whiteSpace: "pre-wrap" }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function PatientConsultationTab({ visits }) {
  const rows = (visits ?? [])
    .map((visit) => {
      const consultation = visit.consultations?.[0] ?? visit.consultation ?? null;
      const prescription = consultation
        ? (visit.prescriptions ?? []).find(
            (rx) => rx.consultation_id === consultation.id,
          ) ?? null
        : null;
      return { visit, consultation, prescription };
    })
    .filter(({ consultation }) => consultation)
    .sort((a, b) => {
      const ta = dayjs(a.visit.visit_time ?? a.visit.created_at).valueOf();
      const tb = dayjs(b.visit.visit_time ?? b.visit.created_at).valueOf();
      return tb - ta;
    });

  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No consultation records yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {rows.map(({ visit, consultation, prescription }) => {
        const recordDoc = consultation.doctor?.name?.trim() || "";
        const visitDoc = visit.doctor?.name?.trim() || "";
        const showRecordDoctor = recordDoc && recordDoc !== visitDoc;
        return (
          <Card key={`${visit.id}-${consultation.id}`} variant="outlined" sx={{ p: 2 }}>
            <VisitReferenceHeader visit={visit} sx={{ mb: 1 }} />
            {showRecordDoctor && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Consulting physician (record): {recordDoc}
              </Typography>
            )}
            <Stack spacing={1.25}>
              <Field label="Primary concern">{consultation.chief_complaint}</Field>
              <Field label="Assessment">{consultation.diagnosis}</Field>
              <Field label="Assessment notes">{consultation.assessment_notes}</Field>
              <Field label="Treatment plan">{consultation.treatment_plan}</Field>
              {consultation.recommended_sessions != null && consultation.recommended_sessions !== "" && (
                <Field label="Recommended sessions">{String(consultation.recommended_sessions)}</Field>
              )}
              <Field label="Summary">{consultation.summary}</Field>
              <Field label="Prescribed treatment">{consultation.prescribed_treatment}</Field>
              <Field label="Notes">{consultation.notes}</Field>
            </Stack>
            {prescription && (
              <Box sx={{ mt: 2 }}>
                <PrescriptionSummaryBlock prescription={prescription} compact />
              </Box>
            )}
            <Divider sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Visit #{visit.id} · Status: {visit.status ?? "—"}
            </Typography>
          </Card>
        );
      })}
    </Stack>
  );
}
