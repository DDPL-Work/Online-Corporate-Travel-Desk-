import React, { useState, useRef } from "react";
import { FaHotel, FaPlane } from "react-icons/fa";
import {
  FiX,
  FiHome,
  FiMapPin,
  FiCoffee,
  FiCalendar,
  FiDollarSign,
  FiShield,
  FiUser,
  FiInfo,
  FiTag,
  FiGlobe,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiKey,
  FiPackage,
  FiBriefcase,
  FiStar,
  FiMoon,
  FiAlertCircle,
  FiMail,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import {
  formatDate,
  formatDateTime,
  formatDateWithYear,
} from "../../../utils/formatter";
import { InfoBadge, SectionLabel } from "../Shared/CommonComponents";
import { C } from "../../Shared/color";

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

const formatPaxDob = (pax) => formatDateWithYear(pax?.dateOfBirth || pax?.dob);
const formatPaxPhone = (pax) =>
  pax?.phoneWithCode ? `+${pax.phoneWithCode}` : "N/A";
const formatPaxEmail = (pax) => pax?.email || "N/A";
const formatNationality = (pax) => pax?.nationality || "N/A";
const formatGender = (pax) => pax?.gender || "N/A";

const calcAge = (pax) => {
  const dobStr = pax?.dateOfBirth || pax?.dob;
  if (!dobStr) return "N/A";
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return "N/A";
  const diff = Date.now() - dob.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return `${age} yrs`;
};

const getMealDesc = (desc) => {
  const d = String(desc || "");
  if (d === "1") return "Included (Fare Includes Meal)";
  if (d === "2") return "Direct (Added while ticketing)";
  if (d === "3") return "Imported (Added while importing)";
  return d;
};

const getBaggageDesc = (desc) => {
  const d = String(desc || "");
  if (d === "0") return "NotSet";
  if (d === "1") return "Included";
  if (d === "2") return "Direct (Purchase)";
  if (d === "3") return "Imported";
  if (d === "4") return "UpGrade";
  if (d === "5") return "ImportedUpgrade";
  return d;
};

const resolveApproverDetails = (booking) => {
  if (booking?.approverName === "Auto Approve") {
    return {
      name: "Auto Approved",
      email: "",
      role: "System",
    };
  }

  const approver =
    booking?.approverId ||
    booking?.approvedBy ||
    booking?.approvedByDetails ||
    {};
  const first =
    approver?.name?.firstName ||
    approver?.firstName ||
    booking?.approverName ||
    "";
  const last =
    approver?.name?.lastName ||
    approver?.lastName ||
    booking?.approverLastName ||
    "";
  const name = `${first} ${last}`.trim() || "Not assigned";

  return {
    name,
    email: approver?.email || booking?.approverEmail || "",
    role: approver?.role || booking?.approverRole || "manager",
  };
};

const formatTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const calculateLayover = (arrival, departure) => {
  if (!arrival || !departure) return null;
  const diff = new Date(departure) - new Date(arrival);
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const TravellerField = ({ icon, label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5 truncate">
      {icon} {label}
    </p>
    <p className="text-xs font-semibold text-slate-700 truncate">
      {value || "—"}
    </p>
  </div>
);

const TimelineItem = ({
  title,
  time,
  status,
  description,
  active,
  horizontal,
}) => (
  <div
    className={`flex ${horizontal ? "flex-col items-center text-center flex-1" : "gap-6"} relative group`}
  >
    <div
      className={`flex ${horizontal ? "w-full items-center mb-4" : "flex-col items-center"}`}
    >
      {horizontal && (
        <div className="flex-1 h-[2px] bg-slate-100 group-first:bg-transparent" />
      )}
      <div
        className={`w-4 h-4 rounded-full border-2 z-10 transition-all duration-300 shadow-sm shrink-0 ${
          status === "completed"
            ? "bg-emerald-500 border-emerald-100 ring-4 ring-emerald-50"
            : status === "rejected"
              ? "bg-rose-500 border-rose-100 ring-4 ring-rose-50"
              : active
                ? "bg-amber-400 border-amber-100 ring-4 ring-amber-50 animate-pulse"
                : "bg-slate-200 border-[#EAE4D9]"
        }`}
      />
      {horizontal && (
        <div className="flex-1 h-[2px] bg-slate-100 group-last:bg-transparent" />
      )}
    </div>
    <div className={`${horizontal ? "px-4" : "-mt-1 pb-10"}`}>
      <p
        className={`text-[11px] font-black uppercase tracking-tight ${active ? "text-[#1A1714]" : "text-slate-600"}`}
      >
        {title}
      </p>
      <p className="text-[9px] text-[#B5862A] font-mono font-black mt-1 uppercase tracking-widest bg-[#FAF8F4] px-2 py-0.5 rounded border border-[#EAE4D9] inline-block">
        {time}
      </p>
      {description && (
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-medium mx-auto max-w-[180px]">
          {description}
        </p>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// HOTEL MODAL
// ─────────────────────────────────────────────

export const PendingHotelDetailsModal = ({
  booking,
  onClose,
  onApprove,
  onReject,
  isVerified = true,
  isDiscarded = false,
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const tabsRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!booking) return null;

  const hotelRequest = booking.hotelRequest || {};
  const bookSnap = booking.bookingSnapshot || {};
  const travelers = booking.travellers || [];
  const roomData = hotelRequest.selectedRoom || {};
  const rawRooms = Array.isArray(roomData.rawRoomData)
    ? roomData.rawRoomData
    : roomData.rawRoomData
      ? [roomData.rawRoomData]
      : [];

  // Group rooms by BookingCode or Name to avoid repetition
  const groupedRooms = rawRooms.reduce((acc, room) => {
    const key =
      room.BookingCode ||
      room.RoomTypeCode ||
      (Array.isArray(room.Name) ? room.Name[0] : room.Name) ||
      "Standard";

    // TBO sometimes returns a single object representing multiple rooms (e.g. Name is an array)
    const innerCount = Array.isArray(room.Name) ? room.Name.length : 1;

    if (!acc[key]) {
      acc[key] = { ...room, count: innerCount };
    } else {
      acc[key].count += innerCount;
    }
    return acc;
  }, {});
  const displayRooms = Object.values(groupedRooms);

  const approver = resolveApproverDetails(booking);

  // 💰 PRICE CALCULATION FALLBACK
  const { totalAmount, baseFare, tax } = (() => {
    // 1. Try pricingSnapshot first (most reliable)
    let total =
      booking.pricingSnapshot?.totalAmount || booking.bookingSnapshot?.amount;
    let base = roomData.Price?.baseFare;
    let tx = roomData.Price?.tax;

    // 2. Try from selectedRoom directly if snapshot is missing
    if (!total && roomData.totalFare) total = roomData.totalFare;
    if (!tx && roomData.totalTax) tx = roomData.totalTax;

    // 3. Sum from raw rooms if still missing
    if (!total && rawRooms.length > 0) {
      total = rawRooms.reduce(
        (sum, r) => sum + (r.TotalFare || r.Price?.totalFare || 0),
        0,
      );
    }

    // 4. Calculate base if only total and tax are known
    if ((!base || base === 0) && total && tx) {
      base = total - tx;
    } else if ((!base || base === 0) && total) {
      base = total; // No tax breakdown available
    }

    return { totalAmount: total || 0, baseFare: base || 0, tax: tx || 0 };
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1C20]/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1440px] w-[96%] my-2 overflow-hidden flex flex-col h-[96vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003399] to-[#000d26] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/20 rounded-lg text-[#C9A84C]">
              <FaHotel size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                Hotel Approval Request
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">
                Order ID: {booking.orderId || booking.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#EAE4D9] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            {booking.requestStatus === "approved" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase tracking-tighter">
                <FiCheckCircle size={12} />
                Approved
              </div>
            ) : booking.requestStatus === "rejected" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100 uppercase tracking-tighter">
                <FiXCircle size={12} />
                Rejected
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-[#EAE4D9] uppercase tracking-tighter font-black">
                Expired
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Approval
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiClock className="text-slate-400" />
              <span>{formatDateTime(booking.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiBriefcase className="text-slate-400" />
              <span>{booking.projectName || "Internal"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isVerified &&
              booking.requestStatus === "pending_approval" &&
              !isDiscarded && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 animate-pulse">
                  <FiAlertCircle size={14} className="text-amber-600" />
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    Awaiting Admin Verification to Approve
                  </span>
                </div>
              )}

            {booking.requestStatus !== "pending_approval" ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF8F4] text-slate-500 rounded-xl border border-[#EAE4D9] italic">
                <FiInfo size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Request already {booking.requestStatus}
                </span>
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl border border-[#EAE4D9]">
                <FiAlertCircle size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Travel Date Passed · No Action Possible
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onReject(booking._id, "hotel", "reject")}
                  disabled={!isVerified}
                  className={`px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl transition-all uppercase tracking-tight ${!isVerified ? "opacity-30 cursor-not-allowed bg-slate-100 border-[#EAE4D9]" : "hover:bg-red-50"}`}
                  title={!isVerified ? "Account pending verification" : ""}
                >
                  Reject Request
                </button>
                <button
                  onClick={() => onApprove(booking._id, "hotel", "approve")}
                  disabled={!isVerified}
                  className={`px-5 py-2 bg-[#22C55E] text-white font-black text-[11px] rounded-xl shadow-lg transition-all flex items-center gap-2 uppercase tracking-tight ${!isVerified ? "bg-slate-300 cursor-not-allowed shadow-none" : "hover:bg-emerald-600 shadow-emerald-100"}`}
                  title={!isVerified ? "Account pending verification" : ""}
                >
                  <FiCheckCircle size={14} />
                  Approve & Proceed
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="relative bg-white border-b border-[#EAE4D9] flex items-center shrink-0 group">
          <button
            onClick={() => scrollTabs("left")}
            className="md:hidden flex items-center justify-center w-10 h-14 bg-white border-r border-[#EAE4D9] text-slate-400 hover:text-[#B5862A] z-10 transition-colors"
            aria-label="Scroll left"
          >
            <FiChevronLeft size={18} />
          </button>

          <div
            ref={tabsRef}
            className="flex-1 px-6 flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {[
              { id: "details", label: "Hotel Details", icon: <FaHotel /> },
              { id: "project", label: "Project", icon: <FiBriefcase /> },
              {
                id: "charges",
                label: "Charges and rules",
                icon: <FiDollarSign />,
              },
              { id: "passenger", label: "Passenger", icon: <FiUser /> },
              { id: "history", label: "Booking History", icon: <FiClock /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${
                  activeTab === tab.id
                    ? "text-[#B5862A]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span
                  className={
                    activeTab === tab.id ? "text-[#B5862A]" : "text-slate-300"
                  }
                >
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B5862A] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollTabs("right")}
            className="md:hidden flex items-center justify-center w-10 h-14 bg-white border-l border-[#EAE4D9] text-slate-400 hover:text-[#B5862A] z-10 transition-colors"
            aria-label="Scroll right"
          >
            <FiChevronRight size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#FAF8F4]/30">
          <div className="w-full mx-auto">
            {activeTab === "details" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Left Column */}
                <div className="flex-1 space-y-6">
                  {/* Hotel Snapshot */}
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                    <div className="w-full md:w-72 h-64 md:h-auto relative shrink-0 overflow-hidden">
                      <img
                        src={
                          bookSnap.hotelImage ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500"
                        }
                        alt={bookSnap.hotelName}
                        className="md:absolute md:inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#1A1C20]/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20 shadow-xl">
                          Confirmed Rate
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 space-y-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-black text-[#1A1714] leading-tight tracking-tighter uppercase italic">
                            {bookSnap.hotelName}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2 font-medium">
                            <FiMapPin className="text-[#B5862A]" />{" "}
                            {hotelRequest?.selectedHotel?.address || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              size={12}
                              fill={
                                i <
                                (hotelRequest?.selectedHotel?.starRating || 4)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50">
                        <TravellerField
                          icon={<FiCalendar />}
                          label="Check-In"
                          value={formatDate(bookSnap.checkInDate)}
                        />
                        <TravellerField
                          icon={<FiCalendar />}
                          label="Check-Out"
                          value={formatDate(bookSnap.checkOutDate)}
                        />
                        <TravellerField
                          icon={<FiMoon />}
                          label="Nights"
                          value={`${bookSnap.nights || 1} Night(s)`}
                        />
                        <TravellerField
                          icon={<FiHome />}
                          label="Rooms"
                          value={`${bookSnap.roomCount || 1} Room(s)`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rooms */}
                  <div className="space-y-4">
                    <SectionLabel
                      icon={<FiKey />}
                      title="Selected Accommodations"
                    />
                    {displayRooms.map((r, i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm space-y-5"
                      >
                        <div className="flex justify-between items-start border-b border-slate-50 pb-5">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-black text-[#1A1714] tracking-tight uppercase">
                                {r.count > 1 ? (
                                  <span className="mr-2 inline-flex items-center">
                                    <span className="text-[#1A1714]">
                                      {r.count}
                                    </span>
                                    <span className="text-[#C9A84C] ml-1">
                                      x
                                    </span>
                                  </span>
                                ) : (
                                  ""
                                )}
                                {r.Name?.[0] || "Standard Room"}
                              </h4>
                              {r.count > 1 && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full border border-amber-200">
                                  {r.count} ROOMS SELECTED
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <span className="text-[10px] font-black bg-[#FAF8F4] text-[#B5862A] px-3 py-1 rounded-full uppercase border border-indigo-100 flex items-center gap-1.5">
                                <FiCoffee size={10} />{" "}
                                {r.MealType || "Room Only"}
                              </span>
                              {r.IsRefundable ? (
                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase border border-emerald-100 flex items-center gap-1.5">
                                  <FiCheckCircle size={10} /> Refundable
                                </span>
                              ) : (
                                <span className="text-[10px] font-black bg-red-50 text-red-700 px-3 py-1 rounded-full uppercase border border-red-100 flex items-center gap-1.5">
                                  <FiXCircle size={10} /> Non-Refundable
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Per Room / Night
                            </p>
                            <p className="text-2xl font-black text-[#B5862A] tracking-tighter">
                              ₹
                              {r.DayRates?.[0]?.[0]?.BasePrice ||
                                r.DayRates?.[0]?.[0]?.RoomRate ||
                                (
                                  (r.TotalFare ||
                                    r.Price?.totalFare ||
                                    r.NetAmount ||
                                    0) /
                                  ((Array.isArray(r.Name) ? r.Name.length : 1) *
                                    (bookSnap.nights || 1))
                                ).toLocaleString()}
                            </p>
                            {r.count > 1 && (
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Total: ₹
                                {(
                                  r.TotalFare ||
                                  r.Price?.totalFare ||
                                  r.NetAmount ||
                                  0
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Left: Inclusions & Supplements */}
                          <div className="space-y-6">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Room Inclusions
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(r.Inclusion || "Taxes Included")
                                  .split(",")
                                  .map((inc, j) => (
                                    <span
                                      key={j}
                                      className="text-[10px] font-bold bg-[#FAF8F4] text-slate-600 px-3 py-1 rounded-lg border border-[#EAE4D9] shadow-sm"
                                    >
                                      {inc.trim()}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            {/* Supplements & Add-ons */}
                            {r.Supplements && r.Supplements.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Mandatory Supplements & Taxes
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {r.Supplements.map((supItem, j) => {
                                    // Handle both flat and nested structures
                                    const sups = Array.isArray(supItem)
                                      ? supItem
                                      : [supItem];
                                    return sups.map((sup, k) => (
                                      <div
                                        key={`${j}-${k}`}
                                        className="bg-blue-50 text-blue-700 p-3 rounded-2xl border border-blue-100 flex items-center justify-between gap-3 group hover:bg-blue-100/50 transition-colors"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shadow-sm text-blue-600">
                                            <FiPackage size={14} />
                                          </div>
                                          <div>
                                            <p className="text-[11px] font-black leading-tight uppercase tracking-tight">
                                              {sup.Type?.replace(
                                                /([A-Z])/g,
                                                " $1",
                                              ).trim() || "Supplement"}
                                            </p>
                                            <p className="text-[9px] font-bold text-blue-500/80 uppercase mt-0.5">
                                              {sup.Description?.replace(
                                                /_/g,
                                                " ",
                                              ) || "Service Charge"}{" "}
                                              ·{" "}
                                              {sup.ChargeType === "Fixed"
                                                ? "Fixed Fee"
                                                : "Per Person"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-black text-blue-800">
                                            ₹
                                            {sup.Price?.toLocaleString() || "0"}
                                          </p>
                                          {sup.Currency &&
                                            sup.Currency !== "INR" && (
                                              <p className="text-[8px] font-bold opacity-60 uppercase">
                                                {sup.Currency}
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                    ));
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Promotions & Exclusions */}
                          <div className="space-y-6">
                            {r.Exclusion && (
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-red-400">
                                  Exclusions
                                </p>
                                <div className="bg-red-50/30 text-red-700 p-4 rounded-2xl border border-red-100/50">
                                  <p className="text-[11px] font-medium leading-relaxed italic">
                                    {r.Exclusion}
                                  </p>
                                </div>
                              </div>
                            )}

                            {r.RoomPromotion && r.RoomPromotion.length > 0 && (
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-emerald-500">
                                  Special Offer
                                </p>
                                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                                  <FiTag className="shrink-0" />
                                  <p className="text-[11px] font-black leading-tight">
                                    {r.RoomPromotion[0]}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column */}
                <div className="w-full lg:w-96 space-y-6">
                  {/* Pricing Snapshot */}
                  <div className="bg-gradient-to-br from-[#003399] to-[#000d26] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <SectionLabel
                      icon={<FiDollarSign />}
                      title="Fare Summary"
                    />
                    <div className="mt-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Total Amount (Inc. Tax)
                      </p>
                      <h4 className="text-4xl font-black text-[#C9A84C] tracking-tighter">
                        ₹ {totalAmount.toLocaleString()}
                      </h4>
                      <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase">
                            Base Price
                          </span>
                          <span className="text-slate-200 font-black">
                            ₹{baseFare.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase">
                            Taxes & Fees
                          </span>
                          <span className="text-slate-200 font-black">
                            ₹{tax.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "project" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 space-y-6">
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel
                      icon={<FiBriefcase />}
                      title="Project Context"
                    />
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project Name
                        </p>
                        <p className="text-base font-black text-[#1A1714] uppercase tracking-tighter">
                          {booking.projectName || "Internal Business"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project Client
                        </p>
                        <p className="text-base font-black text-slate-700 truncate uppercase">
                          {booking.projectClient || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project ID / Code
                        </p>
                        <p className="text-sm font-mono font-black text-slate-700 bg-[#FAF8F4] px-3 py-1 rounded-lg border border-[#EAE4D9] inline-block">
                          {booking.projectId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Assigned Approver
                        </p>
                        <p className="text-sm font-black text-[#1A1714] uppercase tracking-tighter">
                          {approver.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          {approver.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel icon={<FiUser />} title="Requested By" />
                    <div className="mt-8 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-[#FAF8F4] border border-[#EAE4D9] flex items-center justify-center text-slate-400 font-black text-2xl italic shadow-inner">
                        {
                          (booking.requesterDetails?.name ||
                            booking.userId?.name?.firstName ||
                            "?")[0]
                        }
                      </div>
                      <div>
                        <p className="text-xl font-black text-[#1A1714] uppercase tracking-tighter italic">
                          {booking.requesterDetails?.name ||
                            `${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""}`.trim()}
                        </p>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {booking.requesterDetails?.email ||
                            booking.userId?.email}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="text-[10px] font-black text-[#B5862A] bg-[#FAF8F4] px-3 py-1 rounded-full uppercase tracking-widest italic border border-indigo-100">
                            Role:{" "}
                            {booking.requesterDetails?.role || "Team Member"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Reason for Travel
                      </p>
                      <div className="bg-[#FAF8F4] p-6 rounded-[2rem] border border-[#EAE4D9] italic text-sm font-black text-slate-700 leading-relaxed shadow-inner">
                        "
                        {booking.purposeOfTravel ||
                          "Internal business requirement"}
                        "
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "charges" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                  <SectionLabel
                    icon={<FiShield />}
                    title="Cancellation Policies"
                  />
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rawRooms?.[0]?.CancelPolicies?.map((policy, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col p-5 bg-[#FAF8F4] rounded-2xl border border-[#EAE4D9] hover:bg-white hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Effective Date
                          </span>
                          <span className="text-[10px] font-black text-[#B5862A] bg-[#FAF8F4] px-2 py-0.5 rounded uppercase">
                            Window {idx + 1}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-700 uppercase mb-4">
                          From {policy.FromDate.split(" ")[0]}
                        </p>
                        <div className="mt-auto pt-4 border-t border-[#EAE4D9] flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                            Charge
                          </span>
                          <span
                            className={`text-base font-black ${policy.CancellationCharge === 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {policy.CancellationCharge === 0
                              ? "FREE CANCELLATION"
                              : `PENALTY: ₹${policy.CancellationCharge.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!rawRooms?.[0]?.CancelPolicies?.length && (
                      <div className="md:col-span-2 py-12 text-center bg-[#FAF8F4] rounded-3xl border border-dashed border-[#EAE4D9]">
                        <FiAlertCircle
                          className="mx-auto text-slate-300 mb-3"
                          size={32}
                        />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          No cancellation policy details available
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <FiInfo className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Cancellation charges are subject to change based on the
                      hotel's terms. The amounts shown are based on the latest
                      data captured from the supplier.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "passenger" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  <SectionLabel
                    icon={<FiUser />}
                    title={`Passenger Information (${travelers.length})`}
                  />
                  <div className="grid grid-cols-1 gap-6">
                    {travelers.map((pax, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-[#1A1C20] text-[#C9A84C] flex items-center justify-center font-black text-2xl shadow-lg uppercase italic">
                            {pax.firstName?.[0]}
                            {pax.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-2xl font-black text-[#1A1714] uppercase tracking-tighter italic">
                              {pax.title} {pax.firstName} {pax.lastName}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[10px] font-black bg-[#1A1C20] text-white px-3 py-1 rounded-full uppercase tracking-widest">
                                {pax.paxType || "Adult"}
                              </span>
                              {pax.isLeadPassenger && (
                                <span className="text-[10px] font-black bg-[#C9A84C] text-[#1A1714] px-3 py-1 rounded-full uppercase tracking-widest">
                                  Lead Passenger
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-10 pt-8 border-t border-slate-50">
                          <TravellerField
                            icon={<FiUser />}
                            label="Gender"
                            value={formatGender(pax)}
                          />
                          <TravellerField
                            icon={<FiCalendar />}
                            label="DOB"
                            value={formatPaxDob(pax)}
                          />
                          <TravellerField
                            icon={<FiInfo />}
                            label="Age"
                            value={calcAge(pax)}
                          />
                          <TravellerField
                            icon={<FiGlobe />}
                            label="Nationality"
                            value={formatNationality(pax)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex justify-center py-10">
                <div className="bg-white border border-[#EAE4D9] rounded-[3rem] p-12 shadow-xl shadow-slate-100/50 w-full max-w-6xl">
                  <SectionLabel
                    icon={<FiClock className="text-[#B5862A]" />}
                    title="Approval Request Timeline"
                  />
                  <div className="mt-16 flex items-start">
                    <TimelineItem
                      horizontal
                      title="Request Initiated"
                      time={formatDateTime(booking.createdAt)}
                      status="completed"
                      description={`Travel request created by ${booking.requesterDetails?.name || booking.userId?.name?.firstName}`}
                    />
                    <TimelineItem
                      horizontal
                      title="Approval Workflow Assigned"
                      time={formatDateTime(booking.createdAt)}
                      status="completed"
                      description={`Route assigned to ${approver.name} (${approver.role})`}
                    />
                    <TimelineItem
                      horizontal
                      title="Awaiting Review"
                      time="Present"
                      status="pending"
                      active={true}
                      description={`Currently pending with ${approver.name}. Awaiting final decision.`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// FLIGHT MODAL
// ─────────────────────────────────────────────

export const PendingFlightDetailsModal = ({
  booking,
  onClose,
  onApprove,
  onReject,
  isVerified = true,
  isDiscarded = false,
}) => {
  const [activeTab, setActiveTab] = useState("details");

  if (!booking) return null;

  const flightRequest = booking.flightRequest || {};
  const segments = flightRequest.segments || [];
  const fareSnapshot = flightRequest.fareSnapshot || {};
  const fareQuoteResult = flightRequest.fareQuote?.Results?.[0] || {};
  const fareBreakdown = fareQuoteResult.FareBreakdown || [];
  const miniFareRules = (() => {
    // Priority 1: live fareQuote result (nested array-of-arrays)
    const fromQuote = fareQuoteResult.MiniFareRules;
    if (fromQuote && fromQuote.length > 0) return fromQuote;
    // Priority 2: persisted fareSnapshot (also array-of-arrays)
    const fromSnap = fareSnapshot.miniFareRules;
    if (fromSnap && fromSnap.length > 0) {
      // Ensure it's always array-of-arrays so the render loop works
      return Array.isArray(fromSnap[0]) ? fromSnap : [fromSnap];
    }
    return [];
  })();
  const fareRules = fareQuoteResult.FareRules || [];
  const travelers = booking.travellers || [];
  const bookSnap = booking.bookingSnapshot || {};
  const approver = resolveApproverDetails(booking);
  const pricingSnapshot = booking.pricingSnapshot || {};
  const ssrSnap = flightRequest.ssrSnapshot || booking.ssrSnapshot || {};

  const cabinLabel = {
    1: "All",
    2: "Economy",
    3: "Premium Economy",
    4: "Business",
    5: "Premium Business",
    6: "First Class",
  };
  const paxTypeLabel = { 1: "Adult", 2: "Child", 3: "Infant" };
  const cabinDisplay =
    bookSnap.cabinClass || cabinLabel[segments[0]?.cabinClass] || "Economy";

  // 💰 PRICE FALLBACKS
  const baseFare = fareSnapshot.baseFare ?? fareQuoteResult.Fare?.BaseFare ?? 0;
  const totalTax = fareSnapshot.tax ?? fareQuoteResult.Fare?.Tax ?? 0;
  const publishFare =
    fareQuoteResult.Fare?.PublishedFare ?? fareSnapshot.publishedFare ?? 0;
  const displayTotal = pricingSnapshot.totalAmount || publishFare || 0;

  const onwardSegments = segments.filter(
    (s) => (s.journeyType || "onward") !== "return",
  );
  const returnSegments = segments.filter((s) => s.journeyType === "return");

  // Flatten detailed segments from fareQuote for easy lookup
  const allDetailedSegments = (fareQuoteResult.Segments || []).flat();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1C20]/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1440px] w-[96%] my-2 overflow-hidden flex flex-col h-[96vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003399] to-[#000d26] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/20 rounded-lg text-[#C9A84C]">
              <FaPlane size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase italic">
                Flight Approval Request
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">
                Order ID: {booking.orderId || booking.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#EAE4D9] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-tighter">
            {booking.requestStatus === "approved" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase tracking-tighter">
                <FiCheckCircle size={12} />
                Approved
              </div>
            ) : booking.requestStatus === "rejected" ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100 uppercase tracking-tighter">
                <FiXCircle size={12} />
                Rejected
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-[#EAE4D9] uppercase tracking-tighter font-black">
                Expired
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Approval
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiClock className="text-slate-400" />
              <span>Submitted: {formatDateTime(booking.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-[#EAE4D9] pl-4">
              <FiBriefcase className="text-slate-400" />
              <span>{booking.projectName || "Internal"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isVerified &&
              booking.requestStatus === "pending_approval" &&
              !isDiscarded && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 animate-pulse">
                  <FiAlertCircle size={14} className="text-amber-600" />
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    Awaiting Admin Verification to Approve
                  </span>
                </div>
              )}

            {booking.requestStatus !== "pending_approval" ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF8F4] text-slate-500 rounded-xl border border-[#EAE4D9] italic">
                <FiInfo size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Request already {booking.requestStatus}
                </span>
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl border border-[#EAE4D9]">
                <FiAlertCircle size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Travel Date Passed · No Action Possible
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onReject(booking._id, "flight", "reject")}
                  disabled={!isVerified}
                  className={`px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl transition-all uppercase tracking-tight ${!isVerified ? "opacity-30 cursor-not-allowed bg-slate-100 border-[#EAE4D9]" : "hover:bg-red-50"}`}
                  title={!isVerified ? "Account pending verification" : ""}
                >
                  Reject Request
                </button>
                <button
                  onClick={() => onApprove(booking._id, "flight", "approve")}
                  disabled={!isVerified}
                  className={`px-5 py-2 bg-[#22C55E] text-white font-black text-[11px] rounded-xl shadow-lg transition-all flex items-center gap-2 uppercase tracking-tight ${!isVerified ? "bg-slate-300 cursor-not-allowed shadow-none" : "hover:bg-emerald-600 shadow-emerald-100"}`}
                  title={!isVerified ? "Account pending verification" : ""}
                >
                  <FiCheckCircle size={14} />
                  Approve & Proceed
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white px-6 border-b border-[#EAE4D9] flex items-center gap-8 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: "details", label: "Flight Details", icon: <FaPlane /> },
            { id: "project", label: "Project", icon: <FiBriefcase /> },
            {
              id: "charges",
              label: "Charges and rules",
              icon: <FiDollarSign />,
            },
            { id: "passenger", label: "Passenger", icon: <FiUser /> },
            { id: "history", label: "Booking History", icon: <FiClock /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${
                activeTab === tab.id
                  ? "text-[#B5862A]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span
                className={
                  activeTab === tab.id ? "text-[#B5862A]" : "text-slate-300"
                }
              >
                {tab.icon}
              </span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B5862A] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#FAF8F4]/30">
          <div className="max-w-7xl mx-auto">
            {activeTab === "details" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Left Column */}
                <div className="flex-1 space-y-6">
                  {/* Itinerary */}
                  <div className="space-y-4">
                    <SectionLabel icon={<FaPlane />} title="Flight Itinerary" />
                    {segments.map((seg, idx) => {
                      const detailedSeg =
                        allDetailedSegments.find(
                          (ds) =>
                            ds.Airline?.FlightNumber === seg.flightNumber &&
                            ds.Origin?.Airport?.AirportCode ===
                              seg.origin?.airportCode,
                        ) || {};

                      const origin = seg.origin || {};
                      const destination = seg.destination || {};
                      const originName =
                        detailedSeg.Origin?.Airport?.AirportName ||
                        origin.airportName ||
                        origin.city;
                      const destName =
                        detailedSeg.Destination?.Airport?.AirportName ||
                        destination.airportName ||
                        destination.city;
                      const supplierFareClass =
                        detailedSeg.SupplierFareClass ||
                        seg.supplierFareClass ||
                        "N/A";

                      const isRefundable =
                        fareSnapshot.refundable ??
                        fareQuoteResult?.IsRefundable ??
                        false;
                      const journeyKey =
                        seg.journeyType === "return" ? "return" : "onward";
                      const legLabel =
                        journeyKey === "return"
                          ? "Return Flight"
                          : "Departure Flight";

                      return (
                        <React.Fragment key={idx}>
                          <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black bg-[#B5862A] text-white px-3 py-1 rounded-full uppercase shadow-sm tracking-widest">
                                  {legLabel}
                                </span>
                                <span className="text-sm font-black text-[#1A1714] tracking-tight uppercase italic">
                                  {seg.airlineName} · {seg.airlineCode}
                                  {seg.flightNumber} · {supplierFareClass}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black bg-[#FAF8F4] text-[#B5862A] px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                  {cabinDisplay}
                                </span>
                                {isRefundable ? (
                                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1.5">
                                    <FiCheckCircle size={10} /> Refundable
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100 uppercase tracking-widest flex items-center gap-1.5">
                                    <FiXCircle size={10} /> Non-Refundable
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-12 py-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-4xl font-black text-[#1A1714] tracking-tighter italic leading-none">
                                  {origin.airportCode}
                                </h4>
                                <p className="text-[11px] font-black text-[#1A1714] mt-2 truncate uppercase tracking-tighter">
                                  {originName}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                                  {origin.city}{" "}
                                  {origin.terminal
                                    ? `· T${origin.terminal}`
                                    : ""}
                                </p>
                                <div className="mt-4">
                                  <p className="text-xl font-black text-[#B5862A] leading-none">
                                    {formatTime(seg.departureDateTime)}
                                  </p>
                                  <p className="text-[11px] font-black text-[#1A1714] uppercase mt-1.5 italic">
                                    {formatDate(seg.departureDateTime)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                  {seg.durationMinutes
                                    ? `${Math.floor(seg.durationMinutes / 60)}h ${seg.durationMinutes % 60}m`
                                    : "—"}
                                </p>
                                <div className="w-full flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#B5862A] shadow-lg shadow-indigo-100 shrink-0" />
                                  <div className="flex-1 border-t-2 border-dashed border-[#EAE4D9] relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full border border-[#EAE4D9] shadow-sm">
                                      <FaPlane
                                        className="text-[#B5862A] rotate-90"
                                        size={12}
                                      />
                                    </div>
                                  </div>
                                  <div className="w-2 h-2 rounded-full bg-[#B5862A] shadow-lg shadow-indigo-100 shrink-0" />
                                </div>
                                <div className="mt-3">
                                  <span
                                    className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border"
                                    style={{
                                      color:
                                        seg.fareClassification?.color ||
                                        "#94a3b8",
                                      borderColor: seg.fareClassification?.color
                                        ? `${seg.fareClassification.color}60`
                                        : "#e2e8f0",
                                      backgroundColor: seg.fareClassification
                                        ?.color
                                        ? `${seg.fareClassification.color}10`
                                        : "#f8fafc",
                                    }}
                                  >
                                    {seg.fareClassification?.type ||
                                      fareQuoteResult.ResultFareType ||
                                      "Regular Fare"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 text-right">
                                <h4 className="text-4xl font-black text-[#1A1714] tracking-tighter italic leading-none">
                                  {destination.airportCode}
                                </h4>
                                <p className="text-[11px] font-black text-[#1A1714] mt-2 truncate uppercase tracking-tighter">
                                  {destName}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                                  {destination.city}{" "}
                                  {destination.terminal
                                    ? `· T${destination.terminal}`
                                    : ""}
                                </p>
                                <div className="mt-4">
                                  <p className="text-xl font-black text-[#B5862A] leading-none">
                                    {formatTime(seg.arrivalDateTime)}
                                  </p>
                                  <p className="text-[11px] font-black text-[#1A1714] uppercase mt-1.5 italic">
                                    {formatDate(seg.arrivalDateTime)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50">
                              <TravellerField
                                icon={<FiPackage />}
                                label="Check-In Baggage"
                                value={seg.baggage?.checkIn}
                              />
                              <TravellerField
                                icon={<FiPackage />}
                                label="Cabin Baggage"
                                value={seg.baggage?.cabin}
                              />
                              <TravellerField
                                icon={<FiTag />}
                                label="Supplier Fare Class"
                                value={supplierFareClass}
                              />
                            </div>
                          </div>

                          {/* Layover Indicator */}
                          {idx < segments.length - 1 &&
                            (seg.journeyType || "onward") ===
                              (segments[idx + 1].journeyType || "onward") && (
                              <div className="flex items-center gap-4 py-2 px-6">
                                <div className="flex-1 border-t border-dashed border-[#EAE4D9]" />
                                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">
                                  <FiClock
                                    size={12}
                                    className="animate-pulse text-amber-600"
                                  />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    Layover in{" "}
                                    {destination.city || "Connection"}:{" "}
                                    {calculateLayover(
                                      seg.arrivalDateTime,
                                      segments[idx + 1].departureDateTime,
                                    )}
                                  </span>
                                </div>
                                <div className="flex-1 border-t border-dashed border-[#EAE4D9]" />
                              </div>
                            )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* SSR Details (Segment-wise Table) */}
                  {(ssrSnap.seats?.length || 0) +
                    (ssrSnap.meals?.length || 0) +
                    (ssrSnap.baggage?.length || 0) >
                    0 && (
                    <div className="space-y-4">
                      <SectionLabel
                        icon={<FiTag />}
                        title="Extra Add-ons (SSR Details)"
                      />
                      <div className="bg-white border border-[#EAE4D9] rounded-3xl p-6 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="pb-4 text-left">Route</th>
                                <th className="pb-4 text-left">
                                  Seat Selection
                                </th>
                                <th className="pb-4 text-left">
                                  Meal Selection
                                </th>
                                <th className="pb-4 text-left">
                                  Extra Baggage
                                </th>
                                <th className="pb-4 text-right">
                                  Total Add-on Cost
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {Array.from(
                                new Set([
                                  ...(ssrSnap.seats || []).map(
                                    (s) => s.segmentIndex,
                                  ),
                                  ...(ssrSnap.meals || []).map(
                                    (m) => m.segmentIndex,
                                  ),
                                  ...(ssrSnap.baggage || []).map(
                                    (b) => b.segmentIndex,
                                  ),
                                ]),
                              )
                                .sort((a, b) => a - b)
                                .map((segIdx) => {
                                  const seg = segments[segIdx] || {};
                                  const segSeats = (ssrSnap.seats || []).filter(
                                    (s) => s.segmentIndex === segIdx,
                                  );
                                  const segMeals = (ssrSnap.meals || []).filter(
                                    (m) => m.segmentIndex === segIdx,
                                  );
                                  const segBaggage = (
                                    ssrSnap.baggage || []
                                  ).filter((b) => b.segmentIndex === segIdx);

                                  const segTotal = [
                                    ...segSeats,
                                    ...segMeals,
                                    ...segBaggage,
                                  ].reduce(
                                    (acc, curr) => acc + (curr.price || 0),
                                    0,
                                  );

                                  return (
                                    <tr
                                      key={segIdx}
                                      className="text-xs font-black text-slate-700 hover:bg-[#FAF8F4]/50 transition-colors"
                                    >
                                      <td className="py-5 pr-4">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-black text-[#1A1714] tracking-tighter italic">
                                            {seg.origin?.airportCode || "???"} →{" "}
                                            {seg.destination?.airportCode ||
                                              "???"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-5 pr-4">
                                        {segSeats.length > 0 ? (
                                          <div className="space-y-1">
                                            {segSeats.map((s, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-2"
                                              >
                                                <span className="bg-[#FAF8F4] text-[#B5862A] px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                                  SEAT {s.seatNo}
                                                </span>
                                                <span className="text-[9px] text-slate-400">
                                                  ₹{s.price || 0}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-5 pr-4">
                                        {segMeals.length > 0 ? (
                                          <div className="space-y-2">
                                            {segMeals.map((m, idx) => (
                                              <div
                                                key={idx}
                                                className="flex flex-col gap-0.5"
                                              >
                                                <span className="text-[10px] font-black text-[#1A1714] leading-tight uppercase">
                                                  {m.airlineDescription ||
                                                    m.code}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                                                    {getMealDesc(m.description)}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400">
                                                    ₹{m.price || 0}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-5 pr-4">
                                        {segBaggage.length > 0 ? (
                                          <div className="space-y-1">
                                            {segBaggage.map((b, idx) => (
                                              <div
                                                key={idx}
                                                className="flex flex-col gap-0.5"
                                              >
                                                <span className="text-[10px] font-black text-[#1A1714] uppercase italic leading-tight">
                                                  {b.weight} KG Extra
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[8px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded uppercase">
                                                    {getBaggageDesc(
                                                      b.description,
                                                    )}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400">
                                                    ₹{b.price || 0}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-5 text-right font-mono text-sm text-[#1A1714]">
                                        ₹{segTotal.toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-[#EAE4D9] bg-[#FAF8F4]/30">
                                <td
                                  colSpan={4}
                                  className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic"
                                >
                                  Combined SSR Total
                                </td>
                                <td className="py-4 text-right text-base font-black text-[#B5862A] tracking-tighter">
                                  ₹
                                  {[
                                    ...(ssrSnap.seats || []),
                                    ...(ssrSnap.meals || []),
                                    ...(ssrSnap.baggage || []),
                                  ]
                                    .reduce(
                                      (acc, curr) => acc + (curr.price || 0),
                                      0,
                                    )
                                    .toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="w-full lg:w-96 space-y-6">
                  {/* Fare Breakdown */}
                  <div className="bg-gradient-to-br from-[#003399] to-[#000d26] text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <SectionLabel
                      icon={<FiDollarSign />}
                      title="Fare Snapshot"
                    />
                    <div className="mt-8 relative">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                        Total Payable Amount
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-500 italic">
                          INR
                        </span>
                        <h4 className="text-5xl font-black text-[#C9A84C] tracking-tighter italic tabular-nums">
                          {Math.ceil(displayTotal)?.toLocaleString()}
                        </h4>
                      </div>
                      <div className="mt-8 space-y-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                          <span className="text-slate-400">Base Fare</span>
                          <span className="text-slate-100">
                            ₹{Math.ceil(baseFare).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                          <span className="text-slate-400">Taxes & Fees</span>
                          <span className="text-slate-100">
                            ₹{Math.ceil(totalTax).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                          <span className="text-slate-400">SSR Add-ons</span>
                          <span className="text-[#C9A84C]">
                            ₹
                            {[
                              ...(ssrSnap.seats || []),
                              ...(ssrSnap.meals || []),
                              ...(ssrSnap.baggage || []),
                            ]
                              .reduce((acc, curr) => acc + (curr.price || 0), 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase">
                            Net Payable
                          </span>
                          <span className="text-xl font-black text-white italic tracking-tighter">
                            ₹ {Math.ceil(displayTotal)?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FAF8F4]0/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "project" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 space-y-6">
                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel
                      icon={<FiBriefcase />}
                      title="Project Context"
                    />
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project Name
                        </p>
                        <p className="text-base font-black text-[#1A1714] uppercase tracking-tighter">
                          {booking.projectName || "Internal Business"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project Client
                        </p>
                        <p className="text-base font-black text-slate-700 truncate uppercase">
                          {booking.projectClient || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Project ID / Code
                        </p>
                        <p className="text-sm font-mono font-black text-slate-700 bg-[#FAF8F4] px-3 py-1 rounded-lg border border-[#EAE4D9] inline-block">
                          {booking.projectId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Assigned Approver
                        </p>
                        <p className="text-sm font-black text-[#1A1714] uppercase tracking-tighter">
                          {approver.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          {approver.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                    <SectionLabel icon={<FiUser />} title="Requested By" />
                    <div className="mt-8 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-[#FAF8F4] border border-[#EAE4D9] flex items-center justify-center text-slate-400 font-black text-2xl italic shadow-inner">
                        {
                          (booking.requesterDetails?.name ||
                            booking.userId?.name?.firstName ||
                            "?")[0]
                        }
                      </div>
                      <div>
                        <p className="text-xl font-black text-[#1A1714] uppercase tracking-tighter italic">
                          {booking.requesterDetails?.name ||
                            `${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""}`.trim()}
                        </p>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {booking.requesterDetails?.email ||
                            booking.userId?.email}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="text-[10px] font-black text-[#B5862A] bg-[#FAF8F4] px-3 py-1 rounded-full uppercase tracking-widest italic border border-indigo-100">
                            Role:{" "}
                            {booking.requesterDetails?.role || "Team Member"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Reason for Travel
                      </p>
                      <div className="bg-[#FAF8F4] p-6 rounded-[2rem] border border-[#EAE4D9] italic text-sm font-black text-slate-700 leading-relaxed shadow-inner">
                        "
                        {booking.purposeOfTravel ||
                          "Internal business requirement"}
                        "
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "charges" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  {/* Cancellation & Fare Rules */}
                  {(miniFareRules.length > 0 || fareRules.length > 0) && (
                    <div className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm">
                      <SectionLabel
                        icon={<FiAlertCircle />}
                        title="Cancellation & Date Change Rules"
                      />
                      <div className="mt-8 grid grid-cols-1 gap-6">
                        {miniFareRules.map((group, gIdx) => (
                          <div
                            key={gIdx}
                            className="bg-[#FAF8F4]/50 border border-[#EAE4D9] rounded-3xl p-6 space-y-6"
                          >
                            <div className="flex items-center gap-3 pb-4 border-b border-[#EAE4D9]">
                              <div className="p-2 bg-[#B5862A] text-white rounded-xl shadow-lg shadow-indigo-100">
                                <FiMapPin size={14} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Sector Route
                                </p>
                                <p className="text-sm font-black text-[#1A1714] uppercase italic">
                                  {group[0]?.JourneyPoints || "All Sectors"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {group.map((rule, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-5 bg-white rounded-2xl border border-[#EAE4D9] shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all"
                                >
                                  <div className="flex justify-between items-start mb-4">
                                    <span
                                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${rule.Type === "Cancellation" ? "bg-red-50 text-red-600 border border-red-100" : "bg-[#FAF8F4] text-blue-600 border border-blue-100"}`}
                                    >
                                      {rule.Type}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      {rule.Unit}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                      {rule.From ? `From ${rule.From} ` : ""}{" "}
                                      {rule.To ? `to ${rule.To} ` : "onwards "}
                                    </p>
                                    <p
                                      className={`text-xl font-black tracking-tighter ${rule.Details === "100%" || rule.Details?.toLowerCase().includes("non") ? "text-red-600" : rule.Details?.toLowerCase() === "nil" ? "text-emerald-600" : "text-[#B5862A]"}`}
                                    >
                                      {rule.Details}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {fareRules.map(
                          (rule, idx) =>
                            rule.FareRuleDetail && (
                              <div
                                key={idx}
                                className="bg-[#FAF8F4] border border-[#EAE4D9] rounded-2xl p-6"
                              >
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">
                                  Detailed Rule: {rule.Origin} to{" "}
                                  {rule.Destination}
                                </p>
                                <div className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                  {rule.FareRuleDetail}
                                </div>
                              </div>
                            ),
                        )}
                      </div>
                    </div>
                  )}

                  {!miniFareRules.length &&
                    !fareRules.some((r) => r.FareRuleDetail) && (
                      <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-[#EAE4D9] shadow-sm">
                        <FiAlertCircle
                          className="mx-auto text-amber-400 mb-4 animate-bounce"
                          size={48}
                        />
                        <h3 className="text-xl font-black text-[#1A1714] uppercase tracking-tight italic">
                          Policy Data Not Available
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                          Fare rules were not captured for this request
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {activeTab === "passenger" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  <SectionLabel
                    icon={<FiUser />}
                    title={`Passenger Information (${travelers.length})`}
                  />
                  <div className="grid grid-cols-1 gap-6">
                    {travelers.map((pax, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-[#EAE4D9] rounded-3xl p-8 shadow-sm"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-[#1A1C20] text-[#C9A84C] flex items-center justify-center font-black text-2xl shadow-lg uppercase italic">
                            {pax.firstName?.[0]}
                            {pax.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-2xl font-black text-[#1A1714] uppercase tracking-tighter italic">
                              {pax.title} {pax.firstName} {pax.lastName}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[10px] font-black bg-[#1A1C20] text-white px-3 py-1 rounded-full uppercase tracking-widest">
                                {pax.paxType || "Adult"}
                              </span>
                              {pax.isLeadPassenger && (
                                <span className="text-[10px] font-black bg-[#C9A84C] text-[#1A1714] px-3 py-1 rounded-full uppercase tracking-widest">
                                  Lead Passenger
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-10 pt-8 border-t border-slate-50">
                          <TravellerField
                            icon={<FiUser />}
                            label="Gender"
                            value={formatGender(pax)}
                          />
                          <TravellerField
                            icon={<FiCalendar />}
                            label="Date of Birth"
                            value={formatPaxDob(pax)}
                          />
                          <TravellerField
                            icon={<FiGlobe />}
                            label="Nationality"
                            value={formatNationality(pax)}
                          />
                          <TravellerField
                            icon={<FiMail />}
                            label="Email"
                            value={formatPaxEmail(pax)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex justify-center py-10">
                <div className="bg-white border border-[#EAE4D9] rounded-[3rem] p-12 shadow-xl shadow-slate-100/50 w-full max-w-6xl">
                  <SectionLabel
                    icon={<FiClock className="text-[#B5862A]" />}
                    title="Approval Request Timeline"
                  />
                  <div className="mt-16 flex items-start">
                    <TimelineItem
                      horizontal
                      title="Request Initiated"
                      time={formatDateTime(booking.createdAt)}
                      status="completed"
                      description={`Travel request created by ${booking.requesterDetails?.name || booking.userId?.name?.firstName || "Traveler"}`}
                    />
                    <TimelineItem
                      horizontal
                      title="Approval Workflow Assigned"
                      time={formatDateTime(booking.createdAt)}
                      status="completed"
                      description={
                        approver.name === "Auto Approved"
                          ? "System detected auto-approval policy compliance."
                          : `Route assigned to ${approver.name} (${approver.role})`
                      }
                    />

                    {booking.requestStatus === "approved" ? (
                      <TimelineItem
                        horizontal
                        title={
                          approver.name === "Auto Approved"
                            ? "Auto Approved"
                            : "Request Approved"
                        }
                        time={formatDateTime(booking.approvedAt)}
                        status="completed"
                        description={
                          approver.name === "Auto Approved"
                            ? "Booking was automatically approved based on corporate policy limits."
                            : `Request approved by ${approver.name}.`
                        }
                      />
                    ) : booking.requestStatus === "rejected" ? (
                      <TimelineItem
                        horizontal
                        title="Request Rejected"
                        time={formatDateTime(booking.updatedAt)}
                        status="rejected"
                        description={`Request was rejected by ${approver.name}.`}
                      />
                    ) : (
                      <TimelineItem
                        horizontal
                        title="Awaiting Review"
                        time="Present"
                        status="pending"
                        active={true}
                        description={`Currently pending with ${approver.name}. Awaiting final decision.`}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingHotelDetailsModal;
