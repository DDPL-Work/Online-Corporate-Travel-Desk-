// client\src\Redux\Slice\hotelSlice.js


import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCities,
  fetchCountries,
  fetchHotelDetails,
  fetchRoomInfo,
  fetchBookingDetails,
  searchHotels,
} from "../Actions/hotelThunks";

const dedupeHotels = (existing = [], incoming = []) => {
  const seen = new Set();
  const result = [];

  const addList = (list = []) =>
    list.forEach((hotel) => {
      const key =
        hotel?._index ??
        hotel?.HotelCode ??
        `${(hotel?.HotelName || "").trim().toLowerCase()}|${(hotel?.CityName || "").trim().toLowerCase()}|${(hotel?.Address || "").trim().toLowerCase()}`;

      if (seen.has(key)) return;
      seen.add(key);
      result.push(hotel);
    });

  addList(existing);
  addList(incoming);

  return result;
};

const hotelSlice = createSlice({
  name: "hotel",
  initialState: {
    countries: [],
    citiesByCountry: {},
    hotels: [],
    pagination: { total: 0, page: 1, limit: 10, hasMore: false },
    traceId: null,
    selectedHotel: null,
    searchPayload: null,
    hotelDetailsById: {},
    tboBookingDetails: null, // ✅ STORE TBO BOOKING INFO

    loading: {
      countries: false,
      cities: false,
      search: false,
      loadMore: false,
      details: false,
      rooms: false,
      bookingDetails: false,
    },

    error: {
      countries: null,
      cities: null,
      search: null,
      details: null,
      rooms: null,
      bookingDetails: null,
    },
  },

  reducers: {
    clearHotels: (state) => {
      state.hotels = [];
      state.pagination = { total: 0, page: 1, limit: 10, hasMore: false };
      state.traceId = null;
    },
    clearSelectedHotel: (state) => {
      state.selectedHotel = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ---------------- COUNTRY ---------------- */
      .addCase(fetchCountries.pending, (state) => {
        state.loading.countries = true;
        state.error.countries = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading.countries = false;
        state.countries = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading.countries = false;
        state.error.countries = action.payload;
      })

      /* ---------------- CITY ---------------- */
      /* ---------------- CITY ---------------- */
      .addCase(fetchCities.pending, (state) => {
        state.loading.cities = true;
        state.error.cities = null;
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.loading.cities = false;

        const { countryCode, cities } = action.payload;
        state.citiesByCountry[countryCode] = cities;
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.loading.cities = false;
        state.error.cities = action.payload;
      })

      /* ---------------- SEARCH ---------------- */
      .addCase(searchHotels.pending, (state, action) => {
        const page = action.meta?.arg?.page || 1;
        const isLoadMore = page > 1;
        state.loading.search = !isLoadMore;
        state.loading.loadMore = isLoadMore;
        state.error.search = null;
      })
      .addCase(searchHotels.fulfilled, (state, action) => {
        const page =
          action.payload?.pagination?.page || action.meta?.arg?.page || 1;

        state.loading.search = false;
        state.loading.loadMore = false;

        const incomingHotels = action.payload?.hotels || [];
        const pagination = action.payload?.pagination || {
          total: incomingHotels.length,
          page,
          limit: action.meta?.arg?.limit || 10,
          hasMore: false,
        };

        const isFirstPage = page <= 1;
        state.hotels = isFirstPage
          ? dedupeHotels([], incomingHotels)
          : dedupeHotels(state.hotels, incomingHotels);

        state.pagination = pagination;

        const metaArg = action.meta?.arg;
        const payloadForStore =
          metaArg && typeof metaArg === "object" && "payload" in metaArg
            ? metaArg.payload
            : metaArg;
        state.searchPayload = payloadForStore || state.searchPayload;
        state.traceId = action.payload?.traceId || state.traceId;
      })
      .addCase(searchHotels.rejected, (state, action) => {
        state.loading.search = false;
        state.loading.loadMore = false;
        state.error.search = action.payload;
      })

      /* ---------------- DETAILS ---------------- */
      .addCase(fetchHotelDetails.pending, (state) => {
        state.loading.details = true;
        state.error.details = null;
      })
      .addCase(fetchHotelDetails.fulfilled, (state, action) => {
        state.loading.details = false;
        const { hotelCode } = action.meta.arg;
        state.hotelDetailsById[hotelCode] = action.payload;
        state.selectedHotel = action.payload;
      })
      .addCase(fetchHotelDetails.rejected, (state, action) => {
        state.loading.details = false;
        state.error.details = action.payload;
      })
      /* ---------------- ROOM INFO ---------------- */
      .addCase(fetchRoomInfo.pending, (state) => {
        state.loading.rooms = true;
        state.error.rooms = null;
      })
      .addCase(fetchRoomInfo.fulfilled, (state, action) => {
        state.loading.rooms = false;
        const { hotelCode, rooms } = action.payload;
        // Update the hotel details with the latest rooms if already present
        if (state.hotelDetailsById[hotelCode]) {
          state.hotelDetailsById[hotelCode].Rooms = rooms;
        }
      })
      .addCase(fetchRoomInfo.rejected, (state, action) => {
        state.loading.rooms = false;
        state.error.rooms = action.payload;
      })
      /* ---------------- BOOKING DETAILS ---------------- */
      .addCase(fetchBookingDetails.pending, (state) => {
        state.loading.bookingDetails = true;
        state.error.bookingDetails = null;
      })
      .addCase(fetchBookingDetails.fulfilled, (state, action) => {
        state.loading.bookingDetails = false;
        state.tboBookingDetails = action.payload;
      })
      .addCase(fetchBookingDetails.rejected, (state, action) => {
        state.loading.bookingDetails = false;
        state.error.bookingDetails = action.payload;
      });
  },
});

export const { clearHotels, clearSelectedHotel } = hotelSlice.actions;
export default hotelSlice.reducer;
