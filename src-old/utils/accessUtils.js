import { hasStrictRole, resolveUserPrimaryRole } from "./workspaceRoutes";

export const hasRole = (user, role) => {
  if (!user || !role) return false;
  const rootRoles = ["owner", "developer"];
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
  if (hasRole(user, "owner")) return true;

  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) =>
  permissions.some((permission) => hasPermission(user, permission));

/** Doctor workspace: hide phone/address/contact in UI (API also redacts). Owner/admin keep full view. */
export const hidePatientContactDetails = (user) => {
  if (!user) return false;
  if (hasStrictRole(user, "owner") || hasStrictRole(user, "admin")) return false;
  const primary = resolveUserPrimaryRole(user);
  return primary === "medical_officer" || primary === "physician";
};
