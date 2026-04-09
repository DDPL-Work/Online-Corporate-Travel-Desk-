// server/src/routes/superAdmin.routes.js

const router = require("express").Router();
const superAdminCtrl = require("../controllers/superAdmin.controller.js");
const auth = require("../middleware/auth.middleware.js");

// ---------------------
// PUBLIC ROUTES
// ---------------------
router.post("/register", superAdminCtrl.registerSuperAdmin);
router.post("/login", superAdminCtrl.loginSuperAdmin);

// ---------------------
// TBO (SUPER ADMIN ONLY)
// ---------------------
router.post(
  "/tbo/agency-balance",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.getTboAgencyBalance
);

// ---------------------
// PROTECTED ROUTES
// ---------------------
router.get(
  "/profile",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.getProfile
);

router.patch(
  "/update",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.updateProfile
);

router.patch(
  "/:id/deactivate",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.deactivateCorporateAdmin
);

router.patch(
  "/:id/activate",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.activateCorporateAdmin
);

router.delete(
  "/:id",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.removeCorporateAdmin
);

module.exports = router;