// utils/orderIdGenerator.js

const Sequence = require("../models/Sequence.model");
const incrementAlpha = require("./incrementAlpha");

/**
 * Format:
 * TVR + F/H + 3-digit number + 3-letter alpha
 * Example: TVRF000AAA
 */

const generateSequentialOrderId = async (type) => {
  const bookingType = type.toLowerCase();

  if (!["flight", "hotel"].includes(bookingType)) {
    throw new Error("Invalid booking type");
  }

  const prefix = bookingType === "flight" ? "TVRF" : "TVRH";
  const sequenceKey = `${bookingType}_order_id`;

  // Step 1: Get current sequence (atomic)
  const sequence = await Sequence.findOneAndUpdate(
    { key: sequenceKey },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let { number, alpha } = sequence;

  // Step 2: Increment alpha
  let newAlpha = incrementAlpha(alpha);
  let newNumber = number;

  // Step 3: Handle rollover
  if (alpha === "ZZZ") {
    newAlpha = "AAA";
    newNumber += 1;

    if (newNumber > 999) {
      throw new Error("Order ID limit reached (999ZZZ)");
    }
  }

  // Step 4: Update atomically again
  const updated = await Sequence.findOneAndUpdate(
    { key: sequenceKey, number, alpha }, // condition ensures no race overwrite
    { $set: { number: newNumber, alpha: newAlpha } },
    { new: true }
  );

  if (!updated) {
    // Retry (rare race condition fallback)
    return generateSequentialOrderId(type);
  }

  // Step 5: Format output
  const paddedNumber = String(updated.number).padStart(3, "0");

  return `${prefix}${paddedNumber}${updated.alpha}`;
};

module.exports = { generateSequentialOrderId };