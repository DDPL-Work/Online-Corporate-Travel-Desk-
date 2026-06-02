import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiShield,
  FiUser,
  FiMail,
  FiSave,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiList,
  FiSettings,
  FiEye,
  FiDollarSign,
  FiToggleLeft,
  FiToggleRight,
  FiDownload,
  FiChevronRight,
  FiInfo,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import {
  MdAirlineSeatReclineNormal,
  MdLunchDining,
  MdLuggage,
} from "react-icons/md";
import {
  fetchPolicyByEmail,
  fetchAllSSRPolicies,
  upsertSSRPolicy,
  deleteSSRPolicy,
} from "../../Redux/Actions/ssrPolicy.thunks";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import { clearLookup, clearSaveState } from "../../Redux/Slice/ssrPolicy.slice";
import Swal from "sweetalert2";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Th, LabeledField, SearchBar } from "./Shared/CommonComponents";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminSsrPoliciesExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

const Avatar = ({ name = "", size = "md" }) => {
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

function SectionHeader({ icon: Icon, title, sub }) {
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

function Toggle({
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

function PriceRangeInput({
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

function StatusBadge({ text, color }) {
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

function CustomAutocomplete({
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
function PolicyDetailModal({ policy, onClose }) {
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
           <div className="mt-3 flex items-center justify-center gap-3">
              <StatusBadge text={policy.approvalRequired ? "Approval Required" : "Auto-Approved"} color={policy.approvalRequired ? "amber" : "green"} />
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
function PolicyList({
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
      toolbarRight={onRefresh && <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all" style={{ background: C.white, borderColor: C.border, color: C.navy, border: "1px solid" }}><FiRefreshCw size={14} /> Sync Policies</button>}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
            <Th className="!px-6 !py-5">Employee Ledger</Th>
            <Th className="!px-6 !py-5 !text-center">Seat Access</Th>
            <Th className="!px-6 !py-5 !text-center">Meal Access</Th>
            <Th className="!px-6 !py-5 !text-center">Baggage Access</Th>
            <Th className="!px-6 !py-5 !text-center">Auth Flow</Th>
            <Th className="!px-6 !py-5 !text-center">Management</Th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p, i) => (
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
    </ResponsiveDataTable>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function SsrManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    lookedUp, lookupLoading, lookupError, policies, listLoading, saving, saveSuccess,
  } = useSelector((s) => s.ssrPolicy);
  const { employees } = useSelector((s) => s.employeeAction);

  const [emailInput, setEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState("configure");
  const [viewPolicy, setViewPolicy] = useState(null);
  const [search, setSearch] = useState("");

  const filteredPolicies = React.useMemo(() => {
    const q = search.toLowerCase();
    return policies.filter(p => !q || p.employeeEmail?.toLowerCase().includes(q));
  }, [policies, search]);

  const [allowSeat, setAllowSeat] = useState(false);
  const [allowMeal, setAllowMeal] = useState(false);
  const [allowBaggage, setAllowBaggage] = useState(false);

  const [seatMin, setSeatMin] = useState(0);
  const [seatMax, setSeatMax] = useState(99999);
  const [mealMin, setMealMin] = useState(0);
  const [mealMax, setMealMax] = useState(99999);
  const [bagMin, setBagMin] = useState(0);
  const [bagMax, setBagMax] = useState(99999);

  const [approvalRequired, setApprovalRequired] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchAllSSRPolicies());
    dispatch(fetchEmployees());
    return () => { dispatch(clearLookup()); dispatch(clearSaveState()); };
  }, [dispatch]);

  useEffect(() => {
    if (!lookedUp) return;
    const p = lookedUp.policy;
    setAllowSeat(p.allowSeat ?? false);
    setAllowMeal(p.allowMeal ?? false);
    setAllowBaggage(p.allowBaggage ?? false);
    setSeatMin(p.seatPriceRange?.min ?? 0);
    setSeatMax(p.seatPriceRange?.max ?? 99999);
    setMealMin(p.mealPriceRange?.min ?? 0);
    setMealMax(p.mealPriceRange?.max ?? 99999);
    setBagMin(p.baggagePriceRange?.min ?? 0);
    setBagMax(p.baggagePriceRange?.max ?? 99999);
    setApprovalRequired(p.approvalRequired ?? true);
  }, [lookedUp]);

  useEffect(() => {
    if (!saveSuccess) return;
    dispatch(fetchAllSSRPolicies());
    Swal.fire({ icon: "success", title: isEditing ? "Policy Updated" : "Policy Created", timer: 2000, showConfirmButton: false });
    setIsEditing(false); dispatch(clearSaveState()); dispatch(clearLookup()); setEmailInput("");
  }, [saveSuccess]);

  const handleLookup = () => {
    if (!emailInput.trim()) return;
    dispatch(fetchPolicyByEmail(emailInput.trim().toLowerCase()));
  };

  const handleSave = () => {
    if (!lookedUp) return;
    if (seatMin > seatMax || mealMin > mealMax || bagMin > bagMax) {
      Swal.fire("Invalid Range", "Min price cannot exceed max price.", "warning");
      return;
    }
    dispatch(upsertSSRPolicy({
      employeeEmail: emailInput.trim().toLowerCase(),
      allowSeat, allowMeal, allowBaggage,
      seatPriceRange: { min: seatMin, max: seatMax },
      mealPriceRange: { min: mealMin, max: mealMax },
      baggagePriceRange: { min: bagMin, max: bagMax },
      approvalRequired,
    }));
  };

  const handleDelete = (id, email) => {
    Swal.fire({ title: "Delete Policy?", text: `Remove SSR policy for ${email}?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#EF4444", confirmButtonText: "Delete" })
      .then((res) => { if (res.isConfirmed) dispatch(deleteSSRPolicy(id)).then(() => dispatch(fetchAllSSRPolicies())); });
  };

  const handleEdit = (p) => {
    setEmailInput(p.employeeEmail); setIsEditing(true); dispatch(fetchPolicyByEmail(p.employeeEmail));
    setActiveTab("configure"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
               >
                 <FiArrowRight className="rotate-180" size={20} />
               </button>
               <button 
                  onClick={() => dispatch(fetchAllSSRPolicies())} 
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${listLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={listLoading}
               >
                 <div className={listLoading ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiShield size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">SSR Governance</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Configure Paid Seat, Meal & Baggage Policies
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher - Aligned with TotalBookings */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          {[
            ["configure", "Configuration", FiSettings],
            ["list", "Active Policies", FiList],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>
        {activeTab === "configure" ? (
          <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
               <div className="bg-white rounded-2xl border shadow-sm p-8" style={{ borderColor: C.border }}>
                  <SectionHeader icon={FiSearch} title="Policy Lookup" sub="Identify employee for configuration" />
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                     <CustomAutocomplete employees={employees} value={emailInput} onChange={setEmailInput} placeholder="Select employee by email..." icon={FiMail} />
                     <button onClick={handleLookup} disabled={lookupLoading} className="w-full sm:w-auto px-10 py-4 bg-navy rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50" style={{ background: C.navy }}>
                        {lookupLoading ? "Locating..." : "Find Policy"}
                     </button>
                  </div>
                  {lookupError && <p className="mt-4 text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2"><FiAlertCircle /> {lookupError}</p>}
               </div>

               {lookedUp && (
                 <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500" style={{ borderColor: C.border }}>
                    <div className="p-8 space-y-10">
                       <div>
                          <SectionHeader icon={FiToggleRight} title="Entitlement Matrix" sub="Define what services are pre-approved" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <Toggle label="Paid Seat" description="Pre-select seating" icon={MdAirlineSeatReclineNormal} enabled={allowSeat} onChange={setAllowSeat} />
                             <Toggle label="Paid Meal" description="In-flight catering" icon={MdLunchDining} enabled={allowMeal} onChange={setAllowMeal} />
                             <Toggle label="Extra Baggage" description="Additional weight" icon={MdLuggage} enabled={allowBaggage} onChange={setAllowBaggage} />
                          </div>
                       </div>

                       <div>
                          <SectionHeader icon={FiDollarSign} title="Cost Thresholds" sub="Set price caps for automated approval" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <PriceRangeInput label="Seat" icon={MdAirlineSeatReclineNormal} minVal={seatMin} maxVal={seatMax} onMinChange={setSeatMin} onMaxChange={setSeatMax} disabled={!allowSeat} />
                             <PriceRangeInput label="Meal" icon={MdLunchDining} minVal={mealMin} maxVal={mealMax} onMinChange={setMealMin} onMaxChange={setMealMax} disabled={!allowMeal} />
                             <PriceRangeInput label="Baggage" icon={MdLuggage} minVal={bagMin} maxVal={bagMax} onMinChange={setBagMin} onMaxChange={setBagMax} disabled={!allowBaggage} />
                          </div>
                       </div>

                       <div>
                          <SectionHeader icon={FiShield} title="Approval Workflow" sub="Define authorization hierarchy" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Toggle label="Manual Approval" description="Admin intervention required" icon={FiClock} enabled={approvalRequired} onChange={setApprovalRequired} />
                             <Toggle label="Auto Approved" description="Skip workflow if in budget" icon={FiCheckCircle} enabled={!approvalRequired} onChange={(v) => setApprovalRequired(!v)} />
                          </div>
                       </div>
                    </div>
                    <div className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
                       <div className="flex items-center gap-3">
                          <FiInfo className="text-gold" size={18} />
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-xs">Settings will take effect immediately for all subsequent bookings.</p>
                       </div>
                       <button onClick={handleSave} disabled={saving} className="px-12 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
                          <FiSave /> {saving ? "Saving Changes..." : isEditing ? "Update Policy" : "Deploy Policy"}
                       </button>
                    </div>
                 </div>
               )}
            </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm animate-in fade-in duration-300" style={{ borderColor: C.border }}>
              <div className="grid grid-cols-1 gap-6">
                <LabeledField label={<><FiSearch size={10} /> Search Governance Ledger</>}>
                  <SearchBar value={search} onChange={(val) => setSearch(val)} placeholder="Search employee email..." />
                </LabeledField>
              </div>
            </div>

            <PolicyList
              policies={filteredPolicies}
              listLoading={listLoading}
              onDelete={handleDelete}
              onView={setViewPolicy}
              onEdit={handleEdit}
              title="Active Governance Ledger"
              subtitle={`${filteredPolicies.length} custom policies in effect`}
              searchQuery={search}
              onRefresh={() => dispatch(fetchAllSSRPolicies())}

            />
          </div>
        )}
      </div>

      {viewPolicy && <PolicyDetailModal policy={viewPolicy} onClose={() => setViewPolicy(null)} />}
    </div>
  );
}
