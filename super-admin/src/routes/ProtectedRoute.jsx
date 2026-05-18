import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  canAccessDashboardPath,
  getDefaultDashboardPath,
  normalizePermissions,
} from "../constants/rbac";

export default function ProtectedRoute({ allowedRoles }) {
  const auth = useSelector((state) => state.auth);
  const profileUser = useSelector((state) => state.profile.user);
  const location = useLocation();

  const storedUser = (() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const token = auth.token || sessionStorage.getItem("token");
  const role =
    auth.role ||
    profileUser?.role ||
    auth.user?.role ||
    auth.user?.userRole ||
    sessionStorage.getItem("role") ||
    storedUser?.role ||
    storedUser?.userRole ||
    null;
  const permissions = normalizePermissions(
    profileUser?.permissions || auth.user?.permissions || storedUser?.permissions || [],
  );

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    !canAccessDashboardPath({
      role,
      permissions,
      pathname: location.pathname,
    })
  ) {
    const fallback = getDefaultDashboardPath({ role, permissions });
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
