const logger = require("../../../utils/logger");

const FLIGHT_PRIORITY = {
  "airline_wise": 1,
  "Airline Wise": 1,
  "sector_wise": 2,
  "Sector Wise": 2,
  "passenger_wise": 3,
  "Passenger Wise": 3,
  "fare_slab_wise": 4,
  "Fare Slab Wise": 4,
  "date_wise": 5,
  "Date Wise": 5,
  "booking_time_wise": 6,
  "Booking Time Wise": 6,
  "generic": 7,
  "Generic": 7
};

const HOTEL_PRIORITY = {
  "hotel_wise": 1,
  "Hotel Wise": 1,
  "city_wise": 2,
  "City Wise": 2,
  "star_rating_wise": 3,
  "Star Rating Wise": 3,
  "room_type_wise": 4,
  "Room Type Wise": 4,
  "generic": 5,
  "Generic": 5
};

class MarkupResolverService {
  /**
   * Resolves the single highest-priority rule that matches the given payload.
   * Only one rule wins. No stacking.
   */
  static resolveRule(rules, payload, productType) {
    if (!rules || rules.length === 0) return null;

    let bestRule = null;
    let bestPriority = Infinity;

    for (const rule of rules) {
      if (this.isMatch(rule, payload, productType)) {
        const priority = this.getPriority(rule.category, productType);
        
        if (priority < bestPriority) {
          bestPriority = priority;
          bestRule = rule;
        }
      }
    }

    return bestRule; // Returns the single winning rule, or null if no match
  }

  static getPriority(category, productType) {
    if (productType === "flight") {
      return FLIGHT_PRIORITY[category] || 99; // 99 for unknown fallback
    }
    if (productType === "hotel") {
      return HOTEL_PRIORITY[category] || 99;
    }
    return 99;
  }

  static isMatch(rule, payload, productType) {
    if (productType === "flight") {
      return this.isFlightMatch(rule, payload);
    } else if (productType === "hotel") {
      return this.isHotelMatch(rule, payload);
    }
    return false;
  }

  static isFlightMatch(rule, flight) {
    const category = rule.category?.toLowerCase().replace(/ /g, "_");
    const criteria = rule.criteria || {};

    switch (category) {
      case "airline_wise":
        const targetAirline = (criteria.airline || "").toUpperCase();
        if (flight.AirlineCode?.toUpperCase() === targetAirline || 
            flight.ValidatingAirline?.toUpperCase() === targetAirline) {
          return true;
        }
        if (flight.Segments && flight.Segments[0] && flight.Segments[0][0]) {
          if (flight.Segments[0][0].Airline?.AirlineCode?.toUpperCase() === targetAirline) {
            return true;
          }
        }
        return false;

      case "sector_wise":
        const reqOrigin = (criteria.origin || "").toUpperCase();
        const reqDest = (criteria.destination || "").toUpperCase();
        let flightOrigin = flight.Origin?.toUpperCase();
        let flightDest = flight.Destination?.toUpperCase();
        
        // Fallback to segments if Origin/Dest not at root
        if ((!flightOrigin || !flightDest) && flight.Segments && flight.Segments.length > 0) {
          const firstLeg = flight.Segments[0];
          if (firstLeg && firstLeg.length > 0) {
            flightOrigin = firstLeg[0].Origin?.Airport?.AirportCode?.toUpperCase();
            flightDest = firstLeg[firstLeg.length - 1].Destination?.Airport?.AirportCode?.toUpperCase();
          }
        }
        
        return (reqOrigin === flightOrigin && reqDest === flightDest);

      case "passenger_wise":
      case "fare_slab_wise":
      case "date_wise":
      case "booking_time_wise":
      case "generic":
        return true; // Simplification. In reality, you'd check dates, fare slabs, etc. For now, match if generic.

      default:
        // Generic fallback
        return true;
    }
  }

  static isHotelMatch(rule, hotel) {
    const category = rule.category?.toLowerCase().replace(/ /g, "_");
    const criteria = rule.criteria || {};

    switch (category) {
      case "hotel_wise":
        const targetHotel = (criteria.hotel || "").toUpperCase();
        return (hotel.HotelCode?.toUpperCase() === targetHotel || hotel.HotelName?.toUpperCase() === targetHotel);

      case "city_wise":
        const targetCity = (criteria.hotelCityCode || criteria.city || "").toUpperCase();
        return (hotel.CityCode?.toUpperCase() === targetCity || hotel.CityName?.toUpperCase() === targetCity);

      case "star_rating_wise":
        return hotel.StarRating === criteria.starRating;

      case "room_type_wise":
      case "generic":
        return true;

      default:
        return true;
    }
  }
}

module.exports = MarkupResolverService;
