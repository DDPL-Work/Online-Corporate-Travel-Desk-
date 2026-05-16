import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiCalendar,
  FiFilter,
  FiList,
  FiRefreshCw,
  FiX,
  FiUser,
} from "react-icons/fi";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
// import {
//   FlightBookingModal,
//   HotelBookingModal,
// } from "./Modal/BookingRequestDetailsModal";
import { Pagination } from "./Shared/Pagination";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  Th,
  CustomDropdown,
} from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [empFilter, setEmp] = useState("All");
  // const [selectedBooking, setSelectedBooking] = useState(null);
  const [travelDate, setTravelDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flightBookings = useSelector(
    (state) => state.adminBooking.flightBookings,
  );

  // console.log(flightBookings);

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
  }, [dispatch]);

  const formatFlight = (b) => {
    const traveller = b.userId?.name
      ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
      : b.userId?.email ||
        `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
        "N/A";

    const employeeId = b.userId?.email || "N/A";

    const status =
      b.executionStatus === "ticketed"
        ? "Confirmed"
        : b.executionStatus === "cancel_requested"
          ? "Cancelled"
          : "Pending";

    const pnr =
      b.bookingResult?.pnr ||
      b.bookingResult?.providerResponse?.raw?.Response?.Response?.PNR ||
      "-";

    const providerBookingId =
      b.bookingResult?.providerResponse?.raw?.Response?.Response?.BookingId ||
      "-";

    const amount =
      b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

    return {
      ...b,
      travellerName: traveller,
      employeeId,
      status,
      pnr,
      providerBookingId,
      amount,
      bookedDate: b.createdAt,
    };
  };

  const formattedBookings = useMemo(
    () => (flightBookings || []).map(formatFlight),
    [flightBookings],
  );

  const employees = useMemo(
    () => ["All", ...new Set(formattedBookings.map((b) => b.travellerName))],
    [formattedBookings],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return formattedBookings.filter((b) => {
      // Base visibility rules
      const isConfirmed = b.executionStatus === "ticketed";
      const isCancelled =
        b.executionStatus === "cancel_requested" ||
        b.executionStatus === "cancelled" ||
        b.requestStatus === "cancelled";
      const isFailedOrNotStarted =
        b.executionStatus === "failed" || b.executionStatus === "not_started";
      const amendmentRequested = b.amendment?.status === "requested";

      if (
        !isConfirmed ||
        isCancelled ||
        isFailedOrNotStarted ||
        amendmentRequested
      ) {
        return false;
      }

      const empOk = empFilter === "All" || b.travellerName === empFilter;

      const searchOk =
        !q ||
        b.travellerName?.toLowerCase().includes(q) ||
        b.employeeId?.toLowerCase().includes(q) ||
        b.pnr?.toLowerCase().includes(q) ||
        (b.providerBookingId || "").toString().toLowerCase().includes(q);

      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";

      const bookedDateOk =
        (!startDate || booked >= startDate) && (!endDate || booked <= endDate);

      const statusOk = statusFilter === "All" || b.status === statusFilter;

      const travelDateOk =
        !travelDate ||
        (() => {
          const snapshotDate = b.bookingSnapshot?.travelDate;
          if (snapshotDate) {
            if (
              new Date(snapshotDate).toISOString().slice(0, 10) === travelDate
            ) {
              return true;
            }
          }

          return (b.flightRequest?.segments ?? []).some((seg) => {
            const raw = seg.departureDateTime;
            if (!raw) return false;

            return new Date(raw).toISOString().slice(0, 10) === travelDate;
          });
        })();

      return searchOk && bookedDateOk && statusOk && travelDateOk && empOk;
    });
  }, [
    search,
    startDate,
    endDate,
    statusFilter,
    travelDate,
    empFilter,
    formattedBookings,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // const filtered = useMemo(() => {
  //   const q = search.toLowerCase();

  //   return flightBookings
  //     .map(formatFlight) // 🔥 IMPORTANT
  //     .filter((b) => {
  //       const searchOk =
  //         !q ||
  //         b.travellerName?.toLowerCase().includes(q) ||
  //         b.pnr?.toLowerCase().includes(q) ||
  //         (b.providerBookingId || "").toString().toLowerCase().includes(q);

  //       return searchOk;
  //     });
  // }, [search, flightBookings]);

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = [
      "Order ID",
      "Traveller Name",
      "Employee Email",
      "Booked Date",
      "Status",
      "PNR",
    ];
    const rows = filtered.map((b) => [
      b.orderId || "N/A",
      b.travellerName || "N/A",
      b.employeeId || "N/A",
      b.bookedDate
        ? new Date(b.bookedDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A",
      b.status || "N/A",
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
    a.download = `flight-bookings-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Flights"
          value={filtered.length}
          Icon={FaPlane}
          borderCls="border-[#0A4D68]"
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
        />
        <StatCard
          label="Confirmed"
          value={confirmed}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={pending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Total Spend"
          value={`${total.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 min-w-0">
        {/* Filter action row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <FiFilter size={11} /> Filters
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(getAllFlightBookingsAdmin())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0A4D68] bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-100"
              title="Refresh data"
            >
              <FiRefreshCw size={12} className={useSelector(state => state.adminBooking.loading) ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setStatus("All");
                setEmp("All");
                setTravelDate("");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
              title="Reset all filters"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <LabeledField
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiSearch size={10} /> Search Traveller
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
              focusColor="#0A4D68"
            />
          </LabeledField>

          <LabeledField
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiUser size={10} /> Employee
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
          <LabeledField
            className="flex-1 min-w-[150px]"
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
            className="flex-1 min-w-[150px]"
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
            className="flex-1 min-w-[150px]"
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
          {/* <LabeledField className="flex-1 min-w-[150px]"
            label={
              <>
                <BsBuilding size={10} /> Corporate
              </>
            }
          >
            <select
              value={corpFilter}
              onChange={(e) => setCorp(e.target.value)}
              className={selectCls}
            >
              {corps.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </LabeledField> */}
          <LabeledField
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiFilter size={10} /> Status
              </>
            }
          >
            <CustomDropdown
              value={statusFilter}
              onChange={(value) => {
                setStatus(value);
                setCurrentPage(1);
              }}
              options={["All", "Confirmed", "Pending", "Cancelled"]}
            />
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Flight Bookings"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="860px"
        onExport={handleExport}
        exportLabel="Export"
        exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
        arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 hover:border-cyan-300 hover:text-[#083d52] disabled:hover:bg-cyan-50"
        footer={
          <>
            <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-slate-600">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} – {Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong>{" "}
                of <strong className="text-slate-600">{filtered.length}</strong>{" "}
                flight bookings
              </span>
              <span>
                Total: 
                <strong className="text-[#0A4D68]">
                  ₹{total.toLocaleString()}
                </strong>
              </span>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ffffff]">
              <Th>Order ID</Th>
              <Th>Traveller Name</Th>
              <Th>Booked Date</Th>
              <Th>Status</Th>
              <Th>PNR</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaPlane size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No flight bookings found
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
                  className={`transition-colors hover:bg-sky-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
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
                  <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-blue-700">
                      {b.pnr}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        navigate(`/employee-flight-booking/${b._id}`)
                      }
                      className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {/* {selectedBooking && (
        <FlightBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )} */}
    </div>
  );
}

// ── HOTEL SECTION ─────────────────────────────────────────────────────────────
function HotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  // const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const hotelBookings = useSelector(
    (state) => state.adminBooking.hotelBookings,
  );

  // console.log(hotelBookings);

  useEffect(() => {
    dispatch(getAllHotelBookingsAdmin());
  }, [dispatch]);

  const formatHotel = (b) => {
    const guest = b.userId?.name
      ? `${b.userId.name.firstName} ${b.userId.name.lastName}`.trim()
      : b.userId?.email ||
        `${b.travellers?.[0]?.firstName || ""} ${b.travellers?.[0]?.lastName || ""}`.trim() ||
        "N/A";

    const employeeId = b.userId?.email || "N/A";

    const status =
      b.executionStatus === "voucher_generated"
        ? "Confirmed"
        : b.executionStatus === "cancel_requested"
          ? "Cancelled"
          : "Pending";

    const bookResult = b.bookingResult?.providerResponse?.BookResult || {};

    const invoiceNo = bookResult.InvoiceNumber || "-";
    const providerBookingId = bookResult.BookingId || "-";

    const amount =
      b.pricingSnapshot?.totalAmount ?? b.bookingSnapshot?.amount ?? 0;

    return {
      ...b,
      guestName: guest,
      employeeId,
      status,
      invoiceNo,
      providerBookingId,
      amount,
      bookedDate: b.createdAt,
    };
  };

  const formattedBookings = useMemo(
    () => (hotelBookings || []).map(formatHotel),
    [hotelBookings],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return formattedBookings.filter((b) => {
      // Base visibility rules
      const isConfirmed = b.executionStatus === "voucher_generated";
      const isCancelled =
        b.executionStatus === "cancel_requested" ||
        b.executionStatus === "cancelled" ||
        b.requestStatus === "cancelled";
      const isFailedOrNotStarted =
        b.executionStatus === "failed" || b.executionStatus === "not_started";
      const amendmentRequested = b.amendment?.status === "requested";

      if (
        !isConfirmed ||
        isCancelled ||
        isFailedOrNotStarted ||
        amendmentRequested
      ) {
        return false;
      }

      // Search
      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        b.employeeId?.toLowerCase().includes(q) ||
        b.invoiceNo?.toLowerCase().includes(q) ||
        (b.providerBookingId || "").toString().toLowerCase().includes(q);

      // Booked date range
      const booked = b.bookedDate
        ? new Date(b.bookedDate).toISOString().slice(0, 10)
        : "";
      const bookedDateOk =
        (!startDate || booked >= startDate) && (!endDate || booked <= endDate);

      // Status
      const statusOk = statusFilter === "All" || b.status === statusFilter;

      // Check-in / Check-out
      // Adjust field paths below to match your actual booking object shape
      const rawCheckIn =
        b.hotelDetails?.checkInDate ?? b.checkIn ?? b.checkInDate;
      const rawCheckOut =
        b.hotelDetails?.checkOutDate ?? b.checkOut ?? b.checkOutDate;

      const ciStr = rawCheckIn
        ? new Date(rawCheckIn).toISOString().slice(0, 10)
        : "";
      const coStr = rawCheckOut
        ? new Date(rawCheckOut).toISOString().slice(0, 10)
        : "";

      const checkInOk = !checkIn || !ciStr || ciStr >= checkIn;
      const checkOutOk = !checkOut || !coStr || coStr <= checkOut;

      return searchOk && bookedDateOk && statusOk && checkInOk && checkOutOk;
    });
  }, [
    search,
    startDate,
    endDate,
    statusFilter,
    checkIn,
    checkOut,
    formattedBookings,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = [
      "Order ID",
      "Guest Name",
      "Employee Email",
      "Booked Date",
      "Status",
      "Invoice No.",
    ];
    const rows = filtered.map((b) => [
      b.orderId || "N/A",
      b.guestName || "N/A",
      b.employeeId || "N/A",
      b.bookedDate
        ? new Date(b.bookedDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A",
      b.status || "N/A",
      b.invoiceNo || "N/A",
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
    a.download = `hotel-bookings-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          label="Total Hotels"
          value={filtered.length}
          Icon={FaHotel}
          borderCls="border-[#088395]"
          iconBgCls="bg-[#088395]/10"
          iconColorCls="text-[#088395]"
        />
        <StatCard
          label="Confirmed"
          value={confirmed}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={pending}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Total Spend"
          value={`${total.toLocaleString()}`}
          Icon={FaRupeeSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 min-w-0">
        {/* Filter action row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <FiFilter size={11} /> Filters
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(getAllHotelBookingsAdmin())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0A4D68] bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-100"
              title="Refresh data"
            >
              <FiRefreshCw size={12} className={useSelector(state => state.adminBooking.loading) ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setStatus("All");
                setCheckIn("");
                setCheckOut("");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
              title="Reset all filters"
            >
              <FiX size={12} /> Reset
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <LabeledField
            className="flex-1 min-w-[150px]"
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
              placeholder="Name, Invoice No., booking ID"
              focusColor="#088395"
            />
          </LabeledField>
          <LabeledField
            className="flex-1 min-w-[150px]"
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
            className="flex-1 min-w-[150px]"
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
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiCalendar size={10} /> Check-in
              </>
            }
          >
            <input
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>

          <LabeledField
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiCalendar size={10} /> Check-out
              </>
            }
          >
            <input
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                setCurrentPage(1);
              }}
              className={dateCls}
            />
          </LabeledField>
          {/* <LabeledField className="flex-1 min-w-[150px]"
            label={
              <>
                <BsBuilding size={10} /> Corporate
              </>
            }
          >
            <select
              value={corpFilter}
              onChange={(e) => setCorp(e.target.value)}
              className={selectCls}
            >
              {corps.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </LabeledField> */}
          <LabeledField
            className="flex-1 min-w-[150px]"
            label={
              <>
                <FiFilter size={10} /> Status
              </>
            }
          >
            <CustomDropdown
              value={statusFilter}
              onChange={(value) => {
                setStatus(value);
                setCurrentPage(1);
              }}
              options={["All", "Confirmed", "Pending", "Cancelled"]}
            />
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <ResponsiveDataTable
        title="Hotel Bookings"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
        tableMinWidth="860px"
        onExport={handleExport}
        exportLabel="Export"
        exportBgClass="bg-[#088395] hover:bg-[#066f7e]"
        arrowBgClass="bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100 hover:border-teal-300 hover:text-[#066f7e] disabled:hover:bg-teal-50"
        footer={
          <>
            <div className="px-4 py-2.5 flex justify-between text-xs text-slate-400">
              <span>
                Showing 
                <strong className="text-slate-600">
                  {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} –{" "}
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)}
                </strong>{" "}
                of <strong className="text-slate-600">{filtered.length}</strong>{" "}
                hotel bookings
              </span>
              <span>
                Total: 
                <strong className="text-[#088395]">
                  ₹{total.toLocaleString()}
                </strong>
              </span>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0f9041] text-[#ccfbf1]">
              <Th>Order ID</Th>
              <Th>Guest Name</Th>
              <Th>Booked Date</Th>
              <Th>Status</Th>
              {/* <Th>Invoice No. / Provider Booking ID</Th> */}
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center text-slate-400">
                  <div className="flex justify-center mb-3">
                    <FaHotel size={32} className="opacity-20" />
                  </div>
                  <p className="font-semibold text-sm">
                    No hotel bookings found
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
                  className={`transition-colors hover:bg-teal-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <td className="px-4 py-3">
                    <IdCell id={b.orderId || "N/A"} />
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
                  <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">
                    {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  {/* <td className="px-4 py-3">
                    <DualCell primary={b.invoiceNo} secondary={b.providerBookingId} />
                  </td> */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        navigate(`/employee-hotel-booking/${b._id}`)
                      }
                      className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50] transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveDataTable>
      {/* {selectedBooking && (
        <HotelBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )} */}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function BookingsDashboard() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const typeQuery = searchParams.get("type");
  const [activeTab, setActiveTab] = useState(
    typeQuery === "hotel" ? "hotel" : "flight",
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "flight") {
        await dispatch(getAllFlightBookingsAdmin());
      } else {
        await dispatch(getAllHotelBookingsAdmin());
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeQuery) {
      setActiveTab(typeQuery === "hotel" ? "hotel" : "flight");
    }
  }, [typeQuery]);

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

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiList size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
              Travel Bookings Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage corporate flight &amp; hotel bookings
            </p>
          </div>
        </div>
        {/* Refresh button — top right of header */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh bookings data"
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${
            activeTab === "hotel"
              ? "bg-teal-50 border-teal-200 text-[#088395] hover:bg-teal-100"
              : "bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          } disabled:opacity-60 disabled:cursor-wait`}
        >
          <FiRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
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

      {/* Tab Content */}
      {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
    </div>
  );
}
