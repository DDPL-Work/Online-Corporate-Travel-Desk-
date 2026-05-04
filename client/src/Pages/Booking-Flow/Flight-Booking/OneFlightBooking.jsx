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
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import { useDispatch, useSelector } from "react-redux";
import {
  getFareQuote,
  getFareRule,
  getSSR,
} from "../../../Redux/Actions/flight.thunks";
import SeatSelectionModal from "./SSR/SeatSelectionModal";
import { createBookingRequest } from "../../../Redux/Actions/booking.thunks";
import { approveApproval } from "../../../Redux/Actions/approval.thunks";
import { fetchMySSRPolicy } from "../../../Redux/Actions/ssrPolicy.thunks";
import { fetchMyProfile } from "../../../Redux/Slice/employeeActionSlice";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { CABIN_MAP } from "../../../utils/formatter";
import { FareDetailsModal } from "./FareDetailsModal";
import { getMyTravelAdmin } from "../../../Redux/Actions/employee.thunks";
import { selectManager } from "../../../Redux/Actions/manager.thunk";
import api from "../../../API/axios";
import { ProjectApproverBlock } from "../Hotel-Booking/components/ProjectApproverBlock";
import Swal from "sweetalert2";

export default function OneFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("Navigation State:", location.state);
  }, [location.state]);

  const { traceId, fareQuote, fareRule, ssr } = useSelector(
    (state) => state.flights,
  );

  const { actionLoading } = useSelector((state) => state.bookings);
  const { user } = useSelector((state) => state.auth);
  const { myProfile } = useSelector((state) => state.employeeAction || {});

  const {
    approver,
    loading: approverLoading,
    error: approverError,
  } = useSelector((state) => state.employee);

  const { myPolicy } = useSelector((state) => state.ssrPolicy);
  const isTravelAdmin = user?.role === "travel-admin";
  const approvalRequired =
    !isTravelAdmin && myPolicy?.approvalRequired !== false; // default true

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
    gstEmail: "",
  });
  const [projectApproverData, setProjectApproverData] = useState({
    project: null,
    approver: null,
  });
  // ===== Traveler State =====
  const initialTraveler = (id, type = "ADULT") => ({
    id,
    type,
    title: "MR",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "MALE",
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

    // Pre-fill first traveler if user/profile is logged in
    const sourceProfile = myProfile || user;
    if (sourceProfile && initial[0]) {
      const rawName = sourceProfile.name || sourceProfile.displayName || "";
      let firstName = "";
      let lastName = "";
      
      if (typeof sourceProfile.name === "object") {
         firstName = (sourceProfile.name.firstName || "").toUpperCase();
         lastName = (sourceProfile.name.lastName || "").toUpperCase();
      } else {
         const names = (typeof rawName === "string" ? rawName : "").trim().split(/\s+/);
         firstName = (names[0] || "").toUpperCase();
         lastName = (names.slice(1).join(" ") || "").toUpperCase();
      }

      initial[0].firstName = firstName;
      initial[0].lastName = lastName;
      initial[0].email = sourceProfile.email || "";
      initial[0].phoneWithCode = sourceProfile.phone || sourceProfile.mobile || sourceProfile.phoneWithCode || "";
    }

    setTravelers(initial);
  }, [user, myProfile, searchParams]);

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
    if (user?.role === "employee" || user?.role === "manager") {
      dispatch(getMyTravelAdmin());
      dispatch(fetchMySSRPolicy());
      dispatch(fetchMyProfile());
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
            gstEmail: data.data.gstEmail || "",
          }));
        }
      } catch (err) {
        console.warn("GST fetch failed", err?.message);
      }
    };
    fetchGst();
  }, []);

  useEffect(() => {
    const resultIndex = selectedFlight?.ResultIndex;
    const tId = searchParams?.traceId || traceId;

    console.log("FareQuote Trigger Check:", { resultIndex, tId });

    if (!tId || !resultIndex) return;

    dispatch(
      getFareQuote({
        traceId: tId,
        resultIndex,
      }),
    );
  }, [
    dispatch,
    searchParams?.traceId, // ✅ IMPORTANT
    traceId,
    selectedFlight, // ✅ FULL OBJECT (NOT nested field)
  ]);

  useEffect(() => {
    const quoteResponse = fareQuote?.Response;
    if (quoteResponse?.ResponseStatus === 2) {
      const errorMsg = quoteResponse?.Error?.ErrorMessage || "";
      if (
        errorMsg.toLowerCase().includes("traceid") ||
        errorMsg.toLowerCase().includes("expired") ||
        errorMsg.toLowerCase().includes("invalid")
      ) {
        Swal.fire({
          title: "Session Expired",
          text: "Your search session has expired. Please search again.",
          icon: "warning",
          confirmButtonColor: "#0A4D68",
        }).then(() => {
          navigate("/travel");
        });
      }
    }
  }, [fareQuote, navigate]);

  useEffect(() => {
    const quoteResult = fareQuote?.Response?.Results;

    if (!quoteResult?.ResultIndex) return;

    dispatch(
      getFareRule({
        traceId: searchParams.traceId || traceId,
        resultIndex: quoteResult.ResultIndex, // 🔑 USE THIS
      }),
    );

    dispatch(
      getSSR({
        traceId: searchParams.traceId || traceId,
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

  const isSSRReady = useMemo(() => {
    if (isSSRError) return false;
    const hasSeats =
      (ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.length || 0) > 0;
    const hasMeals = (ssr?.Response?.MealDynamic?.length || 0) > 0;
    const hasBaggage = (ssr?.Response?.Baggage?.length || 0) > 0;
    return hasSeats || hasMeals || hasBaggage;
  }, [ssr, isSSRError]);

  const validateMandatorySSR = () => {
    const validators = fareQuote?.Response?.Results?.RequiredFieldValidators;

    if (!validators) return { valid: true };

    const errors = [];

    const isMealRequired = validators?.IsMealRequired;
    const isSeatRequired = validators?.IsSeatRequired;

    // ✅ Check meal
    if (isMealRequired) {
      const hasMeal = Object.values(selectedMeals).some((v) => v?.length > 0);

      if (!hasMeal) {
        errors.push("Meal selection is required");
      }
    }

    // ✅ Check seat
    if (isSeatRequired) {
      const hasSeat = Object.values(selectedSeats).some(
        (v) => v?.list?.length > 0,
      );

      if (!hasSeat) {
        errors.push("Seat selection is required");
      }
    }

    return {
      valid: errors.length === 0,
      message: errors.join(" & "),
    };
  };

  const openSeatModal = (segmentIndex) => {
    if (!isSSRReady) {
      ToastWithTimer({
        type: "info",
        message: isSSRError
          ? ssrErrorMessage
          : "No add-ons (Seats/Meals/Baggage) are available for this flight.",
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
          description: String(meal.Description || meal.Code || ""),
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
      projectName: projectApproverData.project?.name,
      projectId: projectApproverData.project?.id,
      projectClient: projectApproverData.project?.client,
      projectCodeId: projectApproverData.project?.id,
      approverId: !approvalRequired
        ? user?._id || user?.id || user?.userId
        : projectApproverData.approver?.id,
      approverEmail: !approvalRequired
        ? user?.email
        : projectApproverData.approver?.email,
      approverName: !approvalRequired
        ? `${user?.name?.firstName} ${user?.name?.lastName}`
        : projectApproverData.approver?.name,
      approverRole: !approvalRequired
        ? user?.role
        : projectApproverData.approver?.role,
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
        dateOfBirth: t.dob || undefined,

        passportNumber: t.passportNumber,
        PassportIssueDate: t.PassportIssueDate || undefined,
        passportExpiry: t.passportExpiry || undefined,
        nationality: t.nationality,

        paxType: (t.type || "ADULT").toUpperCase(),
        linkedAdultIndex:
          t.type === "INFANT" ? (t.linkedAdultIndex ?? 0) : null,

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
    // 🚨 SSR VALIDATION
    const ssrCheck = validateMandatorySSR();

    if (!ssrCheck.valid) {
      Swal.fire({
        icon: "warning",
        title: "Required Selection Missing",
        text: ssrCheck.message,
        confirmButtonColor: "#f97316",
      });
      return;
    }

    if (!purposeOfTravel) {
      ToastWithTimer({
        type: "error",
        message: "Please enter purpose of travel",
      });
      return;
    }

    if (
      approvalRequired &&
      !isTravelAdmin &&
      (!projectApproverData.project || !projectApproverData.approver)
    ) {
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

    if (
      !gstDetails?.gstin?.trim() ||
      !gstDetails?.legalName?.trim() ||
      !gstDetails?.address?.trim()
    ) {
      ToastWithTimer({
        type: "error",
        message: "Please fill all GST details",
      });
      return;
    }

    try {
      const payload = buildBookingRequestPayload();
      if (approvalRequired && !isTravelAdmin) {
        await dispatch(
          selectManager({
            approverId: projectApproverData.approver?.id,
            approverEmail: projectApproverData.approver?.email,
            projectCodeId: projectApproverData.project?.id,
            projectName: projectApproverData.project?.name,
            projectClient: projectApproverData.project?.client,
          }),
        ).unwrap();
      }

      const result = await dispatch(createBookingRequest(payload)).unwrap();

      if (!approvalRequired) {
        const requestId = result.bookingRequestId || result._id;
        if (requestId && result.requestStatus !== "approved") {
          await dispatch(
            approveApproval({
              id: requestId,
              comments: "Self Approved by Travel Admin",
              type: "flight",
            }),
          ).unwrap();
        }
        ToastWithTimer({
          type: "success",
          message: "Booking auto-approved successfully",
        });
      }

      navigate("/my-pending-approvals", {
        state: { success: true },
      });
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message:
          err?.message || err?.payload || "Failed to submit booking request",
      });
    }
  };

  // Lightweight readiness check to control submit disable state
  const isFormReady = useMemo(() => {
    if (!purposeOfTravel?.trim()) return false;
    if (!projectApproverData.project) return false;
    if (approvalRequired && !projectApproverData.approver) return false;
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

    if (
      !gstDetails?.gstin?.trim() ||
      !gstDetails?.legalName?.trim() ||
      !gstDetails?.address?.trim()
    )
      return false;

    return true;
  }, [
    purposeOfTravel,
    projectApproverData,
    approvalRequired,
    isTravelAdmin,
    infantCount,
    adultCount,
    travelers,
    parsedFlightData,
    gstDetails,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 border-4 border-slate-200 border-t-[#0A203E] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading flight details…</p>
        </div>
      </div>
    );
  }

  if (!parsedFlightData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md w-full">
          <p className="text-slate-700 font-bold mb-6">
            No flight data available.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 bg-[#0A203E] text-white rounded-xl font-bold hover:brightness-110 transition shadow-lg shadow-[#0A203E]/20 uppercase tracking-widest text-xs"
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
    <div className="min-h-screen bg-slate-50 font-sans">
      <CorporateNavbar />

      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#0A203E] transition group"
          >
            <span className="size-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-[#0A203E]/30 transition-colors">
              <MdArrowBack size={18} />
            </span>
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
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                      Flight Details
                      <span className="px-3 py-1 text-[10px] font-black rounded-full bg-[#C9A84C] text-[#0A203E] uppercase tracking-widest">
                        {tripType}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-md bg-white text-slate-700 uppercase tracking-widest border border-slate-200 shadow-xs">
                        Class:{" "}
                        {CABIN_MAP[
                          selectedFlight?.Segments?.[0]?.[0]?.CabinClass
                        ] || "Economy"}
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-md bg-[#0A203E] text-white uppercase tracking-widest border border-[#0A203E] shadow-sm">
                        Fare:{" "}
                        {selectedFlight?.Segments?.[0]?.[0]
                          ?.SupplierFareClass || "Standard"}
                      </span>
                    </div>
                  </div>
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
                  className="mt-6 w-full text-[11px] font-black text-[#C9A84C] hover:text-[#0A203E] flex justify-center items-center gap-2 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {expandedSections.flightDetails
                    ? "Hide Timeline"
                    : "View Timeline"}
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
                      isSeatReady={isSSRReady}
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
                <FareDetailsModal fareQuote={fareQuote} fareRule={fareRule} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <ProjectApproverBlock onChange={setProjectApproverData} />
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
                disabled={!isFormReady}
                approvalRequired={approvalRequired}
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
