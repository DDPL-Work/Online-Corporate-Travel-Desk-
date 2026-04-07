// routes/project.routes.js

const express = require("express");
const {
  uploadProjectsExcel,
  getProjectsByCorporate,
  deleteProject,
} = require("../controllers/project.controller");

const {
  authorizeRoles,
  verifyToken,
} = require("../middleware/auth.middleware");

const { upload } = require("../middleware/upload.middleware");

const router = express.Router();

// Apply auth first
router.use(verifyToken);

router.post(
  "/upload",
  upload.single("file"),
  authorizeRoles("travel-admin"),
  uploadProjectsExcel
);

router.get(
  "/my",
  verifyToken,
  authorizeRoles("travel-admin", "employee", "manager"),
  getProjectsByCorporate
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("travel-admin"),
  deleteProject
);

module.exports = router;