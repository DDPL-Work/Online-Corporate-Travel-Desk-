import React, { useState, useEffect, useRef } from "react";
import { FiClock, FiSearch, FiChevronDown } from "react-icons/fi";
import { C } from "../../Shared/color";

export const IdCell = ({ id }) => (
  <span className="font-mono text-[11px] px-2 py-0.5 rounded tracking-wide" style={{ background: C.offWhite, color: C.navy }}>
    {id}
  </span>
);

export const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <FiSearch
      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      size={14}
      style={{ color: C.muted }}
    />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 border rounded-lg text-[13px] outline-none transition-colors placeholder:opacity-50"
      style={{ borderColor: C.border, color: C.nearBlack, background: C.white }}
    />
  </div>
);

export const LabeledField = ({ label, children, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>
      {label}
    </label>
    {children}
  </div>
);

export const selectCls =
  "w-full px-3 py-2 border rounded-lg text-[13px] bg-white outline-none cursor-pointer transition-colors";
export const dateCls =
  "w-full px-3 py-2 border rounded-lg text-[13px] bg-white outline-none transition-colors";

  // ── shared small components ───────────────────────────────────────────────────

export const statusStyles = {
  Confirmed: { background: `${C.emerald}10`, color: C.emerald, boxShadow: `0 0 0 1px ${C.emerald}30` },
  voucher_generated: { background: `${C.emerald}10`, color: C.emerald, boxShadow: `0 0 0 1px ${C.emerald}30` },
  Pending: { background: `${C.amber}10`, color: C.amber, boxShadow: `0 0 0 1px ${C.amber}30` },
  pending_approval: { background: `${C.amber}10`, color: C.amber, boxShadow: `0 0 0 1px ${C.amber}30` },
  approved: { background: `${C.emerald}10`, color: C.emerald, boxShadow: `0 0 0 1px ${C.emerald}30` },
  rejected: { background: "#FEF2F2", color: "#DC2626", boxShadow: "0 0 0 1px #FEE2E2" },
  Cancelled: { background: "#FEF2F2", color: "#DC2626", boxShadow: "0 0 0 1px #FEE2E2" },
};
export const dotStyles = {
  Confirmed: { background: C.emerald },
  voucher_generated: { background: C.emerald },
  Pending: { background: C.amber },
  pending_approval: { background: C.amber },
  approved: { background: C.emerald },
  rejected: { background: "#EF4444" },
  Cancelled: { background: "#EF4444" },
};

export const StatCard = ({
  label,
  value,
  iconBgCls,
  iconColorCls,
  borderCls,
  Icon,
  style = {},
}) => (
  <div
    className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    style={{ borderColor: C.gold, ...style }}
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
    >
      <Icon size={18} className={iconColorCls} />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: C.muted }}>
        {label}
      </p>
      <p className="text-xl font-black leading-none" style={{ color: C.navy }}>{value}</p>
    </div>
  </div>
);

export const Th = ({ children, className = "" }) => (
  <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest whitespace-nowrap select-none ${className}`}>
    {children}
  </th>
);

export const beautifyStatus = (s) => {
  if (!s || typeof s !== "string") return "—";
  if (s.toLowerCase() === "failed") return "Not Booked";
  if (s.toLowerCase() === "booking_initiated") return "Booking Initiated";
  return s
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const StatusBadge = ({ status }) => {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight"
      style={statusStyles[status] || statusStyles.Pending}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={dotStyles[status] || dotStyles.Pending}
      />
      {beautifyStatus(status)}
    </span>
  );
};

export const DualCell = ({ primary, secondary }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-semibold text-[13px]" style={{ color: C.nearBlack }}>{primary}</span>
    <span className="font-mono text-[11px]" style={{ color: C.muted }}>{secondary}</span>
  </div>
);

export const CustomDropdown = ({ value, onChange, options, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-lg text-[13px] flex items-center justify-between transition-all outline-none"
        style={{ borderColor: isOpen ? C.navy : C.border, background: C.white }}
      >
        <span className={!value ? "text-slate-400" : "font-medium"} style={{ color: value ? C.nearBlack : C.muted }}>
          {value || placeholder}
        </span>
        <FiChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: C.muted }}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in duration-100 origin-top max-h-60 overflow-y-auto custom-scrollbar" style={{ borderColor: C.border }}>
          {options.map((opt) => {
            const isObject = typeof opt === "object";
            const label = isObject ? opt.label : opt;
            const subLabel = isObject ? opt.subLabel : null;
            const optValue = isObject ? opt.value : opt;
            const isSelected = value === optValue;

            return (
              <button
                key={optValue}
                type="button"
                onClick={() => {
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-slate-50 flex flex-col gap-0.5"
                style={{ background: isSelected ? `${C.gold}10` : "transparent" }}
              >
                <span className={`text-[13px] ${isSelected ? "font-bold" : "font-medium"}`} style={{ color: isSelected ? C.navy : C.nearBlack }}>
                  {label}
                </span>
                {subLabel && (
                  <span className="text-[10px] font-mono" style={{ color: C.muted }}>
                    {subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Avatar = ({ name, bgClass, textClass }) => (
  <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${bgClass} ${textClass}`}
  >
    {name[0]}
  </div>
);


export const SectionLabel = ({ icon, title }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3" style={{ color: C.muted }}>{icon} {title}</h3>
);

export const InfoBadge = ({ color, children }) => {
  const c = { 
    teal: { background: `${C.emerald}10`, color: C.emerald },
    blue: { background: `${C.navy}10`, color: C.navy },
    green: { background: `${C.emerald}10`, color: C.emerald },
    red: { background: "#FEF2F2", color: "#DC2626" },
    amber: { background: `${C.amber}10`, color: C.amber },
    gray: { background: C.offWhite, color: C.muted },
    sky: { background: `${C.gold}10`, color: C.gold }
  };
  const style = c[color] || c.gray;
  return <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase flex items-center" style={style}>{children}</span>;
};

export const MiniStatCard = ({ label, value, sub }) => (
  <div className="border rounded-xl p-4" style={{ background: C.offWhite, borderColor: C.border }}>
    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{label}</p>
    <p className="text-sm font-bold mt-0.5" style={{ color: C.navy }}>{value}</p>
    {sub && <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{sub}</p>}
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
    not_started: { background: C.offWhite, color: C.muted, text: "Not Started" },
    failed: { background: "#FEF2F2", color: "#DC2626", text: "Not Booked" },
    cancel_requested: { background: "#FFF7ED", color: "#C2410C" },
    voucher_generated: { background: `${C.emerald}10`, color: C.emerald },
    ticketed: { background: `${C.navy}10`, color: C.navy },
    booking_initiated: { background: `${C.gold}10`, color: C.gold, text: "Booking Initiated" },
    discarded: { background: "#F1F5F9", color: "#64748B", text: "Discarded" },
  };
  const config = map[status] || { background: C.offWhite, color: C.muted };
  const label = config.text || status?.replace(/_/g, " ") || "—";

  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight"
      style={{ background: config.background, color: config.color }}
    >
      {label}
    </span>
  );
};

export const TraceTimer = ({ timer }) => {
  if (!timer) return null;
  const expired = timer === "expired";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ 
        background: expired ? "#FEF2F2" : `${C.emerald}10`, 
        color: expired ? "#DC2626" : C.emerald,
        boxShadow: `0 0 0 1px ${expired ? "#FEE2E2" : `${C.emerald}20`}`
      }}
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
    <span className="text-xs" style={{ color: C.muted }}>{label}</span>
    <span
      className={`text-xs font-semibold ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
      style={{ color: C.navy }}
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
        className="text-sm"
        style={{ color: star <= rating ? C.gold : C.border }}
      >
        ★
      </span>
    ))}
    <span className="text-[11px] ml-1" style={{ color: C.muted }}>{rating}/5</span>
  </div>
);