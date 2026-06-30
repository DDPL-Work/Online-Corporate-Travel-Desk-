import React, { useEffect } from "react";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  FiX,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiHash,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiCreditCard,
  FiBriefcase,
} from "react-icons/fi";

// ── Shared Utilities ──────────────────────────────────────────────────────────

const statusStyles = {
  Confirmed: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    Icon: FiCheckCircle,
  },
  voucher_generated: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    Icon: FiCheckCircle,
  },
  Pending: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    Icon: FiClock,
  },
  Cancelled: {
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    dot: "bg-red-500",
    Icon: FiXCircle,
  },
};

const StatusBadge = ({ status }) => {
  const style = statusStyles[status] || statusStyles.Pending;
  const Icon = style.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
};

const DetailRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={13} className="text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
        {label}
      </p>
      <p
        className={`text-[13px] text-slate-800 break-all ${mono ? "font-mono" : "font-semibold"}`}
      >
        {value ?? "—"}
      </p>
    </div>
  </div>
);

const SectionHeader = ({ title }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 mt-4 first:mt-0">
    {title}
  </p>
);

// Overlay + close-on-backdrop
const ModalOverlay = ({ onClose, children }) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
};

// ── FLIGHT BOOKING MODAL ──────────────────────────────────────────────────────

export function FlightBookingModal({ booking: b, onClose }) {
  if (!b) return null;

  const fmt = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: "modalIn 0.2s ease" }}
      >
        {/* ── Header ── */}
        <div className="bg-linear-to-r from-[#0A4D68] to-[#0e6688] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FaPlane size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-[15px] tracking-tight truncate">
              Flight Booking Details
            </h2>
            <p className="text-blue-200 text-[11px] font-mono mt-0.5 truncate">
              #{b._id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status} />
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors ml-1"
            >
              <FiX size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Route Banner ── */}
        {(b.origin || b.destination) && (
          <div className="bg-[#0A4D68]/05 border-b border-slate-100 px-5 py-3 flex items-center justify-center gap-3">
            <span className="font-black text-lg text-[#0A4D68]">
              {b.origin ?? "—"}
            </span>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="h-px w-8 bg-slate-300 block" />
              <FaPlane size={12} className="text-[#0A4D68] rotate-0" />
              <span className="h-px w-8 bg-slate-300 block" />
            </div>
            <span className="font-black text-lg text-[#0A4D68]">
              {b.destination ?? "—"}
            </span>
          </div>
        )}

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <SectionHeader title="Traveller Information" />
          <DetailRow icon={FiUser} label="Traveller Name" value={b.travellerName} />
          <DetailRow icon={FiBriefcase} label="Employee ID" value={b.employeeId} mono />

          <SectionHeader title="Flight Details" />
          <DetailRow icon={FaPlane} label="Airline" value={b.airline} />
          <DetailRow icon={FiHash} label="Flight Number" value={b.flightNo} mono />
          <DetailRow icon={FiMapPin} label="Origin" value={b.origin} />
          <DetailRow icon={FiMapPin} label="Destination" value={b.destination} />
          <DetailRow icon={FiCalendar} label="Departure Date" value={fmt(b.departureDate)} />
          <DetailRow icon={FiCalendar} label="Arrival Date" value={fmt(b.arrivalDate)} />
          <DetailRow icon={FiBriefcase} label="Class" value={b.class} />

          <SectionHeader title="Booking Information" />
          <DetailRow icon={FiHash} label="PNR" value={b.pnr} mono />
          <DetailRow icon={FiHash} label="Provider Booking ID" value={b.providerBookingId} mono />
          <DetailRow icon={FiCalendar} label="Booked On" value={fmt(b.bookedDate)} />
          <DetailRow icon={FiBriefcase} label="Corporate" value={b.corporate} />
          <DetailRow icon={FiCreditCard} label="Payment Mode" value={b.paymentMode} />

          <SectionHeader title="Amount" />
          <div className="bg-[#0A4D68]/05 rounded-xl p-4 flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-[#0A4D68]">
              <FiDollarSign size={16} />
              <span className="text-[13px] font-bold">Total Amount</span>
            </div>
            <span className="text-xl font-black text-[#0A4D68]">
              ₹{b.amount?.toLocaleString() ?? "—"}
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </ModalOverlay>
  );
}

// ── HOTEL BOOKING MODAL ───────────────────────────────────────────────────────

export function HotelBookingModal({ booking: b, onClose }) {
  if (!b) return null;

  const fmt = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: "modalIn 0.2s ease" }}
      >
        {/* ── Header ── */}
        <div className="bg-linear-to-r from-[#088395] to-[#0aa3b8] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FaHotel size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-[15px] tracking-tight truncate">
              Hotel Booking Details
            </h2>
            <p className="text-teal-100 text-[11px] font-mono mt-0.5 truncate">
              #{b._id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status} />
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors ml-1"
            >
              <FiX size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Stay Banner ── */}
        {(b.checkIn || b.checkOut) && (
          <div className="bg-[#088395]/05 border-b border-slate-100 px-5 py-3 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Check-In
              </p>
              <p className="font-black text-[#088395] text-base">{fmt(b.checkIn)}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="h-px w-12 bg-slate-300 block" />
              <p className="text-[10px] text-slate-400 font-semibold">
                {b.nights ? `${b.nights} Night${b.nights > 1 ? "s" : ""}` : ""}
              </p>
              <span className="h-px w-12 bg-slate-300 block" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Check-Out
              </p>
              <p className="font-black text-[#088395] text-base">{fmt(b.checkOut)}</p>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <SectionHeader title="Guest Information" />
          <DetailRow icon={FiUser} label="Guest Name" value={b.guestName} />
          <DetailRow icon={FiBriefcase} label="Employee ID" value={b.employeeId} mono />

          <SectionHeader title="Hotel Details" />
          <DetailRow icon={FaHotel} label="Hotel Name" value={b.hotelName} />
          <DetailRow icon={FiMapPin} label="City" value={b.city} />
          <DetailRow icon={FiBriefcase} label="Room Type" value={b.roomType} />
          <DetailRow icon={FiCalendar} label="Check-In" value={fmt(b.checkIn)} />
          <DetailRow icon={FiCalendar} label="Check-Out" value={fmt(b.checkOut)} />
          {b.nights && (
            <DetailRow icon={FiClock} label="Duration" value={`${b.nights} Night${b.nights > 1 ? "s" : ""}`} />
          )}

          <SectionHeader title="Booking Information" />
          <DetailRow icon={FiHash} label="Invoice No." value={b.invoiceNo} mono />
          <DetailRow icon={FiHash} label="Provider Booking ID" value={b.providerBookingId} mono />
          <DetailRow icon={FiCalendar} label="Booked On" value={fmt(b.bookedDate)} />
          <DetailRow icon={FiBriefcase} label="Corporate" value={b.corporate} />
          <DetailRow icon={FiCreditCard} label="Payment Mode" value={b.paymentMode} />

          <SectionHeader title="Amount" />
          <div className="bg-[#088395]/05 rounded-xl p-4 flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-[#088395]">
              <FiDollarSign size={16} />
              <span className="text-[13px] font-bold">Total Amount</span>
            </div>
            <span className="text-xl font-black text-[#088395]">
              ₹{b.amount?.toLocaleString() ?? "—"}
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </ModalOverlay>
  );
}