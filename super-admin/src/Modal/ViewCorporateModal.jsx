import React from "react";
import { FiX, FiExternalLink } from "react-icons/fi";

export default function ViewCorporateModal({ corporate, onClose }) {
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-xl my-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              Corporate profile
              {corporate.classification && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                  {corporate.classification}
                </span>
              )}
              {corporate.status && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
                    corporate.status === "active"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {corporate.status}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{corporate.corporateName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 max-h-[72vh] overflow-y-auto">

          <Section title="Basic Information">
            <Item label="Corporate Name" value={corporate.corporateName} span={2} />
            <Item label="SSO Domain" value={corporate.ssoConfig?.domain} />
            <Item label="Billing Cycle" value={corporate.billingCycle} />
          </Section>

          <Section title="Primary Contact">
            <Item label="Name" value={corporate.primaryContact?.name} />
            <Item label="Mobile" value={corporate.primaryContact?.mobile} />
            <Item label="Email" value={corporate.primaryContact?.email} span={2} />
          </Section>

          <Section title="Registered Address">
            <Item label="Full Address" value={fullAddress} span={2} />
          </Section>

          <Section title="Billing & Wallet">
            <Item label="Billing Cycle" value={corporate.billingCycle} />
            <Item label="Wallet Balance" value={`₹${corporate.walletBalance ?? 0}`} />
            <Item
              label="Credit Limit"
              value={
                corporate.classification === "postpaid"
                  ? `₹${corporate.creditLimit ?? 0}`
                  : "N/A"
              }
            />
          </Section>

          <Section title="Travel Policy">
            <Item
              label="Allowed Cabin Class"
              value={corporate.travelPolicy?.allowedCabinClass?.join(", ")}
              span={2}
            />
            <Item
              label="Ancillary Services"
              value={
                corporate.travelPolicy?.allowAncillaryServices
                  ? "Allowed"
                  : "Not allowed"
              }
            />
            <Item
              label="Advance Booking"
              value={
                corporate.travelPolicy?.advanceBookingDays != null
                  ? `${corporate.travelPolicy.advanceBookingDays} days`
                  : undefined
              }
            />
            <Item
              label="Max Booking Amount"
              value={
                corporate.travelPolicy?.maxBookingAmount != null
                  ? `₹${corporate.travelPolicy.maxBookingAmount}`
                  : undefined
              }
            />
          </Section>

          {(corporate.gstCertificate?.url || corporate.panCard?.url) && (
            <Section title="Documents">
              {corporate.gstCertificate?.url && (
                <DocLink label="GST Certificate" url={corporate.gstCertificate.url} />
              )}
              {corporate.panCard?.url && (
                <DocLink label="PAN Card" url={corporate.panCard.url} />
              )}
            </Section>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

/* -------- UI HELPERS -------- */

const Section = ({ title, children }) => (
  <div className="py-5 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {title}
      </span>
      <span className="flex-1 h-px bg-gray-100" />
    </div>
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
  </div>
);

const Item = ({ label, value, span = 1 }) => (
  <div className={span === 2 ? "col-span-2" : ""}>
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
  </div>
);

const DocLink = ({ label, url }) => (
  <div>
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      View document
      <FiExternalLink size={12} />
    </a>
  </div>
);