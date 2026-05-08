import React from "react";
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
  FiLayers,
} from "react-icons/fi";
import {
  formatDate,
  formatDateTime,
  formatDateWithYear,
} from "../../../utils/formatter";
import { InfoBadge, SectionLabel } from "../Shared/CommonComponents";

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
    email: approver?.email || booking?.approverEmail || "N/A",
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

const TimelineItem = ({ title, time, status, description, active }) => (
  <div className="flex gap-4 relative">
    <div className="flex flex-col items-center">
      <div
        className={`w-3.5 h-3.5 rounded-full border-2 z-10 ${
          status === "completed"
            ? "bg-emerald-500 border-emerald-100"
            : active
              ? "bg-amber-400 border-amber-100 animate-pulse"
              : "bg-slate-200 border-slate-100"
        }`}
      />
    </div>
    <div className="-mt-1 pb-6">
      <p
        className={`text-xs font-black ${active ? "text-slate-900" : "text-slate-500"}`}
      >
        {title}
      </p>
      <p className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">
        {time}
      </p>
      {description && (
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
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
  const approver = resolveApproverDetails(booking);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
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
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
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
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 uppercase tracking-tighter font-black">
                Expired
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Approval
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-4">
              <FiClock className="text-slate-400" />
              <span>{formatDateTime(booking.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-4">
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
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 italic">
                <FiInfo size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Request already {booking.requestStatus}
                </span>
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl border border-slate-200">
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
                  className={`px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl transition-all uppercase tracking-tight ${!isVerified ? "opacity-30 cursor-not-allowed bg-slate-100 border-slate-200" : "hover:bg-red-50"}`}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-50/30">
          <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Left Column */}
            <div className="flex-1 space-y-6">
              {/* Hotel Snapshot */}
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                <div className="w-full md:w-64 h-48 md:h-auto relative shrink-0">
                  <img
                    src={
                      bookSnap.hotelImage ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500"
                    }
                    alt={bookSnap.hotelName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20 shadow-xl">
                      Confirmed Rate
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase italic">
                        {bookSnap.hotelName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2 font-medium">
                        <FiMapPin className="text-indigo-500" />{" "}
                        {hotelRequest?.selectedHotel?.address || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          size={12}
                          fill={
                            i < (hotelRequest?.selectedHotel?.starRating || 4)
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
                {rawRooms.map((r, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5"
                  >
                    <div className="flex justify-between items-start border-b border-slate-50 pb-5">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                          {r.Name?.[0] || "Standard Room"}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase border border-indigo-100 flex items-center gap-1.5">
                            <FiCoffee size={10} /> {r.MealType || "Room Only"}
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
                          Per Night
                        </p>
                        <p className="text-2xl font-black text-indigo-700 tracking-tighter">
                          ₹{r.Price?.perNight?.toLocaleString() || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                className="text-[10px] font-bold bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-100 shadow-sm"
                              >
                                {inc.trim()}
                              </span>
                            ))}
                        </div>
                      </div>
                      {r.RoomPromotion && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
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
                ))}
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <SectionLabel icon={<FiDollarSign />} title="Fare Summary" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden md:col-span-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      Total Amount (Inc. Tax)
                    </p>
                    <h4 className="text-4xl font-black text-[#C9A84C] tracking-tighter">
                      INR{" "}
                      {booking.pricingSnapshot?.totalAmount?.toLocaleString()}
                    </h4>
                    <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-bold uppercase">
                          Base Price
                        </span>
                        <span className="text-slate-200 font-black">
                          ₹{roomData.Price?.baseFare?.toLocaleString() || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-bold uppercase">
                          Taxes & Fees
                        </span>
                        <span className="text-slate-200 font-black">
                          ₹{roomData.Price?.tax?.toLocaleString() || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3">
                      Cancellation Policies
                    </p>
                    <div className="space-y-3">
                      {rawRooms?.[0]?.CancelPolicies?.map((policy, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <span className="font-bold text-slate-600 uppercase tracking-tight">
                            From {policy.FromDate.split(" ")[0]}
                          </span>
                          <span
                            className={`font-black ${policy.CancellationCharge === 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {policy.CancellationCharge === 0
                              ? "FREE CANCELLATION"
                              : `PENALTY: ₹${policy.CancellationCharge.toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Travellers */}
              <div className="space-y-4">
                <SectionLabel
                  icon={<FiUser />}
                  title={`Passengers (${travelers.length})`}
                />
                <div className="grid grid-cols-1 gap-4">
                  {travelers.map((pax, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#C9A84C] flex items-center justify-center font-black text-xl shadow-lg uppercase italic">
                          {pax.firstName?.[0]}
                          {pax.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">
                            {pax.title} {pax.firstName} {pax.lastName}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-widest">
                              {pax.paxType || "Adult"}
                            </span>
                            {pax.isLeadPassenger && (
                              <span className="text-[9px] font-black bg-[#C9A84C] text-slate-900 px-2 py-0.5 rounded uppercase tracking-widest">
                                Lead Passenger
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8 pt-6 border-t border-slate-50">
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

            {/* Right Column (Sidebar) */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Project Details */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiBriefcase />} title="Project Context" />
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Project Name
                    </p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                      {booking.projectName || "Internal Business"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Client
                      </p>
                      <p className="text-xs font-black text-slate-700 truncate">
                        {booking.projectClient || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Project ID
                      </p>
                      <p className="text-xs font-mono font-black text-slate-700">
                        {booking.projectId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Assigned Approver
                    </p>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                      {approver.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {approver.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requester Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiUser />} title="Requested By" />
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm italic shadow-inner">
                    {
                      (booking.requesterDetails?.name ||
                        booking.userId?.name?.firstName ||
                        "?")[0]
                    }
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                      {booking.requesterDetails?.name ||
                        `${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""}`.trim()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {booking.requesterDetails?.email || booking.userId?.email}
                    </p>
                    {booking.requesterDetails?.role && (
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 italic">
                        Role: {booking.requesterDetails.role}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Reason for Travel
                  </p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-xs font-black text-slate-700 leading-relaxed shadow-inner">
                    "
                    {booking.purposeOfTravel || "Internal business requirement"}
                    "
                  </div>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiClock />} title="Request Audit" />
                <div className="mt-8 relative">
                  <div className="absolute left-[6.5px] top-2 bottom-2 w-[1px] bg-slate-100" />
                  <TimelineItem
                    title="Request Submitted"
                    time={formatDateTime(booking.createdAt)}
                    status="completed"
                    description={`By ${booking.requesterDetails?.name || booking.userId?.name?.firstName}`}
                  />
                  <TimelineItem
                    title="Approval Workflow"
                    time={formatDateTime(booking.createdAt)}
                    status="completed"
                    description={`Sent to ${approver.name}`}
                  />
                  <TimelineItem
                    title="Awaiting Review"
                    time="Current Status"
                    status="pending"
                    active={true}
                    description={`${approver.name} is reviewing`}
                  />
                </div>
              </div>
            </div>
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
  const baseFare = fareSnapshot.baseFare ?? fareQuoteResult.Fare?.BaseFare ?? 0;
  const totalTax = fareSnapshot.tax ?? fareQuoteResult.Fare?.Tax ?? 0;
  const publishFare = fareQuoteResult.Fare?.PublishedFare;

  const onwardSegments = segments.filter(
    (s) => (s.journeyType || "onward") !== "return",
  );
  const returnSegments = segments.filter((s) => s.journeyType === "return");

  // Flatten detailed segments from fareQuote for easy lookup
  const allDetailedSegments = (fareQuoteResult.Segments || []).flat();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
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
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
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
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 uppercase tracking-tighter font-black">
                Expired
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Approval
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-4">
              <FiClock className="text-slate-400" />
              <span>Submitted: {formatDateTime(booking.createdAt)}</span>
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
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 italic">
                <FiInfo size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-tight">
                  Request already {booking.requestStatus}
                </span>
              </div>
            ) : isDiscarded ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl border border-slate-200">
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
                  className={`px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl transition-all uppercase tracking-tight ${!isVerified ? "opacity-30 cursor-not-allowed bg-slate-100 border-slate-200" : "hover:bg-red-50"}`}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-50/30">
          <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
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
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase shadow-sm tracking-widest">
                              {legLabel}
                            </span>
                            <span className="text-sm font-black text-slate-800 tracking-tight uppercase italic">
                              {seg.airlineName} · {seg.airlineCode}
                              {seg.flightNumber} · {supplierFareClass}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
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
                            <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
                              {origin.airportCode}
                            </h4>
                            <p className="text-[11px] font-black text-slate-800 mt-2 truncate uppercase tracking-tighter">
                              {originName}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                              {origin.city}{" "}
                              {origin.terminal ? `· T${origin.terminal}` : ""}
                            </p>
                            <div className="mt-4">
                              <p className="text-xl font-black text-indigo-700 leading-none">
                                {formatTime(seg.departureDateTime)}
                              </p>
                              <p className="text-[11px] font-black text-slate-900 uppercase mt-1.5 italic">
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
                              <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100 shrink-0" />
                              <div className="flex-1 border-t-2 border-dashed border-slate-200 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                  <FaPlane
                                    className="text-indigo-600 rotate-90"
                                    size={12}
                                  />
                                </div>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100 shrink-0" />
                            </div>
                            <div className="mt-3">
                              <span
                                className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border"
                                style={{
                                  color:
                                    seg.fareClassification?.color || "#94a3b8",
                                  borderColor: seg.fareClassification?.color
                                    ? `${seg.fareClassification.color}60`
                                    : "#e2e8f0",
                                  backgroundColor: seg.fareClassification?.color
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
                            <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
                              {destination.airportCode}
                            </h4>
                            <p className="text-[11px] font-black text-slate-800 mt-2 truncate uppercase tracking-tighter">
                              {destName}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                              {destination.city}{" "}
                              {destination.terminal
                                ? `· T${destination.terminal}`
                                : ""}
                            </p>
                            <div className="mt-4">
                              <p className="text-xl font-black text-indigo-700 leading-none">
                                {formatTime(seg.arrivalDateTime)}
                              </p>
                              <p className="text-[11px] font-black text-slate-900 uppercase mt-1.5 italic">
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
                            <div className="flex-1 border-t border-dashed border-slate-200" />
                            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">
                              <FiClock
                                size={12}
                                className="animate-pulse text-amber-600"
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Layover in {destination.city || "Connection"}:{" "}
                                {calculateLayover(
                                  seg.arrivalDateTime,
                                  segments[idx + 1].departureDateTime,
                                )}
                              </span>
                            </div>
                            <div className="flex-1 border-t border-dashed border-slate-200" />
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
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="pb-4 text-left">Route</th>
                            <th className="pb-4 text-left">Seat Selection</th>
                            <th className="pb-4 text-left">Meal Selection</th>
                            <th className="pb-4 text-left">Extra Baggage</th>
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
                              const segBaggage = (ssrSnap.baggage || []).filter(
                                (b) => b.segmentIndex === segIdx,
                              );

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
                                  className="text-xs font-black text-slate-700 hover:bg-slate-50/50 transition-colors"
                                >
                                  <td className="py-5 pr-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-900 tracking-tighter italic">
                                        {seg.origin?.airportCode || "???"} →{" "}
                                        {seg.destination?.airportCode || "???"}
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
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">
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
                                            <span className="text-[10px] font-black text-slate-800 leading-tight uppercase">
                                              {m.airlineDescription || m.code}
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
                                            <span className="text-[10px] font-black text-slate-800 uppercase italic leading-tight">
                                              {b.weight} KG Extra
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[8px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded uppercase">
                                                {getBaggageDesc(b.description)}
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
                                  <td className="py-5 text-right font-mono text-sm text-slate-900">
                                    ₹{segTotal.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-100 bg-slate-50/30">
                            <td
                              colSpan={4}
                              className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic"
                            >
                              Combined SSR Total
                            </td>
                            <td className="py-4 text-right text-base font-black text-indigo-700 tracking-tighter">
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

                    {/* SSR Legend Note */}
                    <div className="mt-8 pt-6 border-t border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        SSR Status Legend
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">
                            Seats
                          </p>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                            1: Included (Fare) <br />
                            2: Purchase (Extra)
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-amber-600 uppercase mb-1">
                            Meals
                          </p>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                            1: Included · 2: Direct <br />
                            3: Imported
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-purple-600 uppercase mb-1">
                            Baggage
                          </p>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                            1: Included · 2: Direct <br />
                            5: ImportedUpgrade
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Fare Breakdown */}
              <div className="space-y-4">
                <SectionLabel
                  icon={<FiDollarSign />}
                  title="Fare Breakdown & Payments"
                />
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -ml-24 -mb-24" />

                  <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                        Total Payable Amount
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-500 italic">
                          INR
                        </span>
                        <h4 className="text-5xl font-black text-[#C9A84C] tracking-tighter italic tabular-nums">
                          {Math.ceil(
                            pricingSnapshot.totalAmount,
                          )?.toLocaleString()}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">
                          Fare Captured:{" "}
                          {formatDateTime(pricingSnapshot.capturedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-80 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                        <span className="text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-600" />{" "}
                          Total Fare{" "}
                          <span className="text-[10px] font-normal text-slate-500 italic lowercase">
                            {" "}
                            (incl. all taxes and charges)
                          </span>
                        </span>
                        <span className="text-slate-100 font-mono">
                          ₹{Math.ceil(publishFare).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
                        <span className="text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-600" />{" "}
                          SSR Add-ons
                        </span>
                        <span className="text-[#C9A84C] font-mono">
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
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Net Payable
                        </span>
                        <span className="text-lg font-black text-white italic tracking-tighter">
                          ₹{" "}
                          {Math.ceil(
                            pricingSnapshot.totalAmount,
                          )?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation & Fare Rules */}
              {/* Guard: show section only when there's actual rule data to display */}
              {(miniFareRules.length > 0 || fareRules.length > 0) && (
                <div className="space-y-4">
                  <SectionLabel
                    icon={<FiAlertCircle />}
                    title="Cancellation & Date Change Rules"
                  />
                  <div className="grid grid-cols-1 gap-4">
                    {miniFareRules.map((group, gIdx) => (
                      <div
                        key={gIdx}
                        className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5"
                      >
                        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-50">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FiMapPin size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                              Route Specific Rules
                            </p>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                              {group[0]?.JourneyPoints || "All Sectors"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.map((rule, rIdx) => (
                            <div
                              key={rIdx}
                              className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all group"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    rule.Type === "Cancellation"
                                      ? "bg-red-50 text-red-600 border border-red-100"
                                      : "bg-blue-50 text-blue-600 border border-blue-100"
                                  }`}
                                >
                                  {rule.Type}
                                </span>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <FiClock
                                    size={10}
                                    className="group-hover:text-indigo-500 transition-colors"
                                  />
                                  <span className="text-[9px] font-black uppercase tracking-widest">
                                    {rule.Unit || "—"}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                  {rule.From || rule.To ? (
                                    <>
                                      {rule.From ? `From ${rule.From} ` : ""}
                                      {rule.To ? `to ${rule.To} ` : "onwards "}
                                      {(rule.Unit || "").toLowerCase()}
                                    </>
                                  ) : (
                                    "Policy applies at all times"
                                  )}
                                </p>
                                <p
                                  className={`text-xl font-black tracking-tighter ${
                                    rule.Details === "100%" ||
                                    rule.Details?.toLowerCase().includes("non")
                                      ? "text-red-600"
                                      : rule.Details?.toLowerCase() === "nil"
                                        ? "text-emerald-600"
                                        : "text-indigo-700"
                                  }`}
                                >
                                  {rule.Details}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Fallback: when no mini rules AND no detailed fare rule text exists */}
                    {miniFareRules.length === 0 &&
                      !fareRules.some((r) => r.FareRuleDetail) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5">
                            <FiAlertCircle size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">
                              Detailed Fare Rules Not Captured
                            </p>
                            <p className="text-xs font-bold text-amber-600 leading-relaxed">
                              Cancellation and date-change penalties were not
                              saved at booking time. Please refer to the
                              airline's website or contact support for
                              applicable charges on this fare.
                            </p>
                            {fareRules.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {fareRules.map((r, i) => (
                                  <span
                                    key={i}
                                    className="text-[9px] font-black text-amber-600 bg-amber-100 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-amber-200"
                                  >
                                    {r.FareBasisCode} · {r.Origin}→
                                    {r.Destination} · {r.Airline}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {fareRules.map(
                      (rule, idx) =>
                        rule.FareRuleDetail && (
                          <div
                            key={`fr-${idx}`}
                            className="bg-slate-50 border border-slate-100 rounded-2xl p-5"
                          >
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              Rule Detail: {rule.Origin}-{rule.Destination}
                            </p>
                            <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                              {rule.FareRuleDetail}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}

              {/* Travellers */}
              <div className="space-y-4">
                <SectionLabel
                  icon={<FiUser />}
                  title={`Passengers (${travelers.length})`}
                />
                <div className="grid grid-cols-1 gap-4">
                  {travelers.map((pax, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-[#C9A84C] flex items-center justify-center font-black text-2xl shadow-lg uppercase italic">
                          {pax.firstName?.[0]}
                          {pax.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">
                            {pax.title} {pax.firstName} {pax.lastName}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase border border-indigo-100 tracking-widest">
                              {pax.paxType || "Adult"}
                            </span>
                            {pax.isLeadPassenger && (
                              <span className="text-[9px] font-black bg-[#C9A84C]/10 text-[#C9A84C] px-3 py-1 rounded-full uppercase border border-[#C9A84C]/20 tracking-widest">
                                Lead Passenger
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8 pt-6 border-t border-slate-50">
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

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Project Details */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiBriefcase />} title="Project Context" />
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Project Name
                    </p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                      {booking.projectName || "Internal Business"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Client
                      </p>
                      <p className="text-xs font-black text-slate-700 truncate">
                        {booking.projectClient || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Project ID
                      </p>
                      <p className="text-xs font-mono font-black text-slate-700">
                        {booking.projectId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Assigned Approver
                    </p>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                      {approver.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {approver.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requester Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiUser />} title="Booking Personnel" />
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#C9A84C] flex items-center justify-center font-black text-sm italic shadow-lg">
                      {
                        (booking.requesterDetails?.name ||
                          booking.userId?.name?.firstName ||
                          "?")[0]
                      }
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Requested By
                      </p>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                        {booking.requesterDetails?.name ||
                          `${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""}`.trim()}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {booking.requesterDetails?.email ||
                          booking.userId?.email}
                      </p>
                      {booking.requesterDetails?.role && (
                        <p className="text-[9px] font-black text-[#C9A84C] uppercase tracking-widest mt-1 italic">
                          Role: {booking.requesterDetails.role}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Order ID
                    </p>
                    <p className="text-sm font-mono font-black text-indigo-600 truncate bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      {booking.orderId || booking.bookingReference}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Purpose of Travel
                  </p>
                  <div className="bg-slate-900 p-4 rounded-2xl italic text-[11px] font-black text-[#C9A84C] leading-relaxed shadow-xl border border-white/5">
                    "{booking.purposeOfTravel || "Business travel requirement"}"
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <SectionLabel icon={<FiClock />} title="Request Audit" />
                <div className="mt-8 relative">
                  <div className="absolute left-[6.5px] top-2 bottom-2 w-[1px] bg-slate-100" />
                  <TimelineItem
                    title="Submission"
                    time={formatDateTime(booking.createdAt)}
                    status="completed"
                    description={`By ${booking.requesterDetails?.name || booking.userId?.name?.firstName}`}
                  />
                  <TimelineItem
                    title="Pending Review"
                    time="Live Status"
                    status="pending"
                    active={true}
                    description={`Manager: ${approver.name}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep default export pointing to the hotel modal for backwards compatibility
export default PendingHotelDetailsModal;
