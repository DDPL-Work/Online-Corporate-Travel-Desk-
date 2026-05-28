// client/src/components/EmployeeDashboard/MyProfile.jsx
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
  FiArrowRight,
  FiRefreshCw,
  FiFileText,
  FiCreditCard,
  FiCalendar,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchMyProfile,
  updateMyProfile,
  fetchManagers,
  clearEmployeeError,
} from "../../Redux/Slice/employeeActionSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { fetchProjects } from "../../Redux/Actions/project.thunk";
import { jwtDecode } from "jwt-decode";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { C } from "../Shared/color";
import CustomDatePicker from "../Shared/CustomDatePicker";

const PERSONAL_FIELDS = [
  { key: "firstName", label: "First Name", icon: FiUser, type: "text", editable: true },
  { key: "lastName", label: "Last Name", icon: FiUser, type: "text", editable: true },
  { key: "email", label: "Email", icon: FiMail, type: "email", editable: false },
  { key: "phone", label: "Phone", icon: FiPhone, type: "tel", editable: true },
  { key: "dob", label: "Date of Birth", icon: FiCalendar, type: "date", editable: true },
];

const CORPORATE_FIELDS = [
  { key: "employeeId", label: "Employee ID", icon: FiHash, type: "text", editable: true },
  { key: "department", label: "Department", icon: FiLayers, type: "text", editable: true },
  { key: "designation", label: "Corporate Role", icon: FiBriefcase, type: "text", editable: true },
];

function getInitials(firstName = "", lastName = "") {
  const f = firstName.trim()[0]?.toUpperCase() || "";
  const l = lastName.trim()[0]?.toUpperCase() || "";
  return f + l;
}

export default function MyProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myProfile, managers, loading, error, updating } = useSelector((s) => s.employeeAction);
  const { projects = [] } = useSelector((s) => s.corporateProject);

  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);

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
      const nameParts = (myProfile.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName  = nameParts.slice(1).join(" ") || "";
      setLocalProfile({
        ...myProfile,
        employeeId: myProfile.employeeId || myProfile.employeeCode || "",
        firstName,
        lastName,
        managerId: myProfile.manager?._id || myProfile.managerId,
        dob: myProfile.dob ? myProfile.dob.split("T")[0] : "",
      });
    }
  }, [myProfile]);

  const updateField = (key, value) => setLocalProfile((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const fullName = `${localProfile.firstName || ""} ${localProfile.lastName || ""}`.trim();
    const payload = {
      name: fullName,
      // email: localProfile.email,
      phone: localProfile.phone,
      employeeId: localProfile.employeeId,
      department: localProfile.department,
      designation: localProfile.designation,
      managerId: localProfile.managerId,
      projectId: localProfile.projectId,
      dob: localProfile.dob,
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.gold }} />
          <p className="text-sm text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center max-w-sm">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => dispatch(clearEmployeeError())}
            className="px-4 py-2 text-white text-sm rounded-lg transition" style={{ background: C.gold, color: C.navy }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!localProfile) return null;

  const initials = getInitials(localProfile.firstName, localProfile.lastName);

  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header (Standard Gradient) ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <div className={`p-3 rounded-xl bg-white/10 border border-white/10 ${loading ? "animate-spin" : ""}`}>
                  <FiRefreshCw size={20} />
               </div>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiUser size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Identity Hub</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Manage your corporate credentials, authorization matrix & documents</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ── LEFT: Identity Card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden sticky top-8">
              <div className="h-24" style={{ background: `linear-gradient(to right, ${C.navy}, ${C.navyMid})` }}/>
              <div className="px-6 pb-8 -mt-12 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-white border-8 border-white shadow-xl flex items-center justify-center text-2xl font-black" style={{ color: C.navy }}>
                  {initials || <FiUser size={32} />}
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-800 leading-tight">
                  {localProfile.firstName || localProfile.lastName
                    ? <><span>{localProfile.firstName}</span>{localProfile.lastName && <> <span style={{ color: C.gold }}>{localProfile.lastName}</span></>}</>
                    : "—"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{localProfile.designation || "—"}</p>
                
                <div className="mt-4 w-full">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ color: C.navy, background: C.gold + "22" }}>
                    {localProfile.department || "No Department"}
                  </span>
                </div>

                <div className="mt-8 w-full border-t border-slate-100 pt-6 space-y-4 text-left">
                  <InfoRow icon={FiHash} value={localProfile.employeeId || "—"} label="Employee ID" />
                  <InfoRow icon={FiMail} value={localProfile.email || "—"} label="Email Address" />
                  <InfoRow icon={FiPhone} value={localProfile.phone && !localProfile.phone.toString().startsWith("+") ? `+${localProfile.phone}` : localProfile.phone || "—"} label="Mobile Number" />
                  <InfoRow icon={FiCalendar} value={localProfile.dob || "—"} label="Date of Birth" />
                </div>

                {/* ── Travel Documents Shortcut ── */}
                <div className="mt-8 w-full pt-6 border-t border-slate-100">
                   <button 
                    onClick={() => navigate("/travel-documents")}
                    className="w-full group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:shadow-lg transition-all duration-300"
                    style={{ background: C.offWhite }}
                   >
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-sm">
                           <FiCreditCard size={18} style={{ color: C.gold }} />
                        </div>
                        <div className="text-left">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-[#003399]">Documents</p>
                           <p className="text-xs font-black text-slate-800">Travel Docs</p>
                        </div>
                     </div>
                     <FiArrowRight size={16} className="text-slate-300 group-hover:text-[#003399] group-hover:translate-x-1 transition-all" />
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content Panels ── */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Personal & Corporate Info Combined */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between rounded-t-[2rem]" style={{ background: `linear-gradient(to right, white, ${C.gold}11)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: C.gold + "22" }}>
                      <FiUser style={{ color: C.navy }} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Profile Information</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Personal & Work Identity Registry</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <div className="flex gap-2">
                         <button onClick={handleCancel} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition">Cancel</button>
                         <button 
                          onClick={handleSave} 
                          disabled={updating}
                          className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-md" style={{ background: C.gold, color: C.navy }}
                         >
                          {updating ? "Saving..." : "Save Changes"}
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-md" style={{ background: C.offWhite, color: C.navy }}>
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

            {/* ── Project Approval Matrix ── */}
            {userRole !== "travel-admin" && (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                    <FiShield />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Project Approval Matrix</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Designated Managers per Project Assignment</p>
                  </div>
                </div>

                <div className="p-0 overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[700px]">
                     <thead>
                       <tr className="bg-slate-50/50">
                         <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Project Name</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Approver</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Status</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Role</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {(localProfile.projectApprovers || []).map((approver, idx) => (
                         <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                               <FiLayers style={{ color: C.navyMid }} size={14} />
                               <div>
                                 <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{approver.projectName}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{approver.projectCode || "CTD-GLOBAL"}</p>
                               </div>
                             </div>
                           </td>
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#003399] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
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
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#003399]/10 text-[#003399] rounded-full border border-[#003399]/20 shadow-sm">
                               <FiUser size={10} />
                               <span className="text-[9px] font-black uppercase tracking-widest">Manager</span>
                             </div>
                           </td>
                         </tr>
                       ))}

                       {editing && (
                         <tr className="bg-slate-50/50">
                           <td className="px-8 py-10">
                             <div className="flex flex-col gap-2">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Project</label>
                               <select
                                  value={localProfile.projectId || ""}
                                  onChange={(e) => updateField("projectId", e.target.value)}
                                  className="w-full px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none"
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
                                  className="w-full px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none"
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
                                <span style={{ color: C.gold }}>Travel Administrator</span> for review.
                             </p>
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {/* ── Designated Authorities (Direct Hierarchy) ── */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                  <FiShield />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Designated Authorities</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Direct Organizational Approval Hierarchy</p>
                </div>
              </div>

              <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead>
                     <tr className="bg-slate-50/50">
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Authority Name</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Email Address</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Role</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {(localProfile.manager || localProfile.managerId) && (
                       <tr className="group hover:bg-slate-50/30 transition-colors">
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#003399] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                                {(localProfile.manager?.name || "M").charAt(0)}
                              </div>
                              <p className="text-sm font-black text-slate-700">{localProfile.manager?.name || "Assigned Manager"}</p>
                           </div>
                         </td>
                         <td className="px-8 py-6 text-xs font-bold text-slate-400 tracking-tight">{localProfile.manager?.email || "—"}</td>
                         <td className="px-8 py-6 text-right">
                           <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: C.gold + "22", color: C.navy, border: "1px solid " + C.gold + "44" }}>
                             Reporting Manager
                           </span>
                         </td>
                       </tr>
                     )}
                     {localProfile.travelAdmin && (
                       <tr className="group hover:bg-slate-50/30 transition-colors">
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm" style={{ background: C.navy }}>
                                {(localProfile.travelAdmin?.name || "A").charAt(0)}
                              </div>
                              <p className="text-sm font-black text-slate-700">{localProfile.travelAdmin?.name || "Travel Admin"}</p>
                           </div>
                         </td>
                         <td className="px-8 py-6 text-xs font-bold text-slate-400 tracking-tight">{localProfile.travelAdmin?.email || "—"}</td>
                         <td className="px-8 py-6 text-right">
                           <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#003399]/10 text-[#003399] border border-[#003399]/20">
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
        </div>
      </div>
    </div>
  );
}

function Field({ field, value, editing, onChange }) {
  const Icon = field.icon;
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} style={{ color: C.gold }} />
        {field.label}
      </label>
      {editing ? (
        field.key === "phone" ? (
          <div className="phone-input-container">
            <PhoneInput
              country={"in"}
              value={value || ""}
              onChange={(v) => onChange(v)}
              inputStyle={{
                width: "100%", height: "46px", fontSize: "14px", fontWeight: "700", color: "#0f172a",
                backgroundColor: C.gold + "11", border: `1.5px solid ${C.gold}44`, borderRadius: "1.25rem",
                outline: "none", paddingLeft: "55px", fontFamily: "inherit",
              }}
              buttonStyle={{ backgroundColor: "transparent", border: "none", borderRadius: "1.25rem 0 0 1.25rem", paddingLeft: "10px" }}
              dropdownStyle={{ borderRadius: "1rem", marginTop: "5px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              containerStyle={{ width: "100%" }}
            />
          </div>
        ) : field.key === "dob" ? (
          <CustomDatePicker
            value={value || ""}
            onChange={(v) => onChange(v)}
            placeholder="Select Date of Birth"
            maxDate={new Date().toISOString().split("T")[0]}
          />
        ) : (
          <input
            type={field.type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={!field.editable}
            className={`w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm ${!field.editable ? "cursor-not-allowed text-slate-500" : ""}`}
            style={{ 
              backgroundColor: field.editable ? C.gold + "11" : "#f8fafc", 
              borderColor: field.editable ? C.gold + "44" : "#e2e8f0",
            }}
          />
        )
      ) : (
        <div className="px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all" style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
          {field.key === "phone" && value && !value.toString().startsWith("+") ? (
            `+${value}`
          ) : field.key === "dob" && value ? (
            new Date(value).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })
          ) : value || (
            <span className="text-slate-400 italic font-bold">Not configured</span>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#003399]/10 group-hover:text-[#003399] transition-all shadow-sm border border-slate-100">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-1">{label}</p>
        <p className="text-[11px] font-black text-slate-900 truncate leading-none">{value}</p>
      </div>
    </div>
  );
}
