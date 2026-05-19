const express = require("express");
const { verifyToken, authorizeRoles } = require("../../../../middleware/auth.middleware");
const controller = require("../controllers/reissue.offlineSearch.controller");
const { searchLimiter } = require("../../../../middleware/rateLimit.middleware");

const router = express.Router();

router.post(
  "/search-options",
  verifyToken,
  authorizeRoles("employee", "manager", "travel-admin"),
  searchLimiter,
  controller.searchOptions,
);

module.exports = router;
