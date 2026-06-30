// utils/orderIdGenerator.js

const Sequence = require("../models/Sequence.model");

/**
 * Optimized Order ID Generator
 * Uses a single atomic operation to increment a global sequence.
 * Format: TVR + F/H + 3-digit number + 3-letter alpha
 * Total combinations: 1,000 * 26^3 = 17,576,000
 */

const generateSequentialOrderId = async (type) => {
  const bookingType = type.toLowerCase();

  if (!["flight", "hotel"].includes(bookingType)) {
    throw new Error("Invalid booking type");
  }

  const prefix = bookingType === "flight" ? "TVRF" : "TVRH";
  const sequenceKey = `${bookingType}_order_id_v2`; // Use a new key for the optimized version

  // Step 1: Increment global sequence atomically (Single DB Call)
  const sequence = await Sequence.findOneAndUpdate(
    { key: sequenceKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const currentSeq = sequence.seq || 0;
  
  if (currentSeq >= 17576000) {
    throw new Error("Order ID limit reached (999ZZZ)");
  }

  // Step 2: Convert sequence integer to (number + alpha) format
  // Example: 0 -> 000AAA, 1 -> 000AAB, ..., 17575 -> 000ZZZ, 17576 -> 001AAA
  
  const alphaPartSeq = currentSeq % 17576;
  const numberPart = Math.floor(currentSeq / 17576);

  // Convert alphaPartSeq to 3-letter base-26 string (AAA-ZZZ)
  let alpha = "";
  let temp = alphaPartSeq;
  for (let i = 0; i < 3; i++) {
    alpha = String.fromCharCode(65 + (temp % 26)) + alpha;
    temp = Math.floor(temp / 26);
  }

  const paddedNumber = String(numberPart).padStart(3, "0");

  return `${prefix}${paddedNumber}${alpha}`;
};

module.exports = { generateSequentialOrderId };