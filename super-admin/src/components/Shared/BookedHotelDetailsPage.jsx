// HotelBookingDetails.jsx
// Hotel booking details page — redesigned with luxury editorial aesthetic.
// All original logic preserved. Only UI/layout/design replaced.

import React, { useEffect, useState, useRef } from "react";
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
  FiTag,
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
  fetchSuperAdminHotelBookingById as fetchBookedHotelDetails,
  sendHotelAmendment,
  getHotelAmendmentStatus,
} from "../../Redux/Actions/corporate.related.thunks";
import { generateHotelVoucher } from "../../Redux/Actions/booking.thunks";

/* ─────────────────────────────────────────────────────────────── */
/*  Helpers                                                        */
/* ─────────────────────────────────────────────────────────────── */
function fmtDate(d, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}
function fmtDay(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long" });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function nightsCount(ci, co) {
  if (!ci || !co) return 1;
  return Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
}
function unwrapLiveBookingData(liveBookingData) {
  return (
    liveBookingData?.GetBookingDetailResult ||
    liveBookingData?.getBookingDetailResult ||
    liveBookingData?.BookingDetailResult ||
    liveBookingData ||
    null
  );
}
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function formatMoney(value, currency = "INR") {
  const amount = Number(value || 0);
  const prefix = currency === "INR" ? "₹" : `${currency} `;
  return `${prefix}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ─────────────────────────────────────────────────────────────── */
/*  StatusPill                                                     */
/* ─────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const label = status === "voucher_generated" ? "Confirmed" : status;
  const isCancelled = ["cancelled", "cancel_requested"].includes(
    (status || "").toLowerCase(),
  );
  const isConfirmed = ["confirmed", "voucher_generated"].includes(
    (status || "").toLowerCase(),
  );

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
      <span className={`w-[6px] height-[6px] rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stars                                                          */
/* ─────────────────────────────────────────────────────────────── */
function Stars({ count = 0 }) {
  const rating = Math.min(Math.max(Number(count) || 0, 0), 5);
  return (
    <span className="inline-flex gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg 
          key={i} 
          width="13" 
          height="13" 
          viewBox="0 0 20 20" 
          fill={i < rating ? "#B5862A" : "none"} 
          stroke="#B5862A" 
          strokeWidth={i < rating ? "0" : "1.5"}
        >
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
  const [activeIndex, setActiveIndex] = useState(0);
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const result = booking?.bookingResult || {};
  const detail = bookingDetail || booking?.raw || {};
  const rooms = Array.isArray(detail?.Rooms)
    ? detail.Rooms
    : Array.isArray(booking?.rooms)
      ? booking.rooms
      : [];
  const selectedRoom = hotelReq?.selectedRoom || {};
  const selectedHotel = hotelReq?.selectedHotel || {};

  const hotelName = detail?.HotelName || snapshot?.hotelName || selectedHotel?.hotelName || "Hotel";
  const city = detail?.City || selectedHotel?.city || "";
  const address = detail?.AddressLine1 || selectedHotel?.address || "";
  const starRating = detail?.StarRating || selectedHotel?.starRating || 0;
  const checkIn = detail?.CheckInDate || hotelReq?.checkInDate;
  const checkOut = detail?.CheckOutDate || hotelReq?.checkOutDate;
  const nights = nightsCount(checkIn, checkOut);
  const roomType =
    rooms.length > 1
      ? rooms.map((r) => r.RoomTypeName).join(", ")
      : rooms[0]?.RoomTypeName || "Standard Room";
  let images =
    booking?.images ||
    selectedHotel?.images ||
    selectedRoom?.rawRoomData?.images ||
    [];
  if (snapshot?.hotelImage && !images.includes(snapshot.hotelImage)) {
    images = [snapshot.hotelImage, ...images];
  }

  const confirmationNo = detail?.ConfirmationNo || result?.hotelBookingId || "";
  const invoiceNo = detail?.InvoiceNo || result?.providerResponse?.BookResult?.InvoiceNumber || "";
  const bookingRefNo = detail?.BookingRefNo || result?.providerResponse?.BookResult?.BookingRefNo || "";
  const tboRef = detail?.TBOReferenceNo || "";
  const executionStatus = booking?.executionStatus || "";
  const isCancelled = ["cancelled", "cancel_requested"].includes((executionStatus || "").toLowerCase());

  const [isInView, setIsInView] = useState(false);
  const imgContainerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    if (imgContainerRef.current) observer.observe(imgContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const issuedDate = booking?.approvedAt || booking?.createdAt;

  useEffect(() => {
    if (!images.length || !isInView) return;
    const interval = setInterval(() => setActiveIndex((p) => (p + 1) % images.length), 2000);
    return () => clearInterval(interval);
  }, [images, isInView]);

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
      <div className="grid grid-cols-[minmax(0,380px)_1fr] gap-0">
        {/* Image */}
        <div ref={imgContainerRef} className="relative min-h-[320px] overflow-hidden bg-[#E8E0D0]">
          {images.length > 0 ? (
            <img src={images[activeIndex]}
              alt={hotelName}
              className="w-full h-full object-cover block absolute inset-0 transition-opacity duration-700" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full min-h-[320px] flex items-center justify-center bg-[#E8E0D0]">
              <MdHotel size={48} className="text-[#EAE4D9]" />
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="p-8 md:p-9">
          {/* Hotel name + stars + city */}
          <div className="mb-6">
            <h1 className="font-['Cormorant_Garamond'] text-[36px] font-bold leading-[1.1] text-[#1A1714] mb-2">
              {isCancelled ? "Your trip was cancelled." : hotelName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap mb-[6px]">
              {starRating > 0 && <Stars count={starRating} />}
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
              <div className="mt-[10px] flex gap-2 flex-wrap">
                <StatusPill status={executionStatus} />
                {booking?.amendment?.status && booking.amendment.status !== 'not_requested' && !isCancelled && (
                  <StatusPill status="cancel_requested" />
                )}
              </div>
            )}
          </div>

          <hr className="border-t border-[#EAE4D9] my-5" />

          {/* Check-in / out */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Check-in
              </div>
              <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px]">
                {checkIn
                  ? new Date(checkIn).getDate().toString().padStart(2, "0")
                  : "—"}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {fmtDate(checkIn, { month: "short", year: "numeric" })}
              </div>
              <div className="text-[11px] text-[#A89F94]">
                {fmtDay(checkIn)} ·{" "}
                {fmtTime(checkIn) !== "—" ? fmtTime(checkIn) : "14:00"}
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
              <div className="text-[10px] text-[#A89F94] mt-2 max-w-[80px] text-center mx-auto">
                {roomType}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Check-out
              </div>
              <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px]">
                {checkOut
                  ? new Date(checkOut).getDate().toString().padStart(2, "0")
                  : "—"}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {fmtDate(checkOut, { month: "short", year: "numeric" })}
              </div>
              <div className="text-[11px] text-[#A89F94]">
                {fmtDay(checkOut)} · 11:00
              </div>
            </div>
          </div>

          <hr className="border-t border-[#EAE4D9] my-5" />

          {/* Confirmation refs */}
          {paymentSuccessful ? (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                  Confirmation No.
                </div>
                {confirmationNo ? (
                  <div className="font-['DM_Mono'] text-[16px] font-medium text-[#1A1714]">
                    {confirmationNo}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#A89F94]">
                    <FiRefreshCw
                      size={12}
                      className="animate-spin"
                    />
                    <span className="text-[12px]">Awaiting confirmation…</span>
                  </div>
                )}
                {invoiceNo && (
                  <div className="text-[11px] text-[#A89F94] mt-[2px]">
                    Invoice: {invoiceNo}
                  </div>
                )}
              </div>
              {tboRef && (
                <div>
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                    TBO Reference
                  </div>
                  <div className="font-['DM_Mono'] text-[14px] font-medium text-[#7A7068]">
                    {tboRef}
                  </div>
                  {bookingRefNo && (
                    <div className="text-[11px] text-[#A89F94] mt-[2px]">
                      Ref: {bookingRefNo}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#A89F94] text-[12px]">
              <FiAlertCircle size={14} />
              Complete payment to view confirmation details
            </div>
          )}
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
    },
    {
      label: "Invoice",
      value: isConfirmed ? "Issued" : "Processing…",
      ok: isConfirmed,
      icon: isConfirmed ? (
        <MdVerifiedUser size={13} />
      ) : (
        <FiRefreshCw
          size={13}
          className="animate-spin"
        />
      ),
    },
    {
      label: "Rooms",
      value: hotelReq.noOfRooms || 1,
      ok: null,
      icon: <MdHotel size={13} />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9]">
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
function RoomSection({ rooms, selectedRoom }) {
  if (!rooms?.length) return null;

  return (
    <div className="flex flex-col gap-8">
      {rooms.map((room, index) => {
        // Parse inclusions as chips
        const inclusions = room.Inclusion
          ? room.Inclusion.split(/,/)
              .map(v => v.trim())
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
          : [];

        const descriptionHtml = room.RoomDescription || "";
        const priceBreakUp = Array.isArray(room.PriceBreakUp)
          ? room.PriceBreakUp[0] || {}
          : room.PriceBreakUp || {};
        const dayRates = toArray(room.DayRates).flat().filter(Boolean);
        const supplements = toArray(room.Supplements).flat(Infinity).filter(Boolean);
        const roomFacts = [
          { label: "Adults", value: room.AdultCount },
          { label: "Children", value: room.ChildCount },
          { label: "Room ID", value: room.RoomId },
          { label: "Room Index", value: room.RoomIndex },
          { label: "Room Status", value: room.RoomStatus },
          { label: "Availability", value: room.AvailabilityType },
          { label: "Smoking", value: room.SmokingPreference },
          { label: "Require Pax Details", value: room.RequireAllPaxDetails === true ? "Yes" : room.RequireAllPaxDetails === false ? "No" : "" },
        ].filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

        return (
          <div key={index}>
            {/* Room header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-['Cormorant_Garamond'] text-[26px] font-semibold text-[#1A1714]">
                {room.RoomTypeName || `Room ${index + 1}`}
              </h3>
              {(room.Inclusion || room.mealType || room.MealType || selectedRoom?.mealType) && (
                <div className="flex gap-2">
                  {inclusions.slice(0, 3).map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#D4A843] text-[10px] font-medium text-[#B5862A] bg-[#FDF8EE]"
                    >
                      <FiCheckCircle size={10} /> {item}
                    </span>
                  ))}
                  {(room.mealType || room.MealType || selectedRoom?.mealType) && (
                    <span className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#D4A843] text-[10px] font-medium text-[#B5862A] bg-[#FDF8EE]">
                      <FiCoffee size={10} /> {room.mealType || room.MealType || selectedRoom?.mealType}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Description + inclusions two-column */}
            <div
              className={`grid gap-[1px] bg-[#EAE4D9] ${
                descriptionHtml && inclusions.length
                  ? "grid-cols-[3fr_2fr]"
                  : "grid-cols-1"
              }`}
            >
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

              {/* Inclusions + cancellation */}
              {(inclusions.length > 0 || room.mealType || room.MealType || selectedRoom?.mealType) && (
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Inclusions
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    {inclusions.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#D4A843] text-[11px] text-[#B5862A] bg-[#FDF8EE]"
                      >
                        <FiCheckCircle size={10} /> {item}
                      </span>
                    ))}
                    {(room.mealType || room.MealType || selectedRoom?.mealType) && (
                      <span className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#D4A843] text-[11px] text-[#B5862A] bg-[#FDF8EE]">
                        <FiCoffee size={10} /> {room.mealType || room.MealType || selectedRoom?.mealType}
                      </span>
                    )}
                  </div>

                  {/* Cancellation note from room */}
                  {room.LastCancellationDate && (
                    <div className="mt-5">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[6px]">
                        Cancellation
                      </div>
                      <div className="text-[#2C7A4B] text-[14px] font-semibold leading-[1.4]">
                        Free cancellation
                        <br />
                        until {fmtDate(room.LastCancellationDate)}
                      </div>
                      <div className="text-[11px] text-[#A89F94] mt-1">
                        After this date, the booking becomes non-refundable per
                        the rate policy.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-[1px] bg-[#EAE4D9] mt-[1px]">
              {roomFacts.map((item, i) => (
                <div key={i} className="bg-white p-4">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                    {item.label}
                  </div>
                  <div className="text-[12px] font-medium text-[#1A1714] break-all">
                    {String(item.value)}
                  </div>
                </div>
              ))}
            </div>



            {/* Standalone Supplements Section */}
            {supplements.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A89F94] mb-3">
                  Supplements (Payable at Property)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplements.map((supp, si) => {
                    const type = supp.Type || supp.type || "Fee";
                    const desc = supp.Description || supp.description || "";
                    const price = supp.Price !== undefined ? supp.Price : supp.price;
                    const currency = supp.Currency || supp.currency;
                    const indexVal = supp.Index || supp.index;

                    return (
                      <div
                        key={si}
                        className="flex justify-between items-center bg-white border border-[#EAE4D9] px-5 py-4 rounded shadow-sm relative overflow-hidden"
                      >
                        {/* accent line */}
                        <div className="absolute left-0 top-0 w-[3px] h-full bg-[#D4A843]" />
                        
                        <div className="flex flex-col gap-[2px] pl-2">
                          <span className="text-[10px] font-bold text-[#B5862A] uppercase tracking-wider">
                            {indexVal ? `Ref: ${indexVal} • ` : ""}{type}
                          </span>
                          <span className="text-[15px] font-semibold text-[#1A1714] capitalize">
                            {desc ? desc.replace(/_/g, " ") : "Mandatory Tax / Supplement"}
                          </span>
                        </div>
                        <div className="text-[16px] font-bold text-[#1A1714] whitespace-nowrap ml-4">
                          {formatMoney(price, currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
  if (!amenities.length) {
    return (
      <div className="bg-white border border-[#EAE4D9] p-5">
        <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
          Amenities
        </div>
        <p className="text-[13px] text-[#7A7068]">
          No amenities were returned by the provider for this booking.
        </p>
      </div>
    );
  }

  // Top 4 feature amenities for icon display
  const iconMap = {
    "free wi-fi": <FiWifi size={20} />,
    "wi-fi": <FiWifi size={20} />,
    "air conditioning": "❄",
    "pool": "≋",
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
  const filtered = conditions.filter(
    (c) => c && c.trim() && !c.startsWith("&lt;"),
  );
  if (!filtered.length) return null;

  return (
    <div className="grid grid-cols-[1fr_2fr] gap-[1px] bg-[#EAE4D9]">
      <div className="bg-[#FDF8EE] p-6 border-l-[3px] border-[#B5862A]">
        <div className="flex gap-[10px] items-start">
          <FiInfo
            size={15}
            className="text-[#B5862A] mt-[2px] shrink-0"
          />
          <p className="text-[12px] text-[#8A6200] leading-[1.6]">
            Read carefully. Failure to comply with property policy may result in
            entry being declined at check-in.
          </p>
        </div>
      </div>
      <div className="bg-white p-6">
        <ol className="list-none p-0 m-0 flex flex-col gap-[14px]">
          {filtered.map((c, i) => (
            <li key={i} className="flex gap-4 items-start">
              <span className="font-['DM_Mono'] text-[10px] text-[#B5862A] font-medium min-w-[18px] pt-[2px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13px] text-[#7A7068] leading-[1.6]">
                {c}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation Policy Table                                      */
/* ─────────────────────────────────────────────────────────────── */
function CancellationPolicySection({ policies = [], lastCancellationDate }) {
  if (!policies.length) return null;

  const typeLabel = (type) => {
    if (type === 1 || type === "Fixed") return "Fixed (INR)";
    if (type === 2 || type === "Percentage") return "Percentage (%)";
    return String(type);
  };

  return (
    <div>
      {lastCancellationDate && (
        <div className="flex items-center gap-[10px] padding-[12px_16px] bg-[#EDF7F2] border border-[#C3E4D2] mb-4">
          <FiCheckCircle
            size={14}
            className="text-[#2C7A4B]"
          />
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
          {policies.map((p, i) => (
            <tr
              key={i}
              className="hover:bg-[#B5862A08]"
            >
              <td className="p-[14px_12px] border-b border-[#EAE4D9] text-[13px] text-[#7A7068]">
                {p.FromDate || "—"}
              </td>
              <td className="p-[14px_12px] border-b border-[#EAE4D9] text-[13px] text-[#A89F94]">
                {p.ToDate || "—"}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Order ID                                                       */
/* ─────────────────────────────────────────────────────────────── */
function BookingReferencesSection({ booking, bookingDetail, result }) {
  const refs = [
    { label: "Order ID", val: booking.orderId || "—", hash: true },
    {
      label: "Payment ID",
      val: booking.payment?.paymentId || "—",
      hash: true,
    },
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
      label: "TBO Reference",
      val: bookingDetail?.TBOReferenceNo || "—",
      hash: true,
    },
  ];


  return (
    <div>
      <div className="grid grid-cols-5 gap-[1px] bg-[#EAE4D9] mb-[1px]">
        {refs.map((r, i) => (
          <div
            key={i}
            className="p-5 bg-white"
          >
            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-[6px]">
              <span className="mr-1 text-[#B5862A]">#</span> {r.label}
            </div>
            <div className="font-['DM_Mono'] text-[13px] font-medium break-all text-[#1A1714]">
              {r.val}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-[12px_20px] border border-[#EAE4D9] border-t-0 flex gap-8 flex-wrap">
        <span className="text-[11px] text-[#A89F94]">
          <span className="text-[#7A7068] font-medium">Booking Date</span> ·{" "}
          {bookingDetail?.BookingDate ? fmtDate(bookingDetail.BookingDate) : "—"}
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

            <div className="grid grid-cols-[repeat(3,1fr)_auto_auto_auto] gap-[8px_24px] items-center">
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  08 Fare Breakdown                                              */
/* ─────────────────────────────────────────────────────────────── */
function FareBreakdownSection({ priceBreakUp, totalFare, detailRoom, selectedRoom }) {
  if (!priceBreakUp || Object.keys(priceBreakUp).length === 0) return null;

  const dayRates = toArray(detailRoom?.DayRates).flat().filter(Boolean);

  return (
    <div className="bg-white border border-[#EAE4D9] p-6">
      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
        Price Breakdown
      </div>
      <div className="flex flex-col border border-[#EAE4D9] rounded bg-[#FAF8F4] overflow-hidden mb-6">
        {/* Table Header */}
        <div className="flex justify-between items-center bg-[#EAE4D9] px-4 py-2">
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#1A1714]">Fee Type</span>
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#1A1714]">Amount</span>
        </div>

        {/* Rows */}
        <div className="flex flex-col divide-y divide-[#EAE4D9] bg-white">
          <div className="flex justify-between px-4 py-3">
            <span className="text-[13px] font-medium text-[#7A7068]">Room Rate</span>
            <span className="text-[14px] font-bold text-[#1A1714]">
              {formatMoney(priceBreakUp.RoomRate || selectedRoom?.totalFare || 0, priceBreakUp.CurrencyCode || selectedRoom?.currency || "INR")}
            </span>
          </div>

          {(priceBreakUp.RoomTax !== undefined) && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-[#7A7068]">Room Tax</span>
              <span className="text-[14px] font-bold text-[#1A1714]">
                {formatMoney(priceBreakUp.RoomTax, priceBreakUp.CurrencyCode || selectedRoom?.currency || "INR")}
              </span>
            </div>
          )}

          {(priceBreakUp.RoomExtraGuestCharges > 0) && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-[#7A7068]">Extra Guest Charges</span>
              <span className="text-[14px] font-bold text-[#1A1714]">
                {formatMoney(priceBreakUp.RoomExtraGuestCharges, priceBreakUp.CurrencyCode || "INR")}
              </span>
            </div>
          )}

          {(priceBreakUp.RoomChildCharges > 0) && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-[#7A7068]">Child Charges</span>
              <span className="text-[14px] font-bold text-[#1A1714]">
                {formatMoney(priceBreakUp.RoomChildCharges, priceBreakUp.CurrencyCode || "INR")}
              </span>
            </div>
          )}

          {(priceBreakUp.ServiceFee !== undefined) && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-[#7A7068]">Service Fee</span>
              <span className="text-[14px] font-bold text-[#1A1714]">
                {formatMoney(priceBreakUp.ServiceFee, priceBreakUp.CurrencyCode || "INR")}
              </span>
            </div>
          )}

          {(priceBreakUp.AgentCommission !== undefined) && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-[13px] font-medium text-[#7A7068]">Agent Commission</span>
              <span className="text-[14px] font-bold text-[#1A1714]">
                {formatMoney(priceBreakUp.AgentCommission, priceBreakUp.CurrencyCode || "INR")}
              </span>
            </div>
          )}

          {Array.isArray(priceBreakUp.TaxBreakup) && priceBreakUp.TaxBreakup.length > 0 && (
            <div className="p-4 bg-[#FAF8F4] overflow-x-auto">
              <table className="w-full border-collapse border border-[#EAE4D9] text-[13px] text-left">
                <tbody>
                  <tr>
                    <td className="border border-[#EAE4D9] p-[8px_12px] font-medium text-[#7A7068] bg-white whitespace-nowrap">
                      Tax Type
                    </td>
                    {priceBreakUp.TaxBreakup.map((tax, tIdx) => (
                      <td key={tIdx} className="border border-[#EAE4D9] p-[8px_12px] font-medium text-[#1A1714] bg-white whitespace-nowrap">
                        {tax.TaxType}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-[#EAE4D9] p-[8px_12px] font-medium text-[#7A7068] bg-white whitespace-nowrap">
                      value
                    </td>
                    {priceBreakUp.TaxBreakup.map((tax, tIdx) => (
                      <td key={tIdx} className="border border-[#EAE4D9] p-[8px_12px] font-bold text-[#1A1714] bg-white whitespace-nowrap">
                        {tax.TaxAmount || 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {dayRates.length > 0 && (
        <div className="mb-6">
          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
            Day Rates
          </div>
          <div className="grid grid-cols-3 gap-[1px] bg-[#EAE4D9]">
            {dayRates.map((rate, i) => (
              <div key={i} className="bg-[#FAF8F4] p-3">
                <div className="text-[11px] text-[#A89F94] mb-1">
                  {rate.Date ? fmtDate(rate.Date) : `Night ${i + 1}`}
                </div>
                <div className="text-[13px] font-semibold text-[#1A1714]">
                  {formatMoney(rate.BasePrice || rate.RoomRate || 0, priceBreakUp.CurrencyCode || selectedRoom?.currency || "INR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-[#FAF8F4] border border-[#EAE4D9] flex justify-between items-center">
        <span className="text-[12px] font-semibold uppercase tracking-[0.05em]">
          Final Invoice Amount
        </span>
        <span className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">
          ₹{(totalFare).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation constants & helpers                               */
/* ─────────────────────────────────────────────────────────────── */
function ProviderAuditSection({ bookingDetail }) {
  if (!bookingDetail) return null;

  const topLevelFields = [
    "HotelBookingStatus",
    "VoucherStatus",
    "BookingSource",
    "BookingId",
    "GuestNationality",
    "IsCorporate",
    "IsPriceChanged",
    "IsCancellationPolicyChanged",
    "HotelCode",
    "HotelId",
    "BookingDate",
    "InvoiceCreatedOn",
  ];

  const visibleFields = topLevelFields
    .map((key) => ({ label: key, value: bookingDetail[key] }))
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

  const rooms = toArray(bookingDetail.Rooms);
  const postBookingRequests = toArray(bookingDetail.PostBookingRequestDetails);
  const rateConditions = toArray(bookingDetail.RateConditions);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-[1px] bg-[#EAE4D9]">
        {visibleFields.map((item) => (
          <div key={item.label} className="bg-white p-4">
            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
              {item.label}
            </div>
            <div className="text-[12px] font-medium text-[#1A1714] break-all">
              {typeof item.value === "boolean" ? (item.value ? "Yes" : "No") : String(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    label: "Processing Cancellation",
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
  const canRequest = isConfirmed && !isCancelled && !cancelRequest;

  const amendmentStatus = useSelector((state) =>
    // prefer dedicated hotelAmendment slice, but fall back to corporateRelated.amendmentStatus
    state.hotelAmendment?.amendmentStatus ?? state.corporateRelated?.amendmentStatus ?? null,
  );



  const providerStatusRaw =
    amendmentStatus?.response?.HotelChangeRequestStatusResult ||
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
    const parseDate = (d) => {
      if (!d) return null;
      if (typeof d === "string" && d.includes("/")) {
        const parts = d.split(/[/\s:]/);
        if (parts.length >= 3) {
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
            parseInt(parts[3] || 0),
            parseInt(parts[4] || 0),
            parseInt(parts[5] || 0),
          );
        }
      }
      return new Date(d);
    };
    const now = new Date();
    let applicablePolicy = null;
    for (const policy of cancelPolicies) {
      const fromDate = parseDate(policy.FromDate);
      if (fromDate && now >= fromDate) applicablePolicy = policy;
    }
    if (!applicablePolicy) {
      const firstDate = parseDate(cancelPolicies[0]?.FromDate);
      if (firstDate && now < firstDate)
        return {
          charge: 0,
          refund: totalFare,
          isFree: true,
          note: "Pre-cancellation period (Free)",
        };
      return {
        charge: 0,
        refund: totalFare,
        isFree: true,
        note: "No applicable policy found",
      };
    }
    const chargeValue = Number(applicablePolicy.CancellationCharge);
    let chargeAmount =
      applicablePolicy.ChargeType === 2 ||
      applicablePolicy.ChargeType === "Percentage"
        ? (totalFare * chargeValue) / 100
        : chargeValue;
    return {
      charge: chargeAmount,
      refund: Math.max(0, totalFare - chargeAmount),
      isFree: chargeAmount === 0,
      policy: applicablePolicy,
      note: `Policy in effect since ${fmtDate(applicablePolicy.FromDate)}`,
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

  const cancelStatusRaw = booking.raw?.CancellationStatus?.[0] || {};

  const totalRefund = Number(
    cancelStatusRaw.RefundAmount ??
      providerStatusObj?.RefundedAmount ??
      booking.amendment?.refundedAmount ??
      0,
  );
  const totalCharge = Number(
    cancelStatusRaw.CancellationCharge ??
      providerStatusObj?.CancellationCharge ??
      booking.amendment?.cancellationCharge ??
      0,
  );
  const creditNote =
    cancelStatusRaw.CreditNoteNo || providerStatusObj?.CreditNoteNo || "";
  const providerRemarks = providerStatusObj?.Remarks || "Successful";
  const cancelledOn =
    booking.cancellation?.cancelledAt ||
    booking.updatedAt ||
    booking.amendment?.requestedAt;
  const changeRequestId =
    cancelStatusRaw.ChangeRequestId ||
    providerStatusObj?.ChangeRequestId ||
    booking.amendment?.changeRequestId ||
    "—";

  let displayStatus = booking.amendment?.status || "Cancelled";
  if (
    cancelStatusRaw.ChangeRequestStatus === 3 ||
    providerStatusObj?.ChangeRequestStatus === 3
  )
    displayStatus = "Approved";
  if (
    cancelStatusRaw.ChangeRequestStatus === 4 ||
    providerStatusObj?.ChangeRequestStatus === 4
  )
    displayStatus = "Rejected";

  // ── Already cancelled ──
  if (isCancelled) {
    return (
      <div className="flex flex-col gap-px bg-[#EAE4D9]">
        {/* Summary header */}
        <div className="bg-white p-[16px_24px] flex justify-between items-center">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
            Overall Cancellation Summary
          </span>
          <span className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5341A] bg-[#FDF1EE] border border-[#F0C4BA] px-[10px] py-[3px]">
1.5            <span className="w-[6px] h-[6px] rounded-full bg-[#B5341A] animate-pulse" />
            {displayStatus}
          </span>
        </div>

        <div className="bg-white p-6">
          <div className="grid grid-cols-5 gap-6">
            {[
              {
                label: "Cancelled On",
                val: cancelledOn
                  ? new Date(cancelledOn).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
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
              <FiAlertCircle
                size={14}
                className="text-[#A89F94]"
              />
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
                <FiInfo
                  size={14}
                  className="text-[#1A4A7A]"
                />
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
                    {mappedStatus}
                  </span>
                </div>

                <div className={`grid ${changeRequestId && changeRequestId !== "—" ? "grid-cols-[1fr_2fr]" : "grid-cols-1"} gap-3`}>
                  {changeRequestId && changeRequestId !== "—" && (
                    <div className="bg-white/60 p-[12px_14px]">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                        Change Req ID
                      </div>
                      <div className={`font-['DM_Mono'] text-[13px] font-medium ${cfg.color}`}>
                        {changeRequestId}
                      </div>
                    </div>
                  )}
                  <div className="bg-white/60 p-[12px_14px]">
                    <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                      Reason / Remarks
                    </div>
                    <div className={`text-[13px] font-medium ${cfg.color}`}>
                      {(() => {
                        const rsn = cancelRequest?.reason || (isSubmitted ? reason : "");
                        const rmk = cancelRequest?.remarks || (isSubmitted ? remarks : "");
                        if (rsn && rmk && rsn !== rmk) return `${rsn} - ${rmk}`;
                        if (rsn) return rsn;
                        if (rmk) return rmk;
                        return "—";
                      })()}
                    </div>
                  </div>
                </div>

                {mappedStatus === "rejected" && cancelRequest?.approverComments && (
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
                    <div className="flex gap-2 items-center">
                      <FiCheckCircle
                        size={14}
                        className="text-[#2C7A4B] shrink-0"
                      />
                      <p className="text-[14px] text-[#2C7A4B] font-semibold">
                        Refund will be processed within 5–7 business days
                      </p>
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
                    Submitted on {fmtDate(cancelRequest.requestedAt)}
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
                <MdCancel
                  size={14}
                  className="text-[#B5341A]"
                />
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
                <FiX
                  size={13}
                  className="text-[#B5341A]"
                />
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
                      <option
                        key={r}
                        value={r}
                      >
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
                      <FiRefreshCw
                        size={12}
                        className="animate-spin"
                      />{" "}
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
          <FiInfo
            size={14}
            className="text-[#A89F94]"
          />
          <p className="text-[13px] text-[#7A7068]">
            Cancellation requests can only be submitted for confirmed bookings.
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
      {!isCancelled && (
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 px-5 py-[10px] bg-[#B5862A] text-white border-none cursor-pointer font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-[#D4A843]"
        >
          <FiDownload size={14} />
          Download Voucher
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function BookedHotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    selectedHotelBooking: booking,
    loadingSelectedHotelBooking: loading,
  } = useSelector((s) => s.corporateRelated);
  const voucherLoading = false;
  const {
    sendLoading,
    sendError,
    sendSuccess,
    statusLoading,
    amendmentStatus,
  } = useSelector((state) => state.corporateRelated);

  const [activeTab, setActiveTab] = useState("hotel_details");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (id) dispatch(fetchBookedHotelDetails(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (booking?._id || booking?.bookingId) {
      const isCancelled = ["cancelled", "cancel_requested"].includes((booking?.executionStatus || "").toLowerCase());
      const hasAmendment = booking?.amendment?.status && booking.amendment.status !== "not_requested";
      if (hasAmendment || booking?.cancellation || isCancelled) {
        dispatch(getHotelAmendmentStatus({ bookingId: booking._id || booking.bookingId }));
      }
    }
  }, [booking?._id, booking?.bookingId, booking?.executionStatus, booking?.amendment?.status, booking?.cancellation, dispatch]);

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAF8F4] font-['DM_Sans']">
        <div className="w-10 h-10 rounded-full border-2 border-[#EAE4D9] border-t-[#B5862A] animate-spin" />
        <p className="text-[13px] text-[#A89F94]">Loading booking details…</p>
      </div>
    );
  }

  /* ── Data ── */
  const liveBooking = unwrapLiveBookingData(booking?.liveBookingData);
  const detail = liveBooking || booking?.raw || {};
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const pricing = booking?.pricingSnapshot || {};
  const result = booking?.bookingResult || {};
  const selectedRoom = hotelReq.selectedRoom || {};
  const rooms = Array.isArray(detail?.Rooms)
    ? detail.Rooms
    : Array.isArray(booking?.rooms)
      ? booking.rooms
      : [];
  const travellers = booking?.travellers?.length
    ? booking.travellers
    : booking?.guests?.length
      ? booking.guests
      : detail?.Rooms?.flatMap((r) => r?.HotelPassenger || []) || [];
  const bookingDetail = detail;
  const detailRoom = detail?.Rooms?.[0] || {};
  
  // Try to find the most accurate PriceBreakUp starting with liveBookingData, falling back to preBookResponse and then raw
  const preBookResultRoom = hotelReq?.preBookResponse?.HotelResult?.[0]?.Rooms?.[0] || {};
  const preBookPriceBreakUp = preBookResultRoom?.PriceBreakUp?.[0] || preBookResultRoom?.PriceBreakUp || null;
  
  let priceBreakUpRaw = detailRoom?.PriceBreakUp || preBookPriceBreakUp || {};
  let priceBreakUp = Array.isArray(priceBreakUpRaw) ? priceBreakUpRaw[0] : priceBreakUpRaw;
  if (!priceBreakUp) priceBreakUp = {};

  const paymentSuccessful =
    booking.payment?.status === "completed" || !!booking?.confirmationNo;
  const executionStatus = booking.executionStatus || "";
  const isConfirmed =
    executionStatus === "voucher_generated" || executionStatus === "confirmed";
  const isCancelled = ["cancelled", "cancel_requested"].includes(
    (executionStatus || "").toLowerCase(),
  );

  const cancelPolicies = rooms.flatMap((r) => r.CancelPolicies || r.CancellationPolicies || []);
  const amenities = rooms.flatMap((r) => r.Amenities || []);
  const totalFare =
    detail?.InvoiceAmount ||
    detail?.NetAmount ||
    selectedRoom?.totalFare ||
    pricing?.totalAmount ||
    booking?.totalFare ||
    booking?.raw?.InvoiceAmount ||
    0;
  const rateConditions = bookingDetail?.RateConditions || [];

  return (
    <div className="bg-[#FAF8F4] min-h-screen font-['DM_Sans'] selection:bg-[#B5862A20] selection:text-[#B5862A]">
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* ── Sticky nav ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EAE4D9]">
      <header className="h-14 px-8 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-[6px] bg-none border-none cursor-pointer text-[12px] font-semibold text-[#B5862A] font-['DM_Sans'] tracking-[0.05em] uppercase hover:opacity-80 transition-opacity"
        >
          <FiArrowLeft size={14} />
          Back
        </button>
        <span className="w-[1px] h-4 bg-[#EAE4D9]" />
        <h1 className="text-[13px] font-semibold text-[#1A1714] font-['DM_Sans'] tracking-[0.04em]">
          Hotel Booking Details
        </h1>

        <div className="ml-auto flex items-center gap-4">
          {isConfirmed && !isCancelled && (
            <span className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#2C7A4B] bg-[#EDF7F2] border border-[#C3E4D2] px-[12px] py-1">
              <MdVerifiedUser size={11} /> Voucher Issued
            </span>
          )}
          {(booking.orderId || booking.bookingReference) && (
            <span className="text-[11px] text-[#A89F94]">
              Order ID:{" "}
              <strong className="text-[#1A1714] font-['DM_Mono']">
                {booking.orderId || booking.bookingReference}
              </strong>
            </span>
          )}
          {paymentSuccessful && !isCancelled && (
            <button
              onClick={() => dispatch(generateHotelVoucher(booking._id || booking.bookingId))}
              disabled={voucherLoading}
              className="inline-flex items-center gap-[6px] px-4 py-[7px] bg-[#B5862A] text-white border-none cursor-pointer font-['DM_Sans'] text-[11px] font-semibold tracking-[0.05em] uppercase transition-colors hover:bg-[#D4A843] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {voucherLoading ? (
                <>
                  <FiRefreshCw size={12} className="animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <FiDownload size={12} />
                  Download Voucher
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="max-w-[1440px] mx-auto px-5 h-14 flex items-center gap-6 border-t border-[#EAE4D9] overflow-x-auto">
        {[
          { id: "hotel_details", label: "Hotel Details" },
          ...(booking?.markupAudit ? [{ id: "markup", label: "Markup Details" }] : []),
          { id: "room_details", label: "Room Details" },
          { id: "passengers", label: "Guests" },
          { id: "cancellation", label: "Rules & Policy" },
          { id: "amendment", label: "Cancellations & Amendments" },
          { id: "history", label: "History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 pt-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap relative ${
              activeTab === tab.id
                ? "text-[#1A1714] border-b-2 border-[#B5862A]"
                : "text-[#A89F94] hover:text-[#7A7068]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {/* ── Main ── */}
      <main className="max-w-[1440px] w-full mx-auto px-4 lg:px-10 py-8 pb-24 space-y-6">
        
        {activeTab === "hotel_details" && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="mb-10">
              <HotelHeroCard
                booking={booking}
                bookingDetail={bookingDetail}
                paymentSuccessful={paymentSuccessful}
              />
            </div>

            {/* Payment status */}
            <div className="mb-10">
              <PaymentStatusCard
                booking={booking}
                paymentSuccessful={paymentSuccessful}
                isConfirmed={isConfirmed}
                hotelReq={hotelReq}
              />
            </div>

            {/* 08 Fare Breakdown */}
            {priceBreakUp && (
              <section className="mb-12">
                <SectionHeader num={8} title="Fare Breakdown" />
                <FareBreakdownSection
                  priceBreakUp={priceBreakUp}
                  totalFare={totalFare}
                  detailRoom={detailRoom}
                  selectedRoom={selectedRoom}
                />
              </section>
            )}

            {/* 05 Booking References */}
            <section className="mb-12">
              <SectionHeader num={5} title="Order ID" />
              <BookingReferencesSection
                booking={booking}
                bookingDetail={bookingDetail}
                result={result}
              />
            </section>

            {/* 09 Provider Audit */}
            {liveBooking && (
              <section className="mb-12">
                <SectionHeader num={9} title="Provider Audit" />
                <ProviderAuditSection bookingDetail={bookingDetail} />
              </section>
            )}
          </div>
        )}

        {activeTab === "room_details" && (
          <div className="space-y-6">
            {/* 01 The Room */}
            {rooms.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={1} title="The Room" />
                <RoomSection rooms={rooms} selectedRoom={selectedRoom} />
              </section>
            )}

            {/* 02 Amenities */}
            <section className="mb-12">
              <SectionHeader num={2} title="Amenities" />
              <AmenitiesSection amenities={amenities} />
            </section>
          </div>
        )}

        {activeTab === "passengers" && (
          <div className="space-y-6">
            {/* 06 Guest */}
            {travellers.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={6} title="Guest" />
                <GuestSection travellers={travellers} />
              </section>
            )}
          </div>
        )}

        {activeTab === "cancellation" && (
          <div className="space-y-6">
            {/* 03 Check-in Instructions */}
            {rateConditions.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={3} title="Check-in Instructions" />
                <CheckInInstructions conditions={rateConditions} />
              </section>
            )}
          </div>
        )}

        {activeTab === "amendment" && (
          <div className="space-y-6">
            {/* 04 Cancellation Policy */}
            {cancelPolicies.length > 0 && (
              <section className="mb-12">
                <SectionHeader num={4} title="Cancellation Policy" />
                <CancellationPolicySection
                  policies={cancelPolicies}
                  lastCancellationDate={
                    detailRoom?.LastCancellationDate ||
                    bookingDetail?.LastCancellationDate
                  }
                />
              </section>
            )}

            {/* 07 Cancellation Request */}
            <section className="mb-12">
              <SectionHeader num={7} title="Cancellation Request" />
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
            {/* 10 Booking History */}
            <BookingHistory booking={booking} />
          </div>
        )}

        {activeTab === "markup" && booking?.markupAudit && (() => {
          const audit = booking.markupAudit;
          const supplierFare = audit.fareBeforeMarkup?.supplierFare || audit.markupSnapshot?.supplierFare || 0;
          const totalMarkup = audit.fareAfterMarkup?.markupAmount || audit.markupSnapshot?.markupAmount || 0;
          const finalFare = audit.fareAfterMarkup?.finalFare || audit.markupSnapshot?.finalFare || 0;
          const netRevenue = audit.earnings?.totalMarkupEarned || audit.earnings?.profitGenerated || totalMarkup;
          const rules = audit.appliedMarkupRules?.length > 0 ? audit.appliedMarkupRules : (audit.markupSnapshot?.markupBreakdown || booking.hotelRequest?.selectedRoom?.rawRoomData?.markupBreakdown || []);

          return (
            <div className="space-y-6">
              <div className="bg-white border border-[#EAE4D9] p-8 mb-8">
                 <h3 className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714] mb-2 flex items-center gap-2">
                   <FiTag size={20} className="text-[#B5862A]" />
                   Markup Overview
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-6">
                   <div className="bg-[#FAF8F4] p-5 border border-[#EAE4D9]">
                     <p className="text-[10px] uppercase font-semibold tracking-[0.15em] text-[#A89F94] mb-2">Supplier Fare</p>
                     <p className="text-[18px] font-bold text-[#1A1714]">₹{supplierFare}</p>
                   </div>
                   <div className="bg-[#EDF7F2] p-5 border border-[#C3E4D2]">
                     <p className="text-[10px] uppercase font-semibold tracking-[0.15em] text-[#A89F94] mb-2">Total Markup</p>
                     <p className="text-[18px] font-bold text-[#2C7A4B]">+ ₹{totalMarkup}</p>
                   </div>
                   <div className="bg-[#FAF8F4] p-5 border border-[#EAE4D9]">
                     <p className="text-[10px] uppercase font-semibold tracking-[0.15em] text-[#A89F94] mb-2">Final Fare</p>
                     <p className="text-[18px] font-bold text-[#1A1714]">₹{finalFare}</p>
                   </div>
                   <div className="bg-[#F0F4F8] p-5 border border-[#D1E0EE]">
                     <p className="text-[10px] uppercase font-semibold tracking-[0.15em] text-[#A89F94] mb-2">Net Revenue</p>
                     <p className="text-[18px] font-bold text-[#2A5C8A]">₹{netRevenue}</p>
                   </div>
                 </div>
                 
                 {rules.length > 0 && (
                   <>
                     <h3 className="font-['Cormorant_Garamond'] text-[20px] font-bold text-[#1A1714] mb-4 border-t border-[#EAE4D9] pt-6">Applied Rules</h3>
                     <div className="grid gap-4 sm:grid-cols-2">
                       {rules.map((rule, idx) => (
                         <div key={idx} className="bg-white p-5 border border-[#EAE4D9] flex justify-between items-center transition hover:border-[#B5862A]">
                           <div>
                             <p className="text-[15px] font-bold text-[#1A1714]">{rule.category}</p>
                             <p className="text-[11px] font-semibold text-[#A89F94] uppercase tracking-[0.1em] mt-1">
                               {rule.markupMethod} • {rule.refundPolicy}
                             </p>
                           </div>
                           <div className="text-right">
                             <p className="text-[16px] font-bold text-[#1A1714]">₹{rule.calculatedAmount || rule.markupAmount}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </>
                 )}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Booking History / Timeline                                     */
/* ─────────────────────────────────────────────────────────────── */
const ensureUTC = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d !== "string") return d;
  
  // 1. Handle TBO specific format: "DD/MM/YYYY HH:MM:SS"
  if (d.includes("/") && d.includes(":")) {
    const parts = d.split(" ");
    if (parts.length >= 2) {
      const [datePart, timePart] = parts;
      const [day, month, year] = datePart.split("/");
      return new Date(`${year}-${month}-${day}T${timePart}Z`);
    }
  }
  
  // 2. Handle ISO format without timezone: "YYYY-MM-DDTHH:MM:SS"
  if (d.includes("-") && d.includes(":") && !d.includes("Z") && !d.includes("+")) {
    return new Date(`${d}Z`);
  }
  
  return new Date(d);
};

const getVoucherDate = (b) => {
  if (b.voucheredAt) return ensureUTC(b.voucheredAt);
  const tboVoucherDate = b.bookingResult?.providerResponse?.VoucherDate || 
                         b.bookingResult?.providerResponse?.Response?.VoucherDate ||
                         b.raw?.BookingDate || 
                         b.raw?.InvoiceCreatedOn;
  if (tboVoucherDate) return ensureUTC(tboVoucherDate);
  if (["voucher_generated", "confirmed", "booked"].includes((b.executionStatus || "").toLowerCase())) return ensureUTC(b.updatedAt);
  return null;
};

function BookingHistory({ booking }) {
  const isCancelRequested = ["cancelled", "cancel_requested"].includes((booking.executionStatus || "").toLowerCase()) || !!booking.cancellation || (booking.amendment && booking.amendment.status !== 'not_requested');
  const isFullyCancelled = ["cancelled"].includes((booking.executionStatus || "").toLowerCase()) || booking.amendment?.status === "approved";
  const isConfirmed = ["voucher_generated", "confirmed", "booked"].includes((booking.executionStatus || "").toLowerCase()) || (isCancelRequested && !!booking.bookingResult?.hotelBookingId);

  const steps = [
    {
      label: "Voucher Issued",
      date: getVoucherDate(booking) || (isConfirmed ? (booking.updatedAt || booking.createdAt) : null),
      desc: isConfirmed ? "Hotel voucher generated and sent" : "Final confirmation pending",
      icon: <FiTag size={14} />,
      active: isConfirmed,
    },
    {
      label: "Cancellation Requested",
      date: ensureUTC(booking.amendment?.requestedAt) || ensureUTC(booking.cancellation?.createdAt) || (isCancelRequested ? ensureUTC(booking.updatedAt) : null),
      desc: isCancelRequested ? "Cancellation request submitted" : "No cancellation requested",
      icon: <FiClock size={14} />,
      active: isCancelRequested,
    },
    {
      label: "Cancelled",
      date: ensureUTC(booking.cancelledAt) || (isFullyCancelled ? ensureUTC(booking.updatedAt) : null),
      desc: isFullyCancelled ? "Booking has been fully cancelled" : "Pending cancellation or not requested",
      icon: <FiXCircle size={14} />,
      active: isFullyCancelled,
    },
  ];

  const formatDateStr = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const formatTimeStr = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="bg-white border border-[#EAE4D9] p-8 mt-12 mb-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-10 h-10 rounded-full bg-[#B5862A]/10 flex items-center justify-center">
          <FiRefreshCw size={18} className="text-[#B5862A]" />
        </div>
        <div>
          <h3 className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">Booking Lifecycle</h3>
          <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-[0.2em] mt-1">Audit Trail & Timeline</p>
        </div>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#B5862A]/40 via-[#EAE4D9] to-transparent" />

        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex gap-8">
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border transition-colors duration-500 ${
                step.active ? "bg-[#B5862A] border-[#B5862A] text-white shadow-lg" : "bg-white border-[#EAE4D9] text-[#EAE4D9]"
              }`}>
                {step.icon}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className={`text-[12px] font-bold uppercase tracking-[0.15em] ${step.active ? "text-[#1A1714]" : "text-[#A89F94]"}`}>
                    {step.label}
                  </p>
                  {step.date && step.active && (
                    <span className="text-[10px] font-bold text-[#B5862A] px-3 py-1 bg-[#FAF8F4] border border-[#EAE4D9] rounded-sm uppercase tracking-wider">
                      {formatDateStr(step.date)} · {formatTimeStr(step.date)}
                    </span>
                  )}
                </div>
                <p className="text-[#A89F94] text-[13px] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
