const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'adjustment'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentGateway: {
    name: String,
    orderId: String,
    paymentId: String,
    signature: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed',
    index: true
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// ------------------ INDEXES ------------------
walletTransactionSchema.index({ corporateId: 1, createdAt: -1 });
walletTransactionSchema.index({ corporateId: 1, type: 1, status: 1 });
walletTransactionSchema.index({ transactionId: 1 });

// ------------------ EXPORT ------------------
module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
