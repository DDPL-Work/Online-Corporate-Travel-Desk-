const bcrypt = require("bcryptjs");
const SuperAdmin = require("../models/SuperAdmin.model");
const logger = require("../utils/logger");

module.exports = async function seedSuperAdmin() {
  try {
    const exists = await SuperAdmin.findOne({
      email: process.env.SUPER_ADMIN_EMAIL
    });

    if (exists) {
      logger.info("✅ Super Admin already exists");
      return;
    }

    if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
      console.error("❌ Missing Super Admin environment variables");
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

    await SuperAdmin.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      mobile: process.env.SUPER_ADMIN_MOBILE,
      password: hashedPassword,
    });

    console.log("✅ SuperAdmin created automatically");
  } catch (error) {
    console.error("❌ SuperAdmin seeding failed:", error);
  }
};
