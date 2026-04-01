// src/components/Flights/OneFlightBooking.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdArrowBack, MdFlightTakeoff, MdFlightLand } from "react-icons/md";
import { BsCalendar4 } from "react-icons/bs";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

import {
  formatDate,
  parseFlightData,
  FlightTimeline,
  PriceSummary,
  Amenities,
  HotelHomeButton,
  CTABox,
  TravelerForm,
} from "./CommonComponents";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import {
  getFareQuote,
  getFareRule,
  getSSR,
} from "../../../Redux/Actions/flight.thunks";
import SeatSelectionModal from "./SSR/SeatSelectionModal";
import { createBookingRequest } from "../../../Redux/Actions/booking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { CABIN_MAP } from "../../../utils/formatter";
import { FareDetailsModal } from "./FareDetailsModal";
import { getMyTravelAdmin } from "../../../Redux/Actions/employee.thunks";
import api from "../../../API/axios";

const normalizeFareRules = (fareRule) => {
  const rules = fareRule?.Response?.FareRules;
  if (!rules || !rules.length) return null;

  return {
    cancellation: rules.filter((r) => r.Category === "CANCELLATION"),
    dateChange: rules.filter((r) => r.Category === "DATECHANGE"),
    baggage: rules.filter((r) => r.Category === "BAGGAGE"),

    // ✅ IMPORTANT FIX
    important: rules
      .map((r) => r.FareRuleDetail)
      .filter(Boolean),
      
    // ✅ ADD THIS (fallback support)
    raw: rules,
  };
};

export default function OneFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { traceId, fareQuote, fareRule, ssr } = useSelector(
    (state) => state.flights,
  );

  const { actionLoading } = useSelector((state) => state.bookings);
  const { user } = useSelector((state) => state.auth);

  const {
    approver,
    loading: approverLoading,
    error: approverError,
  } = useSelector((state) => state.employee);

  const isSSRError = ssr?.Response?.ResponseStatus === 2;

  const ssrErrorMessage =
    ssr?.Response?.Error?.ErrorMessage || "No SSR available";

  const {
    selectedFlight,
    searchParams,
    rawFlightData,
    tripType = "one-way",
    isInternational = false,
  } = location.state || {};

  const [parsedFlightData, setParsedFlightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [selectedMeals, setSelectedMeals] = useState({});

  const [selectedBaggage, setSelectedBaggage] = useState({});

  const [expandedSections, setExpandedSections] = useState({
    flightDetails: true,
    travelerDetails: false,
    fareRules: false,
    checkIn: false,
    travelDocs: false,
    terms: false,
  });

  const [travelerErrors, setTravelerErrors] = useState({});
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [gstDetails, setGstDetails] = useState({
    gstin: "",
    legalName: "",
    address: "",
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

  const adultCount =
    searchParams?.passengers?.adults || searchParams?.adults || 1;
  const childCount =
    searchParams?.passengers?.children || searchParams?.children || 0;
  const infantCount =
    searchParams?.passengers?.infants || searchParams?.infants || 0;
  const seatEligibleCount = adultCount + childCount;
  const maxForms = adultCount + childCount;

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
  }, [user, searchParams]);

  useEffect(() => {
    if (isSSRError) {
      ToastWithTimer({
        type: "info",
        message: ssrErrorMessage,
      });
    }
  }, [isSSRError]);

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

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  useEffect(() => {
    if (!traceId || !selectedFlight?.ResultIndex) return;

    dispatch(
      getFareQuote({
        traceId: searchParams.traceId, // ✅ REDUX traceId
        resultIndex: selectedFlight.ResultIndex,
      }),
    );
  }, [
    dispatch,
    traceId, // ✅ CRITICAL
    selectedFlight?.ResultIndex,
  ]);

  useEffect(() => {
    const quoteResult = fareQuote?.Response?.Results;

    if (!quoteResult?.ResultIndex) return;

    dispatch(
      getFareRule({
        traceId: searchParams.traceId,
        resultIndex: quoteResult.ResultIndex, // 🔑 USE THIS
      }),
    );

    dispatch(
      getSSR({
        traceId: searchParams.traceId,
        resultIndex: quoteResult.ResultIndex,
      }),
    );
  }, [
    fareQuote?.Response?.Results?.ResultIndex,
    dispatch,
    searchParams?.traceId,
  ]);

  // useEffect(() => {
  //   console.log("SSR DATA:", ssr);
  // }, [ssr]);

  useEffect(() => {
    if (!rawFlightData) {
      setParsedFlightData(null);
      setLoading(false);
      return;
    }

    try {
      const parsed = parseFlightData(rawFlightData);
      setParsedFlightData(parsed);
    } catch (err) {
      setParsedFlightData(null);
    } finally {
      setLoading(false);
    }
  }, [rawFlightData]);

  useEffect(() => {
    if (!loading && (!selectedFlight || !rawFlightData)) {
      navigate("/");
    }
  }, [loading, selectedFlight, rawFlightData, navigate]);

  const isSeatReady = useMemo(() => {
    if (isSSRError) return false;

    const segments = ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat;

    return Array.isArray(segments) && segments.length > 0;
  }, [ssr, isSSRError]);

  const openSeatModal = (segmentIndex) => {
    if (!isSeatReady) {
      ToastWithTimer({
        type: "info",
        message: isSSRError ? ssrErrorMessage : "Seat data is not available",
      });
      return;
    }

    const segmentSeat =
      ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[segmentIndex];
    const seatRows = segmentSeat?.RowSeats;

    if (!Array.isArray(seatRows) || seatRows.length === 0) {
      ToastWithTimer({
        type: "info",
        message: "Seat data is still loading. Please wait...",
      });
      return;
    }

    setActiveSegmentIndex(segmentIndex);
    setSeatModalOpen(true);
  };

  const handleSeatSelect = (journeyType, segmentIndex, seatNo, price = 0) => {
    const key = `${journeyType}|${segmentIndex}`;

    setSelectedSeats((prev) => {
      const current = prev[key] || { list: [], priceMap: {} };

      // toggle logic
      if (current.list.includes(seatNo)) {
        const newList = current.list.filter((s) => s !== seatNo);
        const newPriceMap = { ...current.priceMap };
        delete newPriceMap[seatNo];

        return {
          ...prev,
          [key]: {
            list: newList,
            priceMap: newPriceMap,
          },
        };
      }

      return {
        ...prev,
        [key]: {
          list: [...current.list, seatNo],
          priceMap: {
            ...current.priceMap,
            [seatNo]: price,
          },
        },
      };
    });
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

  const updateTraveler = (id, field, value) => {
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const fareTotals = useMemo(() => {
    const fare = fareQuote?.Response?.Results?.Fare;
    if (!fare) return { total: 0, base: 0, tax: 0, otherCharges: 0 };

    const base = Number(fare.BaseFare || 0);
    const tax = Number(fare.Tax || 0);
    const otherCharges = Number(fare.OtherCharges || 0);
    const total = Number(
      fare.PublishedFare || fare.OfferedFare || base + tax + otherCharges,
    );

    return { total, base, tax, otherCharges };
  }, [fareQuote]);

  const buildSeatSSR = () => {
    const seats = [];

    Object.entries(selectedSeats).forEach(([key, value]) => {
      const [, segmentIndex] = key.split("|");

      value.list.forEach((seatCode, travelerIndex) => {
        seats.push({
          segmentIndex: Number(segmentIndex),
          travelerIndex,
          seatNo: seatCode,
          price: value.priceMap[seatCode] || 0,
        });
      });
    });

    return seats;
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

  const fullSegments =
    rawFlightData?.Segments?.flat()?.map((s, index) => ({
      segmentIndex: index,

      airlineCode: s.Airline.AirlineCode,
      airlineName: s.Airline.AirlineName,
      flightNumber: s.Airline.FlightNumber,
      fareClass: s.Airline.FareClass,
      cabinClass: s.CabinClass,

      origin: {
        airportCode: s.Origin.Airport.AirportCode,
        airportName: s.Origin.Airport.AirportName,
        terminal: s.Origin.Airport.Terminal,
        city: s.Origin.Airport.CityName,
        country: s.Origin.Airport.CountryCode,
      },

      destination: {
        airportCode: s.Destination.Airport.AirportCode,
        airportName: s.Destination.Airport.AirportName,
        terminal: s.Destination.Airport.Terminal,
        city: s.Destination.Airport.CityName,
        country: s.Destination.Airport.CountryCode,
      },

      departureDateTime: s.Origin.DepTime,
      arrivalDateTime: s.Destination.ArrTime,

      durationMinutes: s.Duration,
      stopOver: s.StopOver,
      aircraft: s.Craft,

      baggage: {
        checkIn: s.Baggage,
        cabin: s.CabinBaggage,
      },
    })) || [];

  const fareSnapshot = {
    currency: fareQuote?.Response?.Results?.Fare?.Currency || "INR",

    baseFare: fareQuote?.Response?.Results?.Fare?.BaseFare || 0,
    tax: fareQuote?.Response?.Results?.Fare?.Tax || 0,

    publishedFare: fareQuote?.Response?.Results?.Fare?.PublishedFare || 0,
    offeredFare: fareQuote?.Response?.Results?.Fare?.OfferedFare || 0,

    refundable: selectedFlight?.IsRefundable,
    fareType: selectedFlight?.ResultFareType,

    miniFareRules: selectedFlight?.MiniFareRules || [],
    lastTicketDate: fareQuote?.Response?.Results?.LastTicketDate,
  };

  const buildMealSSR = () => {
    const meals = [];

    Object.entries(selectedMeals).forEach(([key, mealList]) => {
      const [, segmentIndex] = key.split("|");

      mealList.forEach((meal, travelerIndex) => {
        meals.push({
          segmentIndex: Number(segmentIndex),
          travelerIndex,
          code: meal.Code,
          description: meal.Description,
          price: meal.Price,
        });
      });
    });

    return meals;
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

  const buildBookingRequestPayload = () => {
    const segments = parsedFlightData?.segments || [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const cabinClass = CABIN_MAP[firstSegment?.cabinClass] || "Economy";

    // synthesize infant passengers (no form) to satisfy fare breakdown
    const travelersWithInfants = [...travelers];
    const needInfants = infantCount;
    for (let i = 0; i < needInfants; i++) {
      const linkedAdult = adultCount ? i % adultCount : 0;
      const fallbackLast = travelers[linkedAdult]?.lastName || "INFANT";
      const inferredDob = firstSegment?.dt
        ? (() => {
            const d = new Date(firstSegment.dt);
            d.setFullYear(d.getFullYear() - 1); // ~1 year old infant
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
      sectors: segments.map((s) => `${s.from}-${s.to}`),
      airline: segments.map((s) => s.airline).join(", ") || "N/A",
      travelDate: firstSegment?.dt || "N/A",
      returnDate: lastSegment?.at || "N/A",
      cabinClass,
      amount: fareTotals.total + calculateSSRTotal(),
      purposeOfTravel: purposeOfTravel || "N/A",
      city: lastSegment?.to || "N/A",
      gstDetails,
    };

    const TRACE_VALIDITY_MINUTES = 15;

    const fareExpiry = new Date(
      Date.now() + TRACE_VALIDITY_MINUTES * 60 * 1000,
    );

    return {
      bookingType: "flight",
      flightRequest: {
        traceId: searchParams.traceId,
        resultIndex: selectedFlight.ResultIndex,

        fareQuote: {
          Results: Array.isArray(fareQuote.Response.Results)
            ? fareQuote.Response.Results
            : [fareQuote.Response.Results],
        },
        segments: fullSegments,

        fareSnapshot,

        ssrSnapshot: {
          seats: buildSeatSSR(),
          meals: buildMealSSR(),
          baggage: buildBaggageSSR(),
        },

        fareExpiry,
      },

      travellers: travelers.map((t, idx) => ({
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
        totalAmount: fareTotals.total + calculateSSRTotal(),
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
      if (!t.nationality?.trim())
        e.nationality = "Nationality is required";

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
            No flight data available.
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

  const routeFrom = parsedFlightData.flightData?.from || "N/A";
  const routeTo = parsedFlightData.flightData?.to || "N/A";
  const segments = parsedFlightData.segments || [];

  const departureDateTime = segments[0]?.dt;
  const arrivalDateTime = segments[segments.length - 1]?.at;

  const travelersForSeat = Array.from(
    { length: Math.max(1, seatEligibleCount) },
    (_, i) => ({
      id: i + 1,
    }),
  );

  return (
    <div className="min-h-screen bg-slate-50 font-[DM Sans]">
      <EmployeeHeader />

      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-700 transition"
          >
            <MdArrowBack size={18} />
            Back to results
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">
            {/* Flight Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-linear-to-br from-blue-50 to-blue-100 shadow-lg">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Flight Details
                    </h2>
                    <p className="text-sm text-slate-600">
                      Review your journey information
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white">
                    {tripType.toUpperCase()}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <InfoBox
                    icon={<MdFlightTakeoff />}
                    label="From"
                    value={
                      <>
                        <div className="font-semibold">{routeFrom}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(departureDateTime)}
                        </div>
                      </>
                    }
                  />

                  <InfoBox
                    icon={<MdFlightLand />}
                    label="To"
                    value={
                      <>
                        <div className="font-semibold">{routeTo}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(arrivalDateTime)}
                        </div>
                      </>
                    }
                  />

                  <InfoBox
                    icon={<BsCalendar4 />}
                    label="Journey Date"
                    value={
                      <>
                        <div className="font-semibold">
                          {formatDate(departureDateTime)}
                        </div>

                        {formatDate(departureDateTime) !==
                          formatDate(arrivalDateTime) && (
                          <div className="text-xs text-slate-500">
                            Arrives {formatDate(arrivalDateTime)}
                          </div>
                        )}
                      </>
                    }
                  />
                </div>

                <button
                  onClick={() => toggleSection("flightDetails")}
                  className="mt-5 w-full text-sm font-medium text-blue-700 hover:text-blue-800 flex justify-center items-center gap-2"
                >
                  {expandedSections.flightDetails
                    ? "Hide Details"
                    : "View Details"}
                  {expandedSections.flightDetails ? (
                    <AiOutlineMinus />
                  ) : (
                    <AiOutlinePlus />
                  )}
                </button>
              </div>

              {expandedSections.flightDetails && (
                <div className="p-6 bg-slate-50">
                  <div className="bg-white rounded-xl p-5">
                    <FlightTimeline
                      segments={parsedFlightData.segments || []}
                      selectedSeats={selectedSeats}
                      openSeatModal={openSeatModal}
                      journeyType="onward"
                      isSeatReady={isSeatReady}
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
                    const renderedCount = prev.filter(
                      (t) => (t.type || "ADULT") !== "INFANT",
                    ).length;
                    if (renderedCount >= maxForms) return prev;
                    const currentChildren = prev.filter(
                      (t) => t.type === "CHILD",
                    ).length;
                    const nextType =
                      currentChildren < childCount ? "CHILD" : "ADULT";
                    return [
                      ...prev,
                      initialTraveler(prev.length + 1, nextType),
                    ];
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

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <PriceSummary
                parsedFlightData={{
                  ...parsedFlightData,
                  baseFare: fareTotals.total, // total from card
                  taxFare: 0,
                  otherCharges: 0,
                  baseFareIsTotal: true,
                }}
                travelers={travelers}
                selectedSeats={selectedSeats}
                selectedMeals={selectedMeals}
                selectedBaggage={selectedBaggage}
                approver={approver}
                approverLoading={approverLoading}
                approverError={approverError}
                onSendForApproval={handleSendForApproval}
                loading={actionLoading}
              />

              <Amenities />
              <HotelHomeButton />
              <CTABox />
            </div>
          </div>
        </div>
      </div>
      {seatModalOpen && (
        <SeatSelectionModal
          isOpen={seatModalOpen}
          onClose={() => setSeatModalOpen(false)}
          segmentIndex={activeSegmentIndex}
          journeyType="onward"
          travelers={travelersForSeat}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
          segment={parsedFlightData.segments[activeSegmentIndex]}
          traceId={searchParams.traceId}
          resultIndex={selectedFlight.ResultIndex}
          selectedMeals={selectedMeals}
          selectedBaggage={selectedBaggage}
          onToggleMeal={toggleMealSelection}
          onSelectBaggage={handleSelectBaggage}
          ssrError={isSSRError}
          ssrErrorMessage={ssrErrorMessage}
        />
      )}
    </div>
  );
}

/* Small helper component */
const InfoBox = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl border border-gray-300 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
      {icon}
      {label}
    </div>
    <p className="font-semibold text-slate-900">{value}</p>
  </div>
);
