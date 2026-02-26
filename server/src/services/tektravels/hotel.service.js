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
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  /* =====================================================
     TOKEN HANDLING
  ====================================================== */
  isExpired(token) {
    return !token.value || Date.now() >= token.expiry;
  }

  async authenticate(type) {
    const cfg = config[type];

    try {
      const { data } = await axios.post(
        `${cfg.sharedBase}${cfg.endpoints.authenticate}`,
        {
          ClientId: cfg.credentials.clientId,
          UserName: cfg.credentials.username,
          Password: cfg.credentials.password,
          EndUserIp: cfg.endUserIp,
        },
        { timeout: config.timeout },
      );

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId || data.Token,
        expiry: Date.now() + 23 * 60 * 60 * 1000,
      };

      return this.tokens[type].value;
    } catch (err) {
      logger.error("TBO AUTH ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO authentication failed");
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* =====================================================
     STATIC API HELPER (Static Credentials)
  ====================================================== */
  async staticGet(endpoint, query = "") {
    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await axios.get(`${cfg.staticBase}${endpoint}${query}`, {
        auth: {
          username: cfg.credentials.tboUSerName,
          password: cfg.credentials.tboPassword,
        },
        timeout: config.timeout,
      });

      return data;
    } catch (err) {
      logger.error("TBO STATIC ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO static API failed");
    }
  }

  /* =====================================================
     AFFILIATE API HELPER (Search / PreBook)
     Basic Auth + Token
  ====================================================== */
  async affiliatePost(endpoint, payload) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    try {
      const { data } = await axios.post(
        `${cfg.base1}${endpoint}`,
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

      return data;
    } catch (err) {
      logger.error("TBO AFFILIATE ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO affiliate API failed");
    }
  }

  /* =====================================================
     TOKEN BASED POST (base / base2 selectable)
  ====================================================== */
  async tokenPost(endpoint, payload, baseType = "base") {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    try {
      const { data } = await axios.post(
        `${cfg[baseType]}${endpoint}`,
        {
          EndUserIp: cfg.endUserIp,
          TokenId: token,
          ...payload,
        },
        { timeout: config.timeout },
      );

      return data;
    } catch (err) {
      logger.error("TBO TOKEN ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO token API failed");
    }
  }

  /* =====================================================
     STATIC SERVICES
  ====================================================== */

  async getCountryList() {
    const env = this.getEnv();
    return this.staticGet(config[env].endpoints.countryList);
  }

  async getCityList(countryCode) {
    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await axios.post(
        `${cfg.staticBase}${cfg.endpoints.cityLIst}`,
        {
          CountryCode: countryCode,
        },
        {
          auth: {
            username: cfg.credentials.tboUSerName,
            password: cfg.credentials.tboPassword,
          },
          timeout: config.timeout,
        },
      );

      return data;
    } catch (err) {
      logger.error("TBO CITY POST ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO city API failed");
    }
  }

  async getTBOHotelCodeList(cityCode, pageIndex = 1) {
    if (!cityCode) throw new ApiError(400, "cityCode required");

    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await axios.post(
        `${cfg.staticBase}${cfg.endpoints.hotelCodeList}`,
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
    if (!hotelCode) throw new ApiError(400, "hotelCode required");

    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await axios.post(
        `${cfg.staticBase}${cfg.endpoints.hotelDetails}`,
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
     HOTEL SEARCH (base1 + Basic + Token)
  ====================================================== */
  async searchHotels(params) {
    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await axios.post(
        `${cfg.base1}${cfg.endpoints.hotelSearch}`,
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

      return data;
    } catch (err) {
      console.log("FULL ERROR:", err.response?.data || err.message);
      throw new ApiError(500, "TBO hotel search request failed");
    }
  }
  /* =====================================================
     HOTEL PRE BOOK (base1 + Basic + Token)
  ====================================================== */
  async preBookHotel(payload) {
    return this.affiliatePost(
      config[this.getEnv()].endpoints.hotelPreBook,
      payload,
    );
  }

  /* =====================================================
     HOTEL BOOK (base)
  ====================================================== */
  async bookHotel(payload) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.hotelBook,
      payload,
      "base",
    );
  }

  /* =====================================================
     GENERATE VOUCHER (base)
  ====================================================== */
  async generateVoucher(payload) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.generateVoucher,
      payload,
      "base",
    );
  }

  /* =====================================================
     DYNAMIC HOTEL DETAILS (base2)
  ====================================================== */
  async getHotelDetails(payload) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.hotelDetails,
      payload,
      "base2",
    );
  }
}

module.exports = new HotelService();
