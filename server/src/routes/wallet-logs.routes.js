const express = require("express");
const router = express.Router();
const WalletRechargeLog = require("../models/WalletActivityLog");
const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

router.use(verifyToken);
router.use(authorizeRoles("super-admin"));

router.get(
  "/",
  verifyToken,
  authorizeRoles("super-admin"),
  async (req, res) => {
    const { status, corporateId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (corporateId) query.corporateId = corporateId;

    const logs = await WalletRechargeLog.find(query)
      .populate("corporateId", "corporateName")
      .populate("initiatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await WalletRechargeLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  }
);


module.exports = router;
