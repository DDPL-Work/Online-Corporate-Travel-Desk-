"use strict";

const pdfService = require("../pdf.service");
const reissueTicketGenerationService = require("../../modules/servicing/reissue/services/reissueTicketGeneration.service");

const createMockBrowser = (captureHtml) => ({
  newPage: async () => ({
    setContent: async (html) => captureHtml(html),
    pdf: async () => Buffer.from("pdf"),
  }),
  close: async () => {},
});

const createFlightSegment = ({
  origin = "DEL",
  destination = "BOM",
  departure = "2026-06-10T06:00:00.000Z",
  arrival = "2026-06-10T08:00:00.000Z",
  airlineCode = "AI",
  airlineName = "Air India",
  flightNumber = "201",
  tripIndicator = 1,
} = {}) => ({
  Origin: {
    Airport: {
      AirportCode: origin,
      AirportName: `${origin} Airport`,
      CityName: origin,
      Terminal: "1",
    },
    DepTime: departure,
  },
  Destination: {
    Airport: {
      AirportCode: destination,
      AirportName: `${destination} Airport`,
      CityName: destination,
      Terminal: "2",
    },
    ArrTime: arrival,
  },
  Airline: {
    AirlineCode: airlineCode,
    AirlineName: airlineName,
    FlightNumber: flightNumber,
  },
  FlightNumber: flightNumber,
  Duration: 120,
  TripIndicator: tripIndicator,
  CabinClass: 2,
  Baggage: "15 KG",
  CabinBaggage: "7 KG",
});

const createPassenger = ({
  firstName,
  lastName,
  title = "Mr",
  ticketId,
  ticketNumber,
  barcodeContent,
} = {}) => ({
  FirstName: firstName,
  LastName: lastName,
  Title: title,
  PaxType: "ADULT",
  Ticket: {
    TicketId: ticketId,
    TicketNumber: ticketNumber,
  },
  BarcodeDetails: {
    Barcode: barcodeContent ? [{ Content: barcodeContent }] : [],
  },
});

const createNormalBooking = ({ passengers = null, travellers = null } = {}) => {
  const resolvedTravellers =
    travellers ||
    [
      {
        title: "Mr",
        firstName: "Aman",
        lastName: "Sharma",
        isLeadPassenger: true,
        email: "aman@example.com",
        phoneWithCode: "+919900000000",
      },
    ];
  const resolvedPassengers =
    passengers ||
    [
      createPassenger({
        firstName: "Aman",
        lastName: "Sharma",
        ticketId: "TKT-1",
        ticketNumber: "0987654321",
        barcodeContent: "SUPPLIER-BARCODE-1",
      }),
    ];
  const segment = createFlightSegment();

  return {
    bookingReference: "BOOK-001",
    createdAt: "2026-06-01T10:00:00.000Z",
    travellers: resolvedTravellers,
    flightRequest: {
      fareQuote: {
        Results: [
          {
            FareRules: [],
          },
        ],
      },
      ssrSnapshot: {
        seats: [{ label: "14A", amount: 400, segmentIndex: 0, paxIndex: 0 }],
      },
    },
    pricingSnapshot: {
      totalAmount: 6400,
    },
    bookingResult: {
      pnr: "PNR123",
      onwardPNR: "PNR123",
      providerResponse: {
        raw: {
          Response: {
            Response: {
              FlightItinerary: {
                TBOConfNo: "PNR123",
                Segments: [segment],
                Fare: {
                  BaseFare: 5000,
                  Tax: 1000,
                  PublishedFare: 6000,
                  Currency: "INR",
                },
                Passenger: resolvedPassengers,
              },
            },
          },
        },
      },
    },
    activeTicketSnapshot: {
      segments: [
        {
          ssr: {
            seat: { label: "14A" },
            meal: { label: "VGML" },
            baggage: { label: "10KG" },
          },
        },
      ],
      ssr: {
        totalSeatAmount: 400,
        totalMealAmount: 0,
        totalBaggageAmount: 0,
        totalSSRAmount: 400,
      },
    },
  };
};

describe("pdf.service shared ticket barcode rendering", () => {
  let capturedHtml = "";

  beforeEach(() => {
    capturedHtml = "";
    jest.spyOn(pdfService, "_fetchAirlineLogo").mockResolvedValue(null);
    jest
      .spyOn(pdfService, "_launchBrowser")
      .mockResolvedValue(createMockBrowser((html) => {
        capturedHtml = html;
      }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("normal ticket contains barcode", async () => {
    await pdfService.generateFlightTicketPdf({
      booking: createNormalBooking(),
      journeyType: "onward",
    });

    expect(capturedHtml).toMatch(/class="barcode-main-img" src="data:image\/png;base64,[^"]+"/);
    expect(capturedHtml).toMatch(/class="barcode-qr-img" src="data:image\/png;base64,[^"]+"/);
    expect(capturedHtml).toContain("Passenger Barcode");
  });

  test("reissued ticket contains barcode alongside SSR details", async () => {
    const originalBooking = {
      bookingReference: "BOOK-REI-1",
      createdAt: "2026-06-01T10:00:00.000Z",
      travellers: [
        {
          title: "Ms",
          firstName: "Riya",
          lastName: "Kapoor",
          isLeadPassenger: true,
          email: "riya@example.com",
          phoneWithCode: "+919811111111",
          paxType: "ADULT",
        },
      ],
      bookingSnapshot: {
        fareType: "Regular Fare",
        cabinClass: "Economy",
        providerReferences: {
          ticketNumbers: ["2223334445"],
        },
      },
      originalBookingSnapshot: {
        passengers: [
          {
            ticketId: "RTKT-1",
            ticketNumber: "2223334445",
          },
        ],
        providerReferences: {
          ticketNumbers: ["2223334445"],
        },
      },
      ticketData: {},
    };

    const request = {
      requestId: "REQ-1",
      originalPnr: "OLDPNR",
      newPnr: "NEWPNR",
      metadata: {
        selectedSSR: {
          seats: [{ label: "12A", amount: 500, segmentIndex: 0, paxIndex: 0 }],
          meals: [{ label: "VGML", amount: 250, segmentIndex: 0, paxIndex: 0 }],
          baggage: [{ label: "15KG ADD-ON", amount: 300, segmentIndex: 0, paxIndex: 0 }],
        },
      },
      activeTicketSnapshot: {
        ssrSnapshot: {
          seats: [{ label: "12A", amount: 500, segmentIndex: 0, paxIndex: 0 }],
          meals: [{ label: "VGML", amount: 250, segmentIndex: 0, paxIndex: 0 }],
          baggage: [{ label: "15KG ADD-ON", amount: 300, segmentIndex: 0, paxIndex: 0 }],
        },
      },
      financialLedger: null,
      pricingHistory: [],
    };

    const selectedFlight = {
      origin: "BLR",
      destination: "HYD",
      departureTime: "2026-06-12T07:00:00.000Z",
      arrivalTime: "2026-06-12T08:15:00.000Z",
      airlineCode: "6E",
      airlineName: "IndiGo",
      flightNumber: "312",
      baggage: "15 KG",
      cabinBaggage: "7 KG",
      fare: 4800,
      newFare: 4800,
      pricingSnapshot: {
        seatSSR: 500,
        mealSSR: 250,
        baggageSSR: 300,
      },
      segments: [
        {
          origin: "BLR",
          destination: "HYD",
          departureTime: "2026-06-12T07:00:00.000Z",
          arrivalTime: "2026-06-12T08:15:00.000Z",
          airlineCode: "6E",
          airlineName: "IndiGo",
          flightNumber: "312",
          baggage: "15 KG",
          cabinBaggage: "7 KG",
          duration: 75,
          journeyType: "onward",
        },
      ],
    };

    const syntheticBooking = reissueTicketGenerationService.buildSyntheticBooking({
      originalBooking,
      request,
      selectedFlight,
      pricingSnapshot: selectedFlight.pricingSnapshot,
    });

    await pdfService.generateFlightTicketPdf({
      booking: syntheticBooking,
      journeyType: "onward",
    });

    expect(capturedHtml).toContain("12A");
    expect(capturedHtml).toContain("VGML");
    expect(capturedHtml).toMatch(/class="barcode-main-img" src="data:image\/png;base64,[^"]+"/);
    expect(capturedHtml).toMatch(/class="barcode-qr-img" src="data:image\/png;base64,[^"]+"/);
  });

  test("multi-passenger ticket contains barcode per passenger", async () => {
    const booking = createNormalBooking({
      travellers: [
        {
          title: "Mr",
          firstName: "Aman",
          lastName: "Sharma",
          isLeadPassenger: true,
          email: "aman@example.com",
          phoneWithCode: "+919900000000",
        },
        {
          title: "Ms",
          firstName: "Neha",
          lastName: "Sharma",
          isLeadPassenger: false,
          email: "",
          phoneWithCode: "",
        },
      ],
      passengers: [
        createPassenger({
          firstName: "Aman",
          lastName: "Sharma",
          ticketId: "TKT-1",
          ticketNumber: "0987654321",
          barcodeContent: "SUPPLIER-BARCODE-1",
        }),
        createPassenger({
          firstName: "Neha",
          lastName: "Sharma",
          ticketId: "TKT-2",
          ticketNumber: "0987654322",
          barcodeContent: "SUPPLIER-BARCODE-2",
        }),
      ],
    });

    await pdfService.generateFlightTicketPdf({
      booking,
      journeyType: "onward",
    });

    const barcodeMatches = capturedHtml.match(/class="barcode-main-img" src="data:image\/png;base64,[^"]+"/g) || [];
    expect(barcodeMatches.length).toBeGreaterThanOrEqual(2);
  });
});
