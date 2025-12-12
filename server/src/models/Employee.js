// server/src/models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // one-to-one with User
    index: true
  },
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true,
    index: true
  },

  // profile info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },

  // contact & business fields
  mobile: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, default: '' },
  designation: { type: String, trim: true, default: '' },
  employeeCode: { type: String, trim: true, default: '' },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// compound index for common queries
EmployeeSchema.index({ corporateId: 1, status: 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);
