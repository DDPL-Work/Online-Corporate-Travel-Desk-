import { createBrowserRouter } from "react-router-dom";

import Layout from "../layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

// Auth Pages
import Login from "../Pages/Auth/Login";
import SSOLogin from "../Pages/Auth/SSOLogin";
import Unauthorized from "../Pages/Auth/Unauthorized";

// SuperAdmin Pages
// import Dashboard from "../pages/Dashboard/Dashboard";
// import EditProfile from "../pages/Auth/EditProfile";
// import ViewAdminUsers from "../components/SuperAdmin/AdminUser/ViewAdminUsers";
// import CreateAdminUser from "../components/SuperAdmin/AdminUser/CreateAdminUser";
// import UpdateAdminUser from "../components/SuperAdmin/AdminUser/UpdateAdminUser";

// Pricing
// import { ViewPricingConfig } from "../pages/SuperAdmin/PricingConfig/ViewPricingConfig";
// import { CreatePricingConfig } from "../pages/SuperAdmin/PricingConfig/CreatePricingConfig";
// import { UpdatePricingConfig } from "../pages/SuperAdmin/PricingConfig/UpdatePricingConfig";

// Travel Admin
import BookingsDashboard from "../components/TravelAdminTabs/TotalBookings";
import PendingTravelRequests from "../components/TravelAdminTabs/PendingTravelRequests";
import ApprovedTravelRequests from "../components/TravelAdminTabs/ApprovedTravelRequests";
import RejectedTravelRequests from "../components/TravelAdminTabs/RejectedTravelRequests";
import UpcomingTrips from "../components/TravelAdminTabs/UpcomingTrips";
import PastTrips from "../components/TravelAdminTabs/PastTrips";
import UserManagement from "../components/TravelAdminTabs/UserManagement";
import TravelAdminProfile from "../components/TravelAdminTabs/TravelAdminProfile";
import CreditUtilizationPostpaid from "../components/TravelAdminTabs/CreditUtilizationPostpaid";
import CorporateWallet from "../components/TravelAdminTabs/CorporateWalletStatusPrepaid";

// Travel Company
import OnboardedCorporates from "../components/SuperAdminTabs/OnboardedCorporates";
import BookingsSummary from "../components/SuperAdminTabs/BookingsSummary";
import CorporateRevenue from "../components/SuperAdminTabs/CorporateRevenue";
import CreditStatusAlerts from "../components/SuperAdminTabs/CreditStatusAlerts";
import WalletRechargeLogs from "../components/SuperAdminTabs/WalletRechargeLogs";
import CorporateAccessControl from "../components/SuperAdminTabs/CorporateAccessControl";
import PendingAmendments from "../components/SuperAdminTabs/PendingAmendments";
import CommissionSettings from "../components/SuperAdminTabs/CommissionSettings";
import ApiConfigurations from "../components/SuperAdminTabs/ApiConfigurations";
import SystemLogs from "../components/SuperAdminTabs/SystemLogs";

// Employee
import MyBookings from "../components/EmployeeDashboard/MyBookings";
import MyUpcomingTrips from "../components/EmployeeDashboard/MyUpcomingTrips";
import MyPastTrips from "../components/EmployeeDashboard/MyPastTrips";
import MyPendingApprovals from "../components/EmployeeDashboard/MyPendingApprovals";
import MyRejectedRequests from "../components/EmployeeDashboard/MyRejectedRequests";
import MyProfile from "../components/EmployeeDashboard/MyProfile";
import TravelDocuments from "../components/EmployeeDashboard/TravelDocuments";
import ProfileSettings from "../Pages/Auth/ProfileSettings";
import SSOCallback from "../Pages/Auth/SSOCallback";
import FlightSearch from "../Pages/EmployeeDashboard/FlightSearch";
import HotelSearchPage from "../Pages/EmployeeDashboard/HotelSearch";
import FlightSearchResults from "../Pages/search-results/Flight-results/FlightSearchResults";
import OneFlightBooking from "../Pages/Booking-Flow/Flight-Booking/OneFlightBooking";

export const appRouter = createBrowserRouter([
  // -------------------------------
  // PUBLIC ROUTES
  // -------------------------------
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/sso-login",
    element: <SSOLogin />,
  },
  {
    path: "/sso/callback",
    element: <SSOCallback />, // ✅ REQUIRED
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // -------------------------------
  // TRAVEL-ADMIN PROTECTED ROUTES
  // -------------------------------
  {
    element: <ProtectedRoute allowedRoles={["travel-admin"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          // { path: "/superadmin-dashboard", element: <Dashboard /> },
          { path: "/update-profile", element: <ProfileSettings /> },

          // Admin users
          // { path: "/admins", element: <ViewAdminUsers /> },
          // { path: "/create-new-admin", element: <CreateAdminUser /> },
          // { path: "/update-admin", element: <UpdateAdminUser /> },

          // Pricing
          // { path: "/pricing-config", element: <ViewPricingConfig /> },
          // { path: "/add-pricing-config", element: <CreatePricingConfig /> },
          // { path: "/update-pricing-config", element: <UpdatePricingConfig /> },

          // Travel Admin Dashboard
          { path: "total-bookings", element: <BookingsDashboard /> },
          { path: "/pending-requests", element: <PendingTravelRequests /> },
          { path: "/approved-requests", element: <ApprovedTravelRequests /> },
          { path: "/rejected-requests", element: <RejectedTravelRequests /> },
          { path: "/upcoming-trips", element: <UpcomingTrips /> },
          { path: "/past-trips", element: <PastTrips /> },
          { path: "/user-management", element: <UserManagement /> },
          { path: "/travel-profile-settings", element: <TravelAdminProfile /> },
          { path: "/corporate-wallet", element: <CorporateWallet /> },
          {
            path: "/credit-utilization",
            element: <CreditUtilizationPostpaid />,
          },
        ],
      },
    ],
  },

  // -------------------------------
  // SUPER ADMIN PROTECTED ROUTES
  // -------------------------------
  {
    element: <ProtectedRoute allowedRoles={["super-admin"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { path: "/onboarded-corporates", element: <OnboardedCorporates /> },
          { path: "/bookings-summary", element: <BookingsSummary /> },
          { path: "/corporate-revenue", element: <CorporateRevenue /> },
          { path: "/credit-status", element: <CreditStatusAlerts /> },
          { path: "/wallet-recharge-logs", element: <WalletRechargeLogs /> },
          { path: "/corporate-access", element: <CorporateAccessControl /> },
          { path: "/pending-amendments", element: <PendingAmendments /> },
          { path: "/commission-settings", element: <CommissionSettings /> },
          { path: "/api-configurations", element: <ApiConfigurations /> },
          { path: "/system-logs", element: <SystemLogs /> },
        ],
      },
    ],
  },

  // -------------------------------
  // EMPLOYEE PROTECTED ROUTES
  // -------------------------------
  {
    element: <ProtectedRoute allowedRoles={["employee"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { path: "/my-bookings", element: <MyBookings /> },
          { path: "/my-upcoming-trips", element: <MyUpcomingTrips /> },
          { path: "/my-past-trips", element: <MyPastTrips /> },
          { path: "/my-pending-approvals", element: <MyPendingApprovals /> },
          { path: "/my-rejected-requests", element: <MyRejectedRequests /> },
          { path: "/my-profile", element: <MyProfile /> },
          { path: "/travel-documents", element: <TravelDocuments /> },
        ],
      },
      { path: "/search-flight", element: <FlightSearch /> },
      { path: "/search-hotel", element: <HotelSearchPage /> },
      { path: "/search-flight-results", element: <FlightSearchResults /> },
      { path: "/one-way-flight/booking", element: <OneFlightBooking /> },
    ],
  },

  // DEFAULT REDIRECT
  {
    path: "*",
    element: <Login />,
  },
]);
