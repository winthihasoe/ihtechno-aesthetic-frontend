import dayjs from "dayjs";

const now = dayjs();

const DEPARTMENTS = {
  1: { id: 1, name: "Administration" },
  2: { id: 2, name: "Outpatient (OPD)" },
  3: { id: 3, name: "Nursing Ward" },
  4: { id: 4, name: "Laboratory" },
  5: { id: 5, name: "Pharmacy" },
};

// [id, name, email, role, position, deptId, employmentType, phone, yearsAgo, baseSalary, attendance]
//   attendance: "present" | "late" | "absent" | "leave"
const roster = [
  [1, "U Aung Min", "ceo@ihtechno.demo", "ceo", "Medical Director / CEO", 1, "full_time", "09-500-100-001", 6, 1500000, "present"],
  [2, "Dr. San Oo", "doctor1@ihtechno.demo", "medical_officer", "Medical Officer", 2, "full_time", "09-500-100-002", 4, 900000, "present"],
  [3, "Dr. Yin Hla", "doctor2@ihtechno.demo", "dermatologist", "Dermatologist", 2, "full_time", "09-500-100-003", 3, 950000, "late"],
  [4, "Dr. Khine Zaw", "doctor3@ihtechno.demo", "medical_officer", "Medical Officer", 2, "full_time", "09-500-100-004", 2, 850000, "present"],
  [5, "Nurse Htet Htet", "nurse1@ihtechno.demo", "senior_nurse", "Senior Nurse", 3, "full_time", "09-500-100-005", 5, 450000, "present"],
  [6, "Nurse May May", "nurse2@ihtechno.demo", "senior_nurse", "Senior Nurse", 3, "full_time", "09-500-100-006", 4, 430000, "present"],
  [7, "Nurse Hnin Hnin", "nurse3@ihtechno.demo", "senior_nurse", "Staff Nurse", 3, "full_time", "09-500-100-007", 2, 380000, "late"],
  [8, "Nurse Zin Zin", "nurse4@ihtechno.demo", "senior_nurse", "Staff Nurse", 3, "full_time", "09-500-100-008", 1, 370000, "leave"],
  [9, "Nurse Su Su", "nurse5@ihtechno.demo", "senior_nurse", "Staff Nurse", 3, "part_time", "09-500-100-009", 1, 300000, "present"],
  [10, "Ko Thura", "labtech1@ihtechno.demo", "technician", "Lab Technician", 4, "full_time", "09-500-100-010", 3, 400000, "present"],
  [11, "Ma Phyu", "labtech2@ihtechno.demo", "technician", "Lab Technician", 4, "full_time", "09-500-100-011", 2, 390000, "present"],
  [12, "Daw Cho", "pharmacist1@ihtechno.demo", "pharmacist", "Pharmacist", 5, "full_time", "09-500-100-012", 4, 500000, "present"],
  [13, "Ko Naing", "pharmacy2@ihtechno.demo", "pharmacist", "Pharmacy Assistant", 5, "full_time", "09-500-100-013", 2, 320000, "absent"],
  [14, "Ma Thandar", "reception1@ihtechno.demo", "reception", "Receptionist", 1, "full_time", "09-500-100-014", 3, 300000, "present"],
  [15, "U Ba Win", "accountant1@ihtechno.demo", "accountant", "Accountant", 1, "full_time", "09-500-100-015", 5, 550000, "present"],
  [16, "Daw Aye", "housekeeping1@ihtechno.demo", "worker", "Housekeeping Supervisor", 1, "full_time", "09-500-100-016", 4, 250000, "present"],
];

export const demoStaffs = roster.map(
  ([id, name, email, role, position, deptId, employmentType, phone, yearsAgo, baseSalary]) => {
    const joinedAt = now.subtract(yearsAgo, "year").format("YYYY-MM-DD");
    const department = DEPARTMENTS[deptId];
    return {
      id,
      name,
      email,
      role,
      status: "active",
      position,
      department,
      department_id: deptId,
      joined_at: joinedAt,
      base_salary: baseSalary,
      staff_profile: {
        staff_no: `EMP-${String(id).padStart(3, "0")}`,
        position_title: position,
        department,
        employment_type: employmentType,
        phone,
        joined_at: joinedAt,
        status: "active",
        avatar_url: null,
        status_reminder: null,
      },
    };
  },
);

const staffRef = (id) => {
  const s = demoStaffs.find((x) => x.id === id);
  return s ? { id: s.id, name: s.name } : null;
};

// ── Attendance (today) ──────────────────────────────────────────────────────
const today = now.format("YYYY-MM-DD");
export const demoAttendance = roster
  .filter(([, , , , , , , , , , attendance]) => attendance !== "absent" && attendance !== "leave")
  .map(([id], i) => {
    const late = roster.find(([sid]) => sid === id)?.[10] === "late";
    const checkIn = now
      .hour(8)
      .minute(late ? 34 + (i % 3) : 2 + (i % 8))
      .second(0);
    // Doctors/nurses on shift still working (no check-out); a few checked out.
    const checkedOut = i % 4 === 0;
    return {
      id: 500 + id,
      staff_id: id,
      staff: staffRef(id),
      shift_date: today,
      check_in: checkIn.toISOString(),
      check_out: checkedOut ? now.hour(17).minute(5).second(0).toISOString() : null,
      status: late ? "late" : "present",
    };
  });

// ── Leaves ──────────────────────────────────────────────────────────────────
// [staffId, type, category, startInDays, days, status, reason]
const leaveSeeds = [
  [8, "annual", "Annual leave", 0, 2, "approved", "Family event out of town"],
  [7, "sick", "Sick leave", -1, 1, "approved", "Fever and rest advised"],
  [11, "casual", "Casual leave", 3, 1, "pending", "Personal errand"],
  [5, "annual", "Annual leave", 10, 3, "pending", "Annual vacation with family"],
  [13, "sick", "Sick leave", -3, 2, "rejected", "Insufficient notice / no medical note"],
  [9, "casual", "Casual leave", 5, 1, "pending", "Attend a wedding"],
];

export const demoLeaves = leaveSeeds.map(
  ([staffId, type, reason_category, startInDays, days, status, reason], i) => {
    const start = now.add(startInDays, "day");
    return {
      id: i + 1,
      staff_id: staffId,
      staff: staffRef(staffId),
      type,
      reason_category,
      start_date: start.format("YYYY-MM-DD"),
      end_date: start.add(days - 1, "day").format("YYYY-MM-DD"),
      days,
      status,
      reason,
      created_at: now.subtract(2, "day").toISOString(),
    };
  },
);

// ── Overtime ────────────────────────────────────────────────────────────────
// [staffId, daysAgo, hours, source, note]
const overtimeSeeds = [
  [5, 1, 2, "manual", "Covered evening ward shift"],
  [2, 1, 1.5, "attendance", "Late OPD closing"],
  [10, 2, 2, "manual", "Urgent lab batch processing"],
  [6, 3, 1, "attendance", "Extended handover"],
  [12, 4, 2.5, "manual", "Monthly pharmacy stock-take"],
  [14, 5, 1, "manual", "Reception coverage"],
];

export const demoOvertimes = overtimeSeeds.map(([staffId, daysAgo, hours, source, note], i) => ({
  id: i + 1,
  staff_id: staffId,
  staff: staffRef(staffId),
  date: now.subtract(daysAgo, "day").format("YYYY-MM-DD"),
  hours,
  source,
  note,
}));

// ── Payroll (current month) ─────────────────────────────────────────────────
const monthKey = now.format("YYYY-MM");
export const demoPayrolls = demoStaffs.map((s, i) => {
  const base = s.base_salary;
  const overtime_amount = [5, 2, 10, 6, 12, 14].includes(s.id)
    ? Math.round(base * 0.05)
    : 0;
  const commission_amount = [2, 3, 4].includes(s.id) ? 60000 : [10, 11, 12].includes(s.id) ? 20000 : 0;
  const deductions = Math.round(base * 0.02); // SSB / tax
  const total_amount = base + overtime_amount + commission_amount - deductions;
  return {
    id: i + 1,
    month: monthKey,
    staff_id: s.id,
    staff: { id: s.id, name: s.name },
    base_salary: base,
    overtime_amount,
    commission_amount,
    deductions,
    total_amount,
    status: i < 6 ? "finalized" : "draft",
  };
});

// ── Public holidays (current year) ──────────────────────────────────────────
const Y = now.year();
const holidaySeeds = [
  ["01-01", "New Year's Day"],
  ["01-04", "Independence Day"],
  ["02-12", "Union Day"],
  ["03-02", "Peasants' Day"],
  ["03-27", "Armed Forces Day"],
  ["04-13", "Thingyan (Water Festival)"],
  ["04-14", "Thingyan (Water Festival)"],
  ["04-15", "Thingyan (Water Festival)"],
  ["04-16", "Thingyan (Water Festival)"],
  ["04-17", "Myanmar New Year"],
  ["05-01", "Labour Day"],
  ["07-19", "Martyrs' Day"],
  ["10-17", "Thadingyut Festival"],
  ["11-15", "Tazaungdaing Festival"],
  ["12-25", "Christmas Day"],
];

export const demoPublicHolidays = holidaySeeds.map(([md, name], i) => ({
  id: i + 1,
  date: `${Y}-${md}`,
  name,
  recurring: true,
}));

// ── Grievances ──────────────────────────────────────────────────────────────
const grievanceSeeds = [
  [7, false, "Scheduling", "Uneven weekend shift rotation", "open", 4],
  [null, true, "Facilities", "Staff room air-conditioning not working", "in_review", 8],
  [11, false, "Payroll", "Overtime for last month not reflected", "resolved", 20],
];

export const demoGrievances = grievanceSeeds.map(([staffId, is_anonymous, category, subject, status, daysAgo], i) => ({
  id: i + 1,
  reference: `GRV-${String(i + 1).padStart(4, "0")}`,
  staff: is_anonymous ? null : staffRef(staffId),
  is_anonymous,
  category,
  subject,
  status,
  created_at: now.subtract(daysAgo, "day").toISOString(),
}));

export function buildHrHeadcount() {
  const byDept = {};
  demoStaffs.forEach((s) => {
    const d = s.department?.name ?? "Unassigned";
    byDept[d] = (byDept[d] ?? 0) + 1;
  });
  return byDept;
}
