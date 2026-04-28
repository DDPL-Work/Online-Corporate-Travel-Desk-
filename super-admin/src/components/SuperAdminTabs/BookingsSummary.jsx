import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEye,
  FiDownload,
  FiSearch,
  FiList,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightBookings,
  fetchHotelBookings,
} from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "../Shared/BookingRequestDetailsModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

const DEFAULT_LIMIT = 10;

const getCorporateName = (b = {}) => {
  const corp = b.corporateName || b.corporate || b.corporateId;
  if (corp && typeof corp === "object") {
    return corp.corporateName || corp.name || corp.title || corp.code || corp._id || "N/A";
  }
  return corp || "N/A";
};

const getCorporateId = (b = {}) => {
  const corpId = b.corporateId || b.corporateCode || b.corporate;
  if (corpId && typeof corpId === "object") {
    return corpId._id || corpId.id || corpId.code || corpId.corporateCode || "—";
  }
  return corpId || "—";
};

const normalizeFlight = (b = {}) => {
  const traveler = (b.travellers && b.travellers[0]) || {};
  const travelerName =
    [traveler.firstName, traveler.lastName].filter(Boolean).join(" ").trim() ||
    traveler.email ||
    "N/A";

  const segments = b.flightRequest?.segments || [];
  let routeFromSegments;
  if (segments.length >= 2) {
    const hasOnward = segments.some((s) => (s.journeyType || "").toLowerCase() === "onward");
    const hasReturn = segments.some((s) => (s.journeyType || "").toLowerCase() === "return");
    if (hasOnward && hasReturn) {
      const first = segments[0];
      const last = segments[segments.length - 1];
      routeFromSegments = `${first?.origin?.airportCode || "?"}-${first?.destination?.airportCode || "?"} / ${last?.origin?.airportCode || "?"}-${last?.destination?.airportCode || "?"}`;
    } else {
      routeFromSegments = segments
        .map((s) => `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`)
        .join(" / ");
    }
  } else if (segments.length === 1) {
    const s = segments[0];
    routeFromSegments = `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`;
  }

  const routeFromSnapshot = Array.isArray(b.bookingSnapshot?.sectors)
    ? b.bookingSnapshot.sectors.join(" / ")
    : undefined;

  const route =
    routeFromSegments ||
    routeFromSnapshot ||
    b.bookingSnapshot?.city ||
    b.route ||
    b.destination ||
    [b.from, b.to].filter(Boolean).join(" -> ") ||
    b.sector ||
    "Route not available";

  const travelDate =
    segments.find((s) => (s.journeyType || "onward") === "onward")?.departureDateTime ||
    b.bookingSnapshot?.travelDate ||
    b.travelDate ||
    b.date ||
    b.createdAt ||
    "";

  const amount =
    Number(
      b.bookingSnapshot?.amount ||
        b.pricingSnapshot?.totalAmount ||
        b.flightRequest?.fareSnapshot?.onwardFare?.PublishedFare ||
        b.total ||
        b.totalFare ||
        b.price ||
        b.overallAmount ||
        0,
    ) || 0;

  return {
    id: b._id || b.bookingId || "—",
    pnr: b.bookingResult?.pnr || b.pnr || b.itinerary?.PNR || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: getCorporateName(b),
    corpId: getCorporateId(b),
    employee: b.employeeName || travelerName,
    empId: b.userId || b.employeeCode || b.employeeId || b.empId || traveler.email || "—",
    type: "Flight",
    date: travelDate,
    destination: route,
    amount,
    status: b.executionStatus || b.requestStatus || b.status || "Pending",
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory =
        Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
          ? b.amendmentHistory[b.amendmentHistory.length - 1]
          : {};
      const fRes =
        amendment.response?.[0]?.response?.Response?.TicketCRInfo?.[0] ||
        lastHistory.response?.[0]?.response?.Response?.TicketCRInfo?.[0];
      if (fRes?.ChangeRequestStatus === 4 || fRes?.RefundedAmount > 0) return "Processed";
      return dbStatus || null;
    })(),
    airline:
      b.bookingSnapshot?.airline ||
      segments[0]?.airlineName ||
      segments[0]?.airlineCode ||
      "",
  };
};

const normalizeHotel = (b = {}) => {
  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.selectedRoom?.Price?.totalFare ||
        b.totalFare ||
        b.amount ||
        0,
    ) || 0;

  const checkIn =
    b.bookingSnapshot?.checkInDate ||
    b.hotelRequest?.checkInDate ||
    b.checkIn ||
    b.checkInDate ||
    b.date ||
    "";
  const checkOut =
    b.bookingSnapshot?.checkOutDate ||
    b.hotelRequest?.checkOutDate ||
    b.checkOut ||
    b.checkOutDate ||
    b.endDate ||
    "";

  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: getCorporateName(b),
    corpId: getCorporateId(b),
    employee:
      b.employeeName ||
      b.guestName ||
      b.travelerName ||
      (b.travellers && b.travellers[0]
        ? [b.travellers[0].firstName, b.travellers[0].lastName].filter(Boolean).join(" ")
        : "N/A"),
    empId: b.userId || b.employeeCode || b.employeeId || b.empId || "—",
    type: "Hotel",
    checkIn,
    checkOut,
    date: checkIn || b.date || "",
    destination:
      b.bookingSnapshot?.hotelName ||
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.hotelName ||
      b.property ||
      b.destination ||
      "Hotel",
    amount,
    status: b.executionStatus || b.requestStatus || b.status || "Pending",
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory =
        Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
          ? b.amendmentHistory[b.amendmentHistory.length - 1]
          : {};
      const hRes =
        amendment.providerResponse?.HotelChangeRequestResult ||
        lastHistory.providerResponse?.HotelChangeRequestResult ||
        {};
      if (hRes.ChangeRequestStatus === 3 || hRes.RefundedAmount > 0) return "Processed";
      return dbStatus || null;
    })(),
    roomType:
      b.hotelRequest?.selectedRoom?.rawRoomData?.Name?.[0] || b.roomType || b.room || "",
  };
};

const isSuccessStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["completed", "ticketed", "approved", "success", "voucher_generated"].includes(s);
};

const isPendingStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["pending", "pending_approval", "not_started", "initiated", "in_progress"].includes(s);
};

const isBlockedStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["failed", "not_started"].includes(s);
};

const formatDisplayDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatExportDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Truncate long IDs for display
const truncateId = (id = "", maxLen = 16) => {
  if (!id || id === "—") return id;
  return id.length > maxLen ? `${id.slice(0, maxLen)}…` : id;
};

export default function GlobalBookingsDashboard() {
  const tableScrollRef = useRef(null);
  const dispatch = useDispatch();
  const {
    flightBookings,
    hotelBookings,
    loadingFlights,
    loadingHotels,
  } = useSelector((state) => state.corporateRelated);

  const { corporates: onboardedCorporates } = useSelector((state) => state.corporateList);

  const [activeTab, setActiveTab] = useState("Flight");
  const [corporate, setCorporate] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [flightPage, setFlightPage] = useState(1);
  const [hotelPage, setHotelPage] = useState(1);

  const [travelDate, setTravelDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (activeTab === "Flight") setFlightPage(1);
    else setHotelPage(1);
  }, [search, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === "Flight") dispatch(fetchFlightBookings());
    else dispatch(fetchHotelBookings());
  }, [activeTab, dispatch]);

  useEffect(() => {
    dispatch(fetchCorporates());
  }, [dispatch]);

  const flights = useMemo(
    () => (flightBookings || []).map((b) => ({ ...normalizeFlight(b), _raw: b })),
    [flightBookings],
  );
  const hotels = useMemo(
    () => (hotelBookings || []).map((b) => ({ ...normalizeHotel(b), _raw: b })),
    [hotelBookings],
  );

  const corporates = useMemo(() => {
    const fromOnboarded = (onboardedCorporates || []).map(
      (c) => c.corporateName || c.name || c.title,
    );
    const validBookings = [...flights, ...hotels].filter((b) => !isBlockedStatus(b.status));
    const namesFromBookings = validBookings.map((b) => b.corporate).filter(Boolean);
    const allNames = new Set([...fromOnboarded, ...namesFromBookings]);
    return ["All", ...Array.from(allNames).sort()];
  }, [onboardedCorporates, flights, hotels]);

  const filtered = useMemo(() => {
    const source = activeTab === "Flight" ? flights : hotels;
    return source.filter((b) => {
      if (isBlockedStatus(b.status)) return false;
      const corpMatch = corporate === "All" || b.corporate === corporate;
      const typeMatch = b.type === activeTab;
      const searchText = search.trim().toLowerCase();
      const searchMatch =
        !searchText ||
        b.employee?.toLowerCase().includes(searchText) ||
        b.id?.toLowerCase().includes(searchText) ||
        b.empId?.toLowerCase().includes(searchText) ||
        b.bookingRef?.toLowerCase?.().includes(searchText);

      let dateMatch = true;
      if (activeTab === "Flight" && travelDate) {
        dateMatch = (b.date || "").slice(0, 10) === travelDate;
      } else if (activeTab === "Hotel") {
        const cinMatch = !checkIn || (b.checkIn || "").slice(0, 10) === checkIn;
        const coutMatch = !checkOut || (b.checkOut || "").slice(0, 10) === checkOut;
        dateMatch = cinMatch && coutMatch;
      }

      const dStart = b.date || b.checkIn;
      const startOk = !startDate || (dStart && new Date(dStart) >= new Date(startDate));
      const dEnd = b.date || b.checkOut;
      const endOk = !endDate || (dEnd && new Date(dEnd) <= new Date(endDate));

      return corpMatch && typeMatch && searchMatch && dateMatch && startOk && endOk;
    });
  }, [activeTab, flights, hotels, corporate, search, travelDate, checkIn, checkOut, startDate, endDate]);

  const totalSpend = filtered.reduce((sum, b) => sum + (b.amount || 0), 0);
  const handleModalClose = () => setSelectedBooking(null);

  const currentPage = activeTab === "Flight" ? flightPage : hotelPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_LIMIT));

  const paginatedData = useMemo(() => {
    const pg = activeTab === "Flight" ? flightPage : hotelPage;
    const start = (pg - 1) * DEFAULT_LIMIT;
    return filtered.slice(start, start + DEFAULT_LIMIT);
  }, [filtered, flightPage, hotelPage, activeTab]);

  const handlePageChange = (page) => {
    if (activeTab === "Flight") setFlightPage(page);
    else setHotelPage(page);
  };

  const isLoading = activeTab === "Flight" ? loadingFlights : loadingHotels;

  const handleExport = () => {
    if (isLoading || filtered.length === 0) return;

    const isFlightTab = activeTab === "Flight";
    const headers = isFlightTab
      ? [
          "Booking ID",
          "Corporate Account",
          "Traveller / ID",
          "Travel Date",
          "PNR",
          "Status",
          "Airline / Route",
        ]
      : [
          "Booking ID",
          "Corporate Account",
          "Guest / ID",
          "Duration",
          "Amount",
          "Status",
          "Hotel / Room",
        ];

    const rows = filtered.map((booking) =>
      isFlightTab
        ? [
            booking.id || "N/A",
            booking.corporate || "N/A",
            `${booking.employee || "N/A"} | ${booking.empId || "N/A"}`,
            formatExportDate(booking.date),
            booking.pnr || "N/A",
            booking.refundStatus
              ? `${booking.status || "Pending"} | Refund: ${booking.refundStatus}`
              : booking.status || "Pending",
            `${booking.destination || "N/A"} | ${booking.airline || "N/A"}`,
          ]
        : [
            booking.id || "N/A",
            booking.corporate || "N/A",
            `${booking.employee || "N/A"} | ${booking.empId || "N/A"}`,
            `${formatExportDate(booking.checkIn)} -> ${formatExportDate(booking.checkOut)}`,
            `INR ${Number(booking.amount || 0).toLocaleString("en-IN")}`,
            booking.refundStatus
              ? `${booking.status || "Pending"} | Refund: ${booking.refundStatus}`
              : booking.status || "Pending",
            `${booking.destination || "N/A"} | ${booking.roomType || "N/A"}`,
          ],
    );

    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:10px;vertical-align:top;">${escapeHtml(cell)}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table>
      <thead>
        <tr>
          ${headers
            .map(
              (header) =>
                `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#ffffff;font-weight:700;text-align:left;">${escapeHtml(header)}</th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `bookings-summary-${activeTab.toLowerCase()}-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-5 xl:p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-[1440px] mx-auto w-full space-y-4 xl:space-y-5">

        {/* PAGE HEADER */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
            <FiList size={20} />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-lg xl:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
              Global Bookings Summary
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
              Multi-Corporate Administration
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap items-end gap-1 border-b-2 border-slate-200">
          {["Flight", "Hotel"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 xl:px-8 py-2.5 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
                activeTab === tab
                  ? `bg-white border-b-[${tab === "Flight" ? "#0A4D68" : "#088395"}] shadow-sm ${tab === "Flight" ? "text-[#0A4D68] border-b-[#0A4D68]" : "text-[#088395] border-b-[#088395]"}`
                  : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
              }`}
            >
              {tab === "Flight" ? <FaPlane size={13} /> : <FaHotel size={13} />}
              {tab} Bookings
            </button>
          ))}
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
          <StatCard
            label={`Total ${activeTab}s`}
            value={filtered.length}
            Icon={activeTab === "Flight" ? FaPlane : FaHotel}
            borderCls={activeTab === "Flight" ? "border-[#0A4D68]" : "border-[#088395]"}
            iconBgCls={activeTab === "Flight" ? "bg-[#0A4D68]/10" : "bg-[#088395]/10"}
            iconColorCls={activeTab === "Flight" ? "text-[#0A4D68]" : "text-[#088395]"}
          />
          <StatCard
            label="Confirmed"
            value={filtered.filter((b) => isSuccessStatus(b.status)).length}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Pending"
            value={filtered.filter((b) => isPendingStatus(b.status)).length}
            Icon={FiClock}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Total Spend"
            value={`₹${totalSpend.toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-xl shadow-sm p-4 xl:p-5 border border-slate-100">
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${
            activeTab === "Flight" ? "xl:grid-cols-5" : "xl:grid-cols-6"
          }`}>
            {/* Search */}
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Traveller or booking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
                />
              </div>
            </LabeledInput>

            {/* Corporate */}
            <LabeledInput label="Corporate Account">
              <select
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68] focus:bg-white transition-colors"
              >
                {corporates.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </LabeledInput>

            {/* Date filters */}
            {activeTab === "Flight" ? (
              <LabeledInput label="Travel Date">
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
                />
              </LabeledInput>
            ) : (
              <>
                <LabeledInput label="Check-In Date">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
                  />
                </LabeledInput>
                <LabeledInput label="Check-Out Date">
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
                  />
                </LabeledInput>
              </>
            )}

            <LabeledInput label="Booking From">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
              />
            </LabeledInput>

            <LabeledInput label="Booking To">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:border-[#0A4D68] focus:bg-white transition-colors"
              />
            </LabeledInput>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 xl:px-5 py-3.5 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-base xl:text-lg">
              {activeTab} Detailed Report
            </h2>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export CSV"
              onExport={handleExport}
              exportClassName={activeTab === "Flight"
                ? "bg-[#0A4D68] hover:bg-[#083d52] shadow-[#0A4D68]/20"
                : "bg-[#088395] hover:bg-[#066f7e] shadow-[#088395]/20"}
              arrowClassName={activeTab === "Flight"
                ? "border-cyan-100 bg-cyan-50 text-[#0A4D68] hover:bg-cyan-100 hover:border-cyan-200 hover:text-[#083d52] disabled:hover:bg-cyan-50"
                : "border-teal-100 bg-teal-50 text-[#088395] hover:bg-teal-100 hover:border-teal-200 hover:text-[#066f7e] disabled:hover:bg-teal-50"}
            />
          </div>

          {/* Table — no horizontal scroll, fixed layout fills 100% width */}
          <div ref={tableScrollRef} className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading {activeTab.toLowerCase()} bookings...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No {activeTab.toLowerCase()} bookings found.
              </div>
            ) : activeTab === "Flight" ? (
              <FlightTable
                data={paginatedData}
                onClose={handleModalClose}
                selectedBooking={selectedBooking}
                setSelectedBooking={setSelectedBooking}
              />
            ) : (
              <HotelTable
                data={paginatedData}
                onClose={handleModalClose}
                selectedBooking={selectedBooking}
                setSelectedBooking={setSelectedBooking}
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-4 xl:px-5 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showFirstLast
            />
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-4 xl:px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} {activeTab} Records</span>
            <span>
              Est. Market Value:{" "}
              <span className={activeTab === "Flight" ? "text-[#0A4D68]" : "text-[#088395]"}>
                ₹{totalSpend.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FLIGHT TABLE ────────────────────────────────────────────────────────────
const FlightTable = ({ data, selectedBooking, setSelectedBooking, onClose }) => (
  <>
    {/*
      table-fixed + w-full = fills container exactly, no horizontal scroll.
      Column widths sum to 100%. Adjust percentages as needed.
        Booking ID    : 18%
        Corporate     : 16%
        Traveller/ID  : 15%
        Travel Date   : 10%
        PNR           :  9%
        Status        : 14%
        Airline/Route : 13%
        Action        :  5%
    */}
    <table className="min-w-[1120px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "18%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "5%" }} />
      </colgroup>
      <thead>
        <tr className="bg-[#0A4D68]">
          {["Booking ID", "Corporate Account", "Traveller / ID", "Travel Date", "PNR", "Status", "Airline / Route", ""].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-4 align-middle text-[10px] font-bold text-teal-50 uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-sm">
        {data.map((b) => (
          <tr key={b.id || b.empId} className="h-[92px] hover:bg-slate-50/70 transition-colors bg-white">

            {/* Booking ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-slate-400 truncate block">
                  #{truncateId(b.id, 22)}
                </span>
              </div>
            </td>

            {/* Corporate */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-800 text-[12px] truncate">{b.corporate}</p>
              </div>
            </td>

            {/* Traveller */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-700 text-[12px] truncate">{b.employee}</p>
              </div>
            </td>

            {/* Travel Date */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center whitespace-nowrap text-slate-500 font-medium text-[12px]">
                {formatDisplayDate(b.date)}
              </div>
            </td>

            {/* PNR */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center font-mono font-black text-[12px] text-[#0A4D68] uppercase tracking-tight">
                {b.pnr}
              </div>
            </td>

            {/* Status */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] flex-col items-start justify-center gap-1.5">
                <StatusLabel status={b.status} />
                {b.refundStatus && <RefundMeta refundStatus={b.refundStatus} />}
              </div>
            </td>

            {/* Airline / Route */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] flex-col justify-center">
                <p className="font-bold text-slate-700 text-[12px] truncate">{b.destination}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-1">{b.airline}</p>
              </div>
            </td>

            {/* Action */}
            <td className="px-4 xl:px-5 py-4 align-middle text-center">
              <div className="flex min-h-[52px] items-center justify-center">
                <button
                  onClick={() => setSelectedBooking(b._raw)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#0A4D68] hover:bg-[#0A4D68]/10 transition-colors"
                  title="View details"
                >
                  <FiEye size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {selectedBooking && <FlightBookingModal booking={selectedBooking} onClose={onClose} />}
  </>
);

// ─── HOTEL TABLE ─────────────────────────────────────────────────────────────
const HotelTable = ({ data, selectedBooking, setSelectedBooking, onClose }) => (
  <>
    {/*
      Column widths:
        Booking ID    : 18%
        Corporate     : 15%
        Guest/ID      : 15%
        Duration      : 13%
        Amount        :  9%
        Status        : 14%
        Hotel/Room    : 11%
        Action        :  5%
    */}
    <table className="min-w-[1120px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "18%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "5%" }} />
      </colgroup>
      <thead>
        <tr className="bg-[#088395]">
          {["Booking ID", "Corporate Account", "Guest / ID", "Duration", "Amount", "Status", "Hotel / Room", ""].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-4 align-middle text-[10px] font-bold text-cyan-50 uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-sm">
        {data.map((b) => (
          <tr key={b.id || b.empId} className="h-[92px] hover:bg-slate-50/70 transition-colors bg-white">

            {/* Booking ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-slate-400 truncate block">
                  #{truncateId(b.id, 22)}
                </span>
              </div>
            </td>

            {/* Corporate */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-800 text-[12px] truncate">{b.corporate}</p>
              </div>
            </td>

            {/* Guest */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-700 text-[12px] truncate">{b.employee}</p>
              </div>
            </td>

            {/* Duration */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <p className="text-slate-600 font-medium text-[12px] whitespace-nowrap">{formatDisplayDate(b.checkIn)}</p>
              <p className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">→ {formatDisplayDate(b.checkOut)}</p>
            </td>

            {/* Amount */}
            <td className="px-3 xl:px-4 py-3.5 align-middle font-black text-slate-900 text-[12px] whitespace-nowrap">
              ₹{(b.amount || 0).toLocaleString()}
            </td>

            {/* Status */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <div className="flex flex-col items-start gap-1">
                <StatusLabel status={b.status} />
                {b.refundStatus && <RefundMeta refundStatus={b.refundStatus} />}
              </div>
            </td>

            {/* Hotel / Room */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <p className="font-bold text-slate-700 text-[12px] truncate">{b.destination}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{b.roomType}</p>
            </td>

            {/* Action */}
            <td className="pl-3 pr-6 xl:pl-4 xl:pr-8 py-3.5 align-middle text-center">
              <button
                onClick={() => setSelectedBooking(b._raw)}
                className="p-1.5 rounded-lg bg-slate-100 text-[#088395] hover:bg-[#088395]/10 transition-colors"
                title="View details"
              >
                <FiEye size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {selectedBooking && <HotelBookingModal booking={selectedBooking} onClose={onClose} />}
  </>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function RefundMeta({ refundStatus }) {
  const isProcessed = refundStatus.toLowerCase().includes("process");
  return (
    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wide leading-none ${
      isProcessed ? "text-emerald-600" : "text-rose-600"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProcessed ? "bg-emerald-500" : "bg-rose-500"}`} />
      Refund: {refundStatus}
    </div>
  );
}

function StatCard({ label, value, iconBgCls, iconColorCls, borderCls, Icon }) {
  return (
    <div className={`bg-white rounded-xl p-3.5 xl:p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}>
      <div className={`w-9 h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}>
        <Icon size={16} className={iconColorCls} />
      </div>
      <div className="text-left min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
        <p className="text-lg xl:text-xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusLabel({ status }) {
  const s = (status || "").toLowerCase();
  const isSuccess = isSuccessStatus(status);
  const isWarn = isPendingStatus(status);
  const isError = ["failed", "cancelled", "error"].includes(s);

  let cls = "bg-slate-100 text-slate-700 border-slate-200";
  if (isSuccess) cls = "bg-emerald-50 text-emerald-700 border-emerald-100";
  else if (isWarn) cls = "bg-amber-50 text-amber-700 border-amber-100";
  else if (isError) cls = "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${cls}`}>
      {status || "Pending"}
    </span>
  );
}