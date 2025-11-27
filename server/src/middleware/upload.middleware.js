const multer = require("multer");
const { ApiError } = require("./error.middleware.js");

// ========================================
// Use Memory Storage (Required for S3)
// ========================================
const storage = multer.memoryStorage();

// ========================================
// File Filter: Only Allow PDFs, JPG, PNG
// ========================================
const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, "Invalid file type. Only PDF, JPG, PNG allowed"));
  }
  cb(null, true);
};

// ========================================
// Upload Middleware (GST + PAN)
// ========================================
const uploadKycFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).fields([
  { name: "gstCertificate", maxCount: 1 },
  { name: "panCertificate", maxCount: 1 },
]);

module.exports = {
  uploadKycFiles,
};
