import dayjs from "dayjs";

const DISPLAY_FORMAT = "DD-MM-YYYY HH:mm";

/**
 * Relative time for live board surfaces: "just now", "5 min ago",
 * "Today 14:30", "Yesterday 09:15", else DD-MM-YYYY HH:mm.
 */
export function formatLiveboardRelativeTime(iso) {
  if (!iso) return "—";
  const parsed = dayjs(iso);
  if (!parsed.isValid()) return "—";

  const now = dayjs();
  const diffMinutes = now.diff(parsed, "minute");

  if (diffMinutes <= 0) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  if (parsed.isSame(now, "day")) {
    return `Today ${parsed.format("HH:mm")}`;
  }

  if (parsed.isSame(now.subtract(1, "day"), "day")) {
    return `Yesterday ${parsed.format("HH:mm")}`;
  }

  return parsed.format(DISPLAY_FORMAT);
}

/** Duration label for waiting / stage timers on cards. */
export function formatLiveboardDuration(minutes) {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  if (safeMinutes === 0) return "just now";
  if (safeMinutes > 60) {
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  return `${safeMinutes}m`;
}

/** Carryover chip: when the visit was checked in (e.g. "Yesterday 09:15"). */
export function formatCarryoverCheckInTime(iso) {
  return formatLiveboardRelativeTime(iso);
}
