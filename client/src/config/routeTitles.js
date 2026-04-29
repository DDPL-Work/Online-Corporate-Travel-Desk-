// Route to Page Title mapping
export const routeTitles = {
  // Auth Routes
  "/iapindia": "iapindia - Corporate Travel Desk",
  "/sso/callback": "SSO Callback",
  "/unauthorized": "Unauthorized",
  "/update-profile": "Update Profile",

  // Travel Admin Routes
  "/total-bookings": "Total Bookings - Travel Admin",
  "/total-cancelled-bookings": "Cancelled Bookings - Travel Admin",
  "/pending-requests": "Pending Requests",
  "/approved-requests": "Approved Requests",
  "/rejected-requests": "Rejected Requests",
  "/upcoming-trips": "Upcoming Trips",
  "/past-trips": "Past Trips",
  "/user-management": "User Management",
  "/travel-profile-settings": "Profile Settings",
  "/corporate-wallet": "Corporate Wallet",
  "/credit-utilization": "Credit Utilization",

  // Employee Routes
  "/my-bookings": "My Bookings",
  "/my-cancelled-bookings": "Cancelled Bookings",
  "/my-upcoming-trips": "My Upcoming Trips",
  "/my-past-trips": "My Past Trips",
  "/my-pending-approvals": "My Pending Approvals",
  "/my-rejected-requests": "My Rejected Requests",
  "/my-profile": "My Profile",
  "/travel-documents": "Travel Documents",

  // Corporate Super Admin Routes
  "/corporate-dashboard": "Corporate Dashboard",
  "/admin-management": "Admin Management",
  "/employee-management": "Employee Management",
  "/corporate-total-bookings": "Corporate Total Bookings",

  // Search & Booking Routes
  "/search-flight": "Search Flights",
  "/search-flight-results": "Flight Results",
  "/one-way-flight/booking": "Book One-Way Flight",
  "/round-trip-flight/booking": "Book Round-Trip Flight",
  "/multi-city-flight/booking": "Book Multi-City Flight",
  "/search-hotel": "Search Hotels",
  "/search-hotel-results": "Hotel Results",
  "/one-hotel-details": "Hotel Details",
  "/hotel-review-booking": "Hotel Review & Booking",
  "/hotel-booking/:id": "Hotel Booking",
  "/bookings/:id/book": "Book Flight",
  "/my-booking/:id": "Booking Details",
  "/my-hotel-booking/:id": "Hotel Booking Details",

  // Landing Routes
  "/who-it's-for/independent": "For Independent",
};

/**
 * Get page title for a given pathname
 * @param {string} pathname - Current URL pathname
 * @returns {string} Page title
 */
export const getPageTitle = (pathname) => {
  // Check for exact match
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  // Check for pattern matches (for dynamic routes)
  const patterns = [
    {
      pattern: /^\/my-bookings\/\d+$/,
      title: "Booking Details",
    },
    {
      pattern: /^\/bookings\/\d+\/book$/,
      title: "Book Flight",
    },
    {
      pattern: /^\/my-hotel-booking\/\d+$/,
      title: "Hotel Booking Details",
    },
    {
      pattern: /^\/hotel-review-booking\/\d+$/,
      title: "Hotel Review & Booking",
    },
    {
      pattern: /^\/hotel-booking\/\d+$/,
      title: "Hotel Booking",
    },
  ];

  for (const { pattern, title } of patterns) {
    if (pattern.test(pathname)) {
      return title;
    }
  }

  // Default title
  return "Traveamer - Corporate Travel Desk";
};
