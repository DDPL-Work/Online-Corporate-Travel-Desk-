import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiCheckCircle } from "react-icons/fi";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";

export default function TravelAdminProfile() {
  const dispatch = useDispatch();

  const { corporate, loading, error } = useSelector(
    (state) => state.corporateAdmin
  );

  // FETCH PROFILE ON LOAD
  useEffect(() => {
    dispatch(fetchCorporateAdmin());
  }, [dispatch]);

  // LOADING
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading corporate profile…
      </div>
    );
  }

  // ERROR
  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  // SAFETY
  if (!corporate) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#0A4D68]">
            Corporate Profile
          </h1>
          <p className="text-gray-500">
            Travel Admin – Corporate Configuration
          </p>
        </div>

        <span
          className={`px-4 py-1 rounded-full text-sm font-medium
          ${
            corporate.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {corporate.status?.toUpperCase()}
        </span>
      </div>

      <Section title="Corporate Information">
        <Row label="Corporate Name" value={corporate.corporateName} />
        <Row label="Classification" value={corporate.classification} />
        <Row label="Billing Cycle" value={corporate.billingCycle} />
      </Section>

      <Section title="Registered Address">
        <Row label="Street" value={corporate.registeredAddress?.street} />
        <Row label="City" value={corporate.registeredAddress?.city} />
        <Row label="State" value={corporate.registeredAddress?.state} />
        <Row label="Pincode" value={corporate.registeredAddress?.pincode} />
        <Row label="Country" value={corporate.registeredAddress?.country} />
      </Section>

      <Section title="Primary Contact">
        <Row label="Name" value={corporate.primaryContact?.name} />
        <Row label="Email" value={corporate.primaryContact?.email} />
        <Row label="Mobile" value={corporate.primaryContact?.mobile} />
      </Section>

      {corporate.secondaryContact?.email && (
        <Section title="Secondary Contact">
          <Row label="Name" value={corporate.secondaryContact.name} />
          <Row label="Email" value={corporate.secondaryContact.email} />
          <Row label="Mobile" value={corporate.secondaryContact.mobile} />
        </Section>
      )}

      {corporate.billingDepartment?.email && (
        <Section title="Billing Department">
          <Row label="Name" value={corporate.billingDepartment.name} />
          <Row label="Email" value={corporate.billingDepartment.email} />
          <Row label="Mobile" value={corporate.billingDepartment.mobile} />
        </Section>
      )}

      <Section title="SSO Configuration">
        <Row
          label="Provider"
          value={corporate.ssoConfig?.type?.toUpperCase()}
        />
        <Row label="Domain" value={corporate.ssoConfig?.domain} />
        <Row
          label="Status"
          value={
            corporate.ssoConfig?.verified ? (
              <span className="flex items-center gap-1 text-green-600">
                <FiCheckCircle /> Verified
              </span>
            ) : (
              "Pending"
            )
          }
        />
      </Section>

      <Section title="Financial Summary">
        <Row label="Wallet Balance" value={`₹ ${corporate.walletBalance}`} />
        <Row label="Credit Limit" value={`₹ ${corporate.creditLimit}`} />
        <Row label="Current Credit" value={`₹ ${corporate.currentCredit}`} />
        <Row
          label="Credit Utilization"
          value={`${corporate.creditUtilization}%`}
        />
      </Section>

      <Section title="Travel Policy">
        <Row
          label="Allowed Cabin Classes"
          value={corporate.travelPolicy?.allowedCabinClass?.join(", ")}
        />
        <Row
          label="Advance Booking Days"
          value={corporate.travelPolicy?.advanceBookingDays}
        />
        <Row
          label="Max Booking Amount"
          value={`₹ ${corporate.travelPolicy?.maxBookingAmount}`}
        />
        <Row
          label="Ancillary Services"
          value={
            corporate.travelPolicy?.allowAncillaryServices
              ? "Allowed"
              : "Not Allowed"
          }
        />
      </Section>

      <Section title="Usage Metadata">
        <Row label="Total Bookings" value={corporate.metadata?.totalBookings} />
        <Row
          label="Total Revenue"
          value={`₹ ${corporate.metadata?.totalRevenue}`}
        />
        <Row
          label="Last Booking Date"
          value={corporate.metadata?.lastBookingDate?.slice(0, 10)}
        />
      </Section>
    </div>
  );
}

/* ------------------ REUSABLE UI ------------------ */

function Section({ title, children }) {
  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="text-xl font-semibold text-[#0A4D68] mb-4">
        {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">
        {value ?? "-"}
      </p>
    </div>
  );
}
