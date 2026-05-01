import api from '../../API/axios';
import { createAsyncThunk } from "@reduxjs/toolkit";
import flightApi from "../../API/flightAPI";

/* ===============================
   1. GET CANCELLATION CHARGES
================================= */
export const fetchCancellationCharges = createAsyncThunk(
  "amendment/fetchCancellationCharges",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/cancellation/charges", {
        bookingId,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ===============================
   2. FULL CANCELLATION
================================= */
export const fullCancellation = createAsyncThunk(
  "amendment/fullCancellation",
  async ({ bookingId, remarks }, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/cancellation/full", {
        bookingId,
        remarks,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ===============================
   3. PARTIAL CANCELLATION
================================= */
export const partialCancellation = createAsyncThunk(
  "amendment/partialCancellation",
  async (
    { bookingId, passengerIds, segments, remarks },
    { rejectWithValue },
  ) => {
    try {
      const res = await flightApi.post("/amendments/cancellation/partial", {
        bookingId,
        passengerIds,
        segments,
        remarks,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ===============================
   4. AMEND BOOKING
================================= */
export const amendBooking = createAsyncThunk(
  "amendment/amendBooking",
  async ({ bookingId, segments, remarks }, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/amend", {
        bookingId,
        segments,
        remarks,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ===============================
   5. GET CHANGE STATUS
================================= */
export const fetchChangeStatus = createAsyncThunk(
  "amendment/fetchChangeStatus",
  async ({ changeRequestId, bookingId }, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/cancellation/status", {
        changeRequestId,
        bookingId, // ✅ IMPORTANT
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ===============================
   6. RELEASE PNR
================================= */
export const releasePNR = createAsyncThunk(
  "amendment/releasePNR",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/release-pnr", {
        bookingId,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);


export const createCancellationQuery = createAsyncThunk(
  "cancellationQuery/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await flightApi.post("/amendments/create-query", payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create query"
      );
    }
  }
);
export const fetchCancellationQueries = createAsyncThunk(
  "cancellationQuery/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get("/corporate-related/cancellation-queries", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch queries"
      );
    }
  }
);

export const updateCancellationQueryStatus = createAsyncThunk(
  "cancellationQuery/updateStatus",
  async ({ id, status, remarks, resolution }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/corporate-related/cancellation-queries/${id}/status`, {
        status,
        remarks,
        resolution
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update status"
      );
    }
  }
);

export const fetchCancellationQueryDetails = createAsyncThunk(
  'cancellationQuery/fetchDetails',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/corporate-related/cancellation-queries/${id}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch query details');
    }
  }
);

