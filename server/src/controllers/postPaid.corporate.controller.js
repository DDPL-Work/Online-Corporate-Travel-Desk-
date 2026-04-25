const Corporate = require("../models/Corporate");
const CreditTransaction = require("../models/CreditTransaction");
const Ledger = require("../models/Ledger");
const User = require("../models/User");
const { ApiError } = require("../utils/ApiError");

// ─── helpers ───────────────────────────────────────────────────────────────
function computeCycles(onboardedAt, cycleDays) {
  const now = new Date();
  const origin = new Date(onboardedAt);
  const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
  const totalMs = now.getTime() - origin.getTime();
  const totalCycles = Math.max(1, Math.floor(totalMs / cycleMs) + 1); // +1 includes current
  const cycles = [];
  for (let i = 0; i < totalCycles; i++) {
    const start = new Date(origin.getTime() + i * cycleMs);
    const end = new Date(start.getTime() + cycleMs - 1); // end = start + cycleDays - 1ms
    cycles.push({ index: i, start, end });
  }
  return cycles;
}

function statementId(corporateId, cycleIndex) {
  // Mimics TRSNDS0400034LCC260415 style
  const shortCorp = String(corporateId).slice(-8).toUpperCase();
  return `STMT${shortCorp}C${String(cycleIndex).padStart(3, "0")}`;
}

function trackId(corporateId, cycleIndex) {
  const shortCorp = String(corporateId).slice(-4).toUpperCase();
  return `TRK${shortCorp}${String(cycleIndex).padStart(4, "0")}`;
}

// =======================================
// GET POSTPAID BALANCE (SUMMARY ONLY)
// =======================================
exports.getPostpaidBalance = async (req, res, next) => {
  try {
    const corporateId = (req.user.role === "super-admin" && req.query.corporateId) 
      ? req.query.corporateId 
      : req.user.corporateId;

    if (!corporateId) {
      return next(new ApiError(403, "Corporate ID is required"));
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

    const corporateId = (req.user.role === "super-admin" && req.query.corporateId)
      ? req.query.corporateId
      : req.user.corporateId;

    if (!corporateId) {
      return next(new ApiError(403, "Corporate ID is required"));
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

// =======================================
// GET ALL PREVIOUS BILLING CYCLES (STATEMENT LIST)
// =======================================
exports.getPreviousCycles = async (req, res, next) => {
  try {
    const corporateId = (req.user.role === "super-admin" && req.query.corporateId)
      ? req.query.corporateId
      : req.user.corporateId;

    if (!corporateId) return next(new ApiError(403, "Corporate ID is required"));

    const corporate = await Corporate.findById(corporateId);
    if (!corporate) return next(new ApiError(404, "Corporate not found"));
    if (corporate.classification !== "postpaid") return next(new ApiError(400, "Not a postpaid corporate"));

    const onboardedAt = corporate.onboardedAt || corporate.createdAt;
    const cycleDays = corporate.billingCycle === "15days" ? 15
      : corporate.billingCycle === "30days" ? 30
      : (corporate.customBillingDays || 30);

    const allCycles = computeCycles(onboardedAt, cycleDays);
    // Exclude the last cycle (current)
    const previousCycles = allCycles.slice(0, -1);

    if (previousCycles.length === 0) {
      return res.json({ success: true, cycles: [] });
    }

    // Aggregate amounts for each past cycle in one query
    const agg = await Ledger.aggregate([
      {
        $match: {
          corporateId: corporate._id,
          status: { $ne: "cancelled" },
          createdAt: {
            $gte: previousCycles[0].start,
            $lte: previousCycles[previousCycles.length - 1].end,
          },
        },
      },
      {
        $group: {
          _id: null,
          docs: { $push: { amount: "$amount", transactionType: "$transactionType", type: "$type", createdAt: "$createdAt" } },
        },
      },
    ]);

    const docs = agg[0]?.docs || [];

    const cycleData = previousCycles.map((c, idx) => {
      const cycledocs = docs.filter(
        (d) => new Date(d.createdAt) >= c.start && new Date(d.createdAt) <= c.end
      );
      const debit = cycledocs
        .filter((d) => d.transactionType === "debit" || (!d.transactionType && d.type === "booking"))
        .reduce((s, d) => s + (d.amount || 0), 0);
      const credit = cycledocs
        .filter((d) => d.transactionType === "credit" || (!d.transactionType && (d.type === "payment" || d.type === "topup" || d.type === "refund")))
        .reduce((s, d) => s + (d.amount || 0), 0);
      const statementAmount = debit - credit;

      // Statement date = day after cycle ends; due date = +8 days
      const statementDate = new Date(c.end.getTime() + 1 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(statementDate.getTime() + 8 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const delayDays = now > dueDate ? Math.floor((now - dueDate) / (24 * 60 * 60 * 1000)) : 0;

      return {
        rowNum: previousCycles.length - idx, // descending row num like the screenshot
        cycleIndex: c.index,
        statementId: statementId(corporateId, c.index),
        trackId: trackId(corporateId, c.index),
        periodStart: c.start,
        periodEnd: c.end,
        statementDate,
        dueDate,
        delayDays,
        statementAmount,
      };
    }).reverse(); // newest first

    res.json({ success: true, cycles: cycleData });
  } catch (err) {
    next(err);
  }
};

// =======================================
// GET TRANSACTIONS FOR A SPECIFIC PAST CYCLE
// =======================================
exports.getCycleTransactions = async (req, res, next) => {
  try {
    const corporateId = (req.user.role === "super-admin" && req.query.corporateId)
      ? req.query.corporateId
      : req.user.corporateId;

    if (!corporateId) return next(new ApiError(403, "Corporate ID is required"));

    const { cycleIndex } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const corporate = await Corporate.findById(corporateId);
    if (!corporate) return next(new ApiError(404, "Corporate not found"));
    if (corporate.classification !== "postpaid") return next(new ApiError(400, "Not a postpaid corporate"));

    const onboardedAt = corporate.onboardedAt || corporate.createdAt;
    const cycleDays = corporate.billingCycle === "15days" ? 15
      : corporate.billingCycle === "30days" ? 30
      : (corporate.customBillingDays || 30);

    const allCycles = computeCycles(onboardedAt, cycleDays);
    const cycle = allCycles[Number(cycleIndex)];
    if (!cycle) return next(new ApiError(404, "Cycle not found"));

    const skip = (Number(page) - 1) * Number(limit);
    const filter = {
      corporateId: corporate._id,
      createdAt: { $gte: cycle.start, $lte: cycle.end },
    };

    const [transactions, total] = await Promise.all([
      Ledger.find(filter)
        .populate("userId", "name email")
        .populate("bookingId", "bookingReference pnr ticketNumber")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Ledger.countDocuments(filter),
    ]);

    const stmtId = statementId(corporateId, cycle.index);

    res.json({
      success: true,
      statementId: stmtId,
      cycle: {
        index: cycle.index,
        start: cycle.start,
        end: cycle.end,
      },
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) },
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
