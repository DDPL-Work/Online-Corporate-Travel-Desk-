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
  SelectedSSRSummary,
} from "./CommonComponents";
import { useDispatch, useSelector } from "react-redux";
import {
  getFareQuote,
  getFareRule,
  getSSR,
} from "../../../Redux/Actions/flight.thunks";
import { useFlightSearch } from "../../../context/FlightSearchContext";
import SeatSelectionModal from "./SSR/SeatSelectionModal";
import {
  createBookingRequest,
  instantFlightBooking,
} from "../../../Redux/Actions/booking.thunks";
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
import LandingHeader from "../../../layout/LandingHeader";

import { clearFareDetails } from "../../../Redux/Slice/flightSearchSlice";
import { FiInfo } from "react-icons/fi";

export default function OneFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setActiveTab } = useFlightSearch();

  useEffect(() => {
    dispatch(clearFareDetails());
  }, [dispatch]);

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

  const isSSRError = ssr?.Response?.ResponseStatus === 2;

  const ssrErrorMessage =
    ssr?.Response?.Error?.ErrorMessage || "No seat available";

  const localState = useMemo(() => {
    const localStateStr = localStorage.getItem("flightBookingState");
    return localStateStr ? JSON.parse(localStateStr) : {};
  }, []);

  const {
    selectedFlight,
    searchParams,
    rawFlightData,
    tripType = "one-way",
    isInternational = false,
  } = location.state || localState;

  const [parsedFlightData, setParsedFlightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [selectedMeals, setSelectedMeals] = useState({});

  const [selectedBaggage, setSelectedBaggage] = useState({});
  const [selectedSpecialServices, setSelectedSpecialServices] = useState({});

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
    contactNumber: "",
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
      if (sourceProfile.dob || sourceProfile.dateOfBirth) {
        const rawDob = sourceProfile.dob || sourceProfile.dateOfBirth;
        initial[0].dob = rawDob.split("T")[0];
      }
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
    if (user?.role === "employee" || user?.role === "manager" || user?.role === "travel-admin" || user?.role === "finance_team") {
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
            contactNumber: data.data.contactNumber || "",
          }));
        }
      } catch (err) {
        console.warn("GST fetch failed", err?.message);
      }
    };
    fetchGst();
  }, []);

  useEffect(() => {
    const resultIndex = selectedFlight?.ResultIndex || location.state?.resultIndex || localState?.resultIndex;
    const tId = searchParams?.traceId || traceId || location.state?.traceId || localState?.traceId;

    console.log("FareQuote Trigger Check:", { resultIndex, tId });

    if (!tId || !resultIndex) return;

    dispatch(
      getFareQuote({
        traceId: tId,
        resultIndex,
        snapshotId: selectedFlight?.SnapshotId,
      }),
    );
  }, [
    dispatch,
    searchParams?.traceId,
    traceId,
    selectedFlight,
  ]);

  useEffect(() => {
    const quoteResponse = fareQuote?.Response;
    if (quoteResponse?.ResponseStatus === 2 || quoteResponse?.Error?.ErrorCode > 0) {
      const errorMsg = quoteResponse?.Error?.ErrorMessage || "Pricing failed from the supplier end. Please search again.";
      
      localStorage.setItem("sessionExpiredEvent", Date.now().toString());
      sessionStorage.setItem("traceExpiredMsg", errorMsg);
      sessionStorage.setItem("traceExpired", "true");
      window.close();
      setTimeout(() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/travel");
        }
      }, 300);
    }
  }, [fareQuote, navigate]);

  useEffect(() => {
    const quoteResult = fareQuote?.Response?.Results;

    if (!quoteResult?.ResultIndex) return;

    dispatch(
      getFareRule({
        traceId: searchParams?.traceId || traceId,
        resultIndex: quoteResult.ResultIndex, // 🔑 USE THIS
      }),
    );

    dispatch(
      getSSR({
        traceId: searchParams?.traceId || traceId,
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

  const getSegmentSSRStatus = (idx) => {
    if (!ssr) return "loading";
    if (isSSRError) return "error";
    const segmentSeat = ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[idx];
    const hasSeats = (segmentSeat?.RowSeats?.length || 0) > 0;
    if (!hasSeats) return "none";
    return true;
  };

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
    if (getSegmentSSRStatus(segmentIndex) !== true) {
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

  const toggleSpecialServiceSelection = (
    journeyType,
    segmentIndex,
    svc,
    travelersCount,
  ) => {
    const key = `${journeyType}|${segmentIndex}`;

    setSelectedSpecialServices((prev) => {
      const list = prev[key] || [];
      const exists = list.find((s) => s.Code === svc.Code);

      if (exists) {
        return { ...prev, [key]: list.filter((s) => s.Code !== svc.Code) };
      }

      return { ...prev, [key]: [...list, svc] };
    });
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

    Object.values(selectedSpecialServices).forEach((services) => {
      services?.forEach((s) => (total += Number(s.Price || 0)));
    });

    return total;
  };

  const grandTotal = fareTotals.total + calculateSSRTotal();
  const isAutoApprove = myPolicy?.approvalRequired === false;

  let applicableLimit = 0;
  let isUnlimitedLimit = true;
  if (myPolicy?.flightLimits?.length && parsedFlightData?.segments?.length > 0) {
    const isIntl = parsedFlightData.segments.some(
      (s) => s?.da?.countryCode !== "IN" || s?.aa?.countryCode !== "IN"
    );
    const loc = isIntl ? "International" : "Domestic";
    const cabinNum = Number(parsedFlightData.segments[0]?.cabinClass) || 2;
    const limitObj = myPolicy.flightLimits.find(l => l.location === loc && l.cabinClass === cabinNum);
    if (limitObj) {
      applicableLimit = limitObj.limit;
      isUnlimitedLimit = limitObj.isUnlimited !== false;
    }
  }

  const isOverLimit = isAutoApprove && !isUnlimitedLimit && applicableLimit > 0 && grandTotal > applicableLimit;
  const approvalRequired = !isTravelAdmin && (!isAutoApprove || isOverLimit);

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
          ...meal, // Save full details for future use
          segmentIndex: Number(segmentIndex),
          travelerIndex,
          code: meal.Code,
          description: String(meal.Description || meal.Code || ""),
          airlineDescription: meal.AirlineDescription || meal.Description || meal.Code,
          price: meal.Price,
          type: meal.Type || meal.Way,
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
        ...bag, // Save full details for future use
        segmentIndex: Number(segmentIndex),
        code: bag.Code,
        weight: bag.Weight,
        price: bag.Price,
      });
    });

    return baggage;
  };

  const buildSpecialServicesSSR = () => {
    const services = [];

    Object.entries(selectedSpecialServices).forEach(([key, serviceList]) => {
      if (!Array.isArray(serviceList)) return;
      const [journeyType, segmentIndex] = key.split("|");

      serviceList.forEach((svc, index) => {
        services.push({
          ...svc,
          journeyType,
          segmentIndex: Number(segmentIndex),
          travelerIndex: 0,
          travelerId: travelers[0]?.id,
          code: svc.Code,
          text: svc.Text || svc.Description || "",
          price: svc.Price,
        });
      });
    });

    return services;
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
      amount: grandTotal,
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
      approverId: projectApproverData.approver?.id,
      approverEmail: projectApproverData.approver?.email,
      approverName: projectApproverData.approver?.name,
      approverRole: projectApproverData.approver?.role,
      flightRequest: {
        traceId: searchParams?.traceId,
        resultIndex: selectedFlight?.ResultIndex,

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
          specialServices: buildSpecialServicesSSR(),
        },

        fareExpiry,
        fareRules: fareRule, // ✅ save fare rules for audit
      },

      requesterDetails: {
        name: `${user?.name?.firstName} ${user?.name?.lastName}`,
        email: user?.email,
        role: user?.role, 
        userId: user?._id || user?.id || user?.userId,
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
        totalAmount: grandTotal,
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
          (s) => s?.da?.countryCode !== "IN" || s?.aa?.countryCode !== "IN"
        ),
      );

      if (isInternational && !t.passportNumber?.trim()) {
        e.passportNumber =
          "Passport number is required for international flights";
      }

      if (isInternational && !t.dob) {
        e.dob = "Date of Birth is required for international flights";
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

    if (!projectApproverData.project) {
      ToastWithTimer({
        type: "error",
        message: "Please select a project.",
      });
      return;
    }

    if (
      approvalRequired &&
      !isTravelAdmin &&
      !projectApproverData.approver
    ) {
      ToastWithTimer({
        type: "error",
        message: "Please select an approver.",
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
      // --- Handle Manual Project Creation ---
      if (projectApproverData.project && !projectApproverData.project._id) {
        try {
          const projectRes = await api.post("/corporate-projects/create", {
            projectCodeId: projectApproverData.project.id,
            projectName: projectApproverData.project.name,
            clientName: projectApproverData.project.client,
          });
          // Update the local project data with the created _id so further processes use it if needed
          if (projectRes.data?.data?._id) {
             projectApproverData.project._id = projectRes.data.data._id;
          }
        } catch (projErr) {
           console.error("Failed to save manual project:", projErr);
        }
      }

      const payload = buildBookingRequestPayload();
      let result;
      if (!approvalRequired) {
        // ✅ Use instant booking API for auto-approved policies
        result = await dispatch(instantFlightBooking(payload)).unwrap();
        ToastWithTimer({
          type: "success",
          message: "Flight booked automatically per policy",
        });
      } else {
        // ✅ Traditional approval workflow
        const isApproverTravelAdmin = projectApproverData.approver?.role === "travel-admin";
        if (!isTravelAdmin && !isApproverTravelAdmin) {
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
        result = await dispatch(createBookingRequest(payload)).unwrap();

        // Handle case where it might still be auto-approved at backend but we used createBookingRequest
        if (result.autoApproved || result.requestStatus === "approved") {
          ToastWithTimer({
            type: "success",
            message: "Booking auto-approved successfully",
          });
        }
      }

      if (result.autoApproved || result.requestStatus === "approved") {
        navigate("/my-bookings", {
          state: { success: true },
        });
      } else {
        navigate("/my-pending-approvals", {
          state: { success: true },
        });
      }
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
      if (isIntl && !t.dob) return false;
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

  if (loading || !fareQuote) {
    return (
      <div className="min-h-screen bg-[#000D26] flex items-center justify-center">
        <div className="text-center p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl">
          <div className="h-16 w-16 border-4 border-slate-600 border-t-[#C9A240] rounded-full animate-spin mx-auto mb-6 shadow-inner" />
          <p className="text-white font-semibold text-lg mb-2">Revalidating Flight & Fares...</p>
          <p className="text-slate-400 text-sm">Please wait while we fetch the latest fare details and seat maps.</p>
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
            className="w-full py-4 bg-[#000D26] text-white rounded-xl font-bold hover:brightness-110 transition shadow-lg shadow-[#000D26]/20 uppercase tracking-widest text-xs"
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
      <LandingHeader />

      {/* Top Bar - Journey Details */}
      <div className="bg-[#000D26] border-b border-[#000D26]/80 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
              Journey Info
            </span>
            <div className="h-4 w-[1px] bg-slate-500/50"></div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 text-xs font-black rounded-lg bg-[#C9A240] text-[#000D26] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#000D26] animate-pulse"></span>
                {tripType?.replace("-", " ")}
              </span>
              <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider border ${
                isInternational 
                  ? "bg-purple-950/40 text-purple-300 border-purple-800/40" 
                  : "bg-blue-950/40 text-blue-300 border-blue-800/40"
              }`}>
                {isInternational ? "International" : "Domestic"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="px-3 py-1 text-xs font-black rounded-lg bg-[#102238]/60 text-slate-100 border border-[#102238] uppercase tracking-wider flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Cabin:</span>{" "}
              {CABIN_MAP[selectedFlight?.Segments?.[0]?.[0]?.CabinClass] || "Economy"}
            </span>
            {selectedFlight?.Segments?.[0]?.[0]?.SupplierFareClass && (
              <span className="px-3 py-1 text-xs font-black rounded-lg bg-amber-950/30 text-[#C9A240] border border-[#C9A240]/30 uppercase tracking-wider flex items-center gap-1">
                <span className="text-[10px] text-amber-500/70 font-semibold uppercase">Class:</span>{" "}
                {selectedFlight.Segments[0][0].SupplierFareClass}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">
            {/* Flight Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                    <MdFlightTakeoff size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      Flight Details
                     
                    </h3>
                    <p className="text-[11px] text-slate-500">Review your journey</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
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
                  className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 font-semibold rounded-lg hover:border-[#C9A84C] hover:text-[#C9A84C] hover:bg-[#C9A84C]/5 transition flex justify-center items-center gap-2 text-[12px] uppercase tracking-widest cursor-pointer"
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
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <FlightTimeline
                      segments={parsedFlightData.segments || []}
                      selectedSeats={selectedSeats}
                      openSeatModal={openSeatModal}
                      journeyType="onward"
                      isSeatReady={getSegmentSSRStatus}
                    />
                  </div>
                </div>
              )}
            </div>


            {/* Selected Add-ons Summary */}
            <SelectedSSRSummary
              selectedSeats={selectedSeats}
              selectedMeals={selectedMeals}
              selectedBaggage={selectedBaggage}
              selectedSpecialServices={selectedSpecialServices}
              travelers={travelers}
              segments={fullSegments}
            />

            {/* Traveller Details */}
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 p-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
                    <FiInfo size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Fare Rules & Policies
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cancellation & modification details
                    </p>
                  </div>
                </div>
                {/* Button + Modal */}
                <FareDetailsModal fareQuote={fareQuote} fareRule={fareRule} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <ProjectApproverBlock onChange={setProjectApproverData} approvalRequired={approvalRequired} />
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
                selectedSpecialServices={selectedSpecialServices}
                approver={approver}
                approverLoading={approverLoading}
                approverError={approverError}
                onSendForApproval={handleSendForApproval}
                loading={actionLoading}
                approvalRequired={approvalRequired}
              />

              {/* <Amenities /> */}
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
          traceId={searchParams?.traceId}
          resultIndex={selectedFlight?.ResultIndex}
          selectedMeals={selectedMeals}
          selectedBaggage={selectedBaggage}
          onToggleMeal={toggleMealSelection}
          onSelectBaggage={handleSelectBaggage}
          selectedSpecialServices={selectedSpecialServices}
          onToggleSpecialServices={toggleSpecialServiceSelection}
          ssrError={isSSRError}
          ssrErrorMessage={ssrErrorMessage}
        />
      )}
    </div>
  );
}

/* Small helper component */
const InfoBox = ({ icon, label, value }) => (
  <div className="bg-gradient-to-br from-[#0A203E]/[0.02] to-[#C9A84C]/[0.05] rounded-xl border border-[#0A203E]/10 p-4 shadow-sm hover:border-[#C9A84C]/40 hover:shadow-md transition-all">
    <div className="flex items-center gap-2 text-[#C9A84C] text-[11px] mb-3 font-black uppercase tracking-widest">
      <div className="p-1.5 bg-white rounded-md shadow-sm border border-[#C9A84C]/20">
        {icon}
      </div>
      <span className="text-[#0A203E]">{label}</span>
    </div>
    <div className="text-[#0A203E] text-sm">{value}</div>
  </div>
);
