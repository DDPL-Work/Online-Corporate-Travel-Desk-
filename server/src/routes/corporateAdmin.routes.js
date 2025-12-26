// corporateAdmin.routes.js
const router = require("express").Router();
const corpAdminCtrl = require("../controllers/corporateAdmin.controller");
const auth = require("../middleware/auth.middleware");

// router.patch(
//   "/employee/:id/deactivate",
//   auth.verifyToken,
//   auth.authorizeRoles("CorporateAdmin"),
//   corpAdminCtrl.deactivateEmployee
// );
// router.patch(
//   "/employee/:id/activate",
//   auth.verifyToken,
//   auth.authorizeRoles("CorporateAdmin"),
//   corpAdminCtrl.activateEmployee
// );

// router.delete(
//   "/employee/:id",
//   auth.verifyToken,
//   auth.authorizeRoles("CorporateAdmin"),
//   corpAdminCtrl.removeEmployee
// );

router.get(
  "/me",
  auth.verifyToken,
  auth.authorizeRoles("travel-admin"),
  corpAdminCtrl.getMyCorporateProfile
);

module.exports = router;
