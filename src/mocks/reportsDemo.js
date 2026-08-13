import dayjs from "dayjs";

const now = dayjs();

// ── Commissions ─────────────────────────────────────────────────────────────
// [staffId, staffName, patientName, source_type, reason, amount, hoursAgo]
const commissionSeeds = [
  [2, "Dr. San Oo", "Daw Khin Mya", "consultation", "Initial consultation", 3000, 2],
  [2, "Dr. San Oo", "Daw Nwe Nwe", "package", "Anti-aging package", 9500, 26],
  [3, "Dr. Yin Hla", "U Than Win", "consultation", "Botox consult", 3000, 5],
  [5, "Nurse Htet Htet", "U Than Win", "treatment", "Botox session", 1000, 5],
  [14, "Ma Thandar", "Daw Nwe Nwe", "package", "Package sale (reception)", 4750, 26],
  [2, "Dr. San Oo", "U Hla Tun", "treatment", "Laser facial", 2500, 30],
  [10, "Ko Thura", "Daw Khin Mya", "treatment", "IV drip session", 1500, 3],
  [3, "Dr. Yin Hla", "Ma Ei Mon", "consultation", "Chemical peel consult", 3000, 6],
  [6, "Nurse May May", "Ko Aung Ko", "treatment", "Laser hair removal", 1200, 1],
  [2, "Dr. San Oo", "U Kyaw Lin", "consultation", "Laser facial consult", 3000, 27],
  [12, "Daw Cho", "Walk-in customer", "treatment", "Retail skincare sale", 2000, 4],
  [3, "Dr. Yin Hla", "Daw Nwe Nwe", "package", "Anti-aging package referral", 6000, 26],
];

export const demoCommissions = commissionSeeds.map(
  ([staff_id, staffName, patientName, source_type, reason, commission_amount, hoursAgo], i) => ({
    id: i + 1,
    created_at: now.subtract(hoursAgo, "hour").toISOString(),
    staff_id,
    staff: { id: staff_id, name: staffName },
    patient: { name: patientName },
    source_type,
    reason,
    commission_amount,
  }),
);

export function buildCommissionSummary() {
  const byStaff = {};
  demoCommissions.forEach((c) => {
    if (!byStaff[c.staff_id]) {
      byStaff[c.staff_id] = {
        staff_id: c.staff_id,
        staff_name: c.staff.name,
        total_commission: 0,
        entry_count: 0,
      };
    }
    byStaff[c.staff_id].total_commission += c.commission_amount;
    byStaff[c.staff_id].entry_count += 1;
  });
  return Object.values(byStaff).sort(
    (a, b) => b.total_commission - a.total_commission,
  );
}

// ── Clinical audit logs ─────────────────────────────────────────────────────
// [minutesAgo, module, summary, userName, userEmail, changes_preview]
const auditSeeds = [
  [8, "consultations", "Consultation recorded for Daw Khin Mya", "Dr. San Oo", "doctor1@ihtechno.demo", ["Assessment: wellness IV drip", "Treatment plan updated"]],
  [15, "prescriptions", "Prescription issued (1 item) for Daw Khin Mya", "Dr. San Oo", "doctor1@ihtechno.demo", ["Vitamin C serum 15%"]],
  [22, "visits", "Patient checked in — Ko Aung Ko", "Nurse Htet Htet", "nurse1@ihtechno.demo", []],
  [35, "treatments", "Treatment session completed: IV drip", "Technician Hnin", "labtech1@ihtechno.demo", ["IV Drip"]],
  [50, "payments", "Invoice INV-2026-1001 marked paid", "Ma Thandar", "reception1@ihtechno.demo", ["Status: unpaid → paid"]],
  [70, "patients", "Patient profile updated — U Kyaw Lin", "Nurse May May", "nurse2@ihtechno.demo", ["Phone number changed"]],
  [95, "patients", "New patient registered — Mg Zaw Htet", "Ma Thandar", "reception1@ihtechno.demo", []],
  [130, "treatments", "Treatment plan added for U Than Win", "Dr. Yin Hla", "doctor2@ihtechno.demo", ["Botox"]],
  [180, "users", "User role updated — Nurse Su Su", "U Aung Min", "ceo@ihtechno.demo", ["Role: reception → senior_nurse"]],
  [240, "consultations", "Consultation edited for Ma Ei Mon", "Dr. Yin Hla", "doctor2@ihtechno.demo", ["Assessment notes changed"]],
  [300, "treatments", "Chemical peel aftercare recorded for Ma Ei Mon", "Dr. Yin Hla", "doctor2@ihtechno.demo", []],
  [360, "payments", "Payment recorded — 52,000 K (U Hla Tun)", "Ma Thandar", "reception1@ihtechno.demo", []],
  [1440, "patients", "Medical history updated — Daw Shwe Yi", "Nurse Htet Htet", "nurse1@ihtechno.demo", ["Allergies", "Current medications"]],
  [1500, "patients", "Patient soft-deleted — Daw Myint Myint", "U Aung Min", "ceo@ihtechno.demo", ["Reason: moved to another clinic"]],
];

export const demoAuditLogs = auditSeeds.map(
  ([minutesAgo, module, summary, userName, userEmail, changes_preview], i) => ({
    id: i + 1,
    created_at: now.subtract(minutesAgo, "minute").toISOString(),
    module,
    summary,
    context: null,
    user: { name: userName, email: userEmail },
    changes_preview,
  }),
);
