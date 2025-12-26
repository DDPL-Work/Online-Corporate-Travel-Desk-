//index.js

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const corporateRoutes = require('./corporate.routes');
const bookingRoutes = require('./bookings.routes');
const approvalRoutes = require('./approval.routes');
const flightRoutes = require('./flight.routes');
const hotelRoutes = require('./hotel.routes');
const dashboardRoutes = require('./dashboard.routes');
const walletRoutes = require('./wallet.routes');
const voucherRoutes = require('./voucher.routes');
const superAdminRoutes = require('./superAdmin.routes');
const authSSORoutes = require('./auth.sso.routes');
const employeeRoutes = require('./employee.routes');
const corporateAdmin = require('./corporateAdmin.routes');

// ------------------ ✅ IMPORTANT FIX ------------------
// ✅ SSO MUST BE MOUNTED BEFORE /auth (to avoid JWT blocking)
router.use('/auth/sso', authSSORoutes);

// ------------------ Normal Protected Routes ------------------
router.use('/auth', authRoutes);
router.use('/corporate', corporateRoutes);
router.use('/bookings', bookingRoutes);
router.use('/approvals', approvalRoutes);
router.use('/flights', flightRoutes);
router.use('/hotels', hotelRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/wallet', walletRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/employees', employeeRoutes);
router.use('/corporate-admin', corporateAdmin);

// ------------------ API Info ------------------
router.get('/', (req, res) => {
  res.json({
    message: 'Corporate Travel Desk API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      corporate: '/api/v1/corporate',
      bookings: '/api/v1/bookings',
      approvals: '/api/v1/approvals',
      flights: '/api/v1/flights',
      hotels: '/api/v1/hotels',
      dashboard: '/api/v1/dashboard',
      wallet: '/api/v1/wallet',
      vouchers: '/api/v1/vouchers',
      superAdmin: '/api/v1/super-admin',
      sso: '/api/v1/auth/sso',
      employees: '/api/v1/employees',
      corporateAdmin: '/api/v1/corporate-admin'      
    }
  });
});

module.exports = router;
