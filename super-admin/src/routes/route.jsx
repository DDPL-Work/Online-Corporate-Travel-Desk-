import { createBrowserRouter, Navigate } from "react-router-dom";

import Layout from "../layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

// Auth Pages
import Login from "../Pages/Auth/Login";
import Unauthorized from "../Pages/Auth/Unauthorized";

// Travel Company
import OnboardedCorporates from "../components/SuperAdminTabs/OnboardedCorporates";
import MarkupEngine from "../components/SuperAdminTabs/MarkupEngine";
import ServiceFeeManagement from "../components/SuperAdminTabs/ServiceFeeManagement";
import FinancialApprovalPage from "../components/SuperAdminTabs/FinancialApprovalPage";
import CorporateMarkupConfiguration from "../components/SuperAdminTabs/CorporateMarkupConfiguration";
import CorporateMarkupList from "../components/SuperAdminTabs/CorporateMarkupList";
import BookingsSummary from "../components/SuperAdminTabs/BookingsSummary";
import CorporateRevenue from "../components/SuperAdminTabs/CorporateRevenue";
import MarkupRevenueAndAudit from "../components/SuperAdminTabs/MarkupRevenueAndAudit";
import CreditStatusAlerts from "../components/SuperAdminTabs/CreditStatusAlerts";
import WalletRechargeLogs from "../components/SuperAdminTabs/WalletRechargeLogs";
import CorporateAccessControl from "../components/SuperAdminTabs/CorporateAccessControl";
import EditCorporatePage from "../components/SuperAdminTabs/EditCorporatePage";
import PendingAmendments from "../components/SuperAdminTabs/PendingAmendments";
import CommissionSettings from "../components/SuperAdminTabs/CommissionSettings";
import ApiConfigurations from "../components/SuperAdminTabs/ApiConfigurations";
import CancellationDashboard from "../components/SuperAdminTabs/CancelledBookingsSummary";
import CancellationQueries from "../components/SuperAdminTabs/CancellationQueries";
import AllReissueRequests from "../components/SuperAdminTabs/AllReissueRequests";
import PendingCorporates from "../components/SuperAdminTabs/PendingCorporates";
import OpsTeamManagement from "../components/SuperAdminTabs/OpsTeamManagement";
import ProfileSettings from "../Pages/Auth/ProfileSettings";
import BookedFlightDetailsPage from "../components/Shared/BookedFlightDetailsPage";
import BookedHotelDetailsPage from "../components/Shared/BookedHotelDetailsPage";
import TboCommissionsTaxes from "../components/SuperAdminTabs/TboCommissionsTaxes";

import BlogListPage from '../components/Blog/AllBlogs'
import BlogEditPage from '../components/Blog/BlogEditPage'
import CreateBlogPage from '../components/Blog/CreateNewBlog'

function FallbackRoute() {
  const token = sessionStorage.getItem("token");
  return <Navigate to={token ? "/" : "/login"} replace />;
}

export const appRouter = createBrowserRouter([
  // -------------------------------
  // PUBLIC ROUTES
  // -------------------------------
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // -------------------------------
  // SUPER ADMIN PROTECTED ROUTES
  // -------------------------------
  {
    element: <ProtectedRoute allowedRoles={["super-admin", "ops-member"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { path: "/all-corporates", element: <OnboardedCorporates /> },
          { path: "/global-markup-engine", element: <MarkupEngine /> },
          { path: "/service-fee-management", element: <ServiceFeeManagement /> },
          { path: "/financial-approval/:id", element: <FinancialApprovalPage /> },
          { path: "/corporate-markup/:id", element: <CorporateMarkupConfiguration /> },
          { path: "/corporate-markup-list/:id", element: <CorporateMarkupList /> },
          { path: "/financial-approvals", element: <Navigate to="/corporate-revenue" replace /> },
          { path: "/corporate-access-control", element: <CorporateAccessControl /> },
          { path: "/edit-corporate/:id", element: <EditCorporatePage /> },
          { path: "/cancellation-queries", element: <CancellationQueries /> },
          { path: "/credit-status-alerts", element: <CreditStatusAlerts /> },

          { path: "/onboarded-corporates", element: <Navigate to="/all-corporates" replace /> },
          { path: "/bookings-summary", element: <BookingsSummary /> },
          { path: "/bookings/flight/:id", element: <BookedFlightDetailsPage /> },
          { path: "/bookings/hotel/:id", element: <BookedHotelDetailsPage /> },
          { path: "/cancellation-summary", element: <CancellationDashboard /> },
          { path: "/cancellation-query", element: <Navigate to="/cancellation-queries" replace /> },
          { path: "/all-reissue-requests", element: <AllReissueRequests /> },
          { path: "/corporate-revenue", element: <CorporateRevenue /> },
          { path: "/markup-revenue", element: <MarkupRevenueAndAudit /> },
          { path: "/credit-status", element: <Navigate to="/credit-status-alerts" replace /> },
          { path: "/wallet-recharge-logs", element: <WalletRechargeLogs /> },
          { path: "/tbo-commissions-taxes", element: <TboCommissionsTaxes /> },
          { path: "/active-corporates", element: <Navigate to="/all-corporates" replace /> },
          { path: "/pending-corporates", element: <PendingCorporates /> },
          { path: "/pending-amendments", element: <PendingAmendments /> },
          { path: "/commission-settings", element: <CommissionSettings /> },
          { path: "/api-configurations", element: <ApiConfigurations /> },
          { path: "/ops-management", element: <OpsTeamManagement /> },
          { path: "/profile", element: <ProfileSettings /> },
          {
            path: "/blog-and-articles",
            element: <BlogListPage />,
          },
          {
            path: "/blog-and-articles/add",
            element: <CreateBlogPage />,
          },
          {
            path: "/blog-and-articles/:id/edit",
            element: <BlogEditPage />,
          },
        ],
      },
    ],
  },

  // DEFAULT REDIRECT
  {
    path: "*",
    element: <FallbackRoute />,
  },
]);
