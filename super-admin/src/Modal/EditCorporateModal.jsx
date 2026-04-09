import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { updateCorporate } from "../Redux/Slice/corporateListSlice";

export default function EditCorporateModal({ corporate, onClose }) {
  const dispatch = useDispatch();

  /* ---------------- FORM STATE (PRE-FILLED) ---------------- */
  const [form, setForm] = useState({
    corporateName: corporate.corporateName || "",

    // PRIMARY CONTACT
    primaryName: corporate.primaryContact?.name || "",
    primaryEmail: corporate.primaryContact?.email || "",
    primaryMobile: corporate.primaryContact?.mobile || "",

    // REGISTERED ADDRESS
    street: corporate.registeredAddress?.street || "",
    city: corporate.registeredAddress?.city || "",
    state: corporate.registeredAddress?.state || "",
    pincode: corporate.registeredAddress?.pincode || "",
    country: corporate.registeredAddress?.country || "India",

    // SECONDARY CONTACT
    secondaryName: corporate.secondaryContact?.name || "",
    secondaryEmail: corporate.secondaryContact?.email || "",
    secondaryMobile: corporate.secondaryContact?.mobile || "",

    // BILLING DEPARTMENT
    billingName: corporate.billingDepartment?.name || "",
    billingEmail: corporate.billingDepartment?.email || "",
    billingMobile: corporate.billingDepartment?.mobile || "",

    // BILLING & CREDIT
    billingCycle: corporate.billingCycle || "30days",
    customBillingDays: corporate.customBillingDays || "",
    creditLimit: corporate.creditLimit || 0,

    // TRAVEL POLICY
    allowedCabinClass:
      corporate.travelPolicy?.allowedCabinClass || ["Economy"],
    allowAncillaryServices:
      corporate.travelPolicy?.allowAncillaryServices ?? true,
    advanceBookingDays:
      corporate.travelPolicy?.advanceBookingDays || 0,
    maxBookingAmount:
      corporate.travelPolicy?.maxBookingAmount || 0,

    // WALLET
    walletBalance: corporate.walletBalance || 0,

    // NOTES
    creditTermsNotes: corporate.creditTermsNotes || "",

    // DOCUMENT URLS (EDIT ONLY)
    gstUrl: corporate.gstCertificate?.url || "",
    panUrl: corporate.panCard?.url || "",
  });

  const [loading, setLoading] = useState(false);

  /* ---------------- SUBMIT ---------------- */
  const submit = async () => {
    setLoading(true);

    const payload = {
      corporateName: form.corporateName,

      primaryContact: {
        name: form.primaryName,
        email: form.primaryEmail,
        mobile: form.primaryMobile,
      },

      registeredAddress: {
        street: form.street,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
      },

      secondaryContact: {
        name: form.secondaryName,
        email: form.secondaryEmail,
        mobile: form.secondaryMobile,
      },

      billingDepartment: {
        name: form.billingName,
        email: form.billingEmail,
        mobile: form.billingMobile,
      },

      billingCycle: form.billingCycle,
      customBillingDays:
        form.billingCycle === "custom"
          ? Number(form.customBillingDays)
          : null,

      creditLimit:
        corporate.classification === "postpaid"
          ? Number(form.creditLimit)
          : undefined,

      travelPolicy: {
        allowedCabinClass: form.allowedCabinClass,
        allowAncillaryServices: form.allowAncillaryServices,
        advanceBookingDays: Number(form.advanceBookingDays),
        maxBookingAmount: Number(form.maxBookingAmount),
      },

      walletBalance: Number(form.walletBalance),
      creditTermsNotes: form.creditTermsNotes,

      gstCertificate: form.gstUrl ? { url: form.gstUrl } : undefined,
      panCard: form.panUrl ? { url: form.panUrl } : undefined,
    };

    try {
      await dispatch(
        updateCorporate({
          id: corporate._id,
          payload,
        })
      ).unwrap();

      toast.success("Corporate updated successfully");
      onClose();
    } catch (err) {
      toast.error(err || "Failed to update corporate");
    } finally {
      setLoading(false);
    }
  };

  const cleanPayload = (obj) =>
    Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
    );

  const payload = cleanPayload({
    corporateName: form.corporateName,
    primaryContact: {
      name: form.primaryName,
      email: form.primaryEmail,
      mobile: form.primaryMobile,
    },
    registeredAddress: {
      street: form.street,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      country: form.country,
    },
    secondaryContact: {
      name: form.secondaryName,
      email: form.secondaryEmail,
      mobile: form.secondaryMobile,
    },
    billingDepartment: {
      name: form.billingName,
      email: form.billingEmail,
      mobile: form.billingMobile,
    },
    billingCycle: form.billingCycle,
    customBillingDays:
      form.billingCycle === "custom"
        ? Number(form.customBillingDays)
        : undefined,
    creditLimit:
      corporate.classification === "postpaid"
        ? Number(form.creditLimit)
        : undefined,
    travelPolicy: {
      allowedCabinClass: form.allowedCabinClass,
      allowAncillaryServices: form.allowAncillaryServices,
      advanceBookingDays: Number(form.advanceBookingDays),
      maxBookingAmount: Number(form.maxBookingAmount),
    },
    walletBalance: Number(form.walletBalance),
    creditTermsNotes: form.creditTermsNotes,
    gstCertificate: form.gstUrl ? { url: form.gstUrl } : undefined,
    panCard: form.panUrl ? { url: form.panUrl } : undefined,
  });

  /* ---------------- UI ---------------- */
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl my-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              Edit corporate
              {corporate.classification && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                  {corporate.classification}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {corporate.corporateName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 max-h-[72vh] overflow-y-auto">

          <Section title="Basic Information">
            <div className="col-span-3">
              <Field label="Corporate Name">
                <Input
                  value={form.corporateName}
                  onChange={(v) => setForm({ ...form, corporateName: v })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Primary Contact">
            <Field label="Name">
              <Input
                value={form.primaryName}
                onChange={(v) => setForm({ ...form, primaryName: v })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.primaryEmail}
                onChange={(v) => setForm({ ...form, primaryEmail: v })}
              />
            </Field>
            <Field label="Mobile">
              <Input
                type="tel"
                value={form.primaryMobile}
                onChange={(v) => setForm({ ...form, primaryMobile: v })}
              />
            </Field>
          </Section>

          <Section title="Secondary Contact">
            <Field label="Name">
              <Input
                value={form.secondaryName}
                onChange={(v) => setForm({ ...form, secondaryName: v })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.secondaryEmail}
                onChange={(v) => setForm({ ...form, secondaryEmail: v })}
              />
            </Field>
            <Field label="Mobile">
              <Input
                type="tel"
                value={form.secondaryMobile}
                onChange={(v) => setForm({ ...form, secondaryMobile: v })}
              />
            </Field>
          </Section>

          <Section title="Billing Department">
            <Field label="Name">
              <Input
                value={form.billingName}
                onChange={(v) => setForm({ ...form, billingName: v })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.billingEmail}
                onChange={(v) => setForm({ ...form, billingEmail: v })}
              />
            </Field>
            <Field label="Mobile">
              <Input
                type="tel"
                value={form.billingMobile}
                onChange={(v) => setForm({ ...form, billingMobile: v })}
              />
            </Field>
          </Section>

          <Section title="Registered Address">
            <div className="col-span-3">
              <Field label="Street">
                <Input
                  value={form.street}
                  onChange={(v) => setForm({ ...form, street: v })}
                />
              </Field>
            </div>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v })}
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.pincode}
                onChange={(v) => setForm({ ...form, pincode: v })}
              />
            </Field>
            <Field label="Country">
              <Input
                value={form.country}
                onChange={(v) => setForm({ ...form, country: v })}
              />
            </Field>
          </Section>

          <Section title="Billing & Credit">
            <Field label="Billing Cycle">
              <Select
                value={form.billingCycle}
                options={["15days", "30days", "custom"]}
                onChange={(v) => setForm({ ...form, billingCycle: v })}
              />
            </Field>

            {form.billingCycle === "custom" && (
              <Field label="Custom Billing Days">
                <Input
                  type="number"
                  value={form.customBillingDays}
                  onChange={(v) => setForm({ ...form, customBillingDays: v })}
                />
              </Field>
            )}

            {corporate.classification === "postpaid" && (
              <Field label="Credit Limit (₹)">
                <Input
                  type="number"
                  value={form.creditLimit}
                  onChange={(v) => setForm({ ...form, creditLimit: v })}
                />
              </Field>
            )}

            <Field label="Wallet Balance (₹)">
              <Input
                type="number"
                value={form.walletBalance}
                onChange={(v) => setForm({ ...form, walletBalance: v })}
              />
            </Field>
          </Section>

          <Section title="Travel Policy">
            <div className="col-span-3">
              <MultiSelect
                label="Allowed Cabin Class"
                options={["Economy", "Premium Economy", "Business", "First"]}
                value={form.allowedCabinClass}
                onChange={(v) => setForm({ ...form, allowedCabinClass: v })}
              />
            </div>

            <Field label="Advance Booking (days)">
              <Input
                type="number"
                value={form.advanceBookingDays}
                onChange={(v) => setForm({ ...form, advanceBookingDays: v })}
              />
            </Field>

            <Field label="Max Booking Amount (₹)">
              <Input
                type="number"
                value={form.maxBookingAmount}
                onChange={(v) => setForm({ ...form, maxBookingAmount: v })}
              />
            </Field>

            <div className="col-span-3">
              <Toggle
                label="Allow Ancillary Services"
                checked={form.allowAncillaryServices}
                onChange={(v) => setForm({ ...form, allowAncillaryServices: v })}
              />
            </div>
          </Section>

          <Section title="Documents">
            <Field label="GST Certificate URL">
              <Input
                type="url"
                value={form.gstUrl}
                onChange={(v) => setForm({ ...form, gstUrl: v })}
              />
            </Field>
            <Field label="PAN Card URL">
              <Input
                type="url"
                value={form.panUrl}
                onChange={(v) => setForm({ ...form, panUrl: v })}
              />
            </Field>
          </Section>

          <Section title="Notes">
            <div className="col-span-3 flex flex-col gap-1">
              <label className="text-xs text-gray-500">Credit terms / remarks</label>
              <textarea
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/10 focus:border-gray-400
                           min-h-20 leading-relaxed"
                placeholder="Add any notes about credit terms or billing arrangements…"
                value={form.creditTermsNotes}
                onChange={(e) =>
                  setForm({ ...form, creditTermsNotes: e.target.value })
                }
              />
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[#0A4D68] text-white rounded-lg hover:bg-[#083d54] disabled:opacity-60 transition-colors"
          >
            {loading ? "Updating..." : "Update corporate"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ---------- UI HELPERS ---------- */

const Section = ({ title, children }) => (
  <div className="py-5 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {title}
      </span>
      <span className="flex-1 h-px bg-gray-100" />
    </div>
    <div className="grid grid-cols-3 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-500">{label}</label>
    {children}
  </div>
);

const Input = ({ value, type = "text", onChange }) => (
  <input
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900
               focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/10 focus:border-gray-400
               placeholder:text-gray-300 transition-colors"
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const Select = ({ options, value, onChange }) => (
  <select
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900
               focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/10 focus:border-gray-400
               transition-colors"
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
  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#0A4D68]" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                    transition-transform duration-200 ${checked ? "translate-x-4" : ""}`}
      />
    </button>
  </div>
);

const MultiSelect = ({ label, options, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs text-gray-500">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer
                      transition-colors select-none ${
                        value.includes(opt)
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
        >
          <input
            type="checkbox"
            className="hidden"
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