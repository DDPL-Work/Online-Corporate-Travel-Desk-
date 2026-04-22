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
} from "react-icons/fi";
import { FaBuilding, FaRupeeSign } from "react-icons/fa";
import { fetchCorporateAdmin, updateCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

// Helper Components (StatCard, SectionCard, InfoRow, StatusBadge remain same)
const StatCard = ({ label, value, icon: Icon, borderCls, iconBgCls, iconColorCls }) => (
  <div className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}>
      <Icon size={18} className={iconColorCls} />
    </div>
    <div className="text-left">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-[#0A4D68]/10">
        <Icon className="text-[#0A4D68]" size={18} />
      </div>
      <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{title}</h2>
    </div>
    <div className="p-5">
      <div className="grid md:grid-cols-2 gap-5">{children}</div>
    </div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
    {Icon && <Icon className="text-slate-400 mt-0.5 shrink-0" size={16} />}
    <div className="flex-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5 wrap-break-word">{value ?? "—"}</p>
    </div>
  </div>
);

const EditableField = ({ label, value, onChange, type = "text", icon: Icon }) => (
  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
    {Icon && <Icon className="text-slate-400 mt-0.5 shrink-0" size={16} />}
    <div className="flex-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full text-sm font-medium text-slate-800 border rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#0A4D68] focus:border-[#0A4D68]"
          rows={2}
        />
      ) : type === "checkbox" ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === true || value === "true" || value === "Allowed"}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-[#0A4D68] rounded focus:ring-[#0A4D68]"
          />
          <span className="text-sm text-slate-600">{value ? "Allowed" : "Not Allowed"}</span>
        </div>
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full text-sm font-medium text-slate-800 border rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#0A4D68] focus:border-[#0A4D68]"
        />
      )}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
      isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
    }`}>
      {status || "inactive"}
    </span>
  );
};

export default function TravelAdminProfile() {
  const dispatch = useDispatch();
  const { corporate, loading, error } = useSelector((state) => state.corporateAdmin);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchCorporateAdmin());
  }, [dispatch]);

  useEffect(() => {
    if (corporate && !formData) {
      // Deep copy for editing
      setFormData(JSON.parse(JSON.stringify(corporate)));
    }
  }, [corporate]);

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
      // Refresh data
      dispatch(fetchCorporateAdmin());
    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(JSON.parse(JSON.stringify(corporate)));
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-[#F8FAFC] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A4D68] mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading corporate profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-[#F8FAFC] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 text-center border-l-4 border-red-500">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => dispatch(fetchCorporateAdmin())} className="mt-4 px-4 py-2 bg-[#0A4D68] text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!corporate || !formData) return null;

  const walletBalance = corporate.walletBalance || 0;
  const creditLimit = corporate.creditLimit || 0;
  const creditUtilization = corporate.creditUtilization || 0;
  const usedCredit = (creditLimit * creditUtilization) / 100;

  return (
    <div className="min-h-screen p-6 font-sans bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER with Edit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
              <FaBuilding size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Corporate Profile
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
                Travel Admin – Corporate Configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={corporate.status} />
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#0A4D68] text-[#0A4D68] rounded-lg font-medium hover:bg-[#0A4D68]/5 transition"
              >
                <FiEdit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <FiX size={16} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0A4D68] text-white rounded-lg font-medium hover:bg-[#088395] transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : <><FiSave size={16} /> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STAT CARDS (read-only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Wallet Balance" value={`₹ ${walletBalance.toLocaleString()}`} icon={FaRupeeSign} borderCls="border-[#0A4D68]" iconBgCls="bg-[#0A4D68]/10" iconColorCls="text-[#0A4D68]" />
          <StatCard label="Credit Limit" value={`₹ ${creditLimit.toLocaleString()}`} icon={FiCreditCard} borderCls="border-[#088395]" iconBgCls="bg-[#088395]/10" iconColorCls="text-[#088395]" />
          <StatCard label="Used Credit" value={`₹ ${usedCredit.toLocaleString()}`} icon={FiTrendingUp} borderCls="border-[#F59E0B]" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Credit Utilization" value={`${creditUtilization}%`} icon={FiDollarSign} borderCls="border-[#10B981]" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        </div>

        {/* Editable Sections */}
        <SectionCard title="Corporate Information" icon={FaBuilding}>
          {isEditing ? (
            <>
              <EditableField label="Corporate Name" value={formData.corporateName} onChange={(v) => handleFieldChange("corporateName", v)} icon={FiUser} />
              <EditableField label="Classification" value={formData.classification} onChange={(v) => handleFieldChange("classification", v)} icon={FiBriefcase} />
              <EditableField label="Billing Cycle" value={formData.billingCycle} onChange={(v) => handleFieldChange("billingCycle", v)} icon={FiCalendar} />
            </>
          ) : (
            <>
              <InfoRow label="Corporate Name" value={corporate.corporateName} icon={FiUser} />
              <InfoRow label="Classification" value={corporate.classification} icon={FiBriefcase} />
              <InfoRow label="Billing Cycle" value={corporate.billingCycle} icon={FiCalendar} />
            </>
          )}
        </SectionCard>

        {/* Registered Address */}
        <SectionCard title="Registered Address" icon={FiMapPin}>
          {isEditing ? (
            <>
              <EditableField label="Street" value={formData.registeredAddress?.street} onChange={(v) => handleFieldChange("registeredAddress.street", v)} />
              <EditableField label="City" value={formData.registeredAddress?.city} onChange={(v) => handleFieldChange("registeredAddress.city", v)} />
              <EditableField label="State" value={formData.registeredAddress?.state} onChange={(v) => handleFieldChange("registeredAddress.state", v)} />
              <EditableField label="Pincode" value={formData.registeredAddress?.pincode} onChange={(v) => handleFieldChange("registeredAddress.pincode", v)} />
              <EditableField label="Country" value={formData.registeredAddress?.country} onChange={(v) => handleFieldChange("registeredAddress.country", v)} />
            </>
          ) : (
            <>
              <InfoRow label="Street" value={corporate.registeredAddress?.street} />
              <InfoRow label="City" value={corporate.registeredAddress?.city} />
              <InfoRow label="State" value={corporate.registeredAddress?.state} />
              <InfoRow label="Pincode" value={corporate.registeredAddress?.pincode} />
              <InfoRow label="Country" value={corporate.registeredAddress?.country} />
            </>
          )}
        </SectionCard>

        {/* Primary Contact */}
        <SectionCard title="Primary Contact" icon={FiUser}>
          {isEditing ? (
            <>
              <EditableField label="Name" value={formData.primaryContact?.name} onChange={(v) => handleFieldChange("primaryContact.name", v)} icon={FiUser} />
              <EditableField label="Email" value={formData.primaryContact?.email} onChange={(v) => handleFieldChange("primaryContact.email", v)} icon={FiMail} type="email" />
              <EditableField label="Mobile" value={formData.primaryContact?.mobile} onChange={(v) => handleFieldChange("primaryContact.mobile", v)} icon={FiPhone} />
            </>
          ) : (
            <>
              <InfoRow label="Name" value={corporate.primaryContact?.name} icon={FiUser} />
              <InfoRow label="Email" value={corporate.primaryContact?.email} icon={FiMail} />
              <InfoRow label="Mobile" value={corporate.primaryContact?.mobile} icon={FiPhone} />
            </>
          )}
        </SectionCard>

        {/* Secondary Contact (conditional) */}
        {corporate.secondaryContact?.email && (
          <SectionCard title="Secondary Contact" icon={FiUser}>
            {isEditing ? (
              <>
                <EditableField label="Name" value={formData.secondaryContact?.name} onChange={(v) => handleFieldChange("secondaryContact.name", v)} />
                <EditableField label="Email" value={formData.secondaryContact?.email} onChange={(v) => handleFieldChange("secondaryContact.email", v)} type="email" />
                <EditableField label="Mobile" value={formData.secondaryContact?.mobile} onChange={(v) => handleFieldChange("secondaryContact.mobile", v)} />
              </>
            ) : (
              <>
                <InfoRow label="Name" value={corporate.secondaryContact?.name} />
                <InfoRow label="Email" value={corporate.secondaryContact?.email} />
                <InfoRow label="Mobile" value={corporate.secondaryContact?.mobile} />
              </>
            )}
          </SectionCard>
        )}

        {/* Billing Department (conditional) */}
        {corporate.billingDepartment?.email && (
          <SectionCard title="Billing Department" icon={FiDollarSign}>
            {isEditing ? (
              <>
                <EditableField label="Name" value={formData.billingDepartment?.name} onChange={(v) => handleFieldChange("billingDepartment.name", v)} />
                <EditableField label="Email" value={formData.billingDepartment?.email} onChange={(v) => handleFieldChange("billingDepartment.email", v)} type="email" />
                <EditableField label="Mobile" value={formData.billingDepartment?.mobile} onChange={(v) => handleFieldChange("billingDepartment.mobile", v)} />
              </>
            ) : (
              <>
                <InfoRow label="Name" value={corporate.billingDepartment?.name} />
                <InfoRow label="Email" value={corporate.billingDepartment?.email} />
                <InfoRow label="Mobile" value={corporate.billingDepartment?.mobile} />
              </>
            )}
          </SectionCard>
        )}

        {/* SSO Configuration */}
        <SectionCard title="SSO Configuration" icon={FiShield}>
          {isEditing ? (
            <>
              <EditableField label="Provider" value={formData.ssoConfig?.type} onChange={(v) => handleFieldChange("ssoConfig.type", v)} />
              <EditableField label="Domain" value={formData.ssoConfig?.domain} onChange={(v) => handleFieldChange("ssoConfig.domain", v)} />
              <EditableField label="Verified" value={formData.ssoConfig?.verified} onChange={(v) => handleFieldChange("ssoConfig.verified", v)} type="checkbox" />
            </>
          ) : (
            <>
              <InfoRow label="Provider" value={corporate.ssoConfig?.type?.toUpperCase()} />
              <InfoRow label="Domain" value={corporate.ssoConfig?.domain} />
              <InfoRow label="Verification Status" value={corporate.ssoConfig?.verified ? <span className="flex items-center gap-1 text-green-600 font-semibold"><FiCheckCircle size={14} /> Verified</span> : "Pending"} />
            </>
          )}
        </SectionCard>

        {/* Travel Policy */}
        {/* <SectionCard title="Travel Policy" icon={FiAward}>
          {isEditing ? (
            <>
              <EditableField label="Allowed Cabin Classes" value={formData.travelPolicy?.allowedCabinClass?.join(", ")} onChange={(v) => handleFieldChange("travelPolicy.allowedCabinClass", v.split(",").map(s => s.trim()))} />
              <EditableField label="Advance Booking Days" value={formData.travelPolicy?.advanceBookingDays} onChange={(v) => handleFieldChange("travelPolicy.advanceBookingDays", parseInt(v) || 0)} type="number" />
              <EditableField label="Max Booking Amount" value={formData.travelPolicy?.maxBookingAmount} onChange={(v) => handleFieldChange("travelPolicy.maxBookingAmount", parseFloat(v) || 0)} type="number" />
              <EditableField label="Allow Ancillary Services" value={formData.travelPolicy?.allowAncillaryServices} onChange={(v) => handleFieldChange("travelPolicy.allowAncillaryServices", v)} type="checkbox" />
            </>
          ) : (
            <>
              <InfoRow label="Allowed Cabin Classes" value={corporate.travelPolicy?.allowedCabinClass?.join(", ")} />
              <InfoRow label="Advance Booking Days" value={corporate.travelPolicy?.advanceBookingDays} />
              <InfoRow label="Max Booking Amount" value={`₹ ${corporate.travelPolicy?.maxBookingAmount?.toLocaleString()}`} />
              <InfoRow label="Ancillary Services" value={corporate.travelPolicy?.allowAncillaryServices ? "Allowed" : "Not Allowed"} />
            </>
          )}
        </SectionCard> */}

       
      </div>
    </div>
  );
}