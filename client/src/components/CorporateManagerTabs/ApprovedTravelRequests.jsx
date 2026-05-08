import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel } from "react-icons/fa";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import {
  FiHome,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiX,
  FiRefreshCw,
  FiList,
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
  selectCls,
  Th,
  TraceTimer,
  getSegCity,
  ExecStatusBadge,
} from "./Shared/CommonComponents";
import { formatDate } from "../../utils/formatter";
import { Pagination } from "./Shared/Pagination";
import TableScrollWrapper from "../common/TableScrollWrapper";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS FILTERING
// Flights  → exclude: ticketed | cancel_requested | cancelled
// Hotels   → exclude: voucher_generated | cancelled
// ─────────────────────────────────────────────────────────────────────────────
const FLIGHT_EXCLUDE = new Set(["ticketed", "cancel_requested", "cancelled"]);
const HOTEL_EXCLUDE = new Set(["voucher_generated", "cancelled"]);

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "—";

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const diff = outDate - inDate;

  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
};

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT APPROVALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function FlightApprovalsSection({
  rawApprovals,
  traceTimers,
  loading,
  onCountChange,
}) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 10;

  const flightRaw = useMemo(
    () =>
      rawApprovals.filter(
        (a) =>
          a.bookingType === "flight" && !FLIGHT_EXCLUDE.has(a.executionStatus),
      ),
    [rawApprovals],
  );

  const execStatuses = useMemo(
    () => [
      "All",
      ...new Set(flightRaw.map((a) => a.executionStatus).filter(Boolean)),
    ],
    [flightRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flightRaw.filter((a) => {
      const segs = a.flightRequest?.segments || [];
      const route =
        segs.length > 0
          ? `${getSegCity(segs[0], "origin")} ${getSegCity(segs[segs.length - 1], "destination")}`
          : "";
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const fOk = !startDate || new Date(a.approvedAt) >= new Date(startDate);
      const tOk = !endDate || new Date(a.approvedAt) <= new Date(endDate);
      const qOk =
        !q ||
        a.orderId?.toLowerCase().includes(q) ||
        a.bookingReference?.toLowerCase().includes(q) ||
        a.purposeOfTravel?.toLowerCase().includes(q) ||
        route.toLowerCase().includes(q) ||
        `${a.userId?.name?.firstName} ${a.userId?.name?.lastName}`
          .toLowerCase()
          .includes(q);
      return eOk && fOk && tOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, flightRaw]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, execFilter]);

  useEffect(() => {
    onCountChange(filtered.length);
  }, [filtered.length, onCountChange]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Approved Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Execution Pending"
          value={notStarted}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Execution Failed"
          value={failed}
          Icon={FiX}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Requests">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Ref, Name, Route..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStart(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEnd(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Travel Date">
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Execution">
              <select
                value={execFilter}
                onChange={(e) => setExec(e.target.value)}
                className={selectCls}
              >
                {execStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Flight Approval Queue"
        subtitle={`${filtered.length} requests pending execution`}
        tableMinWidth="1100px"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
        footer={
          <div className="px-6 py-3 flex justify-between items-center bg-slate-50 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A4D68] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Route</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Airline</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Travel Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Exec Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaPlane className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Approvals Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No approved flight requests match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((a, i) => {
                const segs = a.flightRequest?.segments || [];
                const route =
                  segs.length > 0
                    ? `${segs[0].origin?.airportCode || "—"} → ${segs[segs.length - 1].destination?.airportCode || "—"}`
                    : a.bookingSnapshot?.sectors?.join(", ") || "—";
                const airline =
                  a.bookingSnapshot?.airline || segs[0]?.airlineName || "—";
                const leadTraveller = a.travellers?.find(
                  (t) => t.isLeadPassenger,
                );
                const emp = leadTraveller
                  ? `${leadTraveller.firstName} ${leadTraveller.lastName}`
                  : "—";

                return (
                  <tr
                    key={a._id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                        {a.orderId || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-[13px]">{emp}</span>
                        <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{a.purposeOfTravel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-black text-slate-900">
                      {route}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                      {airline}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-500">
                      {formatDate(
                        a.bookingSnapshot?.travelDate ||
                          segs[0]?.departureDateTime,
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">₹{(a.pricingSnapshot?.totalAmount || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <ExecStatusBadge status={a.executionStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => setSelected(a)}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>

      {selected && (
        <FlightBookingModal
          booking={selected}
          traceTimers={traceTimers}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL APPROVALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function HotelApprovalsSection({ rawApprovals, loading, onCountChange }) {
  const [search, setSearch] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [execFilter, setExec] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 10;

  const hotelRaw = useMemo(
    () =>
      rawApprovals.filter(
        (a) =>
          a.bookingType === "hotel" && !HOTEL_EXCLUDE.has(a.executionStatus),
      ),
    [rawApprovals],
  );

  const execStatuses = useMemo(
    () => [
      "All",
      ...new Set(hotelRaw.map((a) => a.executionStatus).filter(Boolean)),
    ],
    [hotelRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hotelRaw.filter((a) => {
      const hotelName = a.hotelRequest?.selectedHotel?.hotelName || "";
      const eOk = execFilter === "All" || a.executionStatus === execFilter;
      const fOk = !startDate || new Date(a.approvedAt) >= new Date(startDate);
      const tOk = !endDate || new Date(a.approvedAt) <= new Date(endDate);
      const qOk =
        !q ||
        a.orderId?.toLowerCase().includes(q) ||
        a.bookingReference?.toLowerCase().includes(q) ||
        hotelName.toLowerCase().includes(q) ||
        a.purposeOfTravel?.toLowerCase().includes(q) ||
        `${a.userId?.name?.firstName} ${a.userId?.name?.lastName}`
          .toLowerCase()
          .includes(q);
      return eOk && fOk && tOk && qOk;
    });
  }, [search, startDate, endDate, execFilter, hotelRaw]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, execFilter]);

  useEffect(() => {
    onCountChange(filtered.length);
  }, [filtered.length, onCountChange]);

  const totalCost = filtered.reduce(
    (s, a) => s + (a.pricingSnapshot?.totalAmount || 0),
    0,
  );
  const notStarted = filtered.filter(
    (a) => a.executionStatus === "not_started",
  ).length;
  const failed = filtered.filter((a) => a.executionStatus === "failed").length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Approved Hotels"
          value={filtered.length}
          Icon={FiHome}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Execution Pending"
          value={notStarted}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Execution Failed"
          value={failed}
          Icon={FiX}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Requests">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Hotel, Ref, Name..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStart(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEnd(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Check-In">
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="Execution">
              <select
                value={execFilter}
                onChange={(e) => setExec(e.target.value)}
                className={selectCls}
              >
                {execStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Hotel Approval Queue"
        subtitle={`${filtered.length} requests pending execution`}
        tableMinWidth="1100px"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
        footer={
          <div className="px-6 py-3 flex justify-between items-center bg-slate-50 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{paginated.length}</span> of <span className="text-slate-900">{filtered.length}</span> entries
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#088395] text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Hotel</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Check-In</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Check-Out</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Exec Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaHotel className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Approvals Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No approved hotel requests match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((a, i) => {
                const hotel = a.hotelRequest?.selectedHotel || {};
                const leadTraveller = a.travellers?.find((t) => t.isLeadPassenger);
                const emp = leadTraveller
                  ? `${leadTraveller.firstName} ${leadTraveller.lastName}`
                  : "—";
                const amount =
                  a.hotelRequest?.selectedRoom?.rawRoomData?.[0]?.Price?.totalFare ||
                  a.hotelRequest?.selectedRoom?.price?.totalFare ||
                  0;

                return (
                  <tr
                    key={a._id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                        {a.orderId || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-[13px]">{emp}</span>
                        <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{a.purposeOfTravel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-[13px] line-clamp-1">{hotel.hotelName || "—"}</span>
                        <span className="text-[11px] text-slate-400 font-bold">{hotel.address?.split(",")[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                      {formatDate(a.hotelRequest?.checkInDate)}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                      {formatDate(a.hotelRequest?.checkOutDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">₹{amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <ExecStatusBadge status={a.executionStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => setSelected(a)}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>

      {selected && (
        <HotelBookingModal
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function ApprovedTravelRequestsForManager() {
  const [activeTab, setActiveTab] = useState("flight");
  const [traceTimers, setTimers] = useState({});

  const dispatch = useDispatch();
  const {
    approvedHotelRequests,
    loadingApprovedRequests,
    approvedFlightRequests,
    loadingApprovedFlightRequests,
  } = useSelector((state) => state.manager);

  const [flightCount, setFlightCount] = useState(0);
  const [hotelCount, setHotelCount] = useState(0);

  useEffect(() => {
    if (activeTab === "flight") {
      dispatch(getApprovedFlightRequests());
    } else {
      dispatch(getApprovedHotelRequests());
    }
  }, [activeTab, dispatch]);

  // Initial count calculation (optional, but good for UX)
  useEffect(() => {
    setFlightCount(
      (approvedFlightRequests || []).filter(
        (a) => !FLIGHT_EXCLUDE.has(a.executionStatus),
      ).length,
    );
  }, [approvedFlightRequests]);

  useEffect(() => {
    setHotelCount(
      (approvedHotelRequests || []).filter(
        (a) => !HOTEL_EXCLUDE.has(a.executionStatus),
      ).length,
    );
  }, [approvedHotelRequests]);

  useEffect(() => {
    if (!approvedFlightRequests?.length) {
      setTimers({});
      return undefined;
    }
    const interval = setInterval(() => {
      const updated = {};
      approvedFlightRequests.forEach((a) => {
        const exp = a.flightRequest?.fareExpiry;
        if (!exp) return;
        const diff = new Date(exp.$date || exp) - new Date();
        if (diff <= 0) {
          updated[a._id] = "expired";
          return;
        }
        const h = Math.floor(diff / 3600000),
          m = Math.floor((diff % 3600000) / 60000),
          s = Math.floor((diff % 60000) / 1000);
        updated[a._id] = `${h}h ${m}m ${s}s`;
      });
      setTimers(updated);
    }, 1000);
    return () => clearInterval(interval);
  }, [approvedFlightRequests]);

  const loadingActive =
    activeTab === "flight"
      ? loadingApprovedFlightRequests
      : loadingApprovedRequests;

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getApprovedFlightRequests());
      return;
    }
    dispatch(getApprovedHotelRequests());
  };

  const tabs = [
    {
      id: "flight",
      label: "Flight Approvals",
      Icon: FaPlane,
      count: flightCount,
      activeText: "text-[#0A4D68]",
      activeBorder: "border-b-[#0A4D68]",
    },
    {
      id: "hotel",
      label: "Hotel Approvals",
      Icon: FiHome,
      count: hotelCount,
      activeText: "text-[#088395]",
      activeBorder: "border-b-[#088395]",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
              <FiCheckCircle size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Approved Requests
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Approved bookings pending execution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loadingActive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={loadingActive ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all
                  ${
                    active
                      ? `bg-white ${tab.activeText} shadow-md`
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }
                `}
              >
                <tab.Icon size={14} />
                {tab.label}
                <span className={`
                  px-2 py-0.5 rounded-full text-[10px] font-black
                  ${active ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-400"}
                `}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "flight" ? (
          <FlightApprovalsSection
            rawApprovals={approvedFlightRequests || []}
            traceTimers={traceTimers}
            loading={loadingApprovedFlightRequests}
            onCountChange={setFlightCount}
          />
        ) : (
          <HotelApprovalsSection
            rawApprovals={approvedHotelRequests || []}
            loading={loadingApprovedRequests}
            onCountChange={setHotelCount}
          />
        )}
      </div>
    </div>
  );
}
