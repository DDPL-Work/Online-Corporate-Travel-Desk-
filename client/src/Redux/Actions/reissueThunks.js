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

// ── Fetch employee's online reissue requests (module API — ReissueRequest schema) ──
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

// ── Fetch FlightReissueRequest records (legacy API — has reason, PNR, user.name, corporate) ──
// Used by: MyReissuedRequests, TravelAdminTabs/ReissueRequests, approval workflows
// Response: { success, data: FlightReissueRequest[], pagination: {} }
export const fetchLegacyReissueRequests = createAsyncThunk(
  "reissue/fetchLegacyAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/flights/reissue/list", { params });
      // Response shape: { success, data: [], pagination: {} }
      // response.data = that object; response.data.data = the array
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {},
      };
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

// ── Fetch all online reissue requests (Admin) ──
export const fetchAdminReissueRequests = createAsyncThunk(
  "reissue/fetchAdminAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/admin/requests", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch admin reissue requests"),
      );
    }
  },
);

// ── Fetch company reissue requests (Online + Offline combined for Travel Admin) ──
export const fetchCompanyReissueRequests = createAsyncThunk(
  "reissue/fetchCompanyAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/company", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch company reissue requests"),
      );
    }
  },
);

// ── Fetch all online reissue requests (Ops) ──
export const fetchOpsReissueRequests = createAsyncThunk(
  "reissue/fetchOpsAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/ops/requests", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch ops reissue requests"),
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

// ── Fetch single legacy reissue request by ID ──
export const fetchLegacyReissueRequestById = createAsyncThunk(
  "reissue/fetchLegacyById",
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/flights/reissue/${requestId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch legacy reissue request"),
      );
    }
  },
);


// ── Update Reissue Status (Approve/Reject) ──
export const updateReissueStatus = createAsyncThunk(
  "reissue/updateStatus",
  async ({ requestId, status, message, actionBy, actionByName }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/flights/reissue/status/${requestId}`, {
        status,
        message,
        actionBy,
        actionByName
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update status");
    }
  }
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
