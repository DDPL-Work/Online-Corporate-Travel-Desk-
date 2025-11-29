const express = require("express");
const router = express.Router();

router.use("/auth", require('./auth.routes.js'));
router.use("/bookings", require('./bookings.routes.js'));
router.use("/super-admin", require("./superAdmin.routes.js"));
router.use("/corporate-admin", require("./corporateAdmin.routes"));
router.use("/employee", require("./employee.routes"));

module.exports = router;
