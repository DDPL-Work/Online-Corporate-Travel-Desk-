import { createSlice } from "@reduxjs/toolkit";
import {
  checkReissueEligibility,
  confirmReissueRequest,
  createOfflineReissueRequest,
  createReissueRequest,
  fetchOfflineReissueRequestByBooking,
  fetchOfflineReissueRequests,
  fetchReissueRequestById,
  fetchReissueRequests,
  previewReissueQuote,
  searchOfflineReissueOptions,
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

  // ── Online reissue ──
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
};

const upsertRequest = (state, request) => {
  if (!request?.id) return;
  const index = state.requests.findIndex((item) => item.id === request.id);
  if (index === -1) {
    state.requests.unshift(request);
  } else {
    state.requests[index] = request;
  }
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

      // ── Online: fetch requests ──
      .addCase(fetchReissueRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReissueRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload?.data || [];
        state.pagination = action.payload?.pagination || initialPagination;
      })
      .addCase(fetchReissueRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
        state.offlineRequests.unshift(action.payload);
        state.bookingOfflineRequest = action.payload;
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
        state.offlineSearchResults = action.payload.results || [];
        state.offlineSearchPagination = action.payload.pagination || initialPagination;
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
        state.offlineRequests = action.payload?.data || [];
        state.offlinePagination = action.payload?.pagination || initialPagination;
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
