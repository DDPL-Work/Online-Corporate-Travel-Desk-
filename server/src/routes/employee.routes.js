const router = require("express").Router();
const employeeCtrl = require("../controllers/employee.controller");
const auth = require("../middleware/auth.middleware");

// -------------------------
// PUBLIC ROUTES
// -------------------------
router.post("/login", employeeCtrl.loginEmployee);

// -------------------------
// PROTECTED EMPLOYEE ROUTES
// -------------------------
router.get(
  "/profile",
  auth.verifyToken,
  auth.authorizeRoles("Employee"),
  employeeCtrl.getProfile
);

router.patch(
  "/profile",
  auth.verifyToken,
  auth.authorizeRoles("Employee"),
  employeeCtrl.updateProfile
);

module.exports = router;
