const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const Corporate = require("../models/Corporate");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");

// Helper to parse dates
const getFilterQuery = (query) => {
  const { fromDate, toDate, corporateId, bookingType } = query;
  const filter = {
    requestStatus: "approved",
    executionStatus: { $nin: ["failed", "not_started"] },
  };

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  if (corporateId && corporateId !== "All") {
    filter.corporateId = new mongoose.Types.ObjectId(corporateId);
  }

  // Handle bookingType filter handled in individual aggregations if needed,
  // but for summary we can add it here if it's "flights" or "hotels"
  if (bookingType && bookingType !== "Both") {
    filter.bookingType = bookingType.toLowerCase().startsWith("flight") ? "flight" : "hotel";
  }

  return filter;
};

/**
 * 🟢 REVENUE SUMMARY
 */
exports.getRevenueSummary = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const [flightData, hotelData] = await Promise.all([
    BookingRequest.aggregate([
      { $match: { ...filter, bookingType: "flight" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricingSnapshot.totalAmount" },
          totalBookings: { $sum: 1 },
        },
      },
    ]),
    HotelBookingRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricingSnapshot.totalAmount" },
          totalBookings: { $sum: 1 },
        },
      },
    ]),
  ]);

  const flights = flightData[0] || { totalRevenue: 0, totalBookings: 0 };
  const hotels = hotelData[0] || { totalRevenue: 0, totalBookings: 0 };

  const totalRevenue = flights.totalRevenue + hotels.totalRevenue;
  const totalBookings = flights.totalBookings + hotels.totalBookings;
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalRevenue,
        totalBookings,
        avgBookingValue,
        flights,
        hotels,
      },
      "Revenue summary fetched",
    ),
  );
});

/**
 * 🟢 COMPANY-WISE REVENUE
 */
exports.getCompanyWiseRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  // We need to aggregate across both collections
  const aggregatePipeline = (model) => [
    { $match: filter },
    {
      $group: {
        _id: "$corporateId",
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
        bookings: { $sum: 1 },
      },
    },
  ];

  const [flightGroups, hotelGroups] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline(BookingRequest)),
    HotelBookingRequest.aggregate(aggregatePipeline(HotelBookingRequest)),
  ]);

  // Combine results
  const companyMap = {};

  const processGroups = (groups, type) => {
    groups.forEach((g) => {
      const id = g._id.toString();
      if (!companyMap[id]) {
        companyMap[id] = { corporateId: id, revenue: 0, bookings: 0, flightRev: 0, hotelRev: 0 };
      }
      companyMap[id].revenue += g.revenue;
      companyMap[id].bookings += g.bookings;
      if (type === "flight") companyMap[id].flightRev += g.revenue;
      if (type === "hotel") companyMap[id].hotelRev += g.revenue;
    });
  };

  processGroups(flightGroups, "flight");
  processGroups(hotelGroups, "hotel");

  const results = Object.values(companyMap);

  // Populate names
  const corporateIds = results.map((r) => r.corporateId);
  const corporates = await Corporate.find({ _id: { $in: corporateIds } }, "corporateName");
  
  const corpNameMap = {};
  corporates.forEach(c => corpNameMap[c._id.toString()] = c.corporateName);

  const totalGlobalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);

  const finalData = results.map(r => ({
    ...r,
    companyName: corpNameMap[r.corporateId] || "Unknown",
    contribution: totalGlobalRevenue > 0 ? (r.revenue / totalGlobalRevenue) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);

  res.status(200).json(new ApiResponse(200, finalData, "Company-wise revenue fetched"));
});

/**
 * 🟢 MONTHLY REVENUE
 */
exports.getMonthlyRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const aggregatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ];

  const [flightMonthly, hotelMonthly] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline),
    HotelBookingRequest.aggregate(aggregatePipeline),
  ]);

  // Format into a consistent timeline (e.g., last 12 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const timeline = {}; // key: "YYYY-MM"

  const merge = (data, type) => {
    data.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!timeline[key]) {
        timeline[key] = { month: monthNames[item._id.month - 1], year: item._id.year, flightRev: 0, hotelRev: 0, totalRev: 0 };
      }
      if (type === 'flight') timeline[key].flightRev += item.revenue;
      if (type === 'hotel') timeline[key].hotelRev += item.revenue;
      timeline[key].totalRev += item.revenue;
    });
  };

  merge(flightMonthly, 'flight');
  merge(hotelMonthly, 'hotel');

  const finalData = Object.keys(timeline).sort().map(key => timeline[key]);

  res.status(200).json(new ApiResponse(200, finalData, "Monthly revenue fetched"));
});

/**
 * 🟢 QUARTERLY REVENUE
 */
exports.getQuarterlyRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const aggregatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } },
        },
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.quarter": 1 } }
  ];

  const [flightQuarterly, hotelQuarterly] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline),
    HotelBookingRequest.aggregate(aggregatePipeline),
  ]);

  const timeline = {};

  const merge = (data, type) => {
    data.forEach(item => {
      const key = `${item._id.year}-Q${item._id.quarter}`;
      if (!timeline[key]) {
        timeline[key] = { quarter: `Q${item._id.quarter}`, year: item._id.year, flightRev: 0, hotelRev: 0, totalRev: 0 };
      }
      if (type === 'flight') timeline[key].flightRev += item.revenue;
      if (type === 'hotel') timeline[key].hotelRev += item.revenue;
      timeline[key].totalRev += item.revenue;
    });
  };

  merge(flightQuarterly, 'flight');
  merge(hotelQuarterly, 'hotel');

  const sortedKeys = Object.keys(timeline).sort();
  const finalData = sortedKeys.map((key, index) => {
    const current = timeline[key];
    let growth = 0;
    if (index > 0) {
      const previous = timeline[sortedKeys[index - 1]];
      if (previous.totalRev > 0) {
        growth = ((current.totalRev - previous.totalRev) / previous.totalRev) * 100;
      }
    }
    return { ...current, growth };
  });

  res.status(200).json(new ApiResponse(200, finalData, "Quarterly revenue fetched"));
});

/**
 * 🟢 HALF-YEARLY REVENUE
 */
exports.getHalfYearlyRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const aggregatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          half: { $cond: [{ $lte: [{ $month: "$createdAt" }, 6] }, 1, 2] },
        },
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.half": 1 } }
  ];

  const [flightData, hotelData] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline),
    HotelBookingRequest.aggregate(aggregatePipeline),
  ]);

  const timeline = {};
  const merge = (data, type) => {
    data.forEach(item => {
      const key = `${item._id.year}-H${item._id.half}`;
      if (!timeline[key]) {
        timeline[key] = { label: `H${item._id.half} ${item._id.year}`, year: item._id.year, flightRev: 0, hotelRev: 0, totalRev: 0 };
      }
      if (type === 'flight') timeline[key].flightRev += item.revenue;
      if (type === 'hotel') timeline[key].hotelRev += item.revenue;
      timeline[key].totalRev += item.revenue;
    });
  };

  merge(flightData, 'flight');
  merge(hotelData, 'hotel');

  const finalData = Object.keys(timeline).sort().map(key => timeline[key]);
  res.status(200).json(new ApiResponse(200, finalData, "Half-yearly revenue fetched"));
});

/**
 * 🟢 YEARLY REVENUE
 */
exports.getYearlyRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const aggregatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: { year: { $year: "$createdAt" } },
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1 } }
  ];

  const [flightData, hotelData] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline),
    HotelBookingRequest.aggregate(aggregatePipeline),
  ]);

  const timeline = {};
  const merge = (data, type) => {
    data.forEach(item => {
      const key = `${item._id.year}`;
      if (!timeline[key]) {
        timeline[key] = { label: `${item._id.year}`, year: item._id.year, flightRev: 0, hotelRev: 0, totalRev: 0 };
      }
      if (type === 'flight') timeline[key].flightRev += item.revenue;
      if (type === 'hotel') timeline[key].hotelRev += item.revenue;
      timeline[key].totalRev += item.revenue;
    });
  };

  merge(flightData, 'flight');
  merge(hotelData, 'hotel');

  const finalData = Object.keys(timeline).sort().map(key => timeline[key]);
  res.status(200).json(new ApiResponse(200, finalData, "Yearly revenue fetched"));
});

/**
 * 🟢 DAILY REVENUE (Custom Granularity)
 */
exports.getDailyRevenue = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const aggregatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$pricingSnapshot.totalAmount" },
      },
    },
    { $sort: { "_id": 1 } }
  ];

  const [flightData, hotelData] = await Promise.all([
    BookingRequest.aggregate(aggregatePipeline),
    HotelBookingRequest.aggregate(aggregatePipeline),
  ]);

  const timeline = {};
  const merge = (data, type) => {
    data.forEach(item => {
      const key = item._id;
      if (!timeline[key]) {
        timeline[key] = { label: key, flightRev: 0, hotelRev: 0, totalRev: 0 };
      }
      if (type === 'flight') timeline[key].flightRev += item.revenue;
      if (type === 'hotel') timeline[key].hotelRev += item.revenue;
      timeline[key].totalRev += item.revenue;
    });
  };

  merge(flightData, 'flight');
  merge(hotelData, 'hotel');

  const finalData = Object.keys(timeline).sort().map(key => timeline[key]);
  res.status(200).json(new ApiResponse(200, finalData, "Daily revenue fetched"));
});

/**
 * 🟢 CORPORATE DETAILED BOOKINGS (Drill-down)
 */
exports.getCorporateDetailedBookings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  const filter = {
    corporateId: new mongoose.Types.ObjectId(id),
    requestStatus: "approved",
    executionStatus: { $nin: ["failed", "not_started"] }
  };

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const [flights, hotels] = await Promise.all([
    BookingRequest.find(filter)
      .select("createdAt bookingReference pricingSnapshot travellers userId bookingType executionStatus")
      .sort({ createdAt: -1 })
      .lean(),
    HotelBookingRequest.find(filter)
      .select("createdAt bookingReference pricingSnapshot travellers userId bookingType executionStatus")
      .sort({ createdAt: -1 })
      .lean()
  ]);

  // Combine and normalize
  const combined = [
    ...flights.map(f => ({
      id: f._id,
      date: f.createdAt,
      reference: f.bookingReference,
      type: "Flight",
      amount: f.pricingSnapshot?.totalAmount || 0,
      employee: `${f.travellers?.[0]?.firstName || "—"} ${f.travellers?.[0]?.lastName || ""}`,
      status: f.executionStatus
    })),
    ...hotels.map(h => ({
      id: h._id,
      date: h.createdAt,
      reference: h.bookingReference,
      type: "Hotel",
      amount: h.pricingSnapshot?.totalAmount || 0,
      employee: `${h.travellers?.[0]?.firstName || "—"} ${h.travellers?.[0]?.lastName || ""}`,
      status: h.executionStatus
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  res.status(200).json(new ApiResponse(200, combined, "Detailed bookings fetched"));
});
