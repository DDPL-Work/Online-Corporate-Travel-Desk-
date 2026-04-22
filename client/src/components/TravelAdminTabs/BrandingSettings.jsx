import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiLayout,
  FiImage,
  FiType,
  FiMessageSquare,
  FiSave,
  FiUpload,
  FiChevronRight,
  FiDroplet,
  FiPhone,
  FiMail,
  FiLifeBuoy,
} from "react-icons/fi";
import { toast } from "sonner";
import { getBrandingDetails, updateBrandingDetails } from "../../Redux/Actions/landingPageThunks";

const BrandingSettings = () => {
  const dispatch = useDispatch();
  const { branding, isLoading, isUpdating } = useSelector((state) => state.landingPage);

  const [isEditing, setIsEditing] = useState(false);

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
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(getBrandingDetails());
  }, [dispatch]);

  // Sync Redux state with local form data once loaded
  useEffect(() => {
    if (branding) {
      const bObj = branding.branding || {};
      
      // If the values in DB are just the system defaults, we show them as empty 
      // in the form so the user knows they haven't "edited" them yet.
      const getVal = (key, val) => (val === DEFAULTS[key] ? "" : val || "");

      setFormData({
        corporateName: branding.corporateName || "",
        landingPageTitle: getVal("landingPageTitle", bObj.landingPageTitle),
        welcomeMessage: getVal("welcomeMessage", bObj.welcomeMessage),
        companyType: getVal("companyType", bObj.companyType),
        supportEmail: getVal("supportEmail", bObj.supportEmail),
        supportPhone: getVal("supportPhone", bObj.supportPhone),
      });
      if (bObj.logo?.url) {
        setLogoPreview(bObj.logo.url);
      }
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
        toast.error("File size must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      if (logoFile) {
        data.append("companyLogo", logoFile);
      }

      await dispatch(updateBrandingDetails(data)).unwrap();
      toast.success("Branding settings updated successfully");
      setIsEditing(false); // Exit edit mode on success
      dispatch(getBrandingDetails()); 
    } catch (err) {
      console.error("Update branding error:", err);
      toast.error(typeof err === "string" ? err : "Failed to update branding");
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Revert changes on cancel
      if (branding) {
        const bObj = branding.branding || {};
        const getVal = (key, val) => (val === DEFAULTS[key] ? "" : val || "");
        setFormData({
          corporateName: branding.corporateName || "",
          landingPageTitle: getVal("landingPageTitle", bObj.landingPageTitle),
          welcomeMessage: getVal("welcomeMessage", bObj.welcomeMessage),
          companyType: getVal("companyType", bObj.companyType),
          supportEmail: getVal("supportEmail", bObj.supportEmail),
          supportPhone: getVal("supportPhone", bObj.supportPhone),
        });
        setLogoPreview(bObj.logo?.url || null);
        setLogoFile(null);
      }
    }
    setIsEditing(!isEditing);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FiLayout className="text-blue-600" />
            Branding & Landing Page
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            {isEditing 
              ? "Modify your organization's presence and contact information." 
              : "Review your current brand profile and setup."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={toggleEdit}
              className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={isEditing ? handleSubmit : toggleEdit}
            disabled={isUpdating}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
              isEditing 
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200" 
                : "bg-gray-900 hover:bg-black text-white shadow-gray-200"
            }`}
          >
            {isUpdating ? (
              <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : isEditing ? (
              <FiSave className="text-lg" />
            ) : (
              <FiType className="text-lg" />
            )}
            {isUpdating ? "Saving..." : isEditing ? "Save Changes" : "Edit Branding"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        {/* Form Settings */}
        <div className="space-y-7">
          {/* Logo Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <FiImage className="text-blue-600" />
              <h2 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Organization Logo</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-4">
                        <FiImage className="text-3xl text-gray-300 mx-auto" />
                        <span className="text-[10px] font-bold text-gray-400 block mt-1 uppercase">No Logo</span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiUpload size={14} />
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-gray-800 text-lg">Organization Brand Mark</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {isEditing 
                      ? "Square or rectangular logos work best. Max 2MB (PNG, JPG, SVG)." 
                      : "This logo is displayed on the login portal and employee dashboard."}
                  </p>
                  {isEditing && (
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
                    >
                      Upload new logo <FiChevronRight />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <FiType className="text-blue-600" />
              <h2 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Landing Page Content</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Display Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="corporateName"
                      value={formData.corporateName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                      placeholder="e.g. Acme Corp"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-bold text-gray-800 border border-transparent">
                      {formData.corporateName || <span className="text-gray-300 italic font-normal">Not Configured</span>}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Portal Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="landingPageTitle"
                      value={formData.landingPageTitle}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                      placeholder="e.g. Employee Travel Hub"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-bold text-gray-800 border border-transparent">
                      {formData.landingPageTitle || <span className="text-gray-300 italic font-normal">Not Configured</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Welcome Message</label>
                {isEditing ? (
                  <textarea
                    name="welcomeMessage"
                    value={formData.welcomeMessage}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                    placeholder="Brief greeting for your team..."
                  />
                ) : (
                  <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-medium text-gray-700 border border-transparent leading-relaxed">
                    {formData.welcomeMessage || <span className="text-gray-300 italic font-normal">No custom message set. Default will be used.</span>}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Company Type</label>
                {isEditing ? (
                  <select
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                  >
                    <option value="">Select Type</option>
                    <option value="Private Limited">Private Limited</option>
                    <option value="Limited">Limited</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="NGO">NGO</option>
                    <option value="Government">Government</option>
                  </select>
                ) : (
                  <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-bold text-gray-800 border border-transparent flex items-center gap-2">
                    <FiLifeBuoy className="text-gray-400" size={14} />
                    {formData.companyType || <span className="text-gray-300 italic font-normal">Not Specified</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Support Team Contacts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <FiLifeBuoy className="text-blue-600" />
              <h2 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Helpdesk & Support Contact</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <FiMail /> Support Mail-ID
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="supportEmail"
                      value={formData.supportEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                      placeholder="e.g. support@company.com"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-bold text-gray-800 border border-transparent">
                      {formData.supportEmail || <span className="text-gray-300 italic font-normal">Not Configured</span>}
                    </p>
                  )}
                  {isEditing && <p className="text-[10px] text-gray-500 px-1 mt-1 font-semibold">Employees will see this contact for escalations.</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <FiPhone /> Helpline Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="supportPhone"
                      value={formData.supportPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800"
                      placeholder="e.g. +91 80000 12345"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50/50 rounded-xl font-bold text-gray-800 border border-transparent">
                      {formData.supportPhone || <span className="text-gray-300 italic font-normal">Not Configured</span>}
                    </p>
                  )}
                  {isEditing && <p className="text-[10px] text-gray-500 px-1 mt-1 font-semibold">Will be displayed on portals and booking itineraries.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
