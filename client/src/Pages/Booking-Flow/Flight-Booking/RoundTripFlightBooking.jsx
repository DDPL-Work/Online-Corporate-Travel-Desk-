import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  MdArrowBack,
  MdFlightTakeoff,
  MdFlightLand,
  MdEventSeat,
} from "react-icons/md";
import { FaPlane, FaUser, FaWifi } from "react-icons/fa";
import {
  BsTag,
  BsInfoCircleFill,
  BsCashStack,
  BsCalendar4,
} from "react-icons/bs";
import { AiOutlineCheck, AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { BiTime } from "react-icons/bi";
import {
  IoPersonAdd,
  IoPersonRemove,
  IoAirplaneOutline,
} from "react-icons/io5";
import { GoPeople } from "react-icons/go";
import { PiForkKnifeBold } from "react-icons/pi";
import { RiHotelLine } from "react-icons/ri";
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
} from "./CommonComponents";
import { useDispatch, useSelector } from "react-redux";
import {
  reviewPrices,
  selectBookingId,
  fetchFareRules,
  selectFareRules,
  selectFareRulesStatus,
} from "../../features/slices/flightSearchSlice";
import { ToastWithTimer } from "../../utils/ToastWithTimer";

export default function RoundTripFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  console.log("🟦 NAVIGATION STATE:", location.state);
  console.log(
    "🟦 SELECTED priceIds:",
    location.state?.selectedFlight?.priceIds
  );
  console.log("🟦 RAW priceIds:", location.state?.rawFlightData?.priceIds);

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
  const [couponCode, setCouponCode] = useState("");
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
  const [expandedFare, setExpandedFare] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState({
    flight: null,
    flightIndex: null,
    journeyType: null,
    bookingId: null,
    show: false,
  });

  const [selectedFare, setSelectedFare] = useState("Standard");
  const [parsedFlightData, setParsedFlightData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reduxBookingId = useSelector(selectBookingId);
  const fareRules = useSelector(selectFareRules);
  const fareRulesStatus = useSelector(selectFareRulesStatus);
  const [seatReviewData, setSeatReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (rawFlightData) {
      try {
        console.log("=== RoundTripFlightBooking - Parsing Data ===");
        console.log("Raw Flight Data:", rawFlightData);
        console.log("Search Params:", searchParams);
        console.log("Trip Type:", tripType);

        const parsedData = parseFlightData(
          rawFlightData,
          tripType,
          searchParams
        );

        console.log("=== Parsed Result ===");
        console.log("Parsed Data:", parsedData);

        setParsedFlightData(parsedData);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing flight data:", error);
        setLoading(false);
      }
    } else {
      console.warn("No rawFlightData provided");
      setLoading(false);
    }
  }, [rawFlightData, tripType, searchParams]);

  useEffect(() => {
    if (!loading && (!selectedFlight || !rawFlightData)) {
      navigate("/");
    }
  }, [selectedFlight, rawFlightData, navigate, loading]);

  // Helper functions to get city data from segments
  const getCityFromSegment = (segments, isDeparture = true) => {
    if (!segments || segments.length === 0) return "N/A";
    const segment = segments[0];
    return isDeparture ? segment?.da?.city : segment?.aa?.city;
  };

  const getCityCodeFromSegment = (segments, isDeparture = true) => {
    if (!segments || segments.length === 0) return "N/A";
    const segment = segments[0];
    return isDeparture ? segment?.da?.code : segment?.aa?.code;
  };

  // Use segment data directly for reliable city names
  //   const onwardFrom = getCityFromSegment(parsedFlightData?.onwardSegments, true);
  //   const onwardTo = getCityFromSegment(parsedFlightData?.onwardSegments, false);
  const onwardFromCode = getCityCodeFromSegment(
    parsedFlightData?.onwardSegments,
    true
  );
  const onwardToCode = getCityCodeFromSegment(
    parsedFlightData?.onwardSegments,
    false
  );

  //   const returnFrom = getCityFromSegment(parsedFlightData?.returnSegments, true);
  //   const returnTo = getCityFromSegment(parsedFlightData?.returnSegments, false);
  const returnFromCode = getCityCodeFromSegment(
    parsedFlightData?.returnSegments,
    true
  );
  const returnToCode = getCityCodeFromSegment(
    parsedFlightData?.returnSegments,
    false
  );

  //   // For dates, use the segment departure times
  //   const onwardDate = parsedFlightData?.onwardSegments?.[0]?.dt ?
  //                     formatDate(parsedFlightData.onwardSegments[0].dt) : "N/A";
  //   const returnDate = parsedFlightData?.returnSegments?.[0]?.dt ?
  //                     formatDate(parsedFlightData.returnSegments[0].dt) : "N/A";

  // In RoundTripFlightBooking.jsx, replace the city and date assignment with:

  // CORRECTED: Use searchParams for the intended journey direction
  const onwardFrom = searchParams?.from?.city || searchParams?.from || "Delhi";
  const onwardTo = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const onwardDate = searchParams?.departureDate
    ? formatDate(searchParams.departureDate)
    : "Nov 24, 2025";

  const returnFrom = searchParams?.to?.city || searchParams?.to || "Mumbai";
  const returnTo = searchParams?.from?.city || searchParams?.from || "Delhi";
  const returnDate = searchParams?.returnDate
    ? formatDate(searchParams.returnDate)
    : "Nov 28, 2025";

  console.log("=== CORRECTED JOURNEY ASSIGNMENT ===");
  console.log("Onward:", onwardFrom, "→", onwardTo, "on", onwardDate);
  console.log("Return:", returnFrom, "→", returnTo, "on", returnDate);

  // Debug logging
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

  const normalizeTripType = (type) => {
    if (!type) return "OW";

    const t = type.toLowerCase();

    if (t.includes("round")) return "round-trip";
    if (t.includes("multi")) return "Multi-city";
    return "one-way";
  };

  // === AUTO FETCH BOOKING ID WHEN PARSED DATA IS READY ===
  // useEffect(() => {
  //   if (!parsedFlightData) return;

  //   const priceIds = extractPriceIds(
  //     parsedFlightData,
  //     rawFlightData?.tripInfos
  //   );
  //   if (priceIds.length === 0) return;

  //   // 1️⃣ Review API → bookingId
  //   dispatch(
  //     reviewPrices({
  //       priceIds,
  //       searchParams,
  //       tripType: normalizeTripType(tripType),
  //     })
  //   )
  //     .unwrap()
  //     .then((res) => {
  //       sessionStorage.setItem("bookingId", res.bookingId);

  //       // 2️⃣ Fetch Fare Rules immediately after review succeeds
  //       dispatch(
  //         fetchFareRules({
  //           priceIds,
  //           tripType: normalizeTripType(tripType),
  //         })
  //       );
  //     })
  //     .catch((err) => console.error("Review Error:", err));
  // }, [parsedFlightData]);

  console.log("Booking Id:", reduxBookingId);

  const fareOptions = useMemo(() => {
    if (!parsedFlightData) return [];
    const totalBasePrice =
      (parsedFlightData.basePrice || 0) +
      (parsedFlightData.returnBasePrice || 0);

    return [
      {
        type: "Saver",
        price: Math.round(totalBasePrice * 0.85),
        popular: false,
        features: [
          {
            text: parsedFlightData.baggageInfo?.cB || "7kg hand baggage",
            included: true,
          },
          { text: "No check-in baggage", included: false },
          { text: "No meal included", included: false },
          { text: "Standard seat", included: true },
          { text: "Free web check-in", included: true },
          { text: "Boarding pass access", included: true },
        ],
        conditions: [
          "No refund on cancellation",
          "₹3,000 fee for date changes",
          "Name change not allowed",
        ],
      },
      {
        type: "Standard",
        price: totalBasePrice,
        popular: true,
        features: [
          {
            text: parsedFlightData.baggageInfo?.cB || "7kg hand baggage",
            included: true,
          },
          {
            text: parsedFlightData.baggageInfo?.iB || "15kg check-in baggage",
            included: true,
          },
          { text: "Complimentary meal", included: true },
          { text: "Standard seat selection", included: true },
          { text: "Free web check-in", included: true },
          { text: "Priority boarding", included: true },
        ],
        conditions: [
          parsedFlightData.isRefundable
            ? "50% refund if cancelled 24hrs+ before departure"
            : "No refund on cancellation",
          "₹2,000 fee for date changes",
          "Name change allowed with fee",
        ],
      },
      {
        type: "Flexi",
        price: Math.round(totalBasePrice * 1.15),
        popular: false,
        features: [
          { text: "10kg hand baggage", included: true },
          { text: "25kg check-in baggage", included: true },
          { text: "Premium meal & beverage", included: true },
          { text: "Priority seat selection", included: true },
          { text: "Free date changes unlimited", included: true },
          { text: "Fast track security", included: true },
        ],
        conditions: [
          "90% refund if cancelled anytime",
          "Free date changes unlimited",
          "Name change allowed once free",
        ],
      },
    ];
  }, [parsedFlightData]);

  const selectedFareData = useMemo(() => {
    return (
      fareOptions.find((f) => f.type === selectedFare) ||
      fareOptions[1] || { price: 0 }
    );
  }, [fareOptions, selectedFare]);

  const structuredFareRules = useMemo(() => {
    if (!fareRules || !fareRules.FR) return null;

    const fr = fareRules.FR.ADULT || {};

    const extract = (arr) =>
      Array.isArray(arr)
        ? arr.map((s) => (typeof s === "string" ? s : s.rule || ""))
        : [];

    return {
      cancellation: extract(fr.CANCELLATION),
      dateChange: extract(fr.DATECHANGE),
      baggage: extract(fr.BAGGAGE),
      important: extract(fr.IMPORTANTINFO),
    };
  }, [fareRules]);

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

  const toggleSeatSelection = (journeyType, flightIdx, seatNum, price = 0) => {
    setSelectedSeats((prev) => {
      // const key = `${journeyType}-flight-${flightIdx}`;
      const key = `${journeyType}|${flightIdx}`;
      const current = prev[key] || { list: [], priceMap: {} };

      const isSelected = current.list.includes(seatNum);

      // ❌ Prevent selecting more seats than travelers
      if (!isSelected && current.list.length >= travelers.length) {
        ToastWithTimer({
          message: `You can only select ${travelers.length} seat(s) for ${travelers.length} traveler(s)`,
          type: "info",
          duration: 3000,
        });
        return prev;
      }

      const updatedList = isSelected
        ? current.list.filter((s) => s !== seatNum)
        : [...current.list, seatNum];

      const updatedPriceMap = { ...current.priceMap };
      if (isSelected) {
        delete updatedPriceMap[seatNum];
      } else {
        updatedPriceMap[seatNum] = price;
      }

      return {
        ...prev,
        [key]: {
          list: updatedList,
          priceMap: updatedPriceMap,
        },
      };
    });
  };

  // const openSeatModal = (flight, flightIndex, journeyType, date) => {
  //   const bookingId =
  //     reduxBookingId || sessionStorage.getItem("bookingId") || null;

  //   if (!bookingId) {
  //     alert("Booking ID not ready yet. Please wait 1–2 seconds.");
  //     return;
  //   }

  //   setShowSeatModal({
  //     flight,
  //     flightIndex,
  //     journeyType,
  //     bookingId,
  //     date,
  //     show: true,
  //   });
  // };

  const openSeatModal = async (segment, segmentIndex, journeyType, date) => {
    try {
      if (seatReviewData?.bookingId) {
        setShowSeatModal({
          show: true,
          segment,
          segmentIndex,
          journeyType,
          bookingId: seatReviewData.bookingId,
          date,
        });
        return;
      }

      const priceIds = extractPriceIds(parsedFlightData);

      console.log("REVIEW priceIds:", priceIds);

      if (priceIds.length !== 2) {
        ToastWithTimer({
          type: "error",
          message: "Price expired. Please re-search.",
        });
        return;
      }

      setReviewLoading(true);

      const res = await dispatch(
        reviewPrices({
          priceIds,
          searchParams,
          tripType: "round-trip", // ✅ FIXED
        })
      ).unwrap();

      if (res.conditions?.isa !== true) {
        ToastWithTimer({
          type: "info",
          message: "Seat selection not available for this flight.",
        });
        return;
      }

      setSeatReviewData(res);

      setShowSeatModal({
        show: true,
        segment,
        segmentIndex,
        journeyType,
        bookingId: res.bookingId,
        date,
      });
    } catch (err) {
      console.error("REVIEW ERROR:", err);
      ToastWithTimer({
        type: "error",
        message: "Price expired. Please re-search.",
      });
      navigate(-1);
    } finally {
      setReviewLoading(false);
    }
  };

  const closeSeatModal = () => {
    setShowSeatModal({ flight: null, flightIndex: null, show: false });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

  const extractPriceIds = (parsed) => {
    if (!parsed) return [];

    const pickFareId = (list) =>
      Array.isArray(list) && list.length ? list[0].id : null;

    if (parsed.type === "round-trip") {
      return [
        pickFareId(parsed.onwardData?.totalPriceList),
        pickFareId(parsed.returnData?.totalPriceList),
      ].filter(Boolean);
    }

    if (parsed.type === "one-way") {
      return [pickFareId(parsed.totalPriceList)].filter(Boolean);
    }

    if (parsed.type === "Multi-city") {
      return (parsed.allSegmentsData || [])
        .map((seg) => pickFareId(seg.totalPriceList))
        .filter(Boolean);
    }

    return [];
  };

  const getTotalDurationDisplay = () => {
    if (!parsedFlightData) return "0h:00m";
    const onwardDuration = parsedFlightData.totalDuration || 0;
    const returnDuration = parsedFlightData.returnTotalDuration || 0;
    return `${formatDurationCompact(onwardDuration)} + ${formatDurationCompact(
      returnDuration
    )}`;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">
            Loading flight details...
          </p>
        </div>
      </div>
    );
  }

  if (!parsedFlightData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-semibold">
            No flight data available. Please search again.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const totalDurationDisplay = getTotalDurationDisplay();

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <SeatSelectionModal
        isOpen={showSeatModal.show}
        onClose={closeSeatModal}
        segment={showSeatModal.segment}
        segmentIndex={showSeatModal.segmentIndex}
        journeyType={showSeatModal.journeyType}
        bookingId={showSeatModal.bookingId}
        reviewResponse={seatReviewData} // ✅ REQUIRED
        travelers={travelers}
        selectedSeats={selectedSeats}
        onSeatSelect={toggleSeatSelection}
        date={showSeatModal.date}
        flightIndex={showSeatModal.segmentIndex}
      />

      {/* Header */}
      <div className={`${blueBg} text-white shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 hover:text-orange-400 transition"
            >
              <MdArrowBack size={20} />
              <span className="text-sm font-medium">
                Back to Search Results
              </span>
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm">
                Booking ID:{seatReviewData?.bookingId || "—"}
              </span>
              <span className="text-sm bg-orange-500 px-2 py-1 rounded">
                ROUND-TRIP
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto">
        <div className="max-w-6/7 mx-auto py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Overview Card */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div
                  className={`${blueBg} bg-linear-to-r from-[#1a2957] to-[#2d4a7c] text-white p-6`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 ${orangeBg} rounded-full flex items-center justify-center shadow-lg`}
                    >
                      <FaPlane className="text-white text-xl" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        Round Trip Flight Details
                      </h2>
                      <p className="text-sm text-blue-100 font-medium">
                        Complete journey information
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white text-gray-950 bg-opacity-15 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">
                      <div className="flex items-center gap-2 mb-2">
                        <MdFlightTakeoff className="text-orange-400 text-xl" />
                        <span className="text-sm  font-semibold">
                          Onward Journey
                        </span>
                      </div>
                      <p className="font-bold text-lg">
                        {onwardFrom} → {onwardTo}
                      </p>
                      <p className="text-sm font-medium text-blue-900">
                        {onwardDate}
                      </p>
                    </div>

                    <div className="bg-white text-gray-950 bg-opacity-15 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">
                      <div className="flex items-center gap-2 mb-2">
                        <MdFlightLand className="text-purple-400 text-xl" />
                        <span className="text-sm font-semibold">
                          Return Journey
                        </span>
                      </div>
                      <p className="font-bold text-lg">
                        {returnFrom} → {returnTo}
                      </p>
                      <p className="text-sm text-blue-900">{returnDate}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white text-gray-950 bg-opacity-15 backdrop-blur-sm rounded-lg p-3 text-center border border-white border-opacity-20">
                      <BiTime className="text-orange-400 text-xl mx-auto mb-1.5" />
                      <p className="text-xs font-bold uppercase tracking-wide mb-1">
                        Duration
                      </p>
                      <p className="font-bold text-sm">
                        {totalDurationDisplay}
                      </p>
                    </div>

                    <div className="bg-white text-gray-950 bg-opacity-15 backdrop-blur-sm rounded-lg p-3 text-center border border-white border-opacity-20">
                      <GoPeople className="text-orange-400 text-xl mx-auto mb-1.5" />
                      <p className="text-xs font-bold uppercase tracking-wide mb-1">
                        Travelers
                      </p>
                      <p className="font-bold text-sm">
                        {travelers.length} Adult
                        {travelers.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="bg-white text-gray-950 bg-opacity-15 backdrop-blur-sm rounded-lg p-3 text-center border border-white border-opacity-20">
                      <BsCashStack className="text-orange-400 text-xl mx-auto mb-1.5" />
                      <p className="text-xs font-bold uppercase tracking-wide mb-1">
                        Total
                      </p>
                      <p className="font-bold text-sm">
                        ₹{parsedFlightData.totalPrice?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Onward Flight Details */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleSection("onwardFlightDetails")}
                  className="w-full bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-5 flex items-center justify-between hover:from-green-100 hover:to-emerald-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <AiOutlineCheck className="text-white text-2xl" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-green-800">
                        Onward Journey:{" "}
                        <span className="text-gray-900">{onwardFrom}</span>
                        <span className="text-orange-600 mx-2 font-extrabold">
                          →
                        </span>
                        <span className="text-gray-900">{onwardTo}</span>
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
                        {onwardDate} •{" "}
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

                {expandedSections.onwardFlightDetails && (
                  <div className="p-6 bg-linear-to-b from-gray-50 to-white">
                    <h3 className="text-lg font-bold mb-4">
                      Onward Flight Timeline
                    </h3>
                    <RoundTripFlightTimeline
                      segments={parsedFlightData.onwardSegments || []}
                      isReturnJourney={false}
                      selectedSeats={selectedSeats}
                      openSeatModal={(flight, flightIdx) =>
                        openSeatModal(flight, flightIdx, "onward")
                      }
                      flightData={parsedFlightData.onwardData?.flightData}
                      onSeatSelect={(flightIdx, seat) =>
                        toggleSeatSelection("onward", flightIdx, seat)
                      }
                    />
                  </div>
                )}
              </div>

              {/* Return Flight Details */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleSection("returnFlightDetails")}
                  className="w-full bg-linear-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-5 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <AiOutlineCheck className="text-white text-2xl" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-purple-800">
                        Return Journey:{" "}
                        <span className="text-gray-900">{returnFrom}</span>
                        <span className="text-orange-600 mx-2 font-extrabold">
                          →
                        </span>
                        <span className="text-gray-900">{returnTo}</span>
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
                        {returnDate} •{" "}
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

                {expandedSections.returnFlightDetails && (
                  <div className="p-6 bg-linear-to-b from-gray-50 to-white">
                    <h3 className="text-lg font-bold mb-4">
                      Return Flight Timeline
                    </h3>
                    <RoundTripFlightTimeline
                      segments={parsedFlightData.returnSegments}
                      isReturnJourney={true}
                      selectedSeats={selectedSeats}
                      openSeatModal={(flight, flightIdx) =>
                        openSeatModal(flight, flightIdx, "return")
                      }
                      flightData={parsedFlightData.returnData?.flightData}
                      onSeatSelect={(flightIdx, seat) =>
                        toggleSeatSelection("return", flightIdx, seat)
                      }
                    />
                  </div>
                )}
              </div>

              {/* Fare Options */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-4">Select Your Fare</h3>
                <FareOptions
                  fareOptions={fareOptions}
                  selectedFare={selectedFare}
                  onFareSelect={setSelectedFare}
                  expandedFare={expandedFare}
                  onExpandFare={setExpandedFare}
                />
              </div>

              {/* Traveler Details */}
              <TravelerForm
                travelers={travelers}
                addTraveler={addTraveler}
                removeTraveler={removeTraveler}
                updateTraveler={updateTraveler}
              />

              {/* Important Information */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-4">
                  Important Information
                </h3>
                <ImportantInformation
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                  fareRules={structuredFareRules}
                  fareRulesStatus={fareRulesStatus}
                />
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-4">Fare Rules</h3>
                <FareRulesAccordion
                  fareRules={structuredFareRules}
                  fareRulesStatus={fareRulesStatus}
                />
              </div>

              {/* Baggage & Inclusions */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-4">Baggage & Inclusions</h3>
                <BaggageTable
                  baggageInfo={parsedFlightData.baggageInfo || {}}
                  fareClass={parsedFlightData.fareClass || ""}
                />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1">
              <PriceSummary
                selectedFareData={selectedFareData}
                travelers={travelers}
                totalSeatPrice={totalSeatPrice}
                couponCode={couponCode}
                onCouponChange={(e) =>
                  setCouponCode(e.target.value.toUpperCase())
                }
                onApplyCoupon={() =>
                  console.log("Applying coupon:", couponCode)
                }
                parsedFlightData={parsedFlightData}
                discountAmount={0}
                selectedSeats={selectedSeats}
              />

              <div className="mt-6 space-y-4">
                {/* Amenities section  */}
                <Amenities />

                {/* Need Hotel Button  */}
                <HotelHomeButton />

                {/* CTA Section */}
                <CTABox />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
