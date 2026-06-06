const mongoose = require("mongoose");
const MarkupAccountingService = require("../markupAccounting.service");
const MarkupAudit = require("../../schemas/BookingMarkupAudit.model");
const MarkupRevenue = require("../../schemas/MarkupRevenue.model");

describe("MarkupAccountingService", () => {
  let session;

  beforeAll(async () => {
    // Mock mongoose transactions to reject, falling back to standalone in tests
    mongoose.startSession = jest.fn().mockRejectedValue(new Error("No transactions in test"));

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test_travel_desk");
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await MarkupAudit.deleteMany({});
    await MarkupRevenue.deleteMany({});
  });

  const mockCorporate = {
    _id: new mongoose.Types.ObjectId(),
    name: "Acme Corp"
  };

  it("Test 1: Flight Booking - Single Rule (Audit & Revenue Record Created)", async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      orderId: "ORD123",
      bookingReference: "REF123",
      productType: "flight",
      executionStatus: "booked",
      flightRequest: {
        origin: "DEL",
        destination: "BOM",
        journeyType: "1",
        passengers: { AdultCount: 1 }
      },
      markupSnapshot: {
        supplierFare: 10000,
        finalFare: 11800,
        markupAmount: 1800,
        markupBreakdown: [
          { ruleId: new mongoose.Types.ObjectId(), category: "Airline Wise", markupValue: 1800, markupAmount: 1800, markupMethod: "fixed" }
        ]
      }
    };

    const result = await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    expect(result.success).toBe(true);

    const audit = await MarkupAudit.findOne({ bookingId: booking._id });
    const revenue = await MarkupRevenue.findOne({ bookingId: booking._id });

    expect(audit).toBeTruthy();
    expect(revenue).toBeTruthy();
    expect(audit.fareAfterMarkup.markupAmount).toBe(1800);
    expect(revenue.netRevenue).toBe(1800);
    expect(revenue.markupBreakdown.length).toBe(1);
    expect(revenue.markupBreakdown[0].category).toBe("Airline Wise");
  });

  it("Test 2: Flight Booking - Multiple Markups (Markup Breakdown Stored)", async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      orderId: "ORD124",
      bookingReference: "REF124",
      productType: "flight",
      executionStatus: "ticketed",
      markupSnapshot: {
        supplierFare: 5000,
        finalFare: 6400,
        markupAmount: 1400,
        markupBreakdown: [
          { ruleId: new mongoose.Types.ObjectId(), category: "Airline Wise", markupValue: 400, markupAmount: 400 },
          { ruleId: new mongoose.Types.ObjectId(), category: "Sector Wise", markupValue: 1000, markupAmount: 1000 }
        ]
      }
    };

    const result = await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    expect(result.success).toBe(true);

    const revenue = await MarkupRevenue.findOne({ bookingId: booking._id });
    expect(revenue.netRevenue).toBe(1400);
    expect(revenue.markupBreakdown.length).toBe(2);
    expect(revenue.markupBreakdown[0].category).toBe("Airline Wise");
    expect(revenue.markupBreakdown[1].category).toBe("Sector Wise");
  });

  it("Test 3: Hotel Booking (Audit & Revenue Record Created)", async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      orderId: "ORD125",
      productType: "hotel",
      executionStatus: "booked",
      hotelRequest: {
        city: "Dubai"
      },
      markupSnapshot: {
        supplierFare: 20000,
        finalFare: 21000,
        markupAmount: 1000,
        markupBreakdown: [
          { ruleId: new mongoose.Types.ObjectId(), category: "Hotel Basic", markupValue: 1000, markupAmount: 1000 }
        ]
      }
    };

    const result = await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    expect(result.success).toBe(true);

    const audit = await MarkupAudit.findOne({ bookingId: booking._id });
    const revenue = await MarkupRevenue.findOne({ bookingId: booking._id });

    expect(audit).toBeTruthy();
    expect(revenue).toBeTruthy();
    expect(audit.productType).toBe("hotel");
    expect(revenue.netRevenue).toBe(1000);
  });

  it("Test 4: Duplicate Booking Trigger (No Duplicate Revenue)", async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      orderId: "ORD126",
      productType: "flight",
      executionStatus: "booked",
      markupSnapshot: {
        supplierFare: 10000,
        finalFare: 11000,
        markupAmount: 1000,
        markupBreakdown: [
          { ruleId: new mongoose.Types.ObjectId(), category: "Airline Wise", markupAmount: 1000 }
        ]
      }
    };

    // First call
    await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    
    // Second call with same booking object
    const result2 = await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    
    // Result2 should be undefined (it aborts and returns early)
    expect(result2).toBeUndefined();

    // Check count in DB
    const countAudit = await MarkupAudit.countDocuments({ bookingId: booking._id });
    const countRevenue = await MarkupRevenue.countDocuments({ bookingId: booking._id });

    expect(countAudit).toBe(1);
    expect(countRevenue).toBe(1);
  });

  it("Test 5: Missing Snapshot (Safe Failure)", async () => {
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      orderId: "ORD127",
      productType: "flight",
      executionStatus: "booked",
      // No markupSnapshot
    };

    const result = await MarkupAccountingService.recordBookingRevenue(booking, mockCorporate);
    expect(result).toBeUndefined();

    const countAudit = await MarkupAudit.countDocuments({ bookingId: booking._id });
    const countRevenue = await MarkupRevenue.countDocuments({ bookingId: booking._id });

    expect(countAudit).toBe(0);
    expect(countRevenue).toBe(0);
  });
});
