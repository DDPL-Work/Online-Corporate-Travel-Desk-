import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import {
  MdArrowBack,
  MdHotel,
  MdLocationOn,
  MdVerifiedUser,
  MdKingBed,
} from "react-icons/md";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiUser,
  FiPhone,
  FiMail,
  FiStar,
  FiWifi,
  FiBriefcase,
  FiUsers,
  FiTag,
  FiShield,
  FiFileText,
  FiChevronLeft,
  FiClock,
} from "react-icons/fi";
import { Country } from "country-state-city";
import {
  fetchHotelRequestById,
  executeHotelBooking,
} from "../../../Redux/Actions/hotelBooking.thunks";
import LandingHeader from "../../../layout/LandingHeader";

// Helpers
const countries = Country.getAllCountries();
function countryName(isoCode) {
  return countries.find((c) => c.isoCode === isoCode)?.name || isoCode || "—";
}
function fmtDate(
  d,
  opts = { day: "2-digit", month: "short", year: "numeric" },
) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}
function fmtDay(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long" });
}
function nightsCount(ci, co) {
  if (!ci || !co) return 1;
  return Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
}

// Components
function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  const labelMap = {
    pending_approval: "Pending",
    pending_second_approval: "Pending",
    manager_approved: "Pending",
    approved: "Ready to Book",
    rejected: "Rejected",
    draft: "Draft",
  };
  const label = labelMap[s] || status;

  const isApproved = s === "approved";
  const isRejected = s === "rejected";

  const colors = isRejected
    ? "bg-[#FDF1EE] text-[#B5341A] border-[#F0C4BA]"
    : isApproved
      ? "bg-[#EDF7F2] text-[#2C7A4B] border-[#C3E4D2]"
      : "bg-[#FDF8EE] text-[#8A6200] border-[#F0E0A8]";

  const dotColor = isRejected
    ? "bg-[#B5341A]"
    : isApproved
      ? "bg-[#2C7A4B]"
      : "bg-[#8A6200]";

  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[2px] border text-[10px] font-semibold tracking-[0.12em] uppercase ${colors}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

function Stars({ count = 0 }) {
  const rating = count || 0;
  return (
    <span className="inline-flex gap-[2px] items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          className={i < rating ? "fill-[#B5862A]" : "fill-[#EAE4D9]"}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function GridSummary({ items = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9] mb-6">
      {items.map((item, i) => (
        <div key={i} className="bg-white p-5">
          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
            {item.label}
          </div>
          <div
            className={`flex items-center gap-[6px] text-[15px] font-semibold ${
              item.ok === true
                ? "text-[#2C7A4B]"
                : item.ok === false
                  ? "text-[#8A6200]"
                  : "text-[#1A1714]"
            }`}
          >
            {item.icon && (
              <span
                className={
                  item.ok === true
                    ? "text-[#2C7A4B]"
                    : item.ok === false
                      ? "text-[#8A6200]"
                      : "text-[#A89F94]"
                }
              >
                {item.icon}
              </span>
            )}
            {item.value}
          </div>
          {item.sub && (
            <div className="text-[11px] text-[#A89F94] mt-1">{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const decodeHtml = (html) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const HotelBookNow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { loading: actionLoading } = useSelector(
    (state) => state.hotelBookings,
  );
  const { user } = useSelector((state) => state.auth);

  const [bookingRequest, setBookingRequest] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("hotel");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertModal, setAlertModal] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoadError("No booking ID provided.");
      setFetching(false);
      return;
    }
    dispatch(fetchHotelRequestById(id))
      .unwrap()
      .then((res) => {
        setBookingRequest(res);
        setFetching(false);
      })
      .catch((err) => {
        setLoadError(err || "Failed to load booking details.");
        setFetching(false);
      });
  }, [id, dispatch]);

  /* Derived */
  const travelers = bookingRequest?.travellers || [];
  const purposeOfTravel = bookingRequest?.purposeOfTravel || "";
  const hotelReq = bookingRequest?.hotelRequest || {};
  const snapshot = bookingRequest?.bookingSnapshot || {};

  const projectName = bookingRequest?.projectName;
  const projectId = bookingRequest?.projectId;
  const projectClient = bookingRequest?.projectClient;

  const requester = bookingRequest?.requesterDetails || {};
  const gst = bookingRequest?.gstDetails || {};

  const selectedHotel = hotelReq.selectedHotel || {};
  const selectedRooms = Array.isArray(hotelReq.allRooms)
    ? hotelReq.allRooms
    : [];

  const hotelDetails = bookingRequest?.hotelDetails || {};
  
  const hotelImages =
    (hotelDetails?.images?.length > 0
      ? hotelDetails.images
      : null) ||
    (hotelReq?.selectedHotel?.images?.length > 0
      ? hotelReq.selectedHotel.images
      : null) ||
    (snapshot?.hotelImage ? [snapshot.hotelImage] : null) ||
    hotelReq?.selectedRoom?.rawRoomData?.images ||
    [];

  useEffect(() => {
    if (hotelImages.length > 1) {
      const interval = setInterval(() => {
        setImgIdx((prev) => (prev + 1) % hotelImages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [hotelImages.length]);

  const hotel = {
    name: hotelDetails?.hotelName || selectedHotel?.hotelName || snapshot?.hotelName || "Hotel",
    rating: hotelDetails?.hotelRating || selectedHotel?.starRating || 0,
    address: hotelDetails?.address || selectedHotel?.address || "",
    city: hotelDetails?.cityName || selectedHotel?.city || snapshot?.city || "",
    image: hotelImages[imgIdx] || hotelDetails?.image || "/placeholder-hotel.jpg",
    phone: hotelDetails?.phoneNumber || "",
    email: hotelDetails?.email || "",
    website: hotelDetails?.hotelWebsiteUrl || "",
  };

  const checkIn = hotelReq.checkInDate || snapshot.checkInDate;
  const checkOut = hotelReq.checkOutDate || snapshot.checkOutDate;
  const nights = nightsCount(checkIn, checkOut);
  
  const totalAdults =
    hotelReq.roomGuests?.reduce((sum, r) => sum + (r.noOfAdults || 0), 0) ||
    travelers.length;

  // Detail Rooms
  const detailRooms =
    hotelReq.preBookResponse?.HotelResult?.[0]?.Rooms ||
    (hotelReq.selectedRoom?.rawRoomData
      ? [hotelReq.selectedRoom.rawRoomData]
      : selectedRooms);

  const roomCount = hotelReq?.noOfRooms || snapshot?.roomCount || detailRooms.length || 1;

  const totalFare = bookingRequest?.pricingSnapshot?.totalAmount || snapshot?.amount || 0;
  
  const tax = detailRooms.reduce(
    (sum, r) => sum + (r.TotalTax || r.NetTax || r.totalTax || r.price?.tax || 0),
    0,
  );
  
  const baseFare = totalFare - tax;

  const isApproved = bookingRequest?.requestStatus === "approved";
  const status = bookingRequest?.requestStatus;

  const labelMap = {
    pending_approval: "Pending",
    pending_second_approval: "Pending",
    manager_approved: "Pending",
    approved: "Ready to Book",
    rejected: "Rejected",
    draft: "Draft",
  };
  const label = labelMap[status?.toLowerCase()] || status || "Pending";

  // Policies extraction
  const cancellationPolicies =
    hotelReq.preBookResponse?.HotelResult?.[0]?.Rooms?.[0]?.CancelPolicies ||
    hotelReq.selectedRoom?.cancelPolicies ||
    hotelReq.selectedRoom?.rawRoomData?.CancelPolicies ||
    [];
  const rateConditions =
    hotelReq.preBookResponse?.HotelResult?.[0]?.RateConditions ||
    hotelReq.selectedRoom?.rawRoomData?.RateConditions ||
    [];

  // Detail Rooms already extracted above

  const handleBookHotel = async () => {
    setShowConfirmModal(false);
    try {
      await dispatch(executeHotelBooking(id)).unwrap();
      setAlertModal({
        type: "success",
        title: "Booking Successful",
        text: "Hotel booked successfully!",
        confirmText: "View Bookings",
        onConfirm: () => navigate("/my-bookings", { replace: true }),
      });
    } catch (err) {
      const errorMessage = err?.message?.toLowerCase() || "";
      if (errorMessage.includes("insufficient balance")) {
        setAlertModal({
          type: "error",
          title: "Insufficient Balance",
          text: "Insufficient wallet balance. Please recharge your account.",
          confirmText: "OK",
        });
        return;
      }
      setAlertModal({
        type: "error",
        title: "Booking Failed",
        text: err?.message || "Something went wrong while booking.",
        confirmText: "OK",
      });
    }
  };

  if (fetching) {
    return (
      <div className="bg-[#FAF8F4] min-h-screen">
        <LandingHeader />
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#C9A240] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (loadError || !bookingRequest) {
    return (
      <div className="bg-[#FAF8F4] min-h-screen">
        <LandingHeader />
        <div className="p-8 flex justify-center">
          <div className="bg-white p-8 max-w-md w-full border border-[#E1E7EF] text-center">
            <FiAlertTriangle
              size={32}
              className="mx-auto text-[#DC2626] mb-4"
            />
            <p className="text-[14px] text-[#1A1714] font-bold mb-4">
              {loadError || "Booking not found."}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-[10px] bg-[#000D26] text-white text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#04112F]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "hotel", label: "Hotel Details" },
    { id: "room", label: "Room Details" },
    { id: "project", label: "Project & Approver Details" },
    { id: "guests", label: "Passengers Details" },
    { id: "policy", label: "Policy & Rules" },
  ];

  return (
    <>
      <LandingHeader />
      <div className=" min-h-screen font-['DM_Sans'] selection:bg-[#C9A24020] selection:text-[#C9A240]">
        {/* ── Sticky header ── */}
        <header className="sticky top-[104px] z-40 bg-white flex flex-col pt-4 px-6 md:px-8 gap-4 mx-4 md:mx-10 mt-6">
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
              Hotel Booking — Approval Review
            </h1>

            <div className="ml-auto flex items-center gap-4">
              {bookingRequest.orderId && (
                <span className="text-[11px] text-[#65758B]">
                  Order ID:{" "}
                  <strong className="text-[#1A1714] font-['DM_Sans'] font-mono">
                    {bookingRequest.orderId}
                  </strong>
                </span>
              )}

              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[0.1em] border ${
                  bookingRequest.requestStatus === "approved"
                    ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                    : bookingRequest.requestStatus === "rejected"
                      ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                      : "bg-[#FFFBEB] border-[#F0E0A8] text-[#8A6200]"
                }`}
              >
                {bookingRequest.requestStatus === "approved" ? (
                  <FiCheckCircle size={10} />
                ) : bookingRequest.requestStatus === "rejected" ? (
                  <FiAlertTriangle size={10} />
                ) : (
                  <FiClock size={10} />
                )}
                {label}
              </span>

              {/* Confirm Booking button */}
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!isApproved || actionLoading}
                className="px-6 py-[12px] bg-[#000D26] text-white text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#04112F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {!isApproved ? (
                  "Waiting for Approval"
                ) : actionLoading ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={14} />
                    Confirm &amp; Book
                  </>
                )}
              </button>

            </div>
          </div>

          {/* Bottom Row - Tabs */}
          <div className="flex gap-8 relative overflow-x-auto whitespace-nowrap scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors relative flex-shrink-0 ${
                  activeTab === tab.id
                    ? "text-[#1A1714]"
                    : "text-[#94A3B8] hover:text-[#65758B]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C9A240]" />
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="bg-[#FAF8F4] mx-10 px-8 py-8 flex flex-col gap-8 pb-24">
          {/* Dynamic Header per tab */}
          {(() => {
            const headers = {
              hotel: {
                label: "Reservation",
                title: "Hotel Booking",
                subtitle:
                  "A complete record of the approved hotel booking, pricing, and details.",
              },
              room: {
                label: "Room Information",
                title: "Room Details",
                subtitle:
                  "Information about the selected room type, amenities, and inclusions.",
              },
              project: {
                label: "Project Details",
                title: "Project & Approvals",
                subtitle:
                  "Information about the project code and the approval workflow for this trip.",
              },
              guests: {
                label: "Traveller Information",
                title: "Passengers",
                subtitle:
                  "List of all passengers staying on this approved booking.",
              },
              policy: {
                label: "Rules & Policies",
                title: "Policy & Rules",
                subtitle: "Cancellation terms and rate conditions.",
              },
            };
            const h = headers[activeTab] || headers.hotel;
            return (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                    {h.label}
                  </p>
                  <h1 className="text-[36px] font-black text-[#1A1714] tracking-tight leading-none mb-3 font-['Cormorant_Garamond']">
                    {h.title}
                  </h1>
                  <p className="text-sm text-[#65758B] leading-relaxed">
                    {h.subtitle}
                  </p>
                </div>
                {bookingRequest?.approvedBy?.approvedAt && (
                  <div className="flex flex-col items-end gap-1 text-right">
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#65758B]">
                      Approved By
                    </p>
                    <p className="text-[14px] font-semibold text-[#1A1714]">
                      {bookingRequest.approverName ||
                        bookingRequest.approvedBy?.name?.firstName ||
                        "—"}
                    </p>
                    <p className="text-[11px] text-[#65758B]">
                      {bookingRequest.approverEmail || "—"}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ----- HOTEL DETAILS TAB ----- */}
          {activeTab === "hotel" && (
            <div className="space-y-6">
              {/* Hotel Hero Card & Price Card Side-by-Side */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Hotel Hero Card */}
                <div className="flex-1 bg-white border border-[#EAE4D9] w-full">
                  <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
                    <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
                      Hotel Request
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,380px)_1fr] gap-0">
                    <div className="relative min-h-[320px] overflow-hidden bg-[#E8E0D0]">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="w-full h-full object-cover block absolute inset-0"
                      />
                    </div>
                    <div className="p-8 md:p-9">
                      <div className="mb-6">
                        <div className="flex items-center gap-4 flex-wrap mb-2">
                          <h1 className="font-['Cormorant_Garamond'] text-[36px] font-bold leading-[1.1] text-[#1A1714]">
                            {hotel.name}
                          </h1>
                          <Stars count={hotel.rating} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap mb-[6px]">
                          {hotel.city && (
                            <span className="flex items-center gap-1 text-[12px] text-[#7A7068]">
                              <MdLocationOn
                                size={13}
                                className="text-[#B5862A]"
                              />
                              {hotel.city}
                            </span>
                          )}
                        </div>
                        {hotel.address && (
                          <p className="text-[12px] text-[#A89F94] leading-[1.5] max-w-[400px]">
                            {hotel.address}
                          </p>
                        )}
                        {(hotel.phone || hotel.email || hotel.website) && (
                          <div className="mt-4 flex flex-col gap-1.5 text-[12px] text-[#7A7068]">
                            {hotel.phone && (
                              <span className="flex items-center gap-2">
                                <FiPhone size={12} className="text-[#B5862A]" /> {hotel.phone}
                              </span>
                            )}
                            {hotel.email && (
                              <span className="flex items-center gap-2">
                                <FiMail size={12} className="text-[#B5862A]" /> {hotel.email}
                              </span>
                            )}
                            {hotel.website && (
                              <span className="flex items-center gap-2">
                                <FiInfo size={12} className="text-[#B5862A]" />{" "}
                                <a href={hotel.website.startsWith('http') ? hotel.website : `https://${hotel.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#B5862A] transition-colors hover:underline">
                                  {hotel.website}
                                </a>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <hr className="border-t border-[#EAE4D9] my-5" />
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
                        <div>
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                            Check-in
                          </div>
                          <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px]">
                            {checkIn
                              ? new Date(checkIn)
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")
                              : "—"}
                          </div>
                          <div className="text-[13px] text-[#7A7068] font-medium">
                            {fmtDate(checkIn, {
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                            {fmtDay(checkIn)}
                          </div>
                        </div>
                        <div className="text-center px-2">
                          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89F94] mb-2">
                            {nights} Night{nights !== 1 ? "s" : ""}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-[6px] h-[6px] rounded-full border border-[#EAE4D9] inline-block" />
                            <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-10" />
                            <MdKingBed size={14} className="text-[#A89F94]" />
                            <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-10" />
                            <span className="w-[6px] h-[6px] rounded-full bg-[#B5862A] inline-block" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                            Check-out
                          </div>
                          <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px]">
                            {checkOut
                              ? new Date(checkOut)
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")
                              : "—"}
                          </div>
                          <div className="text-[13px] text-[#7A7068] font-medium">
                            {fmtDate(checkOut, {
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                            {fmtDay(checkOut)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simplified Payment Summary (Right Side) */}
                {user?.role === "travel-admin" && (
                  <div className="w-full lg:w-[320px] shrink-0 bg-[#FAF8F4] border border-[#EAE4D9] p-8 flex flex-col justify-center items-start h-full min-h-[160px]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#A89F94] mb-3">
                      Total Payment
                    </div>
                    <div className="text-[36px] font-black text-[#1A1714] font-['Cormorant_Garamond'] leading-none mb-3">
                      ₹{totalFare.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[13px] text-[#7A7068] leading-relaxed border-t border-[#EAE4D9] pt-4 mt-auto w-full">
                      Includes all taxes and service fees.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----- ROOM DETAILS TAB ----- */}
          {activeTab === "room" && (
            <div className="flex flex-col gap-6 w-full">
              {detailRooms.map((roomData, index) => {
                const descriptionHtml = roomData.RoomDescription || "";

                // Better extraction of inclusions
                let inclusions = [];
                if (roomData.inclusion) {
                  inclusions = roomData.inclusion.split(",");
                } else if (roomData.Inclusion) {
                  inclusions = roomData.Inclusion.split(",");
                }

                // Amenities directly from roomData
                const roomAmenities = roomData.Amenities || [];

                return (
                  <div
                    key={index}
                    className="border border-[#EAE4D9] bg-white overflow-hidden"
                  >
                    <div className="p-6 border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4] flex-wrap gap-4">
                      <h3 className="font-['Cormorant_Garamond'] text-[24px] font-semibold text-[#1A1714]">
                        {roomData.name ||
                          roomData.Name?.[0] ||
                          roomData.RoomTypeName ||
                          `Room ${index + 1}`}
                      </h3>
                      <div className="flex gap-2">
                        {(roomData.mealType || roomData.MealType) && (
                          <span className="inline-flex items-center gap-[5px] px-[10px] py-1 border border-[#B5862A] text-[10px] font-bold text-[#B5862A] bg-[#FAF8F4] uppercase tracking-wider">
                            {(roomData.mealType || roomData.MealType).replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        )}
                        {(roomData.isRefundable !== undefined ||
                          roomData.IsRefundable !== undefined) && (
                          <span
                            className={`inline-flex items-center gap-[5px] px-[10px] py-1 border text-[10px] font-bold uppercase tracking-wider ${
                              (roomData.isRefundable ?? roomData.IsRefundable)
                                ? "border-[#2C7A4B] text-[#2C7A4B] bg-[#EDF7F2]"
                                : "border-[#B5341A] text-[#B5341A] bg-[#FDF1EE]"
                            }`}
                          >
                            {(roomData.isRefundable ?? roomData.IsRefundable)
                              ? "Refundable"
                              : "Non-Refundable"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-[1px] bg-[#EAE4D9]">
                      {descriptionHtml && (
                        <div className="bg-white p-6">
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                            Description
                          </div>
                          <div
                            className="text-[13px] leading-[1.7] text-[#7A7068]"
                            dangerouslySetInnerHTML={{
                              __html: descriptionHtml.replace(/<p><\/p>/g, ""),
                            }}
                          />
                        </div>
                      )}

                      {inclusions.length > 0 && (
                        <div className="bg-white p-6">
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">
                            Room Inclusions
                          </div>
                          <ul className="list-none p-0 m-0 flex flex-col gap-2">
                            {inclusions.map((inc, i) => (
                              <li
                                key={i}
                                className="flex gap-2 items-center text-[14px] text-[#1A1714]"
                              >
                                <FiCheckCircle
                                  className="text-[#2C7A4B] shrink-0"
                                  size={14}
                                />{" "}
                                {inc.trim()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {roomAmenities.length > 0 && (
                        <div className="bg-white p-6">
                          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-4">
                            All Amenities
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roomAmenities.map((amenity, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-[#B5862A] shrink-0" />
                                <span className="text-[14px] text-[#7A7068] leading-snug">
                                  {amenity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ----- PROJECT & APPROVER DETAILS TAB ----- */}
          {activeTab === "project" && (
            <div className="flex flex-col gap-6 w-full">
              {/* TRIP DETAILS CARD */}
              <div className="bg-white border border-[#EAE4D9] p-8">
                <h2 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#A89F94] mb-8">
                  Trip Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#A89F94] mb-2">
                      Order ID
                    </div>
                    <div className="text-[15px] font-semibold text-[#1A1714]">
                      {bookingRequest?.orderId || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#A89F94] mb-2">
                      Purpose of Travel
                    </div>
                    <div className="text-[15px] font-semibold text-[#1A1714]">
                      {bookingRequest?.purposeOfTravel || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#A89F94] mb-2">
                      Project Code
                    </div>
                    <div className="text-[15px] font-semibold text-[#1A1714]">
                      {bookingRequest?.projectId || "—"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#A89F94] mb-2">
                      Requested On
                    </div>
                    <div className="text-[15px] font-semibold text-[#1A1714]">
                      {bookingRequest?.createdAt
                        ? fmtDate(bookingRequest.createdAt, {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#A89F94] mb-3">
                      Overall Status
                    </div>
                    <div className="inline-block px-3 py-1.5 border border-[#EAE4D9] bg-[#FFFDF5] text-[#B5862A] text-[11px] font-bold tracking-widest uppercase">
                      {bookingRequest?.requestStatus || "PENDING_APPROVAL"}
                    </div>
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Approval Chain */}
              <div className="bg-white border border-[#E1E7EF] p-8">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-6">
                  Approval Chain
                </p>
                <div className="flex flex-col sm:flex-row gap-0">
                  {/* Step 1: Manager */}
                  <div className="flex-1 relative">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          bookingRequest?.approvedBy?.approvedAt
                            ? "bg-[#EDF7F2] border-[#2C7A4B]"
                            : bookingRequest?.requestStatus === "rejected"
                              ? "bg-[#FDF1EE] border-[#B5341A]"
                              : "bg-[#FFFBEB] border-[#C9A240]"
                        }`}
                      >
                        <FiUser
                          size={16}
                          className={
                            bookingRequest?.approvedBy?.approvedAt
                              ? "text-[#2C7A4B]"
                              : bookingRequest?.requestStatus === "rejected"
                                ? "text-[#B5341A]"
                                : "text-[#C9A240]"
                          }
                        />
                      </div>
                      <div className="flex-1 pb-8 sm:pb-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[12px] font-bold text-[#1A1714]">
                            Manager Approval
                          </p>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest border ${
                              bookingRequest?.approvedBy?.approvedAt
                                ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                                : bookingRequest?.requestStatus === "rejected"
                                  ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                                  : "bg-[#FFFBEB] border-[#F0E0A8] text-[#8A6200]"
                            }`}
                          >
                            {bookingRequest?.approvedBy?.approvedAt
                              ? "Approved"
                              : bookingRequest?.requestStatus === "rejected"
                                ? "Rejected"
                                : "Pending"}
                          </span>
                        </div>
                        {bookingRequest?.approverName ||
                        bookingRequest?.approverEmail ||
                        bookingRequest?.approvedBy?.name?.firstName ? (
                          <>
                            <p className="text-[13px] font-semibold text-[#1A1714]">
                              {bookingRequest.approverName ||
                                bookingRequest.approvedBy?.name?.firstName ||
                                "—"}
                            </p>
                            {bookingRequest.approverEmail && (
                              <p className="text-[11px] text-[#65758B] mt-0.5">
                                {bookingRequest.approverEmail}
                              </p>
                            )}
                            <p className="text-[10px] text-[#8B7355] mt-0.5 uppercase tracking-wider">
                              {bookingRequest.approverRole || "EMPLOYEE"}
                            </p>
                          </>
                        ) : (
                          <p className="text-[12px] text-[#65758B] italic">
                            No manager selected
                          </p>
                        )}
                      </div>
                    </div>
                    {/* connector line */}
                    <div className="hidden sm:block absolute top-5 left-[calc(100%-8px)] w-8 border-t-2 border-dashed border-[#E1E7EF]" />
                  </div>

                  {/* Step 2: Travel Admin */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          isApproved
                            ? "bg-[#EDF7F2] border-[#2C7A4B]"
                            : bookingRequest?.requestStatus === "rejected"
                              ? "bg-[#FDF1EE] border-[#B5341A]"
                              : "bg-[#F5F5F5] border-[#E1E7EF]"
                        }`}
                      >
                        <FiCheckCircle
                          size={16}
                          className={
                            isApproved
                              ? "text-[#2C7A4B]"
                              : bookingRequest?.requestStatus === "rejected"
                                ? "text-[#B5341A]"
                                : "text-[#65758B]"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[12px] font-bold text-[#1A1714]">
                            Travel Admin Approval
                          </p>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest border ${
                              isApproved
                                ? "bg-[#EDF7F2] border-[#C3E4D2] text-[#2C7A4B]"
                                : bookingRequest?.requestStatus === "rejected"
                                  ? "bg-[#FDF1EE] border-[#F0C4BA] text-[#B5341A]"
                                  : "bg-[#F5F5F5] border-[#E1E7EF] text-[#65758B]"
                            }`}
                          >
                            {isApproved
                              ? "Approved"
                              : bookingRequest?.requestStatus === "rejected"
                                ? "Rejected"
                                : "Awaiting"}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#65758B] italic">
                          {isApproved ? "Reviewed" : "Not yet reviewed"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----- PASSENGERS DETAILS TAB ----- */}
          {activeTab === "guests" && (
            <div className="bg-white border border-[#EAE4D9] w-full">
              <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
                <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
                  Guests · {travelers.length}
                </span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#EAE4D9]">
                      <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#A89F94] bg-[#FDF8EE]">
                        Name & Details
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#A89F94] bg-[#FDF8EE]">
                        Contact
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#A89F94] bg-[#FDF8EE]">
                        Nationality
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D9]">
                    {travelers.map((t, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-[#FAF8F4] transition-colors"
                      >
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-[14px] font-bold text-[#1A1714]">
                                {t.title} {t.firstName} {t.lastName}
                              </p>
                              <p className="text-[12px] text-[#7A7068] mt-1">
                                {t.type || "Adult"}{" "}
                                {t.isLeadPassenger && (
                                  <span className="text-[#C9A240] ml-1 font-bold">
                                    · Lead
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-2">
                            <p className="text-[13px] text-[#7A7068] flex items-center gap-2">
                              <FiMail size={13} /> {t.email || "—"}
                            </p>
                            <p className="text-[13px] text-[#7A7068] flex items-center gap-2">
                              <FiPhone size={13} />{" "}
                              {t.phoneWithCode ? `+${t.phoneWithCode}` : "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-[13px] font-semibold text-[#1A1714]">
                            {countryName(t.nationality)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ----- POLICY & SUPPORT TAB ----- */}
          {activeTab === "policy" && (
            <div className="space-y-6 w-full">
              {/* Cancel Policies */}
              {cancellationPolicies.length > 0 && (
                <div className="bg-white border border-[#EAE4D9]">
                  <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
                    <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
                      Cancellation Policy
                    </span>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-[10px_20px] text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
                          From Date
                        </th>
                        <th className="text-left p-[10px_20px] text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
                          Charge Type
                        </th>
                        <th className="text-right p-[10px_20px] text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] border-b border-[#EAE4D9]">
                          Charge
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancellationPolicies.map((p, i) => (
                        <tr key={i} className="hover:bg-[#FAF8F4]">
                          <td className="p-[16px_20px] border-b border-[#EAE4D9] text-[14px] text-[#7A7068]">
                            {p.FromDate || "—"}
                          </td>
                          <td className="p-[16px_20px] border-b border-[#EAE4D9]">
                            <span
                              className={`text-[11px] font-semibold tracking-[0.1em] uppercase px-2 py-[2px] ${p.CancellationCharge === 0 ? "bg-[#EDF7F2] text-[#2C7A4B]" : "bg-[#FDF1EE] text-[#B5341A]"}`}
                            >
                              {p.ChargeType === 1 || p.ChargeType === "Fixed"
                                ? "Fixed (INR)"
                                : p.ChargeType === 2 ||
                                    p.ChargeType === "Percentage"
                                  ? "Percentage (%)"
                                  : String(p.ChargeType)}
                            </span>
                          </td>
                          <td className="p-[16px_20px] border-b border-[#EAE4D9] text-right font-semibold text-[15px]">
                            {p.CancellationCharge === 0 ? (
                              <span className="text-[#2C7A4B]">Free</span>
                            ) : (
                              <span className="text-[#1A1714]">
                                {p.ChargeType === 2 ||
                                p.ChargeType === "Percentage"
                                  ? `${p.CancellationCharge}%`
                                  : `₹${p.CancellationCharge}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rate Conditions / House Rules */}
              {rateConditions.length > 0 && (
                <div className="bg-white border border-[#EAE4D9]">
                  <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center bg-[#FAF8F4]">
                    <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
                      Rate Conditions & Rules
                    </span>
                  </div>
                  <div className="p-6 md:p-8">
                    <ul className="list-disc pl-5 space-y-4">
                      {rateConditions.map((cond, i) => {
                        const str =
                          typeof cond === "string"
                            ? decodeHtml(cond)
                            : JSON.stringify(cond);
                        // Clean up basic HTML tags just in case
                        const cleanStr = str.replace(/<[^>]*>?/gm, " ");
                        return (
                          <li
                            key={i}
                            className="text-[14px] text-[#7A7068] leading-relaxed"
                          >
                            {cleanStr.trim()}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {/* ===== CONFIRM BOOKING MODAL ===== */}
      {showConfirmModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0 bg-[#1A1714]/60 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <div
              className="relative bg-white w-full max-w-lg shadow-2xl overflow-hidden"
              style={{ animation: "modalIn 0.18s ease" }}
            >
              <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
              <div className="h-[4px] bg-gradient-to-r from-[#C9A240] to-[#8B7355]" />
              <div className="px-8 pt-7 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#000D26] flex items-center justify-center shrink-0">
                    <FiCheckCircle size={18} className="text-[#C9A240]" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-[#1A1714] font-['DM_Sans'] tracking-tight">
                      Confirm Hotel Booking
                    </h2>
                    <p className="text-[11px] text-[#65758B] mt-0.5">
                      Please review the details before proceeding
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-[#65758B] hover:text-[#1A1714] transition-colors p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="mx-8 mb-5 bg-[#FAF8F4] border border-[#E1E7EF] p-5 flex gap-4">
                <img
                  src={hotel.image}
                  className="w-14 h-14 object-cover"
                  alt="Hotel"
                />
                <div>
                  <p className="text-[13px] font-bold text-[#1A1714]">
                    {hotel.name}
                  </p>
                  <p className="text-[11px] text-[#65758B] mt-1">
                    {hotel.city}
                  </p>
                  <p className="text-[11px] text-[#1A1714] mt-1 font-semibold">
                    {nights} Night(s) · {roomCount} Room(s)
                  </p>
                </div>
              </div>
              <div className="mx-8 mb-6 flex gap-2 items-start">
                <FiInfo size={13} className="text-[#C9A240] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#65758B] leading-relaxed">
                  By confirming, a booking will be created for this hotel. This
                  action{" "}
                  <strong className="text-[#1A1714]">cannot be undone</strong>.
                </p>
              </div>
              <div className="px-8 pb-7 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-[10px] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65758B] bg-white border border-[#E1E7EF] hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookHotel}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-6 py-[10px] bg-[#000D26] text-white text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#04112F] transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle size={13} />
                      Confirm &amp; Book
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* ===== ALERT MODAL ===== */}
      {alertModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0 bg-[#1A1714]/60 backdrop-blur-sm"
              onClick={() => setAlertModal(null)}
            />
            <div
              className="relative bg-white w-full max-w-md shadow-2xl overflow-hidden"
              style={{ animation: "modalIn 0.18s ease" }}
            >
              <div
                className={`h-[4px] ${alertModal.type === "error" ? "bg-[#DC2626]" : alertModal.type === "warning" ? "bg-[#D97706]" : alertModal.type === "success" ? "bg-[#059669]" : "bg-[#2563EB]"}`}
              />
              <div className="p-8">
                <div className="flex items-start gap-4 mb-5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${alertModal.type === "error" ? "bg-[#FEF2F2]" : alertModal.type === "warning" ? "bg-[#FFFBEB]" : alertModal.type === "success" ? "bg-[#ECFDF5]" : "bg-[#EFF6FF]"}`}
                  >
                    {alertModal.type === "error" && (
                      <FiAlertTriangle size={18} className="text-[#DC2626]" />
                    )}
                    {alertModal.type === "warning" && (
                      <FiAlertTriangle size={18} className="text-[#D97706]" />
                    )}
                    {alertModal.type === "success" && (
                      <FiCheckCircle size={18} className="text-[#059669]" />
                    )}
                    {alertModal.type === "info" && (
                      <FiInfo size={18} className="text-[#2563EB]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1A1714] font-['DM_Sans']">
                      {alertModal.title}
                    </h3>
                    <p className="text-[12px] text-[#65758B] mt-1 leading-relaxed">
                      {alertModal.text}
                    </p>
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
                    className={`px-5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors ${alertModal.type === "error" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : alertModal.type === "warning" ? "bg-[#D97706] hover:bg-[#B45309]" : alertModal.type === "success" ? "bg-[#059669] hover:bg-[#047857]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"}`}
                  >
                    {alertModal.confirmText || "OK"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}{" "}
    </>
  );
};

export default HotelBookNow;
