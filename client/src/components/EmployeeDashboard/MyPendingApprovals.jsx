// client/src/components/EmployeeDashboard/MyPendingApprovals.jsx
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
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookingRequests } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelRequests } from "../../Redux/Actions/hotelBooking.thunks";
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
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { myPendingFlightsExportTemplate, myPendingHotelsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

/* ─── helpers ─── */
function fmtDate(d, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("pending_approval");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { myRequests = [], loading } = useSelector((state) => state.bookings);

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { dispatch(fetchMyBookingRequests()); }, [dispatch]);

  const allActiveFlights = useMemo(() => {
    return (myRequests || []).filter(b => {
      const invalidRequestStatus = b.requestStatus === "rejected";
      const invalidExecutionStatus = ["ticketed", "cancelled", "cancel_requested", "failed"].includes((b.executionStatus || "").toLowerCase());
      return !invalidRequestStatus && !invalidExecutionStatus;
    }).map(b => {
      const segments = b.flightRequest?.segments || [];
      const firstOrigin = segments[0]?.origin?.airportCode;
      const lastDest = segments[segments.length - 1]?.destination?.airportCode;
      const isRoundTrip = segments.length > 1 && firstOrigin === lastDest;
      let route = segments.length ? (isRoundTrip ? `${firstOrigin} ↔ ${segments[Math.floor(segments.length/2)-1]?.destination?.airportCode}` : `${firstOrigin} → ${lastDest}`) : "N/A";
      const airlineCode = segments[0]?.airlineCode || "";
      const airlineName = segments[0]?.airlineName || "Flight";
      const logo = airlineLogo(airlineCode);
      return { ...b, route, airlineName, logo, amount: b.pricingSnapshot?.totalAmount || 0, bookedDate: b.createdAt, travelDate: segments[0]?.departureDateTime };
    }).sort((a,b) => new Date(b.bookedDate) - new Date(a.bookedDate));
  }, [myRequests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allActiveFlights.filter(b => {
      if (activeSubTab === "pending_approval") {
        if (!["pending_approval", "pending_second_approval", "manager_approved"].includes(b.requestStatus)) return false;
      } else {
        if (b.requestStatus !== activeSubTab) return false;
      }
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.orderId?.toLowerCase().includes(q) || b.route?.toLowerCase().includes(q)) &&
             (!startDate || booked >= startDate) && (!endDate || booked <= endDate);
    });
  }, [search, startDate, endDate, allActiveFlights, activeSubTab]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const totalPending = allActiveFlights.filter(r => ["pending_approval", "pending_second_approval", "manager_approved"].includes(r.requestStatus)).length;
  const totalApproved = allActiveFlights.filter(r => r.requestStatus === "approved").length;
  const totalPipeline = allActiveFlights.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Requests" value={allActiveFlights.length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Awaiting Approval" value={totalPending} Icon={FiList} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Approved" value={totalApproved} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Total Amount" value={`₹${totalPipeline.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-sm rounded-2xl w-fit">
         <button onClick={() => { setActiveSubTab("pending_approval"); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === "pending_approval" ? "bg-[#003399] text-white shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
            <FiClock size={14} /> Pending Requests
         </button>
         <button onClick={() => { setActiveSubTab("approved"); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === "approved" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
            <FiCheckCircle size={14} /> Approved Requests
         </button>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Order ID, Route..." />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-6">
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
        title={activeSubTab === "pending_approval" ? "Pending Requests" : "Approved Requests"} 
        subtitle={`${filtered.length} requests`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: activeSubTab === "pending_approval" ? "Flight Pending Approval Pipeline" : "Flight Approved Pipeline",
          statCards: [
            { label: "Total Requests", value: allActiveFlights.length },
            { label: "Awaiting Approval", value: totalPending },
            { label: "Approved", value: totalApproved },
            { label: "Total Amount", value: `₹${totalPipeline.toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Date Range", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: myPendingFlightsExportTemplate,
          filenamePrefix: `my_${activeSubTab}_flights`
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Request ID</Th>
              <Th className="!px-6 !py-5">Route / Details</Th>
              <Th className="!px-6 !py-5">Travel Date</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Est. Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                         <img src={b.logo} alt={b.airlineName} className="w-full h-full object-contain" loading="eager" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; }} />
                      </div>
                      <div>
                         <p className="text-xs font-black" style={{ color: C.navy }}>{b.route}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{b.airlineName} Request</p>
                      </div>
                   </div>
                </td>
                <td className="!px-6 !py-5 text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.travelDate)}</td>
                <td className="!px-6 !py-5"><StatusBadge status={b.requestStatus} /></td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-left">
                    <button onClick={() => navigate(`/bookings/${b._id}/book`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiClock size={32} /></div><p className="text-sm font-bold text-slate-400">No {activeSubTab === "pending_approval" ? "pending" : "approved"} flight requests found.</p></div></td></tr>
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
  const [activeSubTab, setActiveSubTab] = useState("pending_approval");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { requests: hotelRequests = [], loading } = useSelector((state) => state.hotelBookings);

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { dispatch(fetchMyHotelRequests()); }, [dispatch]);

  const allActiveHotels = useMemo(() => {
    return (hotelRequests || []).filter(b => {
      const invalidRequestStatus = b.requestStatus === "rejected";
      const invalidExecutionStatus = ["ticketed", "cancelled", "cancel_requested", "failed"].includes((b.executionStatus || "").toLowerCase());
      return !invalidRequestStatus && !invalidExecutionStatus;
    }).map(b => {
      const hotelName = b.bookingSnapshot?.hotelName || b.hotelRequest?.selectedHotel?.hotelName || "Unknown Hotel";
      const city = b.bookingSnapshot?.city || b.hotelRequest?.selectedHotel?.address || "—";
      return { ...b, hotelName, city, amount: b.pricingSnapshot?.totalAmount || 0, bookedDate: b.createdAt, ci: b.hotelRequest?.checkInDate };
    }).sort((a,b) => new Date(b.bookedDate) - new Date(a.bookedDate));
  }, [hotelRequests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allActiveHotels.filter(b => {
      if (activeSubTab === "pending_approval") {
        if (!["pending_approval", "pending_second_approval", "manager_approved"].includes(b.requestStatus)) return false;
      } else {
        if (b.requestStatus !== activeSubTab) return false;
      }
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.hotelName?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q)) &&
             (!startDate || booked >= startDate) && (!endDate || booked <= endDate);
    });
  }, [search, startDate, endDate, allActiveHotels, activeSubTab]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const totalPending = allActiveHotels.filter(r => ["pending_approval", "pending_second_approval", "manager_approved"].includes(r.requestStatus)).length;
  const totalApproved = allActiveHotels.filter(r => r.requestStatus === "approved").length;
  const totalPipeline = allActiveHotels.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Requests" value={allActiveHotels.length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Awaiting Approval" value={totalPending} Icon={FiList} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Approved" value={totalApproved} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Total Amount" value={`₹${totalPipeline.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-sm rounded-2xl w-fit">
         <button onClick={() => { setActiveSubTab("pending_approval"); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === "pending_approval" ? "bg-[#003399] text-white shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
            <FiClock size={14} /> Pending Requests
         </button>
         <button onClick={() => { setActiveSubTab("approved"); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === "approved" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
            <FiCheckCircle size={14} /> Approved Requests
         </button>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Date Range" className="lg:col-span-6">
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
        title={activeSubTab === "pending_approval" ? "Pending Hotel Requests" : "Approved Hotel Requests"} 
        subtitle={`${filtered.length} requests`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: activeSubTab === "pending_approval" ? "Hotel Pending Approval Pipeline" : "Hotel Approved Pipeline",
          statCards: [
            { label: "Total Requests", value: allActiveHotels.length },
            { label: "Awaiting Approval", value: totalPending },
            { label: "Approved", value: totalApproved },
            { label: "Total Amount", value: `₹${totalPipeline.toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Date Range", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: myPendingHotelsExportTemplate,
          filenamePrefix: `my_${activeSubTab}_hotels`
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Request ID</Th>
              <Th className="!px-6 !py-5">Hotel Name</Th>
              <Th className="!px-6 !py-5">Check-In Date</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Est. Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="!px-6 !py-5 text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.ci)}</td>
                <td className="!px-6 !py-5"><StatusBadge status={b.requestStatus} /></td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-left">
                    <button onClick={() => navigate(`/hotel-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiClock size={32} /></div><p className="text-sm font-bold text-slate-400">No {activeSubTab === "pending_approval" ? "pending" : "approved"} hotel requests found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function MyPendingApprovals() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");
  const { loading: flightLoading } = useSelector((state) => state.bookings);
  const { loading: hotelLoading } = useSelector((state) => state.hotelBookings);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { if (typeQuery) setActiveTab(typeQuery === "hotel" ? "hotel" : "flight"); }, [typeQuery]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try { await Promise.all([dispatch(fetchMyBookingRequests()), dispatch(fetchMyHotelRequests())]); } finally { setIsSyncing(false); }
  };

  const isLoading = flightLoading || hotelLoading || isSyncing;

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <button onClick={handleRefresh} className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`} disabled={isLoading}>
                 <div className={isLoading ? "animate-spin" : ""}><FiRefreshCw size={20} /></div>
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center md:items-center gap-4 md:gap-5">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiClock size={24} className="md:w-7 md:h-7" /></div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">Booking Requests</h1>
                 <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">Track all your pending travel requests (Hotel & Flight)</p>
               </div>
             </div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit max-w-full overflow-x-auto">
           {[["flight", "Requested Flights", FaPlane], ["hotel", "Requested Hotels", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-6 md:px-8 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}
