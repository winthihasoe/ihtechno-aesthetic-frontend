import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Card,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import Person4RoundedIcon from "@mui/icons-material/Person4Rounded";
import Person3RoundedIcon from "@mui/icons-material/Person3Rounded";
import dayjs from "dayjs";
import {
  getPatient,
  updatePatient,
  deletePatient,
} from "../../services/patientService";
import {
  getPhotos,
  uploadPhoto,
  deletePhoto,
} from "../../services/photoService";
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
import DuplicatePhoneWarning from "../../components/Patients/DuplicatePhoneWarning";
import { findPatientsWithPhone } from "../../utils/patientDuplicatePhone";
import {
  isValidPhone,
  normalizePhone,
  phoneValidationMessage,
} from "../../utils/phoneUtils";
import { createVisit } from "../../services/visitService";
import {
  checkInAppointment,
  getAppointment,
} from "../../services/appointmentService";
import {
  getPatientDetailPath,
  getWorkspaceUrlPrefix,
} from "../../utils/workspaceRoutes";
import CheckInConfirmDialog from "../../components/check-in/CheckInConfirmDialog";
import PostCheckInDestinationDialog from "../../components/check-in/PostCheckInDestinationDialog";
import PatientBeforeAfterTab from "./components/PatientBeforeAfterTab";
import PatientConsultationTab from "./components/PatientConsultationTab";
import PatientMedicalHistoryTab from "./components/PatientMedicalHistoryTab";
import PatientNotesTab from "./components/PatientNotesTab";
import PatientPaymentHistoryTab from "./components/PatientPaymentHistoryTab";
import TabbedPanel from "../../components/common/TabbedPanel";
import PatientTreatmentHistoryTab from "./components/PatientTreatmentHistoryTab";
import PatientVisitsTab from "./components/PatientVisitsTab";
import PatientPackagesTab from "./components/PatientPackagesTab";
import PatientTimelineTab from "./components/PatientTimelineTab";

const QUESTIONNAIRE_FORM_CODE = "aesthetic_health_information_mm";

const APPOINTMENT_TYPE_LABELS = {
  consultation: "Consultation",
  treatment: "Treatment Session",
  package_session: "Package Session",
  follow_up_visit: "Follow-Up Visit",
};

const formatAppointmentDateTime = (value) =>
  value ? dayjs(value).format("DD-MM-YYYY HH:mm") : "";

function getVisitSortTimestamp(visit) {
  return dayjs(
    visit?.visit_time ??
      visit?.created_at ??
      visit?.check_in_at ??
      visit?.updated_at,
  ).valueOf();
}

// function isClinicalMedicalHistoryEmpty(mh) {
//   if (mh == null || typeof mh !== "object") return true;
//   const t = (k) => String(mh[k] ?? "").trim();
//   if (
//     t("allergies") ||
//     t("current_medications") ||
//     t("chronic_diseases") ||
//     t("skin_conditions") ||
//     t("past_aesthetic_history")
//   ) {
//     return false;
//   }
//   if (mh.pregnancy_status || mh.breastfeeding_status) return false;
//   return true;
// }

function resolveGenderAvatarConfig(gender, name) {
  const value = String(gender ?? "")
    .trim()
    .toLowerCase();
  if (value === "male") {
    return {
      icon: <Person4RoundedIcon fontSize="small" />,
      sx: { bgcolor: "info.light", color: "info.dark" },
    };
  }
  if (value === "female") {
    return {
      icon: <Person3RoundedIcon fontSize="small" />,
      sx: { bgcolor: "secondary.light", color: "secondary.dark" },
    };
  }

  return {
    icon:
      String(name ?? "")
        .trim()
        .charAt(0)
        .toUpperCase() || "?",
    sx: { bgcolor: "grey.200", color: "text.primary", fontWeight: 700 },
  };
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedAppointmentId = searchParams.get("appointmentId");
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    client_id: "",
    type: "customer",
    gender: "",
    phone: "",
    viber_phone: "",
    telegram_phone: "",
    email: "",
    referral_name: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    weight_kg: "",
    height_cm: "",
    address: "",
    status: "active",
  });
  const [photosByVisit, setPhotosByVisit] = useState({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingVisitId, setUploadingVisitId] = useState("");
  const [uploadingType, setUploadingType] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postCheckInOpen, setPostCheckInOpen] = useState(false);
  const [lastCheckInQueueNumber, setLastCheckInQueueNumber] = useState("");
  const [duplicatePhoneMatches, setDuplicatePhoneMatches] = useState([]);
  const [linkedAppointment, setLinkedAppointment] = useState(null);
  const [loadingLinkedAppointment, setLoadingLinkedAppointment] = useState(false);
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
  const canDeletePatient = hasRole(user, "admin");
  const canCreateVisit = canDo(user?.role, "create_visit");
  const canViewBills =
    hasRole(user, "owner") ||
    hasRole(user, "reception") ||
    hasRole(user, "sales_marketing");
  const latestQuestionnaireResponse = useMemo(() => {
    const directResponse =
      patient?.questionnaireResponse ?? patient?.questionnaire_response ?? null;

    if (directResponse) {
      return directResponse;
    }

    const responses = Array.isArray(patient?.formResponses)
      ? patient.formResponses
      : [];

    const matchingResponses = responses.filter(
      (response) => response.form?.code === QUESTIONNAIRE_FORM_CODE,
    );

    return (
      matchingResponses.sort(
        (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
      )[0] ?? null
    );
  }, [patient]);
  const latestVisit = useMemo(() => {
    if (!Array.isArray(patient?.visits) || patient.visits.length === 0)
      return null;
    return [...patient.visits].sort(
      (a, b) => getVisitSortTimestamp(b) - getVisitSortTimestamp(a),
    )[0];
  }, [patient?.visits]);

  const syncEditableState = (nextPatient) => {
    const dob = nextPatient?.dob ? dayjs(nextPatient.dob) : null;
    setEditForm({
      name: nextPatient?.name ?? "",
      client_id: nextPatient?.client_id ?? "",
      type: nextPatient?.type ?? "customer",
      gender: nextPatient?.gender ?? "",
      phone: nextPatient?.phone ?? "",
      viber_phone: nextPatient?.viber_phone ?? "",
      telegram_phone: nextPatient?.telegram_phone ?? "",
      email: nextPatient?.email ?? "",
      referral_name: nextPatient?.referral_name ?? "",
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

  const loadPhotos = async (visits) => {
    if (!Array.isArray(visits) || visits.length === 0) {
      setPhotosByVisit({});
      return;
    }

    setLoadingPhotos(true);
    try {
      const pairs = await Promise.all(
        visits.map(async (visit) => {
          try {
            const photos = await getPhotos(visit.id);
            return [visit.id, Array.isArray(photos) ? photos : []];
          } catch {
            return [visit.id, []];
          }
        }),
      );
      setPhotosByVisit(Object.fromEntries(pairs));
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    getPatient(id)
      .then((p) => {
        setPatient(p);
        syncEditableState(p);
        const seeded = {};
        for (const v of p.visits ?? []) {
          seeded[String(v.id)] = Array.isArray(v.photos) ? [...v.photos] : [];
        }
        setPhotosByVisit(seeded);
        loadPhotos(p.visits ?? []);
      })
      .catch((err) => {
        setError(resolveApiError(err, "Could not load patient details."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!linkedAppointmentId) {
      setLinkedAppointment(null);
      setLoadingLinkedAppointment(false);
      return;
    }

    let cancelled = false;
    setLoadingLinkedAppointment(true);
    getAppointment(Number(linkedAppointmentId))
      .then((row) => {
        if (!cancelled) setLinkedAppointment(row ?? null);
      })
      .catch(() => {
        if (!cancelled) setLinkedAppointment(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingLinkedAppointment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linkedAppointmentId]);

  const linkedAppointmentCheckIn = useMemo(() => {
    if (!linkedAppointment || !patient) return null;
    if (Number(linkedAppointment.patient_id) !== Number(patient.id)) {
      return null;
    }
    if (linkedAppointment.visit_id) return null;
    if (!["pending", "confirmed"].includes(linkedAppointment.status)) {
      return null;
    }
    return {
      id: linkedAppointment.id,
      scheduled_at: formatAppointmentDateTime(linkedAppointment.scheduled_at),
      typeLabel:
        APPOINTMENT_TYPE_LABELS[linkedAppointment.type] ??
        APPOINTMENT_TYPE_LABELS.consultation,
    };
  }, [linkedAppointment, patient]);

  useEffect(() => {
    if (!editingInfo) {
      setDuplicatePhoneMatches([]);
      return undefined;
    }

    const phone = normalizePhone(editForm.phone);
    if (!phone || !isValidPhone(phone)) {
      setDuplicatePhoneMatches([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      findPatientsWithPhone(phone, patient?.id)
        .then((matches) => {
          if (active) setDuplicatePhoneMatches(matches);
        })
        .catch(() => {
          if (active) setDuplicatePhoneMatches([]);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [editingInfo, editForm.phone, patient?.id]);

  const handleSaveInfo = async () => {
    if (!patient || !canManagePatient) return;

    const phoneMsg = phoneValidationMessage(editForm.phone, { required: true });
    const viberMsg = phoneValidationMessage(editForm.viber_phone);
    const telegramMsg = phoneValidationMessage(editForm.telegram_phone);
    if (phoneMsg || viberMsg || telegramMsg) {
      pushToast({
        message: phoneMsg || viberMsg || telegramMsg,
        severity: "error",
      });
      return;
    }

    setSavingInfo(true);
    try {
      const toNullableInt = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const updated = await updatePatient(patient.id, {
        name: editForm.name.trim(),
        client_id: editForm.client_id.trim() || null,
        type: editForm.type,
        gender: editForm.gender || null,
        phone: normalizePhone(editForm.phone),
        viber_phone: normalizePhone(editForm.viber_phone) || null,
        telegram_phone: normalizePhone(editForm.telegram_phone) || null,
        email: editForm.email.trim() || null,
        referral_name: editForm.referral_name.trim() || null,
        birth_day: toNullableInt(editForm.birth_day),
        birth_month: toNullableInt(editForm.birth_month),
        birth_year: toNullableInt(editForm.birth_year),
        weight_kg: editForm.weight_kg || null,
        height_cm: editForm.height_cm || null,
        address: editForm.address.trim() || null,
        status: editForm.status,
      });
      setPatient((prev) => ({ ...prev, ...updated }));
      syncEditableState({ ...patient, ...updated });
      setEditingInfo(false);
      pushToast({
        message: "Patient updated successfully.",
        severity: "success",
      });
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
      pushToast({
        message: "Patient deleted successfully.",
        severity: "success",
      });
      navigate("/patients");
    } catch (err) {
      setError(resolveApiError(err, "Unable to delete patient."));
    } finally {
      setDeletingPatient(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
    }
  };

  const handleUploadPhoto = async (visitId, file, type) => {
    if (!file || !visitId) return;
    const key = String(visitId);

    setUploadingVisitId(key);
    setUploadingType(type);
    try {
      const uploaded = await uploadPhoto(visitId, file, type, "consultation");
      setPhotosByVisit((prev) => {
        const current = prev[key] ?? [];
        return {
          ...prev,
          [key]: [uploaded, ...current],
        };
      });
    } catch (err) {
      setError(resolveApiError(err, "Unable to upload photo."));
    } finally {
      setUploadingVisitId("");
      setUploadingType("");
    }
  };

  const handleDeletePhoto = async (visitId, photo) => {
    const key = String(visitId);
    try {
      await deletePhoto(photo.id);
      setPhotosByVisit((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).filter((p) => p.id !== photo.id),
      }));
    } catch (err) {
      setError(resolveApiError(err, "Unable to delete photo."));
    }
  };

  const handleCheckInSubmit = async (payload) => {
    if (!patient) return;
    try {
      let visit;
      if (payload?.appointmentId) {
        const updated = await checkInAppointment(Number(payload.appointmentId));
        visit = updated?.visit ?? null;
      } else {
        visit = await createVisit({
          patient_id: patient.id,
          new_complaint: payload.newComplaint,
          follow_up: payload.followUp,
          check_in_mode: payload.checkInMode,
          notes: payload.note,
        });
      }
      setLastCheckInQueueNumber(visit?.queue_number ?? "");
      setCheckInOpen(false);
      setPostCheckInOpen(true);
      if (payload?.appointmentId) {
        navigate(getPatientDetailPath(workspacePrefix, patient.id), {
          replace: true,
        });
        setLinkedAppointment(null);
      }
      const refreshed = await getPatient(patient.id);
      setPatient(refreshed);
      syncEditableState(refreshed);
      const seeded = {};
      for (const v of refreshed.visits ?? []) {
        seeded[String(v.id)] = Array.isArray(v.photos) ? [...v.photos] : [];
      }
      setPhotosByVisit(seeded);
      loadPhotos(refreshed.visits ?? []);
      pushToast({
        message: payload?.appointmentId
          ? "Patient checked in — appointment linked on the Live Board."
          : "Patient checked in — visit is on the Live Board.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Check-in failed."),
        severity: "error",
      });
      throw err;
    }
  };

  const genderAvatar = resolveGenderAvatarConfig(
    patient?.gender,
    patient?.name,
  );

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  if (!patient)
    return (
      <Typography color="error">{error || "Patient not found"}</Typography>
    );

  const tabItems = [
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
      label: "Consultation",
      content: <PatientConsultationTab visits={patient.visits} />,
    },
    {
      label: "Treatment History",
      content: <PatientTreatmentHistoryTab visits={patient.visits} />,
    },
    {
      label: "Visits",
      content: <PatientVisitsTab visits={patient.visits} />,
    },
    {
      label: "Before/After",
      content: (
        <PatientBeforeAfterTab
          visits={patient.visits}
          canManagePatient={canManagePatient}
          uploadingVisitId={uploadingVisitId}
          uploadingType={uploadingType}
          handleUploadPhoto={handleUploadPhoto}
          loadingPhotos={loadingPhotos}
          photosByVisit={photosByVisit}
          handleDeletePhoto={handleDeletePhoto}
        />
      ),
    },
    {
      label: "Notes",
      content: (
        <PatientNotesTab
          patientId={patient.id}
          canUpdatePatientNotes={canUpdatePatientNotes}
        />
      ),
    },
    {
      label: "Timeline",
      content: <PatientTimelineTab patientId={patient.id} />,
    },
    {
      label: "Follow-up History",
      content: (
        <PatientTimelineTab patientId={patient.id} initialFilterType="follow_up" />
      ),
    },
    ...(canViewBills
      ? [
          {
            label: "Bills",
            content: <PatientPaymentHistoryTab visits={patient.visits} />,
          },
        ]
      : []),
    {
      label: "Packages",
      content: <PatientPackagesTab patientId={patient.id} />,
    },
  ];

  return (
    <Box pb={2}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      {linkedAppointmentCheckIn ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Scheduled appointment: {linkedAppointmentCheckIn.typeLabel}
          {linkedAppointmentCheckIn.scheduled_at
            ? ` · ${linkedAppointmentCheckIn.scheduled_at}`
            : ""}
          . Use <strong>Check-in</strong> to open the visit and link this
          appointment.
        </Alert>
      ) : null}
      {loadingLinkedAppointment && linkedAppointmentId ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Loading linked appointment…
        </Alert>
      ) : null}

      <Card sx={{ p: { xs: 1.5, md: 2 }, mb: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, ...genderAvatar.sx }}>
                {genderAvatar.icon}
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    lineHeight: 1.2,
                  }}
                >
                  {patient.name}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography
                variant="overline"
                mr={1}
                color={patient.status === "active" ? "success" : "default"}
                fontWeight={800}
              >
                {patient.status}
              </Typography>
              <Chip
                variant="contained"
                label={`Last Visit: ${
                  latestVisit?.created_at ||
                  latestVisit?.check_in_at ||
                  latestVisit?.visit_time
                    ? dayjs(
                        latestVisit.created_at ??
                          latestVisit.check_in_at ??
                          latestVisit.visit_time,
                      ).format("DD-MM-YYYY HH:mm")
                    : "N/A"
                }`}
              />
            </Stack>
          </Stack>
          <Stack
            sx={{
              mt: 0.85,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              bgcolor: "background.paper",
              px: 1.25,
              py: 1.1,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                  lg: "repeat(5, minmax(0, 1fr))",
                },
                columnGap: 1.5,
                rowGap: 1.1,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  Client ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patient.client_id || "-"}
                </Typography>
              </Box>
              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    Phone
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {patient.phone || "-"}
                  </Typography>
                </Box>
              )}
              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.6rem",
                      lineHeight: 1.1,
                    }}
                  >
                    Telegram
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {patient.telegram_phone || "-"}
                  </Typography>
                </Box>
              )}
              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.6rem",
                      lineHeight: 1.1,
                    }}
                  >
                    Viber
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {patient.viber_phone || "-"}
                  </Typography>
                </Box>
              )}
              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.6rem",
                      lineHeight: 1.1,
                    }}
                  >
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {patient.email || "-"}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.6rem", lineHeight: 1.1 }}
                >
                  Gender
                </Typography>
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{ fontWeight: 700 }}
                >
                  {patient.gender || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.6rem", lineHeight: 1.1 }}
                >
                  Date of Birth
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patient.dob
                    ? dayjs(patient.dob).format("DD-MM-YYYY")
                    : patient.birth_day ||
                        patient.birth_month ||
                        patient.birth_year
                      ? `${patient.birth_day ?? "—"} / ${patient.birth_month ?? "—"} / ${patient.birth_year ?? "—"}`
                      : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.6rem", lineHeight: 1.1 }}
                >
                  Weight / Height
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patient.weight_kg || "-"}kg / {patient.height_cm || "-"}cm
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, lineHeight: 1.1 }}
                >
                  Referral
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patient.referral_name || "-"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1", lg: "span 3" } }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.6rem", lineHeight: 1.1 }}
                >
                  Address
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patient.address || "-"}
                </Typography>
              </Box>
            </Box>
          </Stack>
          {(canManagePatient || canDeletePatient || canCreateVisit) && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ pt: 0.125 }}
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
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    syncEditableState(patient);
                    setEditingInfo(true);
                  }}
                >
                  Edit Patient
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
        </Stack>
      </Card>

      <Card>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        <TabbedPanel
          items={tabItems}
          value={tab}
          onChange={setTab}
          contentSx={{ px: { xs: 1.25, md: 1.75 }, pb: 2 }}
        />
      </Card>
      <CheckInConfirmDialog
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        patientName={patient.name}
        onCheckIn={handleCheckInSubmit}
        linkedAppointment={linkedAppointmentCheckIn}
      />
      <PostCheckInDestinationDialog
        open={postCheckInOpen}
        onClose={() => setPostCheckInOpen(false)}
        queueNumber={lastCheckInQueueNumber}
        onGoToLiveBoard={() => {
          setPostCheckInOpen(false);
          navigate("/live-board");
        }}
      />

      <Dialog
        open={editingInfo}
        onClose={() => {
          if (!savingInfo) {
            syncEditableState(patient);
            setEditingInfo(false);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Update Patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              <Box sx={{ gridColumn: { xs: "1", sm: "1 / span 2" } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Full Name
                </Typography>
                <TextField
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  fullWidth
                  size="small"
                  placeholder="Enter patient full name"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Client ID
                </Typography>
                <TextField
                  value={editForm.client_id}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      client_id: e.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Patient Type
                </Typography>
                <TextField
                  select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="relative">Relative</MenuItem>
                  <MenuItem value="friends">Friends</MenuItem>
                  <MenuItem value="doctor">Doctor</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </TextField>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Gender
                </Typography>
                <TextField
                  select
                  value={editForm.gender}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value="">-</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </TextField>
              </Box>

              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Phone
                  </Typography>
                  <TextField
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                  <DuplicatePhoneWarning matches={duplicatePhoneMatches} />
                </Box>
              )}

              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Viber Phone
                  </Typography>
                  <TextField
                    value={editForm.viber_phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        viber_phone: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}

              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Telegram No.
                  </Typography>
                  <TextField
                    value={editForm.telegram_phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        telegram_phone: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}

              {!hideContactUi && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Email
                  </Typography>
                  <TextField
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Status
                </Typography>
                <TextField
                  select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Referral Name
                </Typography>
                <TextField
                  value={editForm.referral_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      referral_name: e.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Birth Day
                </Typography>
                <TextField
                  type="number"
                  value={editForm.birth_day}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      birth_day: e.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1, max: 31 } }}
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Birth Month
                </Typography>
                <TextField
                  type="number"
                  value={editForm.birth_month}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      birth_month: e.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1, max: 12 } }}
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Birth Year
                </Typography>
                <TextField
                  type="number"
                  value={editForm.birth_year}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      birth_year: e.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1900, max: 2100 } }}
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Weight (kg)
                </Typography>
                <TextField
                  type="number"
                  value={editForm.weight_kg}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      weight_kg: e.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Height (cm)
                </Typography>
                <TextField
                  type="number"
                  value={editForm.height_cm}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      height_cm: e.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              {!hideContactUi && (
                <Box sx={{ gridColumn: { xs: "1", sm: "1 / span 2" } }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Address
                  </Typography>
                  <TextField
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              syncEditableState(patient);
              setEditingInfo(false);
            }}
            disabled={savingInfo}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveInfo}
            disabled={savingInfo}
          >
            {savingInfo ? "Saving..." : "Save Patient"}
          </Button>
        </DialogActions>
      </Dialog>

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
