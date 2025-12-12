const express = require("express");
const router = express.Router();
const employeeCtrl = require("../controllers/employee.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

// -------------------------
// Self Profile (any logged-in employee)
// -------------------------
router.use(verifyToken);

router.get("/profile", employeeCtrl.getProfile); // get own profile
router.patch("/profile", employeeCtrl.updateProfile); // update own profile

// -------------------------
// Admin routes (Corporate Admin / Travel Admin)
// -------------------------
router.use(authorizeRoles("corporate-admin", "travel-admin"));

router.get("/", employeeCtrl.getAllEmployees); // list all employees
router.get("/:id", employeeCtrl.getEmployee); // single employee
router.put("/:id", employeeCtrl.updateEmployee); // update employee
router.patch("/:id/toggle-status", employeeCtrl.toggleEmployeeStatus); // toggle status
router.delete("/:id", employeeCtrl.removeEmployee); // delete employee

module.exports = router;
