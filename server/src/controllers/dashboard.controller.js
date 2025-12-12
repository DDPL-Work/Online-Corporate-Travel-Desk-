const Booking = require('../models/Booking');
const Approval = require('../models/Approval');
const Corporate = require('../models/Corporate');
const User = require('../models/User');
const WalletTransaction = require('../models/Wallet');
const Ledger = require('../models/Ledger');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

// @desc    Get employee dashboard
// @route   GET /api/v1/dashboard/employee
// @access  Private (Employee)
exports.getEmployeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const stats = {
    totalBookings: await Booking.countDocuments({ userId }),
    upcomingTrips: await Booking.countDocuments({
      userId,
      status: 'confirmed',
      $or: [
        { 'flightDetails.departureDate': { $gte: new Date() } },
        { 'hotelDetails.checkInDate': { $gte: new Date() } }
      ]
    }),
    pendingApprovals: await Approval.countDocuments({ requesterId: userId, status: 'pending' }),
    completedTrips: await Booking.countDocuments({ userId, status: 'completed' })
  };

  const recentBookings = await Booking.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const upcomingTrips = await Booking.find({
    userId,
    status: 'confirmed',
    $or: [
      { 'flightDetails.departureDate': { $gte: new Date() } },
      { 'hotelDetails.checkInDate': { $gte: new Date() } }
    ]
  }).limit(5);

  res.status(200).json(
    new ApiResponse(200, {
      stats,
      recentBookings,
      upcomingTrips
    }, 'Employee dashboard data fetched successfully')
  );
});

// @desc    Get travel admin dashboard
// @route   GET /api/v1/dashboard/travel-admin
// @access  Private (Travel Admin)
exports.getTravelAdminDashboard = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  const stats = {
    totalBookings: await Booking.countDocuments({ corporateId }),

    pendingApprovals: await Approval.countDocuments({
      corporateId,
      status: 'pending'
    }),

    activeEmployees: await User.countDocuments({
      corporateId,
      isActive: true
    }),

    monthlySpend: await Booking.aggregate([
      {
        $match: {
          corporateId, // ✅ FIXED HERE
          createdAt: { $gte: moment().startOf('month').toDate() },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }
        }
      }
    ])
  };

  const recentBookings = await Booking.find({ corporateId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  const upcomingTrips = await Booking.find({
    corporateId,
    status: 'confirmed',
    $or: [
      { 'flightDetails.departureDate': { $gte: new Date() } },
      { 'hotelDetails.checkInDate': { $gte: new Date() } }
    ]
  })
    .populate('userId', 'name email')
    .limit(10);

  const corporate = await Corporate.findById(corporateId);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          ...stats,
          monthlySpend: stats.monthlySpend[0]?.total || 0
        },
        recentBookings,
        upcomingTrips,
        corporate: {
          walletBalance: corporate.walletBalance,
          creditLimit: corporate.creditLimit,
          currentCredit: corporate.currentCredit,
          creditUtilization: corporate.creditUtilization
        }
      },
      'Travel admin dashboard data fetched successfully'
    )
  );
});


// @desc    Get travel company dashboard
// @route   GET /api/v1/dashboard/super-admin
// @access  Private (Super Admin)
exports.getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const stats = {
    totalCorporates: await Corporate.countDocuments({ status: 'active' }),
    totalBookings: await Booking.countDocuments(),
    pendingOnboarding: await Corporate.countDocuments({ status: 'pending' }),
    monthlyRevenue: await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: moment().startOf('month').toDate() },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }
        }
      }
    ])
  };

  const topCorporates = await Corporate.find({ status: 'active' })
    .sort({ 'metadata.totalRevenue': -1 })
    .limit(5);

  const recentBookings = await Booking.find()
    .populate('userId', 'name email')
    .populate('corporateId', 'corporateName')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json(
    new ApiResponse(200, {
      stats: {
        ...stats,
        monthlyRevenue: stats.monthlyRevenue[0]?.total || 0
      },
      topCorporates,
      recentBookings
    }, 'Super admin dashboard data fetched successfully')
  );
});