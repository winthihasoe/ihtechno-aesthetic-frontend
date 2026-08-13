import dayjs from "dayjs";

export const EMPTY_SCHEDULED_PARTS = {
  day: "",
  month: "",
  year: "",
  hour: "",
  minute: "",
};

export const DEFAULT_APPT_START = "09:00";
export const DEFAULT_APPT_END = "18:00";

const parseHmToMinutes = (hm) => {
  if (!hm || typeof hm !== "string") return null;
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

export const parseScheduledParts = (value) => {
  if (!value) return { ...EMPTY_SCHEDULED_PARTS };
  const d = dayjs(value);
  if (!d.isValid()) return { ...EMPTY_SCHEDULED_PARTS };
  return {
    day: String(d.date()),
    month: String(d.month() + 1),
    year: String(d.year()),
    hour: String(d.hour()),
    minute: String(d.minute()),
  };
};

export const buildScheduledLocal = (parts) => {
  const day = String(parts.day ?? "").trim();
  const month = String(parts.month ?? "").trim();
  const year = String(parts.year ?? "").trim();
  const hour = String(parts.hour ?? "").trim();
  const minute = String(parts.minute ?? "").trim();

  if (!day || !month || !year || hour === "" || minute === "") {
    return "";
  }

  const padded = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  const dt = dayjs(padded);
  if (!dt.isValid()) return "";
  return dt.format("YYYY-MM-DDTHH:mm");
};

export const formatHolidayDate = (dateString) => {
  const d = dayjs(dateString);
  if (!d.isValid()) return dateString;
  return d.format("DD-MM-YYYY");
};

export const buildYearOptions = (valueYear) => {
  const current = dayjs().year();
  const years = new Set([current, current + 1, current + 2]);
  if (Number.isFinite(valueYear)) years.add(valueYear);
  return [...years].sort((a, b) => a - b);
};

export const holidayOnDate = (publicHolidays, year, month, day) => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const iso = dayjs(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  ).format("YYYY-MM-DD");
  if (!dayjs(iso).isValid()) return null;
  return (
    publicHolidays.find((row) => dayjs(row.date).format("YYYY-MM-DD") === iso) ??
    null
  );
};

export const isPastDate = (year, month, day) => {
  const target = dayjs(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  ).startOf("day");
  return target.isValid() && target.isBefore(dayjs().startOf("day"));
};

export const isTimeSlotAllowed = (
  year,
  month,
  day,
  hour,
  minute,
  startHm,
  endHm,
) => {
  const startM = parseHmToMinutes(startHm) ?? parseHmToMinutes(DEFAULT_APPT_START);
  const endM = parseHmToMinutes(endHm) ?? parseHmToMinutes(DEFAULT_APPT_END);
  const total = hour * 60 + minute;
  if (total < startM || total > endM) return false;

  const slot = dayjs(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  );
  if (!slot.isValid()) return false;
  if (slot.isBefore(dayjs().add(1, "minute").startOf("minute"))) return false;
  return true;
};

export const isHourSelectable = (year, month, day, hour, startHm, endHm) => {
  for (let minute = 0; minute < 60; minute += 1) {
    if (isTimeSlotAllowed(year, month, day, hour, minute, startHm, endHm)) {
      return true;
    }
  }
  return false;
};

const isPublicHoliday = (date, publicHolidays) => {
  const iso = date.format("YYYY-MM-DD");
  return publicHolidays.some(
    (row) => dayjs(row.date).format("YYYY-MM-DD") === iso,
  );
};

const openingOnDay = (date, startM) =>
  date
    .startOf("day")
    .hour(Math.floor(startM / 60))
    .minute(startM % 60)
    .second(0)
    .millisecond(0);

/** Default schedule for a new appointment: today (or tomorrow if outside clinic hours). */
export function buildDefaultNewAppointmentSchedule(
  startHm = DEFAULT_APPT_START,
  endHm = DEFAULT_APPT_END,
  publicHolidays = [],
) {
  const now = dayjs();
  const startM =
    parseHmToMinutes(startHm) ?? parseHmToMinutes(DEFAULT_APPT_START);
  const endM = parseHmToMinutes(endHm) ?? parseHmToMinutes(DEFAULT_APPT_END);
  const nowM = now.hour() * 60 + now.minute();
  const outsideClinicHours = nowM < startM || nowM > endM;

  const firstSlotOnDay = (day) => {
    if (isPublicHoliday(day, publicHolidays)) return null;

    const open = openingOnDay(day, startM);
    let slot = open;

    if (day.isSame(now, "day") && !outsideClinicHours) {
      const soon = now.add(1, "minute").startOf("minute");
      slot = open.isAfter(soon) ? open : soon;
    }

    const slotM = slot.hour() * 60 + slot.minute();
    if (slotM > endM) return null;
    return slot;
  };

  let day = outsideClinicHours
    ? now.add(1, "day").startOf("day")
    : now.startOf("day");

  let slot = firstSlotOnDay(day);
  let guard = 0;
  while (!slot && guard < 366) {
    day = day.add(1, "day");
    slot = firstSlotOnDay(day);
    guard += 1;
  }

  if (!slot) {
    slot = openingOnDay(now.add(1, "day").startOf("day"), startM);
  }

  return slot.format("YYYY-MM-DDTHH:mm");
}

export const dayMenuSuffix = (holiday, past) => {
  if (holiday) return ` — ${holiday.name}`;
  if (past) return " — Past";
  return "";
};
