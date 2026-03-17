import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MdArrowBack,
  MdHotel,
  MdCheckCircle,
  MdInfo,
  MdVerifiedUser,
  MdLocationOn,
} from "react-icons/md";
import { FiUser, FiMail, FiPhone, FiCalendar, FiShield } from "react-icons/fi";
import { FaUserPlus, FaHotel } from "react-icons/fa";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { createBookingRequest, fetchMyBookingById, executeApprovedHotelBooking } from "../../../Redux/Actions/booking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import Swal from "sweetalert2";

const HotelReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { actionLoading } = useSelector((state) => state.bookings);
  const { traceId: reduxTraceId, hotels: searchedHotels } = useSelector((state) => state.hotel);

  const { hotel, room, searchParams } = location.state || {};

  const [travelers, setTravelers] = useState([]);
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [bookingRequest, setBookingRequest] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const bookingId = queryParams.get("id");
  const isBookNowMode = !!bookingId;

  // Fetch existing booking if in Book Now mode
  useEffect(() => {
    if (isBookNowMode) {
      dispatch(fetchMyBookingById(bookingId))
        .unwrap()
        .then((res) => {
          setBookingRequest(res);
          setTravelers(res.travellers || []);
          setPurposeOfTravel(res.purposeOfTravel || "");
        })
        .catch((err) => {
          ToastWithTimer({ type: "error", message: "Failed to fetch booking details" });
        });
    } else if (user) {
      setTravelers([
        {
          id: 1,
          title: "Mr",
          firstName: user.name?.firstName || "",
          lastName: user.name?.lastName || "",
          email: user.email || "",
          phoneWithCode: user.phone || "",
          isLeadGuest: true,
        },
      ]);
    } else {
      setTravelers([
        {
          id: 1,
          title: "Mr",
          firstName: "",
          lastName: "",
          email: "",
          phoneWithCode: "",
          isLeadGuest: true,
        },
      ]);
    }
  }, [user, bookingId, isBookNowMode, dispatch]);

  const handleAddGuest = () => {
    setTravelers((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        title: "Mr",
        firstName: "",
        lastName: "",
        email: "",
        phoneWithCode: "",
        isLeadGuest: false,
      },
    ]);
  };

  const updateTraveler = (id, field, value) => {
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const handleRequestApproval = async () => {
    if (!purposeOfTravel) {
      ToastWithTimer({ type: "error", message: "Please enter purpose of travel" });
      return;
    }

    // Basic validation
    for (let t of travelers) {
      if (!t.firstName || !t.lastName || !t.email || !t.phoneWithCode) {
        ToastWithTimer({ type: "error", message: "Please fill all guest details" });
        return;
      }
    }

    // Critical supplier references. Without these, production booking will fail later.
    const resolvedBookingCode =
      displayRoom?.BookingCode ||
      displayRoom?.RoomTypeCode ||
      displayRoom?.RatePlanCode ||
      displayRoom?.roomTypeCode ||
      displayRoom?.ratePlanCode ||
      null;

    if (!resolvedBookingCode) {
      ToastWithTimer({
        type: "error",
        message:
          "Room session data is missing (BookingCode). Please go back, refresh rooms, and select the room again.",
      });
      return;
    }

    const payload = {
      bookingType: "hotel",
      hotelRequest: {
        hotelCode: displayHotel?.hotelCode,
        hotelName: displayHotel?.name,
        roomIndex: displayRoom?.RoomIndex || 1,
        roomTypeCode: displayRoom?.RoomTypeCode || displayRoom?.BookingCode,
        roomTypeName: displayRoom?.RoomTypeName || (Array.isArray(displayRoom?.Name) ? displayRoom.Name[0] : displayRoom?.Name),
        ratePlanCode: displayRoom?.RatePlanCode || displayRoom?.BookingCode,
        bookingCode: resolvedBookingCode,
        checkIn: displaySearchParams?.checkIn,
        checkOut: displaySearchParams?.checkOut,
        rooms: displaySearchParams?.rooms,
        resultIndex: displayHotel?.resultIndex,
        traceId: displayHotel?.traceId,
        price: displayRoom?.Price, // ✅ ADD FULL TBO PRICE OBJECT
        guestNationality: "IN",
      },
      travellers: travelers,
      purposeOfTravel,
      pricingSnapshot: {
        totalAmount: displayRoom?.TotalFare,
        currency: displayRoom?.Currency || "INR",
      },
      bookingSnapshot: {
        hotelName: displayHotel?.name,
        hotelImage: displayHotel?.images?.[0] || displayHotel?.image || "/placeholder-hotel.jpg",
        city: displayHotel?.city || displaySearchParams?.city,
        checkInDate: displaySearchParams?.checkIn,
        checkOutDate: displaySearchParams?.checkOut,
        roomCount: displaySearchParams?.rooms?.length || 1,
        nights: displayRoom?.DayRates?.[0]?.length || 1,
        amount: displayRoom?.TotalFare,
        currency: displayRoom?.Currency || "INR",
      },
    };

    try {
      console.log("🏨 REVIEW BOOKING - displayHotel:", JSON.stringify(displayHotel, null, 2));
      console.log("🏨 REVIEW BOOKING - displayRoom:", JSON.stringify(displayRoom, null, 2));
      console.log("🏨 REVIEW BOOKING - payload hotelRequest:", JSON.stringify(payload.hotelRequest, null, 2));
      await dispatch(createBookingRequest(payload)).unwrap();
      ToastWithTimer({ type: "success", message: "Booking request submitted successfully" });
      navigate("/my-bookings");
    } catch (err) {
      ToastWithTimer({ type: "error", message: err || "Failed to submit request" });
    }
  };

  const handleBookNow = async () => {
    try {
      const result = await Swal.fire({
        title: "Confirm Your Booking",
        text: `Are you sure you want to book ${displayHotel?.name}? This action cannot be undone.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#0A4D68",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Confirm & Book",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            return await dispatch(executeApprovedHotelBooking(bookingId)).unwrap();
          } catch (error) {
            Swal.showValidationMessage(`Booking failed: ${error}`);
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (result.isConfirmed) {
        ToastWithTimer({ type: "success", message: "Hotel booked successfully!" });
        navigate("/my-bookings");
      }
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  const handleAction = () => {
    if (isBookNowMode) {
      handleBookNow();
    } else {
      handleRequestApproval();
    }
  };

  // Lookup the hotel ResultIndex from Redux search results
  const hotelFromSearch = searchedHotels?.find((h) => h.HotelCode === (hotel?.hotelCode || bookingRequest?.hotelRequest?.hotelCode));

  // Derive data from bookingRequest if in Book Now mode
  const displayHotel = isBookNowMode ? {
    name: bookingRequest?.bookingSnapshot?.hotelName,
    rating: 4,
    address: bookingRequest?.bookingSnapshot?.city,
    images: [bookingRequest?.bookingSnapshot?.hotelImage || "/placeholder-hotel.jpg"],
    resultIndex: bookingRequest?.hotelRequest?.resultIndex || bookingRequest?.bookingSnapshot?.resultIndex || hotelFromSearch?.ResultIndex,
    traceId: bookingRequest?.hotelRequest?.traceId || bookingRequest?.bookingSnapshot?.traceId || reduxTraceId,
  } : {
    ...hotel,
    traceId: hotel?.traceId || reduxTraceId,
    resultIndex: hotel?.resultIndex || hotelFromSearch?.ResultIndex,
  };

  const displayRoom = isBookNowMode ? {
    RoomTypeName: bookingRequest?.hotelRequest?.roomTypeName || "Standard Room",
    TotalFare: bookingRequest?.pricingSnapshot?.totalAmount,
    Currency: bookingRequest?.pricingSnapshot?.currency,
    DayRates: [[{}]], // dummy for night count
    Price: bookingRequest?.hotelRequest?.price, // ✅ PASS SAVED PRICE OBJECT
  } : room;

  const displaySearchParams = isBookNowMode ? {
    checkIn: bookingRequest?.bookingSnapshot?.checkInDate,
    checkOut: bookingRequest?.bookingSnapshot?.checkOutDate,
    rooms: [{ adults: 2 }], // dummy
  } : searchParams;

  if (!isBookNowMode && (!hotel || !room)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No booking details found. Please search again.</p>
      </div>
    );
  }

  if (isBookNowMode && !bookingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading booking details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans text-[#4a4a4a]">
      <EmployeeHeader />

      {/* Breadcrumb / Back */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-[#008cff] hover:text-[#005fb3] transition"
          >
            <MdArrowBack size={20} />
            BACK TO SEARCH RESULTS
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-black mb-6">Review your Booking</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hotel Summary Card */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-gray-100 pb-6 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{displayHotel?.name}</h2>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < (displayHotel?.rating || 0) ? "text-[#f5a623]" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-[#0A4D68] text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Corporate Favorite
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 flex items-start gap-1.5">
                    <MdLocationOn className="text-gray-400 mt-0.5 flex-shrink-0" size={16} /> 
                    <span>{displayHotel?.address}</span>
                  </p>
                </div>
                <img
                  src={displayHotel?.images?.[0] || "/placeholder-hotel.jpg"}
                  alt={displayHotel?.name}
                  className="w-full md:w-36 h-36 object-cover rounded-xl shadow-sm border border-gray-100"
                />
              </div>

              {/* Date Selection Info */}
              <div className="bg-gray-50 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                
                {/* Horizontal line for desktop connecting CheckIn and CheckOut */}
                <div className="hidden md:block absolute top-[50%] left-[10%] right-[30%] h-px bg-gray-200 z-0"></div>

                <div className="flex-1 w-full md:w-auto text-left z-10 bg-gray-50 px-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Check In</p>
                  <p className="text-base font-bold text-gray-900">
                    {displaySearchParams.checkIn ? new Date(displaySearchParams.checkIn).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">From 2:00 PM</p>
                </div>

                <div className="hidden md:flex flex-col items-center justify-center z-10 px-4">
                  <div className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#0A4D68] shadow-sm">
                    {displayRoom.DayRates?.[0]?.length || 1} NIGHT{displayRoom.DayRates?.[0]?.length !== 1 ? 'S' : ''}
                  </div>
                </div>

                <div className="flex-1 w-full md:w-auto text-left z-10 bg-gray-50 px-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Check Out</p>
                  <p className="text-base font-bold text-gray-900">
                    {displaySearchParams.checkOut ? new Date(displaySearchParams.checkOut).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Until 11:00 AM</p>
                </div>
                
                <div className="hidden md:block h-16 w-px bg-gray-200 mx-4"></div>
                
                <div className="w-full md:w-auto pt-4 md:pt-0 border-t border-gray-200 md:border-0 md:text-center shrink-0 min-w-[100px] z-10">
                  <p className="text-sm font-bold text-gray-900 mb-0.5">
                    {displaySearchParams.rooms?.length || 1} Room{displaySearchParams.rooms?.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    {displaySearchParams.rooms?.[0]?.adults || 2} Adult{displaySearchParams.rooms?.[0]?.adults !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Room Specifics */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{displayRoom?.RoomTypeName}</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <MdCheckCircle className="text-green-500" size={18} /> Room Only
                  </span>
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <MdCheckCircle className="text-green-500" size={18} /> No meals included
                  </span>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                  <MdInfo className="text-orange-500 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-bold text-orange-900 mb-0.5">Non-Refundable Booking</h4>
                    <p className="text-xs text-orange-800 leading-relaxed">
                      Refund is not applicable for this booking if canceled.{" "}
                      <button className="text-orange-600 font-bold hover:underline">View Policy</button>
                    </p>
                  </div>
                </div>
              </div>
            </div>



            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Guest Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Please provide the details of the primary traveler</p>
                </div>
                {!isBookNowMode && (
                  <button
                    onClick={handleAddGuest}
                    className="flex items-center gap-2 text-[#0A4D68] text-sm font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <FaUserPlus /> Add Guest
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {travelers.map((t, index) => (
                  <div
                    key={t.id || t._id || `${t.email || "guest"}-${index}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
                      <select
                        value={t.title}
                        onChange={(e) => updateTraveler(t.id, "title", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mt-1.5 focus:bg-white focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent transition-all outline-none"
                      >
                        <option>Mr</option>
                        <option>Mrs</option>
                        <option>Ms</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        value={t.firstName}
                        onChange={(e) => updateTraveler(t.id, "firstName", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mt-1.5 focus:bg-white focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent transition-all outline-none"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        value={t.lastName}
                        onChange={(e) => updateTraveler(t.id, "lastName", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mt-1.5 focus:bg-white focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent transition-all outline-none"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={t.email}
                        onChange={(e) => updateTraveler(t.id, "email", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mt-1.5 focus:bg-white focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent transition-all outline-none"
                        placeholder="Email (Voucher will be sent here)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile Number</label>
                      <div className="flex gap-2 mt-1.5">
                        <select className="w-20 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#0A4D68] outline-none">
                          <option>+91</option>
                        </select>
                        <input
                          type="text"
                          value={t.phoneWithCode}
                          disabled={isBookNowMode}
                          onChange={(e) => updateTraveler(t.id, "phoneWithCode", e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#0A4D68] transition-all outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          placeholder="Contact Number"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purpose of Travel */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Purpose of Travel</h3>
              <p className="text-sm text-gray-500 mb-5">Required for corporate approval process</p>
              <textarea
                value={purposeOfTravel}
                disabled={isBookNowMode}
                onChange={(e) => setPurposeOfTravel(e.target.value)}
                placeholder="Enter details about why you need this booking..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent min-h-[120px] transition-all outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* RIGHT COLUMN - PRICE SUMMARY */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0A4D68] to-[#088395] p-5">
                  <h3 className="text-lg font-bold text-white mb-1">Price Summary</h3>
                  <p className="text-blue-100 text-xs text-opacity-80">Transparent pricing with no hidden fees</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Base Price + Taxes</span>
                    <span className="text-gray-900 font-semibold">₹{displayRoom.TotalFare?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg pt-4 border-t border-gray-100">
                    <span className="font-bold text-gray-900">Total Amount</span>
                    <span className="font-black text-[#0A4D68] text-2xl">₹{displayRoom.TotalFare?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-4">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed px-4">
                  By proceeding, I agree to Corporate Desk's <span className="text-[#0A4D68] cursor-pointer hover:underline">User Agreement</span> and <span className="text-[#0A4D68] cursor-pointer hover:underline">Cancellation Policy</span>.
                </p>
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-[#0A4D68] to-[#088395] hover:from-[#093f54] hover:to-[#066876] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider text-sm flex justify-center items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : isBookNowMode ? (
                    <span>CONFIRM & BOOK NOW</span>
                  ) : (
                    <span>REQUEST FOR APPROVAL</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelReviewBooking;
