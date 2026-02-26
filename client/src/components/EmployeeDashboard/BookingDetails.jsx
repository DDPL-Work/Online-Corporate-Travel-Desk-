import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
  FiRefreshCw,
  FiPackage,
  FiMapPin,
} from "react-icons/fi";
import {
  downloadTicketPdf,
  fetchMyBookingById,
} from "../../Redux/Actions/booking.thunks";
import {
  formatDate,
  formatTime,
  formatDuration,
  formatDateWithYear,
  getCabinClassLabel,
  airlineLogo,
  airlineThemes,
  FLIGHT_STATUS_MAP,
} from "../../utils/formatter";

/* ─────────────────────────────────────────────────────────────── */
/*  Shared primitives                                              */
/* ─────────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const map = {
    Confirmed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    Pending: "bg-amber-400/20   text-amber-300   ring-1 ring-amber-400/30",
    Cancelled: "bg-red-400/20     text-red-300     ring-1 ring-red-400/30",
  };
  const dot = {
    Confirmed: "bg-emerald-400",
    Pending: "bg-amber-400",
    Cancelled: "bg-red-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] || map.Confirmed}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dot[status] || dot.Confirmed}`}
      />
      {status}
    </span>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-teal-600" : "text-slate-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

function BentoCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="bg-cyan-50 rounded-lg p-1.5 flex items-center justify-center">
        <Icon size={13} className="text-teal-600" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Meta chip (used inside flight card footer)                     */
/* ─────────────────────────────────────────────────────────────── */
function MetaChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.07] rounded-xl px-3 py-2.5 border border-white/10">
      <Icon size={13} className="text-white/50 shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-white leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Dashed airport connector                                       */
/* ─────────────────────────────────────────────────────────────── */
function RouteConnector({ duration }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
        {duration}
      </span>
      <div className="flex items-center gap-0 w-full">
        {/* left dot */}
        <span className="w-2 h-2 rounded-full border-2 border-white/30 shrink-0" />
        {/* dashed line with plane */}
        <div className="flex-1 relative flex items-center">
          <div className="w-full border-t border-dashed border-white/20" />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-[55%] text-sm select-none">
            ✈
          </span>
        </div>
        {/* right dot */}
        <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
      </div>
      <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">
        Non-stop
      </span>
    </div>
  );
}
function FlightCard({
  flight,
  pnrsByJourney,
  paymentSuccessful,
  downloading,
  onDownload,
  index,
  total,
  showDownloadPerSegment,
}) {
  const pnr =
    flight.journeyType === "return"
      ? pnrsByJourney.return
      : pnrsByJourney.onward;

  const statusLabel =
    FLIGHT_STATUS_MAP?.[flight?.FlightStatus || "Confirmed"]?.label ||
    "Confirmed";

  const journeyKey = flight.journeyType || "onward";
  const isDownloading = downloading === journeyKey;
  const isMulti = total > 1;

  const theme = airlineThemes?.[flight?.airlineCode] || {
    primary: "#0A2540",
    secondary: "#0c3352",
  };

  const gradient = `linear-gradient(
  140deg,
  ${theme.primary} 0%,
  ${theme.secondary} 60%,
  ${theme.primary} 100%
)`;

  return (
    <div
      className=" rounded-2xl overflow-hidden shadow-2xl text-white relative"
      style={{ background: gradient }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
        }}
      />

      <div className="relative p-6 grid gap-0">
        {/* ── ROW 1: Airline + Status ─────────────────────────── */}
        <div className="flex items-center gap-3 pb-5 border-b border-white/10">
          {/* Logo */}
          {airlineLogo?.(flight?.airlineCode) ? (
            <img
              src={airlineLogo(flight.airlineCode)}
              alt=""
              className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1.5 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sm font-black shrink-0">
              {flight?.airlineCode}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{flight?.airlineName}</p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {flight?.airlineCode}&nbsp;{flight?.flightNumber}
            </p>
          </div>
          <StatusPill status={statusLabel} />
        </div>

        {/* ── ROW 2: Route — 3-column grid ────────────────────── */}
        <div className="grid grid-cols-[1fr_160px_1fr] items-center py-6 border-b border-white/10">
          {/* Origin */}
          <div className="space-y-1">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
              From
            </p>
            <p className="text-[52px] font-black tracking-tighter leading-none">
              {flight?.origin?.city}
            </p>
            <p className="text-sm text-white/70 font-medium">
              {flight?.origin?.airportCode}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-black">
                {formatTime(flight?.departureDateTime)}
              </p>
              <p className="text-xs text-white/40">
                {formatDate(flight?.departureDateTime)}
              </p>
            </div>
          </div>

          {/* Connector */}
          <RouteConnector duration={formatDuration(flight?.durationMinutes)} />

          {/* Destination */}
          <div className="text-right space-y-1">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
              To
            </p>
            <p className="text-[52px] font-black tracking-tighter leading-none">
              {flight?.destination?.city}
            </p>
            <p className="text-sm text-white/70 font-medium">
              {flight?.destination?.airportCode}
            </p>
            <div className="flex items-baseline gap-2 justify-end mt-2">
              <p className="text-2xl font-black">
                {formatTime(flight?.arrivalDateTime)}
              </p>
              <p className="text-xs text-white/40">
                {formatDate(flight?.arrivalDateTime)}
              </p>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Meta chips grid ───────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-white/10">
          <MetaChip
            icon={FiPackage}
            label="Check-in"
            value={flight?.baggage?.checkIn || "—"}
          />
          <MetaChip
            icon={FiPackage}
            label="Cabin bag"
            value={flight?.baggage?.cabin || "—"}
          />
          <MetaChip
            icon={FiMapPin}
            label="Terminal"
            value={flight?.origin?.terminal || "N/A"}
          />
        </div>

        {/* ── ROW 4: PNR + Download ────────────────────────────── */}
        {paymentSuccessful && (
          <div className="pt-4 flex items-center justify-between gap-4">
            {/* PNR block */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                Booking Reference (PNR)
              </p>
              {pnr ? (
                <p className="text-xl font-black tracking-[0.15em] font-mono text-white">
                  {pnr}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <FiRefreshCw
                    size={13}
                    className="text-white/40 animate-spin"
                  />
                  <span className="text-sm text-white/40 font-semibold">
                    Awaiting assignment…
                  </span>
                </div>
              )}
            </div>

            {/* Download button */}
            {pnr && showDownloadPerSegment && (
              <button
                onClick={() => onDownload(journeyKey)}
                disabled={isDownloading}
                className="
                  flex items-center gap-2
                  px-5 py-2.5
                  bg-white text-slate-900
                  hover:bg-slate-100
                  rounded-xl text-[13px] font-bold
                  transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer shrink-0 shadow-md
                "
              >
                <FiDownload size={14} />
                {isDownloading ? "Downloading…" : "Download Ticket"}
              </button>
            )}
          </div>
        )}

        {/* Payment not done — no PNR section */}
        {!paymentSuccessful && (
          <div className="pt-4 flex items-center gap-2 text-white/30">
            <FiAlertCircle size={14} />
            <p className="text-xs font-medium">
              Complete payment to view PNR and download ticket
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AmendmentModal({ type, booking, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold">
            {type === "cancel" && "Cancel Ticket"}
            {type === "reschedule" && "Reschedule Flight"}
            {type === "modify" && "Modify Traveller"}
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Content */}
        {type === "cancel" && (
          <CancelScreen booking={booking} onClose={onClose} />
        )}
        {type === "reschedule" && (
          <RescheduleScreen booking={booking} onClose={onClose} />
        )}
        {type === "modify" && (
          <ModifyTravellerScreen booking={booking} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
function CancelScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const refundable =
    booking.flightRequest?.fareSnapshot?.onwardFare?.IsRefundable ||
    booking.flightRequest?.fareSnapshot?.refundable;

  const totalPaid = booking.pricingSnapshot?.totalAmount || 0;

  // 🔹 Example cancellation logic (replace with backend API response later)
  const airlinePenalty = refundable ? 1500 : totalPaid;
  const serviceFee = refundable ? 300 : 0;
  const refundAmount = refundable
    ? Math.max(totalPaid - airlinePenalty - serviceFee, 0)
    : 0;

  const handleCancel = async () => {
    if (!confirm) return;
    try {
      setLoading(true);
      await dispatch(cancelBookingThunk(booking._id));
      await dispatch(fetchMyBookingById(booking._id));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {!refundable && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          This ticket is non-refundable. Cancelling will result in zero refund.
        </div>
      )}

      {refundable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-amber-800">Refund Breakdown</p>

          <div className="flex justify-between">
            <span>Total Paid</span>
            <span>₹{totalPaid}</span>
          </div>

          <div className="flex justify-between text-red-600">
            <span>Airline Cancellation Penalty</span>
            <span>- ₹{airlinePenalty}</span>
          </div>

          <div className="flex justify-between text-red-600">
            <span>Service Fee</span>
            <span>- ₹{serviceFee}</span>
          </div>

          <div className="border-t pt-2 flex justify-between font-bold text-emerald-700">
            <span>Estimated Refund</span>
            <span>₹{refundAmount}</span>
          </div>
        </div>
      )}

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-1"
        />
        I understand the cancellation policy and agree to proceed.
      </label>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg"
        >
          Close
        </button>

        <button
          onClick={handleCancel}
          disabled={!confirm || loading}
          className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? "Cancelling..." : "Confirm Cancellation"}
        </button>
      </div>
    </div>
  );

}

function RescheduleScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const [newDate, setNewDate] = useState("");

  const handleReschedule = async () => {
    await dispatch(rescheduleBookingThunk({
      bookingId: booking._id,
      newDate
    }));
    onClose();
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold">Select New Date</label>

      <input
        type="date"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2"
      />

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg"
        >
          Close
        </button>

        <button
          onClick={handleReschedule}
          className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg"
        >
          Confirm Reschedule
        </button>
      </div>
    </div>
  );
}

function ModifyTravellerScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const traveller = booking.travellers?.[0];

  const [phone, setPhone] = useState(traveller?.phoneWithCode || "");

  const handleUpdate = async () => {
    await dispatch(updateTravellerThunk({
      bookingId: booking._id,
      phone
    }));
    onClose();
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold">Update Phone</label>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2"
      />

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg"
        >
          Close
        </button>

        <button
          onClick={handleUpdate}
          className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */
export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selected: booking, loading } = useSelector((s) => s.bookings);
  const [downloading, setDownloading] = useState(null);
  const [amendmentType, setAmendmentType] = useState(null);
  // values: "cancel" | "reschedule" | "modify" | null

  const isCancelled = booking.executionStatus === "cancelled";

  useEffect(() => {
    if (id) dispatch(fetchMyBookingById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (!booking?._id || booking.executionStatus !== "ticket_pending") return;
    const iv = setInterval(
      () => dispatch(fetchMyBookingById(booking._id)),
      15000,
    );
    return () => clearInterval(iv);
  }, [booking?._id, booking?.executionStatus, dispatch]);

  /* ── Loading ── */
  if (loading || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-11 h-11 rounded-full border-[3px] border-slate-200 border-t-teal-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Loading booking details…
        </p>
      </div>
    );
  }

  /* ── Data ── */
  const flights = booking.flightRequest?.segments || [];
  const traveller = booking.travellers?.[0];
  const fare = booking.pricingSnapshot;

  const pnrsByJourney = {
    onward:
      booking.bookingResult?.onwardPNR || booking.bookingResult?.pnr || null,
    return: booking.bookingResult?.returnPNR || null,
  };

  const displayPnr =
    booking.bookingResult?.pnr ||
    (pnrsByJourney.onward && pnrsByJourney.return
      ? `${pnrsByJourney.onward} / ${pnrsByJourney.return}`
      : pnrsByJourney.onward || null);

  const paymentSuccessful = booking.payment?.status === "completed";
  const executionStatus = booking.executionStatus;

  const handleDownloadTicket = async (journeyType) => {
    if (!pnrsByJourney[journeyType]) return;
    setDownloading(journeyType);
    await dispatch(downloadTicketPdf({ bookingId: booking._id, journeyType }));
    setDownloading(null);
  };

  const fareSnapshot = booking.flightRequest?.fareSnapshot;

  // const isRoundTrip = fareSnapshot?.onwardFare && fareSnapshot?.returnFare;
  const journeyTypes = [
    ...new Set(flights.map((f) => f.journeyType || "onward")),
  ];

  const isRoundTrip =
    journeyTypes.includes("onward") && journeyTypes.includes("return");

  const isOneWay = !isRoundTrip;

  let baseFare = 0;
  let tax = 0;
  let refundable = false;

  if (isRoundTrip) {
    baseFare =
      (fareSnapshot.onwardFare?.BaseFare || 0) +
      (fareSnapshot.returnFare?.BaseFare || 0);

    tax =
      (fareSnapshot.onwardFare?.Tax || 0) + (fareSnapshot.returnFare?.Tax || 0);

    refundable =
      fareSnapshot.onwardFare?.IsRefundable ||
      fareSnapshot.returnFare?.IsRefundable;
  } else {
    baseFare = fareSnapshot?.baseFare || 0;
    tax = fareSnapshot?.tax || 0;
    refundable = fareSnapshot?.refundable || false;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ── */}
      {/* <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-[60px] px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <FiArrowLeft size={15} /> Back
        </button>
        <span className="w-px h-5 bg-slate-200" />
        <h1 className="text-[15px] font-bold text-slate-900">
          Booking Details
        </h1>

        <div className="ml-auto flex items-center gap-3">
          {executionStatus === "ticketed" && (
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-bold">
              <FiCheckCircle size={12} /> Ticket Issued
            </span>
          )}
          {executionStatus === "ticket_pending" && (
            <span className="flex items-center gap-1.5 bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs font-bold">
              <FiRefreshCw size={11} className="animate-spin" /> Issuing Ticket…
            </span>
          )}
          {displayPnr && (
            <span className="text-xs text-slate-400 font-medium">
              Ref: <strong className="text-slate-900">{displayPnr}</strong>
            </span>
          )}
        </div>
      </header> */}

      {/* ── Bento grid ── */}
      <main className="max-w-7xl mx-auto px-5 py-8 pb-24 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flight segment cards — each full width */}
        {flights.map((flight, index) => {
          const isLast = index === flights.length - 1;
          const isOdd = flights.length % 2 !== 0;

          const shouldSpanFull = flights.length === 1 || (isOdd && isLast);

          return (
            <div key={index} className={shouldSpanFull ? "md:col-span-2" : ""}>
              <FlightCard
                flight={flight}
                index={index}
                total={flights.length}
                pnrsByJourney={pnrsByJourney}
                paymentSuccessful={paymentSuccessful}
                downloading={downloading}
                onDownload={handleDownloadTicket}
                showDownloadPerSegment={isRoundTrip}
              />
            </div>
          );
        })}

        {/* Global Download Button (One-Way Only) */}
        {isOneWay && paymentSuccessful && pnrsByJourney.onward && (
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => handleDownloadTicket("onward")}
              disabled={downloading === "onward"}
              className="
        flex items-center gap-2
        px-6 py-3
        bg-teal-600 text-white
        hover:bg-teal-700
        rounded-xl text-sm font-bold
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg
      "
            >
              <FiDownload size={15} />
              {downloading === "onward" ? "Downloading…" : "Download Ticket"}
            </button>
          </div>
        )}

        {/* ── Traveller ── */}
        <BentoCard>
          <CardLabel icon={FiUser} label="Traveller" />
          <div className="mb-4">
            <p className="text-lg font-extrabold text-slate-900 leading-snug">
              {traveller?.title} {traveller?.firstName} {traveller?.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-1">{traveller?.email}</p>
          </div>
          <InfoRow label="Phone" value={traveller?.phoneWithCode} />
          <InfoRow label="Gender" value={traveller?.gender} />
          <InfoRow
            label="Date of Birth"
            value={formatDateWithYear(traveller?.dateOfBirth)}
          />
          <InfoRow label="Nationality" value={traveller?.nationality} />
        </BentoCard>

        {/* ── Fare ── */}
        <BentoCard>
          <CardLabel icon={FiCreditCard} label="Fare Summary" />

          <InfoRow label="Base Fare" value={`₹${baseFare}`} />

          <InfoRow label="Tax" value={`₹${tax}`} />

          {isRoundTrip && (
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Fare Breakdown</p>
              <div className="flex justify-between">
                <span>Onward (Base Fare + Tax)</span>
                <span>₹{Math.ceil(fareSnapshot.onwardFare.PublishedFare)}</span>
              </div>
              <div className="flex justify-between">
                <span>Return (Base Fare + Tax)</span>
                <span>₹{Math.ceil(fareSnapshot.returnFare.PublishedFare)}</span>
              </div>
            </div>
          )}

          <InfoRow label="Currency" value={fare?.currency} />
          <InfoRow
            label="Refundable"
            value={refundable ? "Yes" : "No"}
            accent={refundable}
          />
          <div className="mt-4 bg-linear-to-r from-cyan-50 to-teal-50 rounded-xl px-4 py-4 flex justify-between items-center border border-teal-100">
            <span className="text-sm text-teal-700 font-semibold">
              Total Paid Amount
            </span>
            <span className="text-2xl font-black text-slate-900">
              ₹{fare?.totalAmount}
            </span>
          </div>
        </BentoCard>

        {/* ── Payment & Status — full width ── */}
        <BentoCard className="col-span-2">
          <CardLabel icon={FiCreditCard} label="Payment & Booking Status" />
          <div className="grid grid-cols-3 gap-3">
            {/* Payment tile */}
            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${
                paymentSuccessful
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-amber-50 border-amber-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {paymentSuccessful ? (
                  <FiCheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <FiAlertCircle size={16} className="text-amber-500" />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${paymentSuccessful ? "text-emerald-600" : "text-amber-600"}`}
                >
                  Payment
                </span>
              </div>
              <p
                className={`text-lg font-black ${paymentSuccessful ? "text-emerald-800" : "text-amber-800"}`}
              >
                {paymentSuccessful ? "Successful" : "Pending"}
              </p>
            </div>

            {/* Ticket tile */}
            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${
                executionStatus === "ticketed"
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-amber-50 border-amber-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {executionStatus === "ticketed" ? (
                  <FiCheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <FiRefreshCw
                    size={16}
                    className="text-amber-500 animate-spin"
                  />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${executionStatus === "ticketed" ? "text-emerald-600" : "text-amber-600"}`}
                >
                  Ticket Status
                </span>
              </div>
              <p
                className={`text-lg font-black ${executionStatus === "ticketed" ? "text-emerald-800" : "text-amber-800"}`}
              >
                {executionStatus === "ticketed" ? "Issued" : "Issuing…"}
              </p>
              {executionStatus === "ticket_pending" && (
                <p className="text-[11px] text-amber-500">
                  Refreshes every 15s
                </p>
              )}
            </div>

            {/* Purpose tile */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <FiBriefcase size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Purpose
                </span>
              </div>
              <p className="text-lg font-black text-slate-800">
                {booking.purposeOfTravel || "—"}
              </p>
            </div>
          </div>
        </BentoCard>

        {/* ── Amendment Actions ── */}
        {paymentSuccessful && executionStatus === "ticketed" && (
          <BentoCard className="col-span-2">
            <CardLabel icon={FiRefreshCw} label="Amendment Actions" />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setAmendmentType("reschedule")}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
              >
                Reschedule Flight
              </button>

              <button
                onClick={() => setAmendmentType("modify")}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
              >
                Modify Traveller
              </button>

              <button
                onClick={() => setAmendmentType("cancel")}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition"
              >
                Cancel Ticket
              </button>
            </div>
          </BentoCard>
        )}
      </main>
      {amendmentType && (
        <AmendmentModal
          type={amendmentType}
          booking={booking}
          onClose={() => setAmendmentType(null)}
        />
      )}
    </div>
  );
}
