import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiLayout,
  FiImage,
  FiType,
  FiSave,
  FiUpload,
  FiChevronRight,
  FiDroplet,
  FiPhone,
  FiMail,
  FiLifeBuoy,
  FiEdit3,
} from "react-icons/fi";
import { toast } from "sonner";
import { getBrandingDetails, updateBrandingDetails } from "../../Redux/Actions/landingPageThunks";
import { C } from "../Shared/color";

const BrandingSettings = () => {
  const dispatch = useDispatch();
  const { branding, isLoading, isUpdating } = useSelector((state) => state.landingPage);

  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const DEFAULTS = {
    landingPageTitle: "Corporate Travel Desk",
    welcomeMessage: "Welcome to our Travel Portal",
    companyType: "Private Limited",
    supportEmail: "support@traveldesk.com",
    supportPhone: "+1 800 123 4567",
  };

  const [formData, setFormData] = useState({
    corporateName: "",
    landingPageTitle: "",
    welcomeMessage: "",
    companyType: "",
    supportEmail: "",
    supportPhone: "",
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
        supportEmail: bObj.supportEmail || DEFAULTS.supportEmail,
        supportPhone: bObj.supportPhone || DEFAULTS.supportPhone,
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
      // Revert changes on cancel
      const bObj = branding.branding || {};
      setFormData({
        corporateName: branding.corporateName || "",
        landingPageTitle: bObj.landingPageTitle || DEFAULTS.landingPageTitle,
        welcomeMessage: bObj.welcomeMessage || DEFAULTS.welcomeMessage,
        companyType: branding.classification || DEFAULTS.companyType,
        supportEmail: bObj.supportEmail || DEFAULTS.supportEmail,
        supportPhone: bObj.supportPhone || DEFAULTS.supportPhone,
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
    data.append("supportEmail", formData.supportEmail);
    data.append("supportPhone", formData.supportPhone);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-gold rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: C.offWhite }}>
      {/* ── HEADER BAND ── */}
      <div className="bg-white border-b shadow-sm mb-8 sticky top-0 z-30">
        <div className="w-full px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: C.navy }}>
              <FiLayout style={{ color: C.gold }} />
              Branding & Portal Identity
            </h1>
            <p className="text-xs font-medium mt-1" style={{ color: C.muted }}>
              {isEditing 
                ? "Configure your organization's look and feel for employees." 
                : "Manage your corporate identity and contact information."}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={toggleEdit}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95 text-sm"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isUpdating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 text-sm"
                  style={{ background: C.gold, color: C.navy }}
                >
                  {isUpdating ? (
                    <div className="animate-spin h-4 w-4 border-2 border-navy/30 border-t-navy rounded-full" />
                  ) : (
                    <FiSave size={16} />
                  )}
                  {isUpdating ? "Saving..." : "Save Branding"}
                </button>
              </>
            ) : (
              <button
                onClick={toggleEdit}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                style={{ background: C.navy, color: "white" }}
              >
                <FiEdit3 size={16} style={{ color: C.gold }} />
                Edit Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="w-full px-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Logo & Identity */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Logo Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <FiImage style={{ color: C.gold }} />
                <h2 className="font-bold text-[11px] uppercase tracking-widest" style={{ color: C.navy }}>Corporate Brand Mark</h2>
              </div>
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative group">
                    <div className="w-40 h-40 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-gold/50 relative">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="text-center p-4">
                          <FiImage className="text-4xl text-slate-200 mx-auto" />
                          <span className="text-[10px] font-bold text-slate-400 block mt-2 uppercase">No Logo</span>
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current.click()}
                        className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl shadow-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: C.gold, color: C.navy }}
                      >
                        <FiUpload size={16} />
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-black" style={{ color: C.navy }}>Brand Identity</h3>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: C.muted }}>
                      Upload your organization's official logo. This will appear on all booking itineraries, the employee dashboard, and the login portal.
                    </p>
                    {isEditing && (
                      <button 
                        onClick={() => fileInputRef.current.click()}
                        className="mt-4 inline-flex items-center gap-1.5 font-bold text-sm hover:underline"
                        style={{ color: C.gold }}
                      >
                        Browse Files <FiChevronRight />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <FiType style={{ color: C.gold }} />
                <h2 className="font-bold text-[11px] uppercase tracking-widest" style={{ color: C.navy }}>Portal Personalization</h2>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: C.muted }}>Organization Name</label>
                    {isEditing ? (
                      <input
                        name="corporateName"
                        value={formData.corporateName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-bold text-sm"
                        placeholder="e.g. Traveamer Tech"
                      />
                    ) : (
                      <p className="px-5 py-3.5 bg-slate-50/50 rounded-xl font-black text-sm border border-transparent" style={{ color: C.navy }}>
                        {formData.corporateName || "—"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: C.muted }}>Portal Display Title</label>
                    {isEditing ? (
                      <input
                        name="landingPageTitle"
                        value={formData.landingPageTitle}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-bold text-sm"
                        placeholder="e.g. Employee Travel Hub"
                      />
                    ) : (
                      <p className="px-5 py-3.5 bg-slate-50/50 rounded-xl font-black text-sm border border-transparent" style={{ color: C.navy }}>
                        {formData.landingPageTitle || "—"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: C.muted }}>Welcome Message</label>
                  {isEditing ? (
                    <textarea
                      name="welcomeMessage"
                      value={formData.welcomeMessage}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-medium text-sm leading-relaxed"
                      placeholder="Enter a greeting for your employees..."
                    />
                  ) : (
                    <div className="px-5 py-4 bg-slate-50/50 rounded-xl font-medium text-sm leading-relaxed border border-transparent" style={{ color: C.navy }}>
                      {formData.welcomeMessage || <span className="italic opacity-30">No custom message set.</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Info & Support */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Contact Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <FiLifeBuoy style={{ color: C.gold }} />
                <h2 className="font-bold text-[11px] uppercase tracking-widest" style={{ color: C.navy }}>Helpdesk & Support</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest px-1 flex items-center gap-1.5" style={{ color: C.muted }}>
                    <FiMail /> Support Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="supportEmail"
                      value={formData.supportEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-bold text-sm"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-sm" style={{ color: C.navy }}>
                      {formData.supportEmail || "—"}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest px-1 flex items-center gap-1.5" style={{ color: C.muted }}>
                    <FiPhone /> Helpline Number
                  </label>
                  {isEditing ? (
                    <input
                      name="supportPhone"
                      value={formData.supportPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-bold text-sm"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-sm" style={{ color: C.navy }}>
                      {formData.supportPhone || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest px-1 flex items-center gap-1.5" style={{ color: C.muted }}>
                    <FiDroplet /> Company Classification
                  </label>
                  {isEditing ? (
                    <select
                      name="companyType"
                      value={formData.companyType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-gold outline-none transition-all font-bold text-sm cursor-pointer appearance-none"
                    >
                      <option value="Private Limited">Private Limited</option>
                      <option value="Limited">Limited</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="NGO">NGO</option>
                      <option value="Government">Government</option>
                    </select>
                  ) : (
                    <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-sm" style={{ color: C.navy }}>
                      {formData.companyType || "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="rounded-2xl p-6 border border-gold/20" style={{ background: `${C.gold}08` }}>
              <h4 className="font-black text-sm mb-2" style={{ color: C.navy }}>Why Branding Matters?</h4>
              <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
                Consistent branding builds trust within your organization. Your logo and portal title will be visible to all employees throughout their booking journey.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
                </div>
                <span className="text-[10px] font-bold" style={{ color: C.navy }}>Used by 500+ Corporates</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
