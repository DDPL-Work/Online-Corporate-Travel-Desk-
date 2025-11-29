const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller.js");
const { verifyToken } = require("../middleware/auth.middleware.js");

// Unified login
router.post("/login", authCtrl.login);
router.post("/register", authCtrl.register);
router.get("/me", verifyToken, authCtrl.getProfile);
router.patch("/update-profile", verifyToken,  authCtrl.updateProfile);

module.exports = router;
