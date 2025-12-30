import { createAsyncThunk } from "@reduxjs/toolkit";
import flightApi from "../../API/flightAPI";

/* ---------------- SEARCH ---------------- */
export const searchFlights = createAsyncThunk(
  "flights/search",
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

/* ---------------- FARE QUOTE ---------------- */
export const getFareQuote = createAsyncThunk(
  "flights/fareQuote",
  async ({ traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/fare-quote", {
        traceId,
        resultIndex,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- FARE RULE ---------------- */
export const getFareRule = createAsyncThunk(
  "flights/fareRule",
  async ({ traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/fare-rule", {
        traceId,
        resultIndex,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- SSR ---------------- */
export const getSSR = createAsyncThunk(
  "flights/ssr",
  async ({ traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/ssr", {
        traceId,
        resultIndex,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

/* ---------------- SEAT MAP ---------------- */
export const getSeatMap = createAsyncThunk(
  "flights/seatMap",
  async ({ traceId, resultIndex, isLCC }, { rejectWithValue }) => {
    try {
      const { data } = await flightApi.post("/seat-map", {
        traceId,
        resultIndex,
        isLCC,
      });

      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Seat map fetch failed"
      );
    }
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
