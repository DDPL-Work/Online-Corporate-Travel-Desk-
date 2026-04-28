// server/src/controllers/ssrPolicy.controller.js

const EmployeeSsrPolicy = require("../models/EmployeeSsrPolicy.model");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_POLICY = {
  allowSeat: false,
  allowMeal: false,
  allowBaggage: false,
  seatPriceRange: { min: 0, max: 99999 },
  mealPriceRange: { min: 0, max: 99999 },
  baggagePriceRange: { min: 0, max: 99999 },
  approvalRequired: true,
};

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — Upsert (create or update) an employee's SSR policy
   POST /api/v1/ssr-policies
   Body: { employeeEmail, allowSeat, allowMeal, allowBaggage,
           seatPriceRange, mealPriceRange, baggagePriceRange,
           approvalRequired, approvalEmail }
   Access: travel-admin only
───────────────────────────────────────────────────────────────────────────── */
exports.upsertPolicy = asyncHandler(async (req, res) => {
  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only Travel Admin can manage SSR policies");
  }

  const {
    employeeEmail,
    allowSeat,
    allowMeal,
    allowBaggage,
    seatPriceRange,
    mealPriceRange,
    baggagePriceRange,
    approvalRequired,
  } = req.body;

  if (!employeeEmail) {
    throw new ApiError(400, "employeeEmail is required");
  }

  // Validate price ranges
  const validateRange = (range, label) => {
    if (!range) return;
    if (range.min < 0 || range.max < 0) {
      throw new ApiError(400, `${label} price range cannot be negative`);
    }
    if (range.min > range.max) {
      throw new ApiError(400, `${label} min price cannot exceed max price`);
    }
  };

  validateRange(seatPriceRange, "Seat");
  validateRange(mealPriceRange, "Meal");
  validateRange(baggagePriceRange, "Baggage");

  // Resolve employee userId (best-effort — not required)
  const employee = await User.findOne({
    email: employeeEmail.toLowerCase().trim(),
    corporateId: req.user.corporateId,
  }).lean();

  const policy = await EmployeeSsrPolicy.findOneAndUpdate(
    { corporateId: req.user.corporateId, employeeEmail: employeeEmail.toLowerCase().trim() },
    {
      $set: {
        corporateId: req.user.corporateId,
        employeeEmail: employeeEmail.toLowerCase().trim(),
        employeeId: employee?._id || null,
        allowSeat: allowSeat ?? false,
        allowMeal: allowMeal ?? false,
        allowBaggage: allowBaggage ?? false,
        seatPriceRange: seatPriceRange ?? { min: 0, max: 99999 },
        mealPriceRange: mealPriceRange ?? { min: 0, max: 99999 },
        baggagePriceRange: baggagePriceRange ?? { min: 0, max: 99999 },
        approvalRequired: approvalRequired ?? true,
        updatedBy: req.user._id,
        createdBy: req.user._id,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(200).json(
    new ApiResponse(200, policy, "SSR policy saved successfully")
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — Get a single policy by employee email
   GET /api/v1/ssr-policies/by-email?email=...
   Access: travel-admin only
───────────────────────────────────────────────────────────────────────────── */
exports.getPolicyByEmail = asyncHandler(async (req, res) => {
  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only Travel Admin can view SSR policies");
  }

  const { email } = req.query;
  if (!email) throw new ApiError(400, "email query parameter is required");

  // First fetch the employee details for the lookup card
  const employee = await User.findOne({
    email: email.toLowerCase().trim(),
    corporateId: req.user.corporateId,
  })
    .select("name email role")
    .lean();

  const policy = await EmployeeSsrPolicy.findOne({
    corporateId: req.user.corporateId,
    employeeEmail: email.toLowerCase().trim(),
  }).lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employee: employee || null,
        policy: policy || DEFAULT_POLICY,
        isNewPolicy: !policy,
      },
      "Policy fetched"
    )
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — List all policies for the corporate
   GET /api/v1/ssr-policies
   Access: travel-admin only
───────────────────────────────────────────────────────────────────────────── */
exports.listPolicies = asyncHandler(async (req, res) => {
  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only Travel Admin can view SSR policies");
  }

  const policies = await EmployeeSsrPolicy.find({
    corporateId: req.user.corporateId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json(
    new ApiResponse(200, policies, "SSR policies fetched")
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — Delete a policy
   DELETE /api/v1/ssr-policies/:id
   Access: travel-admin only
───────────────────────────────────────────────────────────────────────────── */
exports.deletePolicy = asyncHandler(async (req, res) => {
  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only Travel Admin can delete SSR policies");
  }

  const policy = await EmployeeSsrPolicy.findOneAndDelete({
    _id: req.params.id,
    corporateId: req.user.corporateId,
  });

  if (!policy) throw new ApiError(404, "Policy not found");

  res.status(200).json(new ApiResponse(200, null, "Policy deleted"));
});

/* ─────────────────────────────────────────────────────────────────────────────
   EMPLOYEE — Fetch own SSR policy (called when SSR modal opens)
   GET /api/v1/ssr-policies/my-policy
   Access: any authenticated user
───────────────────────────────────────────────────────────────────────────── */
exports.getMyPolicy = asyncHandler(async (req, res) => {
  let policy = await EmployeeSsrPolicy.findOne({
    corporateId: req.user.corporateId,
    employeeEmail: req.user.email.toLowerCase().trim(),
  });

  // Auto-set restricted default policy if none exists
  if (!policy && req.user.corporateId) {
    policy = await EmployeeSsrPolicy.create({
      corporateId: req.user.corporateId,
      employeeEmail: req.user.email.toLowerCase().trim(),
      employeeId: req.user.id,
      ...DEFAULT_POLICY,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      policy || { ...DEFAULT_POLICY, isDefault: true },
      "SSR policy fetched"
    )
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDATE SSR SELECTIONS (Backend enforcement — called before booking save)
   POST /api/v1/ssr-policies/validate-ssr
   Body: { seats: [...], meals: [...], baggage: [...] }
   Access: any authenticated user
───────────────────────────────────────────────────────────────────────────── */
exports.validateSsrSelections = asyncHandler(async (req, res) => {
  const { seats = [], meals = [], baggage = [] } = req.body;

  const policy = await EmployeeSsrPolicy.findOne({
    corporateId: req.user.corporateId,
    employeeEmail: req.user.email.toLowerCase().trim(),
  }).lean();

  // No policy → use default (which is now restricted)
  const effectivePolicy = policy || DEFAULT_POLICY;
  const errors = [];

  // ── Seat validation ──
  if (seats.length > 0) {
    for (const seat of seats) {
      const price = seat.price || 0;
      if (price > 0) {
        if (!effectivePolicy.allowSeat) {
          errors.push("Paid seat selection is restricted for your account.");
          break;
        }
        if (price < effectivePolicy.seatPriceRange.min || price > effectivePolicy.seatPriceRange.max) {
          errors.push(
            `Seat price ₹${price} exceeds your allowed range (₹${effectivePolicy.seatPriceRange.min}–₹${effectivePolicy.seatPriceRange.max}).`
          );
          break;
        }
      }
    }
  }

  // ── Meal validation ──
  if (meals.length > 0) {
    for (const meal of meals) {
      const price = meal.price || 0;
      if (price > 0) {
        if (!effectivePolicy.allowMeal) {
          errors.push("Paid meal selection is not allowed for your account.");
          break;
        }
        if (price < effectivePolicy.mealPriceRange.min || price > effectivePolicy.mealPriceRange.max) {
          errors.push(
            `Meal price ₹${price} exceeds your allowed range (₹${effectivePolicy.mealPriceRange.min}–₹${effectivePolicy.mealPriceRange.max}).`
          );
          break;
        }
      }
    }
  }

  // ── Baggage validation ──
  if (baggage.length > 0) {
    for (const bag of baggage) {
      const price = bag.price || 0;
      if (price > 0) {
        if (!effectivePolicy.allowBaggage) {
          errors.push("Paid baggage selection is restricted for your account.");
          break;
        }
        if (price < effectivePolicy.baggagePriceRange.min || price > effectivePolicy.baggagePriceRange.max) {
          errors.push(
            `Baggage price ₹${price} exceeds your allowed range (₹${effectivePolicy.baggagePriceRange.min}–₹${effectivePolicy.baggagePriceRange.max}).`
          );
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(422).json(
      new ApiResponse(422, { valid: false, errors }, "SSR validation failed")
    );
  }

  return res.status(200).json(new ApiResponse(200, { valid: true }, "SSR valid"));
});
