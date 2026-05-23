import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiList,
  FiRefreshCw,
  FiSearch,
  FiArrowRight,
  FiX,
  FiCheckCircle,
  FiCalendar
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import {
  LabeledField,
  StatCard,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
  StatusBadge,
  dateCls,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { airlineLogo } from "../../utils/formatter";
import { C } from "../Shared/color";
import { Pagination } from "./Shared/Pagination";

/* ─────────────────────────────────────────────────────────────── */
/*  Shared Components                                              */
/* ─────────────────────────────────────────────────────────────── */
const RouteCell = ({ routes, airline }) => {
  if (!routes || routes.length === 0) return <span className="text-slate-400">No Route</span>;
  
  const airlineCode = (airline?.airlineCode || "AI").toUpperCase();
  const airlineName = airline?.airlineName || "Airline";
  const logoUrl = airlineLogo(airlineCode);

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
        <img src={logoUrl} 
          alt={airlineName} 
          className="w-full h-full object-contain"
          loading="eager" onError={(e) => { 
            e.target.onerror = null;
            e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; 
          }} 
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            {routes[0].fromCode} → {routes[routes.length - 1].toCode}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
          {airlineName}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────────────────── */
/* FLIGHT SECTION                                                               */
/* ───────────────────────────────────────────────────────────────────────────── */
function FlightSection({ trips, refreshing, employeeOptions }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    return trips.filter(t => {
      const q = search.toLowerCase();
      const matchesSearch = t.employee.toLowerCase().includes(q) || 
                           t.employeeId.toLowerCase().includes(q) || 
                           t.orderId.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && t.employee !== empFilter) return false;
      if (dateFrom && new Date(t.departureDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(t.departureDate) > dTo) return false;
      }
      return true;
    });
  }, [trips, search, empFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Archived Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#003399]" iconBgCls="bg-[#003399]10" iconColorCls="text-[#003399]" />
        <StatCard label="Completed Journeys" value={filtered.length} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Archive Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Name, Reference or Destination..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Travel Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Archive</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Flight History Ledger" subtitle={`${filtered.length} archived deployments`} pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />} wrapperClass="!border-none !shadow-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Travel Date</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5 text-center">Status</Th>
              <Th className="!px-6 !py-5 text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((t, i) => (
              <tr key={t.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={t.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{t.employee}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{t.originalData?.userId?.department || "N/A"}</p>
                </td>
                <td className="!px-6 !py-5">
                  <RouteCell routes={t.routes} airline={t.airline} />
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-[11px] font-black text-slate-700">{new Date(t.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{t.employeeId}</span>
                </td>
                <td className="!px-6 !py-5 text-center"><StatusBadge status={t.status} /></td>
                <td className="!px-6 !py-5 text-center">
                  <button onClick={() => navigate(`/employee-flight-booking/${t.id}?source=past`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                    <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No historical flights found in the archive.</p>
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

/* ───────────────────────────────────────────────────────────────────────────── */
/* HOTEL SECTION                                                                */
/* ───────────────────────────────────────────────────────────────────────────── */
function HotelSection({ trips, refreshing, employeeOptions }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    return trips.filter(t => {
      const q = search.toLowerCase();
      const matchesSearch = t.employee.toLowerCase().includes(q) || 
                           t.employeeId.toLowerCase().includes(q) || 
                           t.destination.toLowerCase().includes(q) ||
                           t.orderId.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && t.employee !== empFilter) return false;
      if (dateFrom && new Date(t.departureDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(t.departureDate) > dTo) return false;
      }
      return true;
    });
  }, [trips, search, empFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Archived Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#003399]" iconBgCls="bg-[#003399]10" iconColorCls="text-[#003399]" />
        <StatCard label="Completed Stays" value={filtered.length} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Archive Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel, Guest or Order ID..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Stay Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Archive</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable title="Hotel History Ledger" subtitle={`${filtered.length} archived stays`} pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />} wrapperClass="!border-none !shadow-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Asset Detail</Th>
              <Th className="!px-6 !py-5">Duration</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5 text-center">Status</Th>
              <Th className="!px-6 !py-5 text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((t, i) => (
              <tr key={t.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={t.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{t.employee}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{t.originalData?.userId?.department || "N/A"}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{t.destination}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{t.city}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-[11px] font-black text-slate-700">{new Date(t.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(t.returnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{t.employeeId}</span>
                </td>
                <td className="!px-6 !py-5 text-center"><StatusBadge status={t.status} /></td>
                <td className="!px-6 !py-5 text-center">
                  <button onClick={() => navigate(`/employee-hotel-booking/${t.id}?source=past`)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                    <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No archived hotel stays found.</p>
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

/* ───────────────────────────────────────────────────────────────────────────── */
/* ROOT                                                                          */
/* ───────────────────────────────────────────────────────────────────────────── */
export default function PastTrips() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { flightBookings, hotelBookings, loading } = useSelector((state) => state.adminBooking);
  const { employees } = useSelector((state) => state.employeeAction);

  const [activeTab, setActiveTab] = useState("flight");
  const [isSyncing, setIsSyncing] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        dispatch(getAllFlightBookingsAdmin()),
        dispatch(getAllHotelBookingsAdmin()),
        dispatch(fetchEmployees()),
      ]);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
    dispatch(getAllHotelBookingsAdmin());
    dispatch(fetchEmployees());
  }, [dispatch]);

  const allCorporateEmployees = useMemo(() => {
    const names = new Set(employees.map(e => {
       if (typeof e.name === "string") return e.name;
       return `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim();
    }));
    return ["All Employees", ...Array.from(names).sort()];
  }, [employees]);

  const flightTrips = useMemo(() => {
    return (flightBookings || []).map(b => {
      const segs = b.flightRequest?.segments || [];
      const onwardSegments = segs.filter(s => s.journeyType === "onward");
      const returnSegments = segs.filter(s => s.journeyType === "return");
      const first = segs[0] || {};
      const departureDate = first.departureDateTime || b.bookingSnapshot?.travelDate;
      const travelKey = departureDate ? new Date(departureDate).toISOString().slice(0, 10) : null;
      const exec = (b.executionStatus || "").toLowerCase();
      const isConfirmed = exec === "ticketed" || exec === "confirmed" || exec === "booked" || exec === "voucher_generated";
      
      if (!travelKey || !isConfirmed || travelKey >= today) return null;

      const buildLeg = (sgs, label) => {
        if (!sgs.length) return null;
        const f = sgs[0]; const l = sgs[sgs.length - 1];
        return { label, fromCity: f?.origin?.city || f?.origin?.airportCode, toCity: l?.destination?.city || l?.destination?.airportCode, fromCode: f?.origin?.airportCode, toCode: l?.destination?.airportCode };
      };
      const routes = [];
      const onLeg = buildLeg(onwardSegments, "Onward"); if (onLeg) routes.push(onLeg);
      const reLeg = buildLeg(returnSegments, "Return"); if (reLeg) routes.push(reLeg);
      if (!routes.length) { const flb = buildLeg(segs, "Route"); if (flb) routes.push(flb); }

      const airline = segs[0] ? { airlineCode: segs[0].airlineCode || segs[0].airline?.airlineCode, airlineName: segs[0].airlineName || segs[0].airline?.airlineName } : null;

      return { id: b._id, orderId: b.orderId, employee: b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim() : "Staff Member", employeeId: b.userId?.email || "—", departureDate, status: "Completed", originalData: b, routes, airline };
    }).filter(Boolean);
  }, [flightBookings, today]);

  const hotelTrips = useMemo(() => {
    return (hotelBookings || []).map(b => {
      const checkIn = b.bookingSnapshot?.checkInDate || b.hotelRequest?.checkInDate || b.checkInDate;
      const ci = checkIn ? new Date(checkIn).toISOString().slice(0, 10) : null;
      const exec = (b.executionStatus || "").toLowerCase();
      const isConfirmed = exec === "voucher_generated" || exec === "confirmed" || exec === "booked";
      
      if (!isConfirmed || !ci || ci >= today) return null;

      return { id: b._id, orderId: b.orderId, employee: b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim() : "Staff Member", employeeId: b.userId?.email || "—", destination: b.hotelRequest?.selectedHotel?.hotelName || b.bookingSnapshot?.hotelName || "N/A", city: b.hotelRequest?.selectedHotel?.city || b.bookingSnapshot?.city || "N/A", departureDate: checkIn, returnDate: b.bookingSnapshot?.checkOutDate || b.hotelRequest?.checkOutDate, status: "Completed", originalData: b };
    }).filter(Boolean);
  }, [hotelBookings, today]);

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                 <FiArrowRight className="rotate-180" size={20} />
               </button>
               <button onClick={handleRefresh} className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${(isSyncing || loading) ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`} disabled={isSyncing || loading}>
                 <div className={(isSyncing || loading) ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiList size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Historical Archives</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Validated Registry of Completed Corporate Travel Missions
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Archive", FaPlane], ["hotel", "Hotel Archive", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>

        {activeTab === "flight" ? (
          <FlightSection trips={flightTrips} refreshing={isSyncing} employeeOptions={allCorporateEmployees} />
        ) : (
          <HotelSection trips={hotelTrips} refreshing={isSyncing} employeeOptions={allCorporateEmployees} />
        )}
      </div>
    </div>
  );
}
