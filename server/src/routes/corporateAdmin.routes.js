// corporateAdmin.routes.js
const router = require("express").Router();
const corpAdminCtrl = require("../controllers/corporateAdmin.controller");
const auth = require("../middleware/auth.middleware");


router.get(
  "/corporate-profile",
  auth.verifyToken,
  auth.authorizeRoles("travel-admin", "finance_team", "manager", "employee"),
  corpAdminCtrl.getMyCorporateProfile
);

router.patch(
  "/corporate-profile",
  auth.verifyToken,
  auth.authorizeRoles("travel-admin"),
  corpAdminCtrl.updateMyCorporateProfile
);

module.exports = router;
