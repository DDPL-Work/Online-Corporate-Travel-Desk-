import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  amendBooking,
  fetchChangeStatus,
  releasePNR,
  createCancellationQuery,
  fetchCancellationQueries,
  fetchCancellationQueryDetails,
} from "../Actions/amendmentThunks";

const initialState = {
  loading: false,
  error: null,
  charges: null,
  cancellationResult: null,
  amendmentResult: null,
  changeStatus: null,
  releaseResult: null,

   queryLoading: false,
  queryError: null,
  querySuccess: false,
  queryData: null,

  queries: [],
  queriesLoading: false,
  queriesError: null,

  currentQuery: null,
  currentQueryLoading: false,
  currentQueryError: null,
};

const amendmentSlice = createSlice({
  name: "amendment",
  initialState,
  reducers: {
    resetAmendmentState: (state) => {
      state.loading = false;
      state.error = null;
      state.charges = null;
      state.cancellationResult = null;
      state.amendmentResult = null;
      state.changeStatus = null;
      state.releaseResult = null;

      state.queryLoading = false;
      state.queryError = null;
      state.querySuccess = false;
      state.queryData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ========= Charges ========= */
      .addCase(fetchCancellationCharges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCancellationCharges.fulfilled, (state, action) => {
        state.loading = false;
        state.charges = action.payload;
      })
      .addCase(fetchCancellationCharges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ========= Full / Partial Cancel ========= */
      .addCase(fullCancellation.fulfilled, (state, action) => {
        state.cancellationResult = action.payload;
      })
      .addCase(partialCancellation.fulfilled, (state, action) => {
        state.cancellationResult = action.payload;
      })

      /* ========= Amendment ========= */
      .addCase(amendBooking.fulfilled, (state, action) => {
        state.amendmentResult = action.payload;
      })

      /* ========= Status ========= */
      .addCase(fetchChangeStatus.fulfilled, (state, action) => {
        state.changeStatus = action.payload;
      })

      /* ========= Release ========= */
      .addCase(releasePNR.fulfilled, (state, action) => {
        state.releaseResult = action.payload;
      })

      .addCase(createCancellationQuery.pending, (state) => {
        state.queryLoading = true;
        state.queryError = null;
        state.querySuccess = false;
      })
      .addCase(createCancellationQuery.fulfilled, (state, action) => {
        state.queryLoading = false;
        state.querySuccess = true;
        state.queryData = action.payload;
      })
      .addCase(createCancellationQuery.rejected, (state, action) => {
        state.queryLoading = false;
        state.queryError = action.payload;
        state.querySuccess = false;
      })
      
      .addCase(fetchCancellationQueries.pending, (state) => {
        state.queriesLoading = true;
        state.queriesError = null;
      })
      .addCase(fetchCancellationQueries.fulfilled, (state, action) => {
        state.queriesLoading = false;
        state.queries = action.payload || [];
      })
      .addCase(fetchCancellationQueries.rejected, (state, action) => {
        state.queriesLoading = false;
        state.queriesError = action.payload;
      })
      
      .addCase(fetchCancellationQueryDetails.pending, (state) => {
        state.currentQueryLoading = true;
        state.currentQueryError = null;
      })
      .addCase(fetchCancellationQueryDetails.fulfilled, (state, action) => {
        state.currentQueryLoading = false;
        state.currentQuery = action.payload;
      })
      .addCase(fetchCancellationQueryDetails.rejected, (state, action) => {
        state.currentQueryLoading = false;
        state.currentQueryError = action.payload;
      });
  },
});

export const { resetAmendmentState } = amendmentSlice.actions;
export default amendmentSlice.reducer;
