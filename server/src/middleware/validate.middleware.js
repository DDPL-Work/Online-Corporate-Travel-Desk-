const { ApiError } = require("./error.middleware.js");

module.exports.validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,       // Allow extra fields not in schema
      stripUnknown: false
    });

    if (error) {
      return next(
        new ApiError(
          422,
          "Validation failed",
          error.details.map((d) => d.message)
        )
      );
    }

    next();
  };
};
