import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import { hasAnyPermission, hasRole } from "../utils/accessUtils";
import { getUserWorkspaceHome } from "../utils/workspaceRoutes";

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowedPermissions,
}) {
  const { user, token, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isOwner = hasRole(user, "owner");

  if (
    allowedPermissions?.length &&
    !isOwner &&
    !hasAnyPermission(user, allowedPermissions)
  ) {
    return <Navigate to={getUserWorkspaceHome(user)} replace />;
  }

  if (
    allowedRoles?.length &&
    !isOwner &&
    !allowedRoles.some((role) => hasRole(user, role))
  ) {
    return <Navigate to={getUserWorkspaceHome(user)} replace />;
  }

  return children;
}
