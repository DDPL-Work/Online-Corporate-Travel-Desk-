const mongoose = require('mongoose');

const CorporateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registeredAddress: String,
  domain: String, // for SSO whitelist
  sso: {
    type: { type: String, enum: ['google','microsoft','zoho','none'], default: 'none' },
    enabled: { type: Boolean, default: false },
    config: mongoose.Schema.Types.Mixed
  },
  kyc: {
    gstUrl: String,
    panUrl: String,
    verified: { type: Boolean, default: false },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  classification: { type: String, enum: ['prepaid','postpaid'], default: 'postpaid' },
  creditLimit: { type: Number, default: 0 },
  billingCycleDays: { type: Number, default: 30 },
  travelPolicy: {
    allowedCabin: { type: [String], default: ['Economy'] },
    allowAncillaries: { type: Boolean, default: true }
  },
  walletBalance: { type: Number, default: 0 },
  defaultApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Corporate', CorporateSchema);
