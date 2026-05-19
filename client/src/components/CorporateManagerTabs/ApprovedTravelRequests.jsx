import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import {
  FiCheckCircle,
  FiClock,
  FiX,
  FiRefreshCw,
  FiEye,
  FiArrowRight,
  FiSearch,
} from "react-icons/fi";
import {
  getApprovedHotelRequests,
  getApprovedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "./Modal/BookingRequestDetailsModal";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  TraceTimer,
  getSegCity,
  ExecStatusBadge,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";

const FLIGHT_EXCLUDE = new Set(["ticketed", "cancel_requested", "cancelled"]);
const HOTEL_EXCLUDE = new Set(["voucher_generated", "cancelled"]);

const isDiscarded = (date) => {
  if (!date) return false;
  return new Date() > new Date(date);
};

const RouteCell = ({ routes, airline }) => {
  if (!routes || routes.length === 0) return <span className="text-slate-400">No Route</span>;
  
  const airlineCode = (airline?.airlineCode || "AI").toUpperCase();
  const airlineName = airline?.airlineName || "Airline";
  const logoUrl = airlineLogo(airlineCode);

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
        <img 
          src={logoUrl} 
          alt={airlineName} 
          className="w-full h-full object-contain"
          onError={(e) => { 
            e.target.onerror = null;
            e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; 
          }} 
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes[0].fromCode}
          </span>
          <FiArrowRight size={12} className="text-slate-400" />
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes.length > 1 ? routes[0].toCode : routes[routes.length - 1].toCode}
          </span>
          {routes.length > 1 && (
            <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 ml-1">RT</span>
          )}
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

function FlightApprovalsSection({ rawApprovals, traceTimers, loading, onCountChange }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [execFilter, setExec] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 10;

  const flightRaw = useMemo(() => (rawApprovals || []).filter(a => a.bookingType === "flight" && !FLIGHT_EXCLUDE.has(a.executionStatus)), [rawApprovals]);
  
  const formatted = useMemo(() => {
    return flightRaw.map(a => {
      const lead = a.travellers?.find(t => t.isLeadPassenger);
      const travellerName = lead ? `${lead.title || ""} ${lead.firstName || ""} ${lead.lastName || ""}`.trim() : "Staff Member";
      
      const segments = a.flightRequest?.segments || [];
      const onwardSegments = segments.filter(s => s.journeyType === "onward");
      const returnSegments = segments.filter(s => s.journeyType === "return");
      
      const buildLeg = (segs) => {
        if (!segs.length) return null;
        const first = segs[0]; 
        const last = segs[segs.length - 1];
        return {
          fromCode: first?.origin?.airportCode || "N/A",
          toCode: last?.destination?.airportCode || "N/A",
          fromCity: first?.origin?.city || "Unknown",
          toCity: last?.destination?.city || "Unknown",
          departureDate: first?.departureDateTime
        };
      };

      const routes = [];
      if (onwardSegments.length > 0 || returnSegments.length > 0) {
        const onwardLeg = buildLeg(onwardSegments);
        const returnLeg = buildLeg(returnSegments);
        if (onwardLeg) routes.push(onwardLeg);
        if (returnLeg) routes.push(returnLeg);
      } else if (segments.length > 0) {
        const leg = buildLeg(segments);
        if (leg) routes.push(leg);
      }

      const airline = segments[0] ? { 
        airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode, 
        airlineName: segments[0].airlineName || segments[0].airline?.airlineName 
      } : null;

      const travelDate = routes[0]?.departureDate || a.bookingSnapshot?.travelDate;

      return {
        ...a,
        travellerName,
        employeeId: a.requesterDetails?.email || a.userId?.email || "—",
        routes,
        airline,
        travelDate,
        amount: a.pricingSnapshot?.totalAmount || 0
      };
    });
  }, [flightRaw]);

  const execStatuses = useMemo(() => ["All", ...new Set(flightRaw.map(a => a.executionStatus).filter(Boolean))], [flightRaw]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter((a) => {
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const appDate = a.approvedAt ? new Date(a.approvedAt).toISOString().slice(0, 10) : "";
      return eOk && (!startDate || appDate >= startDate) && (!endDate || appDate <= endDate) &&
             (!q || a.orderId?.toLowerCase().includes(q) || a.travellerName.toLowerCase().includes(q) || a.employeeId.toLowerCase().includes(q));
    });
  }, [search, startDate, endDate, execFilter, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  useEffect(() => { onCountChange(filtered.length); }, [filtered.length, onCountChange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Approved Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Pending Ticket" value={filtered.filter(a => a.executionStatus === "not_started").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Failed Exec" value={filtered.filter(a => a.executionStatus === "failed").length} Icon={FiX} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Total Value" value={`₹${filtered.reduce((s, a) => s + a.amount, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Approval Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by Ref, Personnel..." />
          </LabeledField>
          <LabeledField label="Execution" className="lg:col-span-2">
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <LabeledField label="Approval Date" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStart(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEnd(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStart(""); setEnd(""); setExec("All"); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Flight Approval Ledger" subtitle={`${filtered.length} requests pending execution`} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Approved On</Th>
              <Th className="!px-6 !py-5">Travel Date</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((a, i) => (
              <tr key={a._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={a.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.travellerName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{a.flightRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <RouteCell routes={a.routes} airline={a.airline} />
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{a.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.approvedAt ? new Date(a.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{a.approvedAt ? new Date(a.approvedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.travelDate ? new Date(a.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{a.travelDate ? new Date(a.travelDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5"><ExecStatusBadge status={isDiscarded(a.travelDate) ? "discarded" : a.executionStatus} /></td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{a.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => setSelected(a)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
                      <FiEye size={16} className="text-[#E7C695] group-hover:scale-110 transition-transform" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No approved flight requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selected && <FlightBookingModal booking={selected} traceTimers={traceTimers} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HotelApprovalsSection({ rawApprovals, loading, onCountChange }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [execFilter, setExec] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 10;

  const hotelRaw = useMemo(() => (rawApprovals || []).filter(a => a.bookingType === "hotel" && !HOTEL_EXCLUDE.has(a.executionStatus)), [rawApprovals]);
  
  const formatted = useMemo(() => {
    return hotelRaw.map(a => {
      const lead = a.travellers?.find(t => t.isLeadPassenger);
      const guestName = lead ? `${lead.title || ""} ${lead.firstName || ""} ${lead.lastName || ""}`.trim() : "Staff Member";
      
      const hotel = a.hotelRequest?.selectedHotel || {};
      const amount = a.pricingSnapshot?.totalAmount || 0;
      const checkIn = a.hotelRequest?.checkInDate;

      return {
        ...a,
        guestName,
        employeeId: a.requesterDetails?.email || a.userId?.email || "—",
        hotelName: a.hotelRequest?.selectedHotel?.hotelName || "N/A",
        city: hotel.city || "—",
        amount,
        checkIn
      };
    });
  }, [hotelRaw]);

  const execStatuses = useMemo(() => ["All", ...new Set(hotelRaw.map(a => a.executionStatus).filter(Boolean))], [hotelRaw]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter((a) => {
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const appDate = a.approvedAt ? new Date(a.approvedAt).toISOString().slice(0, 10) : "";
      return eOk && (!startDate || appDate >= startDate) && (!endDate || appDate <= endDate) &&
             (!q || a.orderId?.toLowerCase().includes(q) || a.hotelName.toLowerCase().includes(q) || a.guestName.toLowerCase().includes(q) || a.employeeId.toLowerCase().includes(q));
    });
  }, [search, startDate, endDate, execFilter, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  useEffect(() => { onCountChange(filtered.length); }, [filtered.length, onCountChange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Approved Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Pending Voucher" value={filtered.filter(a => a.executionStatus === "not_started").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Failed Exec" value={filtered.filter(a => a.executionStatus === "failed").length} Icon={FiX} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Total Value" value={`₹${filtered.reduce((s, a) => s + a.amount, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Approval Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by Hotel, Personnel..." />
          </LabeledField>
          <LabeledField label="Execution" className="lg:col-span-2">
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <LabeledField label="Approval Date" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStart(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEnd(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStart(""); setEnd(""); setExec("All"); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Hotel Approval Ledger" subtitle={`${filtered.length} requests pending execution`} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order Reference</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Approved On</Th>
              <Th className="!px-6 !py-5">Check-in</Th>
              <Th className="!px-6 !py-5">Asset Detail</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((a, i) => (
              <tr key={a._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={a.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.guestName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{a.hotelRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{a.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.approvedAt ? new Date(a.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{a.approvedAt ? new Date(a.approvedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.checkIn ? new Date(a.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{a.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{a.city}</p>
                </td>
                <td className="!px-6 !py-5"><ExecStatusBadge status={isDiscarded(a.checkIn) ? "discarded" : a.executionStatus} /></td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{a.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => setSelected(a)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
                      <FiEye size={16} className="text-[#E7C695] group-hover:scale-110 transition-transform" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No approved hotel requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selected && <HotelBookingModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function ApprovedTravelRequestsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const [traceTimers, setTimers] = useState({});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { approvedHotelRequests, loadingApprovedRequests, approvedFlightRequests, loadingApprovedFlightRequests } = useSelector((state) => state.manager);

  const [flightCount, setFlightCount] = useState(0);
  const [hotelCount, setHotelCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (activeTab === "flight") dispatch(getApprovedFlightRequests());
    else dispatch(getApprovedHotelRequests());
  }, [activeTab, dispatch]);

  useEffect(() => {
    if (!approvedFlightRequests?.length) { setTimers({}); return; }
    const interval = setInterval(() => {
      const updated = {};
      approvedFlightRequests.forEach((a) => {
        const exp = a.flightRequest?.fareExpiry;
        if (!exp) return;
        const diff = new Date(exp.$date || exp) - new Date();
        if (diff <= 0) { updated[a._id] = "expired"; return; }
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        updated[a._id] = `${h}h ${m}m ${s}s`;
      });
      setTimers(updated);
    }, 1000);
    return () => clearInterval(interval);
  }, [approvedFlightRequests]);

  const loadingActive = activeTab === "flight" ? loadingApprovedFlightRequests : loadingApprovedRequests;

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(activeTab === "flight" ? getApprovedFlightRequests() : getApprovedHotelRequests());
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-10 pb-24 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md shadow-xl">
                 <FiArrowRight className="rotate-180" size={22} />
               </button>
               <button onClick={handleRefresh} className={`p-3.5 rounded-2xl bg-white/10 transition-all border border-white/10 backdrop-blur-md shadow-xl ${(isSyncing || loadingActive) ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`} disabled={isSyncing || loadingActive}>
                 <div className={(isSyncing || loadingActive) ? "animate-spin" : ""}>
                   <FiRefreshCw size={22} />
                 </div>
               </button>
             </div>
             <div className="h-16 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl text-white border border-white/20 bg-white/10 backdrop-blur-md" >
                 <FiCheckCircle size={32} />
               </div>
               <div>
                 <h1 className="text-4xl font-black tracking-tight leading-none">Approved Orders</h1>
                 <p className="text-[11px] mt-3 font-bold uppercase tracking-[3px] opacity-60">Verified Requirements Awaiting Ticketing</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-12 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Orders", FaPlane, flightCount], ["hotel", "Hotel Orders", FaHotel, hotelCount]].map(([k, lbl, Icon, count]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl} <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] ${activeTab === k ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>{count}</span>
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <FlightApprovalsSection rawApprovals={approvedFlightRequests} traceTimers={traceTimers} loading={loadingApprovedFlightRequests} onCountChange={setFlightCount} /> : <HotelApprovalsSection rawApprovals={approvedHotelRequests} loading={loadingApprovedRequests} onCountChange={setHotelCount} />}
      </div>
    </div>
  );
}
