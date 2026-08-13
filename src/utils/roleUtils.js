import { hasAnyPermission, hasPermission, hasRole } from "./accessUtils";
import {
  isClinicalDoctorUser,
  isFrontDeskUser,
  isTreatmentStaffUser,
  resolveNavTemplateKey,
} from "./roleWorkspace";
import { resolveUserPrimaryRole, getWorkspaceUrlPrefix } from "./workspaceRoutes";

const CLINICAL_DOCTOR_ACTIONS = [
  "start_consultation",
  "open_consultation",
  "send_to_preparation",
  "open_preparation",
  "proceed_to_treatment",
];

const TREATMENT_STAFF_ACTIONS = ["mark_treatment_done", "open_preparation"];

const FRONT_DESK_ACTIONS = [
  "create_visit",
  "open_preparation",
  "mark_treatment_done",
];

const CASHIER_ACTIONS = ["open_payment", "complete_payment"];

const ADMIN_ACTIONS = [
  ...CLINICAL_DOCTOR_ACTIONS,
  ...TREATMENT_STAFF_ACTIONS,
  ...CASHIER_ACTIONS,
  ...FRONT_DESK_ACTIONS,
];

// Map of role → allowed actions on Visit History
export const ROLE_ACTIONS = {
  medical_officer: CLINICAL_DOCTOR_ACTIONS,
  dermatologist: CLINICAL_DOCTOR_ACTIONS,
  senior_nurse: CLINICAL_DOCTOR_ACTIONS,
  therapist: TREATMENT_STAFF_ACTIONS,
  specialist: TREATMENT_STAFF_ACTIONS,
  technician: TREATMENT_STAFF_ACTIONS,
  cashier: CASHIER_ACTIONS,
  reception: FRONT_DESK_ACTIONS,
  sales_marketing: FRONT_DESK_ACTIONS,
  worker: FRONT_DESK_ACTIONS,
  pharmacist: FRONT_DESK_ACTIONS,
  admin: ADMIN_ACTIONS,
  manager: ADMIN_ACTIONS,
  ceo: ADMIN_ACTIONS,
};

export const DEFAULT_LIVEBOARD_RULES = {
  open_panel: {
    owner: true,
    admin: true,
    manager: true,
    ceo: true,
    reception: true,
    sales_marketing: true,
    worker: true,
    pharmacist: true,
    medical_officer: true,
    senior_nurse: true,
  },
  start_consulting: {
    owner: true,
    admin: true,
    manager: true,
    medical_officer: true,
    senior_nurse: true,
    assigned_user: true,
  },
  do_not_consulting: {
    owner: true,
    admin: true,
    manager: true,
    medical_officer: true,
    senior_nurse: true,
    assigned_user: true,
  },
  open_consulting: {
    owner: true,
    assigned_user: true,
  },
  send_to_preparation: {
    owner: true,
    admin: true,
    manager: true,
    medical_officer: true,
    senior_nurse: true,
    assigned_user: true,
  },
  proceed_treatment: {
    owner: true,
    admin: true,
    manager: true,
    reception: true,
    sales_marketing: true,
    worker: true,
    pharmacist: true,
  },
  start_treatment: {
    owner: true,
    assigned_user: true,
  },
  mark_done: {
    owner: true,
    admin: true,
    manager: true,
    reception: true,
    sales_marketing: true,
    worker: true,
    pharmacist: true,
    specialist: true,
    technician: true,
  },
  go_to_invoice: {
    owner: true,
  },
  handover_request: {
    owner: true,
    admin: true,
    manager: true,
    reception: true,
    sales_marketing: true,
    worker: true,
    pharmacist: true,
  },
  handover_accept: {
    owner: true,
    admin: true,
    manager: true,
    reception: true,
    sales_marketing: true,
    worker: true,
    pharmacist: true,
  },
  doctor_handover_request: {
    owner: true,
    admin: true,
    manager: true,
    medical_officer: true,
    senior_nurse: true,
  },
  doctor_handover_accept: {
    owner: true,
    admin: true,
    manager: true,
    medical_officer: true,
    senior_nurse: true,
  },
};

const ACTION_PERMISSION_FALLBACK = {
  start_consultation: ["consultations.manage"],
  open_consultation: ["consultations.manage"],
  send_to_preparation: ["consultations.manage"],
  proceed_to_treatment: ["consultations.manage", "liveboard.update"],
  mark_treatment_done: ["treatments.manage"],
  open_preparation: ["liveboard.update", "treatments.manage"],
  open_payment: ["payments.manage"],
  complete_payment: ["payments.manage"],
  create_visit: ["visits.manage", "appointments.manage"],
};

const resolvePrimaryRole = (user) => {
  if (!user) return null;
  if (user.role) return user.role;
  if (Array.isArray(user.roles) && user.roles.length) {
    return user.roles[0]?.slug ?? null;
  }
  return null;
};

const resolveRoleSlugs = (user) => {
  if (!user) return [];
  const slugs = new Set();
  if (user.role) slugs.add(user.role);
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (r?.slug) slugs.add(r.slug);
      if (r?.name) slugs.add(r.name);
    });
  }
  return [...slugs];
};

export const canViewLiveboard = (user) =>
  hasRole(user, "owner") || hasPermission(user, "liveboard.view");

export const canUpdateLiveboard = (user) =>
  hasRole(user, "owner") || hasPermission(user, "liveboard.update");

export const canDo = (userOrRole, action) => {
  if (!userOrRole) return false;
  if (typeof userOrRole === "string") {
    if (userOrRole === "owner" || userOrRole === "ceo") return true;
    if (ROLE_ACTIONS[userOrRole]?.includes(action)) return true;
    return false;
  }

  if (!canUpdateLiveboard(userOrRole)) return false;
  if (hasRole(userOrRole, "owner") || hasRole(userOrRole, "ceo")) return true;

  const slugs = resolveRoleSlugs(userOrRole);
  if (slugs.some((slug) => ROLE_ACTIONS[slug]?.includes(action))) return true;

  const fallbackPerms = ACTION_PERMISSION_FALLBACK[action];
  if (fallbackPerms?.length && hasAnyPermission(userOrRole, fallbackPerms)) {
    return true;
  }

  return false;
};

export const canUseLiveboardButton = (
  user,
  visit,
  buttonKey,
  liveboardRules = DEFAULT_LIVEBOARD_RULES,
) => {
  if (!user || !buttonKey) return false;
  if (hasRole(user, "owner") || hasRole(user, "developer")) return true;
  const row = liveboardRules?.[buttonKey];
  if (!row || typeof row !== "object") return false;
  const roles = resolveRoleSlugs(user);
  if (roles.some((slug) => row[slug] === true)) return true;
  if (row.assigned_user) {
    const uid = Number(user.id);
    if (Number.isFinite(uid) && uid > 0) {
      if (
        [
          "start_consulting",
          "do_not_consulting",
          "open_consulting",
          "send_to_preparation",
        ].includes(buttonKey)
      ) {
        return Number(visit?.doctor_id) === uid;
      }
      if (buttonKey === "start_treatment") {
        if (Number(visit?.doctor_id) === uid) return true;
        if (hasAssignedTreatmentDoctorSession(user, visit)) return true;
        if (Number(visit?.therapist_id) === uid) return true;
        const therapists = Array.isArray(visit?.therapists)
          ? visit.therapists
          : [];
        return therapists.some((t) => Number(t?.id) === uid);
      }
    }
  }
  return false;
};

/** True when the user is assigned as treating doctor on at least one session. */
export const hasAssignedTreatmentDoctorSession = (user, visit) => {
  if (!user?.id || !visit) return false;
  const uid = Number(user.id);
  const treatments = Array.isArray(visit.treatments) ? visit.treatments : [];
  return treatments.some((t) => {
    const aid = t.assigned_doctor_id ?? t.assigned_doctor?.id ?? null;
    return aid != null && Number(aid) === uid;
  });
};

export const isPendingDoctorHandoverReceiver = (user, visit) => {
  if (!user?.id || !visit) return false;
  const toId = visit.doctor_handover_to_id ?? visit.doctor_handover_to?.id ?? null;
  return toId != null && Number(toId) === Number(user.id);
};

export const canHandoverTreatmentDoctor = (user, visit) => {
  if (!user || !visit) return false;
  if (visit.status !== "treatment") return false;
  if (visit.doctor_handover_to_id != null || visit.doctor_handover_to?.id != null) {
    return false;
  }
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  return Number(visit.doctor_id) === Number(user.id);
};

/** Waiting column: only the assigned MO/Derm may start; admin/owner may always start. */
export const canStartConsultationForVisit = (user, visit) => {
  if (!user || !visit) return false;
  if (!canDo(user, "start_consultation")) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  const assignedId = visit.doctor_id;
  if (assignedId == null || assignedId === "") return false;
  return Number(assignedId) === Number(user.id);
};

/** Consulting actions (open/skip/send): only the assigned doctor/dermatologist. */
export const canManageConsultationForVisit = (user, visit) => {
  if (!user || !visit) return false;
  if (!canDo(user, "open_consultation")) return false;
  const isAssignedDoctor = Number(visit.doctor_id) === Number(user.id);
  return isAssignedDoctor && isClinicalDoctorUser(user);
};

/** True when the user is one of the therapists assigned to the visit. */
export const isAssignedTherapistOnVisit = (user, visit) => {
  if (!user?.id || !visit) return false;
  const uid = Number(user.id);
  if (visit.therapist_id != null && Number(visit.therapist_id) === uid)
    return true;
  if (visit.therapist?.id != null && Number(visit.therapist.id) === uid)
    return true;
  const list = Array.isArray(visit.therapists) ? visit.therapists : [];
  return list.some((t) => Number(t.id) === uid);
};

/** Procedure charts on a treatment session: visit doctor, session doctor, assigned therapist(s), or admin/owner. */
export const canEditProcedureRecordOnVisit = (user, visit, session = null) => {
  if (!user || !visit) return false;
  if (isPendingDoctorHandoverReceiver(user, visit)) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;

  const uid = Number(user.id);
  const sessionAssignedId =
    session?.assigned_doctor_id ?? session?.assigned_doctor?.id ?? null;

  if (sessionAssignedId != null) {
    return Number(sessionAssignedId) === uid;
  }

  if (visit.doctor_id != null && Number(visit.doctor_id) === uid) return true;
  return isAssignedTherapistOnVisit(user, visit);
};

/** Full-page Treatment Room and treatment-column actions (care team + admin/owner). */
export const canAccessTreatmentRoom = (user, visit) => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  if (visit.status !== "treatment") return false;
  if (isPendingDoctorHandoverReceiver(user, visit)) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  if (Number(visit.doctor_id) === Number(user.id)) return true;
  if (hasAssignedTreatmentDoctorSession(user, visit)) return true;
  if (isAssignedTherapistOnVisit(user, visit)) return true;
  return false;
};

export const canAccessPreparationPanel = (user, visit) => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  const checkInStaffId =
    visit.check_in_staff_id ?? visit.check_in_staff?.id ?? null;
  return checkInStaffId != null && Number(checkInStaffId) === Number(user.id);
};

export const canOpenVisitPanel = (user, visit, context = "consulting") => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  if (context === "preparation") {
    return canAccessPreparationPanel(user, visit);
  }
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  if (isFrontDeskUser(user)) {
    const checkInStaffId =
      visit.check_in_staff_id ?? visit.check_in_staff?.id ?? null;
    if (checkInStaffId != null && Number(checkInStaffId) === Number(user.id)) {
      return true;
    }
    return visit.status === "waiting" || visit.status === "preparation";
  }
  if (visit.status === "treatment" && canAccessTreatmentRoom(user, visit)) {
    return true;
  }
  return Number(visit.doctor_id) === Number(user.id);
};

/** Hand over designated check-in staff (front desk) for this visit. */
export const canHandoverCheckIn = (user, visit) => {
  if (!user || !visit) return false;
  if (!canUpdateLiveboard(user)) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  const staffId = visit.check_in_staff_id ?? visit.check_in_staff?.id ?? null;
  return isFrontDeskUser(user) && staffId != null && Number(staffId) === Number(user.id);
};

/** @typedef {{ id?: string, label: string, path: string, icon?: string, roles?: string[], permissions?: string[], mobilePriority?: number, children?: NavItem[] }} NavItem */
/** @typedef {NavItem & { id: string, children: NavItem[] }} NavSection */

const buildFinanceChildren = (prefix) => [
  {
    label: "Transactions",
    path: `${prefix}/finance/transactions`,
    icon: "SwapHoriz",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Journal Entries",
    path: `${prefix}/finance/journal-entries`,
    icon: "ReceiptLong",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Chart of Accounts",
    path: `${prefix}/finance/chart-of-accounts`,
    icon: "AccountTree",
    permissions: ["payments.view", "finance.chart_of_accounts.view"],
  },
  {
    label: "General Ledger",
    path: `${prefix}/finance/general-ledger`,
    icon: "MenuBook",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Profit & Loss",
    path: `${prefix}/finance/profit-and-loss`,
    icon: "TrendingUp",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Balance Sheet",
    path: `${prefix}/finance/balance-sheet`,
    icon: "AccountBalance",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Cash movements",
    path: `${prefix}/finance/cash-movements`,
    icon: "Payments",
    permissions: ["payments.view", "finance.reports.view"],
  },
  {
    label: "Fixed assets",
    path: `${prefix}/finance/fixed-assets`,
    icon: "PrecisionManufacturing",
    permissions: ["payments.view", "finance.fixed_assets.view"],
  },
  {
    label: "Payroll statement inputs",
    path: `${prefix}/finance/payroll-statement-inputs`,
    icon: "Payments",
    permissions: ["payments.view", "finance.payroll_statement_inputs.view"],
  },
];

const ROLE_NAV_ITEMS = {
  reception: [
    {
      id: "patients",
      label: "Patient Registry",
      path: "/reception/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 1,
    },
    {
      id: "visit_history",
      label: "Visit History",
      path: "/reception/visit-history",
      icon: "History",
      permissions: ["liveboard.view"],
      mobilePriority: 2,
    },
    {
      id: "appointments",
      label: "Appointments",
      path: "/reception/appointments",
      icon: "CalendarMonth",
      permissions: ["appointments.view", "appointments.manage"],
      mobilePriority: 3,
    },
    {
      label: "Packages",
      path: "/reception/packages",
      icon: "CardGiftcard",
      permissions: ["packages.view"],
    },
    {
      label: "Treatment Templates",
      path: "/reception/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "Commission",
      path: "/reception/commissions",
      icon: "Diversity3",
      roles: ["reception", "sales_marketing"],
    },
    {
      label: "HR Module",
      path: "/reception/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/reception/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/reception/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/reception/hr/grievance",
          icon: "SupportAgent",
          roles: ["reception", "sales_marketing"],
        },
        {
          label: "Payslip",
          path: "/reception/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  medical_officer: [
    {
      id: "patients",
      label: "Patient Registry",
      path: "/medical-officer/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 1,
    },
    {
      id: "visit_history",
      label: "Visit History",
      path: "/medical-officer/visit-history",
      icon: "History",
      permissions: ["liveboard.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/medical-officer/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "My commission",
      path: "/medical-officer/commissions",
      icon: "Diversity3",
      roles: ["medical_officer", "dermatologist"],
    },
    {
      id: "forms",
      label: "Forms",
      path: "/medical-officer/forms",
      icon: "Assignment",
      roles: ["medical_officer", "dermatologist"],
      mobilePriority: 3,
    },
    {
      id: "hr",
      label: "HR Module",
      path: "/medical-officer/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/medical-officer/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/medical-officer/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/medical-officer/hr/grievance",
          icon: "SupportAgent",
          roles: ["medical_officer", "dermatologist"],
        },
        {
          label: "Payslip",
          path: "/medical-officer/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  dermatologist: [
    {
      id: "patients",
      label: "Patient Registry",
      path: "/medical-officer/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 1,
    },
    {
      id: "visit_history",
      label: "Visit History",
      path: "/medical-officer/visit-history",
      icon: "History",
      permissions: ["liveboard.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/medical-officer/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "My commission",
      path: "/medical-officer/commissions",
      icon: "Diversity3",
      roles: ["medical_officer", "dermatologist"],
    },
    {
      label: "Forms",
      path: "/medical-officer/forms",
      icon: "Assignment",
      roles: ["medical_officer", "dermatologist"],
    },
    {
      label: "HR Module",
      path: "/medical-officer/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/medical-officer/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/medical-officer/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/medical-officer/hr/grievance",
          icon: "SupportAgent",
          roles: ["medical_officer", "dermatologist"],
        },
        {
          label: "Payslip",
          path: "/medical-officer/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  therapist: [
    {
      id: "patients",
      label: "Patient Registry",
      path: "/therapist/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 1,
    },
    {
      id: "visit_history",
      label: "Visit History",
      path: "/therapist/visit-history",
      icon: "History",
      permissions: ["liveboard.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/therapist/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "My commission",
      path: "/therapist/commissions",
      icon: "Diversity3",
      roles: ["therapist"],
    },
    {
      label: "HR Module",
      path: "/therapist/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/therapist/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/therapist/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/therapist/hr/grievance",
          icon: "SupportAgent",
          roles: ["therapist"],
        },
        {
          label: "Payslip",
          path: "/therapist/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  cashier: [
    {
      id: "billing",
      label: "Billing",
      path: "/cashier/pending-payments",
      icon: "Payments",
      mobilePriority: 1,
      children: [
        {
          label: "Invoices",
          path: "/cashier/pending-payments",
          icon: "Payments",
          roles: ["cashier"],
        },
        {
          label: "Patients",
          path: "/cashier/patients",
          icon: "People",
          permissions: ["patients.view"],
        },
        {
          label: "Packages",
          path: "/cashier/packages",
          icon: "CardGiftcard",
          permissions: ["packages.view"],
        },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      path: "/cashier/inventory",
      icon: "Inventory2",
      mobilePriority: 3,
      children: [
        {
          label: "Treatment Templates",
          path: "/cashier/inventory/treatment-templates",
          icon: "Healing",
          permissions: ["treatment_templates.view"],
        },
        {
          label: "Products",
          path: "/cashier/inventory",
          icon: "Products",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
        {
          label: "Inventory Receiving",
          path: "/cashier/purchases",
          icon: "ShoppingCart",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
        {
          label: "Stock Movements",
          path: "/cashier/inventory/stock-movements",
          icon: "Autorenew",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
        {
          label: "Suppliers",
          path: "/cashier/inventory/suppliers",
          icon: "LocalShipping",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
        {
          label: "Consignment reports / Settlement",
          path: "/cashier/inventory/consignment-report",
          icon: "Assessment",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
      ],
    },
    {
      id: "transactions",
      label: "Transactions",
      path: "/cashier/other-income",
      icon: "Receipt",
      children: [
        {
          label: "Other income",
          path: "/cashier/other-income",
          icon: "ArrowOutward",
          permissions: ["finance.other_income.view"],
        },
        {
          label: "Expense register",
          path: "/cashier/transactions/expenses",
          icon: "Receipt",
          permissions: ["payments.view", "finance.expenses.view"],
        },
        {
          label: "Payables",
          path: "/cashier/transactions/payables",
          icon: "ReceiptLong",
          permissions: ["payments.view", "finance.payables.view"],
        },
      ],
    },
    {
      id: "finance",
      label: "Financial Management",
      path: "/cashier/finance/transactions",
      icon: "AccountBalance",
      children: buildFinanceChildren("/cashier"),
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      path: "/cashier/reports/financial",
      icon: "Assessment",
      children: [
        {
          label: "Financial Reports",
          path: "/cashier/reports/financial",
          icon: "Assessment",
          permissions: ["payments.view", "finance.reports.view"],
        },
      ],
    },
    {
      id: "hr",
      label: "HR Module",
      path: "/cashier/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/cashier/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/cashier/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/cashier/hr/grievance",
          icon: "SupportAgent",
          roles: ["cashier"],
        },
        {
          label: "Payslip",
          path: "/cashier/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  hr: [
    {
      label: "HR Management",
      path: "/admin/hr/staff",
      icon: "People",
      children: [
        {
          label: "Staff Profiles",
          path: "/admin/hr/staff",
          icon: "People",
          roles: ["hr"],
        },
        {
          label: "Organization Structure",
          path: "/admin/hr/organization",
          icon: "AccountTree",
          roles: ["hr"],
        },
        {
          label: "Daily Attendance",
          path: "/admin/hr/daily/attendance",
          icon: "Attendance",
          roles: ["hr"],
        },
        {
          label: "Leaves",
          path: "/admin/hr/daily/leaves",
          icon: "Leaves",
          roles: ["hr"],
        },
        {
          label: "Leave Rules",
          path: "/admin/hr/leave-rules",
          icon: "Rule",
          roles: ["hr"],
        },
        {
          label: "Overtime",
          path: "/admin/hr/daily/overtime",
          icon: "Overtime",
          roles: ["hr"],
        },
        {
          label: "Assignment",
          path: "/admin/hr/assignments",
          icon: "AssignmentAdd",
          roles: ["hr"],
        },
        {
          label: "Payroll",
          path: "/admin/hr/payroll",
          icon: "Payments",
          roles: ["hr"],
        },
        {
          label: "Compensation",
          path: "/admin/hr/compensation",
          icon: "Pix",
          roles: ["hr"],
        },
        {
          label: "Grievance",
          path: "/admin/hr/grievance",
          icon: "SupportAgent",
          roles: ["hr"],
        },
        {
          label: "Public Holidays",
          path: "/admin/hr/public-holidays",
          icon: "Holiday",
          roles: ["hr"],
        },
      ],
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      path: "/admin/reports/staff",
      icon: "Assessment",
      children: [
        {
          label: "Staff Report",
          path: "/admin/reports/staff",
          icon: "Assessment",
          roles: ["hr"],
        },
      ],
    },
  ],
  accountant: [
    {
      id: "transactions",
      label: "Transactions",
      path: "/accountant/other-income",
      icon: "Receipt",
      children: [
        {
          label: "Other income",
          path: "/accountant/other-income",
          icon: "ArrowOutward",
          permissions: ["finance.other_income.view"],
        },
        {
          label: "Expense register",
          path: "/accountant/transactions/expenses",
          icon: "Receipt",
          permissions: ["payments.view", "finance.expenses.view"],
        },
        {
          label: "Payables",
          path: "/accountant/transactions/payables",
          icon: "ReceiptLong",
          permissions: ["payments.view", "finance.payables.view"],
        },
      ],
    },
    {
      id: "finance",
      label: "Financial Management",
      path: "/accountant/finance/transactions",
      icon: "AccountBalance",
      mobilePriority: 1,
      children: buildFinanceChildren("/accountant"),
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      path: "/accountant/reports/financial",
      icon: "Assessment",
      children: [
        {
          label: "Financial Reports",
          path: "/accountant/reports/financial",
          icon: "Assessment",
          permissions: ["payments.view", "finance.reports.view"],
        },
      ],
    },
    {
      label: "HR Module",
      path: "/accountant/hr/my-daily-record",
      icon: "People",
      permissions: ["hr.self_service"],
      children: [
        {
          label: "My Daily Record",
          path: "/accountant/hr/my-daily-record",
          icon: "Assessment",
          permissions: ["hr.self_service"],
        },
        {
          label: "Leave Request",
          path: "/accountant/hr/leave-request",
          icon: "Leaves",
          permissions: ["hr.self_service"],
        },
        {
          label: "Grievance",
          path: "/accountant/hr/grievance",
          icon: "SupportAgent",
          roles: ["accountant"],
        },
        {
          label: "Payslip",
          path: "/accountant/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  admin: [
    {
      id: "emr",
      label: "Patient Care",
      path: "/admin/patients",
      icon: "People",
      mobilePriority: 2,
      children: [
        {
          label: "Patient Registry",
          path: "/admin/patients",
          icon: "People",
          permissions: ["patients.view"],
        },
        {
          label: "Visit History",
          path: "/admin/visit-history",
          icon: "History",
          permissions: ["liveboard.view"],
        },
        {
          label: "Consultations",
          path: "/admin/encounters",
          icon: "MedicalInformation",
          permissions: ["patients.view", "consultations.manage"],
        },
        {
          label: "Prescriptions",
          path: "/admin/prescriptions",
          icon: "Medication",
          permissions: ["patients.view", "consultations.manage"],
        },
        {
          label: "Appointments",
          path: "/admin/appointments",
          icon: "CalendarMonth",
          roles: ["admin"],
        },
        {
          label: "Forms",
          path: "/admin/forms",
          icon: "Assignment",
          roles: ["admin"],
        },
        {
          label: "Services & Procedures",
          path: "/admin/inventory/treatment-templates",
          icon: "Healing",
          permissions: ["treatment_templates.view"],
        },
        {
          label: "Packages",
          path: "/admin/packages",
          icon: "CardGiftcard",
          permissions: ["packages.view"],
        },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      path: "/admin/inventory",
      icon: "Inventory2",
      mobilePriority: 3,
      children: [
        {
          label: "Products",
          path: "/admin/inventory",
          icon: "Products",
          permissions: ["inventory.view"],
        },
        {
          label: "Stock Alerts",
          path: "/admin/inventory/alerts",
          icon: "WarningAmber",
          permissions: ["inventory.view"],
        },
        {
          label: "Inventory Receiving",
          path: "/admin/purchases",
          icon: "ShoppingCart",
          permissions: ["inventory.view"],
        },
        {
          label: "Stock Movements",
          path: "/admin/inventory/stock-movements",
          icon: "Autorenew",
          permissions: ["inventory.view"],
        },
        {
          label: "Suppliers",
          path: "/admin/inventory/suppliers",
          icon: "LocalShipping",
          permissions: ["inventory.view"],
        },
      ],
    },
    {
      id: "billing",
      label: "Billing and payables",
      path: "/admin/payments",
      icon: "Payments",
      children: [
        {
          label: "Invoices",
          path: "/admin/payments",
          icon: "Payments",
          roles: ["admin"],
        },
        {
          label: "Other income",
          path: "/admin/other-income",
          icon: "ArrowOutward",
          permissions: ["finance.other_income.view"],
        },
        {
          label: "Expense register",
          path: "/admin/transactions/expenses",
          icon: "Receipt",
          permissions: ["payments.view", "finance.expenses.view"],
        },
        {
          label: "Payables",
          path: "/admin/transactions/payables",
          icon: "ReceiptLong",
          permissions: ["payments.view", "finance.payables.view"],
        },
      ],
    },
    {
      id: "hr",
      label: "HR Module",
      path: "/admin/hr/my-daily-record",
      icon: "People",
      children: [
        {
          label: "My Daily Record",
          path: "/admin/hr/my-daily-record",
          icon: "Assessment",
          roles: ["admin"],
        },
        {
          label: "Leave Request",
          path: "/admin/hr/leave-request",
          icon: "Leaves",
          roles: ["admin"],
        },
        {
          label: "Staff Profiles",
          path: "/admin/hr/staff",
          icon: "People",
          roles: ["hr"],
        },
        {
          label: "Organization Structure",
          path: "/admin/hr/organization",
          icon: "AccountTree",
          roles: ["hr"],
        },
        {
          label: "Daily Attendance",
          path: "/admin/hr/daily/attendance",
          icon: "Attendance",
          roles: ["hr"],
        },
        {
          label: "Leaves",
          path: "/admin/hr/daily/leaves",
          icon: "Leaves",
          roles: ["hr"],
        },
        {
          label: "Leave Rules",
          path: "/admin/hr/leave-rules",
          icon: "Rule",
          roles: ["hr"],
        },
        {
          label: "Overtime",
          path: "/admin/hr/daily/overtime",
          icon: "Overtime",
          roles: ["hr"],
        },
        {
          label: "Assignment",
          path: "/admin/hr/assignments",
          icon: "AssignmentAdd",
          roles: ["hr"],
        },
        {
          label: "Payroll",
          path: "/admin/hr/payroll",
          icon: "Payments",
          roles: ["hr"],
        },
        {
          label: "Compensation",
          path: "/admin/hr/compensation",
          icon: "Pix",
          roles: ["hr"],
        },
        {
          label: "Grievance",
          path: "/admin/hr/grievance",
          icon: "SupportAgent",
          roles: ["admin", "hr"],
        },
        {
          label: "Payslip",
          path: "/admin/hr/payslip",
          icon: "ReceiptLong",
          roles: ["admin"],
        },
        {
          label: "Public Holidays",
          path: "/admin/hr/public-holidays",
          icon: "Holiday",
          roles: ["hr"],
        },
      ],
    },
    {
      id: "finance",
      label: "Financial Management",
      path: "/admin/finance/transactions",
      icon: "AccountBalance",
      children: buildFinanceChildren("/admin"),
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      path: "/admin/dashboard",
      icon: "Assessment",
      mobilePriority: 1,
      children: [
        {
          label: "Dashboard",
          path: "/admin/dashboard",
          icon: "Dashboard",
          roles: ["admin"],
        },
        {
          label: "Staff Report",
          path: "/admin/reports/staff",
          icon: "Assessment",
          roles: ["admin", "hr"],
        },
        {
          label: "Financial Reports",
          path: "/admin/reports/financial",
          icon: "Assessment",
          permissions: ["payments.view", "finance.reports.view"],
        },
        {
          label: "Inventory Report",
          path: "/admin/reports/inventory",
          icon: "Inventory2",
          permissions: ["inventory.view"],
        },
        {
          label: "Clinical Audit Logs",
          path: "/admin/reports/emr-audit-logs",
          icon: "Assessment",
          roles: ["admin"],
        },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      path: "/admin/settings",
      icon: "Settings",
      children: [
        {
          label: "Users",
          path: "/admin/users",
          icon: "AdminPanelSettings",
          permissions: ["users.manage"],
        },
        {
          label: "Roles & Permission",
          path: "/admin/roles-permissions",
          icon: "Security",
          roles: ["admin"],
        },
        {
          label: "Settings",
          path: "/admin/settings",
          icon: "Settings",
          permissions: ["settings.manage"],
        },
      ],
    },
  ],
  owner: [
    {
      id: "emr",
      label: "Patient Care",
      path: "/owner/patients",
      icon: "People",
      mobilePriority: 2,
      children: [
        {
          label: "Patient Registry",
          path: "/owner/patients",
          icon: "People",
          permissions: ["patients.view"],
        },
        {
          label: "Visit History",
          path: "/owner/visit-history",
          icon: "History",
          permissions: ["liveboard.view"],
        },
        {
          label: "Consultations",
          path: "/owner/encounters",
          icon: "MedicalInformation",
          permissions: ["patients.view", "consultations.manage"],
        },
        {
          label: "Prescriptions",
          path: "/owner/prescriptions",
          icon: "Medication",
          permissions: ["patients.view", "consultations.manage"],
        },
        {
          label: "Appointments",
          path: "/owner/appointments",
          icon: "CalendarMonth",
          roles: ["owner"],
        },
        {
          label: "Forms",
          path: "/owner/forms",
          icon: "Assignment",
          roles: ["owner"],
        },
        {
          label: "Services & Procedures",
          path: "/owner/inventory/treatment-templates",
          icon: "Healing",
          permissions: ["treatment_templates.view"],
        },
        {
          label: "Packages",
          path: "/owner/packages",
          icon: "CardGiftcard",
          permissions: ["packages.view"],
        },
        {
          label: "Commissions",
          path: "/owner/commissions",
          icon: "Diversity3",
          permissions: ["payments.view"],
        },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      path: "/owner/inventory",
      icon: "Inventory2",
      mobilePriority: 3,
      children: [
        {
          label: "Products",
          path: "/owner/inventory",
          icon: "Products",
          permissions: ["inventory.view"],
        },
        {
          label: "Stock Alerts",
          path: "/owner/inventory/alerts",
          icon: "WarningAmber",
          permissions: ["inventory.view"],
        },
        {
          label: "Inventory Receiving",
          path: "/owner/purchases",
          icon: "ShoppingCart",
          permissions: ["inventory.view"],
        },
        {
          label: "Stock Movements",
          path: "/owner/inventory/stock-movements",
          icon: "Autorenew",
          permissions: ["inventory.view"],
        },
        {
          label: "Suppliers",
          path: "/owner/inventory/suppliers",
          icon: "LocalShipping",
          permissions: ["inventory.view"],
        },
      ],
    },
    {
      id: "billing",
      label: "Billing and payables",
      path: "/owner/invoices",
      icon: "Payments",
      children: [
        {
          label: "Invoices",
          path: "/owner/invoices",
          icon: "Payments",
          roles: ["owner"],
        },
        {
          label: "Other income",
          path: "/owner/other-income",
          icon: "ArrowOutward",
          permissions: ["finance.other_income.view"],
        },
        {
          label: "Expense register",
          path: "/owner/transactions/expenses",
          icon: "Receipt",
          permissions: ["payments.view", "finance.expenses.view"],
        },
        {
          label: "Payables",
          path: "/owner/transactions/payables",
          icon: "ReceiptLong",
          permissions: ["payments.view", "finance.payables.view"],
        },
      ],
    },
    {
      id: "hr",
      label: "HR Management",
      path: "/owner/hr/staff",
      icon: "People",
      children: [
        {
          label: "Staff Profiles",
          path: "/owner/hr/staff",
          icon: "People",
          permissions: ["hr.view"],
        },
        {
          label: "Organization Structure",
          path: "/owner/hr/organization",
          icon: "AccountTree",
          permissions: ["hr.view"],
        },
        {
          label: "Daily Attendance",
          path: "/owner/hr/daily/attendance",
          icon: "Attendance",
          permissions: ["hr.view"],
        },
        {
          label: "Leaves",
          path: "/owner/hr/daily/leaves",
          icon: "Leaves",
          permissions: ["hr.view"],
        },
        {
          label: "Leave Rules",
          path: "/owner/hr/leave-rules",
          icon: "Rule",
          permissions: ["hr.manage"],
        },
        {
          label: "Overtime",
          path: "/owner/hr/daily/overtime",
          icon: "Overtime",
          permissions: ["hr.view"],
        },
        {
          label: "Assignment",
          path: "/owner/hr/assignments",
          icon: "AssignmentAdd",
          permissions: ["hr.view"],
        },
        {
          label: "Payroll",
          path: "/owner/hr/payroll",
          icon: "Payments",
          permissions: ["hr.view"],
        },
        {
          label: "Compensation",
          path: "/owner/hr/compensation",
          icon: "Pix",
          permissions: ["hr.view"],
        },
        {
          label: "Grievance",
          path: "/owner/hr/grievance",
          icon: "SupportAgent",
          roles: ["owner"],
        },
        {
          label: "Public Holidays",
          path: "/owner/hr/public-holidays",
          icon: "Holiday",
          permissions: ["hr.view"],
        },
      ],
    },
    {
      id: "finance",
      label: "Financial Management",
      path: "/owner/finance/transactions",
      icon: "AccountBalance",
      children: buildFinanceChildren("/owner"),
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      path: "/owner/dashboard",
      icon: "Assessment",
      mobilePriority: 1,
      children: [
        {
          label: "Dashboard",
          path: "/owner/dashboard",
          icon: "Dashboard",
          roles: ["owner"],
        },
        {
          label: "Staff Report",
          path: "/owner/reports/staff",
          icon: "Assessment",
          permissions: ["hr.view"],
        },
        {
          label: "Financial Reports",
          path: "/owner/reports/financial",
          icon: "Assessment",
          permissions: ["payments.view", "finance.reports.view"],
        },
        {
          label: "Inventory Report",
          path: "/owner/reports/inventory",
          icon: "Inventory2",
          permissions: ["inventory.view"],
        },
        {
          label: "Clinical Audit Logs",
          path: "/owner/reports/emr-audit-logs",
          icon: "Assessment",
          roles: ["owner"],
        },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      path: "/owner/settings",
      icon: "Settings",
      children: [
        {
          label: "Users",
          path: "/owner/users",
          icon: "AdminPanelSettings",
          permissions: ["users.manage"],
        },
        {
          label: "Roles & Permission",
          path: "/owner/roles-permissions",
          icon: "Security",
          roles: ["owner"],
        },
        {
          label: "Settings",
          path: "/owner/settings",
          icon: "Settings",
          permissions: ["settings.manage"],
        },
      ],
    },
  ],
};
const canAccessNavItem = (user, item) => {
  if (hasRole(user, "owner")) {
    return true;
  }

  const roleMatch = item.roles?.some((role) => hasRole(user, role));
  const permissionMatch =
    item.permissions?.length > 0 && hasAnyPermission(user, item.permissions);

  return Boolean(roleMatch || permissionMatch);
};

export const getNavItems = (user) => {
  const templateKey = resolveNavTemplateKey(user);
  return (ROLE_NAV_ITEMS[templateKey] ?? ROLE_NAV_ITEMS.reception)
    .map((item) => {
      if (!item.children?.length) return item;
      const visibleChildren = item.children.filter((child) =>
        canAccessNavItem(user, child),
      );
      return { ...item, children: visibleChildren };
    })
    .filter((item) => {
      if (item.children?.length) {
        return true;
      }

      if (hasRole(user, "owner")) {
        return true;
      }

      return canAccessNavItem(user, item);
    });
};

export const getFirstSidebarPath = (user) => {
  const firstItem = getNavItems(user)[0];

  if (!firstItem) return "/reception/patients";

  return (
    firstItem.children?.[0]?.path || firstItem.path || "/reception/patients"
  );
};

const FINANCE_FIRST_ROLES = new Set(["cashier", "accountant"]);

/** Landing route after login — patient registry for clinical staff. */
export const getPostLoginPath = (user) => {
  const role = resolveUserPrimaryRole(user);
  if (FINANCE_FIRST_ROLES.has(role)) {
    return getFirstSidebarPath(user);
  }
  if (hasPermission(user, "patients.view")) {
    return `${getWorkspaceUrlPrefix(user)}/patients`;
  }
  return getFirstSidebarPath(user);
};

export { VISIT_STATUS_CONFIG as STATUS_CONFIG } from "./visitStatuses";
