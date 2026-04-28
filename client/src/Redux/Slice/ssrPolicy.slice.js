// client/src/Redux/Slice/ssrPolicy.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  fetchMySSRPolicy,
  fetchPolicyByEmail,
  fetchAllSSRPolicies,
  upsertSSRPolicy,
  deleteSSRPolicy,
} from "../Actions/ssrPolicy.thunks";

const initialState = {
  // Employee's own policy (loaded at SSR modal open)
  myPolicy: null,
  myPolicyLoading: false,
  myPolicyError: null,

  // Admin: looked-up employee + policy
  lookedUp: null,          // { employee, policy, isNewPolicy }
  lookupLoading: false,
  lookupError: null,

  // Admin: list of all policies
  policies: [],
  listLoading: false,
  listError: null,

  // Save / delete status
  saving: false,
  saveError: null,
  saveSuccess: false,

  deleting: false,
};

const ssrPolicySlice = createSlice({
  name: "ssrPolicy",
  initialState,
  reducers: {
    clearLookup(state) {
      state.lookedUp = null;
      state.lookupError = null;
    },
    clearSaveState(state) {
      state.saveError = null;
      state.saveSuccess = false;
    },
  },
  extraReducers: (builder) => {
    // ── My policy ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchMySSRPolicy.pending, (state) => {
        state.myPolicyLoading = true;
        state.myPolicyError = null;
      })
      .addCase(fetchMySSRPolicy.fulfilled, (state, { payload }) => {
        state.myPolicyLoading = false;
        state.myPolicy = payload;
      })
      .addCase(fetchMySSRPolicy.rejected, (state, { payload }) => {
        state.myPolicyLoading = false;
        state.myPolicyError = payload;
        // Default restricted policy on error
        state.myPolicy = {
          allowSeat: false, allowMeal: false, allowBaggage: false,
          seatPriceRange: { min: 0, max: 99999 },
          mealPriceRange: { min: 0, max: 99999 },
          baggagePriceRange: { min: 0, max: 99999 },
          approvalRequired: true,
          isDefault: true,
        };
      });

    // ── Lookup by email ────────────────────────────────────────────────────
    builder
      .addCase(fetchPolicyByEmail.pending, (state) => {
        state.lookupLoading = true;
        state.lookupError = null;
      })
      .addCase(fetchPolicyByEmail.fulfilled, (state, { payload }) => {
        state.lookupLoading = false;
        state.lookedUp = payload;
      })
      .addCase(fetchPolicyByEmail.rejected, (state, { payload }) => {
        state.lookupLoading = false;
        state.lookupError = payload;
      });

    // ── List all ───────────────────────────────────────────────────────────
    builder
      .addCase(fetchAllSSRPolicies.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchAllSSRPolicies.fulfilled, (state, { payload }) => {
        state.listLoading = false;
        state.policies = payload;
      })
      .addCase(fetchAllSSRPolicies.rejected, (state, { payload }) => {
        state.listLoading = false;
        state.listError = payload;
      });

    // ── Upsert ─────────────────────────────────────────────────────────────
    builder
      .addCase(upsertSSRPolicy.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(upsertSSRPolicy.fulfilled, (state, { payload }) => {
        state.saving = false;
        state.saveSuccess = true;
        // Refresh the list item in place
        const idx = state.policies.findIndex(
          (p) => p._id === payload._id
        );
        if (idx >= 0) state.policies[idx] = payload;
        else state.policies.unshift(payload);
      })
      .addCase(upsertSSRPolicy.rejected, (state, { payload }) => {
        state.saving = false;
        state.saveError = payload;
      });

    // ── Delete ─────────────────────────────────────────────────────────────
    builder
      .addCase(deleteSSRPolicy.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteSSRPolicy.fulfilled, (state, { payload }) => {
        state.deleting = false;
        state.policies = state.policies.filter((p) => p._id !== payload);
      })
      .addCase(deleteSSRPolicy.rejected, (state) => {
        state.deleting = false;
      });
  },
});

export const { clearLookup, clearSaveState } = ssrPolicySlice.actions;
export default ssrPolicySlice.reducer;
