import React, { useState, useEffect, useRef } from "react";
import { C } from "../../Shared/color";
import { 
  FiChevronRight, FiMap, FiCheckCircle, FiInfo, FiDollarSign, 
  FiShield, FiRefreshCw, FiEye, FiEdit2, FiTrash2 
} from "react-icons/fi";
import ResponsiveDataTable from "../Shared/ResponsiveDataTable";
import { Th } from "../Shared/CommonComponents";
import useExcelExporter from "../../../hooks/export/useExcelExporter";
import { adminSsrPoliciesExportTemplate } from "../../../templates/exportTemplates/clientExportTemplates";

export const Avatar = ({ name = "", size = "md" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  
  const colors = [
    "from-[#003399] to-[#000d26]",
    "from-violet-600 to-indigo-500",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-teal-600 to-emerald-500",
  ];
  
  const seed = nameStr.length > 0 ? nameStr.charCodeAt(0) : 0;
  const color = colors[seed % colors.length];
  const sz = size === "lg" ? "w-10 h-10 text-[11px]" : "w-9 h-9 text-[10px]";
  
  return (
    <div
      className={`${sz} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};

/* ─── Shared primitives ─────────────────────────────────────────────────────── */

export function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${C.navy}10`, color: C.navy }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-tight" style={{ color: C.navy }}>{title}</p>
        {sub && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  description,
  icon: Icon,
  enabled,
  onChange,
}) {
  return (
    <div
      className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group
        ${enabled ? "shadow-md scale-[1.01]" : "bg-white"}`}
      style={{ 
        borderColor: enabled ? C.gold : C.border,
        background: enabled ? `${C.gold}05` : "white"
      }}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm"
          style={{ background: enabled ? C.gold : C.offWhite, color: enabled ? C.white : C.muted }}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-black transition-colors" style={{ color: enabled ? C.navy : C.muted }}>{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      <div
        className="w-12 h-6 rounded-full flex items-center transition-all duration-300 px-1 shadow-inner"
        style={{ background: enabled ? C.navy : "#E2E8F0" }}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-0"}`}
        />
      </div>
    </div>
  );
}

export function PriceRangeInput({
  label,
  icon: Icon,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
  disabled,
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition-all ${disabled ? "opacity-30 pointer-events-none grayscale" : "shadow-sm"}`}
      style={{ borderColor: C.border }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: C.gold }} />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
          {label} Thresholds (INR)
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min</label>
          <div className="relative mt-1">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
             <input
               type="number"
               min={0}
               value={minVal}
               onChange={(e) => onMinChange(Number(e.target.value))}
               className="w-full pl-7 pr-3 py-2.5 border rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-[#B8860B]/20 transition-all"
               style={{ background: C.offWhite, borderColor: C.border, color: C.navy }}
             />
          </div>
        </div>
        <div className="pt-5 opacity-20"><FiChevronRight /></div>
        <div className="flex-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max</label>
          <div className="relative mt-1">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
             <input
               type="number"
               min={0}
               value={maxVal}
               onChange={(e) => onMaxChange(Number(e.target.value))}
               className="w-full pl-7 pr-3 py-2.5 border rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-[#B8860B]/20 transition-all"
               style={{ background: C.offWhite, borderColor: C.border, color: C.navy }}
             />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LimitDropdown({ isUnlimited, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-[110px] px-3 py-1.5 border rounded-lg text-[11px] font-bold text-slate-600 bg-white shadow-sm transition-all hover:bg-slate-50 focus:ring-2 focus:ring-[#B8860B]/20"
        style={{ borderColor: C.border }}
      >
        <span>{isUnlimited !== false ? "No Limit" : "Set Limit"}</span>
        <FiChevronRight size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-90" : "rotate-0"}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border shadow-lg rounded-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100" style={{ borderColor: C.border }}>
          <button
            className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-all hover:bg-slate-50 ${isUnlimited !== false ? "text-[#000D26] bg-slate-50" : "text-slate-500"}`}
            onClick={() => { onChange(true); setIsOpen(false); }}
          >
            No Limit
          </button>
          <button
            className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-all hover:bg-slate-50 ${isUnlimited === false ? "text-[#000D26] bg-slate-50" : "text-slate-500"}`}
            onClick={() => { onChange(false); setIsOpen(false); }}
          >
            Set Limit
          </button>
        </div>
      )}
    </div>
  );
}

export function LimitsGrid({ data, location, updateLimit, updateIsUnlimited, title, conditionsKey, formatCondition }) {
  const items = data.filter((d) => d.location === location);
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
        <FiMap size={12} className="text-[#B8860B]" />
        {location} {title}
      </h4>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 rounded-xl border bg-slate-50 shadow-sm" style={{ borderColor: C.border }}>
          <span className="text-xs font-bold text-slate-600 pl-2">{formatCondition ? formatCondition(item[conditionsKey]) : item[conditionsKey]}</span>
          <div className="flex items-center gap-2">
            <LimitDropdown 
              isUnlimited={item.isUnlimited} 
              onChange={(val) => updateIsUnlimited(location, item[conditionsKey], val)} 
            />
            
            {item.isUnlimited === false && (
              <div className="relative w-28 animate-in fade-in zoom-in-95 duration-200">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min={1}
                  value={item.limit || ""}
                  onChange={(e) => updateLimit(location, item[conditionsKey], e.target.value === "" ? 0 : Math.max(1, Number(e.target.value)))}
                  className="w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs font-black outline-none focus:ring-2 focus:ring-[#B8860B]/20 transition-all bg-white"
                  style={{ borderColor: C.border, color: C.navy }}
                  placeholder="e.g. 5000"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ text, color }) {
  const cls = {
    green: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    red:   { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
    amber: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    blue:  { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  };
  const s = cls[color] || cls.blue;
  return (
    <span
      className="text-[9px] font-black px-2.5 py-1 rounded-full border shadow-sm uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {text}
    </span>
  );
}

export function CustomAutocomplete({
  employees,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  icon: Icon,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isExactSelected = employees?.some((e) => e.email === value);
  const filtered = employees?.filter((emp) =>
    `${emp.name?.firstName} ${emp.name?.lastName} ${emp.email}`
      .toLowerCase()
      .includes((value || "").toLowerCase()),
  );

  const handleInputChange = (e) => {
    onChange(e.target.value, false);
    if (e.target.value.trim().length > 0) setIsOpen(true);
    else setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative group">
        <Icon
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10"
          style={{ color: C.muted }}
        />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={loading ? "Accessing directory..." : placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full pl-11 pr-4 py-4 border-2 rounded-2xl text-sm font-bold transition-all outline-none"
          style={{ 
            background: C.white, 
            borderColor: isOpen ? C.gold : C.border,
            color: C.navy
          }}
        />
      </div>

      {isOpen && filtered?.length > 0 && !isExactSelected && (
        <div className="absolute z-[60] w-full mt-2 bg-white rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ borderColor: C.border }}>
          <div className="max-h-64 overflow-y-auto w-full p-2 custom-scrollbar">
            {filtered.map((emp) => (
              <div
                key={emp._id}
                onMouseDown={() => { onChange(emp.email, true); setIsOpen(false); }}
                className="flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer hover:bg-slate-50 border border-transparent transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white uppercase shadow-sm" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
                  {emp.name?.firstName?.[0]}{emp.name?.lastName?.[0]}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-black truncate" style={{ color: C.navy }}>{emp.name?.firstName} {emp.name?.lastName}</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate">{emp.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Policy Detail Modal ──────────────────────────────────────────────────── */
export function PolicyDetailModal({ policy, onClose }) {
  if (!policy) return null;

  const Detail = ({ label, icon: Icon, children }) => (
    <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${C.navy}08`, color: C.navy }}>
          <Icon size={18} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</p>
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#000D26]/80 backdrop-blur-md flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
           <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"><FiShield size={32} /></div>
           <h2 className="text-2xl font-black tracking-tight">{policy.employeeEmail}</h2>
           <div className="mt-3 flex flex-col items-center justify-center gap-2">
              <StatusBadge text={policy.approvalRequired ? "Approval Required" : "Auto-Approved"} color={policy.approvalRequired ? "amber" : "green"} />
              {!policy.approvalRequired && (
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded border border-white/30">Custom Limits Applied</span>
              )}
           </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
           <Detail label="Active Permissions" icon={FiCheckCircle}>
              <div className="flex flex-wrap gap-2">
                 <StatusBadge text="Seat" color={policy.allowSeat ? "green" : "red"} />
                 <StatusBadge text="Meal" color={policy.allowMeal ? "green" : "red"} />
                 <StatusBadge text="Baggage" color={policy.allowBaggage ? "green" : "red"} />
              </div>
           </Detail>
           <Detail label="Policy Metadata" icon={FiInfo}>
              <div className="space-y-2">
                 <p className="text-[11px] font-bold text-slate-500 uppercase">Created: <span className="text-slate-900 ml-1">{new Date(policy.createdAt).toLocaleDateString()}</span></p>
                 <p className="text-[11px] font-bold text-slate-500 uppercase">Updated: <span className="text-slate-900 ml-1">{new Date(policy.updatedAt).toLocaleDateString()}</span></p>
              </div>
           </Detail>
           <div className="col-span-full">
              <Detail label="Financial Thresholds" icon={FiDollarSign}>
                 <div className="grid grid-cols-3 gap-4">
                    {["Seat", "Meal", "Baggage"].map(type => {
                       const key = type.toLowerCase();
                       const range = policy[`${key}PriceRange`];
                       const allowed = policy[`allow${type}`];
                       return (
                         <div key={type} className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{type}</p>
                            <p className="text-sm font-black" style={{ color: allowed ? C.navy : "#CBD5E1" }}>
                               {allowed ? `₹${range.min} - ₹${range.max}` : "BLOCKED"}
                            </p>
                         </div>
                       );
                    })}
                 </div>
              </Detail>
           </div>
        </div>

        <div className="px-8 pb-8">
           <button onClick={onClose} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Policy List Table ─────────────────────────────────────────────────────── */
export function PolicyList({
  policies,
  listLoading,
  onDelete,
  onView,
  onEdit,
  title,
  subtitle,
  searchQuery,
  onRefresh,
}) {
  const { exportExcel, isExporting } = useExcelExporter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, policies.length]);

  const totalPages = Math.ceil(policies.length / itemsPerPage);
  const paginatedPolicies = policies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (listLoading) return <div className="grid gap-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border animate-pulse" />)}</div>;

  return (
    <ResponsiveDataTable 
      title={title} 
      subtitle={subtitle} 
      exportLabel="Export Excel"
      exportLoading={isExporting}
      exportDisabled={isExporting}
      onExport={() => exportExcel({
        pageHeader: title,
        statCards: [
          { label: "Active Policies", value: policies.length }
        ],
        appliedFilters: [
          { label: "Search", value: searchQuery || "None" }
        ],
        data: policies,
        columns: adminSsrPoliciesExportTemplate,
        filenamePrefix: "ssr_policies"
      })}
      wrapperClass="!border-none !shadow-none"
      toolbarRight={onRefresh && <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all" style={{ background: C.white, borderColor: C.border, color: C.navy, border: "1px solid" }}><FiRefreshCw size={14} /> Sync</button>}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
            <Th className="!px-6 !py-5">Employee</Th>
            <Th className="!px-6 !py-5 !text-center">Seat Access</Th>
            <Th className="!px-6 !py-5 !text-center">Meal Access</Th>
            <Th className="!px-6 !py-5 !text-center">Baggage Access</Th>
            <Th className="!px-6 !py-5 !text-center">Approval</Th>
            <Th className="!px-6 !py-5 !text-center">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedPolicies.map((p, i) => (
            <tr key={p._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
              <td className="!px-6 !py-5">
                 <div className="flex items-center gap-4">
                    <Avatar name={p.employeeEmail} />
                    <div className="min-w-0">
                       <p className="text-xs font-black uppercase tracking-tight" style={{ color: C.navy }}>{p.employeeEmail}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Policy Active</p>
                    </div>
                 </div>
              </td>
              <td className="!px-6 !py-5 text-center">
                <StatusBadge text={p.allowSeat ? "✓ Allowed" : "✗ Blocked"} color={p.allowSeat ? "green" : "red"} />
                {p.allowSeat && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter font-mono">₹{p.seatPriceRange?.min}–₹{p.seatPriceRange?.max}</p>}
              </td>
              <td className="!px-6 !py-5 text-center">
                <StatusBadge text={p.allowMeal ? "✓ Allowed" : "✗ Blocked"} color={p.allowMeal ? "green" : "red"} />
                {p.allowMeal && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter font-mono">₹{p.mealPriceRange?.min}–₹{p.mealPriceRange?.max}</p>}
              </td>
              <td className="!px-6 !py-5 text-center">
                <StatusBadge text={p.allowBaggage ? "✓ Allowed" : "✗ Blocked"} color={p.allowBaggage ? "green" : "red"} />
                {p.allowBaggage && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter font-mono">₹{p.baggagePriceRange?.min}–₹{p.baggagePriceRange?.max}</p>}
              </td>
              <td className="!px-6 !py-5 text-center">
                <StatusBadge text={p.approvalRequired ? "Manual" : "Auto"} color={p.approvalRequired ? "amber" : "green"} />
              </td>
              <td className="!px-6 !py-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onView(p)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"><FiEye size={16} /></button>
                  <button onClick={() => onEdit(p)} className="p-2 rounded-xl transition-colors" style={{ background: `${C.gold}15`, color: C.gold }}><FiEdit2 size={16} /></button>
                  <button onClick={() => onDelete(p._id, p.employeeEmail)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><FiTrash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-4 border-t" style={{ borderColor: C.border }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl transition-all disabled:opacity-50"
            style={{ background: C.white, borderColor: C.border, color: C.navy, border: "1px solid" }}
          >
            <FiChevronRight className="rotate-180" size={16} />
          </button>
          <span className="text-xs font-bold text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl transition-all disabled:opacity-50"
            style={{ background: C.white, borderColor: C.border, color: C.navy, border: "1px solid" }}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </ResponsiveDataTable>
  );
}
