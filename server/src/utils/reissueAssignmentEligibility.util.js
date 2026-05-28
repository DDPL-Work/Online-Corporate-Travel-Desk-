const logger = require("./logger");

const MANAGE_REISSUES_PERMISSION = "Manage Reissues";
const REISSUE_ELIGIBLE_SCOPES = new Set(["Flights", "Both"]);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizePermission = (value) => normalizeString(value).toLowerCase();

const normalizeStatus = (value) => normalizeString(value).toUpperCase();

const normalizeServicingScope = (value) => {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === "flight" || normalized === "flights") {
    return "Flights";
  }
  if (normalized === "hotel" || normalized === "hotels") {
    return "Hotels";
  }
  if (normalized === "both" || normalized === "all") {
    return "Both";
  }

  return normalizeString(value);
};

const evaluateReissueAssignmentEligibility = (member, options = {}) => {
  const reasons = [];

  if (!member) {
    const result = {
      eligible: false,
      reasons: ["member_missing"],
      normalized: {
        permissions: [],
        servicingScope: "",
        status: "",
      },
    };

    if (options.log !== false) {
      logger.info("reissue_assignment_eligibility_check", {
        userId: null,
        eligible: false,
        reasons: result.reasons,
        status: null,
        isBlocked: null,
        permissions: [],
        servicingScope: null,
        context: options.context || null,
      });
    }

    return result;
  }

  const permissions = Array.isArray(member.permissions)
    ? member.permissions
    : [];
  const normalizedPermissions = permissions.map(normalizeString).filter(Boolean);
  const normalizedStatus = normalizeStatus(member.status);
  const normalizedScope = normalizeServicingScope(member.servicingScope);
  const hasReissuePermission = normalizedPermissions.some(
    (permission) => normalizePermission(permission) === normalizePermission(MANAGE_REISSUES_PERMISSION),
  );

  if (normalizedStatus !== "ACTIVE") {
    reasons.push("inactive_status");
  }

  if (member.isBlocked === true) {
    reasons.push("member_blocked");
  }

  if (!hasReissuePermission) {
    reasons.push("missing_manage_reissues_permission");
  }

  if (!REISSUE_ELIGIBLE_SCOPES.has(normalizedScope)) {
    reasons.push("invalid_servicing_scope");
  }

  const result = {
    eligible: reasons.length === 0,
    reasons,
    normalized: {
      permissions: normalizedPermissions,
      servicingScope: normalizedScope,
      status: normalizedStatus,
    },
  };

  if (options.log !== false) {
    logger.info("reissue_assignment_eligibility_check", {
      userId: member._id?.toString?.() || member.id?.toString?.() || null,
      eligible: result.eligible,
      reasons: result.reasons,
      status: member.status ?? null,
      isBlocked: member.isBlocked === true,
      permissions: normalizedPermissions,
      servicingScope: member.servicingScope ?? null,
      normalizedServicingScope: normalizedScope || null,
      context: options.context || null,
    });
  }

  return result;
};

const isEligibleForReissueAssignment = (member, options = {}) =>
  evaluateReissueAssignmentEligibility(member, options).eligible;

module.exports = {
  MANAGE_REISSUES_PERMISSION,
  REISSUE_ELIGIBLE_SCOPES,
  evaluateReissueAssignmentEligibility,
  isEligibleForReissueAssignment,
  normalizeServicingScope,
};
