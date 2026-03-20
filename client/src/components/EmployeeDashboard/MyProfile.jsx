// MyProfile.jsx


import React, { useEffect, useState } from "react";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiHash,
  FiLayers,
  FiTag,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyProfile,
  updateMyProfile,
  clearEmployeeError,
} from "../../Redux/Slice/employeeActionSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";

const PERSONAL_FIELDS = [
  {
    key: "name",
    label: "Full Name",
    icon: FiUser,
    type: "text",
    editable: true,
  },
  { key: "email", label: "Email", icon: FiMail, type: "email", editable: true },
  { key: "phone", label: "Phone", icon: FiPhone, type: "tel", editable: true },
  // { key: "location",    label: "Location",     icon: FiMapPin,    type: "text",  editable: true  },
];

const CORPORATE_FIELDS = [
  {
    key: "employeeId",
    label: "Employee ID",
    icon: FiHash,
    type: "text",
    editable: true,
  },
  {
    key: "department",
    label: "Department",
    icon: FiLayers,
    type: "text",
    editable: true,
  },
  {
    key: "designation",
    label: "Designation",
    icon: FiBriefcase,
    type: "text",
    editable: true,
  },
];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function MyProfile() {
  const dispatch = useDispatch();
  const { myProfile, loading, error, updating } = useSelector(
    (s) => s.employeeAction,
  );

  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);

  useEffect(() => {
    dispatch(fetchMyProfile());
  }, [dispatch]);
  useEffect(() => {
    if (myProfile) setLocalProfile(myProfile);
  }, [myProfile]);

  const updateField = (key, value) =>
    setLocalProfile((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const payload = {
      name: localProfile.name,
      email: localProfile.email,
      phone: localProfile.phone,
      employeeId: localProfile.employeeId,
      department: localProfile.department,
      designation: localProfile.designation,
    };

    try {
      await dispatch(updateMyProfile(payload)).unwrap();

      ToastWithTimer({
        message: "Profile updated successfully",
        type: "success",
      });

      setEditing(false);
    } catch (err) {
      ToastWithTimer({
        message: err || "Update failed",
        type: "error",
      });
    }
  };

  const handleCancel = () => {
    setLocalProfile(myProfile);
    setEditing(false);
  };

  if (loading && !localProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0A4D68] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center max-w-sm">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => dispatch(clearEmployeeError())}
            className="px-4 py-2 bg-[#0A4D68] text-white text-sm rounded-lg hover:bg-[#083d52] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!localProfile) return null;

  const initials = getInitials(localProfile.name);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          My Profile
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          View and manage your personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT: Identity Card ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Gradient banner */}
            <div className="h-20 bg-linear-to-r from-[#0A4D68] to-[#088395]" />

            <div className="px-6 pb-6 -mt-10 flex flex-col items-center text-center">
              {/* Avatar initials */}
              <div
                className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md
                flex items-center justify-center text-[#0A4D68] text-xl font-bold"
              >
                {initials || <FiUser size={28} />}
              </div>

              <h2 className="mt-3 text-base font-bold text-slate-800 leading-tight">
                {localProfile.name || "—"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {localProfile.designation || "—"}
              </p>

              <div className="mt-3 w-full">
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wider
                  text-[#0A4D68] bg-[#0A4D68]/10 px-3 py-1 rounded-full"
                >
                  {localProfile.department || "No Department"}
                </span>
              </div>

              <div className="mt-4 w-full border-t border-slate-100 pt-4 space-y-2 text-left">
                <InfoRow
                  icon={FiHash}
                  value={localProfile.employeeId || "—"}
                  label="Employee ID"
                />
                <InfoRow
                  icon={FiMail}
                  value={localProfile.email || "—"}
                  label="Email"
                />
                <InfoRow
                  icon={FiPhone}
                  value={localProfile.phone || "—"}
                  label="Phone"
                />
                {/* <InfoRow icon={FiMapPin} value={localProfile.location   || "—"} label="Location" /> */}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Edit Panel ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Personal Info */}
          <Section
            title="Personal Information"
            subtitle="Basic contact details"
            icon={FiUser}
            editing={editing}
            updating={updating}
            onEdit={() => setEditing(true)}
            onSave={handleSave}
            onCancel={handleCancel}
            showActions
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PERSONAL_FIELDS.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={localProfile[f.key]}
                  editing={editing}
                  onChange={(v) => updateField(f.key, v)}
                />
              ))}
            </div>
          </Section>

          {/* Corporate Info */}
          <Section
            title="Corporate Details"
            subtitle="Role and organisational info"
            icon={FiBriefcase}
            editing={editing}
            updating={updating}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CORPORATE_FIELDS.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={localProfile[f.key]}
                  editing={editing}
                  onChange={(v) => updateField(f.key, v)}
                />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────
function Section({
  title,
  subtitle,
  icon: Icon,
  editing,
  updating,
  onEdit,
  onSave,
  onCancel,
  showActions,
  children,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A4D68]/10 text-[#0A4D68]">
            <Icon size={15} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600
                    border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <FiX size={12} /> Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={updating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white
    rounded-lg transition
    ${
      updating
        ? "bg-slate-300 cursor-not-allowed"
        : "bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98]"
    }`}
                >
                  <FiSave size={12} />
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0A4D68]
                  border border-[#0A4D68]/30 bg-[#0A4D68]/5 rounded-lg hover:bg-[#0A4D68]/10 transition"
              >
                <FiEdit2 size={12} /> Edit
              </button>
            )}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

// ── Single editable field ────────────────────────────────
function Field({ field, value, editing, onChange }) {
  const Icon = field.icon;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        <Icon size={10} />
        {field.label}
      </label>
      {editing ? (
        <input
          type={field.type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg
            outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
        />
      ) : (
        <div className="px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg min-h-[38px]">
          {value || <span className="text-slate-300 italic">Not set</span>}
        </div>
      )}
    </div>
  );
}

// ── Sidebar info row ─────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className="text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs font-medium text-slate-600 truncate">{value}</p>
      </div>
    </div>
  );
}
