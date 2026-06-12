import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { approveCorporate, fetchCorporateById } from "../../Redux/Slice/corporateListSlice";
import { toast } from "sonner";
import {
  FaWallet, FaCreditCard, FaCalendarAlt, FaShieldAlt,
  FaTimes, FaCheckCircle, FaArrowRight, FaBuilding,
  FaEnvelope, FaPlane, FaHotel, FaStar
} from "react-icons/fa";
import {
  FiSettings, FiDollarSign, FiPlusCircle, FiEdit2,
  FiTrash2, FiToggleLeft, FiToggleRight, FiArrowLeft, FiChevronDown
} from "react-icons/fi";
import { MdBusiness } from "react-icons/md";

const defaultServiceFeeRules = [];

const emptyServiceFeeDraft = {
  productType: "Flight",
  operation: "Book",
  tripType: "Domestic",
  cabinClass: "Economy",
  starRating: "3 Star",
  roomCount: 1,
  feeType: "Fixed",
  feeValue: "",
  status: "Active",
};

const flightOperations = ["Book", "Cancel", "Re-Issue"];
const hotelOperations = ["Book", "Cancel"];
const cabinClasses = ["Economy", "Premium Economy", "Business", "Premium Business", "First Class"];
const starRatings = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"];

export default function FinancialApprovalPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const routeCorporate = location.state?.corporate;
  const { selectedCorporate, loading } = useSelector((state) => state.corporateList);
  const corporate = routeCorporate || (selectedCorporate?._id === id ? selectedCorporate : null);
  const [activeTab, setActiveTab] = useState("setup");
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    classification: "prepaid",
    billingCycle: "30days",
    customBillingDays: "",
    dueDays: 7,
    creditLimit: 0,
    walletBalance: 0,
    serviceFeeRules: defaultServiceFeeRules,
    isSubmitting: false
  });
  const [feeDraft, setFeeDraft] = useState(emptyServiceFeeDraft);
  const [editingFeeRuleId, setEditingFeeRuleId] = useState(null);

  const [activeProductTab, setActiveProductTab] = useState("Flight");
  const [activeOperationTab, setActiveOperationTab] = useState("Book");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!routeCorporate && id) {
      dispatch(fetchCorporateById(id))
        .unwrap()
        .catch((err) => toast.error(err || "Failed to load corporate"));
    }
  }, [dispatch, id, routeCorporate]);

  const isPostpaid = form.classification === "postpaid";
  const draftOperations = feeDraft.productType === "Flight" ? flightOperations : hotelOperations;

  const handleSubmit = async () => {
    if (isPostpaid && !form.creditLimit) {
      toast.error("Credit limit is required for postpaid accounts");
      return;
    }
    if (isPostpaid && !form.dueDays) {
      toast.error("Due days are required for postpaid accounts");
      return;
    }
    if (!form.serviceFeeRules.length) {
      toast.error("Add at least one service fee rule");
      return;
    }
    setForm(prev => ({ ...prev, isSubmitting: true }));

    const serviceFeeRules = form.serviceFeeRules.map(rule => ({
      ...rule,
      feeValue: Number(rule.feeValue || 0),
      roomCount: rule.productType === "Hotel" ? Number(rule.roomCount || 1) : undefined,
      cabinClass: rule.productType === "Flight" ? rule.cabinClass : undefined,
      starRating: rule.productType === "Hotel" ? rule.starRating : undefined,
    }));

    const payload = {
      classification: form.classification,
      billingCycle: isPostpaid ? form.billingCycle : undefined,
      customBillingDays: form.billingCycle === "custom" ? Number(form.customBillingDays) : undefined,
      dueDays: isPostpaid ? Number(form.dueDays) : undefined,
      creditLimit: isPostpaid ? Number(form.creditLimit) : 0,
      walletBalance: !isPostpaid ? Number(form.walletBalance) : 0,
      serviceFeeRules,
      serviceCharges: buildLegacyServiceCharges(serviceFeeRules),
    };

    try {
      await dispatch(approveCorporate({ id: corporate._id, payload })).unwrap();
      toast.success("Corporate account approved & activated successfully!");
      navigate(location.state?.from || "/pending-corporates", { replace: true });
    } catch (err) {
      toast.error(err || "Failed to approve corporate");
      setForm(prev => ({ ...prev, isSubmitting: false }));
    }
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

  const resetFeeDraft = () => {
    setFeeDraft(prev => ({
      ...emptyServiceFeeDraft,
      productType: prev.productType,
      operation: prev.operation,
      tripType: prev.tripType,
      cabinClass: prev.productType === "Flight" ? prev.cabinClass : "",
      starRating: prev.productType === "Hotel" ? prev.starRating : "",
      roomCount: prev.productType === "Hotel" ? prev.roomCount : 1,
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
        ? rule.cabinClass === feeDraft.cabinClass 
        : (rule.starRating === feeDraft.starRating && rule.roomCount === feeDraft.roomCount))
    );

    if (isDuplicate) {
      toast.error("A rule for this scenario already exists. Please edit the existing rule instead.");
      return;
    }

    const nextRule = {
      ...feeDraft,
      id: editingFeeRuleId || Date.now(),
      feeValue: Number(feeDraft.feeValue || 0),
      roomCount: feeDraft.productType === "Hotel" ? Number(feeDraft.roomCount || 1) : "",
    };

    setForm(prev => ({
      ...prev,
      serviceFeeRules: editingFeeRuleId
        ? prev.serviceFeeRules.map(rule => rule.id === editingFeeRuleId ? nextRule : rule)
        : [nextRule, ...prev.serviceFeeRules],
    }));
    
    // Switch the list tab to show the newly added rule's category
    setActiveProductTab(nextRule.productType);
    setActiveOperationTab(nextRule.operation);
    
    resetFeeDraft();
  };

  const editFeeRule = (rule) => {
    setFeeDraft({
      ...emptyServiceFeeDraft,
      ...rule,
      feeValue: String(rule.feeValue),
      roomCount: rule.productType === "Hotel" ? rule.roomCount || 1 : "",
    });
    setEditingFeeRuleId(rule.id);
  };

  const removeFeeRule = (id) => {
    setForm(prev => ({
      ...prev,
      serviceFeeRules: prev.serviceFeeRules.filter(rule => rule.id !== id),
    }));
    if (editingFeeRuleId === id) resetFeeDraft();
  };

  const toggleFeeRule = (id) => {
    setForm(prev => ({
      ...prev,
      serviceFeeRules: prev.serviceFeeRules.map(rule => (
        rule.id === id
          ? { ...rule, status: rule.status === "Active" ? "Inactive" : "Active" }
          : rule
      )),
    }));
  };

  const handleBack = () => {
    navigate(location.state?.from || -1);
  };

  if (!corporate && loading) {
    return (
      <div className="min-h-screen font-sans -mt-6 -mx-4 md:-mx-6 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#003399]/20 border-t-[#003399] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading corporate setup...</p>
        </div>
      </div>
    );
  }

  if (!corporate) {
    return (
      <div className="min-h-screen font-sans -mt-6 -mx-4 md:-mx-6 flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center max-w-md">
          <h2 className="text-lg font-black text-slate-800">Corporate not found</h2>
          <p className="text-sm font-bold text-slate-400 mt-2">Unable to load the corporate approval setup.</p>
          <button
            onClick={handleBack}
            className="mt-5 px-5 py-2.5 bg-[#003399] text-white rounded-xl font-black uppercase text-xs tracking-widest"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans pb-32 -mt-6 -mx-4 md:-mx-6" style={{ background: "#F8FAFC" }}>
      <style>{`
        .fam-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: #F8FAFC;
          border: 2px solid #F1F5F9;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 800;
          color: #1e293b;
          transition: all 0.25s ease;
          outline: none;
        }
        .fam-input:focus {
          border-color: #003399;
          background: white;
          box-shadow: 0 8px 20px -4px rgba(0,51,153,0.12);
        }
        .fam-scroll::-webkit-scrollbar { width: 5px; }
        .fam-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .fam-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes fam-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fam-down { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .fam-in  { animation: fam-in   0.3s ease-out forwards; }
        .fam-down{ animation: fam-down 0.3s ease-out forwards; }
      `}</style>

      {/* HEADER SECTION */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
            </div>
            
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FaShieldAlt size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">Account Configuration</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Approval & Financial Setup
                </p>
              </div>
            </div>
          </div>
          
          {/* Corporate Info */}
          <div className="flex flex-col md:items-end text-left md:text-right shrink-0">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Selected Corporate</p>
            <div className="flex items-center gap-2">
              <MdBusiness size={18} className="text-white/80" />
              <p className="text-lg font-black text-white truncate max-w-[280px]" title={corporate?.corporateName}>
                {corporate?.corporateName || "N/A"}
              </p>
            </div>
            {corporate?.corporateCode && (
              <p className="text-[11px] font-mono mt-0.5 text-white/50">Code: {corporate.corporateCode}</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-6">
        {/* TABS */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "setup"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FiSettings size={14} /> Account Setup
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "fees"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FiDollarSign size={14} /> Service Fees
          </button>
        </div>

        {/* MAIN LAYOUT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 md:p-8 space-y-6">

            {/* TAB: Account Setup */}
            {activeTab === "setup" && (
              <div className="space-y-6 fam-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#003399]/10 rounded-xl flex items-center justify-center text-[#003399]">
                      <FaBuilding size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Corporate</p>
                      <p className="text-sm font-black text-slate-800 truncate">{corporate?.corporateName || "N/A"}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#d97706]/10 rounded-xl flex items-center justify-center text-[#d97706]">
                      <FaEnvelope size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                      <p className="text-sm font-black text-slate-800 truncate">{corporate?.primaryContact?.email || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle label="Account Type" color="navy" />
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setForm(p => ({ ...p, classification: "prepaid" }))}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        !isPostpaid ? "border-[#d97706] bg-[#d97706]/5 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${!isPostpaid ? "bg-[#d97706] text-white" : "bg-slate-100 text-slate-500"}`}>
                        <FaWallet size={14} />
                      </div>
                      <div className="text-left">
                        <span className={`block font-black text-xs uppercase tracking-widest ${!isPostpaid ? "text-[#d97706]" : "text-slate-500"}`}>Prepaid</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Wallet Based</span>
                      </div>
                      {!isPostpaid && <FaCheckCircle className="ml-auto text-[#d97706]" />}
                    </button>

                    <button
                      onClick={() => setForm(p => ({ ...p, classification: "postpaid" }))}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        isPostpaid ? "border-[#003399] bg-[#003399]/5 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isPostpaid ? "bg-[#003399] text-white" : "bg-slate-100 text-slate-500"}`}>
                        <FaCreditCard size={14} />
                      </div>
                      <div className="text-left">
                        <span className={`block font-black text-xs uppercase tracking-widest ${isPostpaid ? "text-[#003399]" : "text-slate-500"}`}>Postpaid</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Credit Based</span>
                      </div>
                      {isPostpaid && <FaCheckCircle className="ml-auto text-[#003399]" />}
                    </button>
                  </div>
                </div>

                {isPostpaid && (
                  <div className="fam-in">
                    <SectionTitle label="Billing Configuration" color="navy" />
                    <div className="mt-3 grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                        <div className="relative">
                          <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003399] z-10 pointer-events-none" size={12} />
                          <CustomDropdown
                            inputClassName="!pl-10"
                            value={form.billingCycle}
                            onChange={val => setForm({ ...form, billingCycle: val })}
                            options={[
                              { value: "15days", label: "15 Days" },
                              { value: "30days", label: "30 Days" },
                              { value: "custom", label: "Custom Days" }
                            ]}
                          />
                        </div>
                      </div>

                      {form.billingCycle === "custom" && (
                        <div className="fam-down">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Custom Term (Days)</label>
                          <input type="number" className="fam-input" placeholder="e.g. 45"
                            value={form.customBillingDays}
                            onChange={e => setForm({ ...form, customBillingDays: e.target.value })} />
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Due Days</label>
                        <div className="relative">
                          <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003399]" size={12} />
                          <input type="number" className="fam-input !pl-10" placeholder="e.g. 15"
                            value={form.dueDays}
                            onChange={e => setForm({ ...form, dueDays: e.target.value })} />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assigned Credit Limit</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#003399] text-xs">Rs.</span>
                          <input type="number" className="fam-input !pl-10 text-base" placeholder="0.00"
                            value={form.creditLimit}
                            onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Service Fees */}
            {activeTab === "fees" && (
              <div className="space-y-5 fam-in">
                <div>
                  <SectionTitle label="Service Fee Scenario Builder" color="navy" />
                  <div className="mt-3 p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["Flight", "Hotel"].map(type => {
                        const active = feeDraft.productType === type;
                        const isFlight = type === "Flight";
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateFeeDraft("productType", type)}
                            className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                              active
                                ? isFlight ? "border-[#003399] bg-[#003399]/5 shadow-md" : "border-[#d97706] bg-[#d97706]/5 shadow-md"
                                : "border-slate-100 bg-white hover:border-slate-200"
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? isFlight ? "bg-[#003399] text-white" : "bg-[#d97706] text-white" : "bg-slate-100 text-slate-500"}`}>
                              {isFlight ? <FaPlane size={14} /> : <FaHotel size={14} />}
                            </div>
                            <div className="text-left">
                              <span className={`block font-black text-xs uppercase tracking-widest ${active ? isFlight ? "text-[#003399]" : "text-[#d97706]" : "text-slate-500"}`}>{type}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{isFlight ? "Cabin based rules" : "Star & room based rules"}</span>
                            </div>
                            {active && <FaCheckCircle className={`ml-auto ${isFlight ? "text-[#003399]" : "text-[#d97706]"}`} />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <LabeledField label="Operation">
                        <CustomDropdown
                          inputClassName="!py-2.5"
                          value={feeDraft.operation}
                          onChange={val => updateFeeDraft("operation", val)}
                          options={draftOperations}
                        />
                      </LabeledField>

                      <LabeledField label="Trip Type">
                        <CustomDropdown
                          inputClassName="!py-2.5"
                          value={feeDraft.tripType}
                          onChange={val => updateFeeDraft("tripType", val)}
                          options={[
                            { value: "Domestic", label: "Domestic" },
                            { value: "International", label: "International" }
                          ]}
                        />
                      </LabeledField>

                      {feeDraft.productType === "Flight" ? (
                        <LabeledField label="Cabin Class">
                          <CustomDropdown
                            inputClassName="!py-2.5"
                            value={feeDraft.cabinClass}
                            onChange={val => updateFeeDraft("cabinClass", val)}
                            options={cabinClasses}
                          />
                        </LabeledField>
                      ) : (
                        <LabeledField label="Hotel Star">
                          <CustomDropdown
                            inputClassName="!py-2.5"
                            value={feeDraft.starRating}
                            onChange={val => updateFeeDraft("starRating", val)}
                            options={starRatings.map(star => {
                              const numStars = parseInt(star);
                              return {
                                value: star,
                                label: (
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: numStars }).map((_, i) => (
                                      <FaStar key={i} className="text-amber-400" size={14} />
                                    ))}
                                  </div>
                                )
                              };
                            })}
                          />
                        </LabeledField>
                      )}

                      {feeDraft.productType === "Hotel" && (
                        <LabeledField label="Room Count">
                          <input type="number" min="1" className="fam-input !py-2.5" value={feeDraft.roomCount} onChange={e => updateFeeDraft("roomCount", e.target.value)} />
                        </LabeledField>
                      )}

                      <LabeledField label="Fee Type">
                        <CustomDropdown
                          inputClassName="!py-2.5"
                          value={feeDraft.feeType}
                          onChange={val => updateFeeDraft("feeType", val)}
                          options={[
                            { value: "Fixed", label: "Fixed Amount" },
                            { value: "Percentage", label: "Percentage" }
                          ]}
                        />
                      </LabeledField>

                      <LabeledField label="Fee Value">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#003399] text-xs">
                            {feeDraft.feeType === "Fixed" ? "Rs." : "%"}
                          </span>
                          <input type="number" min="0" className="fam-input !pl-9 !py-2.5" placeholder={feeDraft.feeType === "Fixed" ? "250" : "5"} value={feeDraft.feeValue} onChange={e => updateFeeDraft("feeValue", e.target.value)} />
                        </div>
                      </LabeledField>

                      <LabeledField label="Status">
                        <button
                          type="button"
                          onClick={() => updateFeeDraft("status", feeDraft.status === "Active" ? "Inactive" : "Active")}
                          className={`w-full h-[42px] rounded-2xl border font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 ${
                            feeDraft.status === "Active"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          {feeDraft.status === "Active" ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          {feeDraft.status}
                        </button>
                      </LabeledField>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Define every applicable service fee scenario during corporate onboarding.
                      </p>
                      <div className="flex items-center gap-2">
                        {editingFeeRuleId && (
                          <button
                            type="button"
                            onClick={resetFeeDraft}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={saveFeeRule}
                          className="px-5 py-2 bg-[#003399] hover:bg-[#002266] text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center gap-2"
                        >
                          <FiPlusCircle size={14} />
                          {editingFeeRuleId ? "Update Rule" : "Add Rule"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionTitle label="Defined Service Fee Scenarios" color="gold" />
                  
                  <div className="flex flex-wrap items-center gap-3 mt-4 mb-2">
                    {/* Product Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {["Flight", "Hotel"].map(p => (
                        <button 
                          key={p} 
                          type="button"
                          onClick={() => { setActiveProductTab(p); setActiveOperationTab("Book"); }}
                          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${activeProductTab === p ? "bg-white text-[#003399] shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "text-slate-400 hover:text-slate-600"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    {/* Operation Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(activeProductTab === "Flight" ? ["Book", "Cancel", "Re-Issue"] : ["Book", "Cancel"]).map(o => (
                        <button 
                          key={o} 
                          type="button"
                          onClick={() => setActiveOperationTab(o)}
                          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${activeOperationTab === o ? "bg-white text-[#003399] shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "text-slate-400 hover:text-slate-600"}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white border border-slate-100 overflow-hidden">
                    <div className="hidden md:grid grid-cols-[1.3fr_0.8fr_0.9fr_1fr_0.7fr_0.7fr] gap-3 px-4 py-3 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
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
                          <div className="px-5 py-12 text-center">
                            <p className="text-sm font-black text-slate-400">No scenarios defined for {activeProductTab} / {activeOperationTab}.</p>
                          </div>
                        );
                      }
                      return (
                        <div className="divide-y divide-slate-100">
                          {filteredRules.map(rule => (
                            <div key={rule.id} className="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.9fr_1fr_0.7fr_0.7fr] gap-3 px-4 py-4 items-center hover:bg-slate-50/70 transition-colors">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${rule.productType === "Flight" ? "bg-[#003399]/10 text-[#003399]" : "bg-[#d97706]/10 text-[#d97706]"}`}>
                                    {rule.productType === "Flight" ? <FaPlane size={12} /> : <FaHotel size={12} />}
                                  </span>
                                  <div>
                                    <p className="text-xs font-black text-slate-800">{rule.productType} / {rule.operation}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Corporate onboarding rule</p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-slate-600">{rule.tripType}</p>
                              <p className="text-xs font-bold text-slate-600">{getRuleCondition(rule)}</p>
                              <p className="text-xs font-black text-[#003399]">{formatFeeValue(rule)}</p>
                              <StatusPill status={rule.status} />
                              <div className="flex items-center justify-start md:justify-center gap-1.5">
                                <button type="button" onClick={() => editFeeRule(rule)} title="Edit" className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">
                                  <FiEdit2 size={14} />
                                </button>
                                <button type="button" onClick={() => toggleFeeRule(rule.id)} title="Toggle Status" className={`p-2 rounded-lg transition-colors ${rule.status === "Active" ? "hover:bg-rose-100 text-rose-600" : "hover:bg-emerald-100 text-emerald-600"}`}>
                                  {rule.status === "Active" ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                                </button>
                                <button type="button" onClick={() => removeFeeRule(rule.id)} title="Delete" className="p-2 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors">
                                  <FiTrash2 size={14} />
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
        </div>
      </div>

      {/* STICKY SUMMARY PANEL */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 p-4 md:px-10 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4 border-slate-200">
        <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classification</p>
            <p className="text-sm font-black text-slate-800 flex items-center gap-2 mt-0.5">
              {isPostpaid ? <FaCreditCard className="text-[#003399]" /> : <FaWallet className="text-[#d97706]" />} 
              {isPostpaid ? "Postpaid" : "Prepaid"}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Fee Rules</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">
              {form.serviceFeeRules.length} Defined
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleBack}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          
          {activeTab === "setup" && (
            <button
              onClick={() => setActiveTab("fees")}
              className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              Next: Service Fees <FaArrowRight size={10} />
            </button>
          )}
          
          {activeTab === "fees" && (
            <button 
              onClick={handleSubmit}
              disabled={form.isSubmitting}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-[#003399] to-[#000d26] shadow-lg transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-60"
            >
              {form.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Activating...
                </span>
              ) : (
                <>
                  Confirm & Activate
                  <FaArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ HELPERS â”€â”€ */

function SectionTitle({ label, color = "navy" }) {
  const isGold = color === "gold";
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isGold ? "#d97706" : "#003399" }} />
      <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: isGold ? "#d97706" : "#003399" }}>
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function LabeledField({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isActive
          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
          : "bg-slate-50 text-slate-500 border-slate-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function getRuleCondition(rule) {
  if (rule.productType === "Flight") return rule.cabinClass || "Any Cabin";
  return `${rule.starRating || "Any Star"}${rule.roomCount ? ` / ${rule.roomCount} Room${Number(rule.roomCount) > 1 ? "s" : ""}` : ""}`;
}

function formatFeeValue(rule) {
  return rule.feeType === "Fixed"
    ? `Rs. ${Number(rule.feeValue || 0).toLocaleString()}`
    : `${Number(rule.feeValue || 0)}%`;
}

function buildLegacyServiceCharges(rules = []) {
  const findFixedFee = (productType, tripType) => {
    const rule = rules.find(item =>
      item.productType === productType &&
      item.tripType === tripType &&
      item.operation === "Book" &&
      item.status === "Active" &&
      item.feeType === "Fixed"
    );
    return Number(rule?.feeValue || 0);
  };

  return {
    domesticFlight: findFixedFee("Flight", "Domestic"),
    internationalOneWayFlight: findFixedFee("Flight", "International"),
    internationalReturnFlight: findFixedFee("Flight", "International"),
    domesticHotel: findFixedFee("Hotel", "Domestic"),
    internationalHotel: findFixedFee("Hotel", "International"),
  };
}

function CustomDropdown({ value, onChange, options, inputClassName = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => (typeof o === "string" ? o : o.value) === value);
  const displayValue = typeof selectedOption === "string" ? selectedOption : selectedOption?.label || value;

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`fam-input flex items-center justify-between cursor-pointer ${inputClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{displayValue}</span>
        <FiChevronDown className={`transition-transform duration-200 text-slate-400 ${isOpen ? "rotate-180" : ""}`} size={16} />
      </div>
      
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto fam-scroll">
          {options.map((option, idx) => {
            const val = typeof option === "string" ? option : option.value;
            const label = typeof option === "string" ? option : option.label;
            const isActive = value === val;
            return (
              <div 
                key={idx}
                className={`px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${isActive ? "bg-[#003399]/5 text-[#003399]" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => { onChange(val); setIsOpen(false); }}
              >
                {label}
                {isActive && <FaCheckCircle size={12} className="text-[#003399]" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
