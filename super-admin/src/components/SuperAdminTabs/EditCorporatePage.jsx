import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { updateCorporate, fetchCorporateById } from "../../Redux/Slice/corporateListSlice";
import { FiX, FiInfo, FiUsers, FiDollarSign, FiFileText, FiSave, FiArrowLeft, FiEdit2, FiSettings, FiPlusCircle, FiTrash2, FiToggleLeft, FiToggleRight, FiChevronDown, FiUpload, FiCheckCircle } from "react-icons/fi";
import { FaTimes, FaCheckCircle, FaPlane, FaHotel, FaStar } from "react-icons/fa";
import { MdCorporateFare, MdAccountBalance, MdPerson, MdGroups, MdAutoGraph } from "react-icons/md";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Country, State, City } from 'country-state-city';
import Select from 'react-select';

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b"
};

const defaultServiceFeeRules = [];

const emptyServiceFeeDraft = {
  productType: "Flight",
  operation: "Book",
  tripType: "Domestic",
  cabinClass: "Economy",
  starRating: "3 Star",
  feeType: "Fixed",
  feeValue: "",
  status: "Active",
};

const flightOperations = ["Book", "Cancel", "Re-Issue"];
const hotelOperations = ["Book", "Cancel"];
const cabinClasses = ["Economy", "Premium Economy", "Business", "Premium Business", "First Class"];
const starRatings = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"];

export default function EditCorporatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("overview");
  const [corporate, setCorporate] = useState(location.state?.corporate || null);
  const [loading, setLoading] = useState(!corporate);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    corporateName: "",
    corporateType: "pvt-ltd",
    primaryName: "", primaryEmail: "", primaryMobile: "",
    billingName: "", billingEmail: "", billingMobile: "",
    street: "", city: "", state: "", pincode: "", country: "India",
    billingCycle: "30days", customBillingDays: "", dueDays: 7, creditLimit: 0,
    walletBalance: 0,
    gstin: "", gstLegalName: "", gstAddress: "", gstEmail: "", gstContactNumber: "", gstUrl: "", 
    panNumber: "", panUrl: "",
    gstFileBase64: null, panFileBase64: null,
    classification: "prepaid",
    serviceFeeRules: defaultServiceFeeRules
  });

  const countries = Country.getAllCountries();
  const selectedCountry = countries.find(c => c.name === form.country) || countries.find(c => c.isoCode === 'IN');
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const selectedState = states.find(s => s.name === form.state);
  const cities = selectedState ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [];

  const [feeDraft, setFeeDraft] = useState({ ...emptyServiceFeeDraft });
  const [editingFeeRuleId, setEditingFeeRuleId] = useState(null);
  const [activeProductTab, setActiveProductTab] = useState("Flight");
  const [activeOperationTab, setActiveOperationTab] = useState("Book");

  useEffect(() => {
    if (corporate) {
      initForm(corporate);
      setLoading(false);
    } else {
      dispatch(fetchCorporateById(id))
        .unwrap()
        .then((res) => {
          setCorporate(res.data || res);
          initForm(res.data || res);
        })
        .catch((err) => {
          toast.error("Failed to load corporate details");
          navigate(-1);
        })
        .finally(() => setLoading(false));
    }
  }, [id, corporate, dispatch, navigate]);

  const initForm = (corp) => {
    setForm({
      corporateName: corp.corporateName || "",
      corporateType: corp.corporateType || "pvt-ltd",
      primaryName: corp.primaryContact?.name || "",
      primaryEmail: corp.primaryContact?.email || "",
      primaryMobile: corp.primaryContact?.mobile || "",
      billingName: corp.billingDepartment?.name || "",
      billingEmail: corp.billingDepartment?.email || "",
      billingMobile: corp.billingDepartment?.mobile || "",
      street: corp.registeredAddress?.street || "",
      city: corp.registeredAddress?.city || "",
      state: corp.registeredAddress?.state || "",
      pincode: corp.registeredAddress?.pincode || "",
      country: corp.registeredAddress?.country || "India",
      billingCycle: corp.billingCycle || "30days",
      customBillingDays: corp.customBillingDays || "",
      dueDays: corp.dueDays || 15,
      creditLimit: corp.creditLimit || 0,
      walletBalance: corp.walletBalance || 0,
      gstin: corp.gstDetails?.gstin || "",
      gstLegalName: corp.gstDetails?.legalName || "",
      gstAddress: corp.gstDetails?.address || "",
      gstEmail: corp.gstDetails?.gstEmail || "",
      gstContactNumber: corp.gstDetails?.contactNumber || "",
      gstUrl: corp.gstCertificate?.url || "",
      panNumber: corp.panCard?.number || "",
      panUrl: corp.panCard?.url || "",
      classification: corp.classification || "prepaid",
      serviceFeeRules: (corp.serviceFeeRules || []).map(rule => ({
        ...rule,
        id: rule.id || rule._id
      }))
    });
  };

  const updateFeeDraft = (key, value) => {
    setFeeDraft(prev => {
      if (key !== "productType") return { ...prev, [key]: value };
      const isFlight = value === "Flight";
      return {
        ...prev,
        productType: value,
        operation: "Book",
        cabinClass: isFlight ? "Economy" : "",
        starRating: isFlight ? "" : "3 Star",
        roomCount: isFlight ? "" : 1,
      };
    });
  };

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, [field]: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const resetFeeDraft = () => {
    setFeeDraft(prev => ({
      ...emptyServiceFeeDraft,
      productType: prev.productType,
      operation: prev.operation,
      tripType: prev.tripType,
      cabinClass: prev.productType === "Flight" ? prev.cabinClass : "",
      starRating: prev.productType === "Hotel" ? prev.starRating : "",
    }));
    setEditingFeeRuleId(null);
  };

  const saveFeeRule = () => {
    if (feeDraft.feeValue === "" || Number(feeDraft.feeValue) < 0) {
      toast.error("Enter a valid service fee value");
      return;
    }

    const isDuplicate = form.serviceFeeRules.some(rule => 
      rule.id !== editingFeeRuleId &&
      rule.productType === feeDraft.productType &&
      rule.operation === feeDraft.operation &&
      rule.tripType === feeDraft.tripType &&
      (feeDraft.productType === "Flight" 
        ? String(rule.cabinClass) === String(feeDraft.cabinClass) || parseInt(rule.cabinClass) === parseInt(feeDraft.cabinClass) || rule.cabinClass === {"Economy": 2, "Premium Economy": 3, "Business": 4, "Premium Business": 5, "First Class": 6}[feeDraft.cabinClass]
        : String(rule.starRating) === String(feeDraft.starRating) || parseInt(rule.starRating) === parseInt(feeDraft.starRating))
    );

    if (isDuplicate) {
      toast.error("A rule for this scenario already exists. Please edit the existing rule instead.");
      return;
    }

    const nextRule = {
      ...feeDraft,
      id: editingFeeRuleId || Date.now(),
      feeValue: Number(feeDraft.feeValue || 0),
    };

    setForm(prev => ({
      ...prev,
      serviceFeeRules: editingFeeRuleId
        ? prev.serviceFeeRules.map(rule => rule.id === editingFeeRuleId ? nextRule : rule)
        : [nextRule, ...prev.serviceFeeRules],
    }));
    
    setActiveProductTab(nextRule.productType);
    setActiveOperationTab(nextRule.operation);
    resetFeeDraft();
  };

  const editFeeRule = (rule) => {
    setFeeDraft({
      ...emptyServiceFeeDraft,
      ...rule,
      feeValue: String(rule.feeValue),
    });
    setEditingFeeRuleId(rule.id);
    document.getElementById("scenario-builder")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFeeRule = (id) => {
    setForm(prev => ({
      ...prev,
      serviceFeeRules: prev.serviceFeeRules.map(r => r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r)
    }));
  };

  const removeFeeRule = (id) => {
    setForm(prev => ({ ...prev, serviceFeeRules: prev.serviceFeeRules.filter(r => r.id !== id) }));
  };

  const submit = async () => {
    setSaving(true);
    
    const serviceFeeRulesFormatted = form.serviceFeeRules.map(rule => {
      const isObjectId = typeof rule.id === "string" && rule.id.length === 24;
      const cabinMap = { "Economy": 2, "Premium Economy": 3, "Business": 4, "Premium Business": 5, "First Class": 6 };
      return {
        ...rule,
        _id: isObjectId ? rule.id : undefined,
        feeValue: Number(rule.feeValue || 0),
        cabinClass: rule.productType === "Flight" ? cabinMap[rule.cabinClass] || rule.cabinClass : undefined,
        starRating: rule.productType === "Hotel" ? parseInt(rule.starRating) : undefined,
      };
    });

    const payload = {
      corporateName: form.corporateName,
      corporateType: form.corporateType,
      primaryContact: { name: form.primaryName, email: form.primaryEmail, mobile: form.primaryMobile, role: corporate?.primaryContact?.role || "travel-admin" },
      registeredAddress: { street: form.street, city: form.city, state: form.state, pincode: form.pincode, country: form.country },
      billingDepartment: { name: form.billingName, email: form.billingEmail, mobile: form.billingMobile },
      classification: form.classification,
      billingCycle: form.classification === "postpaid" ? form.billingCycle : null,
      customBillingDays: form.classification === "postpaid" && form.billingCycle === "custom" ? Number(form.customBillingDays) : null,
      dueDays: form.classification === "postpaid" ? Number(form.dueDays) : null,
      creditLimit: form.classification === "postpaid" ? Number(form.creditLimit) : 0,
      walletBalance: form.classification === "prepaid" ? Number(form.walletBalance) : 0,
      gstDetails: {
        gstin: form.gstin,
        legalName: form.gstLegalName,
        address: form.gstAddress,
        gstEmail: form.gstEmail,
        contactNumber: form.gstContactNumber
      },
      gstCertificate: form.gstUrl ? { url: form.gstUrl } : undefined,
      panCard: form.panNumber || form.panUrl ? { number: form.panNumber, url: form.panUrl } : undefined,
      gstFileBase64: form.gstFileBase64,
      panFileBase64: form.panFileBase64,
      serviceFeeRules: serviceFeeRulesFormatted
    };

    try {
      await dispatch(updateCorporate({ id: corporate._id, payload })).unwrap();
      toast.success("Corporate updated successfully");
      navigate(-1);
    } catch (err) {
      toast.error(err || "Failed to update corporate");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading corporate details...</div>;
  if (!corporate) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: <FiInfo /> },
    { id: "contacts", label: "Contacts", icon: <FiUsers /> },
    { id: "financial", label: "Account Classification", icon: <FiDollarSign /> },
    { id: "documents", label: "Documents", icon: <FiFileText /> },
    { id: "service_fee", label: "Service Fee", icon: <FiSettings /> }
  ];

  const draftOperations = feeDraft.productType === "Flight" ? flightOperations : hotelOperations;

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-[#001f5c] text-white pt-6 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white shadow-sm"
              title="Go Back"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-4 ml-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl text-white bg-white/10">
                <FiEdit2 size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none mb-1">
                  Corporate Management
                </h1>
                <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-300">
                  Editing Corporate Profile
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-all text-white shadow-md font-black text-sm uppercase tracking-wide disabled:opacity-50"
            >
              <FiSave size={18} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-8 space-y-6">
        
        {/* Pill-shaped Tabs Container */}
        <div className="bg-white p-1.5 rounded-xl shadow-md flex flex-nowrap overflow-x-auto custom-scrollbar gap-1 justify-start items-center w-fit border border-slate-100 relative z-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center whitespace-nowrap gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#000d26] text-white shadow-md"
                  : "bg-transparent text-slate-500 hover:text-[#000d26] hover:bg-slate-100"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Stat Cards - Matching Screenshot Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border-b-4 border-[#001f5c] flex justify-between items-center">
            <div className="truncate pr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 truncate">Corporate Name</p>
              <p className="text-xl font-black text-slate-900 truncate">{corporate.corporateName || "N/A"}</p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-lg bg-[#001f5c]/10 flex items-center justify-center text-[#001f5c]">
              <FiUsers size={20} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-b-4 border-emerald-500 flex justify-between items-center">
            <div className="truncate pr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 truncate">Classification</p>
              <p className="text-xl font-black text-slate-900 truncate capitalize">{corporate.classification || "N/A"}</p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiDollarSign size={20} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-b-4 border-amber-400 flex justify-between items-center">
            <div className="truncate pr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 truncate">Corporate Type</p>
              <p className="text-xl font-black text-slate-900 truncate capitalize">{corporate.corporateType || "B2B"}</p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-500">
              <FiInfo size={20} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-b-4 border-purple-500 flex justify-between items-center">
            <div className="truncate pr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 truncate">SSO Domain</p>
              <p className="text-xl font-black text-slate-900 truncate">{corporate.ssoConfig?.domain || "None"}</p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <FiFileText size={20} />
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 md:p-8">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              <Section title="Basic Information" color="navy">
                <Field label="Corporate Name" span={1}>
                  <Input value={form.corporateName} onChange={v => setForm({ ...form, corporateName: v })} />
                </Field>
                <Field label="Company Type" span={1}>
                  <CustomDropdown
                    value={form.corporateType}
                    onChange={(v) => setForm({ ...form, corporateType: v })}
                    options={[
                      { value: "pvt-ltd", label: "Private Limited", icon: <MdCorporateFare className="text-[#C9A240]" /> },
                      { value: "public-ltd", label: "Public Limited / Corp", icon: <MdCorporateFare className="text-orange-500" /> },
                      { value: "government", label: "Government Entity", icon: <MdAccountBalance className="text-emerald-500" /> },
                      { value: "proprietorship", label: "Sole Proprietorship", icon: <MdPerson className="text-slate-500" /> },
                      { value: "partnership", label: "Partnership", icon: <MdGroups className="text-purple-500" /> },
                      { value: "independent", label: "Independent Professional", icon: <MdAutoGraph className="text-cyan-500" /> },
                    ]}
                  />
                </Field>
              </Section>
              <Section title="Registered Address" color="gold" cols={4}>
                <Field label="Street" span={4}>
                  <Input value={form.street} onChange={v => setForm({ ...form, street: v })} />
                </Field>
                <Field label="Country">
                  <CustomDropdown
                    value={form.country || "India"}
                    onChange={(v) => setForm({ ...form, country: v, state: "", city: "" })}
                    options={countries.map(c => ({ value: c.name, label: c.name }))}
                  />
                </Field>
                <Field label="State">
                  <CustomDropdown
                    value={form.state}
                    onChange={(v) => setForm({ ...form, state: v, city: "" })}
                    options={states.map(s => ({ value: s.name, label: s.name }))}
                  />
                </Field>
                <Field label="City">
                  {cities.length > 0 ? (
                    <CustomDropdown
                      value={form.city}
                      onChange={(v) => setForm({ ...form, city: v })}
                      options={cities.map(c => ({ value: c.name, label: c.name }))}
                    />
                  ) : (
                    <Input value={form.city} onChange={v => setForm({ ...form, city: v })} />
                  )}
                </Field>
                <Field label="Pincode">
                  <Input value={form.pincode} onChange={v => setForm({ ...form, pincode: v })} />
                </Field>
              </Section>
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="space-y-6 animate-fadeIn">
              <Section title="Primary Contact" color="navy" cols={3}>
                <Field label="Name">
                  <Input value={form.primaryName} onChange={v => setForm({ ...form, primaryName: v })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.primaryEmail} onChange={v => setForm({ ...form, primaryEmail: v })} />
                </Field>
                <Field label="Mobile">
                  <PhoneInput
                    country={'in'}
                    value={form.primaryMobile}
                    onChange={(phone) => setForm({ ...form, primaryMobile: phone })}
                    inputStyle={{width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.75rem', paddingLeft: '3rem', height: '46px', fontSize: '0.875rem'}}
                    buttonStyle={{border: '1px solid #e2e8f0', borderRadius: '0.75rem 0 0 0.75rem', backgroundColor: '#ffffff'}}
                    containerStyle={{marginTop: '0.25rem'}}
                  />
                </Field>
              </Section>
              <Section title="Billing Department" color="gold" cols={3}>
                <Field label="Name">
                  <Input value={form.billingName} onChange={v => setForm({ ...form, billingName: v })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.billingEmail} onChange={v => setForm({ ...form, billingEmail: v })} />
                </Field>
                <Field label="Mobile">
                  <PhoneInput
                    country={'in'}
                    value={form.billingMobile}
                    onChange={(phone) => setForm({ ...form, billingMobile: phone })}
                    inputStyle={{width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.75rem', paddingLeft: '3rem', height: '46px', fontSize: '0.875rem'}}
                    buttonStyle={{border: '1px solid #e2e8f0', borderRadius: '0.75rem 0 0 0.75rem', backgroundColor: '#ffffff'}}
                    containerStyle={{marginTop: '0.25rem'}}
                  />
                </Field>
              </Section>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-6 animate-fadeIn">
              <Section title="Billing & Credit" color="navy" cols={4}>
                <Field label="Account Classification">
                  <CustomDropdown
                    value={form.classification}
                    options={[
                      { value: "prepaid", label: "Prepaid" },
                      { value: "postpaid", label: "Postpaid" }
                    ]}
                    onChange={v => setForm({ ...form, classification: v })}
                  />
                </Field>

                {form.classification === "postpaid" && (
                  <>
                    <Field label="Billing Cycle">
                      <CustomDropdown
                        value={form.billingCycle}
                        options={[
                          { value: "15days", label: "15 Days" },
                          { value: "30days", label: "30 Days" },
                          { value: "custom", label: "Custom" }
                        ]}
                        onChange={v => setForm({ ...form, billingCycle: v })}
                      />
                    </Field>
                    {form.billingCycle === "custom" && (
                      <Field label="Custom Billing Days">
                        <Input type="number" value={form.customBillingDays} onChange={v => setForm({ ...form, customBillingDays: v })} />
                      </Field>
                    )}
                    <Field label="Credit Limit (₹)">
                      <Input type="number" value={form.creditLimit} onChange={v => setForm({ ...form, creditLimit: v })} />
                    </Field>
                    <Field label="Due Days">
                      <Input type="number" value={form.dueDays} onChange={v => setForm({ ...form, dueDays: v })} />
                    </Field>
                  </>
                )}

                {form.classification === "prepaid" && (
                  <Field label="Wallet Balance (₹)">
                    <Input type="number" value={form.walletBalance} onChange={v => setForm({ ...form, walletBalance: v })} />
                  </Field>
                )}
              </Section>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6 animate-fadeIn">
              <Section title="GST Details" color="navy">
                <Field label="GSTIN">
                  <Input type="text" value={form.gstin} onChange={v => setForm({ ...form, gstin: v })} />
                </Field>
                <Field label="Legal Name">
                  <Input type="text" value={form.gstLegalName} onChange={v => setForm({ ...form, gstLegalName: v })} />
                </Field>
                <Field label="Address" span={2}>
                  <Input type="text" value={form.gstAddress} onChange={v => setForm({ ...form, gstAddress: v })} />
                </Field>
                <Field label="GST Email">
                  <Input type="email" value={form.gstEmail} onChange={v => setForm({ ...form, gstEmail: v })} />
                </Field>
                <Field label="Contact Number">
                  <Input type="text" value={form.gstContactNumber} onChange={v => setForm({ ...form, gstContactNumber: v })} />
                </Field>
                {form.gstUrl ? (
                  <Field label="GST Certificate" span={2}>
                    <div className="flex gap-4 items-center">
                      <button
                        type="button"
                        onClick={() => window.open(form.gstUrl, "_blank")}
                        className="px-6 py-3 bg-[#003399]/10 text-[#003399] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#003399]/20 transition-all flex items-center gap-2 w-fit border border-[#003399]/20"
                      >
                        <FiFileText size={16} />
                        View GST Document
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-100 transition-all cursor-pointer border border-slate-200">
                        <FiUpload size={14} className="text-blue-600" />
                        Replace File
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleFileUpload(e, "gstFileBase64")} />
                      </label>
                      {form.gstFileBase64 && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><FiCheckCircle size={14} /> Ready to save</span>}
                    </div>
                  </Field>
                ) : (
                  <Field label="GST Certificate (Upload)" span={2}>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer border border-slate-200 hover:border-slate-300 shadow-sm">
                        <FiUpload size={16} className="text-blue-600" />
                        Choose File
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleFileUpload(e, "gstFileBase64")} />
                      </label>
                      {form.gstFileBase64 && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><FiCheckCircle size={14} /> Ready to save</span>}
                    </div>
                  </Field>
                )}
              </Section>
              
              <Section title="PAN Details" color="gold">
                <Field label="PAN Number">
                  <Input type="text" value={form.panNumber} onChange={v => setForm({ ...form, panNumber: v })} />
                </Field>
                {form.panUrl ? (
                  <Field label="PAN Card">
                    <div className="flex gap-4 items-center">
                      <button
                        type="button"
                        onClick={() => window.open(form.panUrl, "_blank")}
                        className="px-6 py-3 bg-[#d97706]/10 text-[#d97706] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#d97706]/20 transition-all flex items-center gap-2 w-fit border border-[#d97706]/20"
                      >
                        <FiFileText size={16} />
                        View PAN Document
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-100 transition-all cursor-pointer border border-slate-200">
                        <FiUpload size={14} className="text-amber-600" />
                        Replace File
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleFileUpload(e, "panFileBase64")} />
                      </label>
                      {form.panFileBase64 && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><FiCheckCircle size={14} /> Ready to save</span>}
                    </div>
                  </Field>
                ) : (
                  <Field label="PAN Card (Upload)">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer border border-slate-200 hover:border-slate-300 shadow-sm">
                        <FiUpload size={16} className="text-amber-600" />
                        Choose File
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleFileUpload(e, "panFileBase64")} />
                      </label>
                      {form.panFileBase64 && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><FiCheckCircle size={14} /> Ready to save</span>}
                    </div>
                  </Field>
                )}
              </Section>
            </div>
          )}

          {activeTab === "service_fee" && (
            <div className="space-y-6 animate-fadeIn">
              <div id="scenario-builder">
                <SectionTitle label="Service Fee Scenario Builder" color="navy" />
                <div className="mt-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["Flight", "Hotel"].map(type => {
                      const active = feeDraft.productType === type;
                      const isFlight = type === "Flight";
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateFeeDraft("productType", type)}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                            active
                              ? isFlight ? "border-[#003399] bg-[#003399]/5 shadow-md" : "border-[#d97706] bg-[#d97706]/5 shadow-md"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? isFlight ? "bg-[#003399] text-white" : "bg-[#d97706] text-white" : "bg-slate-100 text-slate-500"}`}>
                            {isFlight ? <FaPlane size={16} /> : <FaHotel size={16} />}
                          </div>
                          <div className="text-left">
                            <span className={`block font-black text-sm uppercase tracking-widest ${active ? isFlight ? "text-[#003399]" : "text-[#d97706]" : "text-slate-600"}`}>{type}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{isFlight ? "Cabin based rules" : "Star based rules"}</span>
                          </div>
                          {active && <FaCheckCircle className={`ml-auto ${isFlight ? "text-[#003399]" : "text-[#d97706]"}`} size={18} />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <Field label="Operation">
                      <CustomDropdown
                        value={feeDraft.operation}
                        onChange={val => updateFeeDraft("operation", val)}
                        options={draftOperations.map(o => ({ value: o, label: o }))}
                      />
                    </Field>

                    <Field label="Trip Type">
                      <CustomDropdown
                        value={feeDraft.tripType}
                        onChange={val => updateFeeDraft("tripType", val)}
                        options={[
                          { value: "Domestic", label: "Domestic" },
                          { value: "International", label: "International" }
                        ]}
                      />
                    </Field>

                    {feeDraft.productType === "Flight" ? (
                      <Field label="Cabin Class">
                        <CustomDropdown
                          value={feeDraft.cabinClass}
                          onChange={val => updateFeeDraft("cabinClass", val)}
                          options={cabinClasses.map(c => ({ value: c, label: c }))}
                        />
                      </Field>
                    ) : (
                      <Field label="Hotel Star">
                        <CustomDropdown
                          value={feeDraft.starRating}
                          onChange={val => updateFeeDraft("starRating", val)}
                          options={starRatings.map(s => ({ value: s, label: s }))}
                        />
                      </Field>
                    )}

                    {feeDraft.productType === "Hotel" && (
                      <Field label="Room Count">
                        <input type="text" value="1" disabled={true} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-500 font-bold shadow-sm cursor-not-allowed" />
                      </Field>
                    )}

                    <Field label="Fee Type">
                      <CustomDropdown
                        value={feeDraft.feeType}
                        onChange={val => updateFeeDraft("feeType", val)}
                        options={[
                          { value: "Fixed", label: "Fixed Amount" },
                          { value: "Percentage", label: "Percentage" }
                        ]}
                      />
                    </Field>

                    <Field label="Fee Value">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#003399] text-sm">
                          {feeDraft.feeType === "Fixed" ? "₹" : "%"}
                        </span>
                        <input 
                          type="number" 
                          min="0" 
                          className="w-full border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#003399]/10 focus:border-[#003399] transition-all font-bold shadow-sm" 
                          placeholder={feeDraft.feeType === "Fixed" ? "250" : "5"} 
                          value={feeDraft.feeValue} 
                          onChange={e => updateFeeDraft("feeValue", e.target.value)} 
                        />
                      </div>
                    </Field>

                    <Field label="Status">
                      <button
                        type="button"
                        onClick={() => updateFeeDraft("status", feeDraft.status === "Active" ? "Inactive" : "Active")}
                        className={`w-full py-3 rounded-xl border-2 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                          feeDraft.status === "Active"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm hover:bg-emerald-100"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {feeDraft.status === "Active" ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                        {feeDraft.status}
                      </button>
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Define every applicable service fee scenario.
                    </p>
                    <div className="flex items-center gap-3">
                      {editingFeeRuleId && (
                        <button
                          type="button"
                          onClick={resetFeeDraft}
                          className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={saveFeeRule}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#003399] to-[#002266] hover:from-[#002266] hover:to-[#001144] text-white rounded-xl font-black uppercase text-[11px] tracking-widest transition-all shadow-md flex items-center gap-2"
                      >
                        <FiPlusCircle size={16} />
                        {editingFeeRuleId ? "Update Rule" : "Add Rule"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <SectionTitle label="Defined Service Fee Scenarios" color="gold" />
                
                <div className="flex flex-wrap items-center gap-4 mt-6 mb-4">
                  {/* Product Tabs */}
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {["Flight", "Hotel"].map(p => (
                      <button 
                        key={p} 
                        type="button"
                        onClick={() => { setActiveProductTab(p); setActiveOperationTab("Book"); }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeProductTab === p ? "bg-white text-[#003399] shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  {/* Operation Tabs */}
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {(activeProductTab === "Flight" ? flightOperations : hotelOperations).map(o => (
                      <button 
                        key={o} 
                        type="button"
                        onClick={() => setActiveOperationTab(o)}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeOperationTab === o ? "bg-white text-[#003399] shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <div className="hidden md:grid grid-cols-[1.3fr_0.8fr_0.9fr_1fr_0.7fr_0.7fr] gap-4 px-6 py-4 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <span>Scenario</span>
                    <span>Trip</span>
                    <span>Condition</span>
                    <span>Fee</span>
                    <span>Status</span>
                    <span className="text-center">Actions</span>
                  </div>

                  {(() => {
                    const filteredRules = form.serviceFeeRules.filter(r => r.productType === activeProductTab && r.operation === activeOperationTab);
                    if (filteredRules.length === 0) {
                      return (
                        <div className="px-6 py-16 text-center bg-slate-50/50">
                          <p className="text-sm font-black text-slate-400">No scenarios defined for {activeProductTab} / {activeOperationTab}.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y divide-slate-100">
                        {filteredRules.map(rule => (
                          <div key={rule.id} className="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.9fr_1fr_0.7fr_0.7fr] gap-4 px-6 py-5 items-center hover:bg-slate-50 transition-colors">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${rule.productType === "Flight" ? "bg-[#003399]/10 text-[#003399]" : "bg-[#d97706]/10 text-[#d97706]"}`}>
                                  {rule.productType === "Flight" ? <FaPlane size={14} /> : <FaHotel size={14} />}
                                </span>
                                <div>
                                  <p className="text-sm font-black text-slate-800">{rule.productType} / {rule.operation}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Corporate Rule</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-slate-600">{rule.tripType}</p>
                            <p className="text-sm font-bold text-slate-600">
                              {rule.productType === "Flight" ? rule.cabinClass : `${rule.starRating} Star`}
                            </p>
                            <p className="text-sm font-black text-[#003399]">
                              {rule.feeType === "Fixed" ? `₹${rule.feeValue}` : `${rule.feeValue}%`}
                            </p>
                            <div className="flex justify-start md:justify-center">
                              <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                                rule.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {rule.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-start md:justify-center gap-2">
                              <button type="button" onClick={() => editFeeRule(rule)} title="Edit" className="p-2 rounded-xl border border-slate-200 hover:bg-blue-50 text-blue-600 hover:border-blue-200 transition-all shadow-sm bg-white">
                                <FiEdit2 size={16} />
                              </button>
                              <button type="button" onClick={() => toggleFeeRule(rule.id)} title="Toggle Status" className={`p-2 rounded-xl border transition-all shadow-sm bg-white ${rule.status === "Active" ? "hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-200" : "hover:bg-emerald-50 text-emerald-600 border-slate-200 hover:border-emerald-200"}`}>
                                {rule.status === "Active" ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                              </button>
                              <button type="button" onClick={() => removeFeeRule(rule.id)} title="Delete" className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 hover:border-rose-200 transition-all shadow-sm bg-white">
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        ` }} />
      </div>
    </div>
  );
}

/* -------- UI HELPERS -------- */

const SectionTitle = ({ label, color }) => (
  <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ${color === "gold" ? "text-[#d97706]" : "text-[#003399]"}`}>
    <span className={`w-8 h-1.5 rounded-full ${color === "gold" ? "bg-[#d97706]" : "bg-[#003399]"}`} />
    {label}
  </h3>
);

const Section = ({ title, children, color = "navy", cols = 2 }) => {
  const gridColsClass = cols === 4 ? "md:grid-cols-4" : cols === 3 ? "md:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className="bg-slate-50 rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm">
      <SectionTitle label={title} color={color} />
      <div className={`grid grid-cols-1 ${gridColsClass} gap-x-8 gap-y-4 mt-4`}>{children}</div>
    </div>
  );
};

const Field = ({ label, children, span = 1 }) => {
  const spanClass = span === 4 ? "md:col-span-4" : span === 2 ? "sm:col-span-2" : "";
  return (
    <div className={spanClass}>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{label}</label>
      {children}
    </div>
  );
};

const Input = ({ value, type = "text", onChange, disabled }) => (
  <input
    className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#003399]/10 focus:border-[#003399] placeholder:text-slate-300 transition-all font-bold shadow-sm hover:border-slate-300 ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500 hover:border-slate-200' : 'bg-white text-slate-900'}`}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  />
);

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    border: state.isFocused ? '2px solid #003399' : '2px solid #e2e8f0',
    borderRadius: '0.75rem',
    padding: '2px',
    fontSize: '0.875rem',
    fontWeight: '700',
    backgroundColor: '#ffffff',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(0, 51, 153, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '&:hover': {
      border: state.isFocused ? '2px solid #003399' : '2px solid #cbd5e1',
    },
    transition: 'all 0.2s',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 50,
    border: '1px solid #e2e8f0',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#003399' : state.isFocused ? '#f1f5f9' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    fontSize: '0.875rem',
    fontWeight: '600',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
  }),
};

const CustomDropdown = ({ options, value, onChange }) => {
  const selectedOption = options.find(o => (o.value || o) === value) || null;
  return (
    <Select
      value={selectedOption}
      onChange={(selected) => onChange(selected ? selected.value : "")}
      options={options}
      styles={customSelectStyles}
      classNamePrefix="react-select"
      isClearable={false}
      formatOptionLabel={(option) => (
        <div className="flex items-center gap-2">
          {option.icon && <span className="text-lg flex items-center">{option.icon}</span>}
          <span>{option.label}</span>
        </div>
      )}
    />
  );
};
