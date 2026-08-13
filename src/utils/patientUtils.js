import dayjs from "dayjs";

/** Clinic-facing patient identifier, e.g. P-2026-0001 */
export function formatPatientNumber(id, year = dayjs().year()) {
  if (id == null || Number.isNaN(Number(id))) return "";
  return `P-${year}-${String(id).padStart(4, "0")}`;
}

export function resolvePatientNumber(patient) {
  if (!patient) return "—";
  if (patient.patient_number) return patient.patient_number;
  if (patient.id != null) {
    const year = patient.created_at
      ? dayjs(patient.created_at).year()
      : dayjs().year();
    return formatPatientNumber(patient.id, year);
  }
  return "—";
}

export function computePatientAge(patient, referenceDate = dayjs()) {
  if (!patient) return null;

  if (patient.dob) {
    const dob = dayjs(patient.dob);
    if (dob.isValid()) {
      const age = referenceDate.diff(dob, "year");
      return age >= 0 ? age : null;
    }
  }

  const year = Number(patient.birth_year);
  if (!Number.isFinite(year)) return null;

  const month = Number(patient.birth_month);
  const day = Number(patient.birth_day);

  let dob = dayjs(`${year}-01-01`);
  if (Number.isFinite(month) && month >= 1 && month <= 12) {
    dob = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    if (Number.isFinite(day) && day >= 1 && day <= 31) {
      dob = dayjs(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    }
  }

  if (!dob.isValid()) return null;
  const age = referenceDate.diff(dob, "year");
  return age >= 0 ? age : null;
}

export function formatPatientSex(gender) {
  if (!gender) return "";
  const normalized = String(gender).trim().toLowerCase();
  if (normalized.startsWith("m")) return "M";
  if (normalized.startsWith("f")) return "F";
  return normalized.charAt(0).toUpperCase();
}

/** Chart-style age/sex cell, e.g. "58y · M" */
export function formatPatientAgeSex(patient) {
  const age = computePatientAge(patient);
  const sex = formatPatientSex(patient?.gender);
  if (age == null && !sex) return "—";
  if (age == null) return sex;
  if (!sex) return `${age}y`;
  return `${age}y · ${sex}`;
}

export function formatPatientDateTime(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY hh:mm") : "—";
}

export function formatPatientDate(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "—";
}
