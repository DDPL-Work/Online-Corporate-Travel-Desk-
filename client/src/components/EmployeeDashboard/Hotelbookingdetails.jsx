// HotelBookingDetails.jsx
// Hotel booking details page — mirrors BookingDetails.jsx structure.
// Uses DB booking object + bookingResult.providerResponse (GetBookingDetailResult).

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
import { fetchBookedHotelDetails } from "../../Redux/Actions/hotelBooking.thunks";

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
      className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="bg-cyan-50 rounded-lg p-1.5 flex items-center justify-center">
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
    <div className="flex items-center gap-2 bg-white/[0.07] rounded-xl px-3 py-2.5 border border-white/10">
      <Icon size={13} className="text-white/50 shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-white leading-none">
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
          className="w-3.5 h-3.5 text-amber-400"
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
  const hotelReq = booking?.hotelRequest || {};
  const snapshot = booking?.bookingSnapshot || {};
  const result = booking?.bookingResult || {};
  const detail = bookingDetail || booking?.raw || {}; // GetBookingDetailResult
  const room = detail?.Rooms?.[0] || {};
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
    room?.RoomTypeName || selectedRoom?.roomTypeName || "Standard Room";
  const images = selectedRoom?.rawRoomData?.images || [];
  const heroImage = images[0] || null;

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

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl text-white relative"
      style={{
        background:
          "linear-gradient(140deg, #0d1b2a 0%, #0A4D68 60%, #088395 100%)",
      }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
        }}
      />

      {/* Hero image strip */}
      {heroImage && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={heroImage}
            alt={hotelName}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-[#0d1b2a]" />
        </div>
      )}

      <div className="relative p-6 grid gap-0">
        {/* ── ROW 1: Hotel name + status ── */}
        <div className="flex items-start gap-4 pb-5 border-b border-white/10">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <MdHotel size={22} className="text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black leading-tight truncate">
              {hotelName}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {starRating > 0 && <Stars count={starRating} />}
              {city && (
                <span className="flex items-center gap-1 text-[11px] text-white/55">
                  <MdLocationOn size={12} className="text-teal-400" />
                  {city}
                </span>
              )}
            </div>
            {address && (
              <p className="text-[11px] text-white/35 mt-1 leading-snug line-clamp-1">
                {address}
              </p>
            )}
          </div>
          <StatusPill status={executionStatus || "Confirmed"} />
        </div>

        {/* ── ROW 2: Check-in / nights / Check-out — 3-col grid ── */}
        <div className="grid grid-cols-[1fr_140px_1fr] items-center py-6 border-b border-white/10">
          {/* Check-in */}
          <div className="space-y-1">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
              Check-in
            </p>
            <p className="text-[40px] font-black tracking-tighter leading-none">
              {checkIn
                ? new Date(checkIn).getDate().toString().padStart(2, "0")
                : "—"}
            </p>
            <p className="text-base text-white/70 font-semibold">
              {fmtDate(checkIn, { month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-white/40">{fmtDay(checkIn)}</p>
          </div>

          {/* Connector */}
          <div className="flex flex-col items-center gap-1.5 px-2">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
              {nights} Night{nights !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-0 w-full">
              <span className="w-2 h-2 rounded-full border-2 border-white/30 shrink-0" />
              <div className="flex-1 relative flex items-center">
                <div className="w-full border-t border-dashed border-white/20" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-[45%] text-sm select-none">
                  🏨
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
            </div>
            <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">
              {roomType}
            </span>
          </div>

          {/* Check-out */}
          <div className="text-right space-y-1">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
              Check-out
            </p>
            <p className="text-[40px] font-black tracking-tighter leading-none">
              {checkOut
                ? new Date(checkOut).getDate().toString().padStart(2, "0")
                : "—"}
            </p>
            <p className="text-base text-white/70 font-semibold">
              {fmtDate(checkOut, { month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-white/40">{fmtDay(checkOut)}</p>
          </div>
        </div>

        {/* ── ROW 3: Meta chips ── */}
        <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-white/10">
          <MetaChip
            icon={MdKingBed}
            label="Room Type"
            value={roomType?.split(",")[0] || "Room"}
          />
          <MetaChip
            icon={FiCoffee}
            label="Meal Plan"
            value={
              selectedRoom?.mealType || room?.Inclusion?.split(" ")?.[0] || "—"
            }
          />
          <MetaChip
            icon={FiShield}
            label="Refundable"
            value={selectedRoom?.isRefundable ? "Yes" : "No"}
          />
        </div>

        {/* ── ROW 4: Confirmation details ── */}
        {paymentSuccessful && (
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                Confirmation No.
              </p>
              {confirmationNo ? (
                <p className="text-xl font-black tracking-[0.12em] font-mono text-white">
                  {confirmationNo}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <FiRefreshCw
                    size={13}
                    className="text-white/40 animate-spin"
                  />
                  <span className="text-sm text-white/40 font-semibold">
                    Awaiting confirmation…
                  </span>
                </div>
              )}
              {invoiceNo && (
                <p className="text-[11px] text-white/35 mt-1">
                  Invoice: {invoiceNo}
                </p>
              )}
            </div>
            {tboRef && (
              <div className="sm:text-right">
                <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                  TBO Reference
                </p>
                <p className="text-base font-black tracking-wider font-mono text-white/80">
                  {tboRef}
                </p>
                {bookingRefNo && (
                  <p className="text-[11px] text-white/35 mt-1 truncate">
                    Ref: {bookingRefNo}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment not done */}
        {!paymentSuccessful && (
          <div className="pt-4 flex items-center gap-2 text-white/30">
            <FiAlertCircle size={14} />
            <p className="text-xs font-medium">
              Complete payment to view confirmation details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Image Gallery                                                  */
/* ─────────────────────────────────────────────────────────────── */
function ImageGallery({ images }) {
  const [active, setActive] = useState(0);
  if (!images?.length) return null;

  return (
    <BentoCard className="col-span-2">
      <CardLabel icon={MdHotel} label="Hotel Gallery" />
      <div className="space-y-3">
        <div className="relative w-full h-64 rounded-xl overflow-hidden">
          <img
            src={images[active]}
            alt="Hotel"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 10).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                active === i
                  ? "border-teal-500 scale-105"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
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
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full"
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
    <BentoCard>
      <CardLabel icon={FiShield} label="Cancellation Policy" />
      {lastCancellationDate && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
          <MdInfo className="text-amber-500 shrink-0" size={14} />
          Free cancellation until{" "}
          <strong>{fmtDate(lastCancellationDate)}</strong>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                From Date
              </th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                To Date
              </th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Charge Type
              </th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
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
                <td className="px-3 py-2.5 text-xs text-slate-700 font-medium">
                  {p.FromDate || fmtDate(p.FromDate)}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {p.ToDate || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.CancellationCharge === 0
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {typeLabel(p.ChargeType)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-sm">
                  {p.CancellationCharge === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <span className="text-red-600">
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
    <BentoCard className="col-span-2">
      <CardLabel icon={FiInfo} label="Hotel Policies & Conditions" />
      <ul className="space-y-2.5">
        {filtered.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5" />
            {c}
          </li>
        ))}
      </ul>
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
  const { selectedBookingDetails: booking, loading } = useSelector(
    (s) => s.hotelBookings,
  );

  useEffect(() => {
    if (id && !booking) {
      dispatch(fetchBookedHotelDetails(id));
    }
  }, [id, booking, dispatch]);

  /* ── Loading ── */
  if (loading || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-11 h-11 rounded-full border-[3px] border-slate-200 border-t-teal-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
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
  const traveller =
    booking?.travellers?.[0] || booking?.raw?.Rooms?.[0]?.HotelPassenger?.[0];

  // GetBookingDetailResult from providerResponse
  const bookingDetail = booking?.raw || null;
  const detailRoom = booking?.raw?.Rooms?.[0] || {};
  const priceBreakUp = detailRoom?.PriceBreakUp || {};

  const paymentSuccessful =
    booking.payment?.status === "completed" || !!booking?.confirmationNo;
  const executionStatus = booking.executionStatus || "";
  const isConfirmed =
    executionStatus === "voucher_generated" || executionStatus === "confirmed";

  const images = booking?.hotelRequest?.selectedRoom?.rawRoomData?.images || [];

  // Cancellation policies — prefer GetBookingDetailResult detail
  const cancelPolicies = detailRoom?.CancelPolicies?.length
    ? detailRoom.CancelPolicies
    : selectedRoom.cancelPolicies || [];

  const amenities = detailRoom?.Amenities || [];

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
  const perNight = nights ? Math.round(totalFare / nights) : 0;

  // Rate conditions
  const rateConditions = bookingDetail?.RateConditions || [];

  const downloadInvoice = () => {
    const printWindow = window.open("", "_blank");
    const hotelName =
      detail?.HotelName ||
      snapshot?.hotelName ||
      selectedHotel?.hotelName ||
      "Hotel";
    const checkIn =
      detail?.CheckInDate || snapshot?.checkInDate || hotelReq?.checkInDate;
    const checkOut =
      detail?.CheckOutDate || snapshot?.checkOutDate || hotelReq?.checkOutDate;
    const guestName =
      `${traveller?.title || ""} ${traveller?.firstName || ""} ${traveller?.lastName || ""}`.trim();
    const confirmationNo =
      detail?.ConfirmationNo || result?.hotelBookingId || "—";
    const invoiceNo =
      detail?.InvoiceNo ||
      result?.providerResponse?.BookResult?.InvoiceNumber ||
      "—";

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Invoice – ${booking.bookingReference || "Hotel Booking"}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 40px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0A4D68; padding-bottom: 20px; margin-bottom: 28px; }
        .brand { font-size: 22px; font-weight: 900; color: #0A4D68; letter-spacing: -0.5px; }
        .brand span { color: #088395; }
        .invoice-meta { text-align: right; }
        .invoice-meta .invoice-title { font-size: 26px; font-weight: 900; color: #0A4D68; letter-spacing: 2px; text-transform: uppercase; }
        .invoice-meta p { color: #64748b; font-size: 11px; margin-top: 4px; }
        .invoice-meta strong { color: #1e293b; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-block p { font-size: 12px; color: #475569; margin-bottom: 4px; }
        .info-block strong { color: #0f172a; font-weight: 700; }
        .info-block .name { font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
        .info-block .hotel-name { font-size: 18px; font-weight: 900; color: #0A4D68; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        tr:last-child td { border-bottom: none; }
        .total-row { background: #f8fafc; font-weight: 900; font-size: 14px; }
        .total-row td { padding: 14px 12px; color: #0A4D68; border-top: 2px solid #0A4D68; }
        .highlight-box { background: linear-gradient(135deg, #f0fdfc, #e6f7f8); border: 1px solid #99e6f0; border-radius: 10px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
        .highlight-box .label { font-size: 11px; font-weight: 700; color: #0A4D68; text-transform: uppercase; letter-spacing: 1px; }
        .highlight-box .amount { font-size: 28px; font-weight: 900; color: #0A4D68; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 11px; }
        .status-badge { display: inline-block; background: #d1fae5; color: #065f46; border-radius: 20px; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">travel<span>desk</span></div>
          <p style="color:#64748b;font-size:11px;margin-top:4px;">Hotel Booking Invoice</p>
        </div>
        <div class="invoice-meta">
          <div class="invoice-title">Invoice</div>
          <p>Invoice No: <strong>${invoiceNo}</strong></p>
          <p>Booking Ref: <strong>${booking.bookingReference || "—"}</strong></p>
          <p>Date: <strong>${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong></p>
          <div style="margin-top:8px"><span class="status-badge">Confirmed</span></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="section">
          <div class="section-title">Hotel Details</div>
          <div class="info-block">
            <div class="hotel-name">${hotelName}</div>
            <p style="margin-top:6px">${detail?.AddressLine1 || selectedHotel?.address || "—"}</p>
            <p>${detail?.City || selectedHotel?.city || ""}</p>
            <p style="margin-top:8px">⭐ ${detail?.StarRating || selectedHotel?.starRating || "—"} Star Hotel</p>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Guest Details</div>
          <div class="info-block">
            <div class="name">${guestName || "—"}</div>
            <p>${traveller?.email || "—"}</p>
            <p>${traveller?.phoneWithCode || "—"}</p>
            <p style="margin-top:8px">Nationality: <strong>${traveller?.nationality || "—"}</strong></p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Stay Details</div>
        <div class="grid-2">
          <div class="info-block">
            <p>Check-in: <strong>${checkIn ? new Date(checkIn).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</strong></p>
            <p>Check-out: <strong>${checkOut ? new Date(checkOut).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</strong></p>
            <p>Duration: <strong>${nights} Night${nights !== 1 ? "s" : ""}</strong></p>
          </div>
          <div class="info-block">
            <p>Room Type: <strong>${detailRoom?.RoomTypeName || selectedRoom?.roomTypeName || "Standard Room"}</strong></p>
            <p>No. of Rooms: <strong>${hotelReq.noOfRooms || 1}</strong></p>
            <p>Confirmation No: <strong>${confirmationNo}</strong></p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Fare Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Room Rate (Base Fare)</td><td style="text-align:right">₹${Number(baseFare).toLocaleString("en-IN")}</td></tr>
            <tr><td>Taxes & Fees</td><td style="text-align:right">₹${Number(totalTax).toLocaleString("en-IN")}</td></tr>
            ${agentComm > 0 ? `<tr><td>Agent Commission</td><td style="text-align:right">₹${Number(agentComm).toLocaleString("en-IN")}</td></tr>` : ""}
            <tr class="total-row"><td>Total Amount Paid</td><td style="text-align:right">₹${Number(totalFare).toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
        <div class="highlight-box">
          <div>
            <div class="label">Total Amount Paid</div>
            <div style="font-size:11px;color:#475569;margin-top:3px">${nights} Night${nights !== 1 ? "s" : ""} · ${pricing.currency || "INR"}</div>
          </div>
          <div class="amount">₹${Number(totalFare).toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div class="footer">
        <div>TBO Ref: ${detail?.TBOReferenceNo || "—"} · Booking Ref: ${booking.bookingReference || "—"}</div>
        <div>Generated on ${new Date().toLocaleString("en-IN")}</div>
      </div>
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Sticky nav bar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-[60px] px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <FiArrowLeft size={15} /> Back
        </button>
        <span className="w-px h-5 bg-slate-200" />
        <h1 className="text-[15px] font-bold text-slate-900">
          Hotel Booking Details
        </h1>

        <div className="ml-auto flex items-center gap-3">
          {isConfirmed && (
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-bold">
              <MdVerifiedUser size={12} /> Voucher Issued
            </span>
          )}
          {booking.bookingReference && (
            <span className="text-xs text-slate-400 font-medium">
              Ref:{" "}
              <strong className="text-slate-900">
                {booking.bookingReference}
              </strong>
            </span>
          )}
          {paymentSuccessful && (
            <button
              onClick={downloadInvoice}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all duration-150 cursor-pointer border-none"
            >
              <FiDownload size={13} />
              Download Invoice
            </button>
          )}
        </div>
      </header>

      {/* ── Bento grid ── */}
      <main className="max-w-7xl mx-auto px-5 py-8 pb-24 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hotel hero card — full width */}
        <div className="md:col-span-2">
          <HotelHeroCard
            booking={booking}
            bookingDetail={bookingDetail}
            paymentSuccessful={paymentSuccessful}
          />
        </div>

        {/* Image gallery — full width */}
        {images.length > 0 && <ImageGallery images={images} />}

        {/* ── Traveller card ── */}
        <BentoCard>
          <CardLabel icon={FiUser} label="Guest Details" />
          <div className="mb-4">
            <p className="text-lg font-extrabold text-slate-900 leading-snug">
              {traveller?.title} {traveller?.firstName} {traveller?.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-1">{traveller?.email}</p>
          </div>
          <InfoRow label="Phone" value={traveller?.phoneWithCode} />
          <InfoRow label="Gender" value={traveller?.gender} />
          <InfoRow
            label="Age"
            value={traveller?.age ? `${traveller.age} yrs` : "—"}
          />
          <InfoRow label="Nationality" value={traveller?.nationality} />
          <InfoRow
            label="Lead Passenger"
            value={traveller?.isLeadPassenger ? "Yes" : "No"}
            accent
          />
        </BentoCard>

        {/* ── Fare summary ── */}
        <BentoCard>
          <CardLabel icon={FiCreditCard} label="Fare Summary" />
          <InfoRow
            label="Room Rate"
            value={`₹${Number(baseFare).toLocaleString("en-IN")}`}
          />
          <InfoRow
            label="Taxes & Fees"
            value={`₹${Number(totalTax).toLocaleString("en-IN")}`}
          />
          {agentComm > 0 && (
            <InfoRow
              label="Agent Commission"
              value={`₹${Number(agentComm).toLocaleString("en-IN")}`}
              accent
            />
          )}
          <InfoRow
            label="Per Night"
            value={`₹${Number(perNight).toLocaleString("en-IN")}`}
          />
          <InfoRow label="Nights" value={nights} />
          <InfoRow label="Currency" value={pricing.currency || "INR"} />
          <InfoRow
            label="Refundable"
            value={selectedRoom.isRefundable ? "Yes" : "No"}
            accent={selectedRoom.isRefundable}
          />
          <div className="mt-4 bg-linear-to-r from-cyan-50 to-teal-50 rounded-xl px-4 py-4 flex justify-between items-center border border-teal-100">
            <span className="text-sm text-teal-700 font-semibold">
              Total Paid
            </span>
            <span className="text-2xl font-black text-slate-900">
              ₹{Number(totalFare).toLocaleString("en-IN")}
            </span>
          </div>
          {paymentSuccessful && (
            <button
              onClick={downloadInvoice}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 active:scale-[0.98] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer border-none"
            >
              <FiDownload size={13} />
              Download Invoice (PDF)
            </button>
          )}
        </BentoCard>

        {/* ── Tax breakdown (if available from provider) ── */}
        {/* {priceBreakUp.TaxBreakup?.length > 0 && (
          <BentoCard>
            <CardLabel icon={MdReceipt} label="Tax Breakdown" />
            {priceBreakUp.TaxBreakup.filter((t) => t.TaxAmount > 0).length ===
            0 ? (
              <p className="text-xs text-slate-400">
                No individual tax components available.
              </p>
            ) : (
              priceBreakUp.TaxBreakup.filter((t) => t.TaxAmount > 0).map(
                (t, i) => (
                  <InfoRow
                    key={i}
                    label={t.TaxType?.replace("Tax_", "") || "Tax"}
                    value={`₹${t.TaxAmount}`}
                  />
                ),
              )
            )}
          </BentoCard>
        )} */}

        {/* ── Payment & Booking status — full width ── */}
        <BentoCard className="col-span-2">
          <CardLabel icon={FiCreditCard} label="Payment & Booking Status" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Payment */}
            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${paymentSuccessful ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {paymentSuccessful ? (
                  <FiCheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <FiAlertCircle size={16} className="text-amber-500" />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${paymentSuccessful ? "text-emerald-600" : "text-amber-600"}`}
                >
                  Payment
                </span>
              </div>
              <p
                className={`text-lg font-black ${paymentSuccessful ? "text-emerald-800" : "text-amber-800"}`}
              >
                {paymentSuccessful ? "Completed" : "Pending"}
              </p>
            </div>

            {/* Execution */}
            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${isConfirmed ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isConfirmed ? (
                  <MdVerifiedUser size={16} className="text-emerald-500" />
                ) : (
                  <FiRefreshCw
                    size={16}
                    className="text-amber-500 animate-spin"
                  />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${isConfirmed ? "text-emerald-600" : "text-amber-600"}`}
                >
                  InVoice
                </span>
              </div>
              <p
                className={`text-lg font-black ${isConfirmed ? "text-emerald-800" : "text-amber-800"}`}
              >
                {isConfirmed ? "Issued" : "Processing…"}
              </p>
            </div>

            {/* Room count */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <MdHotel size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Rooms
                </span>
              </div>
              <p className="text-lg font-black text-slate-800">
                {hotelReq.noOfRooms || 1}
              </p>
            </div>

            {/* Purpose */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <FiBriefcase size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Purpose
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 line-clamp-2">
                {booking.purposeOfTravel || "—"}
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Room description */}
        {detailRoom?.RoomDescription && (
          <BentoCard>
            <CardLabel icon={MdKingBed} label="Room Description" />
            <div
              className="text-xs text-slate-600 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: detailRoom.RoomDescription.replace(/<p><\/p>/g, ""),
              }}
            />
          </BentoCard>
        )}

        {/* Inclusions */}
        {(selectedRoom.inclusion || detailRoom?.Inclusion) && (
          <BentoCard>
            <CardLabel icon={FiCoffee} label="Inclusions" />
            <div className="flex flex-wrap gap-2">
              {(selectedRoom.inclusion || detailRoom?.Inclusion || "")
                .split(" ")
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium"
                  >
                    <MdCheckCircle size={11} /> {item}
                  </span>
                ))}
            </div>
          </BentoCard>
        )}

        {/* Amenities */}
        {amenities.length > 0 && <AmenitiesCard amenities={amenities} />}

        {/* Cancellation policy */}
        {cancelPolicies.length > 0 && (
          <div className="md:col-span-2">
            <CancellationCard
              policies={cancelPolicies}
              lastCancellationDate={
                detailRoom?.LastCancellationDate ||
                bookingDetail?.LastCancellationDate
              }
            />
          </div>
        )}

        {/* Hotel policies */}
        {rateConditions.length > 0 && (
          <HotelPoliciesCard conditions={rateConditions} />
        )}

        {/* Booking reference footer */}
        <BentoCard className="col-span-2">
          <CardLabel icon={MdReceipt} label="Booking References" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                Booking Ref
              </p>
              <p className="text-sm font-black text-slate-800 font-mono">
                {booking.bookingReference || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                Confirmation No.
              </p>
              <p className="text-sm font-black text-slate-800 font-mono">
                {bookingDetail?.ConfirmationNo || result?.hotelBookingId || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                Invoice No.
              </p>
              <p className="text-sm font-black text-slate-800 font-mono">
                {bookingDetail?.InvoiceNo ||
                  result?.providerResponse?.BookResult?.InvoiceNumber ||
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                TBO Reference
              </p>
              <p className="text-sm font-black text-slate-800 font-mono">
                {bookingDetail?.TBOReferenceNo || "—"}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-600">Created: </span>
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
            <div>
              <span className="font-semibold text-slate-600">Approved: </span>
              {booking.approvedAt ? fmtDate(booking.approvedAt) : "—"}
            </div>
            <div>
              <span className="font-semibold text-slate-600">
                Booking Date:{" "}
              </span>
              {bookingDetail?.BookingDate
                ? fmtDate(bookingDetail.BookingDate)
                : "—"}
            </div>
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
