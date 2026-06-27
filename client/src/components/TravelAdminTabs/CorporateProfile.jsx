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
  FiFileText,
} from "react-icons/fi";
import { FaBuilding, FaRupeeSign, FaPlane, FaHotel } from "react-icons/fa";
import { fetchCorporateAdmin, updateCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import { C } from "../Shared/color";
import ServiceFeesModal from "./Modal/ServiceFeesModal";

const CORPORATE_FIELDS = [
  { key: "corporateName", label: "Company Name", icon: FiUser, type: "text" },
  { key: "classification", label: "Classification", icon: FiBriefcase, type: "text" },
  { key: "billingCycle", label: "Billing Cycle", icon: FiCalendar, type: "text" },
];

const ADDRESS_FIELDS = [
  { key: "registeredAddress.street", label: "Street", icon: FiMapPin, type: "text" },
  { key: "registeredAddress.city", label: "City", icon: FiMapPin, type: "text" },
  { key: "registeredAddress.state", label: "State", icon: FiMapPin, type: "text" },
  { key: "registeredAddress.pincode", label: "Pincode", icon: FiMapPin, type: "text" },
];

const CONTACT_FIELDS = [
  { key: "primaryContact.name", label: "Name", icon: FiUser, type: "text" },
  { key: "primaryContact.email", label: "Email", icon: FiMail, type: "email" },
  { key: "primaryContact.mobile", label: "Mobile", icon: FiPhone, type: "tel" },
];

const FINANCE_FIELDS = [
  { key: "billingDepartment.name", label: "Name", icon: FiUser, type: "text" },
  { key: "billingDepartment.email", label: "Email", icon: FiMail, type: "email" },
  { key: "billingDepartment.mobile", label: "Mobile", icon: FiPhone, type: "tel" },
];

const GST_FIELDS = [
  { key: "gstDetails.legalName", label: "Legal Name", icon: FaBuilding, type: "text" },
  { key: "gstDetails.gstin", label: "GSTIN", icon: FiBriefcase, type: "text" },
  { key: "gstDetails.address", label: "Address", icon: FiMapPin, type: "text" },
  { key: "gstDetails.gstEmail", label: "Email", icon: FiMail, type: "email" },
  { key: "gstDetails.contactNumber", label: "Contact", icon: FiPhone, type: "tel" },
];

const PAN_FIELDS = [
  { key: "corporatePanCard.number", label: "PAN Number", icon: FiFileText, type: "text" },
];

const SSO_FIELDS = [
  { key: "ssoConfig.type", label: "Provider", icon: FiShield, type: "text" },
  { key: "ssoConfig.domain", label: "Domain", icon: FiShield, type: "text" },
  { key: "ssoConfig.verified", label: "Verified Status", icon: FiShield, type: "checkbox" },
];

function getInitials(name = "") {
  if (typeof name === "object") {
    name = `${name.firstName || ""} ${name.lastName || ""}`.trim();
  }
  return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const getNestedValue = (obj, path) => {
  if (!obj) return "";
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || "";
};

export default function CorporateProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { corporate, loading } = useSelector((state) => state.corporateAdmin);

  const [showFeesModal, setShowFeesModal] = useState(false);

  useEffect(() => { dispatch(fetchCorporateAdmin()); }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCorporateAdmin());
  };

  if (loading && !corporate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
         <div className="flex flex-col items-center gap-4">
            <FiRefreshCw className="animate-spin" size={32} style={{ color: C.gold }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: C.navy }}>Loading Profile...</p>
         </div>
      </div>
    );
  }

  if (!corporate) return null;

  const initials = getInitials(corporate.corporateName);
  const walletBalance = corporate.walletBalance || 0;
  const creditLimit = corporate.creditLimit || 0;
  const usedCredit = corporate.currentCredit || 0;

  const isActive = corporate.status?.toLowerCase() === "active";

  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <button onClick={handleRefresh} disabled={loading} className={`p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
              <div className="flex items-center md:items-center gap-4 md:gap-5">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FaBuilding size={24} className="md:w-7 md:h-7" /></div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">Corporate Profile</h1>
                 <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">View your corporate profile and details</p>
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
                  {corporate.corporateName}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{corporate.classification || "—"}</p>
                
                <div className="mt-4 w-full flex flex-col gap-2 items-center">
                  {corporate.classification === "postpaid" && (
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ color: C.navy, background: C.gold + "22" }}>
                      {corporate.billingCycle || "No Billing Cycle"}
                    </span>
                  )}
                  <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {corporate.status || "INACTIVE"}
                  </span>
                </div>

                <div className="mt-8 w-full border-t border-slate-100 pt-6 space-y-4 text-left">
                  {corporate.classification === "prepaid" && (
                    <InfoRow icon={FaRupeeSign} value={`₹${walletBalance.toLocaleString()}`} label="Wallet Balance" />
                  )}
                  {corporate.classification === "postpaid" && (
                    <>
                      <InfoRow icon={FiCreditCard} value={`₹${creditLimit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} label="Credit Limit" />
                      <InfoRow icon={FiActivity} value={`₹${usedCredit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} label="Used Credit" />
                      <InfoRow icon={FiCalendar} value={`${corporate.dueDays || 0} Days`} label="Payment Due Days" />
                    </>
                  )}
                  <InfoRow icon={FiUser} value={corporate.primaryContact?.name || "—"} label="Primary Contact" />
                  <InfoRow icon={FiMail} value={corporate.primaryContact?.email || "—"} label="Contact Email" />
                  <InfoRow icon={FiPhone} value={corporate.primaryContact?.mobile || "—"} label="Contact Mobile" />
                </div>

                <button 
                  onClick={() => setShowFeesModal(true)}
                  className="mt-6 w-full py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black text-slate-600 hover:text-[#003399] hover:border-[#003399]/30 hover:bg-blue-50 transition-all uppercase tracking-widest"
                >
                  <FiDollarSign size={14} />
                  View All Service Fees
                </button>
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
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Basic Information & Address</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Company Details</p>
                    </div>
                  </div>
               </div>
               
               <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {CORPORATE_FIELDS.filter(f => corporate.classification === "postpaid" || f.key !== "billingCycle").concat(ADDRESS_FIELDS).map((f) => (
                      <Field
                        key={f.key}
                        field={f}
                        value={getNestedValue(corporate, f.key)}
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
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Primary Contact Details</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Main Person of Contact</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {CONTACT_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(corporate, f.key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Finance Details */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm">
                  <FiDollarSign />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Finance & Billing Department</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Billing Team Details</p>
                </div>
              </div>

              <div className="p-8">
                {corporate.financeMembers && corporate.financeMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {corporate.financeMembers.map((member) => (
                      <div key={member._id} className="p-5 rounded-[1.25rem] border border-slate-200 shadow-sm flex flex-col gap-3 relative" style={{ backgroundColor: C.offWhite }}>
                        {member.status === "active" ? (
                           <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        ) : (
                           <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                        )}
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                           <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black">
                              {getInitials(typeof member.name === "object" ? `${member.name.firstName} ${member.name.lastName}` : member.name)}
                           </div>
                           <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate leading-tight">
                                {typeof member.name === "object" ? `${member.name.firstName} ${member.name.lastName}` : member.name}
                              </p>
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 leading-tight mt-0.5">{member.role.replace("_", " ")}</p>
                           </div>
                        </div>
                        <div className="space-y-2 mt-1">
                           <div className="flex items-center gap-2 text-xs text-slate-600">
                             <FiMail size={12} className="text-slate-400 shrink-0" />
                             <span className="truncate">{member.email}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-[1.25rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <FiDollarSign size={24} className="text-slate-300 mb-3" />
                    <p className="text-sm font-black text-slate-800">No Finance Members Found</p>
                    <p className="text-xs text-slate-500 mt-1">There are no finance team members assigned to this corporate yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* GST Details */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                  <FaBuilding />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">GST Details</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Company Registration Info</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {GST_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(corporate, f.key)}
                    />
                  ))}
                  {corporate.gstCertificate?.url && (
                    <div className="col-span-1 md:col-span-2 mt-2">
                       <a 
                         href={corporate.gstCertificate.url}
                         target="_blank"
                         rel="noreferrer"
                         className="inline-flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
                       >
                         <FiFileText size={16} />
                         View Uploaded GST Document
                       </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PAN Details */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                  <FiFileText />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">PAN Details</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Company PAN Card Info</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {PAN_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(corporate, f.key)}
                    />
                  ))}
                  {corporate.corporatePanCard?.url && (
                    <div className="col-span-1 md:col-span-2 mt-2">
                       <a 
                         href={corporate.corporatePanCard.url}
                         target="_blank"
                         rel="noreferrer"
                         className="inline-flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-[#d97706] bg-[#d97706]/10 border border-[#d97706]/20 rounded-xl hover:bg-[#d97706]/20 transition-all"
                       >
                         <FiFileText size={16} />
                         View Uploaded PAN Document
                       </a>
                    </div>
                  )}
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
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">SSO Details</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Sign-in Settings</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {SSO_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={getNestedValue(corporate, f.key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Service Fees */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                  <FiDollarSign />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Service Fees</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Fees for Flight & Hotel Bookings</p>
                </div>
              </div>

              <div className="p-8">

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <FiInfo size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Complete Fee Schedule</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">View all defined company rules, including inactive ones and other categories.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowFeesModal(true)}
                    className="px-6 py-2.5 bg-[#003399] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-800 transition-colors shadow-md shadow-[#003399]/20 whitespace-nowrap"
                  >
                    View All Fees
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <ServiceFeesModal 
        isOpen={showFeesModal} 
        onClose={() => setShowFeesModal(false)} 
        rules={corporate.serviceFeeRules} 
      />
    </div>
  );
}

function Field({ field, value }) {
  const Icon = field.icon;
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} style={{ color: C.gold }} />
        {field.label}
      </label>
      <div className="px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all cursor-not-allowed opacity-80" style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
        {field.type === "checkbox" ? (
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>{value ? "Yes" : "No"}</span>
        ) : value || (
          <span className="text-slate-400 italic font-bold">Not available</span>
        )}
      </div>
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