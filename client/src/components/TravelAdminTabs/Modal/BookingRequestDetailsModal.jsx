import React from "react";
import { FaHotel, FaPlane } from "react-icons/fa";
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
  FiStar,
  FiLayers,
} from "react-icons/fi";
import {
  formatDate,
  formatDateTime,
  formatDateWithYear,
} from "../../../utils/formatter";
import {
  ExecStatusBadge,
  getSegCity,
  InfoBadge,
  InfoRow,
  MiniStatCard,
  SectionLabel,
  TraceTimer,
} from "../Shared/CommonComponents";

const getPaxCategory = (pax) => {
  const t = (pax?.paxType || "").toString().toLowerCase();
  if (t.includes("inf")) return "Infant";
  if (t.includes("chd") || t.includes("cnn") || t.includes("child"))
    return "Child";
  return "Adult";
};

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL BOOKING MODAL — full details (multi-room fixed)
// ─────────────────────────────────────────────────────────────────────────────
export const HotelBookingModal = ({ booking: raw, onClose }) => {
  if (!raw) return null;

  const hotel = raw.hotelRequest?.selectedHotel || {};
  const selectedRoom = raw.hotelRequest?.selectedRoom || {};

  // ✅ FIX: rawRoomData is always an array — normalise it
  const rawRooms = Array.isArray(selectedRoom.rawRoomData)
    ? selectedRoom.rawRoomData
    : [selectedRoom.rawRoomData].filter(Boolean);

  const pricing = raw.pricingSnapshot || {};
  const snap = raw.bookingSnapshot || {};
  const travelers = raw.travellers || [];
  const roomGuests = raw.hotelRequest?.roomGuests || [];
  const approver = raw.approvedBy || raw.approverId || {};
  const user = raw.userId || {};
  const amendment = raw.amendment || {};
  const bookRes = raw.bookingResult || {};
  const travellerCountsHotel = travelers.reduce(
    (acc, t) => {
      const cat = getPaxCategory(t);
      if (cat === "Infant") acc.infant += 1;
      else if (cat === "Child") acc.child += 1;
      else acc.adult += 1;
      return acc;
    },
    { adult: 0, child: 0, infant: 0 },
  );

  // Aggregate all cancellation policies from all rooms (deduplicated by FromDate)
  const allPoliciesMap = new Map();
  rawRooms.forEach((r) => {
    (r.CancelPolicies || []).forEach((p) => {
      if (!allPoliciesMap.has(p.FromDate)) allPoliciesMap.set(p.FromDate, p);
    });
  });
  const policies = [...allPoliciesMap.values()];

  // Total base fare across all rooms
  // const totalFare = rawRooms.reduce((s, r) => s + (r.TotalFare || 0), 0);
  // const totalTax = rawRooms.reduce((s, r) => s + (r.TotalTax || 0), 0);
  // const baseFare = totalFare - totalTax;

  const allRooms = raw.hotelRequest?.allRooms || [];

const totalFare = allRooms.reduce((sum, r) => sum + (r.totalFare || 0), 0);
const totalTax = allRooms.reduce((sum, r) => sum + (r.totalTax || 0), 0);
const baseFare = totalFare - totalTax;
const currency = allRooms[0]?.price?.currency || "INR";

  const getDisplayName = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p;
    if (p.name?.firstName) {
      return `${p.name.firstName} ${p.name.lastName || ""}`.trim();
    }
    if (p.firstName) return `${p.firstName} ${p.lastName || ""}`.trim();
    return p.name || "";
  };

  const approverName =
    raw.approverName || getDisplayName(approver) || "—";
  const approverEmail =
    raw.approverEmail || approver.email || "—";
  const approverRole =
    raw.approverRole || approver.role || "—";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden"
      >
        {/* ── Header ── */}
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

        {/* ── Status bar ── */}
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

          {/* ── Hotel Info ── */}
          <div>
            <SectionLabel icon={<FiHome size={11} />} title="Hotel Information" />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <p className="text-xl font-black text-slate-900">{hotel.hotelName}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                    <FiMapPin className="mt-0.5 shrink-0" size={11} />
                    {hotel.address}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-mono">{hotel.hotelCode}</p>
                  {hotel.starRating > 0 && (
                    <p className="text-amber-500 mt-1">{"★".repeat(hotel.starRating)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Project & Approver ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <SectionLabel icon={<FiInfo size={11} />} title="Project Details" />
              <div className="mt-2 space-y-2 text-sm">
                <InfoRow label="Project Name" value={raw.projectName || "—"} />
                <InfoRow label="Project ID" value={raw.projectId || "—"} />
                <InfoRow label="Client" value={raw.projectClient || "—"} />
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <SectionLabel icon={<FiShield size={11} />} title="Approver" />
              <div className="mt-2 space-y-2 text-sm">
                <InfoRow label="Name" value={approverName} />
                <InfoRow label="Email" value={approverEmail} />
                <InfoRow label="Role" value={approverRole} />
              </div>
            </div>
          </div>

          {/* ── Stay Details ── */}
          <div>
            <SectionLabel icon={<FiCalendar size={11} />} title="Stay Details" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStatCard
                label="Check-In"
                value={formatDate(raw.hotelRequest?.checkInDate)}
                sub={new Date(raw.hotelRequest?.checkInDate).toLocaleDateString("en-GB", { weekday: "long" })}
              />
              <MiniStatCard
                label="Check-Out"
                value={formatDate(raw.hotelRequest?.checkOutDate)}
                sub={new Date(raw.hotelRequest?.checkOutDate).toLocaleDateString("en-GB", { weekday: "long" })}
              />
              <MiniStatCard
                label="Nights"
                value={rawRooms[0]?.Price?.nights || snap.nights || "—"}
              />
              <MiniStatCard label="Rooms" value={raw.hotelRequest?.noOfRooms} />
            </div>

            {roomGuests.map((rg, i) => (
              <div
                key={i}
                className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-wrap gap-6 text-sm"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Room {i + 1} Guests</p>
                  <p className="font-semibold">
                    {rg.noOfAdults} Adult{rg.noOfAdults !== 1 ? "s" : ""}
                    {rg.noOfChild > 0 ? `, ${rg.noOfChild} Child` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nationality</p>
                  <p className="font-semibold">{raw.hotelRequest?.guestNationality}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Currency</p>
                  <p className="font-semibold">{raw.hotelRequest?.preferredCurrency}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Selected Rooms (one card per room) ── */}
          <div>
            <SectionLabel
              icon={<FiLayers size={11} />}
              title={`Selected Rooms (${rawRooms.length})`}
            />
            <div className="space-y-4">
              {rawRooms.map((room, idx) => {
                const roomName = Array.isArray(room.Name) ? room.Name[0] : room.Name;
                const roomPrice = room.Price || {};
                const dayRates = room.DayRates?.[0] || [];
                const inclusions = room.Inclusion
                  ? room.Inclusion.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];
                const roomImages = room.images || room.rawRoomData?.images || [];
                const roomBaseFare = (room.TotalFare || 0) - (room.TotalTax || 0);

                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden"
                  >
                    {/* Room header */}
                    <div className="bg-gradient-to-r from-[#088395]/10 to-slate-50 px-5 py-3 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#088395] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="font-black text-slate-800 text-sm">{roomName}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <InfoBadge color="blue">
                          <FiCoffee size={9} className="mr-1" />
                          {room.MealType?.replace(/_/g, " ")}
                        </InfoBadge>
                        {room.IsRefundable ? (
                          <InfoBadge color="green">
                            <FiCheckCircle size={9} className="mr-1" />
                            Refundable
                          </InfoBadge>
                        ) : (
                          <InfoBadge color="red">Non-Refundable</InfoBadge>
                        )}
                        {!room.WithTransfers && (
                          <InfoBadge color="gray">No Transfers</InfoBadge>
                        )}
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: room details */}
                      <div className="space-y-4">
                        {/* Pricing */}
                        <div className="bg-slate-900 text-white rounded-xl p-4">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Total Fare (Incl. Tax)
                          </p>
                          <p className="text-2xl font-black mt-1">
                            {selectedRoom.currency || "INR"}{" "}
                            {room.TotalFare?.toLocaleString()}
                          </p>
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Base</p>
                              <p className="text-white font-bold text-sm">
                                {selectedRoom.currency || "INR"} {roomBaseFare?.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Tax</p>
                              <p className="text-white font-bold text-sm">
                                {selectedRoom.currency || "INR"} {room.TotalTax?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Per Night</p>
                              <p className="text-white font-bold text-sm">
                                {selectedRoom.currency || "INR"}{" "}
                                {roomPrice.perNight?.toFixed(2) || "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Booking Code */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Booking Code
                          </p>
                          <p className="text-[10px] font-mono text-slate-600 break-all leading-relaxed">
                            {room.BookingCode}
                          </p>
                        </div>

                        {/* Inclusions */}
                        {inclusions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                              Inclusions
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {inclusions.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                                >
                                  <FiCheckCircle size={9} className="text-green-500" />
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: day rates + images */}
                      <div className="space-y-4">
                        {/* Day Rates */}
                        {dayRates.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                              Day Rates
                            </p>
                            <div className="space-y-1.5">
                              {dayRates.map((d, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                                >
                                  <span className="text-xs text-slate-500">Night {i + 1}</span>
                                  <span className="text-sm font-bold text-slate-800">
                                    {selectedRoom.currency || "INR"}{" "}
                                    {d.BasePrice?.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Room Images */}
                        {roomImages.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                              Room Images
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {roomImages.slice(0, 5).map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`Room ${idx + 1} image ${i + 1}`}
                                  className="h-20 w-28 object-cover rounded-lg border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cancellation Policy per room */}
                    {(room.CancelPolicies || []).length > 0 && (
                      <div className="border-t border-slate-100 px-5 py-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <FiShield size={10} /> Cancellation Policy
                        </p>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                              <tr>
                                <th className="px-4 py-2 text-left">From Date</th>
                                <th className="px-4 py-2 text-left">Charge Type</th>
                                <th className="px-4 py-2 text-right">Penalty</th>
                                <th className="px-4 py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {room.CancelPolicies.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                                    {p.FromDate}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                                    {p.ChargeType}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-black">
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
                                  <td className="px-4 py-2.5 text-right">
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Overall Pricing Summary ── */}
          <div>
            <SectionLabel icon={<FiDollarSign size={11} />} title="Total Pricing Summary" />
            <div className="bg-slate-900 text-white p-5 rounded-2xl">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Grand Total (Incl. Tax)
              </p>
              <p className="text-3xl font-black mt-1">
                 {currency} {totalFare.toLocaleString()}
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                Captured: {formatDateTime(pricing.capturedAt)}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase">Total Base</p>
                  <p className="text-white font-bold text-sm">
                    {pricing.currency} {baseFare?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase">Total Tax</p>
                  <p className="text-white font-bold text-sm">
                    {pricing.currency} {totalTax?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase">Rooms</p>
                  <p className="text-white font-bold text-sm">{rawRooms.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Travellers ── */}
          <div>
            <SectionLabel
              icon={<FiUser size={11} />}
              title={`Travellers (${travelers.length})`}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {travellerCountsHotel.adult > 0 && (
                <InfoBadge color="blue">
                  {travellerCountsHotel.adult} Adult
                  {travellerCountsHotel.adult > 1 ? "s" : ""}
                </InfoBadge>
              )}
              {travellerCountsHotel.child > 0 && (
                <InfoBadge color="amber">
                  {travellerCountsHotel.child} Child
                  {travellerCountsHotel.child > 1 ? "ren" : ""}
                </InfoBadge>
              )}
              {travellerCountsHotel.infant > 0 && (
                <InfoBadge color="purple">
                  {travellerCountsHotel.infant} Infant
                  {travellerCountsHotel.infant > 1 ? "s" : ""}
                </InfoBadge>
              )}
            </div>
            <div className="space-y-3">
              {travelers.map((pax, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#088395]/10 text-[#088395] flex items-center justify-center font-black text-sm shrink-0">
                        {pax.firstName?.[0]}{pax.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          {pax.title} {pax.firstName} {pax.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                          {getPaxCategory(pax)}
                          {pax.isLeadPassenger ? " • Lead" : ""}
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
                      { icon: <FiUser size={10} />, label: "Gender", value: pax.gender },
                      { icon: <FiCalendar size={10} />, label: "Date of Birth", value: formatDateWithYear(pax.dob || pax.dateOfBirth) },
                      { icon: <FiInfo size={10} />, label: "Age", value: `${pax.age} years` },
                      { icon: <FiGlobe size={10} />, label: "Nationality", value: pax.nationality },
                      pax.isLeadPassenger && { icon: <FiMail size={10} />, label: "Email", value: pax.email },
                      pax.isLeadPassenger && { icon: <FiPhone size={10} />, label: "Phone", value: pax.phoneWithCode ? `+${pax.phoneWithCode}` : "—" },
                    ]
                      .filter(Boolean)
                      .map(({ icon, label, value }, j) => (
                      <div key={j}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                          {icon} {label}
                        </p>
                        <p className="text-xs font-semibold text-slate-700">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Booking Confirmation ── */}
          {bookRes.hotelBookingId && (
            <div>
              <SectionLabel
                icon={<FiCheckCircle size={11} />}
                title="Booking Confirmation"
              />
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase">Confirmation No</p>
                  <p className="text-sm font-mono font-bold text-green-800">
                    {bookRes.providerResponse?.BookResult?.ConfirmationNo || bookRes.hotelBookingId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase">Booking ID</p>
                  <p className="text-sm font-mono font-bold text-green-800">
                    {bookRes.hotelBookingId}
                  </p>
                </div>
                {bookRes.providerResponse?.BookResult?.InvoiceNumber && (
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase">Invoice No</p>
                    <p className="text-sm font-mono font-bold text-green-800">
                      {bookRes.providerResponse.BookResult.InvoiceNumber}
                    </p>
                  </div>
                )}
                {bookRes.providerResponse?.BookResult?.BookingRefNo && (
                  <div className="col-span-full">
                    <p className="text-[10px] font-bold text-green-600 uppercase">Booking Ref Nos</p>
                    <p className="text-xs font-mono font-semibold text-green-700">
                      {bookRes.providerResponse.BookResult.BookingRefNo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Amendment ── */}
          {amendment.status && amendment.status !== "not_requested" && (
            <div>
              <SectionLabel icon={<FiInfo size={11} />} title="Amendment Details" />
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-1">
                <InfoRow label="Amendment Type" value={amendment.amendmentType} />
                <InfoRow label="Status" value={amendment.status?.replace(/_/g, " ")} capitalize />
                {amendment.remarks && <InfoRow label="Remarks" value={amendment.remarks} />}
                {amendment.requestedAt && (
                  <InfoRow label="Requested At" value={formatDateTime(amendment.requestedAt)} />
                )}
              </div>
            </div>
          )}

          {/* ── Requester + Meta ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionLabel icon={<FiUser size={11} />} title="Requested By" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                  {user.name?.firstName?.[0]}{user.name?.lastName?.[0]}
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
                {approver && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Approved By</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {raw.approverComments || "—"}
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
                <InfoRow label="Corporate ID" value={raw.corporateId} mono padded />
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
                <InfoRow label="Updated At" value={formatDateTime(raw.updatedAt)} padded />
              </div>
            </div>
          </div>

          {/* ── Purpose of Travel ── */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
              Purpose of Travel
            </p>
            <p className="text-sm text-amber-900 italic">"{raw.purposeOfTravel}"</p>
          </div>
        </div>

        {/* ── Footer ── */}
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
  const onwardSegments = segments.filter(
    (s) => s.journeyType === "onward",
  );
  const returnSegments = segments.filter(
    (s) => s.journeyType === "return",
  );
  const journeys =
    onwardSegments.length || returnSegments.length
      ? [
          { label: "Onward", segs: onwardSegments },
          { label: "Return", segs: returnSegments },
        ].filter((j) => j.segs.length)
      : [{ label: "Route", segs: segments }];
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
  const onwardPNR = bookRes.onwardPNR || pnr;
  const returnPNR = bookRes.returnPNR || null;
  const invoices = flightItin?.Invoice || [];
  const passengerInfo = flightItin?.Passenger || [];
  const totalAmount =
    pricing?.totalAmount ??
    snap?.amount ??
    0;
  const amountCurrency = pricing?.currency || snap?.currency || "INR";
  const firstOnwardDate = onwardSegments[0]?.departureDateTime;
  const firstReturnDate = returnSegments[0]?.departureDateTime;
  const airlineNames =
    Array.from(
      new Set(segments.map((s) => s.airlineName).filter(Boolean)),
    ).join(", ") || "N/A";

  const travellerCounts = travelers.reduce(
    (acc, t) => {
      const type = (t.paxType || "").toString().toLowerCase();
      if (type.includes("infant") || type === "inf") acc.infant += 1;
      else if (type.includes("child") || type === "cnn" || type === "chd")
        acc.child += 1;
      else acc.adult += 1;
      return acc;
    },
    { adult: 0, child: 0, infant: 0 },
  );

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
            {onwardPNR && (
              <span className="font-mono text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                Onward PNR: {onwardPNR}
              </span>
            )}
            {returnPNR && (
              <span className="font-mono text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                Return PNR: {returnPNR}
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
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                {journeys.map((j, idx) => {
                  const first = j.segs[0];
                  const last = j.segs[j.segs.length - 1];
                  return (
                    <div
                      key={j.label}
                      className={`flex flex-wrap items-center gap-4 ${idx > 0 ? "pt-3 border-t border-slate-200" : ""}`}
                    >
                      <span className="text-[11px] font-black uppercase text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">
                        {j.label}
                      </span>
                      <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">
                          {first?.origin?.airportCode || "N/A"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getSegCity(first, "origin")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {formatDateTime(first?.departureDateTime)}
                        </p>
                        {first?.origin?.terminal && (
                          <p className="text-[10px] bg-slate-200 text-slate-600 rounded px-1 mt-1">
                            T{first.origin.terminal}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-2 justify-center">
                        <div className="h-px flex-1 bg-slate-300" />
                        <div className="flex flex-col items-center gap-1">
                          <FaPlane size={14} className="text-[#0A4D68]" />
                          <span className="text-[10px] text-slate-400">
                            {airlineNames}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {snap.cabinClass || "N/A"}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">
                          {last?.destination?.airportCode || "N/A"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getSegCity(last, "destination")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {formatDateTime(last?.arrivalDateTime)}
                        </p>
                        {last?.destination?.terminal && (
                          <p className="text-[10px] bg-slate-200 text-slate-600 rounded px-1 mt-1">
                            T{last.destination.terminal}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Segments grouped */}
          {segments.length > 0 && (
            <div>
              <SectionLabel
                icon={<FaPlane size={11} />}
                title={`Segments (${segments.length})`}
              />
              <div className="space-y-4">
                {journeys.map((j) => (
                  <div key={j.label} className="space-y-2">
                    <p className="text-[11px] font-black uppercase text-slate-500">
                      {j.label}
                    </p>
                    <div className="space-y-3">
                      {j.segs.map((seg, i) => (
                        <div
                          key={`${j.label}-${i}`}
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
                              {seg.aircraft && (
                                <InfoBadge color="sky">{seg.aircraft}</InfoBadge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {seg.fareClass && (
                                <InfoBadge color="teal">
                                  Fare: {seg.fareClass}
                                </InfoBadge>
                              )}
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
                                {getSegCity(seg, "origin")} (
                                {seg.origin?.airportCode || "N/A"})
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
                                {seg.destination?.airportCode || "N/A"})
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
                                {Math.floor((seg.durationMinutes || 0) / 60)}h{" "}
                                {(seg.durationMinutes || 0) % 60}m
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
                  {amountCurrency} {totalAmount.toLocaleString()}
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
                label="Onward Date"
                value={formatDate(firstOnwardDate || snap.travelDate)}
              />
              <MiniStatCard
                label="Return Date"
                value={formatDate(firstReturnDate || snap.returnDate)}
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
            <div className="flex flex-wrap gap-2 mt-2">
              {travellerCounts.adult > 0 && (
                <InfoBadge color="blue">
                  {travellerCounts.adult} Adult
                  {travellerCounts.adult > 1 ? "s" : ""}
                </InfoBadge>
              )}
              {travellerCounts.child > 0 && (
                <InfoBadge color="amber">
                  {travellerCounts.child} Child
                  {travellerCounts.child > 1 ? "ren" : ""}
                </InfoBadge>
              )}
              {travellerCounts.infant > 0 && (
                <InfoBadge color="purple">
                  {travellerCounts.infant} Infant
                  {travellerCounts.infant > 1 ? "s" : ""}
                </InfoBadge>
              )}
            </div>
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
                            {getPaxCategory(pax)}
                            {pax.isLeadPassenger ? " • Lead" : ""}
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
                            {formatDateWithYear(pax.dateOfBirth || pax.dob)}
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
                      {pax.isLeadPassenger && (
                        <>
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
                              {pax.phoneWithCode ? `+${pax.phoneWithCode}` : "—"}
                            </p>
                          </div>
                        </>
                      )}
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
