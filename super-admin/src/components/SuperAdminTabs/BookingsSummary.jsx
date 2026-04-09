import React, { useEffect, useMemo, useState } from "react";
import {
  FiEye,
  FiDownload,
  FiSearch,
  FiList,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightBookings,
  fetchHotelBookings,
} from "../../Redux/Actions/corporate.related.thunks";
import Pagination from "../Shared/Pagination";
import { FlightBookingModal, HotelBookingModal } from "../Shared/BookingRequestDetailsModal";

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
    return (
      corp.corporateName ||
      corp.name ||
      corp.title ||
      corp.code ||
      corp._id ||
      "N/A"
    );
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
  // Build a clean route:
  // - If we have both onward and return legs, show just the first and last (roundtrip style: AAA-BBB / BBB-AAA)
  // - Otherwise list all segments in order.
  let routeFromSegments;
  if (segments.length >= 2) {
    const hasOnward = segments.some(
      (s) => (s.journeyType || "").toLowerCase() === "onward",
    );
    const hasReturn = segments.some(
      (s) => (s.journeyType || "").toLowerCase() === "return",
    );
    if (hasOnward && hasReturn) {
      const first = segments[0];
      const last = segments[segments.length - 1];
      routeFromSegments = `${first?.origin?.airportCode || "?"}-${first?.destination?.airportCode || "?"} / ${last?.origin?.airportCode || "?"}-${last?.destination?.airportCode || "?"}`;
    } else {
      routeFromSegments = segments
        .map(
          (s) =>
            `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`,
        )
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
    b.bookingSnapshot?.travelDate ||
    segments.find((s) => (s.journeyType || "onward") === "onward")?.departureDateTime ||
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
    bookingRef: b.bookingReference || b._id || "—",
    corporate: getCorporateName(b),
    corpId: getCorporateId(b),
    employee: b.employeeName || travelerName,
    empId:
      b.userId ||
      b.employeeCode ||
      b.employeeId ||
      b.empId ||
      traveler.email ||
      "—",
    type: "Flight",
    date: travelDate,
    destination: route,
    amount,
    status: b.executionStatus || b.requestStatus || b.status || "Pending",
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
        ? [b.travellers[0].firstName, b.travellers[0].lastName]
            .filter(Boolean)
            .join(" ")
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
    roomType:
      b.hotelRequest?.selectedRoom?.rawRoomData?.Name?.[0] ||
      b.roomType ||
      b.room ||
      "",
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

export default function GlobalBookingsDashboard() {
  const dispatch = useDispatch();
  const {
    flightBookings,
    hotelBookings,
    flightPagination,
    hotelPagination,
    loadingFlights,
    loadingHotels,
  } = useSelector((state) => state.corporateRelated);

  const [activeTab, setActiveTab] = useState("Flight");
  const [corporate, setCorporate] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [flightPage, setFlightPage] = useState(1);
  const [hotelPage, setHotelPage] = useState(1);

  // Filters
  const [travelDate, setTravelDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");

  // Fetch based on active tab + page
  useEffect(() => {
    if (activeTab === "Flight") {
      dispatch(fetchFlightBookings({ page: flightPage, limit: DEFAULT_LIMIT }));
    } else {
      dispatch(fetchHotelBookings({ page: hotelPage, limit: DEFAULT_LIMIT }));
    }
  }, [activeTab, flightPage, hotelPage, dispatch]);

  // Reset page on tab switch
  useEffect(() => {
    if (activeTab === "Flight") {
      setFlightPage(1);
    } else {
      setHotelPage(1);
    }
  }, [activeTab]);

  const flights = useMemo(
    () =>
      (flightBookings || []).map((b) => ({
        ...normalizeFlight(b),
        _raw: b,
      })),
    [flightBookings],
  );
  const hotels = useMemo(
    () =>
      (hotelBookings || []).map((b) => ({
        ...normalizeHotel(b),
        _raw: b,
      })),
    [hotelBookings],
  );

  const corporates = useMemo(() => {
    const names = new Set(
      [...flights, ...hotels].map((b) => b.corporate).filter(Boolean),
    );
    return ["All", ...names];
  }, [flights, hotels]);

  const filtered = useMemo(() => {
    const source = activeTab === "Flight" ? flights : hotels;

    return source.filter((b) => {
      // hide blocked statuses
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

      const startOk =
        !startDate || new Date(b.date || b.checkIn || 0) >= new Date(startDate);
      const endOk =
        !endDate || new Date(b.date || b.checkOut || 0) <= new Date(endDate);

      return corpMatch && typeMatch && searchMatch && dateMatch && startOk && endOk;
    });
  }, [activeTab, flights, hotels, corporate, search, travelDate, checkIn, checkOut, startDate, endDate]);

  const totalSpend = filtered.reduce((sum, b) => sum + (b.amount || 0), 0);

  const handleModalClose = () => setSelectedBooking(null);

  const currentPagination =
    activeTab === "Flight" ? flightPagination : hotelPagination;
  const currentPage = currentPagination?.page || 1;
  const totalPages =
    currentPagination?.totalPages ||
    Math.max(
      1,
      Math.ceil(
        (currentPagination?.total || filtered.length || 0) /
          (currentPagination?.limit || DEFAULT_LIMIT),
      ),
    );

  const handlePageChange = (page) => {
    if (activeTab === "Flight") {
      setFlightPage(page);
    } else {
      setHotelPage(page);
    }
  };

  const isLoading = activeTab === "Flight" ? loadingFlights : loadingHotels;

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiList size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Global Bookings Summary
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Multi-Corporate Administration
            </p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab("Flight")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Flight"
                ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaPlane size={14} /> Flight Bookings
          </button>
          <button
            onClick={() => setActiveTab("Hotel")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Hotel"
                ? "bg-white text-[#088395] border-b-[#088395] shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaHotel size={14} /> Hotel Bookings
          </button>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label={`Total ${activeTab}s`}
            value={filtered.length}
            Icon={activeTab === "Flight" ? FaPlane : FaHotel}
            borderCls={
              activeTab === "Flight" ? "border-[#0A4D68]" : "border-[#088395]"
            }
            iconBgCls={
              activeTab === "Flight" ? "bg-[#0A4D68]/10" : "bg-[#088395]/10"
            }
            iconColorCls={
              activeTab === "Flight" ? "text-[#0A4D68]" : "text-[#088395]"
            }
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
            Icon={FiDollarSign}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className={`grid grid-cols-1 gap-4 ${activeTab === "Flight" ? "md:grid-cols-5" : "md:grid-cols-6"}`}>
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Traveller / ID / Emp ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="Corporate Account">
              <select
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {corporates.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </LabeledInput>

            {activeTab === "Flight" ? (
              <LabeledInput label="Travel Date">
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </LabeledInput>
            ) : (
              <>
                <LabeledInput label="Check-In Date">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                  />
                </LabeledInput>
                <LabeledInput label="Check-Out Date">
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                  />
                </LabeledInput>
              </>
            )}
            <LabeledInput label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
              />
            </LabeledInput>

            <LabeledInput label="End Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
              />
            </LabeledInput>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              {activeTab} Detailed Report
            </h2>
            <button
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase ${activeTab === "Flight" ? "bg-[#0A4D68]" : "bg-[#088395]"}`}
            >
              <FiDownload /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading {activeTab.toLowerCase()} bookings...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No {activeTab.toLowerCase()} bookings found.
              </div>
            ) : activeTab === "Flight" ? (
              <FlightTable data={filtered} onClose={handleModalClose} selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking} />
            ) : (
              <HotelTable data={filtered} onClose={handleModalClose} selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking} />
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showFirstLast
            />
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>
              Showing {filtered.length} {activeTab} Records
            </span>
            <span>
              Est. Market Value: {" "}
              <span
                className={
                  activeTab === "Flight" ? "text-[#0A4D68]" : "text-[#088395]"
                }
              >
                ₹{totalSpend.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- FLIGHT TABLE COMPONENT -----------------------------------
const FlightTable = ({ data, selectedBooking, setSelectedBooking, onClose }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-[#0A4D68]">
        {[
          "Booking ID",
          "Corporate Account",
          "Traveller / ID",
          "Travel Date",
          "Amount",
          "Status",
          "Airline / Route",
          "Action",
        ].map((h) => (
          <th
            key={h}
            className="px-6 py-4 text-[11px] font-bold text-teal-50 uppercase tracking-widest"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {data.map((b) => (
        <tr key={b.id || b.empId} className="hover:bg-slate-50 transition-all bg-white">
          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
            #{b.bookingRef || b.id}
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-[13px]">
                {b.corporate}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                {b.corpId}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[13px]">
                {b.employee}
              </span>
              <span className="text-[11px] text-teal-600 font-mono">
                 {b.empId}
              </span>
            </div>
          </td>
          <td className="px-6 py-4 text-slate-500 font-medium">
            {b.date
              ? new Date(b.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </td>
          <td className="px-6 py-4 font-black text-slate-900">
            ₹{(b.amount || 0).toLocaleString()}
          </td>
          <td className="px-6 py-4">
            <StatusLabel status={b.status} />
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[12px]">
                {b.destination}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {b.airline}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <button
              onClick={() => setSelectedBooking(b._raw)}
              className="p-2 rounded-lg bg-slate-100 text-[#0A4D68] hover:bg-slate-200 transition-colors"
            >
              <FiEye size={16} />
            </button>
          </td>
        </tr>
      ))}
    </tbody>
    {selectedBooking && (
      <FlightBookingModal booking={selectedBooking} onClose={onClose} />
    )}
  </table>
);

// --- HOTEL TABLE COMPONENT ------------------------------------
const HotelTable = ({ data, selectedBooking, setSelectedBooking, onClose }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-[#088395]">
        {[
          "Booking ID",
          "Corporate Account",
          "Guest / ID",
          "Duration",
          "Amount",
          "Status",
          "Hotel / Room",
          "Action",
        ].map((h) => (
          <th
            key={h}
            className="px-6 py-4 text-[11px] font-bold text-cyan-50 uppercase tracking-widest"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {data.map((b) => (
        <tr key={b.id || b.empId} className="hover:bg-slate-50 transition-all bg-white">
          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
            #{b.bookingRef || b.id}
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-[13px]">
                {b.corporate}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                {b.corpId}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[13px]">
                {b.employee}
              </span>
              <span className="text-[11px] text-cyan-600 font-mono">
               {b.empId}
              </span>
            </div>
          </td>
          <td className="px-6 py-4 text-slate-500 font-medium">
            <div className="text-[12px]">{b.checkIn || "—"}</div>
            <div className="text-[10px] text-slate-400">to {b.checkOut || "—"}</div>
          </td>
          <td className="px-6 py-4 font-black text-slate-900">
            ₹{(b.amount || 0).toLocaleString()}
          </td>
          <td className="px-6 py-4">
            <StatusLabel status={b.status} />
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[12px]">
                {b.destination}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {b.roomType}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <button
              onClick={() => setSelectedBooking(b._raw)}
              className="p-2 rounded-lg bg-slate-100 text-[#088395] hover:bg-slate-200 transition-colors"
            >
              <FiEye size={16} />
            </button>
          </td>
        </tr>
      ))}
    </tbody>
    {selectedBooking && (
      <HotelBookingModal booking={selectedBooking} onClose={onClose} />
    )}
  </table>
);

// --- HELPERS ---------------------------------------------------
function StatCard({ label, value, iconBgCls, iconColorCls, borderCls, Icon }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
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
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${cls}`}
    >
      {status || "Pending"}
    </span>
  );
}
