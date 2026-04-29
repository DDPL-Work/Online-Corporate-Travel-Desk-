//\src\Pages\Booking-Flow\Hotel-Booking\HotelReviewBooking.jsx

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MdArrowBack,
  MdHotel,
  MdCheckCircle,
  MdInfo,
  MdVerifiedUser,
  MdLocationOn,
  MdKingBed,
} from "react-icons/md";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiMapPin,
  FiGlobe,
  FiCoffee,
  FiImage,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiStar,
  FiTag,
  FiClock,
  FiInfo,
  FiBookOpen,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiGift,
  FiShield as FiShieldIcon,
  FiList,
  FiAlertCircle,
} from "react-icons/fi";
import { FaUserPlus, FaHotel, FaPlane } from "react-icons/fa";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import {
  createHotelBookingRequest,
  fetchHotelRequestById,
  executeHotelBooking,
  preBookHotel,
} from "../../../Redux/Actions/hotelBooking.thunks";
import { approveApproval } from "../../../Redux/Actions/approval.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import Swal from "sweetalert2";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Country } from "country-state-city";
import api from "../../../API/axios";
import { ProjectApproverBlock } from "./components/ProjectApproverBlock";
import { selectManager } from "../../../Redux/Actions/manager.thunk";
import { fetchMySSRPolicy } from "../../../Redux/Actions/ssrPolicy.thunks";

/* ─────────────────────────────────────────────────────────────── */
/*  Utility: calculateNights                                       */
/* ─────────────────────────────────────────────────────────────── */
const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
};

/* ─────────────────────────────────────────────────────────────── */
/*  Utility: sanitize HTML entities + tags from API strings       */
/* ─────────────────────────────────────────────────────────────── */
function sanitizeHtml(str = "") {
  return str
    .replace(/&amp;lt;/g, "<")
    .replace(/&amp;gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ─────────────────────────────────────────────────────────────── */
/*  Shared tiny helpers                                            */
/* ─────────────────────────────────────────────────────────────── */
const Required = () => <span className="text-red-400">*</span>;
const Divider = () => <hr className="border-slate-100" />;
const SectionHeading = ({ icon, title, badge }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-[#C9A84C]">{icon}</span>
    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
      {title}
    </p>
    {badge && (
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────── */
/*  Room Image Gallery                                             */
/* ─────────────────────────────────────────────────────────────── */
function RoomImageGallery({ images = [] }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!images.length) return null;

  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  return (
    <div className="mb-5">
      <div className="relative rounded-xl overflow-hidden bg-white h-52 sm:h-64 group">
        <img
          src={images[active]}
          alt={`Room image ${active + 1}`}
          className="w-full h-full object-cover transition-all duration-500"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          {active + 1} / {images.length}
        </div>
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
            >
              <FiChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          {(expanded ? images : images.slice(0, 8)).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                active === i
                  ? "border-[#C9A84C] scale-105"
                  : "border-transparent hover:border-slate-300"
              }`}
            >
              <img
                src={img}
                alt={`thumb ${i}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </button>
          ))}
          {!expanded && images.length > 8 && (
            <button
              onClick={() => setExpanded(true)}
              className="shrink-0 w-14 h-10 rounded-lg bg-white border-2 border-transparent hover:border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 cursor-pointer border-none"
            >
              +{images.length - 8}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Cancellation Policy Table                                      */
/* ─────────────────────────────────────────────────────────────── */
function CancelPolicyTable({ policies = [] }) {
  if (!policies.length) return null;

  const typeLabel = (type) => {
    if (type === "Fixed" || type === 1) return "Fixed (₹)";
    if (type === "Percentage" || type === 2) return "Percentage (%)";
    return String(type);
  };

  const formatCharge = (charge, type) => {
    if (charge === 0)
      return <span className="text-emerald-600 font-bold">Free</span>;
    if (type === "Percentage" || type === 2)
      return <span className="text-red-600 font-bold">{charge}%</span>;
    return (
      <span className="text-red-600 font-bold">
        ₹{Number(charge).toLocaleString("en-IN")}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white border-b border-slate-200">
            <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              From Date
            </th>
            <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Charge Type
            </th>
            <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Cancellation Charge
            </th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 last:border-0 hover:bg-white transition"
            >
              <td className="px-3 py-2.5 text-xs text-slate-800 font-medium">
                {p.FromDate || "—"}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.CancellationCharge === 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}
                >
                  {typeLabel(p.ChargeType)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right text-sm">
                {formatCharge(p.CancellationCharge, p.ChargeType)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NEW ▶ Room Promotions Panel                                    */
/* ─────────────────────────────────────────────────────────────── */
function RoomPromotions({ promotions = [] }) {
  const cleaned = promotions.map(sanitizeHtml).filter(Boolean);
  if (!cleaned.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {cleaned.map((promo, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl shadow-sm animate-fade-in"
        >
          <div className="w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center shadow-lg shadow-[#C9A84C]/30">
            <FiGift size={10} className="text-white" />
          </div>
          <span className="text-[12px] font-bold text-[#C9A84C]">
            {promo}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NEW ▶ Inclusions Badges                                        */
/* ─────────────────────────────────────────────────────────────── */
function InclusionBadges({ inclusion }) {
  if (!inclusion) return null;
  const items = Array.isArray(inclusion)
    ? inclusion
    : inclusion
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-500/10 border border-emerald-100 px-2.5 py-1 rounded-full font-medium"
        >
          <MdCheckCircle size={11} /> {item}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NEW ▶ Amenities Grid                                           */
/* ─────────────────────────────────────────────────────────────── */
function AmenitiesGrid({ amenities = [] }) {
  const [showAll, setShowAll] = useState(false);
  if (!amenities.length) return null;

  const visible = showAll ? amenities : amenities.slice(0, 12);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
        <FiStar size={11} className="text-[#C9A84C]" /> Room Amenities
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full"
          >
            <MdCheckCircle size={11} className="text-[#C9A84C] shrink-0" />
            {item}
          </span>
        ))}
        {!showAll && amenities.length > 12 && (
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2.5 py-1 rounded-full hover:bg-[#C9A84C]/15 transition cursor-pointer"
          >
            +{amenities.length - 12} more
          </button>
        )}
        {showAll && amenities.length > 12 && (
          <button
            onClick={() => setShowAll(false)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NEW ▶ Rate Conditions Panel                                    */
/* ─────────────────────────────────────────────────────────────── */
function RateConditions({ conditions = [] }) {
  const [expanded, setExpanded] = useState(false);

  const cleaned = conditions.map(sanitizeHtml).filter(Boolean);
  if (!cleaned.length) return null;

  // Always show check-in/out/age conditions; collapse the rest
  const keyConditions = cleaned.filter((c) =>
    /check.?in|check.?out|minimum|age/i.test(c),
  );
  const otherConditions = cleaned.filter(
    (c) => !/check.?in|check.?out|minimum|age/i.test(c),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      {keyConditions.length > 0 && (
        <div className="px-4 pt-3 pb-2 space-y-1.5">
          {keyConditions.map((cond, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="text-[12px] text-[#C9A84C] font-medium leading-snug">
                {cond}
              </p>
            </div>
          ))}
        </div>
      )}

      {otherConditions.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer border-none bg-transparent text-left border-t border-[#1E293B]"
          >
            <div className="flex items-center gap-2">
              <FiList size={12} className="text-[#C9A84C]" />
              <span className="text-[11px] font-bold text-[#C9A84C]">
                {expanded ? "Hide" : "View"} {otherConditions.length} more
                condition{otherConditions.length !== 1 ? "s" : ""}
              </span>
            </div>
            {expanded ? (
              <FiChevronUp size={13} className="text-[#C9A84C]" />
            ) : (
              <FiChevronDown size={13} className="text-[#C9A84C]" />
            )}
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-2 border-t border-[#1E293B]">
              {otherConditions.map((cond, i) => (
                <div key={i} className="flex items-start gap-2">
                  <FiAlertCircle
                    size={12}
                    className="text-[#C9A84C] mt-0.5 shrink-0"
                  />
                  <p className="text-[12px] text-slate-700 leading-relaxed">
                    {cond}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Full-Width Hotel Hero Banner                                   */
/* ─────────────────────────────────────────────────────────────── */
function HotelHeroBanner({
  displayHotel,
  displaySearchParams,
  displayRoom,
  selectedRoom,
  totalAdults,
  totalChildren,
}) {
  const nights = calculateNights(
    displaySearchParams?.checkIn,
    displaySearchParams?.checkOut,
  );

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-md shadow-black/20 overflow-hidden mb-6">
      {/* Hero image strip */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-white/10">
        <img
          src={displayHotel?.images?.[0] || "/placeholder-hotel.jpg"}
          alt={displayHotel?.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {displayHotel?.rating > 0 && (
          <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-slate-300 px-3 py-1.5 rounded-full">
            {Array.from({ length: displayHotel.rating }).map((_, i) => (
              <svg
                key={i}
                className="w-3 h-3 text-[#C9A84C]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[11px] font-bold text-white ml-0.5">
              {displayHotel.rating}-Star
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-1 drop-shadow">
            {displayHotel?.name}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-white/90">
            <MdLocationOn size={15} className="text-white/70 shrink-0" />
            <span className="leading-snug">{displayHotel?.address}</span>
          </div>
        </div>
      </div>

      {/* Check-in / out / room strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Check-in
          </p>
          <p className="text-sm font-bold text-[#0A203E]">
            {displaySearchParams?.checkIn
              ? new Date(displaySearchParams.checkIn).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short", year: "numeric" },
                )
              : "—"}
          </p>
          <p className="text-[11px] text-slate-500">
            {displaySearchParams?.checkIn
              ? new Date(displaySearchParams.checkIn).toLocaleDateString(
                  "en-GB",
                  { weekday: "long" },
                )
              : ""}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col items-center justify-center gap-0.5 bg-[#C9A84C]/5">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mb-1">
            <FiClock size={14} className="text-[#C9A84C]" />
          </div>
          <span className="text-lg font-black text-[#C9A84C]">{nights}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Night{nights !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Check-out
          </p>
          <p className="text-sm font-bold text-[#0A203E]">
            {displaySearchParams?.checkOut
              ? new Date(displaySearchParams.checkOut).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short", year: "numeric" },
                )
              : "—"}
          </p>
          <p className="text-[11px] text-slate-500">
            {displaySearchParams?.checkOut
              ? new Date(displaySearchParams.checkOut).toLocaleDateString(
                  "en-GB",
                  { weekday: "long" },
                )
              : ""}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Room & Guests
          </p>
          <p className="text-sm font-bold text-[#0A203E]">
            {displaySearchParams?.rooms?.length || 1} Room · {totalAdults} Adult
            {totalAdults !== 1 ? "s" : ""}
            {totalChildren > 0 && ` · ${totalChildren} Child${totalChildren !== 1 ? "ren" : ""}`}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {Array.isArray(selectedRoom)
              ? [...new Set(selectedRoom.map((r) => r.RoomTypeName || r.Name?.[0] || r.name))].join(", ")
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Selected Room Details Card — FULLY UPDATED with PreBook data  */
/* ─────────────────────────────────────────────────────────────── */
function SelectedRoomDetailsCard({
  selectedRoom,
  displayRoom,
  displaySearchParams,
  rateConditions = [],
}) {
  const room = selectedRoom || displayRoom || {};

  const images = room?.images || room?.rawRoomData?.images || [];
  const roomNameDisplay = 
    room?.RoomTypeName || 
    (Array.isArray(room?.Name) ? [...new Set(room.Name)].join(", ") : room?.Name) ||
    (Array.isArray(room?.name) ? [...new Set(room.name)].join(", ") : room?.name) ||
    "Room";

  const totalFare = room?.TotalFare || room?.Price?.TotalFare || 0;
  const totalTax = room?.TotalTax || room?.Price?.Tax || 0;
  const baseFare = totalFare - totalTax;

  const cancelPolicies =
    room?.CancelPolicies || displayRoom?.CancelPolicies || [];
  const freeCancelUntil = cancelPolicies.find(
    (p) => p.CancellationCharge === 0,
  )?.FromDate;
  const paidCancelFrom = cancelPolicies.find(
    (p) => p.CancellationCharge > 0,
  )?.FromDate;
  const lastCancelDeadline = room?.LastCancellationDeadline;

  const mealType =
    room?.MealType || room?.mealType || displayRoom?.MealType || null;
  const isRefundable =
    room?.IsRefundable ??
    room?.isRefundable ??
    displayRoom?.IsRefundable ??
    false;
  const inclusion = room?.Inclusion || displayRoom?.Inclusion || null;
  const amenities = room?.Amenities || displayRoom?.Amenities || [];
  const promotions = room?.RoomPromotion || room?.roomPromotion || [];
  const dayRates = room?.DayRates || displayRoom?.DayRates || [];
  const nights = calculateNights(
    displaySearchParams?.checkIn,
    displaySearchParams?.checkOut,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C9A84C] to-[#C9A84C] px-6 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <MdKingBed size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0A203E]">
            Selected Room Details
          </h3>
          <p className="text-[11px] text-[#0A203E]/70 font-medium">
            Full breakdown of your chosen room
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Top section: Image, Title, Badges ── */}
        <div>
          {images.length > 0 && <RoomImageGallery images={images} />}
            <h4 className="text-base font-extrabold text-[#0A203E] leading-snug mb-3">
              {roomNameDisplay}
            </h4>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Meal type */}
              {mealType ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <FiCoffee size={11} />
                  {mealType.replace(/_/g, " ")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                  <FiCoffee size={11} /> Meal info unavailable
                </span>
              )}

              {/* Refundable */}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  isRefundable
                    ? "text-teal-700 bg-teal-50 border-teal-100"
                    : "text-red-600 bg-red-500/10 border-red-100"
                }`}
              >
                {isRefundable ? (
                  <>
                    <FiCheckCircle size={11} /> Refundable
                  </>
                ) : (
                  <>
                    <FiXCircle size={11} /> Non-Refundable
                  </>
                )}
              </span>

              {/* Nights */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                🌙 {nights} Night{nights !== 1 ? "s" : ""}
              </span>
            </div>
        </div>

        {/* ── Two-column Details ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* LEFT: Inclusions + Promotions + Fare breakdown */}
          <div className="flex flex-col gap-5">
            {/* Inclusions */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Inclusions
              </p>
              {inclusion ? (
                <InclusionBadges inclusion={inclusion} />
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  No inclusions listed
                </span>
              )}
            </div>

            {/* Room Promotions */}
            {promotions.length > 0 ? (
              <RoomPromotions promotions={promotions} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center gap-2">
                <FiGift size={13} className="text-[#C9A84C]" />
                <span className="text-[11px] text-slate-500">
                  No promotions available for this room
                </span>
              </div>
            )}

            {/* Fare Breakdown */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Fare Breakdown
              </p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {/* Per-night rates from DayRates */}
                  {dayRates?.[0]?.length > 0 && (
                    <div className="px-4 py-2 bg-white/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Per-Night Rates
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {dayRates[0].map((d, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full"
                          >
                            Night {i + 1}: ₹
                            {Number(d.BasePrice).toLocaleString("en-IN")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-600">
                      Base Fare
                    </span>
                    <span className="text-[13px] font-semibold text-slate-800">
                      ₹{Number(baseFare).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-600">
                      Taxes & Fees
                    </span>
                    <span className="text-[13px] font-semibold text-slate-800">
                      ₹{Number(totalTax).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50">
                    <span className="text-[14px] font-bold text-teal-700">
                      Total
                    </span>
                    <span className="text-[18px] font-black text-[#C9A84C]">
                      ₹{Number(totalFare).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Cancellation policy */}
          <div className="flex flex-col gap-5">
            {/* Cancellation Policy */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Cancellation Policy
              </p>
              {cancelPolicies.length > 0 ? (
                <>
                  {freeCancelUntil && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-100 rounded-xl px-3 py-2.5 mb-2">
                      <FiCheckCircle
                        size={14}
                        className="text-emerald-500 shrink-0"
                      />
                      <p className="text-[12px] text-emerald-700 font-semibold">
                        Free cancellation until{" "}
                        <strong>{freeCancelUntil}</strong>
                      </p>
                    </div>
                  )}
                  {paidCancelFrom && (
                    <div className="flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-xl px-3 py-2.5 mb-2">
                      <MdInfo size={14} className="text-[#C9A84C] shrink-0" />
                      <p className="text-[12px] text-[#C9A84C] font-semibold">
                        Charges apply from <strong>{paidCancelFrom}</strong>
                      </p>
                    </div>
                  )}
                  {lastCancelDeadline && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-100 rounded-xl px-3 py-2.5 mb-2">
                      <FiClock size={14} className="text-red-500 shrink-0" />
                      <p className="text-[12px] text-red-700 font-semibold">
                        Last cancellation deadline:{" "}
                        <strong>{lastCancelDeadline}</strong>
                      </p>
                    </div>
                  )}
                  <CancelPolicyTable policies={cancelPolicies} />
                </>
              ) : (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                  <FiShieldIcon size={13} className="text-slate-500 shrink-0" />
                  <p className="text-[12px] text-slate-600">
                    Cancellation policy not available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <hr className="border-slate-100" />

        {/* ── Amenities (full width) ── */}
        {amenities.length > 0 ? (
          <AmenitiesGrid amenities={amenities} />
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Room Amenities
            </p>
            <span className="text-[11px] text-slate-500 italic">
              No amenities listed for this room
            </span>
          </div>
        )}

        {/* ── Rate Conditions (full width, from HotelResult level) ── */}
        {rateConditions.length > 0 && (
          <>
            <hr className="border-slate-100" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                <FiInfo size={11} className="text-[#C9A84C]" /> Rate Conditions
                & Check-in Info
              </p>
              <RateConditions conditions={rateConditions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  InfoCell (used in BookNow approved-guest view)                 */
/* ─────────────────────────────────────────────────────────────── */
function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5 bg-white">
      <div className="flex items-center gap-2.5 mb-0.5">
        <Icon size={15} className="text-slate-500" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </span>
      </div>
      <span className="text-sm font-medium text-slate-800 truncate">
        {value || "—"}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Component                                                 */
/* ─────────────────────────────────────────────────────────────── */
const HotelReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const dispatch = useDispatch();

  const [projectApproverData, setProjectApproverData] = useState({
    project: null,
    approver: null,
  });

  const { user } = useSelector((state) => state.auth);
  const { loading: actionLoading } = useSelector(
    (state) => state.hotelBookings,
  );
  const { hotels: searchedHotels } = useSelector((state) => state.hotel);
  const { selectedRequest, loading, error, preBookData, preBookLoading } =
    useSelector((state) => state.hotelBookings);

  const { myPolicy } = useSelector((state) => state.ssrPolicy);
  const isTravelAdmin = user?.role === "travel-admin";
  const approvalRequired = !isTravelAdmin && myPolicy?.approvalRequired !== false;

  const { hotel, rooms, searchParams } = location.state || {};

  const [travelers, setTravelers] = useState([]);
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [bookingRequest, setBookingRequest] = useState(null);
  const [gstDetails, setGstDetails] = useState({
    gstin: "",
    legalName: "",
    address: "",
    gstEmail: "",
  });

  const queryParams = new URLSearchParams(location.search);
  const bookingId = id || queryParams.get("id");
  const isBookNowMode = !!bookingId;

  const safeHotel =
    hotel ||
    bookingRequest?.hotelRequest?.selectedHotel ||
    bookingRequest?.hotelRequest?.rawHotelData ||
    {};

  const totalAdultsFromSearch =
    (searchParams?.rooms || []).reduce(
      (sum, r) => sum + (r.Adults || r.adults || 0),
      0,
    ) || 1;
  const totalChildrenFromSearch =
    (searchParams?.rooms || []).reduce(
      (sum, r) => sum + (r.Children || r.children || 0),
      0,
    ) || 0;
  const totalGuestsFromSearch = totalAdultsFromSearch + totalChildrenFromSearch;

  // ── Fetch booking by id ──
  useEffect(() => {
    if (id) dispatch(fetchHotelRequestById(id));
  }, [dispatch, id]);

  // ── Fetch SSR Policy ──
  useEffect(() => {
    if (user?.role === "employee" || user?.role === "manager") {
      dispatch(fetchMySSRPolicy());
    }
  }, [dispatch, user]);

  // ── Fetch GST details ──
  useEffect(() => {
    const fetchGst = async () => {
      try {
        const { data } = await api.get("/employees/gst");
        if (data?.data) {
          setGstDetails((prev) => ({
            ...prev,
            gstin: data.data.gstin || "",
            legalName: data.data.legalName || "",
            address: data.data.address || "",
            gstEmail: data.data.gstEmail || "",
          }));
        }
      } catch (err) {
        console.warn("GST fetch failed", err?.message);
      }
    };
    fetchGst();
  }, []);

  // ── Populate from selectedRequest (BookNow mode) ──
  useEffect(() => {
    if (selectedRequest) {
      setBookingRequest(selectedRequest);
      setTravelers(selectedRequest.travellers || []);
      setPurposeOfTravel(selectedRequest.purposeOfTravel || "");
    }
  }, [selectedRequest]);

  // ── Generate traveler list from search params (non-BookNow mode) ──
  useEffect(() => {
    if (!isBookNowMode && travelers.length === 0 && user) {
      const generatedTravelers = [];
      const roomsFromSearch = searchParams?.rooms || [];

      roomsFromSearch.forEach((room, roomIdx) => {
        const adults = room.Adults || room.adults || 0;
        const children = room.Children || room.children || 0;
        const childAges =
          room.ChildrenAges || room.ChildAge || room.childAges || [];

        for (let a = 0; a < adults; a++) {
          const isLead = generatedTravelers.length === 0;
          generatedTravelers.push({
            id: generatedTravelers.length + 1,
            title: "Mr",
            firstName: isLead ? user?.name?.firstName || "" : "",
            lastName: isLead ? user?.name?.lastName || "" : "",
            paxType: 1,
            age: "",
            dob: "",
            gender: "Male",
            leadPassenger: isLead,
            email: isLead ? user?.email || "" : "",
            phoneWithCode: isLead ? user?.phone || "" : "",
            countryCode: "IN",
            nationality: "IN",
            panCard: "",
            roomIndex: roomIdx,
          });
        }

        for (let c = 0; c < children; c++) {
          generatedTravelers.push({
            id: generatedTravelers.length + 1,
            title: "Master",
            firstName: "",
            lastName: "",
            paxType: 2,
            age: childAges[c] || "",
            dob: "",
            gender: "Male",
            leadPassenger: false,
            email: "",
            phoneWithCode: "",
            countryCode: "IN",
            nationality: "IN",
            panCard: "",
            roomIndex: roomIdx,
          });
        }
      });

      if (generatedTravelers.length === 0) {
        generatedTravelers.push({
          id: 1,
          title: "Mr",
          firstName: user?.name?.firstName || "",
          lastName: user?.name?.lastName || "",
          paxType: 1,
          age: "",
          dob: "",
          gender: "Male",
          leadPassenger: true,
          email: user?.email || "",
          phoneWithCode: user?.phone || "",
          countryCode: "IN",
          nationality: "IN",
          panCard: "",
        });
      }

      setTravelers(generatedTravelers);
    }
  }, [
    user,
    isBookNowMode,
    totalAdultsFromSearch,
    totalChildrenFromSearch,
    searchParams,
  ]);

  // ── Guest management ──
  const handleAddGuest = (paxType = 1) => {
    const limit = totalGuestsFromSearch || totalAdultsFromSearch;
    if (travelers.length >= limit) {
      ToastWithTimer({
        type: "error",
        message: "Guest count cannot exceed selected guests",
      });
      return;
    }
    setTravelers((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        title: "Mr",
        firstName: "",
        lastName: "",
        paxType,
        age: "",
        dob: "",
        gender: "Male",
        leadPassenger: false,
        email: "",
        phoneWithCode: "",
        countryCode: "",
        nationality: "",
        PassportNo: "",
        PassportIssueDate: "",
        PassportExpDate: "",
        panCard: "",
      },
    ]);
  };

  const handleRemoveGuest = (id) => {
    const limit = totalGuestsFromSearch || totalAdultsFromSearch;
    if (travelers.length <= limit) {
      ToastWithTimer({
        type: "error",
        message: "Cannot have less guests than selected",
      });
      return;
    }
    setTravelers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (!updated.some((t) => t.leadPassenger) && updated.length > 0)
        updated[0].leadPassenger = true;
      return updated;
    });
  };

  const updateTraveler = (id, field, value) =>
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );

  // ── Derived state ──
  const isApproved = bookingRequest?.requestStatus === "approved";
  const approvedBy = bookingRequest?.approvedBy;

  const hotelFromSearch = searchedHotels?.find(
    (h) =>
      h.HotelCode ===
      (hotel?.hotelCode || bookingRequest?.hotelRequest?.hotelCode),
  );

  const displayHotel = isBookNowMode
    ? {
        name: bookingRequest?.bookingSnapshot?.hotelName,
        rating: 4,
        address:
          bookingRequest?.hotelRequest?.selectedHotel?.address ||
          bookingRequest?.bookingSnapshot?.city,
        images: [
          bookingRequest?.bookingSnapshot?.hotelImage ||
            "/placeholder-hotel.jpg",
        ],
        resultIndex:
          bookingRequest?.hotelRequest?.resultIndex ||
          hotelFromSearch?.ResultIndex,
      }
    : {
        ...hotel,
        resultIndex: hotel?.resultIndex || hotelFromSearch?.ResultIndex,
      };

  const selectedRoom = rooms || [];

  const hotelCountry =
    searchParams?.guestNationality ||
    displayHotel?.country ||
    displayHotel?.CountryName ||
    displayHotel?.address?.split(",")?.slice(-1)[0]?.trim() ||
    "";

  // ── PreBook data ──
  const preBookRooms = preBookData?.HotelResult?.[0]?.Rooms || [];
  const preBookRateConditions =
    preBookData?.HotelResult?.[0]?.RateConditions || []; // ← NEW
  const validation = preBookData?.ValidationInfo || {};

  const requiredFlags = {
    isPANRequired: validation?.PanMandatory,
    isPassportRequired: validation?.PassportMandatory,
    isEmailRequired: true,
    isPhoneRequired: true,
  };

  const getCountryCode = (countryNameOrCode) => {
    if (!countryNameOrCode) return "";
    if (countryNameOrCode.length === 2) return countryNameOrCode;
    const found = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === countryNameOrCode.toLowerCase(),
    );
    return found?.isoCode || "";
  };

  const hotelCountryCode = getCountryCode(hotelCountry);

  const isInternationalBooking = travelers.some((t) => {
    const travelerCountryCode = getCountryCode(t.nationality || t.countryCode);
    if (!travelerCountryCode || !hotelCountryCode) return false;
    return travelerCountryCode !== hotelCountryCode;
  });

  const displayRoom = {
    RoomTypeName:
      selectedRoom?.Name?.[0] || selectedRoom?.roomTypeName || "Room",
    MealType: selectedRoom?.MealType || selectedRoom?.mealType || "—",
    IsRefundable:
      selectedRoom?.IsRefundable ?? selectedRoom?.isRefundable ?? false,
    Inclusion: selectedRoom?.Inclusion || "",
    CancelPolicies: selectedRoom?.CancelPolicies || [],
    TotalFare:
      selectedRoom?.TotalFare || bookingRequest?.pricingSnapshot?.totalAmount,
    Currency: bookingRequest?.pricingSnapshot?.currency || "INR",
    DayRates: selectedRoom?.DayRates || [[{}]],
    Price: selectedRoom?.Price || {},
    BookingCode: selectedRoom?.BookingCode || "",
  };

  const bookingCode = selectedRoom?.[0]?.BookingCode;
  useEffect(() => {
    if (!bookingCode) return;
    console.log("🔥 PreBook Triggered:", bookingCode);
    dispatch(preBookHotel({ BookingCode: bookingCode }));
  }, [bookingCode]);

  const displaySearchParams = isBookNowMode
    ? {
        checkIn: bookingRequest?.bookingSnapshot?.checkInDate,
        checkOut: bookingRequest?.bookingSnapshot?.checkOutDate,
        rooms: bookingRequest?.hotelRequest?.rooms || [],
      }
    : searchParams;

  const totalAdults = (displaySearchParams?.rooms || []).reduce(
    (sum, r) => sum + (r.Adults || r.adults || 0),
    0,
  );
  const totalChildren = (displaySearchParams?.rooms || []).reduce(
    (sum, r) => sum + (r.Children || r.children || 0),
    0,
  );
  const countries = Country.getAllCountries();
  const selectedRooms = rooms || [];
  const totalFare = selectedRooms.reduce(
    (sum, r) => sum + (r.TotalFare || r.Price?.TotalFare || 0),
    0,
  );
  const totalTax = selectedRooms.reduce(
    (sum, r) => sum + (r.TotalTax || r.Price?.Tax || 0),
    0,
  );
  const price = displayRoom?.Price || displayRoom || {};
  let baseFare = price.BaseFare;
  let tax = price.Tax || displayRoom?.Price?.Tax || 0;
  if (!baseFare && totalFare) baseFare = totalFare - tax;
  const search = searchParams;

  const validateTravellers = (travellers) => {
    const errors = [];

    const nameRegex = /^[A-Za-z]{2,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedTitles = ["Mr", "Ms", "Mrs", "Miss", "Master"];

    const fullNameSet = new Set();
    const firstNameSet = new Set();

    travellers.forEach((t, index) => {
      const gLabel = `${t.paxType === 2 ? "Child" : "Adult"} ${index + 1}`;
      const fName = t.firstName?.trim();
      const lName = t.lastName?.trim();

      // TITLE
      if (!allowedTitles.includes(t.title)) {
        errors.push(`Invalid title for ${gLabel}`);
      }

      // FIRST NAME
      if (!fName || !nameRegex.test(fName)) {
        errors.push(`First Name for ${gLabel} must be 2-30 alphabets only`);
      }

      // LAST NAME
      if (!lName || !nameRegex.test(lName)) {
        errors.push(`Last Name for ${gLabel} must be 2-30 alphabets only`);
      }

      // DUPLICATE FIRST NAME CHECK
      if (fName && firstNameSet.has(fName.toLowerCase())) {
        errors.push(
          `Guest ${index + 1}: Duplicate First Name "${fName}" found. Each guest must have a unique first name.`,
        );
      } else if (fName) {
        firstNameSet.add(fName.toLowerCase());
      }

      // DUPLICATE FULL NAME CHECK
      const mName = t.middleName?.trim() || "";
      const fullName = `${fName}-${mName}-${lName}`.toLowerCase();
      if (fName && lName && fullNameSet.has(fullName)) {
        errors.push(
          `Guest ${index + 1}: Duplicate full name "${fName} ${
            mName ? mName + " " : ""
          }${lName}" already exists.`,
        );
      } else if (fName && lName) {
        fullNameSet.add(fullName);
      }

      // EMAIL (Adults only usually, or if provided)
      if (t.paxType === 1 && (!t.email || !emailRegex.test(t.email))) {
        errors.push(`Valid email is required for ${gLabel}`);
      }

      // AGE VALIDATION
      const ageNum = Number(t.age);
      if (t.paxType === 2) {
        // Child validation
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 18) {
          errors.push(`Child age for ${gLabel} must be between 0 and 18 years`);
        }
      } else {
        // Adult validation
        if (isNaN(ageNum) || ageNum <= 18) {
          errors.push(`Adult ${index + 1} age must be above 18 years`);
        }
      }

      // PAN CARD
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (t.panCard && !panRegex.test(t.panCard)) {
        errors.push(`Invalid PAN card format for ${gLabel}. (Example: ABCDE1234F)`);
      }
    });

    return errors;
  };

  // ── Submit: Request for Approval ──
  const handleRequestApproval = async () => {
    if (travelers.length !== totalGuestsFromSearch) {
      ToastWithTimer({
        type: "error",
        message: `Please add exactly ${totalGuestsFromSearch} guests`,
      });
      return;
    }
    if (!purposeOfTravel) {
      ToastWithTimer({
        type: "error",
        message: "Please enter purpose of travel",
      });
      return;
    }
    const errors = validateTravellers(travelers);
    if (errors.length > 0) {
      ToastWithTimer({ type: "error", message: errors[0] });
      return;
    }
    if (!selectedRoom.length) {
      ToastWithTimer({
        type: "error",
        message: "Please select at least one room",
      });
      return;
    }

    const totalAdultsPax = travelers.length;
    const totalRooms = selectedRoom.length;
    const adultsPerRoom = Math.floor(totalAdultsPax / totalRooms);
    const extra = totalAdultsPax % totalRooms;

    const roomGuests = selectedRoom.map((_, i) => ({
      noOfAdults: adultsPerRoom + (i < extra ? 1 : 0),
      noOfChild: 0,
      childAge: [],
    }));

    const buildPaxRooms = (rooms) =>
      rooms.map((room) => ({
        Adults: Number(room.Adults || room.adults || 0),
        Children: Number(room.Children || room.children || 0),
        ChildrenAges:
          room.ChildrenAges || room.childAges || room.ChildAge || [],
      }));

    const payload = {
      bookingType: "hotel",
      projectName: projectApproverData.project?.name,
      projectId: projectApproverData.project?.id,
      projectClient: projectApproverData.project?.client,
      approverId: !approvalRequired ? (user?._id || user?.id || user?.userId) : projectApproverData.approver?.id,
      approverEmail: !approvalRequired ? user?.email : projectApproverData.approver?.email,
      approverName: !approvalRequired ? `${user?.name?.firstName} ${user?.name?.lastName}` : projectApproverData.approver?.name,
      approverRole: !approvalRequired ? user?.role : projectApproverData.approver?.role,
      hotelRequest: {
        hotelCode:
          safeHotel?.HotelCode ||
          safeHotel?.hotelCode ||
          bookingRequest?.hotelRequest?.selectedHotel?.hotelCode,
        hotelName:
          safeHotel?.HotelName ||
          safeHotel?.hotelName ||
          bookingRequest?.bookingSnapshot?.hotelName ||
          "Unknown Hotel",
        address:
          safeHotel?.Address ||
          safeHotel?.address ||
          bookingRequest?.hotelRequest?.selectedHotel?.address,
        city:
          safeHotel?.CityName ||
          safeHotel?.city ||
          bookingRequest?.hotelRequest?.selectedHotel?.city,
        country:
          safeHotel?.CountryName ||
          safeHotel?.country ||
          bookingRequest?.hotelRequest?.selectedHotel?.country,
        starRating: safeHotel?.StarRating || safeHotel?.starRating || 0,
        images:
          safeHotel?.Images ||
          safeHotel?.images ||
          bookingRequest?.hotelRequest?.selectedHotel?.images ||
          [],
        amenities: safeHotel?.Amenities || safeHotel?.amenities || [],
        latitude: safeHotel?.Latitude || safeHotel?.latitude,
        longitude: safeHotel?.Longitude || safeHotel?.longitude,
        rawHotelData: safeHotel,
        selectedRoom,
        roomIndex: selectedRoom?.RoomIndex,
        checkIn: search?.checkIn,
        checkOut: search?.checkOut,
        roomGuests:
          displaySearchParams?.rooms?.map((r) => ({
            noOfAdults: r.Adults || r.adults || 0,
            noOfChild: r.Children || r.children || 0,
            childAge: r.ChildrenAges || r.ChildAge || r.childAges || [],
          })) || roomGuests,
        rooms: selectedRoom.map((room) => ({
          bookingCode:
            room.BookingCode || room.RoomTypeCode || room.RatePlanCode,
          price: room.Price,
          totalFare: room.TotalFare,
          totalTax: room.TotalTax,
          roomIndex: room.RoomIndex,
          name: room.Name,
          mealType: room.MealType,
          isRefundable: room.IsRefundable,
        })),
        PaxRooms: buildPaxRooms(searchParams.rooms),
        NoOfRooms: searchParams.rooms.length,
      },
      travellers: travelers.map((t) => ({
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName,
        gender: t.gender || "Male",
        dob: t.dob,
        age: t.age,
        email: t.email,
        phoneWithCode: t.phoneWithCode,
        nationality: t.nationality || "IN",
        isLeadPassenger: t.leadPassenger,
        panCard: t.panCard || "",
        PassportExpDate: t.PassportExpDate || "",
        PassportIssueDate: t.PassportIssueDate || "",
        PassportNo: t.PassportNo || "",
      })),
      purposeOfTravel,
      gstDetails,
      pricingSnapshot: {
        totalAmount: displayRoom?.TotalFare,
        currency: displayRoom?.Currency || "INR",
      },
      bookingSnapshot: {
        hotelName: displayHotel?.name,
        hotelImage: displayHotel?.images?.[0] || "/placeholder-hotel.jpg",
        city: displayHotel?.city || displaySearchParams?.city,
        checkInDate: displaySearchParams?.checkIn,
        checkOutDate: displaySearchParams?.checkOut,
        roomCount: displaySearchParams?.rooms?.length || 1,
        nights: calculateNights(
          displaySearchParams?.checkIn,
          displaySearchParams?.checkOut,
        ),
        amount: displayRoom?.TotalFare,
        currency: displayRoom?.Currency || "INR",
      },
    };

    try {
      if (approvalRequired && !isTravelAdmin) {
        await dispatch(
          selectManager({
            approverId: projectApproverData.approver?.id,
            approverEmail: projectApproverData.approver?.email,
            projectCodeId: projectApproverData.project?.id,
            projectName: projectApproverData.project?.name,
            projectClient: projectApproverData.project?.client,
          }),
        ).unwrap();
      }

      const errors = validateTravellers(travelers);

      if (errors.length) {
        ToastWithTimer({
          type: "error",
          message: errors[0],
        });
        return;
      }

      const result = await dispatch(createHotelBookingRequest(payload)).unwrap();

      if (!approvalRequired) {
        const requestId = result.bookingRequestId || result._id;
        if (requestId && result.requestStatus !== "approved") {
          await dispatch(
            approveApproval({
              id: requestId,
              comments: "Self Approved by Travel Admin",
              type: "hotel",
            }),
          ).unwrap();
        }
        ToastWithTimer({
          type: "success",
          message: "Booking auto-approved successfully",
        });
        navigate("/my-pending-approvals");
        return;
      }

      ToastWithTimer({
        type: "success",
        message: "Booking request submitted successfully",
      });
      navigate("/my-pending-approvals");
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err || "Failed to submit request",
      });
    }
  };

  // ── Submit: Book Now (approved mode) ──
  const handleBookNow = async () => {
    try {
      const result = await Swal.fire({
        title: "Confirm Your Booking",
        text: `Are you sure you want to book ${displayHotel?.name}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#C9A84C",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Confirm & Book",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            return await dispatch(executeHotelBooking(bookingId)).unwrap();
          } catch (error) {
            Swal.showValidationMessage(error);
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        ToastWithTimer({
          type: "success",
          message: "Hotel booked successfully!",
        });
        navigate("/my-bookings");
      }
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  const handleAction = () =>
    isBookNowMode ? handleBookNow() : handleRequestApproval();

  // ── Guards ──
  if (!isBookNowMode && (!hotel || !rooms || !searchParams)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session expired. Please go back and select hotel again.</p>
      </div>
    );
  }

  if (isBookNowMode && !bookingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading booking details…</p>
        </div>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  /* ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <CorporateNavbar />

      {/* ── Sticky back bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#C9A84C] transition font-medium"
          >
            <MdArrowBack size={18} />
            Back to Details
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/travel', { state: { activeTab: 'flight' } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A84C] text-[#000D26] hover:bg-[#C9A84C] transition-colors text-xs font-bold shadow-md shadow-black/20"
            >
              <FaPlane className="text-sm" />
              SEARCH FLIGHT
            </button>
            {/* {isApproved && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-emerald-500/10 border border-green-200 px-3 py-1.5 rounded-full">
                <MdVerifiedUser size={14} />
                Approved {approvedBy ? `by ${approvedBy?.name || "Manager"}` : ""}
              </div>
            )} */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#0A203E] tracking-tight mb-6">
          Review your Booking
        </h1>

        {/* ── FULL-WIDTH HOTEL HERO ── */}
        <HotelHeroBanner
          displayHotel={displayHotel}
          displaySearchParams={displaySearchParams}
          displayRoom={displayRoom}
          selectedRoom={selectedRoom}
          totalAdults={totalAdults}
          totalChildren={totalChildren}
        />

        {/* ── FULL-WIDTH ROOM DETAILS (with all PreBook fields) ── */}
        {(preBookRooms.length ? preBookRooms : selectedRoom).map(
          (room, index) => (
            <SelectedRoomDetailsCard
              key={index}
              selectedRoom={room}
              displayRoom={room}
              displaySearchParams={displaySearchParams}
              rateConditions={index === 0 ? preBookRateConditions : []}
            />
          ),
        )}

        {/* ── BOTTOM: Guest details (left 2/3) + Price summary (right 1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: Guest Details ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* BookNow mode: read-only approved guests */}
            {isBookNowMode ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MdVerifiedUser size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Guest Details — Verified
                      </h3>
                      <p className="text-[11px] text-green-100">
                        Approved{" "}
                        {approvedBy
                          ? `by ${approvedBy?.name || "Manager"}`
                          : ""}{" "}
                        · Ready to book
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-slate-300">
                    {travelers.length} Guest{travelers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[10px] font-bold text-[#C9A84C]">
                            {(t.firstName?.[0] || "G").toUpperCase()}
                            {(t.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {t.title} {t.firstName} {t.middleName || ""}{" "}
                            {t.lastName}
                          </span>
                          {t.leadPassenger && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Guest {index + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                        <InfoCell icon={FiMail} label="Email" value={t.email} />
                        <InfoCell
                          icon={FiPhone}
                          label="Phone"
                          value={t.phoneWithCode ? `+${t.phoneWithCode}` : "—"}
                        />
                        <InfoCell
                          icon={FiGlobe}
                          label="Nationality"
                          value={
                            countries.find((c) => c.isoCode === t.nationality)
                              ?.name ||
                            t.nationality ||
                            "—"
                          }
                        />
                        <InfoCell
                          icon={FiCalendar}
                          label="Date of Birth"
                          value={
                            t.dob
                              ? new Date(t.dob).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"
                          }
                        />
                        <InfoCell
                          icon={FiUser}
                          label="Age"
                          value={t.age ? `${t.age} yrs` : "—"}
                        />
                        <InfoCell
                          icon={FiMapPin}
                          label="Country"
                          value={t.countryCode || "—"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Non-BookNow mode: editable guest form */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                      <FiUser size={15} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Guest Details
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Search Criteria:
                        </p>
                        <span className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full border border-[#C9A84C]/20">
                          {totalAdultsFromSearch} Adult{totalAdultsFromSearch !== 1 ? "s" : ""}
                        </span>
                        {totalChildrenFromSearch > 0 && (
                          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            {totalChildrenFromSearch} Child{totalChildrenFromSearch !== 1 ? "ren" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleAddGuest}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#C9A84C] border border-[#C9A84C]/30 bg-[#C9A84C]/5 hover:bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg transition"
                  >
                    <FaUserPlus size={12} /> Add Guest
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-2xl border border-slate-200 overflow-hidden shadow-md shadow-black/20"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#C9A84C]/5 to-[#C9A84C]/10 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <FiUser size={13} className="text-[#C9A84C]" />
                            {t.paxType === 2 ? "Child" : "Adult"} {index + 1}
                          </span>
                          {t.leadPassenger && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-2.5 py-0.5 rounded-full border border-[#C9A84C]/20">
                              Primary Guest
                            </span>
                          )}
                        </div>
                        {travelers.length > 1 && (
                          <button
                            onClick={() => handleRemoveGuest(t.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
                          >
                            <FiX size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="p-5 space-y-6 bg-white">
                        {/* Full Name */}
                        <div>
                          <SectionHeading
                            icon={<FiUser size={12} />}
                            title={`${t.paxType === 2 ? "Child" : "Adult"} Details`}
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="field-label">Title</label>
                              <select
                                value={t.title}
                                disabled={isBookNowMode}
                                onChange={(e) =>
                                  updateTraveler(t.id, "title", e.target.value)
                                }
                                className="field-input"
                              >
                                <option>Mr</option>
                                <option>Mrs</option>
                                <option>Ms</option>
                                <option>Miss</option>
                                <option>Master</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                First Name <Required />
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Rahul"
                                value={t.firstName}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^A-Za-z]/g, "");
                                  updateTraveler(t.id, "firstName", val);
                                }}
                                className="field-input"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Middle Name{" "}
                                <span className="text-slate-500 font-normal normal-case">
                                  (optional)
                                </span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Kumar"
                                value={t.middleName || ""}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^A-Za-z]/g, "");
                                  updateTraveler(t.id, "middleName", val);
                                }}
                                className="field-input"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Last Name <Required />
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Singh"
                                value={t.lastName}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^A-Za-z]/g, "");
                                  updateTraveler(t.id, "lastName", val);
                                }}
                                className="field-input"
                              />
                            </div>
                          </div>
                        </div>

                        <Divider />

                        {/* Contact Details (adults only) */}
                        {t.paxType !== 2 && (
                          <div>
                            <SectionHeading
                              icon={<FiMail size={12} />}
                              title="Contact Details"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  Email Address <Required />
                                </label>
                                <div className="relative">
                                  <FiMail
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    size={14}
                                  />
                                  <input
                                    type="email"
                                    placeholder="e.g. rahul@email.com"
                                    value={t.email}
                                    disabled={isBookNowMode}
                                    onChange={(e) =>
                                      updateTraveler(
                                        t.id,
                                        "email",
                                        e.target.value,
                                      )
                                    }
                                    className="field-input pl-9"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  Phone Number {t.leadPassenger && <Required />}
                                </label>
                                <PhoneInput
                                  country={"in"}
                                  value={t.phoneWithCode}
                                  disabled={isBookNowMode}
                                  onChange={(value, data) => {
                                    updateTraveler(
                                      t.id,
                                      "phoneWithCode",
                                      value,
                                    );
                                    updateTraveler(
                                      t.id,
                                      "countryCode",
                                      data?.countryCode?.toUpperCase(),
                                    );
                                  }}
                                  inputClass="!h-10 !w-full !text-sm !bg-white !border !border-slate-200 !rounded-lg !text-slate-800 focus:!border-[#C9A84C] focus:!ring-2 focus:!ring-[#C9A84C]/10"
                                  buttonClass="!border !border-slate-200 !rounded-l-lg !bg-white"
                                  containerClass="w-full"
                                  enableSearch
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <Divider />

                        {/* Personal Details */}
                        <div>
                          <SectionHeading
                            icon={<FiInfo size={12} />}
                            title="Personal Details"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Nationality <Required />
                              </label>
                              <select
                                value={t.nationality}
                                disabled={isBookNowMode}
                                onChange={(e) =>
                                  updateTraveler(
                                    t.id,
                                    "nationality",
                                    e.target.value,
                                  )
                                }
                                className="field-input"
                              >
                                <option value="">Select country</option>
                                {countries.map((c) => (
                                  <option key={c.isoCode} value={c.isoCode}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Date of Birth
                              </label>
                              <input
                                type="date"
                                value={t.dob || ""}
                                disabled={isBookNowMode}
                                onChange={(e) => {
                                  const dob = e.target.value;
                                  const today = new Date();
                                  const birth = new Date(dob);
                                  let age =
                                    today.getFullYear() - birth.getFullYear();
                                  const m = today.getMonth() - birth.getMonth();
                                  if (
                                    m < 0 ||
                                    (m === 0 &&
                                      today.getDate() < birth.getDate())
                                  )
                                    age--;

                                  if (t.paxType === 2 && (age < 0 || age > 18)) {
                                    ToastWithTimer({
                                      type: "error",
                                      message: "Child age must be between 0 and 18 years",
                                    });
                                  } else if (t.paxType === 1 && age <= 18) {
                                     ToastWithTimer({
                                      type: "warning",
                                      message: "Adult age must be above 18 years",
                                    });
                                  }

                                  updateTraveler(t.id, "dob", dob);
                                  updateTraveler(t.id, "age", age);
                                }}
                                className="field-input"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="field-label">
                                Age{" "}
                                <span className="text-slate-500 font-normal normal-case">
                                  (auto-calculated)
                                </span>
                              </label>
                              <input
                                type="number"
                                value={t.age || ""}
                                readOnly
                                placeholder="—"
                                className="field-input bg-white text-slate-500 cursor-not-allowed"
                              />
                            </div>
                            {requiredFlags.isPANRequired && (
                              <div className="flex flex-col gap-1">
                                <label className="field-label">
                                  PAN Card{" "}
                                  {(t.paxType === 2 ||
                                    (t.age && Number(t.age) <= 18)) && (
                                    <span className="text-slate-500 font-normal normal-case">
                                      (Not required)
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="text"
                                  value={t.panCard || ""}
                                  disabled={
                                    isBookNowMode ||
                                    t.paxType === 2 ||
                                    (t.age && Number(t.age) <= 18)
                                  }
                                  onChange={(e) =>
                                    updateTraveler(
                                      t.id,
                                      "panCard",
                                      e.target.value.toUpperCase(),
                                    )
                                  }
                                  placeholder="ABCDE1234F"
                                  maxLength={10}
                                  className="field-input font-mono tracking-widest"
                                />
                                <p className="text-[10px] text-slate-500">
                                  Required only for adults older than 18.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Passport (International only) */}
                        {isInternationalBooking &&
                          requiredFlags.isPassportRequired && (
                            <>
                              <Divider />
                              <div>
                                <SectionHeading
                                  icon={<FiBookOpen size={12} />}
                                  title="Passport Details"
                                  badge="International"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Passport Number <Required />
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. A1234567"
                                      value={t.PassportNo || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportNo",
                                          e.target.value,
                                        )
                                      }
                                      className="field-input font-mono tracking-widest"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Issue Date <Required />
                                    </label>
                                    <input
                                      type="date"
                                      value={t.PassportIssueDate || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportIssueDate",
                                          e.target.value,
                                        )
                                      }
                                      className="field-input"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="field-label">
                                      Expiry Date <Required />
                                    </label>
                                    <input
                                      type="date"
                                      value={t.PassportExpDate || ""}
                                      onChange={(e) =>
                                        updateTraveler(
                                          t.id,
                                          "PassportExpDate",
                                          e.target.value,
                                        )
                                      }
                                      className="field-input"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  ))}

                  <style>{`
                    .field-label {
                      font-size: 11px; font-weight: 600; color: #64748b;
                      text-transform: uppercase; letter-spacing: 0.05em;
                    }
                    .field-input {
                      height: 40px; width: 100%; padding: 0 12px;
                      font-size: 14px; color: #334155; background: white;
                      border: 1px solid #e2e8f0; border-radius: 8px;
                      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
                    }
                    .field-input:focus {
                      border-color: #C9A84C;
                      box-shadow: 0 0 0 3px rgba(10,77,104,0.08);
                    }
                    .field-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
                    .field-input::placeholder { color: #cbd5e1; }
                  `}</style>
                </div>
              </div>
            )}

            {/* Purpose of Travel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                  <FiShield size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Purpose of Travel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Required for corporate approval
                  </p>
                </div>
              </div>
              <textarea
                onChange={(e) => setPurposeOfTravel(e.target.value)}
                placeholder="Describe the reason for this booking…"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 focus:bg-white min-h-[100px] transition resize-none"
              />
            </div>

            {/* GST Details */}
            {/* <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-green-600">
                    <FiTag size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      GST Details
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Fetched automatically from your corporate profile
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded uppercase tracking-wider">
                  Profile Locked
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "GSTIN",
                    key: "gstin",
                    placeholder: "GSTIN",
                  },
                  {
                    label: "Legal Name",
                    key: "legalName",
                    placeholder: "Company legal name",
                  },
                  {
                    label: "GST Email",
                    key: "gstEmail",
                    placeholder: "GST Email",
                  },
                  {
                    label: "Billing Address",
                    key: "address",
                    placeholder: "Street, City, State, PIN",
                  },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className={key === 'address' ? 'lg:col-span-3' : ''}>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={gstDetails[key] || ""}
                      readOnly
                      placeholder={placeholder}
                      className="w-full px-4 py-2.5 border border-slate-100 rounded-lg text-sm bg-white text-slate-600 cursor-not-allowed font-medium"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-slate-500 italic">
                * Note: To update GST details, please contact your travel administrator.
              </p>
            </div> */}
          </div>

          {/* ── RIGHT: Price Summary ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
                <ProjectApproverBlock onChange={setProjectApproverData} />

              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
                <div className="bg-gradient-to-r from-[#C9A84C] to-[#C9A84C] px-5 py-4">
                  <h3 className="text-sm font-bold text-[#0A203E] mb-0.5">
                    Price Summary
                  </h3>
                  <p className="text-[11px] text-[#0A203E]/70 font-medium">
                    Transparent pricing, no hidden fees
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-600">
                      Total
                    </span>
                    <span className="text-2xl font-black text-[#C9A84C]">
                      ₹{totalFare.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">
                    {displayRoom?.Currency || "INR"} · Incl. all taxes
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* {!isBookNowMode && (
                  <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
                    By proceeding, I agree to{" "}
                    <span className="text-[#C9A84C] cursor-pointer hover:underline">
                      User Agreement
                    </span>{" "}
                    &amp;{" "}
                    <span className="text-[#C9A84C] cursor-pointer hover:underline">
                      Cancellation Policy
                    </span>
                    .
                  </p>
                )} */}

                <button
                  onClick={handleAction}
                  disabled={
                    actionLoading ||
                    !projectApproverData.project ||
                    (approvalRequired && !projectApproverData.approver)
                  }
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-[#000D26] uppercase tracking-wider bg-gradient-to-r from-[#C9A84C] to-[#C9A84C] hover:bg-[#B39340] hover:from-[#B39340] hover:to-[#B39340] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#C9A84C]/20"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : isBookNowMode ? (
                    "Confirm & Book Now"
                  ) : (
                    approvalRequired ? "Request for Approval" : "Confirm & Book"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelReviewBooking;
