const express = require("express");
const router = express.Router();

// Ping route to test if routing works
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Routes working!"
    });
});

// Here you will add:
router.use("/bookings", require('./bookings.routes.js'));
router.use("/super-admin", require("./superAdmin.routes.js"));
router.use("/corporate-admin", require("./corporateAdmin.routes"));
router.use("/employee", require("./employee.routes"));

module.exports = router;
