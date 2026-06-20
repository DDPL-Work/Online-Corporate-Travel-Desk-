import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-toastify";
import { C } from "../Shared/color";
import { createOpsMember, updateOpsMember, fetchOpsMembers } from "../../Redux/Actions/opsMember.thunks";

const DEFAULT_PERMISSIONS = [
  "Manage Reissues",
  "Manage Cancellations",
  "Manage Corporates",
  "View Finance",
  "Access Revenue Data",
  "User Management",
  "View Bookings",
  "Cancel Bookings",
  "Manage Bookings",
  "Financial Approval",
  "SEO Management",
];

const AVAILABILITY_STATUSES = ["AVAILABLE", "BUSY", "BREAK", "OFFLINE", "ON_LEAVE"];

export default function OpsMemberForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { members, loading } = useSelector((s) => s.opsMember);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "Operations",
    designation: "",
    servicingScope: "Both",
    permissions: ["Manage Reissues", "Manage Cancellations"],
    maxConcurrentReissues: 10,
    maxConcurrentCancellations: 10,
    availabilityStatus: "AVAILABLE",
    autoAssignmentEnabled: true,
    status: "Active",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (members.length === 0) {
      dispatch(fetchOpsMembers());
    }
  }, [dispatch, members.length]);

  useEffect(() => {
    if (isEdit && members.length > 0) {
      const member = members.find((m) => m._id === id);
      if (member) {
        setForm({
          name: member.name || "",
          email: member.email || "",
          phone: member.phone || "",
          department: member.department || "Operations",
          designation: member.designation || "",
          servicingScope: member.servicingScope || "Both",
          permissions: member.permissions || [],
          maxConcurrentReissues: member.maxConcurrentReissues ?? 10,
          maxConcurrentCancellations: member.maxConcurrentCancellations ?? 10,
          availabilityStatus: member.availabilityStatus || "AVAILABLE",
          autoAssignmentEnabled: member.autoAssignmentEnabled ?? true,
          status: member.status || "Active",
          password: "",
        });
      }
    }
  }, [isEdit, id, members]);

  const togglePermission = (perm) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    handleChange(field, Math.max(1, Math.min(999, num)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Name, email, and phone are required");
      return;
    }
    if (!isEdit && !form.password) {
      toast.error("Password is required for new members");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await dispatch(updateOpsMember({ id, data: payload })).unwrap();
        toast.success("OPS member updated");
      } else {
        await dispatch(createOpsMember(form)).unwrap();
        toast.success("OPS member created");
      }
      navigate("/ops-members");
    } catch (err) {
      toast.error(err || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const isReissueEnabled = form.permissions.includes("Manage Reissues");
  const isCancellationEnabled = form.permissions.includes("Manage Cancellations");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/ops-members")}
        className="flex items-center gap-2 text-xs font-semibold mb-6 transition-colors hover:opacity-70"
        style={{ color: C.navy }}
      >
        <FiArrowLeft size={14} /> Back to OPS Members
      </button>

      <h1 className="text-xl font-bold mb-1" style={{ color: C.navy }}>
        {isEdit ? "Edit OPS Member" : "Add OPS Member"}
      </h1>
      <p className="text-xs mb-6" style={{ color: C.muted }}>
        {isEdit ? "Update member details, permissions, and capacity limits" : "Create a new operations team member"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none"
                style={{ borderColor: C.border, color: C.nearBlack }}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none"
                style={{ borderColor: C.border, color: C.nearBlack }}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Phone *</label>
              <input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none"
                style={{ borderColor: C.border, color: C.nearBlack }}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Designation</label>
              <input
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none"
                style={{ borderColor: C.border, color: C.nearBlack }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Department</label>
              <input
                value={form.department}
                onChange={(e) => handleChange("department", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none"
                style={{ borderColor: C.border, color: C.nearBlack }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Servicing Scope</label>
              <select
                value={form.servicingScope}
                onChange={(e) => handleChange("servicingScope", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none bg-white"
                style={{ borderColor: C.border, color: C.nearBlack }}
              >
                <option value="Both">Both</option>
                <option value="Flights">Flights</option>
                <option value="Hotels">Hotels</option>
              </select>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Permissions</h2>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="rounded"
                />
                <span className="text-[13px]" style={{ color: C.nearBlack }}>{perm}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Capacity Limits */}
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Workload Capacity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: C.muted }}>
                <input
                  type="checkbox"
                  checked={isReissueEnabled}
                  readOnly
                  className="rounded"
                />
                Max Active Reissues
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={form.maxConcurrentReissues}
                onChange={(e) => handleNumberChange("maxConcurrentReissues", e.target.value)}
                disabled={!isReissueEnabled}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: C.border, color: C.nearBlack }}
              />
              <span className="text-[10px]" style={{ color: C.muted }}>
                {isReissueEnabled ? "Set between 1–999" : "Enable 'Manage Reissues' permission first"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: C.muted }}>
                <input
                  type="checkbox"
                  checked={isCancellationEnabled}
                  readOnly
                  className="rounded"
                />
                Max Active Cancellations
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={form.maxConcurrentCancellations}
                onChange={(e) => handleNumberChange("maxConcurrentCancellations", e.target.value)}
                disabled={!isCancellationEnabled}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: C.border, color: C.nearBlack }}
              />
              <span className="text-[10px]" style={{ color: C.muted }}>
                {isCancellationEnabled ? "Set between 1–999" : "Enable 'Manage Cancellations' permission first"}
              </span>
            </div>
          </div>
        </div>

        {/* Availability & Status */}
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Availability & Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Availability</label>
              <select
                value={form.availabilityStatus}
                onChange={(e) => handleChange("availabilityStatus", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none bg-white"
                style={{ borderColor: C.border, color: C.nearBlack }}
              >
                {AVAILABILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none bg-white"
                style={{ borderColor: C.border, color: C.nearBlack }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Auto Assignment</label>
              <select
                value={form.autoAssignmentEnabled ? "true" : "false"}
                onChange={(e) => handleChange("autoAssignmentEnabled", e.target.value === "true")}
                className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none bg-white"
                style={{ borderColor: C.border, color: C.nearBlack }}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: C.border }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>
            {isEdit ? "New Password (leave blank to keep current)" : "Password"}
          </h2>
          <div className="relative max-w-xs">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-[13px] outline-none pr-10"
              style={{ borderColor: C.border, color: C.nearBlack }}
              required={!isEdit}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: C.muted }}
            >
              {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/ops-members")}
            className="px-6 py-2.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
            style={{ borderColor: C.border, color: C.navy }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: C.navy }}
          >
            <FiSave size={14} /> {saving ? "Saving..." : isEdit ? "Update Member" : "Create Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
