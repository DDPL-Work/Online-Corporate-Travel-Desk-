import React from "react";
import { Routes, Route } from "react-router-dom";

// Travel Admin Components
import BookingsDashboard from "../components/TravelAdminTabs/TotalBookings";
import PendingTravelRequests from "../components/TravelAdminTabs/PendingTravelRequests";
import ApprovedTravelRequests from "../components/TravelAdminTabs/ApprovedTravelRequests";
import RejectedTravelRequests from "../components/TravelAdminTabs/RejectedTravelRequests";
import UpcomingTrips from "../components/TravelAdminTabs/UpcomingTrips";
import PastTrips from "../components/TravelAdminTabs/PastTrips";
import UserManagement from "../components/TravelAdminTabs/UserManagement";
import ProfileSettings from "../components/TravelAdminTabs/ProfileSettings";
import CreditUtilizationPostpaid from "../components/TravelAdminTabs/CreditUtilizationPostpaid";
import CorporateWallet from "../components/TravelAdminTabs/CorporateWalletStatusPrepaid";

// Travel Company Components
import OnboardedCorporates from "../components/TravelCompanyTabs/OnboardedCorporates";
import BookingsSummary from "../components/TravelCompanyTabs/BookingsSummary";
import CorporateRevenue from "../components/TravelCompanyTabs/CorporateRevenue";
import CreditStatusAlerts from "../components/TravelCompanyTabs/CreditStatusAlerts";
import WalletRechargeLogs from "../components/TravelCompanyTabs/WalletRechargeLogs";
import CorporateAccessControl from "../components/TravelCompanyTabs/CorporateAccessControl";
import PendingAmendments from "../components/TravelCompanyTabs/PendingAmendments";
import CommissionSettings from "../components/TravelCompanyTabs/CommissionSettings";
import ApiConfigurations from "../components/TravelCompanyTabs/ApiConfigurations";
import SystemLogs from "../components/TravelCompanyTabs/SystemLogs";

// Employee Components
import MyBookings from "../components/EmployeeDashboard/MyBookings";
import MyUpcomingTrips from "../components/EmployeeDashboard/MyUpcomingTrips";
import MyPastTrips from "../components/EmployeeDashboard/MyPastTrips";
import MyPendingApprovals from "../components/EmployeeDashboard/MyPendingApprovals";
import MyRejectedRequests from "../components/EmployeeDashboard/MyRejectedRequests";
import MyProfile from "../components/EmployeeDashboard/MyProfile";
import TravelDocuments from "../components/EmployeeDashboard/TravelDocuments";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Travel Admin Routes */}
      <Route index path="/total-bookings" element={<BookingsDashboard />} />
      <Route path="/pending-requests" element={<PendingTravelRequests />} />
      <Route path="/approved-requests" element={<ApprovedTravelRequests />} />
      <Route path="/rejected-requests" element={<RejectedTravelRequests />} />
      <Route path="/upcoming-trips" element={<UpcomingTrips />} />
      <Route path="/past-trips" element={<PastTrips />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="/profile-settings" element={<ProfileSettings />} />
      <Route path="/corporate-wallet" element={<CorporateWallet />} />
      <Route
        path="/credit-utilization"
        element={<CreditUtilizationPostpaid />}
      />

      {/* Travel Company Routes */}
      <Route path="/onboarded-corporates" element={<OnboardedCorporates />} />
      <Route path="/bookings-summary" element={<BookingsSummary />} />
      <Route path="/corporate-revenue" element={<CorporateRevenue />} />
      <Route path="/credit-status" element={<CreditStatusAlerts />} />
      <Route path="/wallet-recharge-logs" element={<WalletRechargeLogs />} />
      <Route path="/corporate-access" element={<CorporateAccessControl />} />
      <Route path="/pending-amendments" element={<PendingAmendments />} />
      <Route path="/commission-settings" element={<CommissionSettings />} />
      <Route path="/api-configurations" element={<ApiConfigurations />} />
      <Route path="/system-logs" element={<SystemLogs />} />

      {/* Employee Routes */}
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/my-upcoming-trips" element={<MyUpcomingTrips />} />
      <Route path="/my-past-trips" element={<MyPastTrips />} />
      <Route path="/my-pending-approvals" element={<MyPendingApprovals />} />
      <Route path="/my-rejected-requests" element={<MyRejectedRequests />} />
      <Route path="/my-profile" element={<MyProfile />} />
      <Route path="/travel-documents" element={<TravelDocuments />} />

      {/* Default Route */}
      <Route path="/" element={<BookingsDashboard />} />
    </Routes>
  );
}