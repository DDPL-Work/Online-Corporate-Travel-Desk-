import React, { useEffect, useState, useRef } from "react";
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

// ── SSO Brand Icons ───────────────────────────────────────────────────────────
export const GoogleIcon = ({ size = 22 }) => (
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

export const MicrosoftIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 23 23">
    <rect fill="#F25022" x="1" y="1" width="10" height="10" />
    <rect fill="#7FBA00" x="12" y="1" width="10" height="10" />
    <rect fill="#00A4EF" x="1" y="12" width="10" height="10" />
    <rect fill="#FFB900" x="12" y="12" width="10" height="10" />
  </svg>
);

export const ZohoIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 10.5V16.5L12 21L3 16.5V10.5L12 15L21 10.5Z" fill="#089949" />
    <path d="M12 15L3 10.5V4.5L12 9L21 4.5V10.5L12 15Z" fill="#089949" />
  </svg>
);

// ── Images ────────────────────────────────────────────────────────────────────
export const PANEL_IMAGES = [
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

export const LEFT_PANEL_CONTENT = [
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
    tag: "Step 1 of 6",
    title: "Tell us about your company",
    sub: "We'll tailor your travel program to your organisation's size and needs.",
    stats: [
      { v: "2 min", l: "Setup Time" },
      { v: "100%", l: "GST Ready" },
      { v: "Free", l: "Onboarding" },
    ],
  },
  {
    tag: "Step 2 of 6",
    title: "Who should we contact?",
    sub: "Add primary, secondary, and billing contacts for complete coverage.",
    stats: [
      { v: "Multi", l: "Contacts" },
      { v: "Instant", l: "Alerts" },
      { v: "24/7", l: "Support" },
    ],
  },
  {
    tag: "Step 3 of 6",
    title: "Where is your office?",
    sub: "Your registered address is used for GST invoices and compliance.",
    stats: [
      { v: "100%", l: "GST Compliant" },
      { v: "Pan", l: "India" },
      { v: "Auto", l: "Fill" },
    ],
  },
  {
    tag: "Step 4 of 6",
    title: "Secure SSO for your team",
    sub: "Employees log in with existing corporate credentials — no extra passwords.",
    stats: [
      { v: "0", l: "Extra Passwords" },
      { v: "Auto", l: "Provisioning" },
      { v: "Safe", l: "SAML 2.0" },
    ],
  },
  //   {
  //     tag: "Step 5 of 7",
  //     title: "Set your billing terms",
  //     sub: "Choose how and when you want to receive consolidated invoices.",
  //     stats: [
  //       { v: "₹50L", l: "Credit Line" },
  //       { v: "GST", l: "Invoices" },
  //       { v: "Net-30", l: "Terms" },
  //     ],
  //   },
  {
    tag: "Step 5 of 6",
    title: "Define your travel policy",
    sub: "Control what your employees can book — cabin class, budget, advance days.",
    stats: [
      { v: "100%", l: "Compliance" },
      { v: "Auto", l: "Enforcement" },
      { v: "0", l: "Exceptions" },
    ],
  },
  {
    tag: "Step 6 of 6",
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
export const STEPS = [
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
export const Label = ({ children, required }) => (
  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-[0.12em] mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

export const Inp = ({
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

export const RichSelect = ({ value, onChange, options, icon }) => {
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

export const Hint = ({ children }) => (
  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{children}</p>
);

export const F = ({ label, required, hint, children }) => (
  <div>
    <Label required={required}>{label}</Label>
    {children}
    {hint && <Hint>{hint}</Hint>}
  </div>
);

export const Grid = ({ cols = 2, children }) => (
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

export const Toggle = ({ checked, onChange, label }) => (
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

export const Divider = ({ label }) => (
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

export const ContactGroup = ({ color, title, optional, fields }) => (
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
export const LeftPanel = ({ step }) => {
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
export const StepTracker = ({ step }) => {
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
