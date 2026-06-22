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
import HotelDetailsModal from "./components/HotelDetailsModal";
import RoomDetailsModal from "./components/RoomDetailsModal";
import MapModal from "./components/MapModal";
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
import { MdCheckCircle, MdInfo } from "react-icons/md";
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
  const [hotelDetailsModalOpen, setHotelDetailsModalOpen] = useState(false);
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
    () => hotels?.find((h) => h.HotelCode === hotelCode || h.hotelCode === hotelCode) || localState?.hotelFromSearch,
    [hotels, hotelCode, localState?.hotelFromSearch],
  );

  useEffect(() => {
    if (!hotelCode || !hotelFromSearch) return;
    dispatch(fetchHotelDetails({ hotelCode }));
  }, [hotelCode, hotelFromSearch, dispatch]);

  // Accommodate both old TBO format (HotelDetails array) and new flat DB format
  const hotelFromDetails = hotelDetailsById?.[hotelCode]?.HotelDetails?.[0] || hotelDetailsById?.[hotelCode];
  const roomsFromRedux = hotelDetailsById?.[hotelCode]?.Rooms || [];
  const selectedRoomEntries = Object.values(selectedRooms);
  const hasSelectedRooms = selectedRoomEntries.length > 0;

  const extractAttractions = (data) => {
    if (!data) return [];

    // Check if it's a JSON string like "{\"1) \":\"Shillong (SHL)\", ...}"
    if (typeof data === "string" && data.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(data);
        return Object.values(parsed);
      } catch (e) {
        console.error("Failed to parse attractions JSON", e);
      }
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");
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
      description: hotelFromDetails?.description || hotelFromDetails?.Description || "No description available",
      checkIn: hotelFromDetails?.checkInTime || hotelFromDetails?.CheckInTime || "2:00 PM",
      checkOut: hotelFromDetails?.checkOutTime || hotelFromDetails?.CheckOutTime || "12:00 PM",
      images: hotelFromDetails?.Images?.length
        ? hotelFromDetails.Images
        : hotelFromDetails?.images?.length
          ? hotelFromDetails.images
          : hotelFromSearch?.Images || [],
      facilities:
        hotelFromDetails?.hotelFacilities || hotelFromDetails?.HotelFacilities || hotelFromSearch?.Amenities || [],
      hotelFees: hotelDetailsById?.[hotelCode]?.hotelFees || hotelFromDetails?.hotelFees || hotelFromDetails?.HotelFees || { optional: [], mandatory: [] },
      attractions: hotelFromDetails?.attractions || hotelFromDetails?.Attractions 
        ? extractAttractions(hotelFromDetails.attractions || hotelFromDetails.Attractions) 
        : extractAttractions(hotelFromDetails?.Description || hotelFromDetails?.description || ""),
      contact: {
        phone: hotelFromDetails?.phoneNumber || hotelFromDetails?.PhoneNumber || "",
        email: hotelFromDetails?.email || hotelFromDetails?.Email || "",
        website: hotelFromDetails?.hotelWebsiteUrl || hotelFromDetails?.HotelWebsiteUrl || "",
        fax: hotelFromDetails?.faxNumber || hotelFromDetails?.FaxNumber || "",
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
        snapshotId: localState?.snapshotId || location.state?.snapshotId || "",
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
            checkInDate={searchPayload?.CheckIn}
            checkOutDate={searchPayload?.CheckOut}
            checkInTime={mergedHotel.checkIn}
            checkOutTime={mergedHotel.checkOut}
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
        </div>

        {/* ── Bento Grid: Summary, Map, CTA ── */}
        <div className="flex flex-col gap-6 mb-10">
          {/* Row 1: Button Card (Full Width) */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 w-full">
             <div>
                <h2 className="font-black text-[#0A203E] text-2xl">Hotel Details & Information</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
                  View complete hotel description, comprehensive list of amenities, contact information, check-in/out times, and nearby attractions.
                </p>
             </div>
             <button 
                onClick={() => setHotelDetailsModalOpen(true)}
                className="shrink-0 bg-[#C9A84C] text-[#0A203E] px-6 py-3.5 rounded-xl text-sm font-black tracking-widest uppercase shadow-lg shadow-[#C9A84C]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border-none cursor-pointer"
             >
                <MdInfo size={18} />
                View All Details
             </button>
          </div>

          {/* Row 2: Map Card (2/3) + Flight Promo (1/3) OR Hotel Fee (1/3) + Map (1/3) + Flight Promo (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mergedHotel?.hotelFees?.optional?.length > 0 || mergedHotel?.hotelFees?.mandatory?.length > 0 ? (
              <div className="lg:col-span-1 h-full">
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col h-full min-h-[250px] max-h-[400px]">
                  <h4 className="font-black text-[#0A203E] text-lg mb-4 flex items-center gap-2">
                    <FiAlertCircle className="text-[#C9A84C]" size={20} />
                    Hotel Fees
                  </h4>
                  <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin" }}>
                    {mergedHotel.hotelFees.mandatory?.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mandatory Fees</h5>
                        <ul className="space-y-3">
                          {mergedHotel.hotelFees.mandatory.map((fee, idx) => (
                            <li key={idx} className="flex justify-between items-start gap-2">
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-slate-700 truncate">{fee.FeesType}</span>
                                <span className="text-[10px] text-slate-500 capitalize line-clamp-1 leading-tight">{fee.ChargeType}</span>
                              </div>
                              <span className="text-sm font-black text-[#0A203E] shrink-0">
                                {fee.Currency} {fee.FeesValue}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {mergedHotel.hotelFees.optional?.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Optional Fees</h5>
                        <ul className="space-y-3">
                          {mergedHotel.hotelFees.optional.map((fee, idx) => (
                            <li key={idx} className="flex justify-between items-start gap-2">
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-slate-700 truncate">{fee.FeesType}</span>
                                <span className="text-[10px] text-slate-500 capitalize line-clamp-1 leading-tight">{fee.ChargeType}</span>
                              </div>
                              <span className="text-sm font-black text-[#0A203E] shrink-0">
                                {fee.Currency} {fee.FeesValue}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={(mergedHotel?.hotelFees?.optional?.length > 0 || mergedHotel?.hotelFees?.mandatory?.length > 0) ? "lg:col-span-1 flex flex-col h-full" : "lg:col-span-2 flex flex-col h-full"}>
              {mergedHotel?.latitude != null && mergedHotel?.longitude != null ? (
                <div
                  className="z-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer group flex-1 flex flex-col"
                  onClick={() => setMapModalOpen(true)}
                >
                  <div className="relative z-0 flex-1 min-h-[200px]">
                    <MapContainer
                      center={[mergedHotel.latitude, mergedHotel.longitude]}
                      zoom={15}
                      className="w-full h-full absolute inset-0"
                      scrollWheelZoom={false}
                      zoomControl={false}
                      dragging={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[mergedHotel.latitude, mergedHotel.longitude]}>
                        <Popup>{mergedHotel.name}</Popup>
                      </Marker>
                    </MapContainer>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                        Click to expand
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
                    <FiGlobe size={14} className="text-slate-400" />
                    {mergedHotel.address}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 rounded-2xl flex-1 flex items-center justify-center text-slate-400 font-medium text-sm">
                  Map data unavailable
                </div>
              )}
            </div>

            <div className="lg:col-span-1 h-full">
              <div className="bg-[#C9A84C] rounded-2xl p-6 md:p-8 shadow-xl shadow-[#C9A84C]/20 flex flex-col items-center text-center justify-center h-full">
                <div className="w-14 h-14 bg-[#04112F] rounded-full flex items-center justify-center mb-5 shadow-lg">
                  <FaPlane className="text-[#C9A84C] text-xl" />
                </div>
                <h4 className="text-white font-black text-xl mb-3 leading-tight">
                  Need a flight to this hotel?
                </h4>
                <p className="text-white/90 text-sm mb-6 leading-relaxed max-w-[250px]">
                  Book your flight easily alongside your hotel stay. Enter your
                  dates and we'll find the best fares for you.
                </p>
                <button
                  onClick={() => navigate("/travel", { state: { activeTab: "flight" } })}
                  className="w-full py-4 bg-[#04112F] text-white rounded-xl text-xs font-black tracking-widest uppercase hover:bg-[#0A203E] active:scale-95 transition-all shadow-md mt-auto"
                >
                  Search Flights Now
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Two-column layout: main (left) + sticky sidebar (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <HotelDetailsModal
            open={hotelDetailsModalOpen}
            onClose={() => setHotelDetailsModalOpen(false)}
            hotel={mergedHotel}
            searchPayload={searchPayload}
          />
        </div>
      </div>
    </div>
  );
};



export default HotelDetailsPage;
