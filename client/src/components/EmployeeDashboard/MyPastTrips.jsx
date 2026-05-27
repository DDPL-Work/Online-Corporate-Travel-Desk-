// client/src/components/EmployeeDashboard/MyPastTrips.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCalendar,
  FiFilter,
  FiEye,
  FiRefreshCw,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiX,
  FiList,
  FiMapPin,
  FiArchive,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import api from "../../API/axios";
import { airlineLogo } from "../../utils/formatter";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";

/* ─── helpers ─── */
function fmtDate(d, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

const RouteCell = ({ routes, airline }) => {
  if (!routes || routes.length === 0) return <span className="text-slate-400">No Route</span>;
  const airlineCode = (airline?.airlineCode || "AI").toUpperCase();
  const airlineName = airline?.airlineName || "Airline";
  const logoUrl = airlineLogo(airlineCode);
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
        <img src={logoUrl} alt={airlineName} className="w-full h-full object-contain" loading="eager" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{routes[0].fromCode}</span>
          <FiArrowRight size={12} className="text-slate-400" />
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{routes.length > 1 ? routes[0].toCode : routes[routes.length - 1].toCode}</span>
          {routes.length > 1 && <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 ml-1">RT</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span className="capitalize">{routes[0].fromCity || "Origin"}</span>
          <span>→</span>
          <span className="capitalize">{routes.length > 1 ? (routes[0].toCity || "Turnaround") : (routes[routes.length - 1].toCity || "Dest")}</span>
        </div>
      </div>
    </div>
  );
};

function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: flightBookings = [], loading } = useSelector((state) => state.bookings);

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const pastFlights = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return (flightBookings || []).filter(b => {
      const travelDate = b.bookingSnapshot?.travelDate;
      return b.executionStatus === "ticketed" && travelDate && new Date(travelDate) < today;
    }).map(b => {
      const segments = b.flightRequest?.segments || [];
      const buildLeg = (segs) => {
        if (!segs.length) return null;
        const f = segs[0]; const l = segs[segs.length - 1];
        const resCode = (v) => (typeof v === "string" ? v : v?.airportCode || v?.city || "N/A");
        const resCity = (v) => (typeof v === "string" ? "Unknown" : v?.city || "Unknown");
        return { fromCode: resCode(f?.origin), toCode: resCode(l?.destination), fromCity: resCity(f?.origin), toCity: resCity(l?.destination) };
      };
      const routes = [];
      const onward = segments.filter(s => s.journeyType === "onward");
      const ret = segments.filter(s => s.journeyType === "return");
      if (onward.length || ret.length) {
        const oL = buildLeg(onward); const rL = buildLeg(ret);
        if (oL) routes.push(oL); if (rL) routes.push(rL);
      } else if (segments.length) {
        const leg = buildLeg(segments); if (leg) routes.push(leg);
      }
      return { ...b, status: "Confirmed", pnr: b.bookingResult?.pnr || b.bookingResult?.ticketResponse?.pnr || "-", amount: b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0, bookedDate: b.createdAt, travelDate: b.bookingSnapshot?.travelDate, routes, airline: segments[0] ? { airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode, airlineName: segments[0].airlineName || segments[0].airline?.airlineName } : null };
    }).sort((a,b) => new Date(b.travelDate) - new Date(a.travelDate));
  }, [flightBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pastFlights.filter(b => {
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.pnr?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q)) &&
             (!startDate || booked >= startDate) && (!endDate || booked <= endDate);
    });
  }, [search, startDate, endDate, pastFlights]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const totalValue = filtered.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Archived Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Completed" value={filtered.length} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Travel History" value={filtered.length} Icon={FiArchive} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Spent" value={`₹${totalValue.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search Records</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="PNR, Order ID..." />
          </LabeledField>
          <LabeledField label="Booking Window" className="lg:col-span-6">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Flight History Ledger" 
        subtitle={`${filtered.length} completed journeys`} 
        exportConfig={{
          data: filtered,
          filename: `my_past_flights_${new Date().toISOString().split('T')[0]}.csv`,
          columns: [
            { header: "Order ID", key: "orderId" },
            { header: "Route", accessor: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
            { header: "Travel Date", accessor: (r) => fmtDate(r.travelDate) },
            { header: "Status", accessor: () => "Completed" },
            { header: "PNR Ref", key: "pnr" },
            { header: "Amount", accessor: (r) => `₹${r.amount.toLocaleString()}` }
          ]
        }}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order ID</Th>
              <Th className="px-6! py-5!">Route</Th>
              <Th className="px-6! py-5!">Travel Date</Th>
              <Th className="px-6! py-5!">Status</Th>
              <Th className="px-6! py-5!">PNR Ref</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="px-6! py-5!"><IdCell id={b.orderId} /></td>
                <td className="px-6! py-5!"><RouteCell routes={b.routes} airline={b.airline} /></td>
                <td className="px-6! py-5! text-[11px] font-bold text-slate-500 uppercase">{fmtDate(b.travelDate)}</td>
                <td className="px-6! py-5!"><StatusBadge status="completed" /></td>
                <td className="px-6! py-5! font-black text-blue-500 text-xs">{b.pnr}</td>
                <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="px-6! py-5! !text-left">
                    <button onClick={() => navigate(`/my-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiSearch size={32} /></div><p className="text-sm font-bold text-slate-400">No past flights found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

function HotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const [hotelBookings, setHotelBookings] = useState([]);
  const [hotelLoading, setHotelLoading] = useState(false);

  useEffect(() => {
    const fetchHotels = async () => {
      setHotelLoading(true);
      try {
        const { data } = await api.get("/hotel-booking/my/completed");
        setHotelBookings(Array.isArray(data.data?.bookings) ? data.data.bookings : []);
      } catch (err) { console.error(err); } finally { setHotelLoading(false); }
    };
    fetchHotels();
  }, []);

  const pastHotels = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return (hotelBookings || []).filter(b => {
      const co = b.bookingSnapshot?.checkOutDate || b.checkOutDate || b.CheckOutDate;
      return co && new Date(co) < today && b.executionStatus === "voucher_generated";
    }).map(b => {
      const hotelName = b.bookingSnapshot?.hotelName || b.HotelName || "Unknown Hotel";
      const city = b.bookingSnapshot?.city || b.cityName || "—";
      const ci = b.bookingSnapshot?.checkInDate || b.checkInDate || b.CheckInDate;
      return { ...b, hotelName, city, ci, amount: b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0, bookedDate: b.createdAt };
    }).sort((a,b) => new Date(b.ci) - new Date(a.ci));
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pastHotels.filter(b => {
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.hotelName?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q)) &&
             (!startDate || booked >= startDate) && (!endDate || booked <= endDate);
    });
  }, [search, startDate, endDate, pastHotels]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const totalValue = filtered.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Archived Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Completed" value={filtered.length} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Past Stays" value={filtered.length} Icon={FiArchive} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Spent" value={`₹${totalValue.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search Property</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Booking Window" className="lg:col-span-6">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel History Ledger" 
        subtitle={`${filtered.length} completed stays`} 
        exportConfig={{
          data: filtered,
          filename: `my_past_hotels_${new Date().toISOString().split('T')[0]}.csv`,
          columns: [
            { header: "Order ID", key: "orderId" },
            { header: "Hotel", key: "hotelName" },
            { header: "Stay Period", accessor: (r) => `${fmtDate(r.ci)} to ${fmtDate(r.bookingSnapshot?.checkOutDate || r.checkOutDate)}` },
            { header: "Status", accessor: () => "Completed" },
            { header: "Amount", accessor: (r) => `₹${r.amount.toLocaleString()}` }
          ]
        }}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order ID</Th>
              <Th className="px-6! py-5!">Hotel Detail</Th>
              <Th className="px-6! py-5!">Stay Period</Th>
              <Th className="px-6! py-5!">Status</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="px-6! py-5!"><IdCell id={b.orderId} /></td>
                <td className="px-6! py-5!">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="px-6! py-5!">
                   <p className="text-[11px] font-bold text-slate-700">{fmtDate(b.ci)}</p>
                   <p className="text-[9px] text-slate-400">to {fmtDate(b.bookingSnapshot?.checkOutDate || b.checkOutDate)}</p>
                </td>
                <td className="px-6! py-5!"><StatusBadge status="completed" /></td>
                <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="px-6! py-5! !text-left">
                    <button onClick={() => navigate(`/my-hotel-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiSearch size={32} /></div><p className="text-sm font-bold text-slate-400">No past stays found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function MyPastTrips() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");
  const { loading: flightLoading } = useSelector((state) => state.bookings);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { if (typeQuery) setActiveTab(typeQuery === "hotel" ? "hotel" : "flight"); }, [typeQuery]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try { await dispatch(fetchMyBookings()); } finally { setIsSyncing(false); }
  };

  const isLoading = flightLoading || isSyncing;

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <button onClick={handleRefresh} className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`} disabled={isLoading}>
                 <div className={isLoading ? "animate-spin" : ""}><FiRefreshCw size={20} /></div>
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiArchive size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Travel History</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Complete Archive of your Professional Travel Deployments and Asset Utilization</p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate("/travel", { state: { activeTab } })} className="px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 transition-all shadow-xl bg-[#C9A84C] text-[#000D26] hover:brightness-110 active:scale-95">
                {activeTab === "flight" ? <FaPlane size={14} /> : <FaHotel size={14} />} Plan New Trip
             </button>
          </div>
        </div>
      </div>
      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Past Flights", FaPlane], ["hotel", "Past Stays", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}