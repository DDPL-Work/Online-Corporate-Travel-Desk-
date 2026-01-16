// src/components/Flights/OneFlightBooking.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { MdArrowBack, MdFlightTakeoff, MdFlightLand } from "react-icons/md";
import { BsCalendar4 } from "react-icons/bs";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

import {
  formatDate,
  parseFlightData,
  FlightTimeline,
  FareOptions,
  PriceSummary,
  ImportantInformation,
  BaggageTable,
  Amenities,
  HotelHomeButton,
  CTABox,
  FareRulesAccordion,
  TravelerForm,
} from "./CommonComponents";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import {
  getFareQuote,
  getFareRule,
  getSSR,
} from "../../../Redux/Actions/flight.thunks";
import SeatSelectionModal from "./SeatSelectionModal";
import { createBookingRequest } from "../../../Redux/Actions/booking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";

const normalizeFareRules = (fareRule) => {
  const rules = fareRule?.Response?.FareRules;
  if (!rules || !rules.length) return null;

  return {
    cancellation: [],
    dateChange: [],
    baggage: [],
    important: rules.map((r) => r.FareRuleDetail).filter(Boolean),
  };
};

export default function OneFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { traceId, fareQuote, fareRule, ssr } = useSelector(
    (state) => state.flights
  );

  const { actionLoading } = useSelector((state) => state.bookings);

  const {
    selectedFlight,
    searchParams,
    rawFlightData,
    tripType = "one-way",
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
  // ===== Traveler State =====
  const initialTraveler = (id) => ({
    id,
    title: "MR",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    age: "",
    email: "",
    phoneWithCode: "",
    passportNumber: "",
    passportExpiry: "",
    nationality: "",
    dob: "",
  });

  const [travelers, setTravelers] = useState(() => {
    const count = searchParams?.passengers?.adults || searchParams?.adults || 1;

    return Array.from({ length: count }, (_, i) => initialTraveler(i + 1));
  });

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

  const baggageInfo = React.useMemo(() => {
    if (!ssr?.Results?.Baggage?.length) return {};

    const bag = ssr.Results.Baggage[0];

    return {
      cB: "7 Kg",
      iB: bag.Weight,
    };
  }, [ssr]);

  useEffect(() => {
    if (!searchParams?.traceId || !selectedFlight?.ResultIndex) return;

    dispatch(
      getFareQuote({
        traceId: searchParams.traceId,
        resultIndex: selectedFlight.ResultIndex,
      })
    );
  }, [dispatch, searchParams?.traceId, selectedFlight?.ResultIndex]);

  useEffect(() => {
    const quoteResult = fareQuote?.Response?.Results;

    if (!quoteResult?.ResultIndex) return;

    dispatch(
      getFareRule({
        traceId: searchParams.traceId,
        resultIndex: quoteResult.ResultIndex, // 🔑 USE THIS
      })
    );

    dispatch(
      getSSR({
        traceId: searchParams.traceId,
        resultIndex: quoteResult.ResultIndex,
      })
    );
  }, [
    fareQuote?.Response?.Results?.ResultIndex,
    dispatch,
    searchParams?.traceId,
  ]);

  useEffect(() => {
    console.log("SSR DATA:", ssr);
  }, [ssr]);

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
    const segments = ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat;
    return Array.isArray(segments) && segments.length > 0;
  }, [ssr]);

  const openSeatModal = (segmentIndex) => {
    if (!isSeatReady) return;

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

  const maxTravelers =
    searchParams?.passengers?.adults || searchParams?.adults || 1;

  const addTraveler = () => {
    if (travelers.length >= maxTravelers) return;

    setTravelers((prev) => [...prev, initialTraveler(Date.now())]);
  };

  const removeTraveler = (id) => {
    setTravelers((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTraveler = (id, field, value) => {
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const perAdultFare = useMemo(() => {
    const fare = fareQuote?.Response?.Results?.Fare;
    if (!fare) return { base: 0, tax: 0 };

    return {
      base: Number(fare.BaseFare || fare.PublishedFare || 0),
      tax: Number(fare.Tax || 0),
    };
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

    const bookingSnapshot = {
      bookingType: "flight",
      sectors: segments.map((s) => `${s.from}-${s.to}`),
      airline: segments.map((s) => s.airline).join(", ") || "N/A",
      travelDate: firstSegment?.dt || "N/A",
      returnDate: lastSegment?.at || "N/A",
      amount:
        perAdultFare.base * travelers.length +
        perAdultFare.tax * travelers.length +
        calculateSSRTotal(),
      purposeOfTravel: purposeOfTravel || "N/A",
      city: lastSegment?.to || "N/A",
    };

    return {
      bookingType: "flight",
      flightRequest: {
        traceId: searchParams.traceId,
        resultIndex: selectedFlight.ResultIndex,

        segments: fullSegments,

        fareSnapshot,

        ssrSnapshot: {
          seats: buildSeatSSR(),
          meals: buildMealSSR(),
          baggage: buildBaggageSSR(),
        },

        fareExpiry: fareSnapshot.lastTicketDate,
      },

      travellers: travelers.map((t, idx) => ({
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        gender: t.gender,
        dateOfBirth: t.dob,
        passportNumber: t.passportNumber,
        passportExpiry: t.passportExpiry,
        nationality: t.nationality,
        isLeadPassenger: idx === 0,
      })),

      purposeOfTravel,
      bookingSnapshot, // ✅ include summary for backend to save
      pricingSnapshot: {
        totalAmount:
          perAdultFare.base * travelers.length +
          perAdultFare.tax * travelers.length +
          calculateSSRTotal(),
        currency: "INR",
      },
    };
  };

  const validateTravelers = () => {
    const errors = {};
    let isValid = true;

    travelers.forEach((t, idx) => {
      const e = {};

      if (!t.firstName?.trim()) e.firstName = "First name is required";
      if (!t.lastName?.trim()) e.lastName = "Last name is required";
      if (!t.gender?.trim()) e.gender = "Gender is required";
      if (!t.email?.trim()) e.email = "Email is required";
      if (!t.dob?.trim()) e.dob = "Date of birth is required";
      if (!t.phoneWithCode?.trim())
        e.phoneWithCode = "Phone number is required";
      if (!t.nationality?.trim()) e.nationality = "Nationality is required";

      // passportNumber validation: only if flight is international
      const isInternational = Boolean(
        parsedFlightData?.segments?.some(
          (s) =>
            s?.origin?.country &&
            s?.destination?.country &&
            s.origin.country !== s.destination.country
        )
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
        message: "Failed to submit booking request",
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

  const travelerCount =
    searchParams?.passengers?.adults || searchParams?.adults || 1;

  const travelersForSeat = Array.from({ length: travelerCount }, (_, i) => ({
    id: i + 1,
  }));

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
                addTraveler={addTraveler}
                removeTraveler={removeTraveler}
                updateTraveler={updateTraveler}
                errors={travelerErrors}
                parsedFlightData={parsedFlightData}
                maxTravelers={maxTravelers}
                purposeOfTravel={purposeOfTravel}
                setPurposeOfTravel={setPurposeOfTravel}
              />
            </div>

            {/* Fare Selection */}
            <div className="bg-white rounded-2xl  shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Fare Options
              </h3>
              <FareOptions
                fareRules={fareQuote?.Response?.Results}
                fareRulesStatus={
                  fareQuote?.Response?.Results ? "succeeded" : "loading"
                }
              />

              {ssr?.Response?.MealDynamic?.[0]?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Meals</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {ssr.Response.MealDynamic[0].map((meal, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{meal.Description}</p>
                          <p className="text-sm text-gray-500">{meal.Code}</p>
                        </div>
                        <p className="font-bold text-blue-600">₹{meal.Price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info & Baggage */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl  shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">
                  Important Information
                </h3>
                <FareRulesAccordion
                  fareRules={normalizeFareRules(fareRule)}
                  fareRulesStatus={!fareRule ? "loading" : "succeeded"}
                />
              </div>

              {/* <div className="bg-white rounded-2xl  shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">Baggage & Inclusions</h3>
                <BaggageTable baggageInfo={baggageInfo} />
              </div> */}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <PriceSummary
                parsedFlightData={{
                  ...parsedFlightData,
                  baseFare: perAdultFare.base * travelers.length,
                  taxFare: perAdultFare.tax * travelers.length,
                }}
                travelers={travelers}
                selectedSeats={selectedSeats}
                selectedMeals={selectedMeals}
                selectedBaggage={selectedBaggage}
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
