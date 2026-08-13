import dayjs from "dayjs";

const BIRTH_MONTH_OPTIONS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

/** Option pairs for identity birth dropdowns; null if not a birth part field. */
export function getBirthSelectOptionPairs(fieldName) {
  if (fieldName === "birth_day") {
    return Array.from({ length: 31 }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  }
  if (fieldName === "birth_month") {
    return BIRTH_MONTH_OPTIONS;
  }
  if (fieldName === "birth_year") {
    const y = dayjs().year();
    return Array.from({ length: 91 }, (_, i) => ({
      value: String(y - i),
      label: String(y - i),
    }));
  }
  return null;
}
