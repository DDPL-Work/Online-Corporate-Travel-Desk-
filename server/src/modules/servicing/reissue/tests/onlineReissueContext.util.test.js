const {
  buildOriginalBookingSnapshot,
  buildOnlineReissueContext,
  validateOnlineReissueContext,
} = require("../utils/onlineReissueContext.util");

describe("onlineReissueContext util", () => {
  test("builds roundtrip booking snapshot with onward and return segments", () => {
    const booking = {
      _id: "booking-1",
      metadata: {
        traceId: "trace-123",
      },
      flightRequest: {
        resultIndex: 9,
        segments: [
          {
            origin: "DEL",
            destination: "BOM",
            departureDateTime: "2026-06-10T06:00:00",
            arrivalDateTime: "2026-06-10T08:00:00",
            airlineCode: "AI",
            flightNumber: "201",
            journeyType: "onward",
          },
          {
            origin: "BOM",
            destination: "DEL",
            departureDateTime: "2026-06-14T18:00:00",
            arrivalDateTime: "2026-06-14T20:00:00",
            airlineCode: "AI",
            flightNumber: "202",
            journeyType: "return",
          },
        ],
      },
      travellers: [
        { firstName: "A", lastName: "Traveller", paxType: "ADULT" },
      ],
      bookingResult: {
        providerBookingId: "987654",
        providerResponse: {
          raw: {
            Response: {
              Response: {
                PNR: "PNR123",
                BookingId: "987654",
                SupplierBookingReference: "SUP-987654",
                FlightItinerary: {
                  Passenger: [
                    {
                      FirstName: "A",
                      LastName: "Traveller",
                      PaxType: "ADULT",
                      Ticket: {
                        TicketId: "TKT-1",
                        TicketNumber: "0987654321",
                      },
                    },
                  ],
                  Ticket: {
                    TourCode: "TCODE",
                    Endorsement: "VALID",
                    CorporateCode: "CORP1",
                    AgentDealCode: "AGENT1",
                  },
                },
              },
            },
          },
        },
      },
    };

    const snapshot = buildOriginalBookingSnapshot(booking);

    expect(snapshot.providerBookingReference).toBe("987654");
    expect(snapshot.supplierBookingReference).toBe("SUP-987654");
    expect(snapshot.pnr).toBe("PNR123");
    expect(snapshot.traceId).toBe("trace-123");
    expect(snapshot.journeyType).toBe(2);
    expect(snapshot.onwardSegments).toHaveLength(1);
    expect(snapshot.returnSegments).toHaveLength(1);
    expect(snapshot.ticketId).toEqual(["TKT-1"]);
    expect(snapshot.ticketData?.TourCode).toBe("TCODE");
    expect(snapshot.providerReferences?.providerBookingReference).toBe("987654");
    expect(snapshot.corporateFareContext?.corporateCode).toBe("CORP1");
  });

  test("prefers persisted original snapshot data when building online reissue context", () => {
    const booking = {
      _id: "booking-2",
      originalBookingSnapshot: {
        bookingId: "booking-2",
        pnr: "OLDPNR",
        supplierBookingReference: "SUP-1",
        providerBookingReference: "PROV-1",
        traceId: "trace-old",
        resultIndex: 4,
        journeyType: 2,
        onwardSegments: [{ origin: "DEL", destination: "BOM" }],
        returnSegments: [{ origin: "BOM", destination: "DEL" }],
        passengers: [{ paxType: "ADULT" }],
        ticketId: ["T1"],
        ticketData: { TourCode: "T1" },
      },
    };

    const context = buildOnlineReissueContext(booking, {
      requestedBookingId: "requested-2",
    });

    expect(context.originalBookingId).toBe("booking-2");
    expect(context.requestedBookingId).toBe("requested-2");
    expect(context.originalPnr).toBe("OLDPNR");
    expect(context.supplierBookingReference).toBe("SUP-1");
    expect(context.providerBookingReference).toBe("PROV-1");
    expect(context.returnSegments).toHaveLength(1);
    expect(context.ticketIds).toEqual(["T1"]);
    expect(context.providerReferences?.providerBookingReference).toBe("PROV-1");
  });

  test("returns missing fields for incomplete reissue context", () => {
    const validation = validateOnlineReissueContext({
      originalPnr: "PNR123",
      providerBookingReference: null,
      supplierBookingReference: "",
      traceId: null,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.missingFields).toEqual([
      "providerBookingReference",
      "supplierBookingReference",
      "traceId",
    ]);
  });
});
