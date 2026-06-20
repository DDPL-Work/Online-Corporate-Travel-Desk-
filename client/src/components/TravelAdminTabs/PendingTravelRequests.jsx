import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

import { 
  FiClock, 
  FiCheck, 
  FiList, 
  FiRefreshCw, 
  FiSearch, 
  FiXCircle, 
  FiArrowRight, 
  FiActivity,
  FiX
} from "react-icons/fi";
import { FaHotel, FaPlane, FaRupeeSign, FaExchangeAlt } from "react-icons/fa";
import {
  fetchApprovals,
  approveApproval,
  rejectApproval,
  transferApproval,
} from "../../Redux/Actions/approval.thunks";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import { fetchEmployees } from "../../Redux/Slice/employeeActionSlice";
import Swal from "sweetalert2";
import PendingHotelDetailsModal, {
  PendingFlightDetailsModal,
} from "./Modal/PendingHotelDetailsModal";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  IdCell,
  SearchBar,
  selectCls,
  Th,
  CustomDropdown,
  dateCls,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { C } from "../Shared/color";
import { airlineLogo } from "../../utils/formatter";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminPendingFlightRequestsExportTemplate, adminPendingHotelRequestsExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";
import CancellationReissueApprovalPanel from "../CancellationReissueApprovalPanel";

/* ─────────────────────────────────────────────────────────────── */
/*  Shared Components for both sections                            */
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

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-Component: PendingFlightSection                            */
/* ─────────────────────────────────────────────────────────────── */
function PendingFlightSection({ requests, onAction, refreshing, employeeOptions, onSelect }) {
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = r.employee.toLowerCase().includes(q) || 
                           r.employeeId.toLowerCase().includes(q) || 
                           r.orderId.toLowerCase().includes(q) || 
                           (r.bookingRef && r.bookingRef.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && r.employee !== empFilter) return false;
      if (dateFrom && new Date(r.bookedDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(r.bookedDate) > dTo) return false;
      }
      return true;
    });
  }, [requests, search, empFilter, dateFrom, dateTo]);

  // We rely on exportConfig on ResponsiveDataTable instead of a custom handleExport
  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Pending Flights" value={filtered.length} Icon={FaPlane} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Awaiting Review" value={filtered.length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Critical/Expired" value={filtered.filter(r => r.isTravelPassed).length} Icon={FiXCircle} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Est. Commitment" value={`₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Reference, Name or ID..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Fulfillment Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Flight Queue" 
        subtitle={`${filtered.length} records awaiting action`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Flight Queue",
          statCards: [
            { label: "Pending Flights", value: filtered.length },
            { label: "Awaiting Review", value: filtered.length },
            { label: "Critical/Expired", value: filtered.filter(r => r.isTravelPassed).length },
            { label: "Est. Commitment", value: `₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Personnel", value: empFilter },
            { label: "Fulfillment Window", value: `${dateFrom || "Any"} to ${dateTo || "Any"}` }
          ],
          data: filtered,
          columns: adminPendingFlightRequestsExportTemplate,
          filenamePrefix: "pending_flight_requests"
        })}
        wrapperClass="!border-none !shadow-none"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order ID</Th>
              <Th className="px-6! py-5!">Personnel</Th>
              <Th className="px-6! py-5!">Route</Th>
              <Th className="px-6! py-5!">Email Identifier</Th>
              <Th className="px-6! py-5!">Status</Th>
              <Th className="px-6! py-5!">Requested Date & Time</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((r, i) => {
              const isDiscarded = r.isTravelPassed && r.status === "pending_approval";
              return (
                <tr key={r.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray, opacity: isDiscarded ? 0.6 : 1 }}>
                  <td className="px-6! py-5!"><IdCell id={r.orderId} /></td>
                  <td className="px-6! py-5!">
                     <p className="text-xs font-black" style={{ color: C.navy }}>{r.employee}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{r.originalData?.flightRequest?.purposeOfTravel}</p>
                  </td>
                  <td className="px-6! py-5!">
                    <RouteCell routes={r.routes} airline={r.airline} />
                  </td>
                  <td className="px-6! py-5!">
                     <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{r.employeeId}</span>
                  </td>
                  <td className="px-6! py-5!">
                     {isDiscarded ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border" style={{ background: C.offWhite, color: C.muted, borderColor: C.border }}>Expired</span>
                     ) : (
                        <StatusBadge status={r.status} />
                     )}
                  </td>
                  <td className="px-6! py-5!">
                     <p className="text-[11px] font-black text-slate-700">{r.bookedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{r.bookedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{r.estimatedCost.toLocaleString()}</td>
                  <td className="px-6! py-5! text-center">
                    <button 
                      onClick={() => onSelect(r)} 
                      disabled={isDiscarded} 
                      className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="px-6! py-20! text-center">
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

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-Component: PendingHotelSection                             */
/* ─────────────────────────────────────────────────────────────── */
function PendingHotelSection({ requests, onAction, refreshing, employeeOptions, onSelect }) {
  const [search, setSearch] = useState("");
  const [empFilter, setEmp] = useState("All Employees");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = r.employee.toLowerCase().includes(q) || 
                           r.employeeId.toLowerCase().includes(q) || 
                           r.orderId.toLowerCase().includes(q) || 
                           (r.bookingRef && r.bookingRef.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (empFilter !== "All Employees" && r.employee !== empFilter) return false;
      if (dateFrom && new Date(r.bookedDate) < new Date(dateFrom)) return false;
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23, 59, 59, 999);
        if (new Date(r.bookedDate) > dTo) return false;
      }
      return true;
    });
  }, [requests, search, empFilter, dateFrom, dateTo]);

  // We rely on exportConfig on ResponsiveDataTable instead of a custom handleExport
  const { exportExcel, isExporting } = useExcelExporter();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Pending Hotels" value={filtered.length} Icon={FaHotel} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
        <StatCard label="Awaiting Review" value={filtered.length} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
        <StatCard label="Critical/Expired" value={filtered.filter(r => r.isTravelPassed).length} Icon={FiXCircle} borderCls="border-rose-500" iconBgCls="bg-rose-50" iconColorCls="text-rose-600" />
        <StatCard label="Est. Commitment" value={`₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}`} Icon={FaRupeeSign} borderCls="border-violet-500" iconBgCls="bg-violet-50" iconColorCls="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <LabeledField label={<><FiSearch size={10} /> Manifest Search</>} className="lg:col-span-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Reference, Name or ID..." />
          </LabeledField>
          <LabeledField label="Personnel" className="lg:col-span-3">
            <CustomDropdown value={empFilter} onChange={setEmp} options={employeeOptions} />
          </LabeledField>
          <LabeledField label="Fulfillment Window" className="lg:col-span-3">
             <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                <span className="text-slate-300">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
             </div>
          </LabeledField>
          <div className="flex items-end lg:col-span-2">
             <button onClick={() => { setSearch(""); setEmp("All Employees"); setDateFrom(""); setDateTo(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset Filters</button>
          </div>
        </div>
      </div>

      <ResponsiveDataTable 
        title="Hotel Queue" 
        subtitle={`${filtered.length} records awaiting action`} 
        exportLabel="Export Excel"
        exportLoading={isExporting}
        exportDisabled={isExporting}
        onExport={() => exportExcel({
          pageHeader: "Hotel Queue",
          statCards: [
            { label: "Pending Hotels", value: filtered.length },
            { label: "Awaiting Review", value: filtered.length },
            { label: "Critical/Expired", value: filtered.filter(r => r.isTravelPassed).length },
            { label: "Est. Commitment", value: `₹${filtered.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}` }
          ],
          appliedFilters: [
            { label: "Search", value: search || "None" },
            { label: "Personnel", value: empFilter },
            { label: "Fulfillment Window", value: `${dateFrom || "Any"} to ${dateTo || "Any"}` }
          ],
          data: filtered,
          columns: adminPendingHotelRequestsExportTemplate,
          filenamePrefix: "pending_hotel_requests"
        })}
        wrapperClass="!border-none !shadow-none"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <Th className="px-6! py-5!">Order Reference</Th>
              <Th className="px-6! py-5!">Personnel</Th>
              <Th className="px-6! py-5!">Email Identifier</Th>
              <Th className="px-6! py-5!">Asset Detail</Th>
              <Th className="px-6! py-5!">Requested Date & Time</Th>
              <Th className="px-6! py-5!">Status</Th>
              <Th className="px-6! py-5!">Amount</Th>
              <Th className="px-6! py-5! text-center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((r, i) => {
              const isDiscarded = r.isTravelPassed && r.status === "pending_approval";
              return (
                <tr key={r.id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray, opacity: isDiscarded ? 0.6 : 1 }}>
                  <td className="px-6! py-5!"><IdCell id={r.orderId} /></td>
                  <td className="px-6! py-5!">
                     <p className="text-xs font-black" style={{ color: C.navy }}>{r.employee}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{r.originalData?.hotelRequest?.purposeOfTravel}</p>
                  </td>
                  <td className="px-6! py-5!">
                     <span className="text-[11px] font-bold font-mono px-2 py-1 rounded" style={{ background: C.offWhite, color: C.navy }}>{r.employeeId}</span>
                  </td>
                  <td className="px-6! py-5!">
                     <p className="text-xs font-black" style={{ color: C.navy }}>{r.hotelName}</p>
                     <p className="text-[10px] font-bold text-gold uppercase">{r.city}</p>
                  </td>
                  <td className="px-6! py-5!">
                     <p className="text-[11px] font-black text-slate-700">{r.bookedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{r.bookedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-6! py-5!">
                     {isDiscarded ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border" style={{ background: C.offWhite, color: C.muted, borderColor: C.border }}>Expired</span>
                     ) : (
                        <StatusBadge status={r.status} />
                     )}
                  </td>
                  <td className="px-6! py-5! font-black text-xs" style={{ color: C.navy }}>₹{r.estimatedCost.toLocaleString()}</td>
                  <td className="px-6! py-5! text-center">
                    <button 
                      onClick={() => onSelect(r)} 
                      disabled={isDiscarded} 
                      className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-linear-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="px-6! py-20! text-center">
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

/* ─────────────────────────────────────────────────────────────── */
/*  Main Component: PendingTravelRequests                          */
/* ─────────────────────────────────────────────────────────────── */
export default function PendingTravelRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");

  const { list, loading: reduxLoading } = useSelector((state) => state.approvals);
  const { corporate } = useSelector((state) => state.corporateAdmin);
  const { employees } = useSelector((state) => state.employeeAction);
  
  const [activeTab, setActiveTab] = useState(typeQuery === "hotel" ? "hotel" : "flight");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        dispatch(fetchApprovals({ status: "pending_approval" })),
        dispatch(fetchCorporateAdmin()),
        dispatch(fetchEmployees()),
      ]);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    dispatch(fetchApprovals({ status: "pending_approval" }));
    dispatch(fetchCorporateAdmin());
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
    return list.map((b) => {
      const isHotel = b.bookingType === "hotel";
      const isFlight = b.bookingType === "flight";
      const estimatedCost = (() => {
        if (isHotel) {
          // 1. Try pricingSnapshot first as it's the primary captured amount
          if (b.pricingSnapshot?.totalAmount) return b.pricingSnapshot.totalAmount;
          if (b.bookingSnapshot?.amount) return b.bookingSnapshot.amount;

          const hr = b.hotelRequest || {};
          const sr = hr.selectedRoom || {};
          
          // 2. Try total fare including tax from the selected room
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
        if (isFlight) return b.pricingSnapshot?.totalAmount || b.bookingSnapshot?.amount || b.flightRequest?.fareSnapshot?.publishedFare || 0;
        return 0;
      })();

      const common = {
        id: b._id, 
        orderId: b.orderId || "N/A", 
        bookingRef: b.bookingReference, 
        type: b.bookingType,
        status: b.requestStatus || "pending_approval",
        employee: b.userId?.name ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim() : "Employee",
        employeeId: b.userId?.email || "—", 
        bookedDate: b.createdAt ? new Date(b.createdAt) : new Date(), 
        estimatedCost, 
        originalData: b, 
        isTravelPassed: isHotel ? Boolean(b.hotelRequest?.checkInDate && new Date() > new Date(b.hotelRequest.checkInDate))
          : Boolean(b.flightRequest?.segments?.[0]?.departureDateTime && new Date() > new Date(b.flightRequest.segments[0].departureDateTime)),
      };

      if (isHotel) {
        const hotelReq = b.hotelRequest || {};
        return { 
          ...common, 
          hotelName: hotelReq.selectedHotel?.hotelName || "N/A", 
          city: hotelReq.selectedHotel?.city || "N/A", 
          checkIn: hotelReq.checkInDate, 
          checkOut: hotelReq.checkOutDate, 
          roomName: hotelReq.selectedRoom?.rawRoomData?.Name?.[0] || "Standard Room" 
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
          fromCity: first?.origin?.city || first?.origin?.airportCode || "N/A", 
          toCity: last?.destination?.city || last?.destination?.airportCode || "N/A", 
          fromCode: first?.origin?.airportCode || "", 
          toCode: last?.destination?.airportCode || "" 
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
        cityFrom: onwardSegments[0]?.origin?.city || segments[0]?.origin?.city || "N/A", 
        cityTo: (returnLeg ? returnLeg.toCity : onwardLeg?.toCity) || segments[segments.length - 1]?.destination?.city || "N/A", 
        pnr: b.bookingReference?.substring(0, 6).toUpperCase() || "N/A", 
        routes,
        airline
      };
    });
  }, [list]);

  const handleAction = async (id, type, action, comments = "") => {
    const isApprove = action === "approve";
    if (isApprove) {
      const request = requests.find((r) => r.id === id);
      const estimatedCost = request?.estimatedCost || 0;
      let currentCorp = corporate;
      if (!currentCorp) { 
        try { 
          currentCorp = await dispatch(fetchCorporateAdmin()).unwrap(); 
        } catch { 
          Swal.fire("Error", "Balance verification failed.", "error"); return; 
        } 
      }
      if (currentCorp) {
        const { classification, walletBalance, creditLimit, creditUtilization } = currentCorp;
        if (classification === "prepaid") {
          if (walletBalance < estimatedCost) { 
            Swal.fire("Insufficient Balance", `Wallet (₹${walletBalance?.toLocaleString()}) < Amount (₹${estimatedCost.toLocaleString()})`, "error"); return; 
          }
        } else if (classification === "postpaid") {
          const availableCredit = creditLimit - (creditLimit * creditUtilization / 100);
          if (availableCredit < estimatedCost) { 
            Swal.fire("Insufficient Credit", `Credit (₹${availableCredit.toLocaleString()}) < Amount (₹${estimatedCost.toLocaleString()})`, "error"); return; 
          }
        }
      }
    }

    dispatch(isApprove ? approveApproval({ id, type, comments }) : rejectApproval({ id, comments, type }))
      .unwrap().then(() => { 
        Swal.fire("Success", `Request ${action}d`, "success"); 
        handleRefresh();
      })
      .catch(err => Swal.fire("Error", err || "Update failed", "error"));
  };

  const handleTransfer = async (id, type, secondApproverId, remark) => {
    try {
      await dispatch(transferApproval({ id, secondApproverId, remark, type })).unwrap();
      Swal.fire("Success", "Request transferred successfully", "success");
      setSelectedRequest(null);
      handleRefresh();
    } catch (err) {
      Swal.fire("Error", err || "Transfer failed", "error");
    }
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
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
             
             <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiClock size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Authorization Queue</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Review and Authorize Corporate Travel Requirements and Deployment Authorization
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit flex-wrap">
           {[["flight", "Flight Queue", FaPlane], ["hotel", "Hotel Queue", FaHotel], ["cancel-reissue", "Cancel / Reissue", FaExchangeAlt]].map(([k, lbl, Icon]) => (
              <button 
                 key={k} 
                 onClick={() => setActiveTab(k)} 
                 className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
              >
                 <Icon size={14} /> {lbl}
              </button>
           ))}
        </div>

        {activeTab === "flight" ? (
          <PendingFlightSection 
            requests={requests.filter(r => r.type === "flight")} 
            onAction={handleAction}
            refreshing={isSyncing}
            employeeOptions={allCorporateEmployees}
            onSelect={setSelectedRequest}
          />
        ) : activeTab === "cancel-reissue" ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <FaExchangeAlt size={16} className="text-[#003399]" />
              Cancellation & Reissue Approvals
            </h3>
            <CancellationReissueApprovalPanel role="travel-admin" />
          </div>
        ) : (
          <PendingHotelSection 
            requests={requests.filter(r => r.type === "hotel")} 
            onAction={handleAction}
            refreshing={isSyncing}
            employeeOptions={allCorporateEmployees}
            onSelect={setSelectedRequest}
          />
        )}
      </div>

      {selectedRequest && selectedRequest.type === "flight" && (
        <PendingFlightDetailsModal 
          booking={selectedRequest.originalData} 
          onClose={() => setSelectedRequest(null)} 
          onApprove={(id, type, action, comments) => { handleAction(id, type, action, comments); setSelectedRequest(null); }} 
          onReject={(id, type, action, comments) => { handleAction(id, type, action, comments); setSelectedRequest(null); }} 
          onTransfer={(secondApproverId, remark, type) => handleTransfer(selectedRequest.id, type, secondApproverId, remark)}
          isDiscarded={selectedRequest.isTravelPassed} 
        />
      )}

      {selectedRequest && selectedRequest.type === "hotel" && (
        <PendingHotelDetailsModal 
          booking={selectedRequest.originalData} 
          onClose={() => setSelectedRequest(null)} 
          onApprove={(id, type, action, comments) => { handleAction(id, type, action, comments); setSelectedRequest(null); }} 
          onReject={(id, type, action, comments) => { handleAction(id, type, action, comments); setSelectedRequest(null); }} 
          onTransfer={(secondApproverId, remark, type) => handleTransfer(selectedRequest.id, type, secondApproverId, remark)}
          isDiscarded={selectedRequest.isTravelPassed} 
        />
      )}
    </div>
  );
}
