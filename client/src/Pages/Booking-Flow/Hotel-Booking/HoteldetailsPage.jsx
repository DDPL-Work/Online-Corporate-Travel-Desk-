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
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import Attractions from "./components/Attractions";
import HotelDetailsSkeleton from "./components/HotelDetailsSkeleton";
import { FiPhone, FiMail, FiGlobe } from "react-icons/fi";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ToastWithTimer } from "../../../utils/ToastConfirm";

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
      .flatMap((r) =>
        Array.from({ length: r.count }, () => ({
          ...r.room, // ✅ create new object
        })),
      )
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
            totalFare,
            tax,
            baseFare: totalFare - tax,
            perNight: totalFare / nights,
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
      const current = prev[bookingCode]?.count || 0;

      // total selected count
      const totalSelected = Object.values(prev).reduce(
        (sum, r) => sum + r.count,
        0,
      );

      // ➕ INCREMENT
      if (type === "add") {
        if (totalSelected >= requiredRooms) {
          ToastWithTimer({
            type: "warning",
            message: `You can select only ${requiredRooms} rooms`,
          });
          return prev;
        }

        return {
          ...prev,
          [bookingCode]: {
            room,
            count: current + 1,
          },
        };
      }

      // ➖ DECREMENT
      if (type === "remove") {
        if (current <= 1) {
          const updated = { ...prev };
          delete updated[bookingCode];
          return updated;
        }

        return {
          ...prev,
          [bookingCode]: {
            room,
            count: current - 1,
          },
        };
      }

      return prev;
    });
  };

  const isInitialLoading = loading.details || loading.rooms;
  const hasDynamicData = !!hotelFromDetails && roomsFromRedux.length > 0;

  if (isInitialLoading && !hasDynamicData) {
    return (
      <>
        <EmployeeHeader />
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
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#0A4D68] text-white text-sm rounded-lg hover:bg-[#083d52] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const cheapestRoom = mergedHotel.rooms?.reduce(
    (prev, curr) =>
      (curr.Price?.TotalFare || curr.TotalFare) <
      (prev.Price?.TotalFare || prev.TotalFare)
        ? curr
        : prev,
    mergedHotel.rooms[0],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployeeHeader />

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

          <div className="mb-4 text-sm font-semibold text-[#0A4D68]">
            Select {requiredRooms} Room{requiredRooms > 1 ? "s" : ""}
            <span className="ml-2 text-slate-500 font-normal">
              ({selectedRooms.length} selected)
            </span>
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
            <div className="sticky top-6 space-y-4">
              {/* Quick-info card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1.5 bg-linear-to-r from-[#0A4D68] to-[#088395]" />
                <div className="p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Hotel Summary
                  </h3>

                  {/* Check-in / Check-out */}
                  {/* <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        Check-in
                      </p>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <FiClock size={13} className="text-[#0A4D68]" />
                        {mergedHotel.checkIn}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        Check-out
                      </p>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <FiClock size={13} className="text-[#088395]" />
                        {mergedHotel.checkOut}
                      </div>
                    </div>
                  </div> */}

                  {/* Cheapest room price */}
                  {cheapestRoom && (
                    <div className="bg-[#0A4D68]/5 border border-[#0A4D68]/15 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        Starting from
                      </p>
                      <p className="text-xl font-bold text-[#0A4D68]">
                        ₹
                        {(
                          cheapestRoom.Price?.TotalFare ||
                          cheapestRoom.TotalFare ||
                          0
                        ).toLocaleString("en-IN")}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          ( incl. all taxes )
                        </span>
                      </p>
                    </div>
                  )}

                  {Object.keys(selectedRooms).length > 0 && (
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                      {/* LEFT */}
                      <div>
                        <p className="text-sm font-semibold text-[#0A4D68]">
                          {Object.values(selectedRooms).reduce(
                            (sum, r) => sum + r.count,
                            0,
                          )}{" "}
                          / {requiredRooms} Rooms
                        </p>

                        <p className="text-xs text-gray-500">
                          ₹
                          {Object.values(selectedRooms)
                            .reduce(
                              (sum, r) =>
                                sum +
                                r.count *
                                  (r.room.TotalFare ||
                                    r.room.Price?.TotalFare ||
                                    0),
                              0,
                            )
                            .toLocaleString()}
                        </p>
                      </div>

                      {/* RIGHT */}
                      <button
                        onClick={handleContinue}
                        className="bg-[#0A4D68] text-white px-6 py-2 rounded-lg font-semibold"
                      >
                        Continue
                      </button>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Contact
                    </p>
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
                        value={mergedHotel.contact.email}
                        href={`mailto:${mergedHotel.contact.email}`}
                      />
                    )}
                    {mergedHotel.contact.website && (
                      <ContactRow
                        icon={FiGlobe}
                        value="Visit Website"
                        href={mergedHotel.contact.website}
                        external
                      />
                    )}
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
            </div>
          </div>
        </div>
      </div>
      {/* Map Modal */}
      <MapModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        lat={mergedHotel?.latitude}
        lng={mergedHotel?.longitude}
        name={mergedHotel?.name}
        address={mergedHotel?.address}
      />
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
      className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#0A4D68] transition truncate"
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
            className="text-xs font-semibold text-[#0A4D68] hover:underline"
          >
            Open in OpenStreetMap →
          </a>
        </div>
      </div>
    </div>
  );
}

export default HotelDetailsPage;
