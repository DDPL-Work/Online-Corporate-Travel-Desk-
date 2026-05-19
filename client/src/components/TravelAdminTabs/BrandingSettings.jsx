import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiLayout,
  FiImage,
  FiType,
  FiSave,
  FiUpload,
  FiDroplet,
  FiEdit3,
  FiArrowRight,
  FiRefreshCw,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { toast } from "sonner";
import { getBrandingDetails, updateBrandingDetails } from "../../Redux/Actions/landingPageThunks";
import { C } from "../Shared/color";

const DEFAULTS = {
  landingPageTitle: "Corporate Travel Desk",
  welcomeMessage: "Welcome to our Travel Portal",
  companyType: "Private Limited",
};

export default function BrandingSettings() {
  const dispatch = useDispatch();
  const { branding, isLoading, isUpdating } = useSelector((state) => state.landingPage);

  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    corporateName: "",
    landingPageTitle: "",
    welcomeMessage: "",
    companyType: "",
    logo: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    dispatch(getBrandingDetails());
  }, [dispatch]);

  useEffect(() => {
    if (branding) {
      const bObj = branding.branding || {};
      
      setFormData({
        corporateName: branding.corporateName || "",
        landingPageTitle: bObj.landingPageTitle || DEFAULTS.landingPageTitle,
        welcomeMessage: bObj.welcomeMessage || DEFAULTS.welcomeMessage,
        companyType: branding.classification || DEFAULTS.companyType,
        logo: null,
      });
      setLogoPreview(bObj.logo?.url || null);
    }
  }, [branding]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo size must be less than 2MB");
        return;
      }
      setFormData((prev) => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const toggleEdit = () => {
    if (isEditing && branding) {
      const bObj = branding.branding || {};
      setFormData({
        corporateName: branding.corporateName || "",
        landingPageTitle: bObj.landingPageTitle || DEFAULTS.landingPageTitle,
        welcomeMessage: bObj.welcomeMessage || DEFAULTS.welcomeMessage,
        companyType: branding.classification || DEFAULTS.companyType,
        logo: null,
      });
      setLogoPreview(bObj.logo?.url || null);
    }
    setIsEditing(!isEditing);
  };

  const handleSubmit = async () => {
    const data = new FormData();
    data.append("corporateName", formData.corporateName);
    data.append("landingPageTitle", formData.landingPageTitle);
    data.append("welcomeMessage", formData.welcomeMessage);
    data.append("companyType", formData.companyType);
    if (formData.logo) {
      data.append("companyLogo", formData.logo);
    }

    try {
      await dispatch(updateBrandingDetails(data)).unwrap();
      toast.success("Branding updated successfully");
      setIsEditing(false);
      dispatch(getBrandingDetails());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update branding");
    }
  };

  if (isLoading && !branding) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.offWhite }}>
         <div className="flex flex-col items-center gap-4">
            <FiRefreshCw className="animate-spin" size={32} style={{ color: C.gold }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: C.navy }}>Synchronizing Branding...</p>
         </div>
      </div>
    );
  }

  if (!branding) return null;

  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => window.history.back()} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <div className={`p-3 rounded-xl bg-white/10 border border-white/10 ${isLoading ? "animate-spin" : ""}`}>
                  <FiRefreshCw size={20} />
               </div>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiLayout size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Branding & Identity</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Configure your organization's look and feel for employees</p>
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
                <div className="w-24 h-24 rounded-[2rem] bg-white border-8 border-white shadow-xl flex items-center justify-center text-2xl font-black overflow-hidden relative">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <FiImage size={32} className="text-slate-300" />
                  )}
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <FiUpload size={20} />
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                
                <h2 className="mt-4 text-lg font-black text-slate-800 leading-tight">
                  {formData.corporateName || "Corporate Name"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{formData.landingPageTitle || "Portal Title"}</p>
                
                <div className="mt-4 w-full">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ color: C.navy, background: C.gold + "22" }}>
                    {formData.companyType || "Classification"}
                  </span>
                </div>

                <div className="mt-8 w-full border-t border-slate-100 pt-6 text-left">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Welcome Message</p>
                  <p className="text-[11px] font-black text-slate-900 line-clamp-3">{formData.welcomeMessage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content Panels ── */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Portal Personalization */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between rounded-t-[2rem]" style={{ background: `linear-gradient(to right, white, ${C.gold}11)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: C.gold + "22" }}>
                      <FiType style={{ color: C.navy }} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Portal Personalization</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Configure Display Text & Messaging</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                         <button onClick={toggleEdit} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition">Cancel</button>
                         <button 
                          onClick={handleSubmit} 
                          disabled={isUpdating}
                          className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-md" style={{ background: C.gold, color: C.navy }}
                         >
                          {isUpdating ? "Saving..." : "Save Changes"}
                         </button>
                      </div>
                    ) : (
                      <button onClick={toggleEdit} className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-md" style={{ background: C.offWhite, color: C.navy }}>
                        <FiEdit3 size={12} /> Edit Settings
                      </button>
                    )}
                  </div>
               </div>
               
               <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <Field
                      label="Organization Name"
                      name="corporateName"
                      value={formData.corporateName}
                      editing={isEditing}
                      onChange={handleInputChange}
                      icon={FaBuilding}
                    />
                    <Field
                      label="Portal Display Title"
                      name="landingPageTitle"
                      value={formData.landingPageTitle}
                      editing={isEditing}
                      onChange={handleInputChange}
                      icon={FiType}
                    />
                    <div className="md:col-span-2">
                      <Field
                        label="Welcome Message"
                        name="welcomeMessage"
                        value={formData.welcomeMessage}
                        editing={isEditing}
                        onChange={handleInputChange}
                        icon={FiType}
                        type="textarea"
                      />
                    </div>
                  </div>
               </div>
            </div>

            {/* Classification */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                  <FiDroplet />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm leading-none">Corporate Classification</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Organization Type for Billing & Analytics</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col gap-2 text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                      <FiDroplet size={10} style={{ color: C.gold }} />
                      Company Classification
                    </label>
                    {isEditing ? (
                      <select
                        name="companyType"
                        value={formData.companyType}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm"
                        style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
                      >
                        <option value="Private Limited">Private Limited</option>
                        <option value="Limited">Limited</option>
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="NGO">NGO</option>
                        <option value="Government">Government</option>
                      </select>
                    ) : (
                      <div className="px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all" style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
                        {formData.companyType || "—"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="rounded-[2rem] p-8 border border-gold/20" style={{ background: `${C.gold}08` }}>
              <div className="flex items-center gap-3 mb-2">
                <FiImage style={{ color: C.gold }} size={20} />
                <h4 className="font-black text-sm uppercase tracking-widest" style={{ color: C.navy }}>Why Branding Matters?</h4>
              </div>
              <p className="text-xs leading-relaxed font-medium" style={{ color: C.muted }}>
                Consistent branding builds trust within your organization. Your logo and portal title will be visible to all employees throughout their booking journey.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, editing, onChange, icon: Icon, type = "text" }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        {Icon && <Icon size={10} style={{ color: C.gold }} />}
        {label}
      </label>
      {editing ? (
        type === "textarea" ? (
          <textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            rows={4}
            className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm"
            style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full px-5 py-3 text-sm text-slate-900 border-1.5 rounded-[1.25rem] outline-none transition-all font-bold shadow-sm"
            style={{ backgroundColor: C.gold + "11", borderColor: C.gold + "44" }}
          />
        )
      ) : (
        <div className={`px-5 py-3 text-sm font-black text-slate-900 border rounded-[1.25rem] min-h-[46px] flex items-center transition-all ${type === "textarea" ? "items-start" : ""}`} style={{ backgroundColor: C.gold + "08", borderColor: C.gold + "22" }}>
          {value || <span className="text-slate-400 italic font-bold">Not configured</span>}
        </div>
      )}
    </div>
  );
}
