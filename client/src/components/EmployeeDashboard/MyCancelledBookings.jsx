import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiRefreshCw,
} from "react-icons/fi";
import {
  MdFlightTakeoff,
  MdFlightLand,
  MdAirplanemodeInactive,
  MdHotel,
  MdLocationOn,
  MdKingBed,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelBookings } from "../../Redux/Actions/hotelBooking.thunks";
import { formatDate } from "../../utils/formatter";
import HotelDetailModal from "./Modal/Hoteldetailmodal";
import FlightDetailModal from "./Modal/FlightDetailModal";
/* ─────────────────────────────────────────────────────────────── */
/*  Shared Configs                                                 */
/* ─────────────────────────────────────────────────────────────── */
const REFUND_CONFIG = {
  processed: {
    label: "Refund processed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
    icon: FiCheckCircle,
    iconColor: "text-emerald-500",
  },
  pending: {
    label: "Refund pending · 5–7 business days",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-100",
    icon: FiRefreshCw,
    iconColor: "text-amber-500",
  },
  nonrefundable: {
    label: "Non-refundable fare",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-100",
    icon: FiXCircle,
    iconColor: "text-red-400",
  },
};

const FLIGHT_CANCEL_REASON_STYLE = {
  airline: "bg-red-50 text-red-700",
  user: "bg-slate-100 text-slate-600",
};

const HOTEL_CANCEL_REASON_STYLE = {
  hotel: "bg-red-50 text-red-700",
  user: "bg-slate-100 text-slate-600",
  policy: "bg-orange-50 text-orange-700",
};

/* ─────────────────────────────────────────────────────────────── */
/*  Stars                                                          */
/* ─────────────────────────────────────────────────────────────── */
function Stars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <svg
          key={i}
          className="w-3 h-3 text-amber-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancelled Flight Card                                          */
/* ─────────────────────────────────────────────────────────────── */
function CancelledFlightCard({ flight, onViewDetails }) {
  const refund = REFUND_CONFIG[flight.refundStatus];
  const RefundIcon = refund.icon;

  const STATUS_MAP = {
    0: "not_set",
    1: "unassigned",
    2: "assigned",
    3: "acknowledged",
    4: "completed",
    5: "rejected",
    6: "closed",
    7: "pending",
    8: "other",
  };

  const liveStatus = STATUS_MAP[flight.liveStatus] || null;

  const getBadge = () => {
    // Final cancelled
    if (flight.executionStatus === "cancelled" || liveStatus === "completed") {
      return {
        text: "Cancelled",
        className: "bg-red-50 text-red-700 border-red-100",
        dot: "bg-red-500",
      };
    }

    // Cancellation in progress
    if (liveStatus && liveStatus !== "completed") {
      return {
        text: "Cancelling...",
        className: "bg-orange-50 text-orange-700 border-orange-100",
        dot: "bg-orange-500",
      };
    }

    return {
      text: "Cancelled",
      className: "bg-red-50 text-red-700 border-red-100",
      dot: "bg-red-500",
    };
  };

  const badge = getBadge();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-red-500" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${flight.airlineBg} flex items-center justify-center`}
            >
              <MdFlightTakeoff size={18} className={flight.airlineColor} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                {flight.airline}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {flight.airlineCode}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.text}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-slate-400">
            <MdFlightTakeoff size={14} />
          </span>
          <span className="text-[15px] font-bold text-slate-800">
            {flight.from}
          </span>
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 border-t border-dashed border-slate-200" />
            <span className="text-[10px] text-slate-400 font-medium px-1">
              {flight.duration}
            </span>
            <div className="flex-1 border-t border-dashed border-slate-200" />
          </div>
          <span className="text-[15px] font-bold text-slate-800">
            {flight.to}
          </span>
          <span className="text-slate-400">
            <MdFlightLand size={14} />
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mb-4">
          <span>
            {flight.fromCity} · {flight.departureTime}
          </span>
          <span>
            {flight.toCity} · {flight.arrivalTime}
          </span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <FiCalendar size={12} className="text-slate-400 shrink-0" />
            <span>
              Flight date:{" "}
              <span className="font-medium text-slate-700">
                {flight.flightDate}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <FiClock size={12} className="text-slate-400 shrink-0" />
            <span>Booked on {flight.bookedOn}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-red-600">
            <FiAlertCircle size={12} className="shrink-0" />
            <span>
              Cancelled on {flight.cancelledOn} ·{" "}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FLIGHT_CANCEL_REASON_STYLE[flight.cancelType]}`}
              >
                {flight.cancelReason}
              </span>
            </span>
          </div>
        </div>

        {/* Refund */}
        {/* <div
          className={`flex items-center gap-2 ${refund.bg} ${refund.border} border rounded-xl px-3 py-2 mb-4`}
        >
          <RefundIcon size={13} className={refund.iconColor} />
          <span className={`text-[11px] font-semibold ${refund.text}`}>
            {refund.label}
          </span>
          {flight.refundAmount > 0 && (
            <span className={`ml-auto text-[12px] font-bold ${refund.text}`}>
              ₹{flight.refundAmount.toLocaleString("en-IN")}
            </span>
          )}
        </div> */}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {/* <div>
            <p className="text-[11px] text-slate-400 mb-0.5">Original fare</p>
            <p className="text-[17px] font-bold text-slate-800">
              <span className="line-through text-slate-300 text-[13px] mr-1">
                ₹{flight.originalFare.toLocaleString("en-IN")}
              </span>
              {flight.refundStatus === "nonrefundable" && (
                <span className="text-red-600 text-[13px] font-semibold">
                  No refund
                </span>
              )}
              {flight.refundStatus === "processed" && (
                <span className="text-emerald-600 text-[13px] font-semibold">
                  ₹{flight.refundAmount.toLocaleString("en-IN")} back
                </span>
              )}
              {flight.refundStatus === "pending" && (
                <span className="text-amber-600 text-[13px] font-semibold">
                  ₹{flight.refundAmount.toLocaleString("en-IN")} pending
                </span>
              )}
            </p>
          </div> */}
          <button
            onClick={() => onViewDetails(flight)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancelled Hotel Card                                           */
/* ─────────────────────────────────────────────────────────────── */
function CancelledHotelCard({ hotel, onViewDetails }) {
  const checkIn = new Date(hotel.bookingSnapshot?.checkInDate);
  const checkOut = new Date(hotel.bookingSnapshot?.checkOutDate);

  const nights = Math.max(
    1,
    Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-red-500" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <MdHotel size={18} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 leading-tight truncate max-w-[170px]">
                {hotel.bookingSnapshot?.hotelName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cancelled
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3">
          <MdLocationOn size={13} className="text-slate-400 shrink-0" />
          <span className="truncate">
            {hotel.hotelRequest?.selectedHotel?.address}
          </span>
        </div>

        {/* Stay connector */}
        <div className="flex items-center gap-3 mb-1">
          <div className="text-center min-w-[60px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Check-in
            </p>
            <p className="text-[13px] font-bold text-slate-800 leading-tight">
              {formatDate(hotel.bookingSnapshot?.checkInDate)}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex items-center w-full gap-1">
              <div className="flex-1 border-t border-dashed border-slate-200" />
              <span className="text-xs">🏨</span>
              <div className="flex-1 border-t border-dashed border-slate-200" />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {nights} Night{nights !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-center min-w-[60px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Check-out
            </p>
            <p className="text-[13px] font-bold text-slate-800 leading-tight">
              {formatDate(hotel.bookingSnapshot?.checkOutDate)}
            </p>
          </div>
        </div>

        {/* Room & meal chips */}
        <div className="flex gap-2 mt-3 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
            <MdKingBed size={11} className="text-slate-400" />
            {hotel.roomType}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
            {hotel.mealType}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
            {hotel.bookingSnapshot?.roomCount || 1} Guest
            {hotel.bookingSnapshot?.roomCount || 1 !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <FiClock size={12} className="text-slate-400 shrink-0" />
            <span>
              Booked on {new Date(hotel.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-red-600">
            <FiAlertCircle size={12} className="shrink-0" />
            <span>
              Cancelled on{" "}
              {new Date(hotel.amendment?.requestedAt).toLocaleDateString(
                "en-IN",
              )}{" "}
              ·{" "}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${HOTEL_CANCEL_REASON_STYLE["user"]}`}
              >
                {hotel.amendment?.remarks || "Cancellation requested"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
              Conf: {hotel.confirmationNo}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={() => onViewDetails(hotel)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Summary Stats                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SummaryStats({ bookings }) {
  const totalRefunded = bookings
    .filter((f) => f.refundStatus === "processed")
    .reduce((sum, f) => sum + f.refundAmount, 0);
  const totalPending = bookings
    .filter((f) => f.refundStatus === "pending")
    .reduce((sum, f) => sum + f.refundAmount, 0);
  const nonRefundable = bookings.filter(
    (f) => f.refundStatus === "nonrefundable",
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Total Cancelled
        </p>
        <p className="text-2xl font-black text-slate-800">{bookings.length}</p>
      </div>
      {/* <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">
          Refunded
        </p>
        <p className="text-2xl font-black text-emerald-700">
          ₹{totalRefunded.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">
          Refund Pending
        </p>
        <p className="text-2xl font-black text-amber-700">
          ₹{totalPending.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">
          Non-Refundable
        </p>
        <p className="text-2xl font-black text-red-600">{nonRefundable}</p>
      </div> */}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function CancelledFlightsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("flights");
  const [search, setSearch] = useState("");
  const [refundFilter, setRefundFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");

  // ── Hotel modal state (unchanged)
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);

  // ── Flight modal state (NEW)
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);

  const dispatch = useDispatch();

  const userRole = useSelector((s) => s.auth?.user?.role);
  const sessionRole = sessionStorage.getItem("userRole") || sessionStorage.getItem("role");
  const isEmployee = userRole === "employee" || sessionRole === "employee";

  const { list: flightBookings = [] } = useSelector((s) => s.bookings);

  const { completed: bookings = [], loading } = useSelector(
    (s) => s.hotelBookings,
  );

  const cancelledFlights = flightBookings.filter((b) => {
    const cancelRequested = sessionStorage.getItem(`cancelRequested_${b._id}`) === "true";
    return (
      b.executionStatus === "cancel_requested" ||
      b.executionStatus === "cancelled" ||
      (isEmployee && cancelRequested)
    );
  });

  const cancelledHotels = bookings?.filter((b) => {
    return (
      b?.amendment?.status === "requested" ||
      b?.amendment?.status === "cancelled"
    );
  });

  const mappedFlights = cancelledFlights.map((b) => {
    const segment =
      b?.flightRequest?.segments?.[0] ||
      b?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary
        ?.Segments?.[0] ||
      b?.bookingResult?.providerResponse?.raw?.Response?.Response
        ?.FlightItinerary?.Segments?.[0];

    const cancelRequested = sessionStorage.getItem(`cancelRequested_${b._id}`) === "true";

    return {
      id: b._id,

      liveStatus: b?.amendment?.changeRequestStatus, // numeric from API
      executionStatus: (isEmployee && cancelRequested) ? "cancelled" : b.executionStatus,
      airline:
        segment?.airlineName || segment?.Airline?.AirlineName || "Airline",

      airlineCode: segment?.flightNumber || segment?.Airline?.FlightNumber,

      from:
        segment?.origin?.airportCode || segment?.Origin?.Airport?.AirportCode,

      to:
        segment?.destination?.airportCode ||
        segment?.Destination?.Airport?.AirportCode,

      fromCity: segment?.origin?.city || segment?.Origin?.Airport?.CityName,

      toCity:
        segment?.destination?.city || segment?.Destination?.Airport?.CityName,

      departureTime:
        segment?.departureDateTime?.split("T")[1]?.slice(0, 5) ||
        segment?.Origin?.DepTime?.split("T")[1]?.slice(0, 5),

      arrivalTime:
        segment?.arrivalDateTime?.split("T")[1]?.slice(0, 5) ||
        segment?.Destination?.ArrTime?.split("T")[1]?.slice(0, 5),

      duration: segment?.durationMinutes
        ? `${Math.floor(segment.durationMinutes / 60)}h ${
            segment.durationMinutes % 60
          }m`
        : "—",

      flightDate: new Date(
        segment?.departureDateTime || segment?.Origin?.DepTime,
      ).toLocaleDateString("en-IN"),

      bookedOn: new Date(b.createdAt).toLocaleDateString("en-IN"),

      cancelledOn: new Date(b.updatedAt).toLocaleDateString("en-IN"),

      cancelReason: "User requested",
      cancelType: "user",

      originalFare: b?.pricingSnapshot?.totalAmount || 0,
      refundAmount: 0,
      refundStatus: "pending",

      class: "Economy",
      pnr: b?.bookingResult?.pnr,
    };
  });

  const currentData = activeTab === "flights" ? mappedFlights : cancelledHotels;

  useEffect(() => {
    dispatch(fetchMyHotelBookings());

    dispatch(
      fetchMyBookings({
        bookingType: "flight",
        executionStatus: "cancel_requested",
        limit: 50,
      }),
    );
  }, [dispatch]);

  const filtered = currentData.filter((item) => {
    const searchFields =
      activeTab === "flights"
        ? [
            item.from,
            item.to,
            item.fromCity,
            item.toCity,
            item.airline,
            item.pnr,
          ]
        : [
            item.bookingSnapshot?.hotelName,
            item.hotelRequest?.selectedHotel?.address,
            item.confirmationNo,
          ];

    const matchSearch =
      !search ||
      searchFields.some((f) => f?.toLowerCase().includes(search.toLowerCase()));

    const matchRefund =
      refundFilter === "all" || item.refundStatus === refundFilter;
    const matchReason =
      reasonFilter === "all" || item.cancelType === reasonFilter;

    return matchSearch && matchRefund && matchReason;
  });

  // ── View details handler — routes to the right modal by tab
  const handleViewDetails = (item) => {
    if (activeTab === "hotels") {
      setSelectedHotelId(item._id);
      setIsHotelModalOpen(true);
    } else {
      // Flight: use the raw booking _id to fetch full details
      setSelectedFlightId(item.id);
      setIsFlightModalOpen(true);
    }
  };

  const handleCloseHotelModal = () => {
    setIsHotelModalOpen(false);
    setSelectedHotelId(null);
  };

  // ── NEW: close flight modal
  const handleCloseFlightModal = () => {
    setIsFlightModalOpen(false);
    setSelectedFlightId(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setRefundFilter("all");
    setReasonFilter("all");
    setDateFrom("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hotel Detail Modal (unchanged) */}
      <HotelDetailModal
        isOpen={isHotelModalOpen}
        hotelId={selectedHotelId}
        onClose={handleCloseHotelModal}
      />

      {/* Flight Detail Modal (NEW) */}
      <FlightDetailModal
        isOpen={isFlightModalOpen}
        bookingId={selectedFlightId}
        onClose={handleCloseFlightModal}
      />

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-[60px] px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <FiArrowLeft size={15} /> Back
        </button>

        <span className="w-px h-5 bg-slate-200" />
        <h1 className="text-[15px] font-bold text-slate-900">
          Cancelled Bookings
        </h1>

        {/* ── Tab toggle ── */}
        <div className="flex items-center gap-1 ml-4 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange("flights")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "flights"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MdFlightTakeoff size={14} />
            Flights
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "flights" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}
            >
              {mappedFlights.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("hotels")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "hotels"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MdHotel size={14} />
            Hotels
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "hotels" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}
            >
              {cancelledHotels.length}
            </span>
          </button>
        </div>

        <div className="ml-auto">
          <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {currentData.length} cancelled
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeTab === "flights" ? "bg-blue-50" : "bg-teal-50"}`}
          >
            {activeTab === "flights" ? (
              <MdAirplanemodeInactive size={18} className="text-red-500" />
            ) : (
              <MdHotel size={18} className="text-teal-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              Cancelled {activeTab === "flights" ? "Flights" : "Hotels"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeTab === "flights"
                ? "View your cancelled flights and track refund status"
                : "View your cancelled hotel bookings and track refund status"}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <SummaryStats bookings={currentData} />

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-cyan-50 rounded-lg p-1.5">
              <FiFilter size={13} className="text-teal-600" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Filter Bookings
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <FiSearch
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "flights"
                    ? "Search airline, route, PNR..."
                    : "Search hotel, city, ref..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition"
              />
            </div>
            <select
              value={refundFilter}
              onChange={(e) => setRefundFilter(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-700"
            >
              <option value="all">All Refund Statuses</option>
              <option value="processed">Refund Processed</option>
              <option value="pending">Refund Pending</option>
              <option value="nonrefundable">Non-Refundable</option>
            </select>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-700"
            >
              <option value="all">All Cancellation Reasons</option>
              {activeTab === "flights" ? (
                <>
                  <option value="airline">Airline Initiated</option>
                  <option value="user">User Requested</option>
                </>
              ) : (
                <>
                  <option value="hotel">Property Initiated</option>
                  <option value="user">User Requested</option>
                  <option value="policy">Policy Based</option>
                </>
              )}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
            />
          </div>
        </div>

        {/* Results count */}
        <p className="text-[13px] text-slate-500 mb-4">
          Showing{" "}
          <strong className="text-slate-700">
            {filtered.length} cancelled
          </strong>{" "}
          {activeTab === "flights" ? "flight" : "hotel"}
          {filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Cards Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTab === "flights"
              ? filtered.map((flight) => (
                  <CancelledFlightCard
                    key={flight.id}
                    flight={flight}
                    onViewDetails={handleViewDetails}
                  />
                ))
              : filtered.map((hotel) => (
                  <CancelledHotelCard
                    key={hotel._id}
                    hotel={hotel}
                    onViewDetails={handleViewDetails}
                  />
                ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              {activeTab === "flights" ? (
                <MdAirplanemodeInactive size={28} className="text-slate-300" />
              ) : (
                <MdHotel size={28} className="text-slate-300" />
              )}
            </div>
            <p className="text-slate-500 font-semibold mb-1">
              No cancelled {activeTab === "flights" ? "flights" : "hotels"}{" "}
              found
            </p>
            <p className="text-sm text-slate-400">Try adjusting your filters</p>
            <button
              onClick={() => {
                setSearch("");
                setRefundFilter("all");
                setReasonFilter("all");
                setDateFrom("");
              }}
              className="mt-4 text-sm text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
