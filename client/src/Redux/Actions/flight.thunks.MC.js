import { createAsyncThunk } from "@reduxjs/toolkit";
import flightApi from "../../API/flightAPI";


/* ---------------- SEARCH ---------------- */
export const searchFlightsMC = createAsyncThunk(
  "flights/search",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/search", payload);

      const response = data?.data?.Response;

      if (!response || response.ResponseStatus !== 1) {
        return rejectWithValue("Flight search failed");
      }

      let results;

      // ---------------- MULTI-CITY ----------------
      if (payload.journeyType === 3) {
        // Keep results grouped by segment
        results = (response.Results || []).map(
          (segmentResults, segmentIndex) => ({
            segmentIndex,
            flights: segmentResults || [],
          })
        );
      }
      // ---------------- ONE-WAY / ROUND-TRIP ----------------
      else {
        results = (response.Results || []).flat();
      }

      return {
        TraceId: response.TraceId,
        Origin: response.Origin,
        Destination: response.Destination,
        Results: results,
        journeyType: payload.journeyType,
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Search failed"
      );
    }
  }
);
