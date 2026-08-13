import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  Autocomplete,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ViewListIcon from "@mui/icons-material/ViewList";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddIcon from "@mui/icons-material/Add";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  checkInAppointment,
  getAssignableAppointmentDoctors,
} from "../services/appointmentService";
import {
  searchPatientsAutocomplete,
  getAppointmentPackageOptions,
} from "../services/patientService";
import { getActiveTreatmentTemplates } from "../services/treatmentTemplateService";
import { resolveApiError } from "../services/apiClient";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import { canDo } from "../utils/roleUtils";
import { hasPermission } from "../utils/accessUtils";
import {
  getPatientCreatePath,
  getWorkspaceUrlPrefix,
} from "../utils/workspaceRoutes";
import useToastStore from "../stores/toastStore";
import { getPublicHolidays } from "../services/hrService";
import ManualScheduledAtFields from "../components/Appointments/ManualScheduledAtFields";
import LoadingIndicator from "../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../components/common/CollapsibleFilters";
import {
  buildDefaultNewAppointmentSchedule,
  parseScheduledParts,
} from "../components/Appointments/manualScheduledAtUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const STATUS_COLOR = {
  pending: { chip: "warning", label: "Pending", hex: "#F59E0B" },
  confirmed: { chip: "info", label: "Confirmed", hex: "#0284C7" },
  completed: { chip: "success", label: "Completed", hex: "#16A34A" },
  cancelled: { chip: "error", label: "Cancelled", hex: "#DC2626" },
};

const APPOINTMENT_TYPE_LABELS = {
  consultation: "Consultation",
  treatment: "Treatment Session",
  package_session: "Package Session",
  follow_up_visit: "Follow-Up Visit",
};

const appointmentTypeLabel = (type) =>
  APPOINTMENT_TYPE_LABELS[type] || APPOINTMENT_TYPE_LABELS.consultation;

const appointmentPatientName = (appointment) =>
  appointment?.patient?.name ||
  appointment?.provisional_patient_name ||
  "Patient";

const packageOptionLabel = (option) =>
  `${option.package_name} · ${option.template_name} (${option.remaining_sessions} left)`;

const buildPlanPayload = (templates, packages) => ({
  treatment_template_ids: (templates ?? []).map((row) => row.id),
  planned_packages: (packages ?? []).map((row) => ({
    patient_package_item_id: row.id,
    planned_sessions: Number(row.planned_sessions ?? 1),
  })),
});

const mapAppointmentTemplates = (appointment) =>
  Array.isArray(appointment?.treatment_templates)
    ? appointment.treatment_templates
    : [];

const mapAppointmentPackages = (appointment) =>
  (appointment?.planned_package_items ?? []).map((row) => ({
    id: row.id,
    package_name: row.patient_package?.package?.name ?? "Package",
    template_name: row.treatment_template?.name ?? "Treatment",
    remaining_sessions: row.remaining_sessions,
    planned_sessions: row.pivot?.planned_sessions ?? 1,
  }));

const appointmentVisitLabel = (appointment) => {
  if (appointment?.status === "completed") {
    return { label: "Completed", color: "success" };
  }
  if (appointment?.visit_id) {
    return { label: "Checked In", color: "info" };
  }
  return null;
};

const appointmentPlanSummary = (appointment) => {
  const templates = mapAppointmentTemplates(appointment);
  const packages = appointment?.planned_package_items ?? [];
  const parts = [];
  if (templates.length) {
    parts.push(
      templates.length === 1
        ? templates[0].name
        : `${templates.length} treatments`,
    );
  }
  if (packages.length) {
    const label =
      packages[0]?.patient_package?.package?.name ??
      packages[0]?.treatment_template?.name ??
      "Package";
    parts.push(
      packages.length > 1 ? `${label} +${packages.length - 1}` : label,
    );
  }
  return parts.join(" · ");
};

const calendarAppointmentTitle = (appointment) => {
  const patientName = appointmentPatientName(appointment);
  const plan = appointmentPlanSummary(appointment);
  if (plan) return `${patientName} · ${plan}`;
  return `${patientName} · ${appointmentTypeLabel(appointment.type)}`;
};

const patientOptionLabel = (patient) => {
  if (!patient?.name) return "";
  return patient.phone ? `${patient.name} (${patient.phone})` : patient.name;
};

const autocompleteSlotProps = {
  paper: {
    sx: (theme) => ({
      backgroundImage: "none",
      backgroundColor:
        theme.palette.mode === "light"
          ? "rgba(250,242,252,0.98)"
          : "rgba(22,27,34,0.96)",
      border:
        theme.palette.mode === "light"
          ? "1px solid rgba(102,68,117,0.24)"
          : "1px solid rgba(255,255,255,0.12)",
      boxShadow:
        theme.palette.mode === "light"
          ? "0 12px 26px rgba(33,18,40,0.22)"
          : "0 12px 26px rgba(0,0,0,0.42)",
      borderRadius: 1,
    }),
  },
};

const ASSIGNABLE_DOCTOR_ROLE_LABEL = {
  doctor: "Medical doctor",
  dermatologist: "Dermatologist",
  owner: "CEO",
  medical_officer: "Medical officer",
  physician: "Physician",
};
const CLINIC_TIMEZONE = "Asia/Yangon";

const appointmentDoctorOptionLabel = (user) => {
  if (!user?.name) return "";
  const roleObjs = Array.isArray(user.roles) ? user.roles : [];
  const slugFromPivot =
    roleObjs.find((r) => ASSIGNABLE_DOCTOR_ROLE_LABEL[r.slug])?.slug ||
    user.role;
  const label =
    ASSIGNABLE_DOCTOR_ROLE_LABEL[slugFromPivot] ||
    (slugFromPivot === "owner"
      ? "CEO"
      : roleObjs.find((r) => r.slug === slugFromPivot)?.name);
  return label ? `${user.name} (${label})` : user.name;
};

const toClinicDayjs = (value) => dayjs(value).tz(CLINIC_TIMEZONE);

const toDateTimeLocal = (value) =>
  value ? toClinicDayjs(value).format("YYYY-MM-DDTHH:mm") : "";

const toClinicDateTimeSecond = (value) =>
  value ? toClinicDayjs(value).format("YYYY-MM-DDTHH:mm:ss") : "";

const formatClinicAppointmentDateTime = (value) =>
  value ? toClinicDayjs(value).format("D MMM YYYY, HH:mm") : "-";

/** Send datetime-local value as wall time (no UTC shift); backend interprets in app timezone. */
const scheduledLocalPickerToApi = (datetimeLocal) => {
  const t = String(datetimeLocal ?? "").trim();
  if (!t) return "";
  return t.length === 16 ? `${t}:00` : t;
};

const DEFAULT_APPT_START = "09:00";
const DEFAULT_APPT_END = "18:00";
const CALENDAR_END_BUFFER_MINUTES = 60;
const PATIENT_SEARCH_MIN_CHARS = 2;
const PATIENT_SEARCH_DEBOUNCE_MS = 450;

const parseHmToMinutes = (hm) => {
  if (!hm || typeof hm !== "string") return null;
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

const toFullCalendarTime = (hm, fallbackHm) => {
  const raw = (hm && String(hm).trim()) || fallbackHm;
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) {
    const fb = String(fallbackHm).match(/^(\d{1,2}):(\d{2})/);
    return fb ? `${String(fb[1]).padStart(2, "0")}:${fb[2]}:00` : "09:00:00";
  }
  return `${String(m[1]).padStart(2, "0")}:${m[2]}:00`;
};

const toBufferedFullCalendarEndTime = (hm, fallbackHm) => {
  const endMinutes =
    parseHmToMinutes(hm) ?? parseHmToMinutes(fallbackHm) ?? 18 * 60;
  const bufferedMinutes = Math.min(
    endMinutes + CALENDAR_END_BUFFER_MINUTES,
    24 * 60,
  );
  const h = Math.floor(bufferedMinutes / 60);
  const min = bufferedMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
};

const isWithinAppointmentHours = (value, startHm, endHm) => {
  const dt = dayjs(value);
  if (!dt.isValid()) return false;
  const startM =
    parseHmToMinutes(startHm) ?? parseHmToMinutes(DEFAULT_APPT_START);
  const endM = parseHmToMinutes(endHm) ?? parseHmToMinutes(DEFAULT_APPT_END);
  const totalMinutes = dt.hour() * 60 + dt.minute();
  return totalMinutes >= startM && totalMinutes <= endM;
};

const getScheduledOperationHoursError = (value, startHm, endHm, rangeLabel) => {
  if (!value) return null;
  if (!isWithinAppointmentHours(value, startHm, endHm)) {
    return `Appointment time must be within clinic operation hours (${rangeLabel}).`;
  }
  return null;
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { pushToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();

  const appointmentStartHm =
    settings.appointment_hours_start ?? DEFAULT_APPT_START;
  const appointmentEndHm = settings.appointment_hours_end ?? DEFAULT_APPT_END;
  const appointmentHoursRangeLabel = useMemo(
    () => `${appointmentStartHm} and ${appointmentEndHm}`,
    [appointmentStartHm, appointmentEndHm],
  );
  const calendarSlotMin = useMemo(
    () => toFullCalendarTime(appointmentStartHm, DEFAULT_APPT_START),
    [appointmentStartHm],
  );
  const calendarSlotMax = useMemo(
    () => toBufferedFullCalendarEndTime(appointmentEndHm, DEFAULT_APPT_END),
    [appointmentEndHm],
  );

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("calendar");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState("");
  const [draftTypeFilter, setDraftTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const [editForm, setEditForm] = useState({
    doctor_id: "",
    scheduled_at: "",
    notes: "",
    status: "pending",
    type: "consultation",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInConfirmOpen, setCheckInConfirmOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientInputValue, setPatientInputValue] = useState("");
  const patientSearchTimerRef = useRef(null);
  const patientSearchRequestRef = useRef(null);
  const patientSearchCacheRef = useRef(new Map());
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: "",
    scheduled_at: "",
    notes: "",
    type: "consultation",
  });
  const [treatmentTemplateOptions, setTreatmentTemplateOptions] = useState([]);
  const [loadingTreatmentTemplates, setLoadingTreatmentTemplates] =
    useState(false);
  const [createSelectedTemplates, setCreateSelectedTemplates] = useState([]);
  const [createSelectedPackages, setCreateSelectedPackages] = useState([]);
  const [createPackageOptions, setCreatePackageOptions] = useState([]);
  const [loadingCreatePackages, setLoadingCreatePackages] = useState(false);
  const [editSelectedTemplates, setEditSelectedTemplates] = useState([]);
  const [editSelectedPackages, setEditSelectedPackages] = useState([]);
  const [editPackageOptions, setEditPackageOptions] = useState([]);
  const [loadingEditPackages, setLoadingEditPackages] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [loadingPublicHolidays, setLoadingPublicHolidays] = useState(false);
  const [createScheduleParts, setCreateScheduleParts] = useState({
    day: "",
    month: "",
    year: "",
    hour: "",
    minute: "",
  });
  const [createScheduleResetKey, setCreateScheduleResetKey] = useState(0);
  const [editScheduleParts, setEditScheduleParts] = useState({
    day: "",
    month: "",
    year: "",
    hour: "",
    minute: "",
  });

  const holidayYearsKey = useMemo(() => {
    const years = new Set([dayjs().year()]);
    for (const value of [newAppointment.scheduled_at, editForm.scheduled_at]) {
      const year = dayjs(value).year();
      if (Number.isFinite(year)) years.add(year);
    }
    for (const parts of [createScheduleParts, editScheduleParts]) {
      const year = Number(parts.year);
      if (String(parts.year ?? "").length === 4 && Number.isFinite(year)) {
        years.add(year);
      }
    }
    return [...years].sort((a, b) => a - b).join(",");
  }, [
    newAppointment.scheduled_at,
    editForm.scheduled_at,
    createScheduleParts.year,
    editScheduleParts.year,
  ]);

  const createScheduledHoursError = useMemo(
    () =>
      getScheduledOperationHoursError(
        newAppointment.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
        appointmentHoursRangeLabel,
      ),
    [
      newAppointment.scheduled_at,
      appointmentStartHm,
      appointmentEndHm,
      appointmentHoursRangeLabel,
    ],
  );

  const editScheduledHoursError = useMemo(
    () =>
      getScheduledOperationHoursError(
        editForm.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
        appointmentHoursRangeLabel,
      ),
    [
      editForm.scheduled_at,
      appointmentStartHm,
      appointmentEndHm,
      appointmentHoursRangeLabel,
    ],
  );

  const editDoctorOptions = useMemo(() => {
    const d = selected?.doctor;
    if (!d?.id) return doctorOptions;
    if (doctorOptions.some((row) => row.id === d.id)) return doctorOptions;
    return [
      {
        id: d.id,
        name: d.name,
        email: d.email ?? "",
        role: d.role,
        roles: d.roles,
      },
      ...doctorOptions,
    ];
  }, [doctorOptions, selected]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAppointments({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load appointments."));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count += 1;
    if (typeFilter) count += 1;
    return count;
  }, [statusFilter, typeFilter]);

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setTypeFilter(draftTypeFilter);
  };

  const clearFilters = () => {
    setDraftStatusFilter("");
    setDraftTypeFilter("");
    setStatusFilter("");
    setTypeFilter("");
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!createOpen && !selected) return;
    let cancelled = false;
    const years = holidayYearsKey
      .split(",")
      .map((y) => Number(y))
      .filter((y) => Number.isFinite(y));

    (async () => {
      setLoadingPublicHolidays(true);
      try {
        const batches = await Promise.all(
          years.map((year) => getPublicHolidays({ year }).catch(() => [])),
        );
        if (cancelled) return;
        const merged = batches.flat().filter((row) => row?.id != null);
        setPublicHolidays((prev) => {
          const byId = new Map(prev.map((row) => [row.id, row]));
          merged.forEach((row) => byId.set(row.id, row));
          return [...byId.values()].sort(
            (a, b) => new Date(a.date) - new Date(b.date),
          );
        });
      } finally {
        if (!cancelled) setLoadingPublicHolidays(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [createOpen, selected, holidayYearsKey]);

  useEffect(() => {
    if (!createOpen || loadingPublicHolidays) return;

    setNewAppointment((prev) => {
      if (!prev.scheduled_at) return prev;

      const scheduled = dayjs(prev.scheduled_at);
      if (!scheduled.isValid()) return prev;

      const iso = scheduled.format("YYYY-MM-DD");
      const onHoliday = publicHolidays.some(
        (row) => dayjs(row.date).format("YYYY-MM-DD") === iso,
      );
      const soonest = dayjs().add(1, "minute").startOf("minute");
      const inPast = scheduled.isBefore(soonest);
      const outsideHours = !isWithinAppointmentHours(
        prev.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
      );

      if (!onHoliday && !inPast && !outsideHours) return prev;

      const corrected = buildDefaultNewAppointmentSchedule(
        appointmentStartHm,
        appointmentEndHm,
        publicHolidays,
      );
      if (prev.scheduled_at === corrected) return prev;
      return { ...prev, scheduled_at: corrected };
    });
  }, [
    createOpen,
    loadingPublicHolidays,
    publicHolidays,
    appointmentStartHm,
    appointmentEndHm,
  ]);

  useEffect(() => {
    if (!createOpen && !selected) return;
    let cancelled = false;
    (async () => {
      setLoadingDoctors(true);
      try {
        const rows = await getAssignableAppointmentDoctors();
        if (!cancelled) {
          setDoctorOptions(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (!cancelled) setDoctorOptions([]);
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, selected]);

  useEffect(() => {
    if (!selected) return;
    const localScheduledAt = toDateTimeLocal(selected.scheduled_at);
    setEditForm({
      doctor_id: selected.doctor_id != null ? String(selected.doctor_id) : "",
      scheduled_at: localScheduledAt,
      notes: selected.notes || "",
      status: selected.status || "pending",
      type: selected.type || "consultation",
    });
    setEditSelectedTemplates(mapAppointmentTemplates(selected));
    setEditSelectedPackages(mapAppointmentPackages(selected));
  }, [selected]);

  useEffect(() => {
    if (!createOpen && !selected) return;
    let cancelled = false;
    (async () => {
      setLoadingTreatmentTemplates(true);
      try {
        const rows = await getActiveTreatmentTemplates();
        if (!cancelled) {
          setTreatmentTemplateOptions(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (!cancelled) setTreatmentTemplateOptions([]);
      } finally {
        if (!cancelled) setLoadingTreatmentTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, selected]);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setCreatePackageOptions([]);
      setCreateSelectedPackages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingCreatePackages(true);
      try {
        const rows = await getAppointmentPackageOptions(selectedPatient.id);
        if (!cancelled) {
          setCreatePackageOptions(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (!cancelled) setCreatePackageOptions([]);
      } finally {
        if (!cancelled) setLoadingCreatePackages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatient?.id]);

  useEffect(() => {
    if (!selected?.patient_id) {
      setEditPackageOptions([]);
      if (!selected?.patient_id) {
        setEditSelectedPackages([]);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingEditPackages(true);
      try {
        const rows = await getAppointmentPackageOptions(selected.patient_id);
        if (!cancelled) {
          setEditPackageOptions(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (!cancelled) setEditPackageOptions([]);
      } finally {
        if (!cancelled) setLoadingEditPackages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.patient_id, selected?.id]);

  const calendarEvents = useMemo(
    () =>
      appointments
        .filter((a) => a.scheduled_at)
        .map((a) => {
          const status = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
          return {
            id: String(a.id),
            title: calendarAppointmentTitle(a),
            start: toClinicDateTimeSecond(a.scheduled_at),
            end: toClinicDayjs(a.scheduled_at)
              .add(1, "hour")
              .format("YYYY-MM-DDTHH:mm:ss"),
            backgroundColor: status.hex,
            borderColor: status.hex,
            textColor: "#ffffff",
            extendedProps: {
              doctor: a.doctor?.name || "No doctor assigned",
              status: a.status,
              visitId: a.visit_id,
              type: a.type,
              typeLabel: appointmentTypeLabel(a.type),
              planSummary: appointmentPlanSummary(a) || "-",
              notes: a.notes || "",
            },
          };
        }),
    [appointments],
  );

  const openFromEventId = (eventId) => {
    const appointment = appointments.find(
      (item) => String(item.id) === String(eventId),
    );
    if (appointment) {
      setSelected(appointment);
    }
  };

  const resetCreateForm = () => {
    if (patientSearchTimerRef.current) {
      clearTimeout(patientSearchTimerRef.current);
    }
    patientSearchRequestRef.current = null;
    setCreateError("");
    setSelectedPatient(null);
    setPatientInputValue("");
    setPatientOptions([]);
    setLoadingPatients(false);
    const defaultScheduledAt = buildDefaultNewAppointmentSchedule(
      appointmentStartHm,
      appointmentEndHm,
      publicHolidays,
    );
    setNewAppointment({
      doctor_id: "",
      scheduled_at: defaultScheduledAt,
      notes: "",
      type: "consultation",
    });
    setCreateSelectedTemplates([]);
    setCreateSelectedPackages([]);
    setCreatePackageOptions([]);
    setCreateScheduleParts(parseScheduledParts(defaultScheduledAt));
    setCreateScheduleResetKey((key) => key + 1);
  };

  const patientSearchQuery = patientInputValue.trim();
  const isPatientSearchable =
    patientSearchQuery.length >= PATIENT_SEARCH_MIN_CHARS;
  const patientDropdownOpen =
    !selectedPatient &&
    isPatientSearchable &&
    (loadingPatients || patientOptions.length > 0);

  const handlePatientSearchInput = (inputValue) => {
    setPatientInputValue(inputValue);
    setSelectedPatient(null);

    const query = inputValue.trim();
    const searchable = query.length >= PATIENT_SEARCH_MIN_CHARS;

    setLoadingPatients(searchable);
    if (!searchable) {
      setPatientOptions([]);
      if (patientSearchTimerRef.current) {
        clearTimeout(patientSearchTimerRef.current);
      }
      patientSearchRequestRef.current = null;
      return;
    }

    if (patientSearchTimerRef.current) {
      clearTimeout(patientSearchTimerRef.current);
    }

    const cacheKey = query.toLowerCase();
    const cachedRows = patientSearchCacheRef.current.get(cacheKey);
    if (cachedRows) {
      setPatientOptions(cachedRows);
      setLoadingPatients(false);
      patientSearchRequestRef.current = null;
      return;
    }

    const requestToken = Symbol(cacheKey);
    patientSearchRequestRef.current = requestToken;

    patientSearchTimerRef.current = setTimeout(async () => {
      try {
        const rows = await searchPatientsAutocomplete(query);
        const list = Array.isArray(rows) ? rows : [];
        patientSearchCacheRef.current.set(cacheKey, list);
        if (patientSearchRequestRef.current !== requestToken) return;
        setPatientOptions(list);
      } catch {
        if (patientSearchRequestRef.current !== requestToken) return;
        setPatientOptions([]);
      } finally {
        if (patientSearchRequestRef.current === requestToken) {
          setLoadingPatients(false);
        }
      }
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  };

  const handleCreateAppointment = async () => {
    const patientName = patientInputValue.trim();
    if (!selectedPatient?.id && !patientName) {
      setCreateError("Enter a patient name or select an existing patient.");
      return;
    }

    if (!newAppointment.scheduled_at) {
      setCreateError("Please choose date and time.");
      return;
    }

    if (createScheduledHoursError) {
      setCreateError(createScheduledHoursError);
      return;
    }

    const soonest = dayjs().add(1, "minute").startOf("minute");
    if (dayjs(newAppointment.scheduled_at).isBefore(soonest)) {
      setCreateError(
        "Choose a future time (at least one minute from now) within clinic operation hours.",
      );
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const payload = {
        doctor_id:
          newAppointment.doctor_id === "" || newAppointment.doctor_id == null
            ? null
            : Number(newAppointment.doctor_id),
        scheduled_at: scheduledLocalPickerToApi(newAppointment.scheduled_at),
        notes: newAppointment.notes.trim() || null,
        type: newAppointment.type || "consultation",
      };
      if (selectedPatient?.id) {
        payload.patient_id = Number(selectedPatient.id);
      } else {
        payload.provisional_patient_name = patientName;
      }
      Object.assign(
        payload,
        buildPlanPayload(createSelectedTemplates, createSelectedPackages),
      );

      const created = await createAppointment(payload);
      setAppointments((prev) =>
        [...prev, created].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      );
      setCreateOpen(false);
      resetCreateForm();
      pushToast({ message: "Appointment created.", severity: "success" });
    } catch (err) {
      setCreateError(resolveApiError(err, "Unable to create appointment."));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!selected) return;

    if (!editForm.scheduled_at) {
      pushToast({ message: "Date and time is required.", severity: "error" });
      return;
    }

    if (editScheduledHoursError) {
      pushToast({ message: editScheduledHoursError, severity: "error" });
      return;
    }

    const unchangedTime =
      toDateTimeLocal(selected.scheduled_at) ===
      String(editForm.scheduled_at || "").trim();
    const scheduledAtPayload = scheduledLocalPickerToApi(editForm.scheduled_at);
    if (!unchangedTime) {
      const soonest = dayjs().add(1, "minute").startOf("minute");
      if (dayjs(editForm.scheduled_at).isBefore(soonest)) {
        pushToast({
          message:
            "Choose a future time (at least one minute from now) within clinic operation hours.",
          severity: "error",
        });
        return;
      }
    }

    setSavingEdit(true);
    try {
      const updated = await updateAppointment(selected.id, {
        doctor_id:
          editForm.doctor_id === "" || editForm.doctor_id == null
            ? null
            : Number(editForm.doctor_id),
        scheduled_at: scheduledAtPayload,
        notes: editForm.notes.trim() || null,
        status: editForm.status,
        type: editForm.type || "consultation",
        ...buildPlanPayload(editSelectedTemplates, editSelectedPackages),
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setSelected(null);
      pushToast({ message: "Appointment updated.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to update appointment."),
        severity: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const canCheckInAppointment = (appointment) =>
    Boolean(appointment) &&
    Boolean(appointment.patient_id) &&
    canDo(user?.role, "create_visit") &&
    ["pending", "confirmed"].includes(appointment.status) &&
    !appointment.visit_id;

  const canCreatePatientForAppointment = (appointment) =>
    Boolean(appointment) &&
    !appointment.patient_id &&
    Boolean(appointment.provisional_patient_name) &&
    ["pending", "confirmed"].includes(appointment.status) &&
    !appointment.visit_id &&
    hasPermission(user, "patients.manage");

  const handleCheckIn = async () => {
    if (!selected || !canCheckInAppointment(selected)) return;

    setCheckingIn(true);
    try {
      const updated = await checkInAppointment(selected.id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setCheckInConfirmOpen(false);
      setSelected(null);
      pushToast({ message: "Patient checked in.", severity: "success" });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        pushToast({ message: "Already checked in.", severity: "error" });
        return;
      }
      pushToast({
        message: resolveApiError(err, "Unable to check in patient."),
        severity: "error",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCreatePatient = () => {
    if (!selected || !canCreatePatientForAppointment(selected)) return;
    const prefix = getWorkspaceUrlPrefix(user);
    navigate(
      getPatientCreatePath(prefix, {
        returnTo: location.pathname,
        appointmentId: selected.id,
        name: selected.provisional_patient_name,
      }),
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5">Appointments</Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule management
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            size="small"
          >
            <ToggleButton value="list">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="calendar">
              <CalendarMonthIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          {canDo(user?.role, "create_visit") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
            >
              New Appointment
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl
            size="small"
            sx={{ width: { xs: "100%", sm: 200 }, minWidth: 0 }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={draftStatusFilter}
              label="Status"
              onChange={(e) => setDraftStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_COLOR).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            size="small"
            sx={{ width: { xs: "100%", sm: 220 }, minWidth: 0 }}
          >
            <InputLabel>Type</InputLabel>
            <Select
              value={draftTypeFilter}
              label="Type"
              onChange={(e) => setDraftTypeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(APPOINTMENT_TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </CollapsibleFiltersPanel>

      {view === "list" ? (
        <TableContainer
          component={Card}
          sx={{ maxWidth: "100%", overflowX: "auto", borderRadius: 1 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Doctor</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Visit</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <LoadingIndicator size={24} />
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No appointments found
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((a) => {
                  const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => setSelected(a)}
                    >
                      <TableCell>{appointmentPatientName(a)}</TableCell>
                      <TableCell>
                        <Chip
                          label={appointmentTypeLabel(a.type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{a.doctor?.name || "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {formatClinicAppointmentDateTime(a.scheduled_at)}
                      </TableCell>
                      <TableCell>
                        <Chip label={sc.label} color={sc.chip} size="small" />
                      </TableCell>
                      <TableCell
                        sx={{ maxWidth: 180, color: "text.secondary" }}
                        noWrap
                      >
                        {appointmentPlanSummary(a) || "-"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const visitLabel = appointmentVisitLabel(a);
                          return visitLabel ? (
                            <Chip
                              label={visitLabel.label}
                              color={visitLabel.color}
                              size="small"
                            />
                          ) : null;
                        })()}
                      </TableCell>
                      <TableCell
                        sx={{ maxWidth: 180, color: "text.secondary" }}
                        noWrap
                      >
                        {a.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Card
          sx={(theme) => ({
            p: { xs: 1, md: 2 },
            "& .fc": { fontFamily: "inherit", fontSize: "11px" },
            "& .fc .fc-toolbar": { flexWrap: "wrap", gap: 1 },
            "& .fc .fc-toolbar-title": { fontSize: "0.9rem", fontWeight: 700 },
            "& .fc .fc-button": {
              textTransform: "capitalize",
              fontSize: "11px",
              borderRadius: theme.shape.borderRadius,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              boxShadow: "none",
            },
            "& .fc .fc-col-header-cell-cushion": {
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 2px",
            },
            "& .fc .fc-daygrid-day-number": { fontSize: "11px" },
            "& .fc .fc-timegrid-slot-label": { fontSize: "10px" },
            "& .fc .fc-timegrid-axis-cushion": { fontSize: "10px" },
            "& .fc .fc-timegrid-slot": { height: "1.85rem" },
            "& .fc .fc-event": {
              fontSize: "10px",
              borderRadius: 0,
            },
            "& .fc .fc-daygrid-event": { borderRadius: 0 },
            "& .fc .fc-event-time": { fontSize: "10px" },
            "& .fc .fc-event-title": { fontSize: "10px", fontWeight: 600 },
            "& .fc .fc-button-primary:not(:disabled).fc-button-active": {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderColor: theme.palette.primary.main,
            },
            "@media (min-width:600px)": {
              "& .fc .fc-timegrid-slot": { height: "2.1rem" },
            },
            "@media (min-width:900px)": {
              "& .fc .fc-timegrid-slot": { height: "2.3rem" },
            },
            borderRadius: 1,
          })}
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            slotMinTime={calendarSlotMin}
            slotMaxTime={calendarSlotMax}
            scrollTime={calendarSlotMin}
            slotLabelFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            }}
            allDaySlot={false}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            }}
            dayHeaderContent={(arg) => dayjs(arg.date).format("D/M")}
            dayCellContent={(arg) => dayjs(arg.date).format("D/M")}
            events={calendarEvents}
            editable={false}
            eventStartEditable={false}
            eventDurationEditable={false}
            selectable={false}
            eventClick={(info) => openFromEventId(info.event.id)}
            eventDidMount={(info) => {
              const visitLabel = appointmentVisitLabel({
                status: info.event.extendedProps.status,
                visit_id: info.event.extendedProps.visitId,
              });
              if (visitLabel) {
                info.el.setAttribute("title", visitLabel.label);
              }
            }}
            dayMaxEventRows={3}
          />
        </Card>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Appointment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <Autocomplete
              options={patientOptions}
              loading={loadingPatients}
              open={patientDropdownOpen}
              value={selectedPatient}
              inputValue={patientInputValue}
              slotProps={autocompleteSlotProps}
              filterOptions={(options) => options}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : patientOptionLabel(option)
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onInputChange={(_, value, reason) => {
                if (reason === "input") {
                  handlePatientSearchInput(value);
                } else if (reason === "clear") {
                  handlePatientSearchInput("");
                }
              }}
              onChange={(_, value) => {
                setSelectedPatient(value);
                setPatientInputValue(value ? patientOptionLabel(value) : "");
                setPatientOptions([]);
                setLoadingPatients(false);
              }}
              noOptionsText={
                patientSearchQuery.length < PATIENT_SEARCH_MIN_CHARS
                  ? `Type at least ${PATIENT_SEARCH_MIN_CHARS} characters`
                  : " "
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {option.name}
                    </Typography>
                    {option.phone ? (
                      <Typography variant="caption" color="text.secondary">
                        {option.phone}
                      </Typography>
                    ) : null}
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Patient"
                  placeholder="Type patient name or phone"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingPatients ? (
                          <LoadingIndicator size={16} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Autocomplete
              multiple
              options={treatmentTemplateOptions}
              loading={loadingTreatmentTemplates}
              value={createSelectedTemplates}
              onChange={(_, value) => setCreateSelectedTemplates(value)}
              getOptionLabel={(option) => option.name ?? ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              slotProps={autocompleteSlotProps}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Planned treatments"
                  placeholder="Select treatment templates"
                />
              )}
            />
            {selectedPatient?.id ? (
              <>
                <Autocomplete
                  multiple
                  options={createPackageOptions}
                  loading={loadingCreatePackages}
                  value={createSelectedPackages}
                  onChange={(_, value) =>
                    setCreateSelectedPackages(
                      value.map((row) => ({
                        ...row,
                        planned_sessions: row.planned_sessions ?? 1,
                      })),
                    )
                  }
                  getOptionLabel={packageOptionLabel}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  slotProps={autocompleteSlotProps}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Planned package sessions"
                      placeholder="Select prepaid package lines"
                    />
                  )}
                />
                {createSelectedPackages.map((row) => (
                  <TextField
                    key={row.id}
                    label={`Sessions · ${row.package_name}`}
                    type="number"
                    inputProps={{ min: 0.25, step: 0.25 }}
                    value={row.planned_sessions ?? 1}
                    onChange={(e) =>
                      setCreateSelectedPackages((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, planned_sessions: e.target.value }
                            : item,
                        ),
                      )
                    }
                    size="small"
                    fullWidth
                  />
                ))}
              </>
            ) : null}
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newAppointment.type}
                label="Type"
                onChange={(e) =>
                  setNewAppointment((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
              >
                {Object.entries(APPOINTMENT_TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Doctor</InputLabel>
              <Select
                value={newAppointment.doctor_id}
                label="Doctor"
                onChange={(e) =>
                  setNewAppointment((prev) => ({
                    ...prev,
                    doctor_id: e.target.value,
                  }))
                }
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {loadingDoctors ? (
                  <MenuItem value="" disabled>
                    Loading doctors...
                  </MenuItem>
                ) : doctorOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    No doctors found
                  </MenuItem>
                ) : (
                  doctorOptions.map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>
                      {appointmentDoctorOptionLabel(d)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <ManualScheduledAtFields
              key={`create-schedule-${createScheduleResetKey}`}
              label="Scheduled at"
              value={newAppointment.scheduled_at}
              onChange={(scheduled_at) =>
                setNewAppointment((prev) => ({ ...prev, scheduled_at }))
              }
              onPartsChange={setCreateScheduleParts}
              appointmentStartHm={appointmentStartHm}
              appointmentEndHm={appointmentEndHm}
              appointmentHoursRangeLabel={appointmentHoursRangeLabel}
              publicHolidays={publicHolidays}
              loadingHolidays={loadingPublicHolidays}
              hoursError={createScheduledHoursError}
            />
            <TextField
              label="Notes"
              value={newAppointment.notes}
              onChange={(e) =>
                setNewAppointment((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateAppointment}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Appointment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
        keepMounted
        disableRestoreFocus
      >
        {selected && (
          <>
            <DialogTitle>Appointment Event</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  label="Patient"
                  value={appointmentPatientName(selected)}
                  disabled
                  fullWidth
                  helperText={
                    !selected.patient_id && selected.provisional_patient_name
                      ? "Walk-in name only — register the patient on arrival."
                      : undefined
                  }
                />
                <FormControl fullWidth>
                  <InputLabel>Assigned doctor</InputLabel>
                  <Select
                    value={editForm.doctor_id}
                    label="Assigned doctor"
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        doctor_id: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {loadingDoctors ? (
                      <MenuItem value="" disabled>
                        Loading doctors...
                      </MenuItem>
                    ) : editDoctorOptions.length === 0 ? (
                      <MenuItem value="" disabled>
                        No doctors found
                      </MenuItem>
                    ) : (
                      editDoctorOptions.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {appointmentDoctorOptionLabel(d)}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editForm.type}
                    label="Type"
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  >
                    {Object.entries(APPOINTMENT_TYPE_LABELS).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Autocomplete
                  multiple
                  options={treatmentTemplateOptions}
                  loading={loadingTreatmentTemplates}
                  value={editSelectedTemplates}
                  onChange={(_, value) => setEditSelectedTemplates(value)}
                  getOptionLabel={(option) => option.name ?? ""}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  slotProps={autocompleteSlotProps}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Planned treatments"
                      placeholder="Select treatment templates"
                    />
                  )}
                />
                {selected.patient_id ? (
                  <>
                    <Autocomplete
                      multiple
                      options={editPackageOptions}
                      loading={loadingEditPackages}
                      value={editSelectedPackages}
                      onChange={(_, value) =>
                        setEditSelectedPackages(
                          value.map((row) => ({
                            ...row,
                            planned_sessions: row.planned_sessions ?? 1,
                          })),
                        )
                      }
                      getOptionLabel={packageOptionLabel}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      slotProps={autocompleteSlotProps}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Planned package sessions"
                          placeholder="Select prepaid package lines"
                        />
                      )}
                    />
                    {editSelectedPackages.map((row) => (
                      <TextField
                        key={row.id}
                        label={`Sessions · ${row.package_name}`}
                        type="number"
                        inputProps={{ min: 0.25, step: 0.25 }}
                        value={row.planned_sessions ?? 1}
                        onChange={(e) =>
                          setEditSelectedPackages((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, planned_sessions: e.target.value }
                                : item,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                      />
                    ))}
                  </>
                ) : null}
                <ManualScheduledAtFields
                  key={`edit-schedule-${selected.id}`}
                  label="Reschedule"
                  value={editForm.scheduled_at}
                  onChange={(scheduled_at) =>
                    setEditForm((prev) => ({ ...prev, scheduled_at }))
                  }
                  onPartsChange={setEditScheduleParts}
                  appointmentStartHm={appointmentStartHm}
                  appointmentEndHm={appointmentEndHm}
                  appointmentHoursRangeLabel={appointmentHoursRangeLabel}
                  publicHolidays={publicHolidays}
                  loadingHolidays={loadingPublicHolidays}
                  hoursError={editScheduledHoursError}
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status}
                    label="Status"
                    onChange={(e) => {
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }));
                    }}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  multiline
                  minRows={3}
                  fullWidth
                />
                {(() => {
                  const visitLabel = appointmentVisitLabel(selected);
                  return visitLabel ? (
                    <Chip
                      label={visitLabel.label}
                      color={visitLabel.color}
                      size="small"
                    />
                  ) : null;
                })()}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
              {canCreatePatientForAppointment(selected) && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleCreatePatient}
                  sx={{ mr: "auto" }}
                >
                  Create Patient
                </Button>
              )}
              {canCheckInAppointment(selected) && (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => setCheckInConfirmOpen(true)}
                  disabled={checkingIn || savingEdit}
                  sx={{
                    mr: canCreatePatientForAppointment(selected) ? 0 : "auto",
                  }}
                >
                  Check In
                </Button>
              )}
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button
                variant="contained"
                onClick={handleSaveEvent}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={checkInConfirmOpen}
        onClose={() => !checkingIn && setCheckInConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm check-in</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Check in <strong>{appointmentPatientName(selected)}</strong> for
            this appointment?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCheckInConfirmOpen(false)}
            disabled={checkingIn}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? "Checking In..." : "Check In"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
