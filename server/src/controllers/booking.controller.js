const Booking = require('../models/Booking');
const Approval = require('../models/Approval');
const Corporate = require('../models/Corporate');
const WalletTransaction = require('../models/Wallet');
const Ledger = require('../models/Ledger');
const tboService = require('../services/tbo.service');
const pdfService = require('../services/pdf.service');
const notificationService = require('../services/notification.service');
const { generateBookingReference } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create booking request
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = asyncHandler(async (req, res) => {
  const {
    bookingType,
    flightDetails,
    hotelDetails,
    travellers,
    purposeOfTravel,
    pricing,
    paymentDetails
  } = req.body;

  const corporate = req.corporate;
  const user = req.user;

  // Generate booking reference
  const bookingReference = generateBookingReference();

  // Create booking
  const booking = await Booking.create({
    bookingType,
    corporateId: corporate._id,
    userId: user._id,
    bookingReference,
    flightDetails: bookingType === 'flight' ? flightDetails : undefined,
    hotelDetails: bookingType === 'hotel' ? hotelDetails : undefined,
    travellers,
    purposeOfTravel,
    pricing,
    paymentDetails,
    status: 'pending',
    bookingSource: 'online'
  });

  // Create approval request if required
  if (corporate.defaultApprover === 'travel-admin' && user.managerId) {
    const approval = await Approval.create({
      bookingId: booking._id,
      requesterId: user._id,
      approverId: user.managerId,
      corporateId: corporate._id,
      bookingDetails: {
        bookingType,
        destination: bookingType === 'flight' ? flightDetails.destination : hotelDetails.hotelName,
        travelDate: bookingType === 'flight' ? flightDetails.departureDate : hotelDetails.checkInDate,
        amount: pricing.totalAmount,
        purposeOfTravel
      }
    });

    booking.approvalId = approval._id;
    await booking.save();

    // Send notification to approver
    const approver = await require('../models/User').findById(user.managerId);
    await notificationService.sendApprovalNotifications(approval, user, approver, 'request');

    res.status(201).json(
      new ApiResponse(201, booking, 'Booking request created. Awaiting approval.')
    );
  } else {
    // Auto-approve for travel admin or if no manager
    booking.status = 'approved';
    await booking.save();

    res.status(201).json(
      new ApiResponse(201, booking, 'Booking created successfully')
    );
  }
});

// @desc    Confirm booking after approval
// @route   POST /api/v1/bookings/:id/confirm
// @access  Private
exports.confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Not authorized to confirm this booking');
  }

  if (booking.status !== 'approved') {
    throw new ApiError(400, 'Booking must be approved before confirmation');
  }

  const corporate = await Corporate.findById(booking.corporateId);

  // Process payment based on classification
  if (corporate.classification === 'prepaid') {
    if (booking.paymentDetails.method === 'wallet') {
      // Deduct from wallet
      if (corporate.walletBalance < booking.pricing.totalAmount) {
        throw new ApiError(400, 'Insufficient wallet balance');
      }

      corporate.walletBalance -= booking.pricing.totalAmount;
      await corporate.save();

      // Record wallet transaction
      await WalletTransaction.create({
        corporateId: corporate._id,
        type: 'debit',
        amount: booking.pricing.totalAmount,
        balanceBefore: corporate.walletBalance + booking.pricing.totalAmount,
        balanceAfter: corporate.walletBalance,
        description: `Booking payment for ${booking.bookingReference}`,
        bookingId: booking._id,
        status: 'completed'
      });
    }
    // If gateway, payment would be handled separately
  } else {
    // Postpaid - add to ledger
    corporate.currentCredit += booking.pricing.totalAmount;
    await corporate.save();

    await Ledger.create({
      corporateId: corporate._id,
      bookingId: booking._id,
      type: 'booking',
      amount: booking.pricing.totalAmount,
      creditUsed: booking.pricing.totalAmount,
      creditBefore: corporate.currentCredit - booking.pricing.totalAmount,
      creditAfter: corporate.currentCredit,
      description: `Booking charge for ${booking.bookingReference}`,
      status: 'pending'
    });
  }

  // Generate voucher
  if (booking.bookingType === 'flight') {
    const voucherUrl = await pdfService.generateFlightVoucher(booking, req.user, corporate);
    booking.voucherUrl = voucherUrl;
  } else {
    const voucherUrl = await pdfService.generateHotelVoucher(booking, req.user, corporate);
    booking.voucherUrl = voucherUrl;
  }

  booking.status = 'confirmed';
  booking.paymentDetails.paymentStatus = 'completed';
  await booking.save();

  // Update corporate metadata
  corporate.metadata.totalBookings += 1;
  corporate.metadata.totalRevenue += booking.pricing.totalAmount;
  corporate.metadata.lastBookingDate = new Date();
  await corporate.save();

  // Send notification
  await notificationService.sendBookingNotification(booking, req.user, 'confirmation');

  res.status(200).json(
    new ApiResponse(200, booking, 'Booking confirmed successfully')
  );
});

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private
exports.getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, bookingType, dateFrom, dateTo } = req.query;

  const query = { corporateId: req.user.corporateId };

  // Role-based filtering
  if (req.user.role === 'employee') {
    query.userId = req.user.id;
  }

  if (status) query.status = status;
  if (bookingType) query.bookingType = bookingType;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(query)
    .populate('userId', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Booking.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    }, 'Bookings fetched successfully')
  );
});

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email mobile')
    .populate('corporateId', 'corporateName')
    .populate('approvalId');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  // Check authorization
  if (req.user.role === 'employee' && booking.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Not authorized to view this booking');
  }

  res.status(200).json(
    new ApiResponse(200, booking, 'Booking details fetched successfully')
  );
});

// @desc    Cancel booking
// @route   POST /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.userId.toString() !== req.user.id && req.user.role !== 'travel-admin') {
    throw new ApiError(403, 'Not authorized to cancel this booking');
  }

  if (!['confirmed', 'approved'].includes(booking.status)) {
    throw new ApiError(400, 'Only confirmed or approved bookings can be cancelled');
  }

  booking.status = 'cancelled';
  booking.cancellationDetails = {
    cancelledAt: new Date(),
    cancelledBy: req.user.id,
    reason,
    refundAmount: booking.pricing.totalAmount * 0.8, // 80% refund example
    cancellationCharges: booking.pricing.totalAmount * 0.2,
    refundStatus: 'pending'
  };

  await booking.save();

  res.status(200).json(
    new ApiResponse(200, booking, 'Booking cancelled successfully')
  );
});