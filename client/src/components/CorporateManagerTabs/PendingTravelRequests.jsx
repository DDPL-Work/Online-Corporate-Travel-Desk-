import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiClock,
  FiCheck,
  FiX,
  FiList,
  FiRefreshCw,
  FiAlertCircle,
  FiXCircle,
  FiSearch,
  FiArrowRight,
} from "react-icons/fi";
import { FaHotel, FaPlane, FaRupeeSign } from "react-icons/fa";
import {
  approveApproval,
  rejectApproval,
  transferApproval,
} from "../../Redux/Actions/approval.thunks";
import {
  getPendingHotelRequests,
  getPendingFlightRequests,
  getMyEmployees,
} from "../../Redux/Actions/manager.thunk";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import Swal from "sweetalert2";
import PendingHotelDetailsModal, {
  PendingFlightDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
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
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { pendingFlightsExportTemplate, pendingHotelsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

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

function FlightSection({ data, loading, onRefresh, handleAction, isVerified, onSelect }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
        fromCode: first?.origin?.airportCode || "N/A",
        toCode: last?.destination?.airportCode || "N/A",
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

    const isTravelPassed = Boolean(segments[0]?.departureDateTime && new Date() > new Date(segments[0].departureDateTime));

    return { 
      ...b, 
      bookingType: "flight",
      travellerName: traveller, 
      employeeId: b.requesterDetails?.email || b.userId?.email || "—", 
      status: b.requestStatus || "pending_approval", 
      amount, 
      bookedDate: b.createdAt,
      routes,
      airline,
      isTravelPassed,
      travelDate: segments[0]?.departureDateTime || b.bookingSnapshot?.travelDate
    };
  }), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const bDate = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.travellerName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q) || b.employeeId.toLowerCase().includes(q)) &&
             (!startDate || bDate >= startDate) && (!endDate || bDate <= endDate);
    });
  }, [search, startDate, endDate, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Pending Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Urgent Review" value={filtered.filter(r => !r.isTravelPassed).length} Icon={FiClock} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Expired/Discarded" value={filtered.filter(r => r.isTravelPassed).length} Icon={FiXCircle} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Potential Outlay" value={`₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Booking Window" className="lg:col-span-4">
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
        title="Flight Approval Queue" 
        subtitle={`${filtered.length} pending decisions`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Approval Queue",
          statCards: [
            { label: "Pending Flights", value: filtered.length },
            { label: "Urgent Review", value: filtered.filter(r => !r.isTravelPassed).length },
            { label: "Expired/Discarded", value: filtered.filter(r => r.isTravelPassed).length },
            { label: "Potential Outlay", value: `₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Booking Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: pendingFlightsExportTemplate,
          filenamePrefix: "pending_flights"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order ID</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Requested On</Th>
              <Th className="!px-6 !py-5">Travel Date</Th>
              <Th className="!px-6 !py-5">Route</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Amount</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className={`hover:bg-slate-100 transition-colors ${b.isTravelPassed ? "opacity-60" : ""}`} style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.travellerName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{b.flightRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{new Date(b.bookedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(b.bookedDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.travelDate ? new Date(b.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-gold uppercase">{b.travelDate ? new Date(b.travelDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </td>
                <td className="!px-6 !py-5">
                   <RouteCell routes={b.routes} airline={b.airline} />
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   {b.isTravelPassed && b.status === "pending_approval" ? <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded border border-slate-200">EXPIRED</span> : b.status === "manager_approved" ? <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2 py-1 rounded border border-amber-200 uppercase tracking-tight">WAITING FOR TRAVEL ADMIN APPROVAL</span> : <StatusBadge status={b.status} />}
                </td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                   {b.status !== "manager_approved" ? (
                    <button onClick={() => onSelect(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
                      <FiList size={16} className="text-[#E7C695] group-hover:scale-110 transition-transform" />
                    </button>
                   ) : (
                     <span className="text-[10px] font-bold text-slate-400 block mt-2">Action Locked</span>
                   )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No pending flight requests found.</p>
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

function HotelSection({ data, loading, onRefresh, handleAction, isVerified, onSelect }) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  const { exportExcel, isExporting } = useExcelExporter();

  const formatted = useMemo(() => (data || []).map(b => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "Staff Member";
    
    const amount = (() => {
      const rooms = b.hotelRequest?.selectedRoom?.rawRoomData || [];
      if (!Array.isArray(rooms)) return 0;
      return rooms.reduce((total, room) => {
        if (room.TotalFare) return total + room.TotalFare;
        if (room.Price?.totalFare) return total + room.Price.totalFare;
        if (Array.isArray(room.DayRates)) {
          return total + room.DayRates.flat().reduce((sum, day) => sum + (day.BasePrice || 0), 0);
        }
        return total;
      }, 0);
    })();

    const isTravelPassed = Boolean(b.hotelRequest?.checkInDate && new Date() > new Date(b.hotelRequest.checkInDate));

    return { 
      ...b, 
      bookingType: "hotel",
      guestName: guest, 
      employeeId: b.requesterDetails?.email || b.userId?.email || "—", 
      status: b.requestStatus || "pending_approval", 
      amount, 
      bookedDate: b.createdAt,
      hotelName: b.hotelRequest?.selectedHotel?.hotelName || "N/A",
      city: b.hotelRequest?.selectedHotel?.city || "N/A",
      isTravelPassed,
      checkIn: b.hotelRequest?.checkInDate
    };
  }), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return formatted.filter(b => {
      const bDate = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      return (!q || b.guestName.toLowerCase().includes(q) || b.hotelName.toLowerCase().includes(q) || (b.orderId || "").toLowerCase().includes(q) || b.employeeId.toLowerCase().includes(q)) &&
             (!startDate || bDate >= startDate) && (!endDate || bDate <= endDate);
    });
  }, [search, startDate, endDate, formatted]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Pending Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Urgent Review" value={filtered.filter(r => !r.isTravelPassed).length} Icon={FiClock} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Expired/Discarded" value={filtered.filter(r => r.isTravelPassed).length} Icon={FiXCircle} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        <StatCard label="Potential Outlay" value={`₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Guest Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Booking Window" className="lg:col-span-4">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-4">
             <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Approval Queue" 
        subtitle={`${filtered.length} pending decisions`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Approval Queue",
          statCards: [
            { label: "Pending Hotels", value: filtered.length },
            { label: "Urgent Review", value: filtered.filter(r => !r.isTravelPassed).length },
            { label: "Expired/Discarded", value: filtered.filter(r => r.isTravelPassed).length },
            { label: "Potential Outlay", value: `₹${filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Booking Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: pendingHotelsExportTemplate,
          filenamePrefix: "pending_hotels"
        })}
        wrapperClass="!border-none !shadow-none" 
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="!px-6 !py-5">Order Reference</Th>
              <Th className="!px-6 !py-5">Personnel</Th>
              <Th className="!px-6 !py-5">Requested On</Th>
              <Th className="!px-6 !py-5">Check-in</Th>
              <Th className="!px-6 !py-5">Email Identifier</Th>
              <Th className="!px-6 !py-5">Asset Detail</Th>
              <Th className="!px-6 !py-5">Status</Th>
              <Th className="!px-6 !py-5">Estimate</Th>
              <Th className="!px-6 !py-5 !text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className={`hover:bg-slate-100 transition-colors ${b.isTravelPassed ? "opacity-60" : ""}`} style={{ background: i % 2 === 0 ? C.white : C.gold + "08" }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.guestName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{b.hotelRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{new Date(b.bookedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(b.bookedDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.checkIn ? new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                   <p className="text-[9px] font-bold text-gold uppercase">{b.checkIn ? "Check-in" : ""}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.city}</p>
                </td>
                <td className="!px-6 !py-5">
                   {b.isTravelPassed && b.status === "pending_approval" ? <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded border border-slate-200">EXPIRED</span> : b.status === "manager_approved" ? <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2 py-1 rounded border border-amber-200 uppercase tracking-tight">WAITING FOR TRAVEL ADMIN APPROVAL</span> : <StatusBadge status={b.status} />}
                </td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.amount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-center">
                   {b.status !== "manager_approved" ? (
                    <button onClick={() => onSelect(b)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-slate-800 group">
                      <FiList size={16} className="text-[#E7C695] group-hover:scale-110 transition-transform" />
                    </button>
                   ) : (
                     <span className="text-[10px] font-bold text-slate-400 block mt-2">Action Locked</span>
                   )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="!px-6 !py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No pending hotel requests found.</p>
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

export default function PendingTravelRequestsForManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    pendingHotelRequests,
    loadingPendingRequests,
    pendingFlightRequests,
    loadingPendingFlightRequests,
  } = useSelector((state) => state.manager);

  const [activeTab, setActiveTab] = useState("flight");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (activeTab === "flight") dispatch(getPendingFlightRequests());
    else dispatch(getPendingHotelRequests());
    dispatch(fetchCorporateAdmin());
    dispatch(getMyEmployees());
  }, [activeTab, dispatch]);

  const loadingActive = activeTab === "flight" ? loadingPendingFlightRequests : loadingPendingRequests;

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(activeTab === "flight" ? getPendingFlightRequests() : getPendingHotelRequests());
    } finally {
      setIsSyncing(false);
    }
  };

  const { corporate } = useSelector((state) => state.corporateAdmin);
  const { user } = useSelector((state) => state.auth);
  const isVerified = user?.managerRequestStatus === "approved";

  const handleAction = async (id, type, action, request, comments = "") => {
    const isApprove = action === "approve";
    if (isApprove) {
      const estimatedCost = (() => {
        if (type === "hotel") {
          const rooms = request?.hotelRequest?.selectedRoom?.rawRoomData || [];
          if (!Array.isArray(rooms)) return 0;
          return rooms.reduce((total, room) => total + (room.TotalFare || room.Price?.totalFare || 0), 0);
        }
        return request?.pricingSnapshot?.totalAmount || request?.bookingSnapshot?.amount || request?.flightRequest?.fareSnapshot?.publishedFare || 0;
      })();

      let currentCorp = corporate;
      if (!currentCorp) {
        try {
          currentCorp = await dispatch(fetchCorporateAdmin()).unwrap();
        } catch (err) {
          Swal.fire("Error", "Could not verify corporate balance.", "error");
          return;
        }
      }
      if (currentCorp) {
        const { classification, walletBalance, creditLimit, creditUtilization } = currentCorp;
        if (classification === "prepaid" && (walletBalance || 0) < estimatedCost) {
          Swal.fire({ title: "Insufficient Balance", text: `Wallet balance (₹${walletBalance.toLocaleString()}) is low.`, icon: "error" });
          return;
        } else if (classification === "postpaid") {
          const available = (creditLimit || 0) - ((creditLimit * (creditUtilization || 0)) / 100);
          if (available < estimatedCost) {
            Swal.fire({ title: "Insufficient Credit", text: `Available credit (₹${available.toLocaleString()}) is low.`, icon: "error" });
            return;
          }
        }
      }
    }

    dispatch(isApprove ? approveApproval({ id, comments, type }) : rejectApproval({ id, comments, type }))
      .unwrap()
      .then(() => {
        Swal.fire("Success", `Request ${action}d successfully`, "success");
        setSelectedRequest(null);
      })
      .catch((err) => Swal.fire("Error", err || "Update failed", "error"));
  };

  const handleTransfer = async (secondApproverId, remark, type) => {
    const bookingId = selectedRequest?._id;
    if (!bookingId) return;
    const bookingType = type || selectedRequest?.bookingType || "hotel";
    try {
      await dispatch(
        transferApproval({ id: bookingId, secondApproverId, remark, type: bookingType })
      ).unwrap();
      Swal.fire("Transferred", "Approval has been transferred successfully.", "success");
      setSelectedRequest(null);
      dispatch(activeTab === "flight" ? getPendingFlightRequests() : getPendingHotelRequests());
    } catch (err) {
      Swal.fire("Error", err || "Transfer failed", "error");
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
                 <FiClock size={32} />
               </div>
               <div>
                 <h1 className="text-4xl font-black tracking-tight leading-none">Approval Queue</h1>
                 <p className="text-[11px] mt-3 font-bold uppercase tracking-[3px] opacity-60">Team Travel Requirement Oversight</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-12 space-y-10">
        {!isVerified && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] px-6 py-5 flex items-center gap-5 shadow-xl animate-bounce-subtle">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
              <FiAlertCircle className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 tracking-tight uppercase">Verification Pending</h3>
              <p className="text-[12px] text-amber-700 mt-1 font-bold">Your account is awaiting Travel Admin verification. Approvals are temporarily locked.</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Requests", FaPlane], ["hotel", "Hotel Requests", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>

        {activeTab === "flight" ? (
          <FlightSection data={pendingFlightRequests} loading={loadingPendingFlightRequests} onRefresh={handleRefresh} handleAction={handleAction} isVerified={isVerified} onSelect={setSelectedRequest} />
        ) : (
          <HotelSection data={pendingHotelRequests} loading={loadingPendingRequests} onRefresh={handleRefresh} handleAction={handleAction} isVerified={isVerified} onSelect={setSelectedRequest} />
        )}
      </div>

      {selectedRequest && (
        selectedRequest.bookingType === "flight" ? (
          <PendingFlightDetailsModal 
            booking={selectedRequest} 
            onClose={() => setSelectedRequest(null)} 
            onApprove={(id, type, action) => handleAction(id, type, action, selectedRequest)} 
            onReject={(id, type, action) => handleAction(id, type, action, selectedRequest)} 
            onTransfer={handleTransfer}
            isVerified={isVerified} 
            isDiscarded={selectedRequest.isTravelPassed} 
          />
        ) : (
          <PendingHotelDetailsModal 
            booking={selectedRequest} 
            onClose={() => setSelectedRequest(null)} 
            onApprove={(id, type, action) => handleAction(id, type, action, selectedRequest)} 
            onReject={(id, type, action) => handleAction(id, type, action, selectedRequest)} 
            onTransfer={handleTransfer}
            isVerified={isVerified} 
            isDiscarded={selectedRequest.isTravelPassed} 
          />
        )
      )}
    </div>
  );
}
