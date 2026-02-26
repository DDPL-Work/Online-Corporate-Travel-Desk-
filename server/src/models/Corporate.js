
// server/src/models/Corporate.js
const mongoose = require('mongoose');

const corporateSchema = new mongoose.Schema({
  corporateName: {
    type: String,
    required: [true, 'Corporate name is required'],
    trim: true
  },
  registeredAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India' }
  },
  gstCertificate: {
    url: String,
    uploadedAt: Date,
    verified: { type: Boolean, default: false }
  },
  panCard: {
    url: String,
    number: String,
    uploadedAt: Date,
    verified: { type: Boolean, default: false }
  },
  primaryContact: {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true },
    role: {
    type: String,
    enum: ["corporate-super-admin"],
    default: "corporate-super-admin"
  }
  },
  secondaryContact: {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    mobile: String,
    role: {
    type: String,
    enum: ["travel-admin"],
    default: "travel-admin"
  }
  },
  billingDepartment: {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    mobile: String
  },
  ssoConfig: {
    type: { type: String, enum: ['google', 'microsoft', 'zoho'], required: true },
    domain: { type: String, required: true, lowercase: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date
  },
  classification: { type: String, enum: ['prepaid', 'postpaid'], required: true },
  creditLimit: { type: Number, default: 0, min: 0 },
  currentCredit: { type: Number, default: 0, min: 0 },
  billingCycle: { type: String, enum: ['15days', '30days', 'custom'], default: '30days' },
  customBillingDays: { type: Number, min: 1, max: 365 },
  travelPolicy: {
    allowedCabinClass: { type: [String], enum: ['Economy', 'Premium Economy', 'Business', 'First'], default: ['Economy'] },
    allowAncillaryServices: { type: Boolean, default: true },
    advanceBookingDays: { type: Number, default: 0 },
    maxBookingAmount: { type: Number, default: 0 }
  },
  walletBalance: { type: Number, default: 0, min: 0 },
  defaultApprover: { type: String, enum: ['travel-admin', 'manager'], default: 'travel-admin' },
  status: { type: String, enum: ['pending', 'active', 'suspended', 'disabled'], default: 'pending' },
  creditTermsNotes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  onboardedAt: Date,
  onboardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastBillingDate: Date,
  nextBillingDate: Date,
  metadata: {
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastBookingDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
corporateSchema.index({ corporateName: 1 });
corporateSchema.index({ 'primaryContact.email': 1 }, { unique: true });
corporateSchema.index({ 'ssoConfig.domain': 1, 'ssoConfig.verified': 1 });
corporateSchema.index({ status: 1, isActive: 1 });
corporateSchema.index({ classification: 1, status: 1 });

// Virtual for credit utilization
corporateSchema.virtual('creditUtilization').get(function() {
  if (this.classification === 'prepaid' || !this.creditLimit) return 0;
  return ((this.currentCredit / this.creditLimit) * 100).toFixed(2);
});

// Method to check if credit limit exceeded
corporateSchema.methods.canBook = function(amount) {
  if (this.classification === 'prepaid') return this.walletBalance >= amount;
  return (this.currentCredit + amount) <= this.creditLimit;
};

// Pre-save middleware
corporateSchema.pre('save', async function () {
  if (this.isNew && this.status === 'active' && !this.onboardedAt) {
    this.onboardedAt = new Date();
  }
});

module.exports = mongoose.model('Corporate', corporateSchema);
