require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");

const PERMISSION = "Manage Reissues";

async function main() {
  try {
    await mongoose.connect(config.database.uri, config.database.options);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.db.collection("opsmembers");

    const result = await collection.updateMany(
      {
        isDeleted: false,
        $or: [
          { permissions: { $exists: false } },
          { permissions: { $nin: [PERMISSION] } },
        ],
      },
      { $addToSet: { permissions: PERMISSION } },
    );

    console.log(`Matched ${result.matchedCount} Ops members`);
    console.log(`Modified ${result.modifiedCount} Ops members`);

    const updated = await collection
      .find({ isDeleted: false })
      .project({ name: 1, permissions: 1 })
      .toArray();

    console.log("\nUpdated members:");
    updated.forEach((m) => console.log(`  ${m.name} → ${JSON.stringify(m.permissions)}`));

    await mongoose.disconnect();
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
