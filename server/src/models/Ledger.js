
// models/Ledger.js

const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    index: true
  },

  userId: { // 👈 WHO BOOKED
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },

  bookingReference: String, // 👈 VERY IMPORTANT (PNR / Ref ID)

  type: {
    type: String,
    enum: ['booking', 'payment', 'refund', 'adjustment'],
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  transactionType: { // 👈 DEBIT / CREDIT (CRITICAL)
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },

  bookingDate: Date, // 👈 flight booking date

  travelDate: Date, // optional (good for reports)

  description: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ['pending', 'billed', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },

  invoiceId: { // 👈 LINK TO INVOICE (NOT NUMBER)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },

  paymentReference: String,

  metadata: mongoose.Schema.Types.Mixed

}, {
  timestamps: true
});

// Compound Indexes (optional, for common queries)
ledgerSchema.index({ corporateId: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ corporateId: 1, type: 1 });
ledgerSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
