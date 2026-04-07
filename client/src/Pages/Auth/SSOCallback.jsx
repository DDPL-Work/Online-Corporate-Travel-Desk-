import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { ssoLoginSuccess } from "../../Redux/Slice/authSlice";
import { fetchDashboardData } from "../../Redux/Slice/dashboardSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";

const SSOCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    const admin = params.get("admin");

    if (error) {
      const lower = error.toLowerCase();
      const isInactive =
        lower.includes("inactive") || lower.includes("disabled");
      const contactText = admin ? ` (${admin})` : "";

      ToastWithTimer({
        message: isInactive
          ? `Your account is inactive. Please contact your travel admin${contactText} to reactivate your access.`
          : error,
        type: "error",
        duration: 6000,
      });

      const qs = new URLSearchParams();
      qs.set("error", error);
      if (admin) qs.set("admin", admin);
      navigate(`/iapindia?${qs.toString()}`, { replace: true });
      return;
    }

    if (!token) {
      navigate("/iapindia", { replace: true });
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const role = decoded.role;

      // ✅ Save auth
      dispatch(
        ssoLoginSuccess({
          token,
          user: decoded,
        }),
      );

      // ✅ Fetch dashboard immediately
      dispatch(fetchDashboardData(role));

      // ✅ Navigate
      if (role === "travel-admin") {
        navigate("/total-bookings", { replace: true });
      } else if (role === "super-admin") {
        navigate("/onboarded-corporates", { replace: true });
      } else if (role === "employee") {
        navigate("/my-bookings", { replace: true });
      } else if (role === "manager") {
        navigate("/manager/total-bookings", { replace: true });
      }
    } catch (err) {
      navigate("/iapindia", { replace: true });
    }
  }, [dispatch, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading dashboard…
    </div>
  );
};

export default SSOCallback;
