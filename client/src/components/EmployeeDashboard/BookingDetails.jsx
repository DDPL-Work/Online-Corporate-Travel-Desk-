import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import {
  downloadTicketPdf,
  fetchMyBookingById,
} from "../../Redux/Actions/booking.thunks";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatDateWithYear,
  getCabinClassLabel,
  airlineLogo,
  airlineThemes,
  FLIGHT_STATUS_MAP,
} from "../../utils/formatter";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selected: booking, loading } = useSelector((state) => state.bookings);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (id) dispatch(fetchMyBookingById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (!booking?._id) return;

    if (booking.executionStatus !== "ticket_pending") return;

    const interval = setInterval(() => {
      dispatch(fetchMyBookingById(booking._id));
    }, 15000); // every 15 seconds

    return () => clearInterval(interval);
  }, [booking?._id, booking?.executionStatus, dispatch]);

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading booking details...
      </div>
    );
  }

  // const flight = booking.flightRequest?.segments?.[0];
  const flights = booking.flightRequest?.segments || [];

  const traveller = booking.travellers?.[0];
  const fare = booking.pricingSnapshot;
  // const pnr = booking.bookingResult?.pnr;
  const pnr =
    booking.bookingResult?.pnr ||
    (booking.bookingResult?.onwardPNR &&
      `${booking.bookingResult.onwardPNR} / ${booking.bookingResult.returnPNR}`);

  booking.bookingResult?.pnr ? [booking.bookingResult?.pnr] : [];

  const pnrsByJourney = {
    onward: booking.bookingResult?.onwardPNR || null,
    return: booking.bookingResult?.returnPNR || null,
  };

  // fallback if single PNR only
  if (!pnrsByJourney.onward && booking.bookingResult?.pnr) {
    pnrsByJourney.onward = booking.bookingResult.pnr;
  }

  const paymentSuccessful = booking.payment?.status === "completed";

  // const handleDownloadTicket = async () => {
  //   setDownloading(true);
  //   await dispatch(downloadTicketPdf(booking._id));
  //   setDownloading(false);
  // };

  const handleDownloadTicket = async (journeyType) => {
    const pnr = pnrsByJourney[journeyType];
    if (!pnr) return;
    if (!pnrsByJourney.onward && booking.bookingResult?.pnr) {
      pnrsByJourney.onward = booking.bookingResult.pnr;
    }

    setDownloading(journeyType);

    await dispatch(downloadTicketPdf({ bookingId: booking._id, journeyType }));

    setDownloading(null);
  };

  return (
    <div className="min-h-screen p-6 bg-linear-to-br from-[#F8FAFC] to-[#E0F7FA]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-[#088395] hover:underline"
        >
          <FiArrowLeft className="mr-2" /> Back
        </button>
        <h1 className="text-3xl font-bold text-[#0A4D68]">Booking Details</h1>
      </div>

      {/* Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ✈️ Flight Summary */}
          <div className="lg:col-span-2 space-y-6">  
        {flights.map((flight, index) => {
          const airlineTheme =
            airlineThemes[flight?.airlineCode] || airlineThemes.DEFAULT;

          return (
            <div
              className={`col-span-2 bg-linear-to-r ${airlineTheme.gradient} rounded-xl shadow-lg p-6 text-white`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={airlineLogo(flight?.airlineCode)}
                    alt={flight?.airlineName}
                    className="w-10 h-10 rounded-full bg-white p-1"
                  />
                  <div>
                    <h2 className="text-xl font-semibold">
                      {flight?.airlineName}
                    </h2>
                    <p className="text-sm opacity-90">
                      {flight?.airlineCode} {flight?.flightNumber} •{" "}
                      {
                        FLIGHT_STATUS_MAP[flight?.FlightStatus || "Confirmed"]
                          ?.label
                      }
                    </p>
                  </div>
                </div>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {getCabinClassLabel(flight?.cabinClass)}
                </span>
              </div>

              {/* Flight Path */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {flight?.origin?.airportCode}
                  </p>
                  <p className="text-sm">{flight?.origin?.city}</p>
                  <p className="text-xs opacity-80">
                    {formatDate(flight?.departureDateTime)}
                  </p>
                  <p className="text-sm">
                    {formatTime(flight?.departureDateTime)}
                  </p>
                </div>

                <div className="flex items-center">
                  <div className="h-1 w-16 sm:w-32 bg-white/60 mx-3"></div>
                  <FiClock className="text-white" />
                  <div className="h-1 w-16 sm:w-32 bg-white/60 mx-3"></div>
                </div>

                <div className="text-center">
                  <p className="text-lg font-bold">
                    {flight?.destination?.airportCode}
                  </p>
                  <p className="text-sm">{flight?.destination?.city}</p>
                  <p className="text-xs opacity-80">
                    {formatDate(flight?.arrivalDateTime)}
                  </p>
                  <p className="text-sm">
                    {formatTime(flight?.arrivalDateTime)}
                  </p>
                </div>
              </div>

              {/* Extra Info */}
              <div className="mt-4 text-sm opacity-90 flex flex-wrap justify-between">
                <p>
                  Duration: <b>{formatDuration(flight?.durationMinutes)}</b>
                </p>
                <p>
                  Baggage: <b>{flight?.baggage?.checkIn}</b> |{" "}
                  <b>{flight?.baggage?.cabin}</b>
                </p>
                <p>
                  Terminal: <b>{flight?.origin?.terminal || "N/A"}</b>
                </p>
              </div>

              {/* PNR + Download Section */}
              {paymentSuccessful && (
                <div className="mt-4 flex items-center justify-between bg-white/10 p-3 rounded-lg">
                  <div>
                    <p className="text-sm opacity-90">PNR</p>
                    <p className="font-bold text-lg">
                      {/* {pnrsByJourney[flight.journeyType] || "Awaiting"} */}
                      {flight.journeyType === "return"
                        ? pnrsByJourney.return
                        : pnrsByJourney.onward || "Awaiting"}
                    </p>
                  </div>

                  {(pnrsByJourney[flight.journeyType] || pnr) && (
                    <button
                      onClick={() =>
                        handleDownloadTicket(flight.journeyType || "onward")
                      }
                      disabled={downloading === flight.journeyType}
                      className="flex items-center px-4 py-2 bg-white text-[#0A4D68] font-semibold rounded-lg hover:bg-gray-100 transition"
                    >
                      <FiDownload className="mr-2" />
                      {downloading === flight.journeyType
                        ? "Downloading..."
                        : "Download Ticket"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>

        {/* 👤 Traveller Info */}
        <div className="bg-white shadow-md rounded-xl p-6 border-t-4 border-[#088395] hover:shadow-xl transition">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="text-[#0A4D68] text-2xl" />
            <h2 className="text-lg font-semibold text-[#0A4D68]">
              Traveller Info
            </h2>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <b>Name:</b> {traveller?.title} {traveller?.firstName}{" "}
              {traveller?.lastName}
            </p>
            <p>
              <b>Email:</b> {traveller?.email}
            </p>
            <p>
              <b>Phone:</b> {traveller?.phoneWithCode}
            </p>
            <p>
              <b>Gender:</b> {traveller?.gender}
            </p>
            <p>
              <b>Date of Birth:</b> {formatDateWithYear(traveller?.dateOfBirth)}
            </p>
            <p>
              <b>Nationality:</b> {traveller?.nationality}
            </p>
          </div>
        </div>

        {/* 💰 Fare Info */}
        <div className="bg-white shadow-md rounded-xl p-6 border-t-4 border-[#05BFDB] hover:shadow-xl transition">
          <div className="flex items-center gap-2 mb-4">
            <FiCreditCard className="text-[#088395] text-2xl" />
            <h2 className="text-lg font-semibold text-[#0A4D68]">
              Fare Summary
            </h2>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <b>Base Fare:</b> ₹{booking.flightRequest?.fareSnapshot?.baseFare}
            </p>
            <p>
              <b>Tax:</b> ₹{booking.flightRequest?.fareSnapshot?.tax}
            </p>
            <p>
              <b>Total:</b> ₹{fare?.totalAmount}
            </p>
            <p>
              <b>Currency:</b> {fare?.currency}
            </p>
            <p>
              <b>Refundable:</b>{" "}
              {booking.flightRequest?.fareSnapshot?.refundable ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {/* 💳 Payment Info */}
        <div className="col-span-2 bg-white shadow-md rounded-xl p-6 border-t-4 border-[#088395] hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p>
                <b>Payment Status:</b>{" "}
                {paymentSuccessful ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <FiCheckCircle /> Payment Successful
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <FiAlertCircle /> Pending Payment
                  </span>
                )}
              </p>
              <p>
                <b>Purpose of Travel:</b> {booking.purposeOfTravel}
              </p>
              <p>
                <b>Ticket Status:</b>{" "}
                {booking.executionStatus === "ticketed" && (
                  <span className="text-green-600 font-semibold">
                    Ticket Issued
                  </span>
                )}
                {booking.executionStatus === "ticket_pending" && (
                  <span className="text-orange-600 font-semibold">
                    Ticket is being issued (please wait)
                  </span>
                )}
              </p>

              <p>
                <b>PNR:</b> {pnr || "Awaiting assignment"}
              </p>
            </div>

            {/* {pnr && paymentSuccessful ? (
              <button
                onClick={handleDownloadTicket}
                disabled={downloading === flights.journeyType}
                className="flex items-center px-4 py-2 bg-[#088395] text-white rounded-lg hover:bg-[#0A4D68] transition"
              >
                <FiDownload className="mr-2" />
                {downloading === flights.journeyType
                  ? "Downloading..."
                  : "Download Ticket"}
              </button>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Ticket not available (No PNR)
              </div>
            )} */}
            <div className="text-sm text-gray-500 italic">
              Ticket available above
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
