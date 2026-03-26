import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiDollarSign,
  FiCalendar,
  FiFilter,
  FiList,
} from "react-icons/fi";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
} from "../../Redux/Actions/travelAdmin.thunks";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "./Modal/BookingRequestDetailsModal";
import { Pagination } from "./Shared/Pagination";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  selectCls,
  Th,
} from "./Shared/CommonComponents";

const mapStatus = (status) => {
  if (status === "confirmed") return "Confirmed";
  if (status === "cancel_requested") return "Cancelled";
  return "Pending";
};

// ── FLIGHT SECTION ────────────────────────────────────────────────────────────
function FlightSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [corpFilter, setCorp] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [travelDate, setTravelDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const flightBookings = useSelector(
    (state) => state.adminBooking.flightBookings,
  );

  console.log(flightBookings);

  useEffect(() => {
    dispatch(getAllFlightBookingsAdmin());
  }, [dispatch]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, statusFilter, travelDate]);

  const corps = ["All"];

  const formatFlight = (b) => {
    const traveller = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?._id;

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

    const amount = b.pricingSnapshot?.totalAmount || 0;

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return flightBookings.map(formatFlight).filter((b) => {
      const searchOk =
        !q ||
        b.travellerName?.toLowerCase().includes(q) ||
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

      return searchOk && bookedDateOk && statusOk && travelDateOk;
    });
  }, [search, startDate, endDate, statusFilter, travelDate, flightBookings]);

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

  const total = filtered.reduce((s, b) => s + b.amount, 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          value={`₹${total.toLocaleString()}`}
          Icon={FiDollarSign}
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
                <FiSearch size={10} /> Search Traveller / PNR
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, PNR, booking ID…"
              focusColor="#0A4D68"
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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
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
              onChange={(e) => setTravelDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          {/* <LabeledField
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
            label={
              <>
                <FiFilter size={10} /> Status
              </>
            }
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className={selectCls}
            >
              {["All", "Confirmed", "Pending", "Cancelled"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-[#0A4D68] text-[#bfdbfe]">
                <Th>Booking ID</Th>
                <Th>Traveller Name</Th>
                <Th>Booked Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                {/* <Th>PNR / Provider Booking ID</Th> */}
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
                      <IdCell id={b._id} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* <Avatar
                          name={b.travellerName}
                          bgClass="bg-[#0A4D68]/10"
                          textClass="text-[#0A4D68]"
                        /> */}
                        <div className="flex flex-col">
                          <span className="font-semibold text-[13px] text-slate-800">
                            {b.travellerName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {b.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{b.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    {/* <td className="px-4 py-3">
                      <DualCell
                        primary={b.pnr}
                        secondary={b.providerBookingId}
                      />
                    </td> */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50]"
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
            Showing{" "}
            <strong className="text-slate-600">
              {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-slate-600">{filtered.length}</strong>{" "}
            flight bookings
          </span>
          <span>
            Total:{" "}
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

// ── HOTEL SECTION ─────────────────────────────────────────────────────────────
function HotelSection() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [corpFilter, setCorp] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const hotelBookings = useSelector(
    (state) => state.adminBooking.hotelBookings,
  );

  console.log(hotelBookings);

  useEffect(() => {
    dispatch(getAllHotelBookingsAdmin());
  }, [dispatch]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, statusFilter, checkIn, checkOut]);

  const corps = ["All"];

  const formatHotel = (b) => {
    const guest = b.travellers?.length
      ? `${b.travellers[0].title || ""} ${b.travellers[0].firstName || ""} ${b.travellers[0].lastName || ""}`.trim()
      : "N/A";

    const employeeId = b.userId?._id;

    const status =
      b.executionStatus === "voucher_generated"
        ? "Confirmed"
        : b.executionStatus === "cancel_requested"
          ? "Cancelled"
          : "Pending";

    const bookResult = b.bookingResult?.providerResponse?.BookResult || {};

    const invoiceNo = bookResult.InvoiceNumber || "-";
    const providerBookingId = bookResult.BookingId || "-";

    const amount = b.pricingSnapshot?.totalAmount || 0;

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return hotelBookings.map(formatHotel).filter((b) => {
      // Search
      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
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
    hotelBookings,
  ]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const total = filtered.reduce((s, b) => s + b.amount, 0);
  const confirmed = filtered.filter(
    (b) => b.status === "voucher_generated",
  ).length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          value={`₹${total.toLocaleString()}`}
          Icon={FiDollarSign}
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
                <FiSearch size={10} /> Search Guest / Invoice
              </>
            }
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Name, Invoice No., booking ID…"
              focusColor="#088395"
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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> Check-in
              </>
            }
          >
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={dateCls}
            />
          </LabeledField>

          <LabeledField
            label={
              <>
                <FiCalendar size={10} /> Check-out
              </>
            }
          >
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={dateCls}
            />
          </LabeledField>
          {/* <LabeledField
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
            label={
              <>
                <FiFilter size={10} /> Status
              </>
            }
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className={selectCls}
            >
              {["All", "Confirmed", "Pending", "Cancelled"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </LabeledField>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-[#088395] text-[#ccfbf1]">
                <Th>Booking ID</Th>
                <Th>Guest Name</Th>
                <Th>Booked Date</Th>
                <Th>Amount</Th>
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
                      <IdCell id={b._id} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* <Avatar
                          name={b.guestName}
                          bgClass="bg-[#088395]/10"
                          textClass="text-[#088395]"
                        /> */}
                        <div className="flex flex-col">
                          <span className="font-semibold text-[13px] text-slate-800">
                            {b.guestName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {b.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {new Date(b.bookedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{b.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    {/* <td className="px-4 py-3">
                      <DualCell
                        primary={b.invoiceNo}
                        secondary={b.providerBookingId}
                      />
                    </td> */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1 text-xs font-semibold bg-[#0A4D68] text-white rounded-md hover:bg-[#083a50]"
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
            Showing{" "}
            <strong className="text-slate-600">
              {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-slate-600">{filtered.length}</strong>{" "}
            flight bookings
          </span>
          <span>
            Total:{" "}
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

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function BookingsDashboard() {
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

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shrink-0">
            <FiList size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Travel Bookings Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage corporate flight &amp; hotel bookings
            </p>
          </div>
        </div>

        {/* Tab Bar */}
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

        {/* Tab Content */}
        {activeTab === "flight" ? <FlightSection /> : <HotelSection />}
      </div>
    </div>
  );
}
