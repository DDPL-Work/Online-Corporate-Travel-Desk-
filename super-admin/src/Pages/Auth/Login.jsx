import React, { useState } from "react";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdAdminPanelSettings,
  MdSecurity,
  MdDashboard,
  MdPeople,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";
import { getDefaultDashboardPath } from "../../constants/rbac";
import LOGO from "../../../public/logo-traveamer.svg";
import { toast } from "sonner";
import ForgotPassword from "./ForgotPassword";


// ─── Color Tokens ────────────────────────────────────────────────────
const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
};

const features = [
  {
    icon: <MdDashboard size={20} />,
    title: "Unified Dashboard",
    desc: "Real-time overview of all travel operations.",
  },
  {
    icon: <MdPeople size={20} />,
    title: "Role-Based Access",
    desc: "OPS team & super-admin with granular permissions.",
  },
  {
    icon: <MdSecurity size={20} />,
    title: "Secure & Auditable",
    desc: "Every action is logged and traceable.",
  },
];

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);


  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email: form.email, password: form.password }))
      .unwrap()
      .then((data) => {
        toast.success("Login successful");
        navigate(
          getDefaultDashboardPath({
            role: data.role || data.user?.role || data.user?.userRole,
            permissions: data.permissions || data.user?.permissions || [],
          }),
        );
      })
      .catch((err) => {
        toast.error(
          typeof err === "string" ? err : err?.message || "Failed to login",
        );
      });
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <>
    <div
      style={{ backgroundColor: C.offWhite }}
      className="flex items-center justify-center overflow-hidden relative min-h-screen lg:h-screen lg:overflow-hidden"
    >
      {/* Subtle radial background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 50%, rgba(0,51,153,0.07) 0%, transparent 55%),
                            radial-gradient(circle at 85% 30%, rgba(217,119,6,0.06) 0%, transparent 50%)`,
        }}
      />

      {/* Main card */}
      <div
        className="relative w-full max-w-5xl flex sm:rounded-2xl overflow-hidden min-h-[100svh] md:min-h-[80svh]"
        style={{
          boxShadow:
            "0 25px 60px rgba(0,51,153,0.12), 0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* ── LEFT: Branding Panel ── */}
        <div
          className="hidden lg:flex flex-col justify-between w-[46%] p-10 relative overflow-hidden lg:overflow-y-auto"
          style={{ backgroundColor: C.navy }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: C.gold }}
          />
          <div
            className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-[0.06]"
            style={{ backgroundColor: C.white }}
          />

          {/* Logo + brand */}
          <div className="relative z-10">
            <div className="flex items-center">
              <img
                src={LOGO}
                alt="Traveamer Logo"
                className="w-40 h-24 object-contain"
              />
            </div>

            <h1
              className="text-3xl font-extrabold leading-snug mb-3"
              style={{ color: C.white }}
            >
              Operation Control
              <br />
              <span style={{ color: C.gold }}>Centre</span>
            </h1>
            <p
              className="text-sm leading-relaxed mb-10"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Secure access for OPS Team &amp; Super-Admins. Manage bookings,
              users, reports, and system settings from one place.
            </p>

            <div className="space-y-5">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg mt-0.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
                  >
                    <span style={{ color: C.gold }}>{f.icon}</span>
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: C.white }}
                    >
                      {f.title}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p
            className="relative z-10 text-xs"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            © {new Date().getFullYear()} Traveamer. All rights reserved.
          </p>
        </div>

        {/* ── RIGHT: Login Form ── */}
        <div
          className="flex-1 flex flex-col lg:justify-center"
          style={{ backgroundColor: C.white }}
        >
          {/* Mobile navy header strip — logo only */}
          <div
            className="lg:hidden flex items-center justify-center py-5 px-6"
            style={{ backgroundColor: C.navy }}
          >
            <img
              src={LOGO}
              alt="Traveamer Logo"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Form content wrapper */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-12">

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 sm:mb-4"
              style={{
                backgroundColor: "rgba(0,51,153,0.08)",
                color: C.navy,
              }}
            >
              <MdAdminPanelSettings size={14} />
              Admin &amp; OPS Portal
            </div>
            <h2
              className="text-xl sm:text-2xl font-extrabold mb-1"
              style={{ color: C.navy }}
            >
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: C.muted }}>
              Sign in to your ops account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: C.navy }}
              >
                Email Address
              </label>
              <div className="relative">
                <MdEmail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
                  style={{ color: C.navy }}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="admin@traveamer.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  style={{
                    border: `1.5px solid ${C.border}`,
                    backgroundColor: C.offWhite,
                    color: "#1e293b",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1rem 0.75rem 2.5rem",
                    width: "100%",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s, background-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.navy;
                    e.target.style.backgroundColor = C.white;
                    e.target.style.boxShadow = `0 0 0 3px rgba(0,51,153,0.10)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.backgroundColor = C.offWhite;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: C.navy }}
              >
                Password
              </label>
              <div className="relative">
                <MdLock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
                  style={{ color: C.navy }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{
                    border: `1.5px solid ${C.border}`,
                    backgroundColor: C.offWhite,
                    color: "#1e293b",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 5rem 0.75rem 2.5rem",
                    width: "100%",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s, background-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.navy;
                    e.target.style.backgroundColor = C.white;
                    e.target.style.boxShadow = `0 0 0 3px rgba(0,51,153,0.10)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.backgroundColor = C.offWhite;
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold transition-colors"
                  style={{ color: C.muted }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = C.navy;
                    e.currentTarget.style.backgroundColor =
                      "rgba(0,51,153,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = C.muted;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <>
                      <MdVisibilityOff size={16} />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <MdVisibility size={16} />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="font-semibold hover:underline transition-colors"
                style={{ color: C.navy }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-xs font-medium px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  color: C.red,
                  border: `1px solid rgba(239,68,68,0.2)`,
                }}
              >
                {typeof error === "string"
                  ? error
                  : error?.message || "Login failed. Please try again."}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: C.navy,
                color: C.white,
                boxShadow: loading
                  ? "none"
                  : `0 4px 14px rgba(0,51,153,0.30)`,
                transition: "background-color 0.2s, transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "#0040bb";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 18px rgba(0,51,153,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.navy;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(0,51,153,0.30)";
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Authenticating…
                </>
              ) : (
                <>
                  <MdAdminPanelSettings size={18} />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p
            className="mt-8 text-center text-xs leading-relaxed pb-2"
            style={{ color: C.muted }}
          >
            Restricted access — authorised personnel only.
            <br />
            All sessions are monitored and logged.
          </p>
          </div> {/* end form content wrapper */}
        </div>
      </div>
    </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <ForgotPassword
          initialEmail={form.email}
          onClose={() => setShowForgot(false)}
        />
      )}
    </>
  );
};

export default Login;

