import React from "react";
import { FiX } from "react-icons/fi";

export default function ViewCorporateModal({ corporate, onClose }) {
  if (!corporate) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#0A4D68] text-white">
          <h2 className="text-lg font-semibold">
            Corporate Profile
          </h2>
          <button onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-sm">

          <Section title="Basic Information">
            <Item label="Corporate Name" value={corporate.corporateName} />
            <Item label="Classification" value={corporate.classification} />
            <Item label="Status" value={corporate.status} />
            <Item label="SSO Domain" value={corporate.ssoConfig?.domain} />
          </Section>

          <Section title="Primary Contact">
            <Item label="Name" value={corporate.primaryContact?.name} />
            <Item label="Email" value={corporate.primaryContact?.email} />
            <Item label="Mobile" value={corporate.primaryContact?.mobile} />
          </Section>

          <Section title="Registered Address">
            <Item
              label="Address"
              value={[
                corporate.registeredAddress?.street,
                corporate.registeredAddress?.city,
                corporate.registeredAddress?.state,
                corporate.registeredAddress?.pincode,
                corporate.registeredAddress?.country,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </Section>

          <Section title="Billing & Wallet">
            <Item label="Billing Cycle" value={corporate.billingCycle} />
            <Item
              label="Credit Limit"
              value={
                corporate.classification === "postpaid"
                  ? `₹${corporate.creditLimit}`
                  : "N/A"
              }
            />
            <Item label="Wallet Balance" value={`₹${corporate.walletBalance}`} />
          </Section>

          <Section title="Travel Policy">
            <Item
              label="Cabin Class"
              value={corporate.travelPolicy?.allowedCabinClass?.join(", ")}
            />
            <Item
              label="Ancillary Services"
              value={
                corporate.travelPolicy?.allowAncillaryServices
                  ? "Allowed"
                  : "Not Allowed"
              }
            />
            <Item
              label="Advance Booking Days"
              value={corporate.travelPolicy?.advanceBookingDays}
            />
            <Item
              label="Max Booking Amount"
              value={`₹${corporate.travelPolicy?.maxBookingAmount}`}
            />
          </Section>

          <Section title="Documents">
            {corporate.gstCertificate?.url && (
              <DocLink label="GST Certificate" url={corporate.gstCertificate.url} />
            )}
            {corporate.panCard?.url && (
              <DocLink label="PAN Card" url={corporate.panCard.url} />
            )}
          </Section>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
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
  <div>
    <h3 className="font-semibold mb-2 text-slate-700">{title}</h3>
    <div className="grid grid-cols-2 gap-3">{children}</div>
  </div>
);

const Item = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium">{value || "-"}</p>
  </div>
);

const DocLink = ({ label, url }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 underline"
    >
      View Document
    </a>
  </div>
);
