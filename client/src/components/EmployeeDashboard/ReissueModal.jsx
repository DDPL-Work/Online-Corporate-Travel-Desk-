import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiFileText,
  FiLoader,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  checkReissueEligibility,
  confirmReissueRequest,
  createOfflineReissueRequest,
  createReissueRequest,
  previewReissueQuote,
  searchOfflineReissueOptions,
} from "../../Redux/Actions/reissueThunks";
import {
  clearEligibility,
  clearOfflineSearchState,
  resetOfflineState,
  resetReissueState,
} from "../../Redux/Slice/reissueSlice";
import { fetchMyBookingById } from "../../Redux/Actions/booking.thunks";
import { airlineLogo } from "../../utils/formatter";

const STEP = {
  FORM: "FORM",
  SEARCH_RESULTS: "SEARCH_RESULTS",
  FARE_QUOTE: "FARE_QUOTE",
  CONFIRMATION: "CONFIRMATION",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
};

const OFFLINE_SEARCH_FALLBACK_MESSAGE =
  "We could not automatically load alternative flights for this booking. You can still submit an offline reissue request.";
const PLACEHOLDER = "--";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity).filter(Boolean);
  return [value].filter(Boolean);
};

const formatFlightTime = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatStops = (stops) => {
  if (Number(stops) <= 0) return "Non-stop";
  if (Number(stops) === 1) return "1 stop";
  return `${stops} stops`;
};

const formatDuration = (minutes) => {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "Duration unavailable";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const getCabinLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Economy";
  if (normalized.includes("business")) return "Business";
  if (normalized.includes("premium economy")) return "Premium Economy";
  if (normalized.includes("first")) return "First Class";
  return "Economy";
};

const getSegmentAirport = (segment, side) =>
  segment?.[side]?.Airport?.AirportCode ||
  segment?.[side]?.AirportCode ||
  segment?.[side]?.airportCode ||
  segment?.[side?.toLowerCase?.()] ||
  null;

const getSegmentTime = (segment, side) =>
  segment?.[side === "Origin" ? "Origin" : "Destination"]?.[side === "Origin" ? "DepTime" : "ArrTime"] ||
  segment?.[side === "Origin" ? "departureTime" : "arrivalTime"] ||
  segment?.[side === "Origin" ? "departureDateTime" : "arrivalDateTime"] ||
  null;

const getDurationFromSegments = (segments) =>
  toArray(segments).reduce((total, segment) => {
    const value = Number(segment?.Duration || segment?.durationMinutes || segment?.duration || 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);

const normalizeOnlineFlightOptions = ({ rawResults, oldFare }) => {
  return toArray(rawResults).map((result, index) => {
    const segments = toArray(result?.Segments?.[0] || result?.Segments || []);
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || first;
    const newFare = Number(
      result?.Fare?.PublishedFare ??
        result?.Fare?.OfferedFare ??
        result?.Fare?.BaseFare ??
        0,
    );
    const supplierCharge = Number(
      result?.Fare?.SupplierReissueCharges ??
        result?.SupplierReissueCharges ??
        0,
    );
    const fareDifference = Math.max(newFare - Number(oldFare || 0), 0);
    const totalCollection = fareDifference + supplierCharge;

    return {
      id: `${result?.ResultIndex ?? index}`,
      resultIndex: result?.ResultIndex ?? index,
      raw: result,
      airlineCode: first?.Airline?.AirlineCode || first?.AirlineCode || "",
      airlineName: first?.Airline?.AirlineName || first?.AirlineName || "Airline",
      flightNumber:
        first?.Airline?.FlightNumber || first?.FlightNumber || "",
      origin: getSegmentAirport(first, "Origin") || PLACEHOLDER,
      destination: getSegmentAirport(last, "Destination") || PLACEHOLDER,
      departureDate: getSegmentTime(first, "Origin"),
      departureTime: getSegmentTime(first, "Origin"),
      arrivalTime: getSegmentTime(last, "Destination"),
      durationMinutes: getDurationFromSegments(segments),
      duration: formatDuration(getDurationFromSegments(segments)),
      stops: Math.max(segments.length - 1, 0),
      cabin: getCabinLabel(
        result?.Fare?.CabinClass ||
          first?.CabinClass ||
          result?.ResultFareType,
      ),
      baggage:
        first?.Baggage ||
        first?.CabinBaggage ||
        result?.Fare?.BaggageAllowance ||
        PLACEHOLDER,
      oldFare: Number(oldFare || 0),
      newFare,
      fareDifference,
      reissueCharge: supplierCharge,
      totalCollection,
      currency: result?.Fare?.Currency || "INR",
      segments: segments.map((segment) => ({
        origin: getSegmentAirport(segment, "Origin"),
        destination: getSegmentAirport(segment, "Destination"),
        departureTime: getSegmentTime(segment, "Origin"),
        arrivalTime: getSegmentTime(segment, "Destination"),
        airlineCode: segment?.Airline?.AirlineCode || "",
        airlineName: segment?.Airline?.AirlineName || "Airline",
        flightNumber: segment?.Airline?.FlightNumber || segment?.FlightNumber || "",
        baggage: segment?.Baggage || segment?.CabinBaggage || null,
      })),
    };
  });
};

const extractRuleMessages = (rules) => {
  if (!rules) return [];
  const ruleArray = Array.isArray(rules) ? rules : Object.values(rules);
  return ruleArray
    .map((rule) => {
      if (!rule) return null;
      if (typeof rule === "string") return rule;
      return (
        rule?.Description ||
        rule?.Details ||
        rule?.Detail ||
        null
      );
    })
    .filter(Boolean)
    .slice(0, 4);
};

function StepBadge({ active, complete, label, number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-[#0A4D68] text-white"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {complete ? <FiCheckCircle size={14} /> : number}
      </span>
      <span className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? "text-slate-900" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

function PricingRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={strong ? "font-semibold text-slate-800" : "text-slate-500"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-slate-900" : "font-semibold text-slate-700"}>
        {value}
      </span>
    </div>
  );
}

function FlightOptionCard({
  option,
  selected,
  expanded,
  onToggleDetails,
  onSelect,
  mode,
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition ${
        selected
          ? "border-[#0A4D68] bg-[#f4fbff] shadow-[0_18px_50px_rgba(10,77,104,0.12)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <img
              src={airlineLogo(option.airlineCode)}
              alt={option.airlineCode || "Airline"}
              className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-contain p-2"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-slate-900">
                {option.airlineName || option.airlineCode || "Airline"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {option.airlineCode || PLACEHOLDER} {option.flightNumber || ""}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Route
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {option.origin || PLACEHOLDER} {"->"} {option.destination || PLACEHOLDER}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {formatDate(option.departureDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Schedule
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatFlightTime(option.departureTime)} {"->"} {formatFlightTime(option.arrivalTime)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {option.duration} {"|"} {formatStops(option.stops)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Cabin: {option.cabin || "Economy"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Baggage: {option.baggage || PLACEHOLDER}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-slate-100 bg-slate-50 p-4 xl:max-w-[340px]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            {mode === "ONLINE" ? "Online Reissue Estimate" : "Offline Reissue Estimate"}
          </p>
          <div className="mt-4 space-y-2">
            <PricingRow label="Current Ticket" value={formatMoney(option.oldFare, option.currency)} />
            <PricingRow label="New Flight" value={formatMoney(option.newFare, option.currency)} />
            <PricingRow label="Fare Difference" value={formatMoney(option.fareDifference, option.currency)} />
            <PricingRow label="Date Change Fee" value={formatMoney(option.reissueCharge, option.currency)} />
          </div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Total Additional Collection
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatMoney(option.totalCollection, option.currency)}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleDetails}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              View Details
            </button>
            <button
              type="button"
              onClick={onSelect}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "bg-[#0A4D68] text-white"
                  : "border border-[#0A4D68] text-[#0A4D68] hover:bg-[#eef8fc]"
              }`}
            >
              {selected ? "Selected Flight" : "Select Flight"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          {option.segments?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {option.segments.map((segment, index) => (
                <div
                  key={`${segment.origin}-${segment.destination}-${index}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {segment.origin || PLACEHOLDER} {"->"} {segment.destination || PLACEHOLDER}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatFlightTime(segment.departureTime)} {"->"} {formatFlightTime(segment.arrivalTime)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {segment.airlineName || segment.airlineCode || "Airline"}
                    {segment.flightNumber ? ` | ${segment.flightNumber}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              Detailed segment information is not available for this option.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessingState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef8fc] text-[#0A4D68]">
        <FiLoader size={28} className="animate-spin" />
      </div>
      <div>
        <p className="text-lg font-black text-slate-900">{label}</p>
        <p className="mt-2 text-sm text-slate-500">
          Please keep this window open while we complete the reissue workflow.
        </p>
      </div>
    </div>
  );
}

export default function ReissueModal({ booking, onClose }) {
  const dispatch = useDispatch();
  const {
    eligibility,
    eligibilityLoading,
    eligibilityError,
    createLoading,
    quoteLoading,
    confirmLoading,
    requestDetail,
    offlineCreateLoading,
    offlineSearchResults,
    offlineSearchPagination,
    offlineSearchLoading,
    offlineSearchError,
  } = useSelector((state) => state.reissue);

  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [currentStep, setCurrentStep] = useState(STEP.FORM);
  const [selectedOption, setSelectedOption] = useState(null);
  const [expandedOptionId, setExpandedOptionId] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [offlineSearchId, setOfflineSearchId] = useState(null);
  const [offlineFallback, setOfflineFallback] = useState(null);
  const [onlineSearchPayload, setOnlineSearchPayload] = useState(null);
  const [onlineOptions, setOnlineOptions] = useState([]);
  const [quoteSnapshot, setQuoteSnapshot] = useState(null);
  const [processingLabel, setProcessingLabel] = useState("Processing reissue...");
  const [successSnapshot, setSuccessSnapshot] = useState(null);

  const segments = Array.isArray(booking?.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];
  const isRoundTrip = segments.some(
    (segment) => (segment?.journeyType || "").toString().toLowerCase() === "return",
  );
  const oldFare = Number(booking?.pricingSnapshot?.totalAmount || 0);
  const isOnlineEligible = eligibility?.support?.onlineReissueAllowed === true;
  const showOfflineFlow = !isOnlineEligible || Boolean(offlineFallback);

  useEffect(() => {
    if (booking?._id) {
      dispatch(checkReissueEligibility(booking._id));
    }

    return () => {
      dispatch(clearEligibility());
      dispatch(clearOfflineSearchState());
      dispatch(resetReissueState());
      dispatch(resetOfflineState());
    };
  }, [booking?._id, dispatch]);

  useEffect(() => {
    setSelectedOption(null);
    setExpandedOptionId(null);
    setOnlineOptions([]);
    setQuoteSnapshot(null);
    setSuccessSnapshot(null);
    setOnlineSearchPayload(null);
    setCurrentStep(STEP.FORM);
    dispatch(clearOfflineSearchState());
  }, [departureDate, returnDate, showOfflineFlow, dispatch]);

  const quoteRules = useMemo(
    () => extractRuleMessages(quoteSnapshot?.miniFareRules),
    [quoteSnapshot?.miniFareRules],
  );

  const offlineSearchSummary = useMemo(() => {
    if (!selectedOption) return null;
    return {
      currency: selectedOption.currency || "INR",
      oldFare: selectedOption.oldFare,
      newFare: selectedOption.fare || selectedOption.newFare,
      fareDifference: selectedOption.fareDifference,
      reissueCharge: selectedOption.reissueCharge,
      totalCollection: selectedOption.totalEstimate,
    };
  }, [selectedOption]);

  const onlineQuoteSummary = useMemo(() => {
    if (!quoteSnapshot) return null;
    return {
      currency: quoteSnapshot?.billingReservation?.metadata?.currency || "INR",
      fareDifference: quoteSnapshot.fareDifference || 0,
      reissueCharge: quoteSnapshot.reissueCharges || 0,
      totalCollection: quoteSnapshot.totalAdjustment || 0,
    };
  }, [quoteSnapshot]);

  const canSearch =
    Boolean(departureDate) && (!isRoundTrip || Boolean(returnDate));
  const onlineStepIndex =
    currentStep === STEP.FORM
      ? 1
      : currentStep === STEP.SEARCH_RESULTS
        ? 2
        : currentStep === STEP.FARE_QUOTE
          ? 3
          : currentStep === STEP.CONFIRMATION
            ? 4
            : currentStep === STEP.PROCESSING
              ? 5
              : 6;

  const handleOnlineSearch = async (event) => {
    event?.preventDefault?.();
    if (!canSearch) {
      toast.error("Please select the required travel dates first.");
      return;
    }

    try {
      const response = await dispatch(
        createReissueRequest({
          bookingId: booking._id,
          newJourney: {
            departureDate,
            ...(isRoundTrip ? { returnDate } : {}),
          },
          remarks: remarks || "User requested reissue",
        }),
      ).unwrap();

      const routedOffline =
        response?.mode === "OFFLINE" ||
        response?.status === "OFFLINE_REQUIRED" ||
        response?.success === false;

      if (routedOffline) {
        setOfflineFallback({
          message:
            response?.message ||
            "Online reissue is unavailable for this booking. Please continue with offline servicing.",
        });
        setCurrentStep(STEP.FORM);
        return;
      }

      const normalized = normalizeOnlineFlightOptions({
        rawResults: response?.flightOptions,
        oldFare,
      });

      if (!normalized.length) {
        toast.error("No online reissue options were returned for the selected dates.");
        return;
      }

      setOnlineSearchPayload({
        requestId: response.reissueRequestId,
        reissueId: response.reissueId,
        miniFareRules: response.miniFareRules || [],
      });
      setOnlineOptions(normalized);
      setSelectedOption(null);
      setQuoteSnapshot(null);
      setCurrentStep(STEP.SEARCH_RESULTS);
    } catch (error) {
      toast.error(error || "Failed to search reissue options");
    }
  };

  const handleOfflineSearch = async (page = 1) => {
    if (!canSearch) {
      toast.error("Please select the required travel dates first.");
      return;
    }

    try {
      const response = await dispatch(
        searchOfflineReissueOptions({
          bookingId: booking._id,
          departureDate,
          returnDate: returnDate || undefined,
          page,
          limit: 10,
        }),
      ).unwrap();

      setOfflineSearchId(response.searchId);
      setSearchPage(page);
      setCurrentStep(STEP.SEARCH_RESULTS);
      setSelectedOption((currentSelection) => {
        if (!currentSelection) return null;
        return (
          response.results?.find(
            (option) =>
              String(option.resultIndex) === String(currentSelection.resultIndex),
          ) || null
        );
      });
    } catch (error) {
      toast.error(error || OFFLINE_SEARCH_FALLBACK_MESSAGE);
    }
  };

  const handlePreviewQuote = async () => {
    if (!selectedOption || !onlineSearchPayload?.requestId) {
      toast.error("Please select a flight before continuing.");
      return;
    }

    try {
      const response = await dispatch(
        previewReissueQuote({
          requestId: onlineSearchPayload.requestId,
          resultIndex: selectedOption.resultIndex,
        }),
      ).unwrap();
      setQuoteSnapshot(response);
      setCurrentStep(STEP.FARE_QUOTE);
    } catch (error) {
      toast.error(error || "Failed to get the final fare quote");
    }
  };

  const handleConfirmOnlineReissue = async () => {
    if (!onlineSearchPayload?.requestId) {
      toast.error("Reissue request context is missing. Please search again.");
      return;
    }

    try {
      setProcessingLabel("Confirming your online reissue...");
      setCurrentStep(STEP.PROCESSING);
      const response = await dispatch(
        confirmReissueRequest({
          requestId: onlineSearchPayload.requestId,
          remarks: remarks.trim() || undefined,
        }),
      ).unwrap();

      setSuccessSnapshot({
        type: "ONLINE",
        requestId: response.reissueId,
        pnr:
          response?.newPnr ||
          quoteSnapshot?.originalPnr ||
          booking?.pnr ||
          booking?.bookingResult?.pnr ||
          PLACEHOLDER,
      });
      await dispatch(fetchMyBookingById(booking._id));
      setCurrentStep(STEP.SUCCESS);
    } catch (error) {
      setCurrentStep(STEP.CONFIRMATION);
      toast.error(error || "Failed to confirm the reissue request");
    }
  };

  const submitOfflineRequest = async () => {
    if (!selectedOption) {
      toast.error("Please select a replacement flight before submitting.");
      return;
    }

    try {
      setProcessingLabel("Submitting your offline reissue request...");
      setCurrentStep(STEP.PROCESSING);
      const response = await dispatch(
        createOfflineReissueRequest({
          bookingId: booking._id,
          preferredDate: departureDate,
          remarks: remarks || "Employee requested offline reissue",
          preferredFlight: {
            searchId: offlineSearchId,
            resultIndex: selectedOption.resultIndex,
            departureDate,
            returnDate: returnDate || undefined,
          },
        }),
      ).unwrap();

      setSuccessSnapshot({
        type: "OFFLINE",
        requestId: response.requestId,
        pnr: booking?.bookingResult?.pnr || booking?.pnr || PLACEHOLDER,
      });
      await dispatch(fetchMyBookingById(booking._id));
      setCurrentStep(STEP.SUCCESS);
    } catch (error) {
      setCurrentStep(STEP.SEARCH_RESULTS);
      const message = error?.message || error;
      if (error?.code === "OFFLINE_REISSUE_ALREADY_EXISTS") {
        toast.error(
          `${message} Existing request ${error?.data?.existingRequestId || ""}`.trim(),
        );
      } else {
        toast.error(message || "Failed to submit the offline reissue request.");
      }
    }
  };

  const renderSidebarSummary = () => {
    if (!selectedOption) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <FiClock className="mt-0.5 shrink-0 text-slate-400" size={16} />
            <div>
              <p className="text-sm font-bold text-slate-900">
                {showOfflineFlow ? "Search replacement flights" : "Search online reissue options"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {showOfflineFlow
                  ? "Select one replacement flight before you can submit the request to operations."
                  : "We will load reissue-eligible flight options with fare difference and airline date-change fees."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const summary = showOfflineFlow ? offlineSearchSummary : onlineQuoteSummary || selectedOption;
    const currency = summary?.currency || selectedOption.currency || "INR";

    return (
      <div className="rounded-3xl border border-[#0A4D68]/20 bg-[linear-gradient(180deg,#f8fdff_0%,#eef8fc_100%)] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0A4D68]">
          Selected Flight
        </p>
        <p className="mt-3 text-lg font-black text-slate-900">
          {selectedOption.airlineName || selectedOption.airlineCode || "Airline"}{" "}
          {selectedOption.airlineCode || ""} {selectedOption.flightNumber || ""}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {selectedOption.origin || PLACEHOLDER} {"->"} {selectedOption.destination || PLACEHOLDER}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {formatFlightTime(selectedOption.departureTime)} {"->"} {formatFlightTime(selectedOption.arrivalTime)}
        </p>
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Total Additional Collection
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatMoney(
              summary?.totalCollection ?? summary?.totalEstimate ?? selectedOption.totalCollection,
              currency,
            )}
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <PricingRow
            label="Current Ticket"
            value={formatMoney(summary?.oldFare ?? selectedOption.oldFare, currency)}
          />
          <PricingRow
            label="New Flight"
            value={formatMoney(summary?.newFare ?? selectedOption.newFare, currency)}
          />
          <PricingRow
            label="Fare Difference"
            value={formatMoney(summary?.fareDifference ?? selectedOption.fareDifference, currency)}
          />
          <PricingRow
            label="Date Change Fee"
            value={formatMoney(summary?.reissueCharge ?? selectedOption.reissueCharge, currency)}
          />
        </div>
      </div>
    );
  };

  const renderOnlineQuoteStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <FiShield className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">Final fare quote ready</p>
            <p className="mt-1 text-sm text-slate-600">
              Review the final payable amount before continuing to confirmation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Final Payable
          </p>
          <div className="mt-4 space-y-3">
            <PricingRow
              label="Fare Difference"
              value={formatMoney(quoteSnapshot?.fareDifference, "INR")}
            />
            <PricingRow
              label="Supplier Reissue Charges"
              value={formatMoney(quoteSnapshot?.reissueCharges, "INR")}
            />
            <PricingRow
              label="Total Additional Collection"
              value={formatMoney(quoteSnapshot?.totalAdjustment, "INR")}
              strong
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Fare Conditions
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Fare validity: Immediate confirmation recommended. Supplier validity timestamp was not returned.</p>
            <p>
              Billing reservation: {quoteSnapshot?.billingReservation?.status || "reserved"}
            </p>
            {quoteRules.length ? (
              quoteRules.map((rule, index) => (
                <div key={`${rule}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  {rule}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                Airline conditions will continue to apply as per the quoted fare rules and supplier reissue policy.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#0A4D68]/15 bg-[linear-gradient(180deg,#f8fdff_0%,#f1f8fb_100%)] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A4D68]">
          Confirmation Summary
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Selected Flight
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {selectedOption?.airlineName || selectedOption?.airlineCode || "Airline"}{" "}
              {selectedOption?.flightNumber || ""}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedOption?.origin || PLACEHOLDER} {"->"} {selectedOption?.destination || PLACEHOLDER}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(selectedOption?.departureDate)} {"|"} {formatFlightTime(selectedOption?.departureTime)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Final Payable
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatMoney(quoteSnapshot?.totalAdjustment, "INR")}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              PNR continuity retained: {booking?.bookingResult?.pnr || booking?.pnr || PLACEHOLDER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <FiCheckCircle size={38} />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">
          {successSnapshot?.type === "ONLINE"
            ? "Your reissue has been completed"
            : "Your offline reissue request has been submitted"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {successSnapshot?.type === "ONLINE"
            ? "Your booking has been refreshed and the latest ticket will remain available from the same booking page."
            : "Our servicing team will continue processing the selected replacement flight under the same booking journey."}
        </p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-left">
        <PricingRow label="Reference" value={successSnapshot?.requestId || PLACEHOLDER} />
        <PricingRow label="Active PNR" value={successSnapshot?.pnr || PLACEHOLDER} />
      </div>
    </div>
  );

  const modalTitle = showOfflineFlow ? "Offline Reissue Request" : "Reissue Flight";
  const headerMessage = showOfflineFlow
    ? offlineFallback?.message ||
      "Choose a preferred date, review replacement flights, and submit the request for operations processing."
    : "This booking supports online reissue. Search, select, quote, and confirm in one flow.";

  const showBackButton =
    !showOfflineFlow &&
    [STEP.SEARCH_RESULTS, STEP.FARE_QUOTE, STEP.CONFIRMATION].includes(currentStep);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">{modalTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.bookingReference || booking?.orderId || booking?._id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {!showOfflineFlow && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-4">
              <StepBadge number="1" label="Form" active={onlineStepIndex === 1} complete={onlineStepIndex > 1} />
              <StepBadge number="2" label="Search" active={onlineStepIndex === 2} complete={onlineStepIndex > 2} />
              <StepBadge number="3" label="Quote" active={onlineStepIndex === 3} complete={onlineStepIndex > 3} />
              <StepBadge number="4" label="Confirm" active={onlineStepIndex === 4} complete={onlineStepIndex > 4} />
              <StepBadge number="5" label="Process" active={onlineStepIndex === 5} complete={onlineStepIndex > 5} />
              <StepBadge number="6" label="Success" active={onlineStepIndex === 6} complete={false} />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {eligibilityLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <FiLoader size={28} className="animate-spin text-[#0A4D68]" />
              <p className="text-sm font-medium text-slate-500">
                Checking reissue eligibility for this booking...
              </p>
            </div>
          )}

          {!eligibilityLoading && eligibilityError && (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Eligibility check failed</p>
                  <p className="mt-1 text-sm text-rose-700">{eligibilityError}</p>
                </div>
              </div>
            </div>
          )}

          {eligibility && !eligibilityLoading && !eligibilityError && (
            <div className="space-y-5">
              {currentStep !== STEP.PROCESSING && currentStep !== STEP.SUCCESS && (
                <>
                  <div
                    className={`rounded-3xl border p-4 ${
                      showOfflineFlow
                        ? "border-amber-100 bg-amber-50"
                        : "border-emerald-100 bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {showOfflineFlow ? (
                        <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
                      ) : (
                        <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {showOfflineFlow ? "Offline servicing required" : "Online reissue available"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{headerMessage}</p>
                      </div>
                    </div>
                  </div>

                  {currentStep === STEP.FARE_QUOTE && renderOnlineQuoteStep()}
                  {currentStep === STEP.CONFIRMATION && renderConfirmationStep()}

                  {[STEP.FORM, STEP.SEARCH_RESULTS].includes(currentStep) && (
                    <>
                      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                {showOfflineFlow ? "Preferred Travel Date" : "New Departure Date"}
                              </label>
                              <input
                                type="date"
                                value={departureDate}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(event) => setDepartureDate(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
                              />
                            </div>

                            {isRoundTrip && (
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  {showOfflineFlow ? "Preferred Return Date" : "New Return Date"}
                                </label>
                                <input
                                  type="date"
                                  value={returnDate}
                                  min={departureDate || new Date().toISOString().split("T")[0]}
                                  onChange={(event) => setReturnDate(event.target.value)}
                                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Remarks
                            </label>
                            <textarea
                              value={remarks}
                              onChange={(event) => setRemarks(event.target.value)}
                              rows={4}
                              placeholder="Add servicing notes or schedule flexibility for the reissue team"
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
                            />
                          </div>
                        </div>

                        {renderSidebarSummary()}
                      </div>

                      {currentStep === STEP.SEARCH_RESULTS && (
                        <>
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {showOfflineFlow ? "Available replacement flights" : "Available online reissue options"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {showOfflineFlow
                                    ? `${offlineSearchPagination?.total || 0} result(s)`
                                    : `${onlineOptions.length} result(s)`}
                                </p>
                              </div>
                              {showOfflineFlow && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineSearch(searchPage)}
                                  disabled={offlineSearchLoading || !canSearch}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {offlineSearchLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={14} />}
                                  Refresh
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {(showOfflineFlow ? offlineSearchResults : onlineOptions).map((option) => (
                              <FlightOptionCard
                                key={String(option.resultIndex)}
                                option={
                                  showOfflineFlow
                                    ? {
                                        ...option,
                                        oldFare: option.oldFare,
                                        newFare: option.fare || option.newFare,
                                        totalCollection: option.totalEstimate,
                                        cabin: option.cabinClass || "Economy",
                                        baggage: option.baggage || PLACEHOLDER,
                                      }
                                    : option
                                }
                                selected={String(selectedOption?.resultIndex) === String(option.resultIndex)}
                                expanded={expandedOptionId === option.resultIndex}
                                onToggleDetails={() =>
                                  setExpandedOptionId((current) =>
                                    current === option.resultIndex ? null : option.resultIndex,
                                  )
                                }
                                onSelect={() => setSelectedOption(option)}
                                mode={showOfflineFlow ? "OFFLINE" : "ONLINE"}
                              />
                            ))}
                          </div>

                          {showOfflineFlow && !offlineSearchResults?.length && (
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                              {offlineSearchError || OFFLINE_SEARCH_FALLBACK_MESSAGE}
                            </div>
                          )}

                          {showOfflineFlow && offlineSearchPagination?.pages > 1 && (
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <button
                                type="button"
                                onClick={() => handleOfflineSearch(Math.max(1, searchPage - 1))}
                                disabled={searchPage <= 1 || offlineSearchLoading}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-slate-600">
                                Page {searchPage} of {offlineSearchPagination.pages}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOfflineSearch(
                                    Math.min(offlineSearchPagination.pages, searchPage + 1),
                                  )
                                }
                                disabled={
                                  searchPage >= offlineSearchPagination.pages ||
                                  offlineSearchLoading
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {currentStep === STEP.PROCESSING && (
                <ProcessingState label={processingLabel} />
              )}

              {currentStep === STEP.SUCCESS && renderSuccessStep()}
            </div>
          )}
        </div>

        {eligibility && !eligibilityLoading && !eligibilityError && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                {currentStep === STEP.SUCCESS
                  ? "The booking dashboard now resolves to the latest active ticket."
                  : showOfflineFlow
                    ? "Replacement flight selection is mandatory for offline reissue."
                    : "Online reissue follows search, quote, confirmation, and ticketing in sequence."}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {showBackButton && (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStep((current) =>
                        current === STEP.FARE_QUOTE ? STEP.SEARCH_RESULTS : STEP.FARE_QUOTE,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiArrowLeft size={15} />
                    Back
                  </button>
                )}

                {currentStep !== STEP.PROCESSING && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {currentStep === STEP.SUCCESS ? "Close" : "Cancel"}
                  </button>
                )}

                {currentStep === STEP.FORM && (
                  showOfflineFlow ? (
                    <button
                      type="button"
                      onClick={() => handleOfflineSearch(1)}
                      disabled={offlineSearchLoading || !canSearch}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                    >
                      {offlineSearchLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={15} />}
                      Search Flights
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOnlineSearch}
                      disabled={createLoading || !canSearch}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                    >
                      {createLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={15} />}
                      Search Reissue Options
                    </button>
                  )
                )}

                {currentStep === STEP.SEARCH_RESULTS && showOfflineFlow && (
                  <button
                    type="button"
                    onClick={submitOfflineRequest}
                    disabled={offlineCreateLoading || !selectedOption}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                  >
                    {offlineCreateLoading ? <FiLoader className="animate-spin" /> : <FiSend size={15} />}
                    Submit Reissue Request
                  </button>
                )}

                {currentStep === STEP.SEARCH_RESULTS && !showOfflineFlow && (
                  <button
                    type="button"
                    onClick={handlePreviewQuote}
                    disabled={quoteLoading || !selectedOption}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                  >
                    {quoteLoading ? <FiLoader className="animate-spin" /> : <FiFileText size={15} />}
                    Get Fare Quote
                  </button>
                )}

                {currentStep === STEP.FARE_QUOTE && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(STEP.CONFIRMATION)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d]"
                  >
                    Continue to Confirmation
                  </button>
                )}

                {currentStep === STEP.CONFIRMATION && (
                  <button
                    type="button"
                    onClick={handleConfirmOnlineReissue}
                    disabled={confirmLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmLoading ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={15} />}
                    Confirm Reissue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
