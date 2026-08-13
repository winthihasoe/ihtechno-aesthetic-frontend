import { getPatients } from "../services/patientService";
import { listDialablePhones } from "./phoneUtils";

/**
 * Returns active patients sharing any dialable phone segment (excluding excludePatientId).
 */
export async function findPatientsWithPhone(phone, excludePatientId = null) {
  const segments = listDialablePhones(phone);
  if (!segments.length) return [];

  const byId = new Map();

  for (const segment of segments) {
    const res = await getPatients({ phone: segment, per_page: 5 });
    const list = Array.isArray(res?.data) ? res.data : [];

    for (const patient of list) {
      if (
        excludePatientId != null &&
        Number(patient.id) === Number(excludePatientId)
      ) {
        continue;
      }
      if (patient.deleted_at) continue;
      byId.set(patient.id, patient);
    }
  }

  return Array.from(byId.values());
}
