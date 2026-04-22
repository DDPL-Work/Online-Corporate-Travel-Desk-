// HotelBookingDetails.jsx
// Hotel booking details page — mirrors BookingDetails.jsx structure.
// Uses DB booking object + bookingResult.providerResponse (GetBookingDetailResult).
// ✅ REMOVED: Fare Summary Block
// ✅ KEPT: Download Invoice Button (Header + Payment Status Card)

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
  FiRefreshCw,
  FiMapPin,
  FiCalendar,
  FiMoon,
  FiSun,
  FiPhone,
  FiMail,
  FiShield,
  FiInfo,
  FiX,
  FiStar,
  FiWifi,
  FiCoffee,
  FiHome,
  FiMessageCircle,
  FiSend,
  FiClock,
  FiXCircle,
} from "react-icons/fi";
import {
  MdHotel,
  MdVerifiedUser,
  MdCheckCircle,
  MdInfo,
  MdLocationOn,
  MdReceipt,
  MdCancel,
  MdKingBed,
} from "react-icons/md";
import {
  fetchBookedHotelDetails,
  generateHotelVoucher,
} from "../../Redux/Actions/hotelBooking.thunks";
import {
  sendHotelAmendment,
  getHotelAmendmentStatus,
} from "../../Redux/Actions/hotelAmendment.thunks";

/* ─────────────────────────────────────────────────────────────── */
/*  Primitives (same pattern as BookingDetails)                    */
/* ─────────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const map = {
    Confirmed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    voucher_generated:
      "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    Pending: "bg-amber-400/20   text-amber-300   ring-1 ring-amber-400/30",
    Cancelled: "bg-red-400/20     text-red-300     ring-1 ring-red-400/30",
    cancelled: "bg-red-400/20     text-red-300     ring-1 ring-red-400/30",
  };
  const dot = {
    Confirmed: "bg-emerald-400",
    voucher_generated: "bg-emerald-400",
    Pending: "bg-amber-400",
    Cancelled: "bg-red-400",
    cancelled: "bg-red-400",
  };
  const label = status === "voucher_generated" ? "Confirmed" : status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] || map.Confirmed}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dot[status] || dot.Confirmed}`}
      />
      {label}
    </span>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-teal-600" : "text-slate-800"}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function BentoCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3 sm:mb-5">
      <span className="bg-cyan-50 rounded-lg p-1.5 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-teal-600" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

function MetaChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.07] rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 border border-white/10">
      <Icon size={13} className="text-white/50 shrink-0" />
      <div>
        <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-white/40 font-bold leading-none mb-0.5">
          {label}
        </p>
        <p className="text-xs sm:text-[13px] font-semibold text-white leading-none">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Date helpers                                                   */
/* ─────────────────────────────────────────────────────────────── */
function fmtDate(
  d,
  opts = { day: "2-digit", month: "short", year: "numeric" },
) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDay(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long" });
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stars                                                          */
/* ─────────────────────────────────────────────────────────────── */
function Stars({ count = 0 }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <svg
          key={i}
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400"
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
/*  HotelHeroCard — mirrors FlightCard dark gradient style         */
/* ─────────────────────────────────────────────────────────────── */
function HotelHeroCard({ booking, bookingDetail, paymentSuccessful }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const result = booking?.bookingResult || {};
  const detail = bookingDetail || booking?.raw || {};
  const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
  const selectedRoom = hotelReq?.selectedRoom || {};
  const selectedHotel = hotelReq?.selectedHotel || {};

  const hotelName =
    detail?.HotelName ||
    snapshot?.hotelName ||
    selectedHotel?.hotelName ||
    "Hotel";
  const city = detail?.City || selectedHotel?.city || "";
  const address = detail?.AddressLine1 || selectedHotel?.address || "";
  const starRating = detail?.StarRating || selectedHotel?.starRating || 0;
  const checkIn = detail?.CheckInDate || hotelReq?.checkInDate;
  const checkOut = detail?.CheckOutDate || hotelReq?.checkOutDate;
  const nights =
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
        )
      : 1;
  const roomType =
    rooms.length > 1
      ? rooms.map((r) => r.RoomTypeName).join(", ")
      : rooms[0]?.RoomTypeName || "Standard Room";
  const images = booking?.images || selectedRoom?.rawRoomData?.images || [];

  const confirmationNo = detail?.ConfirmationNo || result?.hotelBookingId || "";
  const invoiceNo =
    detail?.InvoiceNo ||
    result?.providerResponse?.BookResult?.InvoiceNumber ||
    "";
  const bookingRefNo =
    detail?.BookingRefNo ||
    result?.providerResponse?.BookResult?.BookingRefNo ||
    "";
  const tboRef = detail?.TBOReferenceNo || "";

  const executionStatus = booking?.executionStatus || "";

  useEffect(() => {
    if (!images.length) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <div
      className="rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl text-white relative w-full"
      style={{
        background:
          "linear-gradient(140deg, #0d1b2a 0%, #0A4D68 60%, #088395 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
        }}
      />

      <div className="relative p-4 sm:p-6 grid gap-0">
        {/* ── ROW 1: Hotel name + status ── */}
        <div className="flex items-start gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-white/10">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <MdHotel size={18} className="sm:size-[22px] text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-xl font-black leading-tight truncate">
              {hotelName}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {starRating > 0 && <Stars count={starRating} />}
              {city && (
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-white/55">
                  <MdLocationOn size={11} className="text-teal-400 shrink-0" />
                  {city}
                </span>
              )}
            </div>
            {address && (
              <p className="text-[10px] sm:text-[11px] text-white/35 mt-1 leading-snug line-clamp-1">
                {address}
              </p>
            )}
          </div>
          <StatusPill status={executionStatus || "Confirmed"} />
        </div>

        {/* ── ROW 2: Check-in / nights / Check-out ── */}
        <div className="grid grid-cols-[1fr_100px_1fr] sm:grid-cols-[1fr_140px_1fr] items-center py-4 sm:py-6 border-b border-white/10 gap-2 sm:gap-0">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-[9px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest">
              Check-in
            </p>
            <p className="text-2xl sm:text-[40px] font-black tracking-tighter leading-none">
              {checkIn
                ? new Date(checkIn).getDate().toString().padStart(2, "0")
                : "—"}
            </p>
            <p className="text-xs sm:text-base text-white/70 font-semibold">
              {fmtDate(checkIn, { month: "short", year: "numeric" })}
            </p>
            <p className="text-[9px] sm:text-xs text-white/40">
              {fmtDay(checkIn)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 sm:gap-1.5 px-1 sm:px-2">
            <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-white/40 uppercase whitespace-nowrap">
              {nights} Night{nights !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-0 w-full">
              <span className="w-1.5 h-1.5 rounded-full border-2 border-white/30 shrink-0" />
              <div className="flex-1 relative flex items-center">
                <div className="w-full border-t border-dashed border-white/20" />
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
            </div>
            <span className="text-[7px] sm:text-[9px] font-bold tracking-widest text-white/30 uppercase text-center px-1 line-clamp-2">
              {roomType}
            </span>
          </div>

          <div className="text-right space-y-0.5 sm:space-y-1">
            <p className="text-[9px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest">
              Check-out
            </p>
            <p className="text-2xl sm:text-[40px] font-black tracking-tighter leading-none">
              {checkOut
                ? new Date(checkOut).getDate().toString().padStart(2, "0")
                : "—"}
            </p>
            <p className="text-xs sm:text-base text-white/70 font-semibold">
              {fmtDate(checkOut, { month: "short", year: "numeric" })}
            </p>
            <p className="text-[9px] sm:text-xs text-white/40">
              {fmtDay(checkOut)}
            </p>
          </div>
        </div>

        {/* ── ROW 3: Meta chips ── */}
        <div className="grid grid-cols-3 gap-2 py-3 sm:py-4 border-b border-white/10">
          <MetaChip
            icon={MdKingBed}
            label="Room Type"
            value={roomType}
          />
          <MetaChip
            icon={FiCoffee}
            label="Meal Plan"
            value={selectedRoom?.mealType || rooms[0]?.Inclusion || "—" || "—"}
          />
          <MetaChip
            icon={FiShield}
            label="Refundable"
            value={selectedRoom?.isRefundable ? "Yes" : "No"}
          />
        </div>

        {/* ── ROW 4: Confirmation details ── */}
        {paymentSuccessful && (
          <div className="pt-3 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                Confirmation No.
              </p>
              {confirmationNo ? (
                <p className="text-base sm:text-xl font-black tracking-[0.12em] font-mono text-white break-all">
                  {confirmationNo}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <FiRefreshCw
                    size={13}
                    className="text-white/40 animate-spin"
                  />
                  <span className="text-xs sm:text-sm text-white/40 font-semibold">
                    Awaiting confirmation…
                  </span>
                </div>
              )}
              {invoiceNo && (
                <p className="text-[10px] sm:text-[11px] text-white/35 mt-1">
                  Invoice: {invoiceNo}
                </p>
              )}
            </div>
            {tboRef && (
              <div className="sm:text-right">
                <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                  TBO Reference
                </p>
                <p className="text-sm sm:text-base font-black tracking-wider font-mono text-white/80 break-all">
                  {tboRef}
                </p>
                {bookingRefNo && (
                  <p className="text-[10px] sm:text-[11px] text-white/35 mt-1 truncate">
                    Ref: {bookingRefNo}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!paymentSuccessful && (
          <div className="pt-3 sm:pt-4 flex items-center gap-2 text-white/30">
            <FiAlertCircle size={14} />
            <p className="text-[11px] sm:text-xs font-medium">
              Complete payment to view confirmation details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation Request + Status Card (NEW)                       */
/* ─────────────────────────────────────────────────────────────── */

const CANCEL_REASONS = [
  "Change of travel plans",
  "Medical emergency",
  "Flight cancellation",
  "Visa issues",
  "Personal reasons",
  "Duplicate booking",
  "Other",
];

const CANCEL_STATUS_CONFIG = {
  pending: {
    label: "Request Submitted",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-400",
    icon: FiClock,
    iconColor: "text-amber-500",
    barColor: "bg-amber-400",
  },
  approved: {
    label: "Cancellation Approved",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    icon: FiCheckCircle,
    iconColor: "text-emerald-500",
    barColor: "bg-emerald-500",
  },
  rejected: {
    label: "Request Rejected",
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
    icon: FiXCircle,
    iconColor: "text-red-400",
    barColor: "bg-red-500",
  },
  processing: {
    label: "Processing Cancellation",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-400",
    icon: FiRefreshCw,
    iconColor: "text-blue-500",
    barColor: "bg-blue-400",
  },
};

function CancellationSection({ booking, isConfirmed, cancelPolicies = [], totalFare = 0 }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local UI state — replace with Redux state wired to your thunks
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submitted =
    (booking?.amendment &&
      booking.amendment.status &&
      booking.amendment.status !== "not_requested") ||
    isSubmitted;

  // Replace with real cancellation request from Redux
  // const cancelRequest = useSelector((s) => s.hotelBookings.cancellationRequest);
  const cancelRequest =
    booking?.amendment &&
    booking.amendment.status &&
    booking.amendment.status !== "not_requested"
      ? booking.amendment
      : null;

  const isCancelled =
    booking?.executionStatus === "cancelled" ||
    booking?.executionStatus === "Cancelled";

  const canRequest = isConfirmed && !isCancelled && !cancelRequest;

  const { amendmentStatus } = useSelector((state) => state.hotelAmendment);

  const providerStatusRaw =
    booking?.amendment?.providerResponse?.HotelChangeRequestStatusResult;

  const providerStatus =
    providerStatusRaw?.ChangeRequestStatus !== undefined
      ? providerStatusRaw
      : null;

  const mappedStatus = (() => {
    const s = providerStatus?.ChangeRequestStatus;

    if (s !== undefined && s !== null) {
      if (s === 1) return "pending";
      if (s === 2) return "processing";
      if (s === 3) return "approved"; // ✅ IMPORTANT
      if (s === 4) return "rejected";
      return null; // fallback
    }

    // fallback from DB
    const status = cancelRequest?.status || booking?.requestStatus;

    if (!status || status === "not_requested") return null;

    if (status === "requested") return "pending";
    if (status === "in_progress") return "processing";
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";

    return null;
  })();

  // Helper to calculate current charges
  const calculateCurrentCharges = () => {
    if (!cancelPolicies?.length) return { charge: 0, refund: totalFare, isFree: true };

    const parseDate = (d) => {
      if (!d) return null;
      // Handle DD/MM/YYYY HH:mm:ss if present
      if (typeof d === "string" && d.includes("/")) {
        const parts = d.split(/[/\s:]/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const hour = parseInt(parts[3] || 0, 10);
          const min = parseInt(parts[4] || 0, 10);
          const sec = parseInt(parts[5] || 0, 10);
          return new Date(year, month, day, hour, min, sec);
        }
      }
      return new Date(d);
    };

    const now = new Date();
    let applicablePolicy = null;

    // Policies are usually sorted by date
    // We look for the LATEST policy that has already started
    for (const policy of cancelPolicies) {
      const fromDate = parseDate(policy.FromDate);
      if (fromDate && now >= fromDate) {
        applicablePolicy = policy;
      }
    }

    if (!applicablePolicy) {
      // If no policy has started yet, check the first one
      const firstPolicy = cancelPolicies[0];
      const firstDate = parseDate(firstPolicy.FromDate);
      if (firstDate && now < firstDate) {
        return { charge: 0, refund: totalFare, isFree: true, note: "Pre-cancellation period (Free)" };
      }
      return { charge: 0, refund: totalFare, isFree: true, note: "No applicable policy found" };
    }

    let chargeAmount = 0;
    const chargeValue = Number(applicablePolicy.CancellationCharge);

    if (applicablePolicy.ChargeType === 2 || applicablePolicy.ChargeType === "Percentage") {
      chargeAmount = (totalFare * chargeValue) / 100;
    } else {
      chargeAmount = chargeValue;
    }

    const refundAmount = Math.max(0, totalFare - chargeAmount);

    return {
      charge: chargeAmount,
      refund: refundAmount,
      isFree: chargeAmount === 0,
      policy: applicablePolicy,
      note: `Policy in effect since ${fmtDate(applicablePolicy.FromDate)}`
    };
  };

  const currentCharges = calculateCurrentCharges();

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      console.log("BOOKING FULL:", booking);
      console.log("BOOKING ID:", booking?.bookingId);
      const res = await dispatch(
        sendHotelAmendment({
          bookingId: booking?._id || booking?.bookingId,
          remarks: `${reason} - ${remarks}`,
        }),
      );

      if (res.meta.requestStatus === "fulfilled") {
        setShowForm(false);
        setIsSubmitted(true);

        navigate("/my-cancelled-bookings");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Already cancelled ──
  if (isCancelled) {
    return (
      <BentoCard className="col-span-full">
        <CardLabel icon={MdCancel} label="Cancellation" />
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg sm:rounded-xl px-3 sm:px-4 py-3">
          <FiXCircle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-xs sm:text-[13px] font-bold text-red-700">
              This booking has been cancelled
            </p>
            {booking?.cancelledAt && (
              <p className="text-[10px] sm:text-[11px] text-red-500 mt-0.5">
                Cancelled on {fmtDate(booking.cancelledAt)}
              </p>
            )}
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="col-span-full">
      <CardLabel icon={MdCancel} label="Cancellation Request" />

      {/* ── Existing cancellation request status ── */}
      {cancelRequest && mappedStatus && (
        <div className="mb-5">
          {(() => {
            const status = mappedStatus;
            const cfg =
              CANCEL_STATUS_CONFIG[status] || CANCEL_STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <div
                className={`${cfg.bg} ${cfg.border} border rounded-lg sm:rounded-2xl overflow-hidden`}
              >
                {/* color bar */}
                <div className={`h-1 ${cfg.barColor}`} />
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        size={16}
                        className={`${cfg.iconColor} ${status === "processing" ? "animate-spin" : ""}`}
                      />
                      <span
                        className={`text-xs sm:text-[13px] font-bold ${cfg.text}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${cfg.bg} ${cfg.text} border ${cfg.border} rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {status
                        ? status.charAt(0).toUpperCase() + status.slice(1)
                        : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-[11px] sm:text-[12px]">
                    <div className="bg-white/60 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2">
                      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
                        Reason
                      </p>
                      <p className={`font-semibold ${cfg.text}`}>
                        {submitted ? reason : cancelRequest?.reason || "—"}
                      </p>
                    </div>
                    {(submitted ? remarks : cancelRequest?.remarks) && (
                      <div className="bg-white/60 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 sm:col-span-2">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
                          Remarks
                        </p>
                        <p className="text-slate-600 font-medium">
                          {submitted ? remarks : cancelRequest?.remarks}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason from approver */}
                  {status === "rejected" && cancelRequest?.approverComments && (
                    <div className="mt-3 flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2">
                      <FiMessageCircle
                        size={13}
                        className="text-red-500 mt-0.5 shrink-0"
                      />
                      <p className="text-[11px] sm:text-[12px] text-red-700 font-medium">
                        {cancelRequest.approverComments}
                      </p>
                    </div>
                  )}

                  {/* Refund info if approved */}
                  {status === "approved" && (
                    <div className="mt-3 flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2">
                      <FiCheckCircle
                        size={13}
                        className="text-emerald-600 shrink-0"
                      />
                      <p className="text-[11px] sm:text-[12px] text-emerald-700 font-semibold">
                        Refund will be processed within 5–7 business days
                      </p>
                    </div>
                  )}

                  {cancelRequest?.requestedAt && (
                    <p className="mt-3 text-[10px] sm:text-[11px] text-slate-400">
                      Submitted on {fmtDate(cancelRequest.requestedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          <button
            onClick={() =>
              dispatch(
                getHotelAmendmentStatus({ bookingId: booking.bookingId }),
              )
            }
            className="mt-3 text-xs text-blue-600 underline"
          >
            Check Status
          </button>
        </div>
      )}

      {/* ── Request form ── */}
      {canRequest && !submitted && (
        <>
          {!showForm ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
              <div>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-700">
                  Need to cancel this booking?
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Submit a cancellation request to cancel your booking
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-[0.97] text-white text-[11px] sm:text-[12px] font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-150 cursor-pointer border-none shrink-0 w-full sm:w-auto justify-center sm:justify-start"
              >
                <MdCancel size={14} />
                Request Cancellation
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
              {/* Form header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 rounded-lg p-1.5">
                    <MdCancel size={13} className="text-red-600" />
                  </span>
                  <span className="text-[11px] sm:text-[12px] font-bold text-red-700 uppercase tracking-widest">
                    Cancellation Request
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
                    setRemarks("");
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                >
                  <FiX size={14} className="text-red-600" />
                </button>
              </div>

              {/* ── Cancellation Charges Summary (NEW) ── */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div className="bg-white border border-red-100 rounded-xl p-3 shadow-sm">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Cancellation Charges
                  </p>
                  <p className="text-lg font-black text-red-600">
                    ₹{Number(currentCharges.charge).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">
                    {currentCharges.note || (currentCharges.isFree ? "Free Cancellation" : "Applicable now")}
                  </p>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Estimated Refund
                  </p>
                  <p className="text-lg font-black text-emerald-600">
                    ₹{Number(currentCharges.refund).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    To original payment mode
                  </p>
                </div>
              </div>

              {/* Reason select */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-red-600 mb-1.5">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-[13px] border border-red-200 rounded-lg sm:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition text-slate-700"
                >
                  <option value="">Select a reason…</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks textarea */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-red-600 mb-1.5">
                  Additional Remarks{" "}
                  <span className="text-slate-400 font-normal normal-case">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional context for your request…"
                  rows={3}
                  className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-[13px] border border-red-200 rounded-lg sm:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition text-slate-700 resize-none"
                />
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2">
                <FiInfo size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] sm:text-[11px] text-amber-700 leading-snug">
                  Your request organized summary: Total Charge <strong>₹{Number(currentCharges.charge).toLocaleString("en-IN")}</strong>. Refund (if
                  applicable) will be processed after approval.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-3 pt-1 flex-wrap">
                <button
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className={`flex items-center gap-2 text-white text-[11px] sm:text-[12px] font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-150 cursor-pointer border-none ${
                    !reason || submitting
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 active:scale-[0.97]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <FiRefreshCw size={13} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <FiSend size={13} />
                      Submit Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
                    setRemarks("");
                  }}
                  className="text-[11px] sm:text-[12px] text-slate-500 hover:text-slate-700 font-medium bg-transparent border-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Not eligible ── */}
      {!canRequest && !isCancelled && !cancelRequest && !submitted && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-3">
          <FiInfo size={15} className="text-slate-400 shrink-0" />
          <p className="text-[11px] sm:text-[12px] text-slate-500">
            Cancellation requests can only be submitted for confirmed bookings.
          </p>
        </div>
      )}
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Amenities grid                                                 */
/* ─────────────────────────────────────────────────────────────── */
function AmenitiesCard({ amenities = [] }) {
  if (!amenities.length) return null;
  return (
    <BentoCard>
      <CardLabel icon={FiStar} label="Room Amenities" />
      <div className="flex flex-wrap gap-2">
        {amenities.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-2 sm:px-2.5 py-1 rounded-full"
          >
            <MdCheckCircle size={11} /> {a}
          </span>
        ))}
      </div>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation policy table                                      */
/* ─────────────────────────────────────────────────────────────── */
function CancellationCard({ policies = [], lastCancellationDate }) {
  if (!policies.length) return null;

  const typeLabel = (type) => {
    if (type === 1 || type === "Fixed") return "Fixed (INR)";
    if (type === 2 || type === "Percentage") return "Percentage (%)";
    return String(type);
  };

  return (
    <BentoCard className="col-span-full">
      <CardLabel icon={FiShield} label="Cancellation Policy" />
      {lastCancellationDate && (
        <div className="flex items-center gap-2 mb-4 p-2.5 sm:p-3 bg-amber-50 border border-amber-100 rounded-lg sm:rounded-xl text-[10px] sm:text-xs text-amber-800">
          <MdInfo className="text-amber-500 shrink-0" size={14} />
          Free cancellation until{" "}
          <strong>{fmtDate(lastCancellationDate)}</strong>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                From Date
              </th>
              <th className="text-left px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                To Date
              </th>
              <th className="text-left px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Charge Type
              </th>
              <th className="text-right px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Charge
              </th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition"
              >
                <td className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-700 font-medium">
                  {p.FromDate || fmtDate(p.FromDate)}
                </td>
                <td className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-500">
                  {p.ToDate || "—"}
                </td>
                <td className="px-2 sm:px-3 py-2">
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                      p.CancellationCharge === 0
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {typeLabel(p.ChargeType)}
                  </span>
                </td>
                <td className="px-2 sm:px-3 py-2 text-right font-bold text-xs sm:text-sm">
                  {p.CancellationCharge === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <span className="text-red-600 whitespace-nowrap">
                      {p.ChargeType === 2 || p.ChargeType === "Percentage"
                        ? `${p.CancellationCharge}%`
                        : `₹${Number(p.CancellationCharge).toLocaleString("en-IN")}`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Rate conditions / Hotel policies                               */
/* ─────────────────────────────────────────────────────────────── */
function HotelPoliciesCard({ conditions = [] }) {
  const filtered = conditions.filter(
    (c) => c && c.trim() && !c.startsWith("&lt;"),
  );
  if (!filtered.length) return null;

  return (
    <BentoCard className="col-span-full">
      <CardLabel icon={FiInfo} label="Hotel Policies & Conditions" />
      <ul className="space-y-2 sm:space-y-2.5">
        {filtered.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-slate-600 leading-relaxed"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1 sm:mt-1.5" />
            {c}
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Booking References Card — extracted for reuse                  */
/* ─────────────────────────────────────────────────────────────── */
function BookingReferencesCard({ booking, bookingDetail, result }) {
  return (
    <BentoCard className="col-span-full">
      <CardLabel icon={MdReceipt} label="Booking References" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Booking Ref
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-800 font-mono break-all">
            {booking.bookingReference || "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Confirmation No.
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-800 font-mono break-all">
            {bookingDetail?.ConfirmationNo || result?.hotelBookingId || "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Invoice No.
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-800 font-mono break-all">
            {bookingDetail?.InvoiceNo ||
              result?.providerResponse?.BookResult?.InvoiceNumber ||
              "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            TBO Reference
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-800 font-mono break-all">
            {bookingDetail?.TBOReferenceNo || "—"}
          </p>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-600">Created: </span>
          <div className="break-all">
            {booking.createdAt
              ? fmtDate(booking.createdAt, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
        </div>
        <div>
          <span className="font-semibold text-slate-600">Approved: </span>
          {booking.approvedAt ? fmtDate(booking.approvedAt) : "—"}
        </div>
        <div>
          <span className="font-semibold text-slate-600">Booking Date: </span>
          {bookingDetail?.BookingDate
            ? fmtDate(bookingDetail.BookingDate)
            : "—"}
        </div>
      </div>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Payment & Booking Status Card — extracted for reuse            */
/* ─────────────────────────────────────────────────────────────── */
function PaymentStatusCard({
  booking,
  paymentSuccessful,
  isConfirmed,
  hotelReq,
}) {
  return (
    <BentoCard className="col-span-full">
      <CardLabel icon={FiCreditCard} label="Payment & Booking Status" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div
          className={`rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 border ${paymentSuccessful ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            {paymentSuccessful ? (
              <FiCheckCircle size={14} className="sm:size-4 text-emerald-500" />
            ) : (
              <FiAlertCircle size={14} className="sm:size-4 text-amber-500" />
            )}
            <span
              className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${paymentSuccessful ? "text-emerald-600" : "text-amber-600"}`}
            >
              Payment
            </span>
          </div>
          <p
            className={`text-sm sm:text-lg font-black ${paymentSuccessful ? "text-emerald-800" : "text-amber-800"}`}
          >
            {paymentSuccessful ? "Completed" : "Pending"}
          </p>
        </div>

        <div
          className={`rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 border ${isConfirmed ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            {isConfirmed ? (
              <MdVerifiedUser
                size={14}
                className="sm:size-4 text-emerald-500"
              />
            ) : (
              <FiRefreshCw
                size={14}
                className="sm:size-4 text-amber-500 animate-spin"
              />
            )}
            <span
              className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isConfirmed ? "text-emerald-600" : "text-amber-600"}`}
            >
              Invoice
            </span>
          </div>
          <p
            className={`text-sm sm:text-lg font-black ${isConfirmed ? "text-emerald-800" : "text-amber-800"}`}
          >
            {isConfirmed ? "Issued" : "Processing…"}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <MdHotel size={14} className="sm:size-4 text-slate-400" />
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Rooms
            </span>
          </div>
          <p className="text-sm sm:text-lg font-black text-slate-800">
            {hotelReq.noOfRooms || 1}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <FiBriefcase size={14} className="sm:size-4 text-slate-400" />
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Purpose
            </span>
          </div>
          <p className="text-[11px] sm:text-sm font-bold text-slate-800 line-clamp-2">
            {booking.purposeOfTravel || "—"}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function HotelBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showAmendForm, setShowAmendForm] = useState(false);
  const [remarks, setRemarks] = useState("");

  const { selectedBookingDetails: booking, loading } = useSelector(
    (s) => s.hotelBookings,
  );

  const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];

  const {
    sendLoading,
    sendError,
    sendSuccess,
    statusLoading,
    amendmentStatus,
  } = useSelector((state) => state.hotelAmendment);

  useEffect(() => {
    if (id) {
      dispatch(fetchBookedHotelDetails(id));
    }
  }, [id, dispatch]);

  /* ── Loading ── */
  if (loading || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-11 h-11 rounded-full border-[3px] border-slate-200 border-t-teal-500 animate-spin" />
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          Loading booking details…
        </p>
      </div>
    );
  }

  /* ── Data ── */
  const detail = booking?.raw || {};
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const pricing = booking?.pricingSnapshot || {};
  const result = booking?.bookingResult || {};
  const selectedRoom = hotelReq.selectedRoom || {};
  const selectedHotel = hotelReq.selectedHotel || {};
  const rawRoom = selectedRoom.rawRoomData || {};
  const travellers = booking?.travellers?.length
    ? booking.travellers
    : booking?.guests?.length
      ? booking.guests
      : booking?.raw?.Rooms?.flatMap((r) => r?.HotelPassenger || []) || [];
  const bookingDetail = booking?.raw || null;
  const detailRoom = booking?.raw?.Rooms?.[0] || {};
  const priceBreakUp = detailRoom?.PriceBreakUp || {};

  const paymentSuccessful =
    booking.payment?.status === "completed" || !!booking?.confirmationNo;
  const executionStatus = booking.executionStatus || "";
  const isConfirmed =
    executionStatus === "voucher_generated" || executionStatus === "confirmed";

  const images =
    booking?.images ||
    booking?.hotelRequest?.selectedRoom?.rawRoomData?.images ||
    [];

  const cancelPolicies = rooms.flatMap((r) => r.CancelPolicies || []);

  const amenities = rooms.flatMap((r) => r.Amenities || []);

  const totalFare = booking?.totalFare || booking?.raw?.InvoiceAmount || 0;
  const totalTax = priceBreakUp.RoomTax || selectedRoom.totalTax || 0;
  const baseFare = priceBreakUp.RoomRate || totalFare - totalTax || 0;
  const agentComm = priceBreakUp.AgentCommission || 0;

  const checkInDate =
    detail?.CheckInDate || snapshot?.checkInDate || hotelReq?.checkInDate;
  const checkOutDate =
    detail?.CheckOutDate || snapshot?.checkOutDate || hotelReq?.checkOutDate;

  const nights =
    checkInDate && checkOutDate
      ? Math.ceil(
          (new Date(checkOutDate) - new Date(checkInDate)) /
            (1000 * 60 * 60 * 24),
        )
      : 1;

  const rateConditions = bookingDetail?.RateConditions || [];

  console.log("ROOMS DATA:", rooms);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Sticky nav bar — Fully Responsive ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-14 sm:h-[60px] px-3 sm:px-6 flex items-center gap-2 sm:gap-4 shadow-sm overflow-x-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 sm:gap-1.5 text-teal-600 hover:text-teal-700 text-xs sm:text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer shrink-0"
        >
          <FiArrowLeft size={14} className="sm:size-[15px]" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="w-px h-4 sm:h-5 bg-slate-200 shrink-0" />
        <h1 className="text-xs sm:text-[15px] font-bold text-slate-900 truncate">
          Hotel Booking Details
        </h1>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {isConfirmed && (
            <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold whitespace-nowrap">
              <MdVerifiedUser size={11} className="sm:size-3" /> Voucher Issued
            </span>
          )}
          {booking.bookingReference && (
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden md:inline">
              Ref:{" "}
              <strong className="text-slate-900">
                {booking.bookingReference}
              </strong>
            </span>
          )}
          {paymentSuccessful && (
            <button
              onClick={() => dispatch(generateHotelVoucher(booking.bookingId))}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-sm transition-all duration-150 cursor-pointer border-none whitespace-nowrap"
            >
              <FiDownload size={12} className="sm:size-[13px]" />
              <span className="hidden sm:inline">Download Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main content: sidebar layout on large screens ── */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-5 py-4 sm:py-8 pb-20 sm:pb-24">
        {/* ── TOP: Hero card always full width ── */}
        <div className="mb-3 sm:mb-4">
          <HotelHeroCard
            booking={booking}
            bookingDetail={bookingDetail}
            paymentSuccessful={paymentSuccessful}
          />
        </div>

        {/* ── BODY: Two-column asymmetric layout on lg+ ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 sm:gap-4 items-start">
          {/* ════ LEFT COLUMN — primary details ════ */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Payment & Booking Status — high priority, appears first in left col */}
            <PaymentStatusCard
              booking={booking}
              paymentSuccessful={paymentSuccessful}
              isConfirmed={isConfirmed}
              hotelReq={hotelReq}
            />

            {/* Room description + Inclusions — side by side on md, stacked on sm */}
            {/* ── Room Description + Inclusions (MULTI ROOM) ── */}
            {rooms?.length > 0 && (
              <div className="space-y-4 sm:space-y-5">
                {rooms.map((room, index) => (
                  <div key={index} className="space-y-3">
                    {/* 🔥 Room Header */}
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-800 text-sm sm:text-base">
                        Room {index + 1}
                      </p>
                      <span className="text-xs sm:text-sm text-teal-600 font-semibold">
                        {room.RoomTypeName}
                      </span>
                    </div>

                    {/* Grid */}
                    {(room?.RoomDescription || room?.Inclusion) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {/* Description */}
                        {room?.RoomDescription && (
                          <BentoCard>
                            <CardLabel
                              icon={MdKingBed}
                              label="Room Description"
                            />
                            <div
                              className="text-[11px] sm:text-xs text-slate-600 leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: room.RoomDescription.replace(
                                  /<p><\/p>/g,
                                  "",
                                ),
                              }}
                            />
                          </BentoCard>
                        )}

                        {/* Inclusions */}
                        {room?.Inclusion && (
                          <BentoCard>
                            <CardLabel icon={FiCoffee} label="Inclusions" />
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {room.Inclusion.split(/,|\s+/)
                                .filter(Boolean)
                                .filter((v, i, a) => a.indexOf(v) === i)
                                .map((item, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 sm:px-2.5 py-1 rounded-full font-medium"
                                  >
                                    <MdCheckCircle size={11} /> {item}
                                  </span>
                                ))}
                            </div>
                          </BentoCard>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Amenities — full width in left col */}
            {amenities.length > 0 && <AmenitiesCard amenities={amenities} />}

            {/* Hotel Policies — full width in left col */}
            {rateConditions.length > 0 && (
              <HotelPoliciesCard conditions={rateConditions} />
            )}

            {/* Cancellation Policy — full width in left col */}
            {cancelPolicies.length > 0 && (
              <CancellationCard
                policies={cancelPolicies}
                lastCancellationDate={
                  detailRoom?.LastCancellationDate ||
                  bookingDetail?.LastCancellationDate
                }
              />
            )}

            {/* Booking References — full width in left col */}
            <BookingReferencesCard
              booking={booking}
              bookingDetail={bookingDetail}
              result={result}
            />
          </div>

          {/* ════ RIGHT COLUMN — sidebar: guest details, sticky on lg ════ */}
          <div className="flex flex-col gap-3 sm:gap-4 lg:sticky lg:top-[76px]">
            {/* Guest Details */}
            <BentoCard>
              <CardLabel icon={FiUser} label="Guest Details" />

              <div className="space-y-3">
                {travellers.map((t, index) => {
                  const name =
                    `${t.Title || t.title || ""} ${t.FirstName || t.firstName || ""} ${t.LastName || t.lastName || ""}`.trim();

                  const email = t.Email || t.email || "—";
                  const phone = t.Phoneno || t.phoneWithCode || "—";
                  const gender = t.Gender || t.gender || "—";
                  const age = t.Age || t.age || "—";
                  const nationality = t.Nationality || t.nationality || "—";

                  const isLead =
                    t.LeadPassenger === true || t.isLeadPassenger === true;

                  return (
                    <div
                      key={index}
                      className="border border-slate-100 rounded-xl p-3 bg-slate-50"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {name || "Guest"}
                          </p>
                          <p className="text-xs text-slate-400">{email}</p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            isLead
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isLead ? "Lead" : "Guest"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <InfoRow label="Phone" value={phone} />
                        <InfoRow label="Gender" value={gender} />
                        <InfoRow
                          label="Age"
                          value={age !== "—" ? `${age} yrs` : "—"}
                        />
                        <InfoRow label="Nationality" value={nationality} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          </div>
        </div>
        <div className="mt-5">
          {/* ── Cancellation Request Section — always last in left col ── */}
          <CancellationSection
            booking={booking}
            isConfirmed={isConfirmed}
            cancelPolicies={cancelPolicies}
            totalFare={totalFare}
          />
        </div>
      </main>
    </div>
  );
}
