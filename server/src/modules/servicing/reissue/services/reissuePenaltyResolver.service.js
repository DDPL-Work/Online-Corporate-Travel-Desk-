const logger = require("../../../../utils/logger");
const fallbackConfig = require("../config/reissuePenaltyFallback.config");

class ReissuePenaltyResolver {
  /**
   * Resolves the reissue penalty using a strict priority order.
   * @param {object} params
   * @param {object} params.booking Original booking request.
   * @param {object} params.reissueRequest The reissue request.
   * @param {object} params.normalizedQuote The normalized quote details.
   * @returns {Promise<number>}
   */
  async resolvePenalty({ booking, reissueRequest, normalizedQuote }) {
    const airlineCode = (reissueRequest?.airline || booking?.bookingSnapshot?.airline || "").toUpperCase();

    // 1. TicketReissue API response
    const ticketReissueVal = this.extractFromTicketReissue(reissueRequest);
    if (ticketReissueVal > 0) {
      logger.info(`Resolved penalty from TicketReissue API response: ${ticketReissueVal}`, { reissueId: reissueRequest?.reissueId });
      return ticketReissueVal;
    }

    // 2. FareQuote / FareBreakdown[].SupplierReissueCharges
    const fareQuoteVal = this.extractFromFareQuote(reissueRequest, normalizedQuote);
    if (fareQuoteVal > 0) {
      logger.info(`Resolved penalty from FareQuote/FareBreakdown charges: ${fareQuoteVal}`, { reissueId: reissueRequest?.reissueId });
      return fareQuoteVal;
    }

    // 3. MiniFareRules
    const miniRulesVal = this.extractFromMiniFareRules(reissueRequest, normalizedQuote);
    if (miniRulesVal > 0) {
      logger.info(`Resolved penalty from MiniFareRules: ${miniRulesVal}`, { reissueId: reissueRequest?.reissueId });
      return miniRulesVal;
    }

    // 4. FareRuleDetail regex extraction
    const fareRuleDetailVal = this.extractFromFareRuleDetail(reissueRequest, normalizedQuote);
    if (fareRuleDetailVal > 0) {
      logger.info(`Resolved penalty from FareRuleDetail regex extraction: ${fareRuleDetailVal}`, { reissueId: reissueRequest?.reissueId });
      return fareRuleDetailVal;
    }

    // 5. Airline static fallback config
    const isDomestic = this.isDomesticFlight(booking);
    const fallbackVal = this.getStaticFallback(airlineCode, isDomestic);
    logger.info(`Resolved penalty from airline static fallback: ${fallbackVal} (airline: ${airlineCode}, domestic: ${isDomestic})`, { reissueId: reissueRequest?.reissueId });
    return fallbackVal;
  }

  resolveReferenceFare(booking = {}, reissueRequest = {}) {
    const snapshot =
      reissueRequest?.lastTicketedSnapshot ||
      reissueRequest?.financialLedger?.lastTicketedSnapshot ||
      reissueRequest?.activeTicketSnapshot ||
      booking?.lastTicketedSnapshot ||
      {};

    return Number(
      snapshot?.fare?.totalFare ||
        snapshot?.fareSnapshot?.offeredFare ||
        reissueRequest?.financialLedger?.currentTicketValue ||
        reissueRequest?.financialLedger?.originalTicketAmount ||
        booking?.pricingSnapshot?.totalAmount ||
        0,
    );
  }

  /**
   * Helper 1: Extract from TicketReissue API response (from confirmation phase).
   */
  extractFromTicketReissue(reissueRequest) {
    const response = reissueRequest?.supplierResponse?.ticketReissueResponse;
    if (!response) return 0;

    const charges = [
      response?.Response?.TicketReissue?.SupplierReissueCharges,
      response?.Response?.SupplierReissueCharges,
      response?.Response?.Fare?.SupplierReissueCharges,
      response?.TicketReissue?.SupplierReissueCharges,
      response?.SupplierReissueCharges,
      response?.Fare?.SupplierReissueCharges,
    ];

    for (const val of charges) {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
  }

  /**
   * Helper 2: Extract from FareQuote / FareBreakdown[].SupplierReissueCharges.
   */
  extractFromFareQuote(reissueRequest, normalizedQuote) {
    // 1. Direct from normalized quote
    if (normalizedQuote?.supplierReissueCharges > 0) {
      return Number(normalizedQuote.supplierReissueCharges);
    }
    if (reissueRequest?.reissueCharges > 0) {
      return Number(reissueRequest.reissueCharges);
    }

    // 2. Scan FareBreakdown inside search/quote response
    const searchRes = reissueRequest?.supplierResponse?.searchResponse;
    const quoteRes = reissueRequest?.supplierResponse?.fareQuoteResponse;

    const extractFromBreakdown = (res) => {
      const results = res?.Response?.Results || res?.Results;
      if (!results) return 0;
      
      const firstResult = Array.isArray(results) ? results[0] : (results?.[0] || results);
      const fare = firstResult?.Fare;
      const breakdown = fare?.FareBreakdown;
      if (Array.isArray(breakdown)) {
        let total = 0;
        for (const pax of breakdown) {
          const charge = Number(pax?.SupplierReissueCharges);
          if (Number.isFinite(charge) && charge > 0) {
            total += charge;
          }
        }
        return total;
      }
      return 0;
    };

    const quoteBreakdown = extractFromBreakdown(quoteRes);
    if (quoteBreakdown > 0) return quoteBreakdown;

    const searchBreakdown = extractFromBreakdown(searchRes);
    if (searchBreakdown > 0) return searchBreakdown;

    return 0;
  }

  /**
   * Helper 3: Extract from MiniFareRules (ChangeFee, ReissueCharges, RescheduleFee, AmendmentFee).
   */
  extractFromMiniFareRules(reissueRequest, normalizedQuote) {
    const referenceFare = this.resolveReferenceFare(null, reissueRequest);
    // 1. Check parsed miniFareRules in request or normalizedQuote
    const parsedRules = normalizedQuote?.miniFareRules || reissueRequest?.miniFareRules;
    if (parsedRules && Array.isArray(parsedRules.reissueRules)) {
      let maxVal = 0;
      for (const rule of parsedRules.reissueRules) {
        const amount = Number(rule?.amount || 0);
        const percentage = Number(rule?.percentage || 0);
        const computed =
          amount > 0
            ? amount
            : percentage > 0 && referenceFare > 0
              ? Number(((referenceFare * percentage) / 100).toFixed(2))
              : 0;
        if (computed > 0) {
          maxVal = Math.max(maxVal, computed);
        }
      }
      if (maxVal > 0) return maxVal;
    }

    // 2. Search raw MiniFareRules array/object for keys: ReissueCharges, ChangeFee, AmendmentFee, RescheduleFee
    const rawMini = parsedRules?.raw || reissueRequest?.miniFareRules?.raw || reissueRequest?.metadata?.rawMiniFareRules;
    if (rawMini) {
      const keysToCheck = ["ReissueCharges", "ChangeFee", "AmendmentFee", "RescheduleFee"];
      
      // If it's an array
      if (Array.isArray(rawMini)) {
        for (const item of rawMini) {
          for (const key of keysToCheck) {
            const val = Number(item?.[key]);
            if (Number.isFinite(val) && val > 0) {
              return val;
            }
          }
          const text = item?.Details || item?.Detail || item?.Description || "";
          const percentMatch = String(text).match(/(\d+(?:\.\d+)?)\s*%/i);
          if (percentMatch && referenceFare > 0) {
            return Number(((referenceFare * Number(percentMatch[1])) / 100).toFixed(2));
          }
        }
      } else if (typeof rawMini === "object") {
        for (const key of keysToCheck) {
          const val = Number(rawMini[key]);
          if (Number.isFinite(val) && val > 0) {
            return val;
          }
        }
        const text = rawMini?.Details || rawMini?.Detail || rawMini?.Description || "";
        const percentMatch = String(text).match(/(\d+(?:\.\d+)?)\s*%/i);
        if (percentMatch && referenceFare > 0) {
          return Number(((referenceFare * Number(percentMatch[1])) / 100).toFixed(2));
        }
      }
    }
    return 0;
  }

  /**
   * Helper 4: Parse FareRuleDetail using regex.
   */
  extractFromFareRuleDetail(reissueRequest, normalizedQuote) {
    const textsToSearch = [];

    // Gather all potential text locations
    const metadata = reissueRequest?.metadata || {};
    if (metadata.fareRuleDetail) textsToSearch.push(metadata.fareRuleDetail);
    if (metadata.FareRuleDetail) textsToSearch.push(metadata.FareRuleDetail);
    if (metadata.fareRules) textsToSearch.push(metadata.fareRules);

    const quoteRes = reissueRequest?.supplierResponse?.fareQuoteResponse;
    const searchRes = reissueRequest?.supplierResponse?.searchResponse;

    const addFromResponse = (res) => {
      if (!res) return;
      const results = res?.Response?.Results || res?.Results;
      const firstResult = Array.isArray(results) ? results[0] : (results?.[0] || results);
      if (firstResult?.FareRules) {
        if (Array.isArray(firstResult.FareRules)) {
          for (const rule of firstResult.FareRules) {
            if (rule.FareRuleDetail) textsToSearch.push(rule.FareRuleDetail);
          }
        } else if (typeof firstResult.FareRules === "object") {
          if (firstResult.FareRules.FareRuleDetail) textsToSearch.push(firstResult.FareRules.FareRuleDetail);
        }
      }
    };

    addFromResponse(quoteRes);
    addFromResponse(searchRes);

    for (const text of textsToSearch) {
      if (typeof text === "string" && text.trim().length > 0) {
        const parsedVal = this.parseTextPenalty(text);
        if (parsedVal > 0) return parsedVal;
      }
    }

    return 0;
  }

  /**
   * Parse text penalty utilizing smart proximity-based isolation.
   */
  parseTextPenalty(text) {
    if (!text) return 0;
    
    // Normalize commas inside numbers (e.g. 3,000 -> 3000)
    let cleanedText = text.replace(/(\d),(\d{3})/g, "$1$2");

    // 1. Look for lines/sentences mentioning reissue, reschedule, change, amend, penalty
    const lines = cleanedText.split(/[\r\n.]+/);
    const relevantLines = [];
    
    const keywords = ["reissue", "change", "amend", "reschedule", "penalty"];
    const negativeKeywords = ["cancel", "refund", "baggage", "seat", "meal"];

    for (const line of lines) {
      const lower = line.toLowerCase();
      const hasKeyword = keywords.some(k => lower.includes(k));
      const hasNegative = negativeKeywords.some(nk => lower.includes(nk));
      
      if (hasKeyword && !hasNegative) {
        relevantLines.push(line);
      }
    }

    // Patterns to match:
    // Pattern A: Reissue/Change fee/penalty followed by currency and number
    // Pattern B: Currency followed by number
    // Pattern C: Number followed by Currency
    const regexes = [
      // 1. Word pattern: "change fee 3000", "reissue penalty Rs. 3000"
      /(?:reissue|change|penalty|amendment|reschedule)\s*(?:fee|charge|charges|penalty)?\s*(?:of|is|inr|rs\.?)*\s*(?:inr|rs\.?)?\s*(\d{3,5})/i,
      // 2. Currency followed by amount: "INR 3000/-", "Rs.3000"
      /(?:inr|rs\.?)\s*(\d{3,5})/i,
      // 3. Amount followed by currency: "3000 INR", "3000Rs"
      /(\d{3,5})\s*(?:inr|rs\.?)/i
    ];

    // Try parsing relevant lines first
    for (const line of relevantLines) {
      for (const regex of regexes) {
        const match = line.match(regex);
        if (match) {
          const val = parseInt(match[1] || match[0], 10);
          if (Number.isFinite(val) && val >= 500 && val <= 50000) {
            return val;
          }
        }
      }
    }

    // Fall back to scanning the entire text with global regexes
    for (const regex of regexes) {
      const globalRegex = new RegExp(regex.source, regex.flags + "g");
      let match;
      while ((match = globalRegex.exec(cleanedText)) !== null) {
        const val = parseInt(match[1] || match[0], 10);
        if (Number.isFinite(val) && val >= 500 && val <= 50000) {
          return val;
        }
      }
    }

    return 0;
  }

  /**
   * Helper 5: Retrieve static fallback configuration.
   */
  getStaticFallback(airlineCode, isDomestic) {
    const config = fallbackConfig[airlineCode] || fallbackConfig["DEFAULT"];
    if (isDomestic) {
      return config.defaultDomesticPenalty;
    } else {
      return config.defaultInternationalPenalty;
    }
  }

  /**
   * Helper 6: Classify domestic vs international flight routing.
   */
  isDomesticFlight(booking) {
    const sectors = booking?.bookingSnapshot?.sectors || [];
    const segments = booking?.flightRequest?.segments || booking?.bookingSnapshot?.segments || [];
    
    const airportCodes = new Set();
    
    // Extract airport codes
    for (const sector of sectors) {
      if (sector.origin) airportCodes.add(sector.origin.toUpperCase());
      if (sector.destination) airportCodes.add(sector.destination.toUpperCase());
    }

    for (const segment of segments) {
      const origin = segment?.origin || segment?.Origin?.AirportCode || segment?.Origin?.Airport?.AirportCode;
      const destination = segment?.destination || segment?.Destination?.AirportCode || segment?.Destination?.Airport?.AirportCode;
      if (origin && typeof origin === "string") airportCodes.add(origin.toUpperCase());
      if (destination && typeof destination === "string") airportCodes.add(destination.toUpperCase());
    }

    if (airportCodes.size === 0) return true; // Default domestic

    const indianAirports = new Set([
      "DEL", "BOM", "BLR", "MAA", "CCU", "HYD", "COK", "AMD", "PNQ", "GOI", "GOX", "GAU",
      "LKO", "JAI", "SXR", "IXC", "PAT", "BDQ", "NAG", "IDR", "IXB", "TRV", "VTZ", "RPR",
      "IXR", "BBI", "JLR", "IMF", "IXE", "IXZ", "MYQ", "MDU", "TRZ", "CJB", "CCJ", "TIR",
      "VGA", "JHB", "RJA", "VNS", "HJR", "SAG", "SHL", "DED", "SLV", "DHM", "KUU", "IXS",
      "AJL", "DMU", "TEZ", "JGA", "BHU", "PBD", "IXD", "BHO", "GWL", "JBP", "KHO",
      "STV", "IXU", "ISK", "NII", "JLN", "KLH", "ATQ", "BUP", "IXP", "DIB", "TEI", "IXH",
      "ADP", "IXQ", "IXW", "BEP", "IXV", "RER", "IXI", "IXY", "HGI", "IXA", "IXN", "SLN",
      "PGH", "RUH", "SBO", "TET", "ZER"
    ]);

    // Check if any airport is outside India
    for (const code of airportCodes) {
      if (!indianAirports.has(code)) {
        return false; // Found an international airport
      }
    }

    return true;
  }
}

module.exports = new ReissuePenaltyResolver();
