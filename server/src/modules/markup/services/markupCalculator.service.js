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

      const matchedRules = MarkupResolverService.resolveRules(rules, flight, "flight");
      if (matchedRules && matchedRules.length > 0) {
        const supplierFare = Number(flight.Fare?.PublishedFare || flight.Fare?.OfferedFare || flight.Fare?.BaseFare || 0);
        let totalMarkupAmount = 0;
        let markupBreakdown = [];
        let appliedRuleIds = [];
        let markupMatchedCategories = [];

        for (const rule of matchedRules) {
          let ruleMarkup = 0;

          if (rule.markupMethod === "fixed") {
            ruleMarkup = rule.markupValue || 0;
          } else if (rule.markupMethod === "percentage") {
            const pct = rule.markupValue || 0;
            // Percentage markup ALWAYS calculated based on original supplier fare
            ruleMarkup = (supplierFare * pct) / 100;
          }

          // Slab Logic if present
          if (rule.fareSlabs && rule.fareSlabs.length > 0) {
             const slab = rule.fareSlabs.find(s => supplierFare >= s.from && supplierFare <= s.to);
             if (slab) {
               if (slab.method === "fixed") {
                 ruleMarkup = slab.value || 0;
               } else if (slab.method === "percentage") {
                 ruleMarkup = (supplierFare * (slab.value || 0)) / 100;
               }
             }
          }

          ruleMarkup = Math.ceil(ruleMarkup);
          totalMarkupAmount += ruleMarkup;
          
          appliedRuleIds.push(rule._id?.toString());
          const categoryName = rule.category?.toUpperCase().replace(/ /g, "_") || "UNKNOWN";
          markupMatchedCategories.push(categoryName);
          
          markupBreakdown.push({
            ruleId: rule._id?.toString(),
            category: rule.category,
            markupMethod: rule.markupMethod,
            markupAmount: ruleMarkup
          });
        }

        if (flight.Fare) {
          flight.Fare.supplierFare = supplierFare; // store original
          flight.Fare.markupAmount = totalMarkupAmount;
          flight.Fare.PublishedFare = supplierFare + totalMarkupAmount; 
          flight.Fare.OfferedFare = supplierFare + totalMarkupAmount;
          
          flight.markupApplied = true;
          // Maintain backwards compatibility
          flight.appliedRuleId = appliedRuleIds[0];
          flight.appliedRuleIds = appliedRuleIds;
          flight.markupMatchedCategories = [...new Set(markupMatchedCategories)];
          flight.markupBreakdown = markupBreakdown;
          flight.SnapshotId = `MKS-${appliedRuleIds.join('-')}-${Date.now()}`;
          flight.markupAmount = totalMarkupAmount;
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

       const matchedRules = MarkupResolverService.resolveRules(rules, hotel, "hotel");
       if (matchedRules && matchedRules.length > 0) {
         let maxTotalMarkup = 0;
         let markupBreakdown = [];
         let appliedRuleIds = [];
         let markupMatchedCategories = [];

         for (const rule of matchedRules) {
             appliedRuleIds.push(rule._id?.toString());
             const categoryName = rule.category?.toUpperCase().replace(/ /g, "_") || "UNKNOWN";
             markupMatchedCategories.push(categoryName);
         }

         // For hotels, apply markup to each Room's TotalFare
         if (hotel.Rooms && Array.isArray(hotel.Rooms)) {
            hotel.Rooms.forEach(room => {
               const supplierPrice = room.TotalFare || 0;
               let roomTotalMarkup = 0;
               let roomBreakdown = [];

               for (const rule of matchedRules) {
                 let mkt = 0;
                 if (rule.fareSlabs && rule.fareSlabs.length > 0) {
                   const slab = rule.fareSlabs.find(s => supplierPrice >= s.from && supplierPrice <= s.to);
                   if (slab) {
                     if (slab.method === "fixed") {
                       mkt = slab.value || 0;
                     } else {
                       mkt = (supplierPrice * (slab.value || 0)) / 100;
                     }
                   }
                 } else {
                   if (rule.markupMethod === "fixed") {
                     mkt = rule.markupValue || 0;
                   } else {
                     mkt = (supplierPrice * (rule.markupValue || 0)) / 100;
                   }
                 }
                 
                 mkt = Math.ceil(mkt);
                 roomTotalMarkup += mkt;
                 
                 roomBreakdown.push({
                   ruleId: rule._id?.toString(),
                   category: rule.category,
                   markupMethod: rule.markupMethod,
                   markupAmount: mkt
                 });
               }

               room.supplierFare = supplierPrice;
               room.markupAmount = roomTotalMarkup;
               room.TotalFare = supplierPrice + roomTotalMarkup;
               room.markupBreakdown = roomBreakdown;
               
               // Distribute markup evenly across DayRates BasePrice so UI displays marked up per-night rate
               if (roomTotalMarkup > 0 && room.DayRates && Array.isArray(room.DayRates)) {
                 let totalNights = 0;
                 room.DayRates.forEach(dayRateArray => {
                   if (Array.isArray(dayRateArray)) totalNights += dayRateArray.length;
                 });
                 if (totalNights > 0) {
                   const markupPerNight = roomTotalMarkup / totalNights;
                   room.DayRates.forEach(dayRateArray => {
                     if (Array.isArray(dayRateArray)) {
                       dayRateArray.forEach(night => {
                         if (night && typeof night.BasePrice === 'number') {
                           night.BasePrice += markupPerNight;
                         }
                       });
                     }
                   });
                 }
               }
               
               if (roomTotalMarkup > maxTotalMarkup) {
                   maxTotalMarkup = roomTotalMarkup;
                   markupBreakdown = roomBreakdown;
               }
            });
         }
         hotel.markupApplied = true;
         hotel.appliedRuleId = appliedRuleIds[0];
         hotel.appliedRuleIds = appliedRuleIds;
         hotel.markupMatchedCategories = [...new Set(markupMatchedCategories)];
         hotel.markupBreakdown = markupBreakdown;
         hotel.markupAmount = maxTotalMarkup; // Max markup for summary
         hotel.SnapshotId = `MKS-${appliedRuleIds.join('-')}-${Date.now()}`;
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
