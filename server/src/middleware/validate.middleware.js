// middleware/validate.middleware.js
const { validationResult } = require("express-validator");

// validate() must RETURN a middleware function
exports.validate = (validations = []) => {
  return async (req, res, next) => {
    try {
      // Run each validation
      for (let validation of validations) {
        await validation.run(req);
      }

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      next();
    } catch (err) {
      console.error("Validation middleware error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal validation error",
      });
    }
  };
};

// Sanitize body fields
exports.sanitizeBody = (fields = []) => {
  return (req, res, next) => {
    fields.forEach((field) => {
      const keys = field.split(".");
      let obj = req.body;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) return; // nested object missing
        obj = obj[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      if (typeof obj[lastKey] === "string") {
        obj[lastKey] = obj[lastKey].trim();
      }
    });

    next();
  };
};
