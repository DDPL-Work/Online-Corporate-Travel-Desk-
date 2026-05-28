import { createSlice } from "@reduxjs/toolkit";
import {
  fetchReissueAnalytics,
  fetchReissueRequests,
  generateReissueTicket,
  reassignReissueRequest,
  updateReissueStatus,
} from "../Actions/reissueThunks";

const initialPagination = {
  total: 0,
  page: 1,
  pages: 1,
  limit: 10,
};

const initialState = {
  requests: [],
  pagination: initialPagination,
  analytics: null,
  currentRequest: null,
  loading: false,
  analyticsLoading: false,
  actionLoading: false,
  error: null,
  success: false,
};

const upsertRequest = (state, request) => {
  const requestId = request?.id;
  if (!requestId) return;

  const index = state.requests.findIndex((item) => item.id === requestId);
  if (index === -1) {
    state.requests.unshift(request);
  } else {
    state.requests[index] = request;
  }

  if (state.currentRequest?.id === requestId) {
    state.currentRequest = request;
  }
};

const reissueSlice = createSlice({
  name: "reissue",
  initialState,
  reducers: {
    resetReissueState: (state) => {
      state.error = null;
      state.success = false;
      state.actionLoading = false;
    },
    setCurrentReissueRequest: (state, action) => {
      state.currentRequest = action.payload || null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReissueRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReissueRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload?.data || [];
        state.pagination = action.payload?.pagination || initialPagination;
        state.analytics = action.payload?.metrics || null;
      })
      .addCase(fetchReissueRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateReissueStatus.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateReissueStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.success = true;
        upsertRequest(state, action.payload);
      })
      .addCase(updateReissueStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(generateReissueTicket.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(generateReissueTicket.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.success = true;
        upsertRequest(state, action.payload);
      })
      .addCase(generateReissueTicket.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(reassignReissueRequest.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(reassignReissueRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.success = true;
        upsertRequest(state, action.payload);
      })
      .addCase(reassignReissueRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchReissueAnalytics.pending, (state) => {
        state.analyticsLoading = true;
      })
      .addCase(fetchReissueAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchReissueAnalytics.rejected, (state) => {
        state.analyticsLoading = false;
      });
  },
});

export const { resetReissueState, setCurrentReissueRequest } =
  reissueSlice.actions;
export default reissueSlice.reducer;
