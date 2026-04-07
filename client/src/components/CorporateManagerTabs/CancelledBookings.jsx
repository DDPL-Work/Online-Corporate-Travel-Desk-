import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiSearch,
  FiXCircle,
  FiDollarSign,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiClock,
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
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

    const employeeId = b.userId?._id;
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
        b.pnr?.toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q);

      return statusOk && fromOk && toOk && travelOk && searchOk;
    });
  }, [search, startDate, endDate, cancelStatusFilter, travelDate, cancelledFlights]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
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
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search Traveller / PNR
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, PNR, booking ID…"
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> From Date</>}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> To Date</>}>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> Travel Date</>}>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Cancel Status</>}>
            <select
              value={cancelStatusFilter}
              onChange={(e) => setCancelStatus(e.target.value)}
              className={selectCls}
            >
              {["All", "Cancelled", "Refunded", "Refund Pending"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-red-800 text-red-100">
                <Th>Booking ID</Th>
                <Th>Traveller Name</Th>
                <Th>Booked Date</Th>
                <Th>Cancelled Date</Th>
                <Th>Refund Amount</Th>
                <Th>Cancel Status</Th>
                <Th>PNR / Cancel Request ID</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaPlane size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No cancelled flight bookings found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((b, i) => (
                  <tr
                    key={b._id}
                    className={`transition-colors hover:bg-red-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <IdCell id={b._id} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-800">
                          {b.travellerName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {b.employeeId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
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
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      ₹{(b.refundAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <CancelStatusBadge
                        status={mapCancelStatus(b.cancelStatus || b.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">
                      <DualCell
                        primary={b.pnr}
                        secondary={b.providerBookingId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1 text-xs font-semibold bg-red-700 text-white rounded-md hover:bg-red-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing {paginated.length} of {filtered.length} cancelled flights
          </span>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
      {selectedBooking && (
        <FlightBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [search, startDate, endDate, cancelStatusFilter, checkInDate, checkOutDate]);

  const formatHotel = (b) => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?._id;

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
        ["requested", "approved", "success", "refunded", "refund_pending"].includes(amendStatus) ||
        ["cancel_requested", "cancelled"].includes(execStatus)
      );
    });
  }, [hotelBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledHotels.filter((b) => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.executionStatus);
      const statusOk =
        cancelStatusFilter === "All" || displayStatus === cancelStatusFilter;

      const fromOk =
        !startDate ||
        new Date(b.cancelledDate || b.bookedDate) >= new Date(startDate);
      const toOk =
        !endDate ||
        new Date(b.cancelledDate || b.bookedDate) <= new Date(endDate);

      const ciStr = b.checkIn ? new Date(b.checkIn).toISOString().slice(0, 10) : "";
      const coStr = b.checkOut ? new Date(b.checkOut).toISOString().slice(0, 10) : "";
      const checkInOk = !checkInDate || (ciStr && ciStr >= checkInDate);
      const checkOutOk = !checkOutDate || (coStr && coStr <= checkOutDate);

      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q) ||
        b.hotelName?.toLowerCase().includes(q);

      return statusOk && fromOk && toOk && checkInOk && checkOutOk && searchOk;
    });
  }, [search, startDate, endDate, cancelStatusFilter, checkInDate, checkOutDate, cancelledHotels]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
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
    (b) => mapCancelStatus(b.cancelStatus || b.executionStatus) === "Refund Pending",
  ).length;

  return (
    <div className="space-y-4">
      {loadingHotels && (
        <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-slate-500">
          Loading cancelled hotel bookings…
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LabeledField label={<><FiSearch size={10} /> Search Guest</>}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, booking ID…"
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> From Date</>}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> To Date</>}>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> CheckIn Date</>}>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiCalendar size={10} /> CheckOut Date</>}>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField label={<><FiFilter size={10} /> Cancel Status</>}>
            <select
              value={cancelStatusFilter}
              onChange={(e) => setCancelStatus(e.target.value)}
              className={selectCls}
            >
              {["All", "Cancelled", "Refunded", "Refund Pending"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-red-800 text-red-100">
                <Th>Booking ID</Th>
                <Th>Guest Name</Th>
                <Th>Booked Date</Th>
                <Th>Cancelled Date</Th>
                <Th>Refund Amount</Th>
                <Th>Cancel Status</Th>
                <Th>Change Request ID</Th>
                <Th>Reason</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="flex justify-center mb-3">
                      <FaHotel size={32} className="opacity-20" />
                    </div>
                    <p className="font-semibold text-sm">
                      No cancelled hotel bookings found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting the filters or search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((b, i) => (
                  <tr
                    key={b._id}
                    className={`transition-colors hover:bg-red-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <IdCell id={b._id} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-800">
                          {b.guestName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {b.employeeId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
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
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      ₹{(b.refundAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <CancelStatusBadge
                        status={mapCancelStatus(b.cancelStatus || b.executionStatus)}
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">
                      {b.providerBookingId}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {b.remarks}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1 text-xs font-semibold bg-red-700 text-white rounded-md hover:bg-red-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between text-xs text-slate-400">
          <span>
            Showing {paginated.length} of {filtered.length} cancelled hotels
          </span>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
      {selectedBooking && (
        <HotelBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-700 to-red-500 flex items-center justify-center shrink-0">
            <FiXCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Cancelled Bookings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              View & track cancelled flight and hotel bookings
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loadingActive}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={loadingActive ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex items-end gap-0 mb-5 border-b-2 border-slate-200">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg
                  ${
                    active
                      ? `bg-white ${tab.activeText} ${tab.activeBorder} shadow-sm`
                      : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
                  }
                `}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "flight" ? <CancelledFlightSection /> : <CancelledHotelSection />}
      </div>
    </div>
  );
}
