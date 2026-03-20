// HotelBookNow.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MdArrowBack,
  MdHotel,
  MdCheckCircle,
  MdInfo,
  MdVerifiedUser,
  MdLocationOn,
  MdCalendarToday,
} from "react-icons/md";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiGlobe,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import {
  fetchHotelRequestById,
  executeHotelBooking,
} from "../../../Redux/Actions/hotelBooking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import Swal from "sweetalert2";
import { Country } from "country-state-city";

/* ─── Helpers ─── */
const countries = Country.getAllCountries();

function countryName(isoCode) {
  return countries.find((c) => c.isoCode === isoCode)?.name || isoCode || "—";
}

function fmt(dateStr, opts) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", opts);
}

/* ─── Sub-components ─── */
function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
  );
}

function Stars({ count = 0 }) {
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

function GuestField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const diffTime = outDate - inDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 1;
}

/* ─── Main ─── */
const HotelBookNow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { loading: actionLoading } = useSelector(
    (state) => state.hotelBookings,
  );

  const [bookingRequest, setBookingRequest] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoadError("No booking ID provided.");
      setFetching(false);
      return;
    }
    dispatch(fetchHotelRequestById(id))
      .unwrap()
      .then((res) => {
        setBookingRequest(res);
        setFetching(false);
      })
      .catch((err) => {
        setLoadError(err || "Failed to load booking details.");
        setFetching(false);
      });
  }, [id, dispatch]);

  /* Derived */
  const travelers = bookingRequest?.travellers || [];
  const purposeOfTravel = bookingRequest?.purposeOfTravel || "";
  const approvedBy = bookingRequest?.approvedBy || null;
  const hotelReq = bookingRequest?.hotelRequest || {};
  const snapshot = bookingRequest?.bookingSnapshot || {};
  const pricing = bookingRequest?.pricingSnapshot || {};

  const selectedHotel = hotelReq.selectedHotel || {};
  const selectedRoom = hotelReq.selectedRoom || {};
  const rawRoom = selectedRoom.rawRoomData || {};

  const hotel = {
    name: selectedHotel.hotelName || "Hotel",
    rating: selectedHotel.starRating || 0,
    address: selectedHotel.address || "",
    city: selectedHotel.city || "",
    image: rawRoom.images?.[0] || "/placeholder-hotel.jpg",
  };

  const checkIn = hotelReq.checkInDate || snapshot.checkInDate;
  const checkOut = hotelReq.checkOutDate || snapshot.checkOutDate;
  const room = {
    typeName: rawRoom.Name?.[0] || "Room",
    currency: selectedRoom.currency || "INR",
    nights: calculateNights(checkIn, checkOut),
    cancellationPolicies: selectedRoom.cancelPolicies || [],
    inclusions: selectedRoom.inclusion ? selectedRoom.inclusion.split(",") : [],
    mealType: selectedRoom.mealType,
    refundable: selectedRoom.isRefundable,
  };
  const roomCount = hotelReq.noOfRooms || snapshot.roomCount || 1;
  const totalAdults =
    hotelReq.roomGuests?.reduce((sum, r) => sum + (r.noOfAdults || 0), 0) ||
    travelers.length;

  const totalFare = selectedRoom.totalFare || pricing.totalAmount || 0;
  const tax = selectedRoom.totalTax || 0;
  const baseFare = totalFare - tax;
  if (!baseFare && !tax && totalFare) {
    baseFare = Math.round(totalFare * 0.85);
    tax = totalFare - baseFare;
  }

  const isApproved = bookingRequest?.requestStatus === "approved";

  const handleBookNow = async () => {
    const result = await Swal.fire({
      title: "Confirm Booking",
      html: `<p style="color:#475569;font-size:14px">Confirm reservation at <strong>${hotel.name}</strong>?<br/>This cannot be undone.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Book Now",
      cancelButtonText: "Go Back",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          return await dispatch(executeHotelBooking(id)).unwrap();
        } catch (e) {
          Swal.showValidationMessage(`Booking failed: ${e}`);
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
  };

  const status = bookingRequest?.requestStatus;

  const getCompletedStep = () => {
    switch (status) {
      case "pending_approval":
        return 2;
      case "approved":
        return 3;
      case "completed":
        return 4;
      default:
        return 1;
    }
  };

  const completedStep = getCompletedStep();

  const steps = [
    { num: 1, label: "Search & Select" },
    { num: 2, label: "Review & Request" },
    { num: 3, label: "Approval" },
    { num: 4, label: "Confirm Booking" },
  ];

  const statusConfig = {
    draft: {
      label: "Draft",
      sub: "Not Submitted",
      className: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    },
    pending_approval: {
      label: "Pending",
      sub: "Waiting for Approval",
      className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    approved: {
      label: "Approved",
      sub: "Ready to Book",
      className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    rejected: {
      label: "Rejected",
      sub: "Request Denied",
      className: "text-red-400 bg-red-400/10 border-red-400/20",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.draft;

  const getStatusStyles = (status) => {
    switch (status) {
      case "approved":
        return {
          icon: <MdVerifiedUser size={18} />,
          color: "emerald",
        };
      case "pending_approval":
        return {
          icon: <FiAlertCircle size={18} />,
          color: "amber",
        };
      case "rejected":
        return {
          icon: <FiAlertCircle size={18} />,
          color: "red",
        };
      default:
        return {
          icon: <FiAlertCircle size={18} />,
          color: "slate",
        };
    }
  };

  const stylesMap = {
    emerald: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-400/30",
      text: "text-emerald-400",
    },
    amber: {
      bg: "bg-amber-500/15",
      border: "border-amber-400/30",
      text: "text-amber-400",
    },
    red: {
      bg: "bg-red-500/15",
      border: "border-red-400/30",
      text: "text-red-400",
    },
    slate: {
      bg: "bg-slate-500/15",
      border: "border-slate-400/30",
      text: "text-slate-400",
    },
  };

  const statusUI = getStatusStyles(status);
  const s = stylesMap[statusUI.color];

  /* ── Loading ── */
  if (fetching)
    return (
      <div className="min-h-screen bg-slate-100">
        <EmployeeHeader />
        <div className="h-64 bg-slate-200 animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-56" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );

  /* ── Error ── */
  if (loadError || !bookingRequest)
    return (
      <div className="min-h-screen bg-slate-50">
        <EmployeeHeader />
        <div className="max-w-6xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <FiAlertCircle size={26} className="text-red-400" />
          </div>
          <p className="text-slate-600 font-semibold">
            {loadError || "Booking not found."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition"
          >
            <MdArrowBack size={16} /> Go Back
          </button>
        </div>
      </div>
    );

  /* ── Main ── */
  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <EmployeeHeader />

      {/* ══════════════════════════════════
          DARK HERO BAND
      ══════════════════════════════════ */}
      <div className="relative bg-[#0d1b2a] overflow-hidden">
        {/* Blurred bg image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${hotel.image})` }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#0d1b2a] via-[#0d1b2a]/90 to-transparent" />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-0">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition mb-6"
          >
            <MdArrowBack size={14} /> Back to Approvals
          </button>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end pb-8">
            {/* Hotel image */}
            <div className="relative shrink-0">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl border-2 border-white/10 shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#0d1b2a] flex items-center justify-center shadow-lg">
                <MdVerifiedUser size={14} className="text-white" />
              </div>
            </div>

            {/* Hotel name + meta */}
            <div className="flex-1 min-w-0">
              <div
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border ${currentStatus.className}`}
              >
                <MdCheckCircle size={11} />
                {currentStatus.label} & {currentStatus.sub}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                {hotel.name}
              </h1>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                <Stars count={hotel.rating} />
                <span className="text-white/30 text-xs">·</span>
                <span className="flex items-center gap-1 text-xs text-white/55">
                  <MdLocationOn size={12} className="text-emerald-400" />
                  {hotel.address}
                </span>
              </div>
            </div>

            {/* Date band — right side */}
            <div className="flex gap-2 shrink-0">
              <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-white/40 text-[10px] font-semibold uppercase mb-1">
                  Check-in
                </p>
                <p className="text-white font-black text-sm">
                  {fmt(checkIn, { day: "2-digit", month: "short" })}
                </p>
                <p className="text-white/35 text-[10px]">
                  {fmt(checkIn, { weekday: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center px-1 gap-1">
                <div className="w-px h-4 bg-white/15" />
                <span className="text-white font-black text-lg leading-none">
                  {room.nights}
                </span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest">
                  Nts
                </span>
                <div className="w-px h-4 bg-white/15" />
              </div>
              <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-white/40 text-[10px] font-semibold uppercase mb-1">
                  Check-out
                </p>
                <p className="text-white font-black text-sm">
                  {fmt(checkOut, { day: "2-digit", month: "short" })}
                </p>
                <p className="text-white/35 text-[10px]">
                  {fmt(checkOut, { weekday: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div
          className="h-6 bg-slate-100"
          style={{ clipPath: "ellipse(60% 100% at 50% 100%)" }}
        />
      </div>

      {/* ══════════════════════════════════
          PROGRESS STEPPER
      ══════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 -mt-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-center gap-0">
            {steps.map((step, idx) => {
              const isDone = step.num <= completedStep;

              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
          ${
            isDone
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-white border-slate-300 text-slate-400"
          }`}
                    >
                      {isDone ? <MdCheckCircle size={14} /> : step.num}
                    </div>

                    <span
                      className={`text-[10px] font-semibold whitespace-nowrap hidden sm:block
          ${isDone ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 rounded-full max-w-20
          ${step.num < completedStep ? "bg-emerald-400" : "bg-slate-200"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          BODY
      ══════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── LEFT (3/5) ─── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Room strip */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#0A4D68]/8 flex items-center justify-center">
                    <MdHotel size={14} className="text-[#0A4D68]" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {room.typeName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FiUser size={11} /> {totalAdults} Adult
                    {totalAdults !== 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>
                    {roomCount} Room{roomCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {room.inclusions.length > 0 && (
                <div className="px-5 py-3 flex flex-wrap gap-1.5">
                  {room.inclusions.slice(0, 6).map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium"
                    >
                      <FiCheckCircle size={10} /> {item.trim()}
                    </span>
                  ))}
                </div>
              )}

              {room.cancellationPolicies?.[0] && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-start gap-2">
                  <MdInfo
                    size={14}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    {room.cancellationPolicies[0]?.ChargeType
                      ? `From ${room.cancellationPolicies[0].FromDate} - ${room.cancellationPolicies[0].ChargeType} ${room.cancellationPolicies[0].CancellationCharge}`
                      : "Cancellation policy applies"}
                  </p>
                </div>
              )}
            </div>

            {/* Guest cards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <MdVerifiedUser size={13} className="text-emerald-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-700">
                  Verified Guests
                  <span className="ml-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {travelers.length}{" "}
                    {travelers.length === 1 ? "Guest" : "Guests"}
                  </span>
                </h2>
              </div>

              {travelers.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
                  No guest details available.
                </div>
              )}

              {travelers.map((t, index) => (
                <div
                  key={t._id || t.id || index}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-linear-to-r from-slate-50 to-white border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center text-sm font-black text-white shadow-sm">
                        {(t.firstName?.[0] || "G").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {t.title} {t.firstName} {t.middleName || ""}{" "}
                          {t.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Guest {index + 1}
                        </p>
                      </div>
                    </div>
                    {t.isLeadPassenger && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#0A4D68] bg-[#0A4D68]/8 border border-[#0A4D68]/15 px-2.5 py-1 rounded-full">
                        Lead
                      </span>
                    )}
                  </div>

                  {/* 2-col info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    <div>
                      <GuestField icon={FiMail} label="Email" value={t.email} />
                      <GuestField
                        icon={FiPhone}
                        label="Phone"
                        value={t.phoneWithCode ? `+${t.phoneWithCode}` : "—"}
                      />
                      <GuestField
                        icon={FiGlobe}
                        label="Nationality"
                        value={countryName(t.nationality)}
                      />
                    </div>
                    <div>
                      <GuestField
                        icon={FiCalendar}
                        label="Date of Birth"
                        value={
                          t.dob
                            ? fmt(t.dob, {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"
                        }
                      />
                      <GuestField
                        icon={FiUser}
                        label="Age"
                        value={t.age ? `${t.age} yrs` : "—"}
                      />
                      {/* <GuestField
                        icon={FiMapPin}
                        label="Country"
                        value={t.countryCode || "—"}
                      /> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Purpose of Travel */}
            {purposeOfTravel && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-[#0A4D68]/8 flex items-center justify-center">
                    <FiShield size={12} className="text-[#0A4D68]" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">
                    Purpose of Travel
                  </h3>
                </div>
                <div className="relative pl-3 border-l-2 border-[#0A4D68]/20">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {purposeOfTravel}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT (2/5) sticky ─── */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 space-y-4">
              {/* Dark price + CTA card */}
              <div className="bg-linear-to-br from-[#0d1b2a] to-[#0A4D68] rounded-2xl p-5 text-white shadow-xl shadow-[#0A4D68]/20 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

                <div className="relative">
                  {/* Approval header */}
                  <div className="flex items-center gap-3 mb-5">
                    {/* Icon */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${s.bg} ${s.border}`}
                    >
                      <span className={s.text}>{statusUI.icon}</span>
                    </div>

                    {/* Text */}
                    <div className="flex flex-col">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-widest ${s.text}`}
                      >
                        {currentStatus.label}
                      </p>

                      <p className="text-sm font-extrabold text-white tracking-tight">
                        {currentStatus.sub}
                      </p>

                      {/* Optional: approver */}
                      {/* {status === "approved" && approvedBy?.name && (
                        <p className="text-[11px] text-white/40 mt-0.5">
                          Approved by{" "}
                          <span className="text-white/60 font-medium">
                            {approvedBy.name.firstName}{" "}
                            {approvedBy.name.lastName}
                          </span>
                        </p>
                      )} */}
                    </div>
                  </div>

                  {/* Approver info */}
                  {approvedBy && (
                    <div className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 space-y-1.5 mb-4">
                      {approvedBy.name && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Approved by</span>
                          <span className="font-bold text-white">
                            {`${approvedBy.name?.firstName || ""} ${approvedBy.name?.lastName || ""}`}
                          </span>
                        </div>
                      )}
                      {approvedBy.role && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Mail ID</span>
                          <span className="font-semibold text-white/80">
                            {approvedBy.email}
                          </span>
                        </div>
                      )}
                      {approvedBy.approvedAt && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Date</span>
                          <span className="font-semibold text-white/80">
                            {fmt(approvedBy.approvedAt, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fare */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Base Fare</span>
                      <span className="text-white/80 font-semibold">
                        ₹{(baseFare || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Taxes &amp; Fees</span>
                      <span className="text-white/80 font-semibold">
                        ₹{(tax || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                        Total
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">
                          ₹{totalFare.toLocaleString("en-IN")}
                        </span>
                        <p className="text-[10px] text-white/35 mt-0.5">
                          {room.currency} · incl. all taxes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleBookNow}
                    disabled={actionLoading || !isApproved}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg
  ${
    isApproved
      ? "bg-white text-[#0A4D68] hover:bg-emerald-50 active:scale-[0.98]"
      : "bg-slate-300 text-slate-500 cursor-not-allowed"
  }
`}
                  >
                    {!isApproved ? (
                      "Waiting for Approval"
                    ) : actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#0A4D68]/30 border-t-[#0A4D68] rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <MdCheckCircle size={16} className="text-emerald-600" />
                        Confirm & Book Now
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-white/30 text-center mt-3 leading-relaxed">
                    By confirming you agree to the{" "}
                    <span className="text-white/50 hover:text-white cursor-pointer underline decoration-dotted">
                      Terms
                    </span>{" "}
                    &amp;{" "}
                    <span className="text-white/50 hover:text-white cursor-pointer underline decoration-dotted">
                      Cancellation Policy
                    </span>
                    .
                  </p>
                </div>
              </div>

              {/* Quick summary strip */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <MdCalendarToday
                    size={14}
                    className="text-slate-400 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Stay Duration
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {fmt(checkIn, { day: "2-digit", month: "short" })} —{" "}
                      {fmt(checkOut, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-black text-[#0A4D68] bg-[#0A4D68]/8 px-2 py-0.5 rounded-lg">
                    {room.nights}N
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <FiUser size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Guests
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {travelers.length} traveller
                      {travelers.length !== 1 ? "s" : ""} · {roomCount} room
                      {roomCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <MdHotel size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Room Type
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {room.typeName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelBookNow;
