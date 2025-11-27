const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  corporate: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['flight','hotel'] },
  provider: { type: String }, // TekTravels / supplier
  traceId: String,
  requestData: mongoose.Schema.Types.Mixed,
  pricing: {
    total: Number,
    currency: String
  },
  status: { type: String, enum: ['requested','approved','booked','cancelled','completed'], default: 'requested' },
  approvers: [{
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    comment: String,
    actedAt: Date
  }],
  voucherUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
