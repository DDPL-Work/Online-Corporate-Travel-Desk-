const { mapSsrSnapshot } = require("../ssrMapping.service");

describe("ssrMapping.service", () => {
  const storedSegments = [
    {
      segmentIndex: 0,
      journeyType: "onward",
      airlineCode: "AI",
      flightNumber: "202",
      origin: { airportCode: "DEL" },
      destination: { airportCode: "BOM" },
    },
  ];

  test("maps meal by description when code changes", () => {
    const result = mapSsrSnapshot({
      oldSnapshot: {
        meals: [
          {
            journeyType: "onward",
            segmentIndex: 0,
            travelerIndex: 0,
            code: "VGML-OLD",
            description: "Veg Meal",
            price: 250,
          },
        ],
      },
      storedSegments,
      ssrResponses: [
        {
          journeyType: "onward",
          response: {
            Response: {
              MealDynamic: [
                [
                  {
                    WayType: 1,
                    Code: "VGML-NEW",
                    Description: "Veg Meal",
                    Price: 250,
                    AirlineCode: "AI",
                    FlightNumber: "202",
                    Origin: "DEL",
                    Destination: "BOM",
                  },
                ],
              ],
            },
          },
        },
      ],
    });

    expect(result.mappedSnapshot.meals).toHaveLength(1);
    expect(result.mappedSnapshot.meals[0].code).toBe("VGML-NEW");
    expect(result.audit.hasChanges).toBe(false);
    expect(result.audit.mappedSelections[0].matchedBy).toBe("DESCRIPTION");
  });

  test("flags repriced SSR selections and recalculates totals", () => {
    const result = mapSsrSnapshot({
      oldSnapshot: {
        baggage: [
          {
            journeyType: "onward",
            segmentIndex: 0,
            code: "BG15",
            description: "15 Kg",
            weight: "15 Kg",
            price: 900,
          },
        ],
      },
      storedSegments,
      ssrResponses: [
        {
          journeyType: "onward",
          response: {
            Response: {
              Baggage: [
                [
                  {
                    WayType: 1,
                    Code: "BG15",
                    Description: "15 Kg",
                    Weight: "15 Kg",
                    Price: 1200,
                    AirlineCode: "AI",
                    FlightNumber: "202",
                    Origin: "DEL",
                    Destination: "BOM",
                  },
                ],
              ],
            },
          },
        },
      ],
    });

    expect(result.audit.priceChanged).toBe(true);
    expect(result.audit.repricedSelections).toHaveLength(1);
    expect(result.audit.repricedSelections[0].difference).toBe(300);
    expect(result.mappedSnapshot.totalAmount).toBe(1200);
  });

  test("removes unavailable SSR selections and reports notifications", () => {
    const result = mapSsrSnapshot({
      oldSnapshot: {
        seats: [
          {
            journeyType: "onward",
            segmentIndex: 0,
            travelerIndex: 0,
            seatNo: "12A",
            price: 500,
          },
        ],
      },
      storedSegments,
      ssrResponses: [
        {
          journeyType: "onward",
          response: {
            Response: {
              SeatDynamic: [],
            },
          },
        },
      ],
    });

    expect(result.mappedSnapshot.seats).toHaveLength(0);
    expect(result.audit.availabilityChanged).toBe(true);
    expect(result.audit.removedSelections).toHaveLength(1);
    expect(result.audit.notifications[0].resolution).toBe("REMOVED");
  });
});
