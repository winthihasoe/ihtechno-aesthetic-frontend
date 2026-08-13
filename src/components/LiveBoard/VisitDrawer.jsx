import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";

import useUIStore from "../../stores/useUIStore";
import { getVisitStatusConfig } from "../../utils/visitStatuses";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import useAuthStore from "../../stores/authStore";
import useSettingsStore from "../../stores/settingsStore";
import useLiveBoardStore from "../../stores/liveBoardStore";
import ConsultingPanel from "./ConsultingPanel";
import PreparationPanel from "./PreparationPanel";
import TreatmentDrawerSummary from "./TreatmentDrawerSummary";
import WaitingPanel from "./WaitingPanel";

import * as visitService from "../../services/visitService";
import * as consultationService from "../../services/consultationService";
import * as treatmentService from "../../services/treatmentService";
import * as paymentService from "../../services/paymentService";
import { formatKyats } from "../../utils/formatKyats";
import { formatCheckInModeLabel } from "../../utils/checkInModeUtils";
import { confirmIfMissingStagePhotos } from "../../utils/visitStagePhotos";
import {
  canAccessPreparationPanel,
  canHandoverTreatmentDoctor,
  canUseLiveboardButton,
} from "../../utils/roleUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import HandoverCheckInDialog from "./HandoverCheckInDialog";
import HandoverTreatmentDoctorDialog from "./HandoverTreatmentDoctorDialog";

const DRAWER_WIDTH = 620;

function pickDefaultActiveTreatmentId(list, preferredId) {
  if (!list?.length) return null;
  if (preferredId != null && list.some((t) => t.id === preferredId)) {
    return preferredId;
  }
  const incomplete = list.filter((t) => t.status !== "completed");
  if (incomplete.length) {
    return incomplete[incomplete.length - 1].id;
  }
  return list[list.length - 1].id;
}

function VisitStatusChip({ status }) {
  const cfg = getVisitStatusConfig(status);
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.chipColor,
        color: cfg.textColor,
        fontWeight: 600,
        fontSize: 11,
      }}
    />
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
      <Typography variant="body2">{value || "—"}</Typography>
    </Box>
  );
}

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

function formatLineLabel(line) {
  const base = line.label ?? line.type ?? "Line";
  if (line.type === "consultation") {
    const parts = [];
    if (line.foc) parts.push("FOC");
    else if (line.session_fee_enabled === false) parts.push("Fee off");
    if (Number(line.discount_percent) > 0) {
      parts.push(`${line.discount_percent}% off`);
    }
    return parts.length ? `${base} (${parts.join(", ")})` : base;
  }
  return base;
}

function PaymentBillingPanel({ treatment, payment }) {
  const lines = normalizePaymentLines(payment);
  const totals = payment?.items?.totals;
  const treatmentItems = treatment?.items ?? [];

  return (
    <Stack spacing={2}>
      <SectionCard title="Bill">
        {lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No line items yet.
          </Typography>
        ) : (
          lines.map((line, idx) => (
            <InfoRow
              key={`${line.type}-${line.label}-${idx}`}
              label={formatLineLabel(line)}
              value={formatCurrency(line.line_total)}
            />
          ))
        )}
        {totals && (
          <>
            <Divider sx={{ my: 1 }} />
            {totals.consultation != null && (
              <InfoRow
                label="Subtotal (consultation)"
                value={formatCurrency(totals.consultation)}
              />
            )}
            {totals.treatment != null && totals.treatment > 0 && (
              <InfoRow
                label="Subtotal (treatment)"
                value={formatCurrency(totals.treatment)}
              />
            )}
            {totals.other != null && totals.other > 0 && (
              <InfoRow label="Other" value={formatCurrency(totals.other)} />
            )}
          </>
        )}
        <InfoRow label="Total" value={formatCurrency(payment?.amount)} />
        <InfoRow label="Currency" value={payment?.currency ?? "MMK"} />
        <InfoRow label="Payment status" value={payment?.status ?? "—"} />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Treatment records: {treatmentItems.length} item(s)
        </Typography>
      </SectionCard>
    </Stack>
  );
}

function CompletedMockPanel({ visit, consultation, treatment, payment }) {
  const treatmentItems = treatment?.items ?? [];
  return (
    <Stack spacing={2}>
      <SectionCard title="Visit Summary">
        <InfoRow label="Primary Concern" value={consultation?.chief_complaint} />
        <InfoRow label="Assessment" value={consultation?.diagnosis} />
        <InfoRow
          label="Treatment Plan"
          value={consultation?.treatment_plan ?? consultation?.prescribed_treatment}
        />
        <InfoRow label="Treatments Done" value={`${treatmentItems.length} item(s)`} />
        <InfoRow label="Total Paid" value={formatCurrency(payment?.amount)} />
        <InfoRow label="Payment Status" value={payment?.status} />
        <InfoRow
          label="Visit Completed At"
          value={visit?.completed_at ?? visit?.updated_at}
        />
      </SectionCard>
    </Stack>
  );
}

function ConsultingBriefPanel({ visit, consultation }) {
  const followUpLabel = visit?.follow_up === true ? "Yes" : visit?.follow_up === false ? "No" : "—";
  return (
    <Stack spacing={2}>
      <SectionCard title="Patient Brief">
        <InfoRow label="Check-in complaint" value={visit?.notes ?? "—"} />
        <InfoRow label="Follow up" value={followUpLabel} />
        <InfoRow label="Consultation status" value="Consultation in progress" />
        <InfoRow label="Primary concern" value={consultation?.chief_complaint ?? "—"} />
      </SectionCard>
    </Stack>
  );
}

export default function VisitDrawer() {
  const navigate = useNavigate();
  const { drawerOpen, selectedVisitId, drawerContext, closeDrawer } = useUIStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const { user } = useAuthStore();
  const liveboardRules = useSettingsStore((s) => s.settings?.liveboard_rules || {});

  const [visit, setVisit] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [treatmentsList, setTreatmentsList] = useState([]);
  const [activeTreatmentId, setActiveTreatmentId] = useState(null);
  const [payment, setPayment] = useState(null);
  const fetchSeqRef = useRef(0);
  const activeTreatmentIdRef = useRef(null);
  /** Tracks last known visit.status while drawer is open (see treatment-transition close below). */
  const prevVisitStatusForDrawerRef = useRef(null);

  const treatment = useMemo(
    () => treatmentsList.find((t) => t.id === activeTreatmentId) ?? null,
    [treatmentsList, activeTreatmentId],
  );

  const treatmentForSummary = useMemo(() => {
    if (treatmentsList.length) {
      return treatmentsList[treatmentsList.length - 1];
    }
    return treatment;
  }, [treatmentsList, treatment]);
  const [loading, setLoading] = useState(false);
  const [consultationSaving, setConsultationSaving] = useState(false);
  const [consultationSaveError, setConsultationSaveError] = useState("");
  const [consultingHasUnsaved, setConsultingHasUnsaved] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [doctorHandoverOpen, setDoctorHandoverOpen] = useState(false);
  const [acceptingDoctorHandover, setAcceptingDoctorHandover] = useState(false);
  const [acceptingHandover, setAcceptingHandover] = useState(false);

  const updateVisitInBoard = useLiveBoardStore((s) => s.updateVisit);

  const handleVisitPhotoUploaded = useCallback(
    (uploaded) => {
      setVisit((v) => {
        if (!v) return v;
        const photos = [uploaded, ...(v.photos ?? [])];
        updateVisitInBoard({ ...v, photos });
        return { ...v, photos };
      });
    },
    [updateVisitInBoard],
  );

  /** Refresh planned treatments without full drawer reload (keeps scroll position). */
  const refreshVisitTreatmentsList = useCallback(
    async (visitId) => {
      if (!visitId) return;
      try {
        const list = await treatmentService.listVisitTreatments(visitId);
        setTreatmentsList(list);
        const nextId = pickDefaultActiveTreatmentId(list, activeTreatmentIdRef.current);
        activeTreatmentIdRef.current = nextId;
        setActiveTreatmentId(nextId);
      } catch (err) {
        pushToast({
          message: resolveApiError(err, "Could not refresh treatments."),
          severity: "error",
        });
      }
    },
    [pushToast],
  );

  const resolvedContext = useMemo(() => {
    const s = visit?.status;
    if (s === "waiting") return "waiting";
    if (s === "payment") return "payment";
    if (s === "completed") return "completed";
    if (s === "treatment") return "treatment";
    if (s === "preparation") return "preparation";
    if (s === "consulting") return "consulting";
    if (drawerContext) return drawerContext;
    return "waiting";
  }, [drawerContext, visit?.status]);

  const fetchAll = async (id) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const [v, c, tList, py] = await Promise.allSettled([
        visitService.getVisit(id),
        consultationService.getConsultation(id),
        treatmentService.listVisitTreatments(id),
        paymentService.getPayment(id),
      ]);
      if (seq !== fetchSeqRef.current) {
        return;
      }

      if (v.status === "fulfilled") setVisit(v.value ?? null);
      else setVisit(null);

      if (c.status === "fulfilled") setConsultation(c.value ?? null);
      else setConsultation(null);

      let list = [];
      if (tList.status === "fulfilled" && Array.isArray(tList.value)) {
        list = tList.value;
      }
      setTreatmentsList(list);
      if (tList.status !== "fulfilled") {
        activeTreatmentIdRef.current = null;
      }
      const nextId = pickDefaultActiveTreatmentId(list, activeTreatmentIdRef.current);
      activeTreatmentIdRef.current = nextId;
      setActiveTreatmentId(nextId);

      if (py.status === "fulfilled") setPayment(py.value ?? null);
      else setPayment(null);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSaveConsultation = async (payload) => {
    if (!selectedVisitId) return;
    setConsultationSaving(true);
    setConsultationSaveError("");
    try {
      const terminal = new Set(["completed", "cancelled"]);
      const planSessions = treatmentsList.filter((t) => !terminal.has(t.status));
      const sessionPart = planSessions.map((t) => t.name).filter(Boolean).join("; ");
      const notePart = (payload.treatment_plan_notes ?? "").trim();
      const treatmentPlanText = [sessionPart, notePart].filter(Boolean).join("\n\n");
      const treatmentPlanFinal =
        treatmentPlanText ||
        (planSessions.length === 0 && !notePart
          ? consultation?.treatment_plan ?? consultation?.prescribed_treatment ?? ""
          : treatmentPlanText);

      const normalizedPayload = {
        chief_complaint: payload.chief_complaint ?? "",
        doctor_note: payload.doctor_note ?? "",
        assessment_notes: payload.doctor_note ?? "",
        summary: payload.doctor_note ?? "",
        vital_sign_bp: payload.vital_sign_bp ?? "",
        vital_sign_pulse: payload.vital_sign_pulse ?? "",
        vital_sign_temp: payload.vital_sign_temp ?? "",
        vital_sign_spo2: payload.vital_sign_spo2 ?? "",
        examination_note: payload.examination_note ?? "",
        treatment_plan: treatmentPlanFinal,
        prescribed_treatment: treatmentPlanFinal,
        notes: notePart,
        session_fee_enabled: payload.session_fee_enabled ?? true,
        session_fee_amount: payload.session_fee_amount ?? 25000,
        session_discount_percent: payload.session_discount_percent ?? 0,
        session_fee_foc: payload.session_fee_foc ?? false,
        treatment_plan_structured: {
          goal: notePart || payload.doctor_note || "",
          items: planSessions.map((session) => ({
            treatment_id: session.id,
            area: "face",
            sessions_total: 1,
            sessions_completed: session.status === "completed" ? 1 : 0,
            interval_days: 14,
            next_session_date: null,
            status: session.status === "completed" ? "completed" : "planned",
          })),
        },
      };
      const updated = consultation?.id
        ? await consultationService.updateConsultation(consultation.id, normalizedPayload)
        : await consultationService.createConsultation(selectedVisitId, normalizedPayload);

      setConsultation(updated);
      setConsultingHasUnsaved(false);
      pushToast({ message: "Consultation saved.", severity: "success" });
      await fetchAll(selectedVisitId);
      return true;
    } catch (err) {
      const message = resolveApiError(err, "Failed to save consultation.");
      setConsultationSaveError(message);
      pushToast({ message, severity: "error" });
      return false;
    } finally {
      setConsultationSaving(false);
    }
  };

  const handleCheckoutFromConsultation = async () => {
    if (!selectedVisitId) return;
    const { ok, payload } = await confirmIfMissingStagePhotos({
      askConfirm,
      photos: visit?.photos,
      stage: "consultation",
    });
    if (!ok) return;
    setCheckoutLoading(true);
    try {
      const updated = await visitService.checkoutFromConsultation(
        selectedVisitId,
        payload,
      );
      setVisit(updated);
      updateVisitInBoard(updated);
      await fetchAll(selectedVisitId);
      pushToast({ message: "Visit moved to Payment.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to check out from consultation."),
        severity: "error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAttemptCloseDrawer = async () => {
    if (consultingHasUnsaved) {
      const approved = await askConfirm({
        title: "Discard unsaved changes?",
        message: "You have unsaved consultation data. Close and lose changes?",
        confirmText: "Discard",
        cancelText: "Keep editing",
      });
      if (!approved) return;
    }
    setConsultingHasUnsaved(false);
    closeDrawer();
  };

  useEffect(() => {
    if (!drawerOpen) {
      setHandoverOpen(false);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || !selectedVisitId) {
      setVisit(null);
      setConsultation(null);
      setTreatmentsList([]);
      setActiveTreatmentId(null);
      activeTreatmentIdRef.current = null;
      setPayment(null);
      return;
    }
    activeTreatmentIdRef.current = null;
    fetchAll(selectedVisitId);
  }, [drawerOpen, selectedVisitId]);

  useEffect(() => {
    if (!drawerOpen) {
      prevVisitStatusForDrawerRef.current = null;
    }
  }, [drawerOpen]);

  useEffect(() => {
    prevVisitStatusForDrawerRef.current = null;
  }, [selectedVisitId]);

  // When this visit moves into Treatment (board drag or proceed), close the drawer instead of switching panel.
  useEffect(() => {
    if (!drawerOpen || !selectedVisitId || !visit?.id || String(visit.id) !== String(selectedVisitId)) {
      return;
    }
    const next = visit.status;
    const prev = prevVisitStatusForDrawerRef.current;
    if (next === "treatment" && prev != null && prev !== "treatment") {
      setConsultingHasUnsaved(false);
      closeDrawer();
      return;
    }
    if (next != null) {
      prevVisitStatusForDrawerRef.current = next;
    }
  }, [drawerOpen, selectedVisitId, visit?.id, visit?.status, closeDrawer]);

  const patientName =
    visit?.patient?.full_name ?? visit?.patient?.name ?? "Patient";
  const patientInitial = patientName[0]?.toUpperCase() ?? "P";
  const patientDob = visit?.patient?.date_of_birth ?? visit?.patient?.dob ?? null;
  const patientAge =
    patientDob && dayjs(patientDob).isValid()
      ? dayjs().diff(dayjs(patientDob), "year")
      : null;
  const checkInComplaint = visit?.notes || "—";
  const checkInModeLabel = formatCheckInModeLabel(visit?.check_in_mode);
  const checkedInByName = visit?.check_in_staff?.name ?? "—";
  const showHandover = canUseLiveboardButton(
    user,
    visit,
    "handover_request",
    liveboardRules,
  );
  const pendingToId =
    visit?.check_in_handover_to_id ?? visit?.check_in_handover_to?.id ?? null;
  const pendingByName =
    visit?.check_in_handover_requested_by?.name ?? "another staff member";
  const isPendingReceiver =
    pendingToId != null && Number(pendingToId) === Number(user?.id);
  const doctorPendingToId =
    visit?.doctor_handover_to_id ?? visit?.doctor_handover_to?.id ?? null;
  const doctorPendingByName =
    visit?.doctor_handover_requested_by?.name ?? "another doctor";
  const isPendingDoctorReceiver =
    doctorPendingToId != null && Number(doctorPendingToId) === Number(user?.id);
  const showDoctorHandover =
    visit?.status === "treatment" && canHandoverTreatmentDoctor(user, visit);

  const handleAcceptHandover = async () => {
    if (!visit?.id || !isPendingReceiver) return;
    setAcceptingHandover(true);
    try {
      const updated = await visitService.acceptCheckInHandover(visit.id);
      setVisit(updated);
      updateVisitInBoard(updated);
      void fetchAll(updated.id);
      pushToast({ message: "Handover accepted.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not accept handover."),
        severity: "error",
      });
    } finally {
      setAcceptingHandover(false);
    }
  };

  const handleAcceptDoctorHandover = async () => {
    if (!visit?.id || !isPendingDoctorReceiver) return;
    setAcceptingDoctorHandover(true);
    try {
      const updated = await visitService.acceptTreatmentDoctorHandover(visit.id);
      setVisit(updated);
      updateVisitInBoard(updated);
      void fetchAll(updated.id);
      pushToast({ message: "Treatment handover accepted.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not accept treatment handover."),
        severity: "error",
      });
    } finally {
      setAcceptingDoctorHandover(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={handleAttemptCloseDrawer}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: DRAWER_WIDTH },
          borderRadius: { sm: "24px 0 0 24px" },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.25, sm: 2.5 },
          py: { xs: 1.25, sm: 2 },
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 1.5 },
          flexShrink: 0,
        }}
      >
        <Avatar
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            width: 40,
            height: 40,
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {patientInitial}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {patientName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Check-in complaint: {checkInComplaint}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Check-in mode: {checkInModeLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Age: {patientAge ?? "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Checked in by: {checkedInByName}
          </Typography>
          {isPendingReceiver ? (
            <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.25 }}>
              {pendingByName} handed this patient to you. Accept to receive.
            </Typography>
          ) : null}
          {visit?.status === "treatment" && isPendingDoctorReceiver ? (
            <Typography variant="caption" color="info.main" sx={{ display: "block", mt: 0.25 }}>
              {doctorPendingByName} handed treatment to you. Accept to work in the Treatment Room.
            </Typography>
          ) : null}
        </Box>
        {visit?.status && <VisitStatusChip status={visit.status} />}
        {showHandover ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setHandoverOpen(true)}
            sx={{ flexShrink: 0, fontSize: 11, py: 0.25, px: 1 }}
          >
            Hand over
          </Button>
        ) : null}
        {isPendingReceiver ? (
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => void handleAcceptHandover()}
            disabled={acceptingHandover}
            sx={{ flexShrink: 0, fontSize: 11, py: 0.25, px: 1 }}
          >
            {acceptingHandover ? "Accepting..." : "Accept"}
          </Button>
        ) : null}
        {visit?.status === "treatment" && isPendingDoctorReceiver ? (
          <Button
            size="small"
            variant="contained"
            color="info"
            onClick={() => void handleAcceptDoctorHandover()}
            disabled={acceptingDoctorHandover}
            sx={{ flexShrink: 0, fontSize: 11, py: 0.25, px: 1 }}
          >
            {acceptingDoctorHandover ? "Accepting..." : "Accept treatment"}
          </Button>
        ) : null}
        {showDoctorHandover ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setDoctorHandoverOpen(true)}
            sx={{ flexShrink: 0, fontSize: 11, py: 0.25, px: 1 }}
          >
            Hand over doctor
          </Button>
        ) : null}
        <IconButton
          size="small"
          onClick={() => selectedVisitId && fetchAll(selectedVisitId)}
          title="Refresh"
          sx={{ ml: 0.5 }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => handleAttemptCloseDrawer(e, "closeButton")}
          title="Close drawer"
          aria-label="Close drawer"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: { xs: 1.25, sm: 2.5 } }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {resolvedContext === "consulting" && (
              <ConsultingPanel
                visit={visit}
                consultation={consultation}
                visitTreatments={treatmentsList}
                onVisitTreatmentsChange={() => selectedVisitId && fetchAll(selectedVisitId)}
                onSave={handleSaveConsultation}
                saving={consultationSaving}
                saveError={consultationSaveError}
                onUnsavedChange={setConsultingHasUnsaved}
                onCheckoutFromConsultation={handleCheckoutFromConsultation}
                checkoutLoading={checkoutLoading}
              />
            )}
            {resolvedContext === "consulting_brief" && (
              <ConsultingBriefPanel visit={visit} consultation={consultation} />
            )}
            {resolvedContext === "waiting" && visit && (
              <WaitingPanel
                visit={visit}
                user={user}
                onVisitUpdated={(updatedVisit) => {
                  setVisit(updatedVisit);
                  updateVisitInBoard(updatedVisit);
                  void fetchAll(updatedVisit.id);
                }}
              />
            )}
            {resolvedContext === "preparation" && visit && (
              <>
                {canAccessPreparationPanel(user, visit) ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 2 }}
                    onClick={() => {
                      closeDrawer();
                      navigate(
                        `${getWorkspaceUrlPrefix(user)}/visits/${visit.id}/preparation-room`,
                      );
                    }}
                  >
                    Open Pre-treatment Room
                  </Button>
                ) : null}
                <PreparationPanel
                visit={visit}
                consultation={consultation}
                visitTreatments={treatmentsList}
                onVisitTreatmentsChange={() =>
                  selectedVisitId && refreshVisitTreatmentsList(selectedVisitId)
                }
                onVisitPhotoUploaded={handleVisitPhotoUploaded}
                onVisitUpdated={(updatedVisit) => {
                  setVisit(updatedVisit);
                  updateVisitInBoard(updatedVisit);
                }}
                onProceedToTreatment={async () => {
                  if (!selectedVisitId) return;
                  const { ok, payload } = await confirmIfMissingStagePhotos({
                    askConfirm,
                    photos: visit?.photos,
                    stage: "preparation",
                  });
                  if (!ok) return;
                  try {
                    const updated = await visitService.sendToTreatment(
                      selectedVisitId,
                      payload,
                    );
                    setVisit(updated);
                    updateVisitInBoard(updated);
                    await fetchAll(selectedVisitId);
                    pushToast({ message: "Visit moved to Treatment.", severity: "success" });
                  } catch (err) {
                    pushToast({
                      message: resolveApiError(err, "Unable to proceed to treatment."),
                      severity: "error",
                    });
                  }
                }}
              />
              </>
            )}
            {resolvedContext === "treatment" && (
              <TreatmentDrawerSummary
                visit={visit}
                consultation={consultation}
                user={user}
                onVisitPhotoUploaded={handleVisitPhotoUploaded}
                onVisitUpdated={(updatedVisit) => {
                  setVisit(updatedVisit);
                  updateVisitInBoard(updatedVisit);
                  fetchAll(updatedVisit.id);
                }}
                onFormsSaved={() => selectedVisitId && fetchAll(selectedVisitId)}
              />
            )}
            {resolvedContext === "payment" && (
              <PaymentBillingPanel
                treatment={treatmentForSummary}
                payment={payment}
              />
            )}
            {resolvedContext === "completed" && (
              <CompletedMockPanel
                visit={visit}
                consultation={consultation}
                treatment={treatmentForSummary}
                payment={payment}
              />
            )}
            {!["waiting", "consulting", "consulting_brief", "preparation", "treatment", "payment", "completed"].includes(
              resolvedContext,
            ) && (
              <WaitingPanel
                visit={visit}
                user={user}
                onVisitUpdated={(updatedVisit) => {
                  setVisit(updatedVisit);
                  updateVisitInBoard(updatedVisit);
                  void fetchAll(updatedVisit.id);
                }}
              />
            )}
          </>
        )}
      </Box>
      <HandoverCheckInDialog
        open={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        visit={visit}
        user={user}
        onSuccess={(updated) => {
          setVisit(updated);
          updateVisitInBoard(updated);
          void fetchAll(updated.id);
        }}
      />
      <HandoverTreatmentDoctorDialog
        open={doctorHandoverOpen}
        onClose={() => setDoctorHandoverOpen(false)}
        visit={visit}
        treatments={treatmentsList}
        user={user}
        onSuccess={(updated) => {
          setVisit(updated);
          updateVisitInBoard(updated);
          void fetchAll(updated.id);
        }}
      />
    </Drawer>
  );
}
