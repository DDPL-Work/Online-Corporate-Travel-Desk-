import { createSlice } from "@reduxjs/toolkit";
import {
  checkReissueEligibility,
  confirmReissueRequest,
  createOfflineReissueRequest,
  createReissueRequest,
  fetchLegacyReissueRequests,
  fetchOfflineReissueRequestByBooking,
  fetchOfflineReissueRequests,
  fetchReissueRequestById,
  fetchReissueRequests,
  previewReissueQuote,
  searchOfflineReissueOptions,
  fetchCompanyReissueRequests,
  fetchLegacyReissueRequestById,
} from "../Actions/reissueThunks";

const initialPagination = {
  total: 0,
  page: 1,
  pages: 1,
  limit: 10,
};

const initialState = {
  // ── Eligibility ──
  eligibility: null,
  eligibilityLoading: false,
  eligibilityError: null,

  // ── Online reissue (module API) ──
  requests: [],
  pagination: initialPagination,
  requestDetail: null,
  loading: false,
  detailLoading: false,
  createLoading: false,
  quoteLoading: false,
  confirmLoading: false,
  error: null,
  success: false,
  lastCreated: null,

  // ── Legacy FlightReissueRequest (approval flow) ──
  legacyRequests: [],
  legacyPagination: initialPagination,
  legacyLoading: false,
  legacyError: null,

  // ── Offline reissue ──
  offlineRequests: [],
  offlinePagination: initialPagination,
  offlineLoading: false,
  offlineCreateLoading: false,
  offlineError: null,
  offlineSuccess: false,
  lastOfflineCreated: null,
  offlineSearchResults: [],
  offlineSearchPagination: initialPagination,
  offlineSearchLoading: false,
  offlineSearchError: null,
  bookingOfflineRequest: null,
  bookingOfflineRequestLoading: false,

  // ── Company Reissue (Travel Admin Tab) ──
  companyRequests: [],
  companyPagination: initialPagination,
  companyLoading: false,
  companyError: null,
};

/**
 * Upsert a request into the list.
 * ⚠️ FIXED: Online module DTO uses `id` (mapped from _id in toReissueDto).
 *            Legacy FlightReissueRequest uses `_id`.
 *            Support both so no data is lost.
 */
const upsertRequest = (state, request) => {
  if (!request) return;
  const uid = request.id || request._id;
  if (!uid) return;
  const index = state.requests.findIndex(
    (item) => (item.id || item._id)?.toString() === uid.toString()
  );
  if (index === -1) {
    state.requests.unshift(request);
  } else {
    state.requests[index] = request;
  }
};

/**
 * Extract the requests array and pagination from different payload shapes:
 *
 * Shape A — Module API (/reissue/my):
 *   response.data = { data: ReissueDto[], pagination: { total, page, pages, limit } }
 *   thunk returns: response.data.data = { data: [], pagination: {} }
 *   So payload = { data: [], pagination: {} }
 *
 * Shape B — Legacy API (/flights/reissue/list):
 *   response.data = { success, data: ReissueDoc[], pagination: {} }
 *   thunk returns: response.data.data = [] (an array directly)
 *   So payload = []
 *
 * The thunk does: return response.data.data;
 * Module API: response.data = ApiResponse wrapper → .data = { data: [], pagination: {} }
 * Legacy API: response.data = { success, data: [], pagination: {} } → .data = []
 */
const extractRequestsAndPagination = (payload) => {
  if (!payload) return { data: [], pagination: initialPagination };

  // Shape A: { data: [...], pagination: {} }
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return {
      data: payload.data,
      pagination: payload.pagination || initialPagination,
    };
  }

  // Shape B: payload IS the array
  if (Array.isArray(payload)) {
    return { data: payload, pagination: initialPagination };
  }

  return { data: [], pagination: initialPagination };
};

const reissueSlice = createSlice({
  name: "reissue",
  initialState,
  reducers: {
    resetReissueState: (state) => {
      state.error = null;
      state.success = false;
      state.createLoading = false;
      state.quoteLoading = false;
      state.confirmLoading = false;
    },
    clearReissueDetail: (state) => {
      state.requestDetail = null;
      state.detailLoading = false;
      state.error = null;
    },
    clearEligibility: (state) => {
      state.eligibility = null;
      state.eligibilityLoading = false;
      state.eligibilityError = null;
    },
    resetOfflineState: (state) => {
      state.offlineError = null;
      state.offlineSuccess = false;
      state.offlineCreateLoading = false;
    },
    clearOfflineSearchState: (state) => {
      state.offlineSearchResults = [];
      state.offlineSearchPagination = initialPagination;
      state.offlineSearchLoading = false;
      state.offlineSearchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Eligibility ──
      .addCase(checkReissueEligibility.pending, (state) => {
        state.eligibilityLoading = true;
        state.eligibilityError = null;
      })
      .addCase(checkReissueEligibility.fulfilled, (state, action) => {
        state.eligibilityLoading = false;
        state.eligibility = action.payload;
      })
      .addCase(checkReissueEligibility.rejected, (state, action) => {
        state.eligibilityLoading = false;
        state.eligibilityError = action.payload;
      })

      // ── Online: fetch requests (module API) ──
      .addCase(fetchReissueRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReissueRequests.fulfilled, (state, action) => {
        state.loading = false;
        const { data, pagination } = extractRequestsAndPagination(action.payload);
        state.requests = data;
        state.pagination = pagination;
      })
      .addCase(fetchReissueRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Legacy: fetch FlightReissueRequest records (approval flow) ──
      .addCase(fetchLegacyReissueRequests.pending, (state) => {
        state.legacyLoading = true;
        state.legacyError = null;
      })
      .addCase(fetchLegacyReissueRequests.fulfilled, (state, action) => {
        state.legacyLoading = false;
        const { data, pagination } = extractRequestsAndPagination(action.payload);
        state.legacyRequests = data;
        state.legacyPagination = pagination;
      })
      .addCase(fetchLegacyReissueRequests.rejected, (state, action) => {
        state.legacyLoading = false;
        state.legacyError = action.payload;
      })

      // ── Company Reissues (Online + Offline) ──
      .addCase(fetchCompanyReissueRequests.pending, (state) => {
        state.companyLoading = true;
        state.companyError = null;
      })
      .addCase(fetchCompanyReissueRequests.fulfilled, (state, action) => {
        state.companyLoading = false;
        const { data, pagination } = extractRequestsAndPagination(action.payload);
        state.companyRequests = data;
        state.companyPagination = pagination;
      })
      .addCase(fetchCompanyReissueRequests.rejected, (state, action) => {
        state.companyLoading = false;
        state.companyError = action.payload;
      })

      // ── Online: create (search) ──
      .addCase(createReissueRequest.pending, (state) => {
        state.createLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createReissueRequest.fulfilled, (state, action) => {
        state.createLoading = false;
        state.success = true;
        state.lastCreated = action.payload;
        state.requestDetail = action.payload;
        upsertRequest(state, action.payload);
      })
      .addCase(createReissueRequest.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })

      // ── Online: fetch by ID ──
      .addCase(fetchReissueRequestById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchReissueRequestById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.requestDetail = action.payload;
        upsertRequest(state, action.payload);
      })
      .addCase(fetchReissueRequestById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })

      // ── Legacy: fetch single request by ID ──
      .addCase(fetchLegacyReissueRequestById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchLegacyReissueRequestById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.requestDetail = action.payload;
      })
      .addCase(fetchLegacyReissueRequestById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })

      // ── Online: preview quote ──
      .addCase(previewReissueQuote.pending, (state) => {
        state.quoteLoading = true;
        state.error = null;
      })
      .addCase(previewReissueQuote.fulfilled, (state, action) => {
        state.quoteLoading = false;
        state.requestDetail = action.payload;
        upsertRequest(state, action.payload);
      })
      .addCase(previewReissueQuote.rejected, (state, action) => {
        state.quoteLoading = false;
        state.error = action.payload;
      })

      // ── Online: confirm ──
      .addCase(confirmReissueRequest.pending, (state) => {
        state.confirmLoading = true;
        state.error = null;
      })
      .addCase(confirmReissueRequest.fulfilled, (state, action) => {
        state.confirmLoading = false;
        state.requestDetail = action.payload;
        upsertRequest(state, action.payload);
      })
      .addCase(confirmReissueRequest.rejected, (state, action) => {
        state.confirmLoading = false;
        state.error = action.payload;
      })

      // ── Offline: create ──
      .addCase(createOfflineReissueRequest.pending, (state) => {
        state.offlineCreateLoading = true;
        state.offlineError = null;
        state.offlineSuccess = false;
      })
      .addCase(createOfflineReissueRequest.fulfilled, (state, action) => {
        state.offlineCreateLoading = false;
        state.offlineSuccess = true;
        state.lastOfflineCreated = action.payload;
        if (action.payload) {
          state.offlineRequests.unshift(action.payload);
          state.bookingOfflineRequest = action.payload;
        }
      })
      .addCase(createOfflineReissueRequest.rejected, (state, action) => {
        state.offlineCreateLoading = false;
        state.offlineError = action.payload?.message || action.payload;
      })

      // ── Offline assisted search ──
      .addCase(searchOfflineReissueOptions.pending, (state) => {
        state.offlineSearchLoading = true;
        state.offlineSearchError = null;
      })
      .addCase(searchOfflineReissueOptions.fulfilled, (state, action) => {
        state.offlineSearchLoading = false;
        state.offlineSearchResults = action.payload?.results || [];
        state.offlineSearchPagination =
          action.payload?.pagination || initialPagination;
      })
      .addCase(searchOfflineReissueOptions.rejected, (state, action) => {
        state.offlineSearchLoading = false;
        state.offlineSearchError = action.payload;
      })

      // ── Offline: fetch requests ──
      .addCase(fetchOfflineReissueRequests.pending, (state) => {
        state.offlineLoading = true;
        state.offlineError = null;
      })
      .addCase(fetchOfflineReissueRequests.fulfilled, (state, action) => {
        state.offlineLoading = false;
        // Offline controller returns { data: OfflineDto[], pagination: {} }
        const { data, pagination } = extractRequestsAndPagination(action.payload);
        state.offlineRequests = data;
        state.offlinePagination = pagination;
      })
      .addCase(fetchOfflineReissueRequests.rejected, (state, action) => {
        state.offlineLoading = false;
        state.offlineError = action.payload;
      })

      .addCase(fetchOfflineReissueRequestByBooking.pending, (state) => {
        state.bookingOfflineRequestLoading = true;
      })
      .addCase(fetchOfflineReissueRequestByBooking.fulfilled, (state, action) => {
        state.bookingOfflineRequestLoading = false;
        state.bookingOfflineRequest = action.payload;
      })
      .addCase(fetchOfflineReissueRequestByBooking.rejected, (state) => {
        state.bookingOfflineRequestLoading = false;
      });
  },
});

export const {
  resetReissueState,
  clearReissueDetail,
  clearEligibility,
  resetOfflineState,
  clearOfflineSearchState,
} = reissueSlice.actions;
export default reissueSlice.reducer;
