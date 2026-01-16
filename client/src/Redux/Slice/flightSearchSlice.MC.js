import { createSlice } from "@reduxjs/toolkit";
import { searchFlightsMC } from "../Actions/flight.thunks.MC";

const initialState = {
  loading: false,
  error: null,

  TraceId: null,
  Origin: null,
  Destination: null,

  journeyType: null, // 1, 2, 3

  results: [], // flat for 1/2, grouped for 3
};

const flightSlice = createSlice({
  name: "flightsMC",
  initialState,
  reducers: {
    clearFlightResults: (state) => {
      state.loading = false;
      state.error = null;
      state.TraceId = null;
      state.Origin = null;
      state.Destination = null;
      state.journeyType = null;
      state.results = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------------- SEARCH PENDING ----------------
      .addCase(searchFlightsMC.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      // ---------------- SEARCH SUCCESS ----------------
      .addCase(searchFlightsMC.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        state.TraceId = action.payload.TraceId;
        state.Origin = action.payload.Origin;
        state.Destination = action.payload.Destination;
        state.journeyType = action.payload.journeyType;

        state.results = action.payload.Results;
      })

      // ---------------- SEARCH FAILURE ----------------
      .addCase(searchFlightsMC.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Unable to fetch flight results";
      });
  },
});

export const { clearFlightResults } = flightSlice.actions;

export default flightSlice.reducer;
