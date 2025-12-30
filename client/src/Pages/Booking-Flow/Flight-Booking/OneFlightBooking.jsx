// src/components/Flights/OneFlightBooking.jsx
import React, { useEffect, useState } from "react";
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
} from "./CommonComponents";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import {
  getFareQuote,
  getFareRule,
  getSSR,
} from "../../../Redux/Actions/flight.thunks";
import SeatSelectionModal from "./SeatSelectionModal";

const normalizeFareOptions = ({ fareQuote, fareRule }) => {
  const results = fareQuote?.Response?.Results;
  if (!results || !results.length) return [];

  const fare = results[0].Fare;

  const rules = fareRule?.Response?.FareRules || [];

  const hasCancellation = rules.some((r) =>
    /cancel/i.test(r.FareRuleDetail || "")
  );

  const hasDateChange = rules.some((r) =>
    /reissue|date change/i.test(r.FareRuleDetail || "")
  );

  return [
    {
      type: fare.FareClassification?.Type || "Standard",
      price: fare.PublishedFare,
      popular: true,

      features: [
        { text: "Cabin baggage included", included: true },
        {
          text: "Check-in baggage included",
          included: !!fare.Baggage,
        },
        {
          text: "Cancellation allowed",
          included: fare.IsRefundable || hasCancellation,
        },
        {
          text: "Date change allowed",
          included: hasDateChange,
        },
      ],

      conditions: rules.map((r) => r.FareRuleDetail).filter(Boolean),
    },
  ];
};

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

const normalizeFareRulesFromQuote = (fareQuote) => {
  const mini = fareQuote?.Response?.Results?.MiniFareRules?.[0];
  if (!mini || !mini.length) return null;

  return {
    cancellation: mini
      .filter((r) => r.Type === "Cancellation")
      .map((r) => {
        const range = r.To
          ? `${r.From}-${r.To} ${r.Unit.toLowerCase()}`
          : `After ${r.From} ${r.Unit.toLowerCase()}`;

        return `${range}: ${r.Details}`;
      }),

    dateChange: mini
      .filter((r) => r.Type === "Reissue")
      .map((r) => {
        const range = r.To
          ? `${r.From}-${r.To} ${r.Unit.toLowerCase()}`
          : `After ${r.From} ${r.Unit.toLowerCase()}`;

        return `${range}: ${r.Details}`;
      }),

    baggage: [
      `Cabin baggage: ${fareQuote.Response.Results.Segments[0][0].CabinBaggage}`,
      `Check-in baggage: ${fareQuote.Response.Results.Segments[0][0].Baggage}`,
    ],

    important: [
      fareQuote.Response.Results.AirlineRemark,
      fareQuote.Response.Results.IsRefundable
        ? "Ticket is refundable"
        : "Ticket is non-refundable",
    ].filter(Boolean),
  };
};

export default function OneFlightBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { traceId, fareQuote, fareRule, ssr } = useSelector(
    (state) => state.flights
  );

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

  const [expandedSections, setExpandedSections] = useState({
    flightDetails: true,
    travelerDetails: false,
    fareRules: false,
    checkIn: false,
    travelDocs: false,
    terms: false,
  });

  const [expandedFare, setExpandedFare] = useState(null);
  const [selectedFare, setSelectedFare] = useState("Standard");

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

  // OneFlightBooking.jsx
  const buildSeatSSR = () => {
    const seatSSR = [];

    Object.entries(selectedSeats).forEach(([key, value]) => {
      const [, segmentIndex] = key.split("|");

      value.list.forEach((seatCode, paxIndex) => {
        seatSSR.push({
          segmentIndex: Number(segmentIndex),
          paxIndex: paxIndex, // 🔑 better than hard-coded 0
          seatCode,
          price: value.priceMap[seatCode] || 0,
          currency: "INR",
          isChargeable: (value.priceMap[seatCode] || 0) > 0,
        });
      });
    });

    return seatSSR;
  };

  // useEffect(() => {
  //   if (!searchParams?.traceId || !selectedFlight?.ResultIndex) return;

  //   dispatch(
  //     getFareRule({
  //       traceId: searchParams.traceId,
  //       resultIndex: selectedFlight.ResultIndex,
  //     })
  //   );
  // }, [dispatch, searchParams, selectedFlight]);

  useEffect(() => {
    if (!searchParams?.traceId || !selectedFlight?.ResultIndex) return;

    dispatch(
      getFareQuote({
        traceId: searchParams.traceId,
        resultIndex: selectedFlight.ResultIndex,
      })
    );
  }, [dispatch, searchParams?.traceId, selectedFlight?.ResultIndex]);

  // useEffect(() => {
  //   if (!fareQuote?.Results?.length) return;

  //   dispatch(
  //     getFareQuote({
  //       traceId: searchParams.traceId,
  //       resultIndex: selectedFlight.ResultIndex,
  //     })
  //   );

  //   dispatch(
  //     getSSR({
  //       traceId: searchParams.traceId,
  //       resultIndex: selectedFlight.ResultIndex,
  //     })
  //   );
  // }, [fareQuote, dispatch, searchParams, selectedFlight]);

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

  const isSeatReady = Boolean(
    ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[0]?.RowSeats?.length
  );

  const openSeatModal = (segmentIndex) => {
    if (!isSeatReady) return;
    const seatRows =
      ssr?.Response?.SeatDynamic?.[0]?.SegmentSeat?.[0]?.RowSeats;

    if (!Array.isArray(seatRows) || seatRows.length === 0) {
      alert("Seat data is still loading. Please wait...");
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

            {/* Fare Selection */}
            <div className="bg-white rounded-2xl  shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Fare Options
              </h3>
              <FareOptions
                fareRules={normalizeFareRulesFromQuote(fareQuote)}
                fareRulesStatus={
                  fareQuote?.Response?.Results ? "succeeded" : "loading"
                }
              />
              {ssr?.Results?.Meal?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Meals</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {ssr.Results.Meal.map((meal, idx) => (
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
                {/* <ImportantInformation
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                  fareRules={normalizeFareRules(fareRule)}
                  fareRulesStatus={!fareRule ? "loading" : "succeeded"}
                />
                 */}

                <FareRulesAccordion
                  fareRules={normalizeFareRules(fareRule)}
                  fareRulesStatus={!fareRule ? "loading" : "succeeded"}
                />
              </div>

              <div className="bg-white rounded-2xl  shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">Baggage & Inclusions</h3>
                <BaggageTable baggageInfo={baggageInfo} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <PriceSummary
                parsedFlightData={{
                  ...parsedFlightData,
                  basePrice:
                    fareQuote?.Response?.Results?.Fare?.PublishedFare ||
                    parsedFlightData.basePrice,
                }}
                selectedSeats={selectedSeats} // ✅ PASS THIS
                travelers={parsedFlightData?.travelers || []} // ✅ PASS THIS
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
          flightIndex={activeSegmentIndex}
          journeyType="onward"
          travelers={travelersForSeat}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
          segment={parsedFlightData.segments[activeSegmentIndex]}
          traceId={searchParams.traceId}
          resultIndex={selectedFlight.ResultIndex}
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
