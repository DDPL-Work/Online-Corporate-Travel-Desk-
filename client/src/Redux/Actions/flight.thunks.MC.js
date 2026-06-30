import { createAsyncThunk } from "@reduxjs/toolkit";
import flightApi from "../../API/flightAPI";

/* ---------------- SEARCH ---------------- */
export const searchFlightsMC = createAsyncThunk(
  "flights/searchMC",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/search", payload);
      const response = data?.data;

      // ❌ Only real failure
      if (response?.ResponseStatus === 3) {
        return rejectWithValue(response.Error);
      }

      let results = [];

      if (payload.journeyType === 3) {
        // Each index = one segment
        results = (response.Results || []).map((segmentFlights, index) => ({
          segmentIndex: index,
          flights: segmentFlights || [],
        }));
      } else {
        results = (response.Results || []).flat();
      }
      return {
        TraceId: response.TraceId,
        Origin: response.Origin,
        Destination: response.Destination,
        journeyType: payload.journeyType,
        Results: results,
        noResults: response.ResponseStatus === 2,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Search failed");
    }
  },
);
