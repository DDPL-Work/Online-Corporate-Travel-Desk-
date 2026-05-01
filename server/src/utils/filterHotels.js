const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const formatMealType = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .trim();

const parseAmenities = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(parseAmenities);
  }

  const normalized = String(value || "").trim();
  if (!normalized) return [];

  return normalized
    .split(",")
    .map((item) => item.replace(/_/g, " ").trim())
    .filter(Boolean);
};

const getRooms = (hotel = {}) =>
  Array.isArray(hotel.Rooms) ? hotel.Rooms.filter(Boolean) : [];

const getCheapestRoom = (hotel = {}) => {
  const rooms = getRooms(hotel);
  if (rooms.length === 0) return null;

  return rooms.reduce((bestRoom, currentRoom) => {
    const bestFare = toNumber(bestRoom?.TotalFare, Number.MAX_SAFE_INTEGER);
    const currentFare = toNumber(
      currentRoom?.TotalFare,
      Number.MAX_SAFE_INTEGER,
    );

    return currentFare < bestFare ? currentRoom : bestRoom;
  }, rooms[0]);
};

const getLocationLabel = (hotel = {}) => {
  const addressParts = String(hotel.Address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (addressParts.length > 1) {
    return addressParts[addressParts.length - 2];
  }

  return hotel.CityName || addressParts[0] || "";
};

const buildHotelSearchMeta = (hotel = {}) => {
  const cheapestRoom = getCheapestRoom(hotel);
  const hotelAmenities = parseAmenities(hotel.Amenities);
  const roomAmenities = parseAmenities(cheapestRoom?.Amenities);
  const inclusions = parseAmenities(cheapestRoom?.Inclusion);
  const amenities = uniqueValues([
    ...hotelAmenities,
    ...roomAmenities,
    ...inclusions,
  ]);
  const mealType = formatMealType(cheapestRoom?.MealType || "");
  const locationLabel = getLocationLabel(hotel);

  return {
    hotelCode: String(hotel.HotelCode || "").trim(),
    price: toNumber(cheapestRoom?.TotalFare, 0),
    rating: Math.max(0, Math.round(toNumber(hotel.StarRating, 0))),
    refundable:
      cheapestRoom?.IsRefundable === undefined
        ? null
        : Boolean(cheapestRoom.IsRefundable),
    mealType,
    mealTypeLookup: normalizeText(mealType),
    hotelNameLookup: normalizeText(hotel.HotelName || ""),
    locationLookup: normalizeText(
      `${hotel.Address || ""} ${hotel.CityName || ""} ${hotel.CountryName || ""} ${locationLabel}`,
    ),
    locationLabel,
    amenities,
    amenityLookup: new Set(amenities.map(normalizeText)),
  };
};

const prepareHotelsForFiltering = (hotels = []) =>
  (Array.isArray(hotels) ? hotels : []).map((hotel) => ({
    hotel,
    meta: buildHotelSearchMeta(hotel),
  }));

const applyHotelFilters = (preparedHotels = [], filters = {}) => {
  const mapSearch = normalizeText(filters.mapSearch || "");
  const hotelName = normalizeText(filters.hotelName || filters.searchText || "");
  const location = normalizeText(filters.location || "");
  const minPrice =
    filters.minPrice === null || filters.minPrice === undefined
      ? null
      : toNumber(filters.minPrice, 0);
  const maxPrice =
    filters.maxPrice === null || filters.maxPrice === undefined
      ? null
      : toNumber(filters.maxPrice, Number.MAX_SAFE_INTEGER);
  const starRatings = new Set(
    Array.isArray(filters.starRating)
      ? filters.starRating.map((rating) => toNumber(rating, 0)).filter(Boolean)
      : [],
  );
  const mealType = normalizeText(filters.mealType || "");
  const amenityFilters = (Array.isArray(filters.amenities) ? filters.amenities : [])
    .map(normalizeText)
    .filter(Boolean);
  const refundableFilter =
    filters.refundable === null || filters.refundable === undefined
      ? null
      : String(filters.refundable).toLowerCase() === "true";

  return preparedHotels.filter(({ meta }) => {
    if (
      mapSearch &&
      !(
        meta.hotelNameLookup.includes(mapSearch) ||
        meta.locationLookup.includes(mapSearch)
      )
    ) {
      return false;
    }

    if (hotelName && !meta.hotelNameLookup.includes(hotelName)) return false;
    if (location && !meta.locationLookup.includes(location)) return false;
    if (minPrice !== null && meta.price < minPrice) return false;
    if (maxPrice !== null && meta.price > maxPrice) return false;
    if (starRatings.size > 0 && !starRatings.has(meta.rating)) return false;
    if (mealType && meta.mealTypeLookup !== mealType) return false;
    if (
      amenityFilters.length > 0 &&
      !amenityFilters.every((amenity) => meta.amenityLookup.has(amenity))
    ) {
      return false;
    }
    if (refundableFilter !== null && meta.refundable !== refundableFilter) {
      return false;
    }

    return true;
  });
};

const sortPreparedHotels = (preparedHotels = [], sortBy = "priceAsc") => {
  const sortable = [...preparedHotels];

  sortable.sort((left, right) => {
    if (sortBy === "priceDesc") {
      return (
        right.meta.price - left.meta.price ||
        right.meta.rating - left.meta.rating ||
        left.meta.hotelNameLookup.localeCompare(right.meta.hotelNameLookup)
      );
    }

    if (sortBy === "ratingDesc") {
      return (
        right.meta.rating - left.meta.rating ||
        left.meta.price - right.meta.price ||
        left.meta.hotelNameLookup.localeCompare(right.meta.hotelNameLookup)
      );
    }

    if (sortBy === "nameAsc") {
      return (
        left.meta.hotelNameLookup.localeCompare(right.meta.hotelNameLookup) ||
        left.meta.price - right.meta.price
      );
    }

    return (
      left.meta.price - right.meta.price ||
      right.meta.rating - left.meta.rating ||
      left.meta.hotelNameLookup.localeCompare(right.meta.hotelNameLookup)
    );
  });

  return sortable;
};

const buildHotelFilterMeta = (preparedHotels = []) => {
  const priceValues = preparedHotels
    .map(({ meta }) => meta.price)
    .filter((price) => Number.isFinite(price) && price >= 0);
  const starRatingCounts = new Map();
  const mealTypeCounts = new Map();
  const amenityCounts = new Map();
  const locationCounts = new Map();
  let refundableCount = 0;
  let nonRefundableCount = 0;

  preparedHotels.forEach(({ meta }) => {
    if (meta.rating > 0) {
      starRatingCounts.set(
        meta.rating,
        (starRatingCounts.get(meta.rating) || 0) + 1,
      );
    }

    if (meta.mealType) {
      mealTypeCounts.set(
        meta.mealType,
        (mealTypeCounts.get(meta.mealType) || 0) + 1,
      );
    }

    if (meta.refundable === true) refundableCount += 1;
    if (meta.refundable === false) nonRefundableCount += 1;

    if (meta.locationLabel) {
      locationCounts.set(
        meta.locationLabel,
        (locationCounts.get(meta.locationLabel) || 0) + 1,
      );
    }

    meta.amenities.forEach((amenity) => {
      amenityCounts.set(amenity, (amenityCounts.get(amenity) || 0) + 1);
    });
  });

  return {
    totalHotels: preparedHotels.length,
    priceRange: {
      min: priceValues.length ? Math.min(...priceValues) : 0,
      max: priceValues.length ? Math.max(...priceValues) : 0,
    },
    starRatings: [1, 2, 3, 4, 5].map((rating) => ({
      value: rating,
      count: starRatingCounts.get(rating) || 0,
    })),
    mealTypes: [...mealTypeCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    refundable: {
      refundableCount,
      nonRefundableCount,
    },
    amenities: [...amenityCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 30),
    locations: [...locationCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 50),
  };
};

module.exports = {
  buildHotelFilterMeta,
  getCheapestRoom,
  prepareHotelsForFiltering,
  applyHotelFilters,
  sortPreparedHotels,
};
