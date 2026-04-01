import React, { useState } from "react";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiHome, FiCheckCircle, FiDollarSign, FiCalendar, FiUser,
  FiX, FiMapPin, FiShield, FiCoffee, FiTag, FiInfo,
  FiPhone, FiMail, FiGlobe, FiKey, FiClock, FiPackage,
} from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Slate-Indigo refined palette
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  flight: { bg: "#1e3a5f", accent: "#3b82f6", light: "#eff6ff", ring: "#bfdbfe" },
  hotel:  { bg: "#134e4a", accent: "#14b8a6", light: "#f0fdfa", ring: "#99f6e4" },
};

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY DATA
// ─────────────────────────────────────────────────────────────────────────────
const DUMMY_FLIGHT = {
  _id: "664a1f2e8b3c4d5e6f708192",
  bookingReference: "TRV-FL-20240512-00143",
  executionStatus: "ticketed",
  requestStatus: "approved",
  corporateId: "CORP-ACME-001",
  purposeOfTravel: "Client meeting and product demo at Mumbai headquarters.",
  createdAt: "2024-05-12T09:30:00.000Z",
  updatedAt: "2024-05-12T11:45:00.000Z",
  approvedAt: "2024-05-12T10:05:00.000Z",
  userId: {
    name: { firstName: "Arjun", lastName: "Sharma" },
    email: "arjun.sharma@acme.com",
  },
  approvedBy: {
    _id: "mgr001",
    name: { firstName: "Priya", lastName: "Nair" },
  },
  flightRequest: {
    traceId: "TRC-20240512-XYZ987654321ABCDEF",
    segments: [
      {
        airlineCode: "6E", flightNumber: "2341", airlineName: "IndiGo",
        aircraft: "A320neo", fareClass: "S", cabinClass: 2,
        origin: { airportCode: "DEL", city: "New Delhi", terminal: "2" },
        destination: { airportCode: "BOM", city: "Mumbai", terminal: "1" },
        departureDateTime: "2024-05-18T06:15:00.000Z",
        arrivalDateTime: "2024-05-18T08:30:00.000Z",
        durationMinutes: 135,
        stopOver: false,
        baggage: { checkIn: "15 Kg", cabin: "7 Kg" },
      },
      {
        airlineCode: "6E", flightNumber: "2342", airlineName: "IndiGo",
        aircraft: "A320neo", fareClass: "S", cabinClass: 2,
        origin: { airportCode: "BOM", city: "Mumbai", terminal: "1" },
        destination: { airportCode: "DEL", city: "New Delhi", terminal: "2" },
        departureDateTime: "2024-05-20T19:00:00.000Z",
        arrivalDateTime: "2024-05-20T21:20:00.000Z",
        durationMinutes: 140,
        stopOver: false,
        baggage: { checkIn: "15 Kg", cabin: "7 Kg" },
      },
    ],
    fareSnapshot: {
      currency: "INR", baseFare: 5800, tax: 1420,
      publishedFare: 7220, offeredFare: 7080,
      refundable: false, fareType: "SAVER",
      lastTicketDate: "2024-05-14T23:59:00.000Z",
      miniFareRules: [[
        { Type: "Cancellation", JourneyPoints: "DEL-BOM", From: 0, To: 24, Unit: "hours", Details: "₹3,500 per pax" },
        { Type: "Cancellation", JourneyPoints: "DEL-BOM", From: 24, To: null, Unit: "hours", Details: "₹2,000 per pax" },
        { Type: "Date Change", JourneyPoints: "DEL-BOM", From: 0, To: null, Unit: "hours", Details: "₹2,250 + fare diff" },
      ]],
    },
    ssrSnapshot: {
      seats: [{ seatNo: "12A", segmentIndex: 0, price: 350 }, { seatNo: "12A", segmentIndex: 1, price: 350 }],
      meals: [{ code: "VJML", segmentIndex: 0, price: 250 }],
      baggage: [],
    },
  },
  pricingSnapshot: {
    currency: "INR", totalAmount: 7780,
    capturedAt: "2024-05-12T09:28:00.000Z",
  },
  bookingSnapshot: {
    airline: "IndiGo", cabinClass: "Economy",
    travelDate: "2024-05-18T00:00:00.000Z",
  },
  travellers: [
    {
      title: "Mr", firstName: "Arjun", lastName: "Sharma",
      gender: "Male", dateOfBirth: "1990-07-22T00:00:00.000Z",
      nationality: "Indian", email: "arjun.sharma@acme.com",
      phoneWithCode: "919876543210", passportNumber: "Z1234567",
      isLeadPassenger: true,
    },
  ],
  amendment: { status: "not_requested" },
  amendmentHistory: [],
  bookingResult: {
    pnr: "WXYZ12",
    providerResponse: {
      Response: {
        Response: {
          PNR: "WXYZ12",
          BookingId: 7654321,
          TBOConfNo: "TBO-9988776",
          FlightItinerary: {
            PNR: "WXYZ12", BookingId: 7654321, TBOConfNo: "TBO-9988776",
            Invoice: [{ InvoiceNo: "INV-20240512-9988", InvoiceAmount: 7780 }],
            Passenger: [{
              IsLeadPax: true,
              Ticket: { TicketNumber: "083-1234567890", Status: "Issued", IssueDate: "2024-05-12T00:00:00.000Z" },
            }],
          },
        },
      },
    },
  },
};

const DUMMY_HOTEL = {
  _id: "774b2a3f9c4d5e6f7a809203",
  bookingReference: "TRV-HT-20240513-00089",
  executionStatus: "voucher_generated",
  requestStatus: "approved",
  corporateId: "CORP-ACME-001",
  purposeOfTravel: "Extended client engagement — stay near Bandra Kurla Complex.",
  createdAt: "2024-05-13T10:00:00.000Z",
  updatedAt: "2024-05-13T12:30:00.000Z",
  approvedAt: "2024-05-13T10:45:00.000Z",
  userId: {
    name: { firstName: "Arjun", lastName: "Sharma" },
    email: "arjun.sharma@acme.com",
  },
  approvedBy: {
    _id: "mgr001",
    name: { firstName: "Priya", lastName: "Nair" },
  },
  hotelRequest: {
    checkInDate: "2024-05-18T00:00:00.000Z",
    checkOutDate: "2024-05-20T00:00:00.000Z",
    noOfRooms: 1,
    guestNationality: "IN",
    preferredCurrency: "INR",
    roomGuests: [{ noOfAdults: 1, noOfChild: 0 }],
    selectedHotel: {
      hotelName: "Taj Lands End Mumbai",
      hotelCode: "HTL-MUM-TAJ-001",
      address: "Bandstand, Bandra West, Mumbai, Maharashtra 400050",
      starRating: 5,
    },
    selectedRoom: {
      totalFare: 18500, totalTax: 3330, currency: "INR",
      mealType: "Breakfast Included", isRefundable: true,
      withTransfers: false, inclusion: "Free WiFi, Breakfast, Swimming Pool Access",
      cancelPolicies: [
        { FromDate: "2024-05-13", ChargeType: "Fixed", CancellationCharge: 0 },
        { FromDate: "2024-05-16", ChargeType: "Percentage", CancellationCharge: 50 },
        { FromDate: "2024-05-18", ChargeType: "Percentage", CancellationCharge: 100 },
      ],
      rawRoomData: {
        Name: ["Superior Sea View Room"],
        MealType: "Breakfast Included",
        images: [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&q=80",
          "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&q=80",
        ],
        RoomPromotion: ["Early Bird Offer", "Complimentary Upgrade"],
        Price: { nights: 2, perNight: 9250 },
        DayRates: [[
          { BasePrice: 9250 },
          { BasePrice: 9250 },
        ]],
      },
    },
  },
  pricingSnapshot: {
    currency: "INR", totalAmount: 21830,
    capturedAt: "2024-05-13T09:58:00.000Z",
  },
  bookingSnapshot: { nights: 2 },
  travellers: [
    {
      title: "Mr", firstName: "Arjun", lastName: "Sharma",
      gender: "Male", dob: "1990-07-22T00:00:00.000Z",
      nationality: "Indian", email: "arjun.sharma@acme.com",
      phoneWithCode: "919876543210", age: 33,
      isLeadPassenger: true, paxType: "Adult",
    },
  ],
  amendment: { status: "not_requested" },
  bookingResult: {
    hotelBookingId: "HTLBK-9923441",
    providerResponse: {
      BookResult: {
        ConfirmationNo: "CONF-TAJ-229944",
        BookingId: "HTLBK-9923441",
        InvoiceNumber: "INV-HT-20240513-4421",
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const weekday = (d) => d ? new Date(d).toLocaleDateString("en-GB", { weekday: "long" }) : "—";

const ExecBadge = ({ status }) => {
  const map = {
    ticketed: { label: "Ticketed", cls: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
    voucher_generated: { label: "Voucher Generated", cls: "bg-teal-100 text-teal-800 ring-teal-300" },
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 ring-amber-300" },
    cancel_requested: { label: "Cancel Requested", cls: "bg-red-100 text-red-800 ring-red-300" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700 ring-slate-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
};

const Pill = ({ children, color = "slate" }) => {
  const cls = {
    teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    gray: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cls[color] || cls.gray}`}>
      {children}
    </span>
  );
};

const SectionHead = ({ icon, title, accent }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white`} style={{ background: accent }}>
      {icon}
    </div>
    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{title}</span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const KV = ({ label, value, mono, right }) => (
  <div className={right ? "text-right" : ""}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className={`text-[13px] font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
  </div>
);

const InfoStrip = ({ rows }) => (
  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
    {rows.map(([label, value, mono], i) => (
      <div key={i} className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        <span className={`text-[12px] font-semibold text-slate-700 ${mono ? "font-mono text-slate-500" : ""}`}>{value || "—"}</span>
      </div>
    ))}
  </div>
);

const StatTile = ({ label, value, sub }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 text-center shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
  </div>
);

const Avatar = ({ initials, accent }) => (
  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0" style={{ background: accent }}>
    {initials}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL BOOKING MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const HotelBookingModal = ({ booking: rawProp, onClose }) => {
  const raw = rawProp || DUMMY_HOTEL;
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
  const ac = C.hotel.accent;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="px-6 py-5 text-white flex justify-between items-center" style={{ background: C.hotel.bg }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
              <FaHotel size={18} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Hotel Booking Detail</h2>
              <p className="text-xs font-mono mt-0.5 opacity-60">{raw.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
            <FiX size={18} />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 flex-wrap">
            <ExecBadge status={raw.executionStatus} />
            <Pill color="teal">{raw.requestStatus?.replace(/_/g, " ")}</Pill>
            {amendment.status && amendment.status !== "not_requested" && (
              <Pill color="amber">Amendment: {amendment.status?.replace(/_/g, " ")}</Pill>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Submitted {fmtDT(raw.createdAt)}</span>
        </div>

        <div className="p-6 space-y-7">

          {/* Hotel Info */}
          <div>
            <SectionHead icon={<FiHome size={11} />} title="Hotel Information" accent={ac} />
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-2xl font-black text-slate-900 leading-tight">{hotel.hotelName}</p>
                  {hotel.starRating > 0 && (
                    <p className="text-amber-400 text-sm mt-1">{"★".repeat(hotel.starRating)}</p>
                  )}
                  <p className="text-[12px] text-slate-500 mt-2 flex items-start gap-1.5">
                    <FiMapPin className="mt-0.5 shrink-0 text-slate-400" size={11} />
                    {hotel.address}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <Pill color="teal">{rawRoom?.Name?.[0] || "Room"}</Pill>
                    <Pill color="blue"><FiCoffee size={9} /> {room.mealType}</Pill>
                    {room.isRefundable
                      ? <Pill color="green"><FiCheckCircle size={9} /> Refundable</Pill>
                      : <Pill color="red">Non-Refundable</Pill>}
                    {promos.map((p, i) => <Pill key={i} color="amber"><FiTag size={9} /> {p}</Pill>)}
                    {!room.withTransfers && <Pill color="gray">No Transfers</Pill>}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{hotel.hotelCode}</span>
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div>
            <SectionHead icon={<FiCalendar size={11} />} title="Stay Details" accent={ac} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <StatTile label="Check-In" value={fmt(raw.hotelRequest?.checkInDate)} sub={weekday(raw.hotelRequest?.checkInDate)} />
              <StatTile label="Check-Out" value={fmt(raw.hotelRequest?.checkOutDate)} sub={weekday(raw.hotelRequest?.checkOutDate)} />
              <StatTile label="Nights" value={price.nights || snap.nights || "—"} />
              <StatTile label="Rooms" value={raw.hotelRequest?.noOfRooms} />
            </div>
            {roomGuests.map((rg, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-6 text-sm shadow-sm">
                <KV label={`Room ${i + 1} Guests`} value={`${rg.noOfAdults} Adult${rg.noOfAdults !== 1 ? "s" : ""}${rg.noOfChild > 0 ? `, ${rg.noOfChild} Child` : ""}`} />
                <KV label="Nationality" value={raw.hotelRequest?.guestNationality} />
                <KV label="Currency" value={raw.hotelRequest?.preferredCurrency} />
              </div>
            ))}
          </div>

          {/* Room + Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionHead icon={<FiKey size={11} />} title="Room Details" accent={ac} />
              <InfoStrip rows={[
                ["Room Name", rawRoom?.Name?.[0]],
                ["Meal Type", rawRoom?.MealType],
                ["Refundable", room.isRefundable ? "Yes" : "No"],
                ["Transfers", room.withTransfers ? "Yes" : "No"],
                ["Total Fare", `${room.currency} ${room.totalFare?.toLocaleString()}`],
                ["Tax", `${room.currency} ${room.totalTax?.toLocaleString()}`],
                ["Base Fare", `${room.currency} ${baseFare?.toFixed(2)}`],
              ]} />
            </div>
            <div>
              <SectionHead icon={<FiDollarSign size={11} />} title="Pricing Summary" accent={ac} />
              <div className="rounded-2xl p-5 text-white" style={{ background: C.hotel.bg }}>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Total (Incl. Tax)</p>
                <p className="text-3xl font-black mt-1">{pricing.currency} {pricing.totalAmount?.toLocaleString()}</p>
                <p className="text-[10px] opacity-40 mt-1">Captured: {fmtDT(pricing.capturedAt)}</p>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div><p className="text-[10px] uppercase opacity-50">Base</p><p className="font-bold text-sm mt-0.5">{pricing.currency} {baseFare?.toFixed(2)}</p></div>
                  <div><p className="text-[10px] uppercase opacity-50">Tax</p><p className="font-bold text-sm mt-0.5">{pricing.currency} {room.totalTax}</p></div>
                  <div><p className="text-[10px] uppercase opacity-50">Per Night</p><p className="font-bold text-sm mt-0.5">{pricing.currency} {price.perNight?.toFixed(2)}</p></div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day Rates</p>
                {dayRates.map((d, i) => (
                  <div key={i} className="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
                    <span className="text-[12px] text-slate-500 font-medium">Night {i + 1}</span>
                    <span className="text-[13px] font-black text-slate-800">{room.currency} {d.BasePrice?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inclusions */}
          {room.inclusion && (
            <div>
              <SectionHead icon={<FiCheckCircle size={11} />} title="Inclusions" accent={ac} />
              <div className="flex flex-wrap gap-2">
                {room.inclusion.split(",").map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-xl flex items-center gap-1.5 shadow-sm">
                    <FiCheckCircle size={10} className="text-teal-500" /> {item.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Policy */}
          <div>
            <SectionHead icon={<FiShield size={11} />} title="Cancellation Policy" accent={ac} />
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["From Date", "Charge Type", "Penalty", "Status"].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {policies.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{p.FromDate}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-600">{p.ChargeType}</td>
                      <td className="px-4 py-3 text-right font-black">
                        {p.CancellationCharge === 0
                          ? <span className="text-teal-600">FREE</span>
                          : <span className="text-red-600">{p.ChargeType === "Percentage" ? `${p.CancellationCharge}%` : `₹${Number(p.CancellationCharge).toFixed(2)}`}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.CancellationCharge === 0
                          ? <Pill color="green">No Charge</Pill>
                          : <Pill color="red">Charged</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Travellers */}
          <div>
            <SectionHead icon={<FiUser size={11} />} title={`Travellers (${travelers.length})`} accent={ac} />
            <div className="space-y-3">
              {travelers.map((pax, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={`${pax.firstName?.[0]}${pax.lastName?.[0]}`} accent={ac} />
                      <div>
                        <p className="font-black text-slate-900">{pax.title} {pax.firstName} {pax.lastName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{pax.paxType} passenger</p>
                      </div>
                    </div>
                    {pax.isLeadPassenger && <Pill color="blue">Lead Traveller</Pill>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    {[
                      [<FiUser size={10} />, "Gender", pax.gender],
                      [<FiCalendar size={10} />, "Date of Birth", fmt(pax.dob)],
                      [<FiInfo size={10} />, "Age", `${pax.age} years`],
                      [<FiGlobe size={10} />, "Nationality", pax.nationality],
                      [<FiMail size={10} />, "Email", pax.email],
                      [<FiPhone size={10} />, "Phone", `+${pax.phoneWithCode}`],
                    ].map(([icon, label, value], j) => (
                      <div key={j}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">{icon} {label}</p>
                        <p className="text-[12px] font-semibold text-slate-700">{value || "—"}</p>
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
              <SectionHead icon={<FiCheckCircle size={11} />} title="Booking Confirmation" accent={ac} />
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                <KV label="Confirmation No" value={bookRes.providerResponse?.BookResult?.ConfirmationNo || bookRes.hotelBookingId} mono />
                <KV label="Booking ID" value={bookRes.hotelBookingId} mono />
                {bookRes.providerResponse?.BookResult?.InvoiceNumber && (
                  <KV label="Invoice No" value={bookRes.providerResponse.BookResult.InvoiceNumber} mono />
                )}
              </div>
            </div>
          )}

          {/* Requester + Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionHead icon={<FiUser size={11} />} title="Requested By" accent={ac} />
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <Avatar initials={`${user.name?.firstName?.[0]}${user.name?.lastName?.[0]}`} accent={ac} />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{user.name?.firstName} {user.name?.lastName}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><FiMail size={10} /> {user.email}</p>
                </div>
                {approver._id && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Approved By</p>
                    <p className="text-[12px] font-semibold text-slate-700">{approver.name?.firstName} {approver.name?.lastName}</p>
                    <p className="text-[10px] text-slate-400">{fmtDT(raw.approvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionHead icon={<FiTag size={11} />} title="Booking Meta" accent={ac} />
              <InfoStrip rows={[
                ["Booking ID", raw._id, true],
                ["Corporate ID", raw.corporateId, true],
                ["Execution Status", raw.executionStatus?.replace(/_/g, " ")],
                ["Amendment Status", amendment.status?.replace(/_/g, " ")],
                ["Updated At", fmtDT(raw.updatedAt)],
              ]} />
            </div>
          </div>

          {/* Purpose */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Purpose of Travel</p>
            <p className="text-[13px] text-amber-900 italic">"{raw.purposeOfTravel}"</p>
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div>
              <SectionHead icon={<FiHome size={11} />} title={`Hotel Images (${images.length})`} accent={ac} />
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {images.slice(0, 8).map((url, i) => (
                  <img key={i} src={url} alt={`Hotel ${i + 1}`}
                    className="h-28 w-44 object-cover rounded-xl border border-slate-200 shrink-0 shadow-sm"
                    onError={(e) => { e.target.style.display = "none"; }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
          <p className="text-[11px] text-slate-400 font-mono">Ref: <span className="font-bold text-slate-600">{raw.bookingReference}</span></p>
          <button onClick={onClose} className="px-5 py-2.5 text-white text-[12px] font-bold rounded-xl transition-all hover:opacity-90" style={{ background: C.hotel.bg }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT BOOKING MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const FlightBookingModal = ({ booking: rawProp, onClose }) => {
  const raw = rawProp || DUMMY_FLIGHT;
  if (!raw) return null;

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
  const ac = C.flight.accent;

  const miniFareRules = (fareSnap.miniFareRules?.[0] || fareSnap.miniFareRules || []).flat().filter(Boolean);
  const flightItin = bookRes.providerResponse?.Response?.Response?.FlightItinerary || bookRes.providerResponse?.FlightItinerary || {};
  const pnr = bookRes.pnr || flightItin?.PNR;
  const invoices = flightItin?.Invoice || [];
  const passengerInfo = flightItin?.Passenger || [];

  const getCity = (seg, side) => seg?.[side]?.city || seg?.[side]?.airportCode || "—";

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="px-6 py-5 text-white flex justify-between items-center" style={{ background: C.flight.bg }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
              <FaPlane size={18} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Flight Booking Detail</h2>
              <p className="text-xs font-mono mt-0.5 opacity-60">{raw.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
            <FiX size={18} />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 flex-wrap">
            <ExecBadge status={raw.executionStatus} />
            <Pill color="blue">{raw.requestStatus?.replace(/_/g, " ")}</Pill>
            {pnr && <Pill color="sky">PNR: {pnr}</Pill>}
            {amendment.status && amendment.status !== "not_requested" && (
              <Pill color="amber">Amendment: {amendment.status?.replace(/_/g, " ")}</Pill>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Submitted {fmtDT(raw.createdAt)}</span>
        </div>

        <div className="p-6 space-y-7">

          {/* Route Summary */}
          {segments.length > 0 && (
            <div>
              <SectionHead icon={<FiMapPin size={11} />} title="Route Summary" accent={ac} />
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="text-center min-w-20">
                  <p className="text-3xl font-black text-slate-900">{segments[0]?.origin?.airportCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{getCity(segments[0], "origin")}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">{fmtTime(segments[0]?.departureDateTime)}</p>
                  <p className="text-[10px] text-slate-400">{fmt(segments[0]?.departureDateTime)}</p>
                  {segments[0]?.origin?.terminal && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-1 inline-block">T{segments[0].origin.terminal}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 justify-center">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="flex flex-col items-center gap-1 px-2">
                    <FaPlane size={14} style={{ color: ac }} />
                    <span className="text-[10px] text-slate-400 font-medium">{snap.airline}</span>
                    <span className="text-[10px] text-slate-400">{snap.cabinClass}</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="text-center min-w-20">
                  <p className="text-3xl font-black text-slate-900">{segments[segments.length - 1]?.destination?.airportCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{getCity(segments[segments.length - 1], "destination")}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">{fmtTime(segments[segments.length - 1]?.arrivalDateTime)}</p>
                  <p className="text-[10px] text-slate-400">{fmt(segments[segments.length - 1]?.arrivalDateTime)}</p>
                  {segments[segments.length - 1]?.destination?.terminal && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-1 inline-block">T{segments[segments.length - 1].destination.terminal}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Segments */}
          {segments.length > 0 && (
            <div>
              <SectionHead icon={<FaPlane size={11} />} title={`Segments (${segments.length})`} accent={ac} />
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-black text-slate-900">{seg.airlineCode} {seg.flightNumber}</span>
                        <span className="text-[12px] text-slate-500">{seg.airlineName}</span>
                        <Pill color="sky">{seg.aircraft}</Pill>
                      </div>
                      <div className="flex gap-1.5">
                        <Pill color="teal">Fare: {seg.fareClass}</Pill>
                        {seg.cabinClass === 2 && <Pill color="blue">Economy</Pill>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KV label="From" value={`${getCity(seg, "origin")} (${seg.origin?.airportCode})`} />
                      <KV label="To" value={`${getCity(seg, "destination")} (${seg.destination?.airportCode})`} />
                      <KV label="Departure" value={fmtDT(seg.departureDateTime)} />
                      <KV label="Arrival" value={fmtDT(seg.arrivalDateTime)} />
                      <KV label="Duration" value={`${Math.floor(seg.durationMinutes / 60)}h ${seg.durationMinutes % 60}m`} />
                      <KV label="Stop Over" value={seg.stopOver ? "Yes" : "Non-Stop"} />
                      <KV label="Check-in Bag" value={seg.baggage?.checkIn} />
                      <KV label="Cabin Bag" value={seg.baggage?.cabin} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div>
            <SectionHead icon={<FiDollarSign size={11} />} title="Fare Summary" accent={ac} />
            <div className="rounded-2xl p-5 text-white mb-3" style={{ background: C.flight.bg }}>
              <div className="flex flex-wrap justify-between items-center gap-6">
                <div>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Total Amount</p>
                  <p className="text-3xl font-black mt-1">{pricing.currency} {pricing.totalAmount?.toLocaleString()}</p>
                  <p className="text-[10px] opacity-40 mt-1">Captured: {fmtDT(pricing.capturedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-5">
                  {[
                    ["Base Fare", `${fareSnap.currency || "INR"} ${fareSnap.baseFare?.toLocaleString() || "—"}`],
                    ["Tax", `${fareSnap.currency || "INR"} ${fareSnap.tax?.toLocaleString() || "—"}`],
                    ["Published", `${fareSnap.currency || "INR"} ${fareSnap.publishedFare?.toLocaleString() || "—"}`],
                    ["Offered", `${fareSnap.currency || "INR"} ${fareSnap.offeredFare?.toLocaleString() || "—"}`],
                  ].map(([l, v], i) => (
                    <div key={i}><p className="text-[10px] uppercase opacity-50 font-bold">{l}</p><p className="font-bold text-sm mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Fare Type" value={fareSnap.fareType || "—"} />
              <StatTile label="Refundable" value={fareSnap.refundable ? "Yes" : "No"} />
              <StatTile label="Travel Date" value={fmt(snap.travelDate)} />
              <StatTile label="Last Ticket" value={fareSnap.lastTicketDate ? fmt(fareSnap.lastTicketDate) : "—"} />
            </div>
          </div>

          {/* Fare Rules */}
          {miniFareRules.length > 0 && (
            <div>
              <SectionHead icon={<FiShield size={11} />} title="Fare Rules (Change / Cancel)" accent={ac} />
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Type", "Journey", "Window", "Details"].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {miniFareRules.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Pill color={r.Type === "Cancellation" ? "red" : "blue"}>{r.Type}</Pill>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">{r.JourneyPoints}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-500">{r.From != null && r.Unit ? `${r.From}–${r.To || "∞"} ${r.Unit}` : "Any time"}</td>
                        <td className="px-4 py-3 text-right font-bold text-[12px] text-slate-800">{r.Details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SSR */}
          {((ssrSnap.seats?.length || 0) + (ssrSnap.meals?.length || 0)) > 0 && (
            <div>
              <SectionHead icon={<FiTag size={11} />} title="SSR — Seats / Meals / Baggage" accent={ac} />
              <div className="grid md:grid-cols-3 gap-3">
                {ssrSnap.seats?.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FiPackage size={10} /> Seats</p>
                    {ssrSnap.seats.map((s, i) => (
                      <p key={i} className="text-[12px] font-semibold text-slate-700 mb-1">Seat {s.seatNo} · Seg {s.segmentIndex + 1} · ₹{s.price}</p>
                    ))}
                  </div>
                )}
                {ssrSnap.meals?.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FiCoffee size={10} /> Meals</p>
                    {ssrSnap.meals.map((m, i) => (
                      <p key={i} className="text-[12px] font-semibold text-slate-700 mb-1">{m.code} · Seg {m.segmentIndex + 1} · ₹{m.price}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Travellers */}
          <div>
            <SectionHead icon={<FiUser size={11} />} title={`Travellers (${travelers.length})`} accent={ac} />
            <div className="space-y-3">
              {travelers.map((pax, i) => {
                const provPax = passengerInfo.find((p) => p.IsLeadPax === pax.isLeadPassenger);
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={`${(pax.firstName || "?")[0]}${(pax.lastName || "?")[0]}`} accent={ac} />
                        <div>
                          <p className="font-black text-slate-900">{pax.title} {pax.firstName} {pax.lastName}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{pax.isLeadPassenger ? "Lead Passenger" : "Passenger"}</p>
                        </div>
                      </div>
                      {pax.isLeadPassenger && <Pill color="blue">Lead</Pill>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                      <KV label="Gender" value={pax.gender} />
                      <KV label="DOB" value={fmt(pax.dateOfBirth || pax.dob)} />
                      <KV label="Nationality" value={pax.nationality} />
                      <KV label="Email" value={pax.email} />
                      <KV label="Phone" value={`+${pax.phoneWithCode}`} />
                      {pax.passportNumber && <KV label="Passport" value={pax.passportNumber} mono />}
                    </div>
                    {provPax?.Ticket && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6">
                        <KV label="Ticket No" value={provPax.Ticket.TicketNumber} mono />
                        <KV label="Status" value={provPax.Ticket.Status} />
                        <KV label="Issue Date" value={fmt(provPax.Ticket.IssueDate)} />
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
              <SectionHead icon={<FiCheckCircle size={11} />} title="Booking Result" accent={ac} />
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                {pnr && <KV label="PNR" value={pnr} mono />}
                {flightItin.TBOConfNo && <KV label="TBO Conf No" value={flightItin.TBOConfNo} mono />}
                {flightItin.BookingId && <KV label="Booking ID" value={flightItin.BookingId} mono />}
                {invoices.map((inv, i) => (
                  <React.Fragment key={i}>
                    <KV label="Invoice No" value={inv.InvoiceNo} mono />
                    <KV label="Invoice Amount" value={`₹${inv.InvoiceAmount?.toLocaleString()}`} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Amendment History */}
          {amendHist.length > 0 && (
            <div>
              <SectionHead icon={<FiInfo size={11} />} title={`Amendment History (${amendHist.length})`} accent={ac} />
              <div className="space-y-2">
                {amendHist.map((ah, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-start gap-4">
                    <div>
                      <Pill color="amber">{ah.type?.replace(/_/g, " ")}</Pill>
                      <p className="text-[12px] text-slate-600 mt-1.5 font-semibold capitalize">{ah.status?.replace(/_/g, " ")}</p>
                      {ah.changeRequestId && <p className="text-[10px] font-mono text-slate-400 mt-0.5">CR ID: {ah.changeRequestId}</p>}
                    </div>
                    <p className="text-[11px] text-slate-400">{fmtDT(ah.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requester + Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SectionHead icon={<FiUser size={11} />} title="Requested By" accent={ac} />
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <Avatar initials={`${user.name?.firstName?.[0]}${user.name?.lastName?.[0]}`} accent={ac} />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{user.name?.firstName} {user.name?.lastName}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><FiMail size={10} /> {user.email}</p>
                </div>
                {approver._id && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Approved By</p>
                    <p className="text-[12px] font-semibold text-slate-700">{approver.name?.firstName} {approver.name?.lastName}</p>
                    <p className="text-[10px] text-slate-400">{fmtDT(raw.approvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionHead icon={<FiTag size={11} />} title="Booking Meta" accent={ac} />
              <InfoStrip rows={[
                ["Booking ID", raw._id, true],
                ["Corporate ID", raw.corporateId, true],
                ["Execution Status", raw.executionStatus?.replace(/_/g, " ")],
                ["Trace ID", raw.flightRequest?.traceId?.slice(0, 26) + "…", true],
                ["Updated At", fmtDT(raw.updatedAt)],
              ]} />
            </div>
          </div>

          {/* Purpose */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Purpose of Travel</p>
            <p className="text-[13px] text-amber-900 italic">"{raw.purposeOfTravel}"</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
          <p className="text-[11px] text-slate-400 font-mono">Ref: <span className="font-bold text-slate-600">{raw.bookingReference}</span></p>
          <button onClick={onClose} className="px-5 py-2.5 text-white text-[12px] font-bold rounded-xl transition-all hover:opacity-90" style={{ background: C.flight.bg }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DEMO RUNNER — preview both modals
// ─────────────────────────────────────────────────────────────────────────────
export default function ModalDemo() {
  const [open, setOpen] = useState(null); // "flight" | "hotel" | null

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4 font-sans p-8">
      <h1 className="text-2xl font-black text-slate-800 tracking-tight">Booking Detail Modals</h1>
      <p className="text-sm text-slate-500 mb-4">Click a button to preview each modal with dummy data</p>
      <div className="flex gap-3">
        <button
          onClick={() => setOpen("flight")}
          className="flex items-center gap-2 px-6 py-3 text-white font-bold text-sm rounded-xl shadow-lg hover:opacity-90 transition-all"
          style={{ background: C.flight.bg }}
        >
          <FaPlane size={14} /> Preview Flight Modal
        </button>
        <button
          onClick={() => setOpen("hotel")}
          className="flex items-center gap-2 px-6 py-3 text-white font-bold text-sm rounded-xl shadow-lg hover:opacity-90 transition-all"
          style={{ background: C.hotel.bg }}
        >
          <FaHotel size={14} /> Preview Hotel Modal
        </button>
      </div>

      {open === "flight" && <FlightBookingModal onClose={() => setOpen(null)} />}
      {open === "hotel" && <HotelBookingModal onClose={() => setOpen(null)} />}
    </div>
  );
}