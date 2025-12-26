const Joi = require("joi");

exports.validateJoi = (schema) => {
  return (req, res, next) => {
    if (!schema) return next();

    const joiSchema = schema.isJoi ? schema : Joi.object(schema);

    const { error, value } = joiSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    req.body = value;
    next();
  };
};
