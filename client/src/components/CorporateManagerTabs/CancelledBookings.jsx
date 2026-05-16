import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import {
  FiSearch,
  FiXCircle,
  FiRefreshCw,
  FiClock,
  FiEye,
  FiX,
  FiArrowRight,
} from "react-icons/fi";
import {
  getTeamExecutedHotelRequests,
  getTeamExecutedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";

const mapCancelStatus = (status) => {
  if (status === "refunded") return "Refunded";
  if (status === "refund_pending") return "Refund Pending";
  return "Cancelled";
};

const CancelStatusBadge = ({ status }) => {
  const s = mapCancelStatus(status);
  const colors = {
    Refunded: "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Refund Pending": "bg-amber-50 text-amber-700 border-amber-100",
    Cancelled: "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[s] || colors.Cancelled}`}>
      {s}
    </span>
  );
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

function CancelledFlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const { teamExecutedFlightRequests: flightBookings } = useSelector((state) => state.manager);

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
  }, [dispatch]);

  const formatted = useMemo(() => {
    return (flightBookings || []).map(b => {
      const traveller = b.travellers?.length
        ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
        : "Staff Member";
      
      const executionStatus = (b.executionStatus || "").toLowerCase();
      const status = mapCancelStatus(b.amendment?.status || executionStatus);
      
      const pnr = b.bookingResult?.pnr || "-";
      const amount = b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;
      const refundAmount = b.amendment?.response?.Response?.RefundedAmount || b.pricingSnapshot?.totalAmount || 0;

      const segments = b.flightRequest?.segments || [];
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

      const cancelledDate = b.amendmentHistory?.[0]?.createdAt || b.updatedAt;

      return { 
        ...b, 
        travellerName: traveller, 
        employeeId: b.userId?.email || "—", 
        status, 
        pnr, 
        amount, 
        refundAmount,
        bookedDate: b.createdAt,
        routes,
        airline,
        cancelledDate,
        executionStatus
      };
    }).filter(b => ["cancel_requested", "cancelled", "refunded", "refund_pending"].includes(b.executionStatus));
  }, [flightBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const statusOk = cancelStatusFilter === "All" || b.status === cancelStatusFilter;
      const cDate = b.cancelledDate ? new Date(b.cancelledDate).toISOString().slice(0, 10) : "";
      return statusOk && (!q || b.travellerName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q) || b.pnr.toLowerCase().includes(q)) &&
             (!startDate || cDate >= startDate) && (!endDate || cDate <= endDate);
    });
  }, [search, startDate, endDate, cancelStatusFilter, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Cancelled Flights" value={filtered.length} Icon={FiXCircle} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Refunded" value={filtered.filter(b => b.status === "Refunded").length} Icon={FiRefreshCw} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Refund Pending" value={filtered.filter(b => b.status === "Refund Pending").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Refund Value" value={`₹${filtered.reduce((s, b) => s + (b.refundAmount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Cancellation Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="PNR, Name or ID..." />
          </LabeledField>
          <LabeledField label="Cancel Status" className="lg:col-span-2">
            <CustomDropdown value={cancelStatusFilter} onChange={setCancelStatus} options={["All", "Cancelled", "Refunded", "Refund Pending"]} />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setCancelStatus("All"); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Flight Cancellation Registry" subtitle={`${filtered.length} records processed`} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Cancelled On</Th>
              <Th className="!px-6 !py-5">PNR Ref</Th>
              <Th className="!px-6 !py-5">Refund Est.</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.travellerName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{b.flightRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <RouteCell routes={b.routes} airline={b.airline} />
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5"><CancelStatusBadge status={b.amendment?.status || b.executionStatus} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{new Date(b.cancelledDate).toLocaleDateString("en-IN")}</p>
                   <p className="text-[10px] font-bold text-slate-400">{new Date(b.cancelledDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </td>
                <td className="!px-6 !py-5 font-black text-blue-500 text-xs">{b.pnr}</td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.refundAmount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => navigate(`/manager/team-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
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
                    <p className="text-sm font-bold text-slate-400">No cancelled flight records found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

function CancelledHotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const { teamExecutedHotelRequests: hotelBookings } = useSelector((state) => state.manager);

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
  }, [dispatch]);

  const formatted = useMemo(() => {
    return (hotelBookings || []).map(b => {
      const lead = b.travellers?.[0] || b.employee || b.userId || {};
      const guestName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.name || lead.email || "Staff Member";
      
      const executionStatus = (b.executionStatus || "").toLowerCase();
      const amendStatus = (b.amendment?.status || "").toLowerCase();
      const status = mapCancelStatus(amendStatus || executionStatus);
      
      const refundAmount = b.amendment?.response?.RefundedAmount || b.pricingSnapshot?.totalAmount || 0;
      const cancelledDate = b.amendment?.requestedAt || b.updatedAt;

      return {
        ...b,
        guestName,
        employeeId: b.userId?.email || "N/A",
        hotelName: b.hotelRequest?.selectedHotel?.hotelName || b.bookingSnapshot?.hotelName || "N/A",
        city: b.hotelRequest?.selectedHotel?.city || b.bookingSnapshot?.city || "N/A",
        status,
        cancelledDate,
        refundAmount,
        executionStatus,
        amendStatus
      };
    }).filter(b => ["requested", "approved", "success", "refunded", "refund_pending"].includes(b.amendStatus) || ["cancel_requested", "cancelled"].includes(b.executionStatus));
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const statusOk = cancelStatusFilter === "All" || b.status === cancelStatusFilter;
      const cDate = b.cancelledDate ? new Date(b.cancelledDate).toISOString().slice(0, 10) : "";
      return statusOk && (!q || b.guestName.toLowerCase().includes(q) || b.hotelName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q)) &&
             (!startDate || cDate >= startDate) && (!endDate || cDate <= endDate);
    });
  }, [search, startDate, endDate, cancelStatusFilter, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Cancelled Hotels" value={filtered.length} Icon={FiXCircle} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Refunded" value={filtered.filter(b => b.status === "Refunded").length} Icon={FiRefreshCw} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Refund Pending" value={filtered.filter(b => b.status === "Refund Pending").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Refund Value" value={`₹${filtered.reduce((s, b) => s + (b.refundAmount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Cancellation Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Guest Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Status" className="lg:col-span-2">
            <CustomDropdown value={cancelStatusFilter} onChange={setCancelStatus} options={["All", "Cancelled", "Refunded", "Refund Pending"]} />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setCancelStatus("All"); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Hotel Cancellation Registry" subtitle={`${filtered.length} records processed`} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order Reference</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Asset Detail</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Cancelled On</Th>
              <Th className="!px-6 !py-5">Refund Est.</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.guestName}</p>
                   <p className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{b.hotelRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="!px-6 !py-5"><CancelStatusBadge status={b.amendStatus || b.executionStatus} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{new Date(b.cancelledDate).toLocaleDateString("en-IN")}</p>
                   <p className="text-[10px] font-bold text-slate-400">{new Date(b.cancelledDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.refundAmount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => navigate(`/manager/team-hotel-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
                      <FiEye size={16} className="text-[#E7C695] group-hover:scale-110 transition-transform" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No cancelled hotel records found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function CancelledBookingsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loadingTeamExecutedFlightRequests: loadingFlights, loadingTeamExecutedRequests: loadingHotels } = useSelector((state) => state.manager);
  const loadingActive = activeTab === "flight" ? loadingFlights : loadingHotels;
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(activeTab === "flight" ? getTeamExecutedFlightRequests() : getTeamExecutedHotelRequests());
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
                 <FiXCircle size={32} />
               </div>
               <div>
                 <h1 className="text-4xl font-black tracking-tight leading-none">Cancellations</h1>
                 <p className="text-[11px] mt-3 font-bold uppercase tracking-[3px] opacity-60">Inventory of Rescinded Travel Deployments</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-12 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Cancelled Flights", FaPlane], ["hotel", "Cancelled Hotels", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <CancelledFlightSection /> : <CancelledHotelSection />}
      </div>
    </div>
  );
}
