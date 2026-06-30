import React, { useState, useRef, useEffect } from "react";
import {
  MdEmail,
  MdLockReset,
  MdClose,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdCheckCircle,
  MdArrowBack,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { forgotPassword, verifyOtp, resetPassword } from "../../Redux/Slice/authSlice";
import { toast } from "sonner";

// ── Color tokens (same as Login) ──────────────────────────────────────
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
};

// ── Steps ─────────────────────────────────────────────────────────────
const STEP = { EMAIL: 1, OTP: 2, NEW_PASSWORD: 3, SUCCESS: 4 };

// ── OTP_LENGTH ────────────────────────────────────────────────────────
const OTP_LEN = 6;

// ── Shared input style factory ─────────────────────────────────────────
const inputStyle = {
  border: `1.5px solid ${C.border}`,
  backgroundColor: C.offWhite,
  color: "#1e293b",
  borderRadius: "0.75rem",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s, background-color 0.15s",
  width: "100%",
};

const focusInput = (e) => {
  e.target.style.borderColor = C.navy;
  e.target.style.backgroundColor = C.white;
  e.target.style.boxShadow = "0 0 0 3px rgba(0,51,153,0.10)";
};
const blurInput = (e) => {
  e.target.style.borderColor = C.border;
  e.target.style.backgroundColor = C.offWhite;
  e.target.style.boxShadow = "none";
};

// ═════════════════════════════════════════════════════════════════════
//  ForgotPassword Modal
// ═════════════════════════════════════════════════════════════════════
const ForgotPassword = ({ onClose, initialEmail = "" }) => {
  const dispatch = useDispatch();
  const { fpLoading, fpError } = useSelector((s) => s.auth);

  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const [resendTimer, setResendTimer] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");

  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  // ── Clean up timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Auto-submit when all 6 OTP boxes are filled
  useEffect(() => {
    if (step === STEP.OTP && otp.join("").length === OTP_LEN && !fpLoading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Start 60-second resend countdown
  const startTimer = () => {
    setResendTimer(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ──────────────────────────────────────────────────────────────────
  //  Step 1 – send OTP
  // ──────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLocalError("");
    const result = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(result)) {
      toast.success("OTP sent to your email");
      startTimer();
      setStep(STEP.OTP);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setLocalError(result.payload || "Failed to send OTP");
    }
  };

  // ──────────────────────────────────────────────────────────────────
  //  OTP box keyboard handling
  // ──────────────────────────────────────────────────────────────────
  const handleOtpKey = (e, idx) => {
    const key = e.key.toUpperCase();
    // allow A-Z, 0-9
    if (/^[A-Z0-9]$/.test(key)) {
      const next = [...otp];
      next[idx] = key;
      setOtp(next);
      if (idx < OTP_LEN - 1) otpRefs.current[idx + 1]?.focus();
    } else if (e.key === "Backspace") {
      const next = [...otp];
      if (next[idx]) {
        next[idx] = "";
        setOtp(next);
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < OTP_LEN - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, OTP_LEN);
    const next = [...otp];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LEN - 1);
    otpRefs.current[focusIdx]?.focus();
  };

  // ──────────────────────────────────────────────────────────────────
  //  Step 2 – verify OTP
  // ──────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setLocalError("");
    const otpStr = otp.join("");
    if (otpStr.length < OTP_LEN) {
      setLocalError("Please fill all 6 OTP characters.");
      return;
    }
    const result = await dispatch(verifyOtp({ email, otp: otpStr }));
    if (verifyOtp.fulfilled.match(result)) {
      setStep(STEP.NEW_PASSWORD);
    } else {
      setLocalError(result.payload || "Invalid or expired OTP");
    }
  };

  // ──────────────────────────────────────────────────────────────────
  //  Step 3 – reset password
  // ──────────────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    const result = await dispatch(
      resetPassword({ email, otp: otp.join(""), newPassword }),
    );
    if (resetPassword.fulfilled.match(result)) {
      setStep(STEP.SUCCESS);
    } else {
      setLocalError(result.payload || "Failed to reset password");
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtp(Array(OTP_LEN).fill(""));
    setLocalError("");
    dispatch(forgotPassword({ email })).then((result) => {
      if (forgotPassword.fulfilled.match(result)) {
        toast.success("OTP resent");
        startTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setLocalError(result.payload || "Failed to resend OTP");
      }
    });
  };

  // ── common error to show (Redux or local)
  const displayError = localError || (fpError && typeof fpError === "string" ? fpError : fpError?.message);

  // ──────────────────────────────────────────────────────────────────
  //  Backdrop + Card
  // ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && step !== STEP.SUCCESS && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          backgroundColor: C.white,
          boxShadow: "0 24px 60px rgba(0,51,153,0.18), 0 8px 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* ── Top navy strip ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: C.navy }}
        >
          <div className="flex items-center gap-2">
            <MdLockReset size={22} className="text-white opacity-90" />
            <span className="text-white font-bold text-sm tracking-wide">
              {step === STEP.EMAIL && "Forgot Password"}
              {step === STEP.OTP && "Verify OTP"}
              {step === STEP.NEW_PASSWORD && "Set New Password"}
              {step === STEP.SUCCESS && "Password Reset"}
            </span>
          </div>
          {step !== STEP.SUCCESS && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
            >
              <MdClose size={16} className="text-white" />
            </button>
          )}
        </div>

        {/* ── Step progress dots ── */}
        {step !== STEP.SUCCESS && (
          <div className="flex items-center justify-center gap-2 py-3" style={{ backgroundColor: C.lightGray }}>
            {[STEP.EMAIL, STEP.OTP, STEP.NEW_PASSWORD].map((s) => (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{
                  width: step === s ? "24px" : "8px",
                  height: "8px",
                  backgroundColor: step >= s ? C.navy : C.border,
                }}
              />
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="px-7 py-7">
          {/* Error banner */}
          {displayError && (
            <div
              className="text-xs font-medium px-3 py-2.5 rounded-lg mb-5 flex items-start gap-2"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                color: C.red,
                border: `1px solid rgba(239,68,68,0.2)`,
              }}
            >
              <span className="mt-0.5">⚠</span>
              <span>{displayError}</span>
            </div>
          )}

          {/* ═══ STEP 1: EMAIL ═══ */}
          {step === STEP.EMAIL && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <p className="text-sm mb-5" style={{ color: C.muted }}>
                  Enter the email address linked to your admin account. We'll
                  send a 6-character OTP to verify your identity.
                </p>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.navy }}>
                  Admin Email Address
                </label>
                <div className="relative">
                  <MdEmail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
                    style={{ color: C.navy }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@traveamer.com"
                    required
                    style={{ ...inputStyle, padding: "0.75rem 1rem 0.75rem 2.6rem" }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={fpLoading}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                style={{ backgroundColor: C.navy, color: C.white, boxShadow: "0 4px 14px rgba(0,51,153,0.28)" }}
                onMouseEnter={(e) => { if (!fpLoading) { e.currentTarget.style.backgroundColor = "#0040bb"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.navy; e.currentTarget.style.transform = "none"; }}
              >
                {fpLoading ? (
                  <><SpinIcon /> Sending OTP…</>
                ) : (
                  <><MdEmail size={17} /> Send OTP</>
                )}
              </button>
            </form>
          )}

          {/* ═══ STEP 2: OTP ═══ */}
          {step === STEP.OTP && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted }}>
                  Enter the 6-character OTP sent to
                </p>
                <p className="text-sm font-semibold mb-5" style={{ color: C.navy }}>
                  {email}
                </p>
                <p className="text-xs mb-3 font-medium" style={{ color: C.muted }}>
                  OTP contains A–Z and 0–9 characters (case-insensitive)
                </p>

                {/* 6-box OTP input */}
                <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                  {otp.map((ch, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={ch}
                      onKeyDown={(e) => handleOtpKey(e, idx)}
                      onChange={() => {}} // handled in onKeyDown
                      className="text-center text-lg font-bold uppercase select-none"
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        maxWidth: "52px",
                        border: `2px solid ${ch ? C.navy : C.border}`,
                        borderRadius: "0.75rem",
                        backgroundColor: ch ? "rgba(0,51,153,0.05)" : C.offWhite,
                        color: C.navy,
                        outline: "none",
                        fontSize: "1.25rem",
                        letterSpacing: "0.05em",
                        transition: "border-color 0.15s, background-color 0.15s, box-shadow 0.15s",
                        caretColor: "transparent",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = C.gold;
                        e.target.style.boxShadow = `0 0 0 3px rgba(217,119,6,0.18)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = ch ? C.navy : C.border;
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  ))}
                </div>

                {/* Resend */}
                <div className="flex justify-between items-center mt-4 text-xs">
                  <span style={{ color: C.muted }}>Didn't receive it?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || fpLoading}
                    className="font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: resendTimer > 0 ? C.muted : C.navy }}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(STEP.EMAIL); setOtp(Array(OTP_LEN).fill("")); setLocalError(""); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ border: `1.5px solid ${C.border}`, color: C.muted, backgroundColor: C.offWhite }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                >
                  <MdArrowBack size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={fpLoading || otp.join("").length < OTP_LEN}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ backgroundColor: C.navy, color: C.white, boxShadow: "0 4px 14px rgba(0,51,153,0.25)" }}
                  onMouseEnter={(e) => { if (!fpLoading) { e.currentTarget.style.backgroundColor = "#0040bb"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.navy; e.currentTarget.style.transform = "none"; }}
                >
                  {fpLoading ? <><SpinIcon /> Verifying…</> : "Verify OTP"}
                </button>
              </div>
            </form>
          )}

          {/* ═══ STEP 3: NEW PASSWORD ═══ */}
          {step === STEP.NEW_PASSWORD && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <p className="text-sm mb-1" style={{ color: C.muted }}>
                Create a strong new password for your admin account.
              </p>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.navy }}>
                  New Password
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none" style={{ color: C.navy }} />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    style={{ ...inputStyle, padding: "0.75rem 3.5rem 0.75rem 2.6rem" }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold"
                    style={{ color: C.muted }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.navy; e.currentTarget.style.backgroundColor = "rgba(0,51,153,0.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {showNew ? <><MdVisibilityOff size={15} /><span>Hide</span></> : <><MdVisibility size={15} /><span>Show</span></>}
                  </button>
                </div>
                {/* Strength hint */}
                {newPassword.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            newPassword.length >= n * 3
                              ? (newPassword.length >= 12 ? C.emerald : newPassword.length >= 8 ? C.gold : C.red)
                              : C.border,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.navy }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none" style={{ color: C.navy }} />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    style={{
                      ...inputStyle,
                      padding: "0.75rem 3.5rem 0.75rem 2.6rem",
                      borderColor: confirmPassword && confirmPassword !== newPassword ? C.red : C.border,
                    }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold"
                    style={{ color: C.muted }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.navy; e.currentTarget.style.backgroundColor = "rgba(0,51,153,0.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {showConfirm ? <><MdVisibilityOff size={15} /><span>Hide</span></> : <><MdVisibility size={15} /><span>Show</span></>}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs mt-1" style={{ color: C.red }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={fpLoading}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                style={{ backgroundColor: C.navy, color: C.white, boxShadow: "0 4px 14px rgba(0,51,153,0.28)" }}
                onMouseEnter={(e) => { if (!fpLoading) { e.currentTarget.style.backgroundColor = "#0040bb"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.navy; e.currentTarget.style.transform = "none"; }}
              >
                {fpLoading ? <><SpinIcon /> Resetting…</> : <><MdLockReset size={17} /> Reset Password</>}
              </button>
            </form>
          )}

          {/* ═══ STEP 4: SUCCESS ═══ */}
          {step === STEP.SUCCESS && (
            <div className="flex flex-col items-center text-center py-4 gap-5">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{ backgroundColor: "rgba(16,185,129,0.12)" }}
              >
                <MdCheckCircle size={40} style={{ color: C.emerald }} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold mb-1" style={{ color: C.navy }}>
                  Password Reset!
                </h3>
                <p className="text-sm" style={{ color: C.muted }}>
                  Your password has been updated successfully.
                  <br />
                  You can now sign in with your new password.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={{ backgroundColor: C.navy, color: C.white, boxShadow: "0 4px 14px rgba(0,51,153,0.28)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0040bb"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.navy; e.currentTarget.style.transform = "none"; }}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Inline spinner icon ───────────────────────────────────────────────
const SpinIcon = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

export default ForgotPassword;
