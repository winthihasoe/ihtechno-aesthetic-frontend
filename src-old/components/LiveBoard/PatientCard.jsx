import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Stack,
  LinearProgress,
  Button,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StatusChip from "../common/StatusChip";
import ActionButtons from "./ActionButtons";
import useUIStore from "../../stores/useUIStore";
import {
  canUseLiveboardButton,
  canAccessTreatmentRoom,
  canOpenLiveboardVisitPanel,
} from "../../utils/roleUtils";
import {
  getPatientDetailPath,
  getWorkspaceUrlPrefix,
} from "../../utils/workspaceRoutes";
import { formatCheckInModeLabel } from "../../utils/checkInModeUtils";
import {
  formatLiveboardDuration,
  formatLiveboardRelativeTime,
} from "../../utils/liveboardTimeUtils";
import {
  acceptCheckInHandover,
  acceptTreatmentDoctorHandover,
} from "../../services/visitService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useSettingsStore from "../../stores/settingsStore";

export default function PatientCard({
  visit,
  user,
  onAction,
  onOpenVisit,
  onOpenDenied,
  onHandoverComplete,
  pending = false,
  disableMarkTreatmentDone = false,
  markTreatmentDoneDisabledReason = "",
}) {
  const { openDrawer } = useUIStore();
  const pushToast = useToastStore((s) => s.pushToast);
  const liveboardRules = useSettingsStore(
    (s) => s.settings?.liveboard_rules || {},
  );
  const navigate = useNavigate();
  const [, bumpTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => bumpTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Normalize API shape vs legacy mock shape
  const patientName = visit.patient?.name ?? visit.patientName ?? "Unknown";
  const queueNumber = visit.queue_number ?? visit.queueNumber ?? "—";
  const visitTime = visit.visited_at ?? visit.created_at ?? visit.visitTime;
  const doctorName = visit.doctor?.name ?? visit.doctorName;
  const therapistsList = Array.isArray(visit.therapists)
    ? visit.therapists
    : [];
  const therapistName =
    therapistsList
      .map((t) => t.name)
      .filter(Boolean)
      .join(", ") ||
    visit.therapist?.name ||
    visit.therapistName;
  const checkInModeLabel = formatCheckInModeLabel(visit.check_in_mode);
  const checkedInByName = visit.check_in_staff?.name ?? null;
  const [acceptingHandover, setAcceptingHandover] = useState(false);
  const [acceptingDoctorHandover, setAcceptingDoctorHandover] = useState(false);
  const pendingToId =
    visit.check_in_handover_to_id ?? visit.check_in_handover_to?.id;
  const pendingByName =
    visit.check_in_handover_requested_by?.name ?? "another staff member";
  const isPendingReceiver =
    pendingToId != null && Number(pendingToId) === Number(user?.id);
  const canAcceptHandover = canUseLiveboardButton(
    user,
    visit,
    "handover_accept",
    liveboardRules,
  );
  const doctorPendingToId =
    visit.doctor_handover_to_id ?? visit.doctor_handover_to?.id ?? null;
  const doctorPendingByName =
    visit.doctor_handover_requested_by?.name ?? "another doctor";
  const doctorHandoverScope = visit.doctor_handover_scope ?? "all";
  const doctorHandoverSessionName =
    visit.doctor_handover_treatment?.name ??
    (visit.doctor_handover_treatment_id
      ? `Session #${visit.doctor_handover_treatment_id}`
      : null);
  const isPendingDoctorReceiver =
    doctorPendingToId != null && Number(doctorPendingToId) === Number(user?.id);
  const canAcceptDoctorHandover = canUseLiveboardButton(
    user,
    visit,
    "doctor_handover_accept",
    liveboardRules,
  );

  const stageStartedAt = visit.stage_started_at
    ? dayjs(visit.stage_started_at)
    : null;
  const now = dayjs();
  const fallbackWaitMinutes = visitTime
    ? now.diff(dayjs(visitTime), "minute")
    : 0;
  const waitingMinutes =
    visit.status === "waiting" && visitTime
      ? now.diff(dayjs(visitTime), "minute")
      : (visit.waiting_duration_minutes ?? fallbackWaitMinutes);
  const stageMinutes =
    stageStartedAt && stageStartedAt.isValid()
      ? now.diff(stageStartedAt, "minute")
      : (visit.stage_duration_minutes ?? fallbackWaitMinutes);
  const durationLabel =
    visit.status === "waiting"
      ? `${formatLiveboardDuration(waitingMinutes)} waiting`
      : `${formatLiveboardDuration(stageMinutes)} in ${visit.status}`;
  const drawerContextByStatus = {
    waiting: "waiting",
    consulting: "consulting_brief",
    preparation: "preparation_brief",
    treatment: "treatment",
    payment: "payment",
    completed: "completed",
  };
  const openContext = drawerContextByStatus[visit.status] ?? "consulting";
  const canOpen = canOpenLiveboardVisitPanel(user, visit, liveboardRules);
  const showStartTreatment =
    visit.status === "treatment" &&
    canAccessTreatmentRoom(user, visit) &&
    canUseLiveboardButton(user, visit, "start_treatment", liveboardRules);
  const patientId = visit.patient_id ?? visit.patient?.id ?? null;
  const showPatientDetails = visit.status === "completed" && Boolean(patientId);

  const handleOpenPanel = () => {
    if (canOpen) {
      if (onOpenVisit) {
        onOpenVisit(visit, openContext);
      } else {
        openDrawer(visit.id, openContext);
      }
      return;
    }
    onOpenDenied?.(visit);
  };

  const handleOpenPatientDetails = (event) => {
    event.stopPropagation();
    if (!patientId) return;
    const prefix = getWorkspaceUrlPrefix(user);
    navigate(getPatientDetailPath(prefix, patientId));
  };

  const handleAcceptHandover = async (event) => {
    event.stopPropagation();
    if (!visit?.id || !isPendingReceiver) return;
    setAcceptingHandover(true);
    try {
      const updated = await acceptCheckInHandover(visit.id);
      onHandoverComplete?.(updated);
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

  const handleAcceptDoctorHandover = async (event) => {
    event.stopPropagation();
    if (!visit?.id || !isPendingDoctorReceiver) return;
    setAcceptingDoctorHandover(true);
    try {
      const updated = await acceptTreatmentDoctorHandover(visit.id);
      onHandoverComplete?.(updated);
      pushToast({
        message: "Treatment handover accepted.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not accept treatment handover."),
        severity: "error",
      });
    } finally {
      setAcceptingDoctorHandover(false);
    }
  };

  const doctorHandoverScopeLabel =
    doctorHandoverScope === "current_session" && doctorHandoverSessionName
      ? `session “${doctorHandoverSessionName}”`
      : "all treatment sessions";

  return (
    <Card
      data-testid={`visit-card-${visit.id}`}
      data-visit-id={visit.id}
      data-patient-name={patientName}
      sx={{
        mb: 1.5,
      }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        {pending && <LinearProgress sx={{ mb: 1 }} />}
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
              {patientName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              #{queueNumber}
              {checkInModeLabel !== "—" ? ` · ${checkInModeLabel}` : ""}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              Checked in by: {checkedInByName ?? "—"}
            </Typography>
          </Box>
          <StatusChip status={visit.status} />
        </Box>

        {/* Time */}
        {visitTime && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mb: 0.75 }}
          >
            <AccessTimeIcon sx={{ fontSize: 12, color: "text.secondary" }} />
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {formatLiveboardRelativeTime(visitTime)}
              {" · "}
              <Typography
                component="span"
                variant="caption"
                color={stageMinutes > 30 ? "error" : "text.secondary"}
              >
                {durationLabel}
              </Typography>
            </Typography>
          </Stack>
        )}

        {isPendingReceiver && canAcceptHandover ? (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "warning.main",
              borderRadius: 1,
              p: 1,
              mb: 1,
              bgcolor: "warning.50",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {pendingByName} handed this patient to you.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="warning"
              sx={{ mt: 0.75, fontSize: 11 }}
              onClick={handleAcceptHandover}
              disabled={acceptingHandover}
            >
              {acceptingHandover ? "Accepting..." : "Accept handover"}
            </Button>
          </Box>
        ) : null}

        {visit.status === "treatment" &&
        isPendingDoctorReceiver &&
        canAcceptDoctorHandover ? (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "info.main",
              borderRadius: 1,
              p: 1,
              mb: 1,
              bgcolor: "info.50",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {doctorPendingByName} handed {doctorHandoverScopeLabel} to you.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="info"
              sx={{ mt: 0.75, fontSize: 11 }}
              onClick={handleAcceptDoctorHandover}
              disabled={acceptingDoctorHandover}
            >
              {acceptingDoctorHandover ? "Accepting..." : "Accept handover"}
            </Button>
          </Box>
        ) : null}

        {/* Doctor / Therapist */}
        {(doctorName || therapistName) && (
          <Stack direction="column" spacing={1} flexWrap="wrap" mb={1}>
            {doctorName && (
              <Stack direction="row" alignItems="center" spacing={0.4}>
                <Avatar
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: "info.main",
                    color: "info.contrastText",
                    fontSize: 9,
                  }}
                >
                  {doctorName[0]}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {doctorName}
                </Typography>
              </Stack>
            )}
            {therapistName && (
              <Stack direction="row" alignItems="center" spacing={0.4}>
                <Avatar
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    fontSize: 9,
                  }}
                >
                  {therapistName[0]}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {therapistName}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            columnGap: 0.5,
          }}
        >
          {showStartTreatment && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ fontSize: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                const prefix = getWorkspaceUrlPrefix(user);
                navigate(`${prefix}/visits/${visit.id}/treatment-room`);
              }}
            >
              Start Treatment
            </Button>
          )}
          {showPatientDetails && (
            <Button
              variant="outlined"
              size="small"
              sx={{ fontSize: 12 }}
              onClick={handleOpenPatientDetails}
            >
              Patient details
            </Button>
          )}
          <ActionButtons
            size="small"
            visit={visit}
            user={user}
            onAction={onAction}
            disabled={pending}
            disableMarkTreatmentDone={disableMarkTreatmentDone}
            markTreatmentDoneDisabledReason={markTreatmentDoneDisabledReason}
          />
        </Box>
        {canOpen ? (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            sx={{ mt: 1, fontSize: 12 }}
            onClick={handleOpenPanel}
          >
            Open Panel
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
