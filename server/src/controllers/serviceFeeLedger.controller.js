const WalletTransaction = require("../models/Wallet");
const Corporate = require("../models/Corporate");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");

const getBaseFilterQuery = (query) => {
  const { corporateId, bookingType } = query;
  const filter = {
    type: "service_fee_deduction",
    status: "completed",
  };
  if (corporateId && corporateId !== "All Onboarded") {
    filter.corporateId = new mongoose.Types.ObjectId(corporateId);
  }
  if (bookingType && bookingType !== "Both (F+H)") {
    filter.bookingModel = bookingType === "Flight" ? "BookingRequest" : "HotelBookingRequest";
  }
  return filter;
};

const getFilterQuery = (query) => {
  const { dateRange, customFromDate, customToDate } = query;
  const filter = getBaseFilterQuery(query);

  if (dateRange) {
    const now = new Date();
    if (dateRange === "This Month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.createdAt = { $gte: firstDay };
    } else if (dateRange === "Last Month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      filter.createdAt = { $gte: firstDayLastMonth, $lte: lastDayLastMonth };
    } else if (dateRange === "This Year") {
      const firstDayThisYear = new Date(now.getFullYear(), 0, 1);
      filter.createdAt = { $gte: firstDayThisYear };
    } else if (dateRange === "Custom" && customFromDate && customToDate) {
      // Parse custom dates and ensure end date covers the entire day
      const from = new Date(customFromDate);
      const to = new Date(customToDate);
      to.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: from, $lte: to };
    }
  }

  return filter;
};

/**
 * 🟢 GET SERVICE FEE STATS
 * Aggregates the ServiceFeeLedger to provide summary stats
 * GET /api/v1/service-fee-ledger/stats
 */
exports.getServiceFeeStats = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);
  const baseFilter = getBaseFilterQuery(req.query);

  const statsPipeline = [
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalBookings: { $sum: 1 },
        flightRevenue: {
          $sum: { $cond: [{ $eq: ["$bookingModel", "BookingRequest"] }, "$amount", 0] }
        },
        flightBookings: {
          $sum: { $cond: [{ $eq: ["$bookingModel", "BookingRequest"] }, 1, 0] }
        },
        hotelRevenue: {
          $sum: { $cond: [{ $eq: ["$bookingModel", "HotelBookingRequest"] }, "$amount", 0] }
        },
        hotelBookings: {
          $sum: { $cond: [{ $eq: ["$bookingModel", "HotelBookingRequest"] }, 1, 0] }
        }
      }
    }
  ];

  const topCorporatePipeline = [
    { $match: filter },
    {
      $group: {
        _id: "$corporateId",
        totalRevenue: { $sum: "$amount" },
        totalBookings: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "corporates",
        localField: "_id",
        foreignField: "_id",
        as: "corporate"
      }
    },
    { $unwind: { path: "$corporate", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        totalRevenue: 1,
        totalBookings: 1,
        corporateName: "$corporate.corporateName"
      }
    }
  ];

  // Growth Pipeline
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthFilter = { ...baseFilter, createdAt: { $gte: firstDayThisMonth } };
  const lastMonthFilter = { ...baseFilter, createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } };

  const growthPipeline = (matchFilter) => [
    { $match: matchFilter },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ];

  const [result, topCorporateResult, thisMonthResult, lastMonthResult] = await Promise.all([
    WalletTransaction.aggregate(statsPipeline),
    WalletTransaction.aggregate(topCorporatePipeline),
    WalletTransaction.aggregate(growthPipeline(thisMonthFilter)),
    WalletTransaction.aggregate(growthPipeline(lastMonthFilter))
  ]);

  const data = result[0] || {
    totalRevenue: 0,
    totalBookings: 0,
    flightRevenue: 0,
    flightBookings: 0,
    hotelRevenue: 0,
    hotelBookings: 0
  };

  data.topCorporate = topCorporateResult[0] || null;

  // Calculate Growth %
  const thisMonthRev = thisMonthResult[0]?.total || 0;
  const lastMonthRev = lastMonthResult[0]?.total || 0;

  let growth = 0;
  if (lastMonthRev === 0) {
    growth = thisMonthRev > 0 ? 100 : 0;
  } else {
    growth = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;
  }
  data.growth = Math.round(growth);

  res.status(200).json(new ApiResponse(200, data, "Service Fee Stats fetched successfully"));
});

/**
 * 🟢 GET SERVICE FEE COLLECTIONS
 * Fetches the individual ledger records for a detailed view
 * GET /api/v1/service-fee-ledger
 */
exports.getServiceFeeCollections = asyncHandler(async (req, res) => {
  const filter = getFilterQuery(req.query);

  const records = await WalletTransaction.find(filter)
    .populate("corporateId", "corporateName corporateType classification")
    .populate("processedBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(200, records, "Service Fee Collections fetched successfully"));
});
