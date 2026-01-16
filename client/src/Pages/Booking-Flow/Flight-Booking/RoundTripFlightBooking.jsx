import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdArrowBack, MdFlightTakeoff, MdFlightLand } from "react-icons/md";
import { BsCalendar4 } from "react-icons/bs";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import {  ToastWithTimer } from "../../../utils/ToastConfirm";
import SeatSelectionModal from "./SeatSelectionModal";

import {
  formatTime,
  formatDate,
  getAirlineLogo,
  formatDuration,
  formatDurationCompact,
  parseFlightData,
  RoundTripFlightTimeline,
  FareOptions,
  PriceSummary,
  ImportantInformation,
  BaggageTable,
  orangeText,
  orangeBg,
  blueBg,
  TravelerForm,
  FareRulesAccordion,
  Amenities,
  HotelHomeButton,
  CTABox,
  parseRoundTripBooking,
} from "./CommonComponents";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import {
  getRTFareQuote,
  getRTFareRule,
  getRTSSR,
} from "../../../Redux/Actions/flight.thunks.RT";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import RTSeatSelectionModal from "./RTSeatSelectionModal";

// ✅ NORMALIZE FULL FARE RULE API RESPONSE (FareRule API)
const normalizeFareRules = (fareRule) => {
  const list = fareRule?.Response?.FareRules;
  if (!Array.isArray(list)) return null;

  return {
    cancellation: [],
    dateChange: [],
    baggage: [],
    important: list.map((r) => r.FareRuleDetail).filter(Boolean),
  };
};

const ExpandableSection = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition"
      >
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        {open ? (
          <IoChevronUp size={20} className="text-gray-600" />
        ) : (
          <IoChevronDown size={20} className="text-gray-600" />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="p-6 border-t border-gray-200 bg-white">{children}</div>
      )}
    </div>
  );
};

export default function RoundTripFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  if (!location.state) {
    navigate("/search-flight", { replace: true });
    return null;
  }

  const {
    selectedFlight,
    searchParams,
    rawFlightData,
    tripType = "round-trip",
  } = location.state || {};

  const [expandedSections, setExpandedSections] = useState({
    onwardFlightDetails: true,
    returnFlightDetails: true,
    travelerDetails: false,
    fareRules: false,
    checkIn: false,
    travelDocs: false,
    terms: false,
  });
  const [travelers, setTravelers] = useState([
    {
      id: 1,
      title: "Mr.",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobile: "",
      phoneWithCode: "",
      passportNumber: "",
      dob: "",
      age: "",
    },
  ]);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [showSeatModal, setShowSeatModal] = useState({
    flight: null,
    flightIndex: null,
    journeyType: null,
    bookingId: null,
    show: false,
  });

  const [parsedFlightData, setParsedFlightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandFare, setExpandFare] = useState({
    onward: true,
    return: true,
  });
  const [selectedMeals, setSelectedMeals] = useState({});
  const [selectedBaggage, setSelectedBaggage] = useState({});

  const fareQuote = useSelector((state) => state.flightsRT.fareQuoteRT);
  const fareRule = useSelector((state) => state.flightsRT.fareRuleRT);
  const ssr = useSelector((state) => state.flightsRT.ssrRT);
  // const traceId = useSelector((state) => state.flightsRT.traceId);
  const reduxTraceId = useSelector((state) => state.flightsRT.traceId);

  const traceId = location.state?.traceId || reduxTraceId || null;

  const extractFareParts = (quote) => {
    const fare = quote?.Response?.Results?.Fare;
    if (!fare) return { base: 0, tax: 0 };

    // Case 1: API gives full breakup
    if (fare.BaseFare != null || fare.Tax != null) {
      return {
        base: Number(fare.BaseFare || 0),
        tax: Number(fare.Tax || 0),
      };
    }

    // Case 2: API gives only PublishedFare
    if (fare.PublishedFare != null) {
      return {
        base: Number(fare.PublishedFare),
        tax: 0,
      };
    }

    // Fallback
    return { base: 0, tax: 0 };
  };

  const isRTSeatReady = useMemo(() => {
    const onwardResultIndex = rawFlightData?.onward?.ResultIndex;
    const returnResultIndex = rawFlightData?.return?.ResultIndex;

    const onwardSSR = ssr?.onward?.[onwardResultIndex];
    const returnSSR = ssr?.return?.[returnResultIndex];

    const hasSeats = (journeySSR) =>
      journeySSR?.Response?.SeatDynamic?.some((sd) =>
        sd?.SegmentSeat?.some(
          (seg) => Array.isArray(seg?.RowSeats) && seg.RowSeats.length > 0
        )
      );

    return {
      onward: hasSeats(onwardSSR),
      return: hasSeats(returnSSR),
    };
  }, [ssr, rawFlightData]);

  useEffect(() => {
    console.log("🟢 Seat Ready Check", {
      onward: isRTSeatReady.onward,
      return: isRTSeatReady.return,
      onwardSSR: ssr?.onward?.[rawFlightData?.onward?.ResultIndex],
      returnSSR: ssr?.return?.[rawFlightData?.return?.ResultIndex],
    });
  }, [isRTSeatReady, ssr, rawFlightData]);

  console.log("SSR ONWARD SeatDynamic:", ssr?.onward?.Results?.SeatDynamic);

  const logRT = (label, data) => {
    console.group(`🟦 [RT DEBUG] ${label}`);
    console.log(data);
    console.groupEnd();
  };

  useEffect(() => {
    logRT("INITIAL INPUTS", {
      traceId,
      rawFlightData,
      onwardResultIndex: rawFlightData?.onward?.ResultIndex,
      returnResultIndex: rawFlightData?.return?.ResultIndex,
    });
  }, [traceId, rawFlightData]);

  useEffect(() => {
    if (!rawFlightData?.onward || !rawFlightData?.return) {
      navigate("/search-flight", { replace: true });
      return;
    }

    const parsed = parseRoundTripBooking(rawFlightData);
    setParsedFlightData(parsed);
    setLoading(false);
  }, [rawFlightData, navigate]);

  const onwardFrom = searchParams?.from?.city || searchParams?.from || "Delhi";
  const onwardTo = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const onwardDate = formatDate(parsedFlightData?.onwardSegments?.[0]?.dt);

  const returnFrom = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const returnTo = searchParams?.from?.city || searchParams?.from || "Delhi";
  const returnDate = formatDate(parsedFlightData?.returnSegments?.[0]?.dt);

  const onwardFare = extractFareParts(fareQuote?.onward);
  const returnFare = extractFareParts(fareQuote?.return);

  const totalBaseFare = onwardFare.base + returnFare.base;
  const totalTaxFare = onwardFare.tax + returnFare.tax;

  useEffect(() => {
    console.log(
      "ONWARD FareQuote Fare:",
      fareQuote?.onward?.Response?.Results?.Fare
    );
    console.log(
      "RETURN FareQuote Fare:",
      fareQuote?.return?.Response?.Results?.Fare
    );
  }, [fareQuote]);

  const baggageInfo = useMemo(() => {
    if (!ssr?.onward?.Results?.Baggage?.length) return {};

    const bag = ssr.onward.Results.Baggage[0];

    return {
      cB: "7 Kg",
      iB: bag.Weight,
    };
  }, [ssr]);

  console.log("=== CORRECTED JOURNEY ASSIGNMENT ===");
  console.log("Onward:", onwardFrom, "→", onwardTo, "on", onwardDate);
  console.log("Return:", returnFrom, "→", returnTo, "on", returnDate);

  useEffect(() => {
    if (parsedFlightData) {
      console.log("=== UI DATA DEBUG ===");
      console.log("Onward:", onwardFrom, "→", onwardTo);
      console.log("Return:", returnFrom, "→", returnTo);
      console.log("Onward Date:", onwardDate);
      console.log("Return Date:", returnDate);
    }
  }, [
    parsedFlightData,
    onwardFrom,
    onwardTo,
    returnFrom,
    returnTo,
    onwardDate,
    returnDate,
  ]);

  useEffect(() => {
    if (!traceId || !rawFlightData?.onward || !rawFlightData?.return) {
      logRT("FARE QUOTE SKIPPED", {
        traceId,
        onward: rawFlightData?.onward,
        return: rawFlightData?.return,
      });
      return;
    }

    logRT("DISPATCHING RT FARE QUOTE", {
      traceId,
      onwardResultIndex: rawFlightData.onward.ResultIndex,
      returnResultIndex: rawFlightData.return.ResultIndex,
    });

    dispatch(
      getRTFareQuote({
        traceId,
        resultIndex: rawFlightData.onward.ResultIndex,
        journeyType: "onward",
      })
    );

    dispatch(
      getRTFareQuote({
        traceId,
        resultIndex: rawFlightData.return.ResultIndex,
        journeyType: "return",
      })
    );
  }, [traceId, rawFlightData, dispatch]);

  useEffect(() => {
    if (!traceId || !rawFlightData?.onward || !rawFlightData?.return) return;

    const onwardIdx = rawFlightData.onward.ResultIndex;
    const returnIdx = rawFlightData.return.ResultIndex;

    dispatch(
      getRTFareRule({
        traceId,
        resultIndex: onwardIdx,
        journeyType: "onward",
      })
    );

    dispatch(
      getRTSSR({
        traceId,
        resultIndex: onwardIdx,
        journeyType: "onward",
      })
    );

    dispatch(
      getRTFareRule({
        traceId,
        resultIndex: returnIdx,
        journeyType: "return",
      })
    );

    dispatch(
      getRTSSR({
        traceId,
        resultIndex: returnIdx,
        journeyType: "return",
      })
    );
  }, [traceId, rawFlightData, dispatch]);

  useEffect(() => {
    logRT("FARE QUOTE REDUX STATE", {
      onward: fareQuote?.onward,
      return: fareQuote?.return,
    });
  }, [fareQuote]);

  useEffect(() => {
    console.log("FARE RULE ONWARD:", fareRule?.onward);
    console.log("FARE RULE RETURN:", fareRule?.return);
    console.log("SSR ONWARD:", ssr?.onward);
    console.log("SSR RETURN:", ssr?.return);
  }, [fareRule, ssr]);

  const addTraveler = () => {
    const newTraveler = {
      id: travelers.length + 1,
      title: "Mr.",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobile: "",
      phoneWithCode: "",
      passportNumber: "",
      dob: "",
      age: "",
    };
    setTravelers([...travelers, newTraveler]);
  };

  const removeTraveler = (id) => {
    if (travelers.length > 1) {
      setTravelers(travelers.filter((t) => t.id !== id));
    }
  };

  const updateTraveler = (id, field, value) => {
    setTravelers(
      travelers.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const toggleSeatSelection = (
    journeyType,
    segmentIndex,
    seatNum,
    price = 0
  ) => {
    setSelectedSeats((prev) => {
      const key = `${journeyType}|${segmentIndex}`;
      const current = prev[key] || { list: [], priceMap: {} };

      const isSelected = current.list.includes(seatNum);

      if (!isSelected && current.list.length >= travelers.length) {
        ToastWithTimer({
          message: `You can only select ${travelers.length} seat(s)`,
          type: "info",
        });
        return prev;
      }

      const updatedList = isSelected
        ? current.list.filter((s) => s !== seatNum)
        : [...current.list, seatNum];

      const updatedPriceMap = { ...current.priceMap };
      if (isSelected) delete updatedPriceMap[seatNum];
      else updatedPriceMap[seatNum] = price;

      return {
        ...prev,
        [key]: {
          list: updatedList,
          priceMap: updatedPriceMap,
        },
      };
    });
  };

  const openSeatModal = (segment, segmentIndex, journeyType, resultIndex) => {
    const journeySSR = ssr?.[journeyType]?.[resultIndex];

    const seatData = journeySSR?.Response?.SeatDynamic;

    if (!Array.isArray(seatData) || seatData.length === 0) {
      ToastWithTimer({
        type: "info",
        message: "Seat selection not available for this flight.",
      });
      return;
    }

    setShowSeatModal({
      show: true,
      segment,
      segmentIndex,
      journeyType,
      resultIndex,
      date: segment?.dt,
    });
  };

  const closeSeatModal = () => {
    setShowSeatModal({ flight: null, flightIndex: null, show: false });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleMealSelection = (
    journeyType,
    segmentIndex,
    meal,
    travelersCount
  ) => {
    const key = `${journeyType}|${segmentIndex}`;

    setSelectedMeals((prev) => {
      const list = prev[key] || [];
      const exists = list.find((m) => m.Code === meal.Code);

      if (exists) {
        return { ...prev, [key]: list.filter((m) => m.Code !== meal.Code) };
      }

      if (list.length >= travelersCount) {
        ToastWithTimer({
          type: "info",
          message: `You can add meals for only ${travelersCount} traveler(s)`,
        });
        return prev;
      }

      return { ...prev, [key]: [...list, meal] };
    });
  };

  const handleSelectBaggage = (journeyType, segmentIndex, bag) => {
    const key = `${journeyType}|${segmentIndex}`;
    setSelectedBaggage((prev) => ({
      ...prev,
      [key]: bag,
    }));
  };

  const totalSeatPrice = useMemo(() => {
    let total = 0;

    Object.values(selectedSeats).forEach((seatObj) => {
      if (!seatObj?.priceMap) return;

      Object.values(seatObj.priceMap).forEach((price) => {
        total += Number(price || 0);
      });
    });

    return total;
  }, [selectedSeats]);

  const toggleFareSection = (key) => {
    setExpandFare((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    console.log("SELECTED SEATS:", selectedSeats);
    console.log("TOTAL SEAT PRICE:", totalSeatPrice);
  }, [selectedSeats, totalSeatPrice]);

  const getTotalDurationDisplay = () => {
    if (!parsedFlightData) return "0h:00m";
    const onwardDuration = parsedFlightData.totalDuration || 0;
    const returnDuration = parsedFlightData.returnTotalDuration || 0;
    return `${formatDurationCompact(onwardDuration)} + ${formatDurationCompact(
      returnDuration
    )}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";

    const date = d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${date}, ${time}`;
  };

  console.log(
    "ONWARD PRICE LIST:",
    rawFlightData?.tripInfos?.ONWARD?.[0]?.totalPriceList
  );

  console.log(
    "RETURN PRICE LIST:",
    rawFlightData?.tripInfos?.RETURN?.[0]?.totalPriceList
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading flight details…</p>
        </div>
      </div>
    );
  }

  if (!parsedFlightData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
          <p className="text-gray-700 font-semibold mb-4">
            No flight data available. Please search again.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const totalDurationDisplay = getTotalDurationDisplay();

  const onwardSegments = parsedFlightData.onwardSegments || [];
  const returnSegments = parsedFlightData.returnSegments || [];

  const onwardDepartureDateTime = onwardSegments[0]?.dt;
  const onwardArrivalDateTime = onwardSegments[onwardSegments.length - 1]?.at;
  const returnDepartureDateTime = returnSegments[0]?.dt;
  const returnArrivalDateTime = returnSegments[returnSegments.length - 1]?.at;

  return (
    <div className="min-h-screen bg-slate-50 font-[DM Sans]">
      <EmployeeHeader />
      <RTSeatSelectionModal
        isOpen={showSeatModal.show}
        onClose={closeSeatModal}
        segment={showSeatModal.segment}
        segmentIndex={showSeatModal.segmentIndex}
        journeyType={showSeatModal.journeyType}
        travelers={travelers}
        resultIndex={showSeatModal.resultIndex}
        selectedSeats={selectedSeats}
        selectedMeals={selectedMeals} 
        selectedBaggage={selectedBaggage} 
        onSeatSelect={toggleSeatSelection}
        onToggleMeal={toggleMealSelection}
        onSelectBaggage={handleSelectBaggage} 
        date={showSeatModal.date}
        flightIndex={showSeatModal.segmentIndex}
      />

      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-10 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-700 transition"
          >
            <MdArrowBack size={18} />
            Back to results
          </button>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white">
              ROUND-TRIP
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            {/* Flight Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-linear-to-br from-blue-50 to-blue-100">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Round Trip Flight Details
                    </h2>
                    <p className="text-sm text-slate-600">
                      Complete journey information
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <InfoBox
                    icon={<MdFlightTakeoff />}
                    label="Onward Journey"
                    value={
                      <>
                        <div className="font-semibold">
                          {onwardFrom} → {onwardTo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(onwardDepartureDateTime)}
                        </div>
                      </>
                    }
                  />

                  <InfoBox
                    icon={<MdFlightLand />}
                    label="Return Journey"
                    value={
                      <>
                        <div className="font-semibold">
                          {returnFrom} → {returnTo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(returnDepartureDateTime)}
                        </div>
                      </>
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoBox
                    icon={<BsCalendar4 />}
                    label="Duration"
                    value={
                      <div className="font-semibold text-sm">
                        {totalDurationDisplay}
                      </div>
                    }
                  />

                  <InfoBox
                    icon={<span className="text-lg">👤</span>}
                    label="Travelers"
                    value={
                      <div className="font-semibold text-sm">
                        {travelers.length} Adult
                        {travelers.length > 1 ? "s" : ""}
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
            {/* Onward Flight Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
                <button
                  onClick={() => toggleSection("onwardFlightDetails")}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <MdFlightTakeoff className="text-white text-2xl" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-green-800">
                        Onward Journey
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
                        {onwardFrom} → {onwardTo} • {onwardDate}
                      </p>
                      <p className="text-xs text-gray-600">
                        {parsedFlightData.onwardSegments?.length || 0} Flight
                        {(parsedFlightData.onwardSegments?.length || 0) > 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    {expandedSections.onwardFlightDetails ? (
                      <AiOutlineMinus className="text-green-700" />
                    ) : (
                      <AiOutlinePlus className="text-green-700" />
                    )}
                  </div>
                </button>
              </div>

              {expandedSections.onwardFlightDetails && (
                <div className="p-6 bg-slate-50">
                  <div className="bg-white rounded-xl p-5">
                    <RoundTripFlightTimeline
                      segments={parsedFlightData.onwardSegments}
                      isReturnJourney={false}
                      selectedSeats={selectedSeats}
                      openSeatModal={(flight, flightIdx) =>
                        openSeatModal(
                          flight,
                          flightIdx,
                          "onward",
                          rawFlightData.onward.ResultIndex
                        )
                      }
                      isSeatReady={isRTSeatReady.onward}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Return Flight Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-linear-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500">
                <button
                  onClick={() => toggleSection("returnFlightDetails")}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <MdFlightLand className="text-white text-2xl" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-purple-800">
                        Return Journey
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
                        {returnFrom} → {returnTo} • {returnDate}
                      </p>
                      <p className="text-xs text-gray-600">
                        {parsedFlightData.returnSegments?.length || 0} Flight
                        {(parsedFlightData.returnSegments?.length || 0) > 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    {expandedSections.returnFlightDetails ? (
                      <AiOutlineMinus className="text-purple-700" />
                    ) : (
                      <AiOutlinePlus className="text-purple-700" />
                    )}
                  </div>
                </button>
              </div>

              {expandedSections.returnFlightDetails && (
                <div className="p-6 bg-slate-50">
                  <div className="bg-white rounded-xl p-5">
                    <RoundTripFlightTimeline
                      segments={parsedFlightData.returnSegments}
                      isReturnJourney={true}
                      selectedSeats={selectedSeats}
                      openSeatModal={(flight, flightIdx) =>
                        openSeatModal(
                          flight,
                          flightIdx,
                          "return",
                          rawFlightData.return.ResultIndex
                        )
                      }
                      isSeatReady={isRTSeatReady.return}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Fare Quote */}
            <div className="space-y-5">
              {/* Fare  - Onward */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleFareSection("onward")}
                  className="w-full bg-linear-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                      <MdFlightTakeoff className="text-white text-xl" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">
                        Onward Journey
                      </h3>
                      <p className="text-xs text-gray-600">
                        Fare details & add-ons
                      </p>
                    </div>
                  </div>

                  {expandFare.onward ? (
                    <AiOutlineMinus className="text-green-700 text-lg" />
                  ) : (
                    <AiOutlinePlus className="text-green-700 text-lg" />
                  )}
                </button>

                {/* Content */}
                {expandFare.onward && (
                  <div className="p-6 space-y-6">
                    {/* Fare Options */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                        <h4 className="text-base font-semibold text-gray-900">
                          Fare Rules & Charges
                        </h4>
                      </div>
                      <FareOptions
                        fareRules={fareQuote?.onward}
                        fareRulesStatus={
                          fareQuote?.onward?.Response?.Results?.MiniFareRules
                            ? "succeeded"
                            : "loading"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Fare  - Return */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleFareSection("return")}
                  className="w-full bg-linear-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                      <MdFlightTakeoff className="text-white text-xl" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">
                        Return Journey
                      </h3>
                      <p className="text-xs text-gray-600">
                        Fare details & add-ons
                      </p>
                    </div>
                  </div>

                  {expandFare.return ? (
                    <AiOutlineMinus className="text-green-700 text-lg" />
                  ) : (
                    <AiOutlinePlus className="text-green-700 text-lg" />
                  )}
                </button>

                {/* Content */}
                {expandFare.return && (
                  <div className="p-6 space-y-6">
                    {/* Fare Options */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                        <h4 className="text-base font-semibold text-gray-900">
                          Fare Rules & Charges
                        </h4>
                      </div>
                      <FareOptions
                        fareRules={fareQuote?.return}
                        fareRulesStatus={
                          fareQuote?.return?.Response?.Results?.MiniFareRules
                            ? "succeeded"
                            : "loading"
                        }
                      />
                    </div>

                    {/* Meals Section */}
                    {ssr?.return?.Results?.Meal?.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                          <h4 className="text-base font-semibold text-gray-900">
                            In-Flight Meals
                          </h4>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                            {ssr.return.Results.Meal.length} Available
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ssr.return.Results.Meal.map((meal, idx) => (
                            <div
                              key={idx}
                              className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200 group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                                  <PiForkKnifeBold className="text-orange-600 text-xl" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-sm mb-1">
                                    {meal.Description}
                                  </p>
                                  <p className="text-xs text-gray-500 mb-2">
                                    {meal.Code}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-lg font-bold text-orange-600">
                                      ₹{meal.Price}
                                    </p>
                                    <button className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors">
                                      Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ExpandableSection
                title="Important Information — Onward"
                defaultOpen={false}
              >
                <FareRulesAccordion
                  fareRules={normalizeFareRules(fareRule?.onward)}
                  fareRulesStatus={fareRule?.onward ? "succeeded" : "loading"}
                />
              </ExpandableSection>

              <ExpandableSection
                title="Important Information — Return"
                defaultOpen={false}
              >
                <FareRulesAccordion
                  fareRules={normalizeFareRules(fareRule?.return)}
                  fareRulesStatus={fareRule?.return ? "succeeded" : "loading"}
                />
              </ExpandableSection>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <PriceSummary
                parsedFlightData={{
                  baseFare: totalBaseFare,
                  taxFare: totalTaxFare,
                }}
                selectedSeats={selectedSeats}
                selectedMeals={selectedMeals}
                selectedBaggage={selectedBaggage}
                travelers={travelers}
              />

              <Amenities />
              <HotelHomeButton />
              <CTABox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helper Component */
const InfoBox = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl border border-gray-300 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
      {icon}
      {label}
    </div>
    <div className="text-slate-900">{value}</div>
  </div>
);
