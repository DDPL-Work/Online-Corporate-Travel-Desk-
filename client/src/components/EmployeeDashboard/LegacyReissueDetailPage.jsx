import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiEye,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
  FiRefreshCw,
  FiTag,
  FiFileText,
  FiCalendar,
  FiClock,
  FiShield,
  FiStar,
  FiXCircle,
  FiMail,
  FiPhone,
  FiInfo,
  FiActivity,
  FiRepeat,
} from "react-icons/fi";
import { MdFlightTakeoff, MdReceipt, MdFlight } from "react-icons/md";
import {
  fetchLegacyReissueRequestById,
  updateReissueStatus,
} from "../../Redux/Actions/reissueThunks";
import {
  getRequestId,
  getPnr,
  getUserName,
  getUserEmail,
  getCorporateName,
  getRequestedDate,
  getStatus,
  resolvePayload,
  resolveAirline,
  resolveDeparture,
  resolveArrival,
  resolveDuration,
  resolveJourneyType,
  resolveCabinClass,
  resolveTotalFare,
  resolveOldFare,
  resolveNewFare,
  resolveFareDifference,
  resolveRefund,
  resolveReissueCharge,
  resolveBookingRef,
  resolvePrimarySegment,
  resolveDisplayRoute,
  resolveWorkflowType,
} from "../../utils/reissueResolvers";
import { airlineLogo } from "../../utils/formatter";

/* ────────────────────────────────────────────────────────────── */
/*  FORMATTERS                                                    */
/* ────────────────────────────────────────────────────────────── */
const formatCurrency = (val, currency = "INR") => {
  if (!val && val !== 0) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFlightDate = (d) => {
  if (!d) return "—";
  const dateObj = new Date(d);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${weekday}, ${day} ${month}`;
};

const formatFlightTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
};


/* ────────────────────────────────────────────────────────────── */
/*  SHARED COMPONENTS (MATCHING THE WARM PALETTE OF REFERENCE)     */
/* ────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    CONFIRMED: "bg-green-100 text-green-800 border border-green-200",
    PENDING: "bg-amber-100 text-amber-800 border border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    REJECTED: "bg-red-100 text-red-800 border border-red-200",
    RAISED: "bg-amber-100 text-amber-800 border border-amber-200",
    ASSIGNED: "bg-blue-100 text-blue-800 border border-blue-200",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border border-blue-200",
    TICKET_GENERATED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    FAILED: "bg-red-100 text-red-800 border border-red-200",
  };
  const key = status?.toUpperCase() || "PENDING";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
        map[key] || "bg-slate-100 text-slate-800 border border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, value, accent, mono }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#E0D8C8]/60 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-[#A07840]" : "text-gray-800"} ${
          mono ? "font-mono tracking-wide" : ""
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function LegacyReissueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { requestDetail: requestData, detailLoading, error } = useSelector((s) => s.reissue);
  const userRole = useSelector((s) => s.auth?.user?.role);
  const sessionRole =
    sessionStorage.getItem("userRole") || sessionStorage.getItem("role");
  const role = userRole || sessionRole;

  useEffect(() => {
    if (id) {
      dispatch(fetchLegacyReissueRequestById(id));
    }
  }, [id, dispatch]);

  const handleDownloadTicket = async (url, uid) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `reissue-ticket-${uid}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download ticket:", err);
      window.open(url, "_blank");
    }
  };

  if (detailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#A07840] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !requestData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <FiXCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          {error || "We could not locate the details for this reissue request."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow"
        >
          <FiArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  const req = resolvePayload(requestData);
  const uid = getRequestId(req);
  const pnr = getPnr(req);
  const ref = resolveBookingRef(req);

  const empName =
    req?.requesterDetails?.name ||
    req?.employee?.name ||
    req?.user?.name ||
    req?.metadata?.employeeName ||
    req?.corporate?.employeeName ||
    getUserName(req);
  const email = getUserEmail(req);
  const corporateName = getCorporateName(req);
  const reason =
    req.reason ||
    req.remarks ||
    req.resolutionNote ||
    req.metadata?.reason ||
    "No reason provided";
  const type = resolveWorkflowType(req);
  const date = getRequestedDate(req);
  const status = getStatus(req);

  const bookingInfo = {
    journeyType: resolveJourneyType(req),
    airline: resolveAirline(req),
    flightNumber:
      req?.displayInfo?.flightNumber ||
      resolvePrimarySegment(req)?.flightNumber ||
      req?.selectedFlight?.flightNumber ||
      req?.bookingSnapshot?.flightNumber ||
      req?.preferredJourney?.flightNumber ||
      "N/A",
    route: (() => {
      if (req?.displayInfo?.route) return req.displayInfo.route;
      const seg = resolvePrimarySegment(req);
      const lastSeg =
        (Array.isArray(req?.selectedSegments) && req.selectedSegments.length > 0
          ? req.selectedSegments[req.selectedSegments.length - 1]
          : null) ||
        (Array.isArray(req?.segments) && req.segments.length > 0
          ? req.segments[req.segments.length - 1]
          : null) ||
        seg;
      const o = seg?.origin || req?.preferredJourney?.origin || req?.origin;
      const d =
        lastSeg?.destination ||
        req?.preferredJourney?.destination ||
        req?.destination;
      if (o && d) return `${o} → ${d}`;
      if (req?.metadata?.selectedRoute)
        return req.metadata.selectedRoute.replace(/-/g, " → ");
      return "N/A";
    })(),
    departure: resolveDeparture(req),
    arrival: resolveArrival(req),
    duration: resolveDuration(req),
    stops:
      req?.displayInfo?.stops ??
      resolvePrimarySegment(req)?.stops ??
      req?.preferredJourney?.stops ??
      req?.selectedFlight?.stops ??
      0,
    cabin: resolveCabinClass(req),
    fare: resolveNewFare(req),
    oldFare: resolveOldFare(req),
    fareDifference: resolveFareDifference(req),
    reissueCharge: resolveReissueCharge(req),
    refund: resolveRefund(req),
    totalEstimate: resolveTotalFare(req),
    currency:
      req?.displayInfo?.currency ||
      req?.currency ||
      req?.reissuePricingSnapshot?.currency ||
      req?.preferredJourney?.currency ||
      "INR",
  };
  bookingInfo.route = resolveDisplayRoute(req);

  const passengers = (() => {
    const bookingObj = req.bookingId || req.booking;
    const travellersList = bookingObj?.travellers || [];
    
    if (travellersList.length > 0) {
      return travellersList.map((t, idx) => {
        const segmentAddInfo = bookingObj?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.[idx];
        const ticketNo = segmentAddInfo?.Ticket?.TicketNumber || t.ticketNumber || "";
        
        return {
          name: `${t.title || ""} ${t.firstName || ""} ${t.lastName || ""}`.trim() || t.name,
          type: t.paxType || t.type || "Adult",
          ticketNumber: ticketNo || req.passengers?.[idx]?.ticketNumber,
        };
      });
    }
    
    if (Array.isArray(req.passengers) && req.passengers.length > 0) {
      return req.passengers;
    }
    
    return [];
  })();
  const segments = Array.isArray(req.selectedSegments)
    ? req.selectedSegments
    : Array.isArray(req.segments)
      ? req.segments
      : [];

  const originCode = segments[0]?.origin || bookingInfo.route.split("→")[0]?.trim() || "DEL";
  const destCode = segments[segments.length - 1]?.destination || bookingInfo.route.split("→")[1]?.trim() || "CCU";

  const resolveAirportDetails = (code, isOrigin) => {
    const bookingObj = req?.bookingId || req?.booking;
    const tboSegs = bookingObj?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segments || [];
    const match = tboSegs.find(s => {
      const segCode = isOrigin 
        ? (s?.Origin?.Airport?.AirportCode || s?.Origin?.AirportCode) 
        : (s?.Destination?.Airport?.AirportCode || s?.Destination?.AirportCode);
      return segCode === code;
    });

    if (match) {
      const airport = isOrigin ? match.Origin?.Airport : match.Destination?.Airport;
      if (airport) {
        return {
          code,
          name: airport.AirportName || "",
          terminal: airport.Terminal || "",
          city: airport.CityName || airport.CityCode || "",
        };
      }
    }

    if (code === "DEL") {
      return { code, name: "Indira Gandhi Airport", terminal: "1D", city: "Delhi" };
    }
    if (code === "CCU") {
      return { code, name: "Netaji Subhash Chandra Bose International Airport", terminal: "2", city: "Kolkata" };
    }
    if (code === "BOM") {
      return { code, name: "Chhatrapati Shivaji Maharaj International Airport", terminal: "2", city: "Mumbai" };
    }
    if (code === "BLR") {
      return { code, name: "Kempegowda International Airport", terminal: "1", city: "Bengaluru" };
    }
    if (code === "MAA") {
      return { code, name: "Chennai International Airport", terminal: "1", city: "Chennai" };
    }
    if (code === "HYD") {
      return { code, name: "Rajiv Gandhi International Airport", terminal: "1", city: "Hyderabad" };
    }

    return {
      code,
      name: isOrigin ? "Origin Airport" : "Destination Airport",
      terminal: "",
      city: code,
    };
  };

  const originDetails = resolveAirportDetails(originCode, true);
  const destDetails = resolveAirportDetails(destCode, false);

  const rawCabinBaggage = segments[0]?.cabinBaggage || segments[0]?.CabinBaggage || req?.bookingId?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segments?.[0]?.CabinBaggage || "";
  const rawCheckInBaggage = segments[0]?.baggage || segments[0]?.Baggage || req?.bookingId?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segments?.[0]?.Baggage || "";

  const getCabinBaggageLabel = (val) => {
    if (!val) return "7 Kg Cab";
    const clean = val.toString().replace(/cab/gi, "").replace(/bag/gi, "").trim();
    return `${clean} Cab`;
  };
  const getCheckInBaggageLabel = (val) => {
    if (!val) return "15KG Check";
    const clean = val.toString().replace(/check/gi, "").replace(/in/gi, "").replace(/bag/gi, "").trim();
    return `${clean} Check`;
  };

  const cabinBaggage = getCabinBaggageLabel(rawCabinBaggage);
  const checkInBaggage = getCheckInBaggageLabel(rawCheckInBaggage);

  const lifecycleSteps = [
    {
      label: "Original Booking Created",
      date: req.bookingId?.createdAt,
      desc: "Original flight booking request submitted.",
      active: true,
      icon: <FiClock size={12} />,
    },
    {
      label: "Booking Approved",
      date: req.bookingId?.approvedAt,
      desc: "Original booking approved by corporate approver.",
      active: !!req.bookingId?.approvedAt,
      icon: <FiCheckCircle size={12} />,
    },
    {
      label: "Original Ticket Issued",
      date: req.bookingId?.payment?.paidAt || req.bookingId?.createdAt,
      desc: `Original PNR ${pnr} generated.`,
      active: req.bookingId?.requestStatus === "approved" || req.bookingId?.isReissued,
      icon: <FiTag size={12} />,
    },
    {
      label: "Reissue Requested",
      date: req.createdAt,
      desc: "Offline reissue request submitted.",
      active: true,
      icon: <FiRepeat size={12} />,
    },
    {
      label: "Reissue Ticketed",
      date: (status === "TICKET_GENERATED" || status === "COMPLETED")
        ? (req.generatedAt || req.timeline?.find(t => t.eventType === "TICKET_GENERATED")?.at || req.updatedAt)
        : null,
      desc: (status === "TICKET_GENERATED" || status === "COMPLETED")
        ? "Revised ticket generated and reissue completed."
        : "Revised ticket generation pending.",
      active: status === "TICKET_GENERATED" || status === "COMPLETED",
      icon: <FiCheckCircle size={12} />,
    },
  ];

  const sortedSteps = lifecycleSteps
    .filter(s => s.date || s.label === "Reissue Ticketed")
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });


  const ticketUrl =
    req?.revisedTicketUrl ||
    req?.generatedTicketUrl ||
    req?.downloadEndpoints?.ticket ||
    req?.timeline?.find((t) => t?.metadata?.generatedTicketUrl)?.metadata
      ?.generatedTicketUrl ||
    req?.reissueHistory?.[0]?.pdfUrl ||
    null;

  const handleStatusUpdate = async (newStatus) => {
    try {
      const resultAction = await dispatch(
        updateReissueStatus({
          requestId: req._id || req.id || id,
          status: newStatus,
          message: `Request ${newStatus.toLowerCase()} by corporate admin`,
          actionBy: req.user?.id || "",
          actionByName: empName || "Admin",
        })
      );
      if (updateReissueStatus.fulfilled.match(resultAction)) {
        toast.success(`Request successfully ${newStatus.toLowerCase()}`);
        dispatch(fetchLegacyReissueRequestById(id));
      } else {
        toast.error(resultAction.payload || `Failed to update status to ${newStatus}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="w-full px-4 lg:px-10 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {ref && ref !== "N/A" && (
                <span className="text-xs text-gray-500 font-mono border-r border-gray-200 pr-3 hidden sm:inline">
                  <span className="font-semibold text-gray-700">Order ID:</span> <span className="font-bold text-gray-900">{ref}</span>
                </span>
              )}
              <span className="text-xs text-gray-500 font-mono">
                <span className="font-semibold text-gray-700">Request ID:</span> <span className="font-bold text-gray-900">{uid}</span>
              </span>
              <StatusPill status={status} />
            </div>

            {ticketUrl && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-1">
                <button
                  onClick={() => handleDownloadTicket(ticketUrl, uid)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition shadow-sm"
                >
                  <FiDownload size={13} className="text-teal-400" />
                  Download Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="w-full px-4 lg:px-10 py-8 pb-24 space-y-6">
        {/* Reservation Details Title */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
            Reissue Request Details
          </p>
          <h1 className="text-[36px] font-black text-gray-900 tracking-tight leading-none mb-3">
            {status === "COMPLETED" || status === "TICKET_GENERATED"
              ? "Reissue completed."
              : status === "REJECTED"
              ? "Reissue rejected."
              : "Reissue processing."}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            A clean, single-page record of your flight reissue details, passenger updates, pricing and timeline.
          </p>
        </div>

        {/* Flight Card (Warm golden bg matching BookingDetails) */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E0D8C8] overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E0D8C8]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#8B7355] text-xs font-bold">↗</span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                {bookingInfo.journeyType === "return" ? "Return" : "One-Way"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {pnr && (
                <span className="inline-flex items-center gap-1.5 bg-[#0F172A] text-white rounded-full px-3 py-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">PNR</span>
                  <span className="font-mono text-[12px] font-bold text-white">{pnr}</span>
                </span>
              )}
              <span className="text-[11px] text-[#8B7355] font-medium tracking-wide">
                {bookingInfo.airline} · {bookingInfo.flightNumber} · {bookingInfo.cabin || "Economy"}
              </span>
            </div>
          </div>

          {/* Main Flight Info Row */}
          <div className="px-5 pt-5 pb-2">
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-4">
              {/* Origin */}
              <div className="w-full md:w-auto text-center md:text-left">
                <p className="text-[11px] font-bold text-[#8B7355] uppercase tracking-wider mb-2">
                  {formatFlightDate(bookingInfo.departure)}
                </p>
                <p className="text-[32px] md:text-[44px] font-black tracking-tight leading-none text-[#0F172A]">
                  {formatFlightTime(bookingInfo.departure)}
                </p>
                <div className="flex flex-col gap-0.5 mt-2">
                  <div className="flex items-baseline gap-1.5 justify-center md:justify-start">
                    <span className="text-[15px] font-bold text-gray-900 uppercase">
                      {originDetails.code}
                    </span>
                    <span className="text-[12px] text-gray-500 font-medium uppercase">
                      {originDetails.city}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-tight">
                    {originDetails.name}
                  </p>
                  {originDetails.terminal && (
                    <p className="text-[10px] text-[#8B7355] font-bold uppercase tracking-wider mt-0.5">
                      TERMINAL {originDetails.terminal}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector */}
              <div className="flex flex-col items-center gap-1 min-w-40">
                <span className="text-[10px] font-semibold text-gray-500">
                  {bookingInfo.duration || "Duration N/A"}
                </span>
                <div className="flex items-center w-full gap-0 my-1">
                  <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
                  <MdFlight size={16} className="text-[#7E8CF0] transform rotate-90 mx-1 shrink-0" />
                  <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
                </div>
                <span className="text-[10px] font-bold text-[#8B7355] uppercase tracking-wider">
                  {bookingInfo.stops > 0 ? `${bookingInfo.stops} STOP` : "NON-STOP"}
                </span>
              </div>

              {/* Destination */}
              <div className="w-full md:w-auto text-center md:text-right">
                <p className="text-[11px] font-bold text-[#8B7355] uppercase tracking-wider mb-2">
                  {formatFlightDate(bookingInfo.arrival)}
                </p>
                <p className="text-[32px] md:text-[44px] font-black tracking-tight leading-none text-[#0F172A]">
                  {formatFlightTime(bookingInfo.arrival)}
                </p>
                <div className="flex flex-col gap-0.5 mt-2">
                  <div className="flex items-baseline gap-1.5 justify-center md:justify-end">
                    <span className="text-[12px] text-gray-500 font-medium uppercase">
                      {destDetails.city}
                    </span>
                    <span className="text-[15px] font-bold text-gray-900 uppercase">
                      {destDetails.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-tight">
                    {destDetails.name}
                  </p>
                  {destDetails.terminal && (
                    <p className="text-[10px] text-[#8B7355] font-bold uppercase tracking-wider mt-0.5">
                      TERMINAL {destDetails.terminal}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Segment layover details if multiple */}
            {segments.length > 1 && (
              <div className="mt-4 space-y-2">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                     className="flex items-center gap-3 bg-white/60 border border-[#E0D8C8] rounded-xl px-4 py-2.5"
                  >
                     <span className="text-[#A07840] text-xs shrink-0">◎</span>
                     <div className="flex-1 min-w-0">
                       <span className="text-[13px] font-semibold text-gray-800">
                         {seg.origin} → {seg.destination}
                       </span>
                       <span className="text-[12px] text-[#8B7355] font-medium ml-1.5 uppercase tracking-wide">
                         {seg.airline || seg.airlineName} {seg.flightNumber}
                       </span>
                     </div>
                     <div className="flex items-center gap-3 text-[11px] text-[#8B7355] shrink-0">
                       <span className="font-medium">
                         Dep: {formatDateTime(seg.departureTime)}
                       </span>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="px-5 pb-5 pt-2 flex items-center gap-2.5">
            {originDetails.terminal && (
              <span className="text-[11px] font-bold text-[#8B7355] bg-white border border-[#E0D8C8] px-3.5 py-1 rounded-full">
                {originDetails.terminal.startsWith("T") || originDetails.terminal.startsWith("t") ? originDetails.terminal.toUpperCase() : `T${originDetails.terminal}`}
              </span>
            )}
            <span className="text-[11px] font-bold text-[#8B7355] bg-white border border-[#E0D8C8] px-3.5 py-1 rounded-full">
              {cabinBaggage}
            </span>
            <span className="text-[11px] font-bold text-[#8B7355] bg-white border border-[#E0D8C8] px-3.5 py-1 rounded-full">
              {checkInBaggage}
            </span>
          </div>
        </div>

        {/* Passengers (styled precisely as table in BookingDetails.jsx) */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Passengers · {passengers.length}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Listed once for the reissue
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E0D0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#E8E0D0] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                    <th className="px-6 py-4">Passenger Name</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Ticket Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {passengers.map((trav, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0 border border-[#E0D8C8]">
                            <FiUser size={16} className="text-[#A07840]" />
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-gray-900 leading-none">
                              {trav.name || `Passenger ${idx + 1}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {trav.type || "Adult"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {trav.ticketNumber ? (
                          <span className="text-[11px] font-mono font-bold bg-gray-900 text-white px-2.5 py-1 rounded shadow-sm">
                            {trav.ticketNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No tickets issued</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {passengers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic text-sm">
                        No passengers listed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        {!(role === "employee" || role === "manager") && (
          <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
            <div className="flex items-center gap-2 mb-4">
              <MdReceipt size={13} className="text-[#A07840]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                Fare Breakdown & Comparison
              </span>
            </div>

            {/* Visual Old vs New Fare Comparison Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-white border border-[#E8E0D0] rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Old Ticket Fare</span>
                  <div className="text-xl font-black text-gray-800 mt-1">
                    {formatCurrency(bookingInfo.oldFare, bookingInfo.currency)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 mt-2 font-semibold">Original ticket price.</div>
              </div>

              <div className="bg-white border border-[#E8E0D0] rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Flight Fare</span>
                  <div className="text-xl font-black text-[#A07840] mt-1">
                    {formatCurrency(bookingInfo.fare, bookingInfo.currency)}
                  </div>
                </div>
                <div className="text-[11px] mt-2 font-bold">
                  {bookingInfo.fare < bookingInfo.oldFare ? (
                    <span className="text-emerald-600">
                      Cheaper by {formatCurrency(bookingInfo.oldFare - bookingInfo.fare, bookingInfo.currency)}
                    </span>
                  ) : bookingInfo.fare > bookingInfo.oldFare ? (
                    <span className="text-rose-600">
                      Higher by {formatCurrency(bookingInfo.fare - bookingInfo.oldFare, bookingInfo.currency)}
                    </span>
                  ) : (
                    <span className="text-gray-400">No difference.</span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#A07840]/30 rounded-xl p-4 flex flex-col justify-between shadow-sm bg-amber-50/5">
                <div>
                  <span className="text-[10px] font-bold text-[#A07840] uppercase tracking-wider">Fare Difference</span>
                  <div className="text-xl font-black text-gray-900 mt-1">
                    {formatCurrency(bookingInfo.fareDifference, bookingInfo.currency)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 mt-2 font-semibold">
                  {bookingInfo.refund > 0 ? (
                    <span className="text-emerald-600">
                      Refund estimate: {formatCurrency(bookingInfo.refund, bookingInfo.currency)}
                    </span>
                  ) : (
                    <span>Excluding penalties.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8E0D0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E8E0D0] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[13px]">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">New Flight Fare</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        {formatCurrency(bookingInfo.fare, bookingInfo.currency)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">Less: Old Ticket Fare (Credit)</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-500">
                        -{formatCurrency(bookingInfo.oldFare, bookingInfo.currency)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">Fare Difference</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(bookingInfo.fareDifference, bookingInfo.currency)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">Airline Reissue Penalty</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(bookingInfo.reissueCharge, bookingInfo.currency)}
                      </td>
                    </tr>
                    {bookingInfo.refund > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 font-medium">Adjusted Refund Estimate</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                          -{formatCurrency(bookingInfo.refund, bookingInfo.currency)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50/80 font-semibold border-t border-[#E8E0D0]">
                      <td className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Total Collection</td>
                      <td className="px-6 py-4 text-right text-base font-black text-gray-900">
                        {formatCurrency(bookingInfo.totalEstimate, bookingInfo.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reason for Request */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo size={13} className="text-[#A07840]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Reason for Request
            </span>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 text-[13px] text-gray-700 leading-relaxed font-medium">
            {reason}
          </div>
        </div>

        {/* Request Information (BookingSummaryCard look) */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiBriefcase size={13} className="text-[#A07840]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Request Information
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <InfoRow label="Employee Name" value={empName} />
            <InfoRow label="Email Address" value={email} />
            {corporateName && corporateName !== "N/A" && (
              <InfoRow label="Company Name" value={corporateName} />
            )}
            <InfoRow label="Reissue Type" value={type} />
            <InfoRow label="Requested At" value={date} />
            {ref && <InfoRow label="Booking Ref" value={ref} mono />}
          </div>
        </div>

        {/* Timeline (BookingHistory look with gold gradient line) */}
        {sortedSteps.length > 0 && (
          <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#A07840]/10 flex items-center justify-center">
                <FiActivity size={14} className="text-[#A07840]" />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">Booking Lifecycle</h3>
                <p className="text-[10px] text-[#8B7355] font-bold uppercase tracking-widest mt-0.5">Audit Trail & Timeline</p>
              </div>
            </div>

            <div className="relative pl-1.5">
              <div className="absolute left-[13px] top-3 bottom-3 w-[1.5px] bg-linear-to-b from-[#A07840]/40 via-[#E8E0D0] to-transparent" />
              
              <div className="space-y-8">
                {sortedSteps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-6">
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500 mt-0.5 ${
                      step.active ? "bg-[#A07840] text-white shadow-md shadow-[#A07840]/20" : "bg-white border-2 border-[#E8E0D0] text-[#D8CEB8]"
                    }`}>
                      {step.icon}
                    </div>

                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-3 mb-1.5">
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${step.active ? "text-gray-900" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        {step.date && step.active && (
                          <span className="text-[10px] font-semibold text-[#8B7355] bg-white border border-[#E8E0D0] px-2 py-0.5 rounded uppercase tracking-wide shadow-sm">
                            {formatDateTime(step.date)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Decision panel (Approvals) */}
        {status === "PENDING" && (role === "travel-admin" || role === "manager") && (
          <div className="bg-[#F5F0E8] rounded-2xl border border-amber-200 p-5 bg-amber-50/10">
            <div className="flex items-center gap-2 mb-4">
              <FiCheckCircle size={13} className="text-[#A07840]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                Decision Panel
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                This reissue request is currently pending your decision.
              </p>
              <div className="flex gap-3 max-w-sm">
                <button
                  onClick={() => handleStatusUpdate("APPROVED")}
                  className="flex-1 inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                >
                  <FiCheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate("REJECTED")}
                  className="flex-1 inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 transition shadow-sm"
                >
                  <FiXCircle size={14} /> Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
