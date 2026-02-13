const axios = require("axios");
const config = require("../../config/tbo.hotel.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");
const { env } = require("../../config");

class HotelService {
  constructor() {
    this.tokens = {
      dummy: { value: null, expiry: 0 },
      live: { value: null, expiry: 0 },
    };
  }

  /* ---------------- ENV ---------------- */
  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  /* ---------------- TOKEN ---------------- */
  isExpired(token) {
    return !token.value || Date.now() >= token.expiry;
  }

  async authenticate(type) {
    const cfg = config[type];

    try {
      const payload = {
        ClientId: cfg.credentials.clientId,
        UserName: cfg.credentials.username,
        Password: cfg.credentials.password,
        EndUserIp: cfg.endUserIp,
      };

      const url = `${cfg.sharedBase || cfg.base}${cfg.endpoints.authenticate}`;
      const { data } = await axios.post(url, payload, {
        timeout: config.timeout,
      });

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId || data.Token,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
      };

      return this.tokens[type].value;
    } catch (err) {
      logger.error(
        `TBO ${type} auth error, err?.response?.data ` || err.message,
      );
      throw new ApiError(500, `TBO ${type} authentication failed`);
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* =====================================================
     HOTEL SEARCH
  ====================================================== */
  async searchHotels(params) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    // 🔹 Convert YYYY-MM-DD → DD/MM/YYYY
    const formatDate = (dateStr) => {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    // 🔹 Calculate NoOfNights
    const checkIn = new Date(params.checkInDate + "T00:00:00");
    const checkOut = new Date(params.checkOutDate + "T00:00:00");

    const diffTime = checkOut - checkIn;
    const noOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const payload = {
      EndUserIp: cfg.endUserIp,
      TokenId: token,

      CheckInDate: formatDate(params.checkInDate),
      NoOfNights: noOfNights.toString(),

      CountryCode: "IN",
      CityId: params.cityId,

      ResultCount: null,
      PreferredCurrency: params.currency || "INR",
      GuestNationality: params.nationality || "IN",

      NoOfRooms: params.noOfRooms?.toString() || "1",
      MaxRating: 5,
      MinRating: 0,
      ReviewScore: null,
      IsNearBySearchAllowed: false,

      RoomGuests: params.roomGuests.map((room) => ({
        NoOfAdults: room.NoOfAdults,
        NoOfChild: room.NoOfChild,
        ChildAge: room.NoOfChild > 0 ? room.ChildAge : null,
      })),
    };

    const { data } = await axios.post(
      `${cfg.base}${cfg.endpoints.hotelSearch}`,
      payload,
      { timeout: config.timeout },
    );

    return data;
  }

  /* =====================================================
     HOTEL DETAILS
  ====================================================== */
  async getHotelDetails(hotelCode, traceId, resultIndex) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    if (!hotelCode || !traceId) {
      throw new ApiError(400, "hotelCode and traceId are required");
    }

    return this.postLive(
      config[env].endpoints.hotelInfo,
      {
        EndUserIp: cfg.endUserIp,
        TokenId: token,
        HotelCode: hotelCode,
        ResultIndex: resultIndex,
        TraceId: traceId,
      },
      env,
    );
  }

  /* =====================================================
     ROOM INFO
  ====================================================== */
  async getRoomInfo(hotelCode, traceId, resultIndex) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);
    if (!hotelCode || !traceId || !resultIndex) {
      throw new ApiError(
        400,
        "hotelCode, resultIndex and traceId are required",
      );
    }

    return this.postLive(
      config[env].endpoints.hotelRoom,
      {
        EndUserIp: cfg.endUserIp,
        TokenId: token,
        HotelCode: hotelCode,
        ResultIndex: resultIndex,
        TraceId: traceId,
      },
      env,
    );
  }

  /* =====================================================
     HOTEL BOOK
  ====================================================== */
  async bookHotel({ traceId, hotelCode, roomIndex, guests }) {
    if (!traceId || !hotelCode || !roomIndex) {
      throw new ApiError(400, "Missing required booking parameters");
    }

    const payload = {
      TraceId: traceId,
      HotelCode: hotelCode,
      RoomIndex: roomIndex,
      GuestDetails: guests,
    };

    logger.info("TBO HOTEL BOOK PAYLOAD", JSON.stringify(payload, null, 2));

    const response = await this.postLive(
      config.live.endpoints.hotelBook,
      payload,
      "live",
    );

    if (response?.Status !== 1) {
      throw new ApiError(
        400,
        response?.Error?.ErrorMessage || "Hotel booking failed",
      );
    }

    return response;
  }

  /* =====================================================
     BOOKING DETAILS
  ====================================================== */
  async getBookingDetails(bookingId) {
    if (!bookingId) {
      throw new ApiError(400, "bookingId is required");
    }

    return this.postLive(
      config.live.endpoints.hotelBookingDetails,
      { BookingId: bookingId },
      "live",
    );
  }

  /* =====================================================
     CANCEL HOTEL
  ====================================================== */
  async cancelHotel(bookingId) {
    if (!bookingId) {
      throw new ApiError(400, "bookingId is required for cancellation");
    }

    return this.postLive(
      config.live.endpoints.hotelCancel,
      { BookingId: bookingId },
      "live",
    );
  }

  /* =====================================================
     GENERIC LIVE POST
  ====================================================== */
  async postLive(endpoint, payload, type = "live") {
    const token = await this.getToken(type);

    try {
      const { data } = await axios.post(
        `${config[type].base}${endpoint}`,
        {
          EndUserIp: config[type].endUserIp,
          TokenId: token,
          ...payload,
        },
        { timeout: config.timeout },
      );

      return data;
    } catch (err) {
      logger.error("TBO HOTEL ERROR", {
        status: err.response?.status,
        data: err.response?.data,
        payload,
      });

      throw new ApiError(
        500,
        err.response?.data?.Error?.ErrorMessage ||
          "TBO hotel live request failed",
      );
    }
  }
}

module.exports = new HotelService();
