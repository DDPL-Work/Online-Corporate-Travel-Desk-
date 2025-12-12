const crypto = require('crypto');
const moment = require('moment-timezone');

/**
 * Generate unique booking reference
 */
const generateBookingReference = (prefix = 'BKTD') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Generate unique voucher number
 */
const generateVoucherNumber = (type = 'VCH') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${type}${timestamp}${random}`;
};

/**
 * Calculate credit utilization percentage
 */
const calculateCreditUtilization = (currentCredit, creditLimit) => {
  if (!creditLimit || creditLimit === 0) return 0;
  return ((currentCredit / creditLimit) * 100).toFixed(2);
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Calculate next billing date
 */
const calculateNextBillingDate = (billingCycle, customDays = null) => {
  const now = moment();
  
  switch (billingCycle) {
    case '15days':
      return now.add(15, 'days').toDate();
    case '30days':
      return now.add(30, 'days').toDate();
    case 'custom':
      return now.add(customDays || 30, 'days').toDate();
    default:
      return now.add(30, 'days').toDate();
  }
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
  return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
};

/**
 * Mask sensitive data
 */
const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
};

/**
 * Calculate date difference
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

/**
 * Validate GST number format
 */
const isValidGST = (gstNumber) => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstNumber);
};

/**
 * Validate PAN number format
 */
const isValidPAN = (panNumber) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(panNumber);
};

/**
 * Parse search filters
 */
const parseSearchFilters = (query) => {
  const filters = {};
  
  if (query.search) {
    filters.$or = [
      { corporateName: new RegExp(query.search, 'i') },
      { 'primaryContact.email': new RegExp(query.search, 'i') }
    ];
  }
  
  if (query.status) filters.status = query.status;
  if (query.classification) filters.classification = query.classification;
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {};
    if (query.dateFrom) filters.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filters.createdAt.$lte = new Date(query.dateTo);
  }
  
  return filters;
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  
  return { skip, limit: limitNum, page: pageNum };
};

/**
 * Create pagination metadata
 */
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  generateBookingReference,
  generateVoucherNumber,
  calculateCreditUtilization,
  formatCurrency,
  calculateNextBillingDate,
  sanitizeInput,
  generateOTP,
  maskEmail,
  maskPhone,
  daysBetween,
  isValidGST,
  isValidPAN,
  parseSearchFilters,
  paginate,
  createPaginationMeta
};
