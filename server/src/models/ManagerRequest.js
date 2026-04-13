const mongoose = require('mongoose');

const ManagerRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerEmail: String,
  managerName: String,
  managerRole: String,
  projectCodeId: String,
  projectName: String,
  projectClient: String,
  corporateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corporate',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('ManagerRequest', ManagerRequestSchema);