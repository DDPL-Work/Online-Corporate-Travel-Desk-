import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AuthModal from "../Pages/Auth/AuthModal";

export default function ProtectedRoute({ allowedRoles }) {
  const auth = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const token =
    auth.token ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const handleClose = () => {
    navigate(-1);
  };

  if (!token) {
    return (
      <>
        <div className="fixed inset-0 blur-[6px] pointer-events-none grayscale-[0.2]">
          <Outlet />
        </div>
        <AuthModal initialStep={0} onClose={handleClose} />
      </>
    );
  }

  let role = auth.role;

  // ✅ fallback: decode from token if redux lost it
  if (!role && token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || decoded.userRole;
    } catch (err) {
      console.error("Invalid token");
      return (
        <>
          <div className="fixed inset-0 blur-[6px] pointer-events-none grayscale-[0.2]">
            <Outlet />
          </div>
          <AuthModal initialStep={0} onClose={handleClose} />
        </>
      );
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <>
        <div className="fixed inset-0 blur-[6px] pointer-events-none grayscale-[0.2]">
          <Outlet />
        </div>
        <AuthModal initialStep={0} onClose={handleClose} />
      </>
    );
  }

  return <Outlet />;
}