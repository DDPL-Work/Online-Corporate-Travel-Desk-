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
} from "react-icons/fi";
import { GrLinkPrevious } from "react-icons/gr";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyBookingRequestById,
  executeApprovedFlightBooking,
} from "../../../Redux/Actions/booking.thunks";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
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

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-[#0A4D68]/30 border-t-[#0A4D68] rounded-full animate-spin" />
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
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <EmployeeHeader />

      {/* 🔙 BACK BUTTON */}
      <div className="max-w-7xl mx-auto mt-4 px-4">
        <button
          onClick={() => navigate("/my-pending-approvals")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0A4D68] hover:text-[#083a50] transition"
        >
          <GrLinkPrevious /> Back to My Pending Approvals
        </button>
      </div>

      {/* 🧊 MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto mt-10">
        {/* ===== HEADER ===== */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#0A4D68]">
            ✈️ Flight Confirmation Dashboard
          </h1>
          <p className="text-gray-600">
            Review and confirm your approved flight booking
          </p>
        </div>

        {/* ===== STATUS BAR ===== */}
        <div
          className={`flex items-center justify-center gap-2 py-3 mb-8 rounded-xl border-2 border-gray-200 ${statusInfo.bg}`}
        >
          <FiClock className={`${statusInfo.color}`} />
          <span className={`font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* ===== BENTO GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 🟦 OVERVIEW CARD */}
          <div className="lg:col-span-2 bg-linear-to-r from-[#0A4D68] to-[#088395] text-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiAirplay /> Booking Overview
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium">Booking Ref:</span>{" "}
                {booking.bookingReference}
              </p>
              <p>
                <span className="font-medium">Purpose:</span>{" "}
                {booking.purposeOfTravel}
              </p>
              <p>
                <span className="font-medium">Requested:</span>{" "}
                {/* {new Date(booking.createdAt).toLocaleString()} */}
                {formatDateTime(booking.createdAt)}
              </p>
              <p>
                <span className="font-medium">Total Amount:</span> ₹
                {booking.pricingSnapshot?.totalAmount}
              </p>
            </div>
          </div>

          {/* 🟩 STATUS & ACTION CARD */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">
                Current Status
              </h3>
              <p className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</p>
            </div>
            {booking.requestStatus === "approved" && approver && (
              <div className="mt-3 text-sm bg-green-100 text-green-800 rounded-lg p-3">
                <p className="font-semibold flex items-center gap-1">
                  <FiUser /> Approved By
                </p>
                <p>
                  {approver.name?.firstName} {approver.name?.lastName}
                </p>
                <p className="text-xs text-gray-600">{approver.email}</p>
              </div>
            )}

            <button
              // disabled={actionLoading || !statusInfo.canBook}
              disabled={
                actionLoading || isApprovalExpired || !statusInfo.canBook
              }
              onClick={handleBookFlight}
              className={`mt-4 px-5 py-2.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition ${
                statusInfo.canBook
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
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
          <div className="lg:col-span-2 bg-linear-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-orange-700 mb-4 flex items-center gap-2">
              <FiMapPin /> Flight Itinerary
            </h2>

            <div className="space-y-6">
              {/* ========= ONE WAY ========= */}
              {journeyType === "one-way" && (
                <>
                  <h3 className="text-sm font-semibold text-orange-700">
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
                <>
                  {/* ✈️ ONWARD */}
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-3">
                      Onward Flight
                    </h3>
                    {grouped.onward.map((seg, idx) => (
                      <FlightSegmentCard key={idx} seg={seg} />
                    ))}
                  </div>

                  {/* 🔁 RETURN */}
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold text-blue-700 mb-3">
                      Return Flight
                    </h3>
                    {grouped.return.map((seg, idx) => (
                      <FlightSegmentCard key={idx} seg={seg} />
                    ))}
                  </div>
                </>
              )}

              {/* ========= MULTI CITY ========= */}
              {journeyType === "multi-city" && (
                <>
                  <h3 className="text-sm font-semibold text-purple-700">
                    Multi-city Journey
                  </h3>

                  {grouped.all.map((seg, idx) => (
                    <div key={idx}>
                      <p className="text-xs text-gray-500 mb-1">
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
          <div className="bg-linear-to-br from-teal-50 to-white border border-teal-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-teal-700 mb-3 flex items-center gap-2">
              <FiDollarSign /> Fare Breakdown
            </h2>
            <div className="text-sm text-gray-700 space-y-1">
              {/* <p>Base Fare: ₹{flight.fareSnapshot.baseFare}</p> */}
              {flight?.fareSnapshot ? (
                <>
                  <p>Base Fare: ₹{flight.fareSnapshot.w}</p>
                  <p>Tax: ₹{flight.fareSnapshot.tax}</p>
                  <p>
                    Refundable: {flight.fareSnapshot.refundable ? "Yes" : "No"}
                  </p>
                  <p>Fare Type: {flight.fareSnapshot.fareType}</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">
                  Fare details not available
                </p>
              )}
            </div>
          </div>

          {/* 🟩 TRAVELLERS CARD */}
          <div className="lg:col-span-3 bg-linear-to-br from-green-50 to-white border border-green-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A4D68] mb-4 flex items-center gap-2">
              <FiUser /> Travellers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* {booking.travellers.map((t, i) => ( */}
              {Array.isArray(booking?.travellers) &&
                booking.travellers.map((t, i) => (
                  <div
                    key={i}
                    className="bg-white border border-green-100 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-[#0A4D68]">
                        {t.title} {t.firstName} {t.lastName}
                      </p>
                      {t.isLeadPassenger && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          Lead Traveller
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
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
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
  <div className="bg-white border border-orange-100 rounded-xl p-4 hover:shadow-md transition">
    {/* AIRLINE */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={airlineLogo(seg.airlineCode)}
          alt={seg.airlineName}
          className="w-8 h-8 object-contain"
        />
        <div>
          <p className="font-semibold text-[#0A4D68] text-sm">
            {seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})
          </p>
          <p className="text-xs text-gray-500">
            Aircraft: {seg.aircraft || "—"}
          </p>
        </div>
      </div>

      <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
        {getCabinClassLabel(seg.cabinClass)}
      </span>
    </div>

    {/* ROUTE */}
    <div className="mt-3 flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">
          {seg.origin.city} ({seg.origin.airportCode})
        </p>
        <p className="text-xs text-gray-500">
          {formatDateTime(seg.departureDateTime)}
        </p>
      </div>

      <div className="text-center text-xs text-gray-600">
        <p>{formatDuration(seg.durationMinutes)}</p>
        <p>{seg.stopOver ? "Stopover" : "Non-stop"}</p>
      </div>

      <div className="text-right">
        <p className="font-medium">
          {seg.destination.city} ({seg.destination.airportCode})
        </p>
        <p className="text-xs text-gray-500">
          {formatDateTime(seg.arrivalDateTime)}
        </p>
      </div>
    </div>

    {/* BAGGAGE */}
    {seg.baggage && (
      <div className="mt-3 text-xs text-gray-600 flex gap-4">
        <span>🧳 {seg.baggage.checkIn || "—"}</span>
        <span>🎒 {seg.baggage.cabin || "—"}</span>
      </div>
    )}
  </div>
);
