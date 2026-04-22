//super-admin\src\Redux\Actions\corporate.related.thunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import flightApi from "../../API/flightAPI";
import api from "../../API/axios";
const BASE_URL = "/corporate-related/corporate-bookings";

// 🔐 attach token automatically (adjust if you use interceptor)
const getConfig = (getState) => ({
  headers: {
    Authorization: `Bearer ${getState().auth.token}`,
  },
});

/**
 * ✈️ FETCH FLIGHT BOOKINGS
 */
export const fetchFlightBookings = createAsyncThunk(
  "superAdmin/fetchFlightBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      // Only keep filters (no pagination)
      const query = new URLSearchParams(params).toString();

      const res = await api.get(
        `${BASE_URL}/flights${query ? `?${query}` : ""}`,
        getConfig(getState)
      );

      const payload = res.data || {};

      return {
        data: payload.data || payload.results || [],
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ✈️ FLIGHT CANCELLATIONS
export const fetchFlightCancellations = createAsyncThunk(
  "corporateRelated/fetchFlightCancellations",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();

      const res = await api.get(
        `${BASE_URL}/flights/cancellations${query ? `?${query}` : ""}`,
        getConfig(getState)
      );

      const payload = res.data || {};

      return {
        data: payload.data || [],
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

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

//Hotel

/**
 * 🏨 FETCH HOTEL BOOKINGS
 */
export const fetchHotelBookings = createAsyncThunk(
  "superAdmin/fetchHotelBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      // No page/limit — fetch all data for frontend pagination
      const query = new URLSearchParams(params).toString();

      const res = await api.get(
        `${BASE_URL}/hotels${query ? `?${query}` : ""}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || payload.results || [],
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

// 🏨 HOTEL CANCELLATIONS
export const fetchHotelCancellations = createAsyncThunk(
  "corporateRelated/fetchHotelCancellations",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      // No page/limit — fetch all data for frontend pagination
      const query = new URLSearchParams(params).toString();

      const res = await api.get(
        `${BASE_URL}/hotels/cancellations${query ? `?${query}` : ""}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || [],
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ================================
   SEND AMENDMENT REQUEST
================================ */
export const sendHotelAmendment = createAsyncThunk(
  "hotelAmendment/send",
  async ({ bookingId, remarks }, { rejectWithValue }) => {
    const payload = { bookingId, remarks };
    try {
      console.log("PAYLOAD SENT:", payload);
      const res = await api.post("/hotels/amendments/request", {
        bookingId,
        remarks,
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  },
);

/* ================================
   GET AMENDMENT STATUS
================================ */
export const getHotelAmendmentStatus = createAsyncThunk(
  "hotelAmendment/status",
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      const res = await api.post("/hotels/amendments/status", {
        bookingId,
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  },
);


/* =====================================================
   🔹 FETCH CANCELLATION QUERIES
===================================================== */
export const fetchCancellationQueries = createAsyncThunk(
  "cancellation/fetchQueries",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, status, queryId, bookingReference } = params;

      const res = await api.get(`/corporate-related/cancellation-queries`, {
        params: { page, limit, status, queryId, bookingReference },
      });

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || { message: "Fetch failed" }
      );
    }
  }
);

/* =====================================================
   🔹 UPDATE STATUS
===================================================== */
export const updateCancellationQueryStatus = createAsyncThunk(
  "cancellation/updateStatus",
  async ({ id, status, remarks }, { rejectWithValue }) => {
    try {
      const res = await api.patch(
        `/corporate-related/cancellation-queries/${id}/status`,
        { status, remarks }
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || { message: "Update failed" }
      );
    }
  }
);

/* =====================================================
   🔹 REVENUE DASHBOARD THUNKS
===================================================== */

export const fetchRevenueSummary = createAsyncThunk(
  "revenue/fetchSummary",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { fromDate, toDate, corporateId } = params;
      const res = await api.get(`/corporate-related/revenue/summary`, { 
        params: { fromDate, toDate, corporateId } 
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchCompanyWiseRevenue = createAsyncThunk(
  "revenue/fetchCompanyWise",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { fromDate, toDate, corporateId } = params;
      const res = await api.get(`/corporate-related/revenue/company-wise`, { 
        params: { fromDate, toDate, corporateId } 
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchMonthlyRevenue = createAsyncThunk(
  "revenue/fetchMonthly",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { fromDate, toDate, corporateId } = params;
      const res = await api.get(`/corporate-related/revenue/monthly`, { 
        params: { fromDate, toDate, corporateId } 
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchQuarterlyRevenue = createAsyncThunk(
  "revenue/fetchQuarterly",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { fromDate, toDate, corporateId } = params;
      const res = await api.get(`/corporate-related/revenue/quarterly`, { 
        params: { fromDate, toDate, corporateId } 
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchCorporateDetailedBookings = createAsyncThunk(
  "revenue/fetchCorporateDetailed",
  async ({ id, fromDate, toDate }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/corporate-related/revenue/corporate-details/${id}`, { 
        params: { fromDate, toDate } 
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchHalfYearlyRevenue = createAsyncThunk(
  "revenue/fetchHalfYearly",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/corporate-related/revenue/half-yearly`, { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchYearlyRevenue = createAsyncThunk(
  "revenue/fetchYearly",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/corporate-related/revenue/yearly`, { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchDailyRevenue = createAsyncThunk(
  "revenue/fetchDaily",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/corporate-related/revenue/daily`, { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: "Fetch failed" });
    }
  }
);

export const fetchCorporates = createAsyncThunk(
  "corporateRelated/fetchCorporates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await api.get("/corporate-related/", getConfig(getState));
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);