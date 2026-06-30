// controllers/voucher.controller.js

const OfflineVoucher = require('../models/OfflineVoucher');
const pdfService = require('../services/pdf.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create offline voucher
// @route   POST /api/v1/vouchers
// @access  Private (Travel Admin)
exports.createOfflineVoucher = asyncHandler(async (req, res) => {
  const {
    voucherType,
    userId,
    flightDetails,
    hotelDetails,
    purposeOfTravel,
    notes
  } = req.body;

  const voucher = await OfflineVoucher.create({
    voucherType,
    corporateId: req.user.corporateId,
    userId,
    createdBy: req.user.id,
    flightDetails: voucherType === 'flight' ? flightDetails : undefined,
    hotelDetails: voucherType === 'hotel' ? hotelDetails : undefined,
    purposeOfTravel,
    notes
  });

  res.status(201).json(
    new ApiResponse(201, voucher, 'Offline voucher created successfully')
  );
});

// @desc    Get all offline vouchers
// @route   GET /api/v1/vouchers
// @access  Private (Travel Admin)
exports.getAllVouchers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, voucherType, status } = req.query;

  const query = { corporateId: req.user.corporateId };

  if (voucherType) query.voucherType = voucherType;
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const vouchers = await OfflineVoucher.find(query)
    .populate('userId', 'name email')
    .populate('createdBy', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await OfflineVoucher.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      vouchers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    }, 'Vouchers fetched successfully')
  );
});

// @desc    Get single voucher
// @route   GET /api/v1/vouchers/:id
// @access  Private
exports.getVoucher = asyncHandler(async (req, res) => {
  const voucher = await OfflineVoucher.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('createdBy', 'name');

  if (!voucher) {
    throw new ApiError(404, 'Voucher not found');
  }

  res.status(200).json(
    new ApiResponse(200, voucher, 'Voucher details fetched successfully')
  );
});