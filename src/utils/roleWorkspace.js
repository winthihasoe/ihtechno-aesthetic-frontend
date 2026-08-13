import { hasAnyPermission, hasPermission, hasRole } from "./accessUtils";

/**
 * Maps any user.role / roles[].slug to a sidebar + route template defined in roleUtils.
 * Custom roles fall back via permission heuristics in resolveNavTemplateKey.
 */
export const ROLE_NAV_TEMPLATE = {
  owner: "owner",
  developer: "owner",
  ceo: "owner",
  admin: "admin",
  manager: "admin",
  hr: "admin",
  reception: "reception",
  sales_marketing: "reception",
  worker: "reception",
  pharmacist: "reception",
  medical_officer: "medical_officer",
  dermatologist: "medical_officer",
  nutritionist: "medical_officer",
  senior_nurse: "medical_officer",
  therapist: "therapist",
  specialist: "therapist",
  technician: "therapist",
  cashier: "cashier",
  accountant: "accountant",
};

/** Workspace route keys used by AppRoutes WorkspaceRoute. */
export const WORKSPACE_KEYS = [
  "owner",
  "admin",
  "reception",
  "medical_officer",
  "therapist",
  "cashier",
  "accountant",
];

const PERMISSION_NAV_TEMPLATE = [
  { template: "owner", permissions: ["settings.manage"] },
  { template: "admin", permissions: ["users.manage", "hr.manage", "forms.manage"] },
  {
    template: "medical_officer",
    permissions: ["consultations.manage"],
  },
  { template: "therapist", permissions: ["treatments.manage"] },
  { template: "cashier", permissions: ["payments.manage"] },
  {
    template: "accountant",
    permissions: ["finance.reports.view", "finance.chart_of_accounts.view"],
  },
];

/**
 * @param {import("./workspaceRoutes").UserLike | null | undefined} user
 * @returns {string}
 */
export const resolveNavTemplateKey = (user) => {
  if (!user) return "reception";

  const slugs = new Set();
  if (typeof user.role === "string" && user.role) slugs.add(user.role);
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (r?.slug) slugs.add(r.slug);
    });
  }

  for (const slug of slugs) {
    if (slug === "owner" || slug === "developer") return "owner";
    if (ROLE_NAV_TEMPLATE[slug]) return ROLE_NAV_TEMPLATE[slug];
  }

  for (const { template, permissions } of PERMISSION_NAV_TEMPLATE) {
    if (hasAnyPermission(user, permissions)) return template;
  }

  return "reception";
};

/**
 * @param {import("./workspaceRoutes").UserLike | null | undefined} user
 * @param {string} workspaceKey
 */
export const canAccessWorkspace = (user, workspaceKey) => {
  if (!user || !workspaceKey) return false;
  if (hasRole(user, "owner")) return true;

  const template = resolveNavTemplateKey(user);
  if (template === workspaceKey) return true;

  if (workspaceKey === "owner" && hasRole(user, "ceo")) return true;

  const gates = WORKSPACE_PERMISSION_GATES[workspaceKey];
  if (gates?.length && hasAnyPermission(user, gates)) {
    return resolveNavTemplateKey(user) === workspaceKey;
  }

  return false;
};

/** Minimum permissions to enter a workspace when role slug is unknown/custom. */
const WORKSPACE_PERMISSION_GATES = {
  owner: ["settings.manage"],
  admin: ["users.manage", "hr.manage", "settings.manage", "forms.manage"],
  reception: [
    "liveboard.view",
    "appointments.manage",
    "patients.manage",
  ],
  medical_officer: ["consultations.manage"],
  therapist: ["treatments.manage"],
  cashier: ["payments.manage", "payments.view"],
  accountant: [
    "finance.reports.view",
    "finance.chart_of_accounts.view",
    "finance.expenses.view",
  ],
};

/** Clinical staff who may be assigned as visit doctor (matches backend clinicalPhysicianRoleSlugs). */
export const CLINICAL_DOCTOR_ROLE_SLUGS = [
  "medical_officer",
  "dermatologist",
  "senior_nurse",
];

/**
 * @param {import("./workspaceRoutes").UserLike | null | undefined} user
 */
export const isClinicalDoctorUser = (user) => {
  if (!user) return false;
  if (hasPermission(user, "consultations.manage")) return true;
  return CLINICAL_DOCTOR_ROLE_SLUGS.some((slug) => hasRole(user, slug));
};

/**
 * @param {import("./workspaceRoutes").UserLike | null | undefined} user
 */
export const isTreatmentStaffUser = (user) => {
  if (!user) return false;
  if (hasPermission(user, "treatments.manage")) return true;
  return ["therapist", "specialist", "technician"].some((slug) =>
    hasRole(user, slug),
  );
};

/**
 * @param {import("./workspaceRoutes").UserLike | null | undefined} user
 */
export const isFrontDeskUser = (user) => {
  if (!user) return false;
  if (hasPermission(user, "appointments.manage")) return true;
  return ["reception", "sales_marketing", "worker", "pharmacist"].some(
    (slug) => hasRole(user, slug),
  );
};
