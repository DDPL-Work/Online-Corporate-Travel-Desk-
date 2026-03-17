const mongoose = require('mongoose');

const travelPolicySchema = new mongoose.Schema({
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    unique: true,
    index: true
  },
  policyName: {
    type: String,
    required: true,
    trim: true
  },

  // Flight Policies
  flightPolicy: {
    allowedCabinClasses: [{
      type: String,
      enum: ['Economy', 'Premium Economy', 'Business', 'First']
    }],
    preferredAirlines: [{ type: String, trim: true }],
    restrictedAirlines: [{ type: String, trim: true }],
    advanceBookingDays: {
      domestic: { type: Number, default: 0 },
      international: { type: Number, default: 7 }
    },
    maxFareAmount: {
      domestic: { type: Number, default: 0 },
      international: { type: Number, default: 0 }
    },
    allowDirectFlightsOnly: { type: Boolean, default: false },
    allowAncillaryServices: {
      meals: { type: Boolean, default: true },
      baggage: { type: Boolean, default: true },
      seats: { type: Boolean, default: true }
    }
  },

  // Hotel Policies
  hotelPolicy: {
    allowedStarRatings: [{
      type: Number,
      min: 1,
      max: 5
    }],
    maxRoomRate: { type: Number, default: 0 },
    allowedCities: [{ type: String, trim: true }],
    preferredHotelChains: [{ type: String, trim: true }],
    maxNightsPerBooking: { type: Number, default: 0 }
  },

  // Approval Policies
  approvalPolicy: {
    requiresApproval: { type: Boolean, default: true },
    approvalThreshold: { type: Number, default: 0 },
    approvalLevels: [{
      level: { type: Number, required: true },
      role: { type: String, required: true, trim: true },
      amount: { type: Number, required: true }
    }],
    autoApprovalForAmountBelow: { type: Number, default: 0 }
  },

  // General Policies
  generalPolicy: {
    allowWeekendTravel: { type: Boolean, default: true },
    requirePurposeOfTravel: { type: Boolean, default: true },
    allowSameDayBooking: { type: Boolean, default: false },
    cancellationAllowed: { type: Boolean, default: true },
    cancellationHoursBefore: { type: Number, default: 24 },
    amendmentAllowed: { type: Boolean, default: true }
  },

  isActive: { type: Boolean, default: true },

  effectiveFrom: Date,
  effectiveTo: Date,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Optional virtual example: duration of policy
travelPolicySchema.virtual('policyDuration').get(function() {
  if (this.effectiveFrom && this.effectiveTo) {
    return Math.ceil((this.effectiveTo - this.effectiveFrom) / (1000 * 60 * 60 * 24));
  }
  return null;
});

module.exports = mongoose.model('TravelPolicy', travelPolicySchema);
