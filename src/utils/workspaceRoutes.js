import { resolveNavTemplateKey } from "./roleWorkspace";

const WORKSPACE_HOME_BY_TEMPLATE = {
  reception: "/reception/visit-history",
  medical_officer: "/medical-officer/queue",
  therapist: "/therapist/tasks",
  cashier: "/cashier/pending-payments",
  accountant: "/accountant/finance/journal-entries",
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
};

const WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE = {
  reception: "/reception",
  medical_officer: "/medical-officer",
  therapist: "/therapist",
  cashier: "/cashier",
  accountant: "/accountant",
  admin: "/admin",
  owner: "/owner",
};

/** @deprecated Use resolveNavTemplateKey + WORKSPACE_HOME_BY_TEMPLATE */
export const WORKSPACE_HOME_BY_ROLE = {
  reception: WORKSPACE_HOME_BY_TEMPLATE.reception,
  medical_officer: WORKSPACE_HOME_BY_TEMPLATE.medical_officer,
  dermatologist: WORKSPACE_HOME_BY_TEMPLATE.medical_officer,
  nutritionist: WORKSPACE_HOME_BY_TEMPLATE.medical_officer,
  senior_nurse: WORKSPACE_HOME_BY_TEMPLATE.medical_officer,
  therapist: WORKSPACE_HOME_BY_TEMPLATE.therapist,
  specialist: WORKSPACE_HOME_BY_TEMPLATE.therapist,
  technician: WORKSPACE_HOME_BY_TEMPLATE.therapist,
  cashier: WORKSPACE_HOME_BY_TEMPLATE.cashier,
  accountant: WORKSPACE_HOME_BY_TEMPLATE.accountant,
  admin: WORKSPACE_HOME_BY_TEMPLATE.admin,
  hr: WORKSPACE_HOME_BY_TEMPLATE.admin,
  manager: WORKSPACE_HOME_BY_TEMPLATE.admin,
  ceo: WORKSPACE_HOME_BY_TEMPLATE.owner,
  owner: WORKSPACE_HOME_BY_TEMPLATE.owner,
  developer: WORKSPACE_HOME_BY_TEMPLATE.owner,
  sales_marketing: WORKSPACE_HOME_BY_TEMPLATE.reception,
  worker: WORKSPACE_HOME_BY_TEMPLATE.reception,
  pharmacist: WORKSPACE_HOME_BY_TEMPLATE.reception,
};

/** @deprecated Use resolveNavTemplateKey + WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE */
export const WORKSPACE_ROUTE_PREFIX_BY_ROLE = {
  reception: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.reception,
  medical_officer: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.medical_officer,
  dermatologist: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.medical_officer,
  nutritionist: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.medical_officer,
  senior_nurse: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.medical_officer,
  therapist: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.therapist,
  specialist: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.therapist,
  technician: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.therapist,
  cashier: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.cashier,
  accountant: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.accountant,
  admin: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.admin,
  hr: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.admin,
  manager: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.admin,
  ceo: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.owner,
  owner: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.owner,
  developer: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.owner,
  sales_marketing: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.reception,
  worker: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.reception,
  pharmacist: WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE.reception,
};

export const getWorkspaceUrlPrefix = (user) => {
  const template = resolveNavTemplateKey(user);
  return WORKSPACE_ROUTE_PREFIX_BY_TEMPLATE[template] ?? "/reception";
};

export const resolveUserPrimaryRole = (user) => {
  if (!user) return null;
  if (typeof user.role === "string" && user.role.length > 0) {
    return user.role;
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0]?.slug ?? null;
  }
  return null;
};

export const getWorkspaceHomeByRole = (role) =>
  WORKSPACE_HOME_BY_ROLE[role] ?? WORKSPACE_HOME_BY_TEMPLATE.reception;

export const getUserWorkspaceHome = (user) => {
  const template = resolveNavTemplateKey(user);
  return WORKSPACE_HOME_BY_TEMPLATE[template] ?? WORKSPACE_HOME_BY_TEMPLATE.reception;
};

const WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE = {
  reception: "/reception/visit-history",
  medical_officer: "/medical-officer/visit-history",
  therapist: "/therapist/visit-history",
  cashier: "/cashier/pending-payments",
  accountant: "/accountant/finance/journal-entries",
  admin: "/admin/visit-history",
  owner: "/owner/visit-history",
};

/** Daily visit register URL per workspace template. */
export const WORKSPACE_VISIT_HISTORY_PATH_BY_TEMPLATE =
  WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE;

/** Kanban / queue board URL per role (not the same as workspace home for admin/owner). */
export const WORKSPACE_LIVEBOARD_PATH_BY_ROLE = {
  reception: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.reception,
  medical_officer: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.medical_officer,
  dermatologist: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.medical_officer,
  nutritionist: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.medical_officer,
  senior_nurse: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.medical_officer,
  therapist: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.therapist,
  specialist: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.therapist,
  technician: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.therapist,
  cashier: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.cashier,
  accountant: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.accountant,
  admin: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.admin,
  manager: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.admin,
  hr: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.admin,
  ceo: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.owner,
  owner: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.owner,
  developer: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.owner,
  sales_marketing: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.reception,
  worker: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.reception,
  pharmacist: WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.reception,
};

export const getWorkspaceLiveBoardPathByRole = (role) =>
  WORKSPACE_LIVEBOARD_PATH_BY_ROLE[role] ??
  WORKSPACE_LIVEBOARD_PATH_BY_TEMPLATE.reception;

export const getUserVisitHistoryPath = (user) => {
  const template = resolveNavTemplateKey(user);
  return (
    WORKSPACE_VISIT_HISTORY_PATH_BY_TEMPLATE[template] ??
    WORKSPACE_VISIT_HISTORY_PATH_BY_TEMPLATE.reception
  );
};

/** @deprecated Use getUserVisitHistoryPath */
export const getUserLiveBoardPath = getUserVisitHistoryPath;

export const hasStrictRole = (user, role) => {
  if (!user || !role) return false;
  if (typeof user.role === "string" && user.role.length > 0 && user.role === role) {
    return true;
  }
  if (Array.isArray(user.roles)) {
    return user.roles.some((item) => item?.slug === role);
  }
  return false;
};

/** Invoices list URL for a workspace (Billing and payables sidebar). */
export function getInvoicesListPath(prefix) {
  if (prefix === "/cashier") return `${prefix}/pending-payments`;
  if (prefix === "/owner") return `${prefix}/invoices`;
  return `${prefix}/payments`;
}

/**
 * Invoice detail URL (PaymentDetailPage). Owner uses /invoices/:id so the
 * Billing and payables top tab stays active; other roles use /payments/:id.
 */
export function getInvoiceDetailPath(prefix, paymentId) {
  const id = encodeURIComponent(String(paymentId));
  if (prefix === "/owner") return `${prefix}/invoices/${id}`;
  return `${prefix}/payments/${id}`;
}

/** True for invoice detail routes (excludes list and /payments/new). */
export function isInvoiceDetailPathname(pathname) {
  const p =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  if (p.endsWith("/payments/new")) return false;
  return /\/(payments|invoices)\/[^/]+$/.test(p);
}
