const OPS_MEMBER_ACCESS_ROLES = Object.freeze(["ops-member"]);
const OPS_MEMBER_SERVICING_SCOPES = Object.freeze(["Flights", "Hotels", "Both"]);

const OPS_AVAILABILITY_STATUSES = Object.freeze(["AVAILABLE", "BUSY", "BREAK", "OFFLINE", "ON_LEAVE"]);

const DEFAULT_OPS_ROLE = "ops-member";
const DEFAULT_OPS_DEPARTMENT = "Operations";
const DEFAULT_OPS_SERVICING_SCOPE = "Both";

const LEGACY_OPS_ROLE_DETAILS = Object.freeze({
  "Booking Manager": {
    role: DEFAULT_OPS_ROLE,
    department: "Operations",
    designation: "Booking Manager",
  },
  "Support Agent": {
    role: DEFAULT_OPS_ROLE,
    department: "Support",
    designation: "Support Agent",
  },
  "Finance OPS": {
    role: DEFAULT_OPS_ROLE,
    department: "Finance",
    designation: "Finance OPS",
  },
  "SEO Specialist": {
    role: DEFAULT_OPS_ROLE,
    department: "SEO",
    designation: "SEO Specialist",
  },
});

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const getLegacyRoleDetails = (value) => {
  const normalized = normalizeString(value);
  return LEGACY_OPS_ROLE_DETAILS[normalized] || null;
};

const isServicingScope = (value) =>
  OPS_MEMBER_SERVICING_SCOPES.includes(normalizeString(value));

const inferDepartmentFromDesignation = (designation) => {
  const legacyDetails = getLegacyRoleDetails(designation);
  return legacyDetails?.department || "";
};

const normalizeOpsMemberInput = (input = {}, existing = {}) => {
  const inputRole = normalizeString(input.role);
  const inputDepartment = normalizeString(input.department);
  const inputDesignation = normalizeString(input.designation);
  const inputServicingScope = normalizeString(input.servicingScope);

  const existingRole = normalizeString(existing.role);
  const existingDepartment = normalizeString(existing.department);
  const existingDesignation = normalizeString(existing.designation);
  const existingServicingScope = normalizeString(existing.servicingScope);

  const legacyRoleDetails =
    getLegacyRoleDetails(inputRole) || getLegacyRoleDetails(existingRole);

  let role = OPS_MEMBER_ACCESS_ROLES.includes(inputRole)
    ? inputRole
    : OPS_MEMBER_ACCESS_ROLES.includes(existingRole)
      ? existingRole
      : DEFAULT_OPS_ROLE;

  let department = inputDepartment || existingDepartment;
  let designation = inputDesignation || existingDesignation;
  let servicingScope =
    (isServicingScope(inputServicingScope) && inputServicingScope) ||
    (isServicingScope(existingServicingScope) && existingServicingScope) ||
    "";

  if (legacyRoleDetails) {
    role = legacyRoleDetails.role;
    designation = designation || legacyRoleDetails.designation;
    if (!department || isServicingScope(department)) {
      department = legacyRoleDetails.department;
    }
  }

  if (isServicingScope(department)) {
    servicingScope = servicingScope || department;
    department =
      inferDepartmentFromDesignation(designation) ||
      (existingDepartment && !isServicingScope(existingDepartment)
        ? existingDepartment
        : DEFAULT_OPS_DEPARTMENT);
  }

  department =
    department ||
    inferDepartmentFromDesignation(designation) ||
    DEFAULT_OPS_DEPARTMENT;
  servicingScope = servicingScope || DEFAULT_OPS_SERVICING_SCOPE;

  return {
    role,
    department,
    designation,
    servicingScope,
  };
};

module.exports = {
  DEFAULT_OPS_DEPARTMENT,
  DEFAULT_OPS_ROLE,
  DEFAULT_OPS_SERVICING_SCOPE,
  LEGACY_OPS_ROLE_DETAILS,
  OPS_MEMBER_ACCESS_ROLES,
  OPS_MEMBER_SERVICING_SCOPES,
  OPS_AVAILABILITY_STATUSES,
  getLegacyRoleDetails,
  isServicingScope,
  normalizeOpsMemberInput,
};
