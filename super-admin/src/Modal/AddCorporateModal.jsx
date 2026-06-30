import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { onboardCorporate } from "../Redux/Slice/corporateOnboardingSlice";

export default function AddCorporateModal({ onClose }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.corporateOnboarding);

  const [form, setForm] = useState({
    corporateName: "",
    classification: "prepaid",

    // PRIMARY CONTACT
    primaryName: "",
    primaryEmail: "",
    primaryMobile: "",

    // SSO
    ssoType: "google",
    ssoDomain: "",

    // REGISTERED ADDRESS
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",

    // SECONDARY CONTACT
    secondaryName: "",
    secondaryEmail: "",
    secondaryMobile: "",

    // BILLING DEPARTMENT
    billingName: "",
    billingEmail: "",
    billingMobile: "",

    // BILLING & CREDIT
    creditLimit: 0,
    billingCycle: "30days",
    customBillingDays: "",

    // TRAVEL POLICY
    allowedCabinClass: ["Economy"],
    allowAncillaryServices: true,
    advanceBookingDays: 0,
    maxBookingAmount: 0,

    // WALLET
    walletBalance: 0,

    // APPROVAL & NOTES
    defaultApprover: "travel-admin",
    creditTermsNotes: "",

    // METADATA
    totalBookings: 0,
    totalRevenue: 0,
  });

  const [gstMode, setGstMode] = useState("file"); // file | url
  const [gstFile, setGstFile] = useState(null);
  const [gstUrl, setGstUrl] = useState("");

  const [panMode, setPanMode] = useState("file"); // file | url
  const [panFile, setPanFile] = useState(null);
  const [panUrl, setPanUrl] = useState("");

  const submit = () => {
    const fd = new FormData();

    // REQUIRED
    fd.append("corporateName", form.corporateName);
    fd.append("classification", form.classification);

    fd.append("primaryContact[name]", form.primaryName);
    fd.append("primaryContact[email]", form.primaryEmail);
    fd.append("primaryContact[mobile]", form.primaryMobile);

    fd.append("ssoConfig[type]", form.ssoType);
    fd.append("ssoConfig[domain]", form.ssoDomain);

    // ADDRESS
    fd.append("registeredAddress[street]", form.street);
    fd.append("registeredAddress[city]", form.city);
    fd.append("registeredAddress[state]", form.state);
    fd.append("registeredAddress[pincode]", form.pincode);
    fd.append("registeredAddress[country]", form.country);

    // SECONDARY CONTACT
    fd.append("secondaryContact[name]", form.secondaryName);
    fd.append("secondaryContact[email]", form.secondaryEmail);
    fd.append("secondaryContact[mobile]", form.secondaryMobile);

    // BILLING DEPARTMENT
    fd.append("billingDepartment[name]", form.billingName);
    fd.append("billingDepartment[email]", form.billingEmail);
    fd.append("billingDepartment[mobile]", form.billingMobile);

    // BILLING
    fd.append("billingCycle", form.billingCycle);
    if (form.billingCycle === "custom") {
      fd.append("customBillingDays", form.customBillingDays);
    }
    if (form.classification === "postpaid") {
      fd.append("creditLimit", form.creditLimit);
    }

    // TRAVEL POLICY
    form.allowedCabinClass.forEach((c) =>
      fd.append("travelPolicy[allowedCabinClass][]", c)
    );
    fd.append(
      "travelPolicy[allowAncillaryServices]",
      form.allowAncillaryServices
    );
    fd.append("travelPolicy[advanceBookingDays]", form.advanceBookingDays);
    fd.append("travelPolicy[maxBookingAmount]", form.maxBookingAmount);

    // WALLET & NOTES
    fd.append("walletBalance", form.walletBalance);
    fd.append("defaultApprover", form.defaultApprover);
    fd.append("creditTermsNotes", form.creditTermsNotes);

    // METADATA
    fd.append("metadata[totalBookings]", form.totalBookings);
    fd.append("metadata[totalRevenue]", form.totalRevenue);

    /* DOCUMENTS — FILE OR URL (NOT BOTH) */
    if (gstMode === "file" && gstFile) {
      fd.append("gstCertificate", gstFile);
    }
    if (gstMode === "url" && gstUrl) {
      fd.append("gstCertificate[url]", gstUrl);
    }

    if (panMode === "file" && panFile) {
      fd.append("panCard", panFile);
    }
    if (panMode === "url" && panUrl) {
      fd.append("panCard[url]", panUrl);
    }

    dispatch(onboardCorporate(fd))
      .unwrap()
      .then(() => onClose());
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white max-w-6xl w-full p-6 rounded-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4">Onboard Corporate</h2>

        <Section title="Basic Information">
          <Input
            label="Corporate Name *"
            value={form.corporateName}
            onChange={(v) => setForm({ ...form, corporateName: v })}
          />

          <Select
            label="Classification *"
            value={form.classification}
            options={["prepaid", "postpaid"]}
            onChange={(v) => setForm({ ...form, classification: v })}
          />
        </Section>

        <Section title="Primary Contact (Required)">
          <Input
            label="Name *"
            value={form.primaryName}
            onChange={(v) => setForm({ ...form, primaryName: v })}
          />
          <Input
            label="Email *"
            value={form.primaryEmail}
            onChange={(v) => setForm({ ...form, primaryEmail: v })}
          />
          <Input
            label="Mobile *"
            value={form.primaryMobile}
            onChange={(v) => setForm({ ...form, primaryMobile: v })}
          />
        </Section>

        <Section title="SSO Configuration (Required)">
          <Input
            label="SSO Provider *"
            value={form.ssoType}
            onChange={(v) => setForm({ ...form, ssoType: v })}
          />
          <Input
            label="SSO Domain *"
            value={form.ssoDomain}
            onChange={(v) => setForm({ ...form, ssoDomain: v })}
          />
        </Section>

        <Section title="Registered Address">
          <Input
            label="Street"
            value={form.street}
            onChange={(v) => setForm({ ...form, street: v })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(v) => setForm({ ...form, state: v })}
          />
          <Input
            label="Pincode"
            value={form.pincode}
            onChange={(v) => setForm({ ...form, pincode: v })}
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(v) => setForm({ ...form, country: v })}
          />
        </Section>

        <Section title="Secondary Contact">
          <Input
            label="Name"
            value={form.secondaryName}
            onChange={(v) => setForm({ ...form, secondaryName: v })}
          />
          <Input
            label="Email"
            value={form.secondaryEmail}
            onChange={(v) => setForm({ ...form, secondaryEmail: v })}
          />
          <Input
            label="Mobile"
            value={form.secondaryMobile}
            onChange={(v) => setForm({ ...form, secondaryMobile: v })}
          />
        </Section>

        <Section title="Billing Department">
          <Input
            label="Name"
            value={form.billingName}
            onChange={(v) => setForm({ ...form, billingName: v })}
          />
          <Input
            label="Email"
            value={form.billingEmail}
            onChange={(v) => setForm({ ...form, billingEmail: v })}
          />
          <Input
            label="Mobile"
            value={form.billingMobile}
            onChange={(v) => setForm({ ...form, billingMobile: v })}
          />
        </Section>

        <Section title="Billing & Credit">
          <Select
            label="Billing Cycle"
            value={form.billingCycle}
            options={["15days", "30days", "custom"]}
            onChange={(v) => setForm({ ...form, billingCycle: v })}
          />

          {form.billingCycle === "custom" && (
            <Input
              type="number"
              label="Custom Billing Days"
              value={form.customBillingDays}
              onChange={(v) => setForm({ ...form, customBillingDays: v })}
            />
          )}

          {form.classification === "postpaid" && (
            <Input
              type="number"
              label="Credit Limit"
              value={form.creditLimit}
              onChange={(v) => setForm({ ...form, creditLimit: v })}
            />
          )}
        </Section>

        <Section title="Travel Policy">
          <MultiSelect
            label="Allowed Cabin Class"
            options={["Economy", "Premium Economy", "Business", "First"]}
            value={form.allowedCabinClass}
            onChange={(v) => setForm({ ...form, allowedCabinClass: v })}
          />

          <Toggle
            label="Allow Ancillary Services"
            checked={form.allowAncillaryServices}
            onChange={(v) => setForm({ ...form, allowAncillaryServices: v })}
          />

          <Input
            type="number"
            label="Advance Booking Days"
            value={form.advanceBookingDays}
            onChange={(v) => setForm({ ...form, advanceBookingDays: v })}
          />

          <Input
            type="number"
            label="Max Booking Amount"
            value={form.maxBookingAmount}
            onChange={(v) => setForm({ ...form, maxBookingAmount: v })}
          />
        </Section>

        <Section title="Wallet">
          <Input
            type="number"
            label="Wallet Balance"
            value={form.walletBalance}
            onChange={(v) => setForm({ ...form, walletBalance: v })}
          />
        </Section>

        <Section title="Approval & Notes">
          <Select
            label="Default Approver"
            value={form.defaultApprover}
            options={["travel-admin", "manager"]}
            onChange={(v) => setForm({ ...form, defaultApprover: v })}
          />

          <textarea
            className="border p-2 col-span-3"
            placeholder="Credit Terms Notes"
            value={form.creditTermsNotes}
            onChange={(e) =>
              setForm({ ...form, creditTermsNotes: e.target.value })
            }
          />
        </Section>

        <Section title="Metadata (Optional)">
          <Input
            type="number"
            label="Total Bookings"
            value={form.totalBookings}
            onChange={(v) => setForm({ ...form, totalBookings: v })}
          />

          <Input
            type="number"
            label="Total Revenue"
            value={form.totalRevenue}
            onChange={(v) => setForm({ ...form, totalRevenue: v })}
          />
        </Section>

        <Section title="Documents (Upload OR URL)">
          <DocumentBlock
            title="GST Certificate"
            mode={gstMode}
            setMode={setGstMode}
            fileHandler={setGstFile}
            url={gstUrl}
            setUrl={setGstUrl}
          />
          <DocumentBlock
            title="PAN Card"
            mode={panMode}
            setMode={setPanMode}
            fileHandler={setPanFile}
            url={panUrl}
            setUrl={setPanUrl}
          />
        </Section>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="bg-[#0A4D68] text-white px-4 py-2"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI HELPERS ---------- */

const Section = ({ title, children }) => (
  <>
    <h3 className="font-semibold mt-6 mb-2">{title}</h3>
    <div className="grid grid-cols-3 gap-4">{children}</div>
  </>
);

const Input = ({ label, value, type = "text", onChange }) => (
  <input
    className="border p-2"
    placeholder={label}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const Select = ({ label, options, value, onChange }) => (
  <select
    className="border p-2"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    {label}
  </label>
);

const MultiSelect = ({ label, options, value, onChange }) => (
  <div className="col-span-3">
    <label className="text-sm">{label}</label>
    <div className="flex gap-4 mt-1">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={value.includes(opt)}
            onChange={(e) =>
              e.target.checked
                ? onChange([...value, opt])
                : onChange(value.filter((v) => v !== opt))
            }
          />
          {opt}
        </label>
      ))}
    </div>
  </div>
);

const DocumentBlock = ({ title, mode, setMode, fileHandler, url, setUrl }) => (
  <div className="col-span-3 border p-4 rounded">
    <p className="font-medium mb-2">{title}</p>

    <div className="flex gap-4 mb-2">
      <label>
        <input
          type="radio"
          checked={mode === "file"}
          onChange={() => setMode("file")}
        />
        Upload File
      </label>
      <label>
        <input
          type="radio"
          checked={mode === "url"}
          onChange={() => setMode("url")}
        />
        Provide URL
      </label>
    </div>

    {mode === "file" && (
      <input
        type="file"
        accept=".pdf,image/*"
        onChange={(e) => fileHandler(e.target.files[0])}
      />
    )}

    {mode === "url" && (
      <input
        className="border p-2 w-full"
        placeholder="Image / PDF / Google Drive URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
    )}
  </div>
);
