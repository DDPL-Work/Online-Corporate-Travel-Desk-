"use strict";

const reissueEligibilityService = require("../reissueEligibility.service");

describe("reissueEligibility.service", () => {
  test("returns ONLINE for supported LCC booking with explicit servicing flags", async () => {
    const booking = {
      _id: "booking-1",
      bookingType: "flight",
      executionStatus: "ticketed",
      flightRequest: {
        source: "LCC",
        segments: [
          {
            origin: "DEL",
            destination: "BOM",
            departureDateTime: "2026-06-10T10:00:00.000Z",
            airlineCode: "6E",
            journeyType: "onward",
          },
        ],
      },
      bookingResult: {
        pnr: "PNR123",
        providerBookingId: "BK123",
        providerResponse: {
          raw: {
            Response: {
              Response: {
                TraceId: "TRACE123",
                SupplierBookingReference: "SUP123",
                FlightItinerary: {
                  MiniFareRules: [
                    {
                      Type: "Reissue",
                      OnlineReissueAllowed: true,
                      Details: "INR 2500",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    const result = await reissueEligibilityService.checkOnlineReissueEligibility({
      booking,
    });

    expect(result.eligible).toBe(true);
    expect(result.mode).toBe("ONLINE");
    expect(result.supplierSupport.airlineSupported).toBe(true);
    expect(result.supplierSupport.onlineReissueAllowed).toBe(true);
  });

  test("falls back OFFLINE for unsupported airline", async () => {
    const booking = {
      _id: "booking-2",
      bookingType: "flight",
      executionStatus: "ticketed",
      flightRequest: {
        source: "LCC",
        segments: [
          {
            origin: "DEL",
            destination: "BOM",
            departureDateTime: "2026-06-10T10:00:00.000Z",
            airlineCode: "AI",
          },
        ],
      },
      bookingResult: {
        pnr: "PNR999",
        providerBookingId: "BK999",
        providerResponse: {
          raw: {
            Response: {
              Response: {
                TraceId: "TRACE999",
                FlightItinerary: {
                  MiniFareRules: [
                    {
                      Type: "Reissue",
                      OnlineReissueAllowed: true,
                      Details: "INR 2500",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    const result = await reissueEligibilityService.checkOnlineReissueEligibility({
      booking,
    });

    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("OFFLINE");
    expect(result.reasons).toContain("This airline currently supports offline servicing only.");
  });

  test("falls back OFFLINE when MiniFareRules online servicing flags are missing", async () => {
    const booking = {
      _id: "booking-3",
      bookingType: "flight",
      executionStatus: "ticketed",
      flightRequest: {
        source: "LCC",
        segments: [
          {
            origin: "DEL",
            destination: "BOM",
            departureDateTime: "2026-06-10T10:00:00.000Z",
            airlineCode: "6E",
          },
        ],
      },
      bookingResult: {
        pnr: "PNR777",
        providerBookingId: "BK777",
        providerResponse: {
          raw: {
            Response: {
              Response: {
                TraceId: "TRACE777",
                FlightItinerary: {
                  MiniFareRules: [
                    {
                      Type: "Reissue",
                      Details: "INR 2500",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    const result = await reissueEligibilityService.checkOnlineReissueEligibility({
      booking,
    });

    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("OFFLINE");
    expect(result.reasons).toContain(
      "Supplier fare rules do not permit online reissue for this booking.",
    );
  });

  test("falls back OFFLINE when provider references cannot be reconstructed", async () => {
    const booking = {
      _id: "booking-4",
      bookingType: "flight",
      executionStatus: "ticketed",
      flightRequest: {
        source: "LCC",
        segments: [
          {
            origin: "DEL",
            destination: "BOM",
            departureDateTime: "2026-06-10T10:00:00.000Z",
            airlineCode: "6E",
          },
        ],
      },
      bookingResult: {
        providerResponse: {
          raw: {
            Response: {
              Response: {
                FlightItinerary: {
                  MiniFareRules: [
                    {
                      Type: "Reissue",
                      OnlineReissueAllowed: true,
                      Details: "INR 2500",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    const result = await reissueEligibilityService.checkOnlineReissueEligibility({
      booking,
    });

    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("OFFLINE");
    expect(result.reasons).toContain("Legacy booking missing provider references.");
  });
});
