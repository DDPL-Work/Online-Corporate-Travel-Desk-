export const DASHBOARD_ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  OPS_MEMBER: "ops-member",
});

export const OPS_PERMISSIONS = Object.freeze({
  VIEW_BOOKINGS: "Booking Management",
  MANAGE_CANCELLATIONS: "Cancellation Management",
  MANAGE_REISSUES: "Re-issue Management",
  VIEW_FINANCE: "Finance Management",
  MANAGE_CORPORATES: "Corporate Management",
  SEO_MANAGEMENT: "SEO Management",
});

const MENU_RULES = Object.freeze([
  {
    to: "/all-corporates",
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CORPORATES],
  },
  {
    to: "/pending-corporates",
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CORPORATES],
  },
  {
    to: "/bookings-summary",
    requiredPermissions: [OPS_PERMISSIONS.VIEW_BOOKINGS],
  },
  {
    to: "/all-reissue-requests",
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_REISSUES],
  },
  {
    to: "/cancellation-queries",
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CANCELLATIONS],
  },
  {
    to: "/cancellation-summary",
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CANCELLATIONS],
  },
  {
    to: "/corporate-revenue",
    requiredPermissions: [OPS_PERMISSIONS.VIEW_FINANCE],
  },
  {
    to: "/markup-revenue",
    requiredPermissions: [OPS_PERMISSIONS.VIEW_FINANCE],
  },
  {
    to: "/wallet-recharge-logs",
    requiredPermissions: [OPS_PERMISSIONS.VIEW_FINANCE],
  },
  {
    to: "/blog-and-articles",
    requiredPermissions: [OPS_PERMISSIONS.SEO_MANAGEMENT],
  },
]);

const ROUTE_RULES = Object.freeze([
  {
    paths: ["/all-corporates", "/onboarded-corporates", "/pending-corporates", "/active-corporates"],
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CORPORATES],
  },
  {
    paths: ["/bookings-summary"],
    requiredPermissions: [OPS_PERMISSIONS.VIEW_BOOKINGS],
  },
  {
    paths: ["/all-reissue-requests", "/pending-amendments"],
    requiredPermissions: [
      OPS_PERMISSIONS.MANAGE_REISSUES,
      OPS_PERMISSIONS.MANAGE_CANCELLATIONS,
    ],
  },
  {
    paths: ["/cancellation-queries", "/cancellation-query", "/cancellation-summary"],
    requiredPermissions: [OPS_PERMISSIONS.MANAGE_CANCELLATIONS],
  },
  {
    paths: ["/corporate-revenue", "/wallet-recharge-logs", "/financial-approvals", "/markup-revenue"],
    requiredPermissions: [OPS_PERMISSIONS.VIEW_FINANCE],
  },
  {
    paths: ["/blog-and-articles"],
    requiredPermissions: [OPS_PERMISSIONS.SEO_MANAGEMENT],
    prefix: true,
  },
  {
    paths: [
      "/corporate-access-control",
      "/credit-status-alerts",
      "/credit-status",
      "/commission-settings",
      "/api-configurations",
      "/ops-management",
    ],
    superAdminOnly: true,
  },
]);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

export const normalizePermissions = (permissions = []) =>
  [...new Set((Array.isArray(permissions) ? permissions : []).map(normalizeString).filter(Boolean))];

export const isSuperAdminRole = (role) =>
  normalizeString(role) === DASHBOARD_ROLES.SUPER_ADMIN;

export const isOpsMemberRole = (role) =>
  normalizeString(role) === DASHBOARD_ROLES.OPS_MEMBER;

export const hasAnyPermission = (permissions = [], requiredPermissions = []) => {
  const normalizedPermissions = normalizePermissions(permissions);
  const normalizedRequired = normalizePermissions(requiredPermissions);

  if (!normalizedRequired.length) {
    return true;
  }

  return normalizedRequired.some((permission) =>
    normalizedPermissions.includes(permission),
  );
};

const findRouteRule = (pathname = "") =>
  ROUTE_RULES.find((rule) =>
    rule.prefix
      ? rule.paths.some((path) => pathname.startsWith(path))
      : rule.paths.includes(pathname),
  );

export const canAccessDashboardPath = ({ role, permissions = [], pathname = "" }) => {
  if (!pathname || pathname === "/" || pathname === "/profile") {
    return true;
  }

  if (isSuperAdminRole(role)) {
    return true;
  }

  if (!isOpsMemberRole(role)) {
    return true;
  }

  const rule = findRouteRule(pathname);
  if (!rule) {
    return false;
  }

  if (rule.superAdminOnly) {
    return false;
  }

  return hasAnyPermission(permissions, rule.requiredPermissions);
};

export const canAccessMenuItem = ({ role, permissions = [], requiredPermissions = [], superAdminOnly = false }) => {
  if (isSuperAdminRole(role)) {
    return true;
  }

  if (!isOpsMemberRole(role)) {
    return false;
  }

  if (superAdminOnly) {
    return false;
  }

  return hasAnyPermission(permissions, requiredPermissions);
};

export const getDefaultDashboardPath = ({ role, permissions = [] }) => {
  if (isSuperAdminRole(role)) {
    return "/all-corporates";
  }

  if (!isOpsMemberRole(role)) {
    return "/unauthorized";
  }

  const firstAllowedItem = MENU_RULES.find((rule) =>
    hasAnyPermission(permissions, rule.requiredPermissions),
  );

  return firstAllowedItem?.to || "/unauthorized";
};
