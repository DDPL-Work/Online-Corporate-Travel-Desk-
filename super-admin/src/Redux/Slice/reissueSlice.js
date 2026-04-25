import { createSlice } from "@reduxjs/toolkit";
import {
  createReissueRequest,
  fetchReissueRequests,
  updateReissueStatus,
  executeReissue,
} from "../Actions/reissueThunks";

const initialState = {
  requests: [],
  pagination: null,
  loading: false,
  executing: false,
  error: null,
  success: false,
};

const reissueSlice = createSlice({
  name: "reissue",
  initialState,
  reducers: {
    resetReissueState: (state) => {
      state.loading = false;
      state.executing = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchReissueRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReissueRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReissueRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createReissueRequest.pending, (state) => {
        state.loading = true;
        state.success = false;
      })
      .addCase(createReissueRequest.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createReissueRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Status
      .addCase(updateReissueStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateReissueStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.requests.findIndex(r => r._id === action.payload.data._id);
        if (index !== -1) {
            state.requests[index] = action.payload.data;
        }
      })
      .addCase(updateReissueStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Execute
      .addCase(executeReissue.pending, (state) => {
        state.executing = true;
      })
      .addCase(executeReissue.fulfilled, (state, action) => {
        state.executing = false;
        const index = state.requests.findIndex(r => r._id === action.payload.data._id);
        if (index !== -1) {
            state.requests[index] = action.payload.data;
        }
      })
      .addCase(executeReissue.rejected, (state, action) => {
        state.executing = false;
        state.error = action.payload;
      });
  },
});

export const { resetReissueState } = reissueSlice.actions;
export default reissueSlice.reducer;
