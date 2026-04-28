import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiAirplay,
  FiUser,
  FiDollarSign,
  FiMapPin,
  FiBriefcase,
} from "react-icons/fi";
import { MdFlightTakeoff } from "react-icons/md";
import { BsLuggage } from "react-icons/bs";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyBookingRequestById,
  executeApprovedFlightBooking,
} from "../../../Redux/Actions/booking.thunks";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import {
  formatDateWithYear,
  formatDateTime,
  getCabinClassLabel,
  CABIN_MAP,
  getStopsLabel,
  formatDuration,
  airlineLogo,
} from "../../../utils/formatter";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import Swal from "sweetalert2";

export default function BookApprovedFlight() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const handleBookFlight = async () => {
    try {
      const response = await dispatch(
        executeApprovedFlightBooking(id),
      ).unwrap();

      const priceCheck = response?.priceCheck;
      // 🔔 SWEET ALERT (FROM BACKEND MESSAGE)
      if (priceCheck?.message) {
        await Swal.fire({
          icon: priceCheck.priceChanged ? "warning" : "success",
          title: priceCheck.priceChanged ? "Fare Updated" : "Fare Verified",
          text: priceCheck.message,
          confirmButtonText: "Continue",
          confirmButtonColor: "#0A4D68",
        });
      }

      ToastWithTimer({
        type: "success",
        message: "Flight booked successfully!",
      });

      navigate("/my-bookings", { replace: true });
    } catch (err) {
      const errorMessage = err?.message?.toLowerCase() || "";

      // 🔴 INSUFFICIENT BALANCE → SHOW TOAST
      if (errorMessage.includes("insufficient balance")) {
        ToastWithTimer({
          type: "error",
          message: "Insufficient wallet balance. Please recharge your account.",
        });
        return;
      }

      // ⚠️ REVALIDATION CASE
      if (errorMessage.includes("revalidate")) {
        await Swal.fire({
          icon: "warning",
          title: "Approval Expired",
          text: err.message,
          confirmButtonText: "Revalidate Flight",
          confirmButtonColor: "#0A4D68",
        });

        await handleCreateNewRequest();
        return;
      }

      // ❌ DEFAULT ERROR
      Swal.fire({
        icon: "error",
        title: "Booking Failed",
        text: err?.message || "Something went wrong while booking",
        confirmButtonColor: "#DC2626",
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
      ToastWithTimer({
        type: "error",
        message: "Flight search failed. Please try again.",
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

  const isRoundTrip = fareResults.length === 2;

  let baseFare = 0;
  let tax = 0;
  let total = 0;
  let refundable = false;

  fareResults.forEach((result) => {
    const fare = result?.Fare;

    if (!fare) return;

    baseFare += fare.BaseFare || 0;
    tax += fare.Tax || 0;
    total += fare.PublishedFare || 0;

    if (result?.IsRefundable) refundable = true;
  });

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans">
      {/* <CorporateNavbar /> */}

      {/* 🔙 BACK BUTTON */}
      <div className="max-w-7xl mx-auto mt-4 px-4">
        {/* <button
          onClick={() => navigate("/my-pending-approvals")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0A4D68] hover:text-[#083a50] transition"
        >
          <GrLinkPrevious /> Back to My Pending Approvals
        </button> */}
      </div>

      {/* 🧊 MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto mt-10">
        {/* ===== HEADER ===== */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-[#0A203E] uppercase tracking-tight flex items-center justify-center gap-4">
            <MdFlightTakeoff className="text-[#C9A84C]" /> Flight Confirmation Dashboard
          </h1>
          <p className="text-gray-600">
            Review and confirm your approved flight booking
          </p>
        </div>

        {/* ===== STATUS BAR ===== */}
        <div
          className={`flex items-center justify-center gap-2 py-4 mb-8 rounded-2xl border border-slate-200 shadow-sm ${statusInfo.bg}`}
        >
          <FiClock className={`${statusInfo.color} text-lg`} />
          <span className={`font-black uppercase tracking-widest text-sm ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* ===== BENTO GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 🟦 OVERVIEW CARD */}
          <div className="lg:col-span-2 bg-[#0A203E] text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
              <FiAirplay className="text-[#C9A84C]" /> Booking Overview
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-bold text-[#C9A84C] uppercase tracking-tighter mr-2">Ref:</span>{" "}
                {booking.bookingReference}
              </p>
              <p>
                <span className="font-bold text-[#C9A84C] uppercase tracking-tighter mr-2">Purpose:</span>{" "}
                {booking.purposeOfTravel}
              </p>
              <p>
                <span className="font-bold text-[#C9A84C] uppercase tracking-tighter mr-2">Requested:</span>{" "}
                {formatDateTime(booking.createdAt)}
              </p>
              <p>
                <span className="font-bold text-[#C9A84C] uppercase tracking-tighter mr-2">Amount:</span> ₹
                {booking.pricingSnapshot?.totalAmount}
              </p>
            </div>
          </div>

          {/* 🟩 STATUS & ACTION CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-[#0A203E] uppercase tracking-widest mb-4">
                Current Status
              </h3>
              <p className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.text}
              </p>
            </div>
            {booking.requestStatus === "approved" && approver && (
              <div className="mt-6 text-sm bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="font-black text-[#0A203E] uppercase tracking-widest text-[10px] flex items-center gap-2 mb-2">
                  <FiUser className="text-[#C9A84C]" /> Approved By
                </p>
                <p className="font-bold text-slate-800">
                  {approver.name?.firstName} {approver.name?.lastName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{approver.email}</p>
              </div>
            )}

            <button
              disabled={
                actionLoading || isApprovalExpired || !statusInfo.canBook
              }
              onClick={handleBookFlight}
              className={`mt-6 px-5 py-4 rounded-xl text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                statusInfo.canBook
                  ? "bg-[#0A203E] hover:brightness-110 shadow-[#0A203E]/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              {actionLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Confirm Booking
                </>
              )}
            </button>
          </div>

          {/* 🟧 FLIGHT ITINERARY */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-[#0A203E] uppercase tracking-widest mb-6 flex items-center gap-2">
              <FiMapPin className="text-[#C9A84C]" /> Flight Itinerary
            </h2>

            <div className="space-y-6">
              {/* ========= ONE WAY ========= */}
              {journeyType === "one-way" && (
                <>
                  <h3 className="text-xs font-black text-[#C9A84C] uppercase tracking-widest mb-4">
                    One-way Journey
                  </h3>

                  {grouped.all.map((seg, idx) => (
                    <div key={idx}>
                      <FlightSegmentCard seg={seg} />

                      {/* 🕒 LAYOVER */}
                      {getLayoverText(grouped.all, idx) && (
                        <div className="text-xs text-center text-gray-500 my-2">
                          {getLayoverText(grouped.all, idx)}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* ========= ROUND TRIP ========= */}
              {journeyType === "round-trip" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ✈️ ONWARD */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h3 className="text-[10px] font-black text-[#0A203E] uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">
                      Onward Flight
                    </h3>
                    {grouped.onward.map((seg, idx) => (
                      <FlightSegmentCard key={idx} seg={seg} />
                    ))}
                  </div>

                  {/* 🔁 RETURN */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h3 className="text-[10px] font-black text-[#0A203E] uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">
                      Return Flight
                    </h3>
                    {grouped.return.map((seg, idx) => (
                      <FlightSegmentCard key={idx} seg={seg} />
                    ))}
                  </div>
                </div>
              )}

              {/* ========= MULTI CITY ========= */}
              {journeyType === "multi-city" && (
                <>
                  <h3 className="text-xs font-black text-[#C9A84C] uppercase tracking-widest mb-4">
                    Multi-city Journey
                  </h3>

                  {grouped.all.map((seg, idx) => (
                    <div key={idx} className="mb-4 last:mb-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Route {idx + 1}: {seg.origin.airportCode} →{" "}
                        {seg.destination.airportCode}
                      </p>
                      <FlightSegmentCard seg={seg} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 🟦 FARE DETAILS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-[#0A203E] uppercase tracking-widest mb-4 flex items-center gap-2">
              <FiDollarSign className="text-[#C9A84C]" /> Fare Breakdown
            </h2>
            <div className="text-sm text-slate-700 space-y-1">
              {/* <p>Base Fare: ₹{flight.fareSnapshot.baseFare}</p> */}
              {flight?.fareSnapshot ? (
                <>
                  <div className="text-sm text-slate-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Fare:</span>
                      <span className="font-bold text-[#0A203E]">₹{Math.ceil(baseFare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax:</span>
                      <span className="font-bold text-[#0A203E]">₹{Math.ceil(tax)}</span>
                    </div>

                    {isRoundTrip && (
                      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] mb-2">
                          Route Breakdown
                        </p>
                        <div className="flex justify-between">
                          <span>Onward:</span>
                          <span>₹{flight?.fareQuote?.Results?.[0]?.Fare?.PublishedFare || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Return:</span>
                          <span>₹{flight?.fareQuote?.Results?.[1]?.Fare?.PublishedFare || 0}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t-2 border-slate-200 flex justify-between items-center text-base">
                      <span className="font-black text-[#0A203E] uppercase tracking-widest text-xs">Total Amount</span>
                      <span className="font-black text-[#0A203E]">₹{Math.ceil(total)}</span>
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
                      Refundable: {refundable ? "Yes" : "No"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm">
                  Fare details not available
                </p>
              )}
            </div>
          </div>

          {/* 🟩 TRAVELLERS CARD */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-[#0A203E] uppercase tracking-widest mb-6 flex items-center gap-2">
              <FiUser className="text-[#C9A84C]" /> Travellers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* {booking.travellers.map((t, i) => ( */}
              {Array.isArray(booking?.travellers) &&
                booking.travellers.map((t, i) => (
                  <div
                    key={i}
                    className="bg-white border border-green-100 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <p className="font-black text-[#0A203E] uppercase tracking-tight">
                        {t.title} {t.firstName} {t.lastName}
                      </p>
                      {t.isLeadPassenger && (
                        <span className="text-[10px] font-black px-2 py-1 bg-[#C9A84C]/10 text-[#C9A84C] rounded uppercase tracking-widest">
                          Lead
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <p>Gender: {t.gender || "N/A"}</p>
                      <p>
                        DOB:{" "}
                        {t.dateOfBirth
                          ? //  new Date(t.dateOfBirth).toLocaleDateString()
                            formatDateWithYear(t.dateOfBirth)
                          : "N/A"}
                      </p>
                      <p>Email: {t.email || "N/A"}</p>
                      <p>Nationality: {t.nationality || "N/A"}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ⚠️ EXPIRED FARE */}
          {isApprovalExpired && (
            <div className="lg:col-span-3 bg-red-50 border border-red-200 rounded-xl p-6 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <FiAlertTriangle /> Approval expired. Please revalidate flight.
              </div>
              <button
                onClick={handleCreateNewRequest}
                className="text-xs font-black px-6 py-2.5 rounded-xl bg-[#0A203E] text-white hover:brightness-110 transition uppercase tracking-widest shadow-lg shadow-[#0A203E]/20"
              >
                Revalidate Flight
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FlightSegmentCard = ({ seg }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-5 hover:shadow-md transition mb-3 last:mb-0">
    {/* AIRLINE */}
    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
      <div className="flex items-center gap-4">
        <img
          src={airlineLogo(seg.airlineCode)}
          alt={seg.airlineName}
          className="w-10 h-10 object-contain"
        />
        <div>
          <p className="font-black text-[#0A203E] text-xs uppercase tracking-tight">
            {seg.airlineName}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {seg.airlineCode}-{seg.flightNumber} | {seg.aircraft || "—"}
          </p>
        </div>
      </div>

      <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-[#0A203E] uppercase tracking-widest">
        {getCabinClassLabel(seg.cabinClass)}
      </span>
    </div>

    {/* ROUTE */}
    <div className="mt-4 flex items-center justify-between text-sm">
      <div>
        <p className="font-black text-[#0A203E] text-base leading-tight">
          {seg.origin.airportCode}
        </p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {seg.origin.city}
        </p>
        <p className="text-[10px] text-[#C9A84C] font-black mt-1">
          {formatDateTime(seg.departureDateTime)}
        </p>
      </div>

      <div className="flex flex-col items-center flex-1 px-4">
        <div className="w-full flex items-center gap-2">
          <div className="h-[1px] flex-1 bg-slate-200"></div>
          <FiAirplay className="text-[#C9A84C] text-xs" />
          <div className="h-[1px] flex-1 bg-slate-200"></div>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
          {formatDuration(seg.durationMinutes)}
        </p>
        <p className="text-[9px] text-[#0A203E] font-black uppercase tracking-tighter">
          {seg.stopOver ? "Stopover" : "Non-stop"}
        </p>
      </div>

      <div className="text-right">
        <p className="font-black text-[#0A203E] text-base leading-tight">
          {seg.destination.airportCode}
        </p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {seg.destination.city}
        </p>
        <p className="text-[10px] text-[#C9A84C] font-black mt-1">
          {formatDateTime(seg.arrivalDateTime)}
        </p>
      </div>
    </div>

    {/* BAGGAGE */}
    {seg.baggage && (
      <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex gap-6">
        <span className="flex items-center gap-2"><BsLuggage className="text-xs text-[#C9A84C]" /> {seg.baggage.checkIn || "—"}</span>
        <span className="flex items-center gap-2"><FiBriefcase className="text-xs text-[#C9A84C]" /> {seg.baggage.cabin || "—"}</span>
      </div>
    )}
  </div>
);
