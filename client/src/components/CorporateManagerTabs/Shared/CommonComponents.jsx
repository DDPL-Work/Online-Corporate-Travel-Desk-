// ── shared small components ───────────────────────────────────────────────────

import { FiClock, FiSearch } from "react-icons/fi";

export const IdCell = ({ id }) => (
  <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
    #{id}
  </span>
);

export const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <FiSearch
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      size={14}
    />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none transition-colors focus:border-red-400 placeholder:text-slate-400"
    />
  </div>
);

export const LabeledField = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);

export const selectCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none cursor-pointer focus:border-slate-400 transition-colors";
export const dateCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-slate-400 transition-colors";

  // ── shared small components ───────────────────────────────────────────────────

export const statusStyles = {
  Confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  voucher_generated: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Pending: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  Cancelled: "bg-red-50    text-red-700    ring-1 ring-red-200",
  Failed: "bg-red-50    text-red-700    ring-1 ring-red-200",
};
export const dotStyles = {
  Confirmed: "bg-emerald-500",
  voucher_generated: "bg-emerald-500",
  Pending: "bg-amber-500",
  Cancelled: "bg-red-500",
  Failed: "bg-red-500",
};

export const StatCard = ({
  label,
  value,
  iconBgCls,
  iconColorCls,
  borderCls,
  Icon,
}) => (
  <div
    className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
    >
      <Icon size={18} className={iconColorCls} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  </div>
);

export const Th = ({ children }) => (
  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest whitespace-nowrap select-none">
    {children}
  </th>
);

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-600 ${statusStyles[status] || statusStyles.Pending}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[status] || dotStyles.Pending}`}
    />
    {status}
  </span>
);

export const DualCell = ({ primary, secondary }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-semibold text-slate-800 text-[13px]">{primary}</span>
    <span className="font-mono text-[11px] text-slate-400">{secondary}</span>
  </div>
);

export const Avatar = ({ name, bgClass, textClass }) => (
  <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${bgClass} ${textClass}`}
  >
    {name[0]}
  </div>
);


export const SectionLabel = ({ icon, title }) => (
  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">{icon} {title}</h3>
);

export const InfoBadge = ({ color, children }) => {
  const c = { teal:"bg-teal-100 text-teal-700", blue:"bg-blue-100 text-blue-700", green:"bg-green-100 text-green-700", red:"bg-red-100 text-red-700", amber:"bg-amber-100 text-amber-700", gray:"bg-slate-100 text-slate-600", sky:"bg-sky-100 text-sky-700" };
  return <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase flex items-center ${c[color]||c.gray}`}>{children}</span>;
};

export const MiniStatCard = ({ label, value, sub }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export const getSegCity = (seg, type = "origin") =>
  seg?.[type]?.city ||
  seg?.[type]?.City ||
  seg?.[type]?.Airport?.CityName ||
  "N/A";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
export const ExecStatusBadge = ({ status }) => {
  const map = {
    not_started: "bg-slate-100 text-slate-600",
    failed: "bg-red-50 text-red-700",
    cancel_requested: "bg-orange-50 text-orange-700",
    voucher_generated: "bg-teal-50 text-teal-700",
    ticketed: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[status] || "bg-slate-100 text-slate-600"}`}
    >
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
};

export const TraceTimer = ({ timer }) => {
  if (!timer) return null;
  const expired = timer === "expired";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${expired ? "bg-red-50 text-red-600 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}
    >
      <FiClock size={10} />
      {expired ? "Fare Expired" : timer}
    </span>
  );
};
export const InfoRow = ({ label, value, mono, padded, capitalize }) => (
  <div
    className={`flex items-center justify-between ${padded ? "px-4 py-2.5" : "py-1"}`}
  >
    <span className="text-xs text-slate-500">{label}</span>
    <span
      className={`text-xs font-semibold text-slate-800 ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
    >
      {value || "—"}
    </span>
  </div>
);


export const RatingStars = ({ rating }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`text-sm ${star <= rating ? "text-amber-400" : "text-slate-200"}`}
      >
        ★
      </span>
    ))}
    <span className="text-[11px] text-slate-400 ml-1">{rating}/5</span>
  </div>
);