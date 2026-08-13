import { hasAnyPermission, hasPermission, hasRole } from "./accessUtils";
import { resolveUserPrimaryRole } from "./workspaceRoutes";

// Map of role → allowed actions on the Live Board
export const ROLE_ACTIONS = {
  medical_officer: [
    "start_consultation",
    "open_consultation",
    "send_to_preparation",
    "open_preparation",
    "proceed_to_treatment",
  ],
  physician: [
    "start_consultation",
    "open_consultation",
    "send_to_preparation",
    "open_preparation",
    "proceed_to_treatment",
  ],
  therapist: ["mark_treatment_done", "open_preparation"],
  cashier: ["open_payment", "complete_payment"],
  reception: ["create_visit", "open_preparation", "mark_treatment_done"],
  sales_marketing: ["create_visit", "open_preparation", "mark_treatment_done"],
  admin: [
    "start_consultation",
    "open_consultation",
    "send_to_preparation",
    "open_preparation",
    "proceed_to_treatment",
    "mark_treatment_done",
    "open_payment",
    "complete_payment",
    "create_visit",
  ],
};

export const DEFAULT_LIVEBOARD_RULES = {
  open_panel: {
    owner: true,
    admin: true,
    reception: true,
    sales_marketing: true,
    medical_officer: true,
    assigned_user: true,
  },
  start_consulting: {
    owner: true,
    admin: true,
    medical_officer: true,
    assigned_user: true,
  },
  do_not_consulting: {
    owner: true,
    admin: true,
    medical_officer: true,
    assigned_user: true,
  },
  open_consulting: {
    owner: true,
    assigned_user: true,
  },
  send_to_preparation: {
    owner: true,
    admin: true,
    medical_officer: true,
    assigned_user: true,
  },
  proceed_treatment: {
    owner: true,
    admin: true,
    assigned_user: true,
  },
  start_treatment: {
    owner: true,
    assigned_user: true,
  },
  mark_done: {
    owner: true,
    admin: true,
    assigned_user: true,
  },
  go_to_invoice: {
    owner: true,
  },
  handover_request: {
    owner: true,
    admin: true,
    assigned_user: true,
  },
  handover_accept: {
    owner: true,
    admin: true,
    assigned_user: true,
  },
  doctor_handover_request: {
    owner: true,
    medical_officer: true,
    assigned_user: true,
  },
  doctor_handover_accept: {
    owner: true,
    medical_officer: true,
    assigned_user: true,
  },
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

export const canViewCarryoverStrip = (user, settings) => {
  if (!user) return false;
  if (hasRole(user, "developer")) return true;
  const allowed = settings?.liveboard_carryover_visible_to_roles;
  const list =
    Array.isArray(allowed) && allowed.length > 0
      ? allowed
      : ["owner", "admin", "reception", "medical_officer"];
  return resolveRoleSlugs(user).some((slug) => list.includes(slug));
};

export const canUpdateLiveboard = (user) =>
  hasRole(user, "owner") || hasPermission(user, "liveboard.update");

export const canDo = (userOrRole, action) => {
  if (!userOrRole) return false;
  if (typeof userOrRole === "string") {
    if (userOrRole === "owner") return true;
    return ROLE_ACTIONS[userOrRole]?.includes(action) ?? false;
  }

  if (!canUpdateLiveboard(userOrRole)) return false;
  const role = resolvePrimaryRole(userOrRole);
  if (!role) return false;
  if (role === "owner") return true;
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
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

/** True when the user checked this patient in (visit coordinator). */
export const isCheckedInStaffOnVisit = (user, visit) => {
  if (!user?.id || !visit) return false;
  const staffId = visit.check_in_staff_id ?? visit.check_in_staff?.id ?? null;
  return staffId != null && Number(staffId) === Number(user.id);
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

const roleFlagMatchesLiveboardRule = (row, slug) => row[slug] === true;

/** Visit doctor, session doctor, or assigned therapist(s) — same as start_treatment / mark_done. */
const isAssignedTreatmentCareTeam = (user, visit) => {
  if (!user?.id || !visit) return false;
  const uid = Number(user.id);
  if (visit.doctor_id != null && Number(visit.doctor_id) === uid) return true;
  if (hasAssignedTreatmentDoctorSession(user, visit)) return true;
  return isAssignedTherapistOnVisit(user, visit);
};

const isAssignedForLiveboardButton = (user, visit, buttonKey) => {
  if (!user?.id || !visit) return false;
  const uid = Number(user.id);
  if (!Number.isFinite(uid) || uid <= 0) return false;

  switch (buttonKey) {
    case "open_panel":
      if (isCheckedInStaffOnVisit(user, visit)) return true;
      if (visit.doctor_id != null && Number(visit.doctor_id) === uid)
        return true;
      if (isAssignedTherapistOnVisit(user, visit)) return true;
      return (
        visit.status === "treatment" &&
        hasAssignedTreatmentDoctorSession(user, visit)
      );
    case "start_consulting":
    case "do_not_consulting":
    case "open_consulting":
    case "send_to_preparation":
    case "doctor_handover_request":
      return visit.doctor_id != null && Number(visit.doctor_id) === uid;
    case "doctor_handover_accept":
      return isPendingDoctorHandoverReceiver(user, visit);
    case "start_treatment":
    case "mark_done":
      return isAssignedTreatmentCareTeam(user, visit);
    case "proceed_treatment":
    case "handover_request":
      return isCheckedInStaffOnVisit(user, visit);
    case "handover_accept":
      return isPendingCheckInHandoverReceiver(user, visit);
    default:
      return false;
  }
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
  if (
    row.assigned_user &&
    isAssignedForLiveboardButton(user, visit, buttonKey)
  ) {
    return true;
  }
  const roles = resolveRoleSlugs(user);
  return roles.some((slug) => roleFlagMatchesLiveboardRule(row, slug));
};

export const isPendingCheckInHandoverReceiver = (user, visit) => {
  if (!user?.id || !visit) return false;
  const toId =
    visit.check_in_handover_to_id ?? visit.check_in_handover_to?.id ?? null;
  return toId != null && Number(toId) === Number(user.id);
};

export const isPendingDoctorHandoverReceiver = (user, visit) => {
  if (!user?.id || !visit) return false;
  const toId =
    visit.doctor_handover_to_id ?? visit.doctor_handover_to?.id ?? null;
  return toId != null && Number(toId) === Number(user.id);
};

export const canHandoverTreatmentDoctor = (user, visit) => {
  if (!user || !visit) return false;
  if (visit.status !== "treatment") return false;
  if (
    visit.doctor_handover_to_id != null ||
    visit.doctor_handover_to?.id != null
  ) {
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
  const isDoctorRole =
    hasRole(user, "medical_officer") || hasRole(user, "physician");
  return isAssignedDoctor && isDoctorRole;
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

/** Read-only preparation summary for the assigned care team on the live board. */
export const canViewPreparationBrief = (user, visit) => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  if (visit.status !== "preparation") return false;
  if (Number(visit.doctor_id) === Number(user.id)) return true;
  return isAssignedTherapistOnVisit(user, visit);
};

/** Drawer always shows the read-only preparation brief; full editing is on Preparation Room page. */
export const resolvePreparationDrawerContext = () => "preparation_brief";

/** Who may tap **Open Panel** on a live board card or load visit detail for the drawer. */
export const canOpenLiveboardVisitPanel = (
  user,
  visit,
  liveboardRules = DEFAULT_LIVEBOARD_RULES,
) => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  return canUseLiveboardButton(user, visit, "open_panel", liveboardRules);
};

export const canOpenVisitPanel = (
  user,
  visit,
  context = "consulting",
  liveboardRules = DEFAULT_LIVEBOARD_RULES,
) => {
  if (!user || !visit) return false;
  if (!canViewLiveboard(user)) return false;
  if (context === "preparation_brief") {
    return canOpenLiveboardVisitPanel(user, visit, liveboardRules);
  }
  return canOpenLiveboardVisitPanel(user, visit, liveboardRules);
};

/** Hand over designated check-in staff (front desk) for this visit. */
export const canHandoverCheckIn = (user, visit) => {
  if (!user || !visit) return false;
  if (!canUpdateLiveboard(user)) return false;
  if (hasRole(user, "owner") || hasRole(user, "admin")) return true;
  const staffId = visit.check_in_staff_id ?? visit.check_in_staff?.id ?? null;
  return (
    (hasRole(user, "reception") || hasRole(user, "sales_marketing")) &&
    staffId != null &&
    Number(staffId) === Number(user.id)
  );
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
    label: "Transaction Methods",
    path: `${prefix}/finance/transaction-methods`,
    icon: "AccountBalance",
    permissions: ["finance.transaction_methods.manage"],
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
    label: "Prepaid expenses",
    path: `${prefix}/finance/prepaid-expenses`,
    icon: "Timelapse",
    permissions: ["payments.view", "finance.prepaid_expenses.view"],
  },
  {
    label: "Payroll statement inputs",
    path: `${prefix}/finance/payroll-statement-inputs`,
    icon: "Payments",
    permissions: ["payments.view", "finance.payroll_statement_inputs.view"],
  },
  {
    label: "Accounting guide",
    path: `${prefix}/finance/accounting-guide`,
    icon: "HelpOutline",
    permissions: ["payments.view", "finance.reports.view"],
  },
];

const ROLE_NAV_ITEMS = {
  reception: [
    {
      id: "live_board",
      label: "Live Board",
      path: "/reception/live-board",
      icon: "ViewKanban",
      permissions: ["liveboard.view"],
      mobilePriority: 1,
    },
    {
      id: "appointments",
      label: "Appointments",
      path: "/reception/appointments",
      icon: "CalendarMonth",
      permissions: ["appointments.view", "appointments.manage"],
      mobilePriority: 2,
    },
    {
      id: "patients",
      label: "Patients",
      path: "/reception/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 3,
    },
    {
      label: "Follow-Up Center",
      path: "/reception/follow-up-center",
      icon: "SupportAgent",
      permissions: ["follow_up.view", "follow_up.update", "follow_up.assign"],
    },
    {
      label: "Packages",
      path: "/reception/packages",
      icon: "CardGiftcard",
      permissions: ["packages.view"],
    },
    {
      label: "Customer Package List",
      path: "/reception/customer-packages",
      icon: "ListAlt",
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
        {
          label: "Job Description",
          path: "/reception/hr/job-description",
          icon: "Description",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  medical_officer: [
    {
      id: "queue",
      label: "My Queue",
      path: "/medical-officer/queue",
      icon: "ViewKanban",
      permissions: ["liveboard.view"],
      mobilePriority: 1,
    },
    {
      id: "patients",
      label: "Patients",
      path: "/medical-officer/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/medical-officer/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "Customer Package List",
      path: "/medical-officer/customer-packages",
      icon: "ListAlt",
      permissions: ["packages.view"],
    },
    {
      label: "Treatment Approvals",
      path: "/medical-officer/treatment-approvals",
      icon: "TreatmentApproval",
      roles: ["medical_officer", "physician"],
    },
    {
      label: "My commission",
      path: "/medical-officer/commissions",
      icon: "Diversity3",
      roles: ["medical_officer", "physician"],
    },
    {
      id: "forms",
      label: "Forms",
      path: "/medical-officer/forms",
      icon: "Assignment",
      roles: ["medical_officer", "physician"],
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
          roles: ["medical_officer", "physician"],
        },
        {
          label: "Payslip",
          path: "/medical-officer/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
        {
          label: "Job Description",
          path: "/medical-officer/hr/job-description",
          icon: "Description",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  physician: [
    {
      id: "queue",
      label: "My Queue",
      path: "/medical-officer/queue",
      icon: "ViewKanban",
      permissions: ["liveboard.view"],
      mobilePriority: 1,
    },
    {
      id: "patients",
      label: "Patients",
      path: "/medical-officer/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/medical-officer/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "Customer Package List",
      path: "/medical-officer/customer-packages",
      icon: "ListAlt",
      permissions: ["packages.view"],
    },
    {
      label: "Treatment Approvals",
      path: "/medical-officer/treatment-approvals",
      icon: "TreatmentApproval",
      roles: ["medical_officer", "physician"],
    },
    {
      label: "My commission",
      path: "/medical-officer/commissions",
      icon: "Diversity3",
      roles: ["medical_officer", "physician"],
    },
    {
      label: "Forms",
      path: "/medical-officer/forms",
      icon: "Assignment",
      roles: ["medical_officer", "physician"],
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
          roles: ["medical_officer", "physician"],
        },
        {
          label: "Payslip",
          path: "/medical-officer/hr/payslip",
          icon: "ReceiptLong",
          permissions: ["hr.self_service"],
        },
        {
          label: "Job Description",
          path: "/medical-officer/hr/job-description",
          icon: "Description",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  therapist: [
    {
      id: "tasks",
      label: "My Tasks",
      path: "/therapist/tasks",
      icon: "ViewKanban",
      permissions: ["liveboard.view"],
      mobilePriority: 1,
    },
    {
      id: "patients",
      label: "Patients",
      path: "/therapist/patients",
      icon: "People",
      permissions: ["patients.view"],
      mobilePriority: 2,
    },
    {
      label: "Treatment Templates",
      path: "/therapist/inventory/treatment-templates",
      icon: "Healing",
      permissions: ["treatment_templates.view"],
    },
    {
      label: "Customer Package List",
      path: "/therapist/customer-packages",
      icon: "ListAlt",
      permissions: ["packages.view"],
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
        {
          label: "Job Description",
          path: "/therapist/hr/job-description",
          icon: "Description",
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
        {
          label: "Customer Package List",
          path: "/cashier/customer-packages",
          icon: "ListAlt",
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
          label: "Batch recalls",
          path: "/cashier/inventory/batch-recalls",
          icon: "Warning",
          roles: ["cashier"],
          permissions: ["inventory.view"],
        },
        {
          label: "Equipment consumables",
          path: "/cashier/inventory/equipment-consumables",
          icon: "Build",
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
        {
          label: "Job Description",
          path: "/cashier/hr/job-description",
          icon: "Description",
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
          label: "Job Positions",
          path: "/admin/hr/job-positions",
          icon: "Description",
          roles: ["hr"],
        },
        {
          label: "Overtime",
          path: "/admin/hr/daily/overtime",
          icon: "Overtime",
          roles: ["hr"],
        },
        {
          label: "Late Attendance Policy",
          path: "/admin/hr/late-attendance-policy",
          icon: "Warning",
          roles: ["hr"],
        },
        {
          label: "Assignment",
          path: "/admin/hr/assignments",
          icon: "AssignmentAdd",
          roles: ["hr"],
        },
        {
          label: "Base Salary",
          path: "/admin/hr/salary",
          icon: "Payments",
          roles: ["hr"],
        },
        {
          label: "Variable Pay",
          path: "/admin/hr/variable-pay",
          icon: "TrendingUp",
          roles: ["hr"],
        },
        {
          label: "Allowances",
          path: "/admin/hr/allowances",
          icon: "CardGiftcard",
          roles: ["hr"],
        },
        {
          label: "Deductions",
          path: "/admin/hr/deductions",
          icon: "RemoveCircleOutline",
          roles: ["hr"],
        },
        {
          label: "Salary holds",
          path: "/admin/hr/salary-holds",
          icon: "PauseCircleOutline",
          roles: ["hr"],
        },
        {
          label: "Payroll",
          path: "/admin/hr/payroll",
          icon: "Payments",
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
        {
          label: "Staff Report",
          path: "/admin/hr/reports",
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
        {
          label: "Job Description",
          path: "/accountant/hr/job-description",
          icon: "Description",
          permissions: ["hr.self_service"],
        },
      ],
    },
  ],
  admin: [
    {
      id: "emr",
      label: "EMR",
      path: "/admin/live-board",
      icon: "People",
      mobilePriority: 2,
      children: [
        {
          label: "Live Board",
          path: "/admin/live-board",
          icon: "ViewKanban",
          permissions: ["liveboard.view"],
        },
        {
          label: "Appointments",
          path: "/admin/appointments",
          icon: "CalendarMonth",
          roles: ["admin"],
        },
        {
          label: "Follow-Up center",
          path: "/admin/follow-up-center",
          icon: "SupportAgent",
          permissions: [
            "follow_up.view",
            "follow_up.update",
            "follow_up.assign",
          ],
        },
        {
          label: "Patients",
          path: "/admin/patients",
          icon: "People",
          permissions: ["patients.view"],
        },
        {
          label: "Forms",
          path: "/admin/forms",
          icon: "Assignment",
          roles: ["admin"],
        },
        {
          label: "Available Treatments",
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
        {
          label: "Customer Package List",
          path: "/admin/customer-packages",
          icon: "ListAlt",
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
          label: "Batch recalls",
          path: "/admin/inventory/batch-recalls",
          icon: "Warning",
          permissions: ["inventory.view"],
        },
        {
          label: "Equipment consumables",
          path: "/admin/inventory/equipment-consumables",
          icon: "Build",
          permissions: ["inventory.view"],
        },
        {
          label: "Suppliers",
          path: "/admin/inventory/suppliers",
          icon: "LocalShipping",
          permissions: ["inventory.view"],
        },
        {
          label: "Consignment reports / Settlement",
          path: "/admin/inventory/consignment-report",
          icon: "Assessment",
          permissions: ["inventory.view"],
        },
      ],
    },
    {
      id: "billing",
      label: "Billing & payables",
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
          label: "Job Positions",
          path: "/admin/hr/job-positions",
          icon: "Description",
          roles: ["hr"],
        },
        {
          label: "Overtime",
          path: "/admin/hr/daily/overtime",
          icon: "Overtime",
          roles: ["hr"],
        },
        {
          label: "Late Attendance Policy",
          path: "/admin/hr/late-attendance-policy",
          icon: "Warning",
          roles: ["hr"],
        },
        {
          label: "Assignment",
          path: "/admin/hr/assignments",
          icon: "AssignmentAdd",
          roles: ["hr"],
        },
        {
          label: "Base Salary",
          path: "/admin/hr/salary",
          icon: "Payments",
          roles: ["hr"],
        },
        {
          label: "Variable Pay",
          path: "/admin/hr/variable-pay",
          icon: "TrendingUp",
          roles: ["hr"],
        },
        {
          label: "Allowances",
          path: "/admin/hr/allowances",
          icon: "CardGiftcard",
          roles: ["hr"],
        },
        {
          label: "Deductions",
          path: "/admin/hr/deductions",
          icon: "RemoveCircleOutline",
          roles: ["hr"],
        },
        {
          label: "Salary holds",
          path: "/admin/hr/salary-holds",
          icon: "PauseCircleOutline",
          roles: ["hr"],
        },
        {
          label: "Payroll",
          path: "/admin/hr/payroll",
          icon: "Payments",
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
          label: "Job Description",
          path: "/admin/hr/job-description",
          icon: "Description",
          roles: ["admin"],
        },
        {
          label: "Public Holidays",
          path: "/admin/hr/public-holidays",
          icon: "Holiday",
          roles: ["hr"],
        },
        {
          label: "Staff Report",
          path: "/admin/hr/reports",
          icon: "Assessment",
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
          label: "LiveBoard Rules",
          path: "/admin/liveboard-rules",
          icon: "Rule",
          roles: ["owner", "developer"],
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
      label: "EMR",
      path: "/owner/patients",
      icon: "People",
      mobilePriority: 2,
      children: [
        {
          label: "Live Board",
          path: "/owner/live-board",
          icon: "ViewKanban",
          permissions: ["liveboard.view"],
        },
        {
          label: "Appointments",
          path: "/owner/appointments",
          icon: "CalendarMonth",
          roles: ["owner"],
        },
        {
          label: "Follow-Up center",
          path: "/owner/follow-up-center",
          icon: "SupportAgent",
          permissions: [
            "follow_up.view",
            "follow_up.update",
            "follow_up.assign",
          ],
        },
        {
          label: "Patients",
          path: "/owner/patients",
          icon: "People",
          permissions: ["patients.view"],
        },
        {
          label: "Forms",
          path: "/owner/forms",
          icon: "Assignment",
          roles: ["owner"],
        },
        {
          label: "Available Treatments",
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
          label: "Customer Package List",
          path: "/owner/customer-packages",
          icon: "ListAlt",
          permissions: ["packages.view"],
        },
        {
          label: "Treatment Approvals",
          path: "/owner/treatment-approvals",
          icon: "TreatmentApproval",
          roles: ["owner"],
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
          label: "Batch recalls",
          path: "/owner/inventory/batch-recalls",
          icon: "Warning",
          permissions: ["inventory.view"],
        },
        {
          label: "Equipment consumables",
          path: "/owner/inventory/equipment-consumables",
          icon: "Build",
          permissions: ["inventory.view"],
        },
        {
          label: "Suppliers",
          path: "/owner/inventory/suppliers",
          icon: "LocalShipping",
          permissions: ["inventory.view"],
        },
        {
          label: "Consignment reports / Settlement",
          path: "/owner/inventory/consignment-report",
          icon: "Assessment",
          permissions: ["inventory.view"],
        },
      ],
    },
    {
      id: "billing",
      label: "Billing & payables",
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
          label: "Job Positions",
          path: "/owner/hr/job-positions",
          icon: "Description",
          permissions: ["hr.manage"],
        },
        {
          label: "Overtime",
          path: "/owner/hr/daily/overtime",
          icon: "Overtime",
          permissions: ["hr.view"],
        },
        {
          label: "Late Attendance Policy",
          path: "/owner/hr/late-attendance-policy",
          icon: "Warning",
          permissions: ["hr.manage"],
        },
        {
          label: "Assignment",
          path: "/owner/hr/assignments",
          icon: "AssignmentAdd",
          permissions: ["hr.view"],
        },
        {
          label: "Base Salary",
          path: "/owner/hr/salary",
          icon: "Payments",
          permissions: ["hr.view"],
        },
        {
          label: "Variable Pay",
          path: "/owner/hr/variable-pay",
          icon: "TrendingUp",
          permissions: ["hr.view"],
        },
        {
          label: "Allowances",
          path: "/owner/hr/allowances",
          icon: "CardGiftcard",
          permissions: ["hr.view"],
        },
        {
          label: "Deductions",
          path: "/owner/hr/deductions",
          icon: "RemoveCircleOutline",
          permissions: ["hr.view"],
        },
        {
          label: "Salary holds",
          path: "/owner/hr/salary-holds",
          icon: "PauseCircleOutline",
          permissions: ["hr.view"],
        },
        {
          label: "Payroll",
          path: "/owner/hr/payroll",
          icon: "Payments",
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
        {
          label: "Staff Report",
          path: "/owner/hr/reports",
          icon: "Assessment",
          permissions: ["hr.reports.view"],
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
          roles: ["owner", "developer"],
        },
        {
          label: "Commissions",
          path: "/owner/commissions",
          icon: "Diversity3",
          roles: ["owner", "developer"],
        },
        {
          label: "EMR Audit Logs",
          path: "/owner/reports/emr-audit-logs",
          icon: "Assessment",
          roles: ["owner", "developer"],
        },
        {
          label: "Appointments",
          path: "/owner/reports/appointments",
          icon: "TableChartRounded",
          roles: ["owner", "developer"],
        },
        {
          label: "Tx & Pkg Margins",
          path: "/owner/reports/treatment-margins",
          icon: "PercentRounded",
          roles: ["owner", "developer"],
        },
        {
          label: "Financial Reports",
          path: "/owner/reports/finance",
          icon: "AccountBalance",
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
          label: "LiveBoard Rules",
          path: "/owner/liveboard-rules",
          icon: "Rule",
          roles: ["owner", "developer"],
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

export const getNavItems = (user) =>
  (
    ROLE_NAV_ITEMS[
      resolveUserPrimaryRole(user) === "developer"
        ? "owner"
        : resolveUserPrimaryRole(user)
    ] ?? ROLE_NAV_ITEMS.reception
  )
    .map((item) => {
      if (!item.children?.length) return item;
      const visibleChildren = item.children.filter((child) =>
        canAccessNavItem(user, child),
      );
      return { ...item, children: visibleChildren };
    })
    .filter((item) => {
      if (item.children?.length) {
        return item.children.length > 0;
      }

      if (hasRole(user, "owner")) {
        return true;
      }

      return canAccessNavItem(user, item);
    });

export const getFirstSidebarPath = (user) => {
  const firstItem = getNavItems(user)[0];

  if (!firstItem) return "/reception/live-board";

  return (
    firstItem.children?.[0]?.path || firstItem.path || "/reception/live-board"
  );
};

export const STATUS_CONFIG = {
  waiting: {
    label: "Waiting",
    color: "warning",
    chipColor: "#FEF3C7",
    textColor: "#92400E",
  },
  consulting: {
    label: "Consulting",
    color: "info",
    chipColor: "#DBEAFE",
    textColor: "#1E3A8A",
  },
  preparation: {
    label: "Preparation",
    color: "primary",
    chipColor: "#E0E7FF",
    textColor: "#3730A3",
  },
  treatment: {
    label: "Treatment",
    color: "secondary",
    chipColor: "#F3E8FF",
    textColor: "#6B21A8",
  },
  payment: {
    label: "Payment",
    color: "error",
    chipColor: "#FEE2E2",
    textColor: "#991B1B",
  },
  completed: {
    label: "Completed",
    color: "success",
    chipColor: "#D1FAE5",
    textColor: "#065F46",
  },
};
