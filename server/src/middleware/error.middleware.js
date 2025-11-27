// ===============================
// Custom API Error Class
// ===============================
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
const errorMiddleware = (err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // -------------------------------
  // MONGOOSE: Invalid ObjectId
  // -------------------------------
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // -------------------------------
  // MONGOOSE: Duplicate Key
  // -------------------------------
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // -------------------------------
  // MONGOOSE: Validation Error
  // -------------------------------
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // -------------------------------
  // JWT Errors
  // -------------------------------
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid or malformed token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please login again.";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    details: err.details || null,
  });
};

// Exporting
module.exports = {
  ApiError,
  errorMiddleware,
};
