const reissueFinancialLedgerService = require("../../../../services/reissue/reissueFinancialLedger.service");

describe("reissueFinancialLedgerService", () => {
  test("subtracts only refundable previous SSR from net collection", () => {
    const booking = {
      pricingSnapshot: { totalAmount: 10000 },
      flightRequest: {
        segments: [{ origin: "DEL", destination: "BOM", journeyType: "onward" }],
      },
    };

    const request = {
      financialLedger: {
        originalTicketAmount: 10000,
        originalSSR: 1500,
        currentTicketValue: 10000,
        currentSSRValue: 1500,
        lastTicketedSnapshot: {
          fare: { totalFare: 10000 },
          ssr: {
            seats: [{ amount: 500, price: 500 }],
            meals: [{ amount: 300, price: 300 }],
            baggage: [{ amount: 700, price: 700 }],
            totalSSRAmount: 1500,
          },
          segments: [{ origin: "DEL", destination: "BOM", journeyType: "onward" }],
        },
      },
      supplierSupport: { ndc: true },
      metadata: {
        ssrRefundability: {
          meal: true,
        },
      },
    };

    const result = reissueFinancialLedgerService.calculateCumulativeReissueAmount({
      request,
      booking,
      newFareQuote: { fare: 12000 },
      selectedSSR: {
        seats: [{ amount: 500, price: 500 }],
        meals: [{ amount: 200, price: 200, refundable: true }],
        totalSSRAmount: 700,
      },
      supplierReissueCharge: 1000,
    });

    expect(result.refundablePreviousSSR).toBe(300);
    expect(result.nonRefundablePreviousSSR).toBe(1200);
    expect(result.netCollection).toBe(3400);
    expect(result.refundDue).toBe(0);
  });
});
