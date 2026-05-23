// utils/paymentIdGenerator.js
//
// Centralized enterprise-grade Payment ID generator.
//
// FORMAT:  TVR-[F|H]-[PRE|POST]-[000AAA]
//
// Examples:
//   Flight  + Prepaid  → TVR-F-PRE-000AAA
//   Flight  + Postpaid → TVR-F-POST-000AAB
//   Hotel   + Prepaid  → TVR-H-PRE-000AAC
//   Hotel   + Postpaid → TVR-H-POST-000AAD
//
// Concurrency-safe: uses MongoDB atomic $inc on Sequence collection.
// Total capacity per prefix: 1,000 × 17,576 = 17,576,000 IDs
// Across all 4 prefix variants: ~70,304,000 unique IDs

const Sequence = require("../models/Sequence.model");
const logger   = require("./logger");

// Validation regex — enforced before returning every generated ID
const PAYMENT_ID_REGEX = /^TVR(F|H)(PRE|POST)[A-Z0-9]{6}$/;

// Maximum sequence value before overflow (999ZZZ)
const MAX_SEQ = 17_576_000; // 1000 * 26^3

/**
 * Convert a linear integer sequence into a 6-char base-26 alpha + 3-digit number string.
 * Sequence 0 → "000AAA", 1 → "000AAB", ..., 17575 → "000ZZZ", 17576 → "001AAA"
 *
 * @param {number} seq - Current sequence integer (>= 1 since $inc starts at 1)
 * @returns {string} 6-character unique code e.g. "003XYZ"
 */
function seqToCode(seq) {
  // seq is 1-based from $inc; convert to 0-based for calculation
  const zeroBase = seq - 1;
  const alphaPartSeq = zeroBase % 17576;   // 26^3 = 17576
  const numberPart   = Math.floor(zeroBase / 17576);

  // Convert alphaPartSeq to 3-letter base-26 string (AAA → ZZZ)
  let alpha = "";
  let temp  = alphaPartSeq;
  for (let i = 0; i < 3; i++) {
    alpha = String.fromCharCode(65 + (temp % 26)) + alpha;
    temp  = Math.floor(temp / 26);
  }

  const paddedNumber = String(numberPart).padStart(3, "0");
  return `${paddedNumber}${alpha}`;
}

/**
 * Generate a unique Payment ID atomically.
 *
 * @param {"flight"|"hotel"} bookingType - Type of booking
 * @param {"prepaid"|"postpaid"} paymentType - Corporate payment classification
 * @returns {Promise<string>} e.g. "TVR-F-PRE-000AAA"
 * @throws {Error} if inputs are invalid or sequence is exhausted
 */
async function generatePaymentId(bookingType, paymentType) {
  // ── Validate inputs ──────────────────────────────────────────────
  const serviceSegment =
    bookingType === "flight" ? "F" :
    bookingType === "hotel"  ? "H" :
    null;

  const paymentSegment =
    paymentType === "prepaid"  ? "PRE"  :
    paymentType === "postpaid" ? "POST" :
    null;

  if (!serviceSegment || !paymentSegment) {
    throw new Error(
      `generatePaymentId: invalid inputs — bookingType="${bookingType}", paymentType="${paymentType}"`
    );
  }

  const prefix       = `TVR${serviceSegment}${paymentSegment}`;
  const sequenceKey  = `payment_id_${prefix}`;

  // ── Atomically increment sequence ────────────────────────────────
  const sequence = await Sequence.findOneAndUpdate(
    { key: sequenceKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const currentSeq = sequence.seq;

  if (currentSeq > MAX_SEQ) {
    throw new Error(
      `generatePaymentId: sequence exhausted for prefix "${prefix}" (limit: ${MAX_SEQ})`
    );
  }

  // ── Build the Payment ID ─────────────────────────────────────────
  const uniqueCode = seqToCode(currentSeq);
  const paymentId  = `${prefix}${uniqueCode}`;

  // ── Validate format before returning ────────────────────────────
  if (!PAYMENT_ID_REGEX.test(paymentId)) {
    throw new Error(
      `generatePaymentId: generated ID "${paymentId}" failed regex validation`
    );
  }

  logger.info("Payment ID generated", { paymentId, sequenceKey, seq: currentSeq });

  return paymentId;
}

/**
 * Validate an existing Payment ID string against the canonical format.
 * @param {string} id
 * @returns {boolean}
 */
function isValidPaymentId(id) {
  return typeof id === "string" && PAYMENT_ID_REGEX.test(id);
}

module.exports = { generatePaymentId, isValidPaymentId, PAYMENT_ID_REGEX };
