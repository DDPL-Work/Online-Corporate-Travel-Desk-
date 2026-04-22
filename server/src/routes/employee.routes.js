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
// All routes below require login
// -------------------------
router.use(verifyToken);

router.get("/profile", employeeCtrl.getProfile); // Get own profile
router.patch("/profile", employeeCtrl.updateProfile); // Update own profile (ManagerRequest workflow)

router.post(
  "/documents",
  authorizeRoles("employee", "travel-admin"),
  uploadMultiple,
  processImage,
  employeeCtrl.uploadTravelDocument,
);

router.delete(
  "/documents/:id",
  authorizeRoles("employee", "travel-admin"),
  employeeCtrl.deleteTravelDocument,
);

router.get(
  "/documents",
  authorizeRoles("employee", "travel-admin"),
  employeeCtrl.getMyDocuments,
);

router.get(
  "/me",
  authorizeRoles("employee"),
  employeeCtrl.getMyTravelAdmin,
);

router.get(
  "/gst",
  authorizeRoles("employee", "travel-admin"),
  employeeCtrl.getMyGstDetails,
);

router.get("/managers", employeeCtrl.getManagers);

module.exports = router;
