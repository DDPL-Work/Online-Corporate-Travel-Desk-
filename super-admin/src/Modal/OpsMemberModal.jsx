import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { createOpsMember, updateOpsMember } from "../API/opsAPI";
import {
  buildOpsMemberPayload,
  normalizeOpsMemberRecord,
  OPS_ACCESS_ROLE_OPTIONS,
  OPS_DEPARTMENT_OPTIONS,
  OPS_DESIGNATION_OPTIONS,
  OPS_SERVICING_SCOPE_OPTIONS,
  withSelectedOption,
} from "../constants/opsMember";

const PERMISSIONS_LIST = [
  "View Bookings",
  "Manage Cancellations",
  "Manage Reissues",
  "View Finance",
  "Manage Corporates",
  "SEO Management",
];

const createDefaultForm = () => ({
  name: "",
  email: "",
  phone: "",
  role: OPS_ACCESS_ROLE_OPTIONS[0].value,
  department: OPS_DEPARTMENT_OPTIONS[0],
  designation: OPS_DESIGNATION_OPTIONS[0],
  servicingScope: OPS_SERVICING_SCOPE_OPTIONS[2],
  permissions: [],
  password: "",
});

export default function OpsMemberModal({ member, onClose, onSuccess }) {
  const isEdit = Boolean(member);

  const [form, setForm] = useState(createDefaultForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!member) {
      setForm(createDefaultForm());
      return;
    }

    const normalized = normalizeOpsMemberRecord(member);
    setForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: normalized.role,
      department: normalized.department,
      designation: normalized.designation,
      servicingScope: normalized.servicingScope,
      permissions: member.permissions || [],
      password: "",
    });
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildOpsMemberPayload(form);

    if (
      !payload.name ||
      !payload.email ||
      !payload.phone ||
      !payload.role ||
      !payload.department ||
      !payload.designation
    ) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      if (isEdit) {
        if (!payload.password) {
          delete payload.password;
        }

        await updateOpsMember(member._id, payload);
        toast.success("OPS Member updated successfully");
      } else {
        const res = await createOpsMember(payload);
        if (res.data.generatedPassword) {
          toast.info(`Member created. Password: ${res.data.generatedPassword}`, {
            autoClose: false,
          });
        } else {
          toast.success("OPS Member created successfully");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((currentPermission) => currentPermission !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-[#0A4D68] px-6 py-4 text-white">
          <h2 className="text-lg font-bold uppercase tracking-tight">
            {isEdit ? "Edit OPS Member" : "Add OPS Member"}
          </h2>
          <button onClick={onClose} className="transition-transform hover:rotate-90">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name *">
              <input
                className="modal-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </Field>

            <Field label="Email Address *">
              <input
                className="modal-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
                disabled={isEdit}
              />
            </Field>

            <Field label="Phone Number *">
              <input
                className="modal-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </Field>

            <Field label="Access Role *">
              <select
                className="modal-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {OPS_ACCESS_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Department *">
              <select
                className="modal-input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {withSelectedOption(OPS_DEPARTMENT_OPTIONS, form.department).map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Designation *">
              <select
                className="modal-input"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              >
                {withSelectedOption(OPS_DESIGNATION_OPTIONS, form.designation).map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Servicing Scope">
              <select
                className="modal-input"
                value={form.servicingScope}
                onChange={(e) => setForm({ ...form, servicingScope: e.target.value })}
              >
                {withSelectedOption(OPS_SERVICING_SCOPE_OPTIONS, form.servicingScope).map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={isEdit ? "Reset Password (Leave blank to keep current)" : "Password"}>
              <div className="relative">
                <input
                  className="modal-input w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? "********" : "Leave blank for auto-gen"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0A4D68]"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Service scope preserves the legacy Flights/Hotels/Both routing used by OPS assignment flows.
              </p>
            </Field>
          </div>

          <div className="mt-6">
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">
              Permissions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS_LIST.map((perm) => (
                <label
                  key={perm}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
                    form.permissions.includes(perm)
                      ? "border-teal-200 bg-teal-50 text-teal-700"
                      : "border-gray-100 bg-gray-50 text-gray-500 opacity-60 hover:opacity-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  <span className="text-sm font-medium">{perm}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-6 py-2 text-xs font-bold uppercase text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0A4D68] px-8 py-2 text-xs font-bold uppercase text-white shadow-lg disabled:opacity-50 hover:shadow-teal-500/20"
            >
              {loading ? "Saving..." : isEdit ? "Update Member" : "Create Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5 text-left">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </label>
    {children}
  </div>
);
