const MarkupCacheService = require("./markupCache.service");
const MarkupResolverService = require("./markupResolver.service");
const logger = require("../../../utils/logger");

class MarkupCalculatorService {
  /**
   * Applies markup to flight results (Search or FareQuote response).
   */
  static async applyFlightMarkup(results, corporateId) {
    if (!corporateId) return results; // No corporate context, return as is

    const rules = await MarkupCacheService.getRules(corporateId, "flight");
    if (!rules || rules.length === 0) return results;

    const processFlight = (flight) => {
      // Avoid re-evaluating if markup is already applied in DB snapshot
      if (flight.markupApplied) return;

      const winningRule = MarkupResolverService.resolveRule(rules, flight, "flight");
      if (winningRule) {
        let markupAmount = 0;
        const supplierFare = Number(flight.Fare?.PublishedFare || flight.Fare?.OfferedFare || flight.Fare?.BaseFare || 0);
        
        if (winningRule.markupMethod === "fixed") {
          markupAmount = winningRule.markupValue || 0;
        } else if (winningRule.markupMethod === "percentage") {
          const pct = winningRule.markupValue || 0;
          markupAmount = (supplierFare * pct) / 100;
        }

        // Slab Logic if present
        if (winningRule.fareSlabs && winningRule.fareSlabs.length > 0) {
           const slab = winningRule.fareSlabs.find(s => supplierFare >= s.from && supplierFare <= s.to);
           if (slab) {
             if (slab.method === "fixed") {
               markupAmount = slab.value || 0;
             } else if (slab.method === "percentage") {
               markupAmount = (supplierFare * (slab.value || 0)) / 100;
             }
           }
        }

        markupAmount = Math.ceil(markupAmount);

        if (flight.Fare) {
          flight.Fare.supplierFare = supplierFare; // store original
          flight.Fare.markupAmount = markupAmount;
          flight.Fare.PublishedFare = supplierFare + markupAmount; 
          flight.Fare.OfferedFare = supplierFare + markupAmount;
          
          flight.markupApplied = true;
          flight.appliedRuleId = winningRule._id?.toString();
          flight.SnapshotId = `MKS-${winningRule._id}-${Date.now()}`;
          flight.markupAmount = markupAmount;
          flight.supplierFare = supplierFare;
        }
      } else {
        // No matching rule
        flight.markupApplied = false;
        if (flight.Fare) {
           flight.Fare.supplierFare = Number(flight.Fare.PublishedFare || flight.Fare.OfferedFare || flight.Fare.BaseFare || 0);
           flight.Fare.markupAmount = 0;
        }
      }
    };

    if (Array.isArray(results)) {
      results.forEach(item => {
        if (Array.isArray(item)) {
          item.forEach(flight => processFlight(flight));
        } else {
          processFlight(item);
        }
      });
    } else {
      processFlight(results);
    }

    return results;
  }

  /**
   * Applies markup to hotel results.
   */
  static async applyHotelMarkup(results, corporateId) {
    if (!corporateId) return results;

    const rules = await MarkupCacheService.getRules(corporateId, "hotel");
    if (!rules || rules.length === 0) return results;

    const processHotel = (hotel) => {
       if (hotel.markupApplied) return;

       const winningRule = MarkupResolverService.resolveRule(rules, hotel, "hotel");
       if (winningRule) {
         let maxMarkup = 0;

         // For hotels, apply markup to each Room's DayRates or overall price
         // Since hotel responses vary, we will apply the logic to the highest level total price
         if (hotel.Rooms && Array.isArray(hotel.Rooms)) {
            hotel.Rooms.forEach(room => {
               if (room.DayRates && Array.isArray(room.DayRates)) {
                  room.DayRates.forEach(dayRateArray => {
                     if (Array.isArray(dayRateArray)) {
                        dayRateArray.forEach(rate => {
                           if (rate.Price) {
                              const supplierPrice = rate.Price.PublishedPriceRoundedOff || rate.Price.PublishedPrice || rate.Price.RoomPrice || 0;
                              let mkt = 0;
                              if (winningRule.markupMethod === "fixed") {
                                mkt = winningRule.markupValue || 0;
                              } else {
                                mkt = (supplierPrice * (winningRule.markupValue || 0)) / 100;
                              }
                              mkt = Math.ceil(mkt);

                              rate.Price.supplierPrice = supplierPrice;
                              rate.Price.markupAmount = mkt;
                              rate.Price.PublishedPriceRoundedOff = supplierPrice + mkt;
                              rate.Price.PublishedPrice = rate.Price.PublishedPriceRoundedOff;
                              maxMarkup = Math.max(maxMarkup, mkt);
                           }
                        });
                     }
                  });
               }
            });
         } else if (hotel.Price) {
            // Simplified hotel summary level price
            const supplierPrice = hotel.Price.PublishedPriceRoundedOff || hotel.Price.PublishedPrice || 0;
            let mkt = 0;
            if (winningRule.markupMethod === "fixed") {
              mkt = winningRule.markupValue || 0;
            } else {
              mkt = (supplierPrice * (winningRule.markupValue || 0)) / 100;
            }
            mkt = Math.ceil(mkt);
            hotel.Price.supplierPrice = supplierPrice;
            hotel.Price.markupAmount = mkt;
            hotel.Price.PublishedPriceRoundedOff = supplierPrice + mkt;
            hotel.Price.PublishedPrice = hotel.Price.PublishedPriceRoundedOff;
            maxMarkup = Math.max(maxMarkup, mkt);
         }

         hotel.markupApplied = true;
         hotel.appliedRuleId = winningRule._id?.toString();
         hotel.markupAmount = maxMarkup; // Max markup for summary
         hotel.SnapshotId = `MKS-${winningRule._id}-${Date.now()}`;
       } else {
         hotel.markupApplied = false;
       }
    };

    if (Array.isArray(results)) {
       results.forEach(hotel => processHotel(hotel));
    } else {
       processHotel(results);
    }

    return results;
  }
}

module.exports = MarkupCalculatorService;
