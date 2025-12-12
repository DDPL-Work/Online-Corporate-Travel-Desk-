const axios = require('axios');
const config = require('../config/tbo.config');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

class TBOService {
  constructor() {
    this.tokenData = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.authenticate}`,
        {
          ClientId: config.credentials.username,
          UserName: config.credentials.username,
          Password: config.credentials.password,
          EndUserIp: config.endUserIp
        }
      );

      if (response.data.Status === 1) {
        this.tokenData = response.data.TokenId;
        this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        return this.tokenData;
      }

      throw new ApiError(500, 'TBO Authentication failed');
    } catch (error) {
      logger.error('TBO Authentication Error:', error);
      throw new ApiError(500, 'Failed to authenticate with TBO API');
    }
  }

  async getToken() {
    if (!this.tokenData || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.tokenData;
  }

  async searchFlights(searchParams) {
    try {
      const token = await this.getToken();
      
      const payload = {
        EndUserIp: config.endUserIp,
        TokenId: token,
        AdultCount: searchParams.adults || 1,
        ChildCount: searchParams.children || 0,
        InfantCount: searchParams.infants || 0,
        DirectFlight: searchParams.directFlight || false,
        OneStopFlight: searchParams.oneStop || false,
        JourneyType: searchParams.journeyType || 1, // 1: OneWay, 2: Return
        PreferredAirlines: searchParams.preferredAirlines || null,
        Segments: [
          {
            Origin: searchParams.origin,
            Destination: searchParams.destination,
            FlightCabinClass: searchParams.cabinClass || 1, // 1: All, 2: Economy, 3: Business, 4: First
            PreferredDepartureTime: searchParams.departureTime || '',
            PreferredArrivalTime: searchParams.arrivalTime || ''
          }
        ],
        Sources: null
      };

      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.flightSearch}`,
        payload,
        { timeout: config.timeout }
      );

      if (response.data.Response.Error.ErrorCode === 0) {
        return {
          success: true,
          traceId: response.data.Response.TraceId,
          results: response.data.Response.Results
        };
      }

      throw new ApiError(400, response.data.Response.Error.ErrorMessage);
    } catch (error) {
      logger.error('TBO Flight Search Error:', error);
      throw error;
    }
  }

  async getFareQuote(traceId, resultIndex) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.flightFareQuote}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          TraceId: traceId,
          ResultIndex: resultIndex
        }
      );

      if (response.data.Response.Error.ErrorCode === 0) {
        return response.data.Response.Results;
      }

      throw new ApiError(400, response.data.Response.Error.ErrorMessage);
    } catch (error) {
      logger.error('TBO Fare Quote Error:', error);
      throw error;
    }
  }

  async bookFlight(bookingData) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.flightBook}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          TraceId: bookingData.traceId,
          ResultIndex: bookingData.resultIndex,
          Passengers: bookingData.passengers,
          ...bookingData
        },
        { timeout: 60000 } // 60 seconds for booking
      );

      if (response.data.Response.Error.ErrorCode === 0) {
        return response.data.Response;
      }

      throw new ApiError(400, response.data.Response.Error.ErrorMessage);
    } catch (error) {
      logger.error('TBO Flight Book Error:', error);
      throw error;
    }
  }

  async ticketFlight(bookingId, pnr) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.flightTicket}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          BookingId: bookingId,
          PNR: pnr
        }
      );

      return response.data.Response;
    } catch (error) {
      logger.error('TBO Flight Ticket Error:', error);
      throw error;
    }
  }

  async searchHotels(searchParams) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.hotelSearch}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          CheckInDate: searchParams.checkInDate,
          NoOfNights: searchParams.noOfNights,
          CountryCode: searchParams.countryCode || 'IN',
          CityId: searchParams.cityId,
          GuestNationality: searchParams.guestNationality || 'IN',
          NoOfRooms: searchParams.noOfRooms || 1,
          RoomGuests: searchParams.roomGuests || [{ NoOfAdults: 2, NoOfChild: 0 }],
          PreferredCurrency: 'INR',
          IsNearBySearchAllowed: false
        }
      );

      if (response.data.Status.Code === 200) {
        return {
          success: true,
          traceId: response.data.TraceId,
          hotels: response.data.HotelResults
        };
      }

      throw new ApiError(400, response.data.Status.Description);
    } catch (error) {
      logger.error('TBO Hotel Search Error:', error);
      throw error;
    }
  }

  async getHotelDetails(hotelCode, traceId) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.hotelInfo}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          TraceId: traceId,
          HotelCode: hotelCode
        }
      );

      return response.data;
    } catch (error) {
      logger.error('TBO Hotel Details Error:', error);
      throw error;
    }
  }

  async blockHotelRoom(blockParams) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.hotelBlock}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          TraceId: blockParams.traceId,
          ResultIndex: blockParams.resultIndex,
          HotelCode: blockParams.hotelCode,
          HotelName: blockParams.hotelName,
          GuestNationality: blockParams.guestNationality || 'IN',
          NoOfRooms: blockParams.noOfRooms,
          ClientReferenceNo: blockParams.clientReferenceNo,
          IsVoucherBooking: true,
          HotelRoomsDetails: blockParams.roomDetails
        }
      );

      if (response.data.Status.Code === 200) {
        return response.data;
      }

      throw new ApiError(400, response.data.Status.Description);
    } catch (error) {
      logger.error('TBO Hotel Block Error:', error);
      throw error;
    }
  }

  async bookHotel(bookingData) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${config.baseUrl}${config.endpoints.hotelBook}`,
        {
          EndUserIp: config.endUserIp,
          TokenId: token,
          TraceId: bookingData.traceId,
          ResultIndex: bookingData.resultIndex,
          HotelCode: bookingData.hotelCode,
          HotelName: bookingData.hotelName,
          GuestNationality: bookingData.guestNationality || 'IN',
          NoOfRooms: bookingData.noOfRooms,
          ClientReferenceNo: bookingData.clientReferenceNo,
          IsVoucherBooking: true,
          HotelRoomsDetails: bookingData.roomDetails
        }
      );

      if (response.data.Status.Code === 200) {
        return response.data;
      }

      throw new ApiError(400, response.data.Status.Description);
    } catch (error) {
      logger.error('TBO Hotel Book Error:', error);
      throw error;
    }
  }
}

module.exports = new TBOService();