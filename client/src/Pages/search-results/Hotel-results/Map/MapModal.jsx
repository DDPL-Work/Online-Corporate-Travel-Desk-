// client\src\Pages\search-results\Hotel-results\Map\MapModal.jsx

// components/MapModal.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { FiX, FiSearch, FiMapPin } from "react-icons/fi";
import { BsStarFill, BsStar } from "react-icons/bs";
import {
  MdLocationOn,
  MdRefresh,
  MdAdd,
  MdRemove,
  MdBreakfastDining,
} from "react-icons/md";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import api from "../../../../API/axios";

/* ── Price Marker Icon ── */
const createPriceIcon = (price, isActive = false) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        background: ${isActive ? "#0d7fe8" : "#0a2540"};
        color: white;
        border-radius: 20px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 800;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        white-space: nowrap;
        letter-spacing: -0.3px;
        transform: ${isActive ? "scale(1.15)" : "scale(1)"};
        transition: all 0.15s ease;
        border: 2px solid ${isActive ? "#60b0ff" : "transparent"};
        position: relative;
      ">
        ₹${(price / 1000).toFixed(1)}k
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${isActive ? "#0d7fe8" : "#0a2540"};
        "></div>
      </div>
    `,
    iconSize: [70, 34],
    iconAnchor: [35, 34],
  });

/* ── Star Row ── */
const Stars = ({ rating }) =>
  Array.from({ length: 5 }, (_, i) =>
    i < rating ? (
      <BsStarFill key={i} className="text-amber-400 text-[10px]" />
    ) : (
      <BsStar key={i} className="text-gray-300 text-[10px]" />
    ),
  );

/* Map data helpers */
const MAP_PAGE_SIZE = 50;
const DEFAULT_MAP_PAGINATION = {
  total: 0,
  page: 1,
  limit: MAP_PAGE_SIZE,
  hasMore: false,
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCheapestRoom = (hotel = {}) => {
  const rooms = Array.isArray(hotel.Rooms) ? hotel.Rooms.filter(Boolean) : [];
  if (!rooms.length) return null;

  return rooms.reduce((bestRoom, currentRoom) => {
    const currentPrice = toNumber(currentRoom?.TotalFare, Number.MAX_SAFE_INTEGER) + toNumber(currentRoom?.TotalTax, 0);
    const bestPrice = toNumber(bestRoom?.TotalFare, Number.MAX_SAFE_INTEGER) + toNumber(bestRoom?.TotalTax, 0);
    return currentPrice < bestPrice ? currentRoom : bestRoom;
  });
};

const normalizeHotelForMap = (hotel = {}) => {
  const mapCoords = String(hotel.Map || hotel.map || "");
  const [rawLat, rawLng] = mapCoords.split("|");
  const latitude = toNumber(hotel.latitude ?? rawLat, null);
  const longitude = toNumber(hotel.longitude ?? rawLng, null);

  if (latitude === null || longitude === null) return null;

  const cheapestRoom = getCheapestRoom(hotel);
  const id = hotel.id || hotel.HotelCode || hotel.hotelCode;

  if (!id) return null;

  const cityName = hotel.cityName || hotel.CityName || "";
  const countryName = hotel.countryName || hotel.CountryName || "";
  const address =
    hotel.address ||
    hotel.Address ||
    [cityName, countryName].filter(Boolean).join(", ") ||
    "Location not available";
  const existingImages = Array.isArray(hotel.images) ? hotel.images : [];
  const rawImages = Array.isArray(hotel.Images) ? hotel.Images : [];
  const images =
    existingImages.length > 0
      ? existingImages
      : rawImages.length > 0
        ? rawImages
        : hotel.Image
          ? [hotel.Image]
          : [
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            ];

  return {
    id,
    name: hotel.name || hotel.HotelName || "Hotel",
    address,
    price: toNumber(hotel.price ?? (toNumber(cheapestRoom?.TotalFare, 0) + toNumber(cheapestRoom?.TotalTax, 0)), 0),
    rating: toNumber(hotel.rating ?? hotel.StarRating, 0),
    nights: hotel.nights || cheapestRoom?.DayRates?.[0]?.length || 1,
    images,
    refundable:
      typeof hotel.refundable === "boolean"
        ? hotel.refundable
        : Boolean(cheapestRoom?.IsRefundable),
    meal: hotel.meal || cheapestRoom?.MealType?.replaceAll("_", " ") || "",
    position: [latitude, longitude],
    lookupText:
      `${hotel.name || hotel.HotelName || ""} ${address} ${cityName} ${countryName}`.toLowerCase(),
  };
};

const dedupeMapHotels = (existing = [], incoming = []) => {
  const seen = new Set();
  const result = [];

  [...existing, ...incoming].forEach((hotel) => {
    const key = String(hotel?.id || "").trim();
    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(hotel);
  });

  return result;
};

/* ── Hotel Card (left panel) ── */
const HotelListCard = ({ hotel, isActive, onEnter, onLeave, onClick }) => (
  <div
    onClick={onClick}
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
    className={`group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
      isActive
        ? "border-[#0d7fe8] shadow-[0_4px_20px_rgba(13,127,232,0.18)]"
        : "border-slate-200 hover:border-[#0d7fe8] hover:shadow-md"
    }`}
  >
    {/* Active indicator bar */}
    {isActive && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0d7fe8] rounded-l-xl" />
    )}

    <div className="flex gap-0 p-0">
      {/* Image */}
      <div className="relative w-36 h-28 shrink-0">
        <img
          src={hotel.images?.[0]}
          alt={hotel.name}
          className="w-full h-full object-cover"
          style={{ borderRadius: "12px 0 0 12px" }}
        />
        {hotel.refundable && (
          <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            FREE CANCEL
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="text-sm font-black text-[#0a2540] leading-tight truncate mb-0.5">
            {hotel.name}
          </h4>
          <div className="flex items-center gap-1 mb-1">
            <Stars rating={hotel.rating} />
          </div>
          <div className="flex items-start gap-0.5 text-[10px] text-slate-500">
            <MdLocationOn className="text-[#0d7fe8] shrink-0 mt-0.5 text-xs" />
            <span className="line-clamp-1">{hotel.address}</span>
          </div>
          {hotel.meal && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit">
              <MdBreakfastDining className="text-xs" />
              {hotel.meal}
            </div>
          )}
        </div>

        <div className="flex items-end justify-end mt-1">
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">
              Starts from
            </div>
            <div className="text-base font-black text-[#0a2540] leading-none">
              ₹{hotel.price?.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] text-slate-400">
              {hotel.nights || 1} Night(s)
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main Modal ── */
const MapModal = ({
  open,
  onClose,
  hotels = [],
  mapLoading = false,
  mapError = null,
  mapPagination = null,
  handleLoadMore = () => {},
}) => {
  const navigate = useNavigate();
  const [hoveredHotel, setHoveredHotel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMarker, setSearchMarker] = useState(null);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef(null);
  const listRef = useRef(null);

  const sourceHotels = useMemo(
    () => hotels.map(normalizeHotelForMap).filter(Boolean),
    [hotels],
  );

  const transformedHotels = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sourceHotels;

    return sourceHotels.filter((hotel) =>
      (hotel.lookupText || `${hotel.name} ${hotel.address}`)
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [sourceHotels, searchQuery]);

  const totalHotels = sourceHotels.length;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const searchLocation = useCallback(async (query) => {
    if (!query.trim() || !mapRef.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "hotel-map/1.0",
          },
        },
      );
      const data = await res.json();
      if (!data.length) return;
      const { lat, lon, display_name } = data[0];
      const position = [parseFloat(lat), parseFloat(lon)];
      mapRef.current.flyTo(position, 13, { duration: 1.2 });
      setSearchMarker({ position, name: display_name });
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setHoveredHotel(null);
      setSearchMarker(null);
      setSearchQuery("");
      return;
    }

    const query = searchQuery.trim();
    const timer = setTimeout(
      () => {
        if (query) {
          searchLocation(query);
        } else {
          setSearchMarker(null);
        }
      },
      query ? 500 : 0,
    );

    return () => clearTimeout(timer);
  }, [open, searchQuery, searchLocation]);

  const firstHotelPosition = transformedHotels[0]?.position;

  useEffect(() => {
    if (!open || !mapRef.current || !firstHotelPosition || searchMarker) return;

    mapRef.current.flyTo(firstHotelPosition, 12, { duration: 0.8 });
  }, [open, firstHotelPosition, searchMarker]);

  const resetMap = () => {
    if (!mapRef.current) return;
    const center = transformedHotels.length
      ? transformedHotels[0].position
      : [20.5937, 78.9629];
    mapRef.current.flyTo(center, 12, { duration: 1 });
    setSearchMarker(null);
    setSearchQuery("");
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(10,37,64,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-7xl flex flex-col overflow-hidden"
        style={{
          height: "92vh",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(10,37,64,0.35)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0a2540] flex items-center justify-center">
              <FiMapPin className="text-white text-base" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0a2540] leading-none">
                Hotel Locations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalHotels || 0} properties on map
              </p>
            </div>
          </div>

          {/* Search bar in header */}
          <div className="flex-1 max-w-sm mx-8 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            {(searching || mapLoading) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#0d7fe8] border-t-transparent rounded-full animate-spin" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hotel name, city, area or landmark..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <FiX className="text-slate-600 text-base" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Hotel List ── */}
          <div
            ref={listRef}
            className="w-[360px] shrink-0 bg-[#f4f8fd] border-r border-slate-200 overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            {/* List header */}
            <div className="sticky top-0 bg-[#f4f8fd] border-b border-slate-200 px-4 py-3 z-10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                {totalHotels || 0} Hotels Found
              </span>
              <span className="text-[10px] text-slate-400">
                Hover to highlight
              </span>
            </div>

            <div className="p-3 flex flex-col gap-2.5">
              {mapError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {mapError}
                </p>
              )}

              {mapLoading && transformedHotels.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Loading map hotels...
                </p>
              ) : transformedHotels.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No hotels found on map
                </p>
              ) : (
                transformedHotels.map((hotel) => (
                  <div key={hotel.id} id={`hotel-${hotel.id}`}>
                    <HotelListCard
                      hotel={hotel}
                      onClick={() => {
                        navigate("/one-hotel-details", {
                          state: {
                            hotelCode: hotel.id,
                          },
                        });
                      }}
                      isActive={hoveredHotel === hotel.id}
                      onEnter={() => setHoveredHotel(hotel.id)}
                      onLeave={() => setHoveredHotel(null)}
                    />
                  </div>
                ))
              )}

              {mapPagination?.hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={mapLoading}
                  className="mt-2 w-full bg-[#0d7fe8] text-white text-sm font-semibold py-2.5 rounded-lg shadow hover:bg-[#0a66c2] transition disabled:opacity-60"
                >
                  {mapLoading ? "Loading..." : "Load More Hotels"}
                </button>
              )}
            </div>
          </div>

          {/* ── Right: Map ── */}
          <div className="flex-1 relative">
            <MapContainer
              center={
                transformedHotels.length
                  ? transformedHotels[0].position
                  : [20.5937, 78.9629]
              }
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              whenCreated={(map) => {
                mapRef.current = map;
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {transformedHotels.map((hotel) => (
                <Marker
                  key={hotel.id}
                  position={hotel.position}
                  icon={createPriceIcon(hotel.price, hoveredHotel === hotel.id)}
                  eventHandlers={{
                    mouseover: () => setHoveredHotel(hotel.id),
                    mouseout: () => setHoveredHotel(null),

                    click: () => {
                      setHoveredHotel(hotel.id);

                      // scroll to card
                      const el = document.getElementById(`hotel-${hotel.id}`);
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    },
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-40">
                      <p className="font-black text-[#0a2540] mb-0.5">
                        {hotel.name}
                      </p>
                      <div className="flex gap-0.5 mb-1">
                        <Stars rating={hotel.rating} />
                      </div>
                      <p className="text-[11px] text-slate-500 mb-1">
                        {hotel.address}
                      </p>
                      <p className="text-[#0d7fe8] font-black text-base">
                        ₹{hotel.price?.toLocaleString("en-IN")}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">
                          / night
                        </span>
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {searchMarker && (
                <Marker position={searchMarker.position}>
                  <Popup>
                    <p className="text-sm font-semibold text-[#0a2540]">
                      {searchMarker.name}
                    </p>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* ── Map Controls (top-right) ── */}
            <div className="absolute top-4 right-4 z-1000 flex flex-col gap-2">
              {/* Reset */}
              <button
                onClick={resetMap}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-[#0a2540] text-xs font-bold px-3 py-2 rounded-xl shadow-md hover:bg-slate-50 transition"
              >
                <MdRefresh className="text-sm text-[#0d7fe8]" />
                Reset
              </button>

              {/* Zoom in/out */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 transition border-b border-slate-200"
                >
                  <MdAdd className="text-[#0a2540] text-lg" />
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 transition"
                >
                  <MdRemove className="text-[#0a2540] text-lg" />
                </button>
              </div>
            </div>

            {/* ── Hotels count pill (bottom center) ── */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000">
              <div className="bg-[#0a2540] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0d7fe8] inline-block animate-pulse" />
                {transformedHotels.length} hotels shown on map
              </div>
            </div>

            {/* ── Hovered hotel tooltip ── */}
            {hoveredHotel &&
              (() => {
                const h = transformedHotels.find((x) => x.id === hoveredHotel);
                if (!h) return null;
                return (
                  <div className="absolute bottom-16 left-4 z-1000 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 flex items-center gap-3 max-w-xs">
                    <img
                      src={h.images?.[0]}
                      alt={h.name}
                      className="w-16 h-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0a2540] truncate">
                        {h.name}
                      </p>
                      <div className="flex gap-0.5 my-0.5">
                        <Stars rating={h.rating} />
                      </div>
                      <p className="text-[#0d7fe8] font-black text-sm">
                        ₹{h.price?.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MapModal;
