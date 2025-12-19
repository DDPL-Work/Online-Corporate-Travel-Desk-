// middleware/validate.middleware.js
const { validationResult } = require("express-validator");

// validate() must RETURN a middleware function
// middleware/validate.middleware.js

exports.validate = (schema) => {
  return (req, res, next) => {
    const options = {
      abortEarly: false,   // return all errors
      allowUnknown: true,  // ignore unknown fields
      stripUnknown: true,  // remove unknown fields
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    req.body = value; // cleaned data
    next();
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
