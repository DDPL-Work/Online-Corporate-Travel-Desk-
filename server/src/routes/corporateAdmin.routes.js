const router = require("express").Router();
const corpAdminCtrl = require("../controllers/corporateAdmin.controller");
const auth = require("../middleware/auth.middleware");



router.post(
  "/employee/create",
  auth.verifyToken,
  auth.authorizeRoles("CorporateAdmin"),
  corpAdminCtrl.createEmployee
);

router.patch(
  "/employee/:id/deactivate",
  auth.verifyToken,
  auth.authorizeRoles("CorporateAdmin"),
  corpAdminCtrl.deactivateEmployee
);
router.patch(
  "/employee/:id/activate",
  auth.verifyToken,
  auth.authorizeRoles("CorporateAdmin"),
  corpAdminCtrl.activateEmployee
);

router.delete(
  "/employee/:id",
  auth.verifyToken,
  auth.authorizeRoles("CorporateAdmin"),
  corpAdminCtrl.removeEmployee
);

module.exports = router;
