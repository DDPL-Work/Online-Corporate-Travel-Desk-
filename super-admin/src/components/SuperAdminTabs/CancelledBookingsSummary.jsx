import React, { useState } from "react";
import { 
  FiSearch, FiDownload, FiEye, FiDollarSign, FiXCircle, FiRotateCcw, FiAlertCircle, FiTrash2 
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";

const colors = {
  danger: "#BE123C", // Rose-700
  dangerLight: "#FFF1F2",
  dark: "#1E293B",
  light: "#F8FAFC",
};

// ── DUMMY DATA (FILTERED FOR CANCELLED) ──────────────────────────────────────
const CANCELLED_DATA = [
  {
    id: "CAN-FL-1102",
    corporate: "TechNova Solutions",
    employee: "John Doe",
    empId: "TN-552",
    type: "Flight",
    date: "2024-03-24", // Travel Date
    cancelDate: "2024-03-20",
    destination: "Mumbai (BOM) → Bangalore (BLR)",
    amount: 12450.50,
    refundStatus: "Processed",
    airline: "IndiGo"
  },
  {
    id: "CAN-HT-5591",
    corporate: "Global FinCorp",
    employee: "Sarah Smith",
    empId: "GF-102",
    type: "Hotel",
    checkIn: "2024-03-25",
    checkOut: "2024-03-28",
    cancelDate: "2024-03-22",
    destination: "Hotel Avon Ruby, Mumbai",
    amount: 22377.79,
    refundStatus: "Pending",
    roomType: "Executive Room"
  }
];

export default function CancellationDashboard() {
  const [activeTab, setActiveTab] = useState("Flight");
  const [search, setSearch] = useState("");
  const [corporate, setCorporate] = useState("All");
  
  // Date Filters
  const [cancelDate, setCancelDate] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [endDate, setEndDate] = useState("");
    const [startDate, setStartDate] = useState("");

  const corporates = ["All", ...new Set(CANCELLED_DATA.map((b) => b.corporate))];

  // ── FILTER LOGIC ──────────────────────────────────────────────────────────
  const filtered = CANCELLED_DATA.filter((b) => {
    const typeMatch = b.type === activeTab;
    const corpMatch = corporate === "All" || b.corporate === corporate;
    const searchMatch = !search || 
      b.employee.toLowerCase().includes(search.toLowerCase()) || 
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.empId.toLowerCase().includes(search.toLowerCase());
    
    const cDateMatch = !cancelDate || b.cancelDate === cancelDate;

    // Contextual Dates
    let specificDateMatch = true;
    if (activeTab === "Flight" && travelDate) {
        specificDateMatch = b.date === travelDate;
    } else if (activeTab === "Hotel" && checkIn) {
        specificDateMatch = b.checkIn === checkIn;
    }

    return typeMatch && corpMatch && searchMatch && cDateMatch && specificDateMatch;
  });

  const totalLoss = filtered.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-700 to-rose-500 flex items-center justify-center shadow-lg text-white">
            <FiXCircle size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Cancellation Archive</h1>
            <p className="text-xs text-rose-600 mt-1 font-bold uppercase tracking-widest">Super Admin Monitor</p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          <button 
            onClick={() => setActiveTab("Flight")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Flight" ? "bg-white text-rose-700 border-b-rose-700 shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <FaPlane size={14} /> Cancelled Flights
          </button>
          <button 
            onClick={() => setActiveTab("Hotel")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Hotel" ? "bg-white text-rose-700 border-b-rose-700 shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <FaHotel size={14} /> Cancelled Hotels
          </button>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label={`Total Cancelled`} value={filtered.length} Icon={FiTrash2} borderCls="border-rose-700" iconBgCls="bg-rose-50" iconColorCls="text-rose-700" />
          <StatCard label="Refund Processed" value={filtered.filter(b => b.refundStatus === 'Processed').length} Icon={FiRotateCcw} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Refund Pending" value={filtered.filter(b => b.refundStatus === 'Pending').length} Icon={FiAlertCircle} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Total Value" value={`₹${totalLoss.toLocaleString()}`} Icon={FiDollarSign} borderCls="border-slate-800" iconBgCls="bg-slate-100" iconColorCls="text-slate-800" />
        </div>

        {/* FILTERS SECTION */}
               <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                   <LabeledInput label="Search">
                     <div className="relative">
                       <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input
                         type="text"
                         placeholder="Traveller / ID / Emp ID..."
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                       />
                     </div>
                   </LabeledInput>
       
                   <LabeledInput label="Corporate Account">
                     <select
                       value={corporate}
                       onChange={(e) => setCorporate(e.target.value)}
                       className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
                     >
                       {corporates.map((c) => (
                         <option key={c} value={c}>
                           {c}
                         </option>
                       ))}
                     </select>
                   </LabeledInput>
       
                     <LabeledInput label="Cancellation Date">
                       <input
                         type="date"
                         value={travelDate}
                         onChange={(e) => setTravelDate(e.target.value)}
                         className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                       />
                     </LabeledInput>
                   <LabeledInput label="Start Date">
                     <input
                       type="date"
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                     />
                   </LabeledInput>
       
                   <LabeledInput label="End Date">
                     <input
                       type="date"
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                       className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                     />
                   </LabeledInput>
                 </div>
               </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{activeTab} Void List</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md uppercase">
              <FiDownload /> Export Voids
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800">
                  {["Booking ID", "Corporate", "Traveller / ID", "Cancelled On", "Original Date", "Refund Status", activeTab === 'Flight' ? "Airline / Route" : "Hotel / Room", "View"].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-300 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-rose-50/30 transition-all bg-white">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">#{b.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 text-[13px]">{b.corporate}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-[13px]">{b.employee}</span>
                        <span className="text-[11px] text-rose-600 font-mono">ID: {b.empId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-rose-700 font-bold">{b.cancelDate}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                        {activeTab === 'Flight' ? b.date : `${b.checkIn}`}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                            b.refundStatus === 'Processed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>{b.refundStatus}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-[12px]">{b.destination}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{activeTab === 'Flight' ? b.airline : b.roomType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"><FiEye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REUSABLE HELPERS ──────────────────────────────────────────────────────

function StatCard({ label, value, iconBgCls, iconColorCls, borderCls, Icon }) {
  return (
    <div className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}>
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">{label}</label>
      {children}
    </div>
  );
}