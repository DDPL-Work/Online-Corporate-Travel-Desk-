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
    Object.entries(obj).filter(
      ([_, v]) => v !== undefined && v !== null
    )
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white max-w-6xl w-full p-6 rounded-lg overflow-y-auto max-h-[90vh]">

        <h2 className="text-xl font-semibold mb-4">Edit Corporate</h2>

        <Section title="Basic Information">
          <Input
            label="Corporate Name"
            value={form.corporateName}
            onChange={(v) =>
              setForm({ ...form, corporateName: v })
            }
          />
        </Section>

        <Section title="Primary Contact">
          <Input label="Name" value={form.primaryName}
            onChange={(v) => setForm({ ...form, primaryName: v })} />
          <Input label="Email" value={form.primaryEmail}
            onChange={(v) => setForm({ ...form, primaryEmail: v })} />
          <Input label="Mobile" value={form.primaryMobile}
            onChange={(v) => setForm({ ...form, primaryMobile: v })} />
        </Section>

        <Section title="Registered Address">
          <Input label="Street" value={form.street}
            onChange={(v) => setForm({ ...form, street: v })} />
          <Input label="City" value={form.city}
            onChange={(v) => setForm({ ...form, city: v })} />
          <Input label="State" value={form.state}
            onChange={(v) => setForm({ ...form, state: v })} />
          <Input label="Pincode" value={form.pincode}
            onChange={(v) => setForm({ ...form, pincode: v })} />
          <Input label="Country" value={form.country}
            onChange={(v) => setForm({ ...form, country: v })} />
        </Section>

        <Section title="Billing & Credit">
          <Select
            label="Billing Cycle"
            value={form.billingCycle}
            options={["15days", "30days", "custom"]}
            onChange={(v) =>
              setForm({ ...form, billingCycle: v })
            }
          />

          {form.billingCycle === "custom" && (
            <Input
              type="number"
              label="Custom Billing Days"
              value={form.customBillingDays}
              onChange={(v) =>
                setForm({ ...form, customBillingDays: v })
              }
            />
          )}

          {corporate.classification === "postpaid" && (
            <Input
              type="number"
              label="Credit Limit"
              value={form.creditLimit}
              onChange={(v) =>
                setForm({ ...form, creditLimit: v })
              }
            />
          )}
        </Section>

        <Section title="Travel Policy">
          <MultiSelect
            label="Allowed Cabin Class"
            options={["Economy", "Premium Economy", "Business", "First"]}
            value={form.allowedCabinClass}
            onChange={(v) =>
              setForm({ ...form, allowedCabinClass: v })
            }
          />

          <Toggle
            label="Allow Ancillary Services"
            checked={form.allowAncillaryServices}
            onChange={(v) =>
              setForm({ ...form, allowAncillaryServices: v })
            }
          />
        </Section>

        <Section title="Documents (URL only)">
          <Input
            label="GST Certificate URL"
            value={form.gstUrl}
            onChange={(v) =>
              setForm({ ...form, gstUrl: v })
            }
          />
          <Input
            label="PAN Card URL"
            value={form.panUrl}
            onChange={(v) =>
              setForm({ ...form, panUrl: v })
            }
          />
        </Section>

        <Section title="Notes">
          <textarea
            className="border p-2 col-span-3"
            placeholder="Credit terms / remarks"
            value={form.creditTermsNotes}
            onChange={(e) =>
              setForm({ ...form, creditTermsNotes: e.target.value })
            }
          />
        </Section>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="bg-[#0A4D68] text-white px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update"}
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
  <label className="flex items-center gap-2 col-span-3">
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
