import dayjs from "dayjs";

/** @param {string} month YYYY-MM */
export function shiftMonth(month, delta) {
  const start = dayjs(`${month}-01`).startOf("month");
  return start.add(delta, "month").format("YYYY-MM");
}

/** @param {string} month YYYY-MM */
export function formatMonthLabel(month) {
  if (!month) return "—";
  return dayjs(`${month}-01`).format("MMMM YYYY");
}

/** Human-readable range for a calendar month. */
export function monthRangeLabel(month) {
  if (!month) return "—";
  const start = dayjs(`${month}-01`).startOf("month");
  const end = start.endOf("month");
  return `${start.format("DD-MM-YYYY")} – ${end.format("DD-MM-YYYY")}`;
}

/** API date_from / date_to for a YYYY-MM reporting month. */
export function monthToDateRange(month) {
  const start = dayjs(`${month}-01`).startOf("month");
  return {
    date_from: start.format("YYYY-MM-DD"),
    date_to: start.endOf("month").format("YYYY-MM-DD"),
  };
}

export function currentMonthKey() {
  return dayjs().format("YYYY-MM");
}
