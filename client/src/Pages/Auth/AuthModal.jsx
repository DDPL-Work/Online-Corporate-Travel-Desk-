import { useState, useEffect, useRef } from "react";
import {
  MdFlightTakeoff,
  MdClose,
  MdArrowForward,
  MdArrowBack,
  MdCheckCircle,
  MdBusiness,
  MdPerson,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdCreditCard,
  MdPolicy,
  MdAccountBalance,
  MdUploadFile,
  MdLink,
  MdDone,
  MdSecurity,
  MdVerified,
  MdCorporateFare,
  MdAttachMoney,
  MdKeyboardArrowDown,
  MdAutoGraph,
  MdGroups,
  MdShield,
  MdStar,
} from "react-icons/md";
import { BsCheckLg } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { onboardCorporate } from "../../Redux/Actions/registrationThunks";
import { ToastWithTimer } from "../../utils/ToastConfirm";

// ── SSO Brand Icons ───────────────────────────────────────────────────────────
const GoogleIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.02 1.53 7.4 2.8l5.44-5.44C33.44 3.64 29.1 1.5 24 1.5 14.62 1.5 6.56 6.98 2.78 14.98l6.58 5.1C11.2 14.28 17.1 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24.5c0-1.64-.15-3.21-.43-4.74H24v9.01h12.7c-.55 2.97-2.23 5.48-4.75 7.18l7.3 5.67c4.27-3.94 6.25-9.75 6.25-17.12z"
    />
    <path
      fill="#FBBC05"
      d="M9.36 28.08a14.7 14.7 0 0 1-.77-4.58c0-1.6.27-3.15.77-4.58l-6.58-5.1C1.03 17.07 0 20.46 0 23.5s1.03 6.43 2.78 9.18l6.58-5.1z"
    />
    <path
      fill="#34A853"
      d="M24 46.5c5.1 0 9.39-1.69 12.52-4.58l-7.3-5.67c-2.02 1.36-4.6 2.15-7.22 2.15-6.9 0-12.8-4.78-14.64-11.58l-6.58 5.1C6.56 40.02 14.62 46.5 24 46.5z"
    />
  </svg>
);

const MicrosoftIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 23 23">
    <rect fill="#F25022" x="1" y="1" width="10" height="10" />
    <rect fill="#7FBA00" x="12" y="1" width="10" height="10" />
    <rect fill="#00A4EF" x="1" y="12" width="10" height="10" />
    <rect fill="#FFB900" x="12" y="12" width="10" height="10" />
  </svg>
);

const ZohoIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 10.5V16.5L12 21L3 16.5V10.5L12 15L21 10.5Z" fill="#089949" />
    <path d="M12 15L3 10.5V4.5L12 9L21 4.5V10.5L12 15Z" fill="#089949" />
  </svg>
);

// ── Images ────────────────────────────────────────────────────────────────────
const PANEL_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=85", // aircraft
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=85", // hotel lobby
  "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?w=800&q=85", // airport terminal
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=85", // office
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=85", // team meeting
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=85", // hotel room
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=85", // handshake
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=85", // globe
  "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=800&q=85", // plane window
];

const LEFT_PANEL_CONTENT = [
  {
    tag: "Welcome",
    title: "Corporate Travel, Reimagined",
    sub: "Join 5,000+ companies managing smarter business travel.",
    stats: [
      { v: "30%", l: "Cost Savings" },
      { v: "24/7", l: "Support" },
      { v: "500+", l: "Airlines" },
    ],
  },
  {
    tag: "Step 1 of 7",
    title: "Tell us about your company",
    sub: "We'll tailor your travel program to your organisation's size and needs.",
    stats: [
      { v: "2 min", l: "Setup Time" },
      { v: "100%", l: "GST Ready" },
      { v: "Free", l: "Onboarding" },
    ],
  },
  {
    tag: "Step 2 of 7",
    title: "Who should we contact?",
    sub: "Add primary, secondary, and billing contacts for complete coverage.",
    stats: [
      { v: "Multi", l: "Contacts" },
      { v: "Instant", l: "Alerts" },
      { v: "24/7", l: "Support" },
    ],
  },
  {
    tag: "Step 3 of 7",
    title: "Where is your office?",
    sub: "Your registered address is used for GST invoices and compliance.",
    stats: [
      { v: "100%", l: "GST Compliant" },
      { v: "Pan", l: "India" },
      { v: "Auto", l: "Fill" },
    ],
  },
  {
    tag: "Step 4 of 7",
    title: "Secure SSO for your team",
    sub: "Employees log in with existing corporate credentials — no extra passwords.",
    stats: [
      { v: "0", l: "Extra Passwords" },
      { v: "Auto", l: "Provisioning" },
      { v: "Safe", l: "SAML 2.0" },
    ],
  },
  {
    tag: "Step 5 of 7",
    title: "Set your billing terms",
    sub: "Choose how and when you want to receive consolidated invoices.",
    stats: [
      { v: "₹50L", l: "Credit Line" },
      { v: "GST", l: "Invoices" },
      { v: "Net-30", l: "Terms" },
    ],
  },
  {
    tag: "Step 6 of 7",
    title: "Define your travel policy",
    sub: "Control what your employees can book — cabin class, budget, advance days.",
    stats: [
      { v: "100%", l: "Compliance" },
      { v: "Auto", l: "Enforcement" },
      { v: "0", l: "Exceptions" },
    ],
  },
  {
    tag: "Step 7 of 7",
    title: "Final step — documents",
    sub: "Upload GST & PAN for verification. Takes less than 2 minutes.",
    stats: [
      { v: "2 hr", l: "Verification" },
      { v: "Secure", l: "Storage" },
      { v: "ISO", l: "27001" },
    ],
  },
  {
    tag: "All Done!",
    title: "Your account is being activated",
    sub: "Sit back — our team will have you booking in under 24 hours.",
    stats: [
      { v: "<24h", l: "Activation" },
      { v: "Dedicated", l: "Manager" },
      { v: "Free", l: "Training" },
    ],
  },
];

// ── Step labels ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Access", icon: <MdSecurity /> },
  { id: 1, label: "Company", icon: <MdCorporateFare /> },
  { id: 2, label: "Contacts", icon: <MdPerson /> },
  { id: 3, label: "Address", icon: <MdLocationOn /> },
  { id: 4, label: "SSO", icon: <MdShield /> },
  { id: 5, label: "Billing", icon: <MdCreditCard /> },
  { id: 6, label: "Policy", icon: <MdPolicy /> },
  { id: 7, label: "Docs", icon: <MdUploadFile /> },
  { id: 8, label: "Done", icon: <MdDone /> },
];

// ── Tiny UI atoms ─────────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-[0.12em] mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Inp = ({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  disabled,
  error,
}) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">
        {icon}
      </span>
    )}

    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full ${icon ? "pl-10" : "pl-3.5"} pr-3.5 py-3 rounded-xl border text-sm transition-all
        ${
          error
            ? "border-red-400 bg-red-50 focus:ring-red-200"
            : "border-slate-200 bg-white focus:ring-blue-500/20 focus:border-blue-500"
        }
        ${disabled ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:border-slate-300"}
      `}
    />

    {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
  </div>
);

const RichSelect = ({ value, onChange, options, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => (o.value || o) === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between pl-3.5 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <span className="font-medium text-slate-700">
            {selected.label || selected}
          </span>
        </div>
        <MdKeyboardArrowDown
          className={`text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          {options.map((o) => {
            const val = o.value || o;
            const label = o.label || o;
            const active = val === value;

            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {o.icon && <span>{o.icon}</span>}
                  <span className="font-medium">{label}</span>
                </div>
                {active && <BsCheckLg className="text-blue-600 text-xs" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Hint = ({ children }) => (
  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{children}</p>
);

const F = ({ label, required, hint, children }) => (
  <div>
    <Label required={required}>{label}</Label>
    {children}
    {hint && <Hint>{hint}</Hint>}
  </div>
);

const Grid = ({ cols = 2, children }) => (
  <div
    className={`grid ${
      cols === 1
        ? "grid-cols-1"
        : cols === 2
          ? "grid-cols-2"
          : cols === 3
            ? "grid-cols-3"
            : "grid-cols-2"
    } gap-3`}
  >
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <div
    className="flex items-center gap-3 cursor-pointer"
    onClick={() => onChange(!checked)}
  >
    <div
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? "left-6" : "left-1"}`}
      />
    </div>
    <span className="text-sm text-slate-600 font-medium select-none">
      {label}
    </span>
  </div>
);

const Divider = ({ label }) => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-slate-100" />
    {label && (
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
    )}
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const ContactGroup = ({ color, title, optional, fields }) => (
  <div className="rounded-2xl border border-slate-100 overflow-hidden">
    <div className={`flex items-center gap-2.5 px-4 py-3 ${color}`}>
      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
        <MdPerson className="text-white text-xs" />
      </div>
      <span className="font-black text-white text-xs uppercase tracking-wider">
        {title}
      </span>
      {optional && (
        <span className="ml-auto text-white/50 text-xs font-medium">
          Optional
        </span>
      )}
    </div>
    <div className="p-4 space-y-3 bg-white">{fields}</div>
  </div>
);

// ── Left decorative panel ─────────────────────────────────────────────────────
const LeftPanel = ({ step }) => {
  const c = LEFT_PANEL_CONTENT[Math.min(step, LEFT_PANEL_CONTENT.length - 1)];
  const img = PANEL_IMAGES[Math.min(step, PANEL_IMAGES.length - 1)];

  return (
    <div className="relative w-[340px] shrink-0 overflow-hidden rounded-l-3xl">
      {/* Bg image */}
      <img
        src={img}
        alt=""
        key={img}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-950/90 via-blue-900/80 to-slate-900/90" />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent" />
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <MdFlightTakeoff className="text-white text-lg" />
          </div>
          <div>
            <div
              className="font-black text-white text-base leading-none"
              style={{ fontFamily: "'Outfit',sans-serif" }}
            >
              COTD
            </div>
            <div className="text-cyan-300 text-[8px] font-bold tracking-[0.2em] mt-0.5">
              CORPORATE TRAVEL DESK
            </div>
          </div>
        </div>

        {/* Middle content */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-5">
            <HiSparkles className="text-yellow-400 text-xs" />
            <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
              {c.tag}
            </span>
          </div>
          <h2
            className="font-black text-white leading-tight mb-3"
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: "22px" }}
          >
            {c.title}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">{c.sub}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-7">
            {c.stats.map((s, i) => (
              <div
                key={i}
                className="bg-white/8 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm"
              >
                <p
                  className="font-black text-white text-base"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {s.v}
                </p>
                <p className="text-white/45 text-[10px] font-semibold mt-0.5">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="space-y-2">
          {[
            {
              icon: <MdShield className="text-green-400 text-sm" />,
              text: "ISO 27001 Certified & RBI Compliant",
            },
            {
              icon: <MdVerified className="text-blue-400 text-sm" />,
              text: "GST Invoice on every booking",
            },
            {
              icon: <MdStar className="text-yellow-400 text-sm" />,
              text: "4.9★ rated by 2,000+ companies",
            },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <span className="text-white/55 text-xs font-medium">
                {b.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Step progress tracker (right side top) ────────────────────────────────────
const StepTracker = ({ step }) => {
  if (step === 0 || step === STEPS.length - 1) return null;
  const onboardSteps = STEPS.slice(1, -1); // steps 1–7
  const progress = ((step - 1) / (onboardSteps.length - 1)) * 100;

  return (
    <div className="px-8 pt-5 pb-4 border-b border-slate-50">
      {/* Step pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {onboardSteps.map((s, i) => {
          const idx = i + 1;
          const done = idx < step;
          const active = idx === step;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black transition-all ${done ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-50 text-slate-500 border border-slate-100"}`}
              >
                <span
                  className={`text-xs ${done ? "text-emerald-500" : active ? "text-white" : "text-slate-500"}`}
                >
                  {done ? <BsCheckLg /> : s.icon}
                </span>
                <span className="uppercase tracking-wide">{s.label}</span>
              </div>
              {i < onboardSteps.length - 1 && (
                <div
                  className={`w-3 h-px ${done ? "bg-emerald-300" : "bg-slate-100"}`}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// ── STEP CONTENTS ─────────────────────────────────────────────────────────────

// Step 0 — Access (Email + SSO Icons)
const Step0 = ({ onNext, onRegister, form, setForm }) => {
  const sso = [
    { key: "google", icon: <GoogleIcon size={22} /> },
    { key: "microsoft", icon: <MicrosoftIcon size={22} /> },
    { key: "zoho", icon: <ZohoIcon size={22} /> },
  ];

  const handleEmailContinue = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      ToastWithTimer({
        message: "Please enter a valid work email",
        type: "error",
      });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div>
        <h3
          className="font-black text-slate-800 text-xl mb-1"
          style={{ fontFamily: "'Outfit',sans-serif" }}
        >
          Access your corporate travel desk
        </h3>
        <p className="text-slate-400 text-sm">
          Enter your work email to continue. We'll detect your company
          automatically.
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-3">
        <div className="relative">
          <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={handleEmailContinue}
          className="w-full py-3 rounded-2xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/40 hover:-translate-y-0.5 transition-all"
        >
          Continue
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Or sign in with
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* SSO Icon Row */}
      <div className="flex items-center justify-center gap-5">
        {sso.map((s) => (
          <button
            key={s.key}
            onClick={() => onNext(s.key)}
            className="w-14 h-14 rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
          >
            {s.icon}
          </button>
        ))}
      </div>

      {/* Register CTA */}
      <div className="text-center pt-2">
        <p className="text-sm text-slate-500">
          New company?
          <button
            onClick={onRegister}
            className="ml-2 font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Register your company
          </button>
        </p>
      </div>

      {/* Footer Note */}
      <p className="text-center text-xs text-slate-400 pt-3">
        Secure SSO access powered by your organization’s identity provider.
      </p>
    </div>
  );
};

// Step 1 — Company
const Step1 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <F label="Legal Company Name" required>
      <Inp
        icon={<MdBusiness />}
        value={form.corporateName}
        onChange={(v) => setForm({ ...form, corporateName: v })}
        placeholder="Acme Enterprises Pvt. Ltd."
        error={errors.corporateName}
      />
    </F>

    <Grid>
      <F
        label="Account Type"
        required
        hint="Prepaid = top-up wallet. Postpaid = invoice billing."
      >
        <RichSelect
          icon={<MdCorporateFare />}
          value={form.classification}
          onChange={(v) =>
            setForm({
              ...form,
              classification: v,
              ...(v === "prepaid"
                ? {
                    creditLimit: 0,
                    billingCycle: "30days",
                    customBillingDays: "",
                  }
                : {
                    walletBalance: 0,
                  }),
            })
          }
          options={[
            {
              value: "prepaid",
              label: "Prepaid",
              icon: <MdAccountBalance className="text-blue-500" />,
            },
            {
              value: "postpaid",
              label: "Postpaid",
              icon: <MdCreditCard className="text-orange-500" />,
            },
          ]}
        />
      </F>
      <F label="Default Approver" required>
        <RichSelect
          value={form.defaultApprover}
          onChange={(v) => setForm({ ...form, defaultApprover: v })}
          options={[
            { value: "travel-admin", label: "Travel Admin" },
            { value: "manager", label: "Line Manager" },
          ]}
        />
      </F>
    </Grid>

    {form.classification === "prepaid" && (
      <F
        label="Starting Wallet Balance (₹)"
        hint="Initial credit loaded into the corporate wallet"
      >
        <Inp
          icon={<MdAccountBalance />}
          value={form.walletBalance}
          onChange={(v) => setForm({ ...form, walletBalance: v })}
          placeholder="0"
          type="number"
        />
      </F>
    )}

    {/* Classification info card */}
    <div
      className={`rounded-xl p-4 border text-xs leading-relaxed ${form.classification === "postpaid" ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}
    >
      {form.classification === "postpaid"
        ? "📋 Postpaid: Book now, pay later. Receive a consolidated GST invoice at the end of each billing cycle. Credit limit required."
        : "💳 Prepaid: Add funds to your wallet. All bookings are deducted in real-time. Great for budget control."}
    </div>
  </div>
);

// Step 2 — Contacts
const Step2 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <ContactGroup
      color="bg-gradient-to-r from-blue-600 to-blue-700"
      title="Primary Contact"
      fields={
        <div className="space-y-3">
          <F label="Full Name" required>
            <Inp
              icon={<MdPerson />}
              value={form.primaryName}
              onChange={(v) => setForm({ ...form, primaryName: v })}
              placeholder="Rajesh Kumar"
              error={errors.primaryName}
            />
          </F>
          <Grid>
            <F label="Email" required>
              <Inp
                icon={<MdEmail />}
                value={form.primaryEmail}
                onChange={(v) => setForm({ ...form, primaryEmail: v })}
                placeholder="rajesh@company.com"
                type="email"
                error={errors.primaryEmail}
              />
            </F>
            <F label="Mobile" required>
              <Inp
                icon={<MdPhone />}
                value={form.primaryMobile}
                onChange={(v) => setForm({ ...form, primaryMobile: v })}
                placeholder="+91 98765 43210"
                type="tel"
                error={errors.primaryMobile}
              />
            </F>
          </Grid>
        </div>
      }
    />

    <ContactGroup
      color="bg-gradient-to-r from-slate-500 to-slate-600"
      title="Secondary Contact"
      optional
      fields={
        <div className="space-y-3">
          <F label="Full Name">
            <Inp
              icon={<MdPerson />}
              value={form.secondaryName}
              onChange={(v) => setForm({ ...form, secondaryName: v })}
              placeholder="Priya Sharma"
              error={errors.secondaryName}
            />
          </F>
          <Grid>
            <F label="Email">
              <Inp
                icon={<MdEmail />}
                value={form.secondaryEmail}
                onChange={(v) => setForm({ ...form, secondaryEmail: v })}
                placeholder="priya@company.com"
                type="email"
                error={errors.secondaryEmail}
              />
            </F>
            <F label="Mobile">
              <Inp
                icon={<MdPhone />}
                value={form.secondaryMobile}
                onChange={(v) => setForm({ ...form, secondaryMobile: v })}
                placeholder="+91 98765 43211"
                type="tel"
                error={errors.secondaryMobile}
              />
            </F>
          </Grid>
        </div>
      }
    />

    <ContactGroup
      color="bg-gradient-to-r from-orange-500 to-orange-600"
      title="Billing Department"
      fields={
        <div className="space-y-3">
          <F label="Contact Name">
            <Inp
              icon={<MdPerson />}
              value={form.billingName}
              onChange={(v) => setForm({ ...form, billingName: v })}
              placeholder="Finance Team / Accounts"
              error={errors.billingName}
            />
          </F>
          <Grid>
            <F label="Billing Email">
              <Inp
                icon={<MdEmail />}
                value={form.billingEmail}
                onChange={(v) => setForm({ ...form, billingEmail: v })}
                placeholder="billing@company.com"
                type="email"
                error={errors.billingEmail}
              />
            </F>
            <F label="Mobile">
              <Inp
                icon={<MdPhone />}
                value={form.billingMobile}
                onChange={(v) => setForm({ ...form, billingMobile: v })}
                placeholder="+91 98765 43212"
                type="tel"
                error={errors.billingMobile}
              />
            </F>
          </Grid>
        </div>
      }
    />
  </div>
);

// Step 3 — Address
const Step3 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <F label="Street Address / Building">
      <Inp
        icon={<MdLocationOn />}
        value={form.street}
        onChange={(v) => setForm({ ...form, street: v })}
        placeholder="Plot 12, Cyber City, DLF Phase 3"
        error={errors.street}
      />
    </F>
    <Grid>
      <F label="City">
        <Inp
          value={form.city}
          onChange={(v) => setForm({ ...form, city: v })}
          placeholder="Gurugram"
          error={errors.city}
        />
      </F>
      <F label="State">
        <Inp
          value={form.state}
          onChange={(v) => setForm({ ...form, state: v })}
          placeholder="Haryana"
          error={errors.state}
        />
      </F>
    </Grid>
    <Grid>
      <F label="Pincode">
        <Inp
          value={form.pincode}
          onChange={(v) => setForm({ ...form, pincode: v })}
          placeholder="122001"
          error={errors.pincode}
        />
      </F>
      <F label="Country">
        <Inp
          value={form.country}
          onChange={(v) => setForm({ ...form, country: v })}
          placeholder="India"
          error={errors.country}
        />
      </F>
    </Grid>

    {/* Address preview card */}
    <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
      <div
        className="h-28 relative flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#e0f2fe,#bfdbfe)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-300/50 mb-1">
            <MdLocationOn className="text-white text-lg" />
          </div>
          <div className="bg-white rounded-xl px-3 py-1.5 shadow-md text-xs font-bold text-slate-700 text-center max-w-[200px]">
            {form.city && form.state
              ? `${form.city}, ${form.state}`
              : "Address preview"}
          </div>
        </div>
      </div>
      {form.street && (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            {[form.street, form.city, form.state, form.pincode, form.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  </div>
);

// Step 4 — SSO Config
const Step4 = ({ form, setForm, errors }) => {
  const providers = [
    {
      value: "google",
      label: "Google Workspace",
      icon: <GoogleIcon size={20} />,
      desc: "G Suite / Google Workspace",
    },
    {
      value: "microsoft",
      label: "Microsoft Azure AD",
      icon: <MicrosoftIcon size={20} />,
      desc: "Microsoft 365 / Azure",
    },
    {
      value: "zoho",
      label: "Zoho Directory",
      icon: <ZohoIcon size={20} />,
      desc: "Zoho One / Zoho People",
    },
    {
      value: "saml",
      label: "Custom SAML 2.0",
      icon: <MdSecurity className="text-lg text-slate-500" />,
      desc: "Enterprise IdP / Okta / PingID",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 leading-relaxed">
        Select the identity provider your company uses. Employees will log in
        automatically without extra passwords.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setForm({ ...form, ssoType: p.value })}
            className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all ${form.ssoType === p.value ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {p.icon}
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.ssoType === p.value ? "border-blue-500 bg-blue-500" : "border-slate-200"}`}
              >
                {form.ssoType === p.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div>
              <p
                className={`font-black text-xs ${form.ssoType === p.value ? "text-blue-700" : "text-slate-700"}`}
              >
                {p.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <F
        label="Corporate Email Domain"
        required
        hint="e.g. yourcompany.com — all employees with this domain can log in automatically"
      >
        <Inp
          icon={<MdBusiness />}
          value={form.ssoDomain}
          onChange={(v) => setForm({ ...form, ssoDomain: v })}
          placeholder="yourcompany.com"
          error={errors.ssoDomain}
        />
      </F>

      {form.ssoType === "saml" && (
        <F
          label="SAML Metadata URL"
          hint="Your IdP metadata XML URL for SAML 2.0 configuration"
        >
          <Inp
            icon={<MdLink />}
            value={form.samlMetadata || ""}
            onChange={(v) => setForm({ ...form, samlMetadata: v })}
            placeholder="https://idp.yourcompany.com/metadata.xml"
          />
        </F>
      )}

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
        <p className="text-xs font-black text-emerald-700 mb-2">
          🔒 SSO Benefits
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            "No extra passwords",
            "Auto employee sync",
            "IT-controlled access",
            "Zero login friction",
          ].map((t) => (
            <div
              key={t}
              className="flex items-center gap-1.5 text-xs text-emerald-700"
            >
              <BsCheckLg className="text-emerald-500 shrink-0" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Step 5 — Billing
const Step5 = ({ form, setForm, errors }) => {
  // 🟢 PREPAID FLOW
  if (form.classification === "prepaid") {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          💳 Prepaid Account
          <br />
          • Bookings deduct instantly from wallet
          <br />
          • No credit limit
          <br />• No billing cycle
        </div>

        <F label="Wallet Balance (₹)">
          <Inp
            icon={<MdAccountBalance />}
            value={form.walletBalance}
            onChange={(v) => setForm({ ...form, walletBalance: v })}
            type="number"
          />
        </F>
      </div>
    );
  }

  // 🔵 POSTPAID FLOW
  return (
    <div className="space-y-4">
      <Grid cols={2}>
        <F label="Billing Cycle" required>
          <RichSelect
            icon={<MdCreditCard />}
            value={form.billingCycle}
            onChange={(v) => setForm({ ...form, billingCycle: v })}
            options={[
              { value: "15days", label: "Every 15 Days" },
              { value: "30days", label: "Monthly (30d)" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </F>

        {form.billingCycle === "custom" && (
          <F label="Custom Days" required>
            <Inp
              value={form.customBillingDays}
              onChange={(v) => setForm({ ...form, customBillingDays: v })}
              type="number"
            />
          </F>
        )}
      </Grid>

      <F
        label="Credit Limit (₹)"
        required
        hint="Max outstanding before payment is required"
      >
        <Inp
          icon={<MdAttachMoney />}
          value={form.creditLimit}
          onChange={(v) => setForm({ ...form, creditLimit: v })}
          type="number"
          error={errors.creditLimit}
        />
      </F>
    </div>
  );
};

// Step 6 — Travel Policy
const Step6 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <F
      label="Allowed Cabin Classes"
      required
      hint="Employees can only book selected classes"
    >
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        {["Economy", "Premium Economy", "Business", "First"].map((opt) => {
          const on = form.allowedCabinClass.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  allowedCabinClass: on
                    ? form.allowedCabinClass.filter((v) => v !== opt)
                    : [...form.allowedCabinClass, opt],
                })
              }
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${on ? "border-blue-500 bg-blue-500" : "border-slate-200"}`}
              >
                {on && <BsCheckLg className="text-white text-xs" />}
              </div>
              {opt}
            </button>
          );
        })}
      </div>
    </F>

    <Grid>
      <F label="Max Booking Amount (₹)" hint="0 = unlimited">
        <Inp
          icon={<MdAttachMoney />}
          value={form.maxBookingAmount}
          onChange={(v) => setForm({ ...form, maxBookingAmount: v })}
          placeholder="0"
          type="number"
        />
      </F>
      <F label="Advance Booking (Days)" hint="Min. days before travel">
        <Inp
          icon={<MdPolicy />}
          value={form.advanceBookingDays}
          onChange={(v) => setForm({ ...form, advanceBookingDays: v })}
          placeholder="0"
          type="number"
        />
      </F>
    </Grid>

    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
      <Toggle
        checked={form.allowAncillaryServices}
        onChange={(v) => setForm({ ...form, allowAncillaryServices: v })}
        label="Allow seat selection, extra baggage & in-flight meals"
      />
    </div>

    {/* Live preview */}
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2.5">
        📋 Policy Preview
      </p>
      <div className="space-y-1.5">
        {[
          {
            l: "Cabins",
            v: form.allowedCabinClass.join(", ") || "None selected",
          },
          {
            l: "Max amount",
            v:
              +form.maxBookingAmount > 0
                ? `₹${(+form.maxBookingAmount).toLocaleString()}`
                : "Unlimited",
          },
          {
            l: "Advance booking",
            v:
              +form.advanceBookingDays > 0
                ? `${form.advanceBookingDays} days minimum`
                : "No restriction",
          },
          {
            l: "Ancillaries",
            v: form.allowAncillaryServices ? "Allowed" : "Not allowed",
          },
        ].map((row) => (
          <div
            key={row.l}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-emerald-600/70">{row.l}</span>
            <span className="font-bold text-emerald-800">{row.v}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Step 7 — Documents
const DocUpload = ({
  title,
  icon,
  mode,
  setMode,
  file,
  setFile,
  url,
  setUrl,
  errors = {},
}) => (
  <div className="rounded-2xl border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
        {icon}
      </div>
      <span className="font-black text-slate-700 text-sm">{title}</span>
      <span className="ml-auto text-slate-400 text-xs">PDF or Image</span>
    </div>
    <div className="p-4 bg-white">
      <div className="flex gap-2 mb-3">
        {["file", "url"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all border ${mode === m ? "border-blue-500 bg-blue-600 text-white" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
          >
            {m === "file" ? (
              <MdUploadFile className="text-sm" />
            ) : (
              <MdLink className="text-sm" />
            )}
            {m === "file" ? "Upload" : "URL"}
          </button>
        ))}

        {errors.gstCertificate && (
          <p className="text-xs text-red-500 mt-2 font-medium">
            {errors.gstCertificate}
          </p>
        )}
      </div>
      {mode === "file" ? (
        <label
          className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200"}`}
        >
          {file ? (
            <>
              <MdCheckCircle className="text-3xl text-emerald-500 mb-1" />
              <span className="text-xs font-bold text-emerald-700">
                {file.name}
              </span>
              <span className="text-[10px] text-emerald-500 mt-0.5">
                Click to replace
              </span>
            </>
          ) : (
            <>
              <MdUploadFile className="text-3xl text-slate-500 mb-1.5" />
              <span className="text-xs font-semibold text-slate-400">
                Click to browse
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                or drag & drop
              </span>
            </>
          )}
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>
      ) : (
        <Inp
          icon={<MdLink />}
          value={url}
          onChange={setUrl}
          placeholder="https://drive.google.com/... or direct PDF link"
        />
      )}

      {errors.panCard && (
        <p className="text-xs text-red-500 mt-2 font-medium">
          {errors.panCard}
        </p>
      )}
    </div>
  </div>
);

const Step7 = ({ errors, ...props }) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-500 leading-relaxed">
      Upload your company documents or share secure links. Our compliance team
      verifies within 2 hours.
    </p>
    <DocUpload
      title="GST Certificate"
      icon={<MdVerified className="text-sm" />}
      mode={props.gstMode}
      setMode={props.setGstMode}
      file={props.gstFile}
      setFile={props.setGstFile}
      url={props.gstUrl}
      setUrl={props.setGstUrl}
      errors={errors}
    />
    <DocUpload
      title="PAN Card"
      icon={<MdCreditCard className="text-sm" />}
      mode={props.panMode}
      setMode={props.setPanMode}
      file={props.panFile}
      setFile={props.setPanFile}
      url={props.panUrl}
      setUrl={props.setPanUrl}
      errors={errors}
    />
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-700">
      <span className="text-lg">⏱</span>
      <span>
        <strong>Verification time:</strong> 2–4 business hours. You'll receive
        an email confirmation once your account is activated.
      </span>
    </div>
  </div>
);

// Step 8 — Done
const Step8 = ({ form }) => (
  <div className="text-center py-2">
    <div className="relative inline-flex mb-6">
      <div className="w-24 h-24 rounded-full bg-linear-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-300/40">
        <MdDone className="text-white text-5xl" />
      </div>
      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
        <HiSparkles className="text-white text-sm" />
      </div>
    </div>

    <h3
      className="font-black text-2xl text-slate-800 mb-2"
      style={{ fontFamily: "'Outfit',sans-serif" }}
    >
      Application Submitted!
    </h3>
    <p className="text-slate-400 text-sm mb-7 max-w-xs mx-auto leading-relaxed">
      Welcome aboard,{" "}
      <strong className="text-slate-700">
        {form.corporateName || "your company"}
      </strong>
      ! Confirmation will be sent to{" "}
      <strong className="text-blue-600">
        {form.primaryEmail || "your email"}
      </strong>
      .
    </p>

    <div className="bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-sm mb-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        What happens next
      </p>
      <div className="space-y-4">
        {[
          {
            num: "1",
            label: "Document Verification",
            desc: "GST & PAN checked by compliance",
            time: "~2 hrs",
            color: "bg-blue-600",
          },
          {
            num: "2",
            label: "Account Activation Email",
            desc: "Login credentials & portal access",
            time: "~3 hrs",
            color: "bg-purple-600",
          },
          {
            num: "3",
            label: "Dedicated Manager Assigned",
            desc: "Your travel desk point of contact",
            time: "~24 hrs",
            color: "bg-emerald-600",
          },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-4">
            <div
              className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md`}
            >
              {s.num}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-700 text-sm">{s.label}</p>
              <p className="text-slate-400 text-xs">{s.desc}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              {s.time}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="flex gap-3">
      <button className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 transition-colors">
        View Dashboard
      </button>
      <button className="flex-1 py-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/30 hover:-translate-y-0.5 hover:shadow-blue-400/40 transition-all">
        Book First Trip →
      </button>
    </div>
  </div>
);

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
    classification: "prepaid",
    defaultApprover: "travel-admin",
    walletBalance: 0,
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
    billingCycle: "30days",
    customBillingDays: "",
    creditLimit: 0,
    currentOutstanding: 0,
    creditTermsNotes: "",
    allowedCabinClass: ["Economy"],
    allowAncillaryServices: true,
    advanceBookingDays: 0,
    maxBookingAmount: 0,
  });

  const [errors, setErrors] = useState({});

  const [gstMode, setGstMode] = useState("file");
  const [gstFile, setGstFile] = useState(null);
  const [gstUrl, setGstUrl] = useState("");
  const [panMode, setPanMode] = useState("file");
  const [panFile, setPanFile] = useState(null);
  const [panUrl, setPanUrl] = useState("");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  const TOTAL = STEPS.length; // 9
  const isLast = step === TOTAL - 1;

  const validateStep = () => {
    let newErrors = {};

    switch (step) {
      case 1: // Company
        if (!form.corporateName.trim())
          newErrors.corporateName = "Company name is required";
        break;

      case 2: // Contacts
        if (!form.primaryName.trim())
          newErrors.primaryName = "Primary name is required";

        if (!form.primaryEmail.trim())
          newErrors.primaryEmail = "Primary email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail))
          newErrors.primaryEmail = "Invalid email format";

        if (!form.primaryMobile.trim())
          newErrors.primaryMobile = "Mobile number is required";
        break;

      case 3: // Address
        if (!form.city.trim()) newErrors.city = "City is required";
        if (!form.state.trim()) newErrors.state = "State is required";
        if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";
        break;

      case 4: // SSO
        if (!form.ssoDomain.trim())
          newErrors.ssoDomain = "Email domain is required";
        break;

      case 5: // Billing (postpaid only)
        if (form.classification === "postpaid") {
          if (!form.creditLimit || form.creditLimit <= 0)
            newErrors.creditLimit = "Credit limit must be greater than 0";
        }
        break;

      case 6: // Policy
        if (form.allowedCabinClass.length === 0)
          newErrors.allowedCabinClass = "Select at least one cabin class";
        break;

      case 7: // Documents
        if (!gstFile && !gstUrl)
          newErrors.gstCertificate = "GST document required";
        if (!panFile && !panUrl) newErrors.panCard = "PAN document required";
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    if (step === 7) {
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

  const submitOnboarding = async () => {
    const fd = new FormData();

    // BASIC
    fd.append("corporateName", form.corporateName);
    fd.append("classification", form.classification);

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

    // BILLING
    fd.append("billingCycle", form.billingCycle);
    fd.append("creditLimit", form.creditLimit);

    // SECONDARY CONTACT
    fd.append("secondaryContact[name]", form.secondaryName);
    fd.append("secondaryContact[email]", form.secondaryEmail);
    fd.append("secondaryContact[mobile]", form.secondaryMobile);

    // BILLING DEPARTMENT
    fd.append("billingDepartment[name]", form.billingName);
    fd.append("billingDepartment[email]", form.billingEmail);
    fd.append("billingDepartment[mobile]", form.billingMobile);

    // WALLET (for prepaid)
    fd.append("walletBalance", form.walletBalance);

    // DEFAULT APPROVER
    fd.append("defaultApprover", form.defaultApprover);

    // NOTES
    fd.append("creditTermsNotes", form.creditTermsNotes);

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

      ToastWithTimer({
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Onboarding failed. Please try again.",
        type: "error",
      });
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
      case 5:
        return <Step5 form={form} setForm={setForm} errors={errors} />;
      case 6:
        return <Step6 form={form} setForm={setForm} errors={errors} />;
      case 7:
        return (
          <Step7
            gstMode={gstMode}
            setGstMode={setGstMode}
            gstFile={gstFile}
            setGstFile={setGstFile}
            gstUrl={gstUrl}
            setGstUrl={setGstUrl}
            panMode={panMode}
            setPanMode={setPanMode}
            panFile={panFile}
            setPanFile={setPanFile}
            panUrl={panUrl}
            setPanUrl={setPanUrl}
            errors={errors}
          />
        );
      case 8:
        return <Step8 form={form} />;
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
                          : step === 5
                            ? "Billing & Credit"
                            : step === 6
                              ? "Travel Policy"
                              : step === 7
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
