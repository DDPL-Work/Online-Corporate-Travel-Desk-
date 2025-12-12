const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  corporateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  bookingDetails: {
    bookingType: String,
    destination: String,
    travelDate: Date,
    amount: Number,
    purposeOfTravel: String
  },
  comments: { type: String, trim: true },
  approverComments: { type: String, trim: true },
  approvedAt: Date,
  rejectedAt: Date,
  notificationSent: { type: Boolean, default: false },
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: Date
}, { timestamps: true });

// Indexes
approvalSchema.index({ approverId: 1, status: 1, createdAt: -1 });
approvalSchema.index({ corporateId: 1, status: 1 });
approvalSchema.index({ requesterId: 1, status: 1 });

// Methods
approvalSchema.methods.approve = async function(comments = '') {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approverComments = comments;
  return await this.save();
};

approvalSchema.methods.reject = async function(comments = '') {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.approverComments = comments;
  return await this.save();
};

module.exports = mongoose.model('Approval', approvalSchema);
