const logger = require("../../../utils/logger");

class MarkupResolverService {
  /**
   * Resolves all rules that match the given payload.
   * Stacks rules so all matched rules apply.
   */
  static resolveRules(rules, payload, productType) {
    if (!rules || rules.length === 0) return [];

    const matchedRules = rules.filter(rule => {
      return this.isMatch(rule, payload, productType);
    });

    return matchedRules; // Returns all matching rules
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
    const rawCategory = (rule.category || "").trim();
    const category = rawCategory.toLowerCase().replace(/ /g, "_");

    const criteria = rule.criteria || {};

    switch (category) {
      case "airline_wise":
        const targetAirline = (criteria.airline || "").toUpperCase();
        if (flight.AirlineCode?.toUpperCase() === targetAirline || 
            flight.ValidatingAirline?.toUpperCase() === targetAirline) {
          return true;
        }
        if (flight.Segments && Array.isArray(flight.Segments)) {
          for (const leg of flight.Segments) {
            if (Array.isArray(leg)) {
              for (const segment of leg) {
                if (segment.Airline?.AirlineCode?.toUpperCase() === targetAirline) {
                  return true;
                }
              }
            }
          }
        }
        return false;

      case "cabin_wise":
        const targetCabin = Number(criteria.cabinClass);
        if (isNaN(targetCabin)) return false;
        
        if (flight.Segments && Array.isArray(flight.Segments)) {
          for (const leg of flight.Segments) {
            if (Array.isArray(leg)) {
              for (const segment of leg) {
                if (Number(segment.CabinClass) === targetCabin) {
                  return true;
                }
              }
            }
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
        
        if (reqOrigin === flightOrigin && reqDest === flightDest) {
          // If a cabin class is required by the rule, ensure at least one segment matches it
          if (criteria.cabinClass) {
            const targetCabin = Number(criteria.cabinClass);
            if (isNaN(targetCabin)) return false;

            let cabinMatch = false;
            if (flight.Segments && Array.isArray(flight.Segments)) {
              for (const leg of flight.Segments) {
                if (Array.isArray(leg)) {
                  for (const segment of leg) {
                    if (Number(segment.CabinClass) === targetCabin) {
                      cabinMatch = true;
                      break;
                    }
                  }
                }
                if (cabinMatch) break;
              }
            }
            if (!cabinMatch) return false;
          }
          return true;
        }
        return false;

      case "flight_type_wise":
      case "domestic_flights":
      case "international_flights":
        let targetFlightType = "domestic";
        if (category === "international_flights") {
          targetFlightType = "international";
        } else if (category === "flight_type_wise") {
          targetFlightType = (criteria.flightType || "").toLowerCase();
        }
        
        let resolvedFlightType = null;
        
        // Primary Strategy: Use IsDomestic flag from TBO if available
        if (typeof flight.IsDomestic === "boolean") {
          resolvedFlightType = flight.IsDomestic ? "domestic" : "international";
        } else {
          // Fallback Strategy: Dynamic Country Evaluation
          const countries = new Set();
          
          if (flight.Segments && Array.isArray(flight.Segments)) {
            for (const leg of flight.Segments) {
              if (Array.isArray(leg)) {
                for (const segment of leg) {
                  const originCountry = segment.Origin?.Airport?.CountryCode?.toUpperCase();
                  const destCountry = segment.Destination?.Airport?.CountryCode?.toUpperCase();
                  
                  if (originCountry) countries.add(originCountry);
                  if (destCountry) countries.add(destCountry);
                }
              }
            }
          }
          
          // Fail Safe: If no valid CountryCode found anywhere -> JourneyType = International (Revenue protection)
          if (countries.size === 0) {
            resolvedFlightType = "international";
          } else if (countries.size <= 1) {
            resolvedFlightType = "domestic";
          } else {
            resolvedFlightType = "international";
          }
        }

        return resolvedFlightType === targetFlightType;

      case "passenger_wise":
      case "fare_slab_wise":
      case "date_wise":
      case "booking_time_wise":
      case "generic":
        return true; 

      default:
        // Generic fallback
        return true;
    }
  }

  static isHotelMatch(rule, hotel) {
    const rawCategory = (rule.category || "").trim();
    const category = rawCategory.toLowerCase().replace(/ /g, "_");
    const criteria = rule.criteria || {};

    switch (category) {
      case "hotel_wise":
        const targetHotel = (criteria.hotel || "").toUpperCase();
        if (hotel.HotelCode?.toUpperCase() === targetHotel || hotel.HotelName?.toUpperCase() === targetHotel) {
          return true;
        }
        return false;

      case "country_wise":
        const targetCountry = (criteria.country || "").toUpperCase();
        if (hotel.CountryCode?.toUpperCase() === targetCountry || hotel.CountryName?.toUpperCase() === targetCountry) {
          return true;
        }
        return false;

      case "fare_slab_based":
        return true;

      case "city_wise":
        const targetCity = (criteria.hotelCityCode || criteria.city || "").toUpperCase();
        if (hotel.CityCode?.toUpperCase() === targetCity || hotel.CityName?.toUpperCase() === targetCity) {
          return true;
        }
        return false;

      case "star_rating_wise":
        if (Number(hotel.StarRating) !== Number(criteria.starRating)) {
          return false;
        }

        if (criteria.locationLevel === "Country" && criteria.country) {
          const targetCountry = criteria.country.toUpperCase();
          if (hotel.CountryCode?.toUpperCase() !== targetCountry && hotel.CountryName?.toUpperCase() !== targetCountry) {
            return false;
          }
        }

        if (criteria.locationLevel === "City" && (criteria.hotelCityCode || criteria.city)) {
          const targetCity = (criteria.hotelCityCode || criteria.city).toUpperCase();
          if (hotel.CityCode?.toUpperCase() !== targetCity && hotel.CityName?.toUpperCase() !== targetCity) {
            return false;
          }
          if (criteria.country) {
            const targetCountry = criteria.country.toUpperCase();
            if (hotel.CountryCode?.toUpperCase() !== targetCountry && hotel.CountryName?.toUpperCase() !== targetCountry) {
              return false;
            }
          }
        }

        return true;

      case "room_type_wise":
      case "generic":
        return true;

      default:
        return true;
    }
  }
}

module.exports = MarkupResolverService;
