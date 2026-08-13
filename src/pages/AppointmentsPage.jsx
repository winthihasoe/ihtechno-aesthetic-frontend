import { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Typography,
  Chip,
  Stack,
  CircularProgress,
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
  Paper,
  Divider,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventNoteIcon from "@mui/icons-material/EventNote";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import { canDo } from "../utils/roleUtils";
import useToastStore from "../stores/toastStore";

dayjs.extend(utc);
dayjs.extend(timezone);

const STATUS_COLOR = {
  pending: { chip: "warning", label: "Pending", hex: "#F59E0B" },
  confirmed: { chip: "info", label: "Confirmed", hex: "#0284C7" },
  completed: { chip: "success", label: "Completed", hex: "#16A34A" },
  cancelled: { chip: "error", label: "Cancelled", hex: "#DC2626" },
};

const PHYSICIAN_SLUGS = new Set(["doctor", "dermatologist"]);
const PHYSICIAN_SLUG_LABEL = {
  doctor: "Medical doctor",
  dermatologist: "Dermatologist",
};
const CLINIC_TIMEZONE = "Asia/Yangon";
const DEMO_DAY_SPAN = 5;

const SAMPLE_PATIENTS = [
  { id: 1, name: "U Kyaw Lin", phone: "09-421-111-001" },
  { id: 2, name: "Daw Khin Mya", phone: "09-421-111-002" },
  { id: 3, name: "Mg Zaw Htet", phone: "09-421-111-003" },
  { id: 4, name: "Ma Thiri", phone: "09-421-111-004" },
  { id: 5, name: "U Hla Tun", phone: "09-421-111-005" },
  { id: 7, name: "Ko Aung Ko", phone: "09-421-111-007" },
  { id: 8, name: "Ma Ei Mon", phone: "09-421-111-008" },
  { id: 9, name: "U Than Win", phone: "09-421-111-009" },
  { id: 10, name: "Daw Nwe Nwe", phone: "09-421-111-010" },
  { id: 11, name: "Mg Paing", phone: "09-421-111-011" },
  { id: 12, name: "Daw Shwe Yi", phone: "09-421-111-012" },
];

const SAMPLE_DOCTORS = [
  {
    id: 2,
    name: "Dr. San Oo",
    email: "doctor1@ihtechno.demo",
    role: "doctor",
    roles: [{ id: 2, slug: "doctor", name: "Medical doctor" }],
  },
  {
    id: 3,
    name: "Dr. Yin Hla",
    email: "doctor2@ihtechno.demo",
    role: "dermatologist",
    roles: [{ id: 3, slug: "dermatologist", name: "Dermatologist" }],
  },
];

const SAMPLE_NOTES = [
  "Laser facial — pigmentation review",
  "IV drip wellness follow-up",
  "Bridal glow — laser facial session",
  "Botox 2-week review",
  "Anti-aging package session",
  "Laser hair removal follow-up",
  "Chemical peel aftercare check",
  "Filler review — nasolabial folds",
  "Hydrafacial glow session",
  "Skin booster follow-up",
];

const SLOT_TIMES = [
  [9, 0],
  [9, 30],
  [10, 0],
  [10, 30],
  [11, 0],
  [14, 0],
  [14, 30],
  [15, 0],
  [15, 30],
  [16, 0],
];

/**
 * Demo appointments for today ± DEMO_DAY_SPAN days, rebuilt from the live clock.
 */
function buildSampleAppointments(now = dayjs()) {
  const base = now.tz(CLINIC_TIMEZONE);
  const rows = [];
  let id = 1;

  for (let offset = -DEMO_DAY_SPAN; offset <= DEMO_DAY_SPAN; offset += 1) {
    const day = base.startOf("day").add(offset, "day");
    const weekday = day.day();
    if (weekday === 0) continue; // clinic closed Sundays in demo

    const seed = day.date() + day.month() * 3 + Math.abs(offset) * 5;
    const count = weekday === 6 ? 1 + (seed % 2) : 2 + (seed % 2);

    for (let i = 0; i < count; i += 1) {
      const slot = SLOT_TIMES[(seed + i * 3) % SLOT_TIMES.length];
      const patient = SAMPLE_PATIENTS[(seed + i) % SAMPLE_PATIENTS.length];
      const doctor = SAMPLE_DOCTORS[(seed + i) % SAMPLE_DOCTORS.length];

      let status = "confirmed";
      if (offset < 0) {
        status = (seed + i) % 6 === 0 ? "cancelled" : "completed";
      } else if (offset === 0) {
        if (i === 0) status = "completed";
        else if (i === 1) status = "confirmed";
        else status = "pending";
      } else {
        status = (seed + i) % 3 === 0 ? "pending" : "confirmed";
      }

      rows.push({
        id: id++,
        patient_id: patient.id,
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
        },
        doctor_id: doctor.id,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          role: doctor.role,
          roles: doctor.roles,
        },
        scheduled_at: day
          .hour(slot[0])
          .minute(slot[1])
          .second(0)
          .millisecond(0)
          .toISOString(),
        status,
        notes: SAMPLE_NOTES[(seed + i) % SAMPLE_NOTES.length],
      });
    }
  }

  return rows.sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}

const appointmentDoctorOptionLabel = (user) => {
  if (!user?.name) return "";
  const roleObjs = Array.isArray(user.roles) ? user.roles : [];
  const slugFromPivot =
    roleObjs.find((r) => PHYSICIAN_SLUGS.has(r.slug))?.slug || user.role;
  const label =
    PHYSICIAN_SLUG_LABEL[slugFromPivot] ||
    roleObjs.find((r) => r.slug === slugFromPivot)?.name;
  return label ? `${user.name} (${label})` : user.name;
};

const toClinicDayjs = (value) => dayjs(value).tz(CLINIC_TIMEZONE);

const toDateTimeLocal = (value) =>
  value ? toClinicDayjs(value).format("YYYY-MM-DDTHH:mm") : "";

const toClinicDateTimeSecond = (value) =>
  value ? toClinicDayjs(value).format("YYYY-MM-DDTHH:mm:ss") : "";

const formatClinicTime24 = (value) =>
  value ? toClinicDayjs(value).format("HH:mm") : "--:--";

const formatSidebarDateLabel = (dateStr) => {
  const d = dayjs(dateStr);
  if (!d.isValid()) return "Selected day";
  if (d.isSame(dayjs(), "day")) return "Today";
  return d.format("DD-MM-YYYY");
};

/** Send datetime-local value as wall time (no UTC shift); backend interprets in app timezone. */
const scheduledLocalPickerToApi = (datetimeLocal) => {
  const t = String(datetimeLocal ?? "").trim();
  if (!t) return "";
  return t.length === 16 ? `${t}:00` : t;
};

const DEFAULT_APPT_START = "09:00";
const DEFAULT_APPT_END = "18:00";

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
    return fb
      ? `${String(fb[1]).padStart(2, "0")}:${fb[2]}:00`
      : "09:00:00";
  }
  return `${String(m[1]).padStart(2, "0")}:${m[2]}:00`;
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

/** Start of calendar day `dayBase` with clock from settings "HH:mm". */
const dayAtHm = (dayBase, hm) => {
  const dm = dayBase.startOf("day");
  const mins = parseHmToMinutes(hm);
  if (mins == null) return dm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return dm.hour(h).minute(m).second(0).millisecond(0);
};

/** Earliest selectable moment on `selected`'s calendar day (local) within clinic hours. */
const earliestSelectableOnDay = (selected, startHm) => {
  const dayStart = selected.startOf("day");
  const windowOpen = dayAtHm(dayStart, startHm);
  const soon = dayjs().add(1, "minute").startOf("minute");
  if (dayStart.isSame(dayjs(), "day")) {
    return windowOpen.isAfter(soon) ? windowOpen : soon;
  }
  return windowOpen;
};

/** Latest selectable moment on that calendar day (inclusive end time). */
const latestSelectableOnDay = (selected, endHm) =>
  dayAtHm(selected.startOf("day"), endHm);

/**
 * `min` / `max` for <input type="datetime-local"> for the date currently shown in `value`.
 * Empty object if that calendar day has no remaining slots (caller should clamp date).
 */
const getDatetimeLocalMinMaxForValue = (value, startHm, endHm) => {
  const sel = dayjs(value);
  if (!value || !sel.isValid()) return {};
  const minD = earliestSelectableOnDay(sel, startHm, endHm);
  const maxD = latestSelectableOnDay(sel, endHm);
  if (minD.isAfter(maxD)) {
    return {};
  }
  return {
    min: minD.format("YYYY-MM-DDTHH:mm"),
    max: maxD.format("YYYY-MM-DDTHH:mm"),
  };
};

/** Keeps choice inside clinic hours; on today, not before next minute; if day is full, next day at open. */
const clampScheduledLocal = (raw, startHm, endHm) => {
  if (!raw) return raw;
  const d = dayjs(raw);
  if (!d.isValid()) return raw;
  const dayStart = d.startOf("day");
  const minD = earliestSelectableOnDay(d, startHm, endHm);
  const maxD = latestSelectableOnDay(d, endHm);
  if (minD.isAfter(maxD)) {
    return dayAtHm(dayStart.add(1, "day"), startHm).format("YYYY-MM-DDTHH:mm");
  }
  if (d.isBefore(minD)) return minD.format("YYYY-MM-DDTHH:mm");
  if (d.isAfter(maxD)) return maxD.format("YYYY-MM-DDTHH:mm");
  return d.format("YYYY-MM-DDTHH:mm");
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { pushToast } = useToastStore();

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

  const [appointments, setAppointments] = useState(() =>
    buildSampleAppointments(dayjs()),
  );
  const [loading] = useState(false);
  const [error] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().format("YYYY-MM-DD"),
  );
  const [selected, setSelected] = useState(null);

  const [editForm, setEditForm] = useState({
    doctor_id: "",
    scheduled_at: "",
    notes: "",
    status: "pending",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [patientOptions, setPatientOptions] = useState(SAMPLE_PATIENTS);
  const [loadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorOptions, setDoctorOptions] = useState(SAMPLE_DOCTORS);
  const [loadingDoctors] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patient_id: "",
    doctor_id: "",
    scheduled_at: "",
    notes: "",
  });

  const createDatetimeBounds = useMemo(
    () =>
      getDatetimeLocalMinMaxForValue(
        newAppointment.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
      ),
    [
      newAppointment.scheduled_at,
      appointmentStartHm,
      appointmentEndHm,
    ],
  );

  const editDatetimeBounds = useMemo(
    () =>
      getDatetimeLocalMinMaxForValue(
        editForm.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
      ),
    [editForm.scheduled_at, appointmentStartHm, appointmentEndHm],
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

  useEffect(() => {
    if (!createOpen) return;
    const q = patientSearch.trim().toLowerCase();
    setPatientOptions(
      q
        ? SAMPLE_PATIENTS.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              String(p.phone || "").includes(q),
          )
        : SAMPLE_PATIENTS,
    );
  }, [createOpen, patientSearch]);

  useEffect(() => {
    if (!createOpen && !selected) return;
    setDoctorOptions(SAMPLE_DOCTORS);
  }, [createOpen, selected]);

  useEffect(() => {
    if (!selected) return;
    const localScheduledAt = toDateTimeLocal(selected.scheduled_at);
    setEditForm({
      doctor_id:
        selected.doctor_id != null ? String(selected.doctor_id) : "",
      scheduled_at: localScheduledAt,
      notes: selected.notes || "",
      status: selected.status || "pending",
    });
  }, [selected]);

  const visibleAppointments = useMemo(() => {
    if (!statusFilter) return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const selectedDayAppointments = useMemo(
    () =>
      visibleAppointments
        .filter(
          (a) =>
            a.scheduled_at &&
            toClinicDayjs(a.scheduled_at).format("YYYY-MM-DD") ===
              selectedDate,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
    [visibleAppointments, selectedDate],
  );

  const sidebarDateLabel = useMemo(
    () => formatSidebarDateLabel(selectedDate),
    [selectedDate],
  );

  const calendarEvents = useMemo(
    () =>
      visibleAppointments
        .filter((a) => a.scheduled_at)
        .map((a) => {
          const status = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
          return {
            id: String(a.id),
            title: a.patient?.name || "Patient",
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
              notes: a.notes || "",
            },
          };
        }),
    [visibleAppointments],
  );

  const openFromEventId = (eventId) => {
    const appointment = appointments.find(
      (item) => String(item.id) === String(eventId),
    );
    if (appointment) {
      setSelected(appointment);
    }
  };

  const handleCreateAppointment = () => {
    if (!newAppointment.patient_id) {
      setCreateError("Please select a patient.");
      return;
    }

    if (!newAppointment.scheduled_at) {
      setCreateError("Please choose date and time.");
      return;
    }

    if (
      !isWithinAppointmentHours(
        newAppointment.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
      )
    ) {
      setCreateError(
        `Please choose a time between ${appointmentHoursRangeLabel}.`,
      );
      return;
    }

    const soonest = dayjs().add(1, "minute").startOf("minute");
    if (dayjs(newAppointment.scheduled_at).isBefore(soonest)) {
      setCreateError(
        "Choose a future time (at least one minute from now) within clinic hours.",
      );
      return;
    }

    setCreating(true);
    setCreateError("");

    const patient =
      SAMPLE_PATIENTS.find(
        (p) => Number(p.id) === Number(newAppointment.patient_id),
      ) || null;
    const doctor =
      SAMPLE_DOCTORS.find(
        (d) => Number(d.id) === Number(newAppointment.doctor_id),
      ) || null;
    const nextId =
      Math.max(0, ...appointments.map((row) => Number(row.id) || 0)) + 1;

    const created = {
      id: nextId,
      patient_id: patient?.id ?? Number(newAppointment.patient_id),
      patient: patient
        ? { id: patient.id, name: patient.name, phone: patient.phone }
        : { id: Number(newAppointment.patient_id), name: "Patient" },
      doctor_id: doctor?.id ?? null,
      doctor: doctor
        ? {
            id: doctor.id,
            name: doctor.name,
            role: doctor.role,
            roles: doctor.roles,
          }
        : null,
      scheduled_at: dayjs(
        scheduledLocalPickerToApi(newAppointment.scheduled_at),
      ).toISOString(),
      status: "pending",
      notes: newAppointment.notes.trim() || null,
    };

    setAppointments((prev) =>
      [...prev, created].sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      ),
    );
    setCreateOpen(false);
    setNewAppointment({
      patient_id: "",
      doctor_id: "",
      scheduled_at: "",
      notes: "",
    });
    setPatientSearch("");
    pushToast({
      message: "Sample appointment recorded locally.",
      severity: "success",
    });
    setCreating(false);
  };

  const handleSaveEvent = () => {
    if (!selected) return;

    if (!editForm.scheduled_at) {
      pushToast({ message: "Date and time is required.", severity: "error" });
      return;
    }

    if (
      !isWithinAppointmentHours(
        editForm.scheduled_at,
        appointmentStartHm,
        appointmentEndHm,
      )
    ) {
      pushToast({
        message: `Reschedule time must be between ${appointmentHoursRangeLabel}.`,
        severity: "error",
      });
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
            "Choose a future time (at least one minute from now) within clinic hours.",
          severity: "error",
        });
        return;
      }
    }

    setSavingEdit(true);
    const doctor =
      SAMPLE_DOCTORS.find((d) => Number(d.id) === Number(editForm.doctor_id)) ||
      selected.doctor ||
      null;

    const updated = {
      ...selected,
      doctor_id: doctor?.id ?? null,
      doctor: doctor
        ? {
            id: doctor.id,
            name: doctor.name,
            role: doctor.role,
            roles: doctor.roles,
          }
        : null,
      scheduled_at: dayjs(scheduledAtPayload).toISOString(),
      notes: editForm.notes.trim() || null,
      status: editForm.status,
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    setSelected(null);
    pushToast({
      message: "Sample appointment updated locally.",
      severity: "success",
    });
    setSavingEdit(false);
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
          mb: 2.5,
        }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
              Appointments
            </Typography>
            <Chip size="small" label="Sample" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Demo schedule for today and ±{DEMO_DAY_SPAN} days — updates from the
            current date.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <FormControl
            size="small"
            sx={{ width: { xs: "100%", sm: 180 }, minWidth: 0 }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_COLOR).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {canDo(user?.role, "create_visit") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => {
                setCreateError("");
                setPatientSearch("");
                setNewAppointment({
                  patient_id: "",
                  doctor_id: "",
                  scheduled_at: "",
                  notes: "",
                });
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

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <Card
          sx={(theme) => {
            const isDark = theme.palette.mode === "dark";
            const mutedSurface = isDark
              ? theme.palette.background.default
              : theme.palette.grey[50];
            const headerSurface = isDark
              ? theme.palette.background.default
              : theme.palette.grey[100];

            return {
              flex: 1,
              minWidth: 0,
              p: { xs: 1, md: 1.5 },
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "none",
              bgcolor: theme.palette.background.paper,
              "& .fc": {
                fontFamily: "inherit",
                fontSize: "12px",
                "--fc-border-color": theme.palette.divider,
                "--fc-page-bg-color": theme.palette.background.paper,
                "--fc-neutral-bg-color": headerSurface,
                "--fc-neutral-text-color": theme.palette.text.secondary,
                "--fc-list-event-hover-bg-color": theme.palette.action.hover,
                "--fc-today-bg-color": alpha(
                  theme.palette.primary.main,
                  isDark ? 0.16 : 0.08,
                ),
                "--fc-now-indicator-color": theme.palette.error.main,
                "--fc-button-bg-color": mutedSurface,
                "--fc-button-border-color": theme.palette.divider,
                "--fc-button-text-color": theme.palette.text.primary,
                "--fc-button-hover-bg-color": theme.palette.action.hover,
                "--fc-button-hover-border-color": theme.palette.divider,
                "--fc-button-active-bg-color": theme.palette.primary.main,
                "--fc-button-active-border-color": theme.palette.primary.main,
                "--fc-button-active-text-color":
                  theme.palette.primary.contrastText,
              },
              "& .fc .fc-toolbar": { flexWrap: "wrap", gap: 1, mb: 1 },
              "& .fc .fc-toolbar-title": {
                fontSize: "0.95rem",
                fontWeight: 700,
                color: theme.palette.text.primary,
              },
              "& .fc .fc-button": {
                textTransform: "none",
                fontSize: "12px",
                borderRadius: 0,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: mutedSurface,
                color: theme.palette.text.primary,
                boxShadow: "none",
                fontWeight: 600,
              },
              "& .fc .fc-button:hover": {
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.primary,
              },
              "& .fc .fc-col-header-cell": {
                backgroundColor: headerSurface,
                borderColor: theme.palette.divider,
              },
              "& .fc .fc-col-header-cell-cushion": {
                fontSize: "11px",
                fontWeight: 700,
                padding: "6px 4px",
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
              },
              "& .fc .fc-daygrid-day-number": {
                fontSize: "12px",
                fontWeight: 600,
                padding: "4px 6px",
                color: theme.palette.text.primary,
              },
              "& .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number": {
                color: theme.palette.text.disabled,
              },
              "& .fc .fc-daygrid-day": {
                cursor: "pointer",
                backgroundColor: theme.palette.background.paper,
              },
              "& .fc .fc-day-today": {
                backgroundColor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.16 : 0.08,
                ),
              },
              "& .fc .fc-day-selected": {
                backgroundColor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.24 : 0.08,
                ),
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
              },
              "& .fc .fc-timegrid-slot-label": {
                fontSize: "11px",
                color: theme.palette.text.secondary,
              },
              "& .fc .fc-timegrid-axis-cushion": {
                fontSize: "11px",
                color: theme.palette.text.secondary,
              },
              "& .fc .fc-timegrid-slot": {
                height: "2rem",
                borderColor: theme.palette.divider,
              },
              "& .fc .fc-event": {
                fontSize: "10px",
                borderRadius: 0,
                borderWidth: "0 0 0 3px",
              },
              "& .fc .fc-daygrid-event": { borderRadius: 0 },
              "& .fc .fc-event-time": { fontSize: "10px", fontWeight: 700 },
              "& .fc .fc-event-title": { fontSize: "10px", fontWeight: 600 },
              "& .fc .fc-button-primary:not(:disabled).fc-button-active": {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                borderColor: theme.palette.primary.main,
              },
              "& .fc .fc-scrollgrid, & .fc .fc-scrollgrid td, & .fc .fc-scrollgrid th":
                {
                  borderColor: theme.palette.divider,
                },
            };
          }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            scrollTime={calendarSlotMin}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            allDaySlot={false}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            dayHeaderContent={(arg) => dayjs(arg.date).format("ddd D/M")}
            dayCellContent={(arg) => dayjs(arg.date).format("D")}
            events={calendarEvents}
            editable={false}
            eventStartEditable={false}
            eventDurationEditable={false}
            selectable={false}
            dateClick={(info) => {
              setSelectedDate(dayjs(info.date).format("YYYY-MM-DD"));
            }}
            dayCellClassNames={(arg) => {
              const cellDate = dayjs(arg.date).format("YYYY-MM-DD");
              return cellDate === selectedDate ? ["fc-day-selected"] : [];
            }}
            eventClick={(info) => {
              const cellDate = dayjs(info.event.start).format("YYYY-MM-DD");
              setSelectedDate(cellDate);
              openFromEventId(info.event.id);
            }}
            dayMaxEventRows={3}
          />
        </Card>

        <Paper
          elevation={0}
          sx={(theme) => {
            const isDark = theme.palette.mode === "dark";
            return {
              width: { xs: "100%", lg: 340 },
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark
                ? theme.palette.background.default
                : theme.palette.grey[50],
              minHeight: { xs: 320, lg: 520 },
              maxHeight: { lg: "calc(100vh - 180px)" },
            };
          }}
        >
          <Box
            sx={(theme) => ({
              px: 2,
              py: 1.5,
              bgcolor:
                theme.palette.mode === "dark"
                  ? theme.palette.background.paper
                  : theme.palette.grey[100],
              borderBottom: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <EventNoteIcon fontSize="small" color="action" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {sidebarDateLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedDayAppointments.length} appointment
                  {selectedDayAppointments.length === 1 ? "" : "s"} · 24-hour
                  format
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 1 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 6,
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : selectedDayAppointments.length === 0 ? (
              <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No appointments scheduled for this day.
                </Typography>
              </Box>
            ) : (
              <List disablePadding dense>
                {selectedDayAppointments.map((a, index) => {
                  const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
                  return (
                    <Box key={a.id}>
                      {index > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => setSelected(a)}
                        sx={(theme) => ({
                          borderRadius: 0,
                          py: 1.25,
                          px: 1.5,
                          alignItems: "flex-start",
                          borderLeft: `3px solid ${sc.hex}`,
                          bgcolor: theme.palette.background.paper,
                          mb: 0.5,
                          "&:hover": {
                            bgcolor: theme.palette.action.hover,
                          },
                        })}
                      >
                        <ListItemText
                          disableTypography
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: 0.5 }}
                            >
                              <AccessTimeIcon
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  fontVariantNumeric: "tabular-nums",
                                  letterSpacing: 0.3,
                                }}
                              >
                                {formatClinicTime24(a.scheduled_at)}
                              </Typography>
                              <Chip
                                label={sc.label}
                                color={sc.chip}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.65rem",
                                  borderRadius: 0,
                                  ml: "auto",
                                }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {a.patient?.name || "Unknown patient"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.doctor?.name
                                  ? `Dr. ${a.doctor.name}`
                                  : "No doctor assigned"}
                              </Typography>
                              {a.notes ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {a.notes}
                                </Typography>
                              ) : null}
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Appointment</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5, borderRadius: 1.5 }}>
            Demo mode — appointments stay on this page only and are not saved to
            the server.
          </Alert>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Search Patient"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Type patient name or phone"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Patient</InputLabel>
              <Select
                value={newAppointment.patient_id}
                label="Patient"
                onChange={(e) =>
                  setNewAppointment((prev) => ({
                    ...prev,
                    patient_id: e.target.value,
                  }))
                }
              >
                {loadingPatients ? (
                  <MenuItem value="" disabled>
                    Loading patients...
                  </MenuItem>
                ) : patientOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    No patients found
                  </MenuItem>
                ) : (
                  patientOptions.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.phone})
                    </MenuItem>
                  ))
                )}
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
            <TextField
              label="Scheduled At"
              type="datetime-local"
              value={newAppointment.scheduled_at}
              onChange={(e) =>
                setNewAppointment((prev) => ({
                  ...prev,
                  scheduled_at: clampScheduledLocal(
                    e.target.value,
                    appointmentStartHm,
                    appointmentEndHm,
                  ),
                }))
              }
              helperText={`Clinic hours ${appointmentHoursRangeLabel}. Same-day times cannot be in the past.`}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  ...(createDatetimeBounds.min && createDatetimeBounds.max
                    ? {
                        min: createDatetimeBounds.min,
                        max: createDatetimeBounds.max,
                      }
                    : {}),
                },
              }}
              fullWidth
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
                  value={selected.patient?.name || "-"}
                  disabled
                  fullWidth
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
                <TextField
                  label="Reschedule"
                  type="datetime-local"
                  value={editForm.scheduled_at}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      scheduled_at: clampScheduledLocal(
                        e.target.value,
                        appointmentStartHm,
                        appointmentEndHm,
                      ),
                    }))
                  }
                  helperText={`Clinic hours ${appointmentHoursRangeLabel}. Same-day times cannot be in the past.`}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: {
                      ...(editDatetimeBounds.min && editDatetimeBounds.max
                        ? {
                            min: editDatetimeBounds.min,
                            max: editDatetimeBounds.max,
                          }
                        : {}),
                    },
                  }}
                  fullWidth
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
              </Stack>
            </DialogContent>
            <DialogActions>
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
    </Box>
  );
}
