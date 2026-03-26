import React from "react";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiHome,
  FiCheckCircle,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiX,
  FiMapPin,
  FiShield,
  FiCoffee,
  FiTag,
  FiInfo,
  FiPhone,
  FiMail,
  FiGlobe,
  FiKey,
} from "react-icons/fi";
import { formatDate, formatDateTime } from "../../../utils/formatter";
import {
  ExecStatusBadge,
  getSegCity,
  InfoBadge,
  InfoRow,
  MiniStatCard,
  SectionLabel,
  TraceTimer,
} from "../Shared/CommonComponents";

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL BOOKING MODAL — full details
// ─────────────────────────────────────────────────────────────────────────────
export const HotelBookingModal = ({ booking: raw, onClose }) => {
  if (!raw) return null;
  const hotel = raw.hotelRequest?.selectedHotel || {};
  const room = raw.hotelRequest?.selectedRoom || {};
  const rawRoom = room.rawRoomData || {};
  const pricing = raw.pricingSnapshot || {};
  const snap = raw.bookingSnapshot || {};
  const policies = room.cancelPolicies || [];
  const travelers = raw.travellers || [];
  const roomGuests = raw.hotelRequest?.roomGuests || [];
  const dayRates = rawRoom?.DayRates?.[0] || [];
  const images = rawRoom?.images || [];
  const promos = rawRoom?.RoomPromotion || [];
  const price = rawRoom?.Price || {};
  const baseFare = (room.totalFare || 0) - (room.totalTax || 0);
  const approver = raw.approvedBy || {};
  const user = raw.userId || {};
  const amendment = raw.amendment || {};
  const bookRes = raw.bookingResult || {};

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden"
      >
        <div className="bg-[#088395] px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaHotel size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black">Hotel Booking Detail</h2>
              <p className="text-xs text-teal-100 font-mono mt-0.5">
                {raw.bookingReference}
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

        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ExecStatusBadge status={raw.executionStatus} />
            <span className="text-xs text-blue-700 font-medium capitalize">
              {raw.requestStatus?.replace(/_/g, " ")}
            </span>
            {amendment.status && amendment.status !== "not_requested" && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                Amendment: {amendment.status?.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <span className="text-xs text-blue-600">
            Submitted: {formatDateTime(raw.createdAt)}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Hotel Info */}
          <div>
            <SectionLabel
              icon={<FiHome size={11} />}
              title="Hotel Information"
            />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <p className="text-xl font-black text-slate-900">
                    {hotel.hotelName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                    <FiMapPin className="mt-0.5 shrink-0" size={11} />
                    {hotel.address}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200">
                    <InfoBadge color="teal">
                      {rawRoom?.Name?.[0] || "Room"}
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
                      <InfoBadge color="red">Non-Refundable</InfoBadge>
                    )}
                    {promos.map((p, i) => (
                      <InfoBadge key={i} color="amber">
                        <FiTag size={9} className="mr-1" />
                        {p}
                      </InfoBadge>
                    ))}
                    {!room.withTransfers && (
                      <InfoBadge color="gray">No Transfers</InfoBadge>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-mono">{hotel.hotelCode}</p>
                  {hotel.starRating > 0 && (
                    <p className="text-amber-500 mt-1">
                      {"★".repeat(hotel.starRating)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div>
            <SectionLabel
              icon={<FiCalendar size={11} />}
              title="Stay Details"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStatCard
                label="Check-In"
                value={formatDate(raw.hotelRequest?.checkInDate)}
                sub={new Date(raw.hotelRequest?.checkInDate).toLocaleDateString(
                  "en-GB",
                  { weekday: "long" },
                )}
              />
              <MiniStatCard
                label="Check-Out"
                value={formatDate(raw.hotelRequest?.checkOutDate)}
                sub={new Date(
                  raw.hotelRequest?.checkOutDate,
                ).toLocaleDateString("en-GB", { weekday: "long" })}
              />
              <MiniStatCard
                label="Nights"
                value={price.nights || snap.nights || "—"}
              />
              <MiniStatCard label="Rooms" value={raw.hotelRequest?.noOfRooms} />
            </div>
            {roomGuests.map((rg, i) => (
              <div
                key={i}
                className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-wrap gap-6 text-sm"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Room {i + 1} Guests
                  </p>
                  <p className="font-semibold">
                    {rg.noOfAdults} Adult{rg.noOfAdults !== 1 ? "s" : ""}
                    {rg.noOfChild > 0 ? `, ${rg.noOfChild} Child` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Nationality
                  </p>
                  <p className="font-semibold">
                    {raw.hotelRequest?.guestNationality}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Currency
                  </p>
                  <p className="font-semibold">
                    {raw.hotelRequest?.preferredCurrency}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Room + Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiKey size={11} />} title="Room Details" />
              <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <InfoRow label="Room Name" value={rawRoom?.Name?.[0]} padded />
                <InfoRow label="Meal Type" value={rawRoom?.MealType} padded />
                <InfoRow
                  label="Refundable"
                  value={room.isRefundable ? "Yes" : "No"}
                  padded
                />
                <InfoRow
                  label="Transfers"
                  value={room.withTransfers ? "Yes" : "No"}
                  padded
                />
                <InfoRow
                  label="Total Fare"
                  value={`${room.currency} ${room.totalFare?.toLocaleString()}`}
                  padded
                />
                <InfoRow
                  label="Tax"
                  value={`${room.currency} ${room.totalTax?.toLocaleString()}`}
                  padded
                />
                <InfoRow
                  label="Base Fare"
                  value={`${room.currency} ${baseFare?.toFixed(2)}`}
                  padded
                />
              </div>
            </div>
            <div>
              <SectionLabel
                icon={<FiDollarSign size={11} />}
                title="Pricing Summary"
              />
              <div className="bg-slate-900 text-white p-5 rounded-2xl">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Total (Incl. Tax)
                </p>
                <p className="text-3xl font-black mt-1">
                  {pricing.currency} {pricing.totalAmount?.toLocaleString()}
                </p>
                <p className="text-slate-500 text-[10px] mt-1">
                  Captured: {formatDateTime(pricing.capturedAt)}
                </p>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Base</p>
                    <p className="text-white font-bold text-sm">
                      {pricing.currency} {baseFare?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Tax</p>
                    <p className="text-white font-bold text-sm">
                      {pricing.currency} {room.totalTax}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">
                      Per Night
                    </p>
                    <p className="text-white font-bold text-sm">
                      {pricing.currency} {price.perNight?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Day Rates
                </p>
                {dayRates.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5"
                  >
                    <span className="text-sm text-slate-500">
                      Night {i + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {room.currency} {d.BasePrice?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inclusions */}
          {room.inclusion && (
            <div>
              <SectionLabel
                icon={<FiCheckCircle size={11} />}
                title="Inclusions"
              />
              <div className="flex flex-wrap gap-2">
                {room.inclusion.split(",").map((item, i) => (
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
          )}

          {/* Cancellation Policy */}
          <div>
            <SectionLabel
              icon={<FiShield size={11} />}
              title="Cancellation Policy"
            />
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
                  {policies.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {p.FromDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.ChargeType}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        {p.CancellationCharge === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          <span className="text-red-600">
                            {p.ChargeType === "Percentage"
                              ? `${p.CancellationCharge}%`
                              : `₹${Number(p.CancellationCharge).toFixed(2)}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.CancellationCharge === 0 ? (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100">
                            No Charge
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">
                            Charged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Travellers */}
          <div>
            <SectionLabel
              icon={<FiUser size={11} />}
              title={`Travellers (${travelers.length})`}
            />
            <div className="space-y-3">
              {travelers.map((pax, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    {[
                      {
                        icon: <FiUser size={10} />,
                        label: "Gender",
                        value: pax.gender,
                      },
                      {
                        icon: <FiCalendar size={10} />,
                        label: "Date of Birth",
                        value: formatDate(pax.dob),
                      },
                      {
                        icon: <FiInfo size={10} />,
                        label: "Age",
                        value: `${pax.age} years`,
                      },
                      {
                        icon: <FiGlobe size={10} />,
                        label: "Nationality",
                        value: pax.nationality,
                      },
                      {
                        icon: <FiMail size={10} />,
                        label: "Email",
                        value: pax.email,
                      },
                      {
                        icon: <FiPhone size={10} />,
                        label: "Phone",
                        value: `+${pax.phoneWithCode}`,
                      },
                    ].map(({ icon, label, value }, j) => (
                      <div key={j}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                          {icon} {label}
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Confirmation */}
          {bookRes.hotelBookingId && (
            <div>
              <SectionLabel
                icon={<FiCheckCircle size={11} />}
                title="Booking Confirmation"
              />
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase">
                    Confirmation No
                  </p>
                  <p className="text-sm font-mono font-bold text-green-800">
                    {bookRes.providerResponse?.BookResult?.ConfirmationNo ||
                      bookRes.hotelBookingId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase">
                    Booking ID
                  </p>
                  <p className="text-sm font-mono font-bold text-green-800">
                    {bookRes.hotelBookingId}
                  </p>
                </div>
                {bookRes.providerResponse?.BookResult?.InvoiceNumber && (
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase">
                      Invoice No
                    </p>
                    <p className="text-sm font-mono font-bold text-green-800">
                      {bookRes.providerResponse.BookResult.InvoiceNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amendment */}
          {amendment.status && amendment.status !== "not_requested" && (
            <div>
              <SectionLabel
                icon={<FiInfo size={11} />}
                title="Amendment Details"
              />
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-1">
                <InfoRow
                  label="Amendment Type"
                  value={amendment.amendmentType}
                />
                <InfoRow
                  label="Status"
                  value={amendment.status?.replace(/_/g, " ")}
                  capitalize
                />
                {amendment.remarks && (
                  <InfoRow label="Remarks" value={amendment.remarks} />
                )}
                {amendment.requestedAt && (
                  <InfoRow
                    label="Requested At"
                    value={formatDateTime(amendment.requestedAt)}
                  />
                )}
                {amendment.changeRequestId && (
                  <InfoRow
                    label="Change Request ID"
                    value={amendment.changeRequestId}
                    mono
                  />
                )}
                {amendment.providerResponse?.HotelChangeRequestStatusResult
                  ?.RefundedAmount && (
                  <InfoRow
                    label="Refunded Amount"
                    value={`₹${amendment.providerResponse.HotelChangeRequestStatusResult.RefundedAmount?.toLocaleString()}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Requester + Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiUser size={11} />} title="Requested By" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                  {user.name?.firstName?.[0]}
                  {user.name?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {user.name?.firstName} {user.name?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <FiMail size={10} />
                    {user.email}
                  </p>
                </div>
                {approver._id && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Approved By
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      {approver.name?.firstName} {approver.name?.lastName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(raw.approvedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionLabel icon={<FiTag size={11} />} title="Booking Meta" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <InfoRow label="Booking ID" value={raw._id} mono padded />
                <InfoRow
                  label="Corporate ID"
                  value={raw.corporateId}
                  mono
                  padded
                />
                <InfoRow
                  label="Execution Status"
                  value={raw.executionStatus?.replace(/_/g, " ")}
                  capitalize
                  padded
                />
                <InfoRow
                  label="Amendment Status"
                  value={amendment.status?.replace(/_/g, " ")}
                  capitalize
                  padded
                />
                <InfoRow
                  label="Updated At"
                  value={formatDateTime(raw.updatedAt)}
                  padded
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
              Purpose of Travel
            </p>
            <p className="text-sm text-amber-900 italic">
              "{raw.purposeOfTravel}"
            </p>
          </div>

          {images.length > 0 && (
            <div>
              <SectionLabel
                icon={<FiHome size={11} />}
                title={`Hotel Images (${images.length})`}
              />
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(0, 8).map((url, i) => (
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

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Ref:{" "}
            <span className="font-mono font-bold text-slate-600">
              {raw.bookingReference}
            </span>
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT BOOKING MODAL — full details
// ─────────────────────────────────────────────────────────────────────────────
export const FlightBookingModal = ({ booking: raw, traceTimers, onClose }) => {
  if (!raw) return null;
  const timer = traceTimers?.[raw._id];
  const segments = raw.flightRequest?.segments || [];
  const fareSnap = raw.flightRequest?.fareSnapshot || {};
  const ssrSnap = raw.flightRequest?.ssrSnapshot || {};
  const pricing = raw.pricingSnapshot || {};
  const snap = raw.bookingSnapshot || {};
  const travelers = raw.travellers || [];
  const amendment = raw.amendment || {};
  const amendHist = raw.amendmentHistory || [];
  const bookRes = raw.bookingResult || {};
  const user = raw.userId || {};
  const approver = raw.approvedBy || {};

  const miniFareRules = (
    fareSnap.miniFareRules?.[0] ||
    fareSnap.miniFareRules ||
    []
  )
    .flat()
    .filter(Boolean);
  const flightItin =
    bookRes.providerResponse?.Response?.Response?.FlightItinerary ||
    bookRes.providerResponse?.FlightItinerary ||
    {};
  const pnr = bookRes.pnr || flightItin?.PNR;
  const invoices = flightItin?.Invoice || [];
  const passengerInfo = flightItin?.Passenger || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden"
      >
        <div className="bg-[#0A4D68] px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaPlane size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black">Flight Booking Detail</h2>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                {raw.bookingReference}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timer && <TraceTimer timer={timer} />}
            <button
              onClick={onClose}
              className="hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <FiX size={22} />
            </button>
          </div>
        </div>

        <div className="bg-sky-50 border-b border-sky-100 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ExecStatusBadge status={raw.executionStatus} />
            <span className="text-xs text-sky-700 font-medium capitalize">
              {raw.requestStatus?.replace(/_/g, " ")}
            </span>
            {pnr && (
              <span className="font-mono text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                PNR: {pnr}
              </span>
            )}
            {amendment.status && amendment.status !== "not_requested" && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                Amendment: {amendment.status?.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <span className="text-xs text-sky-600">
            Submitted: {formatDateTime(raw.createdAt)}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Route Summary */}
          {segments.length > 0 && (
            <div>
              <SectionLabel
                icon={<FiMapPin size={11} />}
                title="Route Summary"
              />
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">
                    {segments[0]?.origin?.airportCode}
                  </p>
                  <p className="text-xs text-slate-400">
                    {getSegCity(segments[0], "origin")}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatDateTime(segments[0]?.departureDateTime)}
                  </p>
                  {segments[0]?.origin?.terminal && (
                    <p className="text-[10px] bg-slate-200 text-slate-600 rounded px-1 mt-1">
                      T{segments[0].origin.terminal}
                    </p>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 justify-center">
                  <div className="h-px flex-1 bg-slate-300" />
                  <div className="flex flex-col items-center gap-1">
                    <FaPlane size={14} className="text-[#0A4D68]" />
                    <span className="text-[10px] text-slate-400">
                      {snap.airline}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {snap.cabinClass}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">
                    {segments[segments.length - 1]?.destination?.airportCode}
                  </p>
                  <p className="text-xs text-slate-400">
                    {getSegCity(segments[segments.length - 1], "destination")}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatDateTime(
                      segments[segments.length - 1]?.arrivalDateTime,
                    )}
                  </p>
                  {segments[segments.length - 1]?.destination?.terminal && (
                    <p className="text-[10px] bg-slate-200 text-slate-600 rounded px-1 mt-1">
                      T{segments[segments.length - 1].destination.terminal}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Segments */}
          {segments.length > 0 && (
            <div>
              <SectionLabel
                icon={<FaPlane size={11} />}
                title={`Segments (${segments.length})`}
              />
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">
                          {seg.airlineCode} {seg.flightNumber}
                        </span>
                        <span className="text-xs text-slate-500">
                          {seg.airlineName}
                        </span>
                        <InfoBadge color="sky">{seg.aircraft}</InfoBadge>
                      </div>
                      <div className="flex gap-2">
                        <InfoBadge color="teal">
                          Fare: {seg.fareClass}
                        </InfoBadge>
                        {seg.cabinClass === 2 && (
                          <InfoBadge color="blue">Economy</InfoBadge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          From
                        </p>
                        <p className="text-sm font-bold">
                          {getSegCity(seg, "origin")} ({seg.origin?.airportCode}
                          )
                        </p>
                        <p className="text-[11px] text-slate-400">
                          T{seg.origin?.terminal || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          To
                        </p>
                        <p className="text-sm font-bold">
                          {getSegCity(seg, "destination")} (
                          {seg.destination?.airportCode})
                        </p>
                        <p className="text-[11px] text-slate-400">
                          T{seg.destination?.terminal || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Departure
                        </p>
                        <p className="text-sm font-bold">
                          {formatDateTime(seg.departureDateTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Arrival
                        </p>
                        <p className="text-sm font-bold">
                          {formatDateTime(seg.arrivalDateTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Duration
                        </p>
                        <p className="text-sm font-bold">
                          {Math.floor(seg.durationMinutes / 60)}h{" "}
                          {seg.durationMinutes % 60}m
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Stop Over
                        </p>
                        <p className="text-sm font-bold">
                          {seg.stopOver ? "Yes" : "Non-Stop"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Check-in Bag
                        </p>
                        <p className="text-sm font-bold">
                          {seg.baggage?.checkIn || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Cabin Bag
                        </p>
                        <p className="text-sm font-bold">
                          {seg.baggage?.cabin || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div>
            <SectionLabel
              icon={<FiDollarSign size={11} />}
              title="Fare Summary"
            />
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap gap-6 justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Total Amount
                </p>
                <p className="text-3xl font-black mt-1">
                  {pricing.currency} {pricing.totalAmount?.toLocaleString()}
                </p>
                <p className="text-slate-500 text-[10px] mt-1">
                  Captured: {formatDateTime(pricing.capturedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  {
                    l: "Base Fare",
                    v: `${fareSnap.currency || "INR"} ${fareSnap.baseFare?.toLocaleString() || "—"}`,
                  },
                  {
                    l: "Tax",
                    v: `${fareSnap.currency || "INR"} ${fareSnap.tax?.toLocaleString() || "—"}`,
                  },
                  {
                    l: "Published",
                    v: `${fareSnap.currency || "INR"} ${fareSnap.publishedFare?.toLocaleString() || "—"}`,
                  },
                  {
                    l: "Offered",
                    v: `${fareSnap.currency || "INR"} ${fareSnap.offeredFare?.toLocaleString() || "—"}`,
                  },
                ].map(({ l, v }, i) => (
                  <div key={i}>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">
                      {l}
                    </p>
                    <p className="text-white font-bold text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStatCard
                label="Fare Type"
                value={fareSnap.fareType || snap.cabinClass || "—"}
              />
              <MiniStatCard
                label="Refundable"
                value={fareSnap.refundable ? "Yes" : "No"}
              />
              <MiniStatCard
                label="Travel Date"
                value={formatDate(snap.travelDate)}
              />
              <MiniStatCard
                label="Last Ticket"
                value={
                  fareSnap.lastTicketDate
                    ? formatDate(fareSnap.lastTicketDate)
                    : "—"
                }
              />
            </div>
          </div>

          {/* Mini Fare Rules */}
          {miniFareRules.length > 0 && (
            <div>
              <SectionLabel
                icon={<FiShield size={11} />}
                title="Fare Rules (Change / Cancel)"
              />
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Type</th>
                      <th className="px-4 py-2.5 text-left">Journey</th>
                      <th className="px-4 py-2.5 text-left">Window</th>
                      <th className="px-4 py-2.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {miniFareRules.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.Type === "Cancellation" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                          >
                            {r.Type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {r.JourneyPoints}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {r.From != null && r.Unit
                            ? `${r.From}–${r.To || "∞"} ${r.Unit}`
                            : "Any time"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {r.Details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SSR */}
          {(ssrSnap.seats?.length || 0) +
            (ssrSnap.meals?.length || 0) +
            (ssrSnap.baggage?.length || 0) >
            0 && (
            <div>
              <SectionLabel
                icon={<FiTag size={11} />}
                title="SSR — Seats / Meals / Baggage"
              />
              <div className="grid md:grid-cols-3 gap-3">
                {ssrSnap.seats?.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                      Seats
                    </p>
                    {ssrSnap.seats.map((s, i) => (
                      <p
                        key={i}
                        className="text-xs font-semibold text-slate-700"
                      >
                        Seat {s.seatNo} · Seg {s.segmentIndex} · ₹{s.price}
                      </p>
                    ))}
                  </div>
                )}
                {ssrSnap.meals?.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                      Meals
                    </p>
                    {ssrSnap.meals.map((m, i) => (
                      <p
                        key={i}
                        className="text-xs font-semibold text-slate-700"
                      >
                        {m.code} · Seg {m.segmentIndex} · ₹{m.price}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Travellers */}
          <div>
            <SectionLabel
              icon={<FiUser size={11} />}
              title={`Travellers (${travelers.length})`}
            />
            <div className="space-y-3">
              {travelers.map((pax, i) => {
                const provPax = passengerInfo.find(
                  (p) => p.IsLeadPax === pax.isLeadPassenger,
                );
                return (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center font-black text-sm shrink-0">
                          {(pax.firstName || "?")[0]}
                          {(pax.lastName || "?")[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">
                            {pax.title} {pax.firstName} {pax.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                            {pax.isLeadPassenger
                              ? "Lead Passenger"
                              : "Passenger"}
                          </p>
                        </div>
                      </div>
                      {pax.isLeadPassenger && (
                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase">
                          Lead
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Gender
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {pax.gender || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          DOB
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatDate(pax.dateOfBirth || pax.dob)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Nationality
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {pax.nationality || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Email
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {pax.email || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Phone
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          +{pax.phoneWithCode || "—"}
                        </p>
                      </div>
                      {pax.passportNumber && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Passport
                          </p>
                          <p className="text-xs font-mono font-semibold text-slate-700">
                            {pax.passportNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    {provPax?.Ticket && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-green-600 uppercase">
                            Ticket No
                          </p>
                          <p className="text-xs font-mono font-bold text-green-800">
                            {provPax.Ticket.TicketNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-green-600 uppercase">
                            Status
                          </p>
                          <p className="text-xs font-bold text-green-800">
                            {provPax.Ticket.Status}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-green-600 uppercase">
                            Issue Date
                          </p>
                          <p className="text-xs font-semibold text-green-800">
                            {formatDate(provPax.Ticket.IssueDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Result */}
          {(pnr || invoices.length > 0) && (
            <div>
              <SectionLabel
                icon={<FiCheckCircle size={11} />}
                title="Booking Result"
              />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {pnr && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 uppercase">
                      PNR
                    </p>
                    <p className="text-sm font-mono font-black text-blue-900">
                      {pnr}
                    </p>
                  </div>
                )}
                {flightItin.TBOConfNo && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 uppercase">
                      TBO Conf No
                    </p>
                    <p className="text-sm font-mono font-bold text-blue-900">
                      {flightItin.TBOConfNo}
                    </p>
                  </div>
                )}
                {flightItin.BookingId && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 uppercase">
                      Booking ID
                    </p>
                    <p className="text-sm font-mono font-bold text-blue-900">
                      {flightItin.BookingId}
                    </p>
                  </div>
                )}
                {invoices.map((inv, i) => (
                  <React.Fragment key={i}>
                    <div>
                      <p className="text-[10px] font-bold text-blue-700 uppercase">
                        Invoice No
                      </p>
                      <p className="text-sm font-mono font-bold text-blue-900">
                        {inv.InvoiceNo}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-700 uppercase">
                        Invoice Amount
                      </p>
                      <p className="text-sm font-bold text-blue-900">
                        ₹{inv.InvoiceAmount?.toLocaleString()}
                      </p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Amendment History */}
          {amendHist.length > 0 && (
            <div>
              <SectionLabel
                icon={<FiInfo size={11} />}
                title={`Amendment History (${amendHist.length})`}
              />
              <div className="space-y-2">
                {amendHist.map((ah, i) => (
                  <div
                    key={i}
                    className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex justify-between items-start gap-4"
                  >
                    <div>
                      <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-[10px] font-bold rounded uppercase">
                        {ah.type?.replace(/_/g, " ")}
                      </span>
                      <p className="text-xs text-slate-600 mt-1 font-semibold capitalize">
                        {ah.status?.replace(/_/g, " ")}
                      </p>
                      {ah.changeRequestId && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          CR ID: {ah.changeRequestId}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <p>{formatDateTime(ah.createdAt)}</p>
                      {ah.response?.Response?.Error?.ErrorMessage && (
                        <p className="text-red-500 mt-0.5 text-[10px]">
                          {ah.response.Response.Error.ErrorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requester + Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiUser size={11} />} title="Requested By" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                  {user.name?.firstName?.[0]}
                  {user.name?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {user.name?.firstName} {user.name?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <FiMail size={10} />
                    {user.email}
                  </p>
                </div>
                {approver._id && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Approved By
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      {approver.name?.firstName} {approver.name?.lastName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(raw.approvedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionLabel icon={<FiTag size={11} />} title="Booking Meta" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <InfoRow label="Booking ID" value={raw._id} mono padded />
                <InfoRow
                  label="Corporate ID"
                  value={raw.corporateId}
                  mono
                  padded
                />
                <InfoRow
                  label="Execution Status"
                  value={raw.executionStatus?.replace(/_/g, " ")}
                  capitalize
                  padded
                />
                <InfoRow
                  label="Trace ID"
                  value={raw.flightRequest?.traceId?.slice(0, 28) + "…"}
                  mono
                  padded
                />
                <InfoRow
                  label="Updated At"
                  value={formatDateTime(raw.updatedAt)}
                  padded
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
              Purpose of Travel
            </p>
            <p className="text-sm text-amber-900 italic">
              "{raw.purposeOfTravel}"
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Ref:{" "}
            <span className="font-mono font-bold text-slate-600">
              {raw.bookingReference}
            </span>
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
