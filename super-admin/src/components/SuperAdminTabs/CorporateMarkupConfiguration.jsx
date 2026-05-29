import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiX,
  FiCheckCircle,
  FiPercent,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiSettings,
  FiCalendar,
  FiClock,
  FiSearch,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import { toast } from "sonner";
import Pagination from "../Shared/Pagination";

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

const FLIGHT_CATEGORIES = [
  "Corporate Specific",
  "Airline Wise",
  "Fare Slab Based",
  "Domestic Flights",
  "International Flights",
  "Cabin Wise",
  "Sector Wise",
  "Supplier Wise",
  "Passenger Type Wise",
  "Convenience Fee"
];

const HOTEL_CATEGORIES = [
  "Corporate Specific",
  "Country Wise",
  "City Wise",
  "Hotel Wise",
  "Room Category Wise",
  "Star Rating Wise",
  "Fare Slab Based",
  "Seasonal Markup",
  "Supplier Wise",
  "Convenience Fee"
];

const MOCK_HISTORY = [
  { id: 1, type: "Flight", category: "Corporate Specific", method: "Percentage", value: "2%", status: "Active", updatedBy: "Admin User", date: "2024-05-20" },
  { id: 2, type: "Flight", category: "Fare Slab Based", method: "Fixed Amount", value: "Multiple", status: "Active", updatedBy: "Admin User", date: "2024-05-21" },
  { id: 3, type: "Hotel", category: "Corporate Specific", method: "Percentage", value: "3%", status: "Active", updatedBy: "Super Admin", date: "2024-05-22" },
  { id: 4, type: "Hotel", category: "Star Rating Wise", method: "Fixed Amount", value: "₹500", status: "Inactive", updatedBy: "Admin User", date: "2024-01-10" }
];

export default function CorporateMarkupConfiguration() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const corporate = location.state?.corporate || {
    _id: id,
    corporateName: "Corporate Account",
    corporateCode: "CORP-" + id?.substring(0, 4)?.toUpperCase() || "CORP-001",
    status: "active"
  };

  const [activeTab, setActiveTab] = useState("flight"); // 'flight' | 'hotel'
  const [selectedCategory, setSelectedCategory] = useState(FLIGHT_CATEGORIES[0]);
  
  const [markupMethod, setMarkupMethod] = useState("percentage"); // 'fixed' | 'percentage'
  const [markupValue, setMarkupValue] = useState("");
  
  // Specific Form States
  const [airline, setAirline] = useState("");
  const [cabin, setCabin] = useState("Economy");
  const [fareSlabs, setFareSlabs] = useState([{ from: "", to: "", value: "", method: "fixed" }]);
  
  // Table State
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    // Reset category when tab changes
    setSelectedCategory(activeTab === "flight" ? FLIGHT_CATEGORIES[0] : HOTEL_CATEGORIES[0]);
    setMarkupMethod("percentage");
    setMarkupValue("");
  }, [activeTab]);

  const handleSave = () => {
    if (!markupValue && selectedCategory !== "Fare Slab Based") {
      toast.error("Please enter a markup value");
      return;
    }
    if (Number(markupValue) < 0) {
      toast.error("Markup cannot be negative");
      return;
    }
    toast.success("Markup configuration saved successfully!");
  };

  const renderCalculationPreview = () => {
    const baseFare = 10000;
    let appliedMarkup = 0;

    if (selectedCategory === "Fare Slab Based") {
      return (
        <div className="bg-slate-50 border rounded-2xl p-6" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FiSettings className="text-[#003399]" /> Markup Calculation Preview
          </h3>
          <p className="text-xs text-slate-500 font-bold mb-4">Preview based on Fare Slabs</p>
          <div className="space-y-3">
            {fareSlabs.map((slab, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-slate-600">₹{slab.from || 0} - ₹{slab.to || "∞"}</span>
                <span className="text-xs font-black text-[#003399]">
                  {slab.method === "percentage" ? `${slab.value || 0}%` : `₹${slab.value || 0}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (markupMethod === "fixed") {
      appliedMarkup = Number(markupValue) || 0;
    } else {
      appliedMarkup = (baseFare * (Number(markupValue) || 0)) / 100;
    }

    return (
      <div className="bg-slate-50 border rounded-2xl p-6 relative overflow-hidden" style={{ borderColor: C.border }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#003399]/5 rounded-bl-[100px] pointer-events-none"></div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <FiSettings className="text-[#003399]" /> Markup Calculation Preview
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 border-dashed">
            <span className="text-sm font-bold text-slate-500">Base Fare Example</span>
            <span className="text-sm font-black text-slate-800">₹{baseFare.toLocaleString("en-IN")}</span>
          </div>
          
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 border-dashed">
            <span className="text-sm font-bold text-slate-500">Markup Applied ({markupMethod === 'percentage' ? `${markupValue || 0}%` : 'Fixed'})</span>
            <span className="text-sm font-black text-emerald-600">+ ₹{appliedMarkup.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-black text-slate-800 uppercase tracking-tight">Final Selling Fare</span>
            <span className="text-lg font-black text-[#003399]">₹{(baseFare + appliedMarkup).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDynamicFields = () => {
    if (selectedCategory === "Fare Slab Based") {
      return (
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Define Fare Slabs</label>
          {fareSlabs.map((slab, index) => (
            <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="From Fare (₹)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003399]"
                  value={slab.from}
                  onChange={(e) => {
                    const newSlabs = [...fareSlabs];
                    newSlabs[index].from = e.target.value;
                    setFareSlabs(newSlabs);
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="To Fare (₹)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003399]"
                  value={slab.to}
                  onChange={(e) => {
                    const newSlabs = [...fareSlabs];
                    newSlabs[index].to = e.target.value;
                    setFareSlabs(newSlabs);
                  }}
                />
              </div>
              <div className="w-32">
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003399] bg-white"
                  value={slab.method}
                  onChange={(e) => {
                    const newSlabs = [...fareSlabs];
                    newSlabs[index].method = e.target.value;
                    setFareSlabs(newSlabs);
                  }}
                >
                  <option value="fixed">Fixed (₹)</option>
                  <option value="percentage">%</option>
                </select>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Value"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003399]"
                  value={slab.value}
                  onChange={(e) => {
                    const newSlabs = [...fareSlabs];
                    newSlabs[index].value = e.target.value;
                    setFareSlabs(newSlabs);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const newSlabs = fareSlabs.filter((_, i) => i !== index);
                  setFareSlabs(newSlabs);
                }}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          <button
            onClick={() => setFareSlabs([...fareSlabs, { from: "", to: "", value: "", method: "fixed" }])}
            className="flex items-center gap-2 text-sm font-bold text-[#003399] hover:text-[#002266] px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <FiPlus /> Add New Slab
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {selectedCategory === "Airline Wise" && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Airline</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white">
              <option value="">Select Airline</option>
              <option value="indigo">IndiGo</option>
              <option value="airindia">Air India</option>
              <option value="vistara">Vistara</option>
              <option value="spicejet">SpiceJet</option>
            </select>
          </div>
        )}

        {selectedCategory === "Cabin Wise" && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Cabin Class</label>
            <select 
              value={cabin} 
              onChange={(e) => setCabin(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First">First Class</option>
            </select>
          </div>
        )}

        {/* Common Method Selection for non-slab categories */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Markup Method</label>
          <div className="flex items-center gap-4">
            <label className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl cursor-pointer transition-all ${markupMethod === 'percentage' ? 'bg-[#003399]/5 border-[#003399] text-[#003399]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                name="markupMethod" 
                value="percentage" 
                checked={markupMethod === 'percentage'} 
                onChange={() => setMarkupMethod('percentage')} 
                className="hidden" 
              />
              <FiPercent /> <span className="text-sm font-bold">Percentage</span>
            </label>
            <label className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl cursor-pointer transition-all ${markupMethod === 'fixed' ? 'bg-[#003399]/5 border-[#003399] text-[#003399]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                name="markupMethod" 
                value="fixed" 
                checked={markupMethod === 'fixed'} 
                onChange={() => setMarkupMethod('fixed')} 
                className="hidden" 
              />
              <FiDollarSign /> <span className="text-sm font-bold">Fixed Amount</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Markup Value</label>
          <div className="relative">
            <input
              type="number"
              placeholder={`Enter ${markupMethod === 'percentage' ? 'percentage' : 'amount'}...`}
              value={markupValue}
              onChange={(e) => setMarkupValue(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              {markupMethod === 'percentage' ? <FiPercent size={14} /> : <FaRupeeSign size={14} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const paginatedHistory = MOCK_HISTORY.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen font-sans pb-32 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* HEADER SECTION */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
            </div>
            
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiSettings size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">Corporate Markup Configuration</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Configure pricing rules and markup strategies
                </p>
              </div>
            </div>
          </div>
          
          {/* Corporate Info */}
          <div className="flex flex-col md:items-end text-left md:text-right shrink-0">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Selected Corporate</p>
            <div className="flex items-center gap-2">
              <MdBusiness size={18} className="text-white/80" />
              <p className="text-lg font-black text-white truncate max-w-[280px]" title={corporate.corporateName}>
                {corporate.corporateName}
              </p>
            </div>
            {corporate.corporateCode && (
              <p className="text-[11px] font-mono mt-0.5 text-white/50">Code: {corporate.corporateCode}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="w-full px-4 md:px-10 -mt-10 space-y-6">
        {/* TABS */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("flight")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "flight"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FaPlane size={14} /> Flight Markup
          </button>
          <button
            onClick={() => setActiveTab("hotel")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "hotel"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FaHotel size={14} /> Hotel Markup
          </button>
        </div>
      
        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT PANEL (25%) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Markup Categories</h3>
            <div className="space-y-1">
              {(activeTab === "flight" ? FLIGHT_CATEGORIES : HOTEL_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-[#003399] text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* RIGHT PANEL (75%) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border flex flex-col md:flex-row overflow-hidden" style={{ borderColor: C.border }}>
            
            {/* Form Section */}
            <div className="flex-1 p-6 md:p-8 md:border-r border-slate-100">
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Configure {selectedCategory}</h2>
              <p className="text-sm font-medium text-slate-500 mb-8">Set the markup rules for {activeTab} bookings under this category.</p>
              
              {renderDynamicFields()}
            </div>
            
            {/* Preview Section */}
            <div className="w-full md:w-80 bg-slate-50 p-6 md:p-8 flex flex-col justify-center">
              {renderCalculationPreview()}
            </div>
          </div>
          
          {/* HISTORY TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: C.border }}>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Markup History</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">Audit log of all configurations</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Method</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Value</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Updated On</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          row.type === 'Flight' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                        }`}>
                          {row.type === 'Flight' ? <FaPlane size={10} /> : <FaHotel size={10} />}
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">{row.category}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{row.method}</td>
                      <td className="px-6 py-4 text-sm font-black text-[#003399]">{row.value}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{row.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          row.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <Pagination
                currentPage={historyPage}
                totalPages={Math.ceil(MOCK_HISTORY.length / ITEMS_PER_PAGE)}
                onPageChange={setHistoryPage}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* STICKY SUMMARY PANEL */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 p-4 md:px-10 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Configuration</p>
            <p className="text-sm font-black text-slate-800 flex items-center gap-2 mt-0.5">
              {activeTab === 'flight' ? <FaPlane className="text-[#003399]" /> : <FaHotel className="text-[#003399]" />} 
              {selectedCategory}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Markup Value</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">
              {selectedCategory === "Fare Slab Based" ? "Multiple Slabs" : markupValue ? `${markupMethod === 'percentage' ? markupValue + '%' : '₹' + markupValue}` : "Not Set"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setMarkupValue("");
              setMarkupMethod("percentage");
            }}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Reset
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#003399] hover:bg-[#002266] shadow-md transition-all active:scale-95"
          >
            <FiSave size={14} /> Save Markup Rule
          </button>
        </div>
      </div>
    </div>
  );
}
