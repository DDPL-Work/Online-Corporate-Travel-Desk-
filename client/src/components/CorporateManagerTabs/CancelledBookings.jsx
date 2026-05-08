import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import {
  FiSearch,
  FiXCircle,
  FiDollarSign,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiClock,
  FiEye,
} from "react-icons/fi";
import { BsBuilding } from "react-icons/bs";
import {
  getTeamExecutedHotelRequests,
  getTeamExecutedFlightRequests,
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
  DualCell,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";

// helper status mapping
const cancelStatusStyles = {
  Cancelled: "bg-red-50 text-red-700 ring-1 ring-red-200",
  Refunded: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Refund Pending": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};
const cancelDotStyles = {
  Cancelled: "bg-red-500",
  Refunded: "bg-blue-500",
  "Refund Pending": "bg-amber-500",
};

const CancelStatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
      cancelStatusStyles[status] || cancelStatusStyles.Cancelled
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        cancelDotStyles[status] || cancelDotStyles.Cancelled
      }`}
    />
    {status}
  </span>
);

const mapCancelStatus = (status) => {
  if (status === "refunded") return "Refunded";
  if (status === "refund_pending") return "Refund Pending";
  return "Cancelled";
};

// Cancelled Flight Section
function CancelledFlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [corpFilter, setCorp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const { teamExecutedFlightRequests: flightBookings } = useSelector(
    (state) => state.manager,
  );

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, cancelStatusFilter, travelDate]);

  const formatFlight = (b) => {
    const traveller = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?.email || "N/A";
    const cancelStatus = b.amendment?.status;
    const cancelledDate = b.amendmentHistory?.[0]?.createdAt || null;
    const refundAmount =
      b.amendment?.response?.Response?.RefundedAmount ||
      b.pricingSnapshot?.totalAmount ||
      0;

    const pnr =
      b.bookingResult?.pnr ||
      b.bookingResult?.providerResponse?.raw?.Response?.Response?.PNR ||
      "-";

    const providerBookingId = b.amendment?.changeRequestId || "-";

    return {
      ...b,
      travellerName: traveller,
      employeeId,
      status: b.executionStatus,
      cancelStatus,
      cancelledDate,
      refundAmount,
      pnr,
      providerBookingId,
      bookedDate: b.createdAt,
      amount: b.pricingSnapshot?.totalAmount || 0,
    };
  };

  const cancelledFlights = useMemo(() => {
    return (flightBookings || [])
      .map(formatFlight)
      .filter(
        (b) =>
          b.status === "cancel_requested" ||
          b.status === "cancelled" ||
          b.status === "refunded" ||
          b.status === "refund_pending",
      );
  }, [flightBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledFlights.filter((b) => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.status);
      const statusOk =
        cancelStatusFilter === "All" || displayStatus === cancelStatusFilter;

      const fromOk =
        !startDate ||
        new Date(b.cancelledDate || b.bookedDate) >= new Date(startDate);
      const toOk =
        !endDate ||
        new Date(b.cancelledDate || b.bookedDate) <= new Date(endDate);

      const travelOk =
        !travelDate ||
        (b.bookingSnapshot?.travelDate || b.travelDate || "").slice(0, 10) ===
          travelDate;

      const searchOk =
        !q ||
        b.travellerName?.toLowerCase().includes(q) ||
        (b.orderId || "").toLowerCase().includes(q) ||
        b.pnr?.toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q);

      return statusOk && fromOk && toOk && travelOk && searchOk;
    });
  }, [
    search,
    startDate,
    endDate,
    cancelStatusFilter,
    travelDate,
    cancelledFlights,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const totalRefund = filtered.reduce(
    (s, b) => s + (b.refundAmount || b.amount || 0),
    0,
  );
  const refunded = filtered.filter(
    (b) => mapCancelStatus(b.cancelStatus || b.status) === "Refunded",
  ).length;
  const refundPending = filtered.filter(
    (b) => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending",
  ).length;

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cancelled"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
        <StatCard
          label="Refunded"
          value={refunded}
          Icon={FiRefreshCw}
          borderCls="border-blue-500"
          iconBgCls="bg-blue-50"
          iconColorCls="text-blue-600"
        />
        <StatCard
          label="Refund Pending"
          value={refundPending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Total Refund Value"
          value={`₹${totalRefund.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Traveller / PNR">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Name, PNR, ID..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            <LabeledField label="Cancel Status">
              <select
                value={cancelStatusFilter}
                onChange={(e) => setCancelStatus(e.target.value)}
                className={selectCls}
              >
                {["All", "Cancelled", "Refunded", "Refund Pending"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Cancelled Flight Inventory"
        subtitle={`${filtered.length} total cancellations`}
        tableMinWidth="1100px"
        arrowBgClass="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
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
            <div className="text-[12px] font-black text-red-600 uppercase tracking-widest">
              Refund Value: ₹{totalRefund.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-800 text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Traveller Name</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Booked Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Cancelled Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Refund</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">PNR / Request ID</th>
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
                    <h3 className="text-lg font-bold text-slate-800">No Cancellations Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No cancelled flight records match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                      {b.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{b.travellerName}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{b.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                    {b.cancelledDate
                      ? new Date(b.cancelledDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900">₹{(b.refundAmount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <CancelStatusBadge
                      status={mapCancelStatus(b.cancelStatus || b.status)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <DualCell
                      primary={b.pnr}
                      secondary={b.providerBookingId}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-booking/${b._id}`)}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  );
}

// Cancelled Hotel Section
function CancelledHotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const {
    teamExecutedHotelRequests: hotelBookings,
    loadingTeamExecutedRequests: loadingHotels,
  } = useSelector((state) => state.manager);

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    startDate,
    endDate,
    cancelStatusFilter,
    checkInDate,
    checkOutDate,
  ]);

  const formatHotel = (b) => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?.email || "N/A";

    const hotelName =
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.bookingSnapshot?.hotelName ||
      "—";

    const checkIn =
      b.bookingSnapshot?.checkInDate || b.hotelRequest?.checkInDate;
    const checkOut =
      b.bookingSnapshot?.checkOutDate || b.hotelRequest?.checkOutDate;

    const cancelStatus = b.amendment?.status || b.executionStatus;
    const cancelledDate =
      b.amendment?.requestedAt || b.updatedAt || b.createdAt;

    const refundAmount =
      b.amendment?.response?.RefundedAmount ||
      b.pricingSnapshot?.totalAmount ||
      0;

    const providerBookingId = b.amendment?.changeRequestId || "-";

    const remarks = b.amendment?.remarks || "-";

    return {
      ...b,
      guestName: guest,
      employeeId,
      hotelName,
      checkIn,
      checkOut,
      cancelStatus,
      cancelledDate,
      refundAmount,
      providerBookingId,
      bookedDate: b.createdAt,
      amount: b.pricingSnapshot?.totalAmount || 0,
      remarks,
    };
  };

  const cancelledHotels = useMemo(() => {
    return (hotelBookings || []).map(formatHotel).filter((b) => {
      const amendStatus = (b.cancelStatus || "").toLowerCase();
      const execStatus = (b.executionStatus || "").toLowerCase();
      return (
        [
          "requested",
          "approved",
          "success",
          "refunded",
          "refund_pending",
        ].includes(amendStatus) ||
        ["cancel_requested", "cancelled"].includes(execStatus)
      );
    });
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledHotels.filter((b) => {
      const displayStatus = mapCancelStatus(
        b.cancelStatus || b.executionStatus,
      );
      const statusOk =
        cancelStatusFilter === "All" || displayStatus === cancelStatusFilter;

      const fromOk =
        !startDate ||
        new Date(b.cancelledDate || b.bookedDate) >= new Date(startDate);
      const toOk =
        !endDate ||
        new Date(b.cancelledDate || b.bookedDate) <= new Date(endDate);

      const ciStr = b.checkIn
        ? new Date(b.checkIn).toISOString().slice(0, 10)
        : "";
      const coStr = b.checkOut
        ? new Date(b.checkOut).toISOString().slice(0, 10)
        : "";
      const checkInOk = !checkInDate || (ciStr && ciStr >= checkInDate);
      const checkOutOk = !checkOutDate || (coStr && coStr <= checkOutDate);

      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        (b.orderId || "").toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q) ||
        b.hotelName?.toLowerCase().includes(q);

      return statusOk && fromOk && toOk && checkInOk && checkOutOk && searchOk;
    });
  }, [
    search,
    startDate,
    endDate,
    cancelStatusFilter,
    checkInDate,
    checkOutDate,
    cancelledHotels,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const totalRefund = filtered.reduce(
    (s, b) => s + (b.refundAmount || b.amount || 0),
    0,
  );
  const refunded = filtered.filter(
    (b) => mapCancelStatus(b.cancelStatus || b.executionStatus) === "Refunded",
  ).length;
  const refundPending = filtered.filter(
    (b) =>
      mapCancelStatus(b.cancelStatus || b.executionStatus) === "Refund Pending",
  ).length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cancelled"
          value={filtered.length}
          Icon={FiXCircle}
          borderCls="border-red-500"
          iconBgCls="bg-red-50"
          iconColorCls="text-red-600"
        />
        <StatCard
          label="Refunded"
          value={refunded}
          Icon={FiRefreshCw}
          borderCls="border-blue-500"
          iconBgCls="bg-blue-50"
          iconColorCls="text-blue-600"
        />
        <StatCard
          label="Refund Pending"
          value={refundPending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Total Refund Value"
          value={`₹${totalRefund.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-4">
            <LabeledField label="Search Guest">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by Name, ID, Hotel..."
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="From Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateCls}
              />
            </LabeledField>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <LabeledField label="To Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            <LabeledField label="Cancel Status">
              <select
                value={cancelStatusFilter}
                onChange={(e) => setCancelStatus(e.target.value)}
                className={selectCls}
              >
                {["All", "Cancelled", "Refunded", "Refund Pending"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Cancelled Hotel Inventory"
        subtitle={`${filtered.length} total cancellations`}
        tableMinWidth="1100px"
        arrowBgClass="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
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
            <div className="text-[12px] font-black text-red-600 uppercase tracking-widest">
              Refund Value: ₹{totalRefund.toLocaleString()}
            </div>
          </div>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-800 text-white">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Guest Name</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Booked Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Cancelled Date</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Refund</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Request ID</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">Reason</th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FaHotel className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Cancellations Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No cancelled hotel records match your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((b, i) => (
                <tr
                  key={b._id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                      {b.orderId || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[13px]">{b.guestName}</span>
                      <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">{b.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">
                    {b.cancelledDate
                      ? new Date(b.cancelledDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">₹{(b.refundAmount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <CancelStatusBadge
                      status={mapCancelStatus(b.cancelStatus || b.executionStatus)}
                    />
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                    {b.providerBookingId}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] text-slate-400 font-bold line-clamp-1 max-w-[150px]" title={b.remarks}>
                      {b.remarks}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/manager/team-hotel-booking/${b._id}`)}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-200"
                      >
                        <FiEye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
  const loadingFlights = useSelector(
    (state) => state.manager.loadingTeamExecutedFlightRequests,
  );
  const loadingHotels = useSelector(
    (state) => state.manager.loadingTeamExecutedRequests,
  );
  const loadingActive = activeTab === "flight" ? loadingFlights : loadingHotels;

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getTeamExecutedFlightRequests());
      return;
    }
    dispatch(getTeamExecutedHotelRequests());
  };

  const tabs = [
    {
      id: "flight",
      label: "Cancelled Flights",
      Icon: FaPlane,
      activeText: "text-red-800",
      activeBorder: "border-b-red-800",
    },
    {
      id: "hotel",
      label: "Cancelled Hotels",
      Icon: FaHotel,
      activeText: "text-red-700",
      activeBorder: "border-b-red-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg text-white shrink-0">
              <FiXCircle size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Cancelled Bookings
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Track and manage team cancellations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loadingActive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm border bg-red-50 border-red-200 text-red-800 hover:bg-red-100 active:scale-95 disabled:opacity-50"
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
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "flight" ? (
          <CancelledFlightSection />
        ) : (
          <CancelledHotelSection />
        )}
      </div>
    </div>
  );
}
