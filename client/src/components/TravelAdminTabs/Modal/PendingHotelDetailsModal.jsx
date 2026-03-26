import React from "react";
import { FaHotel } from "react-icons/fa";
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
} from "react-icons/fi";
import { formatDate, formatDateTime } from "../../../utils/formatter";
import {
  InfoBadge,
  InfoRow,
  MiniStatCard,
  SectionLabel,
} from "../Shared/CommonComponents";

const PendingHotelDetailsModal = ({
  booking,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!booking) return null;

  const hotel = booking.hotelRequest?.selectedHotel || {};
  const room = booking.hotelRequest?.selectedRoom || {};
  const rawRoom = room.rawRoomData || {};
  const pricing = booking.pricingSnapshot || {};
  const bookingSnap = booking.bookingSnapshot || {};
  const policies = room.cancelPolicies || [];
  const travelers = booking.travellers || [];
  const roomGuests = booking.hotelRequest?.roomGuests || [];
  const dayRates = rawRoom?.DayRates?.[0] || [];
  const images = rawRoom?.images || [];
  const promotions = rawRoom?.RoomPromotion || [];
  const price = rawRoom?.Price || {};

  const baseFare = room.totalFare - room.totalTax;

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
                    {rawRoom?.Name?.[0] || "Executive Room"}
                  </InfoBadge>
                  <InfoBadge color="blue">
                    <FiCoffee size={9} className="mr-1" />
                    {room.mealType}
                  </InfoBadge>
                  {room.isRefundable ? (
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
                <MiniStatCard label="Nights" value={price.nights} />
                <MiniStatCard
                  label="Rooms"
                  value={booking.hotelRequest?.noOfRooms}
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
                    <p className="text-slate-700 font-semibold mt-0.5">
                      {rg.noOfAdults} Adult{rg.noOfAdults !== 1 ? "s" : ""}
                      {rg.noOfChild > 0 &&
                        `, ${rg.noOfChild} Child${rg.noOfChild !== 1 ? "ren" : ""}`}
                    </p>
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
                <InfoRow label="Room Name" value={rawRoom?.Name?.[0]} padded />
                <InfoRow label="Meal Type" value={rawRoom?.MealType} padded />
                <InfoRow
                  label="Is Refundable"
                  value={rawRoom?.IsRefundable ? "Yes" : "No"}
                  padded
                />
                <InfoRow
                  label="With Transfers"
                  value={rawRoom?.WithTransfers ? "Yes" : "No"}
                  padded
                />
                <InfoRow
                  label="Total Fare"
                  value={`${room.currency} ${room.totalFare?.toLocaleString()}`}
                  padded
                />
                <InfoRow
                  label="Total Tax"
                  value={`${room.currency} ${room.totalTax?.toLocaleString()}`}
                  padded
                />
              </div>

              {/* Day Rates */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Per-Night Breakdown
                </p>
                {dayRates.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5"
                  >
                    <span className="text-sm text-slate-500 font-medium">
                      Night {i + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {room.currency} {d.BasePrice?.toFixed(2)}
                    </span>
                  </div>
                ))}
                {price.perNight && (
                  <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-teal-600 font-bold">
                      Avg Per Night
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
                  {pricing.currency} {pricing.totalAmount?.toLocaleString()}
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
                    {pricing.currency} {room.totalTax}
                  </p>
                </div>
                <div>
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
                </div>
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
                        {policy.FromDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {policy.ChargeType}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        {policy.CancellationCharge === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          <span className="text-red-600">
                            {policy.CancellationCharge}
                            {policy.ChargeType === "Percentage" ? "%" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {policy.CancellationCharge === 0 ? (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100">
                            No Charge
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">
                            Full Charge
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

const TravellerField = ({ icon, label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
      {icon} {label}
    </p>
    <p className="text-xs font-semibold text-slate-700">{value || "—"}</p>
  </div>
);

export default PendingHotelDetailsModal;
