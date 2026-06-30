import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiDollarSign,
  FiMapPin,
  FiBriefcase,
  FiChevronLeft,
  FiInfo,
  FiRefreshCw,
} from "react-icons/fi";

import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyBookingRequestById,
  executeApprovedFlightBooking,
} from "../../../Redux/Actions/booking.thunks";
import {
  formatDateWithYear,
  formatDateTime,
  getCabinClassLabel,
  CABIN_MAP,
  formatDuration,
  airlineLogo,
} from "../../../utils/formatter";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";


export default function BookApprovedFlight() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("details");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertModal, setAlertModal] = useState(null); // { type, title, text, onConfirm?, confirmText?, cancelText? }
  const tabsRef = useRef(null);

  const {
    selected: booking,
    loading,
    actionLoading,
  } = useSelector((state) => state.bookings);
  const approver = booking?.approvedBy;

  const approvalValidUntil = booking?.intent?.validUntil
    ? new Date(booking.intent.validUntil)
    : null;

  const isApprovalExpired =
    approvalValidUntil && new Date() > approvalValidUntil;

  useEffect(() => {
    dispatch(fetchMyBookingRequestById(id));
  }, [dispatch, id]);

  const flight = booking?.flightRequest;

  const getErrorMessage = (error) => {
    if (typeof error === "string") return error;
    return error?.message || "Something went wrong while booking";
  };

  const handleDuplicateBookingError = async (error) => {
    const existingBookingId = error?.data?.existingBookingId;
    setAlertModal({
      type: "info",
      title: "Confirmed Booking Exists",
      text: "You already have a confirmed booking for this flight.",
      confirmText: existingBookingId ? "View Booking" : "OK",
      cancelText: "Stay Here",
      onConfirm: existingBookingId ? () => navigate(`/my-booking/${existingBookingId}`) : null,
    });
  };


  // Called after user confirms in the modal
  const handleUnifiedBookFlight = async () => {
    setShowConfirmModal(false);
    try {
      const response = await dispatch(
        executeApprovedFlightBooking(id),
      ).unwrap();

      if (response?.status === "PROCESSING") {
        ToastWithTimer({
          type: "info",
          message: "Booking is being processed. We will keep this page updated.",
        });
        navigate(`/bookings/${id}/revalidated`, {
          replace: true,
          state: {
            bookingId: id,
            status: response.status,
            bookingContext: response.bookingContext || null,
            priceChange: response.priceChange || null,
            ssrChange: response.ssrChange || null,
            notifications: response.notifications || [],
          },
        });
        return;
      }

      if (
        ["REVALIDATED", "PRICE_CHANGED", "SSR_CHANGED"].includes(response?.status)
      ) {
        navigate(`/bookings/${id}/revalidated`, {
          replace: true,
          state: {
            bookingId: id,
            status: response.status,
            bookingContext: response.bookingContext || null,
            priceChange: response.priceChange || null,
            ssrChange: response.ssrChange || null,
            notifications: response.notifications || [],
          },
        });
        return;
      }

      if (response?.status === "FLIGHT_UNAVAILABLE") {
        setAlertModal({
          type: "warning",
          title: "Flight Unavailable",
          text: response?.message || "This itinerary is no longer available. Please search again.",
          confirmText: "Search New Flight",
          cancelText: "Back",
          onConfirm: handleCreateNewRequest,
        });
        return;
      }

      const priceCheck = response?.priceCheck;
      if (priceCheck?.message) {
        setAlertModal({
          type: priceCheck.priceChanged ? "warning" : "success",
          title: priceCheck.priceChanged ? "Fare Updated" : "Fare Verified",
          text: priceCheck.message,
          confirmText: "Continue",
        });
      }

      ToastWithTimer({
        type: "success",
        message: "Flight booked successfully!",
      });

      navigate("/my-bookings", { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      const errorMessage = message.toLowerCase();

      if (err?.code === "DUPLICATE_CONFIRMED_BOOKING") {
        await handleDuplicateBookingError(err);
        return;
      }

      if (errorMessage.includes("insufficient balance")) {
        setAlertModal({
          type: "error",
          title: "Insufficient Balance",
          text: "Insufficient wallet balance. Please recharge your account.",
          confirmText: "OK",
        });
        return;
      }

      if (
        errorMessage.includes("revalidate") ||
        errorMessage.includes("session expired") ||
        errorMessage.includes("search again")
      ) {
        setAlertModal({
          type: "warning",
          title: "Flight Needs Refresh",
          text: message,
          confirmText: "Search Again",
          cancelText: "Stay Here",
          onConfirm: handleCreateNewRequest,
        });
        return;
      }

      setAlertModal({
        type: "error",
        title: "Booking Failed",
        text: message,
        confirmText: "OK",
      });
    }
  };

  const buildSearchPayloadFromApprovedRequest = () => {
    const segments = booking.flightRequest?.segments || [];

    if (!segments.length) {
      throw new Error("No flight segments found in booking");
    }

    // -----------------------------
    // 1. DERIVE JOURNEY TYPE
    // -----------------------------
    const journeyType =
      segments.length === 1 ? 1 : segments.length === 2 ? 2 : 3;

    // -----------------------------
    // 2. PASSENGER COUNTS (FROM DB)
    // -----------------------------
    // 2️⃣ Passenger counts (DB-safe)
    const adults = booking.travellers.filter(
      (t) => t.paxType === "ADULT",
    ).length;
    const children = booking.travellers.filter(
      (t) => t.paxType === "CHILD",
    ).length;
    const infants = booking.travellers.filter(
      (t) => t.paxType === "INFANT",
    ).length;

    // -----------------------------
    // 3. COMMON PAYLOAD
    // -----------------------------
    const rawCabin = segments[0].cabinClass;
    const payload = {
      journeyType,
      adults,
      children,
      infants,

      // cabinClass: CABIN_MAP[segments[0].cabinClass] || "economy",

      cabinClass:
        typeof rawCabin === "number"
          ? CABIN_MAP[rawCabin]
          : rawCabin?.toLowerCase() || "economy",

      directFlight: !segments.some((s) => s.stopOver),

      nearbyAirportsFrom: false,
      nearbyAirportsTo: false,
      flexibleDates: false,
    };

    // -----------------------------
    // 4. ONE-WAY & ROUND-TRIP
    // -----------------------------
    if (journeyType === 1 || journeyType === 2) {
      payload.origin = segments[0].origin.airportCode;
      payload.destination =
        segments[segments.length - 1].destination.airportCode;
      payload.departureDate = segments[0].departureDateTime.split("T")[0];
    }

    // -----------------------------
    // 5. ROUND-TRIP RETURN DATE
    // -----------------------------
    if (journeyType === 2) {
      payload.returnDate =
        segments[segments.length - 1].departureDateTime.split("T")[0];
    }

    // -----------------------------
    // 6. MULTI-CITY
    // -----------------------------
    if (journeyType === 3) {
      payload.segments = segments.map((seg) => ({
        origin: seg.origin.airportCode,
        destination: seg.destination.airportCode,
        departureDate: seg.departureDateTime.split("T")[0],
      }));
    }

    return payload;
  };

  const handleCreateNewRequest = async () => {
    try {
      const payload = buildSearchPayloadFromApprovedRequest();

      await dispatch(searchFlights(payload)).unwrap();

      navigate("/search-flight-results", {
        state: { searchPayload: payload },
      });
    } catch (err) {
      console.error("Re-search failed", err);
      setAlertModal({
        type: "error",
        title: "Search Failed",
        text: "Flight search failed. Please try again.",
        confirmText: "OK",
      });
    }
  };

  const groupSegments = (segments = []) => {
    const grouped = {
      onward: [],
      return: [],
      all: [],
    };

    segments.forEach((seg, idx) => {
      grouped.all.push({ ...seg, _idx: idx });

      if (seg.journeyType === "onward") grouped.onward.push(seg);
      if (seg.journeyType === "return") grouped.return.push(seg);
    });

    return grouped;
  };

  const grouped = groupSegments(flight?.segments || []);

  const getJourneyType = (segments = []) => {
    const types = new Set(segments.map((s) => s.journeyType));

    if (types.has("onward") && types.has("return")) return "round-trip";
    if (segments.length > 1 && !types.has("return")) return "one-way";
    if (segments.length > 2) return "multi-city";
    return "one-way";
  };

  const journeyType = getJourneyType(flight?.segments);

  const getLayoverText = (segments, index) => {
    if (index === segments.length - 1) return null;

    const curr = new Date(segments[index].arrivalDateTime);
    const next = new Date(segments[index + 1].departureDateTime);

    const mins = Math.floor((next - curr) / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;

    return `Layover ${hrs}h ${rem}m`;
  };

  const getFareSnapshot = () => flight?.fareSnapshot || {};

  const getTotalFare = () => booking?.pricingSnapshot?.totalAmount || 0;

  const fare = flight?.fareSnapshot;

  // flat (one-way, pending approval)
  const flatFare =
    fare?.baseFare && fare?.publishedFare
      ? {
          BaseFare: fare.baseFare,
          Tax: fare.tax,
          PublishedFare: fare.publishedFare,
        }
      : null;

  // split (round-trip)
  const onwardFare = fare?.onwardFare || null;
  const returnFare = fare?.returnFare || null;

  const fareResults = flight?.fareQuote?.Results || [];

  const isRoundTrip = journeyType === "round-trip";
  const total = booking?.pricingSnapshot?.totalAmount || 0;
  const fareSnapshot = flight?.fareSnapshot;

  let baseFare = 0;
  let tax = 0;
  const refundable = fareResults.some((r) => r.IsRefundable);

  if (fareSnapshot?.onwardFare || fareSnapshot?.returnFare) {
    // Domestic Split Pricing
    baseFare = (fareSnapshot.onwardFare?.BaseFare || 0) + (fareSnapshot.returnFare?.BaseFare || 0);
    tax = (fareSnapshot.onwardFare?.Tax || 0) + (fareSnapshot.returnFare?.Tax || 0);
  } else if (fareSnapshot?.baseFare) {
    // One-Way or Consolidated International Pricing
    baseFare = fareSnapshot.baseFare;
    tax = fareSnapshot.tax;
  } else if (fareResults.length > 0) {
    // Fallback: Use first result if snapshot breakdown is missing
    // For international (consolidated), Result[0] is the combined fare.
    // For domestic round-trip (split), we sum the two results if it matches total.
    if (fareResults.length === 2 && (fareResults[0]?.Fare?.PublishedFare + fareResults[1]?.Fare?.PublishedFare) === total) {
      baseFare = (fareResults[0]?.Fare?.BaseFare || 0) + (fareResults[1]?.Fare?.BaseFare || 0);
      tax = (fareResults[0]?.Fare?.Tax || 0) + (fareResults[1]?.Fare?.Tax || 0);
    } else {
      baseFare = fareResults[0]?.Fare?.BaseFare || 0;
      tax = fareResults[0]?.Fare?.Tax || 0;
    }
  }

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-[#0A203E]/30 border-t-[#0A203E] rounded-full animate-spin" />
      </div>
    );

  if (!booking)
    return (
      <div className="text-center mt-20 text-gray-600">Booking not found.</div>
    );

  const getStatusInfo = () => {
    if (booking.requestStatus === "pending_approval")
      return {
        text: "Waiting for admin approval",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        canBook: false,
      };
    if (booking.requestStatus === "manager_approved" || booking.requestStatus === "pending_second_approval")
      return {
        text: "Waiting for travel-admin approval",
        color: "text-amber-600",
        bg: "bg-amber-50",
        canBook: false,
      };
    if (booking.requestStatus === "rejected")
      return {
        text: "Rejected by admin",
        color: "text-red-600",
        bg: "bg-red-50",
        canBook: false,
      };
    if (booking.requestStatus === "approved" && isApprovalExpired)
      return {
        text: "Approval expired. Please revalidate flight.",

        color: "text-red-600",
        bg: "bg-red-50",
        canBook: false,
      };
    if (booking.requestStatus === "approved")
      return {
        text: "Approved by admin",
        color: "text-green-600",
        bg: "bg-green-50",
        canBook: true,
      };
    return {
      text: "Unknown status",
      color: "text-gray-500",
      bg: "bg-gray-50",
      canBook: false,
    };
  };

  const statusInfo = getStatusInfo();

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
    <div className="bg-[#FAF8F4] min-h-screen font-['DM_Sans'] selection:bg-[#C9A24020] selection:text-[#C9A240]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E1E7EF] flex flex-col pt-4 px-8 gap-4">
        {/* Top Row */}
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-[6px] bg-transparent border-none cursor-pointer text-[12px] font-semibold text-[#C9A240] font-['DM_Sans'] tracking-[0.05em] uppercase hover:opacity-80 transition-opacity"
          >
            <FiChevronLeft size={14} />
            Back
          </button>
          <span className="w-[1px] h-4 bg-[#E1E7EF]" />
          <h1 className="text-[13px] font-semibold text-[#1A1714] font-['DM_Sans'] tracking-[0.04em]">
            Flight Booking — Approval Review
          </h1>

          <div className="ml-auto flex items-center gap-4">
            {(booking.orderId || booking.bookingReference) && (
              <span className="text-[11px] text-[#65758B]">
                Order ID:{" "}
                <strong className="text-[#1A1714] font-['DM_Sans'] font-mono">
                  {booking.orderId || booking.bookingReference}
                </strong>
              </span>
            )}

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[0.1em] border ${
              booking.requestStatus === "approved"
                ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                : booking.requestStatus === "rejected"
                ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                : "bg-[#FFFBEB] border-[#F0E0A8] text-[#8A6200]"
            }`}>
              {booking.requestStatus === "approved" ? <FiCheckCircle size={10} /> :
               booking.requestStatus === "rejected" ? <FiAlertTriangle size={10} /> :
               <FiClock size={10} />}
              {statusInfo.text}
            </span>

            {/* Confirm Booking button */}
            <button
              disabled={actionLoading || isApprovalExpired || !statusInfo.canBook}
              onClick={() => setShowConfirmModal(true)}
              className={`inline-flex items-center gap-2 px-5 py-[10px] text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors ${
                statusInfo.canBook && !isApprovalExpired
                  ? "bg-[#000D26] text-white hover:bg-[#04112F]"
                  : "bg-[#E1E7EF] text-[#65758B] cursor-not-allowed"
              }`}
            >
              {actionLoading ? (
                <>
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FiCheckCircle size={12} />
                  Confirm Booking
                </>
              )}
            </button>

            {isApprovalExpired && (
              <button
                onClick={handleCreateNewRequest}
                className="inline-flex items-center gap-2 px-5 py-[10px] bg-white border border-[#F0C4BA] text-[#B5341A] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FDF1EE] transition-colors"
              >
                Revalidate Flight
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-6 overflow-x-auto w-full">
          {[
            { id: "details", label: "Flight Details" },
            { id: "project", label: "Project & Purpose" },
            { id: "charges", label: "Charges and Rules" },
            { id: "passenger", label: "Passengers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap relative ${
                activeTab === tab.id
                  ? "text-[#1A1714]"
                  : "text-[#65758B] hover:text-[#1A1714]"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#C9A240]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="w-full px-4 lg:px-10 py-8 pb-24 space-y-6">

        {/* Dynamic Header per tab */}
        {(() => {
          const headers = {
            details: {
              label: "Reservation",
              title: "Flight Itinerary",
              subtitle: "A complete record of the approved flight itinerary, pricing, and add-ons.",
            },
            project: {
              label: "Project Details",
              title: "Project & Approvals",
              subtitle: "Information about the project code and the approval workflow for this trip.",
            },
            charges: {
              label: "Fare Rules",
              title: "Charges & Fare Rules",
              subtitle: "Mini fare rules, detailed policies, and cancellation terms from the airline.",
            },
            passenger: {
              label: "Traveller Information",
              title: "Passengers",
              subtitle: "List of all passengers travelling on this approved booking.",
            },
          };
          const h = headers[activeTab] || headers.details;
          return (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                  {h.label}
                </p>
                <h1 className="text-[36px] font-black text-[#1A1714] tracking-tight leading-none mb-3">
                  {h.title}
                </h1>
                <p className="text-sm text-[#65758B] leading-relaxed">
                  {h.subtitle}
                </p>
              </div>
              {approver && booking.requestStatus === "approved" && (
                <div className="flex flex-col items-end gap-1 text-right">
                  <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B]">Approved By</p>
                  <p className="text-[14px] font-semibold text-[#1A1714]">
                    {approver.name?.firstName} {approver.name?.lastName}
                  </p>
                  <p className="text-[11px] text-[#65758B]">{approver.email}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Tab Contents ── */}
        <div className="pt-4">
          {/* ============ FLIGHT DETAILS TAB ============ */}
          {activeTab === "details" && (
            <div className={`grid grid-cols-1 gap-6 lg:grid-cols-3`}>
              {/* Left: Flight cards + SSR */}
              <div className="space-y-6 lg:col-span-2">
                {/* ONE WAY */}
                {journeyType === "one-way" && (
                  <>
                    {grouped.all.map((seg, idx) => (
                      <div key={idx}>
                        <FlightSegmentCard seg={seg} fareQuoteResults={fareResults} />
                        {getLayoverText(grouped.all, idx) && (
                          <div className="flex items-center justify-center my-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E1E7EF] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                              <FiRefreshCw size={10} />
                              {getLayoverText(grouped.all, idx)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* ROUND TRIP */}
                {journeyType === "round-trip" && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-[#1A1714] uppercase tracking-widest mb-4 pb-2 border-b border-[#E1E7EF]">Onward Journey</p>
                      {grouped.onward.map((seg, idx) => (
                        <div key={idx}>
                          <FlightSegmentCard seg={seg} fareQuoteResults={fareResults} />
                          {getLayoverText(grouped.onward, idx) && (
                            <div className="flex items-center justify-center my-4">
                              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E1E7EF] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                                <FiRefreshCw size={10} />
                                {getLayoverText(grouped.onward, idx)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1A1714] uppercase tracking-widest mb-4 pb-2 border-b border-[#E1E7EF] mt-8">Return Journey</p>
                      {grouped.return.map((seg, idx) => (
                        <div key={idx}>
                          <FlightSegmentCard seg={seg} fareQuoteResults={fareResults} />
                          {getLayoverText(grouped.return, idx) && (
                            <div className="flex items-center justify-center my-4">
                              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E1E7EF] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                                <FiRefreshCw size={10} />
                                {getLayoverText(grouped.return, idx)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MULTI CITY */}
                {journeyType === "multi-city" && (
                  <>
                    {grouped.all.map((seg, idx) => (
                      <div key={idx} className="mb-6 last:mb-0">
                        <p className="text-[10px] font-bold text-[#C9A240] uppercase tracking-widest mb-2">
                          Route {idx + 1}: {seg.origin.airportCode} → {seg.destination.airportCode}
                        </p>
                        <FlightSegmentCard seg={seg} fareQuoteResults={fareResults} />
                      </div>
                    ))}
                  </>
                )}

                {/* SSR Section */}
                {flight?.ssrSnapshot && (
                  <SSRSection ssrSnapshot={flight.ssrSnapshot} travellers={booking?.travellers || []} />
                )}
              </div>

              {/* Right: Pricing Summary */}
              <div className="lg:col-span-1">
                <div className="bg-[#FAF8F4] border border-[#E1E7EF] p-6 sticky top-[140px]">
                  <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-5 flex items-center gap-2">
                    <FiDollarSign size={14} className="text-[#C9A240]" /> Fare Summary
                  </div>

                  <div className="mt-5 pt-5 border-t border-[#E1E7EF]">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[12px] font-semibold text-[#1A1714]">Total Authorized</div>
                        <div className="text-[10px] text-[#65758B] mt-[2px]">incl. all taxes & service fee</div>
                      </div>
                      <div className="font-['Cormorant_Garamond'] text-[28px] font-bold text-[#1A1714]">
                        ₹{Number(total).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={`inline-block w-full text-center px-3 py-[6px] text-[10px] font-bold uppercase tracking-[0.12em] border ${
                      refundable
                        ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                        : "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                    }`}>
                      {refundable ? "Refundable Booking" : "Non-Refundable Booking"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ PROJECT TAB ============ */}
          {activeTab === "project" && (
            <div className="space-y-6">
              {/* Trip Details Grid */}
              <div className="bg-white border border-[#E1E7EF] p-8">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-6">Trip Details</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Order ID</p>
                    <p className="text-[14px] font-semibold text-[#1A1714] font-mono">{booking.orderId || booking.bookingReference || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Purpose of Travel</p>
                    <p className="text-[14px] font-semibold text-[#1A1714]">{booking.purposeOfTravel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Project Code</p>
                    <p className="text-[14px] font-semibold text-[#1A1714]">{booking.projectId || "Internal / NA"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Requested On</p>
                    <p className="text-[14px] font-semibold text-[#1A1714]">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Overall Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] border ${
                      booking.requestStatus === "approved"
                        ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                        : booking.requestStatus === "rejected"
                        ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                        : "bg-[#FFFBEB] border-[#F0E0A8] text-[#8A6200]"
                    }`}>
                      {booking.requestStatus || "—"}
                    </span>
                  </div>
                  {approver && (
                    <div>
                      <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B] mb-2">Approved By (Admin)</p>
                      <p className="text-[14px] font-semibold text-[#1A1714]">
                        {approver.name?.firstName} {approver.name?.lastName}
                      </p>
                      <p className="text-[11px] text-[#65758B] mt-0.5">{approver.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Chain */}
              <div className="bg-white border border-[#E1E7EF] p-8">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-6">Approval Chain</p>
                <div className="flex flex-col sm:flex-row gap-0">

                  {/* Step 1: Manager */}
                  <div className="flex-1 relative">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        ["manager_approved","pending_second_approval","approved"].includes(booking.requestStatus)
                          ? "bg-[#EDF7F2] border-[#2C7A4B]"
                          : booking.requestStatus === "rejected"
                          ? "bg-[#FDF1EE] border-[#B5341A]"
                          : "bg-[#FFFBEB] border-[#C9A240]"
                      }`}>
                        <FiUser size={16} className={
                          ["manager_approved","pending_second_approval","approved"].includes(booking.requestStatus)
                            ? "text-[#2C7A4B]"
                            : booking.requestStatus === "rejected"
                            ? "text-[#B5341A]"
                            : "text-[#C9A240]"
                        } />
                      </div>
                      <div className="flex-1 pb-8 sm:pb-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[12px] font-bold text-[#1A1714]">Manager Approval</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest border ${
                            ["manager_approved","pending_second_approval","approved"].includes(booking.requestStatus)
                              ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                              : booking.requestStatus === "rejected"
                              ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                              : "bg-[#FFFBEB] border-[#F0E0A8] text-[#8A6200]"
                          }`}>
                            {["manager_approved","pending_second_approval","approved"].includes(booking.requestStatus)
                              ? "Approved"
                              : booking.requestStatus === "rejected"
                              ? "Rejected"
                              : "Pending"}
                          </span>
                        </div>
                        {(booking.approverName || booking.approverEmail) ? (
                          <>
                            <p className="text-[13px] font-semibold text-[#1A1714]">{booking.approverName || "—"}</p>
                            {booking.approverEmail && <p className="text-[11px] text-[#65758B] mt-0.5">{booking.approverEmail}</p>}
                            {booking.approverRole && <p className="text-[10px] text-[#8B7355] mt-0.5 uppercase tracking-wider">{booking.approverRole}</p>}
                          </>
                        ) : (
                          <p className="text-[12px] text-[#65758B] italic">No manager selected</p>
                        )}
                      </div>
                    </div>
                    {/* connector line */}
                    <div className="hidden sm:block absolute top-5 left-[calc(100%-8px)] w-8 border-t-2 border-dashed border-[#E1E7EF]" />
                  </div>

                  {/* Step 2: Travel Admin */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        booking.requestStatus === "approved"
                          ? "bg-[#EDF7F2] border-[#2C7A4B]"
                          : booking.requestStatus === "rejected"
                          ? "bg-[#FDF1EE] border-[#B5341A]"
                          : "bg-[#F5F5F5] border-[#E1E7EF]"
                      }`}>
                        <FiCheckCircle size={16} className={
                          booking.requestStatus === "approved"
                            ? "text-[#2C7A4B]"
                            : booking.requestStatus === "rejected"
                            ? "text-[#B5341A]"
                            : "text-[#65758B]"
                        } />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[12px] font-bold text-[#1A1714]">Travel Admin Approval</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest border ${
                            booking.requestStatus === "approved"
                              ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                              : booking.requestStatus === "rejected"
                              ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                              : "bg-[#F5F5F5] border-[#E1E7EF] text-[#65758B]"
                          }`}>
                            {booking.requestStatus === "approved" ? "Approved" : booking.requestStatus === "rejected" ? "Rejected" : "Awaiting"}
                          </span>
                        </div>
                        {approver ? (
                          <>
                            <p className="text-[13px] font-semibold text-[#1A1714]">
                              {approver.name?.firstName} {approver.name?.lastName}
                            </p>
                            <p className="text-[11px] text-[#65758B] mt-0.5">{approver.email}</p>
                          </>
                        ) : (
                          <p className="text-[12px] text-[#65758B] italic">
                            {["manager_approved", "pending_second_approval"].includes(booking.requestStatus)
                              ? "Waiting for travel admin"
                              : "Not yet reviewed"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ CHARGES & RULES TAB ============ */}
          {activeTab === "charges" && (
            <div className="space-y-6">
              {/* Mini Fare Rules */}
              {flight?.fareSnapshot?.miniFareRules && flight.fareSnapshot.miniFareRules.length > 0 && (
                <div className="bg-white border border-[#E1E7EF] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E1E7EF] bg-[#F5F5F5]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1714]">Mini Fare Rules</p>
                  </div>
                  <div>
                    {flight.fareSnapshot.miniFareRules[0].map((rule, idx) => (
                      <div key={idx} className="flex justify-between items-center px-6 py-4 border-b border-[#E1E7EF] last:border-0">
                        <div>
                          <p className="text-[12px] font-semibold text-[#1A1714] uppercase tracking-wide">{rule.Type}</p>
                          <p className="text-[10px] text-[#65758B] mt-0.5">{rule.JourneyPoints || "All Sectors"}</p>
                        </div>
                        <span className="text-[13px] font-bold text-[#8A6200]">{rule.Details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Fare Rules */}
              {fareResults.length > 0 && fareResults[0]?.FareRules && fareResults[0].FareRules.length > 0 && (
                <div className="bg-white border border-[#E1E7EF] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E1E7EF] bg-[#F5F5F5]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1714]">Detailed Fare Rules</p>
                  </div>
                  <div className="divide-y divide-[#E1E7EF]">
                    {fareResults[0].FareRules.map((r, i) => (
                      <div key={i} className="p-6">
                        <p className="text-[11px] font-bold text-[#1A1714] uppercase tracking-widest mb-1">
                          {r.Origin} → {r.Destination} ({r.Airline})
                        </p>
                        <p className="text-[10px] text-[#65758B] mb-3">Fare Basis: {r.FareBasisCode}</p>
                        {r.FareRuleDetail && (
                          <div className="text-[11px] text-[#1A1714] whitespace-pre-wrap bg-[#F8FAFC] p-4 border border-[#E1E7EF] max-h-64 overflow-y-auto font-mono leading-relaxed">
                            {r.FareRuleDetail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!flight?.fareSnapshot?.miniFareRules || flight.fareSnapshot.miniFareRules.length === 0) &&
               (!fareResults[0]?.FareRules || fareResults[0].FareRules.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E1E7EF] text-[#65758B]">
                  <FiInfo size={24} className="mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">Fare rules not available</p>
                </div>
              )}
            </div>
          )}

          {/* ============ PASSENGERS TAB ============ */}
          {activeTab === "passenger" && (
            <div className="bg-[#F5F0E8] border border-[#E8E0D0] p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-5">
                Passengers · {booking?.travellers?.length || 0}
              </p>
              <div className="bg-white border border-[#E8E0D0] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E8E0D0] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                      <th className="px-6 py-4">Passenger Name</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Gender</th>
                      <th className="px-4 py-4">Date of Birth</th>
                      <th className="px-6 py-4 text-right">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E0D0]">
                    {Array.isArray(booking?.travellers) && booking.travellers.map((t, i) => (
                      <tr key={i} className="hover:bg-[#FAF8F4] transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0 border border-[#E0D8C8]">
                              <FiUser size={16} className="text-[#A07840]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] font-bold text-[#1A1714] leading-none">
                                  {t.title} {t.firstName} {t.lastName}
                                </p>
                                {t.isLeadPassenger && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-[#FFFBEB] border border-[#F0E0A8] text-[#8A6200] uppercase tracking-widest">Lead</span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#65758B] mt-0.5">{t.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#65758B] bg-[#F5F5F5] px-2 py-0.5">
                            {t.paxType}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-[13px] font-semibold text-[#1A1714] capitalize">{t.gender || "—"}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-[12px] text-[#65758B]">{t.dateOfBirth ? formatDateWithYear(t.dateOfBirth) : "—"}</p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <p className="text-[12px] font-semibold text-[#1A1714]">{t.phoneWithCode || "—"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>

    {/* ===== CONFIRM BOOKING MODAL — portal to viewport root ===== */}
    {showConfirmModal && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{position:'fixed',top:0,left:0,right:0,bottom:0}}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#1A1714]/60 backdrop-blur-sm"
          onClick={() => setShowConfirmModal(false)}
        />
        {/* Panel */}
        <div className="relative bg-white w-full max-w-lg shadow-2xl overflow-hidden" style={{animation:'modalIn 0.18s ease'}}>
          <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
          {/* Gold accent top bar */}
          <div className="h-[4px] bg-gradient-to-r from-[#C9A240] to-[#8B7355]" />

          {/* Header */}
          <div className="px-8 pt-7 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#000D26] flex items-center justify-center shrink-0">
                <FiCheckCircle size={18} className="text-[#C9A240]" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#1A1714] font-['DM_Sans'] tracking-tight">Confirm Flight Booking</h2>
                <p className="text-[11px] text-[#65758B] mt-0.5">Please review the details before proceeding</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="text-[#65758B] hover:text-[#1A1714] transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Flight summary */}
          <div className="mx-8 mb-5 bg-[#FAF8F4] border border-[#E1E7EF] p-5">
            {flight?.segments?.slice(0, 2).map((seg, i) => (
              <div key={i} className={`flex items-center gap-4 ${i > 0 ? "mt-4 pt-4 border-t border-[#E1E7EF]" : ""}`}>
                <img src={`https://images.kiwi.com/airlines/64x64/${seg.airlineCode}.png`} className="w-9 h-9 object-contain" alt={seg.airlineName} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#1A1714]">
                    {seg.origin?.city} → {seg.destination?.city}
                  </p>
                  <p className="text-[10px] text-[#65758B] mt-0.5">
                    {seg.airlineCode}-{seg.flightNumber} &nbsp;·&nbsp;
                    {new Date(seg.departureDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}&nbsp;
                    {new Date(seg.departureDateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-[#65758B] uppercase tracking-wider">{seg.journeyType}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mx-8 mb-6 flex gap-2 items-start">
            <FiInfo size={13} className="text-[#C9A240] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#65758B] leading-relaxed">
              By confirming, your fare will be locked and a booking will be created. This action <strong className="text-[#1A1714]">cannot be undone</strong>.
              Final price may vary if the airline has updated fares.
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 pb-7 flex items-center justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-5 py-[10px] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65758B] bg-white border border-[#E1E7EF] hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUnifiedBookFlight}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-6 py-[10px] bg-[#000D26] text-white text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#04112F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <><span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
              ) : (
                <><FiCheckCircle size={13} />Confirm &amp; Book</>
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* ===== ALERT MODAL — portal to viewport root ===== */}
    {alertModal && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{position:'fixed',top:0,left:0,right:0,bottom:0}}>
        <div className="absolute inset-0 bg-[#1A1714]/60 backdrop-blur-sm" onClick={() => setAlertModal(null)} />
        <div className="relative bg-white w-full max-w-md shadow-2xl overflow-hidden" style={{animation:'modalIn 0.18s ease'}}>
          <div className={`h-[4px] ${
            alertModal.type === "error" ? "bg-[#DC2626]" :
            alertModal.type === "warning" ? "bg-[#D97706]" :
            alertModal.type === "success" ? "bg-[#059669]" : "bg-[#2563EB]"
          }`} />
          <div className="p-8">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                alertModal.type === "error" ? "bg-[#FEF2F2]" :
                alertModal.type === "warning" ? "bg-[#FFFBEB]" :
                alertModal.type === "success" ? "bg-[#ECFDF5]" : "bg-[#EFF6FF]"
              }`}>
                {alertModal.type === "error" && <FiAlertTriangle size={18} className="text-[#DC2626]" />}
                {alertModal.type === "warning" && <FiAlertTriangle size={18} className="text-[#D97706]" />}
                {alertModal.type === "success" && <FiCheckCircle size={18} className="text-[#059669]" />}
                {alertModal.type === "info" && <FiInfo size={18} className="text-[#2563EB]" />}
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1A1714] font-['DM_Sans']">{alertModal.title}</h3>
                <p className="text-[12px] text-[#65758B] mt-1 leading-relaxed">{alertModal.text}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              {alertModal.cancelText && (
                <button
                  onClick={() => setAlertModal(null)}
                  className="px-5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65758B] bg-white border border-[#E1E7EF] hover:bg-[#F5F5F5] transition-colors"
                >
                  {alertModal.cancelText}
                </button>
              )}
              <button
                onClick={() => {
                  const cb = alertModal.onConfirm;
                  setAlertModal(null);
                  if (cb) cb();
                }}
                className={`px-5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors ${
                  alertModal.type === "error" ? "bg-[#DC2626] hover:bg-[#B91C1C]" :
                  alertModal.type === "warning" ? "bg-[#D97706] hover:bg-[#B45309]" :
                  alertModal.type === "success" ? "bg-[#059669] hover:bg-[#047857]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
              >
                {alertModal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
}

const FlightSegmentCard = ({ seg, fareQuoteResults }) => {
  const resolveSupplierFare = () => {
    for (const res of fareQuoteResults || []) {
      for (const segGroup of res.Segments || []) {
        for (const s of segGroup) {
          if (s.Airline?.FlightNumber === seg?.flightNumber && s.Airline?.AirlineCode === seg?.airlineCode) {
             return s.SupplierFareClass || s.FareClassification?.Type;
          }
        }
      }
    }
    return null;
  };

  const supplierFare = resolveSupplierFare() || getCabinClassLabel(seg.cabinClass);

  return (
  <div className="bg-white border border-[#EAE4D9] mb-4 overflow-hidden">
    {/* Top bar */}
    <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
      <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
        {seg.journeyType === "return" ? "Return Journey" : "Onward Journey"}
      </span>
      <div className="flex items-center gap-3">
        {supplierFare && (
          <span className="text-[10px] font-semibold tracking-wide uppercase text-[#1A1714] bg-white px-2 py-0.5 rounded-sm border border-[#EAE4D9]">
            {supplierFare}
          </span>
        )}
      </div>
    </div>

    {/* Body: image + details */}
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
      {/* Airline Logo block */}
      <div className="relative overflow-hidden bg-white flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-[#EAE4D9]">
         <img src={airlineLogo(seg.airlineCode)} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" alt={seg.airlineName} />
         <p className="font-['Cormorant_Garamond'] text-[18px] font-bold text-[#1A1714] text-center leading-tight">
           {seg.airlineName || "Airline"}
         </p>
         <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mt-2 text-center whitespace-nowrap">
           {seg.airlineCode}-{seg.flightNumber} · {getCabinClassLabel(seg.cabinClass)}
         </p>
      </div>

      {/* Right content */}
      <div className="p-6">
        <div className="mb-4">
          <h1 className="font-['Cormorant_Garamond'] text-[24px] font-bold leading-[1.1] text-[#1A1714] mb-2">
            {seg.origin.city} to {seg.destination.city}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-[#7A7068]">
              <FiMapPin size={11} className="text-[#B5862A]" />
              {seg.origin.airportName || seg.origin.airportCode} → {seg.destination.airportName || seg.destination.airportCode}
            </span>
          </div>
        </div>

        {/* Departure / Arrival Grid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4 bg-[#FAF8F4] p-4 rounded-xl border border-[#EAE4D9]">
          <div>
            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
              Departure
            </div>
            <div className="text-[22px] font-black text-[#1A1714] leading-none mb-1 tracking-tight">
              {seg.origin.airportCode}
            </div>
            <div className="font-['Cormorant_Garamond'] text-[26px] font-bold leading-none mb-[2px] text-[#1A1714]">
              {new Date(seg.departureDateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </div>
            <div className="text-[11px] text-[#1A1714] font-semibold mt-0.5">
              {new Date(seg.departureDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="text-[10px] text-[#8B7355] mt-1 font-medium">
               Terminal {seg.origin.terminal || "N/A"}
            </div>
          </div>

          <div className="text-center px-2">
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89F94] mb-2">
              {formatDuration(seg.durationMinutes)}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-[4px] h-[4px] rounded-full border border-[#EAE4D9] inline-block" />
              <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-8" />
              <FiClock size={12} className="text-[#A89F94]" />
              <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-8" />
              <span className="w-[4px] h-[4px] rounded-full bg-[#B5862A] inline-block" />
            </div>
            <div className="text-[9px] text-[#A89F94] mt-2 text-center uppercase tracking-widest">
              {seg.stopOver ? "Stopover" : "Non-stop"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
              Arrival
            </div>
            <div className="text-[22px] font-black text-[#1A1714] leading-none mb-1 tracking-tight">
              {seg.destination.airportCode}
            </div>
            <div className="font-['Cormorant_Garamond'] text-[26px] font-bold leading-none mb-[2px] text-[#1A1714]">
              {new Date(seg.arrivalDateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </div>
            <div className="text-[11px] text-[#1A1714] font-semibold mt-0.5">
              {new Date(seg.arrivalDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="text-[10px] text-[#8B7355] mt-1 font-medium">
              Terminal {seg.destination.terminal || "N/A"}
            </div>
          </div>
        </div>

        {/* BAGGAGE */}
        {seg.baggage && (
          <div className="pt-2 flex gap-4 text-[#7A7068] font-medium text-[11px]">
            <span className="flex items-center gap-1.5 bg-white border border-[#EAE4D9] px-2 py-1 rounded">
              <FiBriefcase size={12} className="text-gray-400" />
              Cabin: <strong className="text-gray-700">{seg.baggage.cabin || "Included"}</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-[#EAE4D9] px-2 py-1 rounded">
              <FiBriefcase size={12} className="text-[#B5862A]" />
              Check-in: <strong className="text-gray-700">{seg.baggage.checkIn || "Included"}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
)};

function SSRSection({ ssrSnapshot, travellers }) {
  if (!ssrSnapshot) return null;

  const seats = ssrSnapshot?.seats || [];
  const meals = ssrSnapshot?.meals || [];
  const baggage = ssrSnapshot?.baggage || [];
  const specialServices = ssrSnapshot?.specialServices || [];
  const hasSSR =
    seats.length > 0 || meals.length > 0 || baggage.length > 0 || specialServices.length > 0;

  if (!hasSSR) return null;

  const travelerName = (idx) => {
    const t = travellers[idx];
    return t ? `${t.title} ${t.firstName} ${t.lastName}` : `Passenger ${idx + 1}`;
  };

  const byTraveler = {};
  travellers.forEach((_, idx) => {
    byTraveler[idx] = { seats: [], meals: [], baggage: [], specialServices: [] };
  });

  seats.forEach((s) => byTraveler[s.travelerIndex]?.seats.push(s));
  meals.forEach((m) => byTraveler[m.travelerIndex]?.meals.push(m));
  baggage.forEach((b) => byTraveler[b.travelerIndex]?.baggage.push(b));
  specialServices.forEach((s) => byTraveler[s.travelerIndex]?.specialServices.push(s));

  const activeTravelers = Object.entries(byTraveler).filter(
    ([, data]) => data.seats.length > 0 || data.meals.length > 0 || data.baggage.length > 0 || data.specialServices.length > 0
  );

  if (!activeTravelers.length) return null;

  return (
    <div className="bg-white border border-[#EAE4D9] p-6 mb-6">
      <h3 className="text-[11px] font-black text-[#0A203E] uppercase tracking-widest mb-4 border-b border-[#EAE4D9] pb-3">
        Seat, Meal, Baggage & Add-ons
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeTravelers.map(([travelerIdx, data]) => {
          const idx = parseInt(travelerIdx);
          const t = travellers[idx];
          
          return (
            <div key={travelerIdx} className="bg-[#FAF8F4] border border-[#EAE4D9] p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#EAE4D9]">
                <div className="w-6 h-6 rounded-full bg-white border border-[#EAE4D9] flex items-center justify-center shrink-0">
                  <FiUser size={10} className="text-[#B5862A]" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#1A1714] leading-none">{travelerName(idx)}</p>
                  <p className="text-[9px] text-[#A89F94] font-bold uppercase tracking-widest mt-1">{t?.paxType || "Passenger"}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {data.seats.map((s, i) => (
                  <div key={`seat-${i}`} className="flex justify-between items-start text-[11px]">
                    <span className="text-[#7A7068]">Seat {s.seatNo}</span>
                    <span className="font-semibold text-[#1A1714]">{s.price > 0 ? `₹${s.price}` : "Selected"}</span>
                  </div>
                ))}
                {data.meals.map((m, i) => (
                  <div key={`meal-${i}`} className="flex justify-between items-start text-[11px]">
                    <span className="text-[#7A7068] truncate max-w-[150px]">{m.code} {m.description ? `· ${m.description}` : ""}</span>
                    <span className="font-semibold text-[#1A1714]">{m.price > 0 ? `₹${m.price}` : "Selected"}</span>
                  </div>
                ))}
                {data.baggage.map((b, i) => (
                  <div key={`bag-${i}`} className="flex justify-between items-start text-[11px]">
                    <span className="text-[#7A7068]">Baggage {b.weight || b.description || "Extra"}</span>
                    <span className="font-semibold text-[#1A1714]">{b.price > 0 ? `₹${b.price}` : "Selected"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
