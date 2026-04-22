const mongoose = require("mongoose");
const BookingRequest = require("../models/BookingRequest");
const HotelBooking = require("../models/hotelBookingRequest.model");
const User = require("../models/User");
const Employee = require("../models/Employee");
const ManagerRequest = require("../models/ManagerRequest");
const Corporate = require("../models/Corporate");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

/**
 * ============================================================
 * 🛡️ COMMON ADMIN VALIDATION
 * ============================================================
 */
const validateTravelAdmin = (req) => {
  if (!req.user || req.user.role !== "travel-admin") {
    const error = new Error("Access denied. Travel Admin only.");
    error.statusCode = 403;
    throw error;
  }

  if (!req.user.corporateId) {
    const error = new Error("Corporate context missing (SSO failure)");
    error.statusCode = 400;
    throw error;
  }

  return req.user.corporateId;
};

/**
 * ============================================================
 * ✈️ FETCH ALL FLIGHT BOOKINGS (ADMIN - SSO SCOPED)
 * ============================================================
 */
exports.getAllFlightBookingsAdmin = async (req, res) => {
  try {
    const corporateId = validateTravelAdmin(req);

    const bookings = await BookingRequest.find({
      corporateId,
      bookingType: "flight",
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Flight Admin Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch flight bookings",
    });
  }
};

/**
 * ============================================================
 * 🏨 FETCH ALL HOTEL BOOKINGS (ADMIN - SSO SCOPED)
 * ============================================================
 */
exports.getAllHotelBookingsAdmin = async (req, res) => {
  try {
    const corporateId = new mongoose.Types.ObjectId(validateTravelAdmin(req));

    const bookings = await HotelBooking.find({
      corporateId,
      // bookingType: "hotel",
      requestStatus: "approved",
    })
      .populate("userId", "name email")
      .populate("approvedBy", "name email role")
      .populate("approverId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Hotel Admin Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel bookings",
    });
  }
};

/**
 * ============================================================
 * ❌ FETCH CANCELLED / CANCELLING HOTEL BOOKINGS (ADMIN)
 * ============================================================
 */
exports.getCancelledHotelBookingsAdmin = async (req, res) => {
  try {
    const corporateId = new mongoose.Types.ObjectId(validateTravelAdmin(req));

    const bookings = await HotelBooking.find({
      corporateId,
      requestStatus: "approved",

      // ✅ CORRECT LOGIC (BASED ON YOUR DB)
      $or: [
        {
          executionStatus: {
            $in: ["failed", "cancelled"],
          },
        },
        {
          "amendment.status": "requested",
        },
      ],
    })
      .populate("userId", "name email")
      .populate("approvedBy", "name email role")
      .populate("approverId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Cancelled Hotel Fetch Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch cancelled hotel bookings",
    });
  }
};

// Manager Onboarding process

/**
 * ============================================================
 * 🔐 PROMOTE EMPLOYEE → MANAGER (SSO DOMAIN SAFE)
 * ============================================================
 */
exports.promoteToManager = async (req, res) => {
  try {
    const { userId } = req.params;

    // Logged-in admin
    const admin = req.user;

    // 1️⃣ Fetch target user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Prevent self-modification (optional safety)
    if (admin._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot modify your own role",
      });
    }

    // 3️⃣ Extract domains
    const getDomain = (email) => email.split("@")[1];

    const adminDomain = getDomain(admin.email);
    const userDomain = getDomain(user.email);

    // 4️⃣ DOMAIN VALIDATION (SSO constraint)
    if (adminDomain !== userDomain) {
      return res.status(403).json({
        success: false,
        message: "This Employee does not belong to same organization/domain",
      });
    }

    // 5️⃣ OPTIONAL: orgId check (stronger validation)
    if (
      admin.corporateId &&
      user.corporateId &&
      admin.corporateId.toString() !== user.corporateId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This Employee belongs to different corporate account or domain",
      });
    }

    // 6️⃣ ROLE CHECK
    if (user.role === "manager") {
      return res.status(400).json({
        success: false,
        message: "This Employee is already a manager",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify admin role",
      });
    }

    // 7️⃣ UPDATE ROLE
    user.role = "manager";
    user.promotedBy = admin._id;
    user.promotedAt = new Date();

    await user.save();

    console.log("UPDATED USER:", user);

    return res.status(200).json({
      success: true,
      message: "Employee promoted to manager successfully",
      data: {
        id: user._id,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("PROMOTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to promote user",
    });
  }
};

/**
 * ============================================================
 * 🔐 DEMOTE MANAGER → EMPLOYEE (SSO DOMAIN SAFE)
 * ============================================================
 */
exports.demoteToEmployee = async (req, res) => {
  try {
    const { userId } = req.params;

    const admin = req.user;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ❌ prevent demoting admin
    if (user.role === "corporate-admin" || user.role === "super-admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot demote admin",
      });
    }

    // ❌ already employee
    if (user.role === "employee") {
      return res.status(400).json({
        success: false,
        message: "User is already an employee",
      });
    }

    // ✅ SAME DOMAIN CHECK (IMPORTANT)
    const getDomain = (email) => email.split("@")[1];

    if (getDomain(admin.email) !== getDomain(user.email)) {
      return res.status(403).json({
        success: false,
        message: "Different domain",
      });
    }

    // ✅ UPDATE ROLE
    user.role = "employee";
    user.demotedBy = admin._id;
    user.demotedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Manager demoted to employee successfully",
    });
  } catch (err) {
    console.error("DEMOTE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to demote user",
    });
  }
};

// ===============================
// ADMIN: GET SINGLE EMPLOYEE
// ===============================
exports.getEmployee = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) return next(new ApiError(401, "Unauthorized"));

    const id = req.params.id;

    let emp = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      emp = await Employee.findOne({
        _id: id,
        corporateId: admin.corporateId,
      });
    }

    if (!emp) {
      emp = await Employee.findOne({
        userId: id,
        corporateId: admin.corporateId,
      });
    }

    if (!emp)
      return next(
        new ApiError(404, "Employee not found or not in your domain"),
      );

    res.json({ success: true, employee: emp });
  } catch (err) {
    next(err);
  }
};

// ===============================
// ADMIN: GET ALL EMPLOYEES
// ===============================
exports.getAllEmployees = async (req, res, next) => {
  try {
    // 🔐 Auth check
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    const { corporateId, domain } = req.user;

    // ❗ Must belong to something
    if (!corporateId && !domain) {
      return next(
        new ApiError(400, "CorporateId or domain is required")
      );
    }

    // ✅ Base query (role filter)
    let query = {
      role: { $in: ["manager", "employee"] },
    };

    // ✅ Scope filter (corporate OR domain)
    if (corporateId && domain) {
      query.$or = [
        { corporateId },
        { domain },
      ];
    } else if (corporateId) {
      query.corporateId = corporateId;
    } else if (domain) {
      query.domain = domain;
    }

    // ✅ Fetch users
    const employees = await User.find(query)
      .select("-password -__v") // 🔒 remove sensitive fields
      .sort({ createdAt: -1 }) // optional
      .lean();

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (err) {
    next(err);
  }
};
// ===============================
// ADMIN: UPDATE EMPLOYEE
// ===============================
exports.updateEmployee = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "mobile",
      "department",
      "designation",
      "employeeCode",
      "status",
    ];
    const updates = {};
    if (req.body) {
      allowed.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
    }

    if (!Object.keys(updates).length)
      return next(new ApiError(400, "No valid fields to update"));

    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) emp = await Employee.findById(id);
    if (!emp) emp = await Employee.findOne({ userId: id });
    if (!emp) return next(new ApiError(404, "Employee not found"));

    Object.assign(emp, updates);
    await emp.save();

    res.json({
      success: true,
      message: "Employee updated successfully",
      employee: emp,
    });
  } catch (err) {
    next(err);
  }
};


// ===============================
// ADMIN: TOGGLE USER + EMPLOYEE STATUS
// ===============================
exports.toggleEmployeeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🔐 Auth check
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { corporateId, domain } = req.user;
    const userId = req.params.id;

    // ❗ Validate ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    // ✅ Build scoped query (multi-tenant safe)
    let query = {
      _id: userId,
      role: { $in: ["employee", "manager"] },
    };

    if (corporateId && domain) {
      query.$or = [{ corporateId }, { domain }];
    } else if (corporateId) {
      query.corporateId = corporateId;
    } else if (domain) {
      query.domain = domain;
    }

    // 🔍 Find user
    const user = await User.findOne(query).session(session);

    if (!user) {
      throw new ApiError(404, "User not found or unauthorized");
    }

    // 🔁 Toggle boolean
    const newIsActive = !user.isActive;

    // ✅ Update USER
    user.isActive = newIsActive;
    await user.save({ session });

    // 🔁 Map to Employee.status
    const newStatus = newIsActive ? "active" : "inactive";

    // ✅ Update EMPLOYEE
    const employee = await Employee.findOneAndUpdate(
      { userId: user._id },
      { status: newStatus },
      { new: true, session }
    );

    // ⚠️ Optional strict check
    if (!employee) {
      throw new ApiError(404, "Employee record not found");
    }

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `User ${
        newIsActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        userId: user._id,
        isActive: newIsActive,
        employeeStatus: newStatus,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// ===============================
// ADMIN: REMOVE EMPLOYEE
// ===============================
exports.removeEmployee = async (req, res, next) => {
  try {
    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) emp = await Employee.findById(id);
    if (!emp) emp = await Employee.findOne({ userId: id });
    if (!emp) return next(new ApiError(404, "Employee not found"));

    await Employee.findByIdAndDelete(emp._id);
    await User.findByIdAndDelete(emp.userId); // optionally delete user as well

    res.json({ success: true, message: "Employee removed successfully" });
  } catch (err) {
    next(err);
  }
};



//manager related routes

exports.getManagerRequests = async (req, res) => {
  try {
    // 🔒 1. ONLY TRAVEL ADMIN CAN ACCESS
    if (req.user.role !== "travel-admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 🔒 2. FETCH ONLY SAME CORPORATE DATA
    const requests = await ManagerRequest.find({
      corporateId: req.user.corporateId,
    })
      .populate({
        path: "employeeId",
        select: "email name",
      })
      .populate({
        path: "managerId",
        select: "email name role isTempManager",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });

  } catch (err) {
    console.error("Fetch Manager Requests Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


exports.reviewManagerRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;

    // 🔒 1. ROLE CHECK (VERY IMPORTANT)
    if (req.user.role !== "travel-admin") {
      return res.status(403).json({
        success: false,
        message: "Only travel admin can review requests",
      });
    }

    // 🔒 2. VALIDATE ACTION
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    const request = await ManagerRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // 🔒 3. PREVENT DOUBLE ACTION
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request already processed",
      });
    }

    // 🔒 4. CORPORATE CHECK
    if (String(request.corporateId) !== String(req.user.corporateId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const user = await User.findById(request.managerId);
    const employee = await Employee.findOne({
      userId: request.managerId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ APPROVE
    if (action === "approve") {
      user.role = "manager";
      user.isTempManager = false;
      user.managerRequestStatus = "approved";

      if (employee) {
        employee.role = "manager";
        await employee.save();
      }

      request.status = "approved";
    }

    // ❌ REJECT
    if (action === "reject") {
      user.isTempManager = false;
      user.managerRequestStatus = "rejected";
      request.status = "rejected";
    }

    await user.save();
    await request.save();

    return res.json({
      success: true,
      message: `Request ${action}ed successfully`,
    });

  } catch (err) {
    console.error("Review Manager Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



