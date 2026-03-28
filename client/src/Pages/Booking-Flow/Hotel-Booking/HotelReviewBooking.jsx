//HotelReviewBooking.jsx  — Redesigned Layout

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
} from "react-icons/fi";
import { FaUserPlus, FaHotel } from "react-icons/fa";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import {
  createHotelBookingRequest,
  fetchHotelRequestById,
  executeHotelBooking,
} from "../../../Redux/Actions/hotelBooking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import Swal from "sweetalert2";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Country } from "country-state-city";

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
      <div className="relative rounded-xl overflow-hidden bg-slate-100 h-52 sm:h-64 group">
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
              className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${active === i ? "border-[#0A4D68] scale-105" : "border-transparent hover:border-slate-300"}`}
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
              className="shrink-0 w-14 h-10 rounded-lg bg-slate-100 border-2 border-transparent hover:border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 cursor-pointer border-none"
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
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              From Date
            </th>
            <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Charge Type
            </th>
            <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Cancellation Charge
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
                {p.FromDate || "—"}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.CancellationCharge === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
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
/*  Full-Width Hotel Hero Banner                                   */
/* ─────────────────────────────────────────────────────────────── */
function HotelHeroBanner({
  displayHotel,
  displaySearchParams,
  displayRoom,
  selectedRoom,
  totalAdults,
}) {
  const nights = calculateNights(
  displaySearchParams?.checkIn,
  displaySearchParams?.checkOut
);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Hero image strip */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-200">
        <img
          src={displayHotel?.images?.[0] || "/placeholder-hotel.jpg"}
          alt={displayHotel?.name}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Star rating badge */}
        {displayHotel?.rating > 0 && (
          <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
            {Array.from({ length: displayHotel.rating }).map((_, i) => (
              <svg
                key={i}
                className="w-3 h-3 text-amber-400"
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

        {/* Hotel name + location overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-1 drop-shadow">
            {displayHotel?.name}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-white/80">
            <MdLocationOn size={15} className="text-white/70 shrink-0" />
            <span className="leading-snug">{displayHotel?.address}</span>
          </div>
        </div>
      </div>

      {/* Check-in / out / room strip — full width */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
        {/* Check-in */}
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Check-in
          </p>
          <p className="text-sm font-bold text-slate-800">
            {displaySearchParams?.checkIn
              ? new Date(displaySearchParams.checkIn).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short", year: "numeric" },
                )
              : "—"}
          </p>
          <p className="text-[11px] text-slate-400">
            {displaySearchParams?.checkIn
              ? new Date(displaySearchParams.checkIn).toLocaleDateString(
                  "en-GB",
                  { weekday: "long" },
                )
              : ""}
          </p>
        </div>

        {/* Nights */}
        <div className="px-5 py-4 flex flex-col items-center justify-center gap-0.5 bg-[#0A4D68]/3">
          <div className="w-8 h-8 rounded-full bg-[#0A4D68]/10 flex items-center justify-center mb-1">
            <FiClock size={14} className="text-[#0A4D68]" />
          </div>
          <span className="text-lg font-black text-[#0A4D68]">{nights}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Night{nights !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Check-out */}
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Check-out
          </p>
          <p className="text-sm font-bold text-slate-800">
            {displaySearchParams?.checkOut
              ? new Date(displaySearchParams.checkOut).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short", year: "numeric" },
                )
              : "—"}
          </p>
          <p className="text-[11px] text-slate-400">
            {displaySearchParams?.checkOut
              ? new Date(displaySearchParams.checkOut).toLocaleDateString(
                  "en-GB",
                  { weekday: "long" },
                )
              : ""}
          </p>
        </div>

        {/* Room & Guests */}
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Room & Guests
          </p>
          <p className="text-sm font-bold text-slate-800">
            {displaySearchParams?.rooms?.length || 1} Room · {totalAdults} Adult
            {totalAdults !== 1 ? "s" : ""}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {Array.isArray(selectedRoom)
              ? selectedRoom
                  .map((r) => r.Name?.[0] || r.RoomTypeName)
                  .join(", ")
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Selected Room Details Card (full-width redesign)              */
/* ─────────────────────────────────────────────────────────────── */
function SelectedRoomDetailsCard({
  selectedRoom,
  displayRoom,
  displaySearchParams,
}) {
  const images =
    selectedRoom?.images || selectedRoom?.rawRoomData?.images || [];
  const roomNames = selectedRoom?.Name || selectedRoom?.name || [];
  const roomNameDisplay = Array.isArray(roomNames)
    ? [...new Set(roomNames)].join(", ")
    : roomNames || displayRoom?.RoomTypeName || "Room";

  const price = selectedRoom?.Price || {};
  const totalFare =
    selectedRoom?.TotalFare || selectedRoom?.Price?.TotalFare || 0;
  const totalTax = selectedRoom?.TotalTax || selectedRoom?.Price?.Tax || 0;
  const baseFare = totalFare - totalTax;
  const cancelPolicies =
    selectedRoom?.CancelPolicies || displayRoom?.CancelPolicies || [];
  const freeCancelUntil = cancelPolicies.find(
    (p) => p.CancellationCharge === 0,
  )?.FromDate;
  const paidCancelFrom = cancelPolicies.find(
    (p) => p.CancellationCharge > 0,
  )?.FromDate;
  const mealType =
    selectedRoom?.MealType ||
    selectedRoom?.mealType ||
    displayRoom?.MealType ||
    "—";
  const isRefundable =
    selectedRoom?.IsRefundable ??
    selectedRoom?.isRefundable ??
    displayRoom?.IsRefundable ??
    false;
  const inclusion = selectedRoom?.Inclusion || displayRoom?.Inclusion || "";
  const dayRates = selectedRoom?.DayRates || displayRoom?.DayRates || [];
  const nights = calculateNights(
  displaySearchParams?.checkIn,
  displaySearchParams?.checkOut
);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A4D68] to-[#088395] px-6 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <MdKingBed size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            Selected Room Details
          </h3>
          <p className="text-[11px] text-blue-100">
            Full breakdown of your chosen room
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Two-column layout: image left, details right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Gallery + name + badges */}
          <div>
            {images.length > 0 && <RoomImageGallery images={images} />}
            <h4 className="text-base font-extrabold text-slate-800 leading-snug mb-3">
              {roomNameDisplay}
            </h4>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <FiCoffee size={11} />
                {mealType.replace(/_/g, " ")}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${isRefundable ? "text-teal-700 bg-teal-50 border-teal-100" : "text-red-600 bg-red-50 border-red-100"}`}
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
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                🌙 {nights} Night{nights !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Inclusions */}
            {inclusion && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Inclusions
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(inclusion) ? inclusion : inclusion.split(","))
                    .filter(Boolean)
                    .map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium"
                      >
                        <MdCheckCircle size={11} /> {item.trim()}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Fare breakdown + cancellation */}
          <div className="flex flex-col gap-5">
            {/* Fare breakdown */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Fare Breakdown
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-500">
                      Base Fare
                    </span>
                    <span className="text-[13px] font-semibold text-slate-700">
                      ₹{Number(baseFare).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-500">
                      Taxes & Fees
                    </span>
                    <span className="text-[13px] font-semibold text-slate-700">
                      ₹{Number(totalTax).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50">
                    <span className="text-[14px] font-bold text-teal-700">
                      Total
                    </span>
                    <span className="text-[18px] font-black text-[#0A4D68]">
                      ₹{Number(totalFare).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation policy */}
            {cancelPolicies.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Cancellation Policy
                </p>
                {freeCancelUntil && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-2">
                    <FiCheckCircle
                      size={14}
                      className="text-emerald-500 shrink-0"
                    />
                    <p className="text-[12px] text-emerald-700 font-semibold">
                      Free cancellation until <strong>{freeCancelUntil}</strong>
                    </p>
                  </div>
                )}
                {paidCancelFrom && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-2">
                    <MdInfo size={14} className="text-amber-500 shrink-0" />
                    <p className="text-[12px] text-amber-700 font-semibold">
                      Charges apply from <strong>{paidCancelFrom}</strong>
                    </p>
                  </div>
                )}
                <CancelPolicyTable policies={cancelPolicies} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const diffTime = outDate - inDate;
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
};

/* ─────────────────────────────────────────────────────────────── */
/*  Main Component                                                 */
/* ─────────────────────────────────────────────────────────────── */
const HotelReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading: actionLoading } = useSelector(
    (state) => state.hotelBookings,
  );
  const { hotels: searchedHotels } = useSelector((state) => state.hotel);
  const { selectedRequest, loading, error } = useSelector(
    (state) => state.hotelBookings,
  );

  const { hotel, rooms, searchParams } = location.state || {};

  const [travelers, setTravelers] = useState([]);
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [bookingRequest, setBookingRequest] = useState(null);

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

  useEffect(() => {
    if (id) dispatch(fetchHotelRequestById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (selectedRequest) {
      setBookingRequest(selectedRequest);
      setTravelers(selectedRequest.travellers || []);
      setPurposeOfTravel(selectedRequest.purposeOfTravel || "");
    }
  }, [selectedRequest]);

  useEffect(() => {
    if (!isBookNowMode && travelers.length === 0 && user) {
      const generatedTravelers = Array.from(
        { length: totalAdultsFromSearch },
        (_, i) => ({
          id: i + 1,
          title: "Mr",
          firstName: i === 0 ? user?.name?.firstName || "" : "",
          lastName: i === 0 ? user?.name?.lastName || "" : "",
          paxType: 1,
          age: "",
          dob: "",
          gender: "Male",
          leadPassenger: i === 0, // ✅ only first is lead
          email: i === 0 ? user?.email || "" : "",
          phoneWithCode: i === 0 ? user?.phone || "" : "",
          countryCode: "IN",
          nationality: "IN",
        }),
      );

      setTravelers(generatedTravelers);
    }
  }, [user, isBookNowMode, totalAdultsFromSearch]);

  const handleAddGuest = () => {
    if (travelers.length >= totalAdultsFromSearch) {
      ToastWithTimer({
        type: "error",
        message: "Guest count cannot exceed selected adults",
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
        paxType: 1,
        age: "",
        dob: "",
        gender: "Male",
        leadPassenger: false,
        email: "",
        phoneWithCode: "",
        countryCode: "",
        nationality: "",
      },
    ]);
  };

  const handleRemoveGuest = (id) => {
    if (travelers.length <= totalAdultsFromSearch) {
      ToastWithTimer({
        type: "error",
        message: "Cannot have less guests than selected adults",
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
  const countries = Country.getAllCountries();
  const selectedRooms = rooms || [];
  const price = displayRoom?.Price || displayRoom || {};
  const totalFare = selectedRooms.reduce(
    (sum, r) => sum + (r.TotalFare || r.Price?.TotalFare || 0),
    0,
  );
  const totalTax = selectedRooms.reduce(
    (sum, r) => sum + (r.TotalTax || r.Price?.Tax || 0),
    0,
  );
  let baseFare = price.BaseFare;
  let tax = price.Tax || displayRoom?.Price?.Tax || 0;
  if (!baseFare && totalFare) baseFare = totalFare - tax;
  const search = searchParams;

  const handleRequestApproval = async () => {
    if (travelers.length !== totalAdultsFromSearch) {
      ToastWithTimer({
        type: "error",
        message: `Please add exactly ${totalAdultsFromSearch} guests`,
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
    for (let t of travelers) {
      if (
        !t.firstName ||
        !t.lastName ||
        !t.email ||
        !t.phoneWithCode ||
        !t.nationality
      ) {
        ToastWithTimer({
          type: "error",
          message: "Please fill all guest details",
        });
        return;
      }
    }
    const resolvedBookingCode =
      displayRoom?.BookingCode ||
      displayRoom?.RoomTypeCode ||
      displayRoom?.RatePlanCode ||
      displayRoom?.roomTypeCode ||
      displayRoom?.ratePlanCode ||
      null;
    if (!selectedRoom.length) {
      ToastWithTimer({
        type: "error",
        message: "Please select at least one room",
      });
      return;
    }


    const totalAdults = travelers.length;
const totalRooms = selectedRoom.length;

const adultsPerRoom = Math.floor(totalAdults / totalRooms);
const extra = totalAdults % totalRooms;

const roomGuests = selectedRoom.map((_, i) => ({
  noOfAdults: adultsPerRoom + (i < extra ? 1 : 0),
  noOfChild: 0,
  childAge: [],
}));
    const payload = {
      bookingType: "hotel",
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
        roomGuests: roomGuests,
        // bookingCode: selectedRoom?.BookingCode || selectedRoom?.RoomTypeCode || selectedRoom?.RatePlanCode,
        // price: selectedRoom?.Price, guestNationality: "IN",
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
      })),
      purposeOfTravel,
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
  displaySearchParams?.checkOut
),
        amount: displayRoom?.TotalFare,
        currency: displayRoom?.Currency || "INR",
      },
    };
    try {
      await dispatch(createHotelBookingRequest(payload)).unwrap();
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

  const handleBookNow = async () => {
    try {
      const result = await Swal.fire({
        title: "Confirm Your Booking",
        text: `Are you sure you want to book ${displayHotel?.name}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#0A4D68",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Confirm & Book",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            return await dispatch(executeHotelBooking(bookingId)).unwrap();
          } catch (error) {
            Swal.showValidationMessage(`Booking failed: ${error}`);
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

  if (!isBookNowMode && (!hotel || !rooms || !searchParams)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session expired. Please go back and select hotel again.</p>
      </div>
    );
  }

  if (isBookNowMode && !bookingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0A4D68] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading booking details…</p>
        </div>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <EmployeeHeader />

      {/* ── Sticky back bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (isApproved) navigate("/my-bookings");
              else navigate(-1);
            }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A4D68] transition font-medium"
          >
            <MdArrowBack size={18} />
            {isApproved ? "Back to Requests" : "Back to Details"}
          </button>
          {isApproved && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <MdVerifiedUser size={14} />
              Approved {approvedBy ? `by ${approvedBy?.name || "Manager"}` : ""}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">
          Review your Booking
        </h1>

        {/* ── FULL-WIDTH HOTEL HERO ── */}
        <HotelHeroBanner
          displayHotel={displayHotel}
          displaySearchParams={displaySearchParams}
          displayRoom={displayRoom}
          selectedRoom={selectedRoom}
          totalAdults={totalAdults}
        />

        {/* ── FULL-WIDTH ROOM DETAILS ── */}
        {selectedRoom.map((room, index) => (
          <SelectedRoomDetailsCard
            key={index}
            selectedRoom={room}
            displayRoom={room}
            displaySearchParams={displaySearchParams}
          />
        ))}

        {/* ── BOTTOM SECTION: Guest details (left) + Price summary (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: Guest Details ── */}
          <div className="lg:col-span-2 space-y-6">
            {isBookNowMode ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-white/30">
                    {travelers.length} Guest{travelers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0A4D68]/10 flex items-center justify-center text-[10px] font-bold text-[#0A4D68]">
                            {(t.firstName?.[0] || "G").toUpperCase()}
                            {(t.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {t.title} {t.firstName} {t.middleName || ""}{" "}
                            {t.lastName}
                          </span>
                          {t.leadPassenger && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#0A4D68] bg-[#0A4D68]/10 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A4D68]/10 text-[#0A4D68]">
                      <FiUser size={15} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">
                        Guest Details
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Fill in the traveler information below
                      </p>
                    </div>
                  </div>
                  {!isBookNowMode && (
                    <button
                      onClick={handleAddGuest}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#0A4D68] border border-[#0A4D68]/30 bg-[#0A4D68]/5 hover:bg-[#0A4D68]/10 px-3 py-1.5 rounded-lg transition"
                    >
                      <FaUserPlus size={12} /> Add Guest
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {travelers.map((t, index) => (
                    <div
                      key={t.id || t._id || index}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <FiUser size={12} className="text-slate-400" /> Guest{" "}
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          {t.leadPassenger && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#0A4D68] bg-[#0A4D68]/10 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                          {travelers.length > 1 && !isBookNowMode && (
                            <button
                              onClick={() => handleRemoveGuest(t.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Full Name
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <select
                              value={t.title}
                              disabled={isBookNowMode}
                              onChange={(e) =>
                                updateTraveler(t.id, "title", e.target.value)
                              }
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
                            >
                              <option>Mr</option>
                              <option>Mrs</option>
                              <option>Ms</option>
                            </select>
                            <input
                              type="text"
                              placeholder="First Name *"
                              value={t.firstName}
                              disabled={isBookNowMode}
                              onChange={(e) =>
                                updateTraveler(
                                  t.id,
                                  "firstName",
                                  e.target.value,
                                )
                              }
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition disabled:bg-slate-50"
                            />
                            <input
                              type="text"
                              placeholder="Middle (Optional)"
                              value={t.middleName || ""}
                              disabled={isBookNowMode}
                              onChange={(e) =>
                                updateTraveler(
                                  t.id,
                                  "middleName",
                                  e.target.value,
                                )
                              }
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition disabled:bg-slate-50"
                            />
                            <input
                              type="text"
                              placeholder="Last Name *"
                              value={t.lastName}
                              disabled={isBookNowMode}
                              onChange={(e) =>
                                updateTraveler(t.id, "lastName", e.target.value)
                              }
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition disabled:bg-slate-50"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Contact Details
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <FiMail
                                className="absolute left-3 top-3 text-slate-400"
                                size={14}
                              />
                              <input
                                type="email"
                                placeholder="Email Address *"
                                value={t.email}
                                disabled={isBookNowMode}
                                onChange={(e) =>
                                  updateTraveler(t.id, "email", e.target.value)
                                }
                                className="h-10 w-full pl-9 pr-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition disabled:bg-slate-50"
                              />
                            </div>
                            <PhoneInput
                              country={"in"}
                              value={t.phoneWithCode}
                              disabled={isBookNowMode}
                              onChange={(value, data) => {
                                updateTraveler(t.id, "phoneWithCode", value);
                                updateTraveler(
                                  t.id,
                                  "countryCode",
                                  data?.countryCode?.toUpperCase(),
                                );
                              }}
                              inputClass="!h-10 !w-full !text-sm !bg-white !border !border-slate-200 !rounded-lg"
                              buttonClass="!border !border-slate-200 !rounded-l-lg"
                              containerClass="w-full"
                              enableSearch
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Additional Info
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
                            >
                              <option value="">Select Nationality *</option>
                              {countries.map((c) => (
                                <option key={c.isoCode} value={c.isoCode}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
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
                                  (m === 0 && today.getDate() < birth.getDate())
                                )
                                  age--;
                                updateTraveler(t.id, "dob", dob);
                                updateTraveler(t.id, "age", age);
                              }}
                              className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
                            />
                            <input
                              type="number"
                              value={t.age || ""}
                              readOnly
                              placeholder="Age (auto)"
                              className="h-10 w-full px-3 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purpose of Travel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A4D68]/10 text-[#0A4D68]">
                  <FiShield size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    Purpose of Travel
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Required for corporate approval
                  </p>
                </div>
              </div>
              {isApproved ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 min-h-20">
                  {purposeOfTravel || (
                    <span className="text-slate-400 italic">
                      No purpose provided
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  value={purposeOfTravel}
                  disabled={isBookNowMode && !isApproved}
                  onChange={(e) => setPurposeOfTravel(e.target.value)}
                  placeholder="Describe the reason for this booking…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 focus:bg-white min-h-[100px] transition disabled:bg-slate-100 disabled:text-slate-400 resize-none"
                />
              )}
            </div>
          </div>

          {/* ── RIGHT: Price Summary ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#0A4D68] to-[#088395] px-5 py-4">
                  <h3 className="text-sm font-bold text-white mb-0.5">
                    Price Summary
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Transparent pricing, no hidden fees
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-800">
                      Total
                    </span>
                    <span className="text-2xl font-black text-[#0A4D68]">
                      ₹{totalFare.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">
                    {displayRoom?.Currency || "INR"} · Incl. all taxes
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {!isBookNowMode && (
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                    By proceeding, I agree to{" "}
                    <span className="text-[#0A4D68] cursor-pointer hover:underline">
                      User Agreement
                    </span>{" "}
                    &amp;{" "}
                    <span className="text-[#0A4D68] cursor-pointer hover:underline">
                      Cancellation Policy
                    </span>
                    .
                  </p>
                )}
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#0A4D68] to-[#088395] hover:from-[#093f54] hover:to-[#066876] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#0A4D68]/20"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      Processing…
                    </>
                  ) : isBookNowMode ? (
                    "Confirm & Book Now"
                  ) : (
                    "Request for Approval"
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

/* ── Approved info cell ── */
function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5 bg-white">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          {label}
        </span>
      </div>
      <span className="text-sm font-medium text-slate-700 truncate">
        {value || "—"}
      </span>
    </div>
  );
}

export default HotelReviewBooking;
