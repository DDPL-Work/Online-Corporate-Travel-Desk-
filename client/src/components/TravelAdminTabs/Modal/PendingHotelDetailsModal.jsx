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
  FiArrowRight,
  FiNavigation,
  FiPackage,
  FiAlertCircle,
  FiList,
  FiRefreshCw,
} from "react-icons/fi";
import { formatDate, formatDateTime } from "../../../utils/formatter";
import {
  InfoBadge,
  InfoRow,
  MiniStatCard,
  SectionLabel,
} from "../Shared/CommonComponents";

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

  const hotel = booking.hotelRequest?.selectedHotel || {};
  const room = booking.hotelRequest?.selectedRoom || {};
  const rawRooms = Array.isArray(room?.rawRoomData)
  ? room.rawRoomData
  : room?.rawRoomData
  ? [room.rawRoomData]
  : [];
  const pricing = booking.pricingSnapshot || {};
  const bookingSnap = booking.bookingSnapshot || {};
  const policies = rawRooms?.[0]?.CancelPolicies || [];
  const travelers = booking.travellers || [];
  const roomGuests = booking.hotelRequest?.roomGuests || [];
  const dayRates = rawRooms.map((r) => r.DayRates?.[0] || []);
  const images = rawRooms?.images || [];
  const promotions = rawRooms?.RoomPromotion || [];
  const price = rawRooms?.Price || {};

  // const baseFare = room.totalFare - room.totalTax;

  const totalFare = rawRooms.reduce(
  (sum, r) => sum + (r.TotalFare || 0),
  0
);
  const tax = rawRooms.reduce(
  (sum, r) => sum + (r.TotalTax || 0),
  0
);
  const baseFare = price?.baseFare || totalFare - tax;
  const perNight = price?.perNight || 0;
  // ROOMS → number of room objects
const rooms = rawRooms.length;

// NIGHTS → length of first room DayRates
const nights =
  rawRooms?.[0]?.DayRates?.[0]?.length || 0;

// // GUESTS → from roomGuests (NOT travelers)
// const totalAdults = roomGuests.reduce(
//   (sum, r) => sum + (r.noOfAdults || 0),
//   0
// );

// const totalChildren = roomGuests.reduce(
//   (sum, r) => sum + (r.noOfChild || 0),
//   0
// );

  const finalTotal = baseFare + tax;

  const totalAdults = travelers.filter(
  (t) => t.paxType === "adult" || t.paxType === "lead"
).length;

  const totalChildren = travelers.filter((t) => t.paxType === 2).length;

  // const totalChildren = travelers.filter((t) => t.paxType === "child").length;

  const formatPolicyDate = (dateStr) => {
  if (!dateStr) return "-";
  const [date] = dateStr.split(" ");
  return date;
};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="bg-[#088395] px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaHotel size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Hotel Approval Request
              </h2>
              <p className="text-xs text-teal-100 font-mono mt-0.5">
                {booking.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* ── Status Bar ── */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              Pending Approval
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-amber-700">
            <span className="flex items-center gap-1">
              <FiClock size={11} />
              Submitted: {formatDateTime(booking.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <FiTag size={11} />
              Type: {booking.bookingType?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* ── Section 1: Hotel + Stay Info ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hotel Details */}
            <div className="space-y-3">
              <SectionLabel icon={<FiHome />} title="Hotel Information" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xl font-black text-slate-900">
                    {hotel.hotelName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5 leading-relaxed">
                    <FiMapPin
                      className="mt-0.5 shrink-0 text-slate-400"
                      size={11}
                    />
                    {hotel.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200">
                  <InfoBadge color="teal">
                    {rawRooms?.Name?.[0] || "Executive Room"}
                  </InfoBadge>
                  {/* <InfoBadge color="blue">
                    <FiCoffee size={9} className="mr-1" />
                    {room.mealType}
                  </InfoBadge> */}
                  {/* {room.isRefundable ? (
                    <InfoBadge color="green">
                      <FiCheckCircle size={9} className="mr-1" />
                      Refundable
                    </InfoBadge>
                  ) : (
                    <InfoBadge color="red">
                      <FiXCircle size={9} className="mr-1" />
                      Non-Refundable
                    </InfoBadge>
                  )} */}
                  {room.withTransfers ? (
                    <InfoBadge color="purple">With Transfers</InfoBadge>
                  ) : (
                    <InfoBadge color="gray">No Transfers</InfoBadge>
                  )}
                  {promotions.map((promo, i) => (
                    <InfoBadge key={i} color="amber">
                      <FiTag size={9} className="mr-1" />
                      {promo}
                    </InfoBadge>
                  ))}
                </div>
                <InfoRow label="Hotel Code" value={hotel.hotelCode} mono />
                <InfoRow label="Country" value={hotel.country || "India"} />
                <InfoRow
                  label="Star Rating"
                  value={
                    hotel.starRating
                      ? `${"★".repeat(hotel.starRating)}`
                      : "Unrated"
                  }
                />
              </div>
            </div>

            {/* Stay Details */}
            <div className="space-y-3">
              <SectionLabel icon={<FiCalendar />} title="Stay Details" />
              <div className="grid grid-cols-2 gap-3">
                <MiniStatCard
                  label="Check-In"
                  value={formatDate(booking.hotelRequest?.checkInDate)}
                  sub={new Date(
                    booking.hotelRequest?.checkInDate,
                  ).toLocaleDateString("en-GB", { weekday: "long" })}
                />
                <MiniStatCard
                  label="Check-Out"
                  value={formatDate(booking.hotelRequest?.checkOutDate)}
                  sub={new Date(
                    booking.hotelRequest?.checkOutDate,
                  ).toLocaleDateString("en-GB", { weekday: "long" })}
                />
                <MiniStatCard label="Nights" value={nights} />
                <MiniStatCard
                  label="Rooms"
                  value={rooms}
                />
              </div>
              {roomGuests.map((rg, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-4 text-sm"
                >
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Room {i + 1} Guests
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {totalAdults} Adult{totalAdults !== 1 ? "s" : ""}
                        {totalChildren > 0 && `, ${totalChildren} Child`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Nationality
                    </p>
                    <p className="text-slate-700 font-semibold">
                      {booking.hotelRequest?.guestNationality}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Currency
                    </p>
                    <p className="text-slate-700 font-semibold">
                      {booking.hotelRequest?.preferredCurrency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: Room Details ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiKey />} title="Room Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {rawRooms.map((r, i) => (
                  <div key={i} className="mb-4 rounded-lg p-3">
                    <InfoRow label="Room" value={`Room ${i + 1}`} />
                    <InfoRow label="Room Name" value={r?.Name?.[0]} />
                    <InfoRow label="Meal Type" value={r?.MealType} />
                    <InfoRow
                      label="Refundable"
                      value={r?.IsRefundable ? "Yes" : "No"}
                    />
                  </div>
                ))}
                {/* <InfoRow
                  label="Total Fare"
                  value={`${room.currency} ${room.totalFare?.toLocaleString()}`}
                  padded
                />
                <InfoRow
                  label="Total Tax"
                  value={`${room.currency} ${room.totalTax?.toLocaleString()}`}
                  padded
                /> */}
              </div>

              {/* Day Rates */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Per-Night Breakdown
                </p>
                {dayRates.map((roomRates, i) => (
                  //   <div key={i}>
                  //     <p>Room {i + 1}</p>
                  //     {roomRates.map((d, j) => (
                  //       <div key={j}>
                  //         Night {j + 1}: {d.BasePrice}
                  //       </div>
                  //     ))}
                  //   </div>
                  // ))}
                  <div
                    key={i}
                    className="flex flex-col items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5"
                  >
                    <p className="flex text-left w-full font-medium">Room {i + 1}</p>
                    {roomRates.map((d, j) => (
                      <div className="flex justify-between items-center w-full">
                        {" "}
                        <span
                          key={j}
                          className="text-sm text-slate-500 font-medium"
                        >
                          Night {j + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {room.currency} {d.BasePrice}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {price.perNight && (
                  <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-teal-600 font-bold">
                      Avg Per Night (Incl. Taxes)
                    </span>
                    <span className="text-sm font-black text-teal-700">
                      {room.currency} {price.perNight?.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Inclusions ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiCheckCircle />} title="Inclusions" />
            <div className="flex flex-wrap gap-2">
              {room.inclusion?.split(",").map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <FiCheckCircle size={10} className="text-green-500" />
                  {item.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* ── Section 4: Pricing ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiDollarSign />} title="Pricing Summary" />
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap gap-6 justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Total Amount (Incl. Tax)
                </p>
                <p className="text-3xl font-black mt-1">
                  {price.currency || "INR"} {finalTotal.toLocaleString()}
                </p>
                <p className="text-slate-500 text-[10px] mt-1">
                  Captured at: {formatDateTime(pricing.capturedAt)}
                </p>
              </div>
              <div className="flex gap-6 text-sm text-slate-400">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1">
                    Base Fare
                  </p>
                  <p className="text-white font-bold">
                    {pricing.currency} {baseFare?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1">
                    Tax
                  </p>
                  <p className="text-white font-bold">
                    {pricing.currency} {tax}
                  </p>
                </div>
                {/* <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1">
                    Per Night
                  </p>
                  <p className="text-white font-bold">
                    {pricing.currency} {price.perNight?.toFixed(2)}
                  </p>
                </div> 
               <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1">
                    Nights
                  </p>
                  <p className="text-white font-bold">{price.nights}</p>
                </div> */}
              </div>
            </div>
          </div>

          {/* ── Section 5: Cancellation Policy ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiShield />} title="Cancellation Policy" />
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-left">From Date</th>
                    <th className="px-4 py-2.5 text-left">Charge Type</th>
                    <th className="px-4 py-2.5 text-right">Penalty</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policies.map((policy, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {formatPolicyDate(policy.FromDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {policy.ChargeType}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        {policy.CancellationCharge === 0 ? (
  <span className="text-green-600 font-bold">FREE</span>
) : policy.ChargeType === "Percentage" ? (
  <span className="text-red-600 font-bold">
    {policy.CancellationCharge}%
  </span>
) : (
  <span className="text-red-600 font-bold">
    ₹ {policy.CancellationCharge.toFixed(0)}
  </span>
)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {policy.CancellationCharge === 0 ? (
  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100">
    Free Cancellation
  </span>
) : policy.ChargeType === "Percentage" &&
  policy.CancellationCharge === 100 ? (
  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">
    Non Refundable
  </span>
) : (
  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100">
    Partial Charge
  </span>
)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 6: Travellers ── */}
          <div className="space-y-3">
            <SectionLabel
              icon={<FiUser />}
              title={`Travellers (${travelers.length})`}
            />
            <div className="space-y-3">
              {travelers.map((pax, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#088395]/10 text-[#088395] flex items-center justify-center font-black text-sm shrink-0">
                        {pax.firstName?.[0]}
                        {pax.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          {pax.title} {pax.firstName} {pax.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                          {pax.paxType} passenger
                        </p>
                      </div>
                    </div>
                    {pax.isLeadPassenger && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase">
                        Lead
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                    <TravellerField
                      icon={<FiUser size={10} />}
                      label="Gender"
                      value={pax.gender}
                    />
                    <TravellerField
                      icon={<FiCalendar size={10} />}
                      label="Date of Birth"
                      value={formatDate(pax.dob)}
                    />
                    <TravellerField
                      icon={<FiInfo size={10} />}
                      label="Age"
                      value={`${pax.age} years`}
                    />
                    <TravellerField
                      icon={<FiGlobe size={10} />}
                      label="Nationality"
                      value={pax.nationality}
                    />
                    <TravellerField
                      icon={<FiMail size={10} />}
                      label="Email"
                      value={pax.email}
                    />
                    <TravellerField
                      icon={<FiPhone size={10} />}
                      label="Phone"
                      value={`+${pax.phoneWithCode}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 7: Requester Info ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiUser />} title="Requested By" />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                {booking.userId?.name?.firstName?.[0]}
                {booking.userId?.name?.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {booking.userId?.name?.firstName}{" "}
                  {booking.userId?.name?.lastName}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <FiMail size={10} /> {booking.userId?.email}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  Corporate ID
                </p>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  {booking.corporateId}
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 8: Purpose + Booking Meta ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiInfo />} title="Purpose of Travel" />
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-900 italic">
                  "{booking.purposeOfTravel}"
                </p>
              </div>
            </div>

            <div>
              <SectionLabel icon={<FiTag />} title="Booking Meta" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <InfoRow label="Booking ID" value={booking._id} mono padded />
                <InfoRow
                  label="Execution Status"
                  value={booking.executionStatus?.replace(/_/g, " ")}
                  padded
                  capitalize
                />
                <InfoRow
                  label="Request Status"
                  value={booking.requestStatus?.replace(/_/g, " ")}
                  padded
                  capitalize
                />
                <InfoRow
                  label="Updated At"
                  value={formatDateTime(booking.updatedAt)}
                  padded
                />
              </div>
            </div>
          </div>

          {/* ── Section 9: Hotel Images ── */}
          {images.length > 0 && (
            <div className="space-y-3">
              <SectionLabel
                icon={<FiHome />}
                title={`Hotel Images (${images.length})`}
              />
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(0, 6).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Hotel ${i + 1}`}
                    className="h-24 w-36 object-cover rounded-lg border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            Booking Ref:{" "}
            <span className="font-mono font-bold text-slate-600">
              {booking.bookingReference}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onReject(booking._id, "hotel", "reject")}
              className="px-6 py-2.5 border border-red-200 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 transition-all"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(booking._id, "hotel", "approve")}
              className="px-6 py-2.5 bg-[#22C55E] text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
            >
              Approve & Proceed
            </button>
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

  // ── Real API shape ──────────────────────────────────────────────────────────
  // booking.flightRequest.segments[]          → flight legs
  // booking.flightRequest.fareSnapshot        → fare summary + miniFareRules
  // booking.flightRequest.fareQuote.Results[0]→ full fare + FareBreakdown
  // booking.flightRequest.ssrSnapshot         → seats / meals / baggage SSR
  // booking.bookingSnapshot                   → quick display fields
  // ────────────────────────────────────────────────────────────────────────────
  const flightRequest = booking.flightRequest || {};
  const segments = flightRequest.segments || [];
  const fareSnapshot = flightRequest.fareSnapshot || {};
  const fareQuoteResult = flightRequest.fareQuote?.Results?.[0] || {};
  const fareBreakdown = fareQuoteResult.FareBreakdown || [];
  const miniFareRules = fareSnapshot.miniFareRules?.[0] || [];
  const ssrSnapshot = flightRequest.ssrSnapshot || {};
  const pricing = booking.pricingSnapshot || {};
  const travelers = booking.travellers || [];
  const bookSnap = booking.bookingSnapshot || {};

  const isRoundTrip =
    flightRequest.tripType === "roundTrip" || bookSnap.sectors?.length > 1;
  const isMultiCity = flightRequest.tripType === "multiCity";

  // Cabin class label map (TBO numeric codes)
  const cabinLabel = {
    1: "All",
    2: "Economy",
    3: "Premium Economy",
    4: "Business",
    5: "Premium Business",
    6: "First",
  };

  const baseFare = fareSnapshot.baseFare ?? fareQuoteResult.Fare?.BaseFare ?? 0;
  const totalTax = fareSnapshot.tax ?? fareQuoteResult.Fare?.Tax ?? 0;

  // Pax type label map (TBO numeric)
  const paxTypeLabel = { 1: "Adult", 2: "Child", 3: "Infant" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="bg-indigo-700 px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaPlane size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Flight Approval Request
              </h2>
              <p className="text-xs text-indigo-200 font-mono mt-0.5">
                {booking.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* ── Status Bar ── */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              Pending Approval
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-amber-700">
            <span className="flex items-center gap-1">
              <FiClock size={11} />
              Submitted: {formatDateTime(booking.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <FiTag size={11} />
              Route: {bookSnap.sectors?.join(", ") || "—"}
            </span>
            <span className="flex items-center gap-1">
              <FaPlane size={10} />
              {bookSnap.airline || fareQuoteResult.AirlineCode || "—"}
            </span>
            <span className="flex items-center gap-1">
              <FiUser size={11} />
              {bookSnap.cabinClass ||
                cabinLabel[segments[0]?.cabinClass] ||
                "—"}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* ── Section 1: Flight Segments ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FaPlane />} title="Flight Itinerary" />
            <div className="space-y-3">
              {segments.map((seg, idx) => {
                // Real API shape: seg.origin / seg.destination are objects
                // seg.departureDateTime / seg.arrivalDateTime are ISO strings
                // seg.stopOver (bool), seg.durationMinutes (number)
                // seg.airlineCode, seg.airlineName, seg.flightNumber, seg.fareClass
                // seg.baggage.checkIn / seg.baggage.cabin
                const origin = seg.origin || {};
                const destination = seg.destination || {};
                const depDT = seg.departureDateTime
                  ? new Date(seg.departureDateTime)
                  : null;
                const arrDT = seg.arrivalDateTime
                  ? new Date(seg.arrivalDateTime)
                  : null;
                const depTime = depDT
                  ? depDT.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                const arrTime = arrDT
                  ? arrDT.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                const depDate = depDT
                  ? depDT.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const arrDate = arrDT
                  ? arrDT.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const durationHrs = seg.durationMinutes
                  ? `${Math.floor(seg.durationMinutes / 60)}h ${seg.durationMinutes % 60}m`
                  : "—";
                const isNonStop = seg.stopOver === false;
                const segLabel = isMultiCity
                  ? `Leg ${idx + 1}`
                  : isRoundTrip && idx === 1
                    ? "Return"
                    : "Outbound";

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3"
                  >
                    {/* Segment header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wide">
                          {segLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {seg.airlineName || seg.airlineCode} ·{" "}
                          {seg.airlineCode}
                          {seg.flightNumber}
                        </span>
                        {seg.aircraft && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                            {seg.aircraft}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isNonStop ? (
                          <InfoBadge color="green">
                            <FiCheckCircle size={9} className="mr-1" />
                            Non-Stop
                          </InfoBadge>
                        ) : (
                          <InfoBadge color="amber">With Stopover</InfoBadge>
                        )}
                        <InfoBadge color="blue">
                          {cabinLabel[seg.cabinClass] ||
                            `Class ${seg.cabinClass}`}
                        </InfoBadge>
                        <InfoBadge color="teal">
                          Fare: {seg.fareClass}
                        </InfoBadge>
                        {fareSnapshot.refundable ? (
                          <InfoBadge color="green">
                            <FiCheckCircle size={9} className="mr-1" />
                            Refundable
                          </InfoBadge>
                        ) : (
                          <InfoBadge color="red">
                            <FiXCircle size={9} className="mr-1" />
                            Non-Refundable
                          </InfoBadge>
                        )}
                      </div>
                    </div>

                    {/* Route timeline */}
                    <div className="flex items-center gap-4">
                      {/* Origin */}
                      <div className="text-center min-w-[90px]">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          {origin.airportCode}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">
                          {origin.city}
                        </p>
                        {origin.terminal && (
                          <p className="text-[10px] text-slate-400">
                            T{origin.terminal}
                          </p>
                        )}
                        <p className="text-sm text-indigo-700 font-mono font-bold mt-1">
                          {depTime}
                        </p>
                        <p className="text-[10px] text-slate-400">{depDate}</p>
                      </div>

                      {/* Timeline */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {durationHrs}
                        </p>
                        <div className="w-full flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0" />
                          <div className="flex-1 border-t-2 border-dashed border-indigo-200" />
                          <FaPlane
                            size={12}
                            className="text-indigo-500 shrink-0"
                          />
                          <div className="flex-1 border-t-2 border-dashed border-indigo-200" />
                          <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0" />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {fareSnapshot.fareType}
                        </p>
                      </div>

                      {/* Destination */}
                      <div className="text-center min-w-[90px]">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          {destination.airportCode}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">
                          {destination.city}
                        </p>
                        {destination.terminal && (
                          <p className="text-[10px] text-slate-400">
                            T{destination.terminal}
                          </p>
                        )}
                        <p className="text-sm text-indigo-700 font-mono font-bold mt-1">
                          {arrTime}
                        </p>
                        <p className="text-[10px] text-slate-400">{arrDate}</p>
                      </div>
                    </div>

                    {/* Segment meta — airport names + baggage */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                      <TravellerField
                        icon={<FiNavigation size={10} />}
                        label="Origin Airport"
                        value={origin.airportName}
                      />
                      <TravellerField
                        icon={<FiNavigation size={10} />}
                        label="Destination Airport"
                        value={destination.airportName}
                      />
                      <TravellerField
                        icon={<FiPackage size={10} />}
                        label="Check-In Baggage"
                        value={seg.baggage?.checkIn}
                      />
                      <TravellerField
                        icon={<FiPackage size={10} />}
                        label="Cabin Baggage"
                        value={seg.baggage?.cabin}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: Fare Breakdown ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiDollarSign />} title="Fare Breakdown" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Dark pricing card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col gap-4">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Total Amount (Incl. Tax)
                  </p>
                  <p className="text-3xl font-black mt-1">
                    {pricing.currency} {pricing.totalAmount?.toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-1">
                    Captured at: {formatDateTime(pricing.capturedAt)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                      Base Fare
                    </p>
                    <p className="text-white font-bold">
                      {pricing.currency} {baseFare?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                      Taxes & Fees
                    </p>
                    <p className="text-white font-bold">
                      {pricing.currency} {totalTax?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                      Passengers
                    </p>
                    <p className="text-white font-bold">{travelers.length}</p>
                  </div>
                </div>
                {/* {fareSnapshot.lastTicketDate && (
                  <p className="text-[10px] text-amber-400 font-bold border-t border-slate-700 pt-3">
                    ⚠ Last Ticketing Date: {new Date(fareSnapshot.lastTicketDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )} */}
              </div>

              {/* Per-pax fare table from FareBreakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Pax Type</th>
                      <th className="px-4 py-2.5 text-right">Base</th>
                      <th className="px-4 py-2.5 text-right">Tax</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fareBreakdown.length > 0 ? (
                      fareBreakdown.map((fb, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {paxTypeLabel[fb.PassengerType] ||
                              `Type ${fb.PassengerType}`}{" "}
                            × {fb.PassengerCount}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {pricing.currency} {fb.BaseFare?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {pricing.currency} {fb.Tax?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-800">
                            {pricing.currency}{" "}
                            {(fb.BaseFare + fb.Tax)?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-4 text-center text-slate-400 text-xs"
                        >
                          Per-pax breakdown not available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Section 3: Mini Fare Rules ── */}
          {miniFareRules.length > 0 && (
            <div className="space-y-3">
              <SectionLabel
                icon={<FiShield />}
                title="Fare Rules & Penalties"
              />
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Type</th>
                      <th className="px-4 py-2.5 text-left">Route</th>
                      <th className="px-4 py-2.5 text-left">Details</th>
                      <th className="px-4 py-2.5 text-right">Online Allowed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {miniFareRules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-700">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              rule.Type === "Cancellation"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : rule.Type === "Reissue"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {rule.Type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                          {rule.JourneyPoints}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs max-w-[200px]">
                          {rule.Details || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(
                            rule.Type === "Reissue"
                              ? rule.OnlineReissueAllowed
                              : rule.OnlineRefundAllowed
                          ) ? (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded border border-slate-200">
                              Offline Only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Section 4: SSR Snapshot (Seats / Meals / Baggage Add-ons) ── */}
          {(ssrSnapshot.seats?.length > 0 ||
            ssrSnapshot.meals?.length > 0 ||
            ssrSnapshot.baggage?.length > 0) && (
            <div className="space-y-3">
              <SectionLabel icon={<FiList />} title="Selected SSR Add-Ons" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ssrSnapshot.seats?.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide mb-2">
                      Seats
                    </p>
                    {ssrSnapshot.seats.map((s, i) => (
                      <p
                        key={i}
                        className="text-xs text-indigo-800 font-semibold"
                      >
                        {s.description || JSON.stringify(s)}
                      </p>
                    ))}
                  </div>
                )}
                {ssrSnapshot.meals?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-2">
                      Meals
                    </p>
                    {ssrSnapshot.meals.map((m, i) => (
                      <p
                        key={i}
                        className="text-xs text-amber-800 font-semibold"
                      >
                        {m.description || JSON.stringify(m)}
                      </p>
                    ))}
                  </div>
                )}
                {ssrSnapshot.baggage?.length > 0 && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-wide mb-2">
                      Extra Baggage
                    </p>
                    {ssrSnapshot.baggage.map((b, i) => (
                      <p
                        key={i}
                        className="text-xs text-teal-800 font-semibold"
                      >
                        {b.description || JSON.stringify(b)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Section 5: Travellers ── */}
          <div className="space-y-3">
            <SectionLabel
              icon={<FiUser />}
              title={`Travellers (${travelers.length})`}
            />
            <div className="space-y-3">
              {travelers.map((pax, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-700/10 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                        {pax.firstName?.[0]}
                        {pax.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          {pax.title} {pax.firstName} {pax.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                          {pax.paxType || "Adult"} passenger
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pax.isLeadPassenger && (
                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase">
                          Lead
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                    <TravellerField
                      icon={<FiUser size={10} />}
                      label="Gender"
                      value={pax.gender}
                    />
                    <TravellerField
                      icon={<FiCalendar size={10} />}
                      label="Date of Birth"
                      value={formatDate(pax.dateOfBirth || pax.dob)}
                    />
                    <TravellerField
                      icon={<FiGlobe size={10} />}
                      label="Nationality"
                      value={pax.nationality}
                    />
                    <TravellerField
                      icon={<FiMail size={10} />}
                      label="Email"
                      value={pax.email}
                    />
                    <TravellerField
                      icon={<FiPhone size={10} />}
                      label="Phone"
                      value={`+${pax.phoneWithCode}`}
                    />
                    {pax.passportNumber && (
                      <TravellerField
                        icon={<FiKey size={10} />}
                        label="Passport No."
                        value={pax.passportNumber}
                      />
                    )}
                    {pax.passportExpiry && (
                      <TravellerField
                        icon={<FiCalendar size={10} />}
                        label="Passport Expiry"
                        value={formatDate(pax.passportExpiry)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 6: Requester Info ── */}
          <div className="space-y-3">
            <SectionLabel icon={<FiUser />} title="Requested By" />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                {booking.userId?.name?.firstName?.[0]}
                {booking.userId?.name?.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {booking.userId?.name?.firstName}{" "}
                  {booking.userId?.name?.lastName}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <FiMail size={10} /> {booking.userId?.email}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  Corporate ID
                </p>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  {booking.corporateId}
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 7: Purpose + Booking Meta ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiInfo />} title="Purpose of Travel" />
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-900 italic">
                  "{booking.purposeOfTravel}"
                </p>
              </div>
            </div>

            <div>
              <SectionLabel icon={<FiTag />} title="Booking Meta" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <InfoRow label="Booking ID" value={booking._id} mono padded />
                <InfoRow
                  label="Execution Status"
                  value={booking.executionStatus?.replace(/_/g, " ")}
                  padded
                  capitalize
                />
                <InfoRow
                  label="Request Status"
                  value={booking.requestStatus?.replace(/_/g, " ")}
                  padded
                  capitalize
                />
                <InfoRow
                  label="Trace ID"
                  value={flightRequest.traceId}
                  mono
                  padded
                />
                <InfoRow
                  label="Fare Expires"
                  value={formatDateTime(flightRequest.fareExpiry)}
                  padded
                />
                <InfoRow
                  label="Updated At"
                  value={formatDateTime(booking.updatedAt)}
                  padded
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            Booking Ref:{" "}
            <span className="font-mono font-bold text-slate-600">
              {booking.bookingReference}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onReject(booking._id, "flight", "reject")}
              className="px-6 py-2.5 border border-red-200 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 transition-all"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(booking._id, "flight", "approve")}
              className="px-6 py-2.5 bg-[#22C55E] text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
            >
              Approve & Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

const TravellerField = ({ icon, label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
      {icon} {label}
    </p>
    <p className="text-xs font-semibold text-slate-700">{value || "—"}</p>
  </div>
);

// Keep default export pointing to the hotel modal for backwards compatibility
export default PendingHotelDetailsModal;
