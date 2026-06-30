// booking.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createBookingRequest,
  fetchMyBookings,
  fetchMyBookingById,
  cancelBooking,
  fetchMyBookingRequests,
  fetchMyBookingRequestById,
  fetchMyRejectedRequests,
  executeApprovedFlightBooking,
  fetchApprovedFlightBookingStatus,
  manualTicketNonLcc,
  instantFlightBooking,
  // ticketFlight,
} from "../Actions/booking.thunks";

const initialBookingLifecycle = {
  state: "idle",
  bookingId: null,
  message: null,
  payload: null,
  updatedAt: null,
};

const initialRevalidationMeta = {
  priceChange: null,
  ssrChange: null,
  notifications: [],
  revalidation: null,
  metadata: null,
};

const mapStatusToLifecycleState = (status) => {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "PROCESSING":
      return "processing";
    case "REVALIDATED":
      return "revalidated";
    case "PRICE_CHANGED":
      return "price_changed";
    case "SSR_CHANGED":
      return "ssr_changed";
    case "FLIGHT_UNAVAILABLE":
      return "flight_unavailable";
    case "FAILED":
      return "failed";
    default:
      return "idle";
  }
};

const buildLifecyclePayload = (payload = {}) => ({
  bookingContext: payload.bookingContext || null,
  status: payload.status || null,
  priceChange: payload.priceChange || null,
  ssrChange: payload.ssrChange || null,
  notifications: payload.notifications || [],
  revalidation: payload.revalidation || null,
  metadata: payload.metadata || null,
  executionStatus: payload.executionStatus || null,
  pnr: payload.pnr || null,
});

const syncBookingExecutionStatus = (collection = [], bookingId, executionStatus) =>
  collection.map((item) =>
    item._id === bookingId ? { ...item, executionStatus } : item,
  );

const syncSelectedBookingOutcome = (state, bookingId, executionStatus, pnr) => {
  if (!bookingId || !executionStatus) {
    return;
  }

  if (state.selected?._id === bookingId) {
    state.selected = {
      ...state.selected,
      executionStatus,
      bookingResult: pnr
        ? {
            ...(state.selected?.bookingResult || {}),
            pnr,
          }
        : state.selected?.bookingResult,
    };
  }

  state.list = syncBookingExecutionStatus(state.list, bookingId, executionStatus);
  state.myRequests = syncBookingExecutionStatus(
    state.myRequests,
    bookingId,
    executionStatus,
  );
};

const applyLifecycleState = (state, bookingId, payload = {}) => {
  const normalizedPayload = buildLifecyclePayload(payload);

  state.revalidatedBookingContext = normalizedPayload.bookingContext;
  state.revalidatedBookingStatus = normalizedPayload.status;
  state.revalidationMeta = {
    priceChange: normalizedPayload.priceChange,
    ssrChange: normalizedPayload.ssrChange,
    notifications: normalizedPayload.notifications,
    revalidation: normalizedPayload.revalidation,
    metadata: normalizedPayload.metadata,
  };
  state.bookingLifecycle = {
    state: mapStatusToLifecycleState(payload.status),
    bookingId: bookingId || payload.bookingRequestId || state.selected?._id || null,
    message: payload.message || null,
    payload: normalizedPayload,
    updatedAt: new Date().toISOString(),
  };

  syncSelectedBookingOutcome(
    state,
    bookingId || payload.bookingRequestId,
    payload.executionStatus,
    payload.pnr,
  );
};

const applyLifecycleSnapshotFromBooking = (state, booking = null) => {
  const bookingId = booking?._id || null;
  const pendingRevalidation = booking?.orchestration?.pendingRevalidation || null;
  const lastOutcome = booking?.orchestration?.lastOutcome || null;

  if (booking?.orchestration?.processing) {
    applyLifecycleState(state, bookingId, {
      status: "PROCESSING",
      executionStatus: booking.executionStatus,
      message: lastOutcome?.message || "Booking is being processed",
      bookingContext: pendingRevalidation?.bookingContext || null,
      priceChange: pendingRevalidation?.priceChange || null,
      ssrChange: pendingRevalidation?.ssrChange || null,
      notifications: pendingRevalidation?.notifications || [],
      revalidation: pendingRevalidation,
      pnr: booking?.bookingResult?.pnr || booking?.pnr || null,
    });
    return;
  }

  if (lastOutcome?.status) {
    applyLifecycleState(state, bookingId, {
      ...lastOutcome,
      executionStatus: booking.executionStatus,
      bookingContext:
        lastOutcome.bookingContext || pendingRevalidation?.bookingContext || null,
      priceChange: lastOutcome.priceChange || pendingRevalidation?.priceChange || null,
      ssrChange: lastOutcome.ssrChange || pendingRevalidation?.ssrChange || null,
      notifications: lastOutcome.notifications || pendingRevalidation?.notifications || [],
      revalidation: lastOutcome.revalidation || pendingRevalidation,
      pnr: booking?.bookingResult?.pnr || booking?.pnr || null,
    });
    return;
  }

  if (pendingRevalidation?.status) {
    applyLifecycleState(state, bookingId, {
      status: pendingRevalidation.status,
      executionStatus: booking.executionStatus,
      bookingContext: pendingRevalidation.bookingContext || null,
      priceChange: pendingRevalidation.priceChange || null,
      ssrChange: pendingRevalidation.ssrChange || null,
      notifications: pendingRevalidation.notifications || [],
      revalidation: pendingRevalidation,
      pnr: booking?.bookingResult?.pnr || booking?.pnr || null,
    });
    return;
  }

  if (
    ["booked", "ticket_pending", "ticketed"].includes(booking?.executionStatus) &&
    (booking?.bookingResult?.pnr || booking?.pnr || booking?.bookingResult?.onwardPNR)
  ) {
    applyLifecycleState(state, bookingId, {
      status: "SUCCESS",
      executionStatus: booking.executionStatus,
      pnr:
        booking?.bookingResult?.pnr ||
        booking?.pnr ||
        booking?.bookingResult?.onwardPNR ||
        null,
    });
    return;
  }

  state.revalidatedBookingContext = null;
  state.revalidatedBookingStatus = null;
  state.revalidationMeta = initialRevalidationMeta;
  state.bookingLifecycle = {
    ...initialBookingLifecycle,
    bookingId,
    updatedAt: new Date().toISOString(),
  };
};

const initialState = {
  list: [],
  myRequests: [],
  myRejected: [],
  pagination: null,
  selected: null,
  manualTicketStatus: null,
  manualTicketLoading: false,
  loading: false,
  actionLoading: false,
  error: null,
  errorCode: null,       // HTTP status code for UI differentiation (409, 500, etc.)
  revalidatedBookingContext: null,
  revalidatedBookingStatus: null,
  revalidationMeta: initialRevalidationMeta,
  bookingLifecycle: initialBookingLifecycle,
};

const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    clearSelectedBookingRequest(state) {
      state.selected = null;
    },
    clearRevalidatedBookingContext(state) {
      state.revalidatedBookingContext = null;
      state.revalidatedBookingStatus = null;
      state.revalidationMeta = initialRevalidationMeta;
    },
    resetBookingLifecycle(state) {
      state.bookingLifecycle = initialBookingLifecycle;
    },
    clearBookingError(state) {
      state.error = null;
      state.errorCode = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBookingRequest.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createBookingRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;
      })
      .addCase(createBookingRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload?.message || action.payload;
        state.errorCode = action.payload?.statusCode || null;
      })

      /* ================= INSTANT FLIGHT BOOKING ================= */
      .addCase(instantFlightBooking.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(instantFlightBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;
      })
      .addCase(instantFlightBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload?.message || action.payload;
        state.errorCode = action.payload?.statusCode || null;
      })

      /* ================= FETCH MY REQUESTS (EMPLOYEE) ================= */
      .addCase(fetchMyBookingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests = action.payload || [];
      })
      .addCase(fetchMyBookingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyBookingRequestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookingRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
        applyLifecycleSnapshotFromBooking(state, action.payload);
      })
      .addCase(fetchMyBookingRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyRejectedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRejectedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myRejected = action.payload || [];
      })
      .addCase(fetchMyRejectedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(executeApprovedFlightBooking.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(executeApprovedFlightBooking.fulfilled, (state, action) => {
        state.actionLoading = false;

        const bookingId =
          action.payload?.bookingRequestId ||
          (typeof action.meta.arg === "string"
            ? action.meta.arg
            : action.meta.arg?.bookingId) ||
          state.selected?._id ||
          null;

        applyLifecycleState(state, bookingId, action.payload);
      })
      .addCase(executeApprovedFlightBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload?.message || action.payload;
        state.errorCode = action.payload?.statusCode || null;
      })

      .addCase(fetchApprovedFlightBookingStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchApprovedFlightBookingStatus.fulfilled, (state, action) => {
        const bookingId = action.payload?.bookingRequestId || action.meta.arg || null;
        applyLifecycleState(state, bookingId, action.payload);
      })
      .addCase(fetchApprovedFlightBookingStatus.rejected, (state, action) => {
        state.error = action.payload?.message || action.payload;
      })

      .addCase(manualTicketNonLcc.pending, (state) => {
        state.manualTicketLoading = true;
        state.error = null;
        state.manualTicketStatus = "pending";
      })
      .addCase(manualTicketNonLcc.fulfilled, (state, action) => {
        state.manualTicketLoading = false;
        state.manualTicketStatus = "success";

        const { bookingId, status } = action.payload;

        if (state.selected?._id === bookingId) {
          state.selected.executionStatus = status;
        }

        const idx = state.list.findIndex((booking) => booking._id === bookingId);
        if (idx !== -1) {
          state.list[idx].executionStatus = status;
        }

        const reqIdx = state.myRequests.findIndex((booking) => booking._id === bookingId);
        if (reqIdx !== -1) {
          state.myRequests[reqIdx].executionStatus = status;
        }
      })
      .addCase(manualTicketNonLcc.rejected, (state, action) => {
        state.manualTicketLoading = false;
        state.manualTicketStatus = "failed";
        state.error = action.payload?.message || action.payload;
        state.errorCode = action.payload?.statusCode || null;
      })

      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.bookings;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyBookingById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
        applyLifecycleSnapshotFromBooking(state, action.payload);
      })
      .addCase(fetchMyBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(cancelBooking.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;

        const idx = state.list.findIndex((booking) => booking._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedBookingRequest,
  clearRevalidatedBookingContext,
  resetBookingLifecycle,
  clearBookingError,
} = bookingSlice.actions;
export const selectMyRejectedRequests = (state) => state.bookings.myRejected;

export default bookingSlice.reducer;
