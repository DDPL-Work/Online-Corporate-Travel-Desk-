import React, { useMemo, useState } from "react";
import { 
  FiFilter, FiEye, FiDownload, FiSearch, FiCalendar, 
  FiBriefcase, FiList, FiCheckCircle, FiClock, FiDollarSign 
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { BsBuilding } from "react-icons/bs";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

// ── DUMMY DATA ──────────────────────────────────────────────────────────────
const CORPORATE_BOOKINGS = [
  {
    id: "BK-FL-99210",
    corporate: "TechNova Solutions",
    corpId: "CORP-TN-01",
    employee: "John Doe",
    empId: "TN-552",
    type: "Flight",
    department: "Engineering",
    date: "2024-03-24",
    destination: "Mumbai (BOM) → Bangalore (BLR)",
    amount: 12450.50,
    status: "Completed",
    pnr: "TN7721",
    airline: "IndiGo"
  },
  {
    id: "BK-HT-99211",
    corporate: "Global FinCorp",
    corpId: "CORP-GF-09",
    employee: "Sarah Smith",
    empId: "GF-102",
    type: "Hotel",
    department: "Finance",
    date: "2024-03-25",
    destination: "Hotel Avon Ruby, Mumbai",
    amount: 22377.79,
    status: "Pending",
    invoice: "INV-9920",
    roomType: "Executive Room"
  },
  {
    id: "BK-FL-99212",
    corporate: "TechNova Solutions",
    corpId: "CORP-TN-01",
    employee: "Robert Lee",
    empId: "TN-991",
    type: "Flight",
    department: "Sales",
    date: "2024-03-26",
    destination: "Delhi (DEL) → Mumbai (BOM)",
    amount: 8900.00,
    status: "Completed",
    pnr: "TN8812",
    airline: "Air India"
  }
];

export default function GlobalBookingsDashboard() {
  const [activeTab, setActiveTab] = useState("Flight");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [corporate, setCorporate] = useState("All");
  const [search, setSearch] = useState("");

  const corporates = ["All", ...new Set(CORPORATE_BOOKINGS.map((b) => b.corporate))];

  // ── FILTER LOGIC ──────────────────────────────────────────────────────────
  const filtered = CORPORATE_BOOKINGS.filter((b) => {
    const d = new Date(b.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = d >= start && d <= end;
    const corpMatch = corporate === "All" || b.corporate === corporate;
    const typeMatch = b.type === activeTab; // Switch logic based on tab
    const searchMatch = !search || 
      b.employee.toLowerCase().includes(search.toLowerCase()) || 
      b.id.toLowerCase().includes(search.toLowerCase());

    return dateMatch && corpMatch && typeMatch && searchMatch;
  });

  const totalSpend = filtered.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiList size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Global Bookings Summary</h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Multi-Corporate Administration</p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          <button 
            onClick={() => setActiveTab("Flight")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Flight" ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaPlane size={14} /> Flight Bookings
          </button>
          <button 
            onClick={() => setActiveTab("Hotel")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Hotel" ? "bg-white text-[#088395] border-b-[#088395] shadow-sm" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaHotel size={14} /> Hotel Bookings
          </button>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label={`Total ${activeTab}s`} value={filtered.length} Icon={activeTab === 'Flight' ? FaPlane : FaHotel} borderCls={activeTab === 'Flight' ? "border-[#0A4D68]" : "border-[#088395]"} iconBgCls={activeTab === 'Flight' ? "bg-[#0A4D68]/10" : "bg-[#088395]/10"} iconColorCls={activeTab === 'Flight' ? "text-[#0A4D68]" : "text-[#088395]"} />
          <StatCard label="Confirmed" value={filtered.filter(b => b.status === 'Completed').length} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Pending" value={filtered.filter(b => b.status === 'Pending').length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Total Spend" value={`₹${totalSpend.toLocaleString()}`} Icon={FiDollarSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LabeledInput label="Corporate Account">
              <select value={corporate} onChange={(e) => setCorporate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]">
                {corporates.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </LabeledInput>

            <LabeledInput label="Start Date">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
            </LabeledInput>

            <LabeledInput label="End Date">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
            </LabeledInput>

            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Traveller / ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
              </div>
            </LabeledInput>
          </div>
        </div>

        {/* TABLE SECTION - SEPARATED BY TAB */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{activeTab} Detailed Report</h2>
            <button className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase ${activeTab === 'Flight' ? 'bg-[#0A4D68]' : 'bg-[#088395]'}`}>
              <FiDownload /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            {activeTab === "Flight" ? (
              <FlightTable data={filtered} />
            ) : (
              <HotelTable data={filtered} />
            )}
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} {activeTab} Records</span>
            <span>Est. Market Value: <span className={activeTab === 'Flight' ? "text-[#0A4D68]" : "text-[#088395]"}>₹{totalSpend.toLocaleString()}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FLIGHT TABLE COMPONENT ────────────────────────────────────────────────
const FlightTable = ({ data }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-[#0A4D68]">
        {["Booking ID", "Corporate Account", "Traveller / Dept", "Booked Date", "Amount", "Status", "PNR / Airline", "Action"].map((h) => (
          <th key={h} className="px-6 py-4 text-[11px] font-bold text-teal-50 uppercase tracking-widest">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {data.map((b) => (
        <tr key={b.id} className="hover:bg-slate-50 transition-all bg-white">
          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">#{b.id}</td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-[13px]">{b.corporate}</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{b.corpId}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[13px]">{b.employee}</span>
              <span className="text-[11px] text-teal-600 font-medium">{b.department}</span>
            </div>
          </td>
          <td className="px-6 py-4 text-slate-500 font-medium">{new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td className="px-6 py-4 font-black text-slate-900">₹{b.amount.toLocaleString()}</td>
          <td className="px-6 py-4"><StatusLabel status={b.status} /></td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[12px]">{b.destination}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{b.airline} • {b.pnr}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <button className="p-2 rounded-lg bg-slate-100 text-[#0A4D68] hover:bg-slate-200 transition-colors"><FiEye size={16} /></button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ── HOTEL TABLE COMPONENT ─────────────────────────────────────────────────
const HotelTable = ({ data }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-[#088395]">
        {["Booking ID", "Corporate Account", "Guest / Dept", "Booked Date", "Amount", "Status", "Hotel / Room", "Action"].map((h) => (
          <th key={h} className="px-6 py-4 text-[11px] font-bold text-cyan-50 uppercase tracking-widest">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {data.map((b) => (
        <tr key={b.id} className="hover:bg-slate-50 transition-all bg-white">
          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">#{b.id}</td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-[13px]">{b.corporate}</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{b.corpId}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[13px]">{b.employee}</span>
              <span className="text-[11px] text-cyan-600 font-medium">{b.department}</span>
            </div>
          </td>
          <td className="px-6 py-4 text-slate-500 font-medium">{new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td className="px-6 py-4 font-black text-slate-900">₹{b.amount.toLocaleString()}</td>
          <td className="px-6 py-4"><StatusLabel status={b.status} /></td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[12px]">{b.destination}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{b.roomType} • {b.invoice}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <button className="p-2 rounded-lg bg-slate-100 text-[#088395] hover:bg-slate-200 transition-colors"><FiEye size={16} /></button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ── HELPERS ───────────────────────────────────────────────────────────────

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

function StatusLabel({ status }) {
  const isComp = status === "Completed";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isComp ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
    }`}>
      {status}
    </span>
  );
}