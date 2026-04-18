import { createBrowserRouter } from "react-router-dom";

import Layout from "../layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

// Auth Pages
import Login from "../Pages/Auth/Login";
import Unauthorized from "../Pages/Auth/Unauthorized";

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
import CancellationDashboard from "../components/SuperAdminTabs/CancelledBookingsSummary";
import CancellationQueries from "../components/SuperAdminTabs/CancellationQueries";
import PendingCorporates from "../components/SuperAdminTabs/PendingCorporates";

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
    element: <ProtectedRoute allowedRoles={["super-admin"]} />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { path: "/onboarded-corporates", element: <OnboardedCorporates /> },
          { path: "/bookings-summary", element: <BookingsSummary /> },
          { path: "/cancellation-summary", element: <CancellationDashboard /> },
          { path: "/cancellation-query", element: <CancellationQueries /> },
          { path: "/corporate-revenue", element: <CorporateRevenue /> },
          { path: "/credit-status", element: <CreditStatusAlerts /> },
          { path: "/wallet-recharge-logs", element: <WalletRechargeLogs /> },
          { path: "/active-corporates", element: <CorporateAccessControl /> },
          { path: "/pending-corporates", element: <PendingCorporates /> },
          { path: "/pending-amendments", element: <PendingAmendments /> },
          { path: "/commission-settings", element: <CommissionSettings /> },
          { path: "/api-configurations", element: <ApiConfigurations /> },
          { path: "/system-logs", element: <SystemLogs /> },
        ],
      },
    ],
  },

  // DEFAULT REDIRECT
  {
    path: "*",
    element: <Login />,
  },
]);
