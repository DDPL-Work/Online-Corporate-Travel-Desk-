import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiShield,
  FiArrowRight,
  FiRefreshCw,
  FiCreditCard,
  FiCalendar,
  FiActivity,
  FiDollarSign,
  FiInfo,
} from "react-icons/fi";
import { FaBuilding, FaRupeeSign } from "react-icons/fa";
import { fetchCorporateAdmin, updateCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import { C } from "../Shared/color";

const CORPORATE_FIELDS = [
  { key: "corporateName", label: "Corporate Designation", icon: FiUser, type: "text", editable: true },
  { key: "classification", label: "Classification", icon: FiBriefcase, type: "text", editable: true },
  { key: "billingCycle", label: "Billing Protocol", icon: FiCalendar, type: "text", editable: true },
];

const ADDRESS_FIELDS = [
  { key: "registeredAddress.street", label: "Tactical Street", icon: FiMapPin, type: "text", editable: true },
  { key: "registeredAddress.city", label: "Operational City", icon: FiMapPin, type: "text", editable: true },
  { key: "registeredAddress.state", label: "Strategic State", icon: FiMapPin, type: "text", editable: true },
  { key: "registeredAddress.pincode", label: "Sector Pincode", icon: FiMapPin, type: "text", editable: true },
];

const CONTACT_FIELDS = [
  { key: "primaryContact.name", label: "Designated Name", icon: FiUser, type: "text", editable: true },
  { key: "primaryContact.email", label: "Verified Email", icon: FiMail, type: "email", editable: true },
  { key: "primaryContact.mobile", label: "Comm. Mobile", icon: FiPhone, type: "tel", editable: true },
];

const SSO_FIELDS = [
  { key: "ssoConfig.type", label: "Protocol Provider", icon: FiShield, type: "text", editable: true },
  { key: "ssoConfig.domain", label: "Authorized Domain", icon: FiShield, type: "text", editable: true },
  { key: "ssoConfig.verified", label: "Validation Status", icon: FiShield, type: "checkbox", editable: true },
];

function getInitials(name = "") {
  return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const getNestedValue = (obj, path) => {
  if (!obj) return "";
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || "";
};

export default function TravelAdminProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { corporate, loading, error } = useSelector((state) => state.corporateAdmin);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchCorporateAdmin()); }, [dispatch]);

  useEffect(() => { if (corporate && !formData) setFormData(JSON.parse(JSON.stringify(corporate))); }, [corporate]);

  const handleFieldChange = (path, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(updateCorporateAdmin(formData)).unwrap();
      setEditing(false);
      dispatch(fetchCorporateAdmin());
    } catch (err) { alert("Protocol Failure: Unable to update profile."); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    setFormData(JSON.parse(JSON.stringify(corporate)));
    setEditing(false);
  };

  if (loading && !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
         <div className="flex flex-col items-center gap-4">
            <FiRefreshCw className="animate-spin" size={32} style={{ color: C.gold }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: C.navy }}>Synchronizing Profile...</p>
         </div>
      </div>
    );
  }

  if (!formData) return null;

  const initials = getInitials(formData.corporateName);
  const walletBalance = corporate.walletBalance || 0;
  const creditLimit = corporate.creditLimit || 0;
  const creditUtilization = corporate.creditUtilization || 0;
  const usedCredit = (creditLimit * creditUtilization) / 100;

  const isActive = corporate.status?.toLowerCase() === "active";

  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <div className={`p-3 rounded-xl bg-white/10 border border-white/10 ${loading ? "animate-spin" : ""}`}>
                  <FiRefreshCw size={20} />
               </div>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FaBuilding size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Corporate Profile Hub</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Manage your corporate credentials, authorization matrix & documents</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ── LEFT: Identity Card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden sticky top-8">
              <div className="h-24" style={{ background: `linear-gradient(to right, ${C.navy}, ${C.navyMid})` }}/>
              <div className="px-6 pb-8 -mt-12 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-white border-8 border-white shadow-xl flex items-center justify-center text-2xl font-black" style={{ color: C.navy }}>
                  {initials || <FaBuilding size={32} />}
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-800 leading-tight">
                  {formData.corporateName}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{formData.classification || "—"}</p>
                
                <div className="mt-4 w-full flex flex-col gap-2 items-center">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ color: C.navy, background: C.gold + "22" }}>
                    {formData.billingCycle || "No Billing Cycle"}
                  </span>
                  <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {corporate.status || "INACTIVE"}
                  </span>
                </div>

                <div className="mt-8 w-full border-t border-slate-100 pt-6 space-y-4 text-left">
                  <InfoRow icon={FaRupeeSign} value={`₹${walletBalance.toLocaleString()}`} label="Liquid Assets" />
                  <InfoRow icon={FiCreditCard} value={`₹${creditLimit.toLocaleString()}`} label="Credit Authorization" />
                  <InfoRow icon={FiActivity} value={`₹${usedCredit.toLocaleString()}`} label="Deployed Credit" />
                  <InfoRow icon={FiUser} value={formData.primaryContact?.name || "—"} label="Primary Contact" />
                  <InfoRow icon={FiMail} value={formData.primaryContact?.email || "—"} label="Contact Email" />
                  <InfoRow icon={FiPhone} value={formData.primaryContact?.mobile || "—"} label="Contact Mobile" />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content Panels ── */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Corporate & Operational Details */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between rounded-t-[2rem]" style={{ background: `linear-gradient(to right, white, ${C.gold}11)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: C.gold + "22" }}>
                      <FaBuilding style={{ color: C.navy }} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Corporate Information</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Strategic & Operational Base Registry</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <div className="flex gap-2">
                         <button onClick={handleCancel} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition">Cancel</button>
                         <button 
                          onClick={handleSave} 
                          disabled={saving}
                          className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-md" style={{ background: C.gold, color: C.navy }}
                         >
                          {saving ? "Saving..." : "Save Changes"}
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-md" style={{ background: C.offWhite, color: C.navy }}>
                        <FiEdit2 size={12} /> Edit Profile
                      </button>
                    )}
                  </div>
               </div>
               
               <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {CORPORATE_FIELDS.concat(ADDRESS_FIELDS).map((f) => (
                      <Field
                        key={f.key}
                        field={f}
                        value={getNestedValue(formData, f.key)}
                        editing={editing}
                        onChange={(v) => handleFieldChange(f.key, v)}
                      />
                    ))}
                  </div>
               </div>
            </div>

            {/* Primary Liaison */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-sm">
                  <FiUser />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Primary Liaison</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Direct Organizational Contact</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {CONTACT_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(formData, f.key)}
                      editing={editing}
                      onChange={(v) => handleFieldChange(f.key, v)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Security Protocols (SSO) */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                  <FiShield />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Security Protocols (SSO)</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Single Sign-On Configuration</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {SSO_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(formData, f.key)}
                      editing={editing}
                      onChange={(v) => handleFieldChange(f.key, v)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Engagement Fees */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                  <FiDollarSign />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Platform Engagement Fees</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Service Charges for Aviation & Hospitality</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aviation Service Matrix (Per Pax)</p>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InfoRow label="Domestic" value={`₹${corporate.serviceCharges?.domesticFlight?.toLocaleString() || "0"}`} />
                        <InfoRow label="Intl O/W" value={`₹${corporate.serviceCharges?.internationalOneWayFlight?.toLocaleString() || "0"}`} />
                        <InfoRow label="Intl RTN" value={`₹${corporate.serviceCharges?.internationalReturnFlight?.toLocaleString() || "0"}`} />
                     </div>
                  </div>
                  <div className="space-y-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hospitality Service Matrix (Per Txn)</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoRow label="Domestic" value={`₹${corporate.serviceCharges?.domesticHotel?.toLocaleString() || "0"}`} />
                        <InfoRow label="International" value={`₹${corporate.serviceCharges?.internationalHotel?.toLocaleString() || "0"}`} />
                     </div>
                  </div>
                </div>
                <div className="mt-8 p-4 rounded-2xl bg-slate-50 border flex items-center gap-3" style={{ borderColor: C.border }}>
                  <FiInfo className="text-gold shrink-0" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">Fees are finalized by platform super-admin. Contact support for protocol amendments.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ field, value, editing, onChange }) {
  const Icon = field.icon;
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} style={{ color: C.gold }} />
        {field.label}
      </label>
      {editing ? (
        field.type === "checkbox" ? (
          <div className="flex items-center gap-3 px-5 py-3 border rounded-[1.25rem]" style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}>
            <input type="checkbox" checked={value === true || value === "true" || value === "Allowed"} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded accent-gold" />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>{value ? "Authorized" : "Restricted"}</span>
          </div>
        ) : (
          <input
            type={field.type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={!field.editable}
            className={`w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm ${!field.editable ? "cursor-not-allowed text-slate-500" : ""}`}
            style={{ 
              backgroundColor: field.editable ? C.gold + "11" : "#f8fafc", 
              borderColor: field.editable ? C.gold + "44" : "#e2e8f0",
            }}
          />
        )
      ) : (
        <div className="px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all" style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
          {field.type === "checkbox" ? (
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>{value ? "Authorized" : "Restricted"}</span>
          ) : value || (
            <span className="text-slate-400 italic font-bold">Not configured</span>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 group">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#003399]/10 group-hover:text-[#003399] transition-all shadow-sm border border-slate-100">
          <Icon size={14} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-1">{label}</p>
        <p className="text-[11px] font-black text-slate-900 truncate leading-none">{value}</p>
      </div>
    </div>
  );
}