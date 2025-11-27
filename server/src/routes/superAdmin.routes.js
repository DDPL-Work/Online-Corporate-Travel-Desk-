const router = require("express").Router();
const superAdminCtrl = require("../controllers/superAdmin.controller.js");
const auth = require("../middleware/auth.middleware.js");

// -------- PUBLIC --------
// Login Super Admin
router.post("/login", superAdminCtrl.loginSuperAdmin);

// -------- PROTECTED --------
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
  "/:id/deactivated",
  auth.verifyToken,
  auth.verifySuperAdmin,
  superAdminCtrl.deactivateCorporateAdmin
);

router.patch(
  "/:id/activated",
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
