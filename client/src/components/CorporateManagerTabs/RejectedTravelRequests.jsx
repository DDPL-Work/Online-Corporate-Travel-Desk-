import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiXCircle,
  FiEye,
  FiMessageCircle,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiArrowRight,
  FiList,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import {
  getRejectedHotelRequests,
  getRejectedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
import {
  PendingFlightDetailsModal,
  PendingHotelDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import {
  dateCls,
  IdCell,
  LabeledField,
  SearchBar,
  StatCard,
  StatusBadge,
  Th,
  CustomDropdown,
} from "../TravelAdminTabs/Shared/CommonComponents";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { rejectedFlightsExportTemplate, rejectedHotelsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

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

function FlightSection({ data, loading }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  const { exportExcel, isExporting } = useExcelExporter();

  const formatted = useMemo(() => (data || []).map(b => {
    const traveller = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "Staff Member";
    
    const amount = b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? b.flightRequest?.fareSnapshot?.publishedFare ?? 0;

    const segments = b.flightRequest?.segments || [];
    const onwardSegments = segments.filter(s => s.journeyType === "onward");
    const returnSegments = segments.filter(s => s.journeyType === "return");
    
    const buildLeg = (segs) => {
      if (!segs.length) return null;
      const first = segs[0]; 
      const last = segs[segs.length - 1];
      return {
        fromCode: (first?.origin?.code || first?.origin?.airportCode) || "N/A",
        toCode: (last?.destination?.code || last?.destination?.airportCode) || "N/A",
        fromCity: first?.origin?.city || "Unknown",
        toCity: last?.destination?.city || "Unknown"
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

    return { 
      ...b, 
      travellerName: traveller, 
      employeeId: b.requesterDetails?.email || b.userId?.email || "—", 
      status: "Rejected", 
      amount, 
      bookedDate: b.createdAt,
      routes,
      airline,
      rejectedDate: b.rejectedAt
    };
  }), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const rejDate = b.rejectedDate ? new Date(b.rejectedDate).toISOString().slice(0, 10) : "";
      return (!q || b.travellerName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q) || b.employeeId.toLowerCase().includes(q)) &&
             (!startDate || rejDate >= startDate) && (!endDate || rejDate <= endDate);
    });
  }, [search, startDate, endDate, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Rejected Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Total Amount" value={`₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Avg. Response" value="2.4h" Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Rejections" value={filtered.length} Icon={FiXCircle} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="PNR, Name or ID..." />
          </LabeledField>
          <LabeledField label="Rejection Window" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-4">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Flight Rejection Ledger" 
        subtitle={`${filtered.length} requests rejected`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Rejection Ledger",
          statCards: [
            { label: "Rejected Flights", value: filtered.length },
            { label: "Total Estimated Amount", value: `₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}` },
            { label: "Avg. Response", value: "2.4h" },
            { label: "Total Rejections", value: filtered.length }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Rejection Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: rejectedFlightsExportTemplate,
          filenamePrefix: "rejected_flights"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Rejected On</Th>
              <Th className="!px-6 !py-5">Amount</Th>
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
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.rejectedDate ? new Date(b.rejectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{b.rejectedDate ? new Date(b.rejectedDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => setSelectedRequest(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
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
                    <p className="text-sm font-bold text-slate-400">No rejected flight requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selectedRequest && <PendingFlightDetailsModal booking={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}

function HotelSection({ data, loading }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  const { exportExcel, isExporting } = useExcelExporter();

  const formatted = useMemo(() => (data || []).map(b => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "Staff Member";
    
    const amount = b.hotelRequest?.selectedRoom?.Price?.totalFare || b.hotelRequest?.allRooms?.[0]?.totalFare || b.bookingSnapshot?.amount || 0;

    return { 
      ...b, 
      guestName: guest, 
      employeeId: b.requesterDetails?.email || b.userId?.email || "—", 
      status: "Rejected", 
      amount, 
      bookedDate: b.createdAt,
      hotelName: b.hotelRequest?.selectedHotel?.hotelName || "N/A",
      city: b.hotelRequest?.selectedHotel?.city || "N/A",
      rejectedDate: b.rejectedAt
    };
  }), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const rejDate = b.rejectedDate ? new Date(b.rejectedDate).toISOString().slice(0, 10) : "";
      return (!q || b.guestName.toLowerCase().includes(q) || b.hotelName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q) || b.employeeId.toLowerCase().includes(q)) &&
             (!startDate || rejDate >= startDate) && (!endDate || rejDate <= endDate);
    });
  }, [search, startDate, endDate, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Rejected Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Total Amount" value={`₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Total Rejections" value={filtered.length} Icon={FiXCircle} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
        <StatCard label="Total Loss" value={`₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`} Icon={FiMessageCircle} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Guest Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Rejection Window" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-4">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Rejection Ledger" 
        subtitle={`${filtered.length} requests rejected`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Rejection Ledger",
          statCards: [
            { label: "Rejected Hotels", value: filtered.length },
            { label: "Total Estimated Amount", value: `₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}` },
            { label: "Total Rejections", value: filtered.length },
            { label: "Total Loss", value: `₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Rejection Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: rejectedHotelsExportTemplate,
          filenamePrefix: "rejected_hotels"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order Reference</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Hotel Name</Th>
              <Th className="!px-6 !py-5">Rejected On</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.guestName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{b.hotelRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.rejectedDate ? new Date(b.rejectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{b.rejectedDate ? new Date(b.rejectedDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                    <button onClick={() => setSelectedRequest(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
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
                    <p className="text-sm font-bold text-slate-400">No rejected hotel requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selectedRequest && <PendingHotelDetailsModal booking={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}

export default function RejectedTravelRequestsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { rejectedHotelRequests, rejectedFlightRequests, loadingRejectedRequests, loadingRejectedFlightRequests } = useSelector((state) => state.manager);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (activeTab === "flight") dispatch(getRejectedFlightRequests());
    else dispatch(getRejectedHotelRequests());
  }, [activeTab, dispatch]);

  const loadingActive = activeTab === "flight" ? loadingRejectedFlightRequests : loadingRejectedRequests;

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(activeTab === "flight" ? getRejectedFlightRequests() : getRejectedHotelRequests());
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
               <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl text-white border border-white/20 bg-white/10 backdrop-blur-md" >
                 <FiXCircle size={32} />
               </div>
               <div>
                 <h1 className="text-4xl font-black tracking-tight leading-none">Team Rejected Requests</h1>
                 <p className="text-[11px] mt-3 font-bold uppercase tracking-[3px] opacity-60">View all the rejected requests (Hotel & Flight) which were done by your team</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-12 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Requests", FaPlane], ["hotel", "Hotel Requests", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>
        {activeTab === "flight" ? (
          <FlightSection data={rejectedFlightRequests} loading={loadingRejectedFlightRequests} />
        ) : (
          <HotelSection data={rejectedHotelRequests} loading={loadingRejectedRequests} />
        )}
      </div>
    </div>
  );
}
