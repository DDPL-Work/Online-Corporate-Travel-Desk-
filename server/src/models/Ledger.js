const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    index: true // for faster lookups
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  type: {
    type: String,
    enum: ['booking', 'payment', 'refund', 'adjustment', 'credit_note', 'debit_note'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  creditUsed: {
    type: Number,
    default: 0
  },
  creditBefore: Number,
  creditAfter: Number,
  description: {
    type: String,
    required: true,
    trim: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true, // ensures uniqueness but allows nulls
    trim: true
  },
  invoiceUrl: String,
  dueDate: Date,
  paidDate: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentReference: String,
  billingPeriod: {
    startDate: Date,
    endDate: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Compound Indexes (optional, for common queries)
ledgerSchema.index({ corporateId: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ corporateId: 1, type: 1 });
ledgerSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
