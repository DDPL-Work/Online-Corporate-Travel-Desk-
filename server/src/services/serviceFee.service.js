const mongoose = require("mongoose");
const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const ServiceFeeLedger = require("../models/ServiceFeeLedger");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");

/**
 * Evaluates the corporate service fee rules and returns the applicable fee.
 * 
 * @param {Object} corporate - The corporate document.
 * @param {Object} payload - Details of the action.
 * @param {string} payload.productType - "Flight" or "Hotel"
 * @param {string} payload.operation - "Book", "Cancel", "Re-Issue", etc.
 * @param {string} payload.tripType - "Domestic" or "International"
 * @param {number} [payload.cabinClass] - For flights (numeric enum: 2,3,4,5,6)
 * @param {number} [payload.starRating] - For hotels (numeric 1-5)
 * @param {number} [payload.roomCount] - For hotels
 * @param {number} payload.baseFare - The base fare or total fare to apply percentage on.
 * 
 * @returns {Object|null} { feeAmount, matchedRule } or null if no active rule matches.
 */
exports.calculateServiceFee = (corporate, payload) => {
  if (!corporate || !corporate.serviceFeeRules || corporate.serviceFeeRules.length === 0) {
    logger.warn(`calculateServiceFee: No rules found for corporate ${corporate._id}`);
    return null;
  }

  const { productType, operation, tripType, cabinClass, starRating, roomCount, baseFare } = payload;

  const matchedRule = corporate.serviceFeeRules.find(rule => {
    if (rule.status !== "Active") return false;
    if (rule.productType !== productType) return false;
    if (rule.operation !== operation) return false;
    if (rule.tripType !== tripType && rule.tripType !== "Any") return false;

    if (productType === "Flight" && rule.cabinClass) {
      if (Number(rule.cabinClass) !== Number(cabinClass)) return false;
    }

    if (productType === "Hotel") {
      if (rule.starRating && Number(rule.starRating) !== Number(starRating)) return false;
    }

    return true;
  });

  logger.info(`calculateServiceFee matching: payload=${JSON.stringify(payload)} -> matchedRule=${matchedRule ? matchedRule._id : "None"}`);

  if (!matchedRule) {
    return null;
  }

  let feeAmount = 0;
  if (matchedRule.feeType === "Fixed") {
    if (productType === "Hotel") {
      feeAmount = matchedRule.feeValue * (roomCount || 1);
    } else {
      feeAmount = matchedRule.feeValue;
    }
  } else if (matchedRule.feeType === "Percentage") {
    feeAmount = (baseFare || 0) * (matchedRule.feeValue / 100);
  }

  // Return the rounded amount
  return {
    feeAmount: Math.round(feeAmount * 100) / 100,
    matchedRule: matchedRule.toObject ? matchedRule.toObject() : matchedRule,
  };
};

/**
 * Applies the service fee: deducts wallet or increments credit, and creates ledger/wallet entries.
 * 
 * @param {string} corporateId
 * @param {string} userId
 * @param {string} bookingId 
 * @param {string} orderId 
 * @param {Object} payload - Same payload as calculateServiceFee
 * @param {boolean} [skipWalletDeduction=false] - If true, skips actual wallet deduction (used when fee is bundled in booking cost).
 */
exports.applyServiceFee = async (corporateId, userId, bookingId, orderId, payload, session, skipWalletDeduction = false) => {
  const corporate = await Corporate.findById(corporateId).session(session);
  if (!corporate) throw new ApiError(404, "Corporate not found for service fee calculation");

  const feeDetails = this.calculateServiceFee(corporate, payload);
  if (!feeDetails || feeDetails.feeAmount <= 0) {
    return null; // No applicable fee or fee is 0
  }

  const { feeAmount, matchedRule } = feeDetails;

  if (!skipWalletDeduction) {
    // Deduct fee
    const balanceBefore = corporate.walletBalance;
    
    if (corporate.classification === "prepaid") {
      if (corporate.walletBalance < feeAmount) {
        throw new ApiError(400, "Insufficient wallet balance to cover service fees.");
      }
      corporate.walletBalance -= feeAmount;
    } else if (corporate.classification === "postpaid") {
      if (corporate.currentCredit + feeAmount > corporate.creditLimit) {
        throw new ApiError(400, "Insufficient credit limit to cover service fees.");
      }
      corporate.currentCredit += feeAmount;
    }

    await corporate.save({ session });

    const balanceAfter = corporate.walletBalance;

    // 1. Create Wallet Transaction
    await WalletTransaction.create(
      [{
        corporateId,
        type: "service_fee_deduction",
        amount: feeAmount,
        balanceBefore,
        balanceAfter,
        description: `Service fee for ${payload.productType} ${payload.operation} (${payload.tripType})`,
        operationType: `${payload.productType}-${payload.operation}`,
        reference: orderId,
        bookingId: bookingId,
        bookingModel: payload.productType === "Hotel" ? "HotelBookingRequest" : "BookingRequest",
        processedBy: userId,
        status: "completed",
      }],
      { session }
    );
  }

  // 2. Create Service Fee Ledger
  const ledgerEntry = await ServiceFeeLedger.create(
    [{
      corporateId,
      userId,
      bookingId,
      orderId,
      action: `${payload.productType}-${payload.operation}`,
      amountDeducted: feeAmount,
      ruleSnapshot: matchedRule,
      status: "success",
      notes: "Fee applied successfully",
    }],
    { session }
  );

  logger.info(`Service fee of ${feeAmount} applied to corporate ${corporateId} for action ${payload.productType}-${payload.operation}`);

  return ledgerEntry[0];
};
