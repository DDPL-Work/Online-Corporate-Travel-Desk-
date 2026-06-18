import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiShield,
  FiUser,
  FiMail,
  FiSave,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiList,
  FiSettings,
  FiEye,
  FiDollarSign,
  FiToggleLeft,
  FiToggleRight,
  FiDownload,
  FiChevronRight,
  FiInfo,
  FiClock,
  FiArrowRight,
  FiMap,
  FiBriefcase,
  FiX,
} from "react-icons/fi";
import {
  MdAirlineSeatReclineNormal,
  MdLunchDining,
  MdLuggage,
} from "react-icons/md";
import {
  fetchPolicyByEmail,
  fetchAllSSRPolicies,
  upsertSSRPolicy,
  deleteSSRPolicy,
} from "../../Redux/Actions/ssrPolicy.thunks";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import { clearLookup, clearSaveState } from "../../Redux/Slice/ssrPolicy.slice";
import Swal from "sweetalert2";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Th, LabeledField, SearchBar } from "./Shared/CommonComponents";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminSsrPoliciesExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";
import {
  Avatar,
  SectionHeader,
  Toggle,
  PriceRangeInput,
  LimitDropdown,
  LimitsGrid,
  StatusBadge,
  CustomAutocomplete,
  PolicyDetailModal,
  PolicyList,
} from "./components/SSRPolicyComps";

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function SsrManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    lookedUp, lookupLoading, lookupError, policies, listLoading, saving, saveSuccess,
  } = useSelector((s) => s.ssrPolicy);
  const { employees } = useSelector((s) => s.employeeAction);

  const [emailInput, setEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState("configure");
  const [viewPolicy, setViewPolicy] = useState(null);
  const [search, setSearch] = useState("");

  const filteredPolicies = React.useMemo(() => {
    const q = search.toLowerCase();
    return policies.filter(p => !q || p.employeeEmail?.toLowerCase().includes(q));
  }, [policies, search]);

  const [allowSeat, setAllowSeat] = useState(false);
  const [allowMeal, setAllowMeal] = useState(false);
  const [allowBaggage, setAllowBaggage] = useState(false);

  const [seatMin, setSeatMin] = useState(0);
  const [seatMax, setSeatMax] = useState(99999);
  const [mealMin, setMealMin] = useState(0);
  const [mealMax, setMealMax] = useState(99999);
  const [bagMin, setBagMin] = useState(0);
  const [bagMax, setBagMax] = useState(99999);

  const [approvalRequired, setApprovalRequired] = useState(true);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("flights");

  const CABIN_NAMES = {
    1: "All",
    2: "Economy",
    3: "Premium Economy",
    4: "Business",
    5: "Premium Business",
    6: "First Class"
  };

  const defaultFlightLimits = [
    { location: "Domestic", cabinClass: 2, isUnlimited: true, limit: 0 },
    { location: "Domestic", cabinClass: 3, isUnlimited: true, limit: 0 },
    { location: "Domestic", cabinClass: 4, isUnlimited: true, limit: 0 },
    { location: "Domestic", cabinClass: 5, isUnlimited: true, limit: 0 },
    { location: "Domestic", cabinClass: 6, isUnlimited: true, limit: 0 },
    { location: "International", cabinClass: 2, isUnlimited: true, limit: 0 },
    { location: "International", cabinClass: 3, isUnlimited: true, limit: 0 },
    { location: "International", cabinClass: 4, isUnlimited: true, limit: 0 },
    { location: "International", cabinClass: 5, isUnlimited: true, limit: 0 },
    { location: "International", cabinClass: 6, isUnlimited: true, limit: 0 },
  ];

  const defaultHotelLimits = [
    { location: "Domestic", starRating: 1, isUnlimited: true, limit: 0 },
    { location: "Domestic", starRating: 2, isUnlimited: true, limit: 0 },
    { location: "Domestic", starRating: 3, isUnlimited: true, limit: 0 },
    { location: "Domestic", starRating: 4, isUnlimited: true, limit: 0 },
    { location: "Domestic", starRating: 5, isUnlimited: true, limit: 0 },
    { location: "International", starRating: 1, isUnlimited: true, limit: 0 },
    { location: "International", starRating: 2, isUnlimited: true, limit: 0 },
    { location: "International", starRating: 3, isUnlimited: true, limit: 0 },
    { location: "International", starRating: 4, isUnlimited: true, limit: 0 },
    { location: "International", starRating: 5, isUnlimited: true, limit: 0 },
  ];

  const [flightLimits, setFlightLimits] = useState(defaultFlightLimits);
  const [hotelLimits, setHotelLimits] = useState(defaultHotelLimits);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchAllSSRPolicies());
    dispatch(fetchEmployees());
    return () => { dispatch(clearLookup()); dispatch(clearSaveState()); };
  }, [dispatch]);

  useEffect(() => {
    if (!lookedUp) return;
    const p = lookedUp.policy;
    setAllowSeat(p.allowSeat ?? false);
    setAllowMeal(p.allowMeal ?? false);
    setAllowBaggage(p.allowBaggage ?? false);
    setSeatMin(p.seatPriceRange?.min ?? 0);
    setSeatMax(p.seatPriceRange?.max ?? 99999);
    setMealMin(p.mealPriceRange?.min ?? 0);
    setMealMax(p.mealPriceRange?.max ?? 99999);
    setBagMin(p.baggagePriceRange?.min ?? 0);
    setBagMax(p.baggagePriceRange?.max ?? 99999);
    setApprovalRequired(p.approvalRequired ?? true);
    setFlightLimits(p.flightLimits?.length ? p.flightLimits : defaultFlightLimits);
    setHotelLimits(p.hotelLimits?.length ? p.hotelLimits : defaultHotelLimits);
  }, [lookedUp]);

  useEffect(() => {
    if (!saveSuccess) return;
    dispatch(fetchAllSSRPolicies());
    Swal.fire({ icon: "success", title: isEditing ? "Policy Updated" : "Policy Created", timer: 2000, showConfirmButton: false });
    setIsEditing(false); dispatch(clearSaveState()); dispatch(clearLookup()); setEmailInput("");
  }, [saveSuccess]);

  const handleLookup = () => {
    if (!emailInput.trim()) return;
    dispatch(fetchPolicyByEmail(emailInput.trim().toLowerCase()));
  };

  const handleSave = () => {
    if (!lookedUp) return;
    if (seatMin > seatMax || mealMin > mealMax || bagMin > bagMax) {
      Swal.fire("Invalid Range", "Min price cannot exceed max price.", "warning");
      return;
    }

    // Validate that no limit is 0 when set_limit is selected
    const invalidFlight = flightLimits.find(l => l.isUnlimited === false && (!l.limit || l.limit <= 0));
    if (invalidFlight) {
      Swal.fire("Invalid Limit", `Please set a valid limit for ${invalidFlight.location} ${invalidFlight.cabinClass} flights.`, "warning");
      return;
    }

    const invalidHotel = hotelLimits.find(l => l.isUnlimited === false && (!l.limit || l.limit <= 0));
    if (invalidHotel) {
      Swal.fire("Invalid Limit", `Please set a valid limit for ${invalidHotel.location} ${invalidHotel.starRating} Star hotels.`, "warning");
      return;
    }
    dispatch(upsertSSRPolicy({
      employeeEmail: emailInput.trim().toLowerCase(),
      allowSeat, allowMeal, allowBaggage,
      seatPriceRange: { min: seatMin, max: seatMax },
      mealPriceRange: { min: mealMin, max: mealMax },
      baggagePriceRange: { min: bagMin, max: bagMax },
      approvalRequired,
      flightLimits,
      hotelLimits,
    }));
  };

  const handleDelete = (id, email) => {
    Swal.fire({ title: "Delete Policy?", text: `Remove SSR policy for ${email}?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#EF4444", confirmButtonText: "Delete" })
      .then((res) => { if (res.isConfirmed) dispatch(deleteSSRPolicy(id)).then(() => dispatch(fetchAllSSRPolicies())); });
  };

  const handleEdit = (p) => {
    setEmailInput(p.employeeEmail); setIsEditing(true); dispatch(fetchPolicyByEmail(p.employeeEmail));
    setActiveTab("configure"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
               >
                 <FiArrowRight className="rotate-180" size={20} />
               </button>
               <button 
                  onClick={() => dispatch(fetchAllSSRPolicies())} 
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${listLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={listLoading}
               >
                 <div className={listLoading ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiShield size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Booking Policies</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Configure Seat, Meal & Baggage Limits
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher - Aligned with TotalBookings */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          {[
            ["configure", "Configuration", FiSettings],
            ["list", "Active Policies", FiList],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>
        {activeTab === "configure" ? (
          <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
               <div className="bg-white rounded-2xl border shadow-sm p-8" style={{ borderColor: C.border }}>
                  <SectionHeader icon={FiSearch} title="Find Employee" sub="Search by email to manage limits" />
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                     <CustomAutocomplete employees={employees} value={emailInput} onChange={setEmailInput} placeholder="Select employee by email..." icon={FiMail} />
                     <button onClick={handleLookup} disabled={lookupLoading} className="w-full sm:w-auto px-10 py-4 bg-navy rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50" style={{ background: C.navy }}>
                        {lookupLoading ? "Locating..." : "Find Policy"}
                     </button>
                  </div>
                  {lookupError && <p className="mt-4 text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2"><FiAlertCircle /> {lookupError}</p>}
               </div>

               {lookedUp && (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500" style={{ borderColor: C.border }}>
                    <div className="p-8 space-y-10">
                       <div>
                          <SectionHeader icon={FiToggleRight} title="Allowed Services" sub="Select which services are allowed" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <Toggle label="Paid Seat" description="Pre-select seating" icon={MdAirlineSeatReclineNormal} enabled={allowSeat} onChange={setAllowSeat} />
                             <Toggle label="Paid Meal" description="In-flight catering" icon={MdLunchDining} enabled={allowMeal} onChange={setAllowMeal} />
                             <Toggle label="Extra Baggage" description="Additional weight" icon={MdLuggage} enabled={allowBaggage} onChange={setAllowBaggage} />
                          </div>
                       </div>

                       <div>
                          <SectionHeader icon={FiDollarSign} title="Price Limits" sub="Set maximum prices for auto-approval" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <PriceRangeInput label="Seat" icon={MdAirlineSeatReclineNormal} minVal={seatMin} maxVal={seatMax} onMinChange={setSeatMin} onMaxChange={setSeatMax} disabled={!allowSeat} />
                             <PriceRangeInput label="Meal" icon={MdLunchDining} minVal={mealMin} maxVal={mealMax} onMinChange={setMealMin} onMaxChange={setMealMax} disabled={!allowMeal} />
                             <PriceRangeInput label="Baggage" icon={MdLuggage} minVal={bagMin} maxVal={bagMax} onMinChange={setBagMin} onMaxChange={setBagMax} disabled={!allowBaggage} />
                          </div>
                       </div>

                       <div>
                          <SectionHeader icon={FiShield} title="Approval Rules" sub="Set who needs to approve bookings" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Toggle label="Manual Approval" description="Admin must approve" icon={FiClock} enabled={approvalRequired} onChange={setApprovalRequired} />
                             <div className="flex flex-col gap-3">
                               <Toggle 
                                 label="Auto Approved" 
                                 description="Skip workflow if in budget" 
                                 icon={FiCheckCircle} 
                                 enabled={!approvalRequired} 
                                 onChange={(v) => {
                                   setApprovalRequired(!v);
                                   if (v) setIsLimitModalOpen(true);
                                 }} 
                               />
                               {!approvalRequired && (
                                 <div className="mt-2 text-right">
                                   <button 
                                     onClick={() => setIsLimitModalOpen(true)}
                                     className="text-xs font-bold text-[#003399] hover:underline flex items-center justify-end gap-1 w-full"
                                   >
                                     <FiSettings size={12} /> Edit Booking Limits
                                   </button>
                                 </div>
                               )}
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
                       <div className="flex items-center gap-3">
                          <FiInfo className="text-gold" size={18} />
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-xs">Settings will take effect immediately for all subsequent bookings.</p>
                       </div>
                       <button onClick={handleSave} disabled={saving} className="px-12 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
                          <FiSave /> {saving ? "Saving Changes..." : isEditing ? "Update Policy" : "Deploy Policy"}
                       </button>
                    </div>
                 </div>
               )}
            </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm animate-in fade-in duration-300" style={{ borderColor: C.border }}>
              <div className="grid grid-cols-1 gap-6">
                <LabeledField label={<><FiSearch size={10} /> Search Policies</>}>
                  <SearchBar value={search} onChange={(val) => setSearch(val)} placeholder="Search employee email..." />
                </LabeledField>
              </div>
            </div>

            <PolicyList
              policies={filteredPolicies}
              listLoading={listLoading}
              onDelete={handleDelete}
              onView={setViewPolicy}
              onEdit={handleEdit}
              title="Active Policies"
              subtitle={`${filteredPolicies.length} policies found`}
              searchQuery={search}
              onRefresh={() => dispatch(fetchAllSSRPolicies())}

            />
          </div>
        )}
      </div>

      {viewPolicy && typeof document !== "undefined" && createPortal(<PolicyDetailModal policy={viewPolicy} onClose={() => setViewPolicy(null)} />, document.body)}

      {isLimitModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border relative" style={{ borderColor: C.border }}>
            {/* Sticky Header & Tabs */}
            <div className="sticky top-0 z-30">
              <div className="p-8 border-b flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-br from-[#003399] to-[#000d26] text-white pb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border border-white/10 bg-white/10 text-white">
                    <FiBriefcase size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight leading-none">Booking Limits</h2>
                    <p className="text-[10px] mt-1.5 font-bold uppercase tracking-[2px] opacity-60">Configure Custom Booking Thresholds</p>
                  </div>
                </div>
                <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white">
                  <FiX size={18} />
                </button>
              </div>
              
              <div className="flex justify-center w-full mt-[-24px] relative z-40">
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
                  <button 
                    onClick={() => setActiveModalTab("flights")}
                    className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeModalTab === "flights" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                  >
                    Flights
                  </button>
                  <button 
                    onClick={() => setActiveModalTab("hotels")}
                    className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeModalTab === "hotels" ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                  >
                    Hotels
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-6 pb-32 pt-8 space-y-6 relative">

              {/* Flights Section */}
              {activeModalTab === "flights" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2 border-b pb-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: C.navy }}></span> Flight Limits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <LimitsGrid 
                      data={flightLimits} 
                      location="Domestic" 
                      title="Flights" 
                      conditionsKey="cabinClass"
                      formatCondition={(val) => CABIN_NAMES[val] || val}
                      updateIsUnlimited={(loc, cond, val) => setFlightLimits(prev => prev.map(p => p.location === loc && p.cabinClass === cond ? { ...p, isUnlimited: val, limit: (!val && p.limit === 0) ? "" : p.limit } : p))}
                      updateLimit={(loc, cond, val) => setFlightLimits(prev => prev.map(p => p.location === loc && p.cabinClass === cond ? { ...p, limit: val } : p))}
                    />
                    <LimitsGrid 
                      data={flightLimits} 
                      location="International" 
                      title="Flights" 
                      conditionsKey="cabinClass"
                      formatCondition={(val) => CABIN_NAMES[val] || val}
                      updateIsUnlimited={(loc, cond, val) => setFlightLimits(prev => prev.map(p => p.location === loc && p.cabinClass === cond ? { ...p, isUnlimited: val, limit: (!val && p.limit === 0) ? "" : p.limit } : p))}
                      updateLimit={(loc, cond, val) => setFlightLimits(prev => prev.map(p => p.location === loc && p.cabinClass === cond ? { ...p, limit: val } : p))}
                    />
                  </div>
                </div>
              )}

              {/* Hotels Section */}
              {activeModalTab === "hotels" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2 border-b pb-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: C.gold }}></span> Hotel Limits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <LimitsGrid 
                      data={hotelLimits} 
                      location="Domestic" 
                      title="Hotels" 
                      conditionsKey="starRating"
                      formatCondition={(rating) => `${rating} Star`}
                      updateIsUnlimited={(loc, cond, val) => setHotelLimits(prev => prev.map(p => p.location === loc && p.starRating === cond ? { ...p, isUnlimited: val, limit: (!val && p.limit === 0) ? "" : p.limit } : p))}
                      updateLimit={(loc, cond, val) => setHotelLimits(prev => prev.map(p => p.location === loc && p.starRating === cond ? { ...p, limit: val } : p))}
                    />
                    <LimitsGrid 
                      data={hotelLimits} 
                      location="International" 
                      title="Hotels" 
                      conditionsKey="starRating"
                      formatCondition={(rating) => `${rating} Star`}
                      updateIsUnlimited={(loc, cond, val) => setHotelLimits(prev => prev.map(p => p.location === loc && p.starRating === cond ? { ...p, isUnlimited: val, limit: (!val && p.limit === 0) ? "" : p.limit } : p))}
                      updateLimit={(loc, cond, val) => setHotelLimits(prev => prev.map(p => p.location === loc && p.starRating === cond ? { ...p, limit: val } : p))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end sticky bottom-0 z-10">
              <button 
                onClick={() => setIsLimitModalOpen(false)} 
                className="px-8 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg"
                style={{ background: C.navy }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
