import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  // const { token, role } = useSelector((state) => state.auth);
  const auth = useSelector((state) => state.auth);

  const token = auth.token || sessionStorage.getItem("token");
  const role = auth.role || sessionStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
