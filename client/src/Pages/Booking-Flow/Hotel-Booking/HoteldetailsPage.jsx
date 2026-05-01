// HotelDetailsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchHotelDetails } from "../../../Redux/Actions/hotelThunks";
import HotelHeader from "./components/HotelHeader";
import HotelImageGallery from "./components/HotelImageGallery";
import HotelInfo from "./components/HotelInfo";
import Amenities from "./components/Amenities";
import RoomTypesList from "./components/RoomTypesList";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import Attractions from "./components/Attractions";
import HotelDetailsSkeleton from "./components/HotelDetailsSkeleton";
import { FiPhone, FiMail, FiGlobe, FiCalendar } from "react-icons/fi";
import { MdCheckCircle } from "react-icons/md";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import { FaPlane } from "react-icons/fa";

const fmtDate = (d, opts = { day: "2-digit", month: "short", year: "numeric" }) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", opts);
};

const HotelDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState({});
  const hotelCode = location.state?.hotelCode;

  const { hotels, hotelDetailsById, searchPayload, loading } = useSelector(
    (state) => state.hotel,
  );
  const { publicBranding } = useSelector((s) => s.landingPage);
  const requiredRooms = searchPayload?.PaxRooms?.length || 1;

  const hotelFromSearch = useMemo(
    () => hotels?.find((h) => h.HotelCode === hotelCode),
    [hotels, hotelCode],
  );

  useEffect(() => {
    if (!hotelCode || !hotelFromSearch) return;
    dispatch(fetchHotelDetails({ hotelCode }));
  }, [hotelCode, hotelFromSearch, dispatch]);

  const hotelFromDetails = hotelDetailsById?.[hotelCode]?.HotelDetails?.[0];
  const roomsFromRedux = hotelDetailsById?.[hotelCode]?.Rooms || [];

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
          childAges: r.ChildAge,
        })),
        city: hotelFromSearch?.CityName,
        guestNationality: searchPayload?.GuestNationality || "",
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

  const cheapestRoom = mergedHotel.rooms?.reduce(
    (prev, curr) => {
      const currTotal = (curr.Price?.TotalFare || curr.TotalFare || 0) + (curr.Price?.Tax || curr.TotalTax || 0);
      const prevTotal = (prev.Price?.TotalFare || prev.TotalFare || 0) + (prev.Price?.Tax || prev.TotalTax || 0);
      return currTotal < prevTotal ? curr : prev;
    },
    mergedHotel.rooms[0],
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <CorporateNavbar />

      {/* ── Hotel Header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Gallery — full width */}
        <div className="mb-6">
          <HotelImageGallery images={mergedHotel.images} />
        </div>

        <div className="mt-10">
          {/* Rooms — full span under left column */}
          <RoomTypesList
            rooms={mergedHotel.rooms}
            onSelectRoom={handleSelectRoom}
            selectedRooms={selectedRooms}
            requiredRooms={requiredRooms}
          />

          <div className="mb-4 text-sm font-semibold text-[#000D26]">
            {Object.keys(selectedRooms).length > 0 ? (
              <span className="flex items-center gap-2">
                <MdCheckCircle className="text-emerald-500" /> All {requiredRooms} rooms selected
              </span>
            ) : (
              <span>Select this room type for all {requiredRooms} rooms</span>
            )}
          </div>
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
              contact={mergedHotel.contact}
              map={mergedHotel.map}
            />

            {/* Amenities */}
            <Amenities amenities={mergedHotel.facilities} />

            {/* Nearby attractions */}
            {mergedHotel.attractions?.length > 0 && (
              <Attractions attractions={mergedHotel.attractions} />
            )}
          </div>

          {/* ── Right: sticky summary sidebar ── */}
          <div className="lg:col-span-1">
               {/* ── Hotel Summary Sidebar ── */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#C9A84C] to-[#C9A84C]" />
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <FiGlobe className="text-[#C9A84C]" />
                      Booking Summary
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                      {mergedHotel.cityName}, {mergedHotel.countryName}
                    </p>
                  </div>

                  {/* Dates Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <FiCalendar size={10} className="text-[#C9A84C]" />
                        Check-in
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {fmtDate(searchPayload?.CheckIn) || "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {mergedHotel.checkIn}
                      </p>
                    </div>
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <FiCalendar size={10} className="text-[#C9A84C]" />
                        Check-out
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {fmtDate(searchPayload?.CheckOut) || "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {mergedHotel.checkOut}
                      </p>
                    </div>
                  </div>

                  {/* Price Section — Dynamic */}
                  {(() => {
                    const isSelected = Object.keys(selectedRooms).length > 0;
                    const selectedRoom = isSelected
                      ? Object.values(selectedRooms)[0]
                      : null;
                    const displayRoom = selectedRoom
                      ? selectedRoom.room
                      : cheapestRoom;
                    const totalPrice = isSelected
                      ? Object.values(selectedRooms).reduce(
                          (sum, r) =>
                            sum +
                              ((r.room.TotalFare || r.room.Price?.TotalFare || 0) + (r.room.TotalTax || r.room.Price?.Tax || 0)),
                          0,
                        )
                      : (cheapestRoom?.Price?.TotalFare ||
                        cheapestRoom?.TotalFare ||
                        0) + (cheapestRoom?.Price?.Tax || cheapestRoom?.TotalTax || 0);

                    return (
                      <div
                        className={`rounded-2xl p-5 border transition-all duration-300 ${isSelected ? "bg-[#C9A84C] border-[#C9A84C] shadow-lg shadow-[#C9A84C]/20" : "bg-slate-50 border-slate-100"}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p
                              className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? "text-white/60" : "text-slate-400"}`}
                            >
                              {isSelected ? "Total Amount" : "Starting from"}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-sm font-bold ${isSelected ? "text-[#0A203E]" : "text-slate-700"}`}
                              >
                                ₹
                              </span>
                              <span
                                className={`text-3xl font-black ${isSelected ? "text-[#0A203E]" : "text-[#000D26]"}`}
                              >
                                {totalPrice.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 text-white">
                              <MdCheckCircle size={20} />
                            </div>
                          )}
                        </div>

                        <div
                          className={`text-[11px] font-medium ${isSelected ? "text-white/80" : "text-slate-500"}`}
                        >
                          {isSelected ? (
                            <div className="space-y-1">
                              <p className="font-bold line-clamp-1">
                                {selectedRoom.room.RoomTypeName || "Selected Room"}
                              </p>
                              <p>Includes {requiredRooms} rooms for full stay</p>
                            </div>
                          ) : (
                            <p>Inclusive of all taxes</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selected Rooms List / Info */}
                  {Object.keys(selectedRooms).length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-400 px-1">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Next Step
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <button
                        onClick={handleContinue}
                        className="w-full bg-[#C9A84C] hover:brightness-110 text-[#0A203E] py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-[#C9A84C]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer border-none"
                      >
                        Proceed to Booking
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
                  )}

                  {/* Contact info simplified */}
                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Support Contact
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {mergedHotel.contact.phone && (
                        <ContactRow
                          icon={FiPhone}
                          value={mergedHotel.contact.phone}
                          href={`tel:${mergedHotel.contact.phone}`}
                        />
                      )}
                      {mergedHotel.contact.email && (
                        <ContactRow
                          icon={FiMail}
                          value="Email Support"
                          href={`mailto:${mergedHotel.contact.email}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer group"
                    onClick={() => setMapModalOpen(true)}
                  >
                    {/* Thumbnail map — non-interactive overlay to capture click */}
                    <div className="relative h-48">
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
                          position={[
                            mergedHotel.latitude,
                            mergedHotel.longitude,
                          ]}
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
                <h4 className="text-white font-black text-lg mb-2">Need a flight to this hotel?</h4>
                <p className="text-white text-xs mb-5 leading-relaxed">
                  Book your flight easily alongside your hotel stay. Enter your dates and we'll find the best fares for you.
                </p>
                <button 
                  onClick={() => navigate('/travel', { state: { activeTab: 'flight' } })}
                  className="w-full flex items-center justify-center gap-2 bg-[#04112F] hover:bg-[#04112F] text-[#C9A84C] px-4 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition shadow-lg shadow-[#C9A84C]/20 active:scale-[0.98] border-none cursor-pointer"
                >
                  Search Flights Now
                </button>
              </div>

        <MapModal
          open={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          lat={mergedHotel?.latitude}
          lng={mergedHotel?.longitude}
          name={mergedHotel?.name}
          address={mergedHotel?.address}
        />
      </div>
    </div>
  </div>
</div>
  );
};

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

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
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
              attribution="&copy; OpenStreetMap contributors"
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
    </div>
  );
}

export default HotelDetailsPage;
