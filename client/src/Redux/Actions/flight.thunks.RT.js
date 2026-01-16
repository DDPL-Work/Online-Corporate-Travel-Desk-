//flight.thunks.RT.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import flightApi from "../../API/flightAPI";

/* ---------------- SEARCH ---------------- */
export const searchFlightsRT = createAsyncThunk(
  "flightsRT/search",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/search", payload);

      const response = data?.data?.Response;

      if (!response || response.ResponseStatus !== 1) {
        return rejectWithValue("Flight search failed");
      }

      // 🔥 FLATTEN TBO RESULTS
      const flatResults = (response.Results || []).flat();

      return {
        TraceId: response.TraceId,
        Origin: response.Origin,
        Destination: response.Destination,
        Results: flatResults,
        journeyType: payload.journeyType,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Search failed");
    }
  }
);

/* ---------------- FARE QUOTE (ROUND-TRIP) ---------------- */
export const getRTFareQuote = createAsyncThunk(
  "flightsRT/fareQuoteRT",
  async ({ traceId, resultIndex, journeyType }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/fare-quote", {
        traceId,
        resultIndex,
      });

      return {
        journeyType,
        data: data.data,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- FARE RULE (ROUND-TRIP) ---------------- */
export const getRTFareRule = createAsyncThunk(
  "flightsRT/getRTFareRule",
  async ({ traceId, resultIndex, journeyType }) => {
    const { data } = await flightApi.post("/fare-rule", {
      traceId,
      resultIndex,
    });

    return {
      journeyType,
      resultIndex,
      data: data.data,
    };
  }
);

/* ---------------- SSR (ROUND-TRIP) ---------------- */
export const getRTSSR = createAsyncThunk(
  "flightsRT/getRTSSR",
  async ({ traceId, resultIndex, journeyType }) => {
    console.log("🚀 SSR THUNK HIT", { traceId, resultIndex, journeyType });

    const { data } = await flightApi.post("/ssr", {
      traceId,
      resultIndex,
    });

    console.log("✅ SSR API RESPONSE", data);

    return {
      journeyType,
      resultIndex,
      data: data.data,
    };
  }
);

/* ---------------- BOOK ---------------- */
export const bookFlight = createAsyncThunk(
  "flights/book",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/book", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- TICKET ---------------- */
export const ticketFlight = createAsyncThunk(
  "flights/ticket",
  async ({ bookingId, pnr }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/ticket", { bookingId, pnr });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- BOOKING DETAILS ---------------- */
export const getBookingDetails = createAsyncThunk(
  "flights/bookingDetails",
  async (pnr, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.get(`/booking/${pnr}`);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);
