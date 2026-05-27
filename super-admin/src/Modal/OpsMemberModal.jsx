import React, { useState } from "react";
import { toast } from "sonner";
import { FiCheck, FiEye, FiEyeOff, FiLock, FiShield, FiUser, FiX } from "react-icons/fi";
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

const createFormFromMember = (member) => {
  if (!member) return createDefaultForm();

  const normalized = normalizeOpsMemberRecord(member);
  return {
    name: member.name || "",
    email: member.email || "",
    phone: member.phone || "",
    role: normalized.role,
    department: normalized.department,
    designation: normalized.designation,
    servicingScope: normalized.servicingScope,
    permissions: member.permissions || [],
    password: "",
  };
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-300 hover:bg-white focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-[#003399]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function OpsMemberModal({ member, onClose, onSuccess }) {
  const isEdit = Boolean(member);

  const [form, setForm] = useState(() => createFormFromMember(member));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/55 p-4 backdrop-blur-sm md:p-8">
      <div className="flex h-[82vh] min-h-135 w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in">
        <div className="shrink-0 flex items-center justify-between bg-linear-to-br from-[#003399] to-[#000D26] px-6 py-6 text-white md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-xl">
              <FiShield size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">
                {isEdit ? "Edit OPS Member" : "Add OPS Member"}
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Manage access, department, and service permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition-all hover:rotate-90 hover:bg-white/20"
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <div className="sticky top-0 z-10 mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1.5 shadow-sm">
            <TabButton
              active={activeTab === "profile"}
              icon={<FiUser size={15} />}
              label="Profile & Access"
              onClick={() => setActiveTab("profile")}
            />
            <TabButton
              active={activeTab === "permissions"}
              icon={<FiLock size={15} />}
              label={`Permissions (${form.permissions.length})`}
              onClick={() => setActiveTab("permissions")}
            />
          </div>

          {activeTab === "profile" && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="mb-5">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                Member Profile
              </h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Required contact and operational identity
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Full Name *">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </Field>

            <Field label="Email Address *">
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
                disabled={isEdit}
              />
            </Field>

            <Field label="Phone Number *">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </Field>

            <Field label="Access Role *">
              <select
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                  className={`${inputClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? "********" : "Leave blank for auto-gen"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-[#003399]/10 hover:text-[#003399]"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                Service scope preserves the legacy Flights/Hotels/Both routing used by OPS assignment flows.
              </p>
            </Field>
            </div>
          </div>
          )}

          {activeTab === "permissions" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <label className="block text-sm font-black uppercase tracking-tight text-slate-800">
                  Permissions
                </label>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Select operational capabilities for this member
                </p>
              </div>
              <span className="rounded-full bg-[#003399]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#003399]">
                {form.permissions.length} selected
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSIONS_LIST.map((perm) => (
                <label
                  key={perm}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    form.permissions.includes(perm)
                      ? "border-[#003399]/25 bg-[#003399]/5 text-[#003399] shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  <span className="text-sm font-black">{perm}</span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs transition-all ${
                      form.permissions.includes(perm)
                        ? "border-[#003399] bg-[#003399] text-white"
                        : "border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <FiCheck size={14} />
                  </span>
                </label>
              ))}
            </div>
          </div>
          )}
          </div>

          <div className="shrink-0 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 bg-white px-5 py-5 sm:flex-row sm:items-center md:px-6">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "profile" ? "permissions" : "profile")}
              className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-200"
            >
              {activeTab === "profile" ? "Next: Permissions" : "Back to Profile"}
            </button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#003399] px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#003399]/20 transition-all hover:bg-[#002266] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Update Member" : "Create Member"}
            </button>
            </div>
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

const TabButton = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
      active
        ? "bg-white text-[#003399] shadow-sm"
        : "text-slate-400 hover:bg-white/60 hover:text-slate-600"
    }`}
  >
    {icon}
    <span className="truncate">{label}</span>
  </button>
);
