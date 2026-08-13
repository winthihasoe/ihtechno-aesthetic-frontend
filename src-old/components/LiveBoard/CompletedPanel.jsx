import { useMemo } from "react";
import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { formatKyats } from "../../utils/formatKyats";

function SectionCard({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.25, sm: 2 } }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function InfoRow({ label, value }) {
  return (
    <Box
      sx={{
        display: "flex",
        py: 0.75,
        borderBottom: "1px solid",
        borderColor: "divider",
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ width: 170, flexShrink: 0, pt: 0.1 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function EmptyHint({ children }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  );
}

/** Human-readable date/time: DD-MM-YYYY or DD-MM-YYYY HH:mm. */
function formatDisplayDateTime(value) {
  if (!value) return "—";
  const raw = String(value);
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) && raw.length <= 10) {
    return parsed.format("DD-MM-YYYY");
  }
  return parsed.format("DD-MM-YYYY HH:mm");
}

function formatCurrency(amount) {
  if (amount == null || amount === "") return "—";
  return formatKyats(amount);
}

function normalizePaymentLines(payment) {
  const raw = payment?.items;
  if (!raw) return [];
  if (Array.isArray(raw.lines)) return raw.lines;
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.name != null) {
    return raw.map((row) => ({
      type: "other",
      label: row.name,
      line_total: Number(row.price ?? 0),
    }));
  }
  return [];
}

function sessionStatusLabel(status) {
  if (!status) return "—";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "in_progress") return "In progress";
  if (status === "planned") return "Planned";
  return String(status).replace(/_/g, " ");
}

/**
 * Read-only summary for completed visits on the Live Board drawer.
 */
export default function CompletedPanel({
  visit,
  consultation,
  visitTreatments = [],
  payment,
}) {
  const sessions = useMemo(() => {
    if (Array.isArray(visitTreatments) && visitTreatments.length > 0) {
      return [...visitTreatments].sort((a, b) => Number(a.id) - Number(b.id));
    }
    const fromVisit = visit?.treatments;
    return Array.isArray(fromVisit)
      ? [...fromVisit].sort((a, b) => Number(a.id) - Number(b.id))
      : [];
  }, [visitTreatments, visit?.treatments]);

  const treatmentPlan =
    consultation?.treatment_plan ?? consultation?.prescribed_treatment ?? "—";

  const medicinesApplied = useMemo(() => {
    const rows = [];
    for (const session of sessions) {
      const committed = session.patient_treatment_products ?? [];
      for (const line of committed) {
        rows.push({
          key: `ptp-${line.id}`,
          sessionName: session.name ?? `Session #${session.id}`,
          productName: line.product?.name ?? "—",
          batch: line.batch?.batch_number ?? line.batch_id ?? "—",
          qty: line.quantity_used ?? "—",
        });
      }
    }
    return rows;
  }, [sessions]);

  const prescribedMedicines = useMemo(() => {
    const items = consultation?.prescription?.items ?? [];
    return items.map((item, idx) => ({
      key: `rx-${item.id ?? idx}`,
      name: item.product?.name ?? item.medicine_name ?? item.name ?? "—",
      qty: item.quantity ?? item.qty ?? "—",
      instructions: item.instructions ?? item.dosage ?? "",
    }));
  }, [consultation?.prescription?.items]);

  const packagesBought = useMemo(() => {
    const sold = visit?.sold_patient_packages ?? [];
    if (Array.isArray(sold) && sold.length > 0) {
      return sold.map((row) => ({
        key: `sold-${row.id}`,
        name: row.package?.name ?? "Package",
        detail:
          row.total_price != null ? formatCurrency(row.total_price) : null,
      }));
    }
    const lines = normalizePaymentLines(payment).filter(
      (line) => line.type === "package",
    );
    return lines.map((line, idx) => ({
      key: `pay-pkg-${idx}`,
      name: line.label ?? "Package",
      detail: formatCurrency(line.line_total ?? line.unit_price),
    }));
  }, [visit?.sold_patient_packages, payment]);

  const packagesUsed = useMemo(() => {
    const usages = visit?.package_usages ?? [];
    if (Array.isArray(usages) && usages.length > 0) {
      return usages.map((usage) => {
        const item = usage.patient_package_item;
        const packageName = item?.patient_package?.package?.name ?? "Package";
        const templateName = item?.treatment_template?.name;
        const sessionsUsed = usage.used_sessions ?? 1;
        return {
          key: `usage-${usage.id}`,
          label: templateName
            ? `${packageName} — ${templateName}`
            : packageName,
          detail: `${sessionsUsed} session(s)`,
        };
      });
    }
    const lines = normalizePaymentLines(payment).filter(
      (line) => line.type === "package_discount",
    );
    return lines.map((line, idx) => ({
      key: `pay-usage-${idx}`,
      label: line.label ?? "Package coverage",
      detail:
        line.qty != null
          ? `${line.qty} session(s)`
          : line.meta?.coverage_sessions != null
            ? `${line.meta.coverage_sessions} session(s)`
            : null,
    }));
  }, [visit?.package_usages, payment]);

  const followUpDate =
    consultation?.next_follow_up?.date ??
    sessions.find((s) => s.follow_up_date)?.follow_up_date ??
    null;

  const followUpNote =
    consultation?.next_follow_up?.note ??
    consultation?.next_follow_up?.purpose ??
    null;

  const noteBlocks = useMemo(() => {
    const blocks = [];
    if (visit?.notes?.trim()) {
      blocks.push({
        key: "visit",
        label: "Check-in / visit notes",
        text: visit.notes.trim(),
      });
    }
    const consultNote =
      consultation?.doctor_note?.trim() ||
      consultation?.assessment_notes?.trim() ||
      consultation?.notes?.trim() ||
      "";
    if (consultNote) {
      blocks.push({
        key: "consult",
        label: "Consultation notes",
        text: consultNote,
      });
    }
    if (consultation?.prescription?.notes?.trim()) {
      blocks.push({
        key: "rx-notes",
        label: "Prescription notes",
        text: consultation.prescription.notes.trim(),
      });
    }
    for (const session of sessions) {
      if (session.notes?.trim()) {
        blocks.push({
          key: `session-${session.id}`,
          label: `Session notes — ${session.name ?? `#${session.id}`}`,
          text: session.notes.trim(),
        });
      }
    }
    return blocks;
  }, [visit?.notes, consultation, sessions]);

  const completedAt = visit?.completed_at ?? null;

  return (
    <Stack spacing={2}>
      <SectionCard title="Visit summary">
        <InfoRow
          label="Chief complaint"
          value={consultation?.chief_complaint ?? visit?.notes}
        />
        <InfoRow label="Diagnosis" value={consultation?.diagnosis} />
        <InfoRow label="Treatment plan" value={treatmentPlan} />
        <InfoRow
          label="Follow-up date"
          value={
            followUpDate
              ? [
                  formatDisplayDateTime(followUpDate),
                  followUpNote ? `(${followUpNote})` : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : "—"
          }
        />
        <InfoRow
          label="Visit completed at"
          value={formatDisplayDateTime(completedAt)}
        />
        <InfoRow label="Total paid" value={formatCurrency(payment?.amount)} />
        <InfoRow label="Payment status" value={payment?.status} />
      </SectionCard>

      <SectionCard title="Treatments done">
        {sessions.length === 0 ? (
          <EmptyHint>No treatment sessions recorded.</EmptyHint>
        ) : (
          <Stack spacing={1}>
            {sessions.map((session) => (
              <Box
                key={session.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1.25,
                  py: 1,
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {session.name ?? `Session #${session.id}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status: {sessionStatusLabel(session.status)}
                  {session.completed_at
                    ? ` · Done ${formatDisplayDateTime(session.completed_at)}`
                    : ""}
                  {session.treatment_template?.name
                    ? ` · ${session.treatment_template.name}`
                    : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title="Medicine applied">
        {medicinesApplied.length === 0 ? (
          <EmptyHint>No products recorded on treatment sessions.</EmptyHint>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: 12, color: "text.primary" }}
                >
                  Product
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: 12, color: "text.primary" }}
                >
                  Session
                </TableCell>

                <TableCell
                  sx={{ fontWeight: 700, fontSize: 12, color: "text.primary" }}
                >
                  Qty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {medicinesApplied.map((row) => (
                <TableRow key={row.key}>
                  <TableCell sx={{ fontSize: 12 }}>{row.productName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.sessionName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {prescribedMedicines.length > 0 ? (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Prescribed medicines
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              {prescribedMedicines.map((row) => (
                <Typography key={row.key} variant="body2">
                  {row.name}
                  {row.qty != null && row.qty !== "—" ? ` × ${row.qty}` : ""}
                  {row.instructions ? ` — ${row.instructions}` : ""}
                </Typography>
              ))}
            </Stack>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Packages bought">
        {packagesBought.length === 0 ? (
          <EmptyHint>No packages purchased on this visit.</EmptyHint>
        ) : (
          <Stack spacing={0.75}>
            {packagesBought.map((row) => (
              <InfoRow
                key={row.key}
                label={row.name}
                value={row.detail ?? "Purchased"}
              />
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title="Packages used">
        {packagesUsed.length === 0 ? (
          <EmptyHint>No package sessions used on this visit.</EmptyHint>
        ) : (
          <Stack spacing={0.75}>
            {packagesUsed.map((row) => (
              <InfoRow
                key={row.key}
                label={row.label}
                value={row.detail ?? "Used"}
              />
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title="Notes">
        {noteBlocks.length === 0 ? (
          <EmptyHint>No notes recorded.</EmptyHint>
        ) : (
          <Stack spacing={1.25}>
            {noteBlocks.map((block) => (
              <Box key={block.key}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 0.25 }}
                >
                  {block.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {block.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
