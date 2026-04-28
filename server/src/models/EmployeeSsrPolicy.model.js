// server/src/models/EmployeeSsrPolicy.model.js

const mongoose = require("mongoose");

const priceRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 99999 },
  },
  { _id: false }
);

const employeeSsrPolicySchema = new mongoose.Schema(
  {
    // Link record to specific corporate
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },

    // Employee identifier — lookup key
    employeeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Resolved employee userId (populated after lookup)
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── SSR Permission Flags (Controls Paid Bookings) ────
    allowSeat: { type: Boolean, default: false },
    allowMeal: { type: Boolean, default: false },
    allowBaggage: { type: Boolean, default: false },

    // ── Price Range Controls ──────────────────────────────
    seatPriceRange: { type: priceRangeSchema, default: () => ({ min: 0, max: 99999 }) },
    mealPriceRange: { type: priceRangeSchema, default: () => ({ min: 0, max: 99999 }) },
    baggagePriceRange: { type: priceRangeSchema, default: () => ({ min: 0, max: 99999 }) },

    // ── Approval Flow ─────────────────────────────────────
    approvalRequired: { type: Boolean, default: true },

    // ── Audit ─────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique policy per employee per corporate
employeeSsrPolicySchema.index({ corporateId: 1, employeeEmail: 1 }, { unique: true });

module.exports = mongoose.model("EmployeeSsrPolicy", employeeSsrPolicySchema);
