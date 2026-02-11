// components/MapModal.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { FiX } from "react-icons/fi";
import L from "leaflet";
import { useRef } from "react";

// Custom marker icon with price
const createPriceIcon = (price, isHovered = false) => {
  return L.divIcon({
    className: "custom-price-marker",
    html: `
      <div style="
        background: white;
        border: 2px solid ${isHovered ? "#2563eb" : "#ddd"};
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        white-space: nowrap;
        color: #111;
        transform: ${isHovered ? "scale(1.1)" : "scale(1)"};
        transition: all 0.2s;
      ">
        ₹ ${price.toLocaleString("en-IN")}
      </div>
    `,
    iconSize: [70, 32],
    iconAnchor: [35, 16],
  });
};

const debounce = (fn, delay = 600) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const MapModal = ({ open, onClose }) => {
  const [hoveredHotel, setHoveredHotel] = useState(null);
  const mapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMarker, setSearchMarker] = useState(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
  }, [open]);

  const searchLocation = async (query) => {
    if (!query.trim() || !mapRef.current) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "hotel-map-search/1.0 (your@email.com)",
          },
        },
      );

      const data = await res.json();
      if (!data.length) return;

      const { lat, lon, display_name } = data[0];
      const position = [parseFloat(lat), parseFloat(lon)];

      mapRef.current.flyTo(position, 13, { duration: 1.2 });

      setSearchMarker({
        position,
        name: display_name,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const debouncedSearch = useRef(debounce(searchLocation, 700)).current;

  if (!open) return null;

  // Hotel data matching the screenshot
  const hotels = [
    {
      id: 1,
      name: "Hotel S B Inn Paharganj",
      address: "897 Chandi Wali Gali Paharganj, New Delhi, 110055",
      price: 1460,
      rating: 3,
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
      position: [28.6439, 77.209],
      nights: 4,
    },
    {
      id: 2,
      name: "Bir Home Stays",
      address: "Opposite Birbal Park, Jangpura, New Delhi, 110014",
      price: 1910,
      rating: 3,
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop",
      position: [28.6304, 77.2477],
      nights: 4,
    },
    {
      id: 3,
      name: "Hotel Delhi Regency",
      address: "8184 Arakashan Road, New Delhi, 110055",
      price: 2237,
      rating: 3,
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop",
      position: [28.6439, 77.219],
      nights: 4,
    },
    {
      id: 4,
      name: "Roomshala 095 Shyam Villa",
      address: "Near Tata Motors Govindpuri metro, New Delhi, 110019",
      price: 2389,
      rating: 3,
      image:
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop",
      position: [28.535, 77.275],
      nights: 4,
    },
  ];

  // Additional price markers on map
  const additionalMarkers = [
    { price: 2685, position: [28.57, 77.2] },
    { price: 3491, position: [28.65, 77.28] },
    { price: 3978, position: [28.67, 77.31] },
    { price: 4016, position: [28.685, 77.32] },
  ];

  const StarRating = ({ rating }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-orange-500" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className="fixed  inset-0 z-9999 bg-black/60 flex items-center justify-center">
      <div className="bg-white w-[95vw] max-w-7xl h-[90vh] rounded-lg flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-800">
            Select locations
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* MAIN CONTENT: Split Left (Hotel Cards) and Right (Map) */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDE - Hotel Cards */}
          <div className=" border-r bg-white overflow-y-auto">
            <div className="p-4 space-y-4">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className={`bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    hoveredHotel === hotel.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200"
                  }`}
                  onMouseEnter={() => setHoveredHotel(hotel.id)}
                  onMouseLeave={() => setHoveredHotel(null)}
                >
                  <div className="flex gap-4 p-4">
                    {/* Hotel Image */}
                    <div className="w-48 h-32 shrink-0">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Hotel Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base mb-1">
                          {hotel.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {hotel.address}
                        </p>
                        <StarRating rating={hotel.rating} />
                      </div>

                      <div className="flex items-end justify-between mt-2">
                        <button className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-300 hover:bg-green-100 transition-colors">
                          PIN ON MAP 📍
                        </button>

                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">
                            Starts From
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            ₹ {hotel.price.toLocaleString("en-IN")}
                          </div>
                          <div className="text-xs text-gray-500">ROOM ONLY</div>
                          <div className="text-xs text-gray-500">
                            {hotel.nights} Night(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE - Map */}
          <div className="flex-1 relative">
            {/* MAP SEARCH OVERLAY */}
            <div className="absolute top-4 left-1/6 -translate-x-1/2 z-1200 w-[200px] h-2 max-w-[50%]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  debouncedSearch(value);
                }}
                placeholder="Search city, area or landmark"
                className="w-full px-4 py-1 rounded-md shadow-lg border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            <MapContainer
              center={[28.6304, 77.2377]}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              whenCreated={(mapInstance) => {
                mapRef.current = mapInstance;
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Hotel Markers */}
              {hotels.map((hotel) => (
                <Marker
                  key={hotel.id}
                  position={hotel.position}
                  icon={createPriceIcon(hotel.price, hoveredHotel === hotel.id)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-gray-800">
                        {hotel.name}
                      </p>
                      <p className="text-green-600 font-semibold">
                        ₹{hotel.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Additional Price Markers */}
              {additionalMarkers.map((marker, index) => (
                <Marker
                  key={`marker-${index}`}
                  position={marker.position}
                  icon={createPriceIcon(marker.price)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-green-600">
                        ₹{marker.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {searchMarker && (
                <Marker position={searchMarker.position}>
                  <Popup>
                    <div className="text-sm font-semibold">
                      {searchMarker.name}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Reset Map Button */}
            <button className="absolute top-4 right-4 z-1000 bg-white px-4 py-1 rounded-md shadow-md hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-300">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              Reset Map
            </button>

            {/* Zoom Controls */}
            <div className="absolute bottom-24 right-4 z-1000 bg-white rounded-md shadow-md overflow-hidden border border-gray-300">
              <button className="w-10 h-10 flex items-center justify-center border-b hover:bg-gray-50 transition-colors">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </button>
              <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
              </button>
            </div>

            {/* Google Logo */}
            <div className="absolute bottom-4 left-4 z-1000">
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAYCAYAAABN6+IKAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGWElEQVRYw+2ZW2wUVRzGv3N2Z3e73W23F7rQFlqgUCgXuQUQCBEjGhMTHzQxJj4YfTDGBx980BgTHzQkJiYmJj6oL8ZEE0VjRDEEghAuoVwKtFBKS2+0pbvdnZ3LzJyZ4/+fmZ3d7bbd7hZ5gF9ycuac+c/M+X7f/3znzCzwBD3B/1NRDwD8A2AGwDiAMQATAEYBDAMYAjAAoB9AH4BeAD0AugF0AugA0A6gDUArgBYAzQCaADQCaABQD6AOQC2AGgDVAKoAVAKoAFAOoAxAKYASAMUAigAUAggAKADgB+AD4AXgAeAG4ALgBOAA4ABgB2ADYAVgAWAGYAJgBGAAoAdgAKADoANwPO7/xQHcBnAdwE0ANwBcA3AVwBUA/QCuALgM4BKAiwAuADgP4ByAswDOADgNoA/AKQAnAZwAcBzAMQBHARwBcBjAIQAHARwAsBfAbgB7AOwCsBPADgDbAWwDsBXAFgCbAWwCsBHABgDrAawDsBbAGgCrAawCsBLACgDLASwDsBTAEgCLASwC0AigAcB8APMAdADoAtANoAdAL4AeAF0AOgF0AOgA0C6q3wZQB+AsgF4AXaL/bgBdALoB9ALoF/e4CqAfwCCAAQCDAK4CGBK/DwEYFv0PA7gMYAjAZQBDAIZF/yEAQwCGAVwCMCzuMQTgIoALAM4DOAfgLIAzAE4DOAXgJICTAE4AOA7gGIBjAI4COALgMICDAO4BeArgJoDrAK4BuArgCoCrAPoBXAJwEcAFAOcBnANwFsBpAKcAnARwAsAxAEcBHAFwGMAhAAcBHACwH8A+AHsB7AGwG8AuADsB7ACwHcA2AFsBbAGwGcAmABsBbACwHsA6AGsBrAGwGsAqACsBrACwHMAyAEsBLAGwGMAiAI0AGgDMBzAPQCeATgAdANoAtAJoAdAMoAlAI4AGAPUAagHUAKgGUAWgEkAFgHIAZQBKAZQAKAZQBCAIIADAD8AHwAfAC8ADwA3ABcAJwAHAAcAOwAbACsACwAzABMAIwABAD0AHQA9AB+B43P+LA7gN4DqAmwBuALgG4CqAKwD6AVwBcBnAJQAXAVwAcB7AOQBnAZwBcBrAKQAnAZwAcBzAMQBHARwBcBjAIQAHARwAsB/APgB7AewBsBvALgA7AewAsB3ANgBbAWwBsBnAJgAbAWwAsB7AOgBrAawBsBrAKgArAawAsALAMgBLASwBsBjAIgCNABoAzAfQAaATQCeAdgBtAFoBtABoBtAEoBFAA4B6ALUAagBUA6gCUAmgAkA5gDIApQBKABQDKAIQBBAA4AfgA+AF4AHgBuAC4ATgAOAA4ABgB2ADYAVgAWAGYAJgBGAAoAegA6ADoANwPO7/xQHcBnAdwE0ANwBcA3AVwBUA/QCuALgM4BKAiwAuADgP4ByAswDOADgN4BSAkwBOADgO4BiAowCOADgM4BCAg"
                alt="Google"
                className="h-6"
              />
            </div>

            {/* Bottom Attribution */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-1000 flex items-center gap-2 text-xs text-gray-600">
              <span className="cursor-pointer hover:underline">
                Keyboard shortcuts
              </span>
              <span>|</span>
              <span>Map data ©2026</span>
              <span>|</span>
              <span className="cursor-pointer hover:underline">Terms</span>
              <span>|</span>
              <span className="cursor-pointer hover:underline">
                Report a map error
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MapModal;
