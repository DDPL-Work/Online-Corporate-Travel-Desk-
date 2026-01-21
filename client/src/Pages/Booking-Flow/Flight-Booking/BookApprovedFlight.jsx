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
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyBookingRequestById,
  executeApprovedFlightBooking,
} from "../../../Redux/Actions/booking.thunks";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { formatDateWithYear, formatDateTime, getCabinClassLabel } from "../../../utils/formatter";

export default function BookApprovedFlight() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    selected: booking,
    loading,
    actionLoading,
  } = useSelector((state) => state.bookings);

  useEffect(() => {
    dispatch(fetchMyBookingRequestById(id));
  }, [dispatch, id]);

  const flight = booking?.flightRequest;
  const fareExpiry = flight?.fareExpiry ? new Date(flight.fareExpiry) : null;
  const isFareExpired = fareExpiry && new Date() > fareExpiry;

  const handleBookFlight = async () => {
    try {
      if (isFareExpired) {
        ToastWithTimer({
          type: "error",
          message: "Fare expired. Please create a new request.",
        });
        return;
      }

      await dispatch(executeApprovedFlightBooking(id)).unwrap();
      ToastWithTimer({
        type: "success",
        message: "Flight booked successfully!",
      });
      navigate("/my-bookings", { replace: true });
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err || "Booking failed",
      });
    }
  };

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
    if (booking.requestStatus === "approved" && isFareExpired)
      return {
        text: "Fare expired. Please create a new request.",
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
        {/* <div
          className={`flex items-center justify-center gap-2 py-3 mb-8 rounded-xl border ${statusInfo.bg}`}
        >
          <FiClock className={`${statusInfo.color}`} />
          <span className={`font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div> */}

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
            <button
              disabled={actionLoading || !statusInfo.canBook}
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
            <div className="space-y-3">
              {flight?.segments?.map((seg, idx) => (
                <div
                  key={idx}
                  className="border border-orange-100 rounded-lg p-3 bg-white hover:shadow-md transition"
                >
                  <p className="font-semibold text-[#0A4D68] text-sm">
                    {seg.origin.city} ({seg.origin.airportCode}) →{" "}
                    {seg.destination.city} ({seg.destination.airportCode})
                  </p>
                  <p className="text-xs text-gray-500">
                    {seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})
                  </p>
                  <div className="grid sm:grid-cols-2 mt-2 text-sm text-gray-700">
                    <p>
                      <strong>Departure:</strong>{" "}
                      {/* {new Date(seg.departureDateTime).toLocaleString()} */}
                      {formatDateTime(seg.departureDateTime)}
                    </p>
                    <p>
                      <strong>Arrival:</strong>{" "}
                      {/* {new Date(seg.arrivalDateTime).toLocaleString()}  */}
                      {formatDateTime(seg.arrivalDateTime)}
                    </p>
                    <p>Cabin: {getCabinClassLabel(seg.cabinClass)}</p>
                    <p>Aircraft: {seg.aircraft}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🟦 FARE DETAILS */}
          <div className="bg-linear-to-br from-teal-50 to-white border border-teal-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-teal-700 mb-3 flex items-center gap-2">
              <FiDollarSign /> Fare Breakdown
            </h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Base Fare: ₹{flight.fareSnapshot.baseFare}</p>
              <p>Tax: ₹{flight.fareSnapshot.tax}</p>
              <p>Refundable: {flight.fareSnapshot.refundable ? "Yes" : "No"}</p>
              <p>Fare Type: {flight.fareSnapshot.fareType}</p>
            </div>
          </div>

          {/* 🟩 TRAVELLERS CARD */}
          <div className="lg:col-span-3 bg-linear-to-br from-green-50 to-white border border-green-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A4D68] mb-4 flex items-center gap-2">
              <FiUser /> Travellers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {booking.travellers.map((t, i) => (
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
          {isFareExpired && (
            <div className="lg:col-span-3 bg-red-50 border border-red-200 rounded-xl p-6 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <FiAlertTriangle /> This fare has expired.
              </div>
              <button
                onClick={() => navigate("/search-flight")}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Create New Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
