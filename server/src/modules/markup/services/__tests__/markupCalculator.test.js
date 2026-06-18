const MarkupResolverService = require("../markupResolver.service");

describe("MarkupResolverService and Stacking Logic", () => {
  const flightRules = [
    {
      _id: "r1",
      category: "Airline Wise",
      criteria: { airline: "AI" },
      markupMethod: "fixed",
      markupValue: 400
    },
    {
      _id: "r2",
      category: "Cabin Wise",
      criteria: { cabinClass: 3 },
      markupMethod: "percentage",
      markupValue: 50
    },
    {
      _id: "r3",
      category: "Sector Wise",
      criteria: { origin: "DEL", destination: "BOM" },
      markupMethod: "fixed",
      markupValue: 100
    }
  ];

  it("AI + Premium Economy matches both rules", () => {
    const flight = {
      AirlineCode: "AI",
      Segments: [[{ CabinClass: 3 }]]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.length).toBe(2);
    expect(matched.some(r => r._id === "r1")).toBe(true);
    expect(matched.some(r => r._id === "r2")).toBe(true);
  });

  it("6E + Premium Economy matches only cabin rule", () => {
    const flight = {
      AirlineCode: "6E",
      Segments: [[{ CabinClass: 3 }]]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("r2");
  });

  it("AI + Economy matches only airline rule", () => {
    const flight = {
      AirlineCode: "AI",
      Segments: [[{ CabinClass: 2 }]]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("r1");
  });

  it("Airline + Cabin + Sector matches all three rules", () => {
    const flight = {
      AirlineCode: "AI",
      Origin: "DEL",
      Destination: "BOM",
      Segments: [[{ CabinClass: 3 }]]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.length).toBe(3);
  });

  it("Round Trip (multi segment arrays) matching", () => {
    const flight = {
      AirlineCode: "6E",
      Segments: [
        [{ CabinClass: 2 }],
        [{ CabinClass: 3 }] // Second leg has Premium Economy
      ]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("r2"); // Should match because one segment is CabinClass 3
  });

  it("Multi Segment Sector Match", () => {
    const flight = {
      AirlineCode: "AI",
      Segments: [
        [
          { Origin: { Airport: { AirportCode: "DEL" } }, Destination: { Airport: { AirportCode: "BLR" } }, CabinClass: 2 },
          { Origin: { Airport: { AirportCode: "BLR" } }, Destination: { Airport: { AirportCode: "BOM" } }, CabinClass: 2 }
        ]
      ]
    };
    
    const matched = MarkupResolverService.resolveRules(flightRules, flight, "flight");
    expect(matched.some(r => r._id === "r3")).toBe(true); // matches DEL -> BOM overall
  });

  const flightTypeRules = [
    {
      _id: "ft1",
      category: "Domestic Flights",
      criteria: {}, // no criteria needed
      markupMethod: "fixed",
      markupValue: 1000
    },
    {
      _id: "ft2",
      category: "International Flights",
      criteria: {}, // no criteria needed
      markupMethod: "fixed",
      markupValue: 1000
    }
  ];

  it("Test Case 1: DEL -> IXL (Expected: Domestic)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "IN" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft1");
  });

  it("Test Case 2: DEL -> CCU (Expected: Domestic)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "IN" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft1");
  });

  it("Test Case 3: DEL -> DXB (Expected: International)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "AE" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft2");
  });

  it("Test Case 4: DEL -> BOM -> DXB (Expected: International)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "IN" } }
        },
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "AE" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft2");
  });

  it("Test Case 5: JFK -> LAX (Expected: Domestic)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "US" } },
          Destination: { Airport: { CountryCode: "US" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft1");
  });

  it("Test Case 6: DXB -> AUH (Expected: Domestic)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "AE" } },
          Destination: { Airport: { CountryCode: "AE" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft1");
  });

  it("Test Case 7: LHR -> CDG (Expected: International)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "GB" } },
          Destination: { Airport: { CountryCode: "FR" } }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft2");
  });

  it("Test Case 8: Missing CountryCode Fallback (Expected: International)", () => {
    const flight = {
      Segments: [[
        {
          Origin: { Airport: {} },
          Destination: { Airport: {} }
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(flightTypeRules, flight, "flight");
    expect(matched.length).toBe(1);
    expect(matched[0]._id).toBe("ft2");
  });

  it("Combined Stacking: Airline Rule + Domestic Flights Rule", () => {
    const rules = [...flightRules, ...flightTypeRules];
    const flight = {
      AirlineCode: "AI", // matches r1
      Segments: [[
        {
          Origin: { Airport: { CountryCode: "IN" } },
          Destination: { Airport: { CountryCode: "IN" } } // Matches ft1
        }
      ]]
    };
    const matched = MarkupResolverService.resolveRules(rules, flight, "flight");
    expect(matched.length).toBe(2);
    expect(matched.some(r => r._id === "r1")).toBe(true);
    expect(matched.some(r => r._id === "ft1")).toBe(true);
  });

  const hotelRules = [
    {
      _id: "h1",
      category: "City Wise",
      criteria: { city: "DEL" },
      markupMethod: "fixed",
      markupValue: 200
    },
    {
      _id: "h2",
      category: "Hotel Wise",
      criteria: { hotel: "TAJ123" },
      markupMethod: "percentage",
      markupValue: 10
    }
  ];

  it("Hotel City + Hotel Wise matches both rules", () => {
    const hotel = {
      CityCode: "DEL",
      HotelCode: "TAJ123"
    };
    const matched = MarkupResolverService.resolveRules(hotelRules, hotel, "hotel");
    expect(matched.length).toBe(2);
  });
});
