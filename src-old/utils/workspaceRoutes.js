export const WORKSPACE_HOME_BY_ROLE = {
  reception: "/reception/live-board",
  medical_officer: "/medical-officer/queue",
  physician: "/medical-officer/queue",
  nutritionist: "/medical-officer/queue",
  therapist: "/therapist/tasks",
  cashier: "/cashier/pending-payments",
  accountant: "/accountant/finance/journal-entries",
  admin: "/admin/dashboard",
  hr: "/admin/hr/daily/attendance",
  owner: "/owner/dashboard",
  developer: "/owner/dashboard",
};

/** First URL segment for each staff role — must match `AppRoutes` workspace `path`s. */
export const WORKSPACE_ROUTE_PREFIX_BY_ROLE = {
  reception: "/reception",
  medical_officer: "/medical-officer",
  physician: "/medical-officer",
  nutritionist: "/medical-officer",
  therapist: "/therapist",
  cashier: "/cashier",
  accountant: "/accountant",
  admin: "/admin",
  hr: "/admin",
  owner: "/owner",
  developer: "/owner",
  sales_marketing: "/reception",
};

export function getPatientCreatePath(
  prefix,
  { returnTo, appointmentId, name } = {},
) {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (appointmentId != null && appointmentId !== "") {
    params.set("appointmentId", String(appointmentId));
  }
  if (name) params.set("name", name);
  const query = params.toString();
  return `${prefix}/patients/new${query ? `?${query}` : ""}`;
}

export function getPatientDetailPath(prefix, patientId, { appointmentId } = {}) {
  const params = new URLSearchParams();
  if (appointmentId != null && appointmentId !== "") {
    params.set("appointmentId", String(appointmentId));
  }
  const query = params.toString();
  return `${prefix}/patients/${encodeURIComponent(String(patientId))}${query ? `?${query}` : ""}`;
}

export function getPatientsListPath(prefix) {
  return `${prefix}/patients`;
}

export const getWorkspaceUrlPrefix = (user) => {
  const role = resolveUserPrimaryRole(user);
  if (!role) return "/reception";
  return WORKSPACE_ROUTE_PREFIX_BY_ROLE[role] ?? "/reception";
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
  WORKSPACE_HOME_BY_ROLE[role] ?? WORKSPACE_HOME_BY_ROLE.reception;

export const getUserWorkspaceHome = (user) =>
  getWorkspaceHomeByRole(resolveUserPrimaryRole(user));

/** Kanban / queue board URL per role (not the same as workspace home for admin/owner). */
export const WORKSPACE_LIVEBOARD_PATH_BY_ROLE = {
  reception: "/reception/live-board",
  medical_officer: "/medical-officer/queue",
  physician: "/medical-officer/queue",
  nutritionist: "/medical-officer/queue",
  therapist: "/therapist/tasks",
  cashier: "/cashier/pending-payments",
  accountant: "/accountant/finance/journal-entries",
  admin: "/admin/live-board",
  owner: "/owner/live-board",
  developer: "/owner/live-board",
  sales_marketing: "/reception/live-board",
};

export const getWorkspaceLiveBoardPathByRole = (role) =>
  WORKSPACE_LIVEBOARD_PATH_BY_ROLE[role] ?? WORKSPACE_LIVEBOARD_PATH_BY_ROLE.reception;

export const getUserLiveBoardPath = (user) =>
  getWorkspaceLiveBoardPathByRole(resolveUserPrimaryRole(user));

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
