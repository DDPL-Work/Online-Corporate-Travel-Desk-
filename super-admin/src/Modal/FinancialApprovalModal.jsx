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
  FaEnvelope,
  FaPlane,
  FaHotel,
  FaCoins
} from "react-icons/fa";

export default function FinancialApprovalModal({ corporate, onClose }) {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    classification: "prepaid",
    billingCycle: "30days",
    customBillingDays: "",
    creditLimit: 0,
    walletBalance: 0,
    domesticFlight: 0,
    internationalOneWayFlight: 0,
    internationalReturnFlight: 0,
    domesticHotel: 0,
    internationalHotel: 0,
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
      serviceCharges: {
        domesticFlight: Number(form.domesticFlight || 0),
        internationalOneWayFlight: Number(form.internationalOneWayFlight || 0),
        internationalReturnFlight: Number(form.internationalReturnFlight || 0),
        domesticHotel: Number(form.domesticHotel || 0),
        internationalHotel: Number(form.internationalHotel || 0),
      },
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
      <div className={`relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 transform ${mounted ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'}`}>
        
        {/* Header with Background Pattern */}
        <div className="relative bg-linear-to-r from-[#0A4D68] to-[#088395] p-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
            >
              <FaTimes size={20} />
            </button>
          </div>
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-xl">
              <FaShieldAlt size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase leading-none">Account Configuration</h2>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Approval & Financial Setup</p>
            </div>
          </div>

          {/* Decorative Pattern */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl"></div>
        </div>

        {/* Scrollable Body */}
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
          <div className="p-8 space-y-8">
            
            {/* Corporate Brief Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#0A4D68]/10 rounded-2xl flex items-center justify-center text-[#0A4D68]">
                  <FaBuilding size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Corporate Name</p>
                  <p className="text-sm font-black text-slate-800 truncate">{corporate?.corporateName || "N/A"}</p>
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <FaEnvelope size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Email</p>
                  <p className="text-sm font-black text-slate-800 truncate">{corporate?.primaryContact?.email || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Account Classification Toggle */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0A4D68]"></div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Account Type</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setForm(prev => ({ ...prev, classification: "prepaid" }))}
                  className={`relative p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group ${form.classification === 'prepaid' ? 'border-[#0A4D68] bg-[#0A4D68]/5 shadow-lg shadow-[#0A4D68]/5' : 'border-white bg-white shadow-xs hover:border-slate-200'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${form.classification === 'prepaid' ? 'bg-[#0A4D68] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <FaWallet size={16} />
                  </div>
                  <div className="text-left">
                    <span className={`block font-black text-xs uppercase tracking-widest ${form.classification === 'prepaid' ? 'text-[#0A4D68]' : 'text-slate-500'}`}>Prepaid</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Wallet Based</span>
                  </div>
                  {form.classification === 'prepaid' && <FaCheckCircle className="ml-auto text-[#0A4D68]" />}
                </button>

                <button 
                  onClick={() => setForm(prev => ({ ...prev, classification: "postpaid" }))}
                  className={`relative p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group ${form.classification === 'postpaid' ? 'border-[#0A4D68] bg-[#0A4D68]/5 shadow-lg shadow-[#0A4D68]/5' : 'border-white bg-white shadow-xs hover:border-slate-200'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${form.classification === 'postpaid' ? 'bg-[#0A4D68] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <FaCreditCard size={16} />
                  </div>
                  <div className="text-left">
                    <span className={`block font-black text-xs uppercase tracking-widest ${form.classification === 'postpaid' ? 'text-[#0A4D68]' : 'text-slate-500'}`}>Postpaid</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Credit Based</span>
                  </div>
                  {form.classification === 'postpaid' && <FaCheckCircle className="ml-auto text-[#0A4D68]" />}
                </button>
              </div>
            </div>

            {/* Financial Config Section */}
            <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <FaCoins className="text-[#0A4D68]" size={14} />
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Financial Configuration</h3>
              </div>

              <div className="animate-fadeIn">
                {form.classification === "postpaid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                      <div className="relative group">
                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A4D68] transition-transform group-focus-within:scale-110" />
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assigned Credit Limit</label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#0A4D68] text-lg transition-transform group-focus-within:scale-110">₹</div>
                        <input
                          type="number"
                          className="modal-input pl-16 py-4 text-lg"
                          placeholder="0.00"
                          value={form.creditLimit}
                          onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-fadeIn">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Initial Wallet Balance</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#0A4D68] text-lg transition-transform group-focus-within:scale-110">₹</div>
                      <input
                        type="number"
                        className="modal-input pl-16 py-4 text-lg"
                        placeholder="0.00"
                        value={form.walletBalance}
                        onChange={(e) => setForm({ ...form, walletBalance: e.target.value })}
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-bold text-[#088395] bg-[#088395]/5 p-3 rounded-xl border border-[#088395]/10 italic">
                      * This amount will be credited to the corporate wallet immediately upon activation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Service Charges Section */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#088395]"></div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Service Fee Configuration</label>
              </div>

              {/* Flights Card */}
              <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <FaPlane size={14} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Flight Service Fees <span className="text-[9px] text-slate-400 lowercase italic font-medium ml-1">(per pax)</span></h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FeeInput 
                    label="Domestic" 
                    value={form.domesticFlight} 
                    onChange={(val) => setForm({ ...form, domesticFlight: val })} 
                  />
                  <FeeInput 
                    label="Intl One-Way" 
                    value={form.internationalOneWayFlight} 
                    onChange={(val) => setForm({ ...form, internationalOneWayFlight: val })} 
                  />
                  <FeeInput 
                    label="Intl Return" 
                    value={form.internationalReturnFlight} 
                    onChange={(val) => setForm({ ...form, internationalReturnFlight: val })} 
                  />
                </div>
              </div>

              {/* Hotels Card */}
              <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                    <FaHotel size={14} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Hotel Service Fees <span className="text-[9px] text-slate-400 lowercase italic font-medium ml-1">(per transaction)</span></h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FeeInput 
                    label="Domestic" 
                    value={form.domesticHotel} 
                    onChange={(val) => setForm({ ...form, domesticHotel: val })} 
                  />
                  <FeeInput 
                    label="International" 
                    value={form.internationalHotel} 
                    onChange={(val) => setForm({ ...form, internationalHotel: val })} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={onClose}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all hover:translate-x-[-4px]"
          >
            Cancel Process
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={form.isSubmitting}
            className="group relative px-10 py-4 bg-linear-to-r from-[#0A4D68] to-[#088395] text-white rounded-[1.25rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-[#0A4D68]/20 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-60 flex items-center gap-3"
          >
            {form.isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Activating...
              </span>
            ) : (
              <>
                Confirm & Activate Account
                <FaArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-input {
          width: 100%;
          padding-top: 0.875rem;
          padding-bottom: 0.875rem;
          padding-right: 1.25rem;
          padding-left: 1.25rem;
          background-color: #F8FAFC;
          border: 2px solid #F1F5F9;
          border-radius: 1.25rem;
          font-size: 0.875rem;
          font-weight: 800;
          color: #1e293b;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .modal-input:focus {
          border-color: #0A4D68;
          background-color: white;
          box-shadow: 0 10px 15px -3px rgba(10, 77, 104, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

function FeeInput({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">{label}</label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#0A4D68] text-xs">₹</div>
        <input
          type="number"
          className="modal-input pl-12 pr-3 py-2.5 text-xs"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}