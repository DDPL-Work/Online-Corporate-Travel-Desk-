import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Hotel-Header";
import FilterSidebar from "./Filter-Sidebar";
import HotelCard from "./Hotel-Card";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import { useDispatch, useSelector } from "react-redux";
import { searchHotels } from "../../../Redux/Actions/hotelThunks";
import SearchLoadingModal from "../../../components/common/SearchLoadingModal";
import NoResultsFound from "../../../components/common/NoResultsFound";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_FILTERS = {
  minPrice: null,
  maxPrice: null,
  starRating: [],
  mealType: null,
  location: "",
  amenities: [],
  refundable: null,
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

  const initialPayloadRef = useRef(location.state?.searchPayload);
  const searchPayload = reduxSearchPayload || initialPayloadRef.current;

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("low");

  const availablePriceRange = filterMeta?.priceRange || { min: 0, max: 0 };

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
      const noOfRooms = searchPayload?.NoOfRooms || 1;
      const finalPrice = (cheapestRoom?.TotalFare || 0) + (cheapestRoom?.TotalTax || 0);
      const perNight =
        nights > 0 ? (finalPrice / noOfRooms) / nights : (finalPrice / noOfRooms);
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
      result = result.filter((h) => h.name.toLowerCase().includes(q));
    }

    if (filters.location.trim()) {
      const loc = filters.location.toLowerCase().trim();
      result = result.filter((h) => h.address.toLowerCase().includes(loc));
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
    if (sortOrder === "low") {
      result.sort((a, b) => a.price - b.price);
    } else {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [hotels, traceId, searchText, filters, sortOrder]);

  const isInitialLoading = loading?.search && (hotels?.length || 0) === 0;
  const isLoadingMore = loading?.loadMore;

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <CorporateNavbar />
      <Header />

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
          <div className="w-full lg:w-80">
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
              <FilterSidebar
                hotels={transformedHotels}
                filterMeta={filterMeta}
                filters={filters}
                setFilters={setFilters}
                searchText={searchText}
                setSearchText={setSearchText}
                mapSearchPayload={baseSearchPayload}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col">
              <div className="border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
                <h2
                  className="text-lg sm:text-xl font-semibold"
                  style={{ color: "#1E293B" }}
                >
                  Found {transformedHotels?.length ?? 0} hotels
                </h2>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Sort by:</span>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={{ outlineColor: "#C9A84C" }}
                  >
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              <div className="py-4 space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
                {isInitialLoading ? (
                  <p className="text-center py-10 text-slate-500">
                    Loading hotels...
                  </p>
                ) : transformedHotels?.length === 0 ? (
                  <NoResultsFound
                    title="No hotels match your filters"
                    message="Try adjusting your budget, star rating, or amenities to find more available hotels."
                    onBack={() => {
                      navigate(`/travel`, { state: { activeTab: "hotel" } });
                    }}
                  />
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
