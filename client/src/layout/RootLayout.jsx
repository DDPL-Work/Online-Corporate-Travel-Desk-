import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageTitleHandler from "../utils/PageTitleHandler";
import Sidebar from "./Sidebar";
import { useSelector, useDispatch } from "react-redux";
import { closeSidebar } from "../Redux/Slice/layoutSlice";

export default function RootLayout() {
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.layout);
  const { role, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  // Scroll browser window to top smoothly on any location/state update
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  // Group dashboard sub-paths into a single stable key to prevent re-rendering the root layout structure
  const isDashboardRoute = location.pathname.startsWith('/manager/') || 
    [
      '/my-bookings', '/my-booking', '/my-hotel-booking', '/my-cancelled-hotel-booking',
      '/my-cancelled-bookings', '/my-cancelled-booking', '/my-reissued', '/my-reissue',
      '/my-offline-cancellations', '/my-upcoming-trips', '/my-past-trips', '/my-pending-approvals',
      '/my-rejected-requests', '/my-profile', '/travel-documents', '/bookings', '/update-profile',
      '/total-bookings', '/total-cancelled-bookings', '/pending-requests', '/approved-requests',
      '/rejected-requests', '/upcoming-trips', '/past-trips', '/manager-management', '/user-management',
      '/project-management', '/projects-table', '/travel-profile-settings', '/corporate-wallet',
      '/credit-utilization', '/ssr-management', '/branding-settings', '/reissue-requests',
      '/offline-cancellations', '/employee-flight-booking', '/employee-hotel-booking'
    ].some(path => location.pathname.startsWith(path));

  const transitionKey = isDashboardRoute ? 'dashboard' : location.pathname;

  return (
    <>
      <PageTitleHandler />

      {/* GLOBAL SIDEBAR (Accessible from anywhere if logged in) */}
      {isAuthenticated && (
        <>
          <Sidebar
            role={role}
            isOpen={isSidebarOpen}
            onClose={() => dispatch(closeSidebar())}
          />
        </>
      )}

      <div key={transitionKey} className="animate-pageTransition">
        <Outlet />
      </div>
    </>
  );
}

