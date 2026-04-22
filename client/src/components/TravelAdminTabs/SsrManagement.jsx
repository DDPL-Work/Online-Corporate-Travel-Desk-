// client/src/components/TravelAdminTabs/SsrManagement.jsx

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch, FiShield, FiUser, FiMail, FiSave, FiTrash2, FiEdit2,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw,
  FiList, FiSettings, FiEye, FiDollarSign, FiToggleLeft, FiToggleRight,
} from "react-icons/fi";
import { MdAirlineSeatReclineNormal, MdLunchDining, MdLuggage } from "react-icons/md";
import {
  fetchPolicyByEmail,
  fetchAllSSRPolicies,
  upsertSSRPolicy,
  deleteSSRPolicy,
} from "../../Redux/Actions/ssrPolicy.thunks";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import { clearLookup, clearSaveState } from "../../Redux/Slice/ssrPolicy.slice";
import Swal from "sweetalert2";

/* ─── Shared primitives ─────────────────────────────────────────────────────── */

function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#0A4D68]/10 flex items-center justify-center">
        <Icon size={16} className="text-[#0A4D68]" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-800">{title}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Toggle({ label, description, icon: Icon, enabled, onChange, color = "#0A4D68" }) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
        ${enabled ? "border-[#0A4D68]/30 bg-[#0A4D68]/5" : "border-slate-200 bg-white"}`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? "bg-[#0A4D68] text-white" : "bg-slate-100 text-slate-400"}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className={`text-sm font-bold ${enabled ? "text-[#0A4D68]" : "text-slate-500"}`}>{label}</p>
          <p className="text-[11px] text-slate-400">{description}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 px-1
        ${enabled ? "bg-[#0A4D68]" : "bg-slate-200"}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </div>
  );
}

function PriceRangeInput({ label, icon: Icon, minVal, maxVal, onMinChange, onMaxChange, disabled }) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${disabled ? "opacity-40 pointer-events-none" : "border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-slate-500" />
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label} Price Range</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase">Min (₹)</label>
          <input
            type="number"
            min={0}
            value={minVal}
            onChange={(e) => onMinChange(Number(e.target.value))}
            className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/30"
          />
        </div>
        <div className="pt-4 text-slate-300 font-black text-lg">–</div>
        <div className="flex-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase">Max (₹)</label>
          <input
            type="number"
            min={0}
            value={maxVal}
            onChange={(e) => onMaxChange(Number(e.target.value))}
            className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/30"
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ text, color }) {
  const cls = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red:   "bg-red-50 text-red-600 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${cls[color] || cls.blue}`}>
      {text}
    </span>
  );
}

function CustomAutocomplete({ employees, value, onChange, placeholder, disabled, loading, icon: Icon }) {
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

  const isExactSelected = employees?.some((e) => e.email === value);

  const filtered = employees?.filter((emp) =>
    `${emp.name?.firstName} ${emp.name?.lastName} ${emp.email}`
      .toLowerCase()
      .includes((value || "").toLowerCase())
  );

  const handleInputChange = (e) => {
    onChange(e.target.value, false);
    if (e.target.value.trim().length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (empEmail) => {
    onChange(empEmail, true);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={loading ? "Loading employees..." : placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-[#0A4D68]/20 focus:border-[#0A4D68]
            ${disabled ? "bg-slate-50 opacity-60 cursor-not-allowed" : "bg-white"}
            ${isOpen ? "border-[#0A4D68]" : "border-slate-200 hover:border-[#0A4D68]/50"}
          `}
        />
      </div>

      {isOpen && filtered?.length > 0 && !isExactSelected && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden transform opacity-100 scale-100 transition-all duration-200">
          <div className="max-h-60 overflow-y-auto w-full p-1.5 custom-scrollbar">
            {filtered.map((emp) => (
              <div
                key={emp._id}
                onMouseDown={() => handleSelect(emp.email)}
                className={`flex items-center gap-3 p-2.5 mb-1 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 border border-transparent`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0A4D68] to-[#083d52] text-white flex items-center justify-center text-[11px] font-bold uppercase shrink-0 shadow-sm">
                  {emp.name?.firstName?.[0]}
                  {emp.name?.lastName?.[0]}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold truncate text-slate-700">
                    {emp.name?.firstName} {emp.name?.lastName}{" "}
                    <span className="text-[10px] font-medium ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      {emp.role}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">
                    {emp.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

/* ─── Policy Detail Modal ──────────────────────────────────────────────────── */
function PolicyDetailModal({ policy, onClose }) {
  if (!policy) return null;

  const Detail = ({ label, icon: Icon, children }) => (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-[#0A4D68]" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );

  const PermBadge = ({ allowed, label }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
      allowed
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      {allowed ? <FiCheckCircle size={11}/> : <FiXCircle size={11}/>}
      {label} {allowed ? "Allowed" : "Blocked"}
    </span>
  );

  const RangePill = ({ min, max }) => (
    <span className="text-sm font-semibold text-slate-700">
      ₹{min?.toLocaleString("en-IN")} &mdash; ₹{max?.toLocaleString("en-IN")}
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A4D68] to-[#0d6b8e] px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">SSR Policy Details</p>
            <h2 className="text-white font-black text-lg leading-tight break-all">{policy.employeeEmail}</h2>
            <div className="mt-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                policy.approvalRequired
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                  : "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40"
              }`}>
                {policy.approvalRequired ? "⏳ Approval Required" : "✅ Auto-Approved"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white"
          >
            <FiXCircle size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Permissions */}
          <Detail label="SSR Permissions" icon={FiShield}>
            <div className="flex flex-wrap gap-2 mt-1">
              <PermBadge allowed={policy.allowSeat} label="Seat" />
              <PermBadge allowed={policy.allowMeal} label="Meal" />
              <PermBadge allowed={policy.allowBaggage} label="Baggage" />
            </div>
          </Detail>

          {/* Price Ranges */}
          <Detail label="Price Range Controls" icon={FiDollarSign}>
            <div className="space-y-2 mt-1">
              {[
                { label: "Seat", range: policy.seatPriceRange, allowed: policy.allowSeat },
                { label: "Meal", range: policy.mealPriceRange, allowed: policy.allowMeal },
                { label: "Baggage", range: policy.baggagePriceRange, allowed: policy.allowBaggage },
              ].map(({ label, range, allowed }) => (
                <div key={label} className={`flex items-center justify-between text-sm ${
                  !allowed ? "opacity-40" : ""
                }`}>
                  <span className="text-slate-500 font-semibold w-20">{label}</span>
                  {allowed
                    ? <RangePill min={range?.min} max={range?.max} />
                    : <span className="text-xs text-slate-400 italic">N/A (blocked)</span>
                  }
                </div>
              ))}
            </div>
          </Detail>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Created" icon={FiAlertCircle}>
              <p className="text-sm font-semibold text-slate-700">
                {policy.createdAt ? new Date(policy.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </Detail>
            <Detail label="Last Updated" icon={FiRefreshCw}>
              <p className="text-sm font-semibold text-slate-700">
                {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </Detail>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Policy List Table ─────────────────────────────────────────────────────── */
function PolicyList({ policies, listLoading, onDelete, onView, onEdit }) {
  if (listLoading) {
    return (
      <div className="grid gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!policies.length) {
    return (
      <div className="py-16 text-center text-slate-400">
        <FiShield size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">No SSR policies configured yet</p>
        <p className="text-xs mt-1">Use the form above to create the first policy</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr className="bg-[#0A4D68] text-white text-xs font-bold uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Employee Email</th>
            <th className="px-4 py-3 text-center">Seat</th>
            <th className="px-4 py-3 text-center">Meal</th>
            <th className="px-4 py-3 text-center">Baggage</th>
            <th className="px-4 py-3 text-center">Approval</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {policies.map((p, i) => (
            <tr key={p._id} className={`text-[13px] ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-sky-50 transition-colors`}>
              <td className="px-4 py-3 font-mono text-slate-700 text-xs">{p.employeeEmail}</td>
              <td className="px-4 py-3 text-center">
                <StatusBadge text={p.allowSeat ? "✓ On" : "✗ Off"} color={p.allowSeat ? "green" : "red"} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge text={p.allowMeal ? "✓ On" : "✗ Off"} color={p.allowMeal ? "green" : "red"} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge text={p.allowBaggage ? "✓ On" : "✗ Off"} color={p.allowBaggage ? "green" : "red"} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge text={p.approvalRequired ? "Required" : "Auto"} color={p.approvalRequired ? "amber" : "green"} />
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onView(p)}
                    title="View Details"
                    className="text-[#0A4D68] hover:text-[#083d52] transition p-1.5 rounded-lg hover:bg-[#0A4D68]/10"
                  >
                    <FiEye size={14} />
                  </button>
                  <button
                    onClick={() => onEdit(p)}
                    title="Edit Policy"
                    className="text-amber-500 hover:text-amber-600 transition p-1.5 rounded-lg hover:bg-amber-50"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(p._id, p.employeeEmail)}
                    title="Delete Policy"
                    className="text-red-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function SsrManagement() {
  const dispatch = useDispatch();
  const {
    lookedUp, lookupLoading, lookupError,
    policies, listLoading,
    saving, saveError, saveSuccess,
    deleting,
  } = useSelector((s) => s.ssrPolicy);
  const { employees, loading: employeesLoading } = useSelector((s) => s.employeeAction);

  // ── Form state ────────────────────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState("configure"); // configure | list
  const [viewPolicy, setViewPolicy] = useState(null); // policy to show in detail modal

  const [allowSeat,    setAllowSeat]    = useState(true);
  const [allowMeal,    setAllowMeal]    = useState(true);
  const [allowBaggage, setAllowBaggage] = useState(true);

  const [seatMin,    setSeatMin]    = useState(0);
  const [seatMax,    setSeatMax]    = useState(99999);
  const [mealMin,    setMealMin]    = useState(0);
  const [mealMax,    setMealMax]    = useState(99999);
  const [bagMin,     setBagMin]     = useState(0);
  const [bagMax,     setBagMax]     = useState(99999);

  const [approvalRequired, setApprovalRequired] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // true when editing existing policy

  // ── Load list on mount ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllSSRPolicies());
    dispatch(fetchEmployees());
    return () => {
      dispatch(clearLookup());
      dispatch(clearSaveState());
    };
  }, [dispatch]);

  // ── Populate form when lookup returns ───────────────────────────────────
  useEffect(() => {
    if (!lookedUp) return;
    const p = lookedUp.policy;
    setAllowSeat(p.allowSeat ?? true);
    setAllowMeal(p.allowMeal ?? true);
    setAllowBaggage(p.allowBaggage ?? true);
    setSeatMin(p.seatPriceRange?.min ?? 0);
    setSeatMax(p.seatPriceRange?.max ?? 99999);
    setMealMin(p.mealPriceRange?.min ?? 0);
    setMealMax(p.mealPriceRange?.max ?? 99999);
    setBagMin(p.baggagePriceRange?.min ?? 0);
    setBagMax(p.baggagePriceRange?.max ?? 99999);
    setApprovalRequired(p.approvalRequired ?? true);
  }, [lookedUp]);

  // ── Save success toast ────────────────────────────────────────────────────
  useEffect(() => {
    if (!saveSuccess) return;
    dispatch(fetchAllSSRPolicies()); // refresh list after every save
    Swal.fire({
      icon: "success",
      title: isEditing ? "✅ Policy Updated!" : "✅ Policy Created!",
      text: isEditing
        ? "The SSR policy has been updated successfully."
        : "New SSR policy has been created successfully.",
      timer: 2500,
      showConfirmButton: false,
    });
    setIsEditing(false);
    dispatch(clearSaveState());
    dispatch(clearLookup());
    setEmailInput("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSuccess]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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
      allowSeat,
      allowMeal,
      allowBaggage,
      seatPriceRange: { min: seatMin, max: seatMax },
      mealPriceRange: { min: mealMin, max: mealMax },
      baggagePriceRange: { min: bagMin, max: bagMax },
      approvalRequired,
    }));
  };

  const handleDelete = (id, email) => {
    Swal.fire({
      title: "Delete Policy?",
      text: `Remove SSR policy for ${email}? Employee will fall back to default (all allowed, approval required).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Delete",
    }).then((res) => {
      if (res.isConfirmed) {
        dispatch(deleteSSRPolicy(id)).then(() => {
          dispatch(fetchAllSSRPolicies()); // ← refresh list after delete
          Swal.fire({
            icon: "success",
            title: "Policy Deleted",
            text: `SSR policy for ${email} removed. Employee reverts to default settings.`,
            timer: 2500,
            showConfirmButton: false,
          });
        });
      }
    });
  };

  // ── Edit handler: pre-fill form from existing policy & switch tab ────────
  const handleEdit = (p) => {
    setEmailInput(p.employeeEmail);
    setAllowSeat(p.allowSeat ?? true);
    setAllowMeal(p.allowMeal ?? true);
    setAllowBaggage(p.allowBaggage ?? true);
    setSeatMin(p.seatPriceRange?.min ?? 0);
    setSeatMax(p.seatPriceRange?.max ?? 99999);
    setMealMin(p.mealPriceRange?.min ?? 0);
    setMealMax(p.mealPriceRange?.max ?? 99999);
    setBagMin(p.baggagePriceRange?.min ?? 0);
    setBagMax(p.baggagePriceRange?.max ?? 99999);
    setApprovalRequired(p.approvalRequired ?? true);
    setIsEditing(true); // ← mark as editing
    dispatch(fetchPolicyByEmail(p.employeeEmail));
    setActiveTab("configure");
    // Scroll to top so form is visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0A4D68] tracking-tight">SSR Management</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Control seat, meal &amp; baggage permissions per employee
            </p>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {["configure", "list"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize
                  ${activeTab === t ? "bg-[#0A4D68] text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t === "configure" ? <FiSettings size={12} /> : <FiList size={12} />}
                {t === "configure" ? "Configure Policy" : `All Policies (${policies.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-16">
        {activeTab === "configure" ? (
          <div className="space-y-5">
            {/* ── Step 1: Employee Lookup ─────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <SectionHeader
                icon={FiSearch}
                title="Employee Identification"
                sub="Enter the employee's email to load or create their SSR policy"
              />
              <div className="flex flex-col md:flex-row gap-3 relative z-20">
                <div className="flex-1">
                  <CustomAutocomplete
                    employees={employees}
                    value={emailInput}
                    onChange={(val, isSelection) => {
                      setEmailInput(val);
                      if (val && isSelection) {
                        dispatch(fetchPolicyByEmail(val.trim().toLowerCase()));
                      }
                    }}
                    placeholder="Search & Select Employee..."
                    disabled={employeesLoading}
                    loading={employeesLoading}
                    icon={FiUser}
                  />
                </div>
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading || !emailInput.trim()}
                  className="flex items-center justify-center w-full md:w-[130px] h-[46px] gap-2 px-5 bg-gradient-to-r from-[#0A4D68] to-[#083d52] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md shrink-0"
                >
                  {lookupLoading ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSearch size={14} />}
                  {lookupLoading ? "Loading…" : "Look Up"}
                </button>
              </div>

              {/* Lookup error */}
              {lookupError && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <FiAlertCircle size={14} className="shrink-0" />
                  {lookupError}
                </div>
              )}

              {/* Employee card */}
              {lookedUp && (
                <div className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-11 h-11 rounded-full bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center font-black text-sm">
                    {lookedUp.employee
                      ? `${lookedUp.employee.name?.firstName?.[0] ?? ""}${lookedUp.employee.name?.lastName?.[0] ?? ""}`
                      : "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {lookedUp.employee
                        ? `${lookedUp.employee.name?.firstName ?? ""} ${lookedUp.employee.name?.lastName ?? ""}`.trim()
                        : "Employee not in system yet"}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{emailInput}</p>
                  </div>
                  <StatusBadge
                    text={lookedUp.isNewPolicy ? "New Policy" : "Existing Policy"}
                    color={lookedUp.isNewPolicy ? "amber" : "blue"}
                  />
                </div>
              )}
            </div>

            {/* ── Steps 2-5 only visible after lookup ─────────────── */}
            {lookedUp && (
              <>
                {/* ── Step 2: SSR Permissions ────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <SectionHeader
                    icon={FiShield}
                    title="SSR Permissions"
                    sub="Toggle which SSR services this employee is allowed to access"
                  />
                  <div className="grid gap-3">
                    <Toggle
                      label="Seat Selection"
                      description="Allow employee to choose seats during booking"
                      icon={MdAirlineSeatReclineNormal}
                      enabled={allowSeat}
                      onChange={setAllowSeat}
                    />
                    <Toggle
                      label="Meal Selection"
                      description="Allow employee to select meal preferences"
                      icon={MdLunchDining}
                      enabled={allowMeal}
                      onChange={setAllowMeal}
                    />
                    <Toggle
                      label="Extra Baggage"
                      description="Allow employee to add extra baggage allowance"
                      icon={MdLuggage}
                      enabled={allowBaggage}
                      onChange={setAllowBaggage}
                    />
                  </div>
                </div>

                {/* ── Step 3: Price Range Controls ───────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <SectionHeader
                    icon={FiShield}
                    title="Price Range Controls"
                    sub="Define the allowed SSR price limits. Selections outside range will be blocked."
                  />
                  <div className="grid md:grid-cols-3 gap-4">
                    <PriceRangeInput
                      label="Seat"
                      icon={MdAirlineSeatReclineNormal}
                      minVal={seatMin}
                      maxVal={seatMax}
                      onMinChange={setSeatMin}
                      onMaxChange={setSeatMax}
                      disabled={!allowSeat}
                    />
                    <PriceRangeInput
                      label="Meal"
                      icon={MdLunchDining}
                      minVal={mealMin}
                      maxVal={mealMax}
                      onMinChange={setMealMin}
                      onMaxChange={setMealMax}
                      disabled={!allowMeal}
                    />
                    <PriceRangeInput
                      label="Baggage"
                      icon={MdLuggage}
                      minVal={bagMin}
                      maxVal={bagMax}
                      onMinChange={setBagMin}
                      onMaxChange={setBagMax}
                      disabled={!allowBaggage}
                    />
                  </div>
                </div>

                {/* ── Step 4: Approval Settings ──────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <SectionHeader
                    icon={FiCheckCircle}
                    title="Approval Flow Configuration"
                    sub="Define whether SSR & flight bookings by this employee require manager approval"
                  />
                  <div className="grid gap-4">
                    <div
                      className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 gap-1 max-w-xs cursor-pointer"
                      onClick={() => setApprovalRequired(!approvalRequired)}
                    >
                      {[true, false].map((opt) => (
                        <div
                          key={String(opt)}
                          className={`py-2.5 rounded-lg text-center text-sm font-bold transition-all
                            ${approvalRequired === opt ? "bg-[#0A4D68] text-white shadow" : "text-slate-500"}`}
                        >
                          {opt ? "Approval Required" : "Auto-Approved"}
                        </div>
                      ))}
                    </div>

                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${approvalRequired ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                      {approvalRequired
                        ? <FiAlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        : <FiCheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                      <p className={`text-xs font-medium ${approvalRequired ? "text-amber-700" : "text-emerald-700"}`}>
                        {approvalRequired
                          ? "When this is ON, all bookings by this employee go into \"Pending Approval\" status. The specific approver is routed automatically based on corporate settings."
                          : "Bookings by this employee are auto-approved immediately — no manual review required."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Step 5: Save ───────────────────────────────── */}
                {saveError && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    <FiXCircle size={16} className="shrink-0" />
                    {saveError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  {/* Edit mode banner */}
                  {isEditing && (
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                      <FiEdit2 size={13} className="text-amber-600 shrink-0" />
                      <span className="text-xs font-semibold text-amber-700">
                        Editing policy for <span className="font-black">{emailInput}</span>
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => { dispatch(clearLookup()); setEmailInput(""); setIsEditing(false); }}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-7 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition shadow-md ${
                      isEditing
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-[#0A4D68] hover:bg-[#083d52]"
                    }`}
                  >
                    {saving ? <FiRefreshCw size={14} className="animate-spin" /> : isEditing ? <FiEdit2 size={14} /> : <FiSave size={14} />}
                    {saving ? (isEditing ? "Updating…" : "Saving…") : isEditing ? "Update Policy" : "Save Policy"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── All Policies Tab ───────────────────────────────────── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">Configured SSR Policies</p>
                <p className="text-xs text-slate-400 mt-0.5">{policies.length} policies configured</p>
              </div>
              <button
                onClick={() => dispatch(fetchAllSSRPolicies())}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0A4D68] hover:bg-[#0A4D68]/5 px-3 py-1.5 rounded-lg transition"
              >
                <FiRefreshCw size={12} />
                Refresh
              </button>
            </div>
            <PolicyList
              policies={policies}
              listLoading={listLoading}
              onDelete={handleDelete}
              onView={(p) => setViewPolicy(p)}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>

      {/* ── Policy Detail Modal ─────────────────────────────── */}
      <PolicyDetailModal
        policy={viewPolicy}
        onClose={() => setViewPolicy(null)}
      />
    </div>
  );
}
