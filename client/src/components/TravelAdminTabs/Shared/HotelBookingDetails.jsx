// client\src\components\TravelAdminTabs\Shared\HotelBookingDetails.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  FiUsers,
  FiHash,
  FiFileText,
  FiTag,
  FiMenu,
  FiChevronDown,
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
import { getHotelBookingByIdAdmin } from "../../../Redux/Actions/travelAdmin.thunks";
import {
  sendHotelAmendment,
  getHotelAmendmentStatus,
} from "../../../Redux/Actions/hotelAmendment.thunks";
import { generateHotelVoucher } from "../../../Redux/Actions/hotelBooking.thunks";

const getVoucherDate = (b) => {
  if (b.voucheredAt) return b.voucheredAt;
  const tboVoucherDate =
    b.bookingResult?.providerResponse?.VoucherDate ||
    b.bookingResult?.providerResponse?.Response?.VoucherDate;
  if (tboVoucherDate) return tboVoucherDate;
  if (
    ["voucher_generated", "confirmed", "booked"].includes(
      (b.executionStatus || "").toLowerCase(),
    )
  )
    return b.updatedAt;
  return null;
};

function BookingHistory({ booking }) {
  const isCancelled =
    ["cancelled", "cancel_requested"].includes(
      (booking.executionStatus || "").toLowerCase(),
    ) || !!booking.cancellation;
  const isConfirmed =
    ["voucher_generated", "confirmed", "booked"].includes(
      (booking.executionStatus || "").toLowerCase(),
    ) ||
    (isCancelled && !!booking.bookingResult?.hotelBookingId);

  const steps = [
    {
      label: "Request Created",
      date: booking.createdAt,
      desc: `Requested by ${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""} (${booking.userId?.email || "N/A"})`,
      icon: <FiClock size={14} />,
      active: true,
    },
    {
      label: "Approval Status",
      date:
        booking.approvedAt ||
        booking.rejectedAt ||
        (["approved", "rejected"].includes(booking.requestStatus)
          ? booking.updatedAt
          : null),
      desc: (() => {
        const isRejected =
          booking.rejectedAt || booking.requestStatus === "rejected";
        const isApproved =
          booking.approvedAt || booking.requestStatus === "approved";

        if (isRejected) {
          return `Rejected by ${booking.approvedBy?.name?.firstName || booking.approverName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        if (isApproved) {
          const reqEmail =
            booking.userId?.email || booking.requesterDetails?.email;
          const appEmail = booking.approvedBy?.email || booking.approverEmail;
          const isSameUser = reqEmail && appEmail && reqEmail === appEmail;
          if (booking.approverName === "Auto Approve" || isSameUser) {
            return "Auto Approved by System (Travel Policy)";
          }
          return `Approved by ${booking.approvedBy?.name?.firstName || booking.approverName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        return "Waiting for manager approval";
      })(),
      icon: <FiShield size={14} />,
      active: !!(
        booking.approvedAt ||
        booking.rejectedAt ||
        ["approved", "rejected"].includes(booking.requestStatus)
      ),
    },
    {
      label: "Voucher Issued",
      date: getVoucherDate(booking),
      desc: isConfirmed
        ? "Hotel voucher generated and sent"
        : "Final confirmation pending",
      icon: <FiTag size={14} />,
      active: isConfirmed,
    },
    {
      label: "Cancellation",
      date: booking.cancelledAt || (isCancelled ? booking.updatedAt : null),
      desc: isCancelled
        ? "Booking has been cancelled"
        : "No cancellation requested",
      icon: <FiXCircle size={14} />,
      active: isCancelled,
      isLast: true,
    },
  ];

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="bg-white border border-[#EAE4D9] p-8 mb-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-10 h-10 rounded-full bg-[#B5862A]/10 flex items-center justify-center">
          <FiRefreshCw size={18} className="text-[#B5862A]" />
        </div>
        <div>
          <h3 className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">
            Booking Lifecycle
          </h3>
          <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-[0.2em] mt-1">
            Audit Trail & Timeline
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#B5862A]/40 via-[#EAE4D9] to-transparent" />

        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex gap-8">
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border transition-colors duration-500 ${
                  step.active
                    ? "bg-[#B5862A] border-[#B5862A] text-white shadow-lg"
                    : "bg-white border-[#EAE4D9] text-[#EAE4D9]"
                }`}
              >
                {step.icon}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p
                    className={`text-[12px] font-bold uppercase tracking-[0.15em] ${step.active ? "text-[#1A1714]" : "text-[#A89F94]"}`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <span className="text-[10px] font-bold text-[#B5862A] px-3 py-1 bg-[#FAF8F4] border border-[#EAE4D9] rounded-sm uppercase tracking-wider">
                      {formatDate(step.date)} · {formatTime(step.date)}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#7A7068] leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Helpers                                                        */
/* ─────────────────────────────────────────────────────────────── */
function fmtDate(
  d,
  opts = { day: "2-digit", month: "short", year: "numeric" },
) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}
function fmtDay(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long" });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function nightsCount(ci, co) {
  if (!ci || !co) return 1;
  const n = Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
  return n > 0 ? n : 1;
}

/* ─────────────────────────────────────────────────────────────── */
/*  StatusPill                                                     */
/* ─────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  const labelMap = {
    voucher_generated: "Confirmed",
    booked: "Booked",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    cancel_requested: "Cancel Requested",
    amendment_requested: "Cancelled",
    amendment_in_progress: "Cancelled",
    amendment_completed: "Cancelled",
  };
  const label = labelMap[s] || status;
  const isAmendment = s.startsWith("amendment_");
  const isCancelled =
    ["cancelled", "cancel_requested"].includes(s) || isAmendment;
  const isConfirmed = ["confirmed", "voucher_generated", "booked"].includes(s);

  const colors = isCancelled
    ? "bg-[#FDF1EE] text-[#B5341A] border-[#F0C4BA]"
    : isConfirmed
      ? "bg-[#EDF7F2] text-[#2C7A4B] border-[#C3E4D2]"
      : "bg-[#FDF8EE] text-[#8A6200] border-[#F0E0A8]";

  const dotColor = isCancelled
    ? "bg-[#B5341A]"
    : isConfirmed
      ? "bg-[#2C7A4B]"
      : "bg-[#8A6200]";

  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[2px] border text-[10px] font-semibold tracking-[0.12em] uppercase ${colors}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stars                                                          */
/* ─────────────────────────────────────────────────────────────── */
function Stars({ count = 0 }) {
  if (!count) return null;
  return (
    <span className="inline-flex gap-[2px]">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <svg key={i} width="13" height="13" fill="#B5862A" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  SectionHeader                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SectionHeader({ num, title }) {
  return (
    <div className="flex items-center pb-3 border-b border-[#EAE4D9] mb-6">
      {/* <span className="font-['DM_Mono'] text-[#B5862A] text-[11px] tracking-wider mr-3">
        {String(num).padStart(2, "0")}
      </span> */}
      <h2 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1A1714] md:text-[18px]">
        {title}
      </h2>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Hero / Confirmation Block                                      */
/* ─────────────────────────────────────────────────────────────── */
function HotelHeroCard({ booking, bookingDetail, paymentSuccessful }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get("source");
  const [activeIndex, setActiveIndex] = useState(0);
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const result = booking?.bookingResult || {};
  const detail = bookingDetail || booking?.raw || {};
  const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
  const selectedRoom = hotelReq?.selectedRoom || {};
  const selectedHotel = hotelReq?.selectedHotel || {};

  const tboHotelDetails = booking?.tboHotelDetails || {};

  const hotelName =
    booking?.hotelName ||
    snapshot?.hotelName ||
    detail?.HotelName ||
    tboHotelDetails?.hotelName ||
    selectedHotel?.hotelName ||
    "Hotel";
  const city = booking?.city || detail?.City || tboHotelDetails?.cityName || selectedHotel?.city || "";
  const address = detail?.AddressLine1 || tboHotelDetails?.address || selectedHotel?.address || "";
  const starRating = detail?.StarRating || tboHotelDetails?.hotelRating || selectedHotel?.starRating || 0;
  const checkIn =
    booking?.checkIn ||
    snapshot?.checkInDate ||
    detail?.CheckInDate ||
    hotelReq?.checkInDate;
  const checkOut =
    booking?.checkOut ||
    snapshot?.checkOutDate ||
    detail?.CheckOutDate ||
    hotelReq?.checkOutDate;
  const nights = snapshot?.nights || nightsCount(checkIn, checkOut);

  const rateConditions =
    hotelReq?.preBookResponse?.HotelResult?.[0]?.RateConditions ||
    booking?.raw?.Rooms?.[0]?.RateConditions ||
    booking?.raw?.HotelResult?.[0]?.RateConditions ||
    booking?.raw?.RateConditions ||
    [];
  let extractedCheckInTime = "14:00 (Estimated)";
  let extractedCheckOutTime = "11:00 (Estimated)";
  rateConditions.forEach((c) => {
    if (!c) return;
    const text = c.replace(/&lt;[^>]*&gt;/g, ""); // Strip raw HTML just in case
    const lower = text.toLowerCase();

    if (lower.includes("checkin time") || lower.includes("check-in time")) {
      if (!lower.includes("-end")) {
        const val =
          text.split(/time.*?:/i)[1]?.trim() ||
          text.substring(text.indexOf(":") + 1).trim();
        if (val) extractedCheckInTime = val;
      }
    }
    if (lower.includes("checkout time") || lower.includes("check-out time")) {
      const val =
        text.split(/time.*?:/i)[1]?.trim() ||
        text.substring(text.indexOf(":") + 1).trim();
      if (val) extractedCheckOutTime = val;
    }
  });

  // Room name: allRooms[].name[] is an array of strings in the new API
  const roomType = rooms[0]?.RoomTypeName || "Standard Room";

  let images =
    booking?.images ||
    selectedHotel?.images ||
    booking?.hotelDetails?.Images ||
    booking?.raw?.HotelDetails?.Images ||
    booking?.raw?.Images ||
    hotelReq?.selectedRoom?.rawRoomData?.[0]?.images ||
    [];
  if (snapshot?.hotelImage && !images.includes(snapshot.hotelImage)) {
    images = [snapshot.hotelImage, ...images];
  }

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
  const isCancelled = ["cancelled", "cancel_requested"].includes(
    (executionStatus || "").toLowerCase(),
  );

  const issuedDate = booking?.approvedAt || booking?.createdAt;

  const numImages = images.length;
  useEffect(() => {
    if (!numImages) return;
    const interval = setInterval(() => {
      setActiveIndex((p) => (p + 1) % numImages);
    }, 2500);
    return () => clearInterval(interval);
  }, [numImages]);

  return (
    <div className="bg-white border border-[#EAE4D9]">
      {/* Top bar */}
      <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center">
        <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
          Confirmation
        </span>
        {issuedDate && (
          <span className="flex items-center gap-[6px] text-[11px] text-[#B5862A] border border-[#B5862A] px-[10px] py-[2px]">
            <FiCheckCircle size={11} />
            Issued ·{" "}
            {fmtDate(issuedDate, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Body: image + details */}
      <div className="flex flex-col md:grid md:grid-cols-[minmax(0,340px)_1fr] gap-0">
        {/* Image */}
        <div className="relative overflow-hidden bg-[#E8E0D0] aspect-[16/9] md:aspect-auto md:min-h-[320px]">
          {images.length > 0 ? (
            <img
              src={images[activeIndex]}
              alt={hotelName}
              className="w-full h-full object-cover block absolute inset-0 transition-opacity duration-700"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#E8E0D0]">
              <MdHotel size={48} className="text-[#EAE4D9]" />
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="p-5 sm:p-7 md:p-8 lg:p-9">
          {/* Hotel name + stars + city */}
          <div className="mb-6">
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <h1 className="font-['Cormorant_Garamond'] text-[26px] sm:text-[32px] md:text-[36px] font-bold leading-[1.1] text-[#1A1714]">
                {isCancelled
                  ? "Your trip was cancelled."
                  : location.state?.isPastTrip || source === "past"
                    ? "Your trip is completed."
                    : hotelName}
              </h1>
              <Stars count={starRating} />
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-[6px]">
              {city && (
                <span className="flex items-center gap-1 text-[12px] text-[#7A7068]">
                  <MdLocationOn size={13} className="text-[#B5862A]" />
                  {city}
                </span>
              )}
            </div>
            {address && (
              <p className="text-[12px] text-[#A89F94] leading-[1.5] max-w-[400px]">
                {address}
              </p>
            )}
            {executionStatus && (
              <div className="mt-[10px] flex items-center gap-2 flex-wrap">
                <StatusPill status={executionStatus} />
                {booking?.amendment?.status &&
                  booking.amendment.status !== "completed" &&
                  booking.amendment.status !== "not_requested" && (
                    <StatusPill
                      status={`amendment_${booking.amendment.status}`}
                    />
                  )}
              </div>
            )}
          </div>

          <hr className="border-t border-[#EAE4D9] my-5" />

          {/* Check-in / out */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 mb-6">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Check-in
              </div>
              <div className="font-['Cormorant_Garamond'] text-[24px] sm:text-[32px] font-bold leading-none mb-[2px]">
                {checkIn
                  ? new Date(checkIn).getDate().toString().padStart(2, "0")
                  : "—"}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {fmtDate(checkIn, { month: "short", year: "numeric" })}
              </div>
              <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                {fmtDay(checkIn)} <br /> Check-in Time: {extractedCheckInTime}
              </div>
            </div>

            <div className="text-center px-2">
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89F94] mb-2">
                {nights} Night{nights !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-[6px] h-[6px] rounded-full border border-[#EAE4D9] inline-block" />
                <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-10" />
                <MdKingBed size={14} className="text-[#A89F94]" />
                <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-10" />
                <span className="w-[6px] h-[6px] rounded-full bg-[#B5862A] inline-block" />
              </div>
              <div className="mt-2 text-center">
                <div className="text-[8px] font-bold tracking-[0.15em] uppercase text-[#B5862A] mb-[2px]">
                  Selected Room Type
                </div>
                <div className="text-[10px] font-bold text-[#1A1714] max-w-[120px] mx-auto uppercase tracking-wide">
                  {roomType}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Check-out
              </div>
              <div className="font-['Cormorant_Garamond'] text-[24px] sm:text-[32px] font-bold leading-none mb-[2px]">
                {checkOut
                  ? new Date(checkOut).getDate().toString().padStart(2, "0")
                  : "—"}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {fmtDate(checkOut, { month: "short", year: "numeric" })}
              </div>
              <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                {fmtDay(checkOut)} <br /> Check-out Time:{" "}
                {extractedCheckOutTime}
              </div>
            </div>
          </div>

          <hr className="border-t border-[#EAE4D9] my-5" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Payment & Booking Status                                       */
/* ─────────────────────────────────────────────────────────────── */
function PaymentStatusCard({
  booking,
  paymentSuccessful,
  isConfirmed,
  hotelReq,
  isTravelAdmin,
}) {
  const items = [
    {
      label: "Payment",
      value: paymentSuccessful ? "Completed" : "Pending",
      ok: paymentSuccessful,
      icon: paymentSuccessful ? (
        <FiCheckCircle size={13} />
      ) : (
        <FiAlertCircle size={13} />
      ),
      hidden: !isTravelAdmin,
    },
    {
      label: "Invoice",
      value: isConfirmed ? "Issued" : "Processing…",
      ok: isConfirmed,
      icon: isConfirmed ? (
        <MdVerifiedUser size={13} />
      ) : (
        <FiRefreshCw size={13} className="animate-spin" />
      ),
    },
    {
      label: "Rooms",
      value: hotelReq.noOfRooms || 1,
      ok: null,
      icon: <MdHotel size={13} />,
    },
    {
      label: "Guests",
      value: (() => {
        const adults =
          hotelReq.roomGuests?.reduce(
            (acc, r) => acc + (r.noOfAdults || 0),
            0,
          ) || 0;
        const children =
          hotelReq.roomGuests?.reduce(
            (acc, r) => acc + (r.noOfChild || 0),
            0,
          ) || 0;
        let str = `${adults} ${adults === 1 ? "Adult" : "Adults"}`;
        if (children > 0)
          str += `, ${children} ${children === 1 ? "Child" : "Children"}`;
        return str;
      })(),
      ok: null,
      icon: <FiUsers size={13} />,
    },
    {
      label: "Purpose",
      value: booking.purposeOfTravel || "—",
      ok: null,
      icon: <FiBriefcase size={13} />,
    },
  ].filter((item) => !item.hidden);

  return (
    <div className="grid grid-cols-5 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9]">
      {items.map((item, i) => (
        <div key={i} className="bg-white p-5">
          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
            {item.label}
          </div>
          <div
            className={`flex items-center gap-[6px] text-[15px] font-semibold ${
              item.ok === true
                ? "text-[#2C7A4B]"
                : item.ok === false
                  ? "text-[#8A6200]"
                  : "text-[#1A1714]"
            }`}
          >
            <span
              className={
                item.ok === true
                  ? "text-[#2C7A4B]"
                  : item.ok === false
                    ? "text-[#8A6200]"
                    : "text-[#A89F94]"
              }
            >
              {item.icon}
            </span>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Room Section                                                   */
/* ─────────────────────────────────────────────────────────────── */
function RoomSection({
  rooms = [],
  preBookRooms = [],
  allRooms = [],
  selectedRoom = {},
  noOfRooms = 1,
}) {
  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {rooms.map((room, index) => {
        const descriptionHtml = room.RoomDescription || room.Description || "";

        const preBookRoom = preBookRooms[index] || {};
        const allRoomMatch =
          allRooms.find(
            (r) =>
              r.name === room.Name?.[0] ||
              r.name === room.Name ||
              r.name === room.roomTypeName,
          ) ||
          allRooms[index] ||
          {};

        let isRefundable =
          room.IsRefundable !== undefined
            ? room.IsRefundable
            : room.isRefundable;
        if (preBookRoom.IsRefundable !== undefined) {
          isRefundable = preBookRoom.IsRefundable;
        } else if (allRoomMatch.isRefundable !== undefined) {
          isRefundable = allRoomMatch.isRefundable;
        }

        const inclusionStr =
          room.Inclusion ||
          room.inclusion ||
          selectedRoom.inclusion ||
          preBookRoom.Inclusion ||
          "";
        const inclusions = inclusionStr
          ? inclusionStr.split(",").filter((i) => i.trim())
          : [];
        const promotions =
          room.RoomPromotion ||
          room.roomPromotion ||
          preBookRoom.RoomPromotion ||
          [];
        const supplements =
          room.Supplements ||
          room.supplements ||
          preBookRoom.Supplements ||
          selectedRoom.Supplements ||
          [];

        return (
          <div key={index}>
            {/* Room header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#B5862A] mb-1">
                  Selected Room Type
                </div>
                <h3 className="font-['Cormorant_Garamond'] text-[26px] font-semibold text-[#1A1714]">
                  {noOfRooms > 1 && (
                    <span className="text-[#B5862A]">{noOfRooms} x </span>
                  )}
                  {room.RoomTypeName ||
                    (Array.isArray(room.Name) ? room.Name[0] : room.Name) ||
                    `Room ${index + 1}`}
                </h3>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2 flex-wrap">
                  {room.MealType && (
                    <span className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#B5862A] text-[10px] font-bold text-[#B5862A] bg-[#FAF8F4] uppercase tracking-wider">
                      {room.MealType.replace(/_/g, " ")}
                    </span>
                  )}
                  {isRefundable !== undefined &&
                    (() => {
                      const isRefBool =
                        isRefundable === true ||
                        isRefundable === "true" ||
                        isRefundable === "True";
                      return (
                        <span
                          className={`inline-flex items-center gap-[5px] px-[10px] py-1 border text-[10px] font-bold uppercase tracking-wider ${
                            isRefBool
                              ? "border-[#2C7A4B] text-[#2C7A4B] bg-[#EDF7F2]"
                              : "border-[#B5341A] text-[#B5341A] bg-[#FDF1EE]"
                          }`}
                        >
                          {isRefBool ? "Refundable" : "Non-Refundable"}
                        </span>
                      );
                    })()}
                </div>
              </div>
            </div>

            {/* Promotions Badges */}
            {promotions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {promotions.map((promo, i) => (
                  <span
                    key={`promo-${i}`}
                    className="inline-flex items-center gap-[6px] px-[12px] py-[6px] border border-[#B5862A] text-[10px] font-bold text-[#B5862A] bg-[#FAF8F4] uppercase tracking-widest rounded-sm shadow-sm"
                  >
                    <FiTag size={11} /> {promo}
                  </span>
                ))}
              </div>
            )}

            {/* Description column */}
            <div className="grid gap-[1px] bg-[#EAE4D9] grid-cols-1">
              {/* Description */}
              {descriptionHtml && (
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Room Description
                  </div>
                  <div
                    className="text-[13px] leading-[1.7] text-[#7A7068]"
                    dangerouslySetInnerHTML={{
                      __html: descriptionHtml.replace(/<p><\/p>/g, ""),
                    }}
                  />
                </div>
              )}

              {/* Inclusions */}
              {inclusions.length > 0 && (
                <div className="bg-white p-6 border-t border-[#EAE4D9]">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Inclusions
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {inclusions.map((inc, i) => (
                      <li
                        key={`inc-${i}`}
                        className="flex gap-2 items-center text-[13px] text-[#7A7068]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2C7A4B]" />
                        {inc.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Amenities */}
              {room.Amenities && room.Amenities.length > 0 && (
                <div className="bg-white p-6 border-t border-[#EAE4D9]">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Room Amenities
                  </div>
                  <AmenitiesSection amenities={room.Amenities} />
                </div>
              )}

              {/* Supplements */}
              {supplements.length > 0 && (
                <div className="bg-white p-6 border-t border-[#EAE4D9]">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Room Supplements
                  </div>
                  <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {supplements.map((s, si) => (
                      <li
                        key={`supp-${si}`}
                        className="text-[12px] text-[#7A7068] bg-[#FAF8F4] p-3 border border-[#EAE4D9] flex justify-between items-center"
                      >
                        <div className="font-bold text-[#1A1714]">
                          {s.Type || s.type || "Extra"}
                        </div>
                        {(s.SuppAmount || s.Price) > 0 && (
                          <div className="text-[#B5862A] font-bold">
                            ₹{(s.SuppAmount || s.Price).toLocaleString()}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Amenities                                                      */
/* ─────────────────────────────────────────────────────────────── */
function AmenitiesSection({ amenities = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (!amenities.length) return null;

  // Top 4 feature amenities for icon display
  const iconMap = {
    "free wi-fi": <FiWifi size={20} />,
    "wi-fi": <FiWifi size={20} />,
    "air conditioning": "❄",
    pool: "≋",
    "king bed": <MdKingBed size={20} />,
  };
  const featured = amenities.slice(0, 4);

  return (
    <div>
      {/* Top featured 4 */}
      <div className="grid grid-cols-4 gap-[1px] bg-[#EAE4D9] mb-5">
        {featured.map((a, i) => {
          const key = a.toLowerCase();
          const icon = Object.entries(iconMap).find(([k]) =>
            key.includes(k),
          )?.[1];
          return (
            <div key={i} className="bg-white p-5 text-center">
              <div className="text-[20px] mb-2 text-[#7A7068]">
                {icon || <FiStar size={18} className="text-[#B5862A]" />}
              </div>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7A7068]">
                {a}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle all */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89F94]">
          All Amenities · {amenities.length}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="bg-none border-none cursor-pointer text-[11px] font-semibold text-[#B5862A] tracking-[0.1em] uppercase"
        >
          {expanded ? "— Collapse" : "+ Expand"}
        </button>
      </div>
      <hr className="border-t border-[#EAE4D9] mt-0 mb-4" />

      {expanded && (
        <div className="flex flex-wrap gap-2">
          {amenities.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#EAE4D9] text-[11px] text-[#7A7068] bg-white"
            >
              <FiCheckCircle size={10} className="text-[#B5862A]" /> {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Check-in Instructions (Hotel Policies)                         */
/* ─────────────────────────────────────────────────────────────── */
function CheckInInstructions({ conditions = [] }) {
  const filtered = conditions.filter((c) => c && c.trim());
  if (!filtered.length) return null;

  const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-[1px] bg-[#EAE4D9]">
      <div className="bg-[#FDF8EE] p-6 border-l-[3px] border-[#B5862A]">
        <div className="flex gap-[10px] items-start">
          <FiInfo size={15} className="text-[#B5862A] mt-[2px] shrink-0" />
          <p className="text-[12px] text-[#8A6200] leading-[1.6]">
            Read carefully. Failure to comply with property policy may result in
            entry being declined at check-in.
          </p>
        </div>
      </div>
      <div className="bg-white p-6 overflow-hidden">
        <ul className="list-none p-0 m-0 flex flex-col gap-4">
          {filtered.map((c, i) => (
            <li key={i} className="flex gap-4 items-start">
              <span className="font-['DM_Mono'] text-[10px] text-[#B5862A] font-medium min-w-[18px] pt-[2px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="text-[13px] text-[#7A7068] leading-[1.6] checkin-html-content"
                dangerouslySetInnerHTML={{ __html: decodeHtml(c) }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation Policy Table                                      */
/* ─────────────────────────────────────────────────────────────── */
function CancellationPolicySection({ policies = [], lastCancellationDate }) {
  if (!policies.length) return null;

  const now = new Date();

  const parseDate = (str) => {
    if (!str) return null;
    const [datePart, timePart] = str.split(" ");
    const [d, m, y] = datePart.split("-").map(Number);
    const [hh, mm, ss] = (timePart || "00:00:00").split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, ss);
  };

  const typeLabel = (type) => {
    if (type === 1 || type === "Fixed") return "Fixed (INR)";
    if (type === 2 || type === "Percentage") return "Percentage (%)";
    return String(type);
  };

  return (
    <div>
      {lastCancellationDate && (
        <div className="flex items-center gap-[10px] padding-[12px_16px] bg-[#EDF7F2] border border-[#C3E4D2] mb-4">
          <FiCheckCircle size={14} className="text-[#2C7A4B]" />
          <span className="text-[13px] text-[#2C7A4B]">
            <strong>Free cancellation</strong> until{" "}
            <strong>{fmtDate(lastCancellationDate)}</strong>
          </span>
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-[8px_12px] text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
              # FROM DATE
            </th>
            <th className="text-left p-[8px_12px] text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
              TO DATE
            </th>
            <th className="text-left p-[8px_12px] text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
              CHARGE TYPE
            </th>
            <th className="text-right p-[8px_12px] text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
              CHARGE
            </th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p, i) => {
            const nextPolicy = policies[i + 1];
            const displayToDate =
              p.ToDate || nextPolicy?.FromDate || "Check-in";

            const fromDateObj = parseDate(p.FromDate);
            const toDateObj = parseDate(
              displayToDate === "Check-in" ? null : displayToDate,
            );

            const fromTime = fromDateObj?.getTime() || 0;
            const toTime = toDateObj?.getTime() || Infinity;
            const nowTime = now.getTime();

            const isActive = nowTime >= fromTime && nowTime < toTime;

            return (
              <tr
                key={i}
                className={`${isActive ? "bg-[#B5862A08]" : "hover:bg-[#B5862A04]"}`}
              >
                <td className="p-[14px_12px] border-b border-[#EAE4D9] text-[13px] text-[#7A7068]">
                  <div className="flex items-center gap-2">
                    {p.FromDate || "—"}
                    {isActive && (
                      <span className="text-[8px] font-bold tracking-widest uppercase bg-[#B5862A] text-white px-1.5 py-0.5 rounded-sm animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-[14px_12px] border-b border-[#EAE4D9] text-[13px] text-[#A89F94]">
                  {displayToDate}
                </td>
                <td className="p-[14px_12px] border-b border-[#EAE4D9]">
                  <span
                    className={`text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-[2px] ${
                      p.CancellationCharge === 0
                        ? "bg-[#EDF7F2] text-[#2C7A4B]"
                        : "bg-[#FDF1EE] text-[#B5341A]"
                    }`}
                  >
                    {typeLabel(p.ChargeType)}
                  </span>
                </td>
                <td className="p-[14px_12px] border-b border-[#EAE4D9] text-right font-semibold text-[14px]">
                  {p.CancellationCharge === 0 ? (
                    <span className="text-[#2C7A4B]">Free</span>
                  ) : (
                    <span className="text-[#1A1714]">
                      {p.ChargeType === 2 || p.ChargeType === "Percentage"
                        ? `${p.CancellationCharge}%`
                        : `₹${Number(p.CancellationCharge).toLocaleString("en-IN")}`}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Booking References                                             */
/* ─────────────────────────────────────────────────────────────── */
function BookingReferencesSection({ booking, bookingDetail, result }) {
  const refs = [
    { label: "Order ID", val: booking.orderId || "—", hash: true },
    {
      label: "Confirmation No.",
      val: bookingDetail?.ConfirmationNo || result?.hotelBookingId || "—",
      hash: true,
    },
    {
      label: "Invoice No.",
      val:
        bookingDetail?.InvoiceNo ||
        result?.providerResponse?.BookResult?.InvoiceNumber ||
        "—",
      doc: true,
    },
    {
      label: "Booking ID",
      val:
        result?.providerResponse?.BookResult?.BookingId ||
        bookingDetail?.TBOReferenceNo ||
        "—",
      hash: true,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-[1px] bg-[#EAE4D9] mb-[1px]">
        {refs.map((r, i) => (
          <div key={i} className="bg-white p-5">
            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[6px]">
              <span className="text-[#B5862A] mr-1">#</span> {r.label}
            </div>
            <div className="font-['DM_Mono'] text-[13px] font-medium text-[#1A1714] break-all">
              {r.val}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-[12px_20px] border border-[#EAE4D9] border-t-0 flex gap-8 flex-wrap">
        <span className="text-[11px] text-[#A89F94]">
          <span className="text-[#7A7068] font-medium">Created</span> ·{" "}
          {booking.createdAt
            ? fmtDate(booking.createdAt, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
        <span className="text-[11px] text-[#A89F94]">
          <span className="text-[#7A7068] font-medium">Approved</span> ·{" "}
          {booking.approvedAt ? fmtDate(booking.approvedAt) : "—"}
        </span>
        <span className="text-[11px] text-[#A89F94]">
          <span className="text-[#7A7068] font-medium">Booking Date</span> ·{" "}
          {bookingDetail?.BookingDate
            ? fmtDate(bookingDetail.BookingDate)
            : "—"}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Guest Section                                                  */
/* ─────────────────────────────────────────────────────────────── */
function GuestSection({ travellers = [] }) {
  return (
    <div className="flex flex-col gap-3">
      {travellers.map((t, index) => {
        const name =
          `${t.Title || t.title || ""} ${t.FirstName || t.firstName || ""} ${t.LastName || t.lastName || ""}`.trim();
        const email = t.Email || t.email || "—";
        const phone = t.Phoneno || t.phoneWithCode || "—";
        const gender = t.Gender || t.gender || "—";
        const age = t.Age || t.age || "—";
        const nationality = t.Nationality || t.nationality || "—";
        const isLead = t.LeadPassenger === true || t.isLeadPassenger === true;
        const initials = name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase();

        return (
          <div key={index} className="bg-white border border-[#EAE4D9] p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-[14px]">
                <div className="w-[42px] h-[42px] rounded-full bg-[#FAF8F4] border border-[#EAE4D9] flex items-center justify-center text-[14px] font-semibold text-[#7A7068] font-['DM_Mono']">
                  {initials || "G"}
                </div>
                <div>
                  <div className="text-[16px] font-semibold text-[#1A1714]">
                    {name || "Guest"}
                  </div>
                  <div className="text-[11px] text-[#A89F94]">
                    {isLead ? "Lead guest" : "Guest"} ·{" "}
                    {gender !== "—" ? gender : "Adult"}
                    {age !== "—" ? ` · ${age} yrs` : ""}
                    {nationality !== "—" ? ` · ${nationality}` : ""}
                  </div>
                </div>
              </div>
              {isLead && (
                <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-[#2C7A4B] bg-[#EDF7F2] border border-[#C3E4D2] px-2 py-[2px]">
                  Lead
                </span>
              )}
            </div>

            <hr className="border-t border-[#EAE4D9] mt-0 mb-4" />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-[16px_24px] items-start">
              <div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  Email
                </div>
                <div className="text-[12px] text-[#7A7068] break-all">
                  {email}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  Phone
                </div>
                <div className="text-[12px] text-[#7A7068]">{phone}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  Nationality
                </div>
                <div className="text-[12px] text-[#7A7068]">{nationality}</div>
              </div>
              {(t.PanCard || t.panCard) && (
                <div>
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                    PAN Card
                  </div>
                  <div className="text-[12px] text-[#7A7068] uppercase font-['DM_Mono']">
                    {t.PanCard || t.panCard}
                  </div>
                </div>
              )}
              {(t.Dob || t.dob) && (
                <div>
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                    Date of Birth
                  </div>
                  <div className="text-[12px] text-[#7A7068]">
                    {new Date(t.Dob || t.dob).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  08 Fare Breakdown (Travel Admin Only)                          */
/* ─────────────────────────────────────────────────────────────── */
function FareBreakdownSection({ priceBreakUp, totalFare }) {
  if (!priceBreakUp) return null;

  return (
    <div className="bg-white border border-[#EAE4D9] p-6">
      <div className="max-w-[600px]">
        <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-4">
          Fare Details
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-[14px]">
            <span className="text-[#1A1714] font-bold">
              Total Paid{" "}
              <span className="font-normal text-slate-500 text-[11px] ml-1">
                (incl. all taxes and service fee)
              </span>
            </span>
            <span className="font-bold text-[#B5341A] text-[20px]">
              ₹{Number(totalFare).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation constants & helpers                               */
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
    label: "Refund is in Process",
    icon: FiClock,
    color: "text-[#8A6200]",
    bg: "bg-[#FDF8EE]",
    border: "border-[#F0E0A8]",
  },
  approved: {
    label: "Cancellation Approved",
    icon: FiCheckCircle,
    color: "text-[#2C7A4B]",
    bg: "bg-[#EDF7F2]",
    border: "border-[#C3E4D2]",
  },
  rejected: {
    label: "Request Rejected",
    icon: FiXCircle,
    color: "text-[#B5341A]",
    bg: "bg-[#FDF1EE]",
    border: "border-[#F0C4BA]",
  },
  processing: {
    label: "Refund is in Process",
    icon: FiRefreshCw,
    color: "text-[#1A4A7A]",
    bg: "bg-[#EEF4FD]",
    border: "border-[#C0D4F0]",
  },
};

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation Section                                           */
/* ─────────────────────────────────────────────────────────────── */
function CancellationSection({
  booking,
  isConfirmed,
  cancelPolicies = [],
  totalFare = 0,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { amendmentStatus, statusLoading } = useSelector(
    (state) => state.hotelAmendment,
  );

  const providerStatusRaw =
    amendmentStatus?.response?.HotelChangeRequestStatusResult ||
    booking?.amendment?.providerResponse?.HotelChangeRequestStatusResult;
  const providerStatus =
    providerStatusRaw?.ChangeRequestStatus !== undefined
      ? providerStatusRaw
      : null;

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitted =
    (booking?.amendment?.status &&
      booking.amendment.status !== "not_requested") ||
    isSubmitted;

  const cancelRequest =
    booking?.amendment?.status && booking.amendment.status !== "not_requested"
      ? booking.amendment
      : null;

  const isCancelled = ["cancelled", "cancel_requested"].includes(
    (booking?.executionStatus || "").toLowerCase(),
  );
  const checkInDate = booking?.hotelRequest?.checkInDate;
  const isPastCheckIn =
    checkInDate && new Date(checkInDate) < new Date().setHours(0, 0, 0, 0);
  const canRequest =
    isConfirmed && !isCancelled && !cancelRequest && !isPastCheckIn;

  useEffect(() => {
    // Only hit the status API if an amendment has actually been requested
    // Hit once on mount to get current state
    const bId = booking?.bookingId || booking?._id;
    if (bId && cancelRequest) {
      dispatch(getHotelAmendmentStatus({ bookingId: bId }));
    }
  }, [booking?.bookingId, booking?._id, !!cancelRequest, dispatch]);

  const mappedStatus = (() => {
    const s = providerStatus?.ChangeRequestStatus;
    if (s !== undefined && s !== null) {
      if (s === 0) return "pending"; // NotSet usually means it's just started
      if (s === 1) return "pending";
      if (s === 2) return "processing";
      if (s === 3) return "approved";
      if (s === 4) return "rejected";
      return null;
    }
    const status = cancelRequest?.status || booking?.requestStatus;
    if (!status || status === "not_requested") return null;
    if (status === "requested") return "pending";
    if (status === "in_progress") return "processing";
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    return null;
  })();

  const calculateCurrentCharges = () => {
    if (!cancelPolicies?.length)
      return { charge: 0, refund: totalFare, isFree: true };
    const parseDate = (str) => {
      if (!str) return null;
      if (str instanceof Date) return str;
      const parts = String(str).split(/[/\-\s:]/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const hh = parseInt(parts[3] || 0);
        const mm = parseInt(parts[4] || 0);
        const ss = parseInt(parts[5] || 0);
        return new Date(y, m - 1, d, hh, mm, ss);
      }
      return new Date(str);
    };

    const now = new Date();
    let applicablePolicy = null;

    // Find the last policy that has already started
    for (const policy of cancelPolicies) {
      const fromDate = parseDate(policy.FromDate);
      if (fromDate && now >= fromDate) {
        // If we already found a policy, only update if this one starts later
        if (
          !applicablePolicy ||
          fromDate > parseDate(applicablePolicy.FromDate)
        ) {
          applicablePolicy = policy;
        }
      }
    }

    if (!applicablePolicy) {
      return {
        charge: 0,
        refund: totalFare,
        isFree: true,
        note: "Pre-cancellation period (Free)",
      };
    }

    const chargeValue = Number(applicablePolicy.CancellationCharge);
    const chargeAmount =
      applicablePolicy.ChargeType === 2 ||
      applicablePolicy.ChargeType === "Percentage"
        ? (totalFare * chargeValue) / 100
        : chargeValue;

    return {
      charge: chargeAmount,
      refund: Math.max(0, totalFare - chargeAmount),
      isFree: chargeAmount === 0,
      policy: applicablePolicy,
      note: `Policy in effect since ${applicablePolicy.FromDate.split(" ")[0]}`,
    };
  };

  const currentCharges = calculateCurrentCharges();

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
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

  const providerStatusObj =
    amendmentStatus?.response?.HotelChangeRequestStatusResult ||
    amendmentStatus?.response?.HotelChangeRequestResult ||
    booking.amendment?.providerResponse?.HotelChangeRequestStatusResult ||
    booking.amendment?.providerResponse?.HotelChangeRequestResult;

  // New: deeper extraction based on the provided JSON structure
  const hotelChangeResult =
    providerStatusObj?.HotelChangeRequestResult || providerStatusObj;

  const cancelStatusRaw = booking.raw?.CancellationStatus?.[0] || {};

  const totalRefund = Number(
    hotelChangeResult?.RefundedAmount ?? booking.amendment?.refundedAmount ?? 0,
  );
  const totalCharge = Number(
    hotelChangeResult?.CancellationCharge ??
      booking.amendment?.cancellationCharge ??
      0,
  );

  const cancellationFees =
    hotelChangeResult?.CancellationChargeBreakUp?.CancellationFees || 0;
  const serviceCharge =
    hotelChangeResult?.CancellationChargeBreakUp?.CancellationServiceCharge ||
    0;
  const totalServiceCharge = hotelChangeResult?.TotalServiceCharge || 0;
  const totalPrice = hotelChangeResult?.TotalPrice || 0;

  const creditNote = hotelChangeResult?.CreditNoteNo || "";
  const creditNoteDate = hotelChangeResult?.CreditNoteCreatedOn || "";
  const zendeskId = hotelChangeResult?.ZendeskTicketId || "";

  const gst = hotelChangeResult?.GST || {};

  const providerRemarks =
    hotelChangeResult?.Remarks ||
    hotelChangeResult?.Error?.ErrorMessage ||
    "Successful";

  const cancelledOn =
    booking.cancellation?.cancelledAt ||
    booking.amendment?.requestedAt ||
    booking.updatedAt;

  const changeRequestId =
    hotelChangeResult?.ChangeRequestId ||
    booking.amendment?.changeRequestId ||
    "—";

  let displayStatusLabel = booking.amendment?.status || "Cancelled";
  if (hotelChangeResult?.ChangeRequestStatus === 3)
    displayStatusLabel = "Approved";
  if (hotelChangeResult?.ChangeRequestStatus === 4)
    displayStatusLabel = "Rejected";

  // ── Already cancelled ──
  if (isCancelled || cancelRequest) {
    return (
      <div className="flex flex-col gap-[1px] bg-[#EAE4D9]">
        {/* Summary header */}
        <div className="bg-white p-[16px_24px] flex justify-between items-center">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
            Overall Cancellation Summary
          </span>
          <span className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5341A] bg-[#FDF1EE] border border-[#F0C4BA] px-[10px] py-[3px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#B5341A] animate-pulse" />
            {displayStatusLabel}
          </span>
        </div>

        <div className="bg-white p-6">
          <div className="grid grid-cols-5 gap-6">
            {[
              {
                label: "Cancelled On",
                val: cancelledOn
                  ? `${fmtDate(cancelledOn)} · ${fmtTime(cancelledOn)}`
                  : "—",
                color: "text-[#1A1714]",
              },
              {
                label: "Total Refund",
                val: totalRefund ? `₹${totalRefund}` : "—",
                color: "text-[#2C7A4B]",
              },
              {
                label: "Total Charges",
                val: totalCharge !== undefined ? `₹${totalCharge}` : "—",
                color: "text-[#B5341A]",
              },
              {
                label: "Credit Note",
                val: creditNote || "—",
                color: "text-[#1A1714]",
                mono: true,
              },
              {
                label: "Change Req ID",
                val: changeRequestId || "—",
                color: "text-[#1A1714]",
                mono: true,
              },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  {item.label}
                </div>
                <div
                  className={`text-[15px] font-semibold ${
                    item.mono ? "font-['DM_Mono']" : ""
                  } ${item.color}`}
                >
                  {item.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 grid grid-cols-2 gap-6">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 bg-[#FAF8F4] border border-[#EAE4D9] flex items-center justify-center shrink-0">
              <FiAlertCircle size={14} className="text-[#A89F94]" />
            </div>
            <div>
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Cancellation Reason
              </div>
              <p className="text-[13px] text-[#7A7068] italic">
                "
                {booking.cancellation?.reason ||
                  booking.amendment?.remarks ||
                  "User Requested"}
                "
              </p>
            </div>
          </div>
          {providerRemarks && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-[#EEF4FD] border border-[#C0D4F0] flex items-center justify-center shrink-0">
                <FiInfo size={14} className="text-[#1A4A7A]" />
              </div>
              <div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  Provider Remarks
                </div>
                <p className="text-[13px] text-[#1A4A7A] font-medium">
                  {providerRemarks}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Existing cancellation status */}
      {cancelRequest &&
        mappedStatus &&
        (() => {
          const cfg =
            CANCEL_STATUS_CONFIG[mappedStatus] || CANCEL_STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          return (
            <div
              className={`${cfg.bg} border ${cfg.border} mb-5 overflow-hidden`}
            >
              <div className={`h-[3px] ${cfg.color.replace("text-", "bg-")}`} />
              <div className="p-[20px_24px]">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-[10px]">
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      size={15}
                      className={`${cfg.color} ${
                        mappedStatus === "processing" ? "animate-spin" : ""
                      }`}
                    />
                    <span className={`text-[14px] font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-semibold tracking-[0.12em] uppercase px-[10px] py-[3px] border ${cfg.color} ${cfg.bg} ${cfg.border}`}
                  >
                    {mappedStatus === "pending" || mappedStatus === "processing"
                      ? "In Process"
                      : mappedStatus}
                  </span>
                </div>

                <div className="grid grid-cols-[auto_1fr_2fr] gap-3">
                  <div className="bg-white/60 p-[12px_14px]">
                    <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                      Request ID
                    </div>
                    <div className="text-[13px] font-['DM_Mono'] font-bold text-[#1A1714]">
                      #{changeRequestId}
                    </div>
                  </div>
                  <div className="bg-white/60 p-[12px_14px]">
                    <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                      Reason
                    </div>
                    <div className={`text-[13px] font-medium ${cfg.color}`}>
                      {submitted ? reason : cancelRequest?.reason || "—"}
                    </div>
                  </div>
                  {(submitted ? remarks : cancelRequest?.remarks) && (
                    <div className="bg-white/60 p-[12px_14px]">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                        Remarks
                      </div>
                      <div className="text-[13px] text-[#7A7068]">
                        {submitted ? remarks : cancelRequest?.remarks}
                      </div>
                    </div>
                  )}
                </div>

                {mappedStatus === "rejected" &&
                  cancelRequest?.approverComments && (
                    <div className="mt-3 flex gap-2 bg-[#FDF1EE] border border-[#F0C4BA] p-[10px_14px] items-start">
                      <FiMessageCircle
                        size={13}
                        className="text-[#B5341A] mt-[2px] shrink-0"
                      />
                      <p className="text-[13px] text-[#B5341A] font-medium">
                        {cancelRequest.approverComments}
                      </p>
                    </div>
                  )}
                {mappedStatus === "approved" && (
                  <div className="mt-3 flex flex-col gap-3 bg-[#EDF7F2] border border-[#C3E4D2] p-[16px_20px]">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <FiCheckCircle
                          size={14}
                          className="text-[#2C7A4B] shrink-0"
                        />
                        <p className="text-[14px] text-[#2C7A4B] font-semibold">
                          Refund will be processed within 5–7 business days
                        </p>
                      </div>
                      {providerStatus?.RefundedAmount === 0 &&
                        providerStatus?.ChangeRequestStatus === 3 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">
                              Not Refunded
                            </span>
                            <button
                              onClick={() =>
                                dispatch(
                                  getHotelAmendmentStatus({
                                    bookingId:
                                      booking?.bookingId || booking?._id,
                                  }),
                                )
                              }
                              className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                            >
                              <FiRefreshCw
                                size={10}
                                className={statusLoading ? "animate-spin" : ""}
                              />
                              Check Status
                            </button>
                          </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#2C7A4B]/80 mb-1">
                          Total Refund
                        </div>
                        <div className="text-[16px] font-bold text-[#2C7A4B]">
                          {totalRefund ? `₹${totalRefund}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#2C7A4B]/80 mb-1">
                          Cancellation Charges
                        </div>
                        <div className="text-[16px] font-bold text-[#2C7A4B]">
                          {totalCharge !== undefined ? `₹${totalCharge}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {creditNote && (
                        <div>
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#2C7A4B]/80 mb-1">
                            Credit Note
                          </div>
                          <div className="font-['DM_Mono'] text-[13px] font-medium text-[#2C7A4B]">
                            {creditNote}
                          </div>
                        </div>
                      )}
                      {changeRequestId && changeRequestId !== "—" && (
                        <div>
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#2C7A4B]/80 mb-1">
                            Change Req ID
                          </div>
                          <div className="font-['DM_Mono'] text-[13px] font-medium text-[#2C7A4B]">
                            {changeRequestId}
                          </div>
                        </div>
                      )}
                    </div>
                    {providerRemarks && providerRemarks !== "Successful" && (
                      <div className="text-[12px] text-[#2C7A4B] italic mt-1">
                        Remarks: {providerRemarks}
                      </div>
                    )}
                  </div>
                )}
                {cancelRequest?.requestedAt && (
                  <p className="mt-3 text-[11px] text-[#A89F94]">
                    Submitted on {fmtDate(cancelRequest.requestedAt)} ·{" "}
                    {fmtTime(cancelRequest.requestedAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

      {/* Request form */}
      {canRequest &&
        !submitted &&
        (!showForm ? (
          <div className="flex justify-between items-center p-6 bg-white border border-[#EAE4D9] flex-wrap gap-4">
            <div className="flex gap-[14px] items-start">
              <FiAlertCircle
                size={18}
                className="text-[#A89F94] shrink-0 mt-[2px]"
              />
              <div>
                <div className="text-[15px] font-semibold text-[#1A1714] mb-1">
                  Need to cancel this booking?
                </div>
                <div className="text-[12px] text-[#7A7068]">
                  Submit a cancellation request. Approved refunds are processed
                  per the policy table above.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-[10px] bg-transparent border border-[#1A1714] text-[#1A1714] cursor-pointer font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-[#1A1714] hover:text-white"
            >
              <MdCancel size={13} />
              Request Cancellation →
            </button>
          </div>
        ) : (
          <div className="bg-[#FDF1EE] border border-[#F0C4BA]">
            {/* Form header */}
            <div className="p-[16px_24px] border-b border-[#F0C4BA] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MdCancel size={14} className="text-[#B5341A]" />
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B5341A]">
                  Cancellation Request
                </span>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setReason("");
                  setRemarks("");
                }}
                className="w-7 h-7 bg-[#F0C4BA] border-none cursor-pointer flex items-center justify-center"
              >
                <FiX size={13} className="text-[#B5341A]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Charges summary */}
              <div className="grid grid-cols-2 gap-[1px] bg-[#F0C4BA]">
                <div className="bg-white p-5">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[6px]">
                    Cancellation Charges
                  </div>
                  <div className="font-['Cormorant_Garamond'] text-[28px] font-bold text-[#B5341A]">
                    ₹{Number(currentCharges.charge).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-[#A89F94] mt-1 italic">
                    {currentCharges.note ||
                      (currentCharges.isFree
                        ? "Free Cancellation"
                        : "Applicable now")}
                  </div>
                </div>
                <div className="bg-white p-5">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[6px]">
                    Estimated Refund
                  </div>
                  <div className="font-['Cormorant_Garamond'] text-[28px] font-bold text-[#2C7A4B]">
                    ₹{Number(currentCharges.refund).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-[#A89F94] mt-1">
                    To original payment mode
                  </div>
                </div>
              </div>

              {/* Reason select */}
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-[#B5341A] mb-2">
                  Reason for Cancellation{" "}
                  <span className="text-[#B5341A]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-[10px_12px] border border-[#EAE4D9] bg-[#FAF8F4] font-['DM_Sans'] text-[13px] text-[#1A1714] outline-none cursor-pointer appearance-none transition-colors focus:border-[#B5862A]"
                  >
                    <option value="">Select a reason…</option>
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A89F94]">
                    ▾
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-[#B5341A] mb-2">
                  Additional Remarks{" "}
                  <span className="text-[11px] font-normal text-[#A89F94] normal-case tracking-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional context for your request…"
                  rows={3}
                  className="w-full p-[10px_12px] border border-[#EAE4D9] bg-[#FAF8F4] font-['DM_Sans'] text-[13px] text-[#1A1714] outline-none transition-colors focus:border-[#B5862A] resize-none block"
                />
              </div>

              {/* Info note */}
              <div className="flex gap-2 p-[12px_14px] bg-[#FDF8EE] border border-[#F0E0A8] items-start">
                <FiInfo
                  size={13}
                  className="text-[#8A6200] shrink-0 mt-[2px]"
                />
                <p className="text-[12px] text-[#8A6200] leading-[1.5]">
                  Total Charge{" "}
                  <strong>
                    ₹{Number(currentCharges.charge).toLocaleString("en-IN")}
                  </strong>
                  . Refund (if applicable) will be processed after approval.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className="inline-flex items-center gap-2 px-5 py-[10px] bg-[#B5341A] text-white border-none cursor-pointer font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-[#8A2510] disabled:bg-[#D4A8A0] disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <FiRefreshCw size={12} className="animate-spin" />{" "}
                      Submitting…
                    </>
                  ) : (
                    <>
                      <FiSend size={12} /> Submit Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
                    setRemarks("");
                  }}
                  className="bg-none border-none cursor-pointer text-[12px] text-[#7A7068] font-['DM_Sans']"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}

      {/* Not eligible */}
      {!canRequest && !isCancelled && !cancelRequest && !submitted && (
        <div className="flex items-center gap-2 p-[14px_20px] bg-white border border-[#EAE4D9]">
          <FiInfo size={14} className="text-[#A89F94]" />
          <p className="text-[13px] text-[#7A7068]">
            {isPastCheckIn
              ? "Cancellation is no longer possible as the check-in date has passed."
              : "Cancellation requests can only be submitted for confirmed bookings."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Total Price Footer Bar                                         */
/* ─────────────────────────────────────────────────────────────── */
function TotalPriceBar({ totalFare, onDownload, isCancelled }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EAE4D9] flex justify-between items-center px-8 py-3">
      <div>
        <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[2px]">
          Total Price
        </div>
        <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">
          ₹{Number(totalFare).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Fare Summary Card                                              */
/* ─────────────────────────────────────────────────────────────── */
function FareSummaryCard({ totalFare, currency, isRefundable }) {
  return (
    <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-6 space-y-6 lg:sticky lg:top-[140px]">
      <div className="flex items-center gap-2 text-[#B5862A] border-b border-[#EAE4D9] pb-4">
        <FiCreditCard size={16} />
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase">
          Fare Summary
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#EAE4D9]">
        <div>
          <div className="text-[10px] font-bold text-[#A89F94] tracking-[0.12em] uppercase mb-1">
            Currency
          </div>
          <div className="text-[14px] font-semibold text-[#1A1714]">
            {currency || "INR"}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#A89F94] tracking-[0.12em] uppercase mb-1">
            Refundable
          </div>
          <div className="text-[14px] font-semibold text-[#B5862A]">
            {isRefundable ? "Yes" : "No"}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end pt-2">
        <div>
          <div className="text-[14px] font-bold text-[#1A1714]">Total Paid</div>
          <div className="text-[11px] text-[#A89F94] mt-[2px]">
            incl. taxes & fees
          </div>
        </div>
        <div className="font-['Cormorant_Garamond'] text-[28px] font-bold text-[#1A1714] leading-none">
          ₹{Number(totalFare).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

function CorporateAuditSection({ booking }) {
  const isConfirmed =
    booking.executionStatus === "voucher_generated" ||
    booking.executionStatus === "confirmed" ||
    booking.executionStatus === "booked";

  const approverName = (() => {
    const requesterId = booking.userId?._id || booking.userId;
    const approverId =
      booking.approverId || booking.approvedBy?._id || booking.approvedBy;
    if (
      booking.approverName === "Auto Approve" ||
      (requesterId &&
        approverId &&
        requesterId.toString() === approverId.toString())
    ) {
      return "Auto Approved (System)";
    }
    return booking.approvedBy?.name
      ? `${booking.approvedBy.name.firstName} ${booking.approvedBy.name.lastName}`
      : booking.approverName || "—";
  })();

  const requesterName =
    booking.requesterDetails?.name ||
    (booking.userId?.name
      ? `${booking.userId.name.firstName} ${booking.userId.name.lastName}`
      : booking.travellers?.[0]
        ? `${booking.travellers[0].firstName} ${booking.travellers[0].lastName}`
        : "—");

  const sections = [
    {
      heading: "Project Information",
      fields: [
        {
          label: "Order ID",
          value: booking.orderId || "—",
          icon: <FiHash size={11} />,
        },
        {
          label: "Project Name",
          value: booking.projectName || "—",
          icon: <FiBriefcase size={11} />,
        },
        {
          label: "Project Code",
          value: booking.projectId || booking.projectCodeId || "—",
          icon: <FiTag size={11} />,
        },
        {
          label: "Project Client",
          value: booking.projectClient || "—",
          icon: <FiBriefcase size={11} />,
        },
      ],
    },
    {
      heading: "Requester Details",
      fields: [
        {
          label: "Requester Name",
          value: requesterName,
          icon: <FiUser size={11} />,
        },
        {
          label: "Requester Email",
          value:
            booking.requesterDetails?.email ||
            booking.userId?.email ||
            booking.travellers?.[0]?.email ||
            "—",
          icon: <FiMail size={11} />,
          isEmail: true,
        },
        {
          label: "Purpose of Travel",
          value: booking.purposeOfTravel || booking.purpose || "—",
          icon: <FiBriefcase size={11} />,
        },
      ],
    },
    {
      heading: "Approval Details",
      fields: [
        {
          label: "Selected Approver",
          value: approverName,
          icon: <FiUser size={11} />,
        },
        {
          label: "Approver Email",
          value: booking.approverEmail || booking.approvedBy?.email || "—",
          icon: <FiMail size={11} />,
          isEmail: true,
        },
        {
          label: "Approver Role",
          value: booking.approverRole
            ? booking.approverRole
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : "—",
          icon: <FiShield size={11} />,
        },
        ...(booking.approvedBy?.name
          ? [
              {
                label: "Approved By",
                value:
                  `${booking.approvedBy.name.firstName || ""} ${booking.approvedBy.name.lastName || ""}`.trim() ||
                  "—",
                icon: <FiUser size={11} />,
              },
              {
                label: "Approved By Email",
                value: booking.approvedBy?.email || "—",
                icon: <FiMail size={11} />,
                isEmail: true,
              },
              {
                label: "Approved By Role",
                value: booking.approvedBy?.role
                  ? booking.approvedBy.role
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "—",
                icon: <FiShield size={11} />,
              },
            ]
          : []),
        ...(booking.approverComments
          ? [
              {
                label: "Approver Comments",
                value: booking.approverComments,
                icon: <FiMessageSquare size={11} />,
              },
            ]
          : []),
        ...(isConfirmed && getVoucherDate(booking)
          ? [
              {
                label: "Vouchered At",
                value: `${fmtDate(getVoucherDate(booking))} ${fmtTime(getVoucherDate(booking))}`,
                icon: <FiClock size={11} />,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <div className="bg-white border border-[#EAE4D9] overflow-hidden">
      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "border-t border-[#EAE4D9]" : ""}>
          <div className="px-6 pt-5 pb-3 bg-[#FAF8F4]">
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A]">
              {section.heading}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[#EAE4D9]">
            {section.fields.map((field, fi) => (
              <div
                key={fi}
                className={`px-6 py-5 ${
                  fi % 3 !== 2 ? "sm:border-r border-[#EAE4D9]" : ""
                } ${fi >= 3 ? "border-t border-[#EAE4D9]" : ""}`}
              >
                <div className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  <span className="text-[#B5862A]">{field.icon}</span>
                  {field.label}
                </div>
                <div
                  className={`text-[13px] font-semibold text-[#1A1714] leading-snug ${
                    field.isEmail ? "break-all" : ""
                  }`}
                >
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function HotelBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const {
    singleBooking: booking,
    loadingSingleBooking: loading,
    errorSingleBooking: error,
  } = useSelector((s) => s.adminBooking);
  const user = useSelector((state) => state.auth?.user);
  const isTravelAdmin = user?.role === "travel-admin";

  const [activeTab, setActiveTab] = useState("hotel_details");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect source: cancelled table or total bookings table
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get("source");
  const backPath =
    source === "cancelled"
      ? "/total-cancelled-bookings"
      : source === "past"
        ? "/past-trips"
        : source === "upcoming"
          ? "/upcoming-trips"
          : source === "wallet"
            ? "/corporate-wallet"
            : source === "postpaid"
              ? "/credit-utilization"
              : location.state?.fromProjectExpenditure
                ? -1
                : "/total-bookings";

  const backLabel =
    source === "cancelled"
      ? "Cancelled Bookings"
      : source === "past"
        ? "Past Trips"
        : source === "upcoming"
          ? "Upcoming Trips"
          : source === "wallet"
            ? "Corporate Wallet"
            : source === "postpaid"
              ? "Postpaid Credit Ledger"
              : "Total Bookings";

  const {
    sendLoading,
    sendError,
    sendSuccess,
    statusLoading,
    amendmentStatus,
  } = useSelector((state) => state.hotelAmendment);

  useEffect(() => {
    if (id) dispatch(getHotelBookingByIdAdmin(id));
  }, [id, dispatch]);

  if (loading || (!booking && !error)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAF8F4] font-['DM_Sans']">
        <div className="w-10 h-10 rounded-full border-2 border-[#EAE4D9] border-t-[#B5862A] animate-spin" />
        <p className="text-[13px] text-[#A89F94]">Loading booking details…</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAF8F4] font-['DM_Sans'] p-6 text-center">
        <FiAlertCircle size={40} className="text-[#B5341A] opacity-50" />
        <h2 className="text-[16px] font-semibold text-[#1A1714]">
          Failed to load booking
        </h2>
        <p className="text-[13px] text-[#A89F94] max-w-xs">{error}</p>
        <button
          onClick={() => dispatch(getHotelBookingByIdAdmin(id))}
          className="mt-2 px-6 py-2 bg-[#B5862A] text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-[#966b1d] transition-colors"
        >
          Retry
        </button>
        <button
          onClick={() => navigate(backPath)}
          className="text-[12px] text-[#7A7068] hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  /* ── Data ── */
  const hotelReq = booking?.hotelRequest || {};
  const selectedRoom = hotelReq?.selectedRoom || {};
  const snapshot = booking?.bookingSnapshot || {};
  const pricing = booking?.pricingSnapshot || {};
  const priceBreakUp = pricing?.priceBreakUp || null;
  const bookingResult = booking?.bookingResult || {};
  const result = bookingResult; // alias for JSX compatibility

  // Room data from the actual API response structure
  const allRooms = hotelReq.allRooms || [];
  const rawData = hotelReq.selectedRoom?.rawRoomData;
  const selectedRoomRaw = Array.isArray(rawData)
    ? rawData[0] || {}
    : rawData || allRooms[0] || {};

  const tboBookedRooms = booking.bookedHotelDetails?.GetBookingDetailResult?.Rooms || booking.bookedHotelDetails?.Rooms;
  const preBookRoomsArray = hotelReq?.preBookResponse?.HotelResult?.[0]?.Rooms;

  const rooms =
    Array.isArray(tboBookedRooms) && tboBookedRooms.length > 0
      ? tboBookedRooms
      : Array.isArray(preBookRoomsArray) && preBookRoomsArray.length > 0
        ? preBookRoomsArray
        : Array.isArray(booking?.rooms) && booking.rooms.length > 0
          ? booking.rooms
          : Array.isArray(rawData)
            ? rawData
            : rawData
              ? [rawData]
              : allRooms;

  // Use the first resolved room for fallback policies
  const primaryRoom = rooms[0] || selectedRoomRaw;

  const cancelPolicies =
    primaryRoom?.CancelPolicies ||
    primaryRoom?.CancelPolicy ||
    hotelReq.selectedRoom?.cancelPolicies ||
    [];

  const amenities = primaryRoom?.Amenities || primaryRoom?.amenities || [];

  const travellers = booking?.travellers || [];
  const bookingDetail = null; // no raw TBO detail in this API
  const detailRoom = primaryRoom;
  const preBookResult = hotelReq?.preBookResponse?.HotelResult?.[0] || {};
  const rateConditions =
    primaryRoom?.RateConditions ||
    hotelReq.selectedRoom?.RateConditions ||
    preBookResult?.RateConditions ||
    [];
  const rawSupplements =
    primaryRoom?.Supplements ||
    hotelReq.selectedRoom?.Supplements ||
    preBookResult?.Rooms?.[0]?.Supplements ||
    [];
  const supplements = Array.isArray(rawSupplements[0])
    ? rawSupplements.flat()
    : rawSupplements;

  const paymentSuccessful = booking?.payment?.status === "completed";
  const executionStatus = booking?.executionStatus || "";
  const bookingAmendmentStatus = booking?.amendment?.status || "";

  // Combined status: if amendment is pending, show that; otherwise use executionStatus
  const displayStatus = ["requested", "in_progress"].includes(
    bookingAmendmentStatus,
  )
    ? `amendment_${bookingAmendmentStatus}`
    : executionStatus;

  const isConfirmed =
    executionStatus === "voucher_generated" ||
    executionStatus === "confirmed" ||
    executionStatus === "booked";
  const isCancelled = ["cancelled", "cancel_requested"].includes(
    executionStatus.toLowerCase(),
  );
  const isAmendmentPending =
    bookingAmendmentStatus === "requested" ||
    bookingAmendmentStatus === "in_progress";

  const totalFare =
    pricing?.totalAmount ||
    selectedRoomRaw?.TotalFare ||
    allRooms[0]?.totalFare ||
    0;

  return (
    <div className="bg-[#FAF8F4] min-h-screen font-['DM_Sans'] selection:bg-[#B5862A20] selection:text-[#B5862A]">
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EAE4D9] flex flex-col">
        {/* Top Row */}
        <div className="flex items-center gap-2 sm:gap-4 w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2 sm:pt-4">
          <button
            onClick={() => {
              if (backPath === -1) navigate(-1);
              else navigate(backPath, { state: location.state });
            }}
            className="flex items-center gap-[6px] bg-none border-none cursor-pointer text-[12px] font-semibold text-[#B5862A] font-['DM_Sans'] tracking-[0.05em] uppercase hover:opacity-80 transition-opacity shrink-0"
          >
            <FiArrowLeft size={14} />
            <span className="hidden sm:inline">{backLabel || "Back"}</span>
          </button>
          <span className="w-[1px] h-4 bg-[#EAE4D9] hidden sm:block" />
          <h1 className="text-[12px] sm:text-[13px] font-semibold text-[#1A1714] font-['DM_Sans'] tracking-[0.04em] truncate">
            Hotel Booking Details
          </h1>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {/* Status pills — hidden on xs, visible sm+ */}
            {executionStatus && (
              <div className="hidden sm:flex items-center gap-2">
                <StatusPill status={executionStatus} />
                {bookingAmendmentStatus &&
                  bookingAmendmentStatus !== "not_requested" &&
                  bookingAmendmentStatus !== "completed" && (
                    <StatusPill
                      status={`amendment_${bookingAmendmentStatus}`}
                    />
                  )}
              </div>
            )}
            {/* Order ID — hidden on mobile */}
            {(booking.orderId || booking.bookingReference) && (
              <span className="hidden md:inline text-[11px] text-[#A89F94]">
                Order ID:{" "}
                <strong className="text-[#1A1714] font-['DM_Mono']">
                  {booking.orderId || booking.bookingReference}
                </strong>
              </span>
            )}
            {/* Download voucher — icon-only on mobile */}
            {isConfirmed && !isCancelled && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#2C7A4B] bg-[#EDF7F2] border border-[#C3E4D2] px-[12px] py-1">
                  <MdVerifiedUser size={11} /> Voucher Issued
                </span>
                <button
                  onClick={() => dispatch(generateHotelVoucher(booking._id))}
                  className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5862A] border border-[#B5862A] px-[10px] sm:px-[12px] py-1 hover:bg-[#B5862A] hover:text-[#FAF8F4] transition-colors"
                >
                  <FiDownload size={11} />
                  <span className="hidden sm:inline">Download Voucher</span>
                </button>
              </div>
            )}
            {/* Hamburger — visible only on small screens */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden flex items-center gap-1 border border-[#EAE4D9] px-2 py-1 text-[#7A7068] hover:border-[#B5862A] hover:text-[#B5862A] transition-colors shrink-0"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <FiX size={16} /> : <FiMenu size={16} />}
              <FiChevronDown
                size={12}
                className={`transition-transform duration-200 ${mobileMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Desktop Tab Bar (lg+) ── */}
        {(() => {
          const tabs = [
            { id: "hotel_details", label: "Hotel Details" },
            { id: "room_details", label: "Room Details" },
            { id: "project", label: "Project Details" },
            { id: "rules", label: "Rules and Policies" },
            { id: "guest", label: "Guest" },
            { id: "amendment", label: "Amendment" },
            { id: "history", label: "Booking Life Cycle" },
          ];
          return (
            <>
              {/* Desktop horizontal tab bar */}
              <div className="hidden lg:flex items-center gap-6 overflow-x-auto w-full px-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap relative ${
                      activeTab === tab.id
                        ? "text-[#1A1714]"
                        : "text-[#A89F94] hover:text-[#7A7068]"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#B5862A]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Mobile dropdown menu */}
              {mobileMenuOpen && (
                <div className="lg:hidden border-t border-[#EAE4D9] bg-white shadow-lg">
                  {/* Status pills row on mobile */}
                  {executionStatus && (
                    <div className="flex items-center gap-2 flex-wrap px-4 pt-3 pb-2 border-b border-[#EAE4D9]">
                      <StatusPill status={executionStatus} />
                      {bookingAmendmentStatus &&
                        bookingAmendmentStatus !== "not_requested" &&
                        bookingAmendmentStatus !== "completed" && (
                          <StatusPill
                            status={`amendment_${bookingAmendmentStatus}`}
                          />
                        )}
                      {(booking.orderId || booking.bookingReference) && (
                        <span className="text-[11px] text-[#A89F94] ml-auto">
                          <strong className="text-[#1A1714] font-['DM_Mono']">
                            #{booking.orderId || booking.bookingReference}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                  {/* Tab list */}
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-5 py-[13px] text-[13px] font-semibold tracking-wide border-b border-[#EAE4D9] transition-colors flex items-center justify-between ${
                        activeTab === tab.id
                          ? "text-[#B5862A] bg-[#FFFBF0]"
                          : "text-[#7A7068] hover:bg-[#FAF8F4] hover:text-[#1A1714]"
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B5862A] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </header>

      {/* ── Main ── */}
      <main className="w-full px-4 lg:px-10 py-8 pb-24 space-y-6">
        {/* ── Dynamic Header ── */}
        {(() => {
          let label = "Reservation";
          let title = isCancelled
            ? "The trip is cancelled."
            : location.state?.isPastTrip
              ? "The trip is completed."
              : "The trip is confirmed.";
          let subtitle =
            "A clean, single-page record of the itinerary, guests and payment.";

          if (activeTab === "room_details") {
            label = "Room Details";
            title = "Accommodation Info";
            subtitle =
              "Detailed breakdown of the reserved rooms, amenities, and meal plans.";
          } else if (activeTab === "project") {
            label = "Project Details";
            title = "Project & Approvals";
            subtitle =
              "Information about the project code and the approval workflow for this trip.";
          } else if (activeTab === "rules") {
            label = "Rules & Policies";
            title = "Hotel Policies";
            subtitle =
              "Important guidelines, cancellation policies, and hotel rules.";
          } else if (activeTab === "guest") {
            label = "Guest Information";
            title = "Guests";
            subtitle = "List of all guests staying in this reservation.";
          } else if (activeTab === "amendment") {
            label = "Modifications";
            title = "Amendments & Options";
            subtitle =
              "Manage cancellations, reissues, and support queries for this booking.";
          } else if (activeTab === "history") {
            label = "Audit Trail";
            title = "Booking Life Cycle";
            subtitle =
              "Chronological history of status changes and events for this reservation.";
          }

          return (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                  {label}
                </p>
                <h1 className="text-[36px] font-black text-gray-900 tracking-tight leading-none mb-3">
                  {title}
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          );
        })()}

        {activeTab === "hotel_details" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div>
                <HotelHeroCard
                  booking={booking}
                  bookingDetail={bookingDetail}
                  paymentSuccessful={paymentSuccessful}
                />
              </div>
              <div>
                <FareSummaryCard
                  totalFare={totalFare}
                  currency={
                    pricing?.currency || priceBreakUp?.Currency || "INR"
                  }
                  isRefundable={
                    selectedRoomRaw?.Refundable !== undefined
                      ? selectedRoomRaw?.Refundable
                      : !selectedRoomRaw?.IsNonRefundable
                  }
                />
              </div>
            </div>

            <div className=" gap-6">
              <div className="space-y-6">
                <PaymentStatusCard
                  booking={booking}
                  paymentSuccessful={paymentSuccessful}
                  isConfirmed={isConfirmed}
                  hotelReq={hotelReq}
                  isTravelAdmin={isTravelAdmin}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "project" && (
          <div className="space-y-6">
            <section>
              <SectionHeader num={null} title="Corporate Audit" />
              <CorporateAuditSection booking={booking} />
            </section>
          </div>
        )}

        {activeTab === "room_details" && (
          <div className="space-y-6">
            {rooms.length > 0 ? (
              <section className="mb-12">
                <SectionHeader num={1} title="The Room" />
                <RoomSection
                  rooms={rooms}
                  preBookRooms={preBookResult?.Rooms || []}
                  allRooms={allRooms}
                  selectedRoom={selectedRoom}
                  noOfRooms={hotelReq?.noOfRooms}
                />
              </section>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No room details available.</p>
              </div>
            )}

            {supplements.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={2} title="Mandatory Supplements" />
                <div className="bg-white border border-[#EAE4D9] p-5">
                  <ul className="space-y-3 m-0 p-0 list-none">
                    {supplements.map((s, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0 last:pb-0"
                      >
                        <div>
                          <div className="text-[11px] font-bold text-[#1A1714] uppercase tracking-wide">
                            {s.Type || s.type || "Supplement"}
                          </div>
                          <div className="text-[12px] text-[#7A7068]">
                            {s.Description ||
                              s.description ||
                              "Additional Charge"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[14px] font-bold text-[#B5862A]">
                            {s.Currency || "AED"} {s.Price || s.SuppAmount || 0}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-6">
            {cancelPolicies.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={2} title="Cancellation Policy" />
                <CancellationPolicySection
                  policies={cancelPolicies}
                  lastCancellationDate={
                    detailRoom?.LastCancellationDate ||
                    bookingDetail?.LastCancellationDate
                  }
                />
              </section>
            )}

            {rateConditions.length > 0 && (
              <section className="mb-12">
                <SectionHeader
                  num={3}
                  title="Rate Conditions & Hotel Policies"
                />
                <CheckInInstructions conditions={rateConditions} />
              </section>
            )}

            {cancelPolicies.length === 0 && rateConditions.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500">No rules and policies provided.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "guest" && (
          <div className="space-y-6">
            {travellers.length > 0 ? (
              <section className="mb-12">
                <SectionHeader num={4} title="Guest" />
                <GuestSection travellers={travellers} />
              </section>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No guest details provided.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "amendment" && (
          <div className="space-y-6">
            <section className="mb-12">
              <SectionHeader num={5} title="Cancellation Request" />
              <CancellationSection
                booking={booking}
                isConfirmed={isConfirmed}
                cancelPolicies={cancelPolicies}
                totalFare={totalFare}
              />
            </section>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <BookingHistory booking={booking} />
          </div>
        )}
      </main>
    </div>
  );
}
