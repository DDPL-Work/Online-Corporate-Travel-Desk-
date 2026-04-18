import { createBrowserRouter } from "react-router-dom";

import Layout from "../layout/Layout";
import RootLayout from "../layout/RootLayout";
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
import FareUpsellPage from "../Pages/search-results/Flight-results/FareUpsellPage";
import HotelSearchResults from "../Pages/search-results/Hotel-results/Hotel-Search-Results";
import HotelDetailsPage from "../Pages/Booking-Flow/Hotel-Booking/HoteldetailsPage";
import LandingPage from "../Pages/Auth/Landign";
import HotelReviewBooking from "../Pages/Booking-Flow/Hotel-Booking/HotelReviewBooking";
import HotelBookNow from "../Pages/Booking-Flow/Hotel-Booking/HotelBooking";
import HotelBookingDetails from "../components/EmployeeDashboard/Hotelbookingdetails";
import CancelledFlightsPage from "../components/EmployeeDashboard/MyCancelledBookings";
import CancelledBookings from "../components/TravelAdminTabs/CancelledBookings";
import PromoteEmployee from "../components/TravelAdminTabs/PromoteEmployee";
import Independent from "../Pages/Landing/WhoIt'sFor/Independent";
import GrowingBusiness from "../Pages/Landing/WhoIt'sFor/GrowingBusiness";
import FlightBookingInfo from "../Pages/Landing/Platform/FlightBookingInfo";
import HotelBookingInfo from "../Pages/Landing/Platform/HotelBookingInfo";
import SmallBusiness from "../Pages/Landing/WhoIt'sFor/SmallBusiness";
import ProjectManagement from "../components/TravelAdminTabs/ProjectManagement";
import ProjectsTable from "../components/TravelAdminTabs/ProjectTable";
import ManagerRequestsPage from "../components/TravelAdminTabs/ManagerRequestsPage";
import PendingTravelRequestsForManager from "../components/CorporateManagerTabs/PendingTravelRequests";
import MyTeam from "../components/CorporateManagerTabs/MyTeam";
import ApprovedTravelRequestsForManager from "../components/CorporateManagerTabs/ApprovedTravelRequests";
import RejectedTravelRequestsForManager from "../components/CorporateManagerTabs/RejectedTravelRequests";
import PastTripsForManager from "../components/CorporateManagerTabs/PastTrips";
import BookingsDashboardForManager from "../components/CorporateManagerTabs/TotalBookings";
import CancelledBookingsForManager from "../components/CorporateManagerTabs/CancelledBookings";
import UpcomingTripsForManager from "../components/CorporateManagerTabs/UpcomingTrips";
import EmployeeManagement from "../components/TravelAdminTabs/EmployeeManagement";
import MidSizeBusiness from "../Pages/Landing/WhoIt'sFor/MidSizeBusiness";
import ApprovalWorkflow from "../Pages/Landing/Platform/ApprovalWorkflow";
import CompanyLandingPage from "../Pages/Landing/CompanySpecific/ComapanyLandignPage";
// import MidSizeLanding from "../Pages/Landing/WhoIt'sFor/MidSizeBusiness";

export const appRouter = createBrowserRouter([
  {
    element: <RootLayout />, // ✅ Root layout with PageTitleHandler
    children: [
      // PUBLIC ROUTES
      { path: "/iapindia", element: <LandingPage /> },
      {
        path: "/sso/callback",
        element: <SSOCallback />,
      },
      {
        path: "/unauthorized",
        element: <Unauthorized />,
      },

      // TRAVEL-ADMIN PROTECTED ROUTES
      {
        element: <ProtectedRoute allowedRoles={["travel-admin"]} />,
        children: [
          {
            path: "/",
            element: <Layout />,
            children: [
              { path: "/update-profile", element: <ProfileSettings /> },
              { path: "total-bookings", element: <BookingsDashboard /> },
              {
                path: "/total-cancelled-bookings",
                element: <CancelledBookings />,
              },
              { path: "/pending-requests", element: <PendingTravelRequests /> },
              {
                path: "/approved-requests",
                element: <ApprovedTravelRequests />,
              },
              {
                path: "/rejected-requests",
                element: <RejectedTravelRequests />,
              },
              { path: "/upcoming-trips", element: <UpcomingTrips /> },
              { path: "/past-trips", element: <PastTrips /> },
              { path: "/manager-management", element: <ManagerRequestsPage /> },
              { path: "/user-management", element: <EmployeeManagement /> },
              { path: "/project-management", element: <ProjectManagement /> },
              { path: "/projects-table", element: <ProjectsTable /> },
              {
                path: "/travel-profile-settings",
                element: <TravelAdminProfile />,
              },
              { path: "/corporate-wallet", element: <CorporateWallet /> },
              {
                path: "/credit-utilization",
                element: <CreditUtilizationPostpaid />,
              },
            ],
          },
        ],
      },

      // EMPLOYEE PROTECTED ROUTES
      {
        element: <ProtectedRoute allowedRoles={["employee"]} />,
        children: [
          {
            path: "/",
            element: <Layout />,
            children: [
              { path: "/my-bookings", element: <MyBookings /> },
              {
                path: "/my-cancelled-bookings",
                element: <CancelledFlightsPage />,
              },
              { path: "/my-bookings/:id", element: <BookingDetails /> },
              { path: "/my-upcoming-trips", element: <MyUpcomingTrips /> },
              { path: "/my-past-trips", element: <MyPastTrips /> },
              {
                path: "/my-pending-approvals",
                element: <MyPendingApprovals />,
              },
              {
                path: "/my-rejected-requests",
                element: <MyRejectedRequests />,
              },
              { path: "/my-profile", element: <MyProfile /> },
              { path: "/travel-documents", element: <TravelDocuments /> },
              { path: "/bookings/:id/book", element: <BookApprovedFlight /> },
              {
                path: "/my-hotel-booking/:id",
                element: <HotelBookingDetails />,
              },
            ],
          },
        ],
      },

      // CORPORATE MANAGER ROUTES
      {
        element: <ProtectedRoute allowedRoles={["manager"]} />,
        children: [
          {
            path: "/",
            element: <Layout />,
            children: [
              { path: "/manager/update-profile", element: <ProfileSettings /> },
              { path: "/manager/total-bookings", element: <BookingsDashboardForManager /> },
              {
                path: "/manager/total-cancelled-bookings",
                element: <CancelledBookingsForManager />,
              },
              { path: "/manager/pending-requests", element: <PendingTravelRequestsForManager /> },
              {
                path: "/manager/approved-requests",
                element: <ApprovedTravelRequestsForManager />,
              },
              {
                path: "/manager/rejected-requests",
                element: <RejectedTravelRequestsForManager />,
              },
              { path: "/manager/upcoming-trips", element: <UpcomingTripsForManager /> },
              { path: "/manager/past-trips", element: <PastTripsForManager /> },
              { path: "/manager/team-management", element: <MyTeam /> },
            ],
          },
        ],
      },

      // SHARED ROUTES
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
      { path: "/fare-upsell", element: <FareUpsellPage /> },
      { path: "/search-hotel", element: <HotelSearchPage /> },
      { path: "/search-hotel-results", element: <HotelSearchResults /> },
      { path: "/one-hotel-details", element: <HotelDetailsPage /> },
      { path: "/hotel-review-booking", element: <HotelReviewBooking /> },
      { path: "/hotel-review-booking/:id", element: <HotelReviewBooking /> },
      { path: "/hotel-booking/:id", element: <HotelBookNow /> },

      // DEFAULT ROUTES
      { path: "/who-it's-for/independent", element: <Independent /> },
      { path: "/who-it's-for/growing-business", element: <GrowingBusiness /> },
      { path: "/who-it's-for/small-business", element: <SmallBusiness /> },
      { path: "/who-it's-for/mid-size-business", element: <MidSizeBusiness /> },
      { path: "/platform/flight-booking-info", element: <FlightBookingInfo /> },
      { path: "/platform/hotel-booking-info", element: <HotelBookingInfo /> },
      { path: "/platform/approval-and-workflow", element: <ApprovalWorkflow /> },



      { path: "/company-landing-page", element: <CompanyLandingPage /> },
      {
        path: "*",
        element: <FlightBookingInfo />,
      },
    ],
  },
]);
