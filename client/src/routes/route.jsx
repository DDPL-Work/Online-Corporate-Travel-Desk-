import React from "react";
import { Routes, Route } from "react-router-dom";
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

export default function AppRoutes() {
  return (
    <Routes>
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
    </Routes>
  );
}
