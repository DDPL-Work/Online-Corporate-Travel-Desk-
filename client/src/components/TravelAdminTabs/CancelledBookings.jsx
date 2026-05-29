import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiXCircle,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiClock,
  FiX,
  FiEye,
  FiArrowRight,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  getAllFlightBookingsAdmin,
  getCancelledHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  DualCell,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminCancelledFlightsExportTemplate, adminCancelledHotelsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";

const mapCancelStatus = (status) => {
  if (status === "refunded") return "Refunded";
  if (status === "refund_pending") return "Refund Pending";
  return "Cancelled";
};

const CancelStatusBadgeLocal = ({ status }) => {
  const map = {
    Refunded: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    "Refund Pending": { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    Cancelled: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  };
  const s = map[status] || map.Cancelled;
  return (
    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm" style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      {status}
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

function CancelledFlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { flightBookings, loading } = useSelector((state) => state.adminBooking);
  const { employees } = useSelector((state) => state.employeeAction);
  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { 
    dispatch(getAllFlightBookingsAdmin()); 
    dispatch(fetchEmployees());
  }, [dispatch]);

  const allCorporateEmployees = useMemo(() => {
    return ["All", ...new Set(employees.map(e => typeof e.name === "string" ? e.name : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim()))];
  }, [employees]);

  const cancelledFlights = useMemo(() => {
    return (flightBookings || []).map(b => {
      const traveller = b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}` : "Staff Member";
      const status = b.executionStatus;
      const cancelStatus = b.amendment?.status;

      // Route Logic
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

      return { 
        ...b, 
        travellerName: traveller, 
        employeeId: b.userId?.email || "—", 
        status, 
        cancelStatus, 
        refundAmount: b.amendment?.response?.Response?.RefundedAmount || b.pricingSnapshot?.totalAmount || 0, 
        pnr: b.bookingResult?.pnr || "-", 
        bookedDate: b.createdAt,
        routes,
        airline
      };
    }).filter(b => b.status === "cancel_requested" || b.status === "cancelled" || b.status === "refunded" || b.status === "refund_pending");
  }, [flightBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledFlights.filter(b => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.status);
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";
      
      return (cancelStatusFilter === "All" || displayStatus === cancelStatusFilter) &&
             (empFilter === "All" || b.travellerName === empFilter) &&
             (!startDate || booked >= startDate) && 
             (!endDate || booked <= endDate) &&
             (!q || b.travellerName?.toLowerCase().includes(q) || b.employeeId?.toLowerCase().includes(q) || b.pnr?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q));
    });
  }, [search, cancelStatusFilter, empFilter, startDate, endDate, cancelledFlights]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const totalRefund = filtered.reduce((s, b) => s + (b.refundAmount || 0), 0);

  // We rely on exportConfig on ResponsiveDataTable instead of a custom handleExport

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Cancelled Flights" value={filtered.length} Icon={FiXCircle} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Refunds Resolved" value={filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refunded").length} Icon={FiRefreshCw} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Awaiting Settlement" value={filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Capital Recov." value={`₹${totalRefund.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Name, PNR or ID..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-2">
            <CustomDropdown value={empFilter} onChange={setEmp} options={allCorporateEmployees} />
          </LabeledField>
          <LabeledField label="Settlement Status" className="lg:col-span-2">
            <CustomDropdown value={cancelStatusFilter} onChange={setCancelStatus} options={["All", "Cancelled", "Refunded", "Refund Pending"]} />
          </LabeledField>
          <LabeledField label="Date Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setCancelStatus("All"); setEmp("All"); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Flight Cancellation Ledger" 
        subtitle={`${filtered.length} terminated assets`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Cancellation Ledger",
          statCards: [
            { label: "Cancelled Flights", value: filtered.length },
            { label: "Refunds Resolved", value: filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refunded").length },
            { label: "Awaiting Settlement", value: filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending").length },
            { label: "Total Capital Recov.", value: `₹${totalRefund.toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Personnel", value: empFilter },
            { label: "Settlement Status", value: cancelStatusFilter },
            { label: "Date Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: adminCancelledFlightsExportTemplate,
          filenamePrefix: "cancelled_flight_bookings"
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
              <Th className="!px-6 !py-5">Recovery Status</Th>
              <Th className="!px-6 !py-5">PNR Ref</Th>
              <Th className="!px-6 !py-5">Booking Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
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
                <td className="!px-6 !py-5"><CancelStatusBadgeLocal status={mapCancelStatus(b.cancelStatus || b.status)} /></td>
                <td className="!px-6 !py-5 font-black text-xs text-rose-500">{b.pnr}</td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.refundAmount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-left">
                   <button 
                     onClick={() => navigate(`/employee-flight-booking/${b._id}?source=cancelled`)} 
                     className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group"
                   >
                     <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
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
                    <p className="text-sm font-bold text-slate-400">No termination records found for the selected criteria.</p>
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
  const [empFilter, setEmp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cancelledHotelBookings, loading } = useSelector((state) => state.adminBooking);
  const { employees } = useSelector((state) => state.employeeAction);
  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => { 
    dispatch(getCancelledHotelBookingsAdmin()); 
    dispatch(fetchEmployees());
  }, [dispatch]);

  const allCorporateEmployees = useMemo(() => {
    return ["All", ...new Set(employees.map(e => typeof e.name === "string" ? e.name : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim()))];
  }, [employees]);

  const cancelledHotels = useMemo(() => {
    return (cancelledHotelBookings || []).map(b => {
      const guest = b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}` : "Staff Member";
      const status = b.executionStatus;
      const cancelStatus = b.amendment?.status || b.executionStatus;
      return { ...b, guestName: guest, employeeId: b.userId?.email || "—", cancelStatus, refundAmount: b.amendment?.response?.RefundedAmount || b.pricingSnapshot?.totalAmount || 0, bookedDate: b.createdAt };
    }).filter(b => b.cancelStatus === "requested" || b.cancelStatus === "approved" || b.cancelStatus === "refunded" || b.cancelStatus === "refund_pending");
  }, [cancelledHotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledHotels.filter(b => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.status);
      const booked = b.bookedDate ? new Date(b.bookedDate).toISOString().slice(0, 10) : "";

      return (cancelStatusFilter === "All" || displayStatus === cancelStatusFilter) &&
             (empFilter === "All" || b.guestName === empFilter) &&
             (!startDate || booked >= startDate) && 
             (!endDate || booked <= endDate) &&
             (!q || b.guestName?.toLowerCase().includes(q) || b.employeeId?.toLowerCase().includes(q) || b.orderId?.toLowerCase().includes(q));
    });
  }, [search, cancelStatusFilter, empFilter, startDate, endDate, cancelledHotels]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const totalRefund = filtered.reduce((s, b) => s + (b.refundAmount || 0), 0);

  // We rely on exportConfig on ResponsiveDataTable instead of a custom handleExport

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Cancelled Hotels" value={filtered.length} Icon={FiXCircle} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Refunds Resolved" value={filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refunded").length} Icon={FiRefreshCw} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Awaiting Settlement" value={filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Total Capital Recov." value={`₹${totalRefund.toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Guest Name or Order ID..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-2">
            <CustomDropdown value={empFilter} onChange={setEmp} options={allCorporateEmployees} />
          </LabeledField>
          <LabeledField label="Settlement Status" className="lg:col-span-2">
            <CustomDropdown value={cancelStatusFilter} onChange={setCancelStatus} options={["All", "Cancelled", "Refunded", "Refund Pending"]} />
          </LabeledField>
          <LabeledField label="Date Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setCancelStatus("All"); setEmp("All"); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Cancellation Ledger" 
        subtitle={`${filtered.length} terminated assets`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Cancellation Ledger",
          statCards: [
            { label: "Cancelled Hotels", value: filtered.length },
            { label: "Refunds Resolved", value: filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refunded").length },
            { label: "Awaiting Settlement", value: filtered.filter(b => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending").length },
            { label: "Total Capital Recov.", value: `₹${totalRefund.toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Personnel", value: empFilter },
            { label: "Settlement Status", value: cancelStatusFilter },
            { label: "Date Window", value: `${startDate || "Any"} to ${endDate || "Any"}` }
          ],
          data: filtered,
          columns: adminCancelledHotelsExportTemplate,
          filenamePrefix: "cancelled_hotel_bookings"
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
              <Th className="!px-6 !py-5">Asset Detail</Th>
              <Th className="!px-6 !py-5">Recovery Status</Th>
              <Th className="!px-6 !py-5">Booking Amount</Th>
              <Th className="!px-6 !py-5 !text-left">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((b, i) => (
              <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="!px-6 !py-5"><IdCell id={b.orderId} /></td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.guestName}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{b.hotelRequest?.purposeOfTravel}</p>
                </td>
                <td className="!px-6 !py-5">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{b.employeeId}</span>
                </td>
                <td className="!px-6 !py-5">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{b.hotelRequest?.selectedHotel?.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{b.hotelRequest?.selectedHotel?.city}</p>
                </td>
                <td className="!px-6 !py-5"><CancelStatusBadgeLocal status={mapCancelStatus(b.cancelStatus || b.status)} /></td>
                <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{b.refundAmount.toLocaleString()}</td>
                <td className="!px-6 !py-5 !text-left">
                    <button 
                      onClick={() => navigate(`/employee-hotel-booking/${b._id}?source=cancelled`)} 
                      className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group"
                    >
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
                    <p className="text-sm font-bold text-slate-400">No termination records found for the selected criteria.</p>
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

export default function CancelledBookings() {
  const [activeTab, setActiveTab] = useState("flight");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: reduxLoading } = useSelector((state) => state.adminBooking);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await dispatch(activeTab === "flight" ? getAllFlightBookingsAdmin() : getCancelledHotelBookingsAdmin());
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section - Now Full Width and Top-aligned */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
               >
                 <FiArrowRight className="rotate-180" size={20} />
               </button>
               <button 
                  onClick={handleRefresh} 
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${(isSyncing || reduxLoading) ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={isSyncing || reduxLoading}
               >
                 <div className={(isSyncing || reduxLoading) ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiXCircle size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Cancelled Bookings</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Tracking Cancelled Bookings and Capital Reclamation
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Flight Recov.", FaPlane], ["hotel", "Hotel Recov.", FaHotel]].map(([k, lbl, Icon]) => (
             <button 
                key={k} 
                onClick={() => setActiveTab(k)} 
                className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
             >
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>

        {activeTab === "flight" ? <CancelledFlightSection /> : <CancelledHotelSection />}
      </div>
    </div>
  );
}
