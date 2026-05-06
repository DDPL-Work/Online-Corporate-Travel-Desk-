// employee.controller.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User"); // TravelAdmin
const Corporate = require("../models/Corporate");
const ApiError = require("../utils/ApiError");
const TravelDocument = require("../models/TravelDocument");
const { extractTextFromImage } = require("../utils/ocr");
const { parseDocumentData } = require("../utils/documentParser");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// ===============================
// GET OWN PROFILE
// ===============================
exports.getProfile = async (req, res, next) => {
  try {
    let employee = await Employee.findOne({ userId: req.user.id })
      .populate("managerId", "name email designation phone")
      .populate(
        "corporateId",
        "corporateName primaryContact secondaryContact defaultApprover",
      )
      .select("-__v");

    const user = await User.findById(req.user.id).populate("corporateId");

    // FALLBACK: If travel-admin or manager doesn't have an Employee doc, synthesize one from User doc
    if (!employee && ["travel-admin", "manager"].includes(user?.role)) {
      employee = {
        userId: user._id,
        name: `${user.name?.firstName || ""} ${user.name?.lastName || ""}`.trim() || user.username,
        email: user.email,
        corporateId: user.corporateId,
        designation: user.role,
        department: "Administration",
        mobile: user.phone || "",
        employeeCode: "ADMIN",
      };
    }

    if (!employee) return next(new ApiError(404, "Employee profile not found"));

    // Check for all "Manager Selection" requests for this employee (including project-specific)
    const ManagerRequest = require("../models/ManagerRequest");
    const managerRequests = await ManagerRequest.find({
      employeeId: employee._id,
    }).sort({ createdAt: -1 });

    // Determine the Travel Admin by searching users with the role 'travel-admin' for this corporate
    const travelAdminUser = await User.findOne({
      corporateId: employee.corporateId,
      role: "travel-admin",
      isActive: true,
    }).select("name email role");

    let travelAdmin = null;
    if (travelAdminUser) {
      travelAdmin = {
        name:
          `${travelAdminUser.name?.firstName || ""} ${travelAdminUser.name?.lastName || ""}`.trim() ||
          travelAdminUser.email,
        email: travelAdminUser.email,
        role: "Reviewing Authority (Travel Admin)",
      };
    } else {
      // Fallback to corporate contact if no travel-admin user found
      const corporate = employee.corporateId;
      const contact = corporate?.secondaryContact || corporate?.primaryContact;
      if (contact) {
        travelAdmin = {
          name: contact.name,
          email: contact.email,
          role: "Reviewing Authority (Travel Admin)",
        };
      }
    }

    // Build a list of approvers including project-specific ones
    const projectApprovers = managerRequests.map((req) => ({
      name: req.managerName,
      email: req.managerEmail,
      designation: req.managerRole,
      projectName: req.projectName || "General/Default",
      projectCode: req.projectCodeId,
      status: req.status === "pending" ? "Pending Review" : "Active",
      isProjectSpecific: !!req.projectName,
    }));

    // If no specific requests, use the default manager from Employee model
    if (projectApprovers.length === 0 && employee.managerId) {
      projectApprovers.push({
        name: employee.managerId.name,
        email: employee.managerId.email,
        designation: employee.managerId.designation,
        projectName: "General/Default",
        status: "Active",
        isProjectSpecific: false,
      });
    }

    res.json({
      success: true,
      employee: {
        name: employee.name,
        email: user?.email,
        phone: employee.mobile,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        projectApprovers, // <--- New field for list
        travelAdmin: travelAdmin
          ? {
              name: travelAdmin.name,
              email: travelAdmin.email,
              role: "Reviewing Authority (Travel Admin)",
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ===============================
// UPDATE OWN PROFILE
// ===============================
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.mobile = req.body.phone; // 🔥 mapping
    if (req.body.department !== undefined)
      updates.department = req.body.department;
    if (req.body.designation !== undefined)
      updates.designation = req.body.designation;
    if (req.body.employeeId !== undefined)
      updates.employeeCode = req.body.employeeId;

    if (!Object.keys(updates).length && !req.body.managerId && !req.body.email)
      return next(new ApiError(400, "No valid fields to update"));

    if (req.body.email !== undefined) {
      await User.findByIdAndUpdate(req.user.id, {
        email: req.body.email,
      });
    }

    const emp = await Employee.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("managerId", "name email designation phone")
      .select("-__v");

    // If no Employee doc but user is admin/manager, we can allow basic User updates
    if (!emp) {
        const user = await User.findById(req.user.id);
        if (["travel-admin", "manager"].includes(user?.role)) {
            const userUpdates = {};
            if (updates.name) {
                const parts = updates.name.split(" ");
                userUpdates["name.firstName"] = parts[0];
                userUpdates["name.lastName"] = parts.slice(1).join(" ");
            }
            if (updates.mobile !== undefined) {
                userUpdates.phone = updates.mobile;
            }
            
            await User.findByIdAndUpdate(req.user.id, userUpdates);
            
            // Re-fetch to return the synthesized employee object
            const updatedUser = await User.findById(req.user.id).populate("corporateId");
            const synthesizedEmployee = {
                userId: updatedUser._id,
                name: `${updatedUser.name?.firstName || ""} ${updatedUser.name?.lastName || ""}`.trim() || updatedUser.username,
                email: updatedUser.email,
                corporateId: updatedUser.corporateId,
                designation: updatedUser.role,
                department: "Administration",
                phone: updatedUser.phone || "",
                employeeCode: "ADMIN",
            };
            
            return res.json({ success: true, message: "Profile updated", employee: synthesizedEmployee });
        }
        return next(new ApiError(404, "Employee profile not found"));
    }

    // Handle Manager Selection via ManagerRequest
    if (req.body.managerId) {
      const ManagerRequest = require("../models/ManagerRequest");
      const Project = require("../models/Project.model");
      const managerUser = await Employee.findOne({ _id: req.body.managerId });

      let projectName = "General/Global";
      let projectCodeId = null;
      let projectClient = null;

      if (req.body.projectId) {
        const project = await Project.findById(req.body.projectId);
        if (project) {
          projectName = project.projectName;
          projectCodeId = project.projectCodeId;
          projectClient = project.clientName;
        }
      }

      if (managerUser) {
        await ManagerRequest.findOneAndUpdate(
          { employeeId: emp._id, projectName, status: "pending" },
          {
            employeeId: emp._id,
            managerId: managerUser.userId,
            managerEmail: managerUser.email,
            managerName: managerUser.name,
            managerRole: managerUser.designation,
            corporateId: emp.corporateId,
            projectName,
            projectCodeId,
            projectClient,
            status: "pending",
          },
          { upsert: true, new: true },
        );
      }
    }

    const user = await User.findById(req.user.id);

    // Determine the Travel Admin by searching users with the role 'travel-admin' for this corporate
    const travelAdminUser = await User.findOne({
      corporateId: emp.corporateId,
      role: "travel-admin",
      isActive: true,
    }).select("name email role");

    let travelAdmin = null;
    if (travelAdminUser) {
      travelAdmin = {
        name:
          `${travelAdminUser.name?.firstName || ""} ${travelAdminUser.name?.lastName || ""}`.trim() ||
          travelAdminUser.email,
        email: travelAdminUser.email,
        role: "Reviewing Authority (Travel Admin)",
        status: "Reviewer",
      };
    } else {
      const corporate = await Corporate.findById(emp.corporateId);
      const contact = corporate?.secondaryContact || corporate?.primaryContact;
      if (contact) {
        travelAdmin = {
          name: contact.name,
          email: contact.email,
          role: "Reviewing Authority (Travel Admin)",
          status: "Reviewer",
        };
      }
    }

    // Refresh manager info from ManagerRequest for pending status
    const ManagerRequest = require("../models/ManagerRequest");
    const latestReq = await ManagerRequest.findOne({
      employeeId: emp._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    let finalManager = emp.managerId
      ? {
          name: emp.managerId.name,
          email: emp.managerId.email,
          designation: emp.managerId.designation,
          role: "Primary Approver (Manager)",
          status: "Active",
        }
      : null;

    if (latestReq) {
      finalManager = {
        name: latestReq.managerName,
        email: latestReq.managerEmail,
        designation: latestReq.managerRole,
        role: "Primary Approver (Manager)",
        status: "Pending Review",
      };
    }

    res.json({
      success: true,
      message: latestReq
        ? "Profile updated and manager request sent for review"
        : "Profile updated successfully",
      employee: {
        name: emp.name,
        email: user?.email,
        phone: emp.mobile,
        employeeCode: emp.employeeCode,
        department: emp.department,
        designation: emp.designation,
        manager: finalManager,
        approvalChain: {
          level1: finalManager,
          level2: travelAdmin
            ? {
                name: travelAdmin.name,
                email: travelAdmin.email,
                role: "Reviewing Authority (Travel Admin)",
                status: "Reviewer",
              }
            : null,
        },
        travelAdmin: travelAdmin
          ? {
              name: travelAdmin.name,
              email: travelAdmin.email,
              role: "Reviewing Authority (Travel Admin)",
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadTravelDocument = async (req, res, next) => {
  try {
    const file = req.files?.travelDocument?.[0];

    if (!file) {
      return next(new ApiError(400, "File is required"));
    }

    const { type, name } = req.body;

    // Restriction
    if (["passport", "pan"].includes(type)) {
      const existing = await TravelDocument.findOne({
        userId: req.user.id,
        type,
      });

      if (existing) {
        return next(
          new ApiError(400, `${type} already exists. Only one allowed.`),
        );
      }
    }

    // ✅ 1. Upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "travel-documents",
    });

    // ✅ 2. Delete local file (VERY IMPORTANT)
    fs.unlinkSync(file.path);

    // ✅ 3. OCR from cloudinary URL (better)
    const extractedText = await extractTextFromImage(uploaded.secure_url);

    // ✅ 4. Parse
    const parsed = parseDocumentData(extractedText, type);

    const doc = await TravelDocument.create({
      userId: req.user.id,
      type,
      name,
      number: parsed.number,
      expiry: type === "pan" ? null : parsed.expiry, // ✅ FIX
      issueDate: parsed.issueDate,
      fileUrl: uploaded.secure_url,
      fileName: file.originalname,
    });

    res.json({
      success: true,
      message: "Uploaded + parsed successfully",
      document: doc,
      extracted: parsed,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTravelDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await TravelDocument.findOne({
      _id: id,
      userId: req.user.id, // 🔒 security
    });

    if (!doc) {
      return next(new ApiError(404, "Document not found"));
    }

    // ✅ Delete from Cloudinary
    if (doc.fileUrl) {
      const publicId = doc.fileUrl.split("/").slice(-2).join("/").split(".")[0]; // extract public_id

      await cloudinary.uploader.destroy(publicId);
    }

    // ✅ Delete from DB
    await TravelDocument.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyDocuments = async (req, res, next) => {
  try {
    const docs = await TravelDocument.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      documents: docs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/travel-admin/me
 * Fetch approver based on same email domain
 */

exports.getMyTravelAdmin = async (req, res) => {
  try {
    const { id, email, role } = req.user;

    // Only employee should call this
    if (role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Only employees can fetch approver",
      });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee email",
      });
    }

    // 1️⃣ Extract domain
    const domain = email.split("@")[1].toLowerCase();

    // 2️⃣ Find approver in same domain
    const approver = await User.findOne({
      role: { $in: ["travel-admin", "admin"] },
      email: { $regex: `@${domain}$`, $options: "i" },
      isActive: true,
    }).select("_id name email phone designation role");

    if (!approver) {
      return res.status(404).json({
        success: false,
        message: "No approver found for your domain",
      });
    }

    return res.status(200).json({
      success: true,
      data: approver,
    });
  } catch (error) {
    console.error("GET APPROVER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approver",
    });
  }
};

// ===============================
// GET GST DETAILS FOR EMPLOYEE'S CORPORATE
// ===============================
exports.getMyGstDetails = async (req, res, next) => {
  try {
    const { email } = req.user;

    if (!email || !email.includes("@")) {
      return next(new ApiError(400, "Invalid employee email"));
    }

    const domain = email.split("@")[1].toLowerCase();

    const corporate = await Corporate.findOne({
      "ssoConfig.domain": domain,
      isActive: true,
    }).select("gstDetails corporateName registeredAddress");

    if (!corporate) {
      return next(new ApiError(404, "Corporate not found for your domain"));
    }

    const gst = corporate.gstDetails || {};

    return res.json({
      success: true,
      data: {
        corporateName: corporate.corporateName,
        gstin: gst.gstin || "",
        legalName: gst.legalName || "",
        gstEmail: gst.gstEmail || "",
        address:
          gst.address ||
          [
            corporate.registeredAddress?.street,
            corporate.registeredAddress?.city,
            corporate.registeredAddress?.state,
            corporate.registeredAddress?.pincode,
            corporate.registeredAddress?.country,
          ]
            .filter(Boolean)
            .join(", "),
        verified: gst.verified || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ===============================
// GET MANAGERS IN CORPORATE
// ===============================
exports.getManagers = async (req, res, next) => {
  try {
    let employee = await Employee.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);

    const corporateId = employee?.corporateId || user?.corporateId;

    if (!corporateId) return next(new ApiError(404, "Corporate association not found"));

    const managers = await Employee.find({
      corporateId: corporateId,
      status: "active",
      userId: { $ne: req.user.id }, // exclude self
    }).select("name email designation role");

    res.json({
      success: true,
      managers,
    });
  } catch (err) {
    next(err);
  }
};
