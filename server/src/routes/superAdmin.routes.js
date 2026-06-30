// server/src/routes/superAdmin.routes.js

const router = require("express").Router();
const superAdminCtrl = require("../controllers/superAdmin.controller.js");
const { verifyToken, verifySuperAdmin, authorizeRoles } = require("../middleware/auth.middleware.js");

// ---------------------
// PUBLIC ROUTES
// ---------------------
router.post("/register", superAdminCtrl.registerSuperAdmin);
router.post("/login", superAdminCtrl.loginSuperAdmin);

// ---------------------
// TBO (SUPER ADMIN + OPS)
// ---------------------
router.post(
  "/tbo/agency-balance",
  verifyToken,
  authorizeRoles("super-admin", "ops-member"),
  superAdminCtrl.getTboAgencyBalance
);

// ---------------------
// PROTECTED ROUTES
// ---------------------
router.get(
  "/profile",
  verifyToken,
  authorizeRoles("super-admin", "ops-member"),
  superAdminCtrl.getProfile
);

router.patch(
  "/update",
  verifyToken,
  authorizeRoles("super-admin", "ops-member"),
  superAdminCtrl.updateProfile
);

router.patch(
  "/:id/deactivate",
  verifyToken,
  verifySuperAdmin,
  superAdminCtrl.deactivateCorporateAdmin
);

router.patch(
  "/:id/activate",
  verifyToken,
  verifySuperAdmin,
  superAdminCtrl.activateCorporateAdmin
);

router.delete(
  "/:id",
  verifyToken,
  verifySuperAdmin,
  superAdminCtrl.removeCorporateAdmin
);

module.exports = router;