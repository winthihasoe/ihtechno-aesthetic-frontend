import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import dayjs from "dayjs";
import useAuthStore from "../stores/authStore";
import useLiveBoardStore from "../stores/liveBoardStore";
import useToastStore from "../stores/toastStore";
import useConfirmStore from "../stores/confirmStore";
import useUIStore from "../stores/useUIStore";
import { getUserVisitHistoryPath } from "../utils/workspaceRoutes";
import {
  canUpdateLiveboard,
  canAccessTreatmentRoom,
  canHandoverTreatmentDoctor,
} from "../utils/roleUtils";
import { resolveApiError } from "../services/apiClient";
import * as visitService from "../services/visitService";
import * as consultationService from "../services/consultationService";
import * as treatmentService from "../services/treatmentService";
import { getPatient } from "../services/patientService";
import {
  getActiveTreatmentTemplates,
  getTreatmentTemplate,
} from "../services/treatmentTemplateService";
import { getProductPickerOptions } from "../services/productPickerService";
import TreatmentSessionCard from "../components/LiveBoard/TreatmentSessionCard";
import HandoverTreatmentDoctorDialog from "../components/LiveBoard/HandoverTreatmentDoctorDialog";
import VisitQuestionnairesSection from "../components/LiveBoard/VisitQuestionnairesSection";
import PrescriptionSummaryBlock from "../components/prescription/PrescriptionSummaryBlock";

function mergeSessionTemplate(session, detailsById) {
  const tid = session.treatment_template_id;
  if (!tid || !detailsById[tid]) return session;
  const extra = detailsById[tid];
  const base = session.treatment_template ?? {};
  return {
    ...session,
    treatment_template: {
      ...base,
      id: base.id ?? extra.id,
      name: base.name ?? extra.name,
      duration_minutes: base.duration_minutes ?? extra.duration_minutes,
      description: extra.description ?? base.description,
      steps: extra.steps?.length ? extra.steps : base.steps,
    },
  };
}

export default function TreatmentRoomPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const updateVisitInBoard = useLiveBoardStore((s) => s.updateVisit);

  useEffect(() => {
    useUIStore.getState().closeDrawer();
  }, [visitId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visit, setVisit] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [templateDetailsById, setTemplateDetailsById] = useState({});
  const [startLoading, setStartLoading] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);

  const idNum = visitId != null ? Number(visitId) : NaN;
  const canAssign = canUpdateLiveboard(user);
  const canHandover = canHandoverTreatmentDoctor(user, visit);

  const refreshCore = useCallback(async () => {
    if (!Number.isFinite(idNum)) {
      setError("Invalid visit.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [v, c, tList] = await Promise.all([
        visitService.getVisit(idNum),
        consultationService.getConsultation(idNum),
        treatmentService.listVisitTreatments(idNum),
      ]);
      setVisit(v);
      setConsultation(c ?? null);
      setTreatments(Array.isArray(tList) ? tList : []);
      const pid = v?.patient_id ?? v?.patient?.id;
      if (pid) {
        try {
          const p = await getPatient(pid);
          setPatient(p);
        } catch {
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
      if (v && !canAccessTreatmentRoom(user, v)) {
        setError("You do not have access to this treatment visit.");
      } else if (v?.status && v.status !== "treatment") {
        setError("This visit is not in the treatment stage.");
      }
    } catch (err) {
      setError(resolveApiError(err, "Could not load visit."));
      setVisit(null);
    } finally {
      setLoading(false);
    }
  }, [idNum, user]);

  useEffect(() => {
    void refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    if (!canAssign) return;
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const [tlist, plist] = await Promise.all([
          getActiveTreatmentTemplates(),
          getProductPickerOptions(),
        ]);
        if (!cancelled) {
          setTemplates(Array.isArray(tlist) ? tlist : []);
          setProductOptions(Array.isArray(plist) ? plist : []);
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setProductOptions([]);
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  useEffect(() => {
    const ids = [
      ...new Set(
        treatments
          .map((t) => t.treatment_template_id)
          .filter((x) => x != null && x !== ""),
      ),
    ];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const additions = {};
      for (const tid of ids) {
        if (cancelled) return;
        try {
          const detail = await getTreatmentTemplate(tid);
          additions[tid] = detail;
        } catch {
          /* skip */
        }
      }
      if (!cancelled && Object.keys(additions).length) {
        setTemplateDetailsById((prev) => ({ ...prev, ...additions }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [treatments]);

  const handleVisitUpdated = useCallback(
    async (updatedVisit) => {
      if (updatedVisit) {
        setVisit(updatedVisit);
        updateVisitInBoard(updatedVisit);
      }
      try {
        const tList = await treatmentService.listVisitTreatments(idNum);
        setTreatments(Array.isArray(tList) ? tList : []);
      } catch {
        /* ignore */
      }
    },
    [idNum, updateVisitInBoard],
  );

  const sortedSessions = useMemo(
    () => [...treatments].sort((a, b) => a.id - b.id),
    [treatments],
  );

  const sessionsForCards = useMemo(
    () =>
      sortedSessions.map((s) => mergeSessionTemplate(s, templateDetailsById)),
    [sortedSessions, templateDetailsById],
  );

  const hasIncompleteSession = useMemo(
    () => treatments.some((t) => t.status !== "completed"),
    [treatments],
  );

  const priorVisits = useMemo(() => {
    const list = patient?.visits;
    if (!Array.isArray(list) || !visit?.id) return [];
    return list
      .filter((v) => Number(v.id) !== Number(visit.id))
      .sort((a, b) => {
        const ta = dayjs(a.visit_time ?? a.created_at).valueOf();
        const tb = dayjs(b.visit_time ?? b.created_at).valueOf();
        return tb - ta;
      });
  }, [patient?.visits, visit?.id]);

  const handleAddSession = async () => {
    if (!visit?.id) return;
    if (treatments.length > 0 && hasIncompleteSession) {
      const ok = await askConfirm({
        title: "Open a new session?",
        message:
          "You still have at least one session that is not marked done. Do you want to open another session anyway?",
        confirmText: "Open new session",
        cancelText: "Cancel",
      });
      if (!ok) return;
    }
    setStartLoading(true);
    try {
      await treatmentService.createTreatment(visit.id, {});
      await refreshCore();
      pushToast({ message: "Treatment session added.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not add treatment session."),
        severity: "error",
      });
    } finally {
      setStartLoading(false);
    }
  };

  const patientName =
    visit?.patient?.full_name ?? visit?.patient?.name ?? "Patient";
  const consultationSkipped = Boolean(visit?.consultation_skipped);
  const visitHistoryPath = getUserVisitHistoryPath(user);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !visit) {
    return (
      <Box sx={{ p: 3, maxWidth: 720 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(visitHistoryPath)}
          sx={{ mb: 2 }}
        >
          Back to board
        </Button>
        <Alert severity="error">{error || "Visit not found."}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(visitHistoryPath)}
        >
          Visit History
        </Button>
        <Stack direction="row" alignItems="center" gap={1}>
          {canHandover && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SwapHorizIcon />}
              onClick={() => setHandoverOpen(true)}
            >
              Hand over to doctor
            </Button>
          )}
          <Typography variant="h5" fontWeight={700} component="h1">
            Treatment Room
          </Typography>
        </Stack>
      </Stack>

      <HandoverTreatmentDoctorDialog
        open={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        visit={visit}
        treatments={treatments}
        user={user}
        onSuccess={(updated) => void handleVisitUpdated(updated)}
      />

      <Box sx={{ mb: 2 }}>
        <Typography component="div" variant="subtitle1" fontWeight={700}>
          {patientName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visit #{visit.queue_number ?? visit.id} ·{" "}
          {dayjs(visit.visit_time ?? visit.created_at).format(
            "YYYY-MM-DD HH:mm",
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Treatment room:{" "}
          {visit.treatment_room_number?.trim()
            ? visit.treatment_room_number
            : "—"}
        </Typography>
      </Box>

      {consultationSkipped && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Consultation skipped for this visit. Consultation data is not saved
          and consultation fee will not be collected.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Prior visits &amp; consultation history
        </Typography>
        {priorVisits.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No prior visits on file for this patient.
          </Typography>
        ) : (
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            {priorVisits.slice(0, 12).map((pv) => {
              const cons = pv.consultations?.[0] ?? pv.consultation ?? null;
              const tnames = (pv.treatments ?? [])
                .map((t) => t.name)
                .filter(Boolean)
                .join(", ");
              return (
                <Box key={pv.id}>
                  <Typography variant="body2" fontWeight={600}>
                    {dayjs(pv.visit_time ?? pv.created_at).format("YYYY-MM-DD")}{" "}
                    · {pv.status ?? "—"} · Queue #{pv.queue_number ?? pv.id}
                  </Typography>
                  {cons && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      <strong>Primary concern:</strong>{" "}
                      {cons.chief_complaint ?? "—"}
                      {" · "}
                      <strong>Plan:</strong>{" "}
                      {cons.treatment_plan ?? cons.prescribed_treatment ?? "—"}
                    </Typography>
                  )}
                  {tnames ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5 }}
                    >
                      Treatments: {tnames}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          This visit — consultation
        </Typography>
        <Typography variant="body2">
          <strong>Primary Concern:</strong>{" "}
          {consultation?.chief_complaint ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Assessment:</strong> {consultation?.diagnosis ?? "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Treatment Plan:</strong>{" "}
          {consultation?.treatment_plan ??
            consultation?.prescribed_treatment ??
            "—"}
        </Typography>
      </Paper>

      {consultation?.prescription && (
        <Box sx={{ mb: 2 }}>
          <PrescriptionSummaryBlock prescription={consultation.prescription} />
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <VisitQuestionnairesSection
          visit={visit}
          onResponsesChanged={() => void refreshCore()}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Current treatment plan &amp; sessions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Sessions planned in pre-treatment appear here. Complete each session,
          then use <strong>Mark Done</strong> on Visit History when all
          sessions are finished.
        </Typography>
        {canAssign && (
          <Button
            variant="contained"
            startIcon={
              startLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
            onClick={handleAddSession}
            disabled={startLoading}
            sx={{ mb: 2 }}
          >
            {startLoading ? "Adding…" : "Add session"}
          </Button>
        )}
        {sessionsForCards.length === 0 && !canAssign && (
          <Alert severity="info" sx={{ fontSize: 13 }}>
            No treatment sessions recorded for this visit yet.
          </Alert>
        )}
        <Stack spacing={2}>
          {sessionsForCards.map((session) => (
            <TreatmentSessionCard
              key={session.id}
              visit={visit}
              session={session}
              templates={templates}
              templatesLoading={templatesLoading}
              productOptions={productOptions}
              canAssign={canAssign}
              onVisitUpdated={handleVisitUpdated}
            />
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}
