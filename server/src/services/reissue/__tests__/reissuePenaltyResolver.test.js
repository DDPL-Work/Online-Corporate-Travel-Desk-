const reissuePenaltyResolver = require("../../../modules/servicing/reissue/services/reissuePenaltyResolver.service");

describe("reissuePenaltyResolver.service", () => {
  const mockBookingDomestic = {
    bookingSnapshot: {
      airline: "6E",
      sectors: [
        { origin: "DEL", destination: "BOM" }
      ]
    }
  };

  const mockBookingInternational = {
    bookingSnapshot: {
      airline: "AI",
      sectors: [
        { origin: "DEL", destination: "DXB" }
      ]
    }
  };

  describe("TicketReissue Extraction (Priority 1)", () => {
    test("extracts SupplierReissueCharges from ticketReissueResponse", async () => {
      const reissueRequest = {
        airline: "6E",
        supplierResponse: {
          ticketReissueResponse: {
            Response: {
              TicketReissue: {
                SupplierReissueCharges: 3250
              }
            }
          }
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(3250);
    });

    test("falls back to lower priority if TicketReissue returns 0 or invalid", async () => {
      const reissueRequest = {
        airline: "6E",
        reissueCharges: 1500, // Priority 2
        supplierResponse: {
          ticketReissueResponse: {
            Response: {
              TicketReissue: {
                SupplierReissueCharges: 0
              }
            }
          }
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(1500);
    });
  });

  describe("FareQuote/FareBreakdown Summation (Priority 2)", () => {
    test("extracts from normalizedQuote supplierReissueCharges", async () => {
      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest: {},
        normalizedQuote: { supplierReissueCharges: 2500 }
      });
      expect(result).toBe(2500);
    });

    test("extracts and sums SupplierReissueCharges from searchResponse FareBreakdown", async () => {
      const reissueRequest = {
        supplierResponse: {
          searchResponse: {
            Response: {
              Results: [
                {
                  Fare: {
                    FareBreakdown: [
                      { SupplierReissueCharges: 1000 },
                      { SupplierReissueCharges: 1200 }
                    ]
                  }
                }
              ]
            }
          }
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(2200);
    });
  });

  describe("MiniFareRules Extraction (Priority 3)", () => {
    test("extracts maximum amount from miniFareRules reissueRules", async () => {
      const normalizedQuote = {
        miniFareRules: {
          reissueRules: [
            { amount: 1500 },
            { amount: 3000 },
            { amount: 2000 }
          ]
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest: {},
        normalizedQuote
      });

      expect(result).toBe(3000);
    });

    test("extracts from raw miniFareRules keys", async () => {
      const reissueRequest = {
        miniFareRules: {
          raw: {
            ChangeFee: 2800
          }
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(2800);
    });
  });

  describe("FareRuleDetail Free-text Parser (Priority 4)", () => {
    test("extracts penalty with comma from FareRuleDetail text", async () => {
      const reissueRequest = {
        metadata: {
          fareRuleDetail: "Reissue penalty of INR 3,250 applies for rescheduling. Cancel charge is 3500."
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(3250);
    });

    test("handles suffix currency and space variations in text", async () => {
      const reissueRequest = {
        metadata: {
          fareRules: "A change fee of 3000Rs is applicable."
        }
      };

      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest,
        normalizedQuote: {}
      });

      expect(result).toBe(3000);
    });
  });

  describe("Static Airline Fallbacks (Priority 5)", () => {
    test("resolves domestic default for IndyGo (6E)", async () => {
      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest: { airline: "6E" },
        normalizedQuote: {}
      });
      expect(result).toBe(3500); // 6E Domestic default (from config: 3500)
    });

    test("resolves international default for Air India (AI)", async () => {
      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingInternational,
        reissueRequest: { airline: "AI" },
        normalizedQuote: {}
      });
      expect(result).toBe(6000); // AI International default (from config: 6000)
    });

    test("resolves DEFAULT fallback for unrecognized airline", async () => {
      const result = await reissuePenaltyResolver.resolvePenalty({
        booking: mockBookingDomestic,
        reissueRequest: { airline: "XX" },
        normalizedQuote: {}
      });
      expect(result).toBe(3000); // Default Domestic fallback (from config: 3000)
    });
  });
});
