// src/pages/Bookings/BookApprovedFlight.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookingRequestById } from "../../../Redux/Actions/booking.thunks";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";

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

  const handleBookFlight = async () => {
    try {
      await dispatch(confirmBooking(id)).unwrap();

      ToastWithTimer({
        type: "success",
        message: "Flight booked successfully!",
      });

      navigate("/my-bookings");
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err || "Booking failed",
      });
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  if (!booking)
    return (
      <div className="text-center mt-20 text-gray-600">Booking not found.</div>
    );

  const flight = booking.flightRequest;
  const requestStatus = booking.requestStatus;
  // pending_approval | approved | rejected

  const executionStatus = booking.executionStatus;
  // not_started | confirmed

  const fareExpiry = flight?.fareExpiry ? new Date(flight.fareExpiry) : null;

  const isFareExpired = fareExpiry && new Date() > fareExpiry;

  const firstSegment = flight?.segments?.[0];
  const lastSegment = flight?.segments?.[flight.segments.length - 1];

  const getStatusInfo = () => {
    if (requestStatus === "pending_approval") {
      return {
        text: "Waiting for admin approval",
        color: "text-yellow-600",
        canBook: false,
      };
    }

    if (requestStatus === "rejected") {
      return {
        text: "Rejected by admin",
        color: "text-red-600",
        canBook: false,
      };
    }

    if (requestStatus === "approved" && isFareExpired) {
      return {
        text: "Fare expired. Please create a new request.",
        color: "text-red-600",
        canBook: false,
      };
    }

    if (requestStatus === "approved") {
      return {
        text: "Approved by admin",
        color: "text-green-600",
        canBook: true,
      };
    }

    return {
      text: "Unknown status",
      color: "text-gray-500",
      canBook: false,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6">
        <EmployeeHeader />
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-[#0A4D68] mb-6">
          Flight Booking Confirmation
        </h1>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-medium">Booking Reference:</span>{" "}
            {booking.bookingReference}
          </div>
          <div>
            <span className="font-medium">Purpose of Travel:</span>{" "}
            {booking.purposeOfTravel}
          </div>
          <div>
            <span className="font-medium">Requested On:</span>{" "}
            {new Date(booking.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Total Amount:</span> ₹
            {booking.pricingSnapshot?.totalAmount}
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Flight Itinerary</h3>

        {booking.flightRequest.segments.map((seg, idx) => (
          <div key={idx} className="mb-4 border rounded-lg p-4 bg-slate-50">
            <p className="font-medium text-[#0A4D68]">
              {seg.origin.city} ({seg.origin.airportCode}) →{" "}
              {seg.destination.city} ({seg.destination.airportCode})
            </p>

            <p className="text-sm text-gray-600">
              Airline: {seg.airlineName} ({seg.airlineCode}-{seg.flightNumber})
            </p>

            <p className="text-sm text-gray-600">
              Departure: {new Date(seg.departureDateTime).toLocaleString()}
            </p>

            <p className="text-sm text-gray-600">
              Arrival: {new Date(seg.arrivalDateTime).toLocaleString()}
            </p>

            <p className="text-sm text-gray-600">
              Cabin: {seg.cabinClass} | Aircraft: {seg.aircraft}
            </p>

            <p className="text-sm text-gray-600">
              Baggage: {seg.baggage.checkIn} + {seg.baggage.cabin}
            </p>
          </div>
        ))}

        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Traveller Details
        </h3>

        <div className="space-y-4 mb-8">
          {booking.travellers.map((t, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-[#0A4D68]">
                  {t.title} {t.firstName} {t.lastName}
                </p>

                {t.isLeadPassenger && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    Lead Traveller
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Gender:</span>{" "}
                  {t.gender || "N/A"}
                </p>
                <p>
                  <span className="font-medium">DOB:</span>{" "}
                  {t.dateOfBirth
                    ? new Date(t.dateOfBirth).toLocaleDateString()
                    : "N/A"}
                </p>

                <p>
                  <span className="font-medium">Email:</span> {t.email || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Nationality:</span>{" "}
                  {t.nationality || "N/A"}
                </p>

                <p>
                  <span className="font-medium">Passport No:</span>{" "}
                  {t.passportNumber || "N/A"}
                </p>

                <p>
                  <span className="font-medium">Passport Expiry:</span>{" "}
                  {t.passportExpiry
                    ? new Date(t.passportExpiry).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-3">Fare Breakdown</h3>

        <div className="border rounded-lg p-4 text-sm bg-white">
          <p>Base Fare: ₹{booking.flightRequest.fareSnapshot.baseFare}</p>
          <p>Tax: ₹{booking.flightRequest.fareSnapshot.tax}</p>
          <p>
            Refundable:{" "}
            {booking.flightRequest.fareSnapshot.refundable ? "Yes" : "No"}
          </p>
          <p>Fare Type: {booking.flightRequest.fareSnapshot.fareType}</p>
        </div>

        {booking.flightRequest.ssrSnapshot.seats.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mt-6">Seat Selection</h3>
            {booking.flightRequest.ssrSnapshot.seats.map((s, i) => (
              <p key={i} className="text-sm">
                Seat {s.seatNo} (₹{s.price})
              </p>
            ))}
          </>
        )}

        {booking.executionStatus === "ticketed" && (
          <>
            <h3 className="text-lg font-semibold mt-6">Booking Result</h3>
            <p>PNR: {booking.bookingResult.pnr}</p>

            {booking.bookingResult.ticketNumbers.map((t, i) => (
              <p key={i}>Ticket: {t}</p>
            ))}
          </>
        )}

        <div className="flex justify-between items-center border-t pt-4">
          <div
            className={`flex items-center gap-2 text-sm ${statusInfo.color}`}
          >
            <FiClock />
            {statusInfo.text}
          </div>

          <button
            disabled={actionLoading || !statusInfo.canBook}
            onClick={handleBookFlight}
            className={`px-5 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition ${
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
                <FiCheckCircle />
                Book Flight
              </>
            )}
          </button>

          {isFareExpired && (
            <button
              onClick={() => navigate("/search-flight")}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Create new flight request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
