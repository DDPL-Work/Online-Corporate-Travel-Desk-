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

// ── shared small components ───────────────────────────────────────────────────

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

// ── map raw cancel status to display label ────────────────────────────────────
const mapCancelStatus = (status) => {
  if (status === "refunded") return "Refunded";
  if (status === "refund_pending") return "Refund Pending";
  return "Cancelled";
};

// ── CANCELLED FLIGHT SECTION ──────────────────────────────────────────────────
function CancelledFlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const flightBookings = useSelector(
    (state) => state.adminBooking.flightBookings,
  );
  const loading = useSelector((state) => state.adminBooking.loading);

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
  }, [dispatch]);

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
      travellerName: b.userId?.name
        ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
        : b.userId?.email || traveller,
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

  // Only cancelled bookings
  const cancelledFlights = useMemo(() => {
    return flightBookings
      .map(formatFlight) // 🔥 APPLY FORMATTER HERE
      .filter(
        (b) =>
          b.status === "cancel_requested" ||
          b.status === "cancelled" ||
          b.status === "refunded" ||
          b.status === "refund_pending",
      );
  }, [flightBookings]);

  const employees = useMemo(
    () => ["All", ...new Set(cancelledFlights.map((b) => b.travellerName))],
    [cancelledFlights],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledFlights.filter((b) => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.status);
      const statusOk =
        cancelStatusFilter === "All" || displayStatus === cancelStatusFilter;
      const empOk = empFilter === "All" || b.travellerName === empFilter;

      const fromOk =
        !startDate ||
        new Date(b.cancelledDate || b.bookedDate) >= new Date(startDate);
      const toOk =
        !endDate ||
        new Date(b.cancelledDate || b.bookedDate) <= new Date(endDate);

      const searchOk =
        !q ||
        b.travellerName?.toLowerCase().includes(q) ||
        b.employeeId?.toLowerCase().includes(q) ||
        b.pnr?.toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q);

      const travelOk =
        !travelDate ||
        (b.hotelRequest?.checkInDate &&
          new Date(b.hotelRequest.checkInDate).toISOString().slice(0, 10) ===
            travelDate) ||
        (b.flightRequest?.departureDate &&
          new Date(b.flightRequest.departureDate).toISOString().slice(0, 10) ===
            travelDate);

      return statusOk && empOk && fromOk && toOk && searchOk && travelOk;
    });
  }, [search, startDate, endDate, travelDate, cancelStatusFilter, empFilter, cancelledFlights]);

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

  const total = filtered.reduce((s, b) => s + b.amount, 0);

  const handleExportFlights = () => {
    if (!filtered.length) return;
    const headers = ["Order ID", "Traveller", "Booked Date", "Cancelled Date", "Status", "PNR"];
    const rows = filtered.map((b) => [
      b.orderId || "N/A",
      b.travellerName || "N/A",
      new Date(b.bookedDate).toLocaleDateString("en-IN"),
      new Date(b.cancelledDate || b.bookedDate).toLocaleDateString("en-IN"),
      mapCancelStatus(b.cancelStatus || b.status),
      b.pnr || "N/A",
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancelled-flights-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
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
          Icon={FaRupeeSign}
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
              onChange={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Name, PNR, booking ID…"
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> From Date
              </>
            }
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> To Date
              </>
            }
          >
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> Travel Date
              </>
            }
          >
            <input
              type="date"
              value={travelDate}
              onChange={(e) => {
                setTravelDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Cancel Status
              </>
            }
          >
            <CustomDropdown
              value={cancelStatusFilter}
              onChange={(value) => {
                setCancelStatus(value);
                setCurrentPage(1);
              }}
              options={["All", "Cancelled", "Refunded", "Refund Pending"]}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Employee
              </>
            }
          >
            <CustomDropdown
              value={empFilter}
              onChange={(value) => {
                setEmp(value);
                setCurrentPage(1);
              }}
              options={employees}
            />
          </LabeledField>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(getAllFlightBookingsAdmin())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0A4D68] bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-100"
              title="Refresh data"
            >
              <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setTravelDate("");
                setCancelStatus("All");
                setEmp("All");
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Cancelled Flight Bookings"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1000px"
        onExport={handleExportFlights}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> of <strong className="text-slate-600">{filtered.length}</strong> flight bookings
            </span>
            <span>
              Total: <strong className="text-[#0A4D68]">₹{total.toLocaleString()}</strong>
            </span>
          </div>
        }
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ffffff]">
              <Th>Order ID</Th>
              <Th>Traveller Name</Th>
              <Th>Booked Date</Th>
              <Th>Cancelled Date</Th>
              <Th>Cancel Status</Th>
              <Th>PNR</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
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
                    <IdCell id={b.orderId || "N/A"} />
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
                      ? new Date(b.cancelledDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <CancelStatusBadge
                      status={mapCancelStatus(b.cancelStatus || b.status)}
                    />
                  </td>
                  <td className="px-4 py-3">{b.pnr}</td>

                  {/* <td className="px-4 py-3">
                    {b.cancellationReason ? (
                      <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded">
                        {b.cancellationReason}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td> */}
                  <td>
                      <button
                        onClick={() =>
                          navigate(
                            `/employee-flight-booking/${b._id}?source=cancelled`,
                          )
                        }
                        className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] flex items-center gap-1"
                      >
                        <FiEye size={12} /> View
                      </button>
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

// ── CANCELLED HOTEL SECTION ───────────────────────────────────────────────────
function CancelledHotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [cancelStatusFilter, setCancelStatus] = useState("All");
  const [empFilter, setEmp] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hotelBookings = useSelector(
    (state) => state.adminBooking.cancelledHotelBookings,
  );
  const loading = useSelector((state) => state.adminBooking.loading);

  useEffect(() => {
    dispatch(getCancelledHotelBookingsAdmin());
  }, [dispatch]);

  const formatHotel = (b) => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?.email || "N/A";

    const hotelName = b.hotelRequest?.selectedHotel?.hotelName || "—";

    const checkIn = b.hotelRequest?.checkInDate;
    const checkOut = b.hotelRequest?.checkOutDate;

    const cancelStatus = b.amendment?.status || b.executionStatus;

    const cancelledDate = b.updatedAt || b.createdAt; // fallback (since no proper cancel date)

    const refundAmount =
      b.amendment?.response?.RefundedAmount ||
      b.pricingSnapshot?.totalAmount ||
      0;

    const providerBookingId = b.amendment.changeRequestId || "-";

    const remarks = b.amendment.remarks || "-";

    return {
      ...b,
      guestName: b.userId?.name
        ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
        : b.userId?.email || guest,
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
  // Only cancelled bookings
  const cancelledHotels = useMemo(() => {
    return hotelBookings.map(formatHotel).filter((b) => {
      const amendStatus = b.cancelStatus;

      return (
        amendStatus === "requested" ||
        amendStatus === "approved" ||
        amendStatus === "refunded" ||
        amendStatus === "refund_pending"
      );
    });
  }, [hotelBookings]);

  const employees = useMemo(
    () => ["All", ...new Set(cancelledHotels.map((b) => b.guestName))],
    [cancelledHotels],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cancelledHotels.filter((b) => {
      const displayStatus = mapCancelStatus(b.cancelStatus || b.status);
      const statusOk =
        cancelStatusFilter === "All" || displayStatus === cancelStatusFilter;
      const empOk = empFilter === "All" || b.guestName === empFilter;

      const fromOk =
        !startDate ||
        new Date(b.cancelledDate || b.bookedDate) >= new Date(startDate);
      const toOk =
        !endDate ||
        new Date(b.cancelledDate || b.bookedDate) <= new Date(endDate);

      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        b.employeeId?.toLowerCase().includes(q) ||
        b.providerBookingId?.toString().toLowerCase().includes(q);

      const ciOk =
        !checkInDate ||
        (b.checkIn &&
          new Date(b.checkIn).toISOString().slice(0, 10) === checkInDate);
      const coOk =
        !checkOutDate ||
        (b.checkOut &&
          new Date(b.checkOut).toISOString().slice(0, 10) === checkOutDate);

      return statusOk && empOk && fromOk && toOk && searchOk && ciOk && coOk;
    });
  }, [
    search,
    startDate,
    endDate,
    checkInDate,
    checkOutDate,
    cancelStatusFilter,
    empFilter,
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
    (b) => mapCancelStatus(b.cancelStatus || b.status) === "Refunded",
  ).length;
  const refundPending = filtered.filter(
    (b) => mapCancelStatus(b.cancelStatus || b.status) === "Refund Pending",
  ).length;

  const total = filtered.reduce((s, b) => s + b.amount, 0);

  const handleExportHotels = () => {
    if (!filtered.length) return;
    const headers = ["Booking ID", "Guest Name", "Hotel", "Booked Date", "Cancelled Date", "Status"];
    const rows = filtered.map((b) => [
      b.orderId || b.providerBookingId || "N/A",
      b.guestName || "N/A",
      b.hotelName || "N/A",
      new Date(b.bookedDate).toLocaleDateString("en-IN"),
      new Date(b.cancelledDate || b.bookedDate).toLocaleDateString("en-IN"),
      mapCancelStatus(b.cancelStatus || b.status),
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancelled-hotels-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
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
          value={`${totalRefund.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search Guest
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Name, booking ID…"
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> From Date
              </>
            }
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> To Date
              </>
            }
          >
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
           <LabeledField
            label={
              <>
                <FiCalendar size={10} /> CheckIn Date
              </>
            }
          >
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => {
                setCheckInDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
           <LabeledField
            label={
              <>
                <FiCalendar size={10} /> CheckOut Date
              </>
            }
          >
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => {
                setCheckOutDate(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Cancel Status
              </>
            }
          >
            <CustomDropdown
              value={cancelStatusFilter}
              onChange={(value) => {
                setCancelStatus(value);
                setCurrentPage(1);
              }}
              options={["All", "Cancelled", "Refunded", "Refund Pending"]}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiFilter size={10} /> Employee
              </>
            }
          >
            <CustomDropdown
              value={empFilter}
              onChange={(value) => {
                setEmp(value);
                setCurrentPage(1);
              }}
              options={employees}
            />
          </LabeledField>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(getCancelledHotelBookingsAdmin())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0A4D68] bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-100"
              title="Refresh data"
            >
              <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setCheckInDate("");
                setCheckOutDate("");
                setCancelStatus("All");
                setEmp("All");
                setCurrentPage(1);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Cancelled Hotel Bookings"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="1050px"
        onExport={handleExportHotels}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
        footer={
          <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-600">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> of <strong className="text-slate-600">{filtered.length}</strong> hotel bookings
            </span>
            <span>
              Total: <strong className="text-[#088395]">₹{total.toLocaleString()}</strong>
            </span>
          </div>
        }
        pagination={
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ccfbf1]">
              <Th>Order ID</Th>
              <Th>Guest Name</Th>
              <Th>Booked Date</Th>
              <Th>Cancelled Date</Th>
              <Th>Cancel Status</Th>
              <Th>Change Request ID</Th>
              <Th>Reason</Th>
              <Th>Action</Th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
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
                      <IdCell id={b.orderId || b.providerBookingId || "N/A"} />
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

                    <td className="px-4 py-3">
                      <CancelStatusBadge
                        status={mapCancelStatus(b.cancelStatus || b.status)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <DualCell primary={b.providerBookingId} />
                    </td>
                    <td className="px-4 py-3">
                      {b.remarks ? (
                        <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded">
                          {b.remarks.split("-")[0].trim()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/employee-hotel-booking/${b._id}?source=cancelled`)}
                        className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] flex items-center gap-1"
                      >
                        <FiEye size={12} /> View
                      </button>
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

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function CancelledBookings() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("flight");

  const tabs = [
    {
      id: "flight",
      label: "Flight Bookings",
      Icon: FaPlane,
      activeText: "text-[#0A4D68]",
      activeBorder: "border-b-[#0A4D68]",
    },
    {
      id: "hotel",
      label: "Hotel Bookings",
      Icon: FaHotel,
      activeText: "text-[#088395]",
      activeBorder: "border-b-[#088395]",
    },
  ];

  const handleRefresh = () => {
    if (activeTab === "flight") {
      dispatch(getAllFlightBookingsAdmin());
    } else {
      dispatch(getCancelledHotelBookingsAdmin());
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0 shadow-sm">
            <FiXCircle size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
              Cancelled Bookings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Review all cancelled or amended flight &amp; hotel records
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${
            activeTab === "hotel"
              ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
              : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          }`}
        >
          <FiRefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-end gap-0 border-b-2 border-slate-200">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
                active
                  ? `bg-white ${tab.activeText} ${tab.activeBorder} shadow-sm`
                  : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
              }`}
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
  );
}
