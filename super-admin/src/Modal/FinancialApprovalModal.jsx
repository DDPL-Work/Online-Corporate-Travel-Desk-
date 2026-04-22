// super-admin/src/Modal/FinancialApprovalModal.jsx

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { approveCorporate } from "../Redux/Slice/corporateListSlice";
import { toast } from "react-toastify";
import { 
  FaWallet, 
  FaCreditCard, 
  FaCalendarAlt, 
  FaShieldAlt, 
  FaTimes, 
  FaCheckCircle,
  FaArrowRight,
  FaBuilding,
  FaEnvelope
} from "react-icons/fa";

export default function FinancialApprovalModal({ corporate, onClose }) {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    classification: "prepaid",
    billingCycle: "30days",
    customBillingDays: "",
    creditLimit: 0,
    walletBalance: 0,
    isSubmitting: false
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async () => {
    if (form.classification === "postpaid" && !form.creditLimit) {
      toast.error("Credit limit is required for postpaid accounts");
      return;
    }

    setForm(prev => ({ ...prev, isSubmitting: true }));

    const payload = {
      classification: form.classification,
      billingCycle: form.classification === "postpaid" ? form.billingCycle : undefined,
      customBillingDays: form.billingCycle === "custom" ? Number(form.customBillingDays) : undefined,
      creditLimit: form.classification === "postpaid" ? Number(form.creditLimit) : 0,
      walletBalance: form.classification === "prepaid" ? Number(form.walletBalance) : 0,
    };

    try {
      await dispatch(
        approveCorporate({
          id: corporate._id,
          payload,
        })
      ).unwrap();

      toast.success("Corporate account approved & activated successfully!");
      onClose();
    } catch (err) {
      toast.error(err || "Failed to approve corporate");
      setForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 transform ${mounted ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'}`}>
        
        {/* Header with Background Pattern */}
        <div className="relative bg-[#0A4D68] p-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
            >
              <FaTimes size={20} />
            </button>
          </div>
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
              <FaShieldAlt size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Account Configuration</h2>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Approval & Financial Setup</p>
            </div>
          </div>

          {/* Decorative Pattern */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Corporate Brief */}
        <div className="px-8 pt-8 flex flex-col md:flex-row gap-4">
           <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
             <div className="w-10 h-10 bg-[#0A4D68]/10 rounded-xl flex items-center justify-center text-[#0A4D68]">
               <FaBuilding />
             </div>
             <div className="text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Company</p>
               <p className="text-sm font-bold text-slate-800 tracking-tight leading-none truncate max-w-[150px]">{corporate?.corporateName || "N/A"}</p>
             </div>
           </div>
           <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
             <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
               <FaEnvelope />
             </div>
             <div className="text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Primary Email</p>
               <p className="text-sm font-bold text-slate-800 tracking-tight leading-none truncate max-w-[150px]">{corporate?.primaryContact?.email || "N/A"}</p>
             </div>
           </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          
          {/* Account Classification Toggle */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Classification Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setForm(prev => ({ ...prev, classification: "prepaid" }))}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${form.classification === 'prepaid' ? 'border-[#0A4D68] bg-[#0A4D68]/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${form.classification === 'prepaid' ? 'bg-[#0A4D68] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <FaWallet />
                  </div>
                  <span className={`font-black text-xs uppercase tracking-widest ${form.classification === 'prepaid' ? 'text-[#0A4D68]' : 'text-slate-500'}`}>Prepaid</span>
                </div>
                {form.classification === 'prepaid' && <FaCheckCircle className="text-[#0A4D68]" />}
              </button>

              <button 
                onClick={() => setForm(prev => ({ ...prev, classification: "postpaid" }))}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${form.classification === 'postpaid' ? 'border-[#0A4D68] bg-[#0A4D68]/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${form.classification === 'postpaid' ? 'bg-[#0A4D68] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <FaCreditCard />
                  </div>
                  <span className={`font-black text-xs uppercase tracking-widest ${form.classification === 'postpaid' ? 'text-[#0A4D68]' : 'text-slate-500'}`}>Postpaid</span>
                </div>
                {form.classification === 'postpaid' && <FaCheckCircle className="text-[#0A4D68]" />}
              </button>
            </div>
          </div>

          {/* Dynamic Inputs Section */}
          <div className="animate-fadeIn">
            {form.classification === "postpaid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A4D68]" />
                    <select
                      className="modal-input pl-12"
                      value={form.billingCycle}
                      onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                    >
                      <option value="15days">15 Days</option>
                      <option value="30days">30 Days</option>
                      <option value="custom">Custom Days</option>
                    </select>
                  </div>
                </div>

                {form.billingCycle === "custom" && (
                  <div className="animate-slideDown">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Custom Term (Days)</label>
                    <input
                      type="number"
                      className="modal-input"
                      placeholder="e.g. 45"
                      value={form.customBillingDays}
                      onChange={(e) => setForm({ ...form, customBillingDays: e.target.value })}
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assigned Credit Limit (₹)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#0A4D68]">₹</div>
                    <input
                      type="number"
                      className="modal-input pl-10"
                      placeholder="0.00"
                      value={form.creditLimit}
                      onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Initial Wallet Balance (₹)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#0A4D68]">₹</div>
                  <input
                    type="number"
                    className="modal-input pl-10"
                    placeholder="0.00"
                    value={form.walletBalance}
                    onChange={(e) => setForm({ ...form, walletBalance: e.target.value })}
                  />
                </div>
                <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 italic">* This will be credited to the corporate wallet immediately.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={form.isSubmitting}
            className="px-8 py-4 bg-[#0A4D68] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-[#0A4D68]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 flex items-center gap-3"
          >
            {form.isSubmitting ? "Activating..." : (
              <>
                Confirm & Activate
                <FaArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-input {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background-color: white;
          border: 2px solid #f1f5f9;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          transition: all 0.2s;
          outline: none;
        }
        .modal-input:focus {
          border-color: #0A4D68;
          background-color: #f8fafc;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}