// super-admin/src/Modal/OpsMemberModal.jsx

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { createOpsMember, updateOpsMember } from "../API/opsAPI";

const ROLES = ["Booking Manager", "Support Agent", "Finance OPS"];
const DEPARTMENTS = ["Flights", "Hotels", "Both"];
const PERMISSIONS_LIST = [
  "View Bookings",
  "Manage Cancellations",
  "View Finance",
  "Manage Corporates",
];

export default function OpsMemberModal({ member, onClose, onSuccess }) {
  const isEdit = !!member;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: ROLES[0],
    department: DEPARTMENTS[0],
    permissions: [],
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        role: member.role || ROLES[0],
        department: member.department || DEPARTMENTS[0],
        permissions: member.permissions || [],
        password: "", // Don't show password
      });
    }
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.name || !form.email || !form.phone || !form.role || !form.department) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      if (isEdit) {
        // Remove password if empty in edit mode
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        
        await updateOpsMember(member._id, payload);
        toast.success("OPS Member updated successfully");
      } else {
        const res = await createOpsMember(form);
        if (res.data.generatedPassword) {
          toast.info(`Member created. Password: ${res.data.generatedPassword}`, { autoClose: false });
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
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-xl my-auto shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0A4D68] rounded-t-xl text-white">
          <h2 className="text-lg font-bold uppercase tracking-tight">
            {isEdit ? "Edit OPS Member" : "Add OPS Member"}
          </h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={isEdit} // Optional: user requirement mentioned non-editable email
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

            <Field label="Role *">
              <select
                className="modal-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="Department *">
              <select
                className="modal-input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>

            <Field label={isEdit ? "Reset Password (Leave blank to keep current)" : "Password"}>
              <div className="relative">
                <input
                  className="modal-input w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? "••••••••" : "Leave blank for auto-gen"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A4D68] transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </Field>
          </div>

          <div className="mt-6">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
              Permissions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS_LIST.map((perm) => (
                <label
                  key={perm}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.permissions.includes(perm)
                      ? "bg-teal-50 border-teal-200 text-teal-700"
                      : "bg-gray-50 border-gray-100 text-gray-500 opacity-60 hover:opacity-100"
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

          <div className="flex justify-end gap-3 mt-8 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-gray-200 text-gray-500 font-bold uppercase text-xs hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 rounded-lg bg-[#0A4D68] text-white font-bold uppercase text-xs shadow-lg hover:shadow-teal-500/20 disabled:opacity-50"
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
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);
