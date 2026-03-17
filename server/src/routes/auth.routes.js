// server/src/routes/auth.routes.js
const express = require("express");
const router = express.Router();

const authCtrl = require("../controllers/auth.controller.js");
const { verifyToken } = require("../middleware/auth.middleware.js");

// ----------------------
// Public Routes
// ----------------------

// Login with email/password
router.post("/login", authCtrl.login);

// Request password setup/reset email
router.post("/request-set-password", authCtrl.requestSetPassword);

// Set password using token
router.post("/set-password/:token", authCtrl.setPassword);

// ----------------------
// Protected Routes (any authenticated user)
// ----------------------
router.use(verifyToken);

// Get logged-in user profile
router.get("/me", authCtrl.getProfile);

// Update logged-in user profile
router.patch("/update-profile", authCtrl.updateProfile);

// ----------------------
// Optional: Disable public registration
// ----------------------
router.post("/register", authCtrl.register);

module.exports = router;
