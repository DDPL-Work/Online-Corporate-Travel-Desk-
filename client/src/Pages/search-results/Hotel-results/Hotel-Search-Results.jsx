import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Hotel-Header";
import FilterSidebar from "./Filter-Sidebar";
import HotelCard from "./Hotel-Card";
import { useDispatch, useSelector } from "react-redux";
import { searchHotels } from "../../../Redux/Actions/hotelThunks";
import { receiveChunk, searchCompleted } from "../../../Redux/Slice/hotelSlice";
import { io } from "socket.io-client";
import SearchLoadingModal from "../../../components/common/SearchLoadingModal";
import NoResultsFound from "../../../components/common/NoResultsFound";
import { useLocation, useNavigate } from "react-router-dom";
import LandingHeader from "../../../layout/LandingHeader";

const DEFAULT_FILTERS = {
  minPrice: null,
  maxPrice: null,
  starRating: [],
  mealType: null,
  location: "",
  amenities: [],
  refundable: null,
};

const CustomSortDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative shrink-0 z-[100]" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
      >
        <span className="text-[10px] text-slate-500 font-bold uppercase hidden sm:inline">
          Sort:
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 text-slate-400 sm:hidden"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <span className="text-xs sm:text-sm font-semibold text-[#1E293B]">
          {value === "low" ? "Price: Low to High" : "Price: High to Low"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 text-slate-500 ml-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 z-[200]">
          <button
            onClick={() => {
              onChange("low");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 ${value === "low" ? "bg-slate-50 text-[#C9A84C]" : "text-slate-700"}`}
          >
            Price: Low to High
          </button>
          <button
            onClick={() => {
              onChange("high");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 ${value === "high" ? "bg-slate-50 text-[#C9A84C]" : "text-slate-700"}`}
          >
            Price: High to Low
          </button>
        </div>
      )}
    </div>
  );
};

// Module-level variable to persist across re-mounts (fixes Strict Mode double hits)
let lastGlobalSearchKey = "";

function HotelSearchResults() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    hotels,
    loading,
    traceId,
    pagination,
    searchPayload: reduxSearchPayload,
    filterMeta,
  } = useSelector((state) => state.hotel);

  const initialPayload = useMemo(() => location.state?.searchPayload, [location.state]);
  const searchPayload = reduxSearchPayload || initialPayload;

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("low");
  const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng, name }
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lock body scroll when filter drawer is open
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFilterOpen]);

  const status = useSelector((state) => state.hotel.status);
  const searchId = useSelector((state) => state.hotel.searchId);

  // --- WebSocket Streaming Logic ---
  useEffect(() => {
    // If we have a searchId, we should always try to listen for remaining chunks
    if (!searchId) return;

    console.log(`[WebSocket] Attempting to connect for searchId: ${searchId}`);

    // Dynamically derive the socket origin from the existing VITE_API_BASE_URL
    let API_URL = undefined;
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase && apiBase.startsWith("http")) {
      try {
        API_URL = new URL(apiBase).origin;
      } catch {
        console.warn("Invalid VITE_API_BASE_URL for socket parsing");
      }
    }

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log(`[WebSocket] Connected successfully! ID: ${socket.id}`);
      socket.emit("join_search", searchId);
    });

    socket.on("connect_error", (err) => {
      console.error("[WebSocket] Connection error:", err.message);
    });

    const handleChunk = (data) => {
      console.log(
        `[WebSocket] Received Chunk! ${data.hotels?.length || 0} hotels`,
        data,
      );
      dispatch(receiveChunk(data));
    };

    const handleComplete = (data) => {
      console.log("[WebSocket] Search Completed!");
      dispatch(searchCompleted(data));
    };

    socket.on("chunk_result", handleChunk);
    socket.on("search_complete", handleComplete);

    return () => {
      socket.off("chunk_result", handleChunk);
      socket.off("search_complete", handleComplete);
      socket.disconnect();
      console.log("[WebSocket] Disconnected and cleaned up.");
    };
  }, [dispatch, searchId]); // Removed 'status' dependency so it doesn't prematurely disconnect
  // ---------------------------------



  const baseSearchPayload = useMemo(() => {
    if (!searchPayload) return null;
    return {
      CheckIn: searchPayload.CheckIn,
      CheckOut: searchPayload.CheckOut,
      CityCode: searchPayload.CityCode,
      GuestNationality: searchPayload.GuestNationality || "IN",
      NoOfRooms: searchPayload.NoOfRooms,
      PaxRooms: searchPayload.PaxRooms,
      timestamp: searchPayload.timestamp,
    };
  }, [searchPayload]);

  useEffect(() => {
    if (!baseSearchPayload?.CityCode) return;

    const currentBaseKey = JSON.stringify(baseSearchPayload);

    // If this exact search was already triggered globally, skip it
    if (currentBaseKey === lastGlobalSearchKey) return;

    lastGlobalSearchKey = currentBaseKey;

    dispatch(
      searchHotels({
        payload: {
          ...baseSearchPayload,
          forceRefresh: true,
        },
      }),
    );
  }, [dispatch, baseSearchPayload]); // Only depend on baseSearchPayload, not filters

  const transformedHotels = useMemo(() => {
    if (!hotels) return [];

    let result = hotels.map((hotel) => {
      const rooms = Array.isArray(hotel.Rooms) ? hotel.Rooms : [];
      const cheapestRoom = rooms.length
        ? rooms.reduce((prev, curr) => {
            const prevTotal = (prev.TotalFare || 0) + (prev.TotalTax || 0);
            const currTotal = (curr.TotalFare || 0) + (curr.TotalTax || 0);
            return currTotal < prevTotal ? curr : prev;
          })
        : null;

      const nights = cheapestRoom?.DayRates?.[0]?.length || 1;
      const finalPrice = cheapestRoom?.TotalFare || 0;
      const perNight = cheapestRoom?.DayRates?.[0]?.[0]?.BasePrice || 0;
      const inclusions =
        cheapestRoom?.Inclusion?.split(",")?.map((item) =>
          item.replaceAll("_", " ").trim(),
        ) || [];
      const mapCoords = hotel.Map || "";
      const [lat, lng] = mapCoords.split("|");

      return {
        id: hotel.HotelCode,
        name: hotel.HotelName || "Hotel",
        currency: hotel.Currency,
        price: finalPrice,
        totalTax: cheapestRoom?.TotalTax || 0,
        perNight,
        nights,
        meal: cheapestRoom?.MealType?.replaceAll("_", " "),
        refundable: cheapestRoom?.IsRefundable,
        promotion: cheapestRoom?.RoomPromotion?.[0] || null,
        cancelPolicies: cheapestRoom?.CancelPolicies || [],
        inclusions,
        amenities: hotel.Amenities || inclusions,
        rating: hotel.StarRating || 0,
        address: hotel.Address || "Location not available",
        roomType: cheapestRoom?.Name?.[0] || "Standard",
        roomsLeft: rooms.length || 1,
        traceId,
        images:
          hotel.Images?.length > 0
            ? hotel.Images
            : hotel.Image
              ? [hotel.Image]
              : [
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
                ],
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
      };
    });

    // ─── Local Filtering ───
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q),
      );
    }

    if (filters.location.trim() && !selectedLocation) {
      const loc = filters.location.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.address.toLowerCase().includes(loc) ||
          h.name.toLowerCase().includes(loc),
      );
    }

    // ─── Distance Calculation & Sorting ───
    if (selectedLocation) {
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      result = result.map((h) => {
        if (h.latitude && h.longitude) {
          return {
            ...h,
            distance: calculateDistance(
              selectedLocation.lat,
              selectedLocation.lng,
              h.latitude,
              h.longitude,
            ),
          };
        }
        return { ...h, distance: Infinity };
      });

      // ─── Radius Filtering (e.g., show only within 20km) ───
      // If a specific landmark is selected, we only show hotels in that proximity
      result = result.filter((h) => h.distance <= 25); // 25km limit

      // Sort by distance
      result.sort((a, b) => a.distance - b.distance);
    }

    if (filters.starRating.length > 0) {
      result = result.filter((h) => filters.starRating.includes(h.rating));
    }

    if (filters.mealType) {
      const mt = filters.mealType.toLowerCase();
      result = result.filter((h) => h.meal?.toLowerCase().includes(mt));
    }

    if (filters.refundable !== null) {
      result = result.filter((h) => h.refundable === filters.refundable);
    }

    if (filters.minPrice !== null) {
      result = result.filter((h) => h.price >= filters.minPrice);
    }

    if (filters.maxPrice !== null) {
      result = result.filter((h) => h.price <= filters.maxPrice);
    }

    // ─── Local Sorting ───
    // ─── Local Sorting (only if no distance sorting) ───
    if (!selectedLocation) {
      if (sortOrder === "low") {
        result.sort((a, b) => a.price - b.price);
      } else {
        result.sort((a, b) => b.price - a.price);
      }
    }

    return result;
  }, [hotels, traceId, searchText, filters, sortOrder, selectedLocation]);

  const isInitialLoading = (loading?.search || status === "processing") && (hotels?.length || 0) === 0;


  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <LandingHeader />
      <Header 
        onSearch={() => {
          setFilters({ ...DEFAULT_FILTERS });
          setSelectedLocation(null);
          setSearchText("");
        }} 
      />

      {/* ── Mobile Filter Trigger Bar ── */}
      <div className="lg:hidden sticky top-0 z-[8000] bg-white border-b border-slate-200 shadow-sm">
        {/* Top row: Filters button + count + sort */}
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-transform shrink-0"
            style={{ background: "#C9A84C" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4h18M6 10h12M10 16h4"
              />
            </svg>
            Filters
            {(() => {
              const count =
                (filters.starRating?.length || 0) +
                (filters.mealType ? 1 : 0) +
                (filters.minPrice || filters.maxPrice ? 1 : 0) +
                (filters.amenities?.length || 0) +
                (filters.refundable !== null && filters.refundable !== undefined
                  ? 1
                  : 0) +
                (filters.location ? 1 : 0);
              return count > 0 ? (
                <span className="bg-white text-amber-700 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              ) : null;
            })()}
          </button>

          <span className="text-[11px] text-slate-400 font-medium flex-1 text-center">
            <span className="font-black text-amber-600">
              {transformedHotels?.length ?? 0}
            </span>{" "}
            hotels
          </span>

          <CustomSortDropdown value={sortOrder} onChange={setSortOrder} />
        </div>

        {/* Active filter chips row */}
        {(() => {
          const chips = [];
          if (filters.location)
            chips.push({
              label: `📍 ${filters.location}`,
              clear: () => setFilters((f) => ({ ...f, location: "" })),
            });
          if (filters.minPrice || filters.maxPrice)
            chips.push({
              label: `💰 ₹${filters.minPrice ?? 0}–₹${filters.maxPrice ?? "∞"}`,
              clear: () =>
                setFilters((f) => ({ ...f, minPrice: null, maxPrice: null })),
            });
          if (filters.starRating?.length > 0)
            chips.push({
              label: `⭐ ${filters.starRating.join(", ")} Star`,
              clear: () => setFilters((f) => ({ ...f, starRating: [] })),
            });
          if (filters.mealType)
            chips.push({
              label: `🍽 ${filters.mealType}`,
              clear: () => setFilters((f) => ({ ...f, mealType: null })),
            });
          if (filters.refundable === true)
            chips.push({
              label: "✅ Refundable",
              clear: () => setFilters((f) => ({ ...f, refundable: null })),
            });
          if (filters.amenities?.length > 0)
            chips.push({
              label: `🛎 ${filters.amenities.length} Amenit${filters.amenities.length > 1 ? "ies" : "y"}`,
              clear: () => setFilters((f) => ({ ...f, amenities: [] })),
            });

          if (chips.length === 0)
            return (
              <div
                className="flex gap-2 px-3 pb-2 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 bg-slate-50 whitespace-nowrap active:bg-slate-100"
                >
                  💰 Price
                </button>
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 bg-slate-50 whitespace-nowrap active:bg-slate-100"
                >
                  ⭐ Star Rating
                </button>
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 bg-slate-50 whitespace-nowrap active:bg-slate-100"
                >
                  📍 Location
                </button>
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 bg-slate-50 whitespace-nowrap active:bg-slate-100"
                >
                  🍽 Meals
                </button>
              </div>
            );

          return (
            <div
              className="flex gap-1.5 px-3 pb-2 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border"
                  style={{
                    background: "#C9A84C18",
                    color: "#7a5c1a",
                    borderColor: "#C9A84C50",
                  }}
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.clear}
                    className="ml-0.5 text-[11px] leading-none opacity-60 hover:opacity-100 font-black"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── Mobile Filter Drawer ── */}
      {/* Backdrop */}
      <div
        onClick={() => setMobileFilterOpen(false)}
        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9100] transition-opacity duration-300"
        style={{
          opacity: mobileFilterOpen ? 1 : 0,
          pointerEvents: mobileFilterOpen ? "auto" : "none",
        }}
      />
      {/* Drawer Panel */}
      <div
        className="lg:hidden fixed top-[75px] left-0 z-[9200] bg-white shadow-2xl w-[85vw] max-w-sm h-[calc(100vh-75px)] overflow-y-auto transition-transform duration-300 ease-in-out"
        style={{
          transform: mobileFilterOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <span className="font-black text-sm text-slate-800">Filters</span>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* Sidebar content inside drawer */}
        <div className="p-3">
          <FilterSidebar
            hotels={transformedHotels}
            rawHotels={hotels}
            filterMeta={filterMeta}
            filters={filters}
            setFilters={setFilters}
            searchText={searchText}
            setSearchText={setSearchText}
            mapSearchPayload={searchPayload}
            loading={loading}
            pagination={pagination}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            onClose={() => setMobileFilterOpen(false)}
          />
        </div>
      </div>

      {isInitialLoading && (
        <SearchLoadingModal
          type="hotel"
          origin={searchPayload?.CityName || "Your Destination"}
          date={
            searchPayload?.CheckIn
              ? new Date(searchPayload.CheckIn).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : ""
          }
        />
      )}

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — desktop only */}
          <div className="hidden lg:block w-full lg:w-80">
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
              <FilterSidebar
                hotels={transformedHotels}
                rawHotels={hotels}
                filterMeta={filterMeta}
                filters={filters}
                setFilters={setFilters}
                searchText={searchText}
                setSearchText={setSearchText}
                mapSearchPayload={searchPayload}
                loading={loading}
                pagination={pagination}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h2
                  className="text-sm sm:text-lg lg:text-xl font-semibold"
                  style={{ color: "#1E293B" }}
                >
                  Found{" "}
                  <span className="font-black" style={{ color: "#C9A84C" }}>
                    {transformedHotels?.length ?? 0}
                  </span>{" "}
                  hotels
                </h2>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CustomSortDropdown
                    value={sortOrder}
                    onChange={setSortOrder}
                  />
                </div>
              </div>

              <div className="py-4 space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
                {isInitialLoading ? (
                  <p className="text-center py-10 text-slate-500">
                    Loading hotels...
                  </p>
                ) : transformedHotels?.length === 0 ? (
                  hotels?.length === 0 ? (
                    <NoResultsFound
                      title="No hotels found for your search"
                      message="We couldn't find any hotels for the selected destination and dates. Please try searching with different dates or a different location."
                      onBack={() => {
                        navigate(`/travel`, { state: { activeTab: "hotel" } });
                      }}
                    />
                  ) : (
                    <NoResultsFound
                      title="No hotels match your filters"
                      message="Try adjusting your budget, star rating, or amenities to find more available hotels."
                      onBack={() => {
                        navigate(`/travel`, { state: { activeTab: "hotel" } });
                      }}
                    />
                  )
                ) : (
                  <>
                    {transformedHotels.map((hotel) => (
                      <HotelCard key={hotel.id} hotel={hotel} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelSearchResults;
