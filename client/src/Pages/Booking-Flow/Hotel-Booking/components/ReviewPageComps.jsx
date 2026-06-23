import React, { useState } from "react";
import { MdCheckCircle, MdLocationOn, MdKingBed, MdInfo } from "react-icons/md";
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle, FiStar, FiClock, FiInfo, FiChevronDown, FiChevronUp, FiGift, FiShield as FiShieldIcon, FiList, FiAlertCircle, FiCoffee } from "react-icons/fi";

/* ─────────────────────────────────────────────────────────────── */
/*  Utility: calculateNights                                       */
/* ─────────────────────────────────────────────────────────────── */
export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
};

/* ─────────────────────────────────────────────────────────────── */
/*  Utility: subtractOneSecond                                     */
/* ─────────────────────────────────────────────────────────────── */
export const subtractOneSecond = (dateStr) => {
  try {
    if (!dateStr || typeof dateStr !== "string") return "";
    // format is DD-MM-YYYY HH:mm:ss
    const parts = dateStr.split(" ");
    if (parts.length < 2) return dateStr;
    const [datePart, timePart] = parts;
    const [d, m, y] = datePart.split("-").map(Number);
    const [hh, mm, ss] = timePart.split(":").map(Number);
    const date = new Date(y, m - 1, d, hh, mm, ss);
    date.setSeconds(date.getSeconds() - 1);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (e) {
    return dateStr;
  }
};

/* ─────────────────────────────────────────────────────────────── */
/*  Utility: sanitize HTML entities + tags from API strings       */
/* ─────────────────────────────────────────────────────────────── */
export function sanitizeHtml(str = "") {
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
export const Required = () => <span className="text-red-400">*</span>;
export const Divider = () => <hr className="border-slate-100" />;
export const SectionHeading = ({ icon, title, badge }) => (
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
export function RoomImageGallery({ images = [] }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!images.length) return null;

  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  return (
    <div className="mb-5">
      <div className="relative rounded-xl overflow-hidden bg-white h-52 sm:h-64 group">
        <img src={images[active]}
          alt={`Room image ${active + 1}`}
          className="w-full h-full object-cover transition-all duration-500"
          loading="lazy" decoding="async"
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
              <img src={img}
                alt={`thumb ${i}`}
                className="w-full h-full object-cover"
                loading="lazy" decoding="async"
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
export function CancelPolicyTable({ policies = [] }) {
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
              Cancellation Period (From - To)
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
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase w-8">
                      From:
                    </span>
                    <span>{p.FromDate || "—"}</span>
                  </div>
                  {policies[i + 1] && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase w-8">
                        To:
                      </span>
                      <span className="text-slate-500">
                        {subtractOneSecond(policies[i + 1].FromDate)}
                      </span>
                    </div>
                  )}
                </div>
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
export function RoomPromotions({ promotions = [] }) {
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
          <span className="text-[12px] font-bold text-[#C9A84C]">{promo}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  NEW ▶ Inclusions Badges                                        */
/* ─────────────────────────────────────────────────────────────── */
export function InclusionBadges({ inclusion }) {
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
export function AmenitiesGrid({ amenities = [] }) {
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
export function RateConditions({ conditions = [] }) {
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
export function HotelHeroBanner({
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
        <img src={displayHotel?.images?.[0] || "/placeholder-hotel.jpg"}
          alt={displayHotel?.name}
          className="w-full h-full object-cover" loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

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
            {totalChildren > 0 &&
              ` · ${totalChildren} Child${totalChildren !== 1 ? "ren" : ""}`}
          </p>
          {/* <p className="text-[11px] text-slate-500 truncate">
            {Array.isArray(selectedRoom)
              ? [...new Set(selectedRoom.map((r) => r.RoomTypeName || r.Name?.[0] || r.name))].join(", ")
              : "—"}
          </p> */}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Selected Room Details Card — FULLY UPDATED with PreBook data  */
/* ─────────────────────────────────────────────────────────────── */
export function SelectedRoomDetailsCard({
  selectedRoom,
  displayRoom,
  displaySearchParams,
  rateConditions = [],
}) {
  const room = selectedRoom || displayRoom || {};

  const images = room?.images || room?.rawRoomData?.images || [];
  const roomNameDisplay =
    room?.RoomTypeName ||
    (Array.isArray(room?.Name)
      ? [...new Set(room.Name)].join(", ")
      : room?.Name) ||
    (Array.isArray(room?.name)
      ? [...new Set(room.name)].join(", ")
      : room?.name) ||
    "Room";

  const totalFare = room?.TotalFare || room?.NetAmount || 0;
  const totalTax = room?.TotalTax || room?.NetTax || 0;
  const baseFare = totalFare - totalTax;

  const cancelPolicies =
    room?.CancelPolicies || displayRoom?.CancelPolicies || [];
  const freePolicy = cancelPolicies.find((p) => p.CancellationCharge === 0);
  const paidPolicy = cancelPolicies.find((p) => p.CancellationCharge > 0);

  const freeCancelFrom = freePolicy?.FromDate;
  const freeCancelTo = paidPolicy
    ? subtractOneSecond(paidPolicy.FromDate)
    : room?.LastCancellationDeadline;

  const paidCancelFrom = paidPolicy?.FromDate;
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
      <div className="bg-linear-to-r from-[#C9A84C] to-[#C9A84C] px-6 py-4 flex items-center gap-2.5">
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
          <h4 className="text-base font-extrabold text-[#0A203E] leading-snug mb-1">
          {displaySearchParams?.rooms?.length} <span className="text-[#C9A84C]">X</span> {roomNameDisplay}
          </h4>

          {room?.BeddingGroup && (
             <div className="flex items-start gap-1.5 text-[12px] text-slate-500 mb-3">
               <MdKingBed className="text-slate-400 mt-0.5 shrink-0" size={14} />
               <span className="leading-snug">{room.BeddingGroup}</span>
             </div>
          )}

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
                Inclusions{" "}( <span className="text-[#C9A84C]"> {displaySearchParams?.rooms?.length} X rooms </span>)
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

            {/* Supplements */}
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Supplements
              </p>
              {room?.Supplements?.some((s) => s?.length > 0) ? (
                <div className="flex flex-col gap-4">
                  {room.Supplements.map(
                    (roomSup, roomIdx) =>
                      roomSup?.length > 0 && (
                        <div key={roomIdx} className="space-y-2">
                          {room.Supplements.length > 1 && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              Room {roomIdx + 1}
                            </p>
                          )}
                          <div className="flex flex-col gap-2">
                            {roomSup.map((sup, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-slate-200 bg-white p-3 flex justify-between items-center shadow-sm hover:border-[#C9A84C]/50 transition-all"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 capitalize">
                                    {sup.Description?.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {sup.Type?.replace(/([A-Z])/g, " $1").trim()}
                                  </span>
                                </div>
                                <div className="text-right flex flex-col">
                                  <span className="text-sm font-black text-[#C9A84C]">
                                    {sup.Price === 0
                                      ? "Included"
                                      : `${sup.Currency} ${sup.Price}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center gap-2">
                  <FiInfo size={13} className="text-[#C9A84C]" />
                  <span className="text-[11px] text-slate-500">
                    No supplements are available for this room
                  </span>
                </div>
              )}
            </div>

            {/* Fare Breakdown */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Fare Breakdown
              </p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {/* Per-night rates from DayRates */}
                  {/* {dayRates?.[0]?.length > 0 && (
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
                  )} */}
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
                  <div className="flex justify-between px-4 py-3 bg-linear-to-r from-cyan-50 to-teal-50">
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
                  {freeCancelFrom && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-100 rounded-xl px-3 py-2.5 mb-2">
                      <FiCheckCircle
                        size={14}
                        className="text-emerald-500 shrink-0"
                      />
                      <p className="text-[12px] text-emerald-700 font-semibold leading-relaxed">
                        Free cancellation from <strong>{freeCancelFrom}</strong>
                        {freeCancelTo && (
                          <>
                            {" "}
                            to <strong>{freeCancelTo}</strong>
                          </>
                        )}
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
                  {/* {lastCancelDeadline && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-100 rounded-xl px-3 py-2.5 mb-2">
                      <FiClock size={14} className="text-red-500 shrink-0" />
                      <p className="text-[12px] text-red-700 font-semibold">
                        Last cancellation deadline:{" "}
                        <strong>{lastCancelDeadline}</strong>
                      </p>
                    </div>
                  )} */}
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
export function InfoCell({ icon: Icon, label, value }) {
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