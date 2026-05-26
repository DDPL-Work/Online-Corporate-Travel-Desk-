import {
  formatExportBoolean,
  formatExportCurrency,
  formatExportDate,
  formatExportDateTime,
  valueOrNA,
} from "../../utils/export/csvExport";

const percent = (value) => `${Number(value || 0).toFixed(2)}%`;

const normalizeStatus = (value) =>
  valueOrNA(String(value || "").replace(/_/g, " ").trim() || null);

const maskApiKey = (value) => {
  if (!value) return "N/A";
  const text = String(value);
  return `${text.slice(0, 12)}****`;
};

const firstSector = (query = {}) => query.bookingSnapshot?.sectors?.[0] || {};

export const onboardedCorporatesExportTemplate = [
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporateName) },
  { header: "SSO Domain", value: (row) => valueOrNA(row.ssoConfig?.domain) },
  { header: "Primary Contact", value: (row) => valueOrNA(row.primaryContact?.name) },
  { header: "Primary Email", value: (row) => valueOrNA(row.primaryContact?.email) },
  { header: "Classification", value: (row) => valueOrNA(row.classification) },
  { header: "Current Credit", value: (row) => formatExportCurrency(row.currentCredit) },
  { header: "Credit Limit", value: (row) => formatExportCurrency(row.creditLimit) },
  { header: "Wallet Balance", value: (row) => formatExportCurrency(row.walletBalance) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
];

export const pendingCorporatesExportTemplate = [
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporateName) },
  { header: "Primary Contact", value: (row) => valueOrNA(row.primaryContact?.name) },
  { header: "Primary Email", value: (row) => valueOrNA(row.primaryContact?.email) },
  { header: "Classification", value: (row) => valueOrNA(row.classification) },
  { header: "Wallet Balance", value: (row) => formatExportCurrency(row.walletBalance) },
  { header: "Current Credit", value: (row) => formatExportCurrency(row.currentCredit) },
  { header: "Credit Limit", value: (row) => formatExportCurrency(row.creditLimit) },
  { header: "SSO Domain", value: (row) => valueOrNA(row.ssoConfig?.domain) },
  { header: "Status", value: (row) => normalizeStatus(row.status || "pending") },
];

export const corporateAccessExportTemplate = [
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporateName) },
  { header: "Primary Contact", value: (row) => valueOrNA(row.primaryContact?.name) },
  { header: "Primary Email", value: (row) => valueOrNA(row.primaryContact?.email) },
  { header: "Classification", value: (row) => valueOrNA(row.classification) },
  { header: "Wallet Balance", value: (row) => formatExportCurrency(row.walletBalance) },
  { header: "Current Credit", value: (row) => formatExportCurrency(row.currentCredit) },
  { header: "Credit Limit", value: (row) => formatExportCurrency(row.creditLimit) },
  { header: "SSO Domain", value: (row) => valueOrNA(row.ssoConfig?.domain) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
];

export const flightBookingsExportTemplate = [
  { header: "Order ID", value: (row) => valueOrNA(row.orderId) },
  { header: "Payment ID", value: (row) => valueOrNA(row.paymentId) },
  { header: "Booked Date", value: (row) => formatExportDateTime(row.bookedDate) },
  { header: "Booking Reference", value: (row) => valueOrNA(row.bookingRef) },
  { header: "Corporate Account", value: (row) => valueOrNA(row.corporate) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corpId) },
  { header: "Traveller Name", value: (row) => valueOrNA(row.employee) },
  { header: "Traveller ID", value: (row) => valueOrNA(row.empId) },
  { header: "Travel Date", value: (row) => formatExportDate(row.date) },
  { header: "PNR", value: (row) => valueOrNA(row.pnr) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
  { header: "Refund Status", value: (row) => normalizeStatus(row.refundStatus) },
  { header: "Airline", value: (row) => valueOrNA(row.airline) },
  { header: "Route", value: (row) => valueOrNA(row.destination) },
];

export const hotelBookingsExportTemplate = [
  { header: "Order ID", value: (row) => valueOrNA(row.orderId) },
  { header: "Payment ID", value: (row) => valueOrNA(row.paymentId) },
  { header: "Booked Date", value: (row) => formatExportDateTime(row.bookedDate) },
  { header: "Booking Reference", value: (row) => valueOrNA(row.bookingRef) },
  { header: "Corporate Account", value: (row) => valueOrNA(row.corporate) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corpId) },
  { header: "Guest Name", value: (row) => valueOrNA(row.employee) },
  { header: "Guest ID", value: (row) => valueOrNA(row.empId) },
  { header: "Check-In", value: (row) => formatExportDate(row.checkIn) },
  { header: "Check-Out", value: (row) => formatExportDate(row.checkOut) },
  { header: "Amount", value: (row) => formatExportCurrency(row.amount) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
  { header: "Refund Status", value: (row) => normalizeStatus(row.refundStatus) },
  { header: "Hotel", value: (row) => valueOrNA(row.destination) },
  { header: "Room Type", value: (row) => valueOrNA(row.roomType) },
];

export const cancelledBookingsExportTemplate = [
  { header: "Service Type", value: (row) => valueOrNA(row.type) },
  { header: "Service", value: (row) => valueOrNA(row.service) },
  { header: "Booking Reference", value: (row) => valueOrNA(row.bookingRef) },
  { header: "Corporate", value: (row) => valueOrNA(row.corporate) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corpId) },
  { header: "Traveller", value: (row) => valueOrNA(row.employee) },
  { header: "Traveller ID", value: (row) => valueOrNA(row.empId) },
  { header: "Cancelled On", value: (row) => formatExportDate(row.cancelDate) },
  { header: "Travel Date", value: (row) => formatExportDate(row.date) },
  { header: "Refund Status", value: (row) => normalizeStatus(row.refundStatus) },
  { header: "Amendment Type", value: (row) => valueOrNA(row.amendmentType) },
  { header: "Amendment Status", value: (row) => normalizeStatus(row.amendmentStatus) },
  { header: "Change Request ID", value: (row) => valueOrNA(row.changeRequestId) },
  { header: "Value", value: (row) => formatExportCurrency(row.amount) },
];

const peopleForExport = (row = {}) =>
  Array.isArray(row.people)
    ? row.people.map((person) => `${person.name || "N/A"} <${person.email || "N/A"}>`).join(" | ")
    : "N/A";

export const flightCancellationSummaryExportTemplate = [
  { header: "Order ID", value: (row) => valueOrNA(row.orderId) },
  { header: "Change Request ID", value: (row) => valueOrNA(row.cancellationRequestId) },
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporate) },
  { header: "Traveller Name with Mail ID", value: peopleForExport },
  { header: "Route", value: (row) => valueOrNA(row.route) },
  { header: "Airline", value: (row) => valueOrNA(row.airlineName || row.airlineCode) },
  { header: "Booked Date", value: (row) => formatExportDateTime(row.bookedDate) },
  { header: "Travel Date", value: (row) => formatExportDate(row.travelDate) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
];

export const hotelCancellationSummaryExportTemplate = [
  { header: "Order ID", value: (row) => valueOrNA(row.orderId) },
  { header: "Change Request ID", value: (row) => valueOrNA(row.cancellationRequestId) },
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporate) },
  { header: "Guest Name with Mail ID", value: peopleForExport },
  { header: "Hotel Name", value: (row) => valueOrNA(row.hotelName) },
  { header: "City", value: (row) => valueOrNA(row.city) },
  { header: "Booked Date", value: (row) => formatExportDateTime(row.bookedDate) },
  { header: "Stay Date", value: (row) => `${formatExportDate(row.checkIn)} -> ${formatExportDate(row.checkOut)}` },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
];

export const flightCancellationQueriesExportTemplate = [
  { header: "Query ID", value: (row) => valueOrNA(row.queryId || row._id) },
  { header: "Corporate", value: (row) => valueOrNA(row.corporate?.companyName) },
  { header: "Employee Email", value: (row) => valueOrNA(row.user?.email) },
  { header: "Airline", value: (row) => valueOrNA(firstSector(row).airline) },
  { header: "Flight Number", value: (row) => valueOrNA(firstSector(row).flightNumber) },
  { header: "PNR", value: (row) => valueOrNA(row.bookingSnapshot?.pnr) },
  { header: "Travel Date", value: (row) => formatExportDate(firstSector(row).departureTime) },
  { header: "Total Fare", value: (row) => formatExportCurrency(row.bookingSnapshot?.totalFare) },
  { header: "Priority", value: (row) => normalizeStatus(row.priority || "MEDIUM") },
  { header: "Status", value: (row) => normalizeStatus(row.status || "OPEN") },
  { header: "Requested On", value: (row) => formatExportDate(row.requestedAt) },
];

export const hotelCancellationQueriesExportTemplate = [
  { header: "Query ID", value: (row) => valueOrNA(row.queryId || row._id) },
  { header: "Corporate", value: (row) => valueOrNA(row.corporate?.companyName) },
  { header: "Employee", value: (row) => valueOrNA(row.corporate?.employeeName) },
  { header: "Employee Email", value: (row) => valueOrNA(row.corporate?.employeeEmail) },
  { header: "Hotel Name", value: (row) => valueOrNA(row.bookingSnapshot?.hotelName) },
  { header: "Check-In", value: (row) => formatExportDate(row.bookingSnapshot?.checkInDate) },
  { header: "Check-Out", value: (row) => formatExportDate(row.bookingSnapshot?.checkOutDate) },
  { header: "Room Type", value: (row) => valueOrNA(row.bookingSnapshot?.roomType) },
  { header: "Total Fare", value: (row) => formatExportCurrency(row.bookingSnapshot?.totalFare) },
  { header: "Priority", value: (row) => normalizeStatus(row.priority || "MEDIUM") },
  { header: "Status", value: (row) => normalizeStatus(row.status || "OPEN") },
  { header: "Requested On", value: (row) => formatExportDate(row.requestedAt) },
  { header: "Remarks", value: (row) => valueOrNA(row.remarks) },
];

export const reissueRequestsExportTemplate = [
  { header: "Request ID", value: (row) => valueOrNA(row.requestId) },
  { header: "Booking ID", value: (row) => valueOrNA(row.bookingId) },
  { header: "Passenger Name", value: (row) => valueOrNA(row.metadata?.employeeName) },
  { header: "Passenger Email", value: (row) => valueOrNA(row.metadata?.employeeEmail) },
  { header: "Preferred Journey", value: (row) => valueOrNA(row.exportJourneyLabel) },
  { header: "Airline", value: (row) => valueOrNA(row.selectedFlight?.airlineCode || row.preferredJourney?.airlineCode || row.airline) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
  { header: "Assigned Agent", value: (row) => valueOrNA(row.assignedTo?.name) },
  { header: "Assigned At", value: (row) => formatExportDateTime(row.assignedAt) },
  { header: "SLA Status", value: (row) => (row.overdue ? "Overdue" : row.breached ? "Breached" : "On Track") },
  { header: "SLA Deadline", value: (row) => formatExportDateTime(row.slaDeadline) },
  { header: "Ticket Status", value: (row) => (row.generatedTicketUrl || row.revisedTicketUrl ? "Ready to download" : "Awaiting generation") },
  { header: "Updated At", value: (row) => formatExportDateTime(row.updatedAt) },
];

export const corporateRevenueLeaderboardExportTemplate = [
  { header: "Rank", value: (row) => valueOrNA(row.exportRank) },
  { header: "Company", value: (row) => valueOrNA(row.companyName) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corporateId) },
  { header: "Account Type", value: (row) => valueOrNA(row.accountType) },
  { header: "Total Bookings", value: (row) => valueOrNA(row.bookings) },
  { header: "Flight Revenue", value: (row) => formatExportCurrency(row.flightRev) },
  { header: "Hotel Revenue", value: (row) => formatExportCurrency(row.hotelRev) },
  { header: "Total Revenue", value: (row) => formatExportCurrency(row.revenue) },
  { header: "Contribution", value: (row) => percent(row.contribution) },
];

export const corporateRevenueTransactionsExportTemplate = [
  { header: "Date", value: (row) => formatExportDate(row.date) },
  { header: "Reference", value: (row) => valueOrNA(row.reference) },
  { header: "Employee", value: (row) => valueOrNA(row.employee) },
  { header: "Category", value: (row) => valueOrNA(row.type) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
  { header: "Amount", value: (row) => formatExportCurrency(row.amount) },
];

export const creditAlertsExportTemplate = [
  { header: "Corporate Name", value: (row) => valueOrNA(row.corporateName) },
  { header: "Reference ID", value: (row) => valueOrNA(row._id) },
  { header: "Billing Cycle", value: (row) => valueOrNA(row.billingCycle || "30days") },
  { header: "Classification", value: (row) => valueOrNA(row.classification) },
  { header: "Approved Limit", value: (row) => formatExportCurrency(row.creditLimit) },
  { header: "Current Credit", value: (row) => formatExportCurrency(row.currentCredit) },
  { header: "Period Credit Usage", value: (row) => formatExportCurrency(row.usageInPeriod) },
  { header: "Utilization", value: (row) => percent(row.utilization) },
  { header: "Available Line", value: (row) => formatExportCurrency((row.creditLimit || 0) - (row.currentCredit || 0)) },
  { header: "Risk Status", value: (row) => valueOrNA(row.status) },
];

export const creditStatementsExportTemplate = [
  { header: "Row", value: (row) => valueOrNA(row.rowNum) },
  { header: "Statement ID", value: (row) => valueOrNA(row.statementId) },
  { header: "Period Start", value: (row) => formatExportDate(row.periodStart) },
  { header: "Period End", value: (row) => formatExportDate(row.periodEnd) },
  { header: "Statement Date", value: (row) => formatExportDate(row.statementDate) },
  { header: "Due Date", value: (row) => formatExportDate(row.dueDate) },
  { header: "Payment Received", value: (row) => (row.isCurrent ? "N/A" : formatExportDate(row.paymentReceivedAt)) },
  { header: "Delay Days", value: (row) => valueOrNA(row.delayDays) },
  { header: "Amount", value: (row) => formatExportCurrency(row.statementAmount) },
  { header: "Received", value: (row) => (row.isCurrent ? "N/A" : formatExportCurrency(row.receivedAmount)) },
  { header: "Current Cycle", value: (row) => formatExportBoolean(row.isCurrent) },
];

export const creditTransactionsExportTemplate = [
  { header: "Transaction ID", value: (row) => valueOrNA(row._id) },
  { header: "Payment ID", value: (row) => valueOrNA(row.paymentId) },
  { header: "Doc Type", value: (row) => (row.type === "booking" ? "Sales Invoice" : valueOrNA(row.type)) },
  { header: "Invoice Date", value: (row) => formatExportDate(row.bookingDate || row.createdAt) },
  { header: "Product Type", value: (row) => valueOrNA(row.metadata?.bookingType || row.metadata?.productType || (row.type === "booking" ? "Air - Domestic" : null)) },
  { header: "Booking Date", value: (row) => formatExportDate(row.travelDate || row.bookingDate) },
  { header: "Booking Ref", value: (row) => valueOrNA(row.bookingReference || row.paymentReference) },
  { header: "Txn Type", value: (row) => normalizeStatus(row.transactionType || (row.type === "booking" ? "debit" : "credit")) },
  { header: "Amount", value: (row) => formatExportCurrency(row.amount) },
  { header: "Status", value: (row) => normalizeStatus(row.status) },
];

export const walletRechargeLogsExportTemplate = [
  { header: "Date", value: (row) => valueOrNA(row.date) },
  { header: "Corporate", value: (row) => valueOrNA(row.corporateName) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corporateId) },
  { header: "Amount", value: (row) => formatExportCurrency(row.amount) },
  { header: "Method", value: (row) => valueOrNA(row.method) },
  { header: "Order ID", value: (row) => valueOrNA(row.orderId) },
  { header: "Payment ID", value: (row) => valueOrNA(row.paymentId) },
  { header: "Status", value: (row) => valueOrNA(row.status) },
];

export const pendingAmendmentsExportTemplate = [
  { header: "Change Request ID", value: (row) => valueOrNA(row.changeRequestId || `CR-${row.id}`) },
  { header: "Booking ID", value: (row) => valueOrNA(row.bookingId || row.id) },
  { header: "Type", value: (row) => valueOrNA(row.type) },
  { header: "Request Date", value: (row) => formatExportDate(row.requestDate || row.date) },
  { header: "Corporate", value: (row) => valueOrNA(row.company) },
  { header: "Corporate ID", value: (row) => valueOrNA(row.corporateId) },
  { header: "Traveller / Guest", value: (row) => valueOrNA(row.employee) },
  { header: "Employee ID", value: (row) => valueOrNA(row.employeeId) },
  { header: "Remark", value: (row) => valueOrNA(row.details) },
  { header: "Status", value: (row) => valueOrNA(row.status) },
];

export const apiConfigurationsExportTemplate = [
  { header: "API Name", value: (row) => valueOrNA(row.name) },
  { header: "Type", value: (row) => valueOrNA(row.type) },
  { header: "API Key", value: (row) => maskApiKey(row.apiKey) },
  { header: "Status", value: (row) => valueOrNA(row.status) },
];

export const opsTeamExportTemplate = [
  { header: "Name", value: (row) => valueOrNA(row.name) },
  { header: "Email", value: (row) => valueOrNA(row.email) },
  { header: "Phone", value: (row) => valueOrNA(row.phone) },
  { header: "Designation", value: (row) => valueOrNA(row.exportDesignation) },
  { header: "Department", value: (row) => valueOrNA(row.exportDepartment) },
  { header: "Servicing Scope", value: (row) => valueOrNA(row.exportServicingScope) },
  { header: "Status", value: (row) => valueOrNA(row.status) },
  { header: "Joined Date", value: (row) => formatExportDate(row.createdAt) },
];

export const commissionSettingsExportTemplate = [
  { header: "Corporate", value: (row) => valueOrNA(row.company) },
  { header: "Type", value: (row) => valueOrNA(row.type) },
  { header: "Commission", value: (row) => `${Number(row.commission || 0)}%` },
  { header: "Status", value: (row) => valueOrNA(row.status) },
];

export const systemLogsExportTemplate = [
  { header: "Date", value: (row) => formatExportDate(row.date) },
  { header: "User", value: (row) => valueOrNA(row.user) },
  { header: "Type", value: (row) => valueOrNA(row.type) },
  { header: "Message", value: (row) => valueOrNA(row.message) },
  { header: "Today", value: (row) => formatExportBoolean(row.isToday) },
];

export const blogArticlesExportTemplate = [
  { header: "Title", value: (row) => valueOrNA(row.title) },
  { header: "Author", value: (row) => valueOrNA(row.author) },
  { header: "Status", value: (row) => valueOrNA(row.status) },
  { header: "Created At", value: (row) => formatExportDate(row.created_at) },
  { header: "Updated At", value: (row) => formatExportDate(row.updated_at) },
  { header: "Views", value: (row) => valueOrNA(row.view_count || 0) },
  { header: "Slug", value: (row) => valueOrNA(row.slug) },
  { header: "Summary", value: (row) => valueOrNA(row.meta_description || row.excerpt || row.summary) },
];
