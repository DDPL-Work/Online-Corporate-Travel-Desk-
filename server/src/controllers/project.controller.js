const XLSX = require("xlsx");
const Project = require("../models/Project.model");
const { default: mongoose } = require("mongoose");

const validateTravelAdmin = (req) => {
  if (!req.user) {
    const err = new Error("Unauthorized: User not authenticated");
    err.statusCode = 401;
    throw err;
  }

  // ✅ Allow flexibility (future-safe)
  const allowedRoles = ["travel-admin"];

  if (!allowedRoles.includes(req.user.role)) {
    const err = new Error("Access denied. Travel Admin only.");
    err.statusCode = 403;
    throw err;
  }

  if (!req.user.corporateId) {
    const err = new Error("Corporate context missing (SSO failure)");
    err.statusCode = 400;
    throw err;
  }

  // ✅ Ensure valid ObjectId (critical for Mongo queries)
  if (!mongoose.Types.ObjectId.isValid(req.user.corporateId)) {
    const err = new Error("Invalid corporateId");
    err.statusCode = 400;
    throw err;
  }

  // ✅ Always return ObjectId (not string)
  return new mongoose.Types.ObjectId(req.user.corporateId);
};

exports.uploadProjectsExcel = async (req, res) => {
  try {
    const corporateId = validateTravelAdmin(req);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // ✅ Read from file path (since using disk storage)
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    // 1️⃣ Extract all project codes from Excel
    const projectCodes = data.map((row) =>
      String(row["Project Code ID"]).trim().toUpperCase(),
    );

    // 2️⃣ Find already existing projects
    const existingProjects = await Project.find({
      corporateId,
      projectCodeId: { $in: projectCodes },
    }).select("projectCodeId");

    const existingSet = new Set(existingProjects.map((p) => p.projectCodeId));

    // 3️⃣ Filter only NEW records
    const newProjects = [];
    const skipped = [];

    data.forEach((row, index) => {
      const code = String(row["Project Code ID"]).trim().toUpperCase();

      if (!row["Project Name"] || !code || !row["Client Name"]) {
        skipped.push({
          row: index + 2,
          reason: "Missing required fields",
        });
        return;
      }

      if (existingSet.has(code)) {
        skipped.push({
          row: index + 2,
          reason: "Duplicate (already exists)",
        });
        return;
      }

      newProjects.push({
        corporateId,
        projectName: row["Project Name"],
        projectCodeId: code,
        clientName: row["Client Name"],
        createdBy: req.user._id,
      });
    });

    // 4️⃣ Insert only new records
    let inserted = [];
    if (newProjects.length) {
      inserted = await Project.insertMany(newProjects);
    }

    return res.status(200).json({
      success: true,
      message: "Upload processed successfully",
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      skipped, // 🔥 useful for frontend table errors
    });
  } catch (error) {
    console.error("PROJECT UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
};

/**
 * ============================================================
 * 🔐 FETCH PROJECTS (SSO / CORPORATE SCOPED ONLY)
 * ============================================================
 */
exports.getProjectsByCorporate = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { corporateId } = req.query;

    if (!corporateId) {
      return res.status(400).json({
        success: false,
        message: "corporateId is required",
      });
    }

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(corporateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid corporateId",
      });
    }

    // 🔐 SECURITY CHECK (VERY IMPORTANT)
    if (req.user.corporateId.toString() !== corporateId) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this corporate",
      });
    }

    const projects = await Project.find({
      corporateId,
    })
      .select("projectName projectCodeId clientName createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("FETCH PROJECT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch projects",
    });
  }
};

/**
 * ============================================================
 * 🗑️ DELETE PROJECT (SSO SCOPED)
 * ============================================================
 */
exports.deleteProject = async (req, res) => {
  try {
    // 🔐 Basic auth check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { corporateId } = req.body; // 👈 from frontend

    // ✅ Validate inputs
    if (!id || !corporateId) {
      return res.status(400).json({
        success: false,
        message: "Project ID and corporateId are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(corporateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid corporateId",
      });
    }

    // 🔐 CRITICAL SECURITY CHECK
    if (req.user.corporateId.toString() !== corporateId) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this corporate",
      });
    }

    // 🔍 Find project within same corporate
    const project = await Project.findOne({
      _id: id,
      corporateId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    await Project.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete project",
    });
  }
};
