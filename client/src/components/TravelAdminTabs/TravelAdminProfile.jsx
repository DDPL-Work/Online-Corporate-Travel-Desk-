import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiShield,
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiBriefcase,
  FiCreditCard,
  FiAward,
  FiEdit2,
  FiSave,
  FiX,
  FiActivity,
} from "react-icons/fi";
import { FaBuilding, FaRupeeSign } from "react-icons/fa";
import { fetchCorporateAdmin, updateCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import { C } from "../Shared/color";

const StatCard = ({ label, value, icon: Icon, borderCls, iconBgCls, iconColorCls }) => (
  <div className={`bg-white rounded-2xl p-6 flex items-center gap-6 shadow-sm border ${borderCls}`} style={{ borderColor: C.border }}>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${iconBgCls}`}>
      <Icon size={24} className={iconColorCls} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black tracking-tight" style={{ color: C.navy }}>{value}</p>
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
    <div className="p-6 border-b bg-slate-50/50 flex items-center gap-3" style={{ borderColor: C.border }}>
      <div className="p-2 rounded-xl" style={{ background: `${C.navy}10`, color: C.navy }}><Icon size={20} /></div>
      <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{title}</h2>
    </div>
    <div className="p-8">
      <div className="grid md:grid-cols-2 gap-8">{children}</div>
    </div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
    {Icon && <Icon className="text-slate-400 mt-1 shrink-0" size={18} />}
    <div className="flex-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black mt-1 break-all" style={{ color: C.navy }}>{value ?? "—"}</p>
    </div>
  </div>
);

const EditableField = ({ label, value, onChange, type = "text", icon: Icon }) => (
  <div className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-200 transition-all">
    {Icon && <Icon className="text-slate-400 mt-1 shrink-0" size={18} />}
    <div className="flex-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      {type === "textarea" ? (
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full text-sm font-black border-2 rounded-xl px-4 py-3 outline-none focus:border-gold transition-all" style={{ borderColor: C.border, color: C.navy }} rows={2} />
      ) : type === "checkbox" ? (
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={value === true || value === "true" || value === "Allowed"} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded accent-gold" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>{value ? "Authorized" : "Restricted"}</span>
        </div>
      ) : (
        <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full text-sm font-black border-2 rounded-xl px-4 py-3 outline-none focus:border-gold transition-all" style={{ borderColor: C.border, color: C.navy }} />
      )}
    </div>
  </div>
);

const StatusBadgeLocal = ({ status }) => {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
      isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
    }`}>
      {status || "INACTIVE"}
    </span>
  );
};

export default function TravelAdminProfile() {
  const dispatch = useDispatch();
  const { corporate, loading, error } = useSelector((state) => state.corporateAdmin);
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
      dispatch(fetchCorporateAdmin());
    } catch (err) { alert("Protocol Failure: Unable to update profile."); }
    finally { setSaving(false); }
  };

  if (loading || !corporate || !formData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
       <div className="flex flex-col items-center gap-4">
          <FiRefreshCw className="animate-spin" size={32} style={{ color: C.gold }} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: C.navy }}>Synchronizing Profile...</p>
       </div>
    </div>
  );

  const walletBalance = corporate.walletBalance || 0;
  const creditLimit = corporate.creditLimit || 0;
  const creditUtilization = corporate.creditUtilization || 0;
  const usedCredit = (creditLimit * creditUtilization) / 100;

  return (
    <div className="min-h-screen font-sans pb-20 px-6 pt-8" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
              <FaBuilding size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Corporate Profile</h1>
              <p className="text-xs mt-1 font-bold uppercase tracking-widest" style={{ color: C.muted }}>Strategic Configuration of Institutional Assets</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadgeLocal status={corporate.status} />
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-white border rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:bg-slate-50" style={{ borderColor: C.navy, color: C.navy }}>
                <FiEdit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setFormData(JSON.parse(JSON.stringify(corporate))); setIsEditing(false); }} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition"><FiX size={16} /> Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-widest shadow-lg transition disabled:opacity-50" style={{ background: C.navy }}>{saving ? "SAVING..." : <><FiSave size={16} /> Update Protocol</>}</button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Liquid Assets" value={`₹${walletBalance.toLocaleString()}`} icon={FaRupeeSign} borderCls="border-[#000D26]" iconBgCls="bg-[#000D26]10" iconColorCls="text-[#000D26]" />
          <StatCard label="Credit Authorization" value={`₹${creditLimit.toLocaleString()}`} icon={FiCreditCard} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
          <StatCard label="Deployed Credit" value={`₹${usedCredit.toLocaleString()}`} icon={FiActivity} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
          <StatCard label="Utilization Index" value={`${creditUtilization}%`} icon={FiTrendingUp} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <SectionCard title="Strategic Identity" icon={FaBuilding}>
              {isEditing ? (
                <>
                  <EditableField label="Corporate Designation" value={formData.corporateName} onChange={(v) => handleFieldChange("corporateName", v)} icon={FiUser} />
                  <EditableField label="Classification" value={formData.classification} onChange={(v) => handleFieldChange("classification", v)} icon={FiBriefcase} />
                  <EditableField label="Billing Protocol" value={formData.billingCycle} onChange={(v) => handleFieldChange("billingCycle", v)} icon={FiCalendar} />
                </>
              ) : (
                <>
                  <InfoRow label="Corporate Designation" value={corporate.corporateName} icon={FiUser} />
                  <InfoRow label="Classification" value={corporate.classification} icon={FiBriefcase} />
                  <InfoRow label="Billing Protocol" value={corporate.billingCycle} icon={FiCalendar} />
                </>
              )}
           </SectionCard>

           <SectionCard title="Operational Base" icon={FiMapPin}>
              {isEditing ? (
                <>
                  <EditableField label="Tactical Street" value={formData.registeredAddress?.street} onChange={(v) => handleFieldChange("registeredAddress.street", v)} />
                  <EditableField label="Operational City" value={formData.registeredAddress?.city} onChange={(v) => handleFieldChange("registeredAddress.city", v)} />
                  <EditableField label="Strategic State" value={formData.registeredAddress?.state} onChange={(v) => handleFieldChange("registeredAddress.state", v)} />
                  <EditableField label="Sector Pincode" value={formData.registeredAddress?.pincode} onChange={(v) => handleFieldChange("registeredAddress.pincode", v)} />
                </>
              ) : (
                <>
                  <InfoRow label="Tactical Street" value={corporate.registeredAddress?.street} />
                  <InfoRow label="Operational City" value={corporate.registeredAddress?.city} />
                  <InfoRow label="Strategic State" value={corporate.registeredAddress?.state} />
                  <InfoRow label="Sector Pincode" value={corporate.registeredAddress?.pincode} />
                </>
              )}
           </SectionCard>

           <SectionCard title="Primary Liaison" icon={FiUser}>
              {isEditing ? (
                <>
                  <EditableField label="Designated Name" value={formData.primaryContact?.name} onChange={(v) => handleFieldChange("primaryContact.name", v)} icon={FiUser} />
                  <EditableField label="Verified Email" value={formData.primaryContact?.email} onChange={(v) => handleFieldChange("primaryContact.email", v)} icon={FiMail} type="email" />
                  <EditableField label="Comm. Mobile" value={formData.primaryContact?.mobile} onChange={(v) => handleFieldChange("primaryContact.mobile", v)} icon={FiPhone} />
                </>
              ) : (
                <>
                  <InfoRow label="Designated Name" value={corporate.primaryContact?.name} icon={FiUser} />
                  <InfoRow label="Verified Email" value={corporate.primaryContact?.email} icon={FiMail} />
                  <InfoRow label="Comm. Mobile" value={corporate.primaryContact?.mobile} icon={FiPhone} />
                </>
              )}
           </SectionCard>

           <SectionCard title="Security Protocols (SSO)" icon={FiShield}>
              {isEditing ? (
                <>
                  <EditableField label="Protocol Provider" value={formData.ssoConfig?.type} onChange={(v) => handleFieldChange("ssoConfig.type", v)} />
                  <EditableField label="Authorized Domain" value={formData.ssoConfig?.domain} onChange={(v) => handleFieldChange("ssoConfig.domain", v)} />
                  <EditableField label="Validation Status" value={formData.ssoConfig?.verified} onChange={(v) => handleFieldChange("ssoConfig.verified", v)} type="checkbox" />
                </>
              ) : (
                <>
                  <InfoRow label="Protocol Provider" value={corporate.ssoConfig?.type?.toUpperCase()} />
                  <InfoRow label="Authorized Domain" value={corporate.ssoConfig?.domain} />
                  <InfoRow label="Validation Status" value={corporate.ssoConfig?.verified ? <span className="flex items-center gap-1 text-emerald-500 font-black"><FiCheckCircle size={14} /> VALIDATED</span> : <span className="text-rose-500 font-black">PENDING</span>} />
                </>
              )}
           </SectionCard>
        </div>

        {/* Service Fees */}
        <div className="bg-white rounded-3xl border shadow-sm p-8" style={{ borderColor: C.border }}>
           <div className="flex items-center gap-3 mb-8 border-b pb-6" style={{ borderColor: C.offWhite }}>
              <div className="p-2 rounded-xl" style={{ background: `${C.gold}10`, color: C.gold }}><FiDollarSign size={20} /></div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">Platform Engagement Fees</h2>
           </div>
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
           <div className="mt-12 p-4 rounded-2xl bg-slate-50 border flex items-center gap-3" style={{ borderColor: C.border }}>
              <FiInfo className="text-gold shrink-0" />
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">Fees are finalized by platform super-admin. Contact support for protocol amendments.</p>
           </div>
        </div>
      </div>
    </div>
  );
}