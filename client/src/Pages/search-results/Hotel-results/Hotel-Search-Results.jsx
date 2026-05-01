import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Hotel-Header";
import FilterSidebar from "./Filter-Sidebar";
import HotelCard from "./Hotel-Card";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import { useDispatch, useSelector } from "react-redux";
import { searchHotels } from "../../../Redux/Actions/hotelThunks";

const DEFAULT_FILTERS = {
  minPrice: null,
  maxPrice: null,
  starRating: [],
  mealType: null,
  location: "",
  amenities: [],
  refundable: null,
};

function HotelSearchResults() {
  const dispatch = useDispatch();
  const {
    hotels,
    loading,
    traceId,
    pagination,
    searchPayload,
    filterMeta,
  } = useSelector((state) => state.hotel);

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("low");

  const availablePriceRange = filterMeta?.priceRange || { min: 0, max: 0 };
  const pageSize = pagination?.limit || 10;

  const baseSearchPayload = useMemo(() => {
    if (!searchPayload) return null;
    const { SearchFilters: _ignored, ...rest } = searchPayload;
    return rest;
  }, [searchPayload]);

  const backendSearchFilters = useMemo(() => {
    const payload = {
      sortBy: sortOrder === "high" ? "priceDesc" : "priceAsc",
    };

    if (searchText.trim()) {
      payload.hotelName = searchText.trim();
    }

    if (filters.location.trim()) {
      payload.location = filters.location.trim();
    }

    if (Array.isArray(filters.starRating) && filters.starRating.length > 0) {
      payload.starRating = filters.starRating;
    }

    if (filters.mealType) {
      payload.mealType = filters.mealType;
    }

    if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
      payload.amenities = filters.amenities;
    }

    if (filters.refundable !== null) {
      payload.refundable = filters.refundable;
    }

    if (
      filters.minPrice !== null &&
      filters.minPrice > availablePriceRange.min
    ) {
      payload.minPrice = filters.minPrice;
    }

    if (
      filters.maxPrice !== null &&
      availablePriceRange.max > 0 &&
      filters.maxPrice < availablePriceRange.max
    ) {
      payload.maxPrice = filters.maxPrice;
    }

    return payload;
  }, [
    sortOrder,
    searchText,
    filters.location,
    filters.starRating,
    filters.mealType,
    filters.amenities,
    filters.refundable,
    filters.minPrice,
    filters.maxPrice,
    availablePriceRange.min,
    availablePriceRange.max,
  ]);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        base: baseSearchPayload,
        filters: backendSearchFilters,
        limit: pageSize,
      }),
    [baseSearchPayload, backendSearchFilters, pageSize],
  );

  const lastSearchRef = useRef("");

  useEffect(() => {
    if (!baseSearchPayload) return;
    
    // Skip if we already searched for this exact key
    if (lastSearchRef.current === requestKey) return;

    const timer = setTimeout(() => {
      dispatch(
        searchHotels({
          payload: {
            ...baseSearchPayload,
            SearchFilters: backendSearchFilters,
          },
          page: 1,
          limit: pageSize,
        }),
      );
      lastSearchRef.current = requestKey;
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch, requestKey, baseSearchPayload, backendSearchFilters, pageSize]);

  const transformedHotels = useMemo(
    () =>
      hotels?.map((hotel) => {
        const rooms = Array.isArray(hotel.Rooms) ? hotel.Rooms : [];
        const cheapestRoom = rooms.length
          ? rooms.reduce((prev, curr) =>
              curr.TotalFare < prev.TotalFare ? curr : prev,
            )
          : null;

        const nights = cheapestRoom?.DayRates?.[0]?.length || 1;
        const perNight =
          nights > 0
            ? cheapestRoom?.TotalFare / nights
            : cheapestRoom?.TotalFare;
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
          price: cheapestRoom?.TotalFare || 0,
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
      }) || [],
    [hotels, traceId],
  );

  const handleLoadMore = () => {
    if (!pagination?.hasMore) return;
    if (loading?.search || loading?.loadMore) return;
    if (!baseSearchPayload) return;

    dispatch(
      searchHotels({
        payload: {
          ...baseSearchPayload,
          SearchFilters: backendSearchFilters,
        },
        page: (pagination?.page || 1) + 1,
        limit: pageSize,
      }),
    );
  };

  const isInitialLoading = loading?.search && (hotels?.length || 0) === 0;
  const isLoadingMore = loading?.loadMore;

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <CorporateNavbar />
      <Header />

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
                  Found {pagination?.total ?? transformedHotels?.length ?? 0} hotels
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
                  <p className="text-center py-10 text-slate-400">
                    No hotels found
                  </p>
                ) : (
                  <>
                    {transformedHotels.map((hotel) => (
                      <HotelCard key={hotel.id} hotel={hotel} />
                    ))}

                    {pagination?.hasMore && (
                      <div className="flex justify-center pt-6">
                        <button
                          onClick={handleLoadMore}
                          disabled={loading?.search || isLoadingMore}
                          className="px-6 py-2 rounded-lg font-semibold transition duration-200 disabled:opacity-60 hover:brightness-110 active:scale-95"
                          style={{ background: "#C9A84C", color: "#000D26" }}
                        >
                          {isLoadingMore ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
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
