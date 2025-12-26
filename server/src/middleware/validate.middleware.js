const { validationResult } = require("express-validator");

/**
 * Universal validation middleware
 * - Supports express-validator (array)
 * - Supports Joi schema
 */
module.exports = (schema) => {
  return async (req, res, next) => {
    try {
      // =====================================
      // 1️⃣ EXPRESS-VALIDATOR SUPPORT
      // =====================================
      if (Array.isArray(schema)) {
        await Promise.all(schema.map((rule) => rule.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map(err => ({
              field: err.param,
              message: err.msg,
            })),
          });
        }

        return next();
      }

      // =====================================
      // 2️⃣ JOI SUPPORT
      // =====================================
      if (schema && typeof schema.validate === "function") {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
        });

        if (error) {
          return res.status(422).json({
            success: false,
            message: "Validation failed",
            errors: error.details.map(err => ({
              field: err.path.join("."),
              message: err.message,
            })),
          });
        }

        req.body = value; // sanitized data
        return next();
      }

      // =====================================
      // 3️⃣ INVALID USAGE
      // =====================================
      throw new Error("Invalid validation schema provided");

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Validation error",
      });
    }
  };
};
  