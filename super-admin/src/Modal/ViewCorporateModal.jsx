import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiExternalLink,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiUsers,
  FiDollarSign,
  FiFileText,
  FiSettings,
  FiEdit2,
  FiTrash2,
  FiToggleRight,
  FiNavigation,
  FiHome,
} from "react-icons/fi";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
};

const CABIN_CLASS_MAP = {
  2: "Economy",
  3: "Premium Economy",
  4: "Business",
  5: "Premium Business",
  6: "First Class",
};

export default function ViewCorporateModal({ corporate, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [productFilter, setProductFilter] = useState("Flight");
  const [operationFilter, setOperationFilter] = useState("Book");

  if (!corporate) return null;

  const fullAddress = [
    corporate.registeredAddress?.street,
    corporate.registeredAddress?.city,
    corporate.registeredAddress?.state,
    corporate.registeredAddress?.pincode,
    corporate.registeredAddress?.country,
  ]
    .filter(Boolean)
    .join(", ");

  let displayStatus = corporate.status;
  if (corporate.status === "pending") {
    const createdAt = new Date(corporate.createdAt || Date.now());
    const diffInDays = (Date.now() - createdAt.getTime()) / (1000 * 3600 * 24);
    if (diffInDays > 7) {
      displayStatus = "expired";
    }
  }

  const isPending = displayStatus === "pending";
  const isActionable = displayStatus === "pending";

  const handleReject = () => {
    // In a real implementation, dispatch a rejection action here
    alert("Reject action not fully implemented. Wire to API.");
  };

  const handleApprove = () => {
    navigate(`/financial-approval/${corporate._id}`, {
      state: { corporate, from: "/pending-corporates" },
    });
    onClose();
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <FiInfo /> },
    { id: "contacts", label: "Contacts", icon: <FiUsers /> },
    ...(displayStatus === "active" || displayStatus === "suspended"
      ? [
          {
            id: "financial",
            label: "Financial & Policy",
            icon: <FiDollarSign />,
          },
        ]
      : []),
    { id: "serviceFees", label: "Service Charges", icon: <FiSettings /> },
    { id: "documents", label: "Documents", icon: <FiFileText /> },
  ];

  const modalContent = (
    <>
      {/* Full-screen overlay rendered at body level via portal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(15,23,42,0.65)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col animate-fadeIn overflow-hidden"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div
            className="bg-gradient-to-r from-[#003399] via-[#000d26] to-[#1a0a00] px-6 py-5 flex items-center justify-between text-white shrink-0"
            style={{ borderBottom: "2px solid #d97706" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                {corporate.branding?.logo?.url ? (
                  <img
                    src={corporate.branding.logo.url}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain p-1"
                  />
                ) : (
                  <span className="text-xl font-black">
                    {corporate.corporateName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {corporate.corporateName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    {corporate.corporateType || "Corporate"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    {corporate.ssoConfig?.domain || "No Domain"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30"></span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      displayStatus === "active"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : displayStatus === "pending"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                          : displayStatus === "expired"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-white/10 text-white/70 border border-white/20"
                    }`}
                  >
                    {displayStatus}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isActionable && (
                <>
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 text-rose-100 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                  >
                    <FiXCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg text-xs font-black uppercase tracking-widest transition-colors shadow-lg flex items-center gap-1.5"
                  >
                    <FiCheckCircle size={14} /> Approve
                  </button>
                </>
              )}
              <div className="w-px h-8 bg-white/20 mx-1"></div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-slate-200 px-4 shrink-0 bg-slate-50">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? idx % 2 === 0
                      ? "border-[#003399] text-[#003399]"
                      : "border-[#d97706] text-[#d97706]"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
            {activeTab === "overview" && (
              <div className="space-y-8 animate-fadeIn">
                <Section title="Corporate Identity" color="navy">
                  <Item
                    label="Legal Name"
                    value={
                      corporate.gstDetails?.legalName || corporate.corporateName
                    }
                    span={2}
                  />
                  <Item
                    label="Company Type"
                    value={
                      corporate.branding?.companyType || corporate.corporateType
                    }
                  />
                  <Item
                    label="SSO Domain"
                    value={corporate.ssoConfig?.domain}
                  />
                  <Item
                    label="SSO Verified"
                    value={corporate.ssoConfig?.verified ? "Yes" : "No"}
                  />
                  <Item
                    label="Registered On"
                    value={new Date(corporate.createdAt).toLocaleDateString(
                      "en-GB",
                    )}
                  />
                </Section>
                <Section title="Registered Address" color="gold">
                  <Item label="Full Address" value={fullAddress} span={2} />
                </Section>
              </div>
            )}

            {activeTab === "contacts" && (
              <div className="space-y-8 animate-fadeIn">
                <Section title="Primary Contact" color="navy">
                  <Item label="Name" value={corporate.primaryContact?.name} />
                  <Item label="Role" value={corporate.primaryContact?.role} />
                  <Item
                    label="Mobile"
                    value={corporate.primaryContact?.mobile}
                  />
                  <Item label="Email" value={corporate.primaryContact?.email} />
                </Section>
                <Section title="Billing Department" color="gold">
                  <Item
                    label="Name"
                    value={corporate.billingDepartment?.name}
                  />
                  <Item
                    label="Mobile"
                    value={corporate.billingDepartment?.mobile}
                  />
                  <Item
                    label="Email"
                    value={corporate.billingDepartment?.email}
                    span={2}
                  />
                </Section>
                {corporate.secondaryContact?.name && (
                  <Section title="Secondary Contact" color="navy">
                    <Item
                      label="Name"
                      value={corporate.secondaryContact.name}
                    />
                    <Item
                      label="Role"
                      value={corporate.secondaryContact.role}
                    />
                    <Item
                      label="Mobile"
                      value={corporate.secondaryContact.mobile}
                    />
                    <Item
                      label="Email"
                      value={corporate.secondaryContact.email}
                    />
                  </Section>
                )}
              </div>
            )}

            {activeTab === "financial" && (
              <div className="space-y-8 animate-fadeIn">
                <Section title="Account Setup" color="navy">
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Classification:
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${
                        corporate.classification === "postpaid"
                          ? "bg-[#003399]/10 text-[#003399] border-[#003399]/20"
                          : "bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20"
                      }`}
                    >
                      {corporate.classification || "Not Set"}
                    </span>
                  </div>
                  {corporate.classification === "postpaid" ? (
                    <>
                      <Item
                        label="Credit Limit"
                        value={`₹${corporate.creditLimit?.toLocaleString() || 0}`}
                      />
                      <Item
                        label="Available Credit"
                        value={`₹${corporate.currentCredit?.toLocaleString() || 0}`}
                      />
                      <Item
                        label="Billing Cycle"
                        value={corporate.billingCycle}
                      />
                      <Item
                        label="Due Days"
                        value={
                          corporate.dueDays
                            ? `${corporate.dueDays} Days`
                            : "N/A"
                        }
                      />
                    </>
                  ) : (
                    <Item
                      label="Wallet Balance"
                      value={`₹${corporate.walletBalance?.toLocaleString() || 0}`}
                      span={2}
                    />
                  )}
                </Section>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-8 animate-fadeIn">
                <Section title="GST Details" color="navy">
                  <Item label="GSTIN" value={corporate.gstDetails?.gstin} />
                  <Item
                    label="GST Verified"
                    value={corporate.gstDetails?.verified ? "Yes" : "No"}
                  />
                  <Item
                    label="GST Email"
                    value={corporate.gstDetails?.gstEmail}
                  />
                  <Item
                    label="Contact Number"
                    value={corporate.gstDetails?.contactNumber}
                  />
                  <Item
                    label="Registered Address"
                    value={corporate.gstDetails?.address}
                    span={2}
                  />
                </Section>

                <Section title="Uploaded Documents" color="gold">
                  <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {corporate.gstCertificate?.url ? (
                      <DocCard
                        label="GST Certificate"
                        url={corporate.gstCertificate.url}
                        verified={corporate.gstCertificate.verified}
                      />
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-[#d97706]/30 text-center text-[#d97706]/60 text-xs font-bold uppercase tracking-widest bg-[#d97706]/5">
                        No GST Document Uploaded
                      </div>
                    )}

                    {corporate.panCard?.url ? (
                      <DocCard
                        label="PAN Card"
                        url={corporate.panCard.url}
                        verified={corporate.panCard.verified}
                      />
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-[#d97706]/30 text-center text-[#d97706]/60 text-xs font-bold uppercase tracking-widest bg-[#d97706]/5">
                        No PAN Card Uploaded
                      </div>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {activeTab === "serviceFees" && (
              <div className="space-y-6 animate-fadeIn">
                {/* FILTERS */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm">
                    {["Flight", "Hotel"].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setProductFilter(p);
                          if (p === "Hotel" && operationFilter === "Re-Issue") {
                            setOperationFilter("Book");
                          }
                        }}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          productFilter === p
                            ? "bg-white text-[#003399] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm">
                    {(productFilter === "Hotel"
                      ? ["Book", "Cancel"]
                      : ["Book", "Cancel", "Re-Issue"]
                    ).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOperationFilter(o)}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          operationFilter === o
                            ? "bg-white text-[#003399] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Scenario</th>
                        <th className="px-6 py-4">Trip</th>
                        <th className="px-6 py-4">Condition</th>
                        <th className="px-6 py-4">Fee</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(corporate.serviceFeeRules || [])
                        .filter(
                          (r) =>
                            r.productType === productFilter &&
                            r.operation === operationFilter,
                        )
                        .map((rule, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#003399]/5 text-[#003399] flex items-center justify-center shrink-0">
                                {rule.productType === "Flight" ? (
                                  <FiNavigation size={14} />
                                ) : (
                                  <FiHome size={14} />
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-700">
                                  {rule.productType} / {rule.operation}
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  Company Rule
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                              {rule.tripType || "Any"}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                              {rule.productType === "Flight"
                                ? CABIN_CLASS_MAP[rule.cabinClass] ||
                                  rule.cabinClass ||
                                  "Any Cabin"
                                : rule.starRating
                                  ? `${rule.starRating} Stars`
                                  : "Any"}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-[#003399]">
                              {rule.feeType === "Percentage"
                                ? `${rule.feeValue}%`
                                : `₹${rule.feeValue}`}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                  rule.status === "Active"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {rule.status || "Unknown"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {(corporate.serviceFeeRules || []).filter(
                        (r) =>
                          r.productType === productFilter &&
                          r.operation === operationFilter,
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-10 text-center text-xs font-bold text-slate-400"
                          >
                            No rules found for the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

/* -------- UI HELPERS -------- */

const Section = ({ title, children, color = "navy" }) => {
  const isGold = color === "gold";
  return (
    <div>
      <h3
        className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-3"
        style={{ color: isGold ? "#d97706" : "#003399" }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: isGold ? "#d97706" : "#003399" }}
        />
        {title}
        <div
          className="flex-1 h-px"
          style={{
            background: isGold
              ? "linear-gradient(to right, #d97706/30, transparent)"
              : "linear-gradient(to right, #003399/20, transparent)",
            opacity: 0.3,
          }}
        />
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</div>
    </div>
  );
};

const Item = ({ label, value, span = 1 }) => (
  <div className={span === 2 ? "col-span-2" : ""}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <p className="text-[13px] text-slate-800 font-bold break-words">
      {value || "—"}
    </p>
  </div>
);

const DocCard = ({ label, url, verified }) => (
  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between group hover:border-[#d97706] transition-colors">
    <div>
      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${verified ? "text-emerald-600" : "text-[#d97706]"}`}
      >
        {verified ? "✓ Verified" : "⚠ Unverified"}
      </p>
    </div>
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-[#d97706] flex items-center justify-center shadow-sm hover:bg-[#d97706] hover:text-white hover:border-[#d97706] transition-colors"
      title="View Document"
    >
      <FiExternalLink size={16} />
    </a>
  </div>
);
