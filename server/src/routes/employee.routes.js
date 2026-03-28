//employee.routes.js


const express = require("express");
const router = express.Router();
const employeeCtrl = require("../controllers/employee.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const {
  uploadMultiple,
  processImage,
} = require("../middleware/upload.middleware");

// -------------------------
// Self Profile (any logged-in employee)
// -------------------------
router.use(verifyToken);

router.get("/profile", employeeCtrl.getProfile); // get own profile
router.patch("/profile", employeeCtrl.updateProfile); // update own profile

router.post(
  "/documents",
  verifyToken,
  authorizeRoles("employee", "travel-admin"),
  uploadMultiple,
  processImage,
  employeeCtrl.uploadTravelDocument,
);

router.delete(
  "/documents/:id",
  verifyToken,
  authorizeRoles("employee", "travel-admin"),
  employeeCtrl.deleteTravelDocument,
);

router.get(
  "/documents",
  verifyToken,
  authorizeRoles("employee", "travel-admin"),
  employeeCtrl.getMyDocuments,
);

router.get(
  "/me",
  verifyToken,
  authorizeRoles("employee"),
  employeeCtrl.getMyTravelAdmin,
);



module.exports = router;
