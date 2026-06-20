// dashboard.controller.js

const Booking = require("../models/Booking");
const Approval = require("../models/Approval");
const Corporate = require("../models/Corporate");
const User = require("../models/User");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const moment = require("moment-timezone");

const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const CancellationQuery = require("../models/CancellationQuery");
const FlightReissue = require("../models/FlightReissueRequest");

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
   TRAVEL ADMIN DASHBOARD
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

  const travelAdminCount = await User.countDocuments({
    corporateId,
    role: "travel-admin",
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
   MANAGER DASHBOARD (TEAM LEVEL)
========================================================= */
exports.getManagerDashboard = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const corporateId = req.user.corporateId;

  if (!corporateId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Corporate ID missing"));
  }

  /* =============================
     GET TEAM MEMBERS
  ============================== */
  const teamUsers = await User.find({
    corporateId,
    managerId: managerId, // 🔥 KEY RELATION
  }).select("_id");

  const teamUserIds = teamUsers.map((u) => u._id);

  if (teamUserIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          stats: {},
          recentBookings: [],
          upcomingTrips: [],
        },
        "No team members assigned to this manager",
      ),
    );
  }

  const monthlyStart = moment().startOf("month").toDate();

  /* =============================
     Monthly Spend (TEAM ONLY)
  ============================== */
  const monthlySpendAgg = await Booking.aggregate([
    {
      $match: {
        corporateId,
        userId: { $in: teamUserIds },
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
     Core Counts (TEAM ONLY)
  ============================== */

  const totalBookings = await Booking.countDocuments({
    corporateId,
    userId: { $in: teamUserIds },
  });

  const pendingApprovals = await Approval.countDocuments({
    corporateId,
    userId: { $in: teamUserIds },
    status: "pending",
  });

  const teamSize = teamUserIds.length;

  const activeUsers = await User.countDocuments({
    _id: { $in: teamUserIds },
    isActive: true,
  });

  /* =============================
     Recent Bookings (TEAM)
  ============================== */

  const recentBookings = await Booking.find({
    corporateId,
    userId: { $in: teamUserIds },
  })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(10);

  /* =============================
     Upcoming Trips (TEAM)
  ============================== */

  const upcomingTrips = await Booking.find({
    corporateId,
    userId: { $in: teamUserIds },
    status: "confirmed",
    $or: [
      { "flightDetails.departureDate": { $gte: new Date() } },
      { "hotelDetails.checkInDate": { $gte: new Date() } },
    ],
  })
    .populate("userId", "name email role")
    .limit(10);

  /* =============================
     RESPONSE
  ============================== */

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          totalBookings,
          pendingApprovals,
          teamSize,
          activeUsers,
          monthlySpend,
        },
        recentBookings,
        upcomingTrips,
      },
      "Manager dashboard fetched successfully",
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

// @desc    Get sidebar badge counts (role-aware)
// @route   GET /api/v1/dashboard/sidebar-badges
// @access  Private
exports.getSidebarBadges = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const corporateId = req.user.corporateId;
  const role = req.user.role;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let pendingRequests = 0;
  let offlineCancellations = 0;
  let reissueRequests = 0;
  let approvedRequests = 0;

  // Helper to count reissues across all schemas
  const countReissues = async (corpId, stage, field, value) => {
    let total = 0;
    const query = { approvalStage: stage };
    if (corpId) query["corporate.companyId"] = String(corpId);
    if (field) query[field] = value;
    try {
      total += await FlightReissue.countDocuments(query);
    } catch (_) { /* skip */ }
    try {
      const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
      const oq = { approvalStage: stage };
      if (corpId) oq.corporateId = corpId;
      if (field) oq[field] = value;
      total += await OfflineReissueRequest.countDocuments(oq);
    } catch (_) { /* skip */ }
    try {
      const OnlineReissueRequest = require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
      const rq = { approvalStage: stage };
      if (corpId) rq.corporateId = corpId;
      if (field) rq[field] = value;
      total += await OnlineReissueRequest.countDocuments(rq);
    } catch (_) { /* skip */ }
    return total;
  };

  if (role === "manager") {
    const [flightPending, hotelPending, cancelPending, reissuePending, flightApproved, hotelApproved] = await Promise.all([
      BookingRequest.countDocuments({
        corporateId,
        requestStatus: "pending_approval",
      }),
      HotelBookingRequest.countDocuments({
        corporateId,
        requestStatus: "pending_approval",
      }),
      CancellationQuery.countDocuments({
        corporateId,
        approvalStage: { $in: ["MANAGER", "PENDING_PARALLEL_APPROVAL"] },
        managerId: userId,
        requestStatus: "PENDING_MANAGER_APPROVAL",
      }),
      countReissues(corporateId, "MANAGER", "managerId", userId),
      BookingRequest.countDocuments({
        corporateId,
        requestStatus: "approved",
        approvedAt: { $gte: sevenDaysAgo },
      }),
      HotelBookingRequest.countDocuments({
        corporateId,
        requestStatus: "approved",
        approvedAt: { $gte: sevenDaysAgo },
      }),
    ]);
    pendingRequests = flightPending + hotelPending + cancelPending + reissuePending;
    approvedRequests = flightApproved + hotelApproved;
  }

  if (role === "travel-admin") {
    const [flightPending, hotelPending, cancelPending, reissuePending] = await Promise.all([
      BookingRequest.countDocuments({
        corporateId,
        requestStatus: { $in: ["pending_approval", "manager_approved"] },
      }),
      HotelBookingRequest.countDocuments({
        corporateId,
        requestStatus: { $in: ["pending_approval", "manager_approved"] },
      }),
      CancellationQuery.countDocuments({
        corporateId,
        travelAdminId: userId,
        approvalStage: { $in: ["TRAVEL_ADMIN", "PENDING_PARALLEL_APPROVAL", "MANAGER_APPROVED"] },
        requestStatus: { $in: ["PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_MANAGER_APPROVAL"] },
      }),
      countReissues(corporateId, "TRAVEL_ADMIN", "travelAdminId", userId),
    ]);
    pendingRequests = flightPending + hotelPending + cancelPending + reissuePending;
    offlineCancellations = cancelPending;
    reissueRequests = reissuePending;
  }

  // Configured approver — checks travadminApprover.userId
  if (role === "travel-admin" || role === "configured-approver") {
    const [cancelAdmin, reissueAdmin] = await Promise.all([
      CancellationQuery.countDocuments({
        corporateId,
        "travadminApprover.userId": userId,
        approvalStage: "TRAVEL_ADMIN_APPROVER",
        requestStatus: "PENDING_ADMIN_APPROVAL",
      }),
      countReissues(corporateId, "TRAVEL_ADMIN_APPROVER", "travadminApprover.userId", userId),
    ]);
    pendingRequests += cancelAdmin + reissueAdmin;
    offlineCancellations += cancelAdmin;
    reissueRequests += reissueAdmin;
  }

  if (role === "ops-member" || role === "super-admin") {
    const [cancelOps, reissueOps] = await Promise.all([
      CancellationQuery.countDocuments({
        approvalStage: "EXECUTED",
        providerExecutionStatus: { $in: ["OPS_ASSIGNED", "FAILED"] },
      }),
      countReissues(null, "EXECUTED"),
    ]);
    offlineCancellations = cancelOps;
    reissueRequests = reissueOps;
  }

  if (role === "employee") {
    const [myRecentBookings, myCancellations, myReissues] = await Promise.all([
      BookingRequest.countDocuments({
        userId,
        createdAt: { $gte: sevenDaysAgo },
      }),
      CancellationQuery.countDocuments({
        "user.id": userId,
        status: { $in: ["RESOLVED", "IN_PROGRESS"] },
      }),
      FlightReissue.countDocuments({
        "user.id": userId,
        createdAt: { $gte: sevenDaysAgo },
      }),
    ]);
    pendingRequests = myRecentBookings;
    offlineCancellations = myCancellations;
    reissueRequests = myReissues;
  }

  res.status(200).json(
    new ApiResponse(200, {
      pendingRequests,
      offlineCancellations,
      reissueRequests,
      approvedRequests,
    }, "Sidebar badges fetched"),
  );
});
