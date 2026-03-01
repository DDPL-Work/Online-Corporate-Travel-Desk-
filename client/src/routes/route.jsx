import { createBrowserRouter } from "react-router-dom";

import Layout from "../layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

// Auth Pages
import SSOLogin from "../Pages/Auth/SSOLogin";
import Unauthorized from "../Pages/Auth/Unauthorized";

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
import RoundTripFlightBooking from "../Pages/Booking-Flow/Flight-Booking/RoundTripFlightBooking";
import BookApprovedFlight from "../Pages/Booking-Flow/Flight-Booking/BookApprovedFlight";
import BookingDetails from "../components/EmployeeDashboard/BookingDetails";
import MultiCityFlightBooking from "../Pages/Booking-Flow/Flight-Booking/MultiWayFlightBooking";
import HotelSearchResults from "../Pages/search-results/Hotel-results/Hotel-Search-Results";
import HotelDetailsPage from "../Pages/Booking-Flow/Hotel-Booking/HoteldetailsPage";
import LandingPage from "../Pages/Auth/Landign";
import CorporateSuperAdminDashboard from "../components/CorporateSuperAdmin/CorporateSuperAdminDashboard";
import TravelAdminManagement from "../components/CorporateSuperAdmin/TravelAdminManagement";
import CorporateTotalBookings from "../components/CorporateSuperAdmin/TotalBookings";
import EmployeeManagement from "../components/CorporateSuperAdmin/EmployeeManagement";

export const appRouter = createBrowserRouter([
  // -------------------------------
  // PUBLIC ROUTES
  // -------------------------------
  // {
  //   path: "/sso-login",
  //   element: <SSOLogin />,
  // },
  { path: "/landing", element: <LandingPage /> },
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
          { path: "/update-profile", element: <ProfileSettings /> },
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
          { path: "/my-bookings/:id", element: <BookingDetails /> },
          { path: "/my-upcoming-trips", element: <MyUpcomingTrips /> },
          { path: "/my-past-trips", element: <MyPastTrips /> },
          { path: "/my-pending-approvals", element: <MyPendingApprovals /> },
          { path: "/my-rejected-requests", element: <MyRejectedRequests /> },
          { path: "/my-profile", element: <MyProfile /> },
          { path: "/travel-documents", element: <TravelDocuments /> },
          { path: "/bookings/:id/book", element: <BookApprovedFlight /> },
        ],
      },
    ],
    
  },

  // -------------------------------
  // CORPORATE SUPER ADMIN ROUTES
  // -------------------------------
  {
    element: <ProtectedRoute allowedRoles={["corporate-super-admin"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          {
            path: "/corporate-dashboard",
            element: <CorporateSuperAdminDashboard />,
          },
          {
            path: "/admin-management",
            element: <TravelAdminManagement />,
          },
          {
            path: "/employee-management",
            element: <EmployeeManagement />,
          },
          {
            path: "/corporate-total-bookings",
            element: <CorporateTotalBookings />,
          },
        ],
      },
    ],
  },

  //SHARED ROUTES

  { path: "/landing", element: <LandingPage /> },
  { path: "/search-flight", element: <FlightSearch /> },
  { path: "/search-flight-results", element: <FlightSearchResults /> },
  { path: "/one-way-flight/booking", element: <OneFlightBooking /> },
  {
    path: "/round-trip-flight/booking",
    element: <RoundTripFlightBooking />,
  },
  {
    path: "/multi-city-flight/booking",
    element: <MultiCityFlightBooking />,
  },
  { path: "/search-hotel", element: <HotelSearchPage /> },
  { path: "/search-hotel-results", element: <HotelSearchResults /> },
  { path: "/one-hotel-details", element: <HotelDetailsPage /> },

  // DEFAULT REDIRECT
  {
    path: "*",
    // element: <SSOLogin />,
    element: <LandingPage />,
  },
]);
