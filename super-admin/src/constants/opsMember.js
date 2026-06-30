export const OPS_ACCESS_ROLE_OPTIONS = [
  { value: "ops-member", label: "OPS Team Member" },
];

export const OPS_DEPARTMENT_OPTIONS = [
  "Operations",
  "Support",
  "Finance",
  "SEO",
];

export const OPS_DESIGNATION_OPTIONS = [
  "Booking Manager",
  "Support Agent",
  "Finance OPS",
  "SEO Specialist",
];

export const OPS_SERVICING_SCOPE_OPTIONS = ["Flights", "Hotels", "Both"];

export const LEGACY_OPS_ROLE_DETAILS = Object.freeze({
  "Booking Manager": {
    role: "ops-member",
    department: "Operations",
    designation: "Booking Manager",
  },
  "Support Agent": {
    role: "ops-member",
    department: "Support",
    designation: "Support Agent",
  },
  "Finance OPS": {
    role: "ops-member",
    department: "Finance",
    designation: "Finance OPS",
  },
  "SEO Specialist": {
    role: "ops-member",
    department: "SEO",
    designation: "SEO Specialist",
  },
});

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const isServicingScope = (value) =>
  OPS_SERVICING_SCOPE_OPTIONS.includes(normalizeString(value));

const getLegacyRoleDetails = (value) =>
  LEGACY_OPS_ROLE_DETAILS[normalizeString(value)] || null;

const pushUnique = (items, value) => {
  const normalized = normalizeString(value);
  if (!normalized || items.includes(normalized)) {
    return items;
  }
  return [...items, normalized];
};

export const withSelectedOption = (options, selectedValue) =>
  pushUnique(options, selectedValue);

export const normalizeOpsMemberRecord = (member = {}) => {
  const legacyDetails =
    getLegacyRoleDetails(member.role) || getLegacyRoleDetails(member.designation);

  const role =
    OPS_ACCESS_ROLE_OPTIONS.find((option) => option.value === member.role)?.value ||
    legacyDetails?.role ||
    "ops-member";

  const designation =
    normalizeString(member.designation) ||
    legacyDetails?.designation ||
    OPS_DESIGNATION_OPTIONS[0];

  const servicingScope = isServicingScope(member.servicingScope)
    ? normalizeString(member.servicingScope)
    : isServicingScope(member.department)
      ? normalizeString(member.department)
      : "Both";

  const department = !isServicingScope(member.department)
    ? normalizeString(member.department) ||
      legacyDetails?.department ||
      OPS_DEPARTMENT_OPTIONS[0]
    : legacyDetails?.department || OPS_DEPARTMENT_OPTIONS[0];

  return {
    role,
    department,
    designation,
    servicingScope,
  };
};

export const buildOpsMemberPayload = (form = {}) => {
  const normalized = normalizeOpsMemberRecord(form);

  return {
    name: normalizeString(form.name),
    email: normalizeString(form.email),
    phone: normalizeString(form.phone),
    role: normalized.role,
    department: normalized.department,
    designation: normalized.designation,
    servicingScope: normalized.servicingScope,
    permissions: Array.isArray(form.permissions) ? form.permissions : [],
    password: form.password || "",
  };
};
