export const PROFILE_STATUS_OPTIONS = [
  { value: "probation", label: "Probation" },
  { value: "permanent", label: "Permanent" },
  { value: "resignation_period", label: "Resignation Period" },
  { value: "dismissed", label: "Dismissed" },
  { value: "terminated", label: "Terminated" },
  { value: "resigned", label: "Resigned" },
];

export const PROFILE_STATUS_LABELS = Object.fromEntries(
  PROFILE_STATUS_OPTIONS.map((item) => [item.value, item.label]),
);

/** Statuses where employment has ended — hide Mark resigned, no further probation reminders. */
export const TERMINAL_PROFILE_STATUSES = ["resigned", "dismissed", "terminated"];

/**
 * Optional dev override: set VITE_HR_STATUS_REFERENCE_DATE=2026-06-01 in .env.local
 * to preview probation/resignation warnings without waiting for real dates.
 */
export const getDevReferenceToday = () => {
  if (!import.meta.env.DEV) return undefined;
  const value = import.meta.env.VITE_HR_STATUS_REFERENCE_DATE;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const computeProbationEndDate = (hireDate, probationMonths) => {
  if (!hireDate || !probationMonths) return null;
  const months = Number(probationMonths);
  if (!Number.isFinite(months) || months < 1) return null;
  const parts = hireDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month, day] = parts;
  const end = new Date(Date.UTC(year, month - 1 + months, day));
  if (Number.isNaN(end.getTime())) return null;
  return end.toISOString().slice(0, 10);
};

export const STATUS_REMINDER_LABELS = {
  probation_period_end: "Probation period end",
  resignation_period_end: "Resignation period end",
};

export const STATUS_REMINDER_ACTIONS = {
  probation_period_end: "Update profile status to Permanent",
  resignation_period_end: "Update profile status to Resigned",
};

const parseDay = (iso) => {
  const parts = String(iso).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
};

export const getStatusReminder = ({
  profileStatus,
  hireDate,
  probationMonths,
  resignationPeriodEndDate,
  probationEndDate,
  statusReminder,
  referenceToday,
}) => {
  if (statusReminder) return statusReminder;

  const todayIso = referenceToday || new Date().toISOString().slice(0, 10);
  const today = parseDay(todayIso);
  if (!today) return null;

  if (profileStatus === "probation") {
    const endIso =
      probationEndDate || computeProbationEndDate(hireDate, probationMonths);
    const end = endIso ? parseDay(endIso) : null;
    if (end && today >= end) {
      return "probation_period_end";
    }
  }

  if (profileStatus === "resignation_period" && resignationPeriodEndDate) {
    const end = parseDay(resignationPeriodEndDate);
    if (end && today >= end) {
      return "resignation_period_end";
    }
  }

  return null;
};

export const getStatusReminderDetails = (params) => {
  const reminder = getStatusReminder(params);
  if (!reminder) {
    return { reminder: null, label: null, actionLabel: null };
  }

  return {
    reminder,
    label: STATUS_REMINDER_LABELS[reminder] || null,
    actionLabel: STATUS_REMINDER_ACTIONS[reminder] || null,
  };
};

export const isTerminalProfileStatus = (profileStatus) =>
  TERMINAL_PROFILE_STATUSES.includes(profileStatus);
