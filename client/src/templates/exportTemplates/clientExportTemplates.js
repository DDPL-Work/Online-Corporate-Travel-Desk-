import {
  formatExportBoolean,
  formatExportCurrency,
  formatExportDate,
  formatExportDateTime,
} from "../../utils/export/csvExport";

// Example templates. These can be customized per table.

export const pastFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const pastHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const totalFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const totalHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Booked Date", value: (r) => r.bookedDate ? new Date(r.bookedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const cancelledFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Status", key: "status" },
  { header: "Cancelled On", value: (r) => r.cancelledDate ? new Date(r.cancelledDate).toLocaleDateString("en-IN") : "—" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Refund Est.", value: (r) => formatExportCurrency(r.refundAmount) }
];

export const cancelledHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Status", key: "status" },
  { header: "Cancelled On", value: (r) => r.cancelledDate ? new Date(r.cancelledDate).toLocaleDateString("en-IN") : "—" },
  { header: "Refund Est.", value: (r) => formatExportCurrency(r.refundAmount) }
];

export const rejectedFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Rejected On", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const rejectedHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Rejected On", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const pendingFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Requested On", value: (r) => r.bookedDate ? new Date(r.bookedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Travel Date", value: (r) => r.travelDate ? new Date(r.travelDate).toLocaleDateString("en-IN") : "—" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const pendingHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Requested On", value: (r) => r.bookedDate ? new Date(r.bookedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Check-in", value: (r) => r.checkIn ? new Date(r.checkIn).toLocaleDateString("en-IN") : "—" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Status", key: "status" },
  { header: "Estimate", value: (r) => formatExportCurrency(r.amount) }
];

export const myTeamExportTemplate = [
  { header: "Personnel", value: (r) => `${r.name?.firstName || ""} ${r.name?.lastName || ""}`.trim() },
  { header: "Email", key: "email" },
  { header: "Role", key: "role" },
  { header: "Project Code", value: (r) => r.project?.code },
  { header: "Status", value: (r) => r.isActive ? "Active" : "Inactive" },
  { header: "Joined", value: (r) => new Date(r.createdAt).toLocaleDateString("en-IN") }
];

export const approvedFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Approved On", value: (r) => r.approvedAt ? new Date(r.approvedAt).toLocaleDateString("en-IN") : "—" },
  { header: "Travel Date", value: (r) => r.travelDate ? new Date(r.travelDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "executionStatus" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const approvedHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email", key: "employeeId" },
  { header: "Approved On", value: (r) => r.approvedAt ? new Date(r.approvedAt).toLocaleDateString("en-IN") : "—" },
  { header: "Check-in", value: (r) => r.checkIn ? new Date(r.checkIn).toLocaleDateString("en-IN") : "—" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Status", key: "executionStatus" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myUpcomingFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Departure Date", value: (r) => r.travelDate ? new Date(r.travelDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myUpcomingHotelsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Hotel", key: "hotelName" },
  { header: "Check-In Date", value: (r) => {
      const d = r.bookingSnapshot?.checkInDate || r.hotelRequest?.checkInDate;
      return d ? new Date(d).toLocaleDateString("en-IN") : "—";
  }},
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myRejectedFlightsExportTemplate = [
  { header: "Request ID", key: "id" },
  { header: "Destination", value: (r) => `${r.destination} | ${r.airlineName}` },
  { header: "Rejection Date", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Reason", key: "reason" },
  { header: "Status", value: () => "Rejected" }
];

export const myRejectedHotelsExportTemplate = [
  { header: "Request ID", key: "id" },
  { header: "Hotel", value: (r) => `${r.destination} | ${r.city}` },
  { header: "Rejection Date", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Reason", key: "reason" },
  { header: "Status", value: () => "Rejected" }
];

export const myReissuedRequestsExportTemplate = [
  { header: "Request ID", value: (r) => r.requestId || r.id || r._id || "—" },
  { header: "PNR", value: (r) => r.pnr || "—" },
  { header: "Booking Ref", value: (r) => r.bookingReference || r.bookingRef || "N/A" },
  { header: "Employee", value: (r) => r.userName || "—" },
  { header: "Route", value: (r) => r.route || "—" },
  { header: "Type", value: (r) => r.reissueType || r.type || "REISSUE" },
  { header: "Reason", value: (r) => r.reason || r.remarks || "N/A" },
  { header: "Date", value: (r) => r.createdAt || r.date ? new Date(r.createdAt || r.date).toLocaleDateString("en-IN") : "—" },
  { header: "Status", value: (r) => r.status || "—" }
];

export const myPastFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Travel Date", value: (r) => r.travelDate ? new Date(r.travelDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", value: () => "Completed" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myPastHotelsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Hotel", key: "hotelName" },
  { header: "Stay Period", value: (r) => {
      const ci = r.ci ? new Date(r.ci).toLocaleDateString("en-IN") : "—";
      const coDate = r.bookingSnapshot?.checkOutDate || r.checkOutDate;
      const co = coDate ? new Date(coDate).toLocaleDateString("en-IN") : "—";
      return `${ci} to ${co}`;
  }},
  { header: "Status", value: () => "Completed" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myPendingFlightsExportTemplate = [
  { header: "Request ID", key: "orderId" },
  { header: "Route / Details", value: (r) => `${r.route} | ${r.airlineName}` },
  { header: "Travel Date", value: (r) => r.travelDate ? new Date(r.travelDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "requestStatus" },
  { header: "Est. Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myPendingHotelsExportTemplate = [
  { header: "Request ID", key: "orderId" },
  { header: "Hotel", key: "hotelName" },
  { header: "Check-In Date", value: (r) => r.ci ? new Date(r.ci).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "requestStatus" },
  { header: "Est. Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Booked Date", value: (r) => r.bookedDate ? new Date(r.bookedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const myHotelsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Hotel", key: "hotelName" },
  { header: "City", key: "city" },
  { header: "Stay Dates", value: (r) => {
      const ci = r.bookingSnapshot?.checkInDate;
      const co = r.bookingSnapshot?.checkOutDate;
      const ciStr = ci ? new Date(ci).toLocaleDateString("en-IN") : "—";
      const coStr = co ? new Date(co).toLocaleDateString("en-IN") : "—";
      return `${ciStr} to ${coStr}`;
  }},
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.amount) }
];

export const adminUpcomingFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Departure Date", value: (r) => r.departureDate ? new Date(r.departureDate).toLocaleDateString("en-IN") : "—" },
  { header: "Email Identifier", key: "employeeEmail" },
  { header: "Status", key: "status" }
];

export const adminUpcomingHotelsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Asset Detail", key: "destination" },
  { header: "Duration", value: (r) => {
      const ci = r.departureDate ? new Date(r.departureDate).toLocaleDateString("en-IN") : "—";
      const co = r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "—";
      return `${ci} to ${co}`;
  }},
  { header: "Email Identifier", key: "employeeId" },
  { header: "Status", key: "status" }
];

export const adminCancelledFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "travellerName" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Recovery Status", value: (r) => r.cancelStatus ? r.cancelStatus : r.status },
  { header: "PNR Ref", key: "pnr" },
  { header: "Booking Amount", value: (r) => formatExportCurrency(r.refundAmount) }
];

export const adminCancelledHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "guestName" },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Asset Detail", value: (r) => r.hotelRequest?.selectedHotel?.hotelName || "—" },
  { header: "Recovery Status", value: (r) => r.cancelStatus ? r.cancelStatus : r.status },
  { header: "Booking Amount", value: (r) => formatExportCurrency(r.refundAmount) }
];

export const adminSsrPoliciesExportTemplate = [
  { header: "Employee Email", key: "employeeEmail" },
  { header: "Seat Allowed", value: (p) => p.allowSeat ? "Yes" : "No" },
  { header: "Seat Min", value: (p) => p.seatPriceRange?.min },
  { header: "Seat Max", value: (p) => p.seatPriceRange?.max },
  { header: "Meal Allowed", value: (p) => p.allowMeal ? "Yes" : "No" },
  { header: "Meal Min", value: (p) => p.mealPriceRange?.min },
  { header: "Meal Max", value: (p) => p.mealPriceRange?.max },
  { header: "Baggage Allowed", value: (p) => p.allowBaggage ? "Yes" : "No" },
  { header: "Baggage Min", value: (p) => p.baggagePriceRange?.min },
  { header: "Baggage Max", value: (p) => p.baggagePriceRange?.max },
  { header: "Approval Required", value: (p) => p.approvalRequired ? "Manual" : "Auto" }
];

export const adminSecondApproverFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Email", key: "employeeId" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", value: (r) => r.pnr || "—" },
  { header: "Amount", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminSecondApproverHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Email", key: "employeeId" },
  { header: "Asset Detail", key: "hotelName" },
  { header: "Booked Date", value: (r) => r.bookedDate ? new Date(r.bookedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminRejectedFlightsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Email", key: "employeeId" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Rejected Date", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Reason", key: "reason" },
  { header: "Cost", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminRejectedHotelsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Email", key: "employeeId" },
  { header: "Hotel", key: "hotelName" },
  { header: "Rejected Date", value: (r) => r.rejectedDate ? new Date(r.rejectedDate).toLocaleDateString("en-IN") : "—" },
  { header: "Reason", key: "reason" },
  { header: "Cost", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminReissueRequestsExportTemplate = [
  { header: "Request ID", value: (r) => r.requestId || r.id || r._id },
  { header: "PNR", value: (r) => r.pnr || "N/A" },
  { header: "Booking Ref", value: (r) => r.bookingReference || r.bookingRef || "N/A" },
  { header: "Employee", value: (r) => r.employee || (r.userId?.name ? `${r.userId.name.firstName} ${r.userId.name.lastName}`.trim() : "Employee") },
  { header: "Route", value: (r) => r.route || "N/A" },
  { header: "Type", value: (r) => r.reissueType || r.type || "REISSUE" },
  { header: "Reason", value: (r) => r.reason || r.remarks || "N/A" },
  { header: "Date", value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—" },
  { header: "Status", value: (r) => r.status || "—" }
];

export const adminEmployeeDirectoryExportTemplate = [
  { header: "Name", value: (e) => `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim() },
  { header: "Email", key: "email" },
  { header: "Role", key: "role" },
  { header: "Status", key: "status" },
  { header: "Department", key: "department" },
  { header: "Joined Date", key: "joinedDate" }
];

export const adminProjectRegistryExportTemplate = [
  { header: "ID Protocol", value: (p) => p.projectCodeId || p.code || "—" },
  { header: "Project Title", value: (p) => p.projectName || p.name || "Untitled" },
  { header: "Client Entity", value: (p) => p.clientName || p.client || "—" },
  { header: "Flight Bookings", value: (p) => p.flightBookings?.length || 0 },
  { header: "Hotel Bookings", value: (p) => p.hotelBookings?.length || 0 },
  { header: "Ingestion Date", value: (p) => new Date(p.createdAt || p.addedOn).toLocaleDateString("en-IN") }
];

export const adminProjectBookingsExportTemplate = [
  { header: "Booking Type", value: (b) => b.bookingType.toUpperCase() },
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", value: (b) => b.bookingType === "flight" ? b.travellerName : b.guestName },
  { header: "Deployment Info", value: (b) => b.bookingType === "flight" ? (b.routes?.map((l) => `${l.fromCode}→${l.toCode}`).join(" | ") || "—") : `${b.hotelName} (${b.city})` },
  { header: "Ingestion Date", value: (b) => new Date(b.bookedDate).toLocaleDateString("en-IN") },
  { header: "Status", key: "status" },
  { header: "Amount", value: (b) => formatExportCurrency(b.amount) }
];

export const adminPendingFlightRequestsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Route", value: (r) => r.routes?.map(l => `${l.fromCode}→${l.toCode}`).join(" | ") || "—" },
  { header: "Status", key: "status" },
  { header: "PNR Ref", key: "pnr" },
  { header: "Amount", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminPendingHotelRequestsExportTemplate = [
  { header: "Order Reference", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Hotel", key: "hotelName" },
  { header: "Booked Date", value: (r) => new Date(r.bookedDate).toLocaleDateString("en-IN") },
  { header: "Status", key: "status" },
  { header: "Amount", value: (r) => formatExportCurrency(r.estimatedCost) }
];

export const adminPastFlightTripsExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Route", value: (t) => t.routes?.map(r => `${r.fromCode}→${r.toCode}`).join(" | ") || "—" },
  { header: "Travel Date", value: (t) => new Date(t.departureDate).toLocaleDateString("en-IN") },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Status", key: "status" }
];

export const adminPastHotelStaysExportTemplate = [
  { header: "Order ID", key: "orderId" },
  { header: "Personnel", key: "employee" },
  { header: "Asset Detail", key: "destination" },
  { header: "Duration", value: (t) => `${new Date(t.departureDate).toLocaleDateString("en-IN")} — ${new Date(t.returnDate).toLocaleDateString("en-IN")}` },
  { header: "Email Identifier", key: "employeeId" },
  { header: "Status", key: "status" }
];

export const adminOfflineCancellationQueriesExportTemplate = [
  { header: "Query ID", value: (q) => `Q-${String(q.queryId || q._id).slice(-6).toUpperCase()}` },
  { header: "Travel Asset", key: "bookingReference" },
  { header: "Personnel", value: (q) => q.corporate?.employeeName || "—" },
  { header: "Email Identifier", value: (q) => q.corporate?.employeeEmail || "—" },
  { header: "Submission Time", value: (q) => new Date(q.requestedAt).toLocaleString("en-IN") },
  { header: "Protocol Status", key: "status" }
];

const getNameFromObj = (person) => {
  if (!person) return "";
  if (typeof person.name === "string") return person.name.trim();
  if (person.name?.firstName || person.name?.lastName) {
    return `${person.name.firstName || ""} ${person.name.lastName || ""}`.trim();
  }
  if (person.firstName || person.lastName) {
    return `${person.firstName || ""} ${person.lastName || ""}`.trim();
  }
  return "";
};

export const adminManagerRequestsExportTemplate = [
  { header: "Personnel", value: (r) => getNameFromObj(r.employeeId || r.employee) || r.employeeName || "Unknown" },
  { header: "Project Scope", value: (r) => r.projectName || "—" },
  { header: "Designated Approver", value: (r) => getNameFromObj(r.managerId || r.manager) || r.managerName || "Manager" },
  { header: "Requested On", value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—" },
  { header: "Status", key: "status" }
];
