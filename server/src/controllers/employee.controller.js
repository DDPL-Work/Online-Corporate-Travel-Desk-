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
    const employee = await Employee.findOne({ userId: req.user.id }).select(
      "-__v",
    );
    if (!employee) return next(new ApiError(404, "Employee profile not found"));

    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      employee: {
        name: employee.name,
        email: user?.email,
        phone: employee.mobile,
        employeeId: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
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

    if (!Object.keys(updates).length)
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
    ).select("-__v");

    if (!emp) return next(new ApiError(404, "Employee profile not found"));

    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      message: "Profile updated successfully",
      employee: {
        name: emp.name,
        email: user?.email,
        phone: emp.mobile,
        employeeId: emp.employeeCode,
        department: emp.department,
        designation: emp.designation,
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
