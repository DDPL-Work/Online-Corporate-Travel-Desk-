import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../API/axios";

const getErrorMessage = (error, fallback) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  const safe = String(message || fallback);
  if (/xml|stack|axios|timeout|network|internal server error/i.test(safe)) {
    return fallback;
  }
  return safe;
};

const getErrorPayload = (error, fallback) => ({
  message: getErrorMessage(error, fallback),
  code: error?.response?.data?.code || null,
  data: error?.response?.data?.data || null,
});

const getOfflineSearchFallbackMessage = (error) => {
  const code = error?.response?.data?.code || "";

  if (
    [
      "REISSUE_ROUTE_NOT_FOUND",
      "REISSUE_SEGMENTS_NOT_FOUND",
      "REISSUE_AIRPORT_CODE_MISSING",
    ].includes(code)
  ) {
    return "We could not automatically load alternative flights for this booking. You can still submit an offline reissue request.";
  }

  return getErrorMessage(error, "Failed to search alternative flights");
};

// ── Eligibility check (MUST be called before any reissue action) ──
export const checkReissueEligibility = createAsyncThunk(
  "reissue/checkEligibility",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/reissue/eligibility/${bookingId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to check reissue eligibility"),
      );
    }
  },
);

// ── Online reissue: search (only when eligibility.onlineEligible === true) ──
export const createReissueRequest = createAsyncThunk(
  "reissue/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post("/reissue/search", payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to search reissue options"),
      );
    }
  },
);

// ── Offline assisted search ──
export const searchOfflineReissueOptions = createAsyncThunk(
  "reissue/searchOfflineOptions",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post("/reissue/offline/search-options", payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getOfflineSearchFallbackMessage(error));
    }
  },
);

// ── Offline reissue: create request ──
export const createOfflineReissueRequest = createAsyncThunk(
  "reissue/createOffline",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post("/reissue/offline/create", payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorPayload(error, "Failed to create offline reissue request"),
      );
    }
  },
);

// ── Fetch employee's online reissue requests ──
export const fetchReissueRequests = createAsyncThunk(
  "reissue/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/my", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch reissue requests"),
      );
    }
  },
);

// ── Fetch employee's offline reissue requests ──
export const fetchOfflineReissueRequests = createAsyncThunk(
  "reissue/fetchAllOffline",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/offline/my-requests", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch offline reissue requests"),
      );
    }
  },
);

export const fetchOfflineReissueRequestByBooking = createAsyncThunk(
  "reissue/fetchOfflineByBooking",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/offline/my-requests", {
        params: {
          bookingId,
          page: 1,
          limit: 1,
        },
      });
      return response.data.data?.data?.[0] || null;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch offline reissue status"),
      );
    }
  },
);

// ── Fetch single reissue request by ID ──
export const fetchReissueRequestById = createAsyncThunk(
  "reissue/fetchById",
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/reissue/${requestId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch reissue request"),
      );
    }
  },
);

// ── Preview fare quote ──
export const previewReissueQuote = createAsyncThunk(
  "reissue/previewQuote",
  async ({ requestId, resultIndex }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/reissue/${requestId}/farequote`, {
        resultIndex,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to get reissue fare quote"),
      );
    }
  },
);

// ── Confirm online reissue ──
export const confirmReissueRequest = createAsyncThunk(
  "reissue/confirm",
  async ({ requestId, remarks }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/reissue/${requestId}/confirm`, {
        remarks,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to confirm reissue request"),
      );
    }
  },
);
