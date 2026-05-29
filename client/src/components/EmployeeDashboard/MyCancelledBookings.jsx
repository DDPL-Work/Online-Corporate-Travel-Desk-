// client/src/components/EmployeeDashboard/MyCancelledBookings.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCalendar,
  FiFilter,
  FiEye,
  FiRefreshCw,
  FiArrowRight,
  FiX,
  FiList,
  FiXCircle,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelBookings } from "../../Redux/Actions/hotelBooking.thunks";
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
  const [cancelStartDate, setCancelStartDate] = useState("");
  const [cancelEndDate, setCancelEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: flightBookings = [], loading } = useSelector((state) => state.bookings);

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const cancelledFlights = useMemo(() => {
    return (flightBookings || []).filter(b => b.executionStatus === "cancel_requested" || b.executionStatus === "cancelled")
      .map(b => {
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
        return { ...b, status: "Cancelled", pnr: b.bookingResult?.pnr || b.bookingResult?.ticketResponse?.pnr || "-", amount: b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0, bookedDate: b.createdAt, cancelledOn: b.updatedAt, reason: b.cancellationReason || b.cancelReason || b.amendment?.reason || b.flightRequest?.cancellationReason || b.amendment?.remark || "—", routes, airline: segments[0] ? { airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode, airlineName: segments[0].airlineName || segments[0].airline?.airlineName } : null };
      }).sort((a,b) => new Date(b.cancelledOn) - new Date(a.cancelledOn));
  }, [flightBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledFlights.filter(b => {
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      const cancelledDate = b.cancelledOn ? new Date(b.cancelledOn).toISOString().slice(0, 10) : "";
      return (!q || b.pnr?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q)) &&
             (!startDate || booked === startDate) &&
             (!cancelStartDate || cancelledDate >= cancelStartDate) && (!cancelEndDate || cancelledDate <= cancelEndDate);
    });
  }, [search, startDate, cancelStartDate, cancelEndDate, cancelledFlights]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.role === "travel-admin";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LabeledField label={<><FiSearch size={10} /> Search Voided Trips</>}>
            <SearchBar value={search} onChange={setSearch} placeholder="PNR, Order ID..." />
          </LabeledField>
          <LabeledField label="Booked On">
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${dateCls} w-full`} style={{ borderColor: C.border }} />
          </LabeledField>
          <LabeledField label="Cancelled Window">
             <div className="flex items-center gap-2">
                <input type="date" value={cancelStartDate} onChange={e => setCancelStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={cancelEndDate} onChange={e => setCancelEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end">
             <button onClick={() => { setSearch(""); setStartDate(""); setCancelStartDate(""); setCancelEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Cancellation Ledger" 
        subtitle={`${filtered.length} terminated bookings`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Cancellation Ledger",
          statCards: [
            { label: "Terminated Bookings", value: filtered.length }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Booked On", value: startDate || "Any" },
            { label: "Cancelled Window", value: `${cancelStartDate || "Any"} to ${cancelEndDate || "Any"}` }
          ],
          data: filtered,
          columns: [
            { header: "Order ID", key: "orderId" },
            { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
            { header: "Cancelled On", value: (r) => r.cancelledOn ? new Date(r.cancelledOn).toLocaleDateString("en-IN") : "—" },
            { header: "Status", key: "status" },
            { header: "PNR Ref", key: "pnr" },
            ...(isAdmin ? [{ header: "Original Fare", value: (r) => `₹${r.amount.toLocaleString()}` }] : [{ header: "Reason", key: "reason" }])
          ],
          filenamePrefix: "my_cancelled_flights"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order ID</Th>
              <Th className="px-6! py-5!">Route</Th>
              <Th className="px-6! py-5!">Cancelled On</Th>
              <Th className="px-6! py-5!">Status</Th>
              <Th className="px-6! py-5!">PNR Ref</Th>
              {isAdmin ? <Th className="px-6! py-5!">Original Fare</Th> : <Th className="px-6! py-5!">Reason</Th>}
              <Th className="px-6! py-5! text-left!">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="px-6! py-5!"><IdCell id={b.orderId} /></td>
                <td className="px-6! py-5!"><RouteCell routes={b.routes} airline={b.airline} /></td>
                <td className="px-6! py-5! text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.cancelledOn)}</td>
                <td className="px-6! py-5!"><StatusBadge status="cancelled" /></td>
                <td className="px-6! py-5! font-black text-slate-400 text-xs line-through">{b.pnr}</td>
                {isAdmin ? (
                  <td className="px-6! py-5! font-black text-xs text-slate-400">₹{b.amount.toLocaleString()}</td>
                ) : (
                  <td className="px-6! py-5! text-xs font-medium text-slate-600 capitalize truncate max-w-[120px]" title={b.reason}>{b.reason}</td>
                )}
                <td className="px-6! py-5! text-left!">
                    <button onClick={() => navigate(`/my-cancelled-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-6! py-20! text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiXCircle size={32} /></div><p className="text-sm font-bold text-slate-400">No cancelled flights found.</p></div></td></tr>
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
  const [cancelStartDate, setCancelStartDate] = useState("");
  const [cancelEndDate, setCancelEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { completed: hotelBookings = [], loading } = useSelector((state) => state.hotelBookings);

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { dispatch(fetchMyHotelBookings()); }, [dispatch]);

  const cancelledHotels = useMemo(() => {
    return (hotelBookings || []).filter(b => b?.amendment?.status === "requested" || b?.amendment?.status === "cancelled")
      .map(b => {
        const hotelName = b.bookingSnapshot?.hotelName || "Unknown Hotel";
        const city = b.bookingSnapshot?.city || "—";
        const ci = b.bookingSnapshot?.checkInDate;
        return { ...b, hotelName, city, ci, amount: b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0, cancelledOn: b.amendment?.requestedAt || b.updatedAt, reason: b.amendment?.reason || b.cancellationReason || b.cancelReason || b.amendment?.remark || "—" };
      }).sort((a,b) => new Date(b.cancelledOn) - new Date(a.cancelledOn));
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledHotels.filter(b => {
      const booked = b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "";
      const cancelledDate = b.cancelledOn ? new Date(b.cancelledOn).toISOString().slice(0, 10) : "";
      return (!q || b.hotelName?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q)) &&
             (!startDate || booked === startDate) &&
             (!cancelStartDate || cancelledDate >= cancelStartDate) && (!cancelEndDate || cancelledDate <= cancelEndDate);
    });
  }, [search, startDate, cancelStartDate, cancelEndDate, cancelledHotels]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.role === "travel-admin";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LabeledField label={<><FiSearch size={10} /> Search Voided Stays</>}>
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Booked On">
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${dateCls} w-full`} style={{ borderColor: C.border }} />
          </LabeledField>
          <LabeledField label="Cancelled Window">
             <div className="flex items-center gap-2">
                <input type="date" value={cancelStartDate} onChange={e => setCancelStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={cancelEndDate} onChange={e => setCancelEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end">
             <button onClick={() => { setSearch(""); setStartDate(""); setCancelStartDate(""); setCancelEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Cancellation Ledger" 
        subtitle={`${filtered.length} terminated stays`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Cancellation Ledger",
          statCards: [
            { label: "Terminated Stays", value: filtered.length }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Booked On", value: startDate || "Any" },
            { label: "Cancelled Window", value: `${cancelStartDate || "Any"} to ${cancelEndDate || "Any"}` }
          ],
          data: filtered,
          columns: [
            { header: "Order ID", key: "orderId" },
            { header: "Hotel", key: "hotelName" },
            { header: "Cancelled On", value: (r) => r.cancelledOn ? new Date(r.cancelledOn).toLocaleDateString("en-IN") : "—" },
            { header: "Status", value: () => "Cancelled" },
            ...(isAdmin ? [{ header: "Original Fare", value: (r) => `₹${r.amount.toLocaleString()}` }] : [{ header: "Reason", key: "reason" }])
          ],
          filenamePrefix: "my_cancelled_hotels"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order ID</Th>
              <Th className="px-6! py-5!">Hotel Detail</Th>
              <Th className="px-6! py-5!">Cancelled On</Th>
              <Th className="px-6! py-5!">Status</Th>
              {isAdmin ? <Th className="px-6! py-5!">Original Fare</Th> : <Th className="px-6! py-5!">Reason</Th>}
              <Th className="px-6! py-5! text-left!">Action</Th>
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
                <td className="px-6! py-5! text-[11px] font-bold text-[#003399] uppercase">{fmtDate(b.cancelledOn)}</td>
                <td className="px-6! py-5!"><StatusBadge status="cancelled" /></td>
                {isAdmin ? (
                  <td className="px-6! py-5! font-black text-xs text-slate-400">₹{b.amount.toLocaleString()}</td>
                ) : (
                  <td className="px-6! py-5! text-xs font-medium text-slate-600 capitalize truncate max-w-[120px]" title={b.reason}>{b.reason}</td>
                )}
                <td className="px-6! py-5! text-left!">
                    <button onClick={() => navigate(`/my-cancelled-hotel-booking/${b._id}`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6! py-20! text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiXCircle size={32} /></div><p className="text-sm font-bold text-slate-400">No cancelled stays found.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

export default function MyCancelledBookings() {
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
    try { await Promise.all([dispatch(fetchMyBookings()), dispatch(fetchMyHotelBookings())]); } finally { setIsSyncing(false); }
  };

  const isLoading = flightLoading || hotelLoading || isSyncing;

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
             <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiXCircle size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Cancelled Bookings</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Archive of Terminated Travel Assets and Refund Status Tracking</p>
               </div>
             </div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Voided Flights", FaPlane], ["hotel", "Voided Stays", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#003399] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}