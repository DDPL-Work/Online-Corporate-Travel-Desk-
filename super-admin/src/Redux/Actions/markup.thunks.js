import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../API/axios";

// Fetch Airlines List
export const fetchAirlines = createAsyncThunk(
  "markup/fetchAirlines",
  async ({ search = "", limit = 100 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/markup/airlines", {
        params: { search, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch airlines"
      );
    }
  }
);
export const fetchCountries = createAsyncThunk(
  "markup/fetchCountries",
  async ({ search = "", limit = 100 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/markup/countries", {
        params: { search, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch countries"
      );
    }
  }
);

export const fetchCities = createAsyncThunk(
  "markup/fetchCities",
  async ({ search = "", limit = 100 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/markup/cities", {
        params: { search, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch cities"
      );
    }
  }
);

export const fetchHotels = createAsyncThunk(
  "markup/fetchHotels",
  async ({ search = "", cityCode = "", limit = 100 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/markup/hotels", {
        params: { search, cityCode, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch hotels"
      );
    }
  }
);

export const fetchAirports = createAsyncThunk(
  "markup/fetchAirports",
  async ({ search = "", limit = 100 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/markup/airports", {
        params: { search, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch airports"
      );
    }
  }
);

export const saveCorporateMarkup = createAsyncThunk(
  "markup/saveCorporateMarkup",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post("/markup/save", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save markup configuration"
      );
    }
  }
);

export const getAllCorporateMarkups = createAsyncThunk(
  "markup/getAllCorporateMarkups",
  async (corporateId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/markup/corporate/all?corporateId=${corporateId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch markup configurations"
      );
    }
  }
);

export const deleteCorporateMarkup = createAsyncThunk(
  "markup/deleteCorporateMarkup",
  async ({ corporateId, productType }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`/markup/corporate`, {
        data: { corporateId, productType }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete markup configuration"
      );
    }
  }
);
