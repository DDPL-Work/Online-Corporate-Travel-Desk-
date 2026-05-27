// super-admin/src/Modal/FinancialApprovalModal.jsx

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useDispatch } from "react-redux";
import { approveCorporate } from "../Redux/Slice/corporateListSlice";
import { toast } from "sonner";
import {
  FaWallet, FaCreditCard, FaCalendarAlt, FaShieldAlt,
  FaTimes, FaCheckCircle, FaArrowRight, FaBuilding,
  FaEnvelope, FaPlane, FaHotel
} from "react-icons/fa";
import { FiSettings, FiDollarSign } from "react-icons/fi";

export default function FinancialApprovalModal({ corporate, onClose }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("setup");
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    classification: "prepaid",
    billingCycle: "30days",
    customBillingDays: "",
    dueDays: 7,
    creditLimit: 0,
    walletBalance: 0,
    domesticFlight: 0,
    internationalOneWayFlight: 0,
    internationalReturnFlight: 0,
    domesticHotel: 0,
    internationalHotel: 0,
    isSubmitting: false
  });

  useEffect(() => { setMounted(true); }, []);

  const isPostpaid = form.classification === "postpaid";

  const tabs = [
    { id: "setup", label: "Account Setup", icon: <FiSettings size={13} /> },
    { id: "fees",  label: "Service Fees",  icon: <FiDollarSign size={13} /> },
  ];

  const handleSubmit = async () => {
    if (isPostpaid && !form.creditLimit) {
      toast.error("Credit limit is required for postpaid accounts");
      return;
    }
    if (isPostpaid && !form.dueDays) {
      toast.error("Due days are required for postpaid accounts");
      return;
    }
    setForm(prev => ({ ...prev, isSubmitting: true }));

    const payload = {
      classification: form.classification,
      billingCycle: isPostpaid ? form.billingCycle : undefined,
      customBillingDays: form.billingCycle === "custom" ? Number(form.customBillingDays) : undefined,
      dueDays: isPostpaid ? Number(form.dueDays) : undefined,
      creditLimit: isPostpaid ? Number(form.creditLimit) : 0,
      walletBalance: !isPostpaid ? Number(form.walletBalance) : 0,
      serviceCharges: {
        domesticFlight: Number(form.domesticFlight || 0),
        internationalOneWayFlight: Number(form.internationalOneWayFlight || 0),
        internationalReturnFlight: Number(form.internationalReturnFlight || 0),
        domesticHotel: Number(form.domesticHotel || 0),
        internationalHotel: Number(form.internationalHotel || 0),
      },
    };

    try {
      await dispatch(approveCorporate({ id: corporate._id, payload })).unwrap();
      toast.success("Corporate account approved & activated successfully!");
      onClose();
    } catch (err) {
      toast.error(err || "Failed to approve corporate");
      setForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const modalContent = (
    <>
      <style>{`
        .fam-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: #F8FAFC;
          border: 2px solid #F1F5F9;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 800;
          color: #1e293b;
          transition: all 0.25s ease;
          outline: none;
        }
        .fam-input:focus {
          border-color: #003399;
          background: white;
          box-shadow: 0 8px 20px -4px rgba(0,51,153,0.12);
        }
        .fam-scroll::-webkit-scrollbar { width: 5px; }
        .fam-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .fam-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes fam-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fam-down { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .fam-in  { animation: fam-in   0.3s ease-out forwards; }
        .fam-down{ animation: fam-down 0.3s ease-out forwards; }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <div
          className={`bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col transition-all duration-500 ${mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
          style={{ maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── HEADER ── */}
          <div
            className="relative bg-gradient-to-r from-[#003399] via-[#000d26] to-[#1a0a00] px-7 py-6 text-white shrink-0"
            style={{ borderBottom: "2px solid #d97706" }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
            >
              <FaTimes size={17} />
            </button>

            <div className="flex items-center gap-5">
              <div className="w-13 h-13 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                <FaShieldAlt size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase">Account Configuration</h2>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Approval & Financial Setup</p>
              </div>
            </div>

            {/* Gold glows */}
            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(217,119,6,0.18)" }} />
            <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ background: "rgba(217,119,6,0.08)" }} />
          </div>

          {/* ── TABS ── */}
          <div className="flex border-b border-slate-200 px-5 shrink-0 bg-slate-50">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? idx % 2 === 0 ? "border-[#003399] text-[#003399]" : "border-[#d97706] text-[#d97706]"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── BODY ── */}
          <div className="flex-1 overflow-y-auto fam-scroll bg-white">
            <div className="p-6 space-y-6">

              {/* ── TAB: Account Setup ── */}
              {activeTab === "setup" && (
                <div className="space-y-6 fam-in">

                  {/* Corporate brief */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#003399]/10 rounded-xl flex items-center justify-center text-[#003399]">
                        <FaBuilding size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Corporate</p>
                        <p className="text-sm font-black text-slate-800 truncate">{corporate?.corporateName || "N/A"}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#d97706]/10 rounded-xl flex items-center justify-center text-[#d97706]">
                        <FaEnvelope size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                        <p className="text-sm font-black text-slate-800 truncate">{corporate?.primaryContact?.email || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Classification toggle */}
                  <div className="space-y-3">
                    <SectionTitle label="Account Type" color="navy" />
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setForm(p => ({ ...p, classification: "prepaid" }))}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                          !isPostpaid ? "border-[#d97706] bg-[#d97706]/5 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${!isPostpaid ? "bg-[#d97706] text-white" : "bg-slate-100 text-slate-500"}`}>
                          <FaWallet size={14} />
                        </div>
                        <div className="text-left">
                          <span className={`block font-black text-xs uppercase tracking-widest ${!isPostpaid ? "text-[#d97706]" : "text-slate-500"}`}>Prepaid</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Wallet Based</span>
                        </div>
                        {!isPostpaid && <FaCheckCircle className="ml-auto text-[#d97706]" />}
                      </button>

                      <button
                        onClick={() => setForm(p => ({ ...p, classification: "postpaid" }))}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                          isPostpaid ? "border-[#003399] bg-[#003399]/5 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isPostpaid ? "bg-[#003399] text-white" : "bg-slate-100 text-slate-500"}`}>
                          <FaCreditCard size={14} />
                        </div>
                        <div className="text-left">
                          <span className={`block font-black text-xs uppercase tracking-widest ${isPostpaid ? "text-[#003399]" : "text-slate-500"}`}>Postpaid</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Credit Based</span>
                        </div>
                        {isPostpaid && <FaCheckCircle className="ml-auto text-[#003399]" />}
                      </button>
                    </div>
                  </div>




                  {/* Postpaid → Billing Configuration */}
                  {isPostpaid && (
                    <div className="fam-in">
                      <SectionTitle label="Billing Configuration" color="navy" />
                      <div className="mt-3 grid grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                          <div className="relative">
                            <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003399]" size={12} />
                            <select
                              className="fam-input !pl-10"
                              value={form.billingCycle}
                              onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                            >
                              <option value="15days">15 Days</option>
                              <option value="30days">30 Days</option>
                              <option value="custom">Custom Days</option>
                            </select>
                          </div>
                        </div>

                        {form.billingCycle === "custom" && (
                          <div className="fam-down">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Custom Term (Days)</label>
                            <input type="number" className="fam-input" placeholder="e.g. 45"
                              value={form.customBillingDays}
                              onChange={e => setForm({ ...form, customBillingDays: e.target.value })} />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Due Days</label>
                          <div className="relative">
                            <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003399]" size={12} />
                            <input type="number" className="fam-input !pl-10" placeholder="e.g. 15"
                              value={form.dueDays}
                              onChange={e => setForm({ ...form, dueDays: e.target.value })} />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assigned Credit Limit</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#003399] text-base">₹</span>
                            <input type="number" className="fam-input !pl-10 text-base" placeholder="0.00"
                              value={form.creditLimit}
                              onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: Service Fees ── */}
              {activeTab === "fees" && (
                <div className="space-y-5 fam-in">

                  {/* Flights */}
                  <div>
                    <SectionTitle label="Flight Service Fees" color="navy" />
                    <div className="mt-3 p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <FaPlane size={12} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Per Passenger</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <FeeInput label="Domestic" value={form.domesticFlight} onChange={v => setForm({ ...form, domesticFlight: v })} />
                        <FeeInput label="Intl One-Way" value={form.internationalOneWayFlight} onChange={v => setForm({ ...form, internationalOneWayFlight: v })} />
                        <FeeInput label="Intl Return" value={form.internationalReturnFlight} onChange={v => setForm({ ...form, internationalReturnFlight: v })} />
                      </div>
                    </div>
                  </div>

                  {/* Hotels */}
                  <div>
                    <SectionTitle label="Hotel Service Fees" color="gold" />
                    <div className="mt-3 p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                          <FaHotel size={12} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Per Transaction</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FeeInput label="Domestic" value={form.domesticHotel} onChange={v => setForm({ ...form, domesticHotel: v })} />
                        <FeeInput label="International" value={form.internationalHotel} onChange={v => setForm({ ...form, internationalHotel: v })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {activeTab === "setup" && (
                <button
                  onClick={() => setActiveTab("fees")}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2"
                >
                  Next: Service Fees <FaArrowRight size={10} />
                </button>
              )}
              {activeTab === "fees" && (
                <button
                  onClick={handleSubmit}
                  disabled={form.isSubmitting}
                  className="group px-8 py-2.5 bg-gradient-to-r from-[#003399] to-[#000d26] text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
                  style={{ borderBottom: "2px solid #d97706" }}
                >
                  {form.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating...
                    </span>
                  ) : (
                    <>
                      Confirm & Activate
                      <FaArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

/* ── HELPERS ── */

function SectionTitle({ label, color = "navy" }) {
  const isGold = color === "gold";
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isGold ? "#d97706" : "#003399" }} />
      <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: isGold ? "#d97706" : "#003399" }}>
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function FeeInput({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#003399] text-xs">₹</span>
        <input
          type="number"
          className="fam-input !pl-9 !pr-3 !py-2 !text-xs"
          placeholder="0"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
