//index.js

const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const corporateRelatedRoutes = require("./corporate.related.routes");
const bookingRoutes = require("./bookings.routes");
const approvalRoutes = require("./approval.routes");
const flightRoutes = require("./flight.routes");
const hotelRoutes = require("./hotel.routes");
const dashboardRoutes = require("./dashboard.routes");
const walletRoutes = require("./wallet.routes");
const voucherRoutes = require("./voucher.routes");
const superAdminRoutes = require("./superAdmin.routes");
const authSSORoutes = require("./auth.sso.routes");
const employeeRoutes = require("./employee.routes");
const corporateAdmin = require("./corporateAdmin.routes");
const corporateManager = require("./manager.routes");
const walletLogsRoutes = require("./wallet-logs.routes");
const validatePrice = require("./checkApprovedRequestPrice.routes");
const travelAdmin = require("./travelAdmin.routes");
const postPaidCorporate = require("./postPaid.corporate.routes");
const flightAmendment = require("./flightAmendment.routes");
const hotelAmendment = require("./hotelAmendment.routes");
const gestRoutes = require("./gst.routes");
const hotelBooking = require('./hotelBooking.routes');
const project = require('./project.routes');

// ------------------ ✅ IMPORTANT FIX ------------------
// ✅ SSO MUST BE MOUNTED BEFORE /auth (to avoid JWT blocking)
router.use("/auth/sso", authSSORoutes);

// ------------------ Normal Protected Routes ------------------
router.use("/auth", authRoutes);
router.use("/corporate-related", corporateRelatedRoutes);
router.use("/bookings", bookingRoutes);
router.use("/approvals", approvalRoutes);
router.use("/flights", flightRoutes);
router.use("/hotels", hotelRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/wallet", walletRoutes);
router.use("/vouchers", voucherRoutes);


router.use("/super-admin", superAdminRoutes);
router.use("/employees", employeeRoutes);
router.use("/corporate-admin", corporateAdmin);
router.use("/travel-admin", travelAdmin);
router.use("/corporate-manager", corporateManager);
router.use("/corporate-projects", project);


router.use("/wallet-logs", walletLogsRoutes);
// router.use("/tbo", tboRoutes);
router.use("/validate-price", validatePrice);
router.use("/postpaid", postPaidCorporate);
router.use("/flights/amendments", flightAmendment);
router.use("/hotels/amendments", hotelAmendment);
router.use("/onboarding/gst", gestRoutes);
router.use("/hotel-booking", hotelBooking)

// ------------------ API Info ------------------
router.get("/", (req, res) => {
  res.json({
    message: "Corporate Travel Desk API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      corporate: "/api/v1/corporate",
      bookings: "/api/v1/bookings",
      approvals: "/api/v1/approvals",
      flights: "/api/v1/flights",
      hotels: "/api/v1/hotels",
      hotels: "/api/v1/hotel-booking",
      dashboard: "/api/v1/dashboard",
      wallet: "/api/v1/wallet",
      vouchers: "/api/v1/vouchers",
      sso: "/api/v1/auth/sso",


      
      superAdmin: "/api/v1/super-admin",
      employees: "/api/v1/employees",
      corporateAdmin: "/api/v1/corporate-admin",    
      travelAdmin: "api/v1/travel-admin",
      corporateManager: "/api/v1/corporate-manager",    
      project: "/api/v1/corporate-projects",   
      
      
      walletLogsRoutes: "/api/v1/wallet-logs",
      // tboRoutes: '/api/v1/tbo'
      validatePrice: "api/v1/validate-price",
      corporateSuperAdmin: "api/v1/corporate-super-admin",
      postPaidCorporate: "api/v1/postpaid",
      flightAmendment: "api/v1/flights/amendments",
      hotelAmendment: "api/v1/hotels/amendments",

      gestRoutes: "api/v1/onboarding/gst",
    },
  });
});

module.exports = router;
