// server/src/models/User.js
const mongoose = require('mongoose');

const nameSchema = {
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' }
};

const userSchema = new mongoose.Schema({
  corporateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', index: true, sparse: true }, // tenant
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  name: { type: nameSchema, default: {} },
  password: { type: String, select: false },
  role: { type: String, enum: ['super-admin','corporate-super-admin', 'travel-admin', 'employee'], default: 'employee' },
  ssoProvider: { type: String }, // 'google' | 'microsoft' | ...
  ssoId: { type: String, index: true },
  profilePicture: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

userSchema.index({ corporateId: 1, email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
