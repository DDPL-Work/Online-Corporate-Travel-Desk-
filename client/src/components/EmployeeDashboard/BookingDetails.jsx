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
  manualTicketNonLcc,
} from "../../Redux/Actions/booking.thunks";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  amendBooking,
  fetchChangeStatus,
} from "../../Redux/Actions/amendmentThunks";
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
import Swal from "sweetalert2";

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

function formatPaxType(paxType) {
  const map = {
    ADULT: "Adult",
    CHILD: "Child",
    INFANT: "Infant",
  };

  return map[paxType] || paxType || "Unknown";
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
  seatSelections,
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

  const segmentSeat = seatSelections?.find((s) => s.segmentIndex === index);

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

            {segmentSeat && (
              <div className="pt-4 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 border border-white/15">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">
                      Seat Selected
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {segmentSeat.seatNo}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">
                      Seat Price
                    </p>
                    <p className="text-sm font-semibold text-white">
                      ₹{segmentSeat.price}
                    </p>
                  </div>
                </div>
              </div>
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
  const [charges, setCharges] = useState(null);

  /* 🔥 STEP 1: Fetch cancellation charges */
  useEffect(() => {
    const fetchCharges = async () => {
      const res = await dispatch(fetchCancellationCharges(booking._id));

      if (res.payload) {
        setCharges(res.payload);
      }
    };

    fetchCharges();
  }, [booking._id, dispatch]);

  /* 🔥 STEP 2: Cancel + Poll status */
  const handleCancel = async () => {
    if (!confirm) return;

    try {
      setLoading(true);

      // 1️⃣ Send cancel request
      const res = await dispatch(fullCancellation({ bookingId: booking._id }));

      const changeRequestId =
        res.payload?.Response?.ChangeRequestId || res.payload?.ChangeRequestId;

      if (!changeRequestId) throw new Error("No ChangeRequestId");

      // 2️⃣ POLLING (CRITICAL)
      let status = "requested";

      while (status === "requested" || status === "in_progress") {
        await new Promise((r) => setTimeout(r, 4000));

        const statusRes = await dispatch(
          fetchChangeStatus({
            changeRequestId,
            bookingId: booking._id,
          }),
        );

        const apiStatus = statusRes.payload?.Response?.Status;

        if (apiStatus === 1) status = "completed";
        else if (apiStatus === 2) status = "in_progress";
        else status = "failed";
      }

      if (status !== "completed") {
        throw new Error("Cancellation failed");
      }

      // 3️⃣ Refresh booking
      await dispatch(fetchMyBookingById(booking._id));

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Charges UI */}
      {charges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-amber-800">Cancellation Charges</p>

          <div className="flex justify-between">
            <span>Airline Charges</span>
            <span>₹{charges?.AirlineCharge || 0}</span>
          </div>

          <div className="flex justify-between">
            <span>Service Fee</span>
            <span>₹{charges?.ServiceCharge || 0}</span>
          </div>
        </div>
      )}

      {/* Confirmation */}
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        I confirm cancellation
      </label>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">
          Close
        </button>

        <button
          onClick={handleCancel}
          disabled={!confirm || loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          {loading ? "Processing..." : "Cancel Ticket"}
        </button>
      </div>
    </div>
  );
}

function RescheduleScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const [newDate, setNewDate] = useState("");

  const handleReschedule = async () => {
    await dispatch(
      rescheduleBookingThunk({
        bookingId: booking._id,
        newDate,
      }),
    );
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

function PartialCancelModal({ booking, onClose }) {
  const dispatch = useDispatch();
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [remarks, setRemarks] = useState("User requested partial cancellation");
  const [loading, setLoading] = useState(false);

  const segments = booking?.flightRequest?.segments || [];

  const journeyTypeOf = (seg) => {
    const jt =
      (seg?.journeyType ||
        seg?.segmentType ||
        seg?.tripIndicator ||
        seg?.TripIndicator ||
        "").toString().toLowerCase();
    if (jt === "return" || jt === "2") return "return";
    return "onward";
  };

  const onwardSegments = segments.filter((s) => journeyTypeOf(s) === "onward");
  const returnSegments = segments.filter((s) => journeyTypeOf(s) === "return");

  const hasReturn = returnSegments.length > 0;

  useEffect(() => {
    if (!hasReturn) setSelectedJourney("onward");
  }, [hasReturn]);

  const sectorLabel = (segList) => {
    if (!segList.length) return "N/A";
    const first = segList[0];
    const last = segList[segList.length - 1];
    const from =
      first?.origin?.airportCode ||
      first?.origin?.code ||
      first?.Origin ||
      first?.OriginAirportCode ||
      "-";
    const to =
      last?.destination?.airportCode ||
      last?.destination?.code ||
      last?.Destination ||
      last?.DestinationAirportCode ||
      "-";
    return `${from} -> ${to}`;
  };

  const onwardLabel = sectorLabel(onwardSegments);
  const returnLabel = sectorLabel(returnSegments);

  const onwardPassengers =
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response
      ?.FlightItinerary?.Passenger || [];
  const returnPassengers =
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response
      ?.FlightItinerary?.Passenger || [];

  const passengerSource =
    selectedJourney === "return" ? returnPassengers : onwardPassengers;
  const passengerIds = passengerSource
    .map((p) => p?.Ticket?.TicketId || p?.TicketId || p?.PaxId)
    .filter(Boolean);

  const onwardBookingId =
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response
      ?.FlightItinerary?.BookingId;
  const returnBookingId =
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response
      ?.FlightItinerary?.BookingId;
  const tboBookingId =
    selectedJourney === "return"
      ? returnBookingId || onwardBookingId || booking?.bookingResult?.bookingId
      : onwardBookingId || returnBookingId || booking?.bookingResult?.bookingId;

  const buildSectors = () => {
    const pick =
      selectedJourney === "return" ? returnSegments : onwardSegments;
    return pick.map((seg) => ({
      Origin:
        seg?.origin?.airportCode ||
        seg?.Origin ||
        seg?.origin?.code ||
        seg?.originCode,
      Destination:
        seg?.destination?.airportCode ||
        seg?.Destination ||
        seg?.destination?.code ||
        seg?.destinationCode,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedJourney) return;
    if (!passengerIds.length) {
      Swal.fire({
        icon: "error",
        title: "Passenger data missing",
        text: "We could not find ticketed passengers for this booking.",
      });
      return;
    }
    const sectors = buildSectors().filter(
      (s) => s.Origin && s.Destination,
    );
    if (!sectors.length) return;
    const payload = {
      bookingId: tboBookingId || booking?._id,
      passengerIds,
      segments: sectors,
      remarks,
    };
    try {
      setLoading(true);
      const res = await dispatch(partialCancellation(payload));
      if (res.error) throw new Error(res.payload || "Partial cancellation failed");
      await dispatch(fetchMyBookingById(booking._id));
      Swal.fire({
        icon: "success",
        title: "Cancellation request submitted successfully",
        timer: 2000,
        showConfirmButton: false,
      });
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to submit cancellation",
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const disableSubmit = !selectedJourney || loading;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold">Partial Cancellation</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">
              Select Route
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="route"
                  disabled={!onwardSegments.length}
                  checked={selectedJourney === "onward"}
                  onChange={() => setSelectedJourney("onward")}
                />
                <span>Onward ({onwardLabel})</span>
              </label>
              {hasReturn && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="route"
                    checked={selectedJourney === "return"}
                    onChange={() => setSelectedJourney("return")}
                  />
                  <span>Return ({returnLabel})</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">
              Remarks (optional)
            </p>
            <textarea
              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100"
              disabled={loading}
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              disabled={disableSubmit}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModifyTravellerScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const traveller = booking.travellers?.[0];

  const [phone, setPhone] = useState(traveller?.phoneWithCode || "");

  const handleUpdate = async () => {
    await dispatch(
      updateTravellerThunk({
        bookingId: booking._id,
        phone,
      }),
    );
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

  // ── Pull the logged-in user's role from your auth slice ──────
  // Adjust the selector path to match your actual Redux store shape.
  // Common patterns:
  //   s.auth.user.role
  //   s.user.role
  //   s.auth.role
  const userRole = useSelector((s) => s.auth?.user?.role);
  const isEmployee = userRole === "employee";
  // ─────────────────────────────────────────────────────────────

  const [downloading, setDownloading] = useState(null);
  const [amendmentType, setAmendmentType] = useState(null);
  const [showPartialCancel, setShowPartialCancel] = useState(false);
  // values: "cancel" | "reschedule" | "modify" | null

  const isCancelled = booking?.executionStatus === "cancelled";

  useEffect(() => {
    if (id) dispatch(fetchMyBookingById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (
      !booking?._id ||
      !["ticket_pending", "on_hold"].includes(booking.executionStatus)
    )
      return;
    const iv = setInterval(
      () => dispatch(fetchMyBookingById(booking._id)),
      15000,
    );
    return () => clearInterval(iv);
  }, [booking?._id, booking?.executionStatus, dispatch]);

  const handleCancelBooking = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will cancel your ticket permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, cancel it!",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Cancelling...",
        text: "Please wait while we process your request",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await dispatch(fullCancellation({ bookingId: booking._id }));

      console.log("Full Cancel Response:", res);

      const changeRequestId =
        res.payload?.data?.Response?.TicketCRInfo?.[0]?.ChangeRequestId;

      let status = "requested";
      let attempts = 0;
      const maxAttempts = 12;

      while (
        (status === "requested" || status === "in_progress") &&
        attempts < maxAttempts
      ) {
        await new Promise((r) => setTimeout(r, 4000));
        attempts++;

        const statusRes = await dispatch(
          fetchChangeStatus({
            changeRequestId,
            bookingId: booking._id,
          }),
        );

        const apiStatus =
          statusRes.payload?.Response?.TicketCRInfo?.[0]?.ChangeRequestStatus;

        console.log("📊 API STATUS:", apiStatus);

        if (apiStatus === 4) {
          status = "completed";
        } else if ([1, 2, 3].includes(apiStatus)) {
          status = "in_progress";
        } else if (apiStatus === 5) {
          status = "failed";
        } else {
          console.warn("⚠️ Unknown status, retrying...");
          continue;
        }
      }

      if (status !== "completed") {
        throw new Error("Cancellation failed");
      }

      Swal.close();

      Swal.fire({
        icon: "success",
        title: "Cancelled!",
        text: "Your booking has been cancelled successfully.",
        confirmButtonText: "Go to Cancelled Bookings",
      });
      navigate("/my-cancelled-bookings");
    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: "Cancellation failed. Please try again.",
      });
    }
  };

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
  const travellers = booking.travellers || [];
  const fare = booking.pricingSnapshot;

  const isInternationalRT =
  flights.length > 1 &&
  flights.some(
    (f) =>
      f.origin?.country !== "IN" || f.destination?.country !== "IN"
  ) &&
  flights.some((f) => f.journeyType === "return");

  // const pnrsByJourney = {
  //   onward:
  //     booking.bookingResult?.onwardPNR || booking.bookingResult?.pnr || null,
  //   return: booking.bookingResult?.returnPNR || null,
  // };

  const pnrsByJourney = isInternationalRT
  ? {
      onward: booking.bookingResult?.pnr || null,
      return: booking.bookingResult?.pnr || null, // SAME PNR
    }
  : {
      onward:
        booking.bookingResult?.onwardPNR ||
        booking.bookingResult?.pnr ||
        null,
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
  const departureTime = booking?.flightRequest?.segments?.[0]?.departureDateTime;
  const isTravelPassed = departureTime && new Date() > new Date(departureTime);

  const allRules = fareSnapshot?.miniFareRules?.flat() || [];
  const cancellationPolicies = allRules.filter((r) => r.Type === "Cancellation");
  const reissuePolicies = allRules.filter((r) => r.Type === "Reissue");
  const getAmount = (str) => Number(str?.replace(/\D/g, "") || 0);

  const minCancelFee = Math.min(
    ...cancellationPolicies.map((r) => getAmount(r.Details)),
  );
  const minReissueFee = Math.min(
    ...reissuePolicies.map((r) => getAmount(r.Details)),
  );

  const getPolicyDisplay = (rule) => {
    const dep = new Date(departureTime);
    const fromHours = Number(rule.From || 0);
    const toHours = rule.To ? Number(rule.To) : null;
    const fromDate = new Date(dep - fromHours * 3600000);
    const toDate = toHours ? new Date(dep - toHours * 3600000) : null;

    if (!toDate) {
      return {
        label: `More than ${fromHours} hrs before departure`,
        range: `Before ${formatDate(fromDate)} ${formatTime(fromDate)}`,
      };
    }

    return {
      label: `Within ${toHours} hrs of departure`,
      range: `${formatDate(toDate)} → ${formatDate(fromDate)}`,
    };
  };

  const seatSelections = booking.flightRequest?.ssrSnapshot?.seats || [];
  const mealSelections = booking.flightRequest?.ssrSnapshot?.meals || [];

  const totalSeatPrice = seatSelections.reduce(
    (sum, seat) => sum + (seat?.price || 0),
    0,
  );
  const totalMealPrice = mealSelections.reduce(
    (sum, meal) => sum + (meal?.price || 0),
    0,
  );

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
      (fareSnapshot.onwardFare?.Tax || 0) +
      (fareSnapshot.returnFare?.Tax || 0);
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
                seatSelections={seatSelections}
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

        {/* ── Travellers ── */}
        <BentoCard className="md:col-span-2">
          <CardLabel icon={FiUser} label="Travellers" />

          {travellers.length === 0 ? (
            <p className="text-sm text-slate-500">No traveller details available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {travellers.map((trav, idx) => (
                <div
                  key={trav._id || idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-lg font-extrabold text-slate-900 leading-snug">
                        {trav.title} {trav.firstName} {trav.lastName}
                      </p>
                      {trav.email && (
                        <p className="text-xs text-slate-400 mt-1">{trav.email}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                      {formatPaxType(trav.paxType)}
                    </span>
                  </div>

                  {trav.phoneWithCode && (
                    <InfoRow label="Phone" value={trav.phoneWithCode} />
                  )}
                  <InfoRow label="Gender" value={trav.gender || "N/A"} />
                  <InfoRow
                    label="Date of Birth"
                    value={trav.dateOfBirth ? formatDateWithYear(trav.dateOfBirth) : "N/A"}
                  />
                  <InfoRow label="Nationality" value={trav.nationality || "N/A"} />
                  {typeof trav.linkedAdultIndex === "number" &&
                    trav.linkedAdultIndex >= 0 && (
                      <InfoRow
                        label="Linked Adult"
                        value={`Traveller ${trav.linkedAdultIndex + 1}`}
                      />
                    )}

                  {trav.isLeadPassenger && (
                    <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                      <FiCheckCircle size={12} />
                      Lead passenger
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {/* ── Fare Summary — hidden for employees ── */}
        {!isEmployee && (
          <BentoCard>
            <CardLabel icon={FiCreditCard} label="Fare Summary" />

            <InfoRow label="Base Fare" value={`₹${baseFare}`} />
            <InfoRow label="Tax" value={`₹${tax}`} />

            {totalSeatPrice > 0 && (
              <InfoRow label="Seat Charges" value={`₹${totalSeatPrice}`} />
            )}

            {totalMealPrice > 0 && (
              <InfoRow label="Meal Charges" value={`₹${totalMealPrice}`} />
            )}

            {isRoundTrip && (
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Fare Breakdown</p>
                <div className="flex justify-between">
                  <span>Onward (Base Fare + Tax)</span>
                  <span>
                    ₹{Math.ceil(fareSnapshot.onwardFare.PublishedFare)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Return (Base Fare + Tax)</span>
                  <span>
                    ₹{Math.ceil(fareSnapshot.returnFare.PublishedFare)}
                  </span>
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
        )}

        {/* ── Payment & Status — full width ── */}
        <BentoCard className="md:col-span-2">
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
                ) : executionStatus === "on_hold" ? (
                  <FiAlertCircle size={16} className="text-amber-500" />
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
                {executionStatus === "ticketed"
                  ? "Issued"
                  : executionStatus === "on_hold"
                    ? "On Hold (Manual Required)"
                    : "Issuing…"}
              </p>
              {executionStatus === "ticket_pending" && (
                <p className="text-[11px] text-amber-500">
                  Refreshes every 15s
                </p>
              )}
            </div>

            {["ticket_pending", "on_hold"].includes(executionStatus) && (
              <div className="col-span-3 mt-3 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      await dispatch(manualTicketNonLcc(booking._id));
                      Swal.fire({
                        icon: "info",
                        title: "Retrying Ticket",
                        text: "We are attempting ticket issuance again...",
                        timer: 2000,
                        showConfirmButton: false,
                      });
                    } catch (err) {
                      Swal.fire({
                        icon: "error",
                        title: "Retry Failed",
                        text: "Please try again later",
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-bold"
                >
                  <FiRefreshCw size={14} />
                  Retry Ticket
                </button>
              </div>
            )}

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

        {/* ── Cancellation Policy ── */}
        {cancellationPolicies.length > 0 && (
          <BentoCard className="md:col-span-2">
            <CardLabel icon={FiAlertCircle} label="Cancellation Policy" />
            <p className="text-xs text-slate-400 mb-3">
              Charges vary depending on how close you are to departure.
            </p>
            <div className="space-y-3">
              {cancellationPolicies.map((rule, index) => {
                const policy = getPolicyDisplay(rule);
                const amount = getAmount(rule.Details);
                const isUrgent = Number(rule.From) <= 24;
                const isCheapest = amount === minCancelFee;

                return (
                  <div
                    key={index}
                    className={`flex justify-between items-center rounded-xl px-4 py-3 border
                      ${isUrgent ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div>
                      <p className="text-xs text-slate-400 font-medium">
                        {policy.range}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        {policy.label}
                        {isCheapest && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            Cheapest
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Cancellation Fee</p>
                      <p className="text-sm font-bold text-red-600">
                        {rule.Details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* ── Reissue Policy ── */}
        {reissuePolicies.length > 0 && (
          <BentoCard className="md:col-span-2">
            <CardLabel icon={FiRefreshCw} label="Reschedule / Reissue Policy" />
            <p className="text-xs text-slate-400 mb-3">
              Charges depend on how early you reschedule.
            </p>
            <div className="space-y-3">
              {reissuePolicies.map((rule, index) => {
                const policy = getPolicyDisplay(rule);
                const amount = getAmount(rule.Details);
                const isUrgent = Number(rule.From) <= 24;
                const isCheapest = amount === minReissueFee;

                return (
                  <div
                    key={index}
                    className={`flex justify-between items-center rounded-xl px-4 py-3 border
                      ${isUrgent ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div>
                      <p className="text-xs text-slate-400 font-medium">
                        {policy.range}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        {policy.label}
                        {isCheapest && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            Cheapest
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Reissue Fee</p>
                      <p className="text-sm font-bold text-blue-600">
                        {rule.Details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* ── Amendment Actions ── */}
        {paymentSuccessful &&
          executionStatus === "ticketed" &&
          !isTravelPassed && (
            <BentoCard className="md:col-span-2">
              <CardLabel icon={FiRefreshCw} label="Amendment Actions" />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setAmendmentType("reissue")}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                >
                  Reissue Flight
                </button>
                <button
                  onClick={() => setShowPartialCancel(true)}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition"
                >
                  Partial Cancel
                </button>
                <button
                  onClick={handleCancelBooking}
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

      {showPartialCancel && (
        <PartialCancelModal
          booking={booking}
          onClose={() => setShowPartialCancel(false)}
        />
      )}
    </div>
  );
}
