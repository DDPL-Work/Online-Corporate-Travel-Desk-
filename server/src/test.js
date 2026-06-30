require("dotenv").config();

const mongoose = require("mongoose");
const ManagerRequest = require("./models/ManagerRequest");
const Employee = require("./models/Employee");

async function fixData() {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Connected to DB");

    const requests = await ManagerRequest.find();
    console.log("Total requests:", requests.length);

    for (const req of requests) {
      const employee = await Employee.findOne({
        userId: req.employeeId,
      });

      if (employee) {
        req.employeeId = employee._id;
        await req.save();
        console.log(`✔ Updated ${req._id}`);
      } else {
        console.log(`❌ No employee for user ${req.employeeId}`);
      }
    }

    console.log("🎉 Migration completed");
    process.exit();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fixData();