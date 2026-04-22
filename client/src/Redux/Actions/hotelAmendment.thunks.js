import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

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


