import { useState, useEffect, useRef } from "react";
import { MdClose, MdArrowForward, MdArrowBack } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { onboardCorporate } from "../../Redux/Actions/registrationThunks";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import {
  Step0,
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
} from "./componetsAuth/steps";
import { LeftPanel, STEPS, StepTracker } from "./componetsAuth/components";

// ── MAIN MODAL ────────────────────────────────────────────────────────────────
export default function AuthModal({ onClose }) {
  const [step, setStep] = useState(0);
  const scrollRef = useRef(null);
  const dispatch = useDispatch();
  const { loading: onboardingLoading } = useSelector(
    (s) => s.corporateOnboarding,
  );

  const [form, setForm] = useState({
    email: "",
    corporateName: "",
    // classification: "prepaid",
    defaultApprover: "travel-admin",
    // walletBalance: 0,
    primaryName: "",
    primaryEmail: "",
    primaryMobile: "",
    secondaryName: "",
    secondaryEmail: "",
    secondaryMobile: "",
    billingName: "",
    billingEmail: "",
    billingMobile: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    ssoType: "google",
    ssoDomain: "",
    samlMetadata: "",
    // billingCycle: "30days",
    // customBillingDays: "",
    // creditLimit: 0,
    // currentOutstanding: 0,
    creditTermsNotes: "",
    allowedCabinClass: ["Economy"],
    allowAncillaryServices: true,
    advanceBookingDays: 0,
    maxBookingAmount: 0,
    gstin: "",
    gstLegalName: "",
    gstAddress: "",
  });

  const [errors, setErrors] = useState({});

  const [gstMode, setGstMode] = useState("file");
  const [gstFile, setGstFile] = useState(null);
  const [gstUrl, setGstUrl] = useState("");
  const [panMode, setPanMode] = useState("file");
  const [panFile, setPanFile] = useState(null);
  const [panUrl, setPanUrl] = useState("");
  const [gstAutoFilled, setGstAutoFilled] = useState(false);

  const handleGstFileChange = async (file) => {
    setGstFile(file);
    setGstAutoFilled(false); // reset first

    if (file) {
      await previewGstFromPdf(file);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  const TOTAL = STEPS.length; // 9
  const isLast = step === TOTAL - 1;

  const validators = {
    required: (v) => (v?.toString().trim() ? "" : "This field is required"),

    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Invalid email format",

    mobile: (v) =>
      /^[6-9]\d{9}$/.test(v.replace(/\D/g, ""))
        ? ""
        : "Enter valid 10-digit mobile",

    gstin: (v) =>
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)
        ? ""
        : "Invalid GSTIN format",

    domain: (v) =>
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)
        ? ""
        : "Enter valid domain (example.com)",

    pincode: (v) => (/^[1-9][0-9]{5}$/.test(v) ? "" : "Invalid pincode"),
  };

  const validateStep = () => {
    let newErrors = {};

    switch (step) {
      case 1:
        newErrors.corporateName = validators.required(form.corporateName);
        break;

      case 2:
        newErrors.primaryName = validators.required(form.primaryName);

        newErrors.primaryEmail =
          validators.required(form.primaryEmail) ||
          validators.email(form.primaryEmail);

        newErrors.primaryMobile =
          validators.required(form.primaryMobile) ||
          validators.mobile(form.primaryMobile);
        break;

      case 3:
        newErrors.city = validators.required(form.city);
        newErrors.state = validators.required(form.state);
        newErrors.pincode = validators.pincode(form.pincode);
        break;

      case 4:
        newErrors.ssoDomain =
          validators.required(form.ssoDomain) ||
          validators.domain(form.ssoDomain);
        break;

      case 5:
        if (form.allowedCabinClass.length === 0)
          newErrors.allowedCabinClass = "Select at least one cabin class";
        break;

      case 6:
        if (!gstFile && !gstUrl)
          newErrors.gstCertificate = "GST certificate required";

        // if (!panFile && !panUrl) newErrors.panCard = "PAN card required";

        newErrors.gstin =
          validators.required(form.gstin) || validators.gstin(form.gstin);

        newErrors.gstLegalName = validators.required(form.gstLegalName);
        break;

      default:
        break;
    }

    // Remove empty errors
    Object.keys(newErrors).forEach((k) => {
      if (!newErrors[k]) delete newErrors[k];
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];

      const el = document.querySelector(`[name="${firstErrorField}"]`);
      if (el) el.focus();

      return false;
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep()) {
      ToastWithTimer({
        message: "Please fix the highlighted fields",
        type: "error",
        duration: 3500,
      });
      return;
    }

    if (step === 6) {
      submitOnboarding();
      return;
    }

    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const previewGstFromPdf = async (file) => {
    const formData = new FormData();
    formData.append("gstCertificate", file);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/onboarding/gst/preview`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (data.success) {
        setForm((prev) => ({
          ...prev,
          gstin: data.data.gstin || "",
          gstLegalName: data.data.legalName || "",
          gstAddress: data.data.address || "",
        }));

        setGstAutoFilled(true);

        ToastWithTimer({
          message: "GST details extracted successfully!",
          type: "success",
        });
      }
    } catch (err) {
      setGstAutoFilled(false);

      ToastWithTimer({
        message:
          err?.message ||
          "Could not extract GST details. Please fill manually.",
        type: "error",
      });
    }
  };

  const submitOnboarding = async () => {
    const fd = new FormData();

    // BASIC
    fd.append("corporateName", form.corporateName);
    // fd.append("classification", form.classification);

    fd.append("primaryContact[name]", form.primaryName);
    fd.append("primaryContact[email]", form.primaryEmail);
    fd.append("primaryContact[mobile]", form.primaryMobile);

    fd.append("ssoConfig[type]", form.ssoType);
    fd.append("ssoConfig[domain]", form.ssoDomain);

    // ADDRESS
    fd.append("registeredAddress[street]", form.street);
    fd.append("registeredAddress[city]", form.city);
    fd.append("registeredAddress[state]", form.state);
    fd.append("registeredAddress[pincode]", form.pincode);
    fd.append("registeredAddress[country]", form.country);

    // GST DETAILS (manual or extracted)
    fd.append("gstDetails[gstin]", form.gstin);
    fd.append("gstDetails[legalName]", form.gstLegalName);
    fd.append("gstDetails[address]", form.gstAddress);

    // BILLING
    // fd.append("billingCycle", form.billingCycle);
    // fd.append("creditLimit", form.creditLimit);

    // SECONDARY CONTACT
    fd.append("secondaryContact[name]", form.secondaryName);
    fd.append("secondaryContact[email]", form.secondaryEmail);
    fd.append("secondaryContact[mobile]", form.secondaryMobile);

    // BILLING DEPARTMENT
    fd.append("billingDepartment[name]", form.billingName);
    fd.append("billingDepartment[email]", form.billingEmail);
    fd.append("billingDepartment[mobile]", form.billingMobile);

    // WALLET (for prepaid)
    // fd.append("walletBalance", form.walletBalance);

    // DEFAULT APPROVER
    fd.append("defaultApprover", form.defaultApprover);

    // NOTES
    // fd.append("creditTermsNotes", form.creditTermsNotes);

    // ADMIN EMAIL (from Step0)
    fd.append("email", form.email);

    // TRAVEL POLICY
    form.allowedCabinClass.forEach((c) =>
      fd.append("travelPolicy[allowedCabinClass][]", c),
    );
    fd.append(
      "travelPolicy[allowAncillaryServices]",
      form.allowAncillaryServices,
    );
    fd.append("travelPolicy[advanceBookingDays]", form.advanceBookingDays);
    fd.append("travelPolicy[maxBookingAmount]", form.maxBookingAmount);

    // DOCUMENTS
    if (gstMode === "file" && gstFile) {
      fd.append("gstCertificate", gstFile);
    }
    if (gstMode === "url" && gstUrl) {
      fd.append("gstCertificate[url]", gstUrl);
    }

    if (panMode === "file" && panFile) {
      fd.append("panCard", panFile);
    }
    if (panMode === "url" && panUrl) {
      fd.append("panCard[url]", panUrl);
    }

    try {
      await dispatch(onboardCorporate(fd)).unwrap();
      ToastWithTimer({
        message: "Application submitted successfully!",
        type: "success",
        duration: 4000,
      });
      setStep(8); // Move to Done step
    } catch (err) {
      console.error("Onboarding failed:", err);

      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        ToastWithTimer({
          message:
            err?.response?.data?.message ||
            "Something went wrong. Please try again.",
          type: "error",
        });
      }
    }
  };

  const nextLabel = () => {
    if (onboardingLoading) return "Submitting...";
    if (step === 0) return null; // handled inside Step0
    if (step === TOTAL - 2) return "Submit Application";
    return "Continue";
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Step0
            form={form}
            setForm={setForm}
            onNext={(provider) => {
              if (provider) {
                // OAuth redirect
                window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/sso/${provider}`;
              } else {
                goNext(); // Email flow → move to Step1
              }
            }}
            onRegister={() => setStep(1)}
          />
        );
      case 1:
        return <Step1 form={form} setForm={setForm} errors={errors} />;
      case 2:
        return <Step2 form={form} setForm={setForm} errors={errors} />;
      case 3:
        return <Step3 form={form} setForm={setForm} errors={errors} />;
      case 4:
        return <Step4 form={form} setForm={setForm} errors={errors} />;
      // case 5:
      //   return <Step5 form={form} setForm={setForm} errors={errors} />;
      case 5:
        return <Step5 form={form} setForm={setForm} errors={errors} />;
      case 6:
        return (
          <Step6
            form={form}
            setForm={setForm}
            gstMode={gstMode}
            setGstMode={setGstMode}
            gstFile={gstFile}
            setGstFile={handleGstFileChange}
            gstUrl={gstUrl}
            setGstUrl={setGstUrl}
            panMode={panMode}
            setPanMode={setPanMode}
            panFile={panFile}
            setPanFile={setPanFile}
            panUrl={panUrl}
            setPanUrl={setPanUrl}
            gstAutoFilled={gstAutoFilled} // ✅ ADD THIS
            errors={errors}
          />
        );
      case 7:
        return <Step7 form={form} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ background: "rgba(2,8,32,0.82)", backdropFilter: "blur(12px)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="relative w-full flex shadow-2xl shadow-slate-950/60 rounded-3xl overflow-hidden"
        style={{
          fontFamily: "'DM Sans',sans-serif",
          maxWidth: "950px",
          maxHeight: "92vh",
        }}
      >
        {/* ── Left Panel ── */}
        <LeftPanel step={step} />

        {/* ── Right Panel ── */}
        <div className="flex-1 bg-white flex flex-col min-w-0 rounded-r-3xl">
          {/* Right header */}
          <div className="shrink-0 flex items-center justify-between px-8 pt-7 pb-5 border-b border-slate-50">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {step === 0
                  ? "Authentication"
                  : step === TOTAL - 1
                    ? "Complete"
                    : `Step ${step} of ${TOTAL - 2}`}
              </p>
              <p
                className="font-black text-slate-800 text-lg mt-0.5"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                {STEPS[step]?.id === 0
                  ? "Sign In"
                  : step === 1
                    ? "Company Details"
                    : step === 2
                      ? "Contact People"
                      : step === 3
                        ? "Registered Address"
                        : step === 4
                          ? "SSO Configuration"
                          : // : step === 5
                            //   ? "Billing & Credit"
                            step === 5
                            ? "Travel Policy"
                            : step === 6
                              ? "Upload Documents"
                              : "All Set! 🎉"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
            >
              <MdClose className="text-lg" />
            </button>
          </div>

          {/* Step tracker */}
          {step > 0 && step < TOTAL - 1 && <StepTracker step={step} />}

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6"
          >
            {renderStep()}
          </div>

          {/* Footer — hide on step 0 (Step0 has its own CTA) and last step */}
          {step > 0 && !isLast && (
            <div className="shrink-0 border-t border-slate-50 px-8 py-5 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <MdArrowBack className="text-base" /> Back
                </button>
                <button
                  onClick={goNext}
                  disabled={onboardingLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/30 hover:shadow-blue-400/50 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 transition-all"
                >
                  {onboardingLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{" "}
                      Submitting...
                    </>
                  ) : (
                    <>
                      {nextLabel()}{" "}
                      {step < TOTAL - 2 && (
                        <MdArrowForward className="text-base" />
                      )}
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-[11px] text-slate-500">
                  Step {step} of {TOTAL - 2} —{" "}
                  {Math.round(((step - 1) / (TOTAL - 2)) * 100)}% complete
                </p>
                <p className="text-[11px] text-slate-500">
                  🔒 256-bit SSL encrypted
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
