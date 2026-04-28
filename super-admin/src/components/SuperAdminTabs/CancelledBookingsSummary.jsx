import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiEye,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiTrash2,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightCancellations,
  fetchHotelCancellations,
} from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "../Shared/BookingRequestDetailsModal";
import { FloatingHintButton } from "../Shared/TableActionBar";

const colors = {
  danger: "#BE123C",
  dangerLight: "#FFF1F2",
  dark: "#1E293B",
  light: "#F8FAFC",
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
    employee: b.employeeName || travellerName,
    empId: b.userId || traveller.email || "—",
    type: "Flight",
    date: travelDt,
    cancelDate: cancelDt,
    service: route,
    amount,
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const fRes =
        amendment.response?.[0]?.response?.Response?.TicketCRInfo?.[0] ||
        lastHistory.response?.[0]?.response?.Response?.TicketCRInfo?.[0];
      if (fRes?.ChangeRequestStatus === 4 || fRes?.RefundedAmount > 0)
        return "Processed";
      return dbStatus || "Pending";
    })(),
    amendmentType: amendment.type || lastHistory.type || "—",
    amendmentStatus: amendment.status || lastHistory.status || "—",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "—",
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
    date:
      b.bookingSnapshot?.checkInDate ||
      b.hotelRequest?.checkInDate ||
      b.checkIn ||
      b.checkInDate ||
      "",
    service:
      b.bookingSnapshot?.hotelName ||
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.hotelName ||
      b.property ||
      "—",
    amount,
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const hRes =
        amendment.providerResponse?.HotelChangeRequestResult ||
        lastHistory.providerResponse?.HotelChangeRequestResult ||
        {};
      if (hRes.ChangeRequestStatus === 3 || hRes.RefundedAmount > 0)
        return "Processed";
      return dbStatus || "Pending";
    })(),
    amendmentType: amendment.type || lastHistory.type || "—",
    amendmentStatus: amendment.status || lastHistory.status || "—",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "—",
  };
};

export default function CancellationDashboard() {
  const dispatch = useDispatch();
  const {
    flightCancellations,
    loadingFlightCancellations,
    hotelCancellations,
    loadingHotelCancellations,
  } = useSelector((state) => state.corporateRelated);

  const { corporates: onboardedCorporates } = useSelector(
    (state) => state.corporateList,
  );

  const [bookingType, setBookingType] = useState("All");
  const [search, setSearch] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [cancelDate, setCancelDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [scrollControls, setScrollControls] = useState({
    hasHorizontalOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });
  const tableScrollRef = useRef(null);

  useEffect(() => {
    dispatch(fetchFlightCancellations({}));
    dispatch(fetchHotelCancellations({}));
    dispatch(fetchCorporates());
  }, [dispatch]);

  const allRecords = useMemo(() => {
    const flights = (flightCancellations || []).map((b) => ({
      ...normalizeFlight(b),
      _raw: b,
    }));
    const hotels = (hotelCancellations || []).map((b) => ({
      ...normalizeHotel(b),
      _raw: b,
    }));
    return [...flights, ...hotels].sort(
      (a, b) => new Date(b.cancelDate) - new Date(a.cancelDate),
    );
  }, [flightCancellations, hotelCancellations]);

  const corporates = useMemo(() => {
    const fromOnboarded = (onboardedCorporates || []).map(
      (c) => c.corporateName || c.name || c.title,
    );
    const namesFromBookings = allRecords
      .map((b) => b.corporate)
      .filter(Boolean);
    const allNames = new Set([...fromOnboarded, ...namesFromBookings]);
    return ["All", ...Array.from(allNames).sort()];
  }, [onboardedCorporates, allRecords]);

  const filtered = useMemo(() => {
    return allRecords.filter((b) => {
      const typeMatch = bookingType === "All" || b.type === bookingType;
      const corpMatch = corporate === "All" || b.corporate === corporate;
      const searchMatch =
        !search ||
        (b.employee || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.bookingRef || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.empId || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.service || "").toLowerCase().includes(search.toLowerCase());

      const cDateMatch =
        !cancelDate || (b.cancelDate || "").slice(0, 10) === cancelDate;

      const dStamp = new Date(b.cancelDate);
      const startOk = !startDate || dStamp >= new Date(startDate);
      const endOk = !endDate || dStamp <= new Date(endDate);

      return typeMatch && corpMatch && searchMatch && cDateMatch && startOk && endOk;
    });
  }, [allRecords, bookingType, corporate, search, cancelDate, startDate, endDate]);

  const totalValue = filtered.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const paginatedData = filtered.slice((page - 1) * 10, page * 10);

  useEffect(() => {
    setPage(1);
  }, [bookingType, search, corporate, cancelDate, startDate, endDate]);

  const isLoading = loadingFlightCancellations || loadingHotelCancellations;

  useEffect(() => {
    const scrollEl = tableScrollRef.current;

    if (!scrollEl || isLoading) {
      setScrollControls({
        hasHorizontalOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
      });
      return undefined;
    }

    const syncScrollControls = () => {
      const maxScrollLeft = Math.max(
        0,
        scrollEl.scrollWidth - scrollEl.clientWidth,
      );

      setScrollControls({
        hasHorizontalOverflow: maxScrollLeft > 4,
        canScrollLeft: scrollEl.scrollLeft > 4,
        canScrollRight: scrollEl.scrollLeft < maxScrollLeft - 4,
      });
    };

    syncScrollControls();
    scrollEl.addEventListener("scroll", syncScrollControls, {
      passive: true,
    });
    window.addEventListener("resize", syncScrollControls);

    return () => {
      scrollEl.removeEventListener("scroll", syncScrollControls);
      window.removeEventListener("resize", syncScrollControls);
    };
  }, [isLoading, page, filtered.length]);

  const handleTableScroll = (direction) => {
    const scrollEl = tableScrollRef.current;

    if (!scrollEl) return;

    scrollEl.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  const handleExport = () => {
    const headers = [
      "Service",
      "Booking Context",
      "Traveller",
      "Timeline",
      "Refund",
      "Value",
    ];

    const rows = filtered.map((b) => {
      const serviceMeta = b.type === "Flight" ? b.airline || "Flight" : "Hotel Stay";
      const travelDate = b.date ? formatExportDate(b.date) : "N/A";

      return [
        `${b.service || "N/A"} (${serviceMeta})`,
        `${b.corporate || "N/A"} | Ref: ${b.bookingRef || "N/A"}`,
        `${b.employee || "N/A"} | ${b.empId || "N/A"}`,
        `Cancelled: ${formatExportDate(b.cancelDate)} | Travel: ${travelDate}`,
        b.refundStatus || "Pending",
        `INR ${Number(b.amount || 0).toLocaleString("en-IN")}`,
      ];
    });

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
    link.download = `cancellation-summary-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 lg:p- bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-700 flex items-center justify-center shadow-xl shadow-rose-700/20 text-white">
              <FiXCircle size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Cancellation Archive
              </h1>
              <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1.5 opacity-80">
                Unified Super Admin Monitor
              </p>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            Total Records:{" "}
            <span className="text-slate-900">{filtered.length}</span>
          </p>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cancelled"
            value={filtered.length}
            Icon={FiTrash2}
            color="#BE123C"
          />
          <StatCard
            label="Refund Processed"
            value={
              filtered.filter((b) =>
                b.refundStatus?.toLowerCase().includes("process"),
              ).length
            }
            Icon={FiRotateCcw}
            color="#10B981"
          />
          <StatCard
            label="Refund Pending"
            value={
              filtered.filter((b) =>
                b.refundStatus?.toLowerCase().includes("pending"),
              ).length
            }
            Icon={FiAlertCircle}
            color="#F59E0B"
          />
          <StatCard
            label="Total Loss Value"
            value={`₹${totalValue.toLocaleString()}`}
            Icon={FaRupeeSign}
            color="#1E293B"
          />
        </div>

        {/* UNIFIED FILTER LINE */}
        <div className="bg-white rounded-2xl shadow-sm p-3 border border-slate-100">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] relative group">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-700 transition-colors"
                size={14}
              />
              <input
                type="text"
                placeholder="Universal search (ID, Name, Service)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-700/10 transition-all"
              />
            </div>

            <FilterDropdown
              label="Type"
              value={bookingType}
              onChange={setBookingType}
            >
              <option value="All">All Voids</option>
              <option value="Flight">Flights Only</option>
              <option value="Hotel">Hotels Only</option>
            </FilterDropdown>

            <FilterDropdown
              label="Corporate"
              value={corporate}
              onChange={setCorporate}
              wide
            >
              {corporates.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterDropdown>

            <div className="flex flex-wrap items-end gap-2 bg-slate-50 p-1 rounded-xl border border-slate-50">
              <DateFilter
                label="Cancel Dt"
                value={cancelDate}
                onChange={setCancelDate}
              />
              <DateFilter
                label="Booking From"
                value={startDate}
                onChange={setStartDate}
              />
              <DateFilter
                label="Booking To"
                value={endDate}
                onChange={setEndDate}
              />
            </div>

          </div>
        </div>

        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading || filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-700 text-white rounded-2xl shadow-lg shadow-rose-700/20 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FiDownload size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Export
            </span>
          </button>
          {scrollControls.hasHorizontalOverflow && (
            <>
              <FloatingHintButton
                onClick={() => handleTableScroll("left")}
                disabled={!scrollControls.canScrollLeft}
                className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 shadow-sm flex items-center justify-center transition-all cursor-pointer hover:bg-rose-100 hover:border-rose-200 hover:text-rose-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                ariaLabel="Scroll list left"
                tooltip="Scroll list left"
              >
                  <FiChevronLeft size={18} />
              </FloatingHintButton>
              <FloatingHintButton
                onClick={() => handleTableScroll("right")}
                disabled={!scrollControls.canScrollRight}
                className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 shadow-sm flex items-center justify-center transition-all cursor-pointer hover:bg-rose-100 hover:border-rose-200 hover:text-rose-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                ariaLabel="Scroll list right"
                tooltip="Scroll list right"
              >
                  <FiChevronRight size={18} />
              </FloatingHintButton>
            </>
          )}
        </div>

        {/* UNIFIED DATA TABLE */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
          <div ref={tableScrollRef} className="overflow-x-auto min-h-[500px]">
            {isLoading ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-700 mb-4"></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  Aggregating Global Archive...
                </p>
              </div>
            ) : (
              <table
                className="w-full text-left border-collapse"
                style={{ minWidth: "1000px", tableLayout: "fixed" }}
              >
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-900/95 border-b border-slate-800">
                    <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Service
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Booking Context
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Traveller
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Timeline
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Refund
                    </th>
                    <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Value
                    </th>
                    <th
                      className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left whitespace-nowrap"
                      style={{ minWidth: "52px" }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/50 transition-all group"
                    >
                      {/* SERVICE */}
                      <td className="px-3 py-3" style={{ overflow: "hidden" }}>
                        <p className="font-black text-[11px] text-slate-800 truncate leading-tight">
                          {b.service}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate">
                          {b.type === "Flight" ? b.airline : "Hotel Stay"}
                        </p>
                      </td>

                      {/* BOOKING CONTEXT */}
                      <td className="px-3 py-3" style={{ overflow: "hidden" }}>
                        <span className="font-black text-[11px] text-slate-800 leading-none block truncate">
                          {b.corporate}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400 mt-1.5 block truncate">
                          Ref: {b.bookingRef}
                        </span>
                      </td>

                      {/* TRAVELLER */}
                      <td className="px-3 py-3" style={{ overflow: "hidden" }}>
                        <span className="font-black text-[11px] text-slate-700 leading-none block truncate">
                          {b.employee}
                        </span>
                        <span className="text-[9px] font-bold text-rose-600 mt-1.5 uppercase tracking-tighter italic block truncate">
                          {b.empId}
                        </span>
                      </td>

                      {/* TIMELINE */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-rose-700 font-black text-[10px]">
                            <FiXCircle size={10} />{" "}
                            {new Date(b.cancelDate).toLocaleDateString(
                              "en-IN",
                              { day: "2-digit", month: "short" },
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">
                            Travel:{" "}
                            {b.date
                              ? new Date(b.date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "—"}
                          </p>
                        </div>
                      </td>

                      {/* REFUND */}
                      <td className="px-2 py-3">
                        <div
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase w-fit whitespace-nowrap ${
                            b.refundStatus?.toLowerCase().includes("process")
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          <div
                            className={`w-1 h-1 rounded-full shrink-0 ${
                              b.refundStatus?.toLowerCase().includes("process")
                                ? "bg-emerald-700"
                                : "bg-amber-700"
                            }`}
                          />
                          {b.refundStatus}
                        </div>
                      </td>

                      {/* VALUE */}
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <p className="font-black text-[13px] text-slate-900 leading-none">
                          ₹{b.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-tighter">
                          Gross Refund
                        </p>
                      </td>

                      {/* ACTION */}
                      <td
                        className="pl-1 pr-2 py-3 text-left"
                        style={{ minWidth: "52px" }}
                      >
                        <button
                          onClick={() => setSelectedBooking(b._raw)}
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-100 transition-all"
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

          <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between bg-white">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Pages: {totalPages}
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showFirstLast
            />
          </div>
        </div>
      </div>

      {selectedBooking && bookingType === "Flight" && (
        <FlightBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {selectedBooking && bookingType === "Hotel" && (
        <HotelBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {selectedBooking && bookingType === "All" && (
        selectedBooking.flightRequest ? (
          <FlightBookingModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        ) : (
          <HotelBookingModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )
      )}
    </div>
  );
}

function StatCard({ label, value, Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:-translate-y-1 group">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform"
        style={{ backgroundColor: `${color}10`, color }}
      >
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900 leading-none tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "min-w-[180px]" : "min-w-[120px]"}`}>
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-rose-700/10 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 bg-[#fcfcfc] border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:bg-white transition-all w-[110px]"
      />
    </div>
  );
}
