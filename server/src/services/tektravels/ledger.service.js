const LedgerEntry = require('../models/LedgerEntry');
const Corporate = require('../models/Corporate');

exports.createBookingLedger = async ({ corporateId, amount, bookingId }) => {
  // create ledger entry and update corporate.creditUtilization or walletBalance
};
