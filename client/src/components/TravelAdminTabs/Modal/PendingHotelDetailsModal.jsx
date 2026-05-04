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
  FiPhone,
  FiMail,
  FiGlobe,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiKey,
  FiNavigation,
  FiPackage,
  FiBriefcase,
  FiStar,
  FiMoon,
  FiAlertCircle,
} from "react-icons/fi";
import {
  formatDate,
  formatDateTime,
  formatDateWithYear,
} from "../../../utils/formatter";
import {
  InfoBadge,
  SectionLabel,
} from "../Shared/CommonComponents";

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

const formatPaxDob = (pax) => formatDateWithYear(pax?.dateOfBirth || pax?.dob);
const formatPaxPhone = (pax) => (pax?.phoneWithCode ? `+${pax.phoneWithCode}` : "N/A");
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

const resolveApproverDetails = (booking) => {
  const approver = booking?.approverId || booking?.approvedBy || booking?.approvedByDetails || {};
  const first = approver?.name?.firstName || approver?.firstName || booking?.approverName || "";
  const last = approver?.name?.lastName || approver?.lastName || booking?.approverLastName || "";
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

const TravellerField = ({ icon, label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5 truncate">
      {icon} {label}
    </p>
    <p className="text-xs font-semibold text-slate-700 truncate">{value || "—"}</p>
  </div>
);

const TimelineItem = ({ title, time, status, description, active }) => (
  <div className="flex gap-4 relative">
    <div className="flex flex-col items-center">
      <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 ${
        status === "completed" ? "bg-emerald-500 border-emerald-100" : 
        active ? "bg-amber-400 border-amber-100 animate-pulse" : "bg-slate-200 border-slate-100"
      }`} />
    </div>
    <div className="-mt-1 pb-6">
      <p className={`text-xs font-black ${active ? "text-slate-900" : "text-slate-500"}`}>{title}</p>
      <p className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">{time}</p>
      {description && <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{description}</p>}
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
}) => {
  if (!booking) return null;

  const hotelRequest = booking.hotelRequest || {};
  const bookSnap = booking.bookingSnapshot || {};
  const travelers = booking.travellers || [];
  const roomData = hotelRequest.selectedRoom || {};
  const rawRooms = Array.isArray(roomData.rawRoomData) ? roomData.rawRoomData : roomData.rawRoomData ? [roomData.rawRoomData] : [];
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
              <h2 className="text-lg font-black tracking-tight uppercase">Hotel Approval Request</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">{booking.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400">
            <FiX size={22} />
          </button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pending Approval
            </div>
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
            <button
              onClick={() => onReject(booking._id, "hotel", "reject")}
              className="px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl hover:bg-red-50 transition-all uppercase tracking-tight"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(booking._id, "hotel", "approve")}
              className="px-5 py-2 bg-[#22C55E] text-white font-black text-[11px] rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 uppercase tracking-tight"
            >
              <FiCheckCircle size={14} />
              Approve & Proceed
            </button>
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
                    src={bookSnap.hotelImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500"}
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
                      <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase italic">{bookSnap.hotelName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2 font-medium">
                        <FiMapPin className="text-indigo-500" /> {hotelRequest?.selectedHotel?.address || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      {[...Array(5)].map((_, i) => (
                        <FiStar key={i} size={12} fill={i < (hotelRequest?.selectedHotel?.starRating || 4) ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50">
                    <TravellerField icon={<FiCalendar />} label="Check-In" value={formatDate(bookSnap.checkInDate)} />
                    <TravellerField icon={<FiCalendar />} label="Check-Out" value={formatDate(bookSnap.checkOutDate)} />
                    <TravellerField icon={<FiMoon />} label="Nights" value={`${bookSnap.nights || 1} Night(s)`} />
                    <TravellerField icon={<FiHome />} label="Rooms" value={`${bookSnap.roomCount || 1} Room(s)`} />
                  </div>
                </div>
              </div>

              {/* Rooms */}
              <div className="space-y-4">
                <SectionLabel icon={<FiKey />} title="Selected Accommodations" />
                {rawRooms.map((r, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-start border-b border-slate-50 pb-5">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">{r.Name?.[0] || "Standard Room"}</h4>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Night</p>
                        <p className="text-2xl font-black text-indigo-700 tracking-tighter">₹{r.Price?.perNight?.toLocaleString() || "—"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Room Inclusions</p>
                        <div className="flex flex-wrap gap-2">
                          {(r.Inclusion || "Taxes Included").split(",").map((inc, j) => (
                            <span key={j} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                              {inc.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                      {r.RoomPromotion && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Special Offer</p>
                          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                            <FiTag className="shrink-0" />
                            <p className="text-[11px] font-black leading-tight">{r.RoomPromotion[0]}</p>
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Amount (Inc. Tax)</p>
                      <h4 className="text-4xl font-black text-[#C9A84C] tracking-tighter">INR {booking.pricingSnapshot?.totalAmount?.toLocaleString()}</h4>
                      <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase">Base Price</span>
                          <span className="text-slate-200 font-black">₹{roomData.Price?.baseFare?.toLocaleString() || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase">Taxes & Fees</span>
                          <span className="text-slate-200 font-black">₹{roomData.Price?.tax?.toLocaleString() || "—"}</span>
                        </div>
                      </div>
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                   </div>

                   <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3">Cancellation Policies</p>
                      <div className="space-y-3">
                         {rawRooms?.[0]?.CancelPolicies?.map((policy, idx) => (
                           <div key={idx} className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-600 uppercase tracking-tight">From {policy.FromDate.split(" ")[0]}</span>
                              <span className={`font-black ${policy.CancellationCharge === 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {policy.CancellationCharge === 0 ? "FREE CANCELLATION" : `PENALTY: ₹${policy.CancellationCharge.toLocaleString()}`}
                              </span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>

              {/* Travellers */}
              <div className="space-y-4">
                <SectionLabel icon={<FiUser />} title={`Passengers (${travelers.length})`} />
                <div className="grid grid-cols-1 gap-4">
                  {travelers.map((pax, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#C9A84C] flex items-center justify-center font-black text-xl shadow-lg uppercase italic">
                           {pax.firstName?.[0]}{pax.lastName?.[0]}
                         </div>
                         <div>
                            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">{pax.title} {pax.firstName} {pax.lastName}</p>
                            <div className="flex gap-2 mt-1">
                               <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-widest">{pax.paxType || "Adult"}</span>
                               {pax.isLeadPassenger && <span className="text-[9px] font-black bg-[#C9A84C] text-slate-900 px-2 py-0.5 rounded uppercase tracking-widest">Lead Passenger</span>}
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8 pt-6 border-t border-slate-50">
                        <TravellerField icon={<FiUser />} label="Gender" value={formatGender(pax)} />
                        <TravellerField icon={<FiCalendar />} label="DOB" value={formatPaxDob(pax)} />
                        <TravellerField icon={<FiInfo />} label="Age" value={calcAge(pax)} />
                        <TravellerField icon={<FiGlobe />} label="Nationality" value={formatNationality(pax)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST Details */}
              {booking.gstDetails && (
                <div className="space-y-4">
                  <SectionLabel icon={<FiInfo />} title="GST Information" />
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legal Entity</p>
                          <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{booking.gstDetails.legalName}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">{booking.gstDetails.gstin}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Email</p>
                          <p className="text-sm font-black text-slate-700">{booking.gstDetails.gstEmail}</p>
                       </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Address</p>
                       <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{booking.gstDetails.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Sidebar) */}
            <div className="w-full lg:w-80 space-y-6">
               {/* Requester Card */}
               <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <SectionLabel icon={<FiUser />} title="Requested By" />
                  <div className="mt-6 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm italic">
                        {booking.userId?.name?.firstName?.[0]}{booking.userId?.name?.lastName?.[0]}
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">{booking.userId?.name?.firstName} {booking.userId?.name?.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{booking.userId?.email}</p>
                     </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reason for Travel</p>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-xs font-black text-slate-700 leading-relaxed shadow-inner">
                        "{booking.purposeOfTravel || "Internal business requirement"}"
                     </div>
                  </div>
               </div>

               {/* Audit Timeline */}
               <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <SectionLabel icon={<FiClock />} title="Request Audit" />
                  <div className="mt-8 relative">
                     <div className="absolute left-[6.5px] top-2 bottom-2 w-[1px] bg-slate-100" />
                     <TimelineItem title="Request Submitted" time={formatDateTime(booking.createdAt)} status="completed" description={`By ${booking.userId?.name?.firstName}`} />
                     <TimelineItem title="Approval Workflow" time={formatDateTime(booking.createdAt)} status="completed" description={`Sent to ${approver.name}`} />
                     <TimelineItem title="Awaiting Manager" time="Current Status" status="pending" active={true} description={`${approver.name} is reviewing`} />
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
}) => {
  if (!booking) return null;

  const flightRequest = booking.flightRequest || {};
  const segments = flightRequest.segments || [];
  const fareSnapshot = flightRequest.fareSnapshot || {};
  const fareQuoteResult = flightRequest.fareQuote?.Results?.[0] || {};
  const fareBreakdown = fareQuoteResult.FareBreakdown || [];
  const miniFareRules = fareQuoteResult.MiniFareRules || [];
  const fareRules = fareQuoteResult.FareRules || [];
  const travelers = booking.travellers || [];
  const bookSnap = booking.bookingSnapshot || {};
  const approver = resolveApproverDetails(booking);
  const pricingSnapshot = booking.pricingSnapshot || {};

  const cabinLabel = { 1: "All", 2: "Economy", 3: "Premium Economy", 4: "Business", 5: "Premium Business", 6: "First Class" };
  const paxTypeLabel = { 1: "Adult", 2: "Child", 3: "Infant" };
  const cabinDisplay = bookSnap.cabinClass || cabinLabel[segments[0]?.cabinClass] || "Economy";
  const baseFare = fareSnapshot.baseFare ?? fareQuoteResult.Fare?.BaseFare ?? 0;
  const totalTax = fareSnapshot.tax ?? fareQuoteResult.Fare?.Tax ?? 0;
  const onwardSegments = segments.filter((s) => (s.journeyType || "onward") !== "return");
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
              <h2 className="text-lg font-black tracking-tight uppercase italic">Flight Approval Request</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">{booking.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400">
            <FiX size={22} />
          </button>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-tighter">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pending Approval
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-4">
               <FiClock className="text-slate-400" />
               <span>Submitted: {formatDateTime(booking.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReject(booking._id, "flight", "reject")}
              className="px-5 py-2 border border-red-100 text-red-600 font-black text-[11px] rounded-xl hover:bg-red-50 transition-all uppercase tracking-tight"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(booking._id, "flight", "approve")}
              className="px-5 py-2 bg-[#22C55E] text-white font-black text-[11px] rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 uppercase tracking-tight"
            >
              <FiCheckCircle size={14} />
              Approve & Proceed
            </button>
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
                  const detailedSeg = allDetailedSegments.find(ds => 
                    ds.Airline?.FlightNumber === seg.flightNumber && 
                    ds.Origin?.Airport?.AirportCode === seg.origin?.airportCode
                  ) || {};

                  const origin = seg.origin || {};
                  const destination = seg.destination || {};
                  const originName = detailedSeg.Origin?.Airport?.AirportName || origin.airportName || origin.city;
                  const destName = detailedSeg.Destination?.Airport?.AirportName || destination.airportName || destination.city;
                  const supplierFareClass = detailedSeg.SupplierFareClass || seg.supplierFareClass || "N/A";

                  const isRefundable = fareSnapshot.refundable ?? fareQuoteResult?.IsRefundable ?? false;
                  const journeyKey = seg.journeyType === "return" ? "return" : "onward";
                  const journeyList = journeyKey === "return" ? returnSegments : onwardSegments;
                  const legIdx = journeyList.indexOf(seg);
                  const legLabel = `${journeyKey === "return" ? "Return" : "Onward"}${journeyList.length > 1 ? ` · Leg ${legIdx + 1}` : ""}`;

                  return (
                    <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase shadow-sm tracking-widest">{legLabel}</span>
                            <span className="text-sm font-black text-slate-800 tracking-tight uppercase italic">{seg.airlineName} · {seg.airlineCode}{seg.flightNumber} · {supplierFareClass}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">{cabinDisplay}</span>
                            {isRefundable ? (
                              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1.5"><FiCheckCircle size={10} /> Refundable</span>
                            ) : (
                              <span className="text-[10px] font-black bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100 uppercase tracking-widest flex items-center gap-1.5"><FiXCircle size={10} /> Non-Refundable</span>
                            )}
                         </div>
                      </div>

                      <div className="flex items-center justify-between gap-12 py-4">
                         <div className="flex-1 min-w-0">
                            <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">{origin.airportCode}</h4>
                            <p className="text-[11px] font-black text-slate-800 mt-2 truncate uppercase tracking-tighter">
                               {originName}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                               {origin.city} {origin.terminal ? `· T${origin.terminal}` : ""}
                            </p>
                            <div className="mt-4">
                               <p className="text-xl font-black text-indigo-700 leading-none">{formatTime(seg.departureDateTime)}</p>
                               <p className="text-[11px] font-black text-slate-900 uppercase mt-1.5 italic">{formatDate(seg.departureDateTime)}</p>
                            </div>
                         </div>

                         <div className="flex-1 flex flex-col items-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                               {seg.durationMinutes ? `${Math.floor(seg.durationMinutes / 60)}h ${seg.durationMinutes % 60}m` : "—"}
                            </p>
                            <div className="w-full flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100 shrink-0" />
                               <div className="flex-1 border-t-2 border-dashed border-slate-200 relative">
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                     <FaPlane className="text-indigo-600 rotate-90" size={12} />
                                  </div>
                               </div>
                               <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100 shrink-0" />
                            </div>
                            <div className="mt-3">
                               <span 
                                 className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border"
                                 style={{ 
                                   color: seg.fareClassification?.color || '#94a3b8',
                                   borderColor: seg.fareClassification?.color ? `${seg.fareClassification.color}60` : '#e2e8f0',
                                   backgroundColor: seg.fareClassification?.color ? `${seg.fareClassification.color}10` : '#f8fafc'
                                 }}
                               >
                                 {seg.fareClassification?.type || fareQuoteResult.ResultFareType || "Regular Fare"}
                               </span>
                            </div>
                         </div>

                         <div className="flex-1 min-w-0 text-right">
                            <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">{destination.airportCode}</h4>
                            <p className="text-[11px] font-black text-slate-800 mt-2 truncate uppercase tracking-tighter">
                               {destName}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                               {destination.city} {destination.terminal ? `· T${destination.terminal}` : ""}
                            </p>
                            <div className="mt-4">
                               <p className="text-xl font-black text-indigo-700 leading-none">{formatTime(seg.arrivalDateTime)}</p>
                               <p className="text-[11px] font-black text-slate-900 uppercase mt-1.5 italic">{formatDate(seg.arrivalDateTime)}</p>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-slate-50">
                        <TravellerField icon={<FiPackage />} label="Check-In" value={seg.baggage?.checkIn} />
                        <TravellerField icon={<FiPackage />} label="Cabin" value={seg.baggage?.cabin} />
                        <TravellerField icon={<FiShield />} label="Fare Basis" value={seg.fareBasisCode} />
                        <TravellerField icon={<FiTag />} label="Supplier Class" value={supplierFareClass} />
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Fare Breakdown */}
              <div className="space-y-4">
                <SectionLabel icon={<FiDollarSign />} title="Fare Breakdown" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-slate-900 text-white rounded-3xl p-7 shadow-2xl relative overflow-hidden md:col-span-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Payable Amount</p>
                      <h4 className="text-4xl font-black text-[#C9A84C] tracking-tighter italic">INR {pricingSnapshot.totalAmount?.toLocaleString()}</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-4 italic tracking-widest">Captured: {formatDateTime(pricingSnapshot.capturedAt)}</p>
                      
                      <div className="mt-10 space-y-3 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase">
                          <span className="text-slate-500">Base Fare</span>
                          <span className="text-slate-200">₹{baseFare.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase">
                          <span className="text-slate-500">Taxes & Fees</span>
                          <span className="text-slate-200">₹{totalTax.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />
                   </div>

                   <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-2 overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="pb-4 text-left">Passenger Type</th>
                            <th className="pb-4 text-right">Base</th>
                            <th className="pb-4 text-right">Tax</th>
                            <th className="pb-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {fareBreakdown.map((item, i) => (
                            <tr key={i} className="text-xs font-black text-slate-700">
                              <td className="py-5 uppercase tracking-tighter">{paxTypeLabel[item.PassengerType] || "Adult"} × {item.PassengerCount}</td>
                              <td className="py-5 text-right text-slate-400 font-mono">₹{item.BaseFare?.toLocaleString()}</td>
                              <td className="py-5 text-right text-slate-400 font-mono">₹{item.Tax?.toLocaleString()}</td>
                              <td className="py-5 text-right text-slate-900 font-mono">₹{(item.BaseFare + item.Tax)?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-100">
                            <td className="pt-4 text-xs font-black text-slate-400 uppercase italic">Grand Total</td>
                            <td colSpan={3} className="pt-4 text-right text-2xl font-black text-indigo-700 tracking-tighter italic">₹{pricingSnapshot.totalAmount?.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                   </div>
                </div>
              </div>

              {/* Cancellation & Fare Rules */}
              {(miniFareRules.length > 0 || fareRules.length > 0) && (
                <div className="space-y-4">
                  <SectionLabel icon={<FiAlertCircle />} title="Cancellation & Date Change Rules" />
                  <div className="grid grid-cols-1 gap-4">
                    {miniFareRules.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="pb-3 text-left">Type</th>
                                <th className="pb-3 text-left">Window</th>
                                <th className="pb-3 text-right">Penalty / Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {group.map((rule, rIdx) => (
                                <tr key={rIdx} className="text-[11px] font-bold text-slate-700">
                                  <td className="py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-tighter ${
                                      rule.Type === "Cancellation" ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                    }`}>
                                      {rule.Type || "Rule"}
                                    </span>
                                  </td>
                                  <td className="py-4">
                                    {rule.From || rule.To ? (
                                      <span>
                                        {rule.From ? `${rule.From} ` : ""}
                                        {rule.To ? `to ${rule.To} ` : "onwards "}
                                        {rule.Unit}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Universal</span>
                                    )}
                                  </td>
                                  <td className="py-4 text-right font-black text-slate-900">
                                    {rule.Details}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {fareRules.map((rule, idx) => rule.FareRuleDetail && (
                      <div key={`fr-${idx}`} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Rule Detail: {rule.Origin}-{rule.Destination} ({rule.FareBasisCode})
                        </p>
                        <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                          {rule.FareRuleDetail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Travellers */}
              <div className="space-y-4">
                <SectionLabel icon={<FiUser />} title={`Passengers (${travelers.length})`} />
                <div className="grid grid-cols-1 gap-4">
                  {travelers.map((pax, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-16 rounded-2xl bg-slate-900 text-[#C9A84C] flex items-center justify-center font-black text-2xl shadow-lg uppercase italic">
                           {pax.firstName?.[0]}{pax.lastName?.[0]}
                         </div>
                         <div>
                            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">{pax.title} {pax.firstName} {pax.lastName}</p>
                            <div className="flex gap-2 mt-1">
                               <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase border border-indigo-100 tracking-widest">{pax.paxType || "Adult"}</span>
                               {pax.isLeadPassenger && <span className="text-[9px] font-black bg-[#C9A84C]/10 text-[#C9A84C] px-3 py-1 rounded-full uppercase border border-[#C9A84C]/20 tracking-widest">Lead Passenger</span>}
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8 pt-6 border-t border-slate-50">
                        <TravellerField icon={<FiUser />} label="Gender" value={formatGender(pax)} />
                        <TravellerField icon={<FiCalendar />} label="Date of Birth" value={formatPaxDob(pax)} />
                        <TravellerField icon={<FiGlobe />} label="Nationality" value={formatNationality(pax)} />
                        <TravellerField icon={<FiMail />} label="Email" value={formatPaxEmail(pax)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST Details */}
              {booking.gstDetails && (
                <div className="space-y-4">
                  <SectionLabel icon={<FiInfo />} title="GST Information" />
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legal Entity</p>
                          <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{booking.gstDetails.legalName}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">{booking.gstDetails.gstin}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Email</p>
                          <p className="text-sm font-black text-slate-700">{booking.gstDetails.gstEmail}</p>
                       </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Address</p>
                       <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{booking.gstDetails.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
               <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <SectionLabel icon={<FiUser />} title="Requested By" />
                  <div className="mt-6 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm italic">
                        {booking.userId?.name?.firstName?.[0]}{booking.userId?.name?.lastName?.[0]}
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">{booking.userId?.name?.firstName} {booking.userId?.name?.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{booking.userId?.email}</p>
                     </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50 space-y-4">
                     <div className="bg-slate-900 p-4 rounded-2xl italic text-[11px] font-black text-[#C9A84C] leading-relaxed shadow-xl border border-white/5">
                        "{booking.purposeOfTravel || "Business travel requirement"}"
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <SectionLabel icon={<FiClock />} title="Request Audit" />
                  <div className="mt-8 relative">
                     <div className="absolute left-[6.5px] top-2 bottom-2 w-[1px] bg-slate-100" />
                     <TimelineItem title="Submission" time={formatDateTime(booking.createdAt)} status="completed" description={`By ${booking.userId?.name?.firstName}`} />
                     <TimelineItem title="Pending Approval" time="Live Status" status="pending" active={true} description={`Manager: ${approver.name}`} />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingHotelDetailsModal;
