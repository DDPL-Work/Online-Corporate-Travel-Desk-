// HotelDetailsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchHotelDetails } from "../../../Redux/Actions/hotelThunks";
import { preBookHotel } from "../../../Redux/Actions/hotelBooking.thunks";
import HotelHeader from "./components/HotelHeader";
import HotelImageGallery from "./components/HotelImageGallery";
import HotelInfo from "./components/HotelInfo";
import Amenities from "./components/Amenities";
import RoomTypesList from "./components/RoomTypesList";
import Attractions from "./components/Attractions";
import HotelDetailsSkeleton from "./components/HotelDetailsSkeleton";
import {
  FiPhone,
  FiMail,
  FiGlobe,
  FiCalendar,
  FiInfo,
  FiX,
  FiGift,
  FiCoffee,
  FiCheckCircle,
  FiShield,
  FiAlertCircle,
  FiList,
} from "react-icons/fi";
import { MdCheckCircle } from "react-icons/md";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { FaPlane } from "react-icons/fa";
import LandingHeader from "../../../layout/LandingHeader";
import {
  getHotelPreBookErrorMessage,
  handleHotelPreBookSessionExpiry,
  isHotelPreBookSessionExpired,
} from "./hotelPreBookSession";

const fmtDate = (
  d,
  opts = { day: "2-digit", month: "short", year: "numeric" },
) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", opts);
};

const HotelDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState({});
  const [roomDetailsModalOpen, setRoomDetailsModalOpen] = useState(false);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState(null);
  const [preBookData, setPreBookData] = useState(null);
  const [loadingPreBook, setLoadingPreBook] = useState(false);
  const localState = useMemo(() => {
    const localStateStr = localStorage.getItem("hotelDetailsState");
    return localStateStr ? JSON.parse(localStateStr) : {};
  }, []);
  const hotelCode = location.state?.hotelCode || localState?.hotelCode;

  const { hotels, hotelDetailsById, searchPayload: reduxSearchPayload, loading } = useSelector(
    (state) => state.hotel,
  );
  const { publicBranding } = useSelector((s) => s.landingPage);
  
  const searchPayload = reduxSearchPayload || localState?.searchPayload;
  const requiredRooms = searchPayload?.PaxRooms?.length || 1;

  const hotelFromSearch = useMemo(
    () => (hotels?.find((h) => h.HotelCode === hotelCode)) || localState?.hotelFromSearch,
    [hotels, hotelCode, localState?.hotelFromSearch],
  );

  useEffect(() => {
    if (!hotelCode || !hotelFromSearch) return;
    dispatch(fetchHotelDetails({ hotelCode }));
  }, [hotelCode, hotelFromSearch, dispatch]);

  const hotelFromDetails = hotelDetailsById?.[hotelCode]?.HotelDetails?.[0];
  const roomsFromRedux = hotelDetailsById?.[hotelCode]?.Rooms || [];
  const selectedRoomEntries = Object.values(selectedRooms);
  const hasSelectedRooms = selectedRoomEntries.length > 0;

  const extractAttractions = (html) => {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    let attractions = [];
    Array.from(doc.querySelectorAll("p")).forEach((p) => {
      const strong = p.querySelector("strong");
      if (strong?.textContent.toLowerCase().includes("nearby attractions")) {
        const next = p.nextElementSibling;
        if (next?.tagName === "UL")
          attractions = Array.from(next.querySelectorAll("li")).map((li) =>
            li.textContent.trim(),
          );
      }
    });
    return attractions;
  };

  const mergedHotel = useMemo(() => {
    if (!hotelFromSearch) return null;
    const mapCoords = hotelFromDetails?.Map || hotelFromSearch?.Map || "";

    const [lat, lng] = mapCoords.split("|");
    return {
      HotelCode: hotelCode,
      hotelCode,
      // ✅ KEEP ORIGINAL FIELD (IMPORTANT)
      HotelName: hotelFromDetails?.HotelName || hotelFromSearch?.HotelName,

      // ✅ UI FIELD (optional)
      name:
        hotelFromDetails?.HotelName || hotelFromSearch?.HotelName || "Hotel",
      address:
        hotelFromDetails?.Address ||
        hotelFromSearch?.Address ||
        "Address not available",
      pinCode: hotelFromDetails?.PinCode || "",
      cityName: hotelFromDetails?.CityName || hotelFromSearch?.CityName || "",
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      countryName: hotelFromDetails?.CountryName || "",
      map: hotelFromDetails?.Map || "",
      rating: hotelFromDetails?.HotelRating || hotelFromSearch?.StarRating || 0,
      description: hotelFromDetails?.Description || "No description available",
      checkIn: hotelFromDetails?.CheckInTime || "2:00 PM",
      checkOut: hotelFromDetails?.CheckOutTime || "12:00 PM",
      images: hotelFromDetails?.Images?.length
        ? hotelFromDetails.Images
        : hotelFromSearch?.Images || [],
      facilities:
        hotelFromDetails?.HotelFacilities || hotelFromSearch?.Amenities || [],
      hotelFees: hotelDetailsById?.[hotelCode]?.hotelFees || hotelFromDetails?.hotelFees || hotelFromDetails?.HotelFees || { optional: [], mandatory: [] },
      attractions: extractAttractions(hotelFromDetails?.Description || ""),
      contact: {
        phone: hotelFromDetails?.PhoneNumber || "",
        email: hotelFromDetails?.Email || "",
        website: hotelFromDetails?.HotelWebsiteUrl || "",
        fax: hotelFromDetails?.FaxNumber || "",
      },

      rooms: (roomsFromRedux.length > 0
        ? roomsFromRedux
        : hotelFromSearch?.Rooms || []
      ).map((room, index, arr) => {
        const allImages = hotelFromDetails?.Images || [];

        const totalImages = allImages.length;
        const totalRooms = arr.length;

        if (!totalImages) {
          return { ...room, images: [] };
        }

        // 🔥 calculate chunk size
        const chunkSize = Math.ceil(totalImages / totalRooms);

        const start = index * chunkSize;
        const end = start + chunkSize;

        let roomImages = allImages.slice(start, end);

        // ⚠️ fallback: if slice empty (rare edge case)
        if (!roomImages.length) {
          roomImages = allImages.slice(0, chunkSize);
        }

        return {
          ...room,
          images: roomImages,
        };
      }),
    };
  }, [hotelFromSearch, hotelFromDetails, roomsFromRedux]);

  console.log("LAT LNG:", mergedHotel?.latitude, mergedHotel?.longitude);

  const handleContinue = () => {
    const totalSelected = Object.values(selectedRooms).reduce(
      (sum, r) => sum + r.count,
      0,
    );

    if (totalSelected !== requiredRooms) {
      ToastWithTimer({
        type: "warning",
        message: `Please select ${requiredRooms} rooms`,
      });
      return;
    }

    const normalizedRooms = Object.values(selectedRooms)
      .map((r) => ({ ...r.room }))
      .map((room) => {
        const totalFare = room.TotalFare || room.Price?.TotalFare || 0;
        const tax = room.TotalTax || room.Price?.Tax || 0;
        const nights = Array.isArray(room?.DayRates?.[0])
          ? room.DayRates[0].length
          : 1;

        return {
          ...room,
          rawRoomData: room,
          BookingCode:
            room.BookingCode || room.RoomTypeCode || room.RatePlanCode,
          Price: {
            totalFare: totalFare + tax,
            tax,
            baseFare: totalFare,
            perNight: (totalFare + tax) / nights,
            nights,
            currency: room.Currency || "INR",
          },
        };
      });

    const bookingData = {
      hotel: mergedHotel,
      rooms: normalizedRooms,
      searchParams: {
        checkIn: searchPayload?.CheckIn,
        checkOut: searchPayload?.CheckOut,
        rooms: searchPayload?.PaxRooms?.map((r) => ({
          adults: r.Adults,
          children: r.Children,
          childAges: r.ChildrenAges || r.ChildAge || r.childrenAges || [],
        })),
        city: hotelFromSearch?.CityName,
        guestNationality: searchPayload?.GuestNationality || "",
        traceId: localState?.traceId || location.state?.traceId || "",
      },
    };

    sessionStorage.setItem("hotelBookingData", JSON.stringify(bookingData));

    navigate("/hotel-review-booking", {
      state: bookingData,
    });
  };

  const handleSelectRoom = (room, type) => {
    const bookingCode =
      room.BookingCode || room.RoomTypeCode || room.RatePlanCode;

    setSelectedRooms((prev) => {
      // ✅ TBO Style: Selection is exclusive and satisfies ALL required rooms
      if (type === "add") {
        return {
          [bookingCode]: {
            room,
            count: requiredRooms,
          },
        };
      }

      // ✅ Remove selection (toggle off)
      if (type === "remove") {
        return {};
      }

      return prev;
    });
  };

  const handleSeeRoomDetails = async (room) => {
    setSelectedRoomForDetails(room);
    setRoomDetailsModalOpen(true);
    setLoadingPreBook(true);
    setPreBookData(null);

    try {
      const payload = {
        hotelCode: mergedHotel.HotelCode,
        BookingCode: room.BookingCode || room.RoomTypeCode || room.RatePlanCode,
        paxRooms: searchPayload.PaxRooms,
        checkIn: searchPayload.CheckIn,
        checkOut: searchPayload.CheckOut,
      };

      const result = await dispatch(preBookHotel(payload)).unwrap();
      setPreBookData(result);
    } catch (err) {
      console.error("PreBook Error:", err);

      if (isHotelPreBookSessionExpired(err)) {
        setRoomDetailsModalOpen(false);
        handleHotelPreBookSessionExpiry({ navigate });
        return;
      }

      ToastWithTimer({
        type: "error",
        message: getHotelPreBookErrorMessage(
          err,
          "Failed to fetch room details. Please try again.",
        ),
      });
      setRoomDetailsModalOpen(false);
    } finally {
      setLoadingPreBook(false);
    }
  };

  const isInitialLoading = loading.details || loading.rooms;
  const hasDynamicData = !!hotelFromDetails && roomsFromRedux.length > 0;

  if (isInitialLoading && !hasDynamicData) {
    return (
      <>
        {/* <EmployeeHeader /> */}
        <HotelDetailsSkeleton />
      </>
    );
  }

  if (!hotelFromSearch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Hotel not found</p>
          <button
            onClick={() => {
              const slug = publicBranding?.companySlug;
              if (slug) navigate(`/travel`);
              else navigate(-1);
            }}
            className="px-4 py-2 bg-[#000D26] text-white text-sm rounded-lg hover:bg-[#0A203E] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const cheapestRoom = mergedHotel.rooms?.reduce((prev, curr) => {
    const currTotal =
      (curr.Price?.TotalFare || curr.TotalFare || 0) +
      (curr.Price?.Tax || curr.TotalTax || 0);
    const prevTotal =
      (prev.Price?.TotalFare || prev.TotalFare || 0) +
      (prev.Price?.Tax || prev.TotalTax || 0);
    return currTotal < prevTotal ? curr : prev;
  }, mergedHotel.rooms[0]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <LandingHeader />

      {/* ── Hotel Header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="">
          <HotelHeader
            name={mergedHotel.name}
            address={`${mergedHotel.address}${mergedHotel.pinCode ? `, ${mergedHotel.pinCode}` : ""}`}
            cityName={mergedHotel.cityName}
            countryName={mergedHotel.countryName}
            rating={mergedHotel.rating}
            reviewCount={0}
          />
        </div>
      </div>

      {/* ── Main Content ── */}
      <div
        className={`max-w-7xl mx-auto px-4 pt-6 ${hasSelectedRooms ? "pb-40 sm:pb-32" : "pb-6"}`}
      >
        {/* Gallery — full width */}
        <div className="mb-6">
          <HotelImageGallery images={mergedHotel.images} />
        </div>

        <div className="my-10">
          {/* Rooms — full span under left column */}
          <RoomTypesList
            rooms={mergedHotel.rooms}
            onSelectRoom={handleSelectRoom}
            selectedRooms={selectedRooms}
            requiredRooms={requiredRooms}
            onSeeDetails={handleSeeRoomDetails}
          />

          {/* <div className="mb-4 text-sm font-semibold text-[#000D26]">
            {hasSelectedRooms ? (
              <span className="flex items-center gap-2">
                <MdCheckCircle className="text-emerald-500" /> All{" "}
                {requiredRooms} rooms selected
              </span>
            ) : (
              <span>Select this room type for all {requiredRooms} rooms</span>
            )}
          </div> */}
        </div>

        {/* Two-column layout: main (left) + sticky sidebar (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: main detail column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* About / Description */}
            <HotelInfo
              description={mergedHotel.description}
              checkIn={mergedHotel.checkIn}
              checkOut={mergedHotel.checkOut}
              checkInDate={searchPayload?.CheckIn}
              checkOutDate={searchPayload?.CheckOut}
              contact={mergedHotel.contact}
              map={mergedHotel.map}
            />

            {/* Hotel Fees & Taxes */}
            {((mergedHotel.hotelFees?.mandatory?.length > 0) || (mergedHotel.hotelFees?.optional?.length > 0)) && (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] shadow-sm">
                    <FiInfo size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm leading-none">Hotel Fees & Taxes</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Additional charges collected by the property</p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${mergedHotel.hotelFees?.mandatory?.length > 0 && mergedHotel.hotelFees?.optional?.length > 0 ? "md:grid-cols-2" : ""} gap-6`}>
                  {/* Mandatory Fees */}
                  {mergedHotel.hotelFees?.mandatory?.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-600">
                        <FiAlertCircle size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Mandatory Fees</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {mergedHotel.hotelFees.mandatory.map((fee, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 bg-rose-50/30 rounded-xl border border-rose-100/50">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{fee.FeesType}</span>
                              <span className="text-[10px] text-slate-500">{fee.ChargeType}</span>
                            </div>
                            <span className="text-sm font-black text-rose-600">
                              {fee.Currency} {fee.FeesValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Fees */}
                  {mergedHotel.hotelFees?.optional?.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#C9A84C]">
                        <FiInfo size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Optional Fees</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {mergedHotel.hotelFees.optional.map((fee, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{fee.FeesType}</span>
                              <span className="text-[10px] text-slate-500">{fee.ChargeType}</span>
                            </div>
                            <span className="text-sm font-black text-[#C9A84C]">
                              {fee.Currency} {fee.FeesValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            <Amenities amenities={mergedHotel.facilities} />

            {/* Nearby attractions */}
            {mergedHotel.attractions?.length > 0 && (
              <Attractions attractions={mergedHotel.attractions} />
            )}
          </div>

          {/* ── Right: sticky summary sidebar ── */}
          <div className="lg:col-span-1">
            {/* ── Booking Summary Section Removed ── */}

            {/* Map card */}
            {/* {mergedHotel.map && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <iframe
                    title="Hotel Map"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mergedHotel.map)}&output=embed`}
                    className="w-full h-48 border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                  <div className="px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                    <FiGlobe size={11} />
                    {mergedHotel.address}
                  </div>
                </div>
              )} */}

            {/* Map card */}
            {mergedHotel?.latitude != null &&
              mergedHotel?.longitude != null && (
                <div
                  className="z-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden  cursor-pointer group"
                  onClick={() => setMapModalOpen(true)}
                >
                  {/* Thumbnail map — non-interactive overlay to capture click */}
                  <div className="relative z-0 h-48">
                    <MapContainer
                      center={[mergedHotel.latitude, mergedHotel.longitude]}
                      zoom={15}
                      className="w-full h-full"
                      scrollWheelZoom={false}
                      zoomControl={false}
                      dragging={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker
                        position={[mergedHotel.latitude, mergedHotel.longitude]}
                      >
                        <Popup>{mergedHotel.name}</Popup>
                      </Marker>
                    </MapContainer>

                    {/* Click overlay with expand hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                        Click to expand
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                    <FiGlobe size={11} />
                    {mergedHotel.address}
                  </div>
                </div>
              )}

            {/* Flight Search Promo Banner */}
            <div className="bg-[#C9A84C] rounded-2xl p-6 shadow-xl shadow-[#C9A84C]/20 flex flex-col items-center text-center mt-6">
              <div className="w-12 h-12 bg-[#04112F] rounded-full flex items-center justify-center mb-4">
                <FaPlane className="text-[#C9A84C] text-xl" />
              </div>
              <h4 className="text-white font-black text-lg mb-2">
                Need a flight to this hotel?
              </h4>
              <p className="text-white text-xs mb-5 leading-relaxed">
                Book your flight easily alongside your hotel stay. Enter your
                dates and we'll find the best fares for you.
              </p>
              <button
                onClick={() =>
                  navigate("/travel", { state: { activeTab: "flight" } })
                }
                className="w-full flex items-center justify-center gap-2 bg-[#04112F] hover:bg-[#04112F] text-[#C9A84C] px-4 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition shadow-lg shadow-[#C9A84C]/20 active:scale-[0.98] border-none cursor-pointer"
              >
                Search Flights Now
              </button>
            </div>
          </div>

           {/* Sticky Bottom Bar for Selected Room */}
          {hasSelectedRooms &&
            typeof document !== "undefined" &&
            createPortal(
            <div className="fixed left-3 right-3 bottom-3 sm:left-6 sm:right-6 z-[99999] max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-[0_-12px_40px_rgba(15,23,42,0.16)] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-[#0A203E] truncate">
                  {(() => {
                    const r = selectedRoomEntries[0]?.room;
                    if (!r) return "Selected Room";
                    return typeof r.RoomTypeName === "string" &&
                      r.RoomTypeName.trim() !== ""
                      ? r.RoomTypeName
                      : Array.isArray(r.Name) && r.Name.length > 0
                        ? r.Name[0]
                        : typeof r.Name === "string" && r.Name.trim() !== ""
                          ? r.Name
                          : "Selected Room";
                  })()}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {requiredRooms} Room{requiredRooms > 1 ? "s" : ""} Selected
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    Total Price
                  </span>
                  <span className="text-xl font-black text-[#000D26]">
                    ₹
                    {selectedRoomEntries
                      .reduce(
                        (sum, r) =>
                          sum +
                          (r.room.TotalFare || r.room.Price?.TotalFare || 0),
                        0,
                      )
                      .toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={handleContinue}
                  className="shrink-0 bg-[#C9A84C] hover:brightness-110 text-[#0A203E] px-5 sm:px-8 py-3.5 rounded-xl font-black text-[11px] tracking-widest uppercase shadow-xl shadow-[#C9A84C]/30 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <span className="hidden sm:inline">Proceed to Review</span>
                  <span className="sm:hidden">Review</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>,
            document.body,
          )}


          <MapModal
            open={mapModalOpen}
            onClose={() => setMapModalOpen(false)}
            lat={mergedHotel?.latitude}
            lng={mergedHotel?.longitude}
            name={mergedHotel?.name}
            address={mergedHotel?.address}
          />

          <RoomDetailsModal
            open={roomDetailsModalOpen}
            onClose={() => setRoomDetailsModalOpen(false)}
            room={selectedRoomForDetails}
            preBookData={preBookData}
            loading={loadingPreBook}
          />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────── */
/*  Room Details Modal                                             */
/* ─────────────────────────────────────────────────────────────── */
function RoomDetailsModal({ open, onClose, room, preBookData, loading }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const roomInfo = preBookData?.HotelResult?.[0]?.Rooms?.[0] || room;
  const rateConditions = preBookData?.HotelResult?.[0]?.RateConditions || [];
  const promotions = roomInfo?.RoomPromotion || [];
  const supplements = roomInfo?.Supplements || [];
  const cancelPolicies = roomInfo?.CancelPolicies || [];
  const inclusions = (roomInfo?.Inclusion || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-black text-[#0A203E]">Room Details</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {room?.RoomTypeName || room?.Name?.[0] || "Standard Room"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer border-none"
          >
            <FiX size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-[#C9A84C]/20 border-t-[#C9A84C] rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-500 animate-pulse">
                Fetching live room data...
              </p>
            </div>
          ) : (
            <>
              {/* Promotions */}
              {promotions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#C9A84C]">
                    <FiGift size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Special Promotions
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {promotions.map((promo, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-3 py-1.5 rounded-xl"
                      >
                        {promo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FiCheckCircle size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    What's Included
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inclusions.length > 0 ? (
                    inclusions.map((inc, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[12px] text-slate-600 font-medium"
                      >
                        <MdCheckCircle className="text-emerald-500 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No specific inclusions listed.
                    </p>
                  )}
                </div>
              </div>

              {/* Supplements */}
              {supplements.some((s) => s?.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <FiInfo size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Mandatory Supplements & Taxes
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {supplements.map(
                      (roomSup, roomIdx) =>
                        roomSup?.length > 0 && (
                          <div key={roomIdx} className="space-y-2">
                            {supplements.length > 1 && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                Room {roomIdx + 1}
                              </p>
                            )}
                            <div className="grid grid-cols-1 gap-2">
                              {roomSup.map((sup, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 capitalize">
                                      {sup.Description?.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {sup.Type?.replace(
                                        /([A-Z])/g,
                                        " $1",
                                      ).trim()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-[#C9A84C]">
                                    {sup.Price === 0
                                      ? "Included"
                                      : `${sup.Currency} ${sup.Price}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500">
                  <FiShield size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Cancellation Policy
                  </h4>
                </div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <CancelPolicyTable policies={cancelPolicies} />
                </div>
              </div>

              {/* Rate Conditions / Rules */}
              {rateConditions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#0A203E]">
                    <FiList size={16} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Important Rules & Conditions
                    </h4>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    {rateConditions.map((cond, i) => {
                      const cleanCond = cond
                        .replace(/&amp;lt;/g, "<")
                        .replace(/&amp;gt;/g, ">")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/<[^>]+>/g, " ")
                        .trim();
                      if (!cleanCond) return null;
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          <FiAlertCircle
                            size={14}
                            className="text-[#C9A84C] mt-0.5 shrink-0"
                          />
                          <p className="text-[12px] text-slate-600 leading-relaxed">
                            {cleanCond}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#0A203E] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1E293B] transition active:scale-95 cursor-pointer border-none"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CancelPolicyTable({ policies = [] }) {
  if (!policies.length)
    return (
      <div className="p-4 text-center text-xs text-slate-400 italic">
        Policy information unavailable.
      </div>
    );

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="text-left px-4 py-3 font-black text-slate-400 uppercase tracking-tighter">
            From Date
          </th>
          <th className="text-right px-4 py-3 font-black text-slate-400 uppercase tracking-tighter">
            Charge
          </th>
        </tr>
      </thead>
      <tbody>
        {policies.map((p, i) => (
          <tr key={i} className="border-b border-slate-50 last:border-0">
            <td className="px-4 py-3 font-bold text-slate-700">
              {p.FromDate || "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <span
                className={`font-black ${p.CancellationCharge === 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {p.CancellationCharge === 0
                  ? "FREE"
                  : p.ChargeType === "Fixed" || p.ChargeType === 1
                    ? `₹${Number(p.CancellationCharge).toLocaleString()}`
                    : `${p.CancellationCharge}%`}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Sidebar contact row ───────────────────────────────────
function ContactRow({ icon: Icon, value, href, external }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#C9A84C] transition truncate"
    >
      <Icon size={12} className="text-slate-400 shrink-0" />
      <span className="truncate">{value}</span>
    </a>
  );
}

function MapModal({ open, onClose, lat, lng, name, address }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-[95vw] max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">{name}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
              {address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer border-none"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Full map */}
        <div className="h-[70vh]">
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              // attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
              <Popup>{name}</Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <FiGlobe size={11} /> {address}
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#C9A84C] hover:underline"
          >
            Open in OpenStreetMap →
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default HotelDetailsPage;
