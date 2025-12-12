const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingType: { type: String, enum: ['flight', 'hotel'], required: true },
  corporateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingReference: { type: String, unique: true, required: true },

  flightDetails: {
    pnr: String,
    ticketNumber: String,
    airline: String,
    airlineCode: String,
    flightNumber: String,
    origin: String,
    originCity: String,
    destination: String,
    destinationCity: String,
    departureDate: Date,
    departureTime: String,
    arrivalDate: Date,
    arrivalTime: String,
    cabinClass: String,
    segments: [{
      airline: String,
      flightNumber: String,
      origin: String,
      destination: String,
      departureDate: Date,
      departureTime: String,
      arrivalDate: Date,
      arrivalTime: String,
      duration: Number,
      cabinClass: String
    }],
    bookingId: String,
    traceId: String,
    fareType: String,
    baggage: {
      checkIn: String,
      cabin: String
    }
  },

  hotelDetails: {
    hotelName: String,
    hotelCode: String,
    address: { street: String, city: String, state: String, country: String, pincode: String },
    checkInDate: Date,
    checkOutDate: Date,
    roomType: String,
    mealPlan: String,
    numberOfRooms: Number,
    numberOfNights: Number,
    numberOfGuests: Number,
    bookingId: String,
    confirmationNumber: String,
    hotelRating: Number,
    amenities: [String]
  },

  travellers: [{
    title: String,
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    gender: String,
    passportNumber: String,
    passportExpiry: Date,
    nationality: String,
    isLeadPassenger: Boolean,
    seatNumber: String,
    mealPreference: String
  }],

  purposeOfTravel: { type: String, required: true, trim: true },

  pricing: {
    baseFare: { type: Number, required: true },
    taxes: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    commission: { type: Number, default: 0 }
  },

  paymentDetails: {
    method: { type: String, enum: ['wallet', 'gateway', 'postpaid'], required: true },
    transactionId: String,
    paidAt: Date,
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    gatewayResponse: mongoose.Schema.Types.Mixed
  },

  approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Approval' },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'confirmed', 'cancelled', 'completed', 'failed'], default: 'pending' },

  voucherUrl: String,
  ticketUrl: String,
  invoiceUrl: String,

  bookingSource: { type: String, enum: ['online', 'offline'], default: 'online' },

  tboBookingId: String,
  tboResponse: mongoose.Schema.Types.Mixed,

  cancellationDetails: {
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    refundAmount: Number,
    cancellationCharges: Number,
    refundStatus: { type: String, enum: ['pending', 'processed', 'failed'] }
  },

  amendments: [{
    amendedAt: Date,
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: String,
    charges: Number
  }],

  notifications: [{
    type: { type: String, enum: ['email', 'sms'] },
    sentAt: Date,
    status: String
  }]
}, { timestamps: true });

// Indexes
bookingSchema.index({ corporateId: 1, userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, bookingType: 1 });
bookingSchema.index({ 'flightDetails.pnr': 1 });
bookingSchema.index({ 'flightDetails.departureDate': 1 });
bookingSchema.index({ 'hotelDetails.checkInDate': 1 });

// Pre-save
bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.bookingReference) {
    const { generateBookingReference } = require('../utils/helpers');
    this.bookingReference = generateBookingReference();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
