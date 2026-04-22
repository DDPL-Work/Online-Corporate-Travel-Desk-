//hotel.service.js

const axios = require("axios");
const config = require("../../config/tbo.hotel.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

class HotelService {
  constructor() {
    this.tokens = {
      dummy: { value: null, expiry: 0 },
      live: { value: null, expiry: 0 },
    };
  }

  /* =====================================================
     ENV
  ====================================================== */
  getEnv() {
    const env = process.env.NODE_ENV === "production" ? "live" : "dummy";
    logger.info("[ENV]", env);
    return env;
  }

  /* =====================================================
     TOKEN HANDLING
  ====================================================== */
  isExpired(token) {
    const expired = !token.value || Date.now() >= token.expiry;
    logger.info("[TOKEN EXPIRED CHECK]", expired);
    return expired;
  }

  async authenticate(type) {
    const cfg = config[type];
    const url = `${cfg.sharedBase}${cfg.endpoints.authenticate}`;

    logger.info("[AUTH REQUEST]", {
      url,
      clientId: cfg.credentials.clientId,
      username: cfg.credentials.username,
    });

    try {
      const { data } = await axios.post(
        url,
        {
          ClientId: cfg.credentials.clientId,
          UserName: cfg.credentials.username,
          Password: cfg.credentials.password,
          EndUserIp: cfg.endUserIp,
        },
        { timeout: config.timeout },
      );

      logger.info("[AUTH RESPONSE]", data);

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId || data.Token,
        expiry: Date.now() + 25 * 60 * 1000,
      };

      logger.info("[TOKEN STORED]", this.tokens[type]);

      return this.tokens[type].value;
    } catch (err) {
      logger.error("TBO AUTH ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO authentication failed");
    }
  }

  async getToken(type) {
    logger.info("[GET TOKEN]", type);

    if (this.isExpired(this.tokens[type])) {
      logger.info("[TOKEN REFRESH]");
      await this.authenticate(type);
    }

    logger.info("[TOKEN USED]", this.tokens[type].value);
    return this.tokens[type].value;
  }

  /* =====================================================
     STATIC API HELPER (Static Credentials)
  ====================================================== */
  async staticGet(endpoint, query = "") {
    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg.staticBase}${endpoint}${query}`;

    logger.info("[STATIC GET REQUEST]", {
      url,
      username: cfg.credentials.tboUSerName,
    });

    try {
      const { data } = await axios.get(url, {
        auth: {
          username: cfg.credentials.tboUSerName,
          password: cfg.credentials.tboPassword,
        },
        timeout: config.timeout,
      });

      logger.info("[STATIC GET RESPONSE]", data);

      return data;
    } catch (err) {
      logger.error("TBO STATIC ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO static API failed");
    }
  }

  /* =====================================================
     AFFILIATE API HELPER
  ====================================================== */
  async affiliatePost(endpoint, payload) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);
    const url = `${cfg.base1}${endpoint}`;

    logger.info("[AFFILIATE REQUEST]", {
      url,
      payload,
      token,
    });

    try {
      const { data } = await axios.post(
        url,
        {
          EndUserIp: cfg.endUserIp,
          TokenId: token,
          ...payload,
        },
        {
          auth: {
            username: cfg.credentials.username,
            password: cfg.credentials.password,
          },
          timeout: config.timeout,
        },
      );

      logger.info("[AFFILIATE RESPONSE]", data);

      return data;
    } catch (err) {
      logger.error("TBO AFFILIATE ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO affiliate API failed");
    }
  }

  /* =====================================================
     TOKEN BASED POST
  ====================================================== */
  async tokenPost(endpoint, payload, baseType = "base") {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);
    const url = `${cfg[baseType]}${endpoint}`;

    logger.info("[TOKEN POST REQUEST]", {
      url,
      payload,
      token,
    });

    try {
      const base64Auth = Buffer.from(
        `${cfg.credentials.username}:${cfg.credentials.password}`,
      ).toString("base64");

      const { data } = await axios.post(
        url,
        {
          EndUserIp: cfg.endUserIp,
          TokenId: token,
          ...payload,
        },
        {
          timeout: config.timeout,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${base64Auth}`,
            TokenId: token,
            ClientId: cfg.credentials.clientId,
          },
        },
      );

      logger.info("[TOKEN POST RESPONSE]", data);

      return data;
    } catch (err) {
      logger.error("TBO TOKEN ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO token API failed");
    }
  }

  async basicAuthPost(endpoint, payload, baseType = "base") {
    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg[baseType]}${endpoint}`;

    logger.info("[BASIC AUTH REQUEST]", {
      url,
      payload,
    });

    const base64Auth = Buffer.from(
      `${cfg.credentials.username}:${cfg.credentials.password}`
    ).toString("base64");

    try {
      const { data } = await axios.post(
        url,
        {
          EndUserIp: cfg.endUserIp,
          ...payload,
        },
        {
          timeout: config.timeout,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${base64Auth}`,
            ClientId: cfg.credentials.clientId,
          },
        }
      );

      logger.info("[BASIC AUTH RESPONSE]", data);

      return data;
    } catch (err) {
      console.log(
        "HOTEL BOOK ERROR:",
        JSON.stringify(err.response?.data, null, 2)
      );
      throw new ApiError(500, "TBO hotel booking failed");
    }
  }

  /* =====================================================
     STATIC SERVICES
  ====================================================== */

  async getCountryList() {
    // logger.info("[GET COUNTRY LIST]");
    const env = this.getEnv();
    return this.staticGet(config[env].endpoints.countryList);
  }

  async getCityList(countryCode) {
    // logger.info("[GET CITY LIST]", { countryCode });

    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg.staticBase}${cfg.endpoints.cityLIst}`;

    try {
      const { data } = await axios.post(
        url,
        { CountryCode: countryCode },
        {
          auth: {
            username: cfg.credentials.tboUSerName,
            password: cfg.credentials.tboPassword,
          },
          timeout: config.timeout,
        },
      );

      // logger.info("[CITY LIST RESPONSE]", data);

      return data;
    } catch (err) {
      logger.error("TBO CITY POST ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO city API failed");
    }
  }

  async getTBOHotelCodeList(cityCode, pageIndex = 1) {
    logger.info("[GET HOTEL CODE LIST]", { cityCode, pageIndex });

    if (!cityCode) throw new ApiError(400, "cityCode required");

    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg.staticBase}${cfg.endpoints.hotelCodeList}`;

    try {
      const { data } = await axios.post(
        url,
        {
          CityCode: cityCode,
          PageIndex: pageIndex,
        },
        {
          auth: {
            username: cfg.credentials.tboUSerName,
            password: cfg.credentials.tboPassword,
          },
          timeout: config.timeout,
        },
      );

      // logger.info("[HOTEL CODE LIST RESPONSE]", data);

      return data;
    } catch (err) {
      logger.error(
        "TBO HOTEL CODE LIST ERROR",
        err.response?.data || err.message,
      );
      throw new ApiError(500, "TBO hotel code list failed");
    }
  }

  async getStaticHotelDetails(hotelCode) {
    // logger.info("[GET STATIC HOTEL DETAILS]", { hotelCode });

    if (!hotelCode) throw new ApiError(400, "hotelCode required");

    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg.staticBase}${cfg.endpoints.hotelDetails}`;

    try {
      const { data } = await axios.post(
        url,
        {
          Hotelcodes: hotelCode,
        },
        {
          auth: {
            username: cfg.credentials.tboUSerName,
            password: cfg.credentials.tboPassword,
          },
          timeout: config.timeout,
        },
      );

      // logger.info("[STATIC HOTEL DETAILS RESPONSE]", data);

      return data;
    } catch (err) {
      console.log(
        "STATIC HOTEL DETAILS ERROR:",
        err.response?.data || err.message,
      );
      throw new ApiError(500, "TBO static hotel details failed");
    }
  }

  /* =====================================================
     HOTEL SEARCH
  ====================================================== */
  async searchHotels(params) {
    logger.info("[HOTEL SEARCH]", params);

    const env = this.getEnv();
    const cfg = config[env];
    const url = `${cfg.base1}${cfg.endpoints.hotelSearch}`;

    try {
      const { data } = await axios.post(
        url,
        {
          CheckIn: params.CheckIn,
          CheckOut: params.CheckOut,
          HotelCodes: params.HotelCodes,
          GuestNationality: params.GuestNationality || "IN",
          NoOfRooms: params.NoOfRooms,
          PaxRooms: params.PaxRooms,
          IsDetailedResponse: true,
          Filters: {
            Refundable: false,
            MealType: "All",
          },
        },
        {
          auth: {
            username: cfg.credentials.username,
            password: cfg.credentials.password,
          },
          timeout: config.timeout,
        },
      );

      logger.info("[HOTEL SEARCH RESPONSE]", data);

      return data;
    } catch (err) {
      console.log("FULL ERROR:", err.response?.data || err.message);
      throw new ApiError(500, "TBO hotel search request failed");
    }
  }

  /* =====================================================
     HOTEL PRE BOOK
  ====================================================== */
  async preBookHotel(payload) {
    logger.info("[PREBOOK HOTEL]", payload);
    return this.affiliatePost(
      config[this.getEnv()].endpoints.hotelPreBook,
      payload,
    );
  }

  /* =====================================================
     HOTEL BOOK
  ====================================================== */
  async bookHotel(payload) {
    logger.info("[BOOK HOTEL]", payload);
    return this.basicAuthPost(
      config[this.getEnv()].endpoints.hotelBook,
      payload,
      "base",
    );
  }

  /* =====================================================
     GENERATE VOUCHER
  ====================================================== */
  async generateVoucher(payload) {
    logger.info("[GENERATE VOUCHER]", payload);
    return this.tokenPost(
      config[this.getEnv()].endpoints.generateVoucher,
      payload,
      "base",
    );
  }

  /* =====================================================
     BOOKING DETAILS
  ====================================================== */
  async getBookingDetails({ bookingId, confirmationNo, traceId, firstName, lastName }) {
    const payload = {};

    if (bookingId) {
      payload.BookingId = Number(bookingId);
    } 
    else if (confirmationNo) {
      payload.ConfirmationNo = confirmationNo;
      payload.FirstName = firstName;
      payload.LastName = lastName;
    } 
    else if (traceId) {
      payload.TraceId = traceId;
    } 
    else {
      throw new ApiError(400, "No valid identifier provided");
    }

    logger.info("[BOOKING DETAILS REQUEST]", payload);

    return this.tokenPost(
      config[this.getEnv()].endpoints.getBookingDetails,
      payload,
      "base2"
    );
  }
}

module.exports = new HotelService();