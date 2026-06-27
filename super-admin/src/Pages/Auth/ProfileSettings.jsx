// super-admin/src/Pages/Auth/ProfileSettings.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile, updateUserProfile } from "../../Redux/Slice/profileSlice";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaIdBadge,
  FaLock,
  FaShieldAlt,
  FaEdit,
  FaChevronRight,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiHash,
  FiLayers,
  FiShield,
  FiArrowRight,
  FiRefreshCw,
  FiLock,
  FiEdit2,
  FiSave
} from "react-icons/fi";

const C = {
  navy: "#000D26",
  navyDeep: "#04112F",
  navyMid: "#0A243D",
  navyDark: "#102238",
  gold: "#C9A240",
  amber: "#D97706",
  emerald: "#059669",
  muted: "#65758B",
  border: "#E1E7EF",
  lightGray: "#F5F5F5",
  offWhite: "#F8FAFC",
  cream: "#FFFBEB",
  white: "#FFFFFF",
  black: "#000000",
  nearBlack: "#1A1714",
};

export default function ProfileSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, updating } = useSelector((state) => state.profile);
  const tokenRole = useSelector((state) => state.auth.role);

  // USER LOGIC - STRICTLY UNCHANGED
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    phone: "",
    department: "",
    designation: "",
    role: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        phone: user.phone || "",
        department: user.department || "",
        designation: user.designation || "",
        role: user.role || user.specificRole || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const toggleVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    const payload = { ...form };
    
    if (isChangingPassword) {
      if (!passwordForm.currentPassword || !passwordForm.newPassword) {
        return toast.error("Please fill password fields");
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        return toast.error("Passwords do not match");
      }
      payload.currentPassword = passwordForm.currentPassword;
      payload.newPassword = passwordForm.newPassword;
    }

    try {
      await dispatch(updateUserProfile(payload)).unwrap();
      toast.success("Profile updated successfully!");
      setIsChangingPassword(false);
      setEditing(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        phone: user.phone || "",
        department: user.department || "",
        designation: user.designation || "",
        role: user.role || user.specificRole || "",
      });
    }
    setEditing(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.gold }} />
          <p className="text-sm text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  const initials = form.name ? form.name.trim()[0]?.toUpperCase() : "U";

  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header (Standard Gradient) ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <button onClick={() => dispatch(fetchUserProfile())} disabled={loading} className={`p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center md:items-center gap-4 md:gap-5">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiUser size={24} className="md:w-7 md:h-7" /></div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">My Profile</h1>
                 <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">Manage your personal details and security</p>
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
                  {form.name || "—"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{form.role || "—"}</p>
                
                {form.department && (
                  <div className="mt-4 w-full">
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ color: C.navy, background: C.gold + "22" }}>
                      {form.department}
                    </span>
                  </div>
                )}

                <div className="mt-8 w-full border-t border-slate-100 pt-6 space-y-4 text-left">
                  <InfoRow icon={FiMail} value={form.email || "—"} label="Email Address" />
                  <InfoRow icon={FiPhone} value={tokenRole === "ops-member" ? form.phone : form.mobile || "—"} label="Mobile Number" />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content Panels ── */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Personal Info */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between rounded-t-[2rem]" style={{ background: `linear-gradient(to right, white, ${C.gold}11)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: C.gold + "22" }}>
                      <FiUser style={{ color: C.navy }} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Profile Information</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Personal Details</p>
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
                    <Field 
                      icon={FiUser} label="Full Name" name="name" 
                      value={form.name} editable={true} editing={editing} onChange={handleChange} 
                    />
                    <Field 
                      icon={FiMail} label="Email Address" name="email" 
                      value={form.email} editable={false} editing={editing} onChange={handleChange} type="email"
                    />
                    <Field 
                      icon={FiPhone} label="Contact Number" name={tokenRole === "ops-member" ? "phone" : "mobile"} 
                      value={tokenRole === "ops-member" ? form.phone : form.mobile} editable={true} editing={editing} onChange={handleChange} 
                    />
                    <Field 
                      icon={FiShield} label="Platform Role" name="role" 
                      value={form.role} editable={false} editing={editing} onChange={handleChange} 
                    />
                    {(tokenRole === "employee" || tokenRole === "ops-member") && (
                      <Field 
                        icon={FiBriefcase} label="Department" name="department" 
                        value={form.department} editable={tokenRole !== "ops-member"} editing={editing} onChange={handleChange} 
                      />
                    )}
                    {tokenRole === "employee" && (
                      <Field 
                        icon={FiHash} label="Designation" name="designation" 
                        value={form.designation} editable={true} editing={editing} onChange={handleChange} 
                      />
                    )}
                  </div>
               </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between" style={{ background: `linear-gradient(to right, white, ${C.gold}11)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: C.gold + "22" }}>
                    <FiLock style={{ color: C.navy }} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Security</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Change your account password</p>
                  </div>
                </div>
                
                {isChangingPassword && (
                  <div className="flex gap-2">
                    <button onClick={() => { setIsChangingPassword(false); setPasswordForm({currentPassword: "", newPassword: "", confirmPassword: ""}) }} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition">Cancel</button>
                    <button 
                    onClick={handleSave} 
                    disabled={updating}
                    className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-md flex items-center gap-2" style={{ background: C.gold, color: C.navy }}
                    >
                    {updating ? "Saving..." : "Update Password"}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8">
                {!isChangingPassword ? (
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full py-4 px-6 rounded-[1.25rem] border-2 border-dashed border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest hover:border-[#003399] hover:text-[#003399] transition-all flex items-center justify-center gap-2"
                  >
                    <FiLock size={12} /> Change Password
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <FiLock size={10} style={{ color: C.gold }} /> Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm pr-12"
                          style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => toggleVisibility('current')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003399] transition-colors"
                        >
                          {showPasswords.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <FiLock size={10} style={{ color: C.gold }} /> New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm pr-12"
                          style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => toggleVisibility('new')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003399] transition-colors"
                        >
                          {showPasswords.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <FiLock size={10} style={{ color: C.gold }} /> Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm pr-12"
                          style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => toggleVisibility('confirm')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003399] transition-colors"
                        >
                          {showPasswords.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, name, value, editable, editing, onChange, type = "text" }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} style={{ color: C.gold }} />
        {label}
      </label>
      {editing ? (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          readOnly={!editable}
          className={`w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm ${!editable ? "cursor-not-allowed text-slate-500 bg-slate-50" : ""}`}
          style={{ 
            backgroundColor: editable ? C.gold + "11" : "#f8fafc", 
            borderColor: editable ? C.gold + "44" : "#e2e8f0",
          }}
        />
      ) : (
        <div className="px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all" style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
          {value || <span className="text-slate-400 italic font-bold">Not configured</span>}
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
