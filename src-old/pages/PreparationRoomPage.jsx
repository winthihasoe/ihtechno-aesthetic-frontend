import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ConsultationRoomHeader from "./consultation-room/components/ConsultationRoomHeader";
import useAuthStore from "../stores/authStore";
import useLiveBoardStore from "../stores/liveBoardStore";
import useToastStore from "../stores/toastStore";
import useConfirmStore from "../stores/confirmStore";
import useUIStore from "../stores/useUIStore";
import { getUserLiveBoardPath } from "../utils/workspaceRoutes";
import { canAccessPreparationPanel } from "../utils/roleUtils";
import { resolveApiError } from "../services/apiClient";
import * as visitService from "../services/visitService";
import * as consultationService from "../services/consultationService";
import * as treatmentService from "../services/treatmentService";
import { confirmIfMissingStagePhotos } from "../utils/visitStagePhotos";
import PreparationRoomContent from "./preparation-room/PreparationRoomContent";
import VisitAppointmentNote from "../components/visits/VisitAppointmentNote";
import LoadingIndicator from "../components/common/LoadingIndicator";

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

  const idNum = visitId != null ? Number(visitId) : NaN;
  const liveBoardPath = getUserLiveBoardPath(user);

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
        setError("You do not have access to manage preparation for this visit.");
      } else if (v?.status && v.status !== "preparation") {
        setError("This visit is not in the preparation stage.");
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
      navigate(liveBoardPath);
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
    liveBoardPath,
  ]);

  const [proceeding, setProceeding] = useState(false);

  const handleProceedWithSaving = useCallback(async () => {
    setProceeding(true);
    try {
      await handleProceedToTreatment();
    } finally {
      setProceeding(false);
    }
  }, [handleProceedToTreatment]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  if (error || !visit) {
    return (
      <Box sx={{ p: 3, maxWidth: 720 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(liveBoardPath)}
          sx={{ mb: 2 }}
        >
          Back to board
        </Button>
        <Alert severity="error">{error || "Visit not found."}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <ConsultationRoomHeader
        title="Preparation Room"
        patient={visit?.patient}
        visit={visit}
        photoCount={visit?.photos?.length ?? 0}
        plannedTreatmentCount={visitTreatments.length}
        saving={proceeding}
        savingLabel="Proceeding..."
        saveLabel="Proceed to Treatment"
        onBackToBoard={() => navigate(liveBoardPath)}
        onPatientDetails={() => {
          const patientId = visit?.patient_id ?? visit?.patient?.id;
          if (!patientId) return;
          navigate(`/patients/${patientId}`);
        }}
        onCancel={() => navigate(liveBoardPath)}
        onSave={handleProceedWithSaving}
      />

      <VisitAppointmentNote visit={visit} sx={{ mb: 2 }} />

      <PreparationRoomContent
        visit={visit}
        consultation={consultation}
        visitTreatments={visitTreatments}
        onVisitTreatmentsChange={refreshVisitTreatments}
        onProceedToTreatment={handleProceedToTreatment}
        onVisitPhotoUploaded={handleVisitPhotoUploaded}
        onVisitUpdated={handleVisitUpdated}
        onConsultationSaved={setConsultation}
      />
    </Container>
  );
}
