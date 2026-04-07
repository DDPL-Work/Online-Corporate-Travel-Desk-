const User = require('../models/User');
const Employee = require('../models/Employee');
const ManagerRequest = require('../models/ManagerRequest');
const HotelBookingRequest = require('../models/hotelBookingRequest.model');

exports.handleManagerSelection = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const {
      approverId,
      approverEmail,
      projectCodeId,
      projectName,
      projectClient,
    } = req.body;

    if (!approverId || !approverEmail || !projectCodeId) {
      return res.status(400).json({
        success: false,
        message: "Approver ID, email and project code are required",
      });
    }

    const employeeId = req.user._id;

    // ============================================================
    // 🔥 STEP 1: GET EMPLOYEE DETAILS (IMPORTANT FIX)
    // ============================================================

    const employeeUser = await User.findById(employeeId).select(
      "name email role"
    );

    if (!employeeUser) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // 🔥 NEW: GET EMPLOYEE RECORD
    const employee = await Employee.findOne({ userId: employeeId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found",
      });
    }

    const employeeName = `${employeeUser.name?.firstName || ""} ${
      employeeUser.name?.lastName || ""
    }`.trim();

    const employeeEmail = employeeUser.email;

    // ============================================================
    // 🔥 STEP 2: RESOLVE MANAGER
    // ============================================================

    let managerUser = await User.findOne({
      _id: approverId,
      email: approverEmail,
    });

    if (!managerUser) {
      const approverEmployee = await Employee.findById(approverId);

      if (approverEmployee && approverEmployee.email === approverEmail) {
        managerUser = await User.findById(approverEmployee.userId);
      }
    }

    if (!managerUser) {
      return res.status(404).json({
        success: false,
        message: "Approver not found",
      });
    }

    // ============================================================
    // 🔥 STEP 3: APPROVED CHECK
    // ============================================================

    const approvedRequest = await ManagerRequest.findOne({
      employeeId: employee._id,
      projectCodeId,
      status: "approved",
    });

    if (approvedRequest) {
      if (
        approvedRequest.managerId.toString() === managerUser._id.toString()
      ) {
        return res.json({
          success: true,
          message: "Manager already approved for this project",
        });
      }
    }

    // ============================================================
    // 🔥 STEP 4: PENDING CHECK
    // ============================================================

    const existingPending = await ManagerRequest.findOne({
      employeeId: employee._id,
      managerId: managerUser._id,
      projectCodeId,
      status: "pending",
    });

    if (existingPending) {
      return res.json({
        success: true,
        message: "Manager request already pending",
      });
    }

    // ============================================================
    // 🔥 STEP 5: CREATE REQUEST (WITH EMPLOYEE SNAPSHOT)
    // ============================================================

    managerUser.isTempManager = true;
    managerUser.managerRequestStatus = "pending";
    await managerUser.save();

    await ManagerRequest.create({
      employeeId: employee._id,

      // 🔥 NEW (IMPORTANT)
      employeeName,
      employeeEmail,

      managerId: managerUser._id,
      managerEmail: managerUser.email,
      managerName: `${managerUser.name.firstName} ${managerUser.name.lastName}`.trim(),
      managerRole: managerUser.role,

      projectCodeId,
      projectName,
      projectClient,

      corporateId: req.user.corporateId,
    });

    return res.json({
      success: true,
      message: "Manager request sent to travel admin",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};



exports.getPendingHotelRequestsForApprover = async (req, res) => {
  try {
    // 🔐 Auth check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const approverId = req.user._id;
    const corporateId = req.user.corporateId;

    // 🔥 Only NOT approved requests (pending_approval)
    const requests = await HotelBookingRequest.find({
      approverId,
      corporateId,
      bookingType: "hotel",
      requestStatus: "pending_approval", // ✅ key condition
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests, // ✅ full data
    });
  } catch (error) {
    console.error("Error fetching pending hotel approvals:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending hotel requests",
    });
  }
};


exports.getMyEmployees = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const managerId = req.user._id;

    // 🔥 Fetch Manager Requests
    const requests = await ManagerRequest.find({
      managerId,
      status: "approved",
    })
      .populate({
        path: "employeeId", // 👈 Employee model
        select: "employeeId designation department userId",
        populate: {
          path: "userId", // 👈 User model
          select: "name email role",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // 🔥 Transform response
    const employees = requests.map((reqItem) => {
      const emp = reqItem.employeeId; // Employee doc
      const user = emp?.userId;       // User doc

      return {
        employeeId: emp?._id,
        employeeCode: emp?.employeeId,

        name: `${user?.name?.firstName || ""} ${user?.name?.lastName || ""}`.trim(),
        email: user?.email,
        role: user?.role,

        designation: emp?.designation,
        department: emp?.department,

        managerRequestStatus: reqItem.status,

        projectCodeId: reqItem.projectCodeId,
        projectName: reqItem.projectName,
        projectClient: reqItem.projectClient,
      };
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching manager employees:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

exports.getApprovedHotelRequestsForApprover = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const approverId = req.user._id;
    const corporateId = req.user.corporateId;

    const requests = await HotelBookingRequest.find({
      approverId,
      corporateId,
      bookingType: "hotel",
      requestStatus: "approved",
    })
      .populate({
        path: "approvedBy",
        select: "name email role",
      })
      .sort({ updatedAt: -1 })
      .lean();

    const data = requests.map((reqItem) => {
      return {
        ...reqItem,

        approvedByDetails: reqItem.approvedBy
          ? {
              name: `${reqItem.approvedBy.name?.firstName || ""} ${reqItem.approvedBy.name?.lastName || ""}`.trim(),
              email: reqItem.approvedBy.email,
              role: reqItem.approvedBy.role,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching approved hotel requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch approved requests",
    });
  }
};

exports.getRejectedHotelRequestsForApprover = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const approverId = req.user._id;
    const corporateId = req.user.corporateId;

    const requests = await HotelBookingRequest.find({
      approverId,
      corporateId,
      bookingType: "hotel",
      requestStatus: "rejected",
    })
      .populate({
        path: "rejectedBy",
        select: "name email role",
      })
      .sort({ updatedAt: -1 })
      .lean();

    const data = requests.map((reqItem) => {
      return {
        ...reqItem,

        rejectedByDetails: reqItem.rejectedBy
          ? {
              name: `${reqItem.rejectedBy.name?.firstName || ""} ${reqItem.rejectedBy.name?.lastName || ""}`.trim(),
              email: reqItem.rejectedBy.email,
              role: reqItem.rejectedBy.role,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching rejected hotel requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rejected requests",
    });
  }
};

exports.getTeamBookedHotelRequests = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user._id;
    const corporateId = req.user.corporateId;

    const requests = await HotelBookingRequest.find({
      corporateId,
      bookingType: "hotel",
      requestStatus: "approved",

      // 🔥 ONLY EXECUTED BOOKINGS
      // executionStatus: { $in: ["booked", "cancelled"] },

      // 🔥 I am approver OR I approved
      $or: [
        { approverId: userId },
        { approvedBy: userId },
      ],
    })
      .populate({
        path: "approvedBy",
        select: "name email role",
      })
      .sort({ updatedAt: -1 })
      .lean();

    const data = requests.map((reqItem) => ({
      ...reqItem,

      approvedByDetails: reqItem.approvedBy
        ? {
            name: `${reqItem.approvedBy.name?.firstName || ""} ${reqItem.approvedBy.name?.lastName || ""}`.trim(),
            email: reqItem.approvedBy.email,
            role: reqItem.approvedBy.role,
          }
        : null,

      // 🔥 helpful flags
      approvedByMe:
        reqItem.approvedBy?._id?.toString() === userId.toString(),

      isBooked: reqItem.executionStatus === "booked",
      isCancelled: reqItem.executionStatus === "cancelled",
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching executed approved hotel requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
    });
  }
};