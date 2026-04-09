import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

const getToken = () => localStorage.getItem("token");

// ==============================
// GET BALANCE
// ==============================
export const fetchPostpaidBalance = createAsyncThunk(
  "postpaid/fetchBalance",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/balance", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data; // { success, balance }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch balance",
      );
    }
  },
);

// ==============================
// GET TRANSACTIONS
// ==============================
export const fetchPostpaidTransactions = createAsyncThunk(
  "postpaid/fetchTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/transactions", {
        params,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data; // { success, pagination, transactions }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch transactions",
      );
    }
  },
);
