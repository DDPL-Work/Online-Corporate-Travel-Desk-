import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { FiAlertTriangle, FiCheck, FiX } from "react-icons/fi";
import { toggleCorporateStatus } from "../Redux/Slice/corporateListSlice";

export default function ToggleStatusModal({ corporate, onClose }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isActive = corporate?.status?.toLowerCase() === "active" || corporate?.status?.toLowerCase() === "approved";
  const newStatus = isActive ? "Suspend" : "Activate";
  const colorClass = isActive ? "text-amber-500" : "text-emerald-500";
  const bgClass = isActive ? "bg-amber-50" : "bg-emerald-50";
  const borderClass = isActive ? "border-amber-200" : "border-emerald-200";

  const handleToggle = async () => {
    setLoading(true);
    try {
      await dispatch(toggleCorporateStatus(corporate._id)).unwrap();
      toast.success(`Corporate ${newStatus}d successfully`);
      onClose();
    } catch (err) {
      toast.error(err || `Failed to ${newStatus.toLowerCase()} corporate`);
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ backgroundColor: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-0 flex justify-between items-start">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${bgClass} ${colorClass} ${borderClass}`}>
            <FiAlertTriangle size={24} />
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-black text-slate-800 mb-2">
            {newStatus} Corporate Account?
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Are you sure you want to <strong>{newStatus.toLowerCase()}</strong> the account for <strong className="text-slate-700">{corporate?.corporateName}</strong>?
          </p>
          {isActive ? (
            <p className="text-xs text-amber-600 font-bold mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100">
              Suspended accounts cannot log in or make bookings until they are reactivated.
            </p>
          ) : (
            <p className="text-xs text-emerald-600 font-bold mt-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              Activating this account will grant them full access to the platform.
            </p>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-6 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg transition-all ${
              isActive 
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" 
                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
            } disabled:opacity-60`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiCheck size={16} />
            )}
            Yes, {newStatus}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
