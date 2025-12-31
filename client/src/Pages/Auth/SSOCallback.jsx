import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { ssoLoginSuccess } from "../../Redux/Slice/authSlice";
import { fetchDashboardData } from "../../Redux/Slice/dashboardSlice";

const SSOCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
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
        })
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
      }
    } catch (err) {
      navigate("/login", { replace: true });
    }
  }, [dispatch, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading dashboard…
    </div>
  );
};

export default SSOCallback;
