// dashboard.controller.js

const Booking = require("../models/Booking");
const Approval = require("../models/Approval");
const Corporate = require("../models/Corporate");
const User = require("../models/User");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const moment = require("moment-timezone");

/* =========================================================
   EMPLOYEE DASHBOARD
========================================================= */
exports.getEmployeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = {
    totalBookings: await Booking.countDocuments({ userId }),
    upcomingTrips: await Booking.countDocuments({
      userId,
      status: "confirmed",
      $or: [
        { "flightDetails.departureDate": { $gte: new Date() } },
        { "hotelDetails.checkInDate": { $gte: new Date() } },
      ],
    }),
    pendingApprovals: await Approval.countDocuments({
      requesterId: userId,
      status: "pending",
    }),
    completedTrips: await Booking.countDocuments({
      userId,
      status: "completed",
    }),
  };

  const recentBookings = await Booking.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const upcomingTrips = await Booking.find({
    userId,
    status: "confirmed",
    $or: [
      { "flightDetails.departureDate": { $gte: new Date() } },
      { "hotelDetails.checkInDate": { $gte: new Date() } },
    ],
  }).limit(5);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { stats, recentBookings, upcomingTrips },
        "Employee dashboard fetched successfully",
      ),
    );
});

/* =========================================================
   TRAVEL ADMIN + CORPORATE SUPER ADMIN DASHBOARD
========================================================= */
exports.getCorporateDashboard = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  if (!corporateId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Corporate ID missing"));
  }

  const corporate = await Corporate.findById(corporateId);

  if (!corporate) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Corporate not found"));
  }

  const monthlyStart = moment().startOf("month").toDate();

  /* =============================
     Monthly Spend
  ============================== */
  const monthlySpendAgg = await Booking.aggregate([
    {
      $match: {
        corporateId,
        createdAt: { $gte: monthlyStart },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.totalAmount" },
      },
    },
  ]);

  const monthlySpend = monthlySpendAgg[0]?.total || 0;

  /* =============================
     Core Counts
  ============================== */

  const totalBookings = await Booking.countDocuments({ corporateId });

  const pendingApprovals = await Approval.countDocuments({
    corporateId,
    status: "pending",
  });

  const employeeCount = await User.countDocuments({
    corporateId,
    role: "employee",
  });

  const corporateSuperAdminCount = await User.countDocuments({
    corporateId,
    role: "corporate-super-admin",
  });

  const travelAdminCount = await User.countDocuments({
    corporateId,
    role: { $in: ["travel-admin", "corporate-super-admin"] }, // include both
  });

  const activeUsers = await User.countDocuments({
    corporateId,
    isActive: true,
  });

  /* =============================
     Recent + Upcoming
  ============================== */

  const recentBookings = await Booking.find({ corporateId })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(10);

  const upcomingTrips = await Booking.find({
    corporateId,
    status: "confirmed",
    $or: [
      { "flightDetails.departureDate": { $gte: new Date() } },
      { "hotelDetails.checkInDate": { $gte: new Date() } },
    ],
  })
    .populate("userId", "name email role")
    .limit(10);

  /* =============================
     Credit Utilization Safe Calc
  ============================== */

  const creditUtilization =
    corporate.creditLimit > 0
      ? ((corporate.currentCredit || 0) / corporate.creditLimit) * 100
      : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          totalBookings,
          pendingApprovals,
          employeeCount,
          corporateSuperAdminCount,
          travelAdminCount,
          activeUsers,
          monthlySpend,
        },
        recentBookings,
        upcomingTrips,
        corporate: {
          walletBalance: corporate.walletBalance || 0,
          creditLimit: corporate.creditLimit || 0,
          currentCredit: corporate.currentCredit || 0,
          creditUtilization: Number(creditUtilization.toFixed(2)),
          billingCycle: corporate.billingCycle,
          classification: corporate.classification,
          nextBillingDate: corporate.nextBillingDate,
        },
      },
      "Corporate dashboard fetched successfully",
    ),
  );
});

/* =========================================================
   PLATFORM SUPER ADMIN DASHBOARD
========================================================= */
exports.getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const monthlyStart = moment().startOf("month").toDate();

  const monthlyRevenueAgg = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: monthlyStart },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.totalAmount" },
      },
    },
  ]);

  const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

  const stats = {
    totalCorporates: await Corporate.countDocuments({ status: "active" }),
    totalBookings: await Booking.countDocuments(),
    pendingOnboarding: await Corporate.countDocuments({ status: "pending" }),
    monthlyRevenue,
  };

  const topCorporates = await Corporate.find({ status: "active" })
    .sort({ "metadata.totalRevenue": -1 })
    .limit(5);

  const recentBookings = await Booking.find()
    .populate("userId", "name email")
    .populate("corporateId", "corporateName")
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats,
        topCorporates,
        recentBookings,
      },
      "Super admin dashboard fetched successfully",
    ),
  );
});
