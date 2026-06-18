import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  FiCheckCircle,
  FiClock,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiArrowRight,
  FiActivity,
  FiFilter
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
} from "../../Redux/Actions/approval.thunks";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import {
  PendingFlightDetailsModal,
  PendingHotelDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import {
  LabeledField,
  StatCard,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
  beautifyStatus,
  ExecStatusBadge
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { airlineLogo } from "../../utils/formatter";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";

const FLIGHT_EXCLUDE = new Set(["ticketed", "cancel_requested", "cancelled", "TICKET_GENERATED", "COMPLETED"]);
const HOTEL_EXCLUDE = new Set(["voucher_generated", "cancelled", "COMPLETED"]);

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
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{airlineName}</span>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────────────────── */
/* FLIGHT APPROVALS SECTION                                                      */
/* ───────────────────────────────────────────────────────────────────────────── */
function FlightApprovalsSection({ requests, refreshing, employeeOptions }) {
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [execFilter, setExec] = useState("All Statuses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(null);

  const execStatuses = useMemo(() => ["All Statuses", ...new Set(requests.map((a) => a.executionStatus).filter(Boolean))], [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = r.employee.toLowerCase().includes(q) || 
                           r.employeeId.toLowerCase().includes(q) || 
                           r.orderId.toLowerCase().includes(q) || 
                           (r.bookingRef && r.bookingRef.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && r.employee !== empFilter) return false;
      if (execFilter !== "All Statuses" && r.executionStatus !== execFilter) return false;
      if (dateFrom && new Date(r.bookedDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(r.bookedDate) > dTo) return false;
      }
      return true;
    });
  }, [requests, search, empFilter, execFilter, dateFrom, dateTo]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Approved Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Needs Ticketing" value={filtered.filter(a => a.executionStatus === "not_started").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Failed" value={filtered.filter(a => a.executionStatus === "failed").length} Icon={FiX} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Estimated Cost" value={`₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search</>} className="lg:col-span-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Reference, Route or Name..." />
          </LabeledField>
          <LabeledField label="Employee Name" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Status" className="lg:col-span-3">
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <div className="flex items-end lg:col-span-3">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setExec("All Statuses"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Matrix</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Flight Fulfillment Queue" 
        subtitle={`${filtered.length} approved flights`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Fulfillment Queue",
          statCards: [
            { label: "Approved Flights", value: filtered.length },
            { label: "Needs Ticketing", value: filtered.filter(a => a.executionStatus === "not_started").length },
            { label: "Failed", value: filtered.filter(a => a.executionStatus === "failed").length },
            { label: "Estimated Cost", value: `₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Employee Name", value: empFilter },
            { label: "Status", value: execFilter },
            { label: "From Date", value: dateFrom || "Any" },
            { label: "To Date", value: dateTo || "Any" }
          ],
          data: filtered,
          columns: [
            { header: "Order ID", key: "orderId" },
            { header: "Personnel", key: "employee" },
            { header: "Email Identifier", key: "employeeId" },
            { header: "Route", value: (r) => r.routes?.length > 0 ? `${r.routes[0]?.fromCode} → ${r.routes[r.routes.length-1]?.toCode}` : "—" },
            { header: "Status", key: "executionStatus" },
            { header: "Amount", value: (r) => `₹${r.estimatedCost.toLocaleString()}` },
          ],
          filenamePrefix: "approved_flight_requests"
        })} 
        wrapperClass="!border-none !shadow-none"
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Request ID</Th>
              <Th className="px-6! py-5!">Employee Name</Th>
              <Th className="px-6! py-5!">Route</Th>
              <Th className="px-6! py-5!">Email</Th>
              <Th className="px-6! py-5! text-center">Status</Th>
              <Th className="px-6! py-5!">Approved Date & Time</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="px-6! py-5!"><IdCell id={r.orderId} /></td>
                <td className="px-6! py-5!">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{r.employee}</p>
                </td>
                <td className="px-6! py-5!">
                  <RouteCell routes={r.routes} airline={r.airline} />
                </td>
                <td className="px-6! py-5!">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{r.employeeId}</span>
                </td>
                <td className="px-6! py-5! text-center">
                   <ExecStatusBadge status={r.executionStatus} />
                </td>
                <td className="px-6! py-5!">
                   <p className="text-[11px] font-black text-slate-700">{r.bookedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{r.bookedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{r.estimatedCost.toLocaleString()}</td>
                <td className="px-6! py-5! text-center">
                  <button onClick={() => setSelected(r.originalData)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                    <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6! py-20! text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <FiSearch size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No approved flight requests matching criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selected && createPortal(<PendingFlightDetailsModal booking={selected} onClose={() => setSelected(null)} />, document.body)}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* HOTEL APPROVALS SECTION                                                       */
/* ───────────────────────────────────────────────────────────────────────────── */
function HotelApprovalsSection({ requests, refreshing, employeeOptions }) {
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [execFilter, setExec] = useState("All Statuses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(null);

  const execStatuses = useMemo(() => ["All Statuses", ...new Set(requests.map((a) => a.executionStatus).filter(Boolean))], [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = r.employee.toLowerCase().includes(q) || 
                           r.employeeId.toLowerCase().includes(q) || 
                           r.orderId.toLowerCase().includes(q) || 
                           (r.bookingRef && r.bookingRef.toLowerCase().includes(q)) ||
                           (r.hotelName && r.hotelName.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && r.employee !== empFilter) return false;
      if (execFilter !== "All Statuses" && r.executionStatus !== execFilter) return false;
      if (dateFrom && new Date(r.bookedDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(r.bookedDate) > dTo) return false;
      }
      return true;
    });
  }, [requests, search, empFilter, execFilter, dateFrom, dateTo]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Approved Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Needs Booking" value={filtered.filter(a => a.executionStatus === "not_started").length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Failed" value={filtered.filter(a => a.executionStatus === "failed").length} Icon={FiX} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Estimated Cost" value={`₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Search</>} className="lg:col-span-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Hotel, Personnel or Ref..." />
          </LabeledField>
          <LabeledField label="Employee Name" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Status" className="lg:col-span-3">
            <CustomDropdown value={execFilter} onChange={setExec} options={execStatuses} />
          </LabeledField>
          <div className="flex items-end lg:col-span-3">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setExec("All Statuses"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Matrix</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Fulfillment Queue" 
        subtitle={`${filtered.length} approved hotels`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Fulfillment Queue",
          statCards: [
            { label: "Approved Hotels", value: filtered.length },
            { label: "Needs Booking", value: filtered.filter(a => a.executionStatus === "not_started").length },
            { label: "Failed", value: filtered.filter(a => a.executionStatus === "failed").length },
            { label: "Estimated Cost", value: `₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Employee Name", value: empFilter },
            { label: "Status", value: execFilter },
            { label: "From Date", value: dateFrom || "Any" },
            { label: "To Date", value: dateTo || "Any" }
          ],
          data: filtered,
          columns: [
            { header: "Order Reference", key: "orderId" },
            { header: "Personnel", key: "employee" },
            { header: "Email Identifier", key: "employeeId" },
            { header: "Hotel", key: "hotelName" },
            { header: "Status", key: "executionStatus" },
            { header: "Amount", value: (r) => `₹${r.estimatedCost.toLocaleString()}` },
          ],
          filenamePrefix: "approved_hotel_requests"
        })} 
        wrapperClass="!border-none !shadow-none"
        pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Request ID</Th>
              <Th className="px-6! py-5!">Employee Name</Th>
              <Th className="px-6! py-5!">Hotel Name</Th>
              <Th className="px-6! py-5!">Email</Th>
              <Th className="px-6! py-5! text-center">Status</Th>
              <Th className="px-6! py-5!">Approved Date & Time</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                <td className="px-6! py-5!"><IdCell id={r.orderId} /></td>
                <td className="px-6! py-5!">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{r.employee}</p>
                </td>
                <td className="px-6! py-5!">
                   <p className="text-xs font-black" style={{ color: C.navy }}>{r.hotelName}</p>
                   <p className="text-[10px] font-bold text-gold uppercase">{r.city}</p>
                </td>
                <td className="px-6! py-5!">
                   <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{r.employeeId}</span>
                </td>
                <td className="px-6! py-5! text-center">
                   <ExecStatusBadge status={r.executionStatus} />
                </td>
                <td className="px-6! py-5!">
                   <p className="text-[11px] font-black text-slate-700">{r.bookedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{r.bookedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{r.estimatedCost.toLocaleString()}</td>
                <td className="px-6! py-5! text-center">
                  <button onClick={() => setSelected(r.originalData)} className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
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
                    <p className="text-sm font-bold text-slate-400">No approved hotel requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {selected && createPortal(<PendingHotelDetailsModal booking={selected} onClose={() => setSelected(null)} />, document.body)}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* ROOT                                                                          */
/* ───────────────────────────────────────────────────────────────────────────── */
export default function ApprovedTravelRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const approvals = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);
  const { employees } = useSelector((state) => state.employeeAction);

  const [activeTab, setActiveTab] = useState("flight");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        dispatch(fetchApprovals({ status: "approved" })),
        dispatch(fetchEmployees()),
      ]);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    dispatch(fetchApprovals({ status: "approved" }));
    dispatch(fetchEmployees());
  }, [dispatch]);

  const allCorporateEmployees = useMemo(() => {
    const names = new Set(employees.map(e => {
       if (typeof e.name === "string") return e.name;
       return `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim();
    }));
    return ["All Employees", ...Array.from(names).sort()];
  }, [employees]);

  const requests = useMemo(() => {
    return approvals.map((b) => {
      const isHotel = b.bookingType === "hotel";
      const isFlight = b.bookingType === "flight";
      const estimatedCost = (() => {
        if (isHotel) {
          if (b.pricingSnapshot?.totalAmount) return b.pricingSnapshot.totalAmount;
          if (b.bookingSnapshot?.amount) return b.bookingSnapshot.amount;
          const hr = b.hotelRequest || {};
          const sr = hr.selectedRoom || {};
          if (sr.Price?.totalFare) return sr.Price.totalFare;
          if (sr.totalFare && sr.totalTax) return sr.totalFare + sr.totalTax;
          if (sr.totalFare) return sr.totalFare;
          if (Array.isArray(sr.rawRoomData)) {
            return sr.rawRoomData.reduce((sum, room) => sum + (room.TotalFare || room.Price?.totalFare || 0), 0);
          }
          if (sr.rawRoomData?.TotalFare) return sr.rawRoomData.TotalFare;
          if (sr.rawRoomData?.Price?.totalFare) return sr.rawRoomData.Price.totalFare;
          return 0;
        }
        return b.pricingSnapshot?.totalAmount || b.bookingSnapshot?.amount || b.flightRequest?.fareSnapshot?.publishedFare || 0;
      })();

      const common = {
        id: b._id, 
        orderId: b.orderId || "N/A", 
        bookingRef: b.bookingReference, 
        type: b.bookingType,
        executionStatus: b.executionStatus || "not_started",
        employee: b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim() : "Employee",
        employeeId: b.userId?.email || "—", 
        bookedDate: b.approvedAt ? new Date(b.approvedAt) : (b.createdAt ? new Date(b.createdAt) : new Date()), 
        estimatedCost, 
        originalData: b, 
      };

      if (isHotel) {
        const hotelReq = b.hotelRequest || {};
        return { 
          ...common, 
          hotelName: hotelReq.selectedHotel?.hotelName || "N/A", 
          city: hotelReq.selectedHotel?.city || "N/A", 
        };
      }

      const segments = b.flightRequest?.segments || [];
      const onwardSegments = segments.filter(s => s.journeyType === "onward");
      const returnSegments = segments.filter(s => s.journeyType === "return");
      const buildLeg = (segs, label) => {
        if (!segs.length) return null;
        const first = segs[0]; 
        const last = segs[segs.length - 1];
        return { 
          label, 
          fromCity: first?.origin?.city || (first?.origin?.code || first?.origin?.airportCode) || "N/A", 
          toCity: last?.destination?.city || (last?.destination?.code || last?.destination?.airportCode) || "N/A", 
          fromCode: (first?.origin?.code || first?.origin?.airportCode) || "", 
          toCode: (last?.destination?.code || last?.destination?.airportCode) || "" 
        };
      };
      const routes = []; 
      const onwardLeg = buildLeg(onwardSegments, "Onward"); 
      const returnLeg = buildLeg(returnSegments, "Return");
      if (onwardLeg) routes.push(onwardLeg); 
      if (returnLeg) routes.push(returnLeg);
      if (!routes.length) { 
        const fallbackLeg = buildLeg(segments, "Route"); 
        if (fallbackLeg) routes.push(fallbackLeg); 
      }

      const airline = segments[0] ? { 
        airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode, 
        airlineName: segments[0].airlineName || segments[0].airline?.airlineName 
      } : null;

      return { 
        ...common, 
        routes,
        airline
      };
    }).filter(r => {
      if (r.type === "flight") return !FLIGHT_EXCLUDE.has(r.executionStatus);
      if (r.type === "hotel") return !HOTEL_EXCLUDE.has(r.executionStatus);
      return true;
    });
  }, [approvals]);

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
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
                 <FiCheckCircle size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Approved Requests</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   View and process approved travel requests
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
           {[["flight", "Approved Flights", FaPlane], ["hotel", "Approved Hotels", FaHotel]].map(([k, lbl, Icon]) => (
             <button key={k} onClick={() => setActiveTab(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={14} /> {lbl}
             </button>
           ))}
        </div>

        {activeTab === "flight" ? (
          <FlightApprovalsSection requests={requests.filter(r => r.type === "flight")} refreshing={isSyncing} employeeOptions={allCorporateEmployees} />
        ) : (
          <HotelApprovalsSection requests={requests.filter(r => r.type === "hotel")} refreshing={isSyncing} employeeOptions={allCorporateEmployees} />
        )}
      </div>
    </div>
  );
}
