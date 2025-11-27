const Joi = require("joi");

const normalizeMobile = Joi.string().custom((value, helpers) => {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length !== 10) {
    return helpers.error("string.length", { limit: 10 });
  }
  return cleaned;
});

const createCorporate = Joi.object({
  name: Joi.string().min(3).required(),

  registeredAddress: Joi.string().optional(),

  domain: Joi.string().domain().optional(),

  ssoType: Joi.string()
    .valid("google", "microsoft", "zoho", "none")
    .default("none"),

  primaryContact: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobile: normalizeMobile.required(),
  }).required(),

  secondaryContact: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    mobile: normalizeMobile.optional(),
  }).optional(),

  billingDepartment: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobile: normalizeMobile.required(),
  }).required(),

  creditTermsNotes: Joi.string().optional(),

  classification: Joi.string().valid("prepaid", "postpaid").default("postpaid"),

  creditLimit: Joi.number().min(0).optional(),

  billingCycleDays: Joi.number().valid(15, 30, 45, 60).default(30),

  travelPolicy: Joi.object({
    allowedCabin: Joi.array().items(Joi.string()).required(),
    allowAncillaries: Joi.boolean().required(),
  }).required(),
});


module.exports = {
  createCorporate,
};
