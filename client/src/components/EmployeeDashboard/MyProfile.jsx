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
  FiShield,
  FiStar,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyProfile,
  updateMyProfile,
  fetchManagers,
  clearEmployeeError,
} from "../../Redux/Slice/employeeActionSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { fetchProjects } from "../../Redux/Actions/project.thunk";
import { jwtDecode } from "jwt-decode";

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
    label: "Corporate Role",
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
  const { myProfile, managers, loading, error, updating } = useSelector(
    (s) => s.employeeAction,
  );
  const { projects = [] } = useSelector((s) => s.corporateProject);

  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);

  // Determine user role for conditional UI
  const token = sessionStorage.getItem("token");
  let userRole = "employee";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userRole = decoded.role || decoded.userRole || userRole;
    } catch (e) {
      console.error("Error decoding token:", e);
    }
  }

  useEffect(() => {
    dispatch(fetchMyProfile());
    dispatch(fetchManagers());
    dispatch(fetchProjects());
  }, [dispatch]);
  
  useEffect(() => {
    if (myProfile) {
      setLocalProfile({
        ...myProfile,
        managerId: myProfile.manager?._id || myProfile.managerId
      });
    }
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
      managerId: localProfile.managerId,
      projectId: localProfile.projectId,
    };

    try {
      await dispatch(updateMyProfile(payload)).unwrap();
      ToastWithTimer({ message: "Profile updated successfully", type: "success" });
      setEditing(false);
    } catch (err) {
      ToastWithTimer({ message: err || "Update failed", type: "error" });
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
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 pb-24">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-400 mt-0.5 font-medium">Manage your corporate identity and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── LEFT: Identity Card ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden sticky top-8">
            <div className="h-24 bg-linear-to-r from-[#0A4D68] to-[#088395]" />
            <div className="px-6 pb-8 -mt-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-white border-8 border-white shadow-xl flex items-center justify-center text-[#0A4D68] text-2xl font-black">
                {initials || <FiUser size={32} />}
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-800 leading-tight">{localProfile.name || "—"}</h2>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{localProfile.designation || "—"}</p>
              
              <div className="mt-4 w-full">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#0A4D68] bg-[#0A4D68]/10 px-4 py-1.5 rounded-full">
                  {localProfile.department || "No Department"}
                </span>
              </div>

              <div className="mt-8 w-full border-t border-slate-100 pt-6 space-y-4 text-left">
                <InfoRow icon={FiHash} value={localProfile.employeeId || "—"} label="Employee ID" />
                <InfoRow icon={FiMail} value={localProfile.email || "—"} label="Email Address" />
                <InfoRow icon={FiPhone} value={localProfile.phone || "—"} label="Mobile Number" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Content Panels ── */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Personal & Corporate Info Combined */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0A4D68]">
                    <FiUser />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Profile Information</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Personal & Work Identity</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {editing ? (
                    <div className="flex gap-2">
                       <button onClick={handleCancel} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition">Cancel</button>
                       <button 
                        onClick={handleSave} 
                        disabled={updating}
                        className="px-6 py-2 bg-[#0A4D68] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#0A4D68]/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                       >
                        {updating ? "Saving..." : "Save Changes"}
                       </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-50 text-[#0A4D68] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition">
                      <FiEdit2 size={12} /> Edit Profile
                    </button>
                  )}
                </div>
             </div>
             
             <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {PERSONAL_FIELDS.concat(CORPORATE_FIELDS).map((f) => (
                    <Field
                      key={f.key}
                      field={f}
                      value={localProfile[f.key]}
                      editing={editing}
                      onChange={(v) => updateField(f.key, v)}
                    />
                  ))}
                </div>
             </div>
          </div>

          {/* ── Project Approval Matrix (Hierarchy List) ── */}
          {userRole !== "travel-admin" && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <FiShield />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Project Approval Matrix</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Designated Managers per Project</p>
                  </div>
                </div>
              </div>

              <div className="p-0">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50/50">
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Project Name</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Primary Approver (Manager)</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Status</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Role</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {(localProfile.projectApprovers || []).map((approver, idx) => (
                       <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             <FiLayers className="text-[#088395]" size={14} />
                             <div>
                               <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{approver.projectName}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{approver.projectCode || "CTD-GLOBAL"}</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                                {approver.name?.charAt(0) || "M"}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-700">{approver.name || "Unassigned"}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{approver.email}</p>
                              </div>
                           </div>
                         </td>
                         <td className="px-8 py-6">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xs border ${
                              approver.status === "Pending Review" 
                              ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" 
                              : "bg-teal-50 text-teal-600 border-teal-100"
                           }`}>
                             {approver.status}
                           </span>
                         </td>
                         <td className="px-8 py-6 text-right">
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
                             <FiUser size={10} />
                             <span className="text-[9px] font-black uppercase tracking-widest">Manager</span>
                           </div>
                         </td>
                       </tr>
                     ))}

                     {/* Selection Row (Only when editing) */}
                     {editing && (
                       <tr className="bg-slate-50/50">
                         <td className="px-8 py-10">
                           <div className="flex flex-col gap-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Project</label>
                             <select
                                value={localProfile.projectId || ""}
                                onChange={(e) => updateField("projectId", e.target.value)}
                                className="w-full px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0A4D68]"
                             >
                               <option value="">Select Project</option>
                               {projects?.map(p => (
                                 <option key={p._id} value={p._id}>{p.projectName}</option>
                               ))}
                             </select>
                           </div>
                         </td>
                         <td className="px-8 py-10">
                           <div className="flex flex-col gap-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign Manager</label>
                             <select
                                value={localProfile.managerId || ""}
                                onChange={(e) => updateField("managerId", e.target.value)}
                                className="w-full px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0A4D68]"
                             >
                               <option value="">Select Manager</option>
                               {managers?.map(m => (
                                 <option key={m._id} value={m._id}>{m.name}</option>
                               ))}
                             </select>
                           </div>
                         </td>
                         <td colSpan={2} className="px-8 py-10 text-right">
                           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                             New selections will be submitted to the<br/>
                             <span className="text-[#0A4D68]">Travel Administrator</span> for review.
                           </p>
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>

          {/* ── Designated Authorities (Direct Hierarchy) ── */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FiShield />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Designated Authorities</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Direct Approval Hierarchy</p>
                </div>
              </div>
            </div>

            <div className="p-0">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50">
                     <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Authority Name</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Email Address</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Role</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {/* Manager Row */}
                   {(localProfile.manager || localProfile.managerId) && (
                     <tr className="group hover:bg-slate-50/30 transition-colors">
                       <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                              {(localProfile.manager?.name || "M").charAt(0)}
                            </div>
                            <p className="text-sm font-black text-slate-700">{localProfile.manager?.name || "Assigned Manager"}</p>
                         </div>
                       </td>
                       <td className="px-8 py-6 text-xs font-bold text-slate-400 tracking-tight">{localProfile.manager?.email || "—"}</td>
                       <td className="px-8 py-6 text-right">
                         <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                           Reporting Manager
                         </span>
                       </td>
                     </tr>
                   )}

                   {/* Travel Admin Row */}
                   {localProfile.travelAdmin && (
                     <tr className="group hover:bg-slate-50/30 transition-colors">
                       <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0A4D68] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                              {(localProfile.travelAdmin?.name || "A").charAt(0)}
                            </div>
                            <p className="text-sm font-black text-slate-700">{localProfile.travelAdmin?.name || "Travel Admin"}</p>
                         </div>
                       </td>
                       <td className="px-8 py-6 text-xs font-bold text-slate-400 tracking-tight">{localProfile.travelAdmin?.email || "—"}</td>
                       <td className="px-8 py-6 text-right">
                         <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                           Travel Administrator
                         </span>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Single editable field ────────────────────────────────
function Field({ field, value, editing, onChange }) {
  const Icon = field.icon;
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} className="text-[#088395]" />
        {field.label}
      </label>
      {editing ? (
        <input
          type={field.type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-5 py-3 text-sm text-slate-900 bg-slate-50 border-2 border-transparent rounded-[1.25rem] outline-none focus:border-[#0A4D68] focus:bg-white transition-all font-bold shadow-xs shadow-inner"
        />
      ) : (
        <div className="px-5 py-3 text-sm font-black text-slate-900 bg-slate-50 border border-slate-100 rounded-[1.25rem] min-h-[46px] flex items-center">
          {value || (
            <span className="text-slate-400 italic font-bold">
              Not configured
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar info row ─────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A4D68] group-hover:text-white transition-all shadow-xs border border-slate-100">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-1">
          {label}
        </p>
        <p className="text-[11px] font-black text-slate-900 truncate leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}
