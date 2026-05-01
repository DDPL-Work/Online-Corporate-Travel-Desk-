const User = require('../models/User');
const Employee = require('../models/Employee');
const ManagerRequest = require('../models/ManagerRequest');
const HotelBookingRequest = require('../models/hotelBookingRequest.model');
const BookingRequest = require('../models/BookingRequest');

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

    const normalizedEmail = (approverEmail || "").trim().toLowerCase();

    if (!normalizedEmail || !projectCodeId) {
      return res.status(400).json({
        success: false,
        message: "Approver email and project code are required",
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

    let managerUser = null;

    // Resolve by explicit id + email when provided
    if (approverId) {
      managerUser = await User.findOne({
        _id: approverId,
        email: normalizedEmail,
      });

      if (!managerUser) {
        const approverEmployee = await Employee.findById(approverId);

        if (approverEmployee && approverEmployee.email?.toLowerCase() === normalizedEmail) {
          managerUser = await User.findById(approverEmployee.userId);
        }
      }
    }

    // Fallback: resolve just by email (manual entry) via User or Employee
    if (!managerUser) {
      managerUser =
        (await User.findOne({ email: normalizedEmail })) ||
        (await (async () => {
          const emp = await Employee.findOne({ email: normalizedEmail });
          if (emp?.userId) return User.findById(emp.userId);
          return null;
        })());
    }

    // If still not found, bootstrap a temp manager user for this corporate
    if (!managerUser) {
      const namePart = normalizedEmail.split("@")[0] || "Manager";
      managerUser = await User.create({
        corporateId: req.user?.corporateId,
        email: normalizedEmail,
        name: { firstName: namePart, lastName: "" },
        role: "manager",
        isTempManager: true,
        managerRequestStatus: "pending",
      });
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

    if (managerUser.managerRequestStatus !== "approved") {
      managerUser.isTempManager = true;
      managerUser.managerRequestStatus = "pending";
      await managerUser.save();
    }

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

      // 🔥 I am approver OR I approved
      $or: [
        { approverId: userId },
        { approvedBy: userId },
      ],
    })
      .populate({
        path: "userId",
        select: "name email role",
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

/* ============================================================
   FLIGHT BOOKING REQUESTS (Approver Views)
   Uses BookingRequest model (bookingType: flight)
   ============================================================ */

exports.getPendingFlightRequestsForApprover = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const approverId = req.user._id?.toString();
    const corporateId = req.user.corporateId;

    const requests = await BookingRequest.find({
      bookingType: "flight",
      requestStatus: "pending_approval",
      corporateId,
      approverId: { $in: [approverId, req.user._id] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching pending flight approvals:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch pending flight requests" });
  }
};

exports.getApprovedFlightRequestsForApprover = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const approverId = req.user._id?.toString();
    const corporateId = req.user.corporateId;

    const requests = await BookingRequest.find({
      bookingType: "flight",
      requestStatus: "approved",
      corporateId,
      approverId: { $in: [approverId, req.user._id] },
    })
      .populate({ path: "approvedBy", select: "name email role" })
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
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Error fetching approved flight requests:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch approved flight requests" });
  }
};

exports.getRejectedFlightRequestsForApprover = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const approverId = req.user._id?.toString();
    const corporateId = req.user.corporateId;

    const requests = await BookingRequest.find({
      bookingType: "flight",
      requestStatus: "rejected",
      corporateId,
      approverId: { $in: [approverId, req.user._id] },
    })
      .populate({ path: "rejectedBy", select: "name email role" })
      .sort({ updatedAt: -1 })
      .lean();

    const data = requests.map((reqItem) => ({
      ...reqItem,
      rejectedByDetails: reqItem.rejectedBy
        ? {
            name: `${reqItem.rejectedBy.name?.firstName || ""} ${reqItem.rejectedBy.name?.lastName || ""}`.trim(),
            email: reqItem.rejectedBy.email,
            role: reqItem.rejectedBy.role,
          }
        : null,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Error fetching rejected flight requests:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch rejected flight requests" });
  }
};

exports.getTeamBookedFlightRequests = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user._id;
    const corporateId = req.user.corporateId;

    const requests = await BookingRequest.find({
      bookingType: "flight",
      requestStatus: "approved",
      corporateId,
      $or: [{ approverId: { $in: [userId, userId.toString()] } }, { approvedBy: userId }],
    })
      .populate({ path: "userId", select: "name email role" })
      .populate({ path: "approvedBy", select: "name email role" })
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
      approvedByMe: reqItem.approvedBy?._id?.toString() === userId.toString(),
      isBooked: reqItem.executionStatus === "booked" || reqItem.executionStatus === "ticketed",
      isCancelled: reqItem.executionStatus === "cancelled",
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Error fetching executed approved flight requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flight requests",
    });
  }
};

exports.getTeamExecutedFlightRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const corporateId = req.user.corporateId;

    const request = await BookingRequest.findOne({
      _id: id,
      corporateId,
      bookingType: "flight",
      requestStatus: "approved",
      $or: [
        { approverId: { $in: [userId, userId.toString()] } },
        { approvedBy: userId },
      ],
    })
      .populate({ path: "userId", select: "name email role" })
      .populate({ path: "approvedBy", select: "name email role" })
      .populate({ path: "rejectedBy", select: "name email role" })
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Flight booking not found or you are not authorized to view it",
      });
    }

    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching team flight request details:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTeamExecutedHotelRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const corporateId = req.user.corporateId;

    const request = await HotelBookingRequest.findOne({
      _id: id,
      corporateId,
      bookingType: "hotel",
      requestStatus: "approved",
      $or: [{ approverId: userId }, { approvedBy: userId }],
    })
      .populate({ path: "userId", select: "name email role" })
      .populate({ path: "approvedBy", select: "name email role" })
      .populate({ path: "rejectedBy", select: "name email role" })
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Hotel booking not found or you are not authorized to view it",
      });
    }

    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching team hotel request details:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
