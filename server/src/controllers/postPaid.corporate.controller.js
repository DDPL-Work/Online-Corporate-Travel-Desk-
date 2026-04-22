const Corporate = require("../models/Corporate");
const CreditTransaction = require("../models/CreditTransaction");
const Ledger = require("../models/Ledger");
const User = require("../models/User");
const { ApiError } = require("../utils/ApiError");

// =======================================
// GET POSTPAID BALANCE (SUMMARY ONLY)
// =======================================
exports.getPostpaidBalance = async (req, res, next) => {
  try {
    const corporateId = req.user.corporateId;

    if (!corporateId) {
      return next(new ApiError(403, "Corporate access required"));
    }

    const corporate = await Corporate.findById(corporateId);

    if (!corporate) return next(new ApiError(404, "Corporate not found"));

    if (corporate.classification !== "postpaid")
      return next(new ApiError(400, "Not a postpaid corporate"));

    // 🔹 Calculate Current Cycle (Business Logic: Refresh every 15/30 days)
    const onboardedAt = corporate.onboardedAt || corporate.createdAt;
    const cycleDays = corporate.billingCycle === "15days" ? 15 : (corporate.billingCycle === "30days" ? 30 : (corporate.customBillingDays || 30));
    
    const now = new Date();
    const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
    const timeDiff = now.getTime() - new Date(onboardedAt).getTime();
    
    const cycleIndex = Math.max(0, Math.floor(timeDiff / cycleMs));
    const currentCycleStart = new Date(new Date(onboardedAt).getTime() + (cycleIndex * cycleMs));
    const currentCycleEnd = new Date(currentCycleStart.getTime() + cycleMs);

    // 🔹 Calculate used credit via aggregation (Only for Current Cycle)
    const result = await Ledger.aggregate([
      {
        $match: {
          corporateId: corporate._id,
          status: { $ne: "cancelled" },
          createdAt: { $gte: currentCycleStart, $lte: currentCycleEnd } // Only current cycle
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "debit"] }, "$amount", 0],
            },
          },
          totalCredit: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "credit"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const totalDebit = result[0]?.totalDebit || 0;
    const totalCredit = result[0]?.totalCredit || 0;
    const usedCredit = totalDebit - totalCredit;

    res.json({
      success: true,
      balance: {
        totalLimit: corporate.creditLimit,
        usedCredit,
        availableCredit: Math.max(0, corporate.creditLimit - usedCredit),
        billingCycle: corporate.billingCycle,
        customBillingDays: corporate.customBillingDays,
        onboardedAt: corporate.onboardedAt,
        currentCycleStart,
        currentCycleEnd,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =======================================
// GET POSTPAID TRANSACTIONS
// =======================================
exports.getPostpaidTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, department, page = 1, limit = 10 } = req.query;

    const corporateId = req.user.corporateId;

    if (!corporateId) {
      return next(new ApiError(403, "Corporate access required"));
    }

    const filter = {
      corporateId,
      type: "booking",
    };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Ledger.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ledger.countDocuments(filter),
    ]);

    res.json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

exports.createCreditUsage = async (req, res, next) => {
  try {
    const { employeeId, department, purpose, amount } = req.body;

    const admin = await User.findById(req.user.id);
    if (!admin) return next(new ApiError(401, "Unauthorized"));

    const corporateId = admin.corporateId;

    const transaction = await CreditTransaction.create({
      corporateId,
      employeeId,
      department,
      purpose,
      amount,
      date: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Credit usage recorded",
      transaction,
    });
  } catch (err) {
    next(err);
  }
};
