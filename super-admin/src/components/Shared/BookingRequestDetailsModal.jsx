import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  amendBooking,
  fetchChangeStatus,
} from "../../Redux/Actions/corporate.related.thunks";
import { resetAmendmentState } from "../../Redux/Slice/corporate.related.slice";
import { FaHotel, FaPlane } from "react-icons/fa";
import {
  FiX,
  FiCheckCircle,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiMapPin,
  FiShield,
  FiCoffee,
  FiTag,
  FiInfo,
  FiPhone,
  FiMail,
  FiAlertCircle,
  FiPackage,
  FiHash,
  FiClock,
  FiFileText,
  FiLayers,
  FiBarChart2,
  FiRepeat,
  FiStar,
  FiTrendingUp,
  FiBriefcase,
  FiHome,
  FiKey,
} from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDT = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const inr = (n) => {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtVal = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) return val.map(fmtVal).join(", ");
  if (typeof val === "object") {
    return (
      val.corporateName ||
      val.name ||
      val.title ||
      val._id ||
      JSON.stringify(val)
    );
  }
  return String(val);
};

const paxTypeLabel = (t) =>
  ({ 1: "Adult", 2: "Child", 3: "Infant" })[t] || `Type ${t}`;

const cabinLabel = (code) =>
  ({
    0: "Economy",
    1: "First",
    2: "Economy",
    3: "Business",
    4: "Premium Economy",
  })[code] ||
  code ||
  "—";

// ─────────────────────────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({ title, icon, children, accent }) => (
  <div className="py-5 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center gap-3 mb-4">
      <span
        className="text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5"
        style={{ color: accent || "#888" }}
      >
        {icon}
        {title}
      </span>
      <span className="flex-1 h-px bg-gray-100" />
    </div>
    {children}
  </div>
);

const KV = ({ label, value, mono, icon, highlight }) => (
  <div>
    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p
      className={`text-sm font-medium break-all ${mono ? "font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded" : ""} ${highlight ? "text-emerald-700" : "text-gray-800"}`}
    >
      {fmtVal(value) || "—"}
    </p>
  </div>
);

const StatTile = ({ label, value, sub, color }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-sm font-medium mt-0.5 ${color || "text-gray-900"}`}>
      {value || "—"}
    </p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const Chip = ({ color = "gray", children, size = "sm" }) => {
  const map = {
    teal: "bg-teal-50 border-teal-100 text-teal-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    sky: "bg-sky-50 border-sky-100 text-sky-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    gray: "bg-gray-100 border-gray-200 text-gray-600",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${size === "xs" ? "text-[10px]" : "text-[11px]"} font-medium ${map[color] || map.gray}`}
    >
      {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = status.toLowerCase();
  let color = "gray";
  if (
    [
      "confirmed",
      "approved",
      "voucher",
      "ticketed",
      "active",
      "completed",
      "ok",
    ].some((k) => s.includes(k))
  )
    color = "green";
  else if (["pending", "requested", "initiated"].some((k) => s.includes(k)))
    color = "amber";
  else if (["cancel", "reject", "fail"].some((k) => s.includes(k)))
    color = "red";
  else if (s.includes("process")) color = "blue";
  return <Chip color={color}>{status.replace(/_/g, " ")}</Chip>;
};

const Avatar = ({ initials, bg = "#1e3a5f" }) => (
  <div
    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium uppercase shrink-0"
    style={{ background: bg + "22", color: bg }}
  >
    {initials || "?"}
  </div>
);

const TaxRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-500 font-mono">{label}</span>
    <span className="text-xs font-medium text-gray-700">{inr(value)}</span>
  </div>
);

const AmountRow = ({ label, value, bold }) => (
  <div
    className={`flex justify-between items-center py-1.5 ${bold ? "border-t border-gray-200 mt-1" : ""}`}
  >
    <span
      className={`text-xs ${bold ? "font-semibold text-gray-700" : "text-gray-500"}`}
    >
      {label}
    </span>
    <span
      className={`text-xs font-mono ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}
    >
      {inr(value)}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT BOOKING MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const FlightBookingModal = ({ booking: rawProp, onClose }) => {
  const dispatch = useDispatch();
  const [cancelRemarks, setCancelRemarks] = React.useState(
    "Requested by super admin",
  );
  const [reissueRemarks, setReissueRemarks] = React.useState(
    "Requested by super admin",
  );
  const [selectedPaxIds, setSelectedPaxIds] = React.useState([]);
  const [actionTab, setActionTab] = React.useState("charges");
  const [crIdInput, setCrIdInput] = React.useState("");
  const [selectedSegmentKeys, setSelectedSegmentKeys] = React.useState([]);

  const {
    cancellationCharges,
    loadingCancellationCharges,
    fullCancellationLoading,
    partialCancellationLoading,
    amendmentLoading,
    changeStatusData,
    changeStatusLoading,
  } = useSelector((state) => state.corporateRelated);

  React.useEffect(() => {
    return () => {
      dispatch(resetAmendmentState());
    };
  }, [dispatch]);

  const raw = rawProp;
  if (!raw) return null;

  const flightReq = raw.flightRequest || {};
  const segments = flightReq.segments || [];
  const fareSnap = flightReq.fareSnapshot || {};
  const ssrSnap = flightReq.ssrSnapshot || {};
  const fareQuoteResults = flightReq.fareQuote?.Results || [];
  const fareBreakdown = fareQuoteResults[0]?.FareBreakdown || [];
  const fareRules = fareQuoteResults[0]?.FareRules || [];
  const pricing = raw.pricingSnapshot || {};
  const snap = raw.bookingSnapshot || {};
  const travelers = raw.travellers || [];
  const amendment = raw.amendment || {};
  const amendHist = raw.amendmentHistory || [];
  const bookRes = raw.bookingResult || {};
  const corporateId = raw.corporateId || {};

  // Detect if this is a round-trip booking with onward/return separate responses
  const isRoundTrip = !!(bookRes.onwardPNR || bookRes.returnPNR);
  const onwardResp = bookRes.onwardResponse?.Response?.Response || {};
  const returnResp = bookRes.returnResponse?.Response?.Response || {};
  const onwardItin = onwardResp.FlightItinerary || {};
  const returnItin = returnResp.FlightItinerary || {};

  // Single booking path
  const singleResp =
    bookRes.providerResponse?.Response?.Response ||
    bookRes.providerResponse?.raw?.Response?.Response ||
    {};
  const singleItin = singleResp.FlightItinerary || {};

  const pnr = bookRes.pnr;
  const onwardPNR = bookRes.onwardPNR;
  const returnPNR = bookRes.returnPNR;

  const allInvoices = [
    ...(onwardItin.Invoice || []).map((i) => ({ ...i, leg: "Onward" })),
    ...(returnItin.Invoice || []).map((i) => ({ ...i, leg: "Return" })),
    ...(singleItin.Invoice || []),
  ];

  const allPassengers = isRoundTrip
    ? onwardItin.Passenger || []
    : singleItin.Passenger || [];

  const allReturnPassengers = returnItin.Passenger || [];

  const getCity = (seg, side) =>
    seg?.[side]?.city || seg?.[side]?.airportCode || "—";

  // Mini fare rules from fareSnapshot + booking result
  const miniFareRulesFromSnap = (fareSnap.miniFareRules || [])
    .flat()
    .filter(Boolean);
  const miniFareRulesFromResult = isRoundTrip
    ? [
        ...(onwardItin.MiniFareRules || []),
        ...(returnItin.MiniFareRules || []),
      ].filter(Boolean)
    : (singleItin.MiniFareRules || []).filter(Boolean);

  const miniFareRules = miniFareRulesFromSnap.length
    ? miniFareRulesFromSnap
    : miniFareRulesFromResult;

  // Segments from both itineraries (booking result)
  const onwardSegments = onwardItin.Segments || [];
  const returnSegments = returnItin.Segments || [];
  const singleSegments = singleItin.Segments || [];

  const correctTravelDate = segments?.[0]?.departureDateTime || snap.travelDate;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-5xl my-4 overflow-hidden border border-gray-200"
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f]">
              <FaPlane size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-medium text-gray-900">
                  Flight Booking Detail
                </h2>
                <StatusBadge status={raw.executionStatus} />
                <StatusBadge status={raw.requestStatus} />
                {pnr && <Chip color="sky">PNR: {pnr}</Chip>}
                {onwardPNR && <Chip color="sky">Onward PNR: {onwardPNR}</Chip>}
                {returnPNR && (
                  <Chip color="purple">Return PNR: {returnPNR}</Chip>
                )}
                {amendment.status && amendment.status !== "not_requested" && (
                  <Chip color="amber">
                    Amendment: {amendment.status?.replace(/_/g, " ")}
                  </Chip>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {raw.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 shrink-0"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="px-6 max-h-[78vh] overflow-y-auto">
          {/* ══ 1. BOOKING OVERVIEW ══ */}
          <Section title="Booking Overview" icon={<FiHash size={11} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                label="Booking ID"
                value={<span className="font-mono text-xs">{raw._id}</span>}
              />
              <StatTile
                label="Booking Reference"
                value={
                  <span className="font-mono text-xs">
                    {raw.bookingReference}
                  </span>
                }
              />
              <StatTile label="Booking Type" value={raw.bookingType} />
              <StatTile
                label="Execution Status"
                value={raw.executionStatus}
                color="text-emerald-700"
              />
              <StatTile
                label="Travel Date"
                value={fmt(correctTravelDate)}
                sub={snap.cabinClass}
              />
              <StatTile
                label="Return Date"
                value={snap.returnDate ? fmt(snap.returnDate) : "One-way"}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <StatTile label="Airline(s)" value={snap.airline} />
              <StatTile
                label="Sector(s)"
                value={(snap.sectors || []).join(" / ")}
              />
              <StatTile label="Destination City" value={snap.city} />
              <StatTile label="Cabin Class" value={snap.cabinClass} />
            </div>
          </Section>

          {/* ══ 2. ROUTE SUMMARY ══ */}
          {segments.length > 0 && (
            <Section title="Route Summary" icon={<FiMapPin size={11} />}>
              <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[80px]">
                    <p className="text-3xl font-bold text-gray-900">
                      {segments[0]?.origin?.airportCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getCity(segments[0], "origin")}
                    </p>
                    <p className="text-xs font-medium text-gray-700 mt-1">
                      {fmtTime(segments[0]?.departureDateTime)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {fmt(segments[0]?.departureDateTime)}
                    </p>
                    {segments[0]?.origin?.terminal && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 mt-1 inline-block">
                        T{segments[0].origin.terminal}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2 justify-center">
                    <div className="h-px flex-1 bg-gray-300" />
                    <div className="flex flex-col items-center gap-0.5 px-2">
                      <FaPlane size={14} className="text-[#1e3a5f]" />
                      <span className="text-[10px] text-gray-400">
                        {snap.airline}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {snap.cabinClass}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gray-300" />
                  </div>
                  <div className="text-center min-w-[80px]">
                    <p className="text-3xl font-bold text-gray-900">
                      {segments[segments.length - 1]?.destination?.airportCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getCity(segments[segments.length - 1], "destination")}
                    </p>
                    <p className="text-xs font-medium text-gray-700 mt-1">
                      {fmtTime(segments[segments.length - 1]?.arrivalDateTime)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {fmt(segments[segments.length - 1]?.arrivalDateTime)}
                    </p>
                    {segments[segments.length - 1]?.destination?.terminal && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 mt-1 inline-block">
                        T{segments[segments.length - 1].destination.terminal}
                      </span>
                    )}
                  </div>
                </div>
              {/* </div> */}
            </div>
          </Section>
          )}

          {/* ══ 3. FLIGHT SEGMENTS (from flightRequest) ══ */}
          {segments.length > 0 && (
            <Section
              title={`Flight Segments — Request (${segments.length})`}
              icon={<FaPlane size={11} />}
            >
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {seg.airlineCode} {seg.flightNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {seg.airlineName}
                        </span>
                        {seg.aircraft && (
                          <Chip color="sky">{seg.aircraft}</Chip>
                        )}
                        {seg.journeyType && (
                          <Chip
                            color={
                              seg.journeyType === "onward" ? "teal" : "purple"
                            }
                          >
                            {seg.journeyType}
                          </Chip>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {seg.fareClass && (
                          <Chip color="teal">Fare: {seg.fareClass}</Chip>
                        )}
                        {seg.cabinClass != null && (
                          <Chip color="blue">{cabinLabel(seg.cabinClass)}</Chip>
                        )}
                        <Chip color={seg.stopOver ? "amber" : "green"}>
                          {seg.stopOver ? "Stopover" : "Non-stop"}
                        </Chip>
                        <Chip color="gray">Seg {seg.segmentIndex}</Chip>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KV
                        label="From"
                        value={`${getCity(seg, "origin")} (${seg.origin?.airportCode})`}
                      />
                      <KV
                        label="To"
                        value={`${getCity(seg, "destination")} (${seg.destination?.airportCode})`}
                      />
                      <KV
                        label="Origin Terminal"
                        value={seg.origin?.terminal || "—"}
                      />
                      <KV
                        label="Destination Terminal"
                        value={seg.destination?.terminal || "—"}
                      />
                      <KV
                        label="Departure"
                        value={fmtDT(seg.departureDateTime)}
                      />
                      <KV label="Arrival" value={fmtDT(seg.arrivalDateTime)} />
                      {seg.durationMinutes != null && (
                        <KV
                          label="Duration"
                          value={`${Math.floor(seg.durationMinutes / 60)}h ${seg.durationMinutes % 60}m`}
                        />
                      )}
                      <KV label="Aircraft" value={seg.aircraft} />
                      {seg.baggage?.checkIn && (
                        <KV
                          label="Check-in Baggage"
                          value={seg.baggage.checkIn}
                        />
                      )}
                      {seg.baggage?.cabin && (
                        <KV label="Cabin Baggage" value={seg.baggage.cabin} />
                      )}
                      <KV label="Origin Country" value={seg.origin?.country} />
                      <KV
                        label="Destination Country"
                        value={seg.destination?.country}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ══ 4. FARE SUMMARY ══ */}
          <Section
            title="Fare & Pricing Summary"
            icon={<FiDollarSign size={11} />}
          >
            <div className="bg-[#1e3a5f] rounded-xl p-5 text-white mb-4">
              <div className="flex flex-wrap justify-between items-start gap-6">
                <div>
                  <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">
                    Total Amount Captured
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {pricing.currency}{" "}
                    {Number(pricing.totalAmount || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-6">
                  {[
                    ["Base Fare", fareSnap.baseFare],
                    ["Tax", fareSnap.tax],
                    ["Published Fare", fareSnap.publishedFare],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[10px] uppercase opacity-50">{l}</p>
                      <p className="font-medium text-sm mt-0.5">{inr(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                label="Currency"
                value={fareSnap.currency || pricing.currency}
              />
              <StatTile label="Fare Type" value={fareSnap.fareType} />
              <StatTile
                label="Refundable"
                value={fareSnap.refundable ? "Yes" : "No"}
                color={
                  fareSnap.refundable ? "text-emerald-700" : "text-red-600"
                }
              />
              <StatTile
                label="Last Ticket Date"
                value={
                  fareSnap.lastTicketDate ? fmt(fareSnap.lastTicketDate) : "—"
                }
              />
            </div>

            {/* Onward + Return Fare breakdown if roundtrip */}
            {(fareSnap.onwardFare || fareSnap.returnFare) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {fareSnap.onwardFare && (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                      Onward Fare
                    </p>
                    {[
                      ["Base Fare", fareSnap.onwardFare.BaseFare],
                      ["Tax", fareSnap.onwardFare.Tax],
                      ["YQ Tax", fareSnap.onwardFare.YQTax],
                      ["Published Fare", fareSnap.onwardFare.PublishedFare],
                      ["Offered Fare", fareSnap.onwardFare.OfferedFare],
                      ["Other Charges", fareSnap.onwardFare.OtherCharges],
                      [
                        "Commission Earned",
                        fareSnap.onwardFare.CommissionEarned,
                      ],
                      ["PLB Earned", fareSnap.onwardFare.PLBEarned],
                      ["Incentive Earned", fareSnap.onwardFare.IncentiveEarned],
                      [
                        "TDS on Commission",
                        fareSnap.onwardFare.TdsOnCommission,
                      ],
                      ["TDS on PLB", fareSnap.onwardFare.TdsOnPLB],
                    ].map(([l, v]) => (
                      <AmountRow key={l} label={l} value={v} />
                    ))}
                  </div>
                )}
                {fareSnap.returnFare && (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                      Return Fare
                    </p>
                    {[
                      ["Base Fare", fareSnap.returnFare.BaseFare],
                      ["Tax", fareSnap.returnFare.Tax],
                      ["YQ Tax", fareSnap.returnFare.YQTax],
                      ["Published Fare", fareSnap.returnFare.PublishedFare],
                      ["Offered Fare", fareSnap.returnFare.OfferedFare],
                      ["Other Charges", fareSnap.returnFare.OtherCharges],
                      [
                        "Commission Earned",
                        fareSnap.returnFare.CommissionEarned,
                      ],
                      ["PLB Earned", fareSnap.returnFare.PLBEarned],
                      ["Incentive Earned", fareSnap.returnFare.IncentiveEarned],
                    ].map(([l, v]) => (
                      <AmountRow key={l} label={l} value={v} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ══ 5. FARE BREAKDOWN PER PAX TYPE ══ */}
          {fareBreakdown.length > 0 && (
            <Section
              title="Fare Breakdown by Passenger Type"
              icon={<FiBarChart2 size={11} />}
            >
              <div className="space-y-3">
                {fareBreakdown.map((fb, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                      <Chip
                        color={
                          fb.PassengerType === 1
                            ? "blue"
                            : fb.PassengerType === 2
                              ? "teal"
                              : "amber"
                        }
                      >
                        {paxTypeLabel(fb.PassengerType)} × {fb.PassengerCount}
                      </Chip>
                      <span className="text-xs text-gray-500">
                        {fb.Currency}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <KV label="Base Fare" value={inr(fb.BaseFare)} />
                      <KV label="Tax" value={inr(fb.Tax)} />
                      <KV label="YQ Tax" value={inr(fb.YQTax)} />
                      <KV
                        label="Transaction Fee"
                        value={inr(fb.TransactionFee)}
                      />
                      <KV label="PG Charge" value={inr(fb.PGCharge)} />
                      <KV
                        label="Additional Txn Fee (Pub)"
                        value={inr(fb.AdditionalTxnFeePub)}
                      />
                      <KV
                        label="Additional Txn Fee (Offered)"
                        value={inr(fb.AdditionalTxnFeeOfrd)}
                      />
                      <KV
                        label="Supplier Reissue Charges"
                        value={inr(fb.SupplierReissueCharges)}
                      />
                    </div>
                    {/* Tax Breakup */}
                    {(fb.TaxBreakUp || fb.TaxBreakup || []).length > 0 && (
                      <div className="px-4 pb-4">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">
                          Tax Breakup
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {(fb.TaxBreakUp || fb.TaxBreakup || []).map(
                            (t, ti) => (
                              <TaxRow key={ti} label={t.key} value={t.value} />
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {/* Segment Details per Pax */}
                    {(fb.SegmentDetails || []).length > 0 && (
                      <div className="px-4 pb-4">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">
                          Segment Baggage Allowance
                        </p>
                        <div className="space-y-1">
                          {fb.SegmentDetails.map((sd, si) => (
                            <div
                              key={si}
                              className="flex gap-6 text-xs text-gray-700"
                            >
                              <span className="text-gray-400">
                                Segment {sd.FlightInfoIndex}:
                              </span>
                              {sd.CheckedInBaggage && (
                                <span>
                                  Check-in:{" "}
                                  {sd.CheckedInBaggage.FreeText ||
                                    sd.CheckedInBaggage.Value +
                                      " " +
                                      sd.CheckedInBaggage.Unit}
                                </span>
                              )}
                              {sd.CabinBaggage && (
                                <span>
                                  Cabin:{" "}
                                  {sd.CabinBaggage.FreeText ||
                                    sd.CabinBaggage.Value +
                                      " " +
                                      sd.CabinBaggage.Unit}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ══ 6. FARE RULES (from fareQuote) ══ */}
          {fareRules.length > 0 && (
            <Section
              title="Fare Rules (from Quote)"
              icon={<FiFileText size={11} />}
            >
              <div className="space-y-3">
                {fareRules.map((fr, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Chip color="teal">
                        {fr.Origin} → {fr.Destination}
                      </Chip>
                      <Chip color="blue">{fr.Airline}</Chip>
                      <Chip color="gray">Basis: {fr.FareBasisCode}</Chip>
                      {fr.FareFamilyCode && (
                        <Chip color="purple">Family: {fr.FareFamilyCode}</Chip>
                      )}
                    </div>
                    {(fr.FareInclusions || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {fr.FareInclusions.map((inc, ii) => (
                          <span
                            key={ii}
                            className="px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 text-[10px] rounded-lg flex items-center gap-1"
                          >
                            <FiCheckCircle size={9} /> {inc}
                          </span>
                        ))}
                      </div>
                    )}
                    {fr.FareRuleDetail && (
                      <div
                        className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto prose prose-sm"
                        dangerouslySetInnerHTML={{ __html: fr.FareRuleDetail }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ══ 7. MINI FARE RULES ══ */}
          {miniFareRules.length > 0 && (
            <Section
              title="Change / Cancellation Rules"
              icon={<FiShield size={11} />}
            >
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {[
                        "Type",
                        "Journey",
                        "Window",
                        "Details",
                        "Online Reissue",
                        "Online Refund",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-gray-400 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {miniFareRules.map((r, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Chip
                            color={
                              r.Type === "Cancellation"
                                ? "red"
                                : r.Type === "Reissue"
                                  ? "blue"
                                  : "gray"
                            }
                          >
                            {r.Type || "—"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {r.JourneyPoints || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.From != null && r.Unit
                            ? `${r.From}–${r.To || "∞"} ${r.Unit}`
                            : "Any time"}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800">
                          {r.Details || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            color={r.OnlineReissueAllowed ? "green" : "gray"}
                            size="xs"
                          >
                            {r.OnlineReissueAllowed ? "Yes" : "No"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            color={r.OnlineRefundAllowed ? "green" : "gray"}
                            size="xs"
                          >
                            {r.OnlineRefundAllowed ? "Yes" : "No"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ══ 8. SSR — Seats / Meals / Baggage ══ */}
          {(ssrSnap.seats?.length || 0) +
            (ssrSnap.meals?.length || 0) +
            (ssrSnap.baggage?.length || 0) >
            0 && (
            <Section
              title="SSR — Seats / Meals / Baggage"
              icon={<FiTag size={11} />}
            >
              <div className="grid md:grid-cols-3 gap-3">
                {ssrSnap.seats?.length > 0 && (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FiPackage size={10} /> Seats
                    </p>
                    {ssrSnap.seats.map((s, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg px-3 py-2 mb-2"
                      >
                        <p className="text-xs font-medium text-gray-700">
                          Seat {s.seatNo}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Segment {s.segmentIndex + 1} · Traveller{" "}
                          {s.travelerIndex + 1}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {inr(s.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {ssrSnap.meals?.length > 0 && (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FiCoffee size={10} /> Meals
                    </p>
                    {ssrSnap.meals.map((m, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg px-3 py-2 mb-2"
                      >
                        <p className="text-xs font-medium text-gray-700">
                          {m.code}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Segment {m.segmentIndex + 1} · Traveller{" "}
                          {m.travelerIndex + 1}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {inr(m.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {ssrSnap.baggage?.length > 0 && (
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FiPackage size={10} /> Baggage
                    </p>
                    {ssrSnap.baggage.map((b, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg px-3 py-2 mb-2"
                      >
                        <p className="text-xs font-medium text-gray-700">
                          {b.code}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Segment {b.segmentIndex + 1} · Traveller{" "}
                          {b.travelerIndex + 1}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {inr(b.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ══ 9. TRAVELLERS ══ */}
          <Section
            title={`Travellers (${travelers.length})`}
            icon={<FiUser size={11} />}
          >
            <div className="space-y-4">
              {travelers.map((pax, i) => {
                // Match provider passenger record
                const provPaxOnward = allPassengers.find(
                  (p) =>
                    (p.FirstName + " " + p.LastName).trim().toLowerCase() ===
                    (pax.firstName + " " + pax.lastName).trim().toLowerCase(),
                );
                const provPaxReturn = allReturnPassengers.find(
                  (p) =>
                    (p.FirstName + " " + p.LastName).trim().toLowerCase() ===
                    (pax.firstName + " " + pax.lastName).trim().toLowerCase(),
                );
                const provPax = provPaxOnward || provPaxReturn;

                return (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    {/* Pax Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={`${(pax.firstName || "?")[0]}${(pax.lastName || "?")[0]}`}
                          bg="#1e3a5f"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pax.title} {pax.firstName} {pax.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Chip
                              color={
                                pax.paxType === "ADULT"
                                  ? "blue"
                                  : pax.paxType === "CHILD"
                                    ? "teal"
                                    : "amber"
                              }
                              size="xs"
                            >
                              {pax.paxType}
                            </Chip>
                            <span className="text-[10px] text-gray-400 uppercase">
                              {pax.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                      {pax.isLeadPassenger && (
                        <Chip color="blue">Lead Passenger</Chip>
                      )}
                    </div>

                    {/* Pax Details */}
                    <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <KV
                        label="Date of Birth"
                        value={fmt(pax.dateOfBirth || pax.dob)}
                      />
                      <KV label="Gender" value={pax.gender} />
                      <KV label="Nationality" value={pax.nationality} />
                      <KV label="Pax Type" value={pax.paxType} />
                      {pax.linkedAdultIndex != null && (
                        <KV
                          label="Linked Adult Index"
                          value={String(pax.linkedAdultIndex)}
                        />
                      )}
                      {pax.email && (
                        <KV
                          label="Email"
                          value={pax.email}
                          icon={<FiMail size={10} />}
                        />
                      )}
                      {pax.phoneWithCode && (
                        <KV
                          label="Phone"
                          value={`+${pax.phoneWithCode}`}
                          icon={<FiPhone size={10} />}
                        />
                      )}
                      {pax.passportNumber && (
                        <KV
                          label="Passport No."
                          value={pax.passportNumber}
                          mono
                        />
                      )}
                      {pax.PassportIssueDate && (
                        <KV
                          label="Passport Issue Date"
                          value={fmt(pax.PassportIssueDate)}
                        />
                      )}
                      {pax.passportExpiry && (
                        <KV
                          label="Passport Expiry"
                          value={fmt(pax.passportExpiry)}
                        />
                      )}
                      {pax.panCard && (
                        <KV label="PAN" value={pax.panCard} mono />
                      )}
                    </div>

                    {/* Provider Ticket Info */}
                    {provPax?.Ticket && (
                      <div className="px-4 pb-3 pt-2 border-t border-gray-100 bg-green-50/30">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">
                          Ticket Details
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <KV
                            label="Ticket No."
                            value={provPax.Ticket.TicketNumber}
                            mono
                          />
                          <KV
                            label="Ticket Status"
                            value={provPax.Ticket.Status}
                          />
                          <KV
                            label="Issue Date"
                            value={fmtDT(provPax.Ticket.IssueDate)}
                          />
                          <KV
                            label="Validating Airline"
                            value={provPax.Ticket.ValidatingAirline}
                          />
                          <KV
                            label="Ticket Type"
                            value={provPax.Ticket.TicketType}
                          />
                          {provPax.Ticket.Remarks && (
                            <KV
                              label="Remarks"
                              value={provPax.Ticket.Remarks}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Barcode Details */}
                    {provPax?.BarcodeDetails?.Barcode?.length > 0 && (
                      <div className="px-4 pb-3 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-3 mb-2">
                          Barcode(s)
                        </p>
                        <div className="space-y-1">
                          {provPax.BarcodeDetails.Barcode.map((bc, bi) => (
                            <div
                              key={bi}
                              className="bg-gray-50 rounded px-3 py-2 font-mono text-[10px] text-gray-600 break-all"
                            >
                              {bc.Content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Segment Additional Info (fare basis, baggage per seg) */}
                    {(provPax?.SegmentAdditionalInfo || []).length > 0 && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-3 mb-2">
                          Segment Fare Info
                        </p>
                        <div className="space-y-2">
                          {provPax.SegmentAdditionalInfo.map((si, sii) => (
                            <div
                              key={sii}
                              className="bg-gray-50 rounded-lg px-3 py-2 grid grid-cols-2 md:grid-cols-4 gap-3"
                            >
                              <KV
                                label="Fare Basis"
                                value={si.FareBasis}
                                mono
                              />
                              <KV label="Baggage" value={si.Baggage} />
                              <KV
                                label="Cabin Baggage"
                                value={si.CabinBaggage}
                              />
                              <KV label="Meal" value={si.Meal} />
                              {si.Seat && <KV label="Seat" value={si.Seat} />}
                              {si.NVA && <KV label="NVA" value={si.NVA} />}
                              {si.NVB && <KV label="NVB" value={si.NVB} />}
                              {si.SpecialService && (
                                <KV
                                  label="Special Service"
                                  value={si.SpecialService}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ══ 10. BOOKING RESULT — ONWARD ══ */}
          {(onwardItin.PNR || singleItin.PNR) && (
            <Section
              title={
                isRoundTrip ? "Booking Result — Onward Leg" : "Booking Result"
              }
              icon={<FiCheckCircle size={11} />}
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <KV
                    label="PNR"
                    value={onwardItin.PNR || singleItin.PNR}
                    mono
                  />
                  <KV
                    label="Booking ID"
                    value={onwardItin.BookingId || singleItin.BookingId}
                    mono
                  />
                  <KV
                    label="Origin"
                    value={onwardItin.Origin || singleItin.Origin}
                  />
                  <KV
                    label="Destination"
                    value={onwardItin.Destination || singleItin.Destination}
                  />
                  <KV
                    label="Airline Code"
                    value={onwardItin.AirlineCode || singleItin.AirlineCode}
                  />
                  <KV
                    label="Validating Airline"
                    value={
                      onwardItin.ValidatingAirlineCode ||
                      singleItin.ValidatingAirlineCode
                    }
                  />
                </div>

                {/* Confirmed Segments from booking result */}
                {(onwardSegments.length > 0 || singleSegments.length > 0) && (
                  <div>
                    <p className="text-[10px] text-blue-700 uppercase tracking-widest font-semibold mb-2">
                      Confirmed Segment(s)
                    </p>
                    <div className="space-y-2">
                      {(onwardSegments.length > 0
                        ? onwardSegments
                        : singleSegments
                      ).map((seg, si) => (
                        <div
                          key={si}
                          className="bg-white border border-blue-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3"
                        >
                          <KV
                            label="Flight"
                            value={`${seg.Airline?.AirlineCode} ${seg.Airline?.FlightNumber}`}
                          />
                          <KV
                            label="Airline PNR"
                            value={seg.AirlinePNR || "—"}
                            mono
                          />
                          <KV
                            label="From"
                            value={seg.Origin?.Airport?.AirportCode}
                          />
                          <KV
                            label="To"
                            value={seg.Destination?.Airport?.AirportCode}
                          />
                          <KV
                            label="Departure"
                            value={fmtDT(seg.Origin?.DepTime)}
                          />
                          <KV
                            label="Arrival"
                            value={fmtDT(seg.Destination?.ArrTime)}
                          />
                          <KV
                            label="Duration"
                            value={
                              seg.Duration
                                ? `${Math.floor(seg.Duration / 60)}h ${seg.Duration % 60}m`
                                : "—"
                            }
                          />
                          <KV
                            label="Status"
                            value={seg.FlightStatus || seg.Status}
                          />
                          <KV
                            label="Cabin Class"
                            value={cabinLabel(seg.CabinClass)}
                          />
                          <KV
                            label="Fare Class"
                            value={seg.Airline?.FareClass}
                          />
                          <KV label="Baggage" value={seg.Baggage} />
                          <KV label="Cabin Baggage" value={seg.CabinBaggage} />
                          <KV label="Aircraft" value={seg.Craft} />
                          <KV
                            label="Non-stop"
                            value={seg.StopOver ? "Has Stopover" : "Non-stop"}
                          />
                          {seg.AccumulatedDuration && (
                            <KV
                              label="Accumulated Duration"
                              value={`${Math.floor(seg.AccumulatedDuration / 60)}h ${seg.AccumulatedDuration % 60}m`}
                            />
                          )}
                          {seg.GroundTime > 0 && (
                            <KV
                              label="Ground Time"
                              value={`${seg.GroundTime}m`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ══ 11. BOOKING RESULT — RETURN LEG ══ */}
          {isRoundTrip && returnItin.PNR && (
            <Section
              title="Booking Result — Return Leg"
              icon={<FiRepeat size={11} />}
            >
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <KV label="PNR" value={returnItin.PNR} mono />
                  <KV label="Booking ID" value={returnItin.BookingId} mono />
                  <KV label="Origin" value={returnItin.Origin} />
                  <KV label="Destination" value={returnItin.Destination} />
                  <KV label="Airline Code" value={returnItin.AirlineCode} />
                  <KV
                    label="Validating Airline"
                    value={returnItin.ValidatingAirlineCode}
                  />
                </div>

                {/* Return Segments */}
                {returnSegments.length > 0 && (
                  <div>
                    <p className="text-[10px] text-purple-700 uppercase tracking-widest font-semibold mb-2">
                      Confirmed Segment(s)
                    </p>
                    <div className="space-y-2">
                      {returnSegments.map((seg, si) => (
                        <div
                          key={si}
                          className="bg-white border border-purple-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3"
                        >
                          <KV
                            label="Flight"
                            value={`${seg.Airline?.AirlineCode} ${seg.Airline?.FlightNumber}`}
                          />
                          <KV
                            label="Airline PNR"
                            value={seg.AirlinePNR || "—"}
                            mono
                          />
                          <KV
                            label="From"
                            value={seg.Origin?.Airport?.AirportCode}
                          />
                          <KV
                            label="To"
                            value={seg.Destination?.Airport?.AirportCode}
                          />
                          <KV
                            label="Departure"
                            value={fmtDT(seg.Origin?.DepTime)}
                          />
                          <KV
                            label="Arrival"
                            value={fmtDT(seg.Destination?.ArrTime)}
                          />
                          <KV
                            label="Duration"
                            value={
                              seg.Duration
                                ? `${Math.floor(seg.Duration / 60)}h ${seg.Duration % 60}m`
                                : "—"
                            }
                          />
                          <KV
                            label="Status"
                            value={seg.FlightStatus || seg.Status}
                          />
                          <KV
                            label="Cabin Class"
                            value={cabinLabel(seg.CabinClass)}
                          />
                          <KV
                            label="Fare Class"
                            value={seg.Airline?.FareClass}
                          />
                          <KV label="Baggage" value={seg.Baggage} />
                          <KV label="Cabin Baggage" value={seg.CabinBaggage} />
                          <KV label="Aircraft" value={seg.Craft} />
                          {seg.AccumulatedDuration && (
                            <KV
                              label="Accumulated Duration"
                              value={`${Math.floor(seg.AccumulatedDuration / 60)}h ${seg.AccumulatedDuration % 60}m`}
                            />
                          )}
                          {seg.GroundTime > 0 && (
                            <KV
                              label="Ground Time"
                              value={`${seg.GroundTime}m`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Return Passengers Tickets */}
                {allReturnPassengers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] text-purple-700 uppercase tracking-widest font-semibold mb-2">
                      Passenger Tickets (Return)
                    </p>
                    <div className="space-y-2">
                      {allReturnPassengers.map((p, pi) => (
                        <div
                          key={pi}
                          className="bg-white border border-purple-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-3"
                        >
                          <KV
                            label="Name"
                            value={`${p.Title} ${p.FirstName} ${p.LastName}`}
                          />
                          <KV
                            label="Pax Type"
                            value={paxTypeLabel(p.PaxType)}
                          />
                          <KV
                            label="Lead Pax"
                            value={p.IsLeadPax ? "Yes" : "No"}
                          />
                          {p.Ticket && (
                            <>
                              <KV
                                label="Ticket No."
                                value={p.Ticket.TicketNumber}
                                mono
                              />
                              <KV label="Status" value={p.Ticket.Status} />
                              <KV
                                label="Issue Date"
                                value={fmtDT(p.Ticket.IssueDate)}
                              />
                            </>
                          )}
                          {(p.BarcodeDetails?.Barcode || []).map((bc, bi) => (
                            <div key={bi} className="col-span-full">
                              <p className="text-[10px] text-gray-400 mb-0.5">
                                Barcode
                              </p>
                              <p className="font-mono text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1 break-all">
                                {bc.Content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ══ 12. INVOICES ══ */}
          {allInvoices.length > 0 && (
            <Section
              title={`Invoices (${allInvoices.length})`}
              icon={<FiFileText size={11} />}
            >
              <div className="space-y-2">
                {allInvoices.map((inv, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KV label="Invoice No." value={inv.InvoiceNo} mono />
                      <KV label="Invoice ID" value={inv.InvoiceId} mono />
                      <KV
                        label="Invoice Amount"
                        value={inr(inv.InvoiceAmount)}
                        highlight
                      />
                      <KV label="Invoice Status" value={inv.InvoiceStatus} />
                      <KV
                        label="Created On"
                        value={fmtDT(inv.InvoiceCreatedOn)}
                      />
                      {inv.leg && <KV label="Leg" value={inv.leg} />}
                      {inv.Remarks && (
                        <KV label="Remarks" value={inv.Remarks} />
                      )}
                      {inv.GSTIN && <KV label="GSTIN" value={inv.GSTIN} mono />}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}





          {/* ══ 15. AMENDMENT HISTORY ══ */}
          {amendHist.length > 0 && (
            <Section
              title={`Amendment History (${amendHist.length})`}
              icon={<FiInfo size={11} />}
            >
              <div className="space-y-2">
                {amendHist.map((ah, i) => (
                  <div
                    key={i}
                    className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex justify-between items-start gap-4"
                  >
                    <div>
                      <Chip color="amber">{ah.type?.replace(/_/g, " ")}</Chip>
                      <p className="text-xs text-gray-700 mt-1.5 capitalize font-medium">
                        {ah.status?.replace(/_/g, " ")}
                      </p>
                      {ah.changeRequestId && (
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          CR ID: {ah.changeRequestId}
                        </p>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 shrink-0">
                      {fmtDT(ah.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ══ 16. AMENDMENT CURRENT STATUS ══ */}
          {amendment.changeRequestId && (
            <Section
              title="Current Amendment"
              icon={<FiAlertCircle size={11} />}
            >
              <div className="border border-amber-100 bg-amber-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <KV
                  label="Change Request ID"
                  value={amendment.changeRequestId}
                  mono
                />
                <KV
                  label="Status"
                  value={amendment.status?.replace(/_/g, " ")}
                />
                <KV label="Requested At" value={fmtDT(amendment.requestedAt)} />
                {amendment.amendmentType && (
                  <KV label="Amendment Type" value={amendment.amendmentType} />
                )}
                {amendment.remarks && (
                  <KV label="Remarks" value={amendment.remarks} />
                )}
                {amendment.lastCheckedAt && (
                  <KV
                    label="Last Checked"
                    value={fmtDT(amendment.lastCheckedAt)}
                  />
                )}
              </div>
            </Section>
          )}



          {/* ══ 18. AMENDMENT & CANCELLATION ACTIONS ══ */}
          {bookRes && (pnr || onwardPNR || returnPNR) &&
  !["cancelled", "cancel_requested", "cancellation_requested", "fully_cancelled", "partially_cancelled"]
    .some((k) => 
      raw.executionStatus?.toLowerCase().includes(k) ||
      raw.requestStatus?.toLowerCase().includes(k)
    ) && (
            <Section
              title="Amendment & Cancellation Actions"
              icon={<FiAlertCircle size={11} />}
            >
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {/* Tab bar */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {[
                    {
                      id: "charges",
                      label: "Cancellation charges",
                      sub: "Preview penalties",
                    },
                    {
                      id: "full_cancel",
                      label: "Full cancel",
                      sub: "Cancel entire booking",
                    },
                    {
                      id: "partial_cancel",
                      label: "Partial cancel",
                      sub: "Select passengers",
                    },
                    {
                      id: "reissue",
                      label: "Reissue",
                      sub: "Request modification",
                    },
                    {
                      id: "status",
                      label: "Check status",
                      sub: "Amendment status",
                    },
                  ].map(({ id, label, sub }) => (
                    <button
                      key={id}
                      onClick={() => setActionTab(id)}
                      className={`flex flex-col items-start px-4 py-3 gap-0.5 whitespace-nowrap border-b-2 transition-colors outline-none
              ${
                actionTab === id
                  ? "border-blue-600 bg-blue-50/40 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
                    >
                      <span className="text-[12px] font-medium">{label}</span>
                      <span className="text-[11px] text-gray-400">{sub}</span>
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* ── Cancellation Charges ── */}
                  {actionTab === "charges" && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                        <FiInfo size={13} className="mt-0.5 shrink-0" />
                        Fetch live cancellation charges from the provider before
                        proceeding. Charges reflect current fare rules and
                        booking status.
                      </div>

                      {cancellationCharges &&
                        (() => {
                          const c = cancellationCharges;
                          const charges =
                            c?.CancellationCharges ||
                            c?.cancellationCharges ||
                            {};
                          const hasCards =
                            charges.AirlineCharges != null ||
                            charges.NetRefund != null;
                          return (
                            <div className="space-y-3">
                              {hasCards && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {charges.AirlineCharges != null && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                        Airline fee
                                      </p>
                                      <p className="text-sm font-medium text-gray-900 mt-1">
                                        {inr(charges.AirlineCharges)}
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        Per passenger
                                      </p>
                                    </div>
                                  )}
                                  {charges.Tax != null && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                        Tax refund
                                      </p>
                                      <p className="text-sm font-medium text-gray-900 mt-1">
                                        {inr(charges.Tax)}
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        Refundable
                                      </p>
                                    </div>
                                  )}
                                  {charges.NetRefund != null && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                        Net refund
                                      </p>
                                      <p className="text-sm font-medium text-emerald-700 mt-1">
                                        {inr(charges.NetRefund)}
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        Estimated
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                  <FiFileText size={10} /> Provider response
                                </p>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[11px] font-mono text-gray-500 max-h-48 overflow-auto whitespace-pre-wrap">
                                  {JSON.stringify(cancellationCharges, null, 2)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      <button
                        onClick={() =>
                          dispatch(fetchCancellationCharges(raw._id))
                            .unwrap()
                            .then(() => toast.success("Charges fetched"))
                            .catch((err) =>
                              toast.error(err.message || "Failed"),
                            )
                        }
                        disabled={loadingCancellationCharges}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {loadingCancellationCharges ? (
                          <>
                            <span className="w-3 h-3 rounded-full bg-white/40 animate-pulse" />{" "}
                            Fetching…
                          </>
                        ) : (
                          <>
                            <FiDollarSign size={13} />{" "}
                            {cancellationCharges
                              ? "Refresh charges"
                              : "Fetch cancellation charges"}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* ── Full Cancel ── */}
                  {actionTab === "full_cancel" && (
                    <div className="space-y-4">
                      <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-red-800 flex items-center gap-1.5 mb-1.5">
                          <FiAlertCircle size={13} /> This action cannot be
                          undone
                        </p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          A full cancellation request will be sent to the
                          provider for all passengers on this booking. Ensure
                          you have reviewed the cancellation charges before
                          proceeding.
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Remarks</p>
                        <input
                          type="text"
                          value={cancelRemarks}
                          onChange={(e) => setCancelRemarks(e.target.value)}
                          placeholder="Add cancellation remarks…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                        />
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() =>
                            dispatch(
                              fullCancellation({
                                bookingId: raw._id,
                                remarks: cancelRemarks,
                              }),
                            )
                              .unwrap()
                              .then(() =>
                                toast.success("Full cancellation requested"),
                              )
                              .catch((err) =>
                                toast.error(err.message || "Failed"),
                              )
                          }
                          disabled={fullCancellationLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                          <FiX size={13} />
                          {fullCancellationLoading
                            ? "Processing…"
                            : "Send full cancellation request"}
                        </button>
                        <button
                          onClick={() => setActionTab("charges")}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          View charges first
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Partial Cancel ── */}
                  {actionTab === "partial_cancel" && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
                        <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                        Select the passengers and the route segments you want to
                        cancel. Remaining passengers and untouched segments will
                        retain their booking.
                      </div>

                      {/* ── ROUTE / SEGMENT SELECTION ── */}
                      {(() => {
                        const allSegs = [
                          ...(onwardSegments.length > 0
                            ? onwardSegments
                            : singleSegments
                          ).map((seg, i) => ({
                            key: `onward_${i}`,
                            label: `${seg.Origin?.Airport?.AirportCode} → ${seg.Destination?.Airport?.AirportCode}`,
                            flight: `${seg.Airline?.AirlineCode} ${seg.Airline?.FlightNumber}`,
                            dep: fmtDT(seg.Origin?.DepTime),
                            leg: isRoundTrip ? "Onward" : null,
                            segIndex: i + 1,
                          })),
                          ...returnSegments.map((seg, i) => ({
                            key: `return_${i}`,
                            label: `${seg.Origin?.Airport?.AirportCode} → ${seg.Destination?.Airport?.AirportCode}`,
                            flight: `${seg.Airline?.AirlineCode} ${seg.Airline?.FlightNumber}`,
                            dep: fmtDT(seg.Origin?.DepTime),
                            leg: "Return",
                            segIndex: i + 1,
                          })),
                          // fallback to flightRequest segments if booking result segments are empty
                          ...(onwardSegments.length === 0 &&
                          returnSegments.length === 0 &&
                          singleSegments.length === 0
                            ? segments.map((seg, i) => ({
                                key: `req_${i}`,
                                label: `${seg.origin?.airportCode} → ${seg.destination?.airportCode}`,
                                flight: `${seg.airlineCode} ${seg.flightNumber}`,
                                dep: fmtDT(seg.departureDateTime),
                                leg: seg.journeyType || null,
                                segIndex: seg.segmentIndex ?? i + 1,
                              }))
                            : []),
                        ];

                        return allSegs.length > 0 ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Select route segment(s) to cancel
                            </p>
                            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                              {allSegs.map((seg) => {
                                const checked = selectedSegmentKeys?.includes(
                                  seg.key,
                                );
                                return (
                                  <label
                                    key={seg.key}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${checked ? "bg-amber-50/70" : "hover:bg-gray-50"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        e.target.checked
                                          ? setSelectedSegmentKeys([
                                              ...(selectedSegmentKeys || []),
                                              seg.key,
                                            ])
                                          : setSelectedSegmentKeys(
                                              (
                                                selectedSegmentKeys || []
                                              ).filter((k) => k !== seg.key),
                                            )
                                      }
                                      className="w-4 h-4 accent-amber-600 rounded shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-800">
                                        {seg.label}
                                      </p>
                                      <p className="text-[11px] text-gray-400 mt-0.5">
                                        {seg.flight} · Dep: {seg.dep}
                                        {seg.leg ? ` · ${seg.leg}` : ""}
                                      </p>
                                    </div>
                                    <span className="text-[11px] text-gray-400 shrink-0">
                                      Seg {seg.segIndex}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                            No segment data available.
                          </div>
                        );
                      })()}

                      {/* ── PASSENGER SELECTION ── */}
                      {allPassengers.length > 0 ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">
                            Select passenger(s) to cancel{" "}
                            <span className="font-normal text-gray-400">
                              ({selectedPaxIds.length} of {allPassengers.length}{" "}
                              selected)
                            </span>
                          </p>
                          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                            {allPassengers.map((p, i) => {
                              const tkt =
                                p.Ticket?.TicketNumber ||
                                p.Ticket?.TicketId ||
                                `pax_${i}`;
                              const checked = selectedPaxIds.includes(tkt);
                              return (
                                <label
                                  key={i}
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${checked ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      e.target.checked
                                        ? setSelectedPaxIds([
                                            ...selectedPaxIds,
                                            tkt,
                                          ])
                                        : setSelectedPaxIds(
                                            selectedPaxIds.filter(
                                              (id) => id !== tkt,
                                            ),
                                          )
                                    }
                                    className="w-4 h-4 accent-blue-600 rounded shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">
                                      {p.FirstName} {p.LastName}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                                      {paxTypeLabel(p.PaxType)}
                                      {p.IsLeadPax ? " · Lead passenger" : ""}
                                    </p>
                                  </div>
                                  <span className="text-[11px] text-gray-400 font-mono shrink-0">
                                    {tkt}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                          No passenger records found for this booking.
                        </div>
                      )}

                      {/* ── REMARKS ── */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Remarks</p>
                        <input
                          type="text"
                          value={cancelRemarks}
                          onChange={(e) => setCancelRemarks(e.target.value)}
                          placeholder="Add cancellation remarks…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                        />
                      </div>

                      {/* ── SUBMIT ── */}
                      <button
                        onClick={() => {
                          if (!selectedPaxIds.length)
                            return toast.error("Select at least one passenger");
                          if (!selectedSegmentKeys?.length)
                            return toast.error(
                              "Select at least one route segment",
                            );
                          dispatch(
                            partialCancellation({
                              bookingId: raw._id,
                              passengerIds: selectedPaxIds,
                              segments: (selectedSegmentKeys || []).map((k) => {
                                const idx = parseInt(k.split("_")[1], 10) + 1;
                                return idx;
                              }),
                              remarks: cancelRemarks,
                            }),
                          )
                            .unwrap()
                            .then(() =>
                              toast.success("Partial cancellation requested"),
                            )
                            .catch((err) =>
                              toast.error(err.message || "Failed"),
                            );
                        }}
                        disabled={
                          partialCancellationLoading ||
                          !selectedPaxIds.length ||
                          !selectedSegmentKeys?.length
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {partialCancellationLoading
                          ? "Processing…"
                          : `Cancel ${selectedPaxIds.length || ""} passenger${selectedPaxIds.length !== 1 ? "s" : ""} on ${selectedSegmentKeys?.length || 0} segment${(selectedSegmentKeys?.length || 0) !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  )}

                  {/* ── Reissue ── */}
                  {actionTab === "reissue" && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                        <FiInfo size={13} className="mt-0.5 shrink-0" />
                        Reissue requests require approval from the airline.
                        Provide complete details for the modification in the
                        remarks field.
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">
                          Reissue remarks / modification details
                        </p>
                        <textarea
                          value={reissueRemarks}
                          onChange={(e) => setReissueRemarks(e.target.value)}
                          placeholder="Describe the required modification — date change, route change, upgrade, etc."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </div>

                      <button
                        onClick={() =>
                          dispatch(
                            amendBooking({
                              bookingId: raw._id,
                              segments: [],
                              remarks: reissueRemarks,
                            }),
                          )
                            .unwrap()
                            .then(() => toast.success("Reissue requested"))
                            .catch((err) =>
                              toast.error(err.message || "Failed"),
                            )
                        }
                        disabled={amendmentLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        <FiRepeat size={13} />
                        {amendmentLoading
                          ? "Processing…"
                          : "Send reissue request"}
                      </button>
                    </div>
                  )}

                  {/* ── Check Status ── */}
                  {actionTab === "status" && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                        <FiInfo size={13} className="mt-0.5 shrink-0" />
                        Enter the change request ID from the amendment history
                        above to check its current status with the provider.
                      </div>

                      {/* Quick-fill from history */}
                      {amendHist.filter((ah) => ah.changeRequestId).length >
                        0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">
                            Recent change request IDs
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {amendHist
                              .filter((ah) => ah.changeRequestId)
                              .slice(0, 4)
                              .map((ah, i) => (
                                <button
                                  key={i}
                                  onClick={() =>
                                    setCrIdInput(ah.changeRequestId)
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors
                        ${
                          crIdInput === ah.changeRequestId
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                                >
                                  {ah.changeRequestId}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={crIdInput}
                          onChange={(e) => setCrIdInput(e.target.value)}
                          placeholder="Change request ID (e.g. CR-2024-00123)"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400"
                        />
                        <button
                          onClick={() => {
                            if (!crIdInput)
                              return toast.error("Enter a change request ID");
                            dispatch(
                              fetchChangeStatus({
                                bookingId: raw._id,
                                changeRequestId: crIdInput,
                              }),
                            )
                              .unwrap()
                              .then(() => toast.success("Status fetched"))
                              .catch((err) =>
                                toast.error(err.message || "Failed"),
                              );
                          }}
                          disabled={changeStatusLoading || !crIdInput}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                          {changeStatusLoading ? "Fetching…" : "Fetch status"}
                        </button>
                      </div>

                      {changeStatusData && (
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <FiFileText size={10} /> Change request status
                          </p>
                          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[11px] font-mono text-gray-500 max-h-48 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(changeStatusData, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-gray-400 font-mono">
              Ref:{" "}
              <span className="text-gray-600 font-medium">
                {raw.bookingReference}
              </span>
            </p>
            {pnr && (
              <p className="text-[11px] text-gray-400 font-mono">
                PNR: <span className="text-gray-600 font-medium">{pnr}</span>
              </p>
            )}
            {onwardPNR && (
              <p className="text-[11px] text-gray-400 font-mono">
                Onward:{" "}
                <span className="text-gray-600 font-medium">{onwardPNR}</span>
                {returnPNR && (
                  <>
                    {" "}
                    · Return:{" "}
                    <span className="text-gray-600 font-medium">
                      {returnPNR}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL BOOKING MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const HotelBookingModal = ({ booking: rawProp, onClose }) => {
  const raw = rawProp;
  if (!raw) return null;

  const hotel = raw.hotelRequest?.selectedHotel || {};
  const selectedRoom = raw.hotelRequest?.selectedRoom || {};

  // rawRoomData can be array (multi-room) or plain object (single room)
  const rawRoomDataArr = Array.isArray(selectedRoom.rawRoomData)
    ? selectedRoom.rawRoomData
    : selectedRoom.rawRoomData
      ? [selectedRoom.rawRoomData]
      : [];

  const pricing = raw.pricingSnapshot || {};
  const snap = raw.bookingSnapshot || {};
  const travelers = raw.travellers || [];
  const roomGuests = raw.hotelRequest?.roomGuests || [];
  const amendment = raw.amendment || {};
  const bookRes = raw.bookingResult || {};
  const corporateId = raw.corporateId || {};

  // Cancel policies — prefer rawRoomData, fall back to selectedRoom
  const cancelPolicies =
    rawRoomDataArr[0]?.CancelPolicies || selectedRoom.cancelPolicies || [];

  // All images across every rawRoomData entry (de-duped by URL)
  const seenUrls = new Set();
  const allImages = rawRoomDataArr
    .flatMap((r) => r.images || [])
    .filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });

  const baseFare = (selectedRoom.totalFare || 0) - (selectedRoom.totalTax || 0);

  const amendRes =
    amendment.providerResponse?.HotelChangeRequestResult ||
    amendment.providerResponse?.HotelChangeRequestStatusResult ||
    {};

  const bookResult = bookRes.providerResponse?.BookResult || {};

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-5xl my-4 overflow-hidden border border-gray-200"
      >
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0A4D68]/10 flex items-center justify-center text-[#0A4D68]">
              <FaHotel size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-medium text-gray-900">
                  Hotel booking detail
                </h2>
                <StatusBadge status={raw.executionStatus} />
                <StatusBadge status={raw.requestStatus} />
                {amendment.status && amendment.status !== "not_requested" && (
                  <Chip color="amber">
                    Amendment: {amendment.status?.replace(/_/g, " ")}
                  </Chip>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {raw.bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 shrink-0"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 max-h-[78vh] overflow-y-auto">
          {/* Hotel Information */}
          <Section title="Hotel Information" icon={<FiHome size={11} />}>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-gray-900 leading-tight">
                    {hotel.hotelName || "—"}
                  </p>
                  {hotel.starRating > 0 && (
                    <p className="text-amber-400 text-sm mt-0.5">
                      {"★".repeat(hotel.starRating)}
                    </p>
                  )}
                  {hotel.address && (
                    <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5">
                      <FiMapPin size={11} className="mt-0.5 shrink-0" />
                      {hotel.address}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-200">
                    {rawRoomDataArr[0]?.Name?.[0] && (
                      <Chip color="teal">{rawRoomDataArr[0].Name[0]}</Chip>
                    )}
                    {(selectedRoom.mealType || rawRoomDataArr[0]?.MealType) && (
                      <Chip color="blue">
                        <FiCoffee size={9} />
                        {selectedRoom.mealType || rawRoomDataArr[0]?.MealType}
                      </Chip>
                    )}
                    {(selectedRoom.isRefundable ??
                    rawRoomDataArr[0]?.IsRefundable) ? (
                      <Chip color="green">
                        <FiCheckCircle size={9} /> Refundable
                      </Chip>
                    ) : (
                      <Chip color="red">Non-Refundable</Chip>
                    )}
                    {(rawRoomDataArr[0]?.RoomPromotion || []).map((p, i) => (
                      <Chip key={i} color="amber">
                        <FiTag size={9} /> {p}
                      </Chip>
                    ))}
                    {!(
                      selectedRoom.withTransfers ??
                      rawRoomDataArr[0]?.WithTransfers
                    ) && <Chip color="gray">No transfers</Chip>}
                  </div>
                </div>
                {hotel.hotelCode && (
                  <span className="text-[11px] text-gray-400 font-mono bg-gray-100 px-3 py-1.5 rounded-lg shrink-0">
                    {hotel.hotelCode}
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Stay Details */}
          <Section title="Stay Details" icon={<FiCalendar size={11} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatTile
                label="Check-in"
                value={fmt(raw.hotelRequest?.checkInDate)}
                sub={raw.hotelRequest?.checkInDate ? new Date(raw.hotelRequest.checkInDate).toLocaleDateString("en-IN", { weekday: "long" }) : ""}
              />
              <StatTile
                label="Check-out"
                value={fmt(raw.hotelRequest?.checkOutDate)}
                sub={raw.hotelRequest?.checkOutDate ? new Date(raw.hotelRequest.checkOutDate).toLocaleDateString("en-IN", { weekday: "long" }) : ""}
              />
              <StatTile
                label="Nights"
                value={snap.nights || raw.hotelRequest?.noOfNights || "—"}
              />
              <StatTile
                label="Rooms"
                value={raw.hotelRequest?.noOfRooms || "—"}
              />
            </div>
            <div className="space-y-2">
              {roomGuests.map((rg, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex flex-wrap gap-6"
                >
                  <KV
                    label={`Room ${i + 1} guests`}
                    value={`${rg.noOfAdults} Adult${rg.noOfAdults !== 1 ? "s" : ""}${
                      rg.noOfChild > 0
                        ? `, ${rg.noOfChild} Child${rg.noOfChild !== 1 ? "ren" : ""}`
                        : ""
                    }`}
                  />
                  <KV
                    label="Nationality"
                    value={raw.hotelRequest?.guestNationality}
                  />
                  <KV
                    label="Currency"
                    value={raw.hotelRequest?.preferredCurrency}
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Room Details — one card per rawRoomData entry */}
          <Section
            title={`Room Details (${rawRoomDataArr.length} room${rawRoomDataArr.length !== 1 ? "s" : ""})`}
            icon={<FiKey size={11} />}
          >
            <div className="space-y-4">
              {rawRoomDataArr.map((rd, ri) => {
                const roomNames = rd.Name || [];
                const dayRates = rd.DayRates?.[0] || [];
                return (
                  <div
                    key={ri}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-500">
                        Room {ri + 1}
                      </span>
                      {roomNames.map((n, ni) => (
                        <span
                          key={ni}
                          className="text-xs text-gray-700 font-medium"
                        >
                          {n}
                          {ni < roomNames.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <KV label="Meal type" value={rd.MealType} />
                        <KV
                          label="Refundable"
                          value={rd.IsRefundable ? "Yes" : "No"}
                        />
                        <KV
                          label="Transfers"
                          value={rd.WithTransfers ? "Yes" : "No"}
                        />
                        <KV label="Total fare" value={inr(rd.TotalFare)} />
                        <KV label="Tax" value={inr(rd.TotalTax)} />
                        <KV
                          label="Base fare"
                          value={inr((rd.TotalFare || 0) - (rd.TotalTax || 0))}
                        />
                        {rd.BeddingGroup && (
                          <div className="col-span-full">
                            <KV label="Bedding note" value={rd.BeddingGroup} />
                          </div>
                        )}
                      </div>

                      {/* Inclusions */}
                      {rd.Inclusion && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-400 mb-2">
                            Inclusions
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rd.Inclusion.split(",").map((item, ii) => (
                              <span
                                key={ii}
                                className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-100 text-green-700 text-xs rounded-lg"
                              >
                                <FiCheckCircle size={9} /> {item.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Promotions */}
                      {(rd.RoomPromotion || []).length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-400 mb-2">
                            Promotions
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rd.RoomPromotion.map((p, pi) => (
                              <span
                                key={pi}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg"
                              >
                                <FiTag size={9} /> {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Day rates */}
                      {dayRates.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">
                            Day rates
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {dayRates.map((d, di) => (
                              <div
                                key={di}
                                className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                              >
                                <p className="text-[10px] text-gray-400">
                                  Night {di + 1}
                                </p>
                                <p className="text-sm font-medium text-gray-800">
                                  {inr(d.BasePrice)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Pricing Summary */}
          <Section title="Pricing Summary" icon={<FiDollarSign size={11} />}>
            <div className="bg-[#0A4D68] rounded-xl p-5 text-white">
              <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">
                Total (incl. tax)
              </p>
              <p className="text-3xl font-bold mt-1">
                {pricing.currency}{" "}
                {Number(pricing.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-[10px] opacity-40 mt-1">
                Captured: {fmtDT(pricing.capturedAt)}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-[10px] uppercase opacity-50">Base fare</p>
                  <p className="font-medium text-sm mt-0.5">
                    {pricing.currency}{" "}
                    {Number(baseFare).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Tax</p>
                  <p className="font-medium text-sm mt-0.5">
                    {pricing.currency}{" "}
                    {Number(selectedRoom.totalTax || 0).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Per night</p>
                  <p className="font-medium text-sm mt-0.5">
                    {rawRoomDataArr[0]?.Price?.perNight
                      ? `${pricing.currency} ${Number(
                          rawRoomDataArr[0].Price.perNight,
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Cancellation Policy */}
          {cancelPolicies.length > 0 && (
            <Section title="Cancellation Policy" icon={<FiShield size={11} />}>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["From date", "Charge type", "Penalty", "Status"].map(
                        (h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-gray-400 ${
                              i >= 2 ? "text-right" : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cancelPolicies.map((p, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">
                          {p.FromDate}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {p.ChargeType}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {p.CancellationCharge === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            <span className="text-red-600">
                              {p.ChargeType === "Percentage"
                                ? `${p.CancellationCharge}%`
                                : inr(p.CancellationCharge)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.CancellationCharge === 0 ? (
                            <Chip color="green">No charge</Chip>
                          ) : (
                            <Chip color="red">Charged</Chip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Travellers */}
          <Section
            title={`Travellers (${travelers.length})`}
            icon={<FiUser size={11} />}
          >
            <div className="space-y-3">
              {travelers.map((pax, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        initials={`${pax.firstName?.[0] || ""}${
                          pax.lastName?.[0] || ""
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {pax.title} {pax.firstName} {pax.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium mt-0.5 capitalize">
                          {pax.paxType} · {pax.gender}
                        </p>
                      </div>
                    </div>
                    {pax.isLeadPassenger && (
                      <Chip color="blue">Lead traveller</Chip>
                    )}
                  </div>
                  <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <KV label="Date of birth" value={fmt(pax.dob)} />
                    <KV
                      label="Age"
                      value={pax.age ? `${pax.age} years` : "—"}
                    />
                    <KV label="Nationality" value={pax.nationality} />
                    {pax.email && (
                      <KV
                        label="Email"
                        value={pax.email}
                        icon={<FiMail size={10} />}
                      />
                    )}
                    {pax.phoneWithCode && (
                      <KV
                        label="Phone"
                        value={`+${pax.phoneWithCode}`}
                        icon={<FiPhone size={10} />}
                      />
                    )}
                    {pax.panCard && <KV label="PAN" value={pax.panCard} mono />}
                    {pax.PassportNo && (
                      <KV label="Passport" value={pax.PassportNo} mono />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Booking Confirmation */}
          {bookRes.hotelBookingId && (
            <Section
              title="Booking Confirmation"
              icon={<FiCheckCircle size={11} />}
            >
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <KV
                  label="Confirmation no."
                  value={bookResult.ConfirmationNo || bookRes.hotelBookingId}
                  mono
                />
                <KV label="Booking ID" value={bookRes.hotelBookingId} mono />
                {bookResult.InvoiceNumber && (
                  <KV
                    label="Invoice no."
                    value={bookResult.InvoiceNumber}
                    mono
                  />
                )}
                {bookResult.BookingRefNo && (
                  <KV
                    label="Booking ref."
                    value={bookResult.BookingRefNo}
                    mono
                  />
                )}
                {bookResult.HotelBookingStatus && (
                  <KV
                    label="Booking status"
                    value={bookResult.HotelBookingStatus}
                  />
                )}
                {bookResult.VoucherStatus != null && (
                  <KV
                    label="Voucher"
                    value={bookResult.VoucherStatus ? "Generated" : "Pending"}
                  />
                )}
                {bookResult.IsPriceChanged != null && (
                  <KV
                    label="Price changed"
                    value={bookResult.IsPriceChanged ? "Yes" : "No"}
                  />
                )}
              </div>
            </Section>
          )}

          {/* Amendment Details */}
          {amendment.changeRequestId && (
            <Section
              title="Amendment Details"
              icon={<FiAlertCircle size={11} />}
            >
              <div className="border border-amber-100 bg-amber-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <KV
                    label="Change request ID"
                    value={amendment.changeRequestId}
                    mono
                  />
                  <KV
                    label="Status"
                    value={amendment.status?.replace(/_/g, " ")}
                  />
                  <KV
                    label="Requested at"
                    value={fmtDT(amendment.requestedAt)}
                  />
                  {amendRes.CreditNoteNo && (
                    <KV
                      label="Credit note no."
                      value={amendRes.CreditNoteNo}
                      mono
                    />
                  )}
                  {amendRes.RefundedAmount != null && (
                    <KV
                      label="Refunded amount"
                      value={inr(amendRes.RefundedAmount)}
                    />
                  )}
                  {amendRes.TotalPrice != null && (
                    <KV label="Total price" value={inr(amendRes.TotalPrice)} />
                  )}
                  {amendRes.CreditNoteCreatedOn && (
                    <KV
                      label="Credit note date"
                      value={fmtDT(amendRes.CreditNoteCreatedOn)}
                    />
                  )}
                  {amendRes.ZendeskTicketId && (
                    <KV
                      label="Zendesk ticket"
                      value={`#${amendRes.ZendeskTicketId}`}
                      mono
                    />
                  )}
                  {amendment.amendmentType && (
                    <KV
                      label="Amendment type"
                      value={amendment.amendmentType}
                    />
                  )}
                  {amendment.lastCheckedAt && (
                    <KV
                      label="Last checked"
                      value={fmtDT(amendment.lastCheckedAt)}
                    />
                  )}
                </div>

                {amendment.remarks && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Remarks</p>
                    <p className="text-sm text-gray-700 bg-white border border-amber-100 rounded-lg px-3 py-2">
                      {amendment.remarks}
                    </p>
                  </div>
                )}

                {amendRes.CancellationChargeBreakUp && (
                  <div className="pt-3 border-t border-amber-100 grid grid-cols-2 gap-4">
                    <KV
                      label="Cancellation fees"
                      value={inr(
                        amendRes.CancellationChargeBreakUp.CancellationFees,
                      )}
                    />
                    <KV
                      label="Service charge"
                      value={inr(
                        amendRes.CancellationChargeBreakUp
                          .CancellationServiceCharge,
                      )}
                    />
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Booking Meta */}
          <Section title="Booking Meta" icon={<FiTag size={11} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4 mb-3">
              <KV label="Booking ID" value={raw._id} mono />
              <KV
                label="Corporate"
                value={corporateId?.corporateName || raw.corporateId}
              />
              <KV label="Purpose of travel" value={raw.purposeOfTravel} />
              {raw.projectName && (
                <KV label="Project name" value={raw.projectName} />
              )}
              {raw.projectId && (
                <KV label="Project ID" value={raw.projectId} mono />
              )}
              {raw.projectClient && (
                <KV label="Project client" value={raw.projectClient} />
              )}
              <KV label="Approver" value={raw.approverName} />
              <KV label="Approver email" value={raw.approverEmail} />
              <KV label="Approver role" value={raw.approverRole} />
              {raw.approvedAt && (
                <KV label="Approved at" value={fmtDT(raw.approvedAt)} />
              )}
              {raw.approverComments && raw.approverComments !== "true" && (
                <KV label="Approver comments" value={raw.approverComments} />
              )}
              <KV label="Created at" value={fmtDT(raw.createdAt)} />
              <KV label="Updated at" value={fmtDT(raw.updatedAt)} />
            </div>

            {/* GST Details */}
            {raw.gstDetails?.gstin && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">
                  GST Details
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KV label="GSTIN" value={raw.gstDetails.gstin} mono />
                  <KV label="Legal name" value={raw.gstDetails.legalName} />
                  <KV label="GST address" value={raw.gstDetails.address} />
                </div>
              </div>
            )}
          </Section>

          {/* Hotel Images */}
          {allImages.length > 0 && (
            <Section
              title={`Hotel images (${allImages.length})`}
              icon={<FiHome size={11} />}
            >
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {allImages.slice(0, 12).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Hotel ${i + 1}`}
                    className="h-28 w-44 object-cover rounded-xl border border-gray-100 shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p className="text-[11px] text-gray-400 font-mono">
            Ref:{" "}
            <span className="text-gray-600 font-medium">
              {raw.bookingReference}
            </span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
