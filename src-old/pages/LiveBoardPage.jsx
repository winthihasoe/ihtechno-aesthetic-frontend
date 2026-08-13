import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Alert,
  Tooltip,
  IconButton,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import useLiveBoardStore from "../stores/liveBoardStore";
import useAuthStore from "../stores/authStore";
import useNotificationStore from "../stores/notificationStore";
import Column from "../components/LiveBoard/Column";
import LoadingIndicator from "../components/common/LoadingIndicator";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../components/common/CollapsibleFilters";
import FilterBar from "../components/LiveBoard/FilterBar";
import PatientCard from "../components/LiveBoard/PatientCard";
import CarryoverStrip from "../components/LiveBoard/CarryoverStrip";
import CarryoverCancelDialog from "../components/LiveBoard/CarryoverCancelDialog";
import {
  canUseLiveboardButton,
  canDo,
  canStartConsultationForVisit,
  canViewLiveboard,
  canViewCarryoverStrip,
  canOpenLiveboardVisitPanel,
  canUpdateLiveboard,
} from "../utils/roleUtils";
import useConfirmStore from "../stores/confirmStore";
import useToastStore from "../stores/toastStore";
import useUIStore from "../stores/useUIStore";
import LiveBoardCheckInModal from "../components/check-in/LiveBoardCheckInModal";
import { resolveApiError } from "../services/apiClient";
import { getAppointments } from "../services/appointmentService";
import { generatePaymentDraft } from "../services/paymentService";
import { confirmIfMissingStagePhotos } from "../utils/visitStagePhotos";
import { getTreatmentDoneBlockReason } from "../utils/treatmentSessionUtils";
import {
  getInvoiceDetailPath,
  getWorkspaceUrlPrefix,
  hasStrictRole,
  resolveUserPrimaryRole,
} from "../utils/workspaceRoutes";
import * as treatmentService from "../services/treatmentService";
import {
  assignWaitingDoctor,
  getLiveboardAssignableStaff,
} from "../services/visitService";
import dayjs from "dayjs";
import useSettingsStore from "../stores/settingsStore";

const BOARD_STATUSES = [
  "waiting",
  "consulting",
  "preparation",
  "treatment",
  "payment",
];

const UPCOMING_APPOINTMENT_STATUSES = new Set(["pending", "confirmed"]);

const EMPTY_STEPS = [
  {
    icon: HowToRegOutlinedIcon,
    title: "Check in a patient",
    body: "Create a new visit from walk-in or an appointment — the patient card appears in Waiting.",
  },
  {
    icon: MedicalServicesOutlinedIcon,
    title: "Move through stages",
    body: "Advance each visit from consulting and preparation to treatment as clinical work is done.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Finish and bill",
    body: "Mark treatment done to move to Payment, then complete billing — finished visits show under Completed.",
  },
];

export default function LiveBoardPage() {
  const navigate = useNavigate();
  const [pendingVisitIds, setPendingVisitIds] = useState([]);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [markDoneBlockedByVisitId, setMarkDoneBlockedByVisitId] = useState({});
  const [assignDoctorDialog, setAssignDoctorDialog] = useState({
    open: false,
    visit: null,
  });
  const [assignDoctorOptions, setAssignDoctorOptions] = useState([]);
  const [loadingAssignableDoctors, setLoadingAssignableDoctors] =
    useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [savingAssignedDoctor, setSavingAssignedDoctor] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [carryoverCancelDialog, setCarryoverCancelDialog] = useState({
    open: false,
    visit: null,
  });
  const [cancellingCarryoverVisit, setCancellingCarryoverVisit] =
    useState(false);

  const {
    fetchVisits,
    fetchCarryoverVisits,
    loading,
    visits,
    carryoverVisits,
    getFilteredVisits,
    searchQuery,
    doctorFilter,
    setSearchQuery,
    setDoctorFilter,
    startConsultation,
    sendToPreparation,
    goToPreparation,
    sendToTreatment,
    markTreatmentDone,
    cancelCarryoverVisit,
  } = useLiveBoardStore();
  const { user } = useAuthStore();
  const liveboardRules = useSettingsStore(
    (s) => s.settings?.liveboard_rules || {},
  );
  const appSettings = useSettingsStore((s) => s.settings);
  const showCarryoverStrip = canViewCarryoverStrip(user, appSettings);
  const { addNotification } = useNotificationStore();
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const { openDrawer } = useUIStore();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count += 1;
    if (doctorFilter) count += 1;
    return count;
  }, [searchQuery, doctorFilter]);

  const hasActiveFilters = activeFilterCount > 0;
  const rolePrefix = `/${resolveUserPrimaryRole(user)}`;
  const canCreateVisit = canDo(user, "create_visit");
  const canCancelCarryoverVisit = canUpdateLiveboard(user);
  const showGuidedEmpty =
    !loading &&
    !hasActiveFilters &&
    visits.length === 0 &&
    (!showCarryoverStrip || carryoverVisits.length === 0);
  const showFilteredBoardEmpty =
    !loading &&
    hasActiveFilters &&
    BOARD_STATUSES.every((status) => getFilteredVisits(status).length === 0) &&
    visits.some((visit) => BOARD_STATUSES.includes(visit.status));

  const clearFilters = () => {
    setSearchQuery("");
    setDoctorFilter("");
  };

  const formatDoctorRoleLabel = useCallback((role) => {
    if (role === "doctor") return "Medical Officer";
    if (role === "dermatologist") return "Dermatologist";
    if (role === "owner") return "Owner";
    return role ?? "";
  }, []);

  const doctorOrDermatologist =
    hasStrictRole(user, "doctor") || hasStrictRole(user, "dermatologist");
  const receptionOrSales =
    hasStrictRole(user, "reception") || hasStrictRole(user, "sales_marketing");
  const showUpcomingAppointmentsColumn =
    doctorOrDermatologist || receptionOrSales;

  const refreshBoard = useCallback(async () => {
    await fetchVisits();
    if (
      canViewCarryoverStrip(
        useAuthStore.getState().user,
        useSettingsStore.getState().settings,
      )
    ) {
      await fetchCarryoverVisits();
    }
    const u = useAuthStore.getState().user;
    if (!u) {
      setUpcomingAppointments([]);
      return;
    }
    const doctorOrDerm =
      hasStrictRole(u, "doctor") || hasStrictRole(u, "dermatologist");
    const recOrSales =
      hasStrictRole(u, "reception") || hasStrictRole(u, "sales_marketing");
    if (!doctorOrDerm && !recOrSales) {
      setUpcomingAppointments([]);
      return;
    }
    if (doctorOrDerm && !u.id) return;

    setLoadingUpcoming(true);
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const params = { date: today };
      if (doctorOrDerm) {
        params.doctor_id = u.id;
      }
      const rows = await getAppointments(params);
      const list = (Array.isArray(rows) ? rows : []).filter(
        (a) =>
          a.scheduled_at &&
          UPCOMING_APPOINTMENT_STATUSES.has(String(a.status || "")),
      );
      list.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
      setUpcomingAppointments(list);
    } catch {
      setUpcomingAppointments([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }, [fetchVisits, fetchCarryoverVisits]);

  const notifyPanelAccessDenied = useCallback(() => {
    pushToast({
      message:
        "Only the checked-in staff member, assigned doctor or therapist, owner, or admin can open this panel.",
      severity: "warning",
    });
  }, [pushToast]);

  const handleOpenVisitPanel = useCallback(
    (visit, context = "consulting") => {
      const canOpen = canOpenLiveboardVisitPanel(user, visit, liveboardRules);
      if (!canOpen) {
        notifyPanelAccessDenied(visit);
        return;
      }
      openDrawer(visit.id, context);
    },
    [liveboardRules, notifyPanelAccessDenied, openDrawer, user],
  );

  const openCarryoverCancelDialog = useCallback((visit) => {
    setCarryoverCancelDialog({ open: true, visit });
  }, []);

  const closeCarryoverCancelDialog = useCallback(() => {
    if (cancellingCarryoverVisit) return;
    setCarryoverCancelDialog({ open: false, visit: null });
  }, [cancellingCarryoverVisit]);

  const handleConfirmCarryoverCancel = useCallback(
    async ({ reason, note }) => {
      const visit = carryoverCancelDialog.visit;
      if (!visit?.id || !reason) return;

      const patientName = visit.patient?.name || visit.patientName || "Patient";
      const hasUnpaidPayment =
        visit.status === "payment" &&
        visit.payment &&
        visit.payment.status !== "paid" &&
        visit.payment.status !== "void";

      const approved = await askConfirm({
        title: "Confirm cancel visit",
        message: hasUnpaidPayment
          ? `Cancel ${patientName}'s carryover visit and void the unpaid invoice draft?`
          : `Cancel ${patientName}'s carryover visit? The patient can check in again after this.`,
        confirmText: "Cancel visit",
        cancelText: "Back",
      });
      if (!approved) return;

      setCancellingCarryoverVisit(true);
      try {
        await cancelCarryoverVisit(visit.id, { reason, note });
        pushToast({
          message: "Carryover visit cancelled.",
          severity: "success",
        });
        setCarryoverCancelDialog({ open: false, visit: null });
        await refreshBoard();
      } catch (err) {
        pushToast({
          message: resolveApiError(err, "Could not cancel carryover visit."),
          severity: "error",
        });
      } finally {
        setCancellingCarryoverVisit(false);
      }
    },
    [
      askConfirm,
      cancelCarryoverVisit,
      carryoverCancelDialog.visit,
      pushToast,
      refreshBoard,
    ],
  );

  useEffect(() => {
    refreshBoard();
  }, [refreshBoard]);

  useEffect(() => {
    const treatmentVisits = getFilteredVisits("treatment");
    if (treatmentVisits.length === 0) {
      setMarkDoneBlockedByVisitId({});
      return;
    }

    let cancelled = false;
    const visitIds = treatmentVisits.map((v) => v.id);

    setMarkDoneBlockedByVisitId((prev) => {
      const next = {};
      visitIds.forEach((id) => {
        next[id] = prev[id] ?? "Checking treatment sessions...";
      });
      return next;
    });

    (async () => {
      const entries = await Promise.all(
        visitIds.map(async (id) => {
          try {
            const sessions = await treatmentService.listVisitTreatments(id);
            return [id, getTreatmentDoneBlockReason(sessions)];
          } catch {
            return [
              id,
              "Could not verify treatment sessions. Open the treatment room and try again.",
            ];
          }
        }),
      );
      if (cancelled) return;
      setMarkDoneBlockedByVisitId(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [getFilteredVisits, loading, pendingVisitIds]);

  const loadAssignableDoctors = useCallback(async () => {
    setLoadingAssignableDoctors(true);
    try {
      const data = await getLiveboardAssignableStaff();
      setAssignDoctorOptions(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch (err) {
      setAssignDoctorOptions([]);
      pushToast({
        message: resolveApiError(err, "Failed to load assignable doctors."),
        severity: "error",
      });
    } finally {
      setLoadingAssignableDoctors(false);
    }
  }, [pushToast]);

  const openAssignDoctorDialog = useCallback(
    async (visit) => {
      setAssignDoctorDialog({ open: true, visit });
      setSelectedDoctorId("");
      await loadAssignableDoctors();
    },
    [loadAssignableDoctors],
  );

  const closeAssignDoctorDialog = useCallback(() => {
    if (savingAssignedDoctor) return;
    setAssignDoctorDialog({ open: false, visit: null });
    setSelectedDoctorId("");
  }, [savingAssignedDoctor]);

  const handleStartConsultation = useCallback(
    async (visit) => {
      setPendingVisitIds((ids) =>
        ids.includes(visit.id) ? ids : [...ids, visit.id],
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const currentVisit =
        useLiveBoardStore
          .getState()
          .visits.find((row) => Number(row.id) === Number(visit.id)) ?? visit;

      if (!currentVisit?.doctor_id) {
        await openAssignDoctorDialog(currentVisit);
        return;
      }

      if (!canStartConsultationForVisit(user, currentVisit)) {
        pushToast({
          message:
            currentVisit?.doctor_id != null && currentVisit?.doctor_id !== ""
              ? "Only the assigned Medical Officer or Dermatologist can start this consultation."
              : "Assign a Medical Officer, Dermatologist, or Owner before starting the consultation.",
          severity: "warning",
        });
        return;
      }

      await startConsultation(
        currentVisit.id,
        currentVisit.doctor_id ?? user?.id,
      );
      addNotification(
        `${currentVisit.patient?.name ?? currentVisit.patientName ?? "Patient"} moved to Consulting`,
      );
      pushToast({
        message: "Visit moved to Consulting.",
        severity: "success",
      });
    },
    [
      addNotification,
      openAssignDoctorDialog,
      pushToast,
      startConsultation,
      user,
    ],
  );

  const handleAssignDoctorAndStart = useCallback(async () => {
    const visit = assignDoctorDialog.visit;
    if (!visit?.id || !selectedDoctorId) {
      pushToast({
        message: "Please select a doctor first.",
        severity: "warning",
      });
      return;
    }
    const selected = assignDoctorOptions.find(
      (option) => String(option.id) === String(selectedDoctorId),
    );
    const doctorName = selected?.name ?? "selected doctor";
    const confirmed = await askConfirm({
      title: "Confirm doctor assignment",
      message: `Assign ${doctorName} and start consultation?`,
      confirmText: "Assign",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    setSavingAssignedDoctor(true);
    try {
      const updatedVisit = await assignWaitingDoctor(visit.id, {
        doctor_id: Number(selectedDoctorId),
      });
      await startConsultation(
        updatedVisit.id,
        updatedVisit.doctor_id ?? Number(selectedDoctorId),
      );
      addNotification(
        `${updatedVisit.patient?.name ?? updatedVisit.patientName ?? "Patient"} moved to Consulting`,
      );
      pushToast({
        message: `${doctorName} assigned. Visit moved to Consulting.`,
        severity: "success",
      });
      setAssignDoctorDialog({ open: false, visit: null });
      setSelectedDoctorId("");
    } catch (err) {
      pushToast({
        message: resolveApiError(
          err,
          "Failed to assign doctor and start consultation.",
        ),
        severity: "error",
      });
    } finally {
      setSavingAssignedDoctor(false);
      setPendingVisitIds((ids) => ids.filter((id) => id !== visit?.id));
    }
  }, [
    addNotification,
    askConfirm,
    assignDoctorDialog.visit,
    assignDoctorOptions,
    pushToast,
    selectedDoctorId,
    startConsultation,
  ]);

  const handleAction = async (action, visit) => {
    if (action === "start_consultation") {
      try {
        await handleStartConsultation(visit);
      } catch (err) {
        pushToast({
          message: resolveApiError(err, "Unable to update visit status."),
          severity: "error",
        });
      } finally {
        setPendingVisitIds((ids) => ids.filter((id) => id !== visit.id));
      }
      return;
    }

    try {
      if (action === "mark_treatment_done") {
        const sessions = await treatmentService.listVisitTreatments(visit.id);
        const blockedReason = getTreatmentDoneBlockReason(sessions);
        if (blockedReason) {
          setMarkDoneBlockedByVisitId((prev) => ({
            ...prev,
            [visit.id]: blockedReason,
          }));
          pushToast({ message: blockedReason, severity: "warning" });
          return;
        }
      }

      const labels = {
        start_consultation: "start consultation",
        go_preparation: "go to preparation and skip consultation",
        send_to_preparation: "send to treatment preparation",
        proceed_to_treatment: "proceed to treatment",
        mark_treatment_done: "mark treatment done",
      };

      if (labels[action]) {
        let requiresGenericConfirm = true;
        if (action === "go_preparation" && visit?.status === "consulting") {
          const approved = await askConfirm({
            title: "Skip consulting session?",
            message:
              "Skipping the consulting session will not save consultation data and no consulting fee will be collected. Do you want to continue?",
            confirmText: "Skip Consulting",
          });
          if (!approved) return;
          requiresGenericConfirm = false;
        }

        if (requiresGenericConfirm) {
          const approved = await askConfirm({
            title: "Confirm status change",
            message: `Are you sure you want to ${labels[action]} for ${visit.patient?.name ?? visit.patientName ?? "Patient"}?`,
            confirmText: "Continue",
          });
          if (!approved) return;
        }
      }

      let transitionPayload = {};
      if (
        action === "send_to_preparation" ||
        action === "proceed_to_treatment" ||
        action === "mark_treatment_done"
      ) {
        const stageByAction = {
          send_to_preparation: "consultation",
          proceed_to_treatment: "preparation",
          mark_treatment_done: "treatment",
        };
        const stage = stageByAction[action];
        const { ok, payload } = await confirmIfMissingStagePhotos({
          askConfirm,
          photos: visit.photos,
          stage,
        });
        if (!ok) return;
        transitionPayload = payload;
      }

      setPendingVisitIds((ids) =>
        ids.includes(visit.id) ? ids : [...ids, visit.id],
      );

      switch (action) {
        case "start_consultation": {
          await startConsultation(visit.id, visit.doctor_id ?? user.id);
          addNotification(
            `${visit.patient?.name ?? visit.patientName ?? "Patient"} moved to Consulting`,
          );
          pushToast({
            message: "Visit moved to Consulting.",
            severity: "success",
          });
          break;
        }
        case "open_consultation":
          navigate(
            `${getWorkspaceUrlPrefix(user)}/visits/${visit.id}/consultation-room`,
          );
          break;
        case "go_preparation": {
          await goToPreparation(visit.id);
          addNotification(
            `${visit.patient?.name ?? visit.patientName ?? "Patient"} moved to Preparation`,
          );
          pushToast({
            message: "Visit moved to Preparation with consultation skipped.",
            severity: "success",
          });
          break;
        }
        case "send_to_preparation": {
          await sendToPreparation(visit.id, transitionPayload);
          addNotification(
            `${visit.patient?.name ?? visit.patientName ?? "Patient"} moved to Preparation`,
          );
          pushToast({
            message: "Visit moved to Preparation.",
            severity: "success",
          });
          break;
        }
        case "open_preparation":
          navigate(
            `${getWorkspaceUrlPrefix(user)}/visits/${visit.id}/preparation-room`,
          );
          break;
        case "proceed_to_treatment": {
          await sendToTreatment(visit.id, transitionPayload);
          addNotification(
            `${visit.patient?.name ?? visit.patientName ?? "Patient"} moved to Treatment`,
          );
          pushToast({
            message: "Visit moved to Treatment.",
            severity: "success",
          });
          break;
        }
        case "mark_treatment_done": {
          await markTreatmentDone(visit.id, transitionPayload);
          addNotification(
            `${visit.patient?.name ?? visit.patientName ?? "Patient"} moved to Payment`,
          );
          pushToast({
            message: "Visit moved to Payment.",
            severity: "success",
          });
          break;
        }
        case "complete_payment": {
          const payment = await generatePaymentDraft(visit.id);
          if (!payment?.id) {
            throw new Error("Could not generate payment draft.");
          }
          const prefix = getWorkspaceUrlPrefix(user);
          navigate(getInvoiceDetailPath(prefix, payment.id));
          pushToast({ message: "Invoice draft opened.", severity: "success" });
          break;
        }
      }
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to update visit status."),
        severity: "error",
      });
    } finally {
      setPendingVisitIds((ids) => ids.filter((id) => id !== visit.id));
    }
  };

  if (!canViewLiveboard(user)) {
    return (
      <Alert severity="warning">
        You do not have permission to view LiveBoard.
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="h5">
            Live Board
            <Tooltip title="Refresh board">
              <IconButton
                onClick={() => void refreshBoard()}
                size="small"
                sx={{
                  border: 1,
                  borderColor: "divider",
                  color: "text.primary",
                  ml: 1,
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 300, lineHeight: 1.65 }}
          >
            Real-time patient flow across clinic.
          </Typography>
        </Box>
        {canCreateVisit && !showGuidedEmpty ? (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <CollapsibleFiltersToggle
              open={filtersOpen}
              onToggle={setFiltersOpen}
              activeCount={activeFilterCount}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCheckInModalOpen(true)}
            >
              New Visit
            </Button>
          </Stack>
        ) : null}
        {!canCreateVisit || showGuidedEmpty ? (
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
          />
        ) : null}
      </Box>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onClear={clearFilters}
        showActions={Boolean(searchQuery.trim() || doctorFilter)}
        clearLabel="Clear filters"
      >
        <FilterBar />
      </CollapsibleFiltersPanel>

      {showCarryoverStrip ? (
        <CarryoverStrip
          visits={carryoverVisits}
          userId={user?.id}
          onOpenVisit={handleOpenVisitPanel}
          onCancelVisit={openCarryoverCancelDialog}
          canCancel={canCancelCarryoverVisit}
        />
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={ViewKanbanOutlinedIcon}
          title="No visits on the board yet"
          description="The Live Board tracks today's patient flow from check-in through payment. Check in your first patient to populate the columns, or open Appointments if someone is booked for later."
          primaryAction={
            canCreateVisit
              ? {
                  label: "New visit",
                  onClick: () => setCheckInModalOpen(true),
                  startIcon: <AddIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer={
            <>
              Scheduled patients appear after check-in from{" "}
              <Typography
                component={RouterLink}
                to={`${rolePrefix}/appointments`}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Appointments
              </Typography>
              .
            </>
          }
        />
      ) : (
        <>
          {showFilteredBoardEmpty ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              No active visits match your filters. Clear filters to see the full
              board.
            </Alert>
          ) : null}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            {BOARD_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                visits={getFilteredVisits(status)}
                user={user}
                onAction={handleAction}
                onOpenVisit={handleOpenVisitPanel}
                onOpenDenied={notifyPanelAccessDenied}
                pendingVisitIds={pendingVisitIds}
                markDoneBlockedByVisitId={markDoneBlockedByVisitId}
                onHandoverComplete={() => void refreshBoard()}
              />
            ))}
          </Box>
        </>
      )}

      {!loading && !showGuidedEmpty && (
        <Box
          sx={{
            mt: 4,
            display: "grid",
            gap: 3,
            gridTemplateColumns: showUpcomingAppointmentsColumn
              ? { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }
              : "1fr",
            alignItems: "start",
          }}
        >
          {/* {showUpcomingAppointmentsColumn && (
            <Box data-testid="liveboard-upcoming">
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Upcoming
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                {doctorOrDermatologist
                  ? "Today's appointments assigned to you — patient, time, and notes."
                  : "Today's appointments for the clinic — patient, time, and notes."}
              </Typography>
              {loadingUpcoming ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <LoadingIndicator size={28} />
                </Box>
              ) : upcomingAppointments.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  No upcoming appointments today.
                </Typography>
              ) : (
                <Stack direction={"row"} spacing={1.25}>
                  {upcomingAppointments.map((a) => (
                    <Paper
                      key={a.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {a.patient?.name ?? "Patient"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.scheduled_at
                          ? dayjs(a.scheduled_at).format("D MMM YYYY, HH:mm")
                          : "—"}
                      </Typography>
                      {a.notes ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.75, display: "block" }}
                        >
                          {a.notes}
                        </Typography>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )} */}

          <Box data-testid="liveboard-completed">
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Completed
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Today’s completed visits (read-only). Open a card to review the
              summary.
            </Typography>
            {getFilteredVisits("completed").length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No completed visits match the current filters.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {getFilteredVisits("completed").map((visit) => (
                  <PatientCard
                    key={visit.id}
                    visit={visit}
                    user={user}
                    onAction={handleAction}
                    onOpenVisit={handleOpenVisitPanel}
                    onOpenDenied={notifyPanelAccessDenied}
                    onHandoverComplete={() => void refreshBoard()}
                    pending={pendingVisitIds.includes(visit.id)}
                    disableMarkTreatmentDone={Boolean(
                      markDoneBlockedByVisitId[visit.id],
                    )}
                    markTreatmentDoneDisabledReason={
                      markDoneBlockedByVisitId[visit.id] ?? ""
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      <LiveBoardCheckInModal
        open={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onVisitCreated={() => void refreshBoard()}
      />

      <CarryoverCancelDialog
        open={carryoverCancelDialog.open}
        visit={carryoverCancelDialog.visit}
        saving={cancellingCarryoverVisit}
        onClose={closeCarryoverCancelDialog}
        onConfirm={handleConfirmCarryoverCancel}
      />

      <Dialog
        open={assignDoctorDialog.open}
        onClose={closeAssignDoctorDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Assign doctor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">
              {assignDoctorDialog.visit?.patient?.name
                ? `No doctor is assigned for ${assignDoctorDialog.visit.patient.name}.`
                : "No doctor is assigned for this visit."}
            </Typography>
            <Typography variant="subtitle2">Doctor</Typography>
            {loadingAssignableDoctors ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <LoadingIndicator size={22} />
              </Box>
            ) : (
              <FormControl fullWidth size="small">
                <Select
                  value={selectedDoctorId}
                  onChange={(event) => setSelectedDoctorId(event.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select doctor</em>
                  </MenuItem>
                  {assignDoctorOptions.map((doctor) => (
                    <MenuItem key={doctor.id} value={String(doctor.id)}>
                      {doctor.name}
                      {doctor.role
                        ? ` (${formatDoctorRoleLabel(doctor.role)})`
                        : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeAssignDoctorDialog}
            disabled={savingAssignedDoctor}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAssignDoctorAndStart()}
            disabled={
              savingAssignedDoctor ||
              loadingAssignableDoctors ||
              !selectedDoctorId
            }
          >
            {savingAssignedDoctor ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
