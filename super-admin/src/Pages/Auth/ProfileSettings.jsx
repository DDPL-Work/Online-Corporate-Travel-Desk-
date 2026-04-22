// super-admin/src/Pages/Auth/ProfileSettings.jsx

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile, updateUserProfile } from "../../Redux/Slice/profileSlice";
import { toast } from "react-toastify";
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

export default function ProfileSettings() {
  const dispatch = useDispatch();
  const { user, loading, updating } = useSelector((state) => state.profile);
  const tokenRole = useSelector((state) => state.auth.role);

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
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err || "Failed to update profile");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#0A4D68]/20 border-t-[#0A4D68] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-2xl text-white transform -rotate-3">
            <FaUser size={36} />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              MY PROFILE
            </h1>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
              <FaShieldAlt className="text-[#05BFDB]" /> Account Settings & Security
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={updating}
          className="px-10 py-4 bg-[#0A4D68] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:shadow-[#0A4D68]/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {updating ? "Saving..." : "Update Profile"}
          <FaChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - General Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0A4D68]">
                  <FaEdit />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">General Information</h3>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FieldWrapper label="Full Name" icon={<FaUser />}>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Your Full Name"
                />
              </FieldWrapper>

              <FieldWrapper label="Email Address" icon={<FaEnvelope />} disabled>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="profile-input bg-slate-50 text-slate-400 border-dashed cursor-not-allowed"
                />
              </FieldWrapper>

              <FieldWrapper label="Contact Number" icon={<FaPhone />}>
                <input
                  type="text"
                  name={tokenRole === "ops-member" ? "phone" : "mobile"}
                  value={tokenRole === "ops-member" ? form.phone : form.mobile}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Enter phone number"
                />
              </FieldWrapper>

              <FieldWrapper label="Platform Role" icon={<FaShieldAlt />} disabled>
                <input
                  type="text"
                  value={form.role}
                  disabled
                  className="profile-input bg-slate-50 text-slate-400 border-dashed capitalize"
                />
              </FieldWrapper>

              {(tokenRole === "employee" || tokenRole === "ops-member") && (
                <FieldWrapper label="Department" icon={<FaBriefcase />} disabled={tokenRole === "ops-member"}>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={tokenRole === "ops-member" ? undefined : handleChange}
                    disabled={tokenRole === "ops-member"}
                    className={`profile-input ${tokenRole === "ops-member" ? "bg-slate-50 text-slate-400 border-dashed" : ""}`}
                  />
                </FieldWrapper>
              )}

              {tokenRole === "employee" && (
                <FieldWrapper label="Designation" icon={<FaIdBadge />}>
                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    className="profile-input"
                  />
                </FieldWrapper>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Security & Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                  <FaLock />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Security</h3>
              </div>
            </div>

            <div className="p-8 space-y-4">
              {!isChangingPassword ? (
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest hover:border-[#0A4D68] hover:text-[#0A4D68] transition-all flex items-center justify-center gap-2"
                >
                  <FaLock size={10} /> Change Password
                </button>
              ) : (
                <div className="space-y-4animate-slideDown">
                   <FieldWrapper label="Current Password">
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="profile-input pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => toggleVisibility('current')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A4D68] transition-colors"
                      >
                        {showPasswords.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </FieldWrapper>
                  
                  <FieldWrapper label="New Password">
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="profile-input pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => toggleVisibility('new')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A4D68] transition-colors"
                      >
                        {showPasswords.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </FieldWrapper>

                  <FieldWrapper label="Confirm New Password">
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="profile-input pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => toggleVisibility('confirm')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A4D68] transition-colors"
                      >
                        {showPasswords.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </FieldWrapper>

                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors pt-2"
                  >
                    Cancel Change
                  </button>
                </div>
              )}
            </div>
          </div>

         
        </div>
      </div>

      <style jsx>{`
        .profile-input {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background-color: #f8fafc;
          border: 2px solid transparent;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          transition: all 0.2s;
        }
        .profile-input:focus {
          background-color: white;
          border-color: #0A4D68;
          box-shadow: 0 10px 25px -5px rgba(10, 77, 104, 0.05);
          outline: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

const FieldWrapper = ({ label, icon, children, disabled }) => (
  <div className="flex flex-col gap-2 text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
      {icon && <span className="text-[#05BFDB]">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);
