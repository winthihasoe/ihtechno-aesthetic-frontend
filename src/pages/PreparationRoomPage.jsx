import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import dayjs from "dayjs";
import useAuthStore from "../stores/authStore";
import useLiveBoardStore from "../stores/liveBoardStore";
import useToastStore from "../stores/toastStore";
import useConfirmStore from "../stores/confirmStore";
import useUIStore from "../stores/useUIStore";
import { getUserVisitHistoryPath } from "../utils/workspaceRoutes";
import { canAccessPreparationPanel } from "../utils/roleUtils";
import { resolveApiError } from "../services/apiClient";
import * as visitService from "../services/visitService";
import * as consultationService from "../services/consultationService";
import * as treatmentService from "../services/treatmentService";
import { confirmIfMissingStagePhotos } from "../utils/visitStagePhotos";
import PreparationPanel from "../components/LiveBoard/PreparationPanel";

export default function PreparationRoomPage() {
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
  const [visitTreatments, setVisitTreatments] = useState([]);
  const [proceeding, setProceeding] = useState(false);

  const idNum = visitId != null ? Number(visitId) : NaN;
  const visitHistoryPath = getUserVisitHistoryPath(user);

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
      setVisitTreatments(Array.isArray(tList) ? tList : []);
      if (v && !canAccessPreparationPanel(user, v)) {
        setError("You do not have access to manage pre-treatment for this visit.");
      } else if (v?.status && v.status !== "preparation") {
        setError("This visit is not in the pre-treatment stage.");
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

  const refreshVisitTreatments = useCallback(async () => {
    if (!Number.isFinite(idNum)) return;
    try {
      const tList = await treatmentService.listVisitTreatments(idNum);
      setVisitTreatments(Array.isArray(tList) ? tList : []);
    } catch {
      /* ignore */
    }
  }, [idNum]);

  const handleVisitUpdated = useCallback(
    (updatedVisit) => {
      if (updatedVisit) {
        setVisit(updatedVisit);
        updateVisitInBoard(updatedVisit);
      }
    },
    [updateVisitInBoard],
  );

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

  const handleProceedToTreatment = useCallback(async () => {
    if (!Number.isFinite(idNum)) return;
    const { ok, payload } = await confirmIfMissingStagePhotos({
      askConfirm,
      photos: visit?.photos,
      stage: "preparation",
    });
    if (!ok) return;
    try {
      const updated = await visitService.sendToTreatment(idNum, payload);
      setVisit(updated);
      updateVisitInBoard(updated);
      pushToast({
        message: "Visit moved to Treatment.",
        severity: "success",
      });
      navigate(visitHistoryPath);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not proceed to treatment."),
        severity: "error",
      });
    }
  }, [
    idNum,
    askConfirm,
    visit?.photos,
    updateVisitInBoard,
    pushToast,
    navigate,
    visitHistoryPath,
  ]);

  const handleProceedWithSaving = useCallback(async () => {
    setProceeding(true);
    try {
      await handleProceedToTreatment();
    } finally {
      setProceeding(false);
    }
  }, [handleProceedToTreatment]);

  const patientName =
    visit?.patient?.full_name ?? visit?.patient?.name ?? "Patient";

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
          Visit History
        </Button>
        <Alert severity="error">{error || "Visit not found."}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1.5,
        }}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(visitHistoryPath)}
              sx={{ alignSelf: "flex-start", px: 1.5 }}
            >
              Visit History
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const patientId = visit?.patient_id ?? visit?.patient?.id;
                if (!patientId) return;
                navigate(`/patients/${patientId}`);
              }}
              sx={{ alignSelf: "flex-start", px: 1.5 }}
            >
              Patient Details
            </Button>
          </Stack>
          <Box>
            <Typography variant="h5" fontWeight={900}>
              Pre-treatment Room
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {patientName} · Visit #{visit.queue_number ?? visit.id} ·{" "}
              {dayjs(visit.visit_time ?? visit.created_at).format(
                "DD-MM-YYYY HH:mm",
              )}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="contained"
            color="secondary"
            disabled={proceeding}
            onClick={() => void handleProceedWithSaving()}
          >
            {proceeding ? "Proceeding..." : "Proceed to Treatment"}
          </Button>
        </Stack>
      </Paper>

      <PreparationPanel
        visit={visit}
        consultation={consultation}
        visitTreatments={visitTreatments}
        onVisitTreatmentsChange={refreshVisitTreatments}
        onProceedToTreatment={handleProceedToTreatment}
        onVisitPhotoUploaded={handleVisitPhotoUploaded}
        onVisitUpdated={handleVisitUpdated}
      />
    </Container>
  );
}
