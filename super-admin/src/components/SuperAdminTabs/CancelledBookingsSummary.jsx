import React, { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiEye,
  FiDollarSign,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiTrash2,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightCancellations,
  fetchHotelCancellations,
} from "../../Redux/Actions/corporate.related.thunks";
import Pagination from "../Shared/Pagination";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "../Shared/BookingRequestDetailsModal";

const colors = {
  danger: "#BE123C", // Rose-700
  dangerLight: "#FFF1F2",
  dark: "#1E293B",
  light: "#F8FAFC",
};

const normalizeCorpName = (val) => {
  if (!val) return "N/A";
  if (typeof val === "object")
    return (
      val.corporateName || val.name || val.title || val.code || val._id || "N/A"
    );
  return val;
};

const normalizeCorpId = (val) => {
  if (!val) return "—";
  if (typeof val === "object")
    return val._id || val.id || val.code || val.corporateCode || "—";
  return val;
};

const normalizeFlight = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const travellerName =
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    b.employeeName ||
    "N/A";

  const segments = b.flightRequest?.segments || [];
  const route =
    (segments.length &&
      segments
        .map(
          (s) =>
            `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`,
        )
        .join(" / ")) ||
    (Array.isArray(b.bookingSnapshot?.sectors)
      ? b.bookingSnapshot.sectors.join(" / ")
      : "") ||
    b.bookingSnapshot?.city ||
    b.destination ||
    "—";

  const travelDt =
    b.bookingSnapshot?.travelDate ||
    segments.find((s) => (s.journeyType || "onward") === "onward")
      ?.departureDateTime ||
    b.travelDate ||
    b.date ||
    b.createdAt ||
    "";

  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";

  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.total ||
        b.totalFare ||
        b.price ||
        0,
    ) || 0;

  // Pick amendment details from live amendment first, fallback to last history record
  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};
  const amendmentType = amendment.type || lastHistory.type || "";
  const amendmentStatus = amendment.status || lastHistory.status || "";
  const changeRequestId =
    amendment.changeRequestId || lastHistory.changeRequestId || "";

  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: b.employeeName || travellerName,
    empId: b.userId || traveller.email || "—",
    type: "Flight",
    date: travelDt,
    cancelDate: cancelDt,
    destination: route,
    amount,
    refundStatus: b.refundStatus || "Pending",
    amendmentType,
    amendmentStatus,
    changeRequestId,
    airline:
      b.bookingSnapshot?.airline ||
      segments[0]?.airlineName ||
      segments[0]?.airlineCode ||
      "",
  };
};

const normalizeHotel = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const guestName =
    b.employeeName ||
    b.guestName ||
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    "N/A";

  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";

  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.selectedRoom?.Price?.totalFare ||
        b.totalFare ||
        b.amount ||
        0,
    ) || 0;

  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};

  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: guestName,
    empId: b.userId || traveller.email || "—",
    type: "Hotel",
    cancelDate: cancelDt,
    checkIn:
      b.bookingSnapshot?.checkInDate ||
      b.hotelRequest?.checkInDate ||
      b.checkIn ||
      b.checkInDate ||
      "",
    checkOut:
      b.bookingSnapshot?.checkOutDate ||
      b.hotelRequest?.checkOutDate ||
      b.checkOut ||
      b.checkOutDate ||
      "",
    destination:
      b.bookingSnapshot?.hotelName ||
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.hotelName ||
      b.property ||
      "—",
    roomType:
      b.hotelRequest?.selectedRoom?.rawRoomData?.Name?.[0] ||
      b.roomType ||
      b.room ||
      "",
    amount,
    refundStatus: b.refundStatus || "Pending",
    amendmentType: amendment.type || lastHistory.type || "",
    amendmentStatus: amendment.status || lastHistory.status || "",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "",
  };
};

export default function CancellationDashboard() {
  const dispatch = useDispatch();
  const {
    flightCancellations,
    flightCancellationPagination,
    loadingFlightCancellations,
    hotelCancellations,
    hotelCancellationPagination,
    loadingHotelCancellations,
  } = useSelector((state) => state.corporateRelated);

  const [activeTab, setActiveTab] = useState("Flight");
  const [search, setSearch] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [cancelDate, setCancelDate] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");

  const [flightPage, setFlightPage] = useState(1);
  const [hotelPage, setHotelPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // reset page on tab switch
  useEffect(() => {
    if (activeTab === "Flight") setFlightPage(1);
    else setHotelPage(1);
    setSelectedBooking(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Flight") {
      dispatch(fetchFlightCancellations({ page: flightPage, limit: 10 }));
    } else {
      dispatch(fetchHotelCancellations({ page: hotelPage, limit: 10 }));
    }
  }, [activeTab, flightPage, hotelPage, dispatch]);

  const flights = useMemo(
    () =>
      (flightCancellations || []).map((b) => ({
        ...normalizeFlight(b),
        _raw: b,
      })),
    [flightCancellations],
  );
  const hotels = useMemo(
    () =>
      (hotelCancellations || []).map((b) => ({
        ...normalizeHotel(b),
        _raw: b,
      })),
    [hotelCancellations],
  );

  const corporates = useMemo(() => {
    const names = new Set(
      [...flights, ...hotels].map((b) => b.corporate).filter(Boolean),
    );
    return ["All", ...names];
  }, [flights, hotels]);

  const filtered = (activeTab === "Flight" ? flights : hotels).filter((b) => {
    const typeMatch = b.type === activeTab;
    const corpMatch = corporate === "All" || b.corporate === corporate;
    const searchMatch =
      !search ||
      (b.employee || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.bookingRef || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.empId || "").toLowerCase().includes(search.toLowerCase());

    const cDateMatch =
      !cancelDate || (b.cancelDate || "").slice(0, 10) === cancelDate;

    let specificDateMatch = true;
    if (activeTab === "Flight" && travelDate) {
      specificDateMatch = (b.date || "").slice(0, 10) === travelDate;
    } else if (activeTab === "Hotel" && checkIn) {
      specificDateMatch = (b.checkIn || "").slice(0, 10) === checkIn;
    }

    const startOk =
      !startDate ||
      new Date(b.cancelDate || b.date || b.checkIn || 0) >= new Date(startDate);
    const endOk =
      !endDate ||
      new Date(b.cancelDate || b.date || b.checkIn || 0) <= new Date(endDate);

    return (
      typeMatch &&
      corpMatch &&
      searchMatch &&
      cDateMatch &&
      specificDateMatch &&
      startOk &&
      endOk
    );
  });

  const totalLoss = filtered.reduce((sum, b) => sum + (b.amount || 0), 0);

  const currentPagination =
    activeTab === "Flight"
      ? flightCancellationPagination
      : hotelCancellationPagination;
  const currentPage =
    currentPagination?.page ||
    (activeTab === "Flight" ? flightPage : hotelPage);
  const totalPages =
    currentPagination?.totalPages ||
    Math.max(
      1,
      Math.ceil(
        (currentPagination?.total || filtered.length || 0) /
          (currentPagination?.limit || 10),
      ),
    );

  const isLoading =
    activeTab === "Flight"
      ? loadingFlightCancellations
      : loadingHotelCancellations;

  const handlePageChange = (page) => {
    if (activeTab === "Flight") setFlightPage(page);
    else setHotelPage(page);
  };

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-700 to-rose-500 flex items-center justify-center shadow-lg text-white">
            <FiXCircle size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Cancellation Archive
            </h1>
            <p className="text-xs text-rose-600 mt-1 font-bold uppercase tracking-widest">
              Super Admin Monitor
            </p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab("Flight")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Flight"
                ? "bg-white text-rose-700 border-b-rose-700 shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <FaPlane size={14} /> Cancelled Flights
          </button>
          <button
            onClick={() => setActiveTab("Hotel")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Hotel"
                ? "bg-white text-rose-700 border-b-rose-700 shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <FaHotel size={14} /> Cancelled Hotels
          </button>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label={`Total Cancelled`}
            value={filtered.length}
            Icon={FiTrash2}
            borderCls="border-rose-700"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-700"
          />
          <StatCard
            label="Refund Processed"
            value={
              filtered.filter((b) =>
                (b.refundStatus || "").toLowerCase().includes("process"),
              ).length
            }
            Icon={FiRotateCcw}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Refund Pending"
            value={
              filtered.filter((b) =>
                (b.refundStatus || "").toLowerCase().includes("pending"),
              ).length
            }
            Icon={FiAlertCircle}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Total Value"
            value={`₹${totalLoss.toLocaleString()}`}
            Icon={FiDollarSign}
            borderCls="border-slate-800"
            iconBgCls="bg-slate-100"
            iconColorCls="text-slate-800"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <LabeledInput label="Cancellation Date">
              <input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
              />
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
              <LabeledInput label="Check-In Date">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </LabeledInput>
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

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              {activeTab} Void List
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md uppercase">
              <FiDownload /> Export Voids
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading cancellations...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No cancellations found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    {[
                      "Booking ID",
                      "Corporate",
                      "Traveller / ID",
                      "Cancelled On",
                      // "Original Date",
                      ...(activeTab === "Flight"
                        ? [
                            "Amendment Type",
                            "Change Request ID",
                            "Amendment Status",
                          ]
                        : []),
                      activeTab === "Flight"
                        ? "Route"
                        : "Hotel Name",
                      "View",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[11px] font-bold text-slate-300 uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((b) => (
                    <tr
                      key={b.bookingRef || b.id}
                      className="hover:bg-rose-50/30 transition-all bg-white"
                    >
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                        #{b.bookingRef || b.id}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-[13px]">
                        <div className="flex flex-col">
                          <span>{b.corporate}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.corpId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[13px]">
                            {b.employee}
                          </span>
                          <span className="text-[11px] text-rose-600 font-mono">
                            {" "}
                            {b.empId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-rose-700 font-bold">
                        {b.cancelDate
                          ? new Date(b.cancelDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      {/* <td className="px-6 py-4 text-slate-500 font-medium">
                        {activeTab === "Flight"
                          ? b.date && new Date(b.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : `${b.checkIn || "—"}`}
                      </td> */}
                      {activeTab === "Flight" && (
                        <>
                          <td className="px-6 py-4 text-[12px] text-slate-700 font-semibold uppercase">
                            {b.amendmentType || "—"}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                            {b.changeRequestId || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase border bg-blue-50 text-blue-700 border-blue-100">
                              {b.amendmentStatus || "—"}
                            </span>
                          </td>
                        </>
                      )}
                      {/* <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                          (b.refundStatus || "").toLowerCase().includes("process")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {b.refundStatus}
                        </span>
                      </td> */}
                      <td className="-px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[12px]">
                            {b.destination}
                          </span>
                          {/* <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {activeTab === "Flight" ? b.airline : b.roomType}
                          </span> */}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          onClick={() => setSelectedBooking(b._raw)}
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        </div>
      </div>
      {selectedBooking && activeTab === "Flight" && (
        <FlightBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {selectedBooking && activeTab === "Hotel" && (
        <HotelBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}

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
