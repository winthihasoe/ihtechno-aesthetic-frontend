import { isClinicalDoctorUser } from "./roleWorkspace";
import { hasStrictRole, resolveUserPrimaryRole } from "./workspaceRoutes";

export const hasRole = (user, role) => {
  if (!user || !role) return false;
  const rootRoles = ["owner", "developer", "ceo"];
  if (Array.isArray(user.roles) && user.roles.some((item) => rootRoles.includes(item?.slug))) {
    return true;
  }
  if (Array.isArray(user.roles) && user.roles.some((item) => item?.slug === role)) {
    return true;
  }

  if (rootRoles.includes(user.role)) return true;
  return user.role === role;
};

export const hasPermission = (user, permission) => {
  if (!user || !permission) return false;
  if (hasRole(user, "owner") || hasRole(user, "ceo")) return true;

  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) =>
  permissions.some((permission) => hasPermission(user, permission));

/** Doctor workspace: hide phone/address/contact in UI (API also redacts). Owner/admin keep full view. */
export const hidePatientContactDetails = (user) => {
  if (!user) return false;
  if (hasStrictRole(user, "owner") || hasStrictRole(user, "admin") || hasStrictRole(user, "ceo")) {
    return false;
  }
  return isClinicalDoctorUser(user);
};
