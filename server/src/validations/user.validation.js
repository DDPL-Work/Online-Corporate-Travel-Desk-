const Joi = require("joi");

// ===== COMMON FIELDS =====
const nameSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(40).required(),
  lastName: Joi.string().trim().min(2).max(40).allow(null, ""),
});

const mobileSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .message("Invalid Indian mobile number");


// ======================================================
// 1️⃣ LOGIN VALIDATION
// ======================================================
const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).max(50).required(),
});


// ======================================================
// 2️⃣ EMPLOYEE CREATION (Corporate Admin / Travel Admin)
// ======================================================
const createEmployee = Joi.object({
  name: nameSchema.required(),

  email: Joi.string().email().required(),

  mobile: mobileSchema.required(),

  role: Joi.string()
    .valid("employee", "approver", "corporate-admin", "travel-admin")
    .required(),

  password: Joi.string()
    .min(6)
    .max(50)
    .required(),

  corporateId: Joi.string().hex().length(24).required(),

  department: Joi.string().allow("", null),
  designation: Joi.string().allow("", null),
});


// ======================================================
// 3️⃣ TOGGLE USER STATUS
// ======================================================
const toggleStatus = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});


module.exports = {
  login,
  createEmployee,
  toggleStatus
};
