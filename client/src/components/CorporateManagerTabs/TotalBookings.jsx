import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
  FiRefreshCw,
} from "react-icons/fi";
import {
  getTeamExecutedHotelRequests,
  getTeamExecutedFlightRequests,
} from "../../Redux/Actions/manager.thunk";
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
  const [travelDate, setTravelDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const { teamExecutedFlightRequests: flightBookings } = useSelector(
    (state) => state.manager,
  );
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getTeamExecutedFlightRequests());
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

    const executionStatus = (b.executionStatus || "").toLowerCase();
    const status =
      executionStatus === "ticketed" || executionStatus === "confirmed"
        ? "Confirmed"
        : ["cancelled", "cancel_requested"].includes(executionStatus)
          ? "Cancelled"
          : executionStatus === "failed"
            ? "Failed"
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return flightBookings.map(formatFlight).filter((b) => {
      const searchOk =
        !q ||
        b.travellerName?.toLowerCase().includes(q) ||
        (b.orderId || "").toLowerCase().includes(q) ||
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

      if (b.status === "Failed") return false;

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

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
        {/* <StatCard
          label="Total Spend"
          value={`₹${total.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        /> */}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LabeledField
            label={
              <>
                <FiSearch size={10} /> Search Traveller
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
              <tr className="bg-[#0f9041] text-[#ffffff]">
                <Th>Order ID</Th>
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
                      <IdCell id={b.orderId || "N/A"} />
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
                        onClick={() => navigate(`/manager/team-booking/${b._id}`)}
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
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const dispatch = useDispatch();

  const hotelBookings = useSelector(
    (state) => state.manager.teamExecutedHotelRequests,
  );

  const loading = useSelector(
    (state) => state.manager.loadingTeamExecutedRequests,
  );
  const navigate = useNavigate();

  console.log(hotelBookings);

  useEffect(() => {
    dispatch(getTeamExecutedHotelRequests());
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

    const executionStatus = (b.executionStatus || "").toLowerCase();
    const amendmentStatus = (b.amendment?.status || "").toLowerCase();

    let status = "Pending";
    if (["requested", "in_progress"].includes(amendmentStatus)) {
      status = "Cancelled";
    } else if (
      executionStatus === "voucher_generated" ||
      executionStatus === "confirmed"
    ) {
      status = "Confirmed";
    } else if (["cancelled", "cancel_requested"].includes(executionStatus)) {
      status = "Cancelled";
    } else if (executionStatus === "failed") {
      status = "Failed";
    }

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return hotelBookings.map(formatHotel).filter((b) => {
      // Base visibility rules - Allow showing cancelled/failed if requested or All
      const isConfirmed = b.status === "Confirmed";
      const isCancelled = b.status === "Cancelled";
      const isFailed = b.status === "Failed";
      const isPending = b.status === "Pending";
      const amendmentRequested = b.amendment?.status === "requested";

      // If status filter is "All", we might want to show everything. 
      // But looking at the existing logic, it seems it was trying to only show "Confirmed" by default?
      // Given the user's request, we should probably allow showing what the statusFilter says.
      
      if (statusFilter !== "All" && b.status !== statusFilter) {
        return false;
      }
      
      // If it's "All", maybe we should still hide some things? 
      // Actually, the user said "total bookings", so it should probably show everything that is NOT discarded.
      const rawExecutionStatus = (b.executionStatus || "").toLowerCase();
      if (
        b.requestStatus === "discarded" ||
        rawExecutionStatus === "failed" ||
        rawExecutionStatus === "not_started"
      )
        return false;

      // Search
      const searchOk =
        !q ||
        b.guestName?.toLowerCase().includes(q) ||
        (b.orderId || "").toLowerCase().includes(q) ||
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

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const confirmed = filtered.filter((b) => b.status === "Confirmed").length;
  const pending = filtered.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
        {/* <StatCard
          label="Total Spend"
          value={`₹${total.toLocaleString()}`}
          Icon={FiDollarSign}
          borderCls="border-violet-500"
          iconBgCls="bg-violet-50"
          iconColorCls="text-violet-600"
        /> */}
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
              <tr className="bg-[#0f9041] text-[#ccfbf1]">
                <Th>Order ID</Th>
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
                      <IdCell id={b.orderId || "N/A"} />
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
                        onClick={() => navigate(`/manager/team-hotel-booking/${b._id}`)}
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
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function BookingsDashboardForManager() {
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
          <button
            onClick={handleRefresh}
            disabled={loadingActive}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={loadingActive ? "animate-spin" : ""}
            />
            Refresh
          </button>
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
