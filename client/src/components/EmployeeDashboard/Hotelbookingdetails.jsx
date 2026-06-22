// HotelBookingDetails.jsx
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
  FiPlusCircle,
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
import { generateHotelVoucher } from "../../Redux/Actions/hotelBooking.thunks";
import { fetchBookedHotelDetails } from "../../Redux/Actions/hotelBooking.thunks";
import {
  sendHotelAmendment,
  getHotelAmendmentStatus,
} from "../../Redux/Actions/hotelAmendment.thunks";

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
    hour12: true,
  });
}
function nightsCount(ci, co) {
  if (!ci || !co) return 1;
  return Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
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
  const rating = count || 0;
  return (
    <span className="inline-flex gap-[2px] items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          className={i < rating ? "fill-[#B5862A]" : "fill-[#EAE4D9]"}
          viewBox="0 0 20 20"
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
function SectionHeader({ title }) {
  return (
    <div className="flex items-center pb-3 border-b border-[#EAE4D9] mb-6">
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
  const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
  const selectedRoom = hotelReq?.selectedRoom || {};
  const selectedHotel = hotelReq?.selectedHotel || {};

  const hotelName =
    booking?.hotelName ||
    snapshot?.hotelName ||
    detail?.HotelName ||
    selectedHotel?.hotelName ||
    "Hotel";
  const city = booking?.city || detail?.City || selectedHotel?.city || "";
  const address = detail?.AddressLine1 || selectedHotel?.address || "";
  const starRating = detail?.StarRating || selectedHotel?.starRating || 0;
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
                  : location.state?.isPastTrip
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
    // {
    //   label: "Payment",
    //   value: paymentSuccessful ? "Completed" : "Pending",
    //   ok: paymentSuccessful,
    //   icon: paymentSuccessful ? (
    //     <FiCheckCircle size={13} />
    //   ) : (
    //     <FiAlertCircle size={13} />
    //   ),
    //   hidden: !isTravelAdmin,
    // },
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
      value:
        booking?.bookingSnapshot?.roomCount ||
        booking?.raw?.NoOfRooms ||
        booking?.rooms?.length ||
        hotelReq?.noOfRooms ||
        1,
      ok: null,
      icon: <MdHotel size={13} />,
    },
    {
      label: "Guests",
      value: booking?.travellers?.length
        ? `${booking.travellers.length} Guests`
        : `${hotelReq.roomGuests?.[0]?.noOfAdults || 0} Adults${
            hotelReq.roomGuests?.[0]?.noOfChild > 0
              ? `, ${hotelReq.roomGuests[0].noOfChild} Child`
              : ""
          }`,
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9]">
      {items.map((item, i) => (
        <div key={i} className={`bg-white p-5 `}>
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
  const [expandedAmenities, setExpandedAmenities] = useState({});

  if (!rooms?.length) return null;

  const toggleAmenities = (index) => {
    setExpandedAmenities((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="flex flex-col gap-8">
      {rooms.slice(0, 1).map((room, index) => {
        const descriptionHtml = room.RoomDescription || "";
        const inclusions = room.Inclusion ? room.Inclusion.split(",") : [];
        const promotions = room.RoomPromotion
          ? Array.isArray(room.RoomPromotion)
            ? room.RoomPromotion
            : [room.RoomPromotion]
          : [];
        const amenities = room.Amenities || [];
        const supplements = room.Supplements || [];
        const roomCount = rooms.length;

        return (
          <div
            key={index}
            className="border border-[#EAE4D9] bg-white overflow-hidden"
          >
            {/* Room header */}
            <div className="p-6 border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
              <div>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#B5862A] mb-1">
                  Selected Room Type
                </div>
                <h3 className="font-['Cormorant_Garamond'] text-[26px] font-semibold text-[#1A1714]">
                  <span className="text-[#B5862A] font-['Cormorant_Garamond'] text-[26px] font-semibold ">
                    {roomCount > 1 ? `${roomCount} X ` : ""}
                  </span>
                  {room.RoomTypeName ||
                    (Array.isArray(room.Name) ? room.Name[0] : room.Name) ||
                    `Room`}
                </h3>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2 flex-wrap">
                  {promotions.map((promo, i) => (
                    <span
                      key={`promo-${i}`}
                      className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#B5862A] text-[10px] font-bold text-[#B5862A] bg-[#FFFBF0] uppercase tracking-wider"
                    >
                      <FiStar size={10} />
                      {promo}
                    </span>
                  ))}
                  {room.MealType && (
                    <span className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#B5862A] text-[10px] font-bold text-[#B5862A] bg-[#FAF8F4] uppercase tracking-wider">
                      {room.MealType.replace(/_/g, " ")}
                    </span>
                  )}
                  {room.IsRefundable !== undefined && (
                    <span
                      className={`inline-flex items-center gap-[5px] px-[10px] py-1 border text-[10px] font-bold uppercase tracking-wider ${
                        room.IsRefundable
                          ? "border-[#2C7A4B] text-[#2C7A4B] bg-[#EDF7F2]"
                          : "border-[#B5341A] text-[#B5341A] bg-[#FDF1EE]"
                      }`}
                    >
                      {room.IsRefundable ? "Refundable" : "Non-Refundable"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="flex flex-col gap-[1px] bg-[#EAE4D9]">
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
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Inclusions
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {inclusions.map((inc, i) => (
                      <li
                        key={`inc-${i}`}
                        className="flex gap-2 items-center text-[13px] text-[#7A7068]"
                      >
                        <FiCheckCircle
                          className="text-[#2C7A4B] shrink-0"
                          size={14}
                        />
                        {inc.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Room Promotions */}
              {promotions.length > 0 && (
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Room Promotions
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {promotions.map((promo, i) => (
                      <li
                        key={`promo-${i}`}
                        className="flex gap-2 items-center text-[13px] text-[#2C7A4B] font-medium"
                      >
                        <FiStar className="shrink-0 text-[#B5862A]" size={14} />
                        {promo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Supplements */}
              {supplements.length > 0 && (
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-4">
                    Supplements
                  </div>
                  <div className="flex flex-col gap-3">
                    {supplements.map((supp, i) => (
                      <div
                        key={`supp-${i}`}
                        className="flex justify-between items-center p-4 border border-[#EAE4D9] bg-[#FAF8F4] transition-colors hover:bg-[#F3EFEA]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 border border-[#EAE4D9] shrink-0 text-[#B5862A]">
                            <FiPlusCircle size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-[#1A1714]">
                              {supp.Description ||
                                `Supplement Type ${supp.Type}`}
                            </span>
                            <span className="text-[10px] text-[#7A7068] tracking-widest uppercase mt-0.5">
                              Room Add-on
                            </span>
                          </div>
                        </div>
                        {supp.Price > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[14px] font-bold text-[#2C7A4B]">
                              +{supp.Price} {supp.Currency}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-[12px] font-bold tracking-widest text-[#B5862A] uppercase">
                              Included
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="bg-white p-6">
                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                    Room Amenities
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#B5862A] shrink-0" />
                        <span className="text-[13px] text-[#7A7068] leading-tight">
                          {amenity}
                        </span>
                      </div>
                    ))}
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
/*  Check-in Instructions (Hotel Policies)                         */
/* ─────────────────────────────────────────────────────────────── */
const decodeHtml = (html) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

function CheckInInstructions({ conditions = [] }) {
  const filtered = conditions.filter((c) => c && c.trim());
  if (!filtered.length) return null;

  return (
    <div className="flex flex-col md:grid md:grid-cols-[1fr_2fr] gap-[1px] bg-[#EAE4D9]">
      <div className="bg-[#FDF8EE] p-6 border-l-[3px] border-[#B5862A]">
        <div className="flex gap-[10px] items-start">
          <FiInfo size={15} className="text-[#B5862A] mt-[2px] shrink-0" />
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
              <span
                className="text-[13px] text-[#7A7068] leading-[1.6] [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mt-1 [&>ul>li]:mb-1 [&>p]:mb-1"
                dangerouslySetInnerHTML={{ __html: decodeHtml(c) }}
              />
            </li>
          ))}
        </ol>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px_24px] items-start">
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
/*  08 Fare Breakdown (Travel Admin Only)                          */
/* ─────────────────────────────────────────────────────────────── */
function FareBreakdownSection({ priceBreakUp, totalFare, bookingDetail }) {
  if (!totalFare) return null;

  const room =
    bookingDetail?.HotelRoomsDetails?.[0] ||
    bookingDetail?.RoomGuests?.[0] ||
    {};
  const isRefundable = room?.IsRefundable;
  const currency = priceBreakUp?.Currency || "INR";

  return (
    <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-6">
      <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-5 flex items-center gap-2">
        <FiCreditCard size={14} className="text-[#B5862A]" /> Fare Summary
      </div>
      <div className="grid grid-cols-1 gap-x-6">
        <div className="flex flex-col gap-1 py-3 border-b border-[#EAE4D9] last:border-0">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
            Currency
          </span>
          <span className="text-[13px] font-medium text-[#1A1714]">
            {currency}
          </span>
        </div>
        <div className="flex flex-col gap-1 py-3 border-b border-[#EAE4D9] last:border-0">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
            Refundable
          </span>
          <span
            className={`text-[13px] font-medium ${isRefundable ? "text-[#B5862A]" : "text-[#1A1714]"}`}
          >
            {isRefundable !== undefined ? (isRefundable ? "Yes" : "No") : "-"}
          </span>
        </div>
      </div>

      {/* Total area */}
      <div className="mt-5 pt-4 border-t border-[#EAE4D9] flex justify-between items-end">
        <div>
          <div className="text-[12px] font-bold text-[#1A1714]">Total Paid</div>
          <div className="text-[10px] text-[#A89F94] mt-0.5">
            incl. taxes & fees
          </div>
        </div>
        <div className="text-[20px] font-bold text-[#1A1714] font-['DM_Mono']">
          ₹{Number(totalFare).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

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

/* ─────────────────────────────────────────────────────────────── */
/*  Booking History / Timeline                                     */
/* ─────────────────────────────────────────────────────────────── */
function BookingHistory({ booking }) {
  const isCancelled =
    booking.executionStatus === "cancelled" || !!booking.cancellation;
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
      date: booking.approvedAt || booking.rejectedAt,
      desc: (() => {
        if (booking.rejectedAt) {
          return `Rejected by ${booking.approvedBy?.name?.firstName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        if (booking.approvedAt) {
          const requesterId = booking.userId?._id || booking.userId;
          const approverId =
            booking.approverId || booking.approvedBy?._id || booking.approvedBy;

          if (
            booking.approverName === "Auto Approve" ||
            (requesterId &&
              approverId &&
              requesterId.toString() === approverId.toString())
          ) {
            return "Auto Approved by System (Travel Policy)";
          }

          return `Approved by ${booking.approvedBy?.name?.firstName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        return "Awaiting approval";
      })(),
      icon: <FiCheckCircle size={14} />,
      active: !!(booking.approvedAt || booking.rejectedAt),
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
  ];

  if (isCancelled) {
    steps.push({
      label: "Cancelled",
      date:
        booking.cancelledAt ||
        booking.cancellation?.cancelledAt ||
        booking.updatedAt,
      desc: `Hotel booking cancelled. ${booking.cancellation?.reason ? `Reason: ${booking.cancellation.reason}` : ""}`,
      icon: <FiXCircle size={14} className="text-[#B5341A]" />,
      active: true,
      isError: true,
    });
  }

  return (
    <div className="bg-white border border-[#EAE4D9] p-8">
      <div className="flex items-center pb-3 border-b border-[#EAE4D9] mb-8">
        <span className="font-['DM_Mono'] text-[#B5862A] text-[11px] tracking-wider mr-3">
          06
        </span>
        <h2 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1A1714] md:text-[18px]">
          Booking Timeline & History
        </h2>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-[#EAE4D9]" />

        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-12">
              {/* Dot */}
              <div
                className={`absolute left-0 top-0 w-8 h-8 rounded-full border border-[#EAE4D9] flex items-center justify-center bg-white z-10 transition-colors ${
                  step.isError
                    ? "text-[#B5341A] border-[#B5341A]"
                    : step.active
                      ? "text-[#B5862A] border-[#B5862A]"
                      : "text-[#A89F94]"
                }`}
              >
                {step.icon}
              </div>

              <div className={step.active ? "opacity-100" : "opacity-40"}>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <p
                    className={`text-[13px] font-semibold tracking-wide ${step.active ? "text-[#1A1714]" : "text-[#A89F94]"}`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <span className="font-['DM_Mono'] text-[10px] text-[#B5862A] px-2 py-0.5 bg-[#FAF8F4] border border-[#EAE4D9] uppercase tracking-wider">
                      {fmtDate(step.date)} · {fmtTime(step.date)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#7A7068] leading-relaxed">
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

  const { amendmentStatus } = useSelector((state) => state.hotelAmendment);

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
      <div className="flex flex-col gap-[1px] bg-[#EAE4D9]">
        {/* Summary header */}
        <div className="bg-white p-[16px_24px] flex justify-between items-center">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
            Overall Cancellation Summary
          </span>
          <span className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5341A] bg-[#FDF1EE] border border-[#F0C4BA] px-[10px] py-[3px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#B5341A] animate-pulse" />
            {displayStatus}
          </span>
        </div>

        <div className="bg-white p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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

        <div className="bg-white p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
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
/*  Corporate Audit / Summary                                       */
/* ─────────────────────────────────────────────────────────────── */
function CorporateAuditSection({ booking }) {
  const isConfirmed =
    booking.executionStatus === "voucher_generated" ||
    booking.executionStatus === "confirmed" ||
    booking.executionStatus === "booked";

  const approverName = (() => {
    const requesterId = booking.userId?._id || booking.userId;
    const approverId = booking.approverId;
    if (
      booking.approverName === "Auto Approve" ||
      (requesterId &&
        approverId &&
        requesterId.toString() === approverId.toString())
    ) {
      return "Auto Approved (System)";
    }
    return booking.approverName || "—";
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
          value: booking.purposeOfTravel || "—",
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
          value: booking.approverEmail || "—",
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
          {/* Section heading */}
          <div className="px-6 pt-5 pb-3 bg-[#FAF8F4]">
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A]">
              {section.heading}
            </div>
          </div>
          {/* Fields */}
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
    selectedBookingDetails: booking,
    loading,
    voucherLoading,
    error,
  } = useSelector((s) => s.hotelBookings);
  const user = useSelector((state) => state.auth?.user);
  const isTravelAdmin = user?.role === "travel-admin";
  const rawRoomsData = booking?.hotelRequest?.selectedRoom?.rawRoomData;
  const roomsFallback = rawRoomsData
    ? Array.isArray(rawRoomsData)
      ? rawRoomsData
      : [rawRoomsData]
    : [];
  const rooms =
    Array.isArray(booking?.rooms) && booking.rooms.length > 0
      ? booking.rooms
      : roomsFallback;
  const {
    sendLoading,
    sendError,
    sendSuccess,
    statusLoading,
    amendmentStatus,
  } = useSelector((state) => state.hotelAmendment);

  const [activeTab, setActiveTab] = useState("hotel_details");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchBookedHotelDetails(id));
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
          onClick={() => dispatch(fetchBookedHotelDetails(id))}
          className="mt-2 px-6 py-2 bg-[#B5862A] text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-[#966b1d] transition-colors"
        >
          Retry
        </button>
        <button
          onClick={() => navigate(-1)}
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
    ? rawData[0]
    : rawData || allRooms[0] || {};

  const cancelPolicies = selectedRoomRaw?.CancelPolicies || [];
  const amenities = selectedRoomRaw?.Amenities || [];

  const travellers = booking?.travellers || [];
  const bookingDetail = null; // no raw TBO detail in this API
  const detailRoom = selectedRoomRaw;

  const tboHotelDetails = booking?.tboHotelDetails || {};
  const hotelFees = tboHotelDetails?.hotelFees || {};
  const rateConditions =
    hotelReq?.preBookResponse?.HotelResult?.[0]?.RateConditions ||
    booking?.raw?.Rooms?.[0]?.RateConditions ||
    booking?.raw?.HotelResult?.[0]?.RateConditions ||
    booking?.raw?.RateConditions ||
    [];

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
    booking?.totalFare ||
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
            onClick={() => navigate(-1)}
            className="flex items-center gap-[6px] bg-none border-none cursor-pointer text-[12px] font-semibold text-[#B5862A] font-['DM_Sans'] tracking-[0.05em] uppercase hover:opacity-80 transition-opacity shrink-0"
          >
            <FiArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
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
                  onClick={() =>
                    dispatch(
                      generateHotelVoucher(booking.bookingId || booking._id),
                    )
                  }
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
            { id: "rules", label: "Rules & Policies" },
            { id: "guest", label: "Guest" },
            {
              id: "amendment",
              label: isCancelled
                ? "Cancellation Details"
                : isAmendmentPending
                  ? "Cancellation Request"
                  : bookingAmendmentStatus &&
                      bookingAmendmentStatus !== "not_requested"
                    ? "Amendment Status"
                    : "Cancellation",
            },
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
      <main className="w-full px-3 sm:px-5 lg:px-10 py-6 sm:py-8 pb-24 space-y-5 sm:space-y-6">
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
            if (isCancelled) {
              label = "Cancellation";
              title = "Cancellation Details";
              subtitle =
                "Your cancellation has been processed. See the full details and refund information below.";
            } else if (isAmendmentPending) {
              label = "Cancellation Request";
              title = "Cancellation Request Pending";
              subtitle =
                "Your cancellation request has been submitted and is currently being processed.";
            } else if (
              bookingAmendmentStatus &&
              bookingAmendmentStatus !== "not_requested"
            ) {
              label = "Amendment";
              title = "Amendment Status";
              subtitle =
                "Review the current status of your cancellation or amendment request.";
            } else {
              label = "Cancellation";
              title = "Request Cancellation";
              subtitle =
                "Submit a cancellation request for this booking. Refunds are subject to the hotel's cancellation policy.";
            }
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
                <h1 className="text-[24px] sm:text-[30px] md:text-[36px] font-black text-gray-900 tracking-tight leading-none mb-3">
                  {title}
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Tab Contents */}
        {activeTab === "hotel_details" && (
          <>
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <div
                className={`w-full ${isTravelAdmin && totalFare > 0 ? "lg:w-2/3" : ""} space-y-6 min-w-0`}
              >
                <HotelHeroCard
                  booking={booking}
                  bookingDetail={bookingDetail}
                  paymentSuccessful={paymentSuccessful}
                />
              </div>

              {/* Right Side Column */}
              {isTravelAdmin && totalFare > 0 && (
                <div className="w-full lg:w-1/3 lg:sticky lg:top-[200px]">
                  {/* Fare Breakdown for Travel Admin */}
                  <FareBreakdownSection
                    priceBreakUp={priceBreakUp}
                    totalFare={totalFare}
                    bookingDetail={bookingDetail}
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <PaymentStatusCard
                booking={booking}
                paymentSuccessful={paymentSuccessful}
                isConfirmed={isConfirmed}
                hotelReq={hotelReq}
                isTravelAdmin={isTravelAdmin}
              />
            </div>
          </>
        )}

        {/* Project Details Tab */}
        {activeTab === "project" && (
          <div className="space-y-6">
            <section>
              <SectionHeader num={1} title="Corporate Audit" />
              <CorporateAuditSection booking={booking} />
            </section>
          </div>
        )}

        {activeTab === "room_details" && (
          <div className="space-y-12">
            {rooms.length > 0 && (
              <section>
                <SectionHeader title="The Room" />
                <RoomSection rooms={rooms} selectedRoom={selectedRoom} />
              </section>
            )}
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-12">
            <section>
              <SectionHeader title="Cancellation Policy" />
              <div className="space-y-6 mt-6">
                {rooms.slice(0, 1).map((room, idx) => {
                  const policies = room.CancelPolicies || [];
                  const policyText = room.CancellationPolicy || "";
                  if (!policies.length && !policyText) return null;

                  const now = new Date();
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

                  let activeIndex = -1;
                  for (let i = 0; i < policies.length; i++) {
                    const fromDate = parseDate(policies[i].FromDate);
                    if (fromDate && now >= fromDate) {
                      if (
                        activeIndex === -1 ||
                        fromDate > parseDate(policies[activeIndex].FromDate)
                      ) {
                        activeIndex = i;
                      }
                    }
                  }

                  return (
                    <div key={idx} className="w-full">
                      {policies.length > 0 && (
                        <div className="w-full overflow-x-auto">
                          {/* Table Header */}
                          <div className="grid grid-cols-[3fr_2fr_2fr_1fr] gap-4 pb-3 border-b border-[#EAE4D9] text-[9px] font-bold tracking-[0.1em] text-[#A89F94] uppercase min-w-[480px]">
                            <div># FROM DATE</div>
                            <div>TO DATE</div>
                            <div>CHARGE TYPE</div>
                            <div className="text-right">CHARGE</div>
                          </div>
                          {/* Table Body */}
                          <div className="flex flex-col">
                            {policies.map((pol, pidx) => {
                              const isActive = pidx === activeIndex;
                              const isFixed =
                                pol.ChargeType === 1 ||
                                pol.ChargeType === "Fixed";
                              const chargeVal = Number(pol.CancellationCharge);
                              const isFree = chargeVal === 0;

                              return (
                                <div
                                  key={pidx}
                                  className={`grid grid-cols-[3fr_2fr_2fr_1fr] gap-4 items-center py-4 border-b border-[#EAE4D9] last:border-none min-w-[480px] ${isActive ? "bg-[#FDF8EE] -mx-4 px-4" : "bg-transparent -mx-4 px-4"}`}
                                >
                                  <div className="text-[12px] text-[#7A7068] font-medium flex items-center gap-2">
                                    {pol.FromDate || "-"}
                                    {isActive && (
                                      <span className="text-[8px] font-bold bg-[#D4B886] text-white px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider">
                                        ACTIVE
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-[#A89F94] font-medium">
                                    {pol.ToDate || "Check-in"}
                                  </div>
                                  <div>
                                    {isFixed ? (
                                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] bg-[#EDF7F2] text-[#2C7A4B] px-1.5 py-[3px] rounded-sm">
                                        FIXED ({pol.Currency || "INR"})
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#B5341A]">
                                        PERCENTAGE (%)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right text-[13px] font-bold">
                                    {isFree ? (
                                      <span className="text-[#2C7A4B]">
                                        Free
                                      </span>
                                    ) : (
                                      <span className="text-[#1A1714]">
                                        {isFixed
                                          ? `${chargeVal}`
                                          : `${chargeVal}%`}
                                      </span>
                                    )}
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
            </section>
            {rateConditions?.length > 0 && (
              <section>
                <SectionHeader title="Rate Conditions & Check-In Rules" />
                <CheckInInstructions conditions={rateConditions} />
              </section>
            )}
          </div>
        )}

        {activeTab === "guest" && (
          <div className="space-y-12">
            {travellers.length > 0 && (
              <section>
                <SectionHeader title="Guest" />
                <GuestSection travellers={travellers} />
              </section>
            )}
          </div>
        )}

        {activeTab === "amendment" && (
          <div className="space-y-8">
            <section>
              <SectionHeader
                title={
                  isCancelled
                    ? "Cancellation Details"
                    : isAmendmentPending
                      ? "Cancellation Request Status"
                      : bookingAmendmentStatus &&
                          bookingAmendmentStatus !== "not_requested"
                        ? "Amendment Status"
                        : "Request Cancellation"
                }
              />
              <CancellationSection
                booking={booking}
                isConfirmed={isConfirmed}
                cancelPolicies={cancelPolicies}
                totalFare={totalFare}
              />
            </section>

            {/* Show raw amendment/cancellation response from the API */}
            {booking?.amendment &&
              booking.amendment.status &&
              booking.amendment.status !== "not_requested" &&
              (() => {
                const amend = booking.amendment;
                const provResp =
                  amend?.providerResponse?.HotelChangeRequestStatusResult ||
                  amend?.providerResponse?.HotelChangeRequestResult ||
                  amend?.providerResponse;
                const statusLabel =
                  {
                    requested: "Pending",
                    in_progress: "In Progress",
                    approved: "Approved",
                    rejected: "Rejected",
                    cancelled: "Cancelled",
                  }[amend.status] || amend.status;

                const statusColor =
                  {
                    requested: "text-[#8A6200] bg-[#FDF8EE] border-[#F0E0A8]",
                    in_progress: "text-[#1A4A7A] bg-[#EEF4FD] border-[#C0D4F0]",
                    approved: "text-[#2C7A4B] bg-[#EDF7F2] border-[#C3E4D2]",
                    rejected: "text-[#B5341A] bg-[#FDF1EE] border-[#F0C4BA]",
                    cancelled: "text-[#B5341A] bg-[#FDF1EE] border-[#F0C4BA]",
                  }[amend.status] ||
                  "text-[#1A1714] bg-[#FAF8F4] border-[#EAE4D9]";

                return (
                  <section>
                    <SectionHeader title="Cancellation / Amendment Response" />
                    <div className="bg-white border border-[#EAE4D9] overflow-hidden">
                      {/* Status bar */}
                      <div
                        className={`px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between flex-wrap gap-3`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#A89F94]">
                            Request Status
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-[0.12em] uppercase border ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        {amend.requestedAt && (
                          <div className="text-[11px] text-[#A89F94]">
                            Requested on {fmtDate(amend.requestedAt)} at{" "}
                            {fmtTime(amend.requestedAt)}
                          </div>
                        )}
                      </div>

                      {/* Fields grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[#EAE4D9]">
                        {amend.remarks && (
                          <div className="px-6 py-5 sm:border-r border-[#EAE4D9]">
                            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                              Reason / Remarks
                            </div>
                            <div className="text-[13px] font-medium text-[#1A1714] italic">
                              "{amend.remarks}"
                            </div>
                          </div>
                        )}
                        {amend.cancelledAt && (
                          <div className="px-6 py-5 sm:border-r border-[#EAE4D9]">
                            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                              Cancelled At
                            </div>
                            <div className="text-[13px] font-semibold text-[#1A1714]">
                              {fmtDate(amend.cancelledAt)}{" "}
                              {fmtTime(amend.cancelledAt)}
                            </div>
                          </div>
                        )}
                        {amend.refundedAmount !== undefined &&
                          amend.refundedAmount !== null && (
                            <div className="px-6 py-5">
                              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                                Refunded Amount
                              </div>
                              <div className="text-[16px] font-bold text-[#2C7A4B]">
                                ₹
                                {Number(amend.refundedAmount).toLocaleString(
                                  "en-IN",
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Provider API response */}
                      {provResp && (
                        <div className="border-t border-[#EAE4D9] px-6 pt-5 pb-6 bg-[#FAF8F4]">
                          <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A] mb-4">
                            Provider Response
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                              {
                                label: "Change Request ID",
                                value:
                                  provResp.ChangeRequestId ||
                                  provResp.RequestId,
                              },
                              {
                                label: "Request Status",
                                value:
                                  provResp.ChangeRequestStatus !== undefined
                                    ? {
                                        0: "Not Set",
                                        1: "Pending",
                                        2: "In Progress",
                                        3: "Approved",
                                        4: "Rejected",
                                      }[provResp.ChangeRequestStatus] ||
                                      provResp.ChangeRequestStatus
                                    : undefined,
                              },
                              {
                                label: "Cancellation ID",
                                value: provResp.CancellationId,
                              },
                              {
                                label: "Credit Note",
                                value: provResp.CreditNote,
                              },
                              {
                                label: "Refund Amount",
                                value:
                                  provResp.RefundedAmount !== undefined
                                    ? `₹${Number(provResp.RefundedAmount).toLocaleString("en-IN")}`
                                    : undefined,
                              },
                              {
                                label: "Cancellation Charges",
                                value:
                                  provResp.CancellationCharges !== undefined
                                    ? `₹${Number(provResp.CancellationCharges).toLocaleString("en-IN")}`
                                    : undefined,
                              },
                              {
                                label: "Remarks",
                                value: provResp.Remarks || provResp.Status,
                              },
                            ]
                              .filter(
                                (f) =>
                                  f.value !== undefined &&
                                  f.value !== null &&
                                  f.value !== "",
                              )
                              .map((field, fi) => (
                                <div key={fi}>
                                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                                    {field.label}
                                  </div>
                                  <div className="text-[13px] font-semibold text-[#1A1714]">
                                    {field.value}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Raw cancellation status from booking.raw */}
                      {booking?.raw?.CancellationStatus?.[0] &&
                        (() => {
                          const cs = booking.raw.CancellationStatus[0];
                          return (
                            <div className="border-t border-[#EAE4D9] px-6 pt-5 pb-6">
                              <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A] mb-4">
                                Cancellation Confirmation
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                  {
                                    label: "Cancellation ID",
                                    value: cs.CancellationId,
                                  },
                                  { label: "Status", value: cs.Status },
                                  {
                                    label: "Refund Amount",
                                    value:
                                      cs.RefundAmount !== undefined
                                        ? `₹${Number(cs.RefundAmount).toLocaleString("en-IN")}`
                                        : undefined,
                                  },
                                  {
                                    label: "Cancellation Charges",
                                    value:
                                      cs.CancellationCharges !== undefined
                                        ? `₹${Number(cs.CancellationCharges).toLocaleString("en-IN")}`
                                        : undefined,
                                  },
                                  {
                                    label: "Credit Note",
                                    value: cs.CreditNote,
                                  },
                                  { label: "Remarks", value: cs.Remarks },
                                ]
                                  .filter(
                                    (f) =>
                                      f.value !== undefined &&
                                      f.value !== null &&
                                      f.value !== "",
                                  )
                                  .map((field, fi) => (
                                    <div key={fi}>
                                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                                        {field.label}
                                      </div>
                                      <div className="text-[13px] font-semibold text-[#1A1714]">
                                        {field.value}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  </section>
                );
              })()}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-12">
            <section>
              <SectionHeader title="Audit Trail" />
              <BookingHistory booking={booking} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
