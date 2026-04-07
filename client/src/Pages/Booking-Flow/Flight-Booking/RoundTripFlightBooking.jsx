import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdArrowBack, MdFlightTakeoff, MdFlightLand } from "react-icons/md";
import { BsCalendar4 } from "react-icons/bs";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import {
  formatDate,
  formatDurationCompact,
  RoundTripFlightTimeline,
  PriceSummary,
  Amenities,
  HotelHomeButton,
  CTABox,
  parseRoundTripBooking,
  TravelerForm,
} from "./CommonComponents";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import {
  getRTFareQuote,
  getRTFareRule,
  getRTSSR,
} from "../../../Redux/Actions/flight.thunks.RT";
import RTSeatSelectionModal from "./SSR/RTSeatSelectionModal";
import { createBookingRequest } from "../../../Redux/Actions/booking.thunks";
import { FareDetailsModal } from "./FareDetailsModal";
import { CABIN_MAP } from "../../../utils/formatter";
import { getMyTravelAdmin } from "../../../Redux/Actions/employee.thunks";
import api from "../../../API/axios";
import { selectManager } from "../../../Redux/Actions/manager.thunk";
import { ProjectApproverBlock } from "../Hotel-Booking/components/ProjectApproverBlock";

// ✅ NORMALIZE FULL FARE RULE API RESPONSE (FareRule API)
const normalizeFareRules = (fareRule) => {
  // TBO sometimes returns {Response:{FareRules:[...]}} and sometimes flat {FareRules:[...]}
  const list =
    fareRule?.Response?.FareRules ||
    fareRule?.FareRules ||
    fareRule?.data?.Response?.FareRules ||
    [];

  if (!Array.isArray(list) || list.length === 0) return null;

  const hasCategory = list.some((r) => r?.Category);

  const cancellation = hasCategory
    ? list.filter((r) => r.Category === "CANCELLATION")
    : [];
  const dateChange = hasCategory
    ? list.filter((r) => r.Category === "DATECHANGE")
    : [];
  const baggage = hasCategory
    ? list.filter((r) => r.Category === "BAGGAGE")
    : [];

  // For responses without Category (common in intl round-trip), fall back to FareRuleDetail strings
  let important = hasCategory
    ? list.filter((r) => r.Category === "IMPORTANT")
    : [];

  if (important.length === 0) {
    const details = list
      .map((r) => r?.FareRuleDetail)
      .filter((x) => typeof x === "string" && x.trim().length > 0);
    if (details.length > 0) {
      important = details;
    }
  }

  return { cancellation, dateChange, baggage, important };
};

export default function RoundTripFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const hasState = Boolean(location.state);
  useEffect(() => {
    if (!hasState) {
      navigate("/search-flight", { replace: true });
    }
  }, [hasState, navigate]);

  const {
    selectedFlight,
    searchParams,
    // rawFlightData,
    tripType = "round-trip",
    isInternational = false,
  } = location.state || {};
  const originalSearchData = location.state?.rawFlightData;
  const passengerCounts =
    searchParams?.passengers ||
    location.state?.passengers ||
    searchParams ||
    {};

  const [expandedSections, setExpandedSections] = useState({
    onwardFlightDetails: true,
    returnFlightDetails: true,
    travelerDetails: false,
    fareRules: false,
    checkIn: false,
    travelDocs: false,
    terms: false,
  });
  // ===== Traveler State =====
  const initialTraveler = (id, type = "ADULT") => ({
    id,
    type,
    title: "MR",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    age: "",
    email: "",
    phoneWithCode: "",
    passportNumber: "",
    PassportIssueDate: "",
    passportExpiry: "",
    nationality: "IN",
    dob: "",
    linkedAdultIndex: type === "INFANT" ? 0 : null,
  });
  const [travelers, setTravelers] = useState([]);
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

  const [travelerErrors, setTravelerErrors] = useState({});
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [projectApproverData, setProjectApproverData] = useState({
    project: null,
    approver: null,
  });
  const [gstDetails, setGstDetails] = useState({
    gstin: "",
    legalName: "",
    address: "",
  });
 const { actionLoading } = useSelector((state) => state.bookings);
  const fareQuote = useSelector((state) => state.flightsRT.fareQuoteRT);
  const fareRule = useSelector((state) => state.flightsRT.fareRuleRT);
  const ssr = useSelector((state) => state.flightsRT.ssrRT);
  // const traceId = useSelector((state) => state.flightsRT.traceId);
  const reduxTraceId = useSelector((state) => state.flightsRT.traceId);
  const { user } = useSelector((state) => state.auth);
  const {
    approver,
    loading: approverLoading,
    error: approverError,
  } = useSelector((state) => state.employee);

  const traceId = location.state?.traceId || reduxTraceId || null;

  const adultCount = passengerCounts?.adults ?? searchParams?.adults ?? 1;
  const childCount = passengerCounts?.children ?? searchParams?.children ?? 0;
  const infantCount = passengerCounts?.infants ?? searchParams?.infants ?? 0;
  const totalPassengerCount = adultCount + childCount + infantCount;
  const seatEligibleCount = adultCount + childCount;
  const maxForms = totalPassengerCount;

  // ✅ INTERNATIONAL NORMALIZATION (ADD THIS)
  const rawFlightData = useMemo(() => {
    const raw = location.state?.rawFlightData;
    if (!raw) return null;

    if (
      isInternational &&
      Array.isArray(raw.Segments) &&
      Array.isArray(raw.Segments[0])
    ) {
      return {
        onward: { ...raw, Segments: [raw.Segments[0]] },
        return: { ...raw, Segments: [raw.Segments[1]] },
        isInternational: true,
      };
    }

    return raw;
  }, [location.state?.rawFlightData, isInternational]);

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
    const getSeatStatus = (journeyType, resultIndex) => {
      if (!resultIndex) return false;

      const key = resultIndex.toString().trim();
      const journeySSR = ssr?.[journeyType]?.[key];

      if (!journeySSR) return false;

      const root = journeySSR?.Response || journeySSR;

      const seatSource =
        root?.SeatDynamic?.[0]?.SegmentSeat ||
        root?.Seat?.[0]?.SegmentSeat ||
        root?.SeatDynamic ||
        root?.Seat ||
        [];

      return (
        Array.isArray(seatSource) &&
        seatSource.some(
          (s) => Array.isArray(s?.RowSeats) && s.RowSeats.length > 0,
        )
      );
    };

    return {
      onward: getSeatStatus("onward", rawFlightData?.onward?.ResultIndex),
      return: getSeatStatus("return", rawFlightData?.return?.ResultIndex),
    };
  }, [ssr, rawFlightData]);

  useEffect(() => {
    if (user?.role === "employee") {
      dispatch(getMyTravelAdmin());
    }
  }, [dispatch, user]);

  useEffect(() => {
    const fetchGst = async () => {
      try {
        const { data } = await api.get("/employees/gst");
        if (data?.data) {
          setGstDetails((prev) => ({
            ...prev,
            gstin: data.data.gstin || "",
            legalName: data.data.legalName || "",
            address: data.data.address || "",
          }));
        }
      } catch (err) {
        console.warn("GST fetch failed", err?.message);
      }
    };
    fetchGst();
  }, []);

  // ✅ AUTO-FILL LEAD TRAVELER
  useEffect(() => {
    const initial = [];

    for (let i = 0; i < adultCount; i++) {
      initial.push(initialTraveler(initial.length + 1, "ADULT"));
    }
    for (let i = 0; i < childCount; i++) {
      initial.push(initialTraveler(initial.length + 1, "CHILD"));
    }
    for (let i = 0; i < infantCount; i++) {
      const linkedAdult = Math.min(i, Math.max(adultCount - 1, 0));
      initial.push({
        ...initialTraveler(initial.length + 1, "INFANT"),
        linkedAdultIndex: linkedAdult,
      });
    }

    // Pre-fill first traveler if user is logged in
    if (user && initial[0]) {
      if (user.name && typeof user.name === "object") {
        initial[0].firstName = (user.name.firstName || "").toUpperCase();
        initial[0].lastName = (user.name.lastName || "").toUpperCase();
      } else {
        const rawName = user.name || user.displayName || "";
        const fullName = typeof rawName === "string" ? rawName : "";
        const names = fullName.trim().split(/\s+/);

        initial[0].firstName = (names[0] || "").toUpperCase();
        initial[0].lastName = (names.slice(1).join(" ") || "").toUpperCase();
      }

      initial[0].email = user.email || "";
      initial[0].phoneWithCode =
        user.phone || user.mobile || user.phoneWithCode || "";
    }

    setTravelers(initial);
  }, [user, searchParams, adultCount, childCount, infantCount]);

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

  const onwardRoute = useMemo(() => {
    const segs = parsedFlightData?.onwardSegments;
    if (!Array.isArray(segs) || segs.length === 0) return null;

    return {
      from: segs[0]?.da?.city || "",
      to: segs[segs.length - 1]?.aa?.city || "",
      dateTime: segs[0]?.dt,
    };
  }, [parsedFlightData]);

  const returnRoute = useMemo(() => {
    const segs = parsedFlightData?.returnSegments;
    if (!Array.isArray(segs) || segs.length === 0) return null;

    return {
      from: segs[0]?.da?.city || "",
      to: segs[segs.length - 1]?.aa?.city || "",
      dateTime: segs[0]?.dt,
    };
  }, [parsedFlightData]);

  const onwardFrom = searchParams?.from?.city || searchParams?.from || "Delhi";
  const onwardTo = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const onwardDate = formatDate(parsedFlightData?.onwardSegments?.[0]?.dt);

  const returnFrom = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const returnTo = searchParams?.from?.city || searchParams?.from || "Delhi";
  const returnDate = formatDate(parsedFlightData?.returnSegments?.[0]?.dt);

  const onwardFare = extractFareParts(fareQuote?.onward);
  const returnFare = extractFareParts(fareQuote?.return);

  // const totalBaseFare = onwardFare.base + returnFare.base;
  // const totalTaxFare = onwardFare.tax + returnFare.tax;

  const totalBaseFare = useMemo(() => {
    if (!fareQuote) return 0;

    // 🔥 INTERNATIONAL FIX
    if (isInternational) {
      const fare = fareQuote?.onward?.Response?.Results?.Fare;
      return Number(fare?.BaseFare || 0);
    }

    // Domestic logic (unchanged)
    const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
    const returnFare = fareQuote?.return?.Response?.Results?.Fare;

    return (
      Number(onwardFare?.BaseFare || 0) + Number(returnFare?.BaseFare || 0)
    );
  }, [fareQuote, isInternational]);

  const totalTaxFare = useMemo(() => {
    if (!fareQuote) return 0;

    // 🔥 INTERNATIONAL FIX
    if (isInternational) {
      const fare = fareQuote?.onward?.Response?.Results?.Fare;
      return Number(fare?.Tax || 0);
    }

    // Domestic logic
    const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
    const returnFare = fareQuote?.return?.Response?.Results?.Fare;

    return Number(onwardFare?.Tax || 0) + Number(returnFare?.Tax || 0);
  }, [fareQuote, isInternational]);

  const totalOtherCharges = useMemo(() => {
    if (!fareQuote) return 0;

    // 🔥 INTERNATIONAL FIX
    if (isInternational) {
      const fare = fareQuote?.onward?.Response?.Results?.Fare;
      return Number(fare?.OtherCharges || 0);
    }

    // Domestic logic
    const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
    const returnFare = fareQuote?.return?.Response?.Results?.Fare;

    return (
      Number(onwardFare?.OtherCharges || 0) +
      Number(returnFare?.OtherCharges || 0)
    );
  }, [fareQuote, isInternational]);

  const searchTotalFare = useMemo(() => {
    if (!originalSearchData) return 0;

    // International grouped: use the published fare from search response directly
    if (isInternational && originalSearchData?.Fare?.PublishedFare != null) {
      return Math.ceil(Number(originalSearchData.Fare.PublishedFare || 0));
    }

    // Domestic (or split international fallback): sum onward + return published fares from search response
    const onwardPublished =
      rawFlightData?.onward?.Fare?.PublishedFare ??
      originalSearchData?.onward?.Fare?.PublishedFare ??
      0;
    const returnPublished =
      rawFlightData?.return?.Fare?.PublishedFare ??
      originalSearchData?.return?.Fare?.PublishedFare ??
      0;

    const onwardTotal = onwardPublished ? Math.ceil(Number(onwardPublished)) : 0;
    const returnTotal = returnPublished
      ? Math.ceil(Number(returnPublished))
      : 0;

    return onwardTotal + returnTotal;
  }, [rawFlightData, originalSearchData, isInternational]);

  // Build a resilient Fare.Results array for booking payload (avoids nulls)
  const safeFareResults = useMemo(() => {
    const results = [];

    // Primary: fare quote responses
    const onwardRes = fareQuote?.onward?.Response?.Results;
    const returnRes = fareQuote?.return?.Response?.Results;
    if (onwardRes) results.push(onwardRes);
    if (returnRes) results.push(returnRes);

    // Fallback: search result objects (grouped intl has Fare & FareBreakdown)
    if (results.length === 0) {
      if (originalSearchData?.Fare) results.push(originalSearchData);
      if (rawFlightData?.onward?.Fare) results.push(rawFlightData.onward);
      if (rawFlightData?.return?.Fare) results.push(rawFlightData.return);
    }

    return results;
  }, [fareQuote, rawFlightData, originalSearchData]);

  useEffect(() => {
    console.log(
      "ONWARD FareQuote Fare:",
      fareQuote?.onward?.Response?.Results?.Fare,
    );
    console.log(
      "RETURN FareQuote Fare:",
      fareQuote?.return?.Response?.Results?.Fare,
    );
  }, [fareQuote]);

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
      }),
    );

    dispatch(
      getRTFareQuote({
        traceId,
        resultIndex: rawFlightData.return.ResultIndex,
        journeyType: "return",
      }),
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
      }),
    );

    // ALWAYS call onward
    dispatch(
      getRTSSR({
        traceId,
        resultIndex: onwardIdx,
        journeyType: "onward",
      }),
    );

    // ONLY call return for domestic
    if (!isInternational) {
      dispatch(
        getRTSSR({
          traceId,
          resultIndex: onwardIdx,
          journeyType: "return",
        }),
      );
    }

    dispatch(
      getRTFareRule({
        traceId,
        resultIndex: returnIdx,
        journeyType: "return",
      }),
    );

    dispatch(
      getRTSSR({
        traceId,
        resultIndex: returnIdx,
        journeyType: "return",
      }),
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

  const toggleSeatSelection = (
    journeyType,
    segmentIndex,
    seatNum,
    price = 0,
  ) => {
    setSelectedSeats((prev) => {
      const key = `${journeyType}|${segmentIndex}`;
      const current = prev[key] || { list: [], priceMap: {} };

      const isSelected = current.list.includes(seatNum);

      const seatLimit = seatEligibleCount || travelers.length || 1;

      if (!isSelected && current.list.length >= seatLimit) {
        ToastWithTimer({
          message: `You can only select ${seatLimit} seat(s)`,
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
    // 🔥 INTERNATIONAL FIX
    const ssrJourneyType = isInternational ? "onward" : journeyType;
    const ssrResultIndex = (
      isInternational ? rawFlightData.onward.ResultIndex : resultIndex
    )
      ?.toString()
      .trim();

    let actualSegmentIndex = segmentIndex;

    // 🔥 INTERNATIONAL segment offset
    if (isInternational && journeyType === "return") {
      actualSegmentIndex =
        (parsedFlightData?.onwardSegments?.length || 0) + segmentIndex;
    }

    const journeySSR = ssr?.[ssrJourneyType]?.[ssrResultIndex];

    // let root =
    //   journeySSR?.Response ||
    //   journeySSR?.Results ||
    //   Object.values(journeySSR || {})[0]?.Response ||
    //   Object.values(journeySSR || {})[0]?.Results ||
    //   journeySSR;

    // const seatData =
    //   root?.SeatDynamic?.[0]?.SegmentSeat ||
    //   root?.Seat?.[0]?.SegmentSeat ||
    //   root?.SeatDynamic ||
    //   root?.Seat;

    const root =
      journeySSR?.Response?.Results || journeySSR?.Response || journeySSR;

    const seatData =
      root?.SeatDynamic?.[0]?.SegmentSeat ||
      root?.Seat?.[0]?.SegmentSeat ||
      root?.SeatDynamic ||
      root?.Seat ||
      [];

    if (!seatData || seatData.length === 0) {
      ToastWithTimer({
        type: "info",
        message: "Seat selection not available for this flight.",
      });
      return;
    }

    setShowSeatModal({
      show: true,
      segment,
      segmentIndex: actualSegmentIndex,
      journeyType, // keep UI context
      resultIndex: ssrResultIndex,
      date: segment?.dt,
      ssrData: journeySSR, // ✅ important
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
    travelersCount,
  ) => {
    const key = `${journeyType}|${segmentIndex}`;
    const allowedCount =
      typeof travelersCount === "number" && travelersCount > 0
        ? travelersCount
        : seatEligibleCount || 1;

    setSelectedMeals((prev) => {
      const list = prev[key] || [];
      const exists = list.find((m) => m.Code === meal.Code);

      if (exists) {
        return { ...prev, [key]: list.filter((m) => m.Code !== meal.Code) };
      }

      if (list.length >= allowedCount) {
        ToastWithTimer({
          type: "info",
          message: `You can add meals for only ${allowedCount} traveler(s)`,
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

  useEffect(() => {
    console.log("SELECTED SEATS:", selectedSeats);
    console.log("TOTAL SEAT PRICE:", totalSeatPrice);
  }, [selectedSeats, totalSeatPrice]);

  const getTotalDurationDisplay = () => {
    if (!parsedFlightData) return "0h:00m";
    const onwardDuration = parsedFlightData.totalDuration || 0;
    const returnDuration = parsedFlightData.returnTotalDuration || 0;
    return `${formatDurationCompact(onwardDuration)} + ${formatDurationCompact(
      returnDuration,
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

  const calculateSSRTotal = () => {
    let total = 0;

    Object.values(selectedSeats).forEach((v) => {
      v?.list?.forEach((seat) => (total += Number(v.priceMap?.[seat] || 0)));
    });

    Object.values(selectedMeals).forEach((meals) => {
      meals?.forEach((m) => (total += Number(m.Price || 0)));
    });

    Object.values(selectedBaggage).forEach((bag) => {
      if (bag?.Price) total += Number(bag.Price) * travelers.length;
    });

    return total;
  };

  const updateTraveler = (id, field, value) => {
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const perAdultFare = useMemo(() => {
    if (!fareQuote) return { base: 0, tax: 0 };

    // 🔥 INTERNATIONAL FIX
    if (isInternational) {
      const fare = fareQuote?.onward?.Response?.Results?.Fare;

      return {
        base: Number(fare?.BaseFare || 0),
        tax: Number(fare?.Tax || 0),
        otherCharges: Number(fare?.OtherCharges || 0),
      };
    }

    // Domestic logic
    const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
    const returnFare = fareQuote?.return?.Response?.Results?.Fare;

    return {
      base:
        Number(onwardFare?.BaseFare || 0) + Number(returnFare?.BaseFare || 0),
      tax: Number(onwardFare?.Tax || 0) + Number(returnFare?.Tax || 0),
      otherCharges:
        Number(onwardFare?.OtherCharges || 0) +
        Number(returnFare?.OtherCharges || 0),
    };
  }, [fareQuote, isInternational]);

  const fareQuoteTotal = useMemo(() => {
    const perTravellerTotal =
      Number(perAdultFare.base || 0) +
      Number(perAdultFare.tax || 0) +
      Number(perAdultFare.otherCharges || 0);

    const paxCount = Math.max(totalPassengerCount || travelers.length || 1, 1);

    // If fare quote already returned a combined total and only one pax, use it directly
    const aggregatedFare =
      Number(totalBaseFare || 0) +
      Number(totalTaxFare || 0) +
      Number(totalOtherCharges || 0);
    if (aggregatedFare > 0 && paxCount === 1) {
      return Math.ceil(aggregatedFare);
    }

    return Math.ceil(perTravellerTotal * paxCount);
  }, [
    perAdultFare,
    totalPassengerCount,
    travelers.length,
    totalBaseFare,
    totalTaxFare,
    totalOtherCharges,
  ]);

  const uiTotalFare = useMemo(
    () => (searchTotalFare > 0 ? searchTotalFare : fareQuoteTotal),
    [searchTotalFare, fareQuoteTotal],
  );

  const totalPayableAmount = Math.ceil(uiTotalFare) + calculateSSRTotal();

  const buildMealSSR = () => {
    const meals = [];

    Object.entries(selectedMeals).forEach(([key, mealList]) => {
      const [, segmentIndex] = key.split("|");

      mealList.forEach((meal, travelerIndex) => {
        meals.push({
          segmentIndex: Number(segmentIndex),
          travelerId: travelers[travelerIndex]?.id,
          code: meal.Code,
          description: meal.Description,
          price: meal.Price,
        });
      });
    });

    return meals;
  };

  const buildFullSegments = () => {
    const segments = [];

    const pushSegments = (segmentGroups, journeyType) => {
      if (!Array.isArray(segmentGroups)) return;

      segmentGroups.forEach((group) => {
        if (!Array.isArray(group)) return;

        group.forEach((seg) => {
          segments.push({
            segmentIndex: segments.length,
            journeyType,

            airlineName: seg.Airline?.AirlineName || null,
            airlineCode: seg.Airline?.AirlineCode || null,
            flightNumber: seg.Airline?.FlightNumber || null,
            aircraft: seg.Craft || null,

            origin: {
              airportCode: seg.Origin?.Airport?.AirportCode,
              city: seg.Origin?.Airport?.CityName,
              country: seg.Origin?.Airport?.CountryCode,
              terminal: seg.Origin?.Airport?.Terminal,
            },

            destination: {
              airportCode: seg.Destination?.Airport?.AirportCode,
              city: seg.Destination?.Airport?.CityName,
              country: seg.Destination?.Airport?.CountryCode,
              terminal: seg.Destination?.Airport?.Terminal,
            },

            departureDateTime: seg.Origin?.DepTime,
            arrivalDateTime: seg.Destination?.ArrTime,
            durationMinutes: seg.Duration,

            baggage: {
              checkIn: seg.Baggage || null,
              cabin: seg.CabinBaggage || null,
            },
          });
        });
      });
    };

    // ✅ USE RAW SEARCH DATA (KEY FIX)
    pushSegments(rawFlightData?.onward?.Segments || [], "onward");
    pushSegments(rawFlightData?.return?.Segments || [], "return");

    return segments;
  };

  const fareSnapshot = {
    currency: fareQuote?.onward?.Response?.Results?.Fare?.Currency || "INR",

    onwardFare: fareQuote?.onward?.Response?.Results?.Fare,
    returnFare: fareQuote?.return?.Response?.Results?.Fare,

    refundable: selectedFlight?.IsRefundable,
    fareType: selectedFlight?.ResultFareType,
    lastTicketDate:
      fareQuote?.onward?.Response?.Results?.LastTicketDate ||
      fareQuote?.return?.Response?.Results?.LastTicketDate,
  };

  const buildBaggageSSR = () => {
    const baggage = [];

    Object.entries(selectedBaggage).forEach(([key, bag]) => {
      if (!bag) return;

      const [, segmentIndex] = key.split("|");

      baggage.push({
        segmentIndex: Number(segmentIndex),
        code: bag.Code,
        weight: bag.Weight,
        price: bag.Price,
      });
    });

    return baggage;
  };

  const buildSeatSSR = () => {
    const seats = [];

    Object.entries(selectedSeats).forEach(([key, value]) => {
      const [, segmentIndex] = key.split("|");

      value.list.forEach((seatCode, travelerIndex) => {
        // seats.push({
        //   segmentIndex: Number(segmentIndex),
        //   travelerIndex,
        //   seatNo: seatCode,
        //   price: value.priceMap[seatCode] || 0,
        // });
        seats.push({
          segmentIndex: Number(segmentIndex),
          travelerId: travelers[travelerIndex]?.id,
          seatNo: seatCode,
          price: value.priceMap[seatCode] || 0,
        });
      });
    });

    return seats;
  };

  const buildConsolidatedFareQuote = () => {
    // ONE-WAY (unchanged behavior)
    if (!fareQuote?.onward && fareQuote?.Response?.Results) {
      return fareQuote;
    }

    // ROUND-TRIP → consolidate
    const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
    const returnFare = fareQuote?.return?.Response?.Results?.Fare;

    if (!onwardFare || !returnFare) return null;

    return {
      Response: {
        Results: {
          Fare: {
            Currency: onwardFare.Currency,
            BaseFare:
              Number(onwardFare.BaseFare || 0) +
              Number(returnFare.BaseFare || 0),
            Tax: Number(onwardFare.Tax || 0) + Number(returnFare.Tax || 0),
            PublishedFare:
              Number(onwardFare.PublishedFare || 0) +
              Number(returnFare.PublishedFare || 0),
            Refundable: onwardFare.Refundable && returnFare.Refundable,
          },
          IsLCC:
            fareQuote.onward.Response.Results.IsLCC ||
            fareQuote.return.Response.Results.IsLCC,
          LastTicketDate:
            fareQuote.onward.Response.Results.LastTicketDate ||
            fareQuote.return.Response.Results.LastTicketDate,
        },
      },
    };
  };

  const buildBookingRequestPayload = () => {
    const segments = buildFullSegments();
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const cabinClass = CABIN_MAP[firstSegment?.cabinClass] || "Economy";

    // synthesize missing infants (if forms already include infants, skip duplicates)
    const travelersWithInfants = [...travelers];
    const existingInfants = travelers.filter((t) => t.type === "INFANT").length;
    const missingInfants = Math.max(infantCount - existingInfants, 0);

    for (let i = 0; i < missingInfants; i++) {
      const linkedAdult = adultCount ? i % adultCount : 0;
      const fallbackLast = travelers[linkedAdult]?.lastName || "INFANT";
      const depDate = segments[0]?.departureDateTime;
      const inferredDob = depDate
        ? (() => {
            const d = new Date(depDate);
            d.setFullYear(d.getFullYear() - 1);
            return d.toISOString().split("T")[0];
          })()
        : "";
      travelersWithInfants.push({
        id: travelersWithInfants.length + 1,
        type: "INFANT",
        title: "MSTR",
        firstName: `INFANT${i + 1}`,
        lastName: fallbackLast,
        gender: "MALE",
        dob: inferredDob,
        linkedAdultIndex: linkedAdult,
        nationality: "IN",
      });
    }

    const bookingSnapshot = {
      bookingType: "flight",

      sectors: segments.map(
        (s) => `${s.origin.airportCode}-${s.destination.airportCode}`,
      ),

      airline: [
        ...new Set(segments.map((s) => s.airlineName).filter(Boolean)),
      ].join(", "),

      travelDate: segments[0]?.departureDateTime || "N/A",
      returnDate: segments.at(-1)?.departureDateTime || "N/A",

      cabinClass,
      amount: totalPayableAmount,
      purposeOfTravel: purposeOfTravel || "N/A",
      city: segments.at(-1)?.destination?.city || "N/A",
      gstDetails,
    };

    const TRACE_VALIDITY_MINUTES = 15;

    const fareExpiry = new Date(
      Date.now() + TRACE_VALIDITY_MINUTES * 60 * 1000,
    );

    return {
      bookingType: "flight",
      projectName: projectApproverData.project?.name,
      projectId: projectApproverData.project?.id,
      projectClient: projectApproverData.project?.client,
      projectCodeId: projectApproverData.project?.id,
      approverId: projectApproverData.approver?.id,
      approverEmail: projectApproverData.approver?.email,
      approverName: projectApproverData.approver?.name,
      approverRole: projectApproverData.approver?.role,
      flightRequest: {
        // traceId: searchParams.traceId,
        traceId,
        // resultIndex: selectedFlight.ResultIndex,
        resultIndex: {
          onward: rawFlightData.onward.ResultIndex,
          return: rawFlightData.return.ResultIndex,
        },
        // resultIndex: rawFlightData.onward.ResultIndex,

        // fareQuote: buildConsolidatedFareQuote(),
        // fareQuote: fareQuote?.onward?.Response, // ✅ contains FareBreakdown
        fareQuote: {
          Results: safeFareResults,
        },

        segments: buildFullSegments(),

        fareSnapshot,

        ssrSnapshot: {
          seats: buildSeatSSR(),
          meals: buildMealSSR(),
          baggage: buildBaggageSSR(),
        },

        fareExpiry,
      },

      travellers: travelersWithInfants.map((t, idx) => ({
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName,

        email: t.email,
        phoneWithCode: t.phoneWithCode, // ✅ THIS WAS MISSING

        gender: t.gender,
        dateOfBirth: t.dob,

        passportNumber: t.passportNumber,
        PassportIssueDate: t.PassportIssueDate,
        passportExpiry: t.passportExpiry,
        nationality: t.nationality,

        paxType: (t.type || "ADULT").toUpperCase(),
        linkedAdultIndex:
          t.type === "INFANT" ? t.linkedAdultIndex ?? 0 : null,

        isLeadPassenger: idx === 0,
      })),

      purposeOfTravel,
      bookingSnapshot, // ✅ include summary for backend to save
      pricingSnapshot: {
        totalAmount:
          // perAdultFare.base * travelers.length +
          // perAdultFare.tax * travelers.length +
          // calculateSSRTotal(),
          totalPayableAmount,
        currency: "INR",
      },
      gstDetails,
    };
  };

  const ageFromDob = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Auto-calculate and keep traveler age (incl. infants) in sync with DOB
  useEffect(() => {
    if (!Array.isArray(travelers) || travelers.length === 0) return;

    let changed = false;
    const updated = travelers.map((t) => {
      if (!t?.dob) return t;
      const derivedAge = ageFromDob(t.dob);
      if (derivedAge !== t.age) {
        changed = true;
        return { ...t, age: derivedAge };
      }
      return t;
    });

    if (changed) setTravelers(updated);
  }, [travelers]);

  // Keep nationality in sync across all passengers, following lead passenger
  useEffect(() => {
    if (!Array.isArray(travelers) || travelers.length === 0) return;
    const leadNat = travelers[0]?.nationality;
    if (!leadNat) return;

    let changed = false;
    const synced = travelers.map((t, idx) => {
      if (idx === 0) return t;
      if (t.nationality && t.nationality !== "IN") return t; // preserve explicit overrides
      if (t.nationality === leadNat) return t;
      changed = true;
      return { ...t, nationality: leadNat };
    });

    if (changed) setTravelers(synced);
  }, [travelers, travelers?.[0]?.nationality]);

  const validateTravelers = () => {
    const errors = {};
    let isValid = true;

    travelers.forEach((t, idx) => {
      const e = {};

      if (!t.firstName?.trim()) e.firstName = "First name is required";
      if (!t.lastName?.trim()) e.lastName = "Last name is required";
      if (!t.gender?.trim()) e.gender = "Gender is required";
      if (idx === 0 && !t.email?.trim()) e.email = "Email is required";
      if (!t.dob?.trim()) e.dob = "Date of birth is required";
      if (idx === 0 && !t.phoneWithCode?.trim())
        e.phoneWithCode = "Phone number is required";
      if (!t.nationality?.trim()) e.nationality = "Nationality is required";

      const paxType = (t.type || "ADULT").toUpperCase();
      const age = ageFromDob(t.dob);

      if (age != null) {
        if (paxType === "ADULT" && age < 12) {
          e.dob = "Adult must be 12+ years";
        }
        if (paxType === "CHILD" && (age < 2 || age > 11)) {
          e.dob = "Child age must be 2-11 years";
        }
        if (paxType === "INFANT" && age >= 2) {
          e.dob = "Infant must be under 2 years";
        }
      }

      if (paxType === "INFANT") {
        if (
          typeof t.linkedAdultIndex !== "number" ||
          t.linkedAdultIndex < 0 ||
          t.linkedAdultIndex >= adultCount
        ) {
          e.linkedAdultIndex = "Infant must be linked to an adult";
        }
      }

      // passportNumber validation: only if flight is international
      const isInternational = Boolean(
        parsedFlightData?.segments?.some(
          (s) =>
            s?.origin?.country &&
            s?.destination?.country &&
            s.origin.country !== s.destination.country,
        ),
      );

      if (isInternational && !t.passportNumber?.trim()) {
        e.passportNumber =
          "Passport number is required for international flights";
      }

      if (Object.keys(e).length > 0) {
        errors[idx] = e;
        isValid = false;
      }
    });

    if (infantCount > adultCount) {
      isValid = false;
      errors.infants = { message: "Infants cannot exceed adults" };
    }

    setTravelerErrors(errors);
    return isValid;
  };

  const handleSendForApproval = async () => {
    if (!purposeOfTravel) {
      ToastWithTimer({
        type: "error",
        message: "Please enter purpose of travel",
      });
      return;
    }

    if (!projectApproverData.project || !projectApproverData.approver) {
      ToastWithTimer({
        type: "error",
        message: "Please select a project and approver",
      });
      return;
    }

    // Validate traveler details before submission
    if (!validateTravelers()) {
      ToastWithTimer({
        type: "error",
        message: "Please fill all required traveler details correctly.",
      });
      return;
    }

    try {
      const payload = buildBookingRequestPayload();
      await dispatch(
        selectManager({
          approverId: projectApproverData.approver?.id,
          approverEmail: projectApproverData.approver?.email,
          projectCodeId: projectApproverData.project?.id,
          projectName: projectApproverData.project?.name,
          projectClient: projectApproverData.project?.client,
        }),
      ).unwrap();

      await dispatch(createBookingRequest(payload)).unwrap();

      navigate("/my-bookings", {
        state: { success: true },
      });
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message:
          err?.message ||
          err?.payload ||
          "Failed to submit booking request",
      });
    }
  };

  console.log(
    "ONWARD PRICE LIST:",
    rawFlightData?.tripInfos?.ONWARD?.[0]?.totalPriceList,
  );

  console.log(
    "RETURN PRICE LIST:",
    rawFlightData?.tripInfos?.RETURN?.[0]?.totalPriceList,
  );

  // Readiness check for submit button (must stay before any early returns)
  const isFormReady = useMemo(() => {
    if (!purposeOfTravel?.trim()) return false;
    if (!projectApproverData.project || !projectApproverData.approver) return false;
    if (infantCount > adultCount) return false;

    const isIntl = Boolean(
      parsedFlightData?.segments?.some(
        (s) =>
          s?.origin?.country &&
          s?.destination?.country &&
          s.origin.country !== s.destination.country,
      ),
    );

    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i];
      if (!t.firstName?.trim() || !t.lastName?.trim()) return false;
      if (!t.gender) return false;
      if (!t.email?.trim()) return false;
      if (!t.phoneWithCode?.trim()) return false;
      if (!t.dob) return false;

      if (t.type === "INFANT") {
        if (
          typeof t.linkedAdultIndex !== "number" ||
          t.linkedAdultIndex < 0 ||
          t.linkedAdultIndex >= adultCount
        ) {
          return false;
        }
      }

      if (isIntl && !t.passportNumber?.trim()) return false;
    }

    return true;
  }, [
    purposeOfTravel,
    projectApproverData,
    infantCount,
    adultCount,
    travelers,
    parsedFlightData,
  ]);

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
  const returnDepartureDateTime = returnSegments[0]?.dt;
  const travelersForSeat = travelers.filter(
    (t) => (t.type || "ADULT") !== "INFANT",
  );

  // Readiness check for submit button
  return (
    <div className="min-h-screen bg-slate-50 font-[DM Sans]">
      <EmployeeHeader />
      <RTSeatSelectionModal
        isOpen={showSeatModal.show}
        onClose={closeSeatModal}
        segment={showSeatModal.segment}
        segmentIndex={showSeatModal.segmentIndex}
        journeyType={showSeatModal.journeyType}
        travelers={travelersForSeat}
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
                          {onwardRoute?.from} → {onwardRoute?.to}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(onwardRoute?.dateTime)}
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
                          {returnRoute?.from} → {returnRoute?.to}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(returnRoute?.dateTime)}
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
                        {totalPassengerCount} Traveler
                        {totalPassengerCount > 1 ? "s" : ""}
                        <div className="text-[11px] font-normal text-slate-500">
                          {adultCount}A · {childCount}C · {infantCount}I
                        </div>
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
                        {onwardRoute?.from} → {onwardRoute?.to} •{" "}
                        {formatDate(onwardRoute?.dateTime)}
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
                          rawFlightData.onward.ResultIndex,
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
                        {returnRoute?.from} → {returnRoute?.to} •{" "}
                        {formatDate(returnRoute?.dateTime)}
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
                          rawFlightData.return.ResultIndex,
                        )
                      }
                      isSeatReady={isRTSeatReady.return}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Traveller Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <TravelerForm
          travelers={travelers}
          updateTraveler={updateTraveler}
          errors={travelerErrors}
          parsedFlightData={parsedFlightData}
          purposeOfTravel={purposeOfTravel}
          setPurposeOfTravel={setPurposeOfTravel}
          isInternational={isInternational}
          gstDetails={gstDetails}
          setGstDetails={setGstDetails}
          canAddMore={travelers.length < maxForms}
          onAddTraveler={() =>
            setTravelers((prev) => {
              if (prev.length >= maxForms) return prev;

              const currentAdults = prev.filter((t) => t.type === "ADULT")
                .length;
              const currentChildren = prev.filter((t) => t.type === "CHILD")
                .length;
              const currentInfants = prev.filter((t) => t.type === "INFANT")
                .length;

              let nextType = "ADULT";
              if (currentChildren < childCount) nextType = "CHILD";
              else if (currentInfants < infantCount) nextType = "INFANT";

              const newTraveler = initialTraveler(
                prev.length + 1,
                nextType,
              );
              if (nextType === "INFANT") {
                newTraveler.linkedAdultIndex = Math.min(
                  currentInfants,
                  Math.max(adultCount - 1, 0),
                );
              }

              return [...prev, newTraveler];
            })
          }
        />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  Fare Rules & Policies
                </h2>
                {/* Button + Modal */}
                <FareDetailsModal
                  fareQuote={fareQuote}
                  fareRule={fareRule}
                  normalizeFareRules={normalizeFareRules}
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <ProjectApproverBlock onChange={setProjectApproverData} />
              <PriceSummary
                parsedFlightData={{
                  baseFare: uiTotalFare,
                  taxFare: 0,
                  otherCharges: 0,
                  baseFareIsTotal: true,
                }}
                selectedSeats={selectedSeats}
                selectedMeals={selectedMeals}
                selectedBaggage={selectedBaggage}
                travelers={travelers}
                approver={approver}
                approverLoading={approverLoading}
                approverError={approverError}
                onSendForApproval={handleSendForApproval}
                loading={actionLoading}
                disabled={!isFormReady}
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
