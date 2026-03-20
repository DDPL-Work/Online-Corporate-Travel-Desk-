// client\src\Pages\search-results\Hotel-results\Hotel-Search-Results.jsx


import React, { useState } from "react";
import Header from "./Hotel-Header";
import FilterSidebar from "./Filter-Sidebar";
import HotelCard from "./Hotel-Card";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useSelector } from "react-redux";

function HotelSearchResults() {
  const { hotels, loading, traceId } = useSelector((state) => state.hotel);

  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 100000,
    starRating: [],
    mealType: null,
    propertyType: [],
    amenities: [],
  });
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const transformedHotels = hotels?.map((hotel) => {
    const cheapestRoom = hotel.Rooms?.reduce((prev, curr) =>
      curr.TotalFare < prev.TotalFare ? curr : prev,
    );

    const nights = cheapestRoom?.DayRates?.[0]?.length || 1;

    const perNight =
      nights > 0 ? cheapestRoom?.TotalFare / nights : cheapestRoom?.TotalFare;

    const inclusions =
      cheapestRoom?.Inclusion?.split(",")?.map((i) => i.replaceAll("_", " ")) ||
      [];

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
      roomsLeft: hotel.Rooms?.length || 1,
      traceId: traceId,
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

  const filteredHotels = transformedHotels?.filter((hotel) => {
    const priceMatch =
      hotel.price >= filters.minPrice && hotel.price <= filters.maxPrice;

    const starMatch =
      filters.starRating.length === 0 ||
      filters.starRating.includes(hotel.rating);

    const nameMatch = hotel.name
      ?.toLowerCase()
      .includes(searchText.toLowerCase());

    const mealMatch = !filters.mealType || hotel.meal === filters.mealType;

    const propertyMatch =
      filters.propertyType.length === 0 ||
      filters.propertyType.includes(hotel.propertyType);

    const amenityMatch =
      filters.amenities.length === 0 ||
      filters.amenities.every((amenity) => hotel.amenities?.includes(amenity));

    return (
      priceMatch &&
      starMatch &&
      nameMatch &&
      mealMatch &&
      propertyMatch &&
      amenityMatch
    );
  });

  const visibleHotels = filteredHotels?.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <EmployeeHeader />
      <Header />

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-80">
            <div
              className="
                          lg:sticky lg:top-4 
                          lg:max-h-[calc(100vh-120px)] 
                          lg:overflow-y-auto"
            >
              <FilterSidebar
                hotels={transformedHotels}
                filters={filters}
                setFilters={setFilters}
                searchText={searchText}
                setSearchText={setSearchText}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="  flex flex-col">
              {/* Header */}
              <div className="border-b border-gray-300">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Found {filteredHotels?.length || 0} hotels
                </h2>
              </div>

              {/* Hotel Cards */}
              <div
                className=" py-4 space-y-4 
              lg:max-h-[calc(100vh-180px)] 
              lg:overflow-y-auto"
              >
                {loading?.search ? (
                  <p className="text-center py-10">Loading hotels...</p>
                ) : filteredHotels?.length === 0 ? (
                  <p className="text-center py-10 text-gray-500">
                    No hotels found
                  </p>
                ) : (
                  <>
                    {visibleHotels?.map((hotel) => (
                      <HotelCard key={hotel.id} hotel={hotel} />
                    ))}

                    {/* Load More Button */}
                    {visibleCount < filteredHotels.length && (
                      <div className="flex justify-center pt-6">
                        <button
                          onClick={handleLoadMore}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition duration-200"
                        >
                          Load More
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
