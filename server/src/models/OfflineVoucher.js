// models/OfflineVoucher.js

const mongoose = require('mongoose');

const offlineVoucherSchema = new mongoose.Schema({
  voucherType: {
    type: String,
    enum: ['flight', 'hotel'],
    required: true,
    index: true
  },
  voucherNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Flight Offline Details
  flightDetails: {
    airlineName: String,
    airlineCode: String,
    pnr: { type: String, index: true },
    ticketNumber: String,
    flightNumber: String,
    origin: String,
    destination: String,
    flightDate: Date,
    departureTime: String,
    arrivalTime: String,
    cabinClass: String,
    travellerName: String,
    fareDetails: {
      baseFare: Number,
      taxes: Number,
      total: Number,
      currency: { type: String, default: 'INR' }
    }
  },

  // Hotel Offline Details
  hotelDetails: {
    hotelName: String,
    checkInDate: Date,
    checkOutDate: Date,
    bookingId: String,
    confirmationNumber: String,
    travellerName: String,
    roomType: String,
    mealPlan: String,
    numberOfNights: Number,
    numberOfRooms: Number,
    address: String,
    city: String,
    fareDetails: {
      roomCharge: Number,
      taxes: Number,
      total: Number,
      currency: { type: String, default: 'INR' }
    }
  },

  purposeOfTravel: {
    type: String,
    trim: true
  },

  voucherUrl: String,

  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active',
    index: true
  },

  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound Indexes (optional, for common queries)
offlineVoucherSchema.index({ corporateId: 1, voucherType: 1, createdAt: -1 });
offlineVoucherSchema.index({ 'flightDetails.pnr': 1 });

// Pre-save middleware for auto-generating voucher number
offlineVoucherSchema.pre('save', function(next) {
  if (this.isNew && !this.voucherNumber) {
    const { generateVoucherNumber } = require('../utils/helpers');
    this.voucherNumber = generateVoucherNumber(this.voucherType === 'flight' ? 'FLT' : 'HTL');
  }
  next();
});

module.exports = mongoose.model('OfflineVoucher', offlineVoucherSchema);
