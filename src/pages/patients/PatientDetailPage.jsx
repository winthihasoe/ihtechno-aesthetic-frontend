import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Card,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import dayjs from "dayjs";
import {
  formatPatientAgeSex,
  resolvePatientNumber,
} from "../../utils/patientUtils";
import { getUserVisitHistoryPath } from "../../utils/workspaceRoutes";
import {
  getPatient,
  updatePatient,
  deletePatient,
  patchPatientNotes,
} from "../../services/patientService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import useConfirmStore from "../../stores/confirmStore";
import useToastStore from "../../stores/toastStore";
import {
  hasAnyPermission,
  hasPermission,
  hasRole,
  hidePatientContactDetails,
} from "../../utils/accessUtils";
import { canDo } from "../../utils/roleUtils";
import { createVisit } from "../../services/visitService";
import CheckInConfirmDialog from "../../components/check-in/CheckInConfirmDialog";
import PostCheckInDestinationDialog from "../../components/check-in/PostCheckInDestinationDialog";
import PatientConsultationTab from "./components/PatientConsultationTab";
import PatientIntakeFormsTab from "./components/PatientIntakeFormsTab";
import PatientInfoTab from "./components/PatientInfoTab";
import PatientMedicalHistoryTab from "./components/PatientMedicalHistoryTab";
import PatientNotesTab from "./components/PatientNotesTab";
import PatientPaymentHistoryTab from "./components/PatientPaymentHistoryTab";
import PatientTabPanel from "./components/PatientTabPanel";
import PatientTimelineTab from "./components/PatientTimelineTab";
import PatientVisitsTab from "./components/PatientVisitsTab";

const GENERAL_HEALTH_FORM_CODE = "general_health_information";

function isClinicalMedicalHistoryEmpty(mh) {
  if (mh == null || typeof mh !== "object") return true;
  const t = (k) => String(mh[k] ?? "").trim();
  if (
    t("allergies") ||
    t("current_medications") ||
    t("chronic_diseases") ||
    t("past_surgical_history") ||
    t("family_history") ||
    t("hospitalizations")
  ) {
    return false;
  }
  if (mh.pregnancy_status || mh.breastfeeding_status) return false;
  return true;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "customer",
    gender: "",
    phone: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    weight_kg: "",
    height_cm: "",
    address: "",
    status: "active",
  });
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postCheckInOpen, setPostCheckInOpen] = useState(false);
  const canManagePatient = hasPermission(user, "patients.manage");
  const canUpdatePatientNotes = hasAnyPermission(user, [
    "patients.manage",
    "patients.notes.update",
  ]);
  const canEditClinicalHistory = hasAnyPermission(user, [
    "patients.manage",
    "consultations.manage",
  ]);
  const hideContactUi = hidePatientContactDetails(user);
  const canDeletePatient = hasRole(user, "admin") || hasRole(user, "ceo");
  const canCreateVisit = canDo(user?.role, "create_visit");
  const canViewBills =
    hasRole(user, "owner") ||
    hasRole(user, "ceo") ||
    hasRole(user, "admin") ||
    hasRole(user, "reception") ||
    hasRole(user, "cashier") ||
    hasRole(user, "sales_marketing");
  const formResponses = useMemo(
    () =>
      Array.isArray(patient?.formResponses)
        ? patient.formResponses
        : Array.isArray(patient?.form_responses)
          ? patient.form_responses
          : [],
    [patient],
  );
  const latestQuestionnaireResponse = useMemo(() => {
    const directResponse =
      patient?.questionnaireResponse ?? patient?.questionnaire_response ?? null;

    if (directResponse) {
      return directResponse;
    }

    const matchingResponses = formResponses.filter(
      (response) => response.form?.code === GENERAL_HEALTH_FORM_CODE,
    );

    return matchingResponses.sort((a, b) =>
      dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
    )[0] ?? null;
  }, [patient, formResponses]);
  const syncEditableState = (nextPatient) => {
    setNotes(nextPatient?.notes ?? "");
    const dob = nextPatient?.dob ? dayjs(nextPatient.dob) : null;
    setEditForm({
      name: nextPatient?.name ?? "",
      type: nextPatient?.type ?? "customer",
      gender: nextPatient?.gender ?? "",
      phone: nextPatient?.phone ?? "",
      birth_day:
        nextPatient?.birth_day != null
          ? String(nextPatient.birth_day)
          : dob
            ? String(dob.date())
            : "",
      birth_month:
        nextPatient?.birth_month != null
          ? String(nextPatient.birth_month)
          : dob
            ? String(dob.month() + 1)
            : "",
      birth_year:
        nextPatient?.birth_year != null
          ? String(nextPatient.birth_year)
          : dob
            ? String(dob.year())
            : "",
      weight_kg:
        nextPatient?.weight_kg !== null && nextPatient?.weight_kg !== undefined
          ? String(nextPatient.weight_kg)
          : "",
      height_cm:
        nextPatient?.height_cm !== null && nextPatient?.height_cm !== undefined
          ? String(nextPatient.height_cm)
          : "",
      address: nextPatient?.address ?? "",
      status: nextPatient?.status ?? "active",
    });
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    getPatient(id)
      .then((p) => {
        setPatient(p);
        syncEditableState(p);
      })
      .catch((err) => {
        setError(resolveApiError(err, "Could not load patient details."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveNotes = async () => {
    if (!patient || !canUpdatePatientNotes) return;
    setSavingNotes(true);
    try {
      const updated = await patchPatientNotes(patient.id, { notes });
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              notes: updated.notes ?? notes,
            }
          : prev,
      );
    } catch (err) {
      setError(resolveApiError(err, "Unable to save notes."));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!patient || !canManagePatient) return;

    setSavingInfo(true);
    try {
      const toNullableInt = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const updated = await updatePatient(patient.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        gender: editForm.gender || null,
        phone: editForm.phone.trim(),
        birth_day: toNullableInt(editForm.birth_day),
        birth_month: toNullableInt(editForm.birth_month),
        birth_year: toNullableInt(editForm.birth_year),
        weight_kg: editForm.weight_kg || null,
        height_cm: editForm.height_cm || null,
        address: editForm.address.trim() || null,
        status: editForm.status,
      });
      setPatient((prev) => ({ ...prev, ...updated }));
      syncEditableState({ ...patient, ...updated, notes });
      setEditingInfo(false);
      pushToast({ message: "Patient updated successfully.", severity: "success" });
    } catch (err) {
      setError(resolveApiError(err, "Unable to update patient."));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patient || !canDeletePatient) return;
    if (deleteConfirmName.trim() !== patient.name) {
      setError("Enter the patient's full name to confirm deletion.");
      return;
    }

    const approved = await askConfirm({
      title: "Soft delete patient",
      message:
        "This will hide the patient from normal lists but keep historical records linked.",
      confirmText: "Delete Patient",
    });
    if (!approved) return;

    setDeletingPatient(true);
    try {
      await deletePatient(patient.id);
      pushToast({ message: "Patient deleted successfully.", severity: "success" });
      navigate("/patients");
    } catch (err) {
      setError(resolveApiError(err, "Unable to delete patient."));
    } finally {
      setDeletingPatient(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
    }
  };

  const handleCheckInSubmit = async ({ newComplaint, followUp, checkInMode, note }) => {
    if (!patient) return;
    try {
      await createVisit({
        patient_id: patient.id,
        new_complaint: newComplaint,
        follow_up: followUp,
        check_in_mode: checkInMode,
        notes: note,
      });
      setCheckInOpen(false);
      setPostCheckInOpen(true);
      const refreshed = await getPatient(patient.id);
      setPatient(refreshed);
      syncEditableState(refreshed);
      pushToast({
        message: "Patient checked in — visit added to today's register.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Check-in failed."),
        severity: "error",
      });
    }
  };

  const clinicalHistory = patient?.medical_history ?? patient?.medicalHistory ?? null;

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (!patient)
    return (
      <Typography color="error">{error || "Patient not found"}</Typography>
    );

  const tabItems = [
    {
      label: "Info",
      content: (
        <PatientInfoTab
          patient={patient}
          showClinicalHistoryWarning={isClinicalMedicalHistoryEmpty(clinicalHistory)}
          editingInfo={editingInfo}
          canManagePatient={canManagePatient}
          hideContactDetails={hideContactUi}
          editForm={editForm}
          setEditForm={setEditForm}
          handleSaveInfo={handleSaveInfo}
          savingInfo={savingInfo}
          syncEditableState={syncEditableState}
          setEditingInfo={setEditingInfo}
        />
      ),
    },
    {
      label: "Medical History",
      content: (
        <PatientMedicalHistoryTab
          patientId={patient.id}
          latestQuestionnaireResponse={latestQuestionnaireResponse}
          patient={patient}
          visits={patient.visits}
          canEditClinicalHistory={canEditClinicalHistory}
          onClinicalHistorySaved={(saved) => {
            setPatient((prev) =>
              prev
                ? {
                    ...prev,
                    medical_history: saved,
                    medicalHistory: saved,
                  }
                : prev,
            );
          }}
        />
      ),
    },
    {
      label: "Visits",
      content: <PatientVisitsTab visits={patient.visits} />,
    },
    {
      label: "Consultation",
      content: <PatientConsultationTab visits={patient.visits} />,
    },
    {
      label: "Timeline",
      content: <PatientTimelineTab patientId={patient.id} />,
    },
    {
      label: "Intake Forms",
      content: <PatientIntakeFormsTab formResponses={formResponses} />,
    },
    {
      label: "Notes",
      content: (
        <PatientNotesTab
          notes={notes}
          setNotes={setNotes}
          canUpdatePatientNotes={canUpdatePatientNotes}
          savingNotes={savingNotes}
          handleSaveNotes={handleSaveNotes}
        />
      ),
    },
    ...(canViewBills
      ? [
          {
            label: "Billing",
            content: <PatientPaymentHistoryTab visits={patient.visits} />,
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card sx={{ p: 3, mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5">{patient.name}</Typography>
              <Chip
                label={resolvePatientNumber(patient)}
                size="small"
                variant="outlined"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatPatientAgeSex(patient)}
              {!hideContactUi && patient.phone ? ` · ${patient.phone}` : ""}
            </Typography>
          </Box>
          <Chip
            label={patient.status}
            color={patient.status === "active" ? "success" : "default"}
            sx={{ textTransform: "capitalize" }}
          />
        </Stack>
        {(canManagePatient || canDeletePatient || canCreateVisit) && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2 }}
            flexWrap="wrap"
            useFlexGap
          >
            {canCreateVisit && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<EventSeatIcon />}
                onClick={() => setCheckInOpen(true)}
              >
                Check-in
              </Button>
            )}
            {canManagePatient && (
              <Button
                variant={editingInfo ? "outlined" : "contained"}
                startIcon={<EditIcon />}
                onClick={() => {
                  if (editingInfo) {
                    syncEditableState(patient);
                  }
                  setEditingInfo((prev) => !prev);
                }}
              >
                {editingInfo ? "Cancel Edit" : "Edit Patient"}
              </Button>
            )}
            {canDeletePatient && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setError("");
                  setDeleteDialogOpen(true);
                }}
              >
                Delete Patient
              </Button>
            )}
          </Stack>
        )}
      </Card>

      <Card>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          {tabItems.map((tabItem) => (
            <Tab key={tabItem.label} label={tabItem.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabItems.map((tabItem, index) => (
            <PatientTabPanel key={tabItem.label} value={tab} index={index}>
              {tabItem.content}
            </PatientTabPanel>
          ))}
        </Box>
      </Card>
      <CheckInConfirmDialog
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        patientName={patient.name}
        onCheckIn={handleCheckInSubmit}
      />
      <PostCheckInDestinationDialog
        open={postCheckInOpen}
        onClose={() => setPostCheckInOpen(false)}
        onGoToLiveBoard={() => {
          setPostCheckInOpen(false);
          navigate(getUserVisitHistoryPath(user));
        }}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deletingPatient) {
            setDeleteDialogOpen(false);
            setDeleteConfirmName("");
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This performs a soft delete. Historical visits, appointments, and
              payments remain linked to this patient.
            </Typography>
            <Typography variant="body2">
              Type <strong>{patient.name}</strong> to confirm.
            </Typography>
            <TextField
              label="Patient name"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmName("");
            }}
            disabled={deletingPatient}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingPatient}
            onClick={handleDeletePatient}
          >
            {deletingPatient ? "Deleting..." : "Delete Patient"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
