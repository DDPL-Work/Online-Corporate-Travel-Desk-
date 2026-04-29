// corporateAdmin.routes.js
const router = require("express").Router();
const corpAdminCtrl = require("../controllers/corporateAdmin.controller");
const auth = require("../middleware/auth.middleware");


router.get(
  "/me",
  auth.verifyToken,
  auth.authorizeRoles("travel-admin", "manager"),
  corpAdminCtrl.getMyCorporateProfile
);

router.patch(
  "/me",
  auth.verifyToken,
  auth.authorizeRoles("travel-admin"),
  corpAdminCtrl.updateMyCorporateProfile
);

module.exports = router;
