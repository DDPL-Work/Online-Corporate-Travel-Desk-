// server/src/validations/corporate.validation.js

const { body } = require("express-validator");

exports.corporateOnboarding = [
  body("corporateName")
    .notEmpty()
    .withMessage("Corporate name is required"),

  body("primaryContact.email")
    .notEmpty().withMessage("Primary contact email is required")
    .isEmail().withMessage("Invalid primary email"),

  body("ssoConfig.domain")
    .notEmpty()
    .withMessage("SSO domain is required"),
];


exports.updateCorporate = [
  body("corporateName")
    .optional()
    .notEmpty()
    .withMessage("Corporate name cannot be empty"),

  body("primaryContact.email")
    .optional()
    .isEmail()
    .withMessage("Valid email required"),
];
