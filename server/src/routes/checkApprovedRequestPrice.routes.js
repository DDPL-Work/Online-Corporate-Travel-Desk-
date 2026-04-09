const express = require("express");
const {
  checkApprovedFlightPrice,
} = require("../controllers/checkApprovedRequestPrice.controller");
const router = express.Router();

router.post("/flight", checkApprovedFlightPrice);

module.exports = router;
