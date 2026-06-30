const {
  extractOriginalAmounts,
  initializeLedger,
  calculateCumulativeReissueAmount,
  applyReissueCycle,
} = require("../reissueFinancialLedger.service");

describe("reissueFinancialLedger.service", () => {
  const originalBooking = {
    _id: "booking123",
    bookingResult: {
      providerResponse: {
        Response: {
          Response: {
            FlightItinerary: {
              Fare: {
                OfferedFare: 5000,
                TotalSeatCharges: 200,
                TotalMealCharges: 150,
                TotalBaggageCharges: 100,
              },
            },
          },
        },
      },
    },
  };

  test("extracts original fare and SSR amounts correctly", () => {
    const amounts = extractOriginalAmounts(originalBooking);
    expect(amounts.originalTicketAmount).toBe(5000);
    expect(amounts.originalSSR).toBe(450);
  });

  test("initializes ledger correctly", () => {
    const ledger = initializeLedger(originalBooking);
    expect(ledger.originalTicketAmount).toBe(5000);
    expect(ledger.originalSSR).toBe(450);
    expect(ledger.cumulativeReissueCharges).toBe(0);
    expect(ledger.cumulativeSSR).toBe(0);
    expect(ledger.cumulativeCollections).toBe(0);
    expect(ledger.cumulativeRefunds).toBe(0);
    expect(ledger.totalNetPaid).toBe(5450);
  });

  test("computes correct delta and appends pricing history across multiple cycles", () => {
    const request = {
      financialLedger: initializeLedger(originalBooking),
      pricingHistory: [],
    };

    // Cycle 1: Reissue to a new flight. New fare = 6500, penalty = 1000, SSR = 0.
    // Total Paid previously = 5450.
    // New total = 6500 (fare) + 0 (ssr) + 1000 (penalty) = 7500.
    // Delta should be 7500 - 5450 = 2050 (additional collection).
    const newFareQuote1 = { offeredFare: 6500 };
    const calc1 = calculateCumulativeReissueAmount({
      request,
      newFareQuote: newFareQuote1,
      selectedSSR: null,
      supplierReissueCharge: 1000,
    });

    expect(calc1.alreadyPaid).toBe(5450);
    expect(calc1.newTotal).toBe(7500);
    expect(calc1.additionalCollection).toBe(2050);
    expect(calc1.refundAmount).toBe(0);

    applyReissueCycle(request, calc1);

    expect(request.pricingHistory).toHaveLength(1);
    expect(request.pricingHistory[0].cycle).toBe(1);
    expect(request.pricingHistory[0].additionalCollection).toBe(2050);
    expect(request.pricingHistory[0].totalPaidAfterCycle).toBe(7500);

    expect(request.financialLedger.cumulativeReissueCharges).toBe(1000);
    expect(request.financialLedger.cumulativeCollections).toBe(2050);
    expect(request.financialLedger.totalNetPaid).toBe(7500);

    // Cycle 2: Reissue again. New fare = 8500, penalty = 1500, SSR = 500.
    // Total Paid previously = 7500.
    // New total = 8500 (fare) + 500 (ssr) + 1500 (penalty) = 10500.
    // Delta should be 10500 - 7500 = 3000 (additional collection).
    const newFareQuote2 = { offeredFare: 8500 };
    const calc2 = calculateCumulativeReissueAmount({
      request,
      newFareQuote: newFareQuote2,
      selectedSSR: { seatsTotal: 300, mealsTotal: 200, baggageTotal: 0 },
      supplierReissueCharge: 1500,
    });

    expect(calc2.alreadyPaid).toBe(7500);
    expect(calc2.newTotal).toBe(10500);
    expect(calc2.additionalCollection).toBe(3000);
    expect(calc2.refundAmount).toBe(0);

    applyReissueCycle(request, calc2);

    expect(request.pricingHistory).toHaveLength(2);
    expect(request.pricingHistory[1].cycle).toBe(2);
    expect(request.pricingHistory[1].additionalCollection).toBe(3000);
    expect(request.pricingHistory[1].totalPaidAfterCycle).toBe(10500);

    expect(request.financialLedger.cumulativeReissueCharges).toBe(2500);
    expect(request.financialLedger.cumulativeCollections).toBe(5050);
    expect(request.financialLedger.totalNetPaid).toBe(10500);

    // Cycle 3: Refund Scenario. New fare = 7000, penalty = 500, SSR = 0.
    // Total Paid previously = 10500.
    // New total = 7000 (fare) + 0 (ssr) + 500 (penalty) = 7500.
    // Delta should be 7500 - 10500 = -3000 (refund).
    const newFareQuote3 = { offeredFare: 7000 };
    const calc3 = calculateCumulativeReissueAmount({
      request,
      newFareQuote: newFareQuote3,
      selectedSSR: null,
      supplierReissueCharge: 500,
    });

    expect(calc3.alreadyPaid).toBe(10500);
    expect(calc3.newTotal).toBe(7500);
    expect(calc3.additionalCollection).toBe(0);
    expect(calc3.refundAmount).toBe(3000);

    applyReissueCycle(request, calc3);

    expect(request.pricingHistory).toHaveLength(3);
    expect(request.pricingHistory[2].cycle).toBe(3);
    expect(request.pricingHistory[2].refundAmount).toBe(3000);
    expect(request.pricingHistory[2].totalPaidAfterCycle).toBe(7500);

    expect(request.financialLedger.cumulativeReissueCharges).toBe(3000);
    expect(request.financialLedger.cumulativeRefunds).toBe(3000);
    expect(request.financialLedger.totalNetPaid).toBe(7500);
  });
});
