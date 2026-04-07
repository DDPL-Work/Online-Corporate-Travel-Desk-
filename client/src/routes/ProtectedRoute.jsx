import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ allowedRoles }) {
  const auth = useSelector((state) => state.auth);

  const token =
    auth.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) return <Navigate to="/iapindia" replace />;

  let role = auth.role;

  // ✅ fallback: decode from token if redux lost it
  if (!role && token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || decoded.userRole;
    } catch (err) {
      console.error("Invalid token");
      return <Navigate to="/iapindia" replace />;
    }
  }

  console.log("ROLE:", role);
  console.log("ALLOWED:", allowedRoles);

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}