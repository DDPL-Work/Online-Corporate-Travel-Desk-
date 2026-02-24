const User = require("../models/User");

/**
 * GET /api/travel-admin/me
 * Fetch approver based on same email domain
 */

exports.getMyTravelAdmin = async (req, res) => {
  try {
    const { id, email, role } = req.user;

    // Only employee should call this
    if (role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Only employees can fetch approver",
      });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee email",
      });
    }

    // 1️⃣ Extract domain
    const domain = email.split("@")[1].toLowerCase();

    // 2️⃣ Find approver in same domain
    const approver = await User.findOne({
      role: { $in: ["travel-admin", "admin"] },
      email: { $regex: `@${domain}$`, $options: "i" },
      isActive: true,
    }).select("_id name email phone designation role");

    if (!approver) {
      return res.status(404).json({
        success: false,
        message: "No approver found for your domain",
      });
    }

    return res.status(200).json({
      success: true,
      data: approver,
    });
  } catch (error) {
    console.error("GET APPROVER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approver",
    });
  }
};
